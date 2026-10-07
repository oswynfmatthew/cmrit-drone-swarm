import simulation
from swarm import astar

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def main():
    blocked = simulation.make_obstacles()
    path = astar((0, 19), (29, 19), blocked, simulation.GRID_W, simulation.GRID_H)
    check(path and path[0] == (0, 19) and path[-1] == (29, 19), "A* path invalid")
    check(all(cell not in blocked for cell in path), "A* path crosses an obstacle")
    
    drones, mission, tasks = simulation.reset_simulation()
    check(len(drones) == 5 and len(tasks) == 5, "Expected 5 drones and 5 zones")
    
    simulation.handle_command("START", drones, mission, tasks)
    check(mission.started, "START failed")
    check(all(task.status == "ACTIVE" for task in tasks), "Not all zones assigned")
    
    target = mission.targets["T1"]
    drones["D1"].x = target.x * simulation.CELL + simulation.CELL / 2
    drones["D1"].y = target.y * simulation.CELL + simulation.CELL / 2
    mission.detect_targets(drones, simulation.CELL)
    check(target.found and target.assigned_drone == "D1", "Target detection failed")
    check(target.confidence == 1.0, "Target center confidence is not 100%")
    
    d2_task = next(task for task in tasks if task.assigned_drone == "D2")
    old_progress = d2_task.progress
    simulation.handle_command("FAIL_D2", drones, mission, tasks)
    check(not drones["D2"].healthy and drones["D2"].status == "FAILED", "D2 failure failed")
    check(d2_task.assigned_drone != "D2" and d2_task.status == "ACTIVE", "D2 task was not reassigned")
    check(d2_task.progress == old_progress, "Reassignment lost progress")
    
    drones, mission, tasks = simulation.reset_simulation()
    simulation.handle_command("START", drones, mission, tasks)
    simulation.handle_command("FAIL_D2", drones, mission, tasks)
    
    completed = False
    for _ in range(20000):
        obstacles = simulation.make_obstacles()
        simulation.update_tasks(drones, tasks, obstacles)
        for drone in drones.values():
            simulation.move_drone(drone, 1 / 60, obstacles)  # Fixed: passed 'obstacles' parameter
        mission.detect_targets(drones, simulation.CELL)
        simulation.update_tasks(drones, tasks, obstacles)
        if all(task.status == "DONE" for task in tasks) and mission.unresolved_high_priority() == 0:
            completed = True
            break
            
    check(completed, "Full headless mission did not complete")
    check(all(target.found for target in mission.targets.values()), "Not all targets were detected")
    
    state = simulation.make_state(drones, tasks, mission, 0.0)
    for key in ("mission_status", "area_covered", "targets_found", "targets_total", "mission_time", "events", "drones", "targets"):
        check(key in state, f"Missing state key: {key}")
        
    print("ALL PRE-COMMIT CHECKS PASSED")

if __name__ == "__main__":
    main()
