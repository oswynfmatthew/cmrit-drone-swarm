import pygame
import sys
import random
import math

# 1. Initialize Pygame & Screen Setup
pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("CMRIT 4-Agent Drone Swarm Search Simulation")
clock = pygame.time.Clock()

# 2. Define the 4 Drones (Positions, Speeds, and Colors)
drones = [
    {"name": "Drone Alpha", "x": 100, "y": 100, "color": (255, 100, 100), "target": None}, # Red
    {"name": "Drone Beta",  "x": 700, "y": 100, "color": (100, 255, 100), "target": None}, # Green
    {"name": "Drone Gamma", "x": 100, "y": 500, "color": (100, 100, 255), "target": None}, # Blue
    {"name": "Drone Delta", "x": 700, "y": 500, "color": (255, 255, 100), "target": None}  # Yellow
]

# 3. Define the Target Object (Emergency Rescue Zone)
target_x = random.randint(150, 650)
target_y = random.randint(150, 450)
speed = 3  # Drone flight movement speed multiplier

# 4. Main Simulation Loop
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    # Clear screen canvas with a modern dark theme
    screen.fill((20, 24, 30))

    # Draw grid tracking lines for search visualization layout
    for x in range(0, WIDTH, 80):
        pygame.draw.line(screen, (35, 40, 50), (x, 0), (x, HEIGHT))
    for y in range(0, HEIGHT, 60):
        pygame.draw.line(screen, (35, 40, 50), (0, y), (WIDTH, y))

    # Draw the target zone marker (Emergency Beacon)
    pygame.draw.circle(screen, (255, 50, 50), (target_x, target_y), 10)
    pygame.draw.circle(screen, (255, 50, 50), (target_x, target_y), 20, 1) # Radar ring

    # Move and update all 4 Drones simultaneously towards the target area
    target_reached_count = 0
    for drone in drones:
        # Calculate angle vector towards target coordinates matrix
        dx = target_x - drone["x"]
        dy = target_y - drone["y"]
        distance = math.hypot(dx, dy)

        if distance > 5:
            # Move drone forward step by step
            drone["x"] += (dx / distance) * speed
            drone["y"] += (dy / distance) * speed
        else:
            target_reached_count += 1

        # Render Drone body node on screen
        pygame.draw.circle(screen, drone["color"], (int(drone["x"]), int(drone["y"])), 15)
        # Render a line trail connecting drone back to its teammate mesh network matrix
        pygame.draw.line(screen, (100, 100, 100, 50), (int(drone["x"]), int(drone["y"])), (target_x, target_y), 1)

    # Swarm logic behavior: if all 4 agents successfully converge, generate a new random target node search field area
    if target_reached_count == len(drones):
        pygame.time.wait(800) # Quick pause to look at convergence achievement point parameters
        target_x = random.randint(150, 650)
        target_y = random.randint(150, 450)

    pygame.display.flip()
    clock.tick(60)
