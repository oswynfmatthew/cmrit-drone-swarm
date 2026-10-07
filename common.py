from dataclasses import dataclass, field
from typing import List, Optional, Tuple

Point = Tuple[int, int]

@dataclass
class Drone:
    drone_id: str
    x: float
    y: float
    base_x: float
    base_y: float
    speed: float = 150.0
    battery: float = 100.0
    status: str = "IDLE"
    task_id: Optional[str] = None
    task_queue: List[str] = field(default_factory=list)
    path: List[Point] = field(default_factory=list)
    searched_cells: int = 0
    distance_travelled: float = 0.0
    healthy: bool = True

    def position(self) -> Point:
        return int(round(self.x)), int(round(self.y))

@dataclass
class Target:
    target_id: str
    x: int
    y: int
    priority: str = "HIGH"
    found: bool = False
    confidence: float = 0.0
    assigned_drone: Optional[str] = None

@dataclass
class Task:
    task_id: str
    cells: List[Point]
    assigned_drone: Optional[str] = None
    status: str = "PENDING"
    progress: int = 0