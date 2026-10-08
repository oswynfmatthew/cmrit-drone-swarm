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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(BASE_DIR, "state.json")
COMMAND_FILE = os.path.join(BASE_DIR, "commands.json")

# Visual theme
BG = (18, 24, 35)
PANEL = (28, 36, 50)
GRID = (38, 48, 66)
TEXT = (235, 240, 245)
MUTED = (150, 160, 175)
OBSTACLE = (55, 65, 80)
TARGET = (245, 210, 70)
BASE = (90, 170, 255)
GREEN = (80, 210, 130)
RED = (235, 90, 90)
ORANGE = (235, 150, 70)
WHITE = (245, 245, 245)
CARD = (34, 44, 60)
CARD_BORDER = (55, 68, 88)

# Global image assets
DRONE_IMG = None
TARGET_IMG = None


def load_assets() -> None:
    """Load optional image assets. Vector graphics are used if assets are missing."""
    global DRONE_IMG, TARGET_IMG

    drone_path = os.path.join(BASE_DIR, "drone.png")
    target_path = os.path.join(BASE_DIR, "target.png")

    try:
        if os.path.exists(drone_path):
            raw_drone = pygame.image.load(drone_path).convert_alpha()
            DRONE_IMG = pygame.transform.smoothscale(raw_drone, (28, 28))
    except (pygame.error, OSError) as exc:
        print(f"Skipping custom drone image asset: {exc}")
        DRONE_IMG = None

    try:
        if os.path.exists(target_path):
            raw_target = pygame.image.load(target_path).convert_alpha()
            TARGET_IMG = pygame.transform.smoothscale(raw_target, (24, 24))
    except (pygame.error, OSError) as exc:
        print(f"Skipping custom target image asset: {exc}")
        TARGET_IMG = None


def atomic_json_write(path: str, data: dict) -> bool:
    """Write JSON safely, including when the project is inside OneDrive."""
    directory = os.path.dirname(os.path.abspath(path)) or "."
    filename = os.path.basename(path)
    temp = os.path.join(directory, filename + ".tmp")

    try:
        with open(temp, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

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
        try:
            if os.path.exists(temp):
                os.remove(temp)
        except OSError:
            pass

    return False


def read_commands() -> dict:
    """Read the latest command from commands.json."""
    try:
        with open(COMMAND_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
            return data if isinstance(data, dict) else {"command": ""}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {"command": ""}


def clear_command() -> None:
    """Clear the processed command."""
    atomic_json_write(COMMAND_FILE, {"command": ""})


def make_obstacles() -> set:
    """Create the fixed obstacle cells."""
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

    # A* expects one goal cell, not the entire remaining task list.
    goal = targets[0]

    return astar(current, goal, blocked, GRID_W, GRID_H)


def move_drone(drone: Drone, dt: float) -> None:
    """Move a drone along its current path."""
    if not drone.path:
        return

    if drone.status in (
        "FAILED",
        "LOW_BATTERY",
        "RETURNING",
        "PAUSED",
        "COMPLETED",
    ):
        return

    cell_x, cell_y = drone.path[0]
    target_x = cell_x * CELL + CELL / 2
    target_y = cell_y * CELL + CELL / 2

    dx = target_x - drone.x
    dy = target_y - drone.y
    distance = math.hypot(dx, dy)

    if distance <= 0.001:
        drone.path.pop(0)
        return

    step = max(0.0, drone.speed * dt)

    if distance <= step:
        drone.distance_travelled += distance
        drone.x = target_x
        drone.y = target_y
        drone.path.pop(0)
        drone.battery = max(0.0, drone.battery - distance * 0.002)
        drone.searched_cells += 1
    else:
        ratio = step / distance
        drone.x += dx * ratio
        drone.y += dy * ratio
        drone.distance_travelled += step
        drone.battery = max(0.0, drone.battery - step * 0.002)

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
            drone.path = build_path_for_task(drone, task, blocked)

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
            assign_tasks(tasks, drones, CELL, make_obstacles())

    elif command == "PAUSE":
        for drone in drones.values():
            if drone.healthy and drone.status in ("SEARCHING", "AVOIDING"):
                drone.status = "PAUSED"

    elif command == "RESUME":
        for drone in drones.values():
            if drone.healthy and drone.status == "PAUSED":
                drone.status = "SEARCHING"

    elif command == "FAIL_D2":
        if "D2" in drones and drones["D2"].healthy:
            mission.fail_drone(drones["D2"])
            reassign_failed_drone(tasks, drones, "D2")

    elif command == "ADD_TARGET":
        next_id = len(mission.targets) + 1
        target_id = f"T{next_id}"
        mission.targets[target_id] = Target(target_id, 14, 6, "HIGH")
        mission.events.append(f"TARGET_{target_id}_ADDED")

    elif command == "RESET":
        return "RESET"

    return ""


def reset_simulation():
    """Create a completely fresh simulation state."""
    blocked = make_obstacles()
    drones = create_drones()
    mission = MissionManager()
    tasks = make_zone_tasks(GRID_W, GRID_H, 5, blocked)
    return drones, mission, tasks


def avoidance_wait_ids(
    drones: Dict[str, Drone],
    min_distance: float = 24.0,
) -> set:
    """Return drone IDs that should wait to avoid close-proximity conflicts."""
    healthy = [
        drone
        for drone in drones.values()
        if drone.healthy
        and drone.status
        not in (
            "FAILED",
            "COMPLETED",
            "PAUSED",
            "RETURNING",
            "LOW_BATTERY",
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
                wait_ids.add(max(first.drone_id, second.drone_id))

    return wait_ids


def make_state(
    drones: Dict[str, Drone],
    tasks: List[Task],
    mission: MissionManager,
    start_time: float,
) -> dict:
    """Create the JSON-serializable simulation state."""
    searched = sum(drone.searched_cells for drone in drones.values())
    total = sum(len(task.cells) for task in tasks)

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
            1 for target in mission.targets.values() if target.found
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
                "confidence": round(target.confidence * 100, 1),
                "drone": target.assigned_drone or "-",
            }
            for target in mission.targets.values()
        ],
    }


def draw_text(
    surface,
    font,
    text: str,
    pos,
    color=TEXT,
) -> None:
    """Draw text on the simulation window."""
    surface.blit(font.render(str(text), True, color), pos)


def draw_radar_cone(surface, drone: Drone) -> None:
    """Draw a pulsing radar ring around active drones."""
    if drone.status not in (
        "SEARCHING",
        "AVOIDING",
        "INVESTIGATING",
    ):
        return

    pulse_radius = max(
        20,
        45 + int(math.sin(time.time() * 7) * 8),
    )

    radar_surf = pygame.Surface(
        (pulse_radius * 2, pulse_radius * 2),
        pygame.SRCALPHA,
    )

    if drone.status == "INVESTIGATING":
        radar_color = (245, 210, 70, 45)
        outline_color = (245, 210, 70, 110)
    else:
        radar_color = (80, 210, 130, 35)
        outline_color = (80, 210, 130, 90)

    center = (pulse_radius, pulse_radius)

    pygame.draw.circle(
        radar_surf,
        radar_color,
        center,
        pulse_radius,
    )
    pygame.draw.circle(
        radar_surf,
        outline_color,
        center,
        pulse_radius,
        1,
    )

    surface.blit(
        radar_surf,
        (
            int(drone.x - pulse_radius),
            int(drone.y - pulse_radius),
        ),
    )


def draw_drone(surface, drone: Drone) -> None:
    """Draw a custom drone sprite or a vector fallback."""
    if not drone.healthy or drone.status == "FAILED":
        color = RED
    elif drone.status == "INVESTIGATING":
        color = TARGET
    elif drone.status == "LOW_BATTERY":
        color = ORANGE
    else:
        color = BASE

    center = (int(drone.x), int(drone.y))

    if DRONE_IMG is not None and drone.healthy:
        img_rect = DRONE_IMG.get_rect(center=center)
        surface.blit(DRONE_IMG, img_rect)
        pygame.draw.circle(surface, color, center, 15, 1)
    else:
        pygame.draw.circle(surface, color, center, 9)
        pygame.draw.circle(surface, WHITE, center, 10, 1)
        pygame.draw.line(
            surface,
            color,
            (center[0] - 7, center[1] - 7),
            (center[0] + 7, center[1] + 7),
            2,
        )
        pygame.draw.line(
            surface,
            color,
            (center[0] + 7, center[1] - 7),
            (center[0] - 7, center[1] + 7),
            2,
        )

    # Drone ID
    draw_text(
        surface,
        pygame.font.SysFont("Arial", 12, bold=True),
        drone.drone_id,
        (center[0] - 8, center[1] + 15),
        TEXT,
    )


def draw_target(surface, target: Target) -> None:
    """Draw an unfound rescue target."""
    target_x = target.x * CELL + CELL // 2
    target_y = target.y * CELL + CELL // 2

    if TARGET_IMG is not None:
        target_rect = TARGET_IMG.get_rect(
            center=(target_x, target_y)
        )
        surface.blit(TARGET_IMG, target_rect)
    else:
        pygame.draw.circle(
            surface,
            TARGET,
            (target_x, target_y),
            6,
        )
        pygame.draw.circle(
            surface,
            TARGET,
            (target_x, target_y),
            12,
            1,
        )


def draw_panel(
    screen,
    font,
    small,
    title_font,
    drones,
    tasks,
    mission,
    start_time,
) -> None:
    """Draw the command and telemetry panel."""
    panel_x = WIDTH
    pygame.draw.rect(
        screen,
        PANEL,
        (panel_x, 0, PANEL_W, HEIGHT),
    )

    # Header
    draw_text(
        screen,
        title_font,
        "DRONE SWARM",
        (panel_x + 18, 14),
    )
    draw_text(
        screen,
        small,
        "SEARCH & RESCUE COMMAND",
        (panel_x + 19, 45),
        MUTED,
    )

    state = make_state(
        drones,
        tasks,
        mission,
        start_time,
    )

    # Mission status card
    card_rect = pygame.Rect(
        panel_x + 14,
        72,
        PANEL_W - 28,
        126,
    )
    pygame.draw.rect(screen, CARD, card_rect, border_radius=10)
    pygame.draw.rect(
        screen,
        CARD_BORDER,
        card_rect,
        width=1,
        border_radius=10,
    )

    status_color = {
        "ACTIVE": GREEN,
        "COMPLETE": GREEN,
        "READY": BASE,
    }.get(state["mission_status"], TEXT)

    draw_text(
        screen,
        font,
        f"STATUS  {state['mission_status']}",
        (panel_x + 28, 86),
        status_color,
    )
    draw_text(
        screen,
        small,
        f"Coverage       {state['area_covered']:>5.1f}%",
        (panel_x + 28, 116),
    )
    draw_text(
        screen,
        small,
        f"Targets        {state['targets_found']}/{state['targets_total']}",
        (panel_x + 28, 140),
    )
    draw_text(
        screen,
        small,
        f"Mission time   {state['mission_time']:.1f}s",
        (panel_x + 28, 164),
    )

    # Drone telemetry
    y = 216
    draw_text(
        screen,
        font,
        "DRONE TELEMETRY",
        (panel_x + 18, y),
        BASE,
    )
    y += 30

    for drone in drones.values():
        status_color = RED if not drone.healthy else TEXT

        draw_text(
            screen,
            small,
            f"{drone.drone_id}  {drone.status}",
            (panel_x + 20, y),
            status_color,
        )

        battery_text = f"{drone.battery:5.1f}%"
        draw_text(
            screen,
            small,
            battery_text,
            (panel_x + 222, y),
            RED if drone.battery <= 20 else GREEN,
        )

        # Battery bar
        bar_x = panel_x + 20
        bar_y = y + 18
        bar_w = 260
        bar_h = 5

        pygame.draw.rect(
            screen,
            GRID,
            (bar_x, bar_y, bar_w, bar_h),
            border_radius=3,
        )

        fill_w = int(
            bar_w * max(0.0, min(100.0, drone.battery)) / 100.0
        )

        if drone.battery <= 20:
            bar_color = RED
        elif drone.battery <= 50:
            bar_color = ORANGE
        else:
            bar_color = GREEN

        if fill_w > 0:
            pygame.draw.rect(
                screen,
                bar_color,
                (bar_x, bar_y, fill_w, bar_h),
                border_radius=3,
            )

        y += 40

    # Controls
    y += 8
    draw_text(
        screen,
        font,
        "CONTROLS",
        (panel_x + 18, y),
        BASE,
    )
    y += 28

    controls = [
        ("S", "Start mission"),
        ("P", "Pause"),
        ("R", "Reset"),
        ("F", "Fail D2"),
        ("T", "Add target"),
    ]

    for key, description in controls:
        key_rect = pygame.Rect(
            panel_x + 20,
            y - 2,
            24,
            20,
        )
        pygame.draw.rect(
            screen,
            CARD,
            key_rect,
            border_radius=4,
        )
        draw_text(
            screen,
            small,
            key,
            (panel_x + 28, y),
            WHITE,
        )
        draw_text(
            screen,
            small,
            description,
            (panel_x + 54, y),
            MUTED,
        )
        y += 24


def main() -> None:
    """Run the drone swarm simulation."""
    pygame.init()

    screen = pygame.display.set_mode(
        (SCREEN_W, HEIGHT)
    )
    pygame.display.set_caption(
        "Drone Swarm Search & Rescue Simulation"
    )

    load_assets()

    clock = pygame.time.Clock()

    font = pygame.font.SysFont(
        "Arial",
        18,
    )
    small = pygame.font.SysFont(
        "Arial",
        15,
    )
    title_font = pygame.font.SysFont(
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

        # -----------------------------
        # INPUT
        # -----------------------------
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

        # -----------------------------
        # EXTERNAL COMMAND FILE
        # -----------------------------
        command_data = read_commands()
        command = command_data.get("command", "")

        if isinstance(command, str) and command.strip():
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

        # -----------------------------
        # SIMULATION UPDATE
        # -----------------------------
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
                    step = max(0.0, drone.speed * dt)

                    if distance <= step:
                        drone.x = drone.base_x
                        drone.y = drone.base_y
                        drone.status = "LOW_BATTERY"
                        drone.path = []
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

        # -----------------------------
        # DRAW MAP
        # -----------------------------
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

        # Obstacles
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

        # Drone base markers
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

        # Radar effects
        for drone in drones.values():
            if drone.healthy:
                draw_radar_cone(
                    screen,
                    drone,
                )

        # Targets
        for target in mission.targets.values():
            if not target.found:
                draw_target(
                    screen,
                    target,
                )

        # Drones
        for drone in drones.values():
            draw_drone(
                screen,
                drone,
            )

        # Map divider
        pygame.draw.line(
            screen,
            CARD_BORDER,
            (WIDTH, 0),
            (WIDTH, HEIGHT),
            2,
        )

        # Command panel
        draw_panel(
            screen,
            font,
            small,
            title_font,
            drones,
            tasks,
            mission,
            start_time,
        )

        # -----------------------------
        # STATE FILE
        # -----------------------------
        state_write_timer += dt

        if state_write_timer >= 0.2:
            state = make_state(
                drones,
                tasks,
                mission,
                start_time,
            )
            atomic_json_write(
                STATE_FILE,
                state,
            )
            state_write_timer = 0.0

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
