import heapq
import math
from typing import Dict, List, Set, Tuple
from common import Drone, Task

Point = Tuple[int, int]

def distance(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])

def neighbours(p: Point, width: int, height: int):
    x, y = p
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < width and 0 <= ny < height:
            yield nx, ny

def astar(
    start: Point,
    goal: Point,
    blocked: Set[Point],
    width: int,
    height: int,
) -> List[Point]:
    if not (0 <= start[0] < width and 0 <= start[1] < height):
        return []
    if not (0 <= goal[0] < width and 0 <= goal[1] < height):
        return []
    if start in blocked or goal in blocked:
        return []
    if start == goal:
        return [start]
        
    open_heap = [(distance(start, goal), start)]
    came_from = {}
    g_score = {start: 0.0}
    
    while open_heap:
        _, current = heapq.heappop(open_heap)
        
        if current == goal:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            path.reverse()
            return path
            
        for nxt in neighbours(current, width, height):
            if nxt in blocked:
                continue
            tentative = g_score[current] + 1.0
            if tentative < g_score.get(nxt, float("inf")):
                came_from[nxt] = current
                g_score[nxt] = tentative
                f_score = tentative + distance(nxt, goal)
                heapq.heappush(open_heap, (f_score, nxt))
    return []

def make_zone_tasks(
    width: int,
    height: int,
    zone_count: int,
    blocked: Set[Point],
) -> List[Task]:
    if width <= 0 or height <= 0 or zone_count <= 0:
        raise ValueError("width, height, and zone_count must all be positive")
    if zone_count > width:
        raise ValueError("zone_count cannot be greater than width")
        
    zones: List[Task] = []
    zone_width = width // zone_count
    
    for z in range(zone_count):
        x0 = z * zone_width
        x1 = width if z == zone_count - 1 else (z + 1) * zone_width
        cells: List[Point] = []
        for y in range(height):
            row = range(x0, x1) if y % 2 == 0 else range(x1 - 1, x0 - 1, -1)
            for x in row:
                if (x, y) not in blocked:
                    cells.append((x, y))
        zones.append(Task(task_id=f"Z{z + 1}", cells=cells))
    return zones

def assign_tasks(
    tasks: List[Task],
    drones: Dict[str, Drone],
    cell_size: int,
    blocked: Set[Point],
) -> None:
    if cell_size <= 0:
        raise ValueError("cell_size must be positive")
        
    available = [
        d for d in drones.values()
        if d.healthy and d.status not in ("FAILED", "COMPLETED")
    ]
    
    for task in tasks:
        if task.status in ("DONE", "ACTIVE") or not task.cells:
            continue
        if not available:
            break
            
        def score(drone: Drone) -> float:
            start_cell = (int(drone.x // cell_size), int(drone.y // cell_size))
            first = task.cells[task.progress] if task.progress < len(task.cells) else task.cells[-1]
            battery_penalty = max(0.0, 30.0 - drone.battery) * 2.0
            return distance(start_cell, first) + battery_penalty + drone.searched_cells * 0.02
            
        chosen = min(available, key=score)
        task.assigned_drone = chosen.drone_id
        task.status = "ACTIVE"
        chosen.task_queue.append(task.task_id)
        
        if chosen.task_id is None:
            chosen.task_id = task.task_id
            chosen.status = "SEARCHING"
        available.remove(chosen)

def reassign_failed_drone(
    tasks: List[Task],
    drones: Dict[str, Drone],
    failed_id: str,
) -> None:
    affected = [
        task for task in tasks
        if task.assigned_drone == failed_id and task.status != "DONE"
    ]
    
    failed = drones.get(failed_id)
    if failed is not None:
        failed.task_id = None
        failed.task_queue.clear()
        
    for task in affected:
        task.assigned_drone = None
        task.status = "PENDING"
        
    healthy = [
        drone for drone in drones.values()
        if drone.healthy and drone.status not in ("FAILED", "COMPLETED")
    ]
    
    for task in affected:
        if not healthy:
            break
        chosen = min(healthy, key=lambda drone: len(drone.task_queue))
        task.assigned_drone = chosen.drone_id
        task.status = "ACTIVE"
        chosen.task_queue.append(task.task_id)
        
        if chosen.task_id is None:
            chosen.task_id = task.task_id
        if chosen.status in ("IDLE", "RETURNING", "LOW_BATTERY", "AVOIDING"):
            chosen.status = "SEARCHING"

def avoid_nearby_drones(
    drones: Dict[str, Drone],
    min_distance: float = 24.0,
) -> None:
    healthy = [
        d for d in drones.values()
        if d.healthy and d.status not in ("FAILED", "COMPLETED")
    ]
    for i, a in enumerate(healthy):
        for b in healthy[i + 1:]:
            if distance(a.position(), b.position()) < min_distance:
                if a.drone_id > b.drone_id:
                    a.status = "AVOIDING"
                else:
                    b.status = "AVOIDING"

if __name__ == "__main__":
    blocked = {(3, 2), (3, 3), (4, 2), (4, 3)}
    drones = {
        "D1": Drone("D1", 2.5, 2.5, 2.5, 2.5),
        "D2": Drone("D2", 8.5, 2.5, 8.5, 2.5),
    }
    tasks = make_zone_tasks(12, 8, 2, blocked)
    assign_tasks(tasks, drones, 1, blocked)
    path = astar((0, 0), (7, 7), blocked, 12, 8)
    
    assert all(task.assigned_drone for task in tasks)
    assert path and path[0] == (0, 0) and path[-1] == (7, 7)
    
    print("Swarm test successful")
    for task in tasks:
        print(task.task_id, "->", task.assigned_drone)
    print("A*:", path)
