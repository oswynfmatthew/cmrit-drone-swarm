import {
  Drone,
  EdgeComputeStats,
  EnvironmentType,
  ImuState,
  LidarBeam,
  MeshConnection,
  MovingObstacle,
  Point,
  Target,
  Task,
} from './types';

export const CELL = 32;
export const GRID_W = 30; // 960 / 32
export const GRID_H = 20; // 640 / 32
export const WIDTH = GRID_W * CELL; // 960
export const HEIGHT = GRID_H * CELL; // 640

export function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function pointKey(p: Point): string {
  return `${p[0]},${p[1]}`;
}

export function parsePointKey(key: string): Point {
  const [x, y] = key.split(',').map(Number);
  return [x, y];
}

export function* neighbours(p: Point, width: number, height: number): Generator<Point> {
  const [x, y] = p;
  const deltas: Point[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      yield [nx, ny];
    }
  }
}

// Fixed obstacles by environment type
export function makeObstacles(env: EnvironmentType = 'SUBTERRANEAN_CAVE'): Set<string> {
  const blocked = new Set<string>();

  if (env === 'SUBTERRANEAN_CAVE') {
    // Underground cave / tunnel system with rugged cavern walls and central pillars
    const caveRects = [
      // Left tunnel constriction
      { x: 5, y: 1, w: 2, h: 6 },
      { x: 5, y: 9, w: 2, h: 6 },
      // Central rock formation / pillar
      { x: 13, y: 5, w: 4, h: 5 },
      { x: 14, y: 13, w: 3, h: 4 },
      // Eastern crevice / cavern chokepoints
      { x: 21, y: 2, w: 4, h: 3 },
      { x: 23, y: 8, w: 3, h: 6 },
    ];
    for (const r of caveRects) {
      for (let yy = r.y; yy < r.y + r.h; yy++) {
        for (let xx = r.x; xx < r.x + r.w; xx++) {
          if (xx < GRID_W && yy < GRID_H) blocked.add(pointKey([xx, yy]));
        }
      }
    }
  } else if (env === 'GPS_DENIED_FOREST') {
    // Dense structural disaster ruins & collapsed pillars
    const ruinsRects = [
      { x: 6, y: 2, w: 3, h: 4 },
      { x: 11, y: 8, w: 6, h: 2 },
      { x: 19, y: 4, w: 4, h: 5 },
      { x: 24, y: 11, w: 3, h: 4 },
    ];
    for (const r of ruinsRects) {
      for (let yy = r.y; yy < r.y + r.h; yy++) {
        for (let xx = r.x; xx < r.x + r.w; xx++) {
          if (xx < GRID_W && yy < GRID_H) blocked.add(pointKey([xx, yy]));
        }
      }
    }
  } else {
    // Standard facility rects
    const rects = [
      { x: 7, y: 3, w: 5, h: 2 },
      { x: 16, y: 1, w: 3, h: 5 },
      { x: 10, y: 10, w: 6, h: 2 },
      { x: 22, y: 12, w: 4, h: 4 },
    ];
    for (const r of rects) {
      for (let yy = r.y; yy < r.y + r.h; yy++) {
        for (let xx = r.x; xx < r.x + r.w; xx++) {
          if (xx < GRID_W && yy < GRID_H) blocked.add(pointKey([xx, yy]));
        }
      }
    }
  }

  return blocked;
}

// Initial moving obstacles for DWA local avoidance testing
export function createMovingObstacles(): MovingObstacle[] {
  return [
    { id: 'MO_1', x: 260, y: 240, vx: 22, vy: 16, radius: 14 },
    { id: 'MO_2', x: 640, y: 200, vx: -20, vy: 18, radius: 16 },
    { id: 'MO_3', x: 480, y: 380, vx: 18, vy: -20, radius: 14 },
  ];
}

// A* pathfinding
export function astar(
  start: Point,
  goal: Point,
  blocked: Set<string>,
  width: number,
  height: number
): Point[] {
  if (start[0] < 0 || start[0] >= width || start[1] < 0 || start[1] >= height) return [];
  if (goal[0] < 0 || goal[0] >= width || goal[1] < 0 || goal[1] >= height) return [];
  if (blocked.has(pointKey(start)) || blocked.has(pointKey(goal))) return [];
  if (start[0] === goal[0] && start[1] === goal[1]) return [start];

  interface Node {
    pos: Point;
    f: number;
    g: number;
  }

  const openList: Node[] = [{ pos: start, f: distance(start, goal), g: 0 }];
  const cameFrom = new Map<string, Point>();
  const gScores = new Map<string, number>();
  gScores.set(pointKey(start), 0);

  const closedSet = new Set<string>();

  while (openList.length > 0) {
    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i;
      }
    }
    const current = openList.splice(lowestIdx, 1)[0];
    const currentKey = pointKey(current.pos);

    if (current.pos[0] === goal[0] && current.pos[1] === goal[1]) {
      const path: Point[] = [current.pos];
      let curr = current.pos;
      while (cameFrom.has(pointKey(curr))) {
        curr = cameFrom.get(pointKey(curr))!;
        path.push(curr);
      }
      path.reverse();
      return path;
    }

    closedSet.add(currentKey);

    for (const next of neighbours(current.pos, width, height)) {
      const nextKey = pointKey(next);
      if (blocked.has(nextKey) || closedSet.has(nextKey)) continue;

      const tentativeG = current.g + 1;
      const existingG = gScores.get(nextKey) ?? Infinity;

      if (tentativeG < existingG) {
        cameFrom.set(nextKey, current.pos);
        gScores.set(nextKey, tentativeG);
        const f = tentativeG + distance(next, goal);

        const openItem = openList.find((n) => n.pos[0] === next[0] && n.pos[1] === next[1]);
        if (openItem) {
          openItem.g = tentativeG;
          openItem.f = f;
        } else {
          openList.push({ pos: next, f, g: tentativeG });
        }
      }
    }
  }

  return [];
}

// Generate lawnmower zone tasks
export function makeZoneTasks(
  width: number,
  height: number,
  zoneCount: number,
  blocked: Set<string>
): Task[] {
  const zones: Task[] = [];
  const zoneWidth = Math.floor(width / zoneCount);

  for (let z = 0; z < zoneCount; z++) {
    const x0 = z * zoneWidth;
    const x1 = z === zoneCount - 1 ? width : (z + 1) * zoneWidth;
    const cells: Point[] = [];

    for (let y = 0; y < height; y++) {
      const rowX: number[] = [];
      if (y % 2 === 0) {
        for (let x = x0; x < x1; x++) rowX.push(x);
      } else {
        for (let x = x1 - 1; x >= x0; x--) rowX.push(x);
      }

      for (const x of rowX) {
        if (!blocked.has(pointKey([x, y]))) {
          cells.push([x, y]);
        }
      }
    }

    zones.push({
      task_id: `Z${z + 1}`,
      cells,
      assigned_drone: null,
      status: 'PENDING',
      progress: 0,
    });
  }

  return zones;
}

// Initialize Drones with Autonomous Recon Edge Specs
export function createDrones(): Record<string, Drone> {
  const starts: Point[] = [
    [1, 18],
    [6, 18],
    [12, 18],
    [18, 18],
    [26, 18],
  ];

  const drones: Record<string, Drone> = {};
  starts.forEach(([x, y], i) => {
    const id = `D${i + 1}`;
    const px = x * CELL + CELL / 2;
    const py = y * CELL + CELL / 2;

    const edgeCompute: EdgeComputeStats = {
      chipset: 'NVIDIA Jetson Orin NX (16GB)',
      gpuUtil: 48 + (i * 7) % 25,
      inferenceFps: 34.5 + (i % 3) * 1.8, // >30 FPS target
      tensorRtLatencyMs: 16.8 + (i % 4) * 1.2,
      powerWatts: 14.2 + (i % 3) * 0.4, // SWaP constrained power
      vramUsageMb: 3780 + i * 90,
      prunedModelSizeMb: 4.8, // 68% pruned YOLO CNN
    };

    const imu: ImuState = {
      roll: 0,
      pitch: 0,
      yaw: 0,
      driftX: 0,
      driftY: 0,
      driftCorrected: true,
    };

    drones[id] = {
      drone_id: id,
      x: px,
      y: py,
      base_x: px,
      base_y: py,
      speed: 80.0, // Calibrated steady cruise speed for autonomous aerial reconnaissance
      heading: -Math.PI / 2, // pointing up
      battery: 100.0,
      status: 'IDLE',
      task_id: null,
      task_queue: [],
      path: [],
      searched_cells: 0,
      distance_travelled: 0.0,
      healthy: true,

      // PDF Features
      lidarBeams: [],
      imu,
      estimatedPose: [px, py],
      scanMatchingSuccess: true,
      edgeCompute,
      detectedObjectTrack: null,
      dwaActive: false,
      dwaVelocity: { v: 150, omega: 0 },
      meshPeers: [],
      isMeshRelay: i === 2, // D3 serves as central bridge relay
      hopsToGcs: 1,
    };
  });

  return drones;
}

// Initial targets matching the PDF's 3 classes: HUMAN, VEHICLE, STRUCTURAL_CRACK
export function createInitialTargets(): Record<string, Target> {
  return {
    T1: {
      target_id: 'T1',
      x: 24,
      y: 4,
      type: 'HUMAN',
      priority: 'HIGH',
      found: false,
      confidence: 0,
      assigned_drone: null,
      rgbConfidence: 0,
      lidarConfidence: 0,
      kalmanFusedConfidence: 0,
    },
    T2: {
      target_id: 'T2',
      x: 7,
      y: 15,
      type: 'VEHICLE',
      priority: 'MEDIUM',
      found: false,
      confidence: 0,
      assigned_drone: null,
      rgbConfidence: 0,
      lidarConfidence: 0,
      kalmanFusedConfidence: 0,
    },
    T3: {
      target_id: 'T3',
      x: 17,
      y: 10,
      type: 'STRUCTURAL_CRACK',
      priority: 'HIGH',
      found: false,
      confidence: 0,
      assigned_drone: null,
      rgbConfidence: 0,
      lidarConfidence: 0,
      kalmanFusedConfidence: 0,
    },
  };
}

// 360-degree LiDAR Raycasting & Point Cloud generation
export function performLidarScan(
  drone: Drone,
  blocked: Set<string>,
  movingObstacles: MovingObstacle[],
  maxRange: number = 130 // in pixels
): LidarBeam[] {
  const beamCount = 36; // 360 degrees in 10-degree increments
  const beams: LidarBeam[] = [];

  for (let i = 0; i < beamCount; i++) {
    const angle = (i * 2 * Math.PI) / beamCount;
    let dist = maxRange;
    let hitObstacle = false;
    let hitX = drone.x + Math.cos(angle) * maxRange;
    let hitY = drone.y + Math.sin(angle) * maxRange;

    // Ray march in steps of 6 pixels
    for (let r = 8; r <= maxRange; r += 6) {
      const rx = drone.x + Math.cos(angle) * r;
      const ry = drone.y + Math.sin(angle) * r;

      // Check boundaries
      if (rx < 0 || rx >= WIDTH || ry < 0 || ry >= HEIGHT) {
        dist = r;
        hitX = rx;
        hitY = ry;
        hitObstacle = true;
        break;
      }

      // Check static grid obstacles
      const cellX = Math.floor(rx / CELL);
      const cellY = Math.floor(ry / CELL);
      if (blocked.has(pointKey([cellX, cellY]))) {
        dist = r;
        hitX = rx;
        hitY = ry;
        hitObstacle = true;
        break;
      }

      // Check moving obstacles
      let hitMoving = false;
      for (const mo of movingObstacles) {
        if (Math.hypot(rx - mo.x, ry - mo.y) <= mo.radius) {
          dist = r;
          hitX = rx;
          hitY = ry;
          hitObstacle = true;
          hitMoving = true;
          break;
        }
      }
      if (hitMoving) break;
    }

    beams.push({
      angle,
      distance: dist,
      hitX,
      hitY,
      hitObstacle,
    });
  }

  return beams;
}

// Update IMU Drift and apply Scan Matching correction
export function updateImuAndScanMatching(
  drone: Drone,
  dt: number
): void {
  // If moving, IMU accumulates small drift noise (e.g. 0.08 px per sec)
  if (['SEARCHING', 'INVESTIGATING', 'RETURNING'].includes(drone.status)) {
    drone.imu.driftX += (Math.random() - 0.48) * 4.0 * dt;
    drone.imu.driftY += (Math.random() - 0.48) * 4.0 * dt;

    // Scan matching algorithm corrects drift periodically
    if (Math.abs(drone.imu.driftX) > 2.5 || Math.abs(drone.imu.driftY) > 2.5) {
      // Scan matching ICP convergence
      drone.imu.driftX *= 0.35;
      drone.imu.driftY *= 0.35;
      drone.scanMatchingSuccess = true;
      drone.imu.driftCorrected = true;
    }
  }

  // Kalman filter estimated pose (combining IMU + corrected position)
  drone.estimatedPose = [
    drone.x + drone.imu.driftX * 0.1,
    drone.y + drone.imu.driftY * 0.1,
  ];
}

// Dynamic Window Approach (DWA) local obstacle avoidance
export function applyDwaAvoidance(
  drone: Drone,
  movingObstacles: MovingObstacle[],
  _dt: number
): boolean {
  if (!drone.healthy || ['FAILED', 'PAUSED'].includes(drone.status)) return false;

  const safetyRadius = 42.0; // pixels
  let hazardDetected = false;

  for (const mo of movingObstacles) {
    const dist = Math.hypot(drone.x - mo.x, drone.y - mo.y);

    if (dist < safetyRadius + mo.radius) {
      hazardDetected = true;
      // DWA: compute steering vector away from moving obstacle
      const angleAway = Math.atan2(drone.y - mo.y, drone.x - mo.x);
      drone.heading = angleAway;
      drone.dwaActive = true;
      drone.dwaVelocity = { v: 120, omega: 1.8 };

      // Micro nudge to dodge
      drone.x += Math.cos(angleAway) * 1.5;
      drone.y += Math.sin(angleAway) * 1.5;
      break;
    }
  }

  if (!hazardDetected) {
    drone.dwaActive = false;
  }
  return hazardDetected;
}

// Swarm Mesh Network computation
export function updateMeshNetwork(drones: Record<string, Drone>): void {
  const droneList = Object.values(drones);
  const maxMeshRange = 320.0; // pixels transmission range

  for (let i = 0; i < droneList.length; i++) {
    const d1 = droneList[i];
    d1.meshPeers = [];

    // Check distance to base station (GCS base)
    const distToBase = Math.hypot(d1.x - d1.base_x, d1.y - d1.base_y);
    let directGcs = distToBase <= 480;

    for (let j = 0; j < droneList.length; j++) {
      if (i === j) continue;
      const d2 = droneList[j];
      const d = Math.hypot(d1.x - d2.x, d1.y - d2.y);

      if (d <= maxMeshRange && d2.healthy) {
        // Calculate RSSI based on log-distance path loss model
        const rssi = Math.round(-38 - 20 * Math.log10(Math.max(1, d / 20)));
        const latency = Math.round(2 + (d / maxMeshRange) * 8);

        const conn: MeshConnection = {
          peerId: d2.drone_id,
          rssiDbm: rssi,
          latencyMs: latency,
          bandwidthMbps: rssi > -65 ? 54 : 18,
        };
        d1.meshPeers.push(conn);
      }
    }

    // Determine mesh hop count to GCS
    if (directGcs) {
      d1.hopsToGcs = 1;
    } else {
      // Routed through peer
      const hasPeer = d1.meshPeers.length > 0;
      d1.hopsToGcs = hasPeer ? 2 : 99; // 99 means disconnected
    }
  }
}

// Assign tasks to drones
export function assignTasks(
  tasks: Task[],
  drones: Record<string, Drone>,
  cellSize: number,
  _blocked?: Set<string>
): void {
  const available = Object.values(drones).filter(
    (d) => d.healthy && d.status !== 'FAILED' && d.status !== 'COMPLETED'
  );

  for (const task of tasks) {
    if (task.status === 'DONE' || task.status === 'ACTIVE' || task.cells.length === 0) {
      continue;
    }
    if (available.length === 0) break;

    const score = (drone: Drone): number => {
      const startCell: Point = [
        Math.floor(drone.x / cellSize),
        Math.floor(drone.y / cellSize),
      ];
      const first =
        task.progress < task.cells.length
          ? task.cells[task.progress]
          : task.cells[task.cells.length - 1];
      const batteryPenalty = Math.max(0.0, 30.0 - drone.battery) * 2.0;
      return distance(startCell, first) + batteryPenalty + drone.searched_cells * 0.02;
    };

    let bestDrone = available[0];
    let bestScore = score(bestDrone);

    for (let i = 1; i < available.length; i++) {
      const s = score(available[i]);
      if (s < bestScore) {
        bestScore = s;
        bestDrone = available[i];
      }
    }

    task.assigned_drone = bestDrone.drone_id;
    task.status = 'ACTIVE';
    bestDrone.task_queue.push(task.task_id);

    if (bestDrone.task_id === null) {
      bestDrone.task_id = task.task_id;
      bestDrone.status = 'SEARCHING';
    }

    const removeIdx = available.indexOf(bestDrone);
    if (removeIdx !== -1) available.splice(removeIdx, 1);
  }
}

// Reassign tasks when a drone fails
export function reassignFailedDrone(
  tasks: Task[],
  drones: Record<string, Drone>,
  failedId: string
): void {
  const affected = tasks.filter(
    (t) => t.assigned_drone === failedId && t.status !== 'DONE'
  );

  const failedDrone = drones[failedId];
  if (failedDrone) {
    failedDrone.task_id = null;
    failedDrone.task_queue = [];
  }

  for (const task of affected) {
    task.assigned_drone = null;
    task.status = 'PENDING';
  }

  const healthy = Object.values(drones).filter(
    (d) => d.healthy && d.status !== 'FAILED' && d.status !== 'COMPLETED'
  );

  for (const task of affected) {
    if (healthy.length === 0) break;

    let chosen = healthy[0];
    for (let i = 1; i < healthy.length; i++) {
      if (healthy[i].task_queue.length < chosen.task_queue.length) {
        chosen = healthy[i];
      }
    }

    task.assigned_drone = chosen.drone_id;
    task.status = 'ACTIVE';
    chosen.task_queue.push(task.task_id);

    if (chosen.task_id === null) {
      chosen.task_id = task.task_id;
    }
    if (['IDLE', 'RETURNING', 'LOW_BATTERY', 'AVOIDING'].includes(chosen.status)) {
      chosen.status = 'SEARCHING';
    }
  }
}

// Avoid nearby drones (wait/avoidance arbitration)
export function avoidanceWaitIds(
  drones: Record<string, Drone>,
  minDistance: number = 24.0
): Set<string> {
  const healthy = Object.values(drones).filter(
    (d) =>
      d.healthy &&
      !['FAILED', 'COMPLETED', 'PAUSED', 'RETURNING', 'LOW_BATTERY'].includes(d.status)
  );

  const waitIds = new Set<string>();

  for (let i = 0; i < healthy.length; i++) {
    for (let j = i + 1; j < healthy.length; j++) {
      const first = healthy[i];
      const second = healthy[j];
      const dist = Math.hypot(first.x - second.x, first.y - second.y);
      if (dist < minDistance) {
        waitIds.add(first.drone_id > second.drone_id ? first.drone_id : second.drone_id);
      }
    }
  }

  return waitIds;
}

// Build A* path for next cell in task
export function buildPathForTask(
  drone: Drone,
  task: Task,
  blocked: Set<string>
): Point[] {
  if (task.cells.length === 0) return [];
  const current: Point = [Math.floor(drone.x / CELL), Math.floor(drone.y / CELL)];

  while (task.progress < task.cells.length) {
    const goal = task.cells[task.progress];
    const distToGoal = Math.hypot(
      drone.x / CELL - (goal[0] + 0.5),
      drone.y / CELL - (goal[1] + 0.5)
    );

    // If drone is already at or very close to this waypoint, advance
    if (distToGoal <= 0.65) {
      task.progress += 1;
      continue;
    }

    const path = astar(current, goal, blocked, GRID_W, GRID_H);
    if (path.length > 0) {
      return path;
    }

    // If no path to this cell (e.g. corner or blocked), advance to next cell rather than freezing!
    task.progress += 1;
  }

  return [];
}

// Realistic Smooth Aeronautical Drone Kinematics
// Implements angular rate limit (slerp heading), lookahead waypoint smoothing, and banking pitch/roll
export function moveDrone(drone: Drone, dt: number): void {
  if (drone.path.length === 0) return;
  if (['FAILED', 'LOW_BATTERY', 'RETURNING', 'PAUSED', 'COMPLETED'].includes(drone.status)) {
    return;
  }

  const [cellX, cellY] = drone.path[0];
  const targetX = cellX * CELL + CELL / 2;
  const targetY = cellY * CELL + CELL / 2;

  const dx = targetX - drone.x;
  const dy = targetY - drone.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= 0.001) {
    drone.path.shift();
    return;
  }

  // 1. Smooth Angular Heading Rate Slerp (real-life quadcopter yaw dynamics)
  const desiredHeading = Math.atan2(dy, dx);
  let headingDiff = desiredHeading - drone.heading;
  while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
  while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;

  const maxYawRate = 5.5; // rad/sec
  const yawStep = Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), maxYawRate * dt);
  drone.heading += yawStep;

  // IMU banking roll & forward pitch proportional to yaw & flight velocity
  drone.imu.roll = -headingDiff * 0.35;
  drone.imu.pitch = Math.min(0.25, (drone.speed / 100) * 0.18);
  drone.imu.yaw = drone.heading;

  // 2. Waypoint Lookahead Transition (Curves smoothly around corners instead of hard stopping)
  if (dist <= 7.5 && drone.path.length > 1) {
    drone.path.shift();
  }

  // 3. Smooth Linear Step
  const step = Math.max(0.0, drone.speed * dt);

  if (dist <= step) {
    drone.distance_travelled += dist;
    drone.x = targetX;
    drone.y = targetY;
    drone.path.shift();
    drone.battery = Math.max(0.0, drone.battery - dist * 0.0015);
    drone.searched_cells += 1;
  } else {
    const ratio = step / dist;
    drone.x += dx * ratio;
    drone.y += dy * ratio;
    drone.distance_travelled += step;
    drone.battery = Math.max(0.0, drone.battery - step * 0.0015);
  }

  if (drone.battery <= 15 && !['FAILED', 'RETURNING', 'LOW_BATTERY'].includes(drone.status)) {
    drone.status = 'LOW_BATTERY';
    drone.path = [];
  }
}

// Update task progression - Guarantees accurate zone completion and 100% finish
export function updateTasks(
  drones: Record<string, Drone>,
  tasks: Task[],
  blocked: Set<string>
): void {
  for (const task of tasks) {
    if (task.status !== 'ACTIVE' || !task.assigned_drone) continue;

    const drone = drones[task.assigned_drone];
    if (!drone || !drone.healthy) continue;

    if (task.progress >= task.cells.length) {
      task.status = 'DONE';
      task.progress = task.cells.length;
      drone.task_id = null;
      drone.status = 'COMPLETED';
      drone.path = [];
      continue;
    }

    if (drone.path.length === 0) {
      drone.path = buildPathForTask(drone, task, blocked);
    }

    // If all reachable cells in task have been visited
    if (drone.path.length === 0 || task.progress >= task.cells.length) {
      task.status = 'DONE';
      task.progress = task.cells.length;
      drone.task_id = null;
      drone.status = 'COMPLETED';
      drone.path = [];
      continue;
    }

    const current: Point = [Math.floor(drone.x / CELL), Math.floor(drone.y / CELL)];
    const targetCell = task.cells[task.progress];

    const distToTarget = Math.hypot(
      drone.x / CELL - (targetCell[0] + 0.5),
      drone.y / CELL - (targetCell[1] + 0.5)
    );

    if (
      (current[0] === targetCell[0] && current[1] === targetCell[1]) ||
      distToTarget <= 0.8
    ) {
      task.progress += 1;
      drone.path = [];

      if (task.progress >= task.cells.length) {
        task.status = 'DONE';
        task.progress = task.cells.length;
        drone.task_id = null;
        drone.status = 'COMPLETED';
        drone.path = [];
      }
    }
  }
}

// Multi-Modal Sensor Fusion & YOLO Object Detection
export function detectTargetsWithSensorFusion(
  targets: Record<string, Target>,
  drones: Record<string, Drone>,
  cellSize: number,
  darknessLevel: number,
  logEvent: (msg: string) => void
): void {
  for (const target of Object.values(targets)) {
    if (target.found) continue;

    for (const drone of Object.values(drones)) {
      if (!drone.healthy) continue;

      const dx = drone.x / cellSize - (target.x + 0.5);
      const dy = drone.y / cellSize - (target.y + 0.5);
      const d = Math.hypot(dx, dy);

      // Detection threshold: within 2.8 cells (optical camera + LiDAR cone footprint at 30m altitude)
      if (d <= 2.8) {
        // Multi-modal sensor calculations (Slide 6 from PDF):
        // 1. RGB Optical: High resolution, slightly affected by atmospheric darkness
        const opticalClarity = Math.max(0.65, 1.0 - darknessLevel * 0.35);
        const baseProb =
          target.confidence > 0
            ? target.confidence
            : target.type === 'VEHICLE'
            ? 1.0
            : target.type === 'HUMAN'
            ? 0.98
            : target.type === 'ANIMAL'
            ? 0.96
            : 0.99;

        const proximityFactor = Math.max(0.94, 1.0 - (d / 3.5) * 0.06);
        const rgbScore = Math.min(1.0, baseProb * opticalClarity * proximityFactor);

        // 2. 360 LiDAR: Active laser sensing unaffected by darkness
        const lidarScore = Math.min(1.0, 0.96 + (1.0 - d / 3.5) * 0.04);

        // 3. Extended Kalman Filter (EKF) mathematical fusion:
        const fusedConfidence = Math.min(1.0, Math.max(0.92, 0.5 * rgbScore + 0.5 * lidarScore));

        target.rgbConfidence = rgbScore;
        target.lidarConfidence = lidarScore;
        target.kalmanFusedConfidence = fusedConfidence;
        target.confidence = fusedConfidence;

        // Bounding box for YOLO
        const tx = target.x * cellSize + cellSize / 2;
        const ty = target.y * cellSize + cellSize / 2;
        target.bbox = {
          x: tx - 16,
          y: ty - 16,
          w: 32,
          h: 32,
        };

        target.found = true;
        if (!target.assigned_drone) {
          target.assigned_drone = drone.drone_id;
        }
        drone.status = 'INVESTIGATING';

        drone.detectedObjectTrack = {
          targetId: target.target_id,
          type: target.type,
          confidence: fusedConfidence,
          fps: drone.edgeCompute.inferenceFps,
        };

        logEvent(
          `TARGET_${target.target_id}_[${target.type}]_DETECTED_BY_${drone.drone_id}_CONF_${Math.round(
            fusedConfidence * 100
          )}%`
        );
        break;
      }
    }
  }
}

// Check mission completion: true when all zone survey tasks are DONE
export function isMissionComplete(
  tasks: Task[],
  _targets?: Record<string, Target>
): boolean {
  if (tasks.length === 0) return false;
  return tasks.every((t) => t.status === 'DONE');
}
