from math import hypot
drone = (4, 3)
target = (6, 4)
distance = hypot(drone[0] - target[0], drone[1] - target[1])
print("MISSION TEST")
print("Drone position:", drone)
print("Target position:", target)
print("Distance:", round(distance, 2))
if distance <= 2.5:
 print("RESULT: TARGET DETECTED")
else:
 print("RESULT: TARGET NOT DETECTED")