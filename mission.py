from math import hypot
from typing import Dict, List
from common import Drone, Target, Task

class MissionManager:
    def __init__(self):
        self.started = False
        self.events: List[str] = []
        self.targets: Dict[str, Target] = {
            "T1": Target("T1", 24, 4, "HIGH"),
            "T2": Target("T2", 7, 15, "MEDIUM"),
            "T3": Target("T3", 17, 10, "HIGH"),
        }

    def start(self):
        if not self.started:
            self.started = True
            self.events.append("MISSION_STARTED")

    def detect_targets(self, drones: Dict[str, Drone], cell_size: int):
        if cell_size <= 0:
            raise ValueError("cell_size must be positive")
        for target in self.targets.values():
            if target.found:
                continue
            for drone in drones.values():
                if not drone.healthy:
                    continue
                dx = drone.x / cell_size - (target.x + 0.5)
                dy = drone.y / cell_size - (target.y + 0.5)
                d = hypot(dx, dy)
                if d <= 1.2:
                    target.found = True
                    target.assigned_drone = drone.drone_id
                    target.confidence = max(0.5, 1.0 - d / 2.0)
                    drone.status = "INVESTIGATING"
                    self.events.append(
                        f"TARGET_{target.target_id}_FOUND_BY_{drone.drone_id}"
                    )
                    break

    def unresolved_high_priority(self) -> int:
        return sum(
            1 for target in self.targets.values()
            if target.priority == "HIGH" and not target.found
        )

    def mission_complete(self, tasks: List[Task]) -> bool:
        zones_done = all(task.status == "DONE" for task in tasks)
        return zones_done and self.unresolved_high_priority() == 0

    def fail_drone(self, drone: Drone):
        if drone.healthy:
            drone.healthy = False
            drone.status = "FAILED"
            drone.path.clear()
            self.events.append(f"DRONE_{drone.drone_id}_FAILED")
