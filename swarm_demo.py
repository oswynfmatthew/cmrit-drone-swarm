from math import hypot

def grid_path(start, goal, blocked, width, height):
    # Very small beginner demo: move horizontally, then vertically,
    # unless the next cell is blocked.
    x, y = start
    gx, gy = goal
    path = [(x, y)]
    
    while x != gx or y != gy:
        candidates = []
        if x < gx:
            candidates.append((x + 1, y))
        elif x > gx:
            candidates.append((x - 1, y))
            
        if y < gy:
            candidates.append((x, y + 1))
        elif y > gy:
            candidates.append((x, y - 1))
            
        moved = False
        for nx, ny in candidates:
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in blocked:
                x, y = nx, ny
                path.append((x, y))
                moved = True
                break
                
        if not moved:
            return []
            
    return path

width, height = 8, 6
blocked = {(3, 2), (3, 3), (4, 2)}
start = (0, 0)
goal = (7, 5)

path = grid_path(start, goal, blocked, width, height)

print("SWARM INTELLIGENCE TEST")
print("Start:", start)
print("Goal:", goal)
print("Blocked cells:", sorted(blocked))
print("Path found:", path)
print("Number of steps:", max(0, len(path) - 1))
