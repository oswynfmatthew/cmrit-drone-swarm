import pygame

pygame.init()
window = pygame.display.set_mode((700, 450))
pygame.display.set_caption("Drone Simulation Test")
clock = pygame.time.Clock()
font = pygame.font.SysFont("Arial", 24)

x, y = 80, 225
speed = 180
running = True

while running:
    dt = clock.tick(60) / 1000.0
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
            
    x += speed * dt
    if x > 620:
        x = 80
        
    window.fill((18, 24, 35))
    pygame.draw.circle(window, (90, 170, 255), (int(x), int(y)), 14)
    pygame.draw.circle(window, (245, 245, 245), (int(x), int(y)), 16, 1)
    label = font.render("Simulation test: moving drone", True, (235, 240, 245))
    window.blit(label, (180, 30))
    pygame.display.flip()

pygame.quit()
