import json
import math
import os
import time
from typing import Dict, List, Tuple

import pygame

from common import Drone, Task, Target
from mission import MissionManager
from swarm import (
    astar,
    assign_tasks,
    make_zone_tasks,
    reassign_failed_drone,
)

WIDTH, HEIGHT = 960, 640
CELL = 32
GRID_W, GRID_H = WIDTH // CELL, HEIGHT // CELL
PANEL_W = 320
SCREEN_W = WIDTH + PANEL_W
FPS = 60

STATE_FILE = "state.json"
COMMAND_FILE = "commands.json"

BG = (18, 24, 35)
PANEL = (28, 36, 50)
GRID = (52, 62, 78)
TEXT = (235, 240, 245)
OBSTACLE = (100, 110, 125)
TARGET = (245, 210, 70)
BASE = (90, 170, 255)
GREEN = (80, 210, 130)
RED = (235, 90, 90)
WHITE = (245, 245, 245)


def atomic_json_write(path: str, data: dict) -> bool:
    """Write JSON safely, tolerating temporary Windows/OneDrive file locks.

    Returns True when the file is written successfully and False when Windows
    temporarily prevents the replacement. A locked state file must not crash
    the simulation itself.
    """
    directory = os.path.dirname(os.path.abspath(path)) or "."
    filename = os.path.basename(path)
    temp = os.path.join(directory, filename + ".tmp")

    try:
        with open(temp, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

        # OneDrive/Windows may briefly lock the destination. Retry a few
        # times before giving up on this particular state update.
        for attempt in range(3):
            try:
                os.replace(temp, path)
                return True
            except PermissionError:
                if attempt < 2:
                    time.sleep(0.02)

    except (OSError, TypeError, ValueError):
        pass

    finally:
        # Never leave a stale temporary file behind after a failed write.
        try:
            if os.path.exists(temp):
                os.remove(temp)
        except OSError:
            pass

    return False


def read_commands() -> dict:
    """Read the latest command from the command JSON file."""
    try:
        with open(COMMAND_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
            return data if isinstance(data, dict) else {"command": ""}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {"command": ""}


def clear_command() -> None:
    """Clear the command after it has been processed."""
    atomic_json_write(COMMAND_FILE, {"command": ""})


def make_obstacles() -> set:
    """Create the fixed obstacle cells used by the simulation."""
    rects = [
        (7, 3, 5, 2),
        (16, 1, 3, 5),
        (10, 10, 6, 2),
        (22, 12, 4, 4),
    ]

    blocked = set()

    for x, y, width, height in rects:
        for yy in range(y, y + height):
            for xx in range(x, x + width):
                blocked.add((xx, yy))

    return blocked


def create_drones() -> Dict[str, Drone]:
    """Create all drones at their initial base positions."""
    starts = [
        (1, 18),
        (6, 18),
        (12, 18),
        (18, 18),
        (26, 18),
    ]

    return {
        f"D{i + 1}": Drone(
            drone_id=f"D{i + 1}",
            x=x * CELL + CELL / 2,
            y=y * CELL + CELL / 2,
            base_x=x * CELL + CELL / 2,
            base_y=y * CELL + CELL / 2,
            speed=150.0,
        )
        for i, (x, y) in enumerate(starts)
    }


def build_path_for_task(
    drone: Drone,
    task: Task,
    blocked: set,
) -> List[Tuple[int, int]]:
    """Build a path from the drone's current cell to its next task cell."""
    if not task.cells:
        return []

    current = (
        int(drone.x // CELL),
        int(drone.y // CELL),
    )

    targets = task.cells[max(0, task.progress):]

    if not targets:
        return []

    goal = targets[0]

    return astar(
        current,
        goal,
        blocked,
        GRID_W,
        GRID_H,
    )


def move_drone(
    drone: Drone,
    dt: float,
    blocked: set,
) -> None:
    """Move a drone along its current path."""
    if (
        not drone.path
        or drone.status in ("FAILED", "LOW_BATTERY", "RETURNING", "PAUSED")
    ):
        return

    cell_x, cell_y = drone.path[0]
    target_x = cell_x * CELL + CELL / 2
    target_y = cell_y * CELL + CELL / 2

    dx = target_x - drone.x
    dy = target_y - drone.y
    distance = math.hypot(dx, dy)

    if distance <= 0:
        drone.path.pop(0)
        return

    step = drone.speed * dt

    if distance <= step:
        drone.distance_travelled += distance
        drone.x = target_x
        drone.y = target_y
        drone.path.pop(0)

        drone.battery = max(
            0.0,
            drone.battery - distance * 0.002,
        )
        drone.searched_cells += 1
    else:
        ratio = step / distance
        drone.x += dx * ratio
        drone.y += dy * ratio

        drone.distance_travelled += step
        drone.battery = max(
            0.0,
            drone.battery - step * 0.002,
        )

    if drone.battery <= 20 and drone.status not in (
        "FAILED",
        "RETURNING",
        "LOW_BATTERY",
    ):
        drone.status = "LOW_BATTERY"
        drone.path = []


def update_tasks(
    drones: Dict[str, Drone],
    tasks: List[Task],
    blocked: set,
) -> None:
    """Update task progress and create paths for active assigned tasks."""
    by_id = {drone.drone_id: drone for drone in drones.values()}

    for task in tasks:
        if task.status != "ACTIVE" or not task.assigned_drone:
            continue

        drone = by_id.get(task.assigned_drone)

        if not drone or not drone.healthy:
            continue

        if task.progress >= len(task.cells):
            task.status = "DONE"
            drone.task_id = None
            drone.status = "COMPLETED"
            drone.path = []
            continue

        if not drone.path:
            drone.path = build_path_for_task(
                drone,
                task,
                blocked,
            )

            # Do not falsely mark a task cell as completed when
            # no path exists. Leave the task active so it can be
            # handled by the surrounding mission/reassignment logic.
            if not drone.path:
                continue

        current = (
            int(drone.x // CELL),
            int(drone.y // CELL),
        )

        if current == task.cells[task.progress]:
            task.progress += 1
            drone.path = []

            if task.progress >= len(task.cells):
                task.status = "DONE"
                drone.task_id = None
                drone.status = "COMPLETED"


def handle_command(
    command: str,
    drones: Dict[str, Drone],
    mission: MissionManager,
    tasks: List[Task],
):
    """Process a simulation command."""
    command = command.strip().upper()

    if command == "START":
        mission.start()

        if all(task.status == "PENDING" for task in tasks):
            assign_tasks(
                tasks,
                drones,
                CELL,
                make_obstacles(),
            )

    elif command == "PAUSE":
        for drone in drones.values():
            if drone.healthy and drone.status in (
                "SEARCHING",
                "AVOIDING",
            ):
                drone.status = "PAUSED"

    elif command == "RESUME":
        for drone in drones.values():
            if drone.healthy and drone.status == "PAUSED":
                drone.status = "SEARCHING"

    elif command == "FAIL_D2":
        if "D2" in drones and drones["D2"].healthy:
            mission.fail_drone(drones["D2"])
            reassign_failed_drone(
                tasks,
                drones,
                "D2",
            )

    elif command == "ADD_TARGET":
        next_id = len(mission.targets) + 1
        target_id = f"T{next_id}"

        mission.targets[target_id] = Target(
            target_id,
            14,
            6,
            "HIGH",
        )
        mission.events.append(
            f"TARGET_{target_id}_ADDED"
        )

    elif command == "RESET":
        return "RESET"

    return ""


def reset_simulation():
    """Create a completely fresh simulation state."""
    return (
        create_drones(),
        MissionManager(),
        make_zone_tasks(
            GRID_W,
            GRID_H,
            5,
            make_obstacles(),
        ),
    )


def avoidance_wait_ids(
    drones: Dict[str, Drone],
    min_distance: float = 24.0,
) -> set:
    """Return drone IDs that should wait to avoid close-proximity conflicts."""
    healthy = [
        drone
        for drone in drones.values()
        if (
            drone.healthy
            and drone.status
            not in (
                "FAILED",
                "COMPLETED",
                "PAUSED",
                "RETURNING",
                "LOW_BATTERY",
            )
        )
    ]

    wait_ids = set()

    for i, first in enumerate(healthy):
        for second in healthy[i + 1:]:
            distance = math.hypot(
                first.x - second.x,
                first.y - second.y,
            )

            if distance < min_distance:
                wait_ids.add(
                    max(
                        first.drone_id,
                        second.drone_id,
                    )
                )

    return wait_ids


def make_state(
    drones: Dict[str, Drone],
    tasks: List[Task],
    mission: MissionManager,
    start_time: float,
) -> dict:
    """Create the JSON-serializable simulation state."""
    searched = sum(
        drone.searched_cells
        for drone in drones.values()
    )

    total = sum(
        len(task.cells)
        for task in tasks
    )

    covered = min(
        100.0,
        (searched / total * 100.0) if total else 0.0,
    )

    if mission.mission_complete(tasks):
        mission_status = "COMPLETE"
    elif mission.started:
        mission_status = "ACTIVE"
    else:
        mission_status = "READY"

    return {
        "mission_status": mission_status,
        "area_covered": round(covered, 1),
        "targets_found": sum(
            1
            for target in mission.targets.values()
            if target.found
        ),
        "targets_total": len(mission.targets),
        "mission_time": (
            round(time.time() - start_time, 1)
            if mission.started
            else 0.0
        ),
        "events": mission.events[-8:],
        "drones": [
            {
                "id": drone.drone_id,
                "x": round(drone.x / CELL, 2),
                "y": round(drone.y / CELL, 2),
                "status": drone.status,
                "battery": round(drone.battery, 1),
                "task": drone.task_id or "-",
                "healthy": drone.healthy,
            }
            for drone in drones.values()
        ],
        "targets": [
            {
                "id": target.target_id,
                "x": target.x,
                "y": target.y,
                "priority": target.priority,
                "found": target.found,
                "confidence": round(
                    target.confidence * 100,
                    1,
                ),
                "drone": target.assigned_drone or "-",
            }
            for target in mission.targets.values()
        ],
    }


def draw_text(
    surface,
    font,
    text,
    pos,
    color=TEXT,
) -> None:
    """Draw text on the simulation window."""
    surface.blit(
        font.render(text, True, color),
        pos,
    )


def draw_drone(
    surface,
    drone: Drone,
) -> None:
    """Draw a drone according to its current status."""
    if drone.status == "FAILED":
        color = RED
    elif drone.status == "INVESTIGATING":
        color = TARGET
    elif drone.status == "LOW_BATTERY":
        color = (235, 150, 70)
    else:
        color = BASE

    pygame.draw.circle(
        surface,
        color,
        (int(drone.x), int(drone.y)),
        9,
    )

    pygame.draw.circle(
        surface,
        WHITE,
        (int(drone.x), int(drone.y)),
        10,
        1,
    )

    pygame.draw.line(
        surface,
        color,
        (
            int(drone.x - 7),
            int(drone.y - 7),
        ),
        (
            int(drone.x + 7),
            int(drone.y + 7),
        ),
        2,
    )

    pygame.draw.line(
        surface,
        color,
        (
            int(drone.x + 7),
            int(drone.y - 7),
        ),
        (
            int(drone.x - 7),
            int(drone.y + 7),
        ),
        2,
    )


def main() -> None:
    """Run the drone swarm simulation."""
    pygame.init()

    screen = pygame.display.set_mode(
        (SCREEN_W, HEIGHT)
    )
    pygame.display.set_caption(
        "Drone Swarm Search & Rescue Simulation"
    )

    clock = pygame.time.Clock()

    font = pygame.font.SysFont(
        "Arial",
        18,
    )
    small = pygame.font.SysFont(
        "Arial",
        15,
    )
    title = pygame.font.SysFont(
        "Arial",
        24,
        bold=True,
    )

    blocked = make_obstacles()
    drones, mission, tasks = reset_simulation()
    start_time = time.time()

    running = True
    state_write_timer = 0.0

    while running:
        dt = clock.tick(FPS) / 1000.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_s:
                    handle_command(
                        "START",
                        drones,
                        mission,
                        tasks,
                    )

                elif event.key == pygame.K_p:
                    handle_command(
                        "PAUSE",
                        drones,
                        mission,
                        tasks,
                    )

                elif event.key == pygame.K_r:
                    drones, mission, tasks = reset_simulation()
                    start_time = time.time()

                elif event.key == pygame.K_f:
                    handle_command(
                        "FAIL_D2",
                        drones,
                        mission,
                        tasks,
                    )

                elif event.key == pygame.K_t:
                    handle_command(
                        "ADD_TARGET",
                        drones,
                        mission,
                        tasks,
                    )

        command = read_commands().get(
            "command",
            "",
        )

        if command:
            result = handle_command(
                command,
                drones,
                mission,
                tasks,
            )
            clear_command()

            if result == "RESET":
                drones, mission, tasks = reset_simulation()
                start_time = time.time()

        if mission.started:
            update_tasks(
                drones,
                tasks,
                blocked,
            )

            wait_ids = avoidance_wait_ids(drones)

            for drone in drones.values():
                if (
                    drone.drone_id in wait_ids
                    or drone.status == "PAUSED"
                ):
                    continue

                move_drone(
                    drone,
                    dt,
                    blocked,
                )

                if (
                    drone.healthy
                    and drone.status == "LOW_BATTERY"
                ):
                    drone.status = "RETURNING"

                if drone.status == "RETURNING":
                    dx = drone.base_x - drone.x
                    dy = drone.base_y - drone.y
                    distance = math.hypot(dx, dy)
                    step = drone.speed * dt

                    if distance <= step:
                        drone.x = drone.base_x
                        drone.y = drone.base_y
                        drone.status = "LOW_BATTERY"

                    elif distance > 0:
                        drone.x += dx / distance * step
                        drone.y += dy / distance * step

            mission.detect_targets(
                drones,
                CELL,
            )

            update_tasks(
                drones,
                tasks,
                blocked,
            )

        screen.fill(BG)

        for x in range(0, WIDTH, CELL):
            pygame.draw.line(
                screen,
                GRID,
                (x, 0),
                (x, HEIGHT),
            )

        for y in range(0, HEIGHT, CELL):
            pygame.draw.line(
                screen,
                GRID,
                (0, y),
                (WIDTH, y),
            )

        for x, y in blocked:
            pygame.draw.rect(
                screen,
                OBSTACLE,
                (
                    x * CELL,
                    y * CELL,
                    CELL,
                    CELL,
                ),
            )

        for drone in drones.values():
            pygame.draw.circle(
                screen,
                (45, 70, 95),
                (
                    int(drone.base_x),
                    int(drone.base_y),
                ),
                14,
                2,
            )

        for target in mission.targets.values():
            if not target.found:
                target_x = (
                    target.x * CELL
                    + CELL // 2
                )
                target_y = (
                    target.y * CELL
                    + CELL // 2
                )

                pygame.draw.circle(
                    screen,
                    TARGET,
                    (target_x, target_y),
                    8,
                )

                pygame.draw.circle(
                    screen,
                    TARGET,
                    (target_x, target_y),
                    13,
                    1,
                )

        for drone in drones.values():
            draw_drone(
                screen,
                drone,
            )

        pygame.draw.rect(
            screen,
            PANEL,
            (
                WIDTH,
                0,
                PANEL_W,
                HEIGHT,
            ),
        )

        draw_text(
            screen,
            title,
            "DRONE SWARM COMMAND",
            (WIDTH + 18, 16),
        )

        draw_text(
            screen,
            font,
            "SEARCH & RESCUE",
            (WIDTH + 18, 50),
        )

        y = 88

        state = make_state(
            drones,
            tasks,
            mission,
            start_time,
        )

        metrics = [
            f"Status: {state['mission_status']}",
            f"Coverage: {state['area_covered']}%",
            f"Targets: {state['targets_found']}/{state['targets_total']}",
            f"Time: {state['mission_time']} s",
        ]

        for line in metrics:
            draw_text(
                screen,
                font,
                line,
                (WIDTH + 18, y),
                (
                    GREEN
                    if (
                        "Status" in line
                        and "ACTIVE" in line
                    )
                    else TEXT
                ),
            )
            y += 28

        draw_text(
            screen,
            font,
            "DRONES",
            (WIDTH + 18, y + 8),
        )
        y += 38

        for drone in drones.values():
            draw_text(
                screen,
                small,
                f"{drone.drone_id}: {drone.status:12} "
                f"{drone.battery:5.1f}%",
                (WIDTH + 18, y),
                RED if not drone.healthy else TEXT,
            )
            y += 23

        y += 6

        draw_text(
            screen,
            font,
            "KEYS",
            (WIDTH + 18, y),
        )
        y += 26

        for line in [
            "S = Start",
            "P = Pause",
            "R = Reset",
            "F = Fail D2",
            "T = Add Target",
        ]:
            draw_text(
                screen,
                small,
                line,
                (WIDTH + 18, y),
            )
            y += 21

        # The screen is updated every frame, but the JSON state does not need
        # to be written 60 times per second. Limiting file writes reduces
        # disk usage and greatly reduces Windows/OneDrive file-lock conflicts.
        state_write_timer += dt
        if state_write_timer >= 0.2:
            atomic_json_write(
                STATE_FILE,
                state,
            )
            state_write_timer = 0.0

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
