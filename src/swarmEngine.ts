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

// Generate lawnmower zone tasks with direct target waypoints
export function makeZoneTasks(
  width: number,
  height: number,
  zoneCount: number,
  blocked: Set<string>,
  occupiedTargets?: (Target | Point)[]
): Task[] {
  const zones: Task[] = [];
  const zoneWidth = Math.floor(width / zoneCount);

  // Group occupied target coordinates by assigned zone slice
  const targetMapByZone: Record<number, Point[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };

  if (occupiedTargets && occupiedTargets.length > 0) {
    occupiedTargets.forEach((item) => {
      const col = Array.isArray(item) ? item[0] : (item.col !== undefined ? item.col : item.x);
      const row = Array.isArray(item) ? item[1] : (item.row !== undefined ? item.row : item.y);
      const zIdx = Math.max(0, Math.min(zoneCount - 1, Math.floor(col / zoneWidth)));
      if (!targetMapByZone[zIdx].some((p) => p[0] === col && p[1] === row)) {
        targetMapByZone[zIdx].push([col, row]);
      }
    });
  }

  for (let z = 0; z < zoneCount; z++) {
    const x0 = z * zoneWidth;
    const x1 = z === zoneCount - 1 ? width : (z + 1) * zoneWidth;
    const cells: Point[] = [];
    const cellSet = new Set<string>();

    // 1. Set drone swarm pathfinding waypoints directly to the occupied cell_id coordinates!
    const targetPoints = targetMapByZone[z] || [];
    for (const pt of targetPoints) {
      if (!blocked.has(pointKey(pt))) {
        cells.push(pt);
        cellSet.add(pointKey(pt));
      }
    }

    // 2. Complete the full lawnmower survey covering all remaining zone cells
    for (let y = 0; y < height; y++) {
      const rowX: number[] = [];
      if (y % 2 === 0) {
        for (let x = x0; x < x1; x++) rowX.push(x);
      } else {
        for (let x = x1 - 1; x >= x0; x--) rowX.push(x);
      }

      for (const x of rowX) {
        const pk = pointKey([x, y]);
        if (!blocked.has(pk) && !cellSet.has(pk)) {
          cells.push([x, y]);
          cellSet.add(pk);
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

      // Hydro-Acoustic, Bathymetric & Marine Technologies Suite
      turtleModeActive: false,
      inverted: false,
      floatingOnWater: false,
      rotorCutState: 'ARMED',
      winchState: 'RETRACTED',
      transducerDepthMeters: 0.0,
      tofDepthMeters: 3.4 + (i * 0.8),
      tofEchoTimeMs: parseFloat((((3.4 + i * 0.8) * 2 / 1482) * 1000).toFixed(2)),
      acousticGnssPoints: [],
      dataFusionProgress: 0,
    };
  });

  return drones;
}

// Initial targets matching user-specified coordinates (12 Humans in Blue, 15 Vehicles in Purple)
export function createInitialTargets(): Record<string, Target> {
  const humanCoords: [number, number, number, string][] = [
    [8, 14, 0.98, 'Rooftop SOS Survivor'],
    [8, 13, 0.95, 'Balcony Civilian'],
    [9, 14, 0.99, 'SOS Distress Signaler'],
    [11, 8, 0.97, 'Stranded Rooftop Evacuee'],
    [11, 9, 0.94, 'Balcony Trapped Resident'],
    [10, 10, 0.96, 'Residential Roof Survivor'],
    [10, 9, 0.98, 'Commercial Porch Evacuee'],
    [19, 6, 1.0, 'SOS Rooftop Survivors (Group)'],
    [20, 6, 0.99, 'Commercial Roof Evacuees'],
    [3, 6, 0.95, 'Isolated Warehouse Survivor'],
    [19, 8, 0.97, 'Terrace Distress Caller'],
    [22, 8, 0.96, 'Flood Shelter Rooftop Citizen'],
  ];

  const vehicleCoords: [number, number, number, string][] = [
    [13, 17, 0.98, 'Submerged Commuter Car'],
    [13, 14, 0.96, 'Marooned Transport Van'],
    [26, 16, 0.97, 'Stranded SUV'],
    [24, 13, 0.99, 'Commercial Box Truck'],
    [27, 19, 0.94, 'Partially Submerged Vehicle'],
    [18, 11, 1.0, 'Swift-Water Rescue Inflatable Craft'],
    [17, 10, 0.96, 'Waterlogged Sedan'],
    [16, 4, 0.98, 'Flooded Service Vehicle'],
    [16, 5, 0.97, 'Submerged Delivery Van'],
    [16, 3, 0.95, 'Abandoned Service Van'],
    [16, 1, 0.96, 'Northern Inundated Vehicle'],
    [17, 9, 0.97, 'Waterlogged Commuter Car'],
    [20, 9, 0.95, 'Submerged Pickup Truck'],
    [25, 9, 0.98, 'Flooded Logistics Truck'],
    [28, 8, 0.94, 'Riverbank Stranded Car'],
  ];

  const targets: Record<string, Target> = {};
  let idx = 1;

  humanCoords.forEach(([x, y, conf, label]) => {
    const id = `T${idx++}`;
    targets[id] = {
      target_id: id,
      x,
      y,
      type: 'HUMAN',
      priority: 'HIGH',
      label,
      description: `Confirmed human target at grid [${x}, ${y}] with ${Math.round(conf * 100)}% confidence`,
      found: false,
      confidence: conf,
      assigned_drone: null,
      rgbConfidence: 0,
      lidarConfidence: 0,
      kalmanFusedConfidence: 0,
    };
  });

  vehicleCoords.forEach(([x, y, conf, label]) => {
    const id = `T${idx++}`;
    targets[id] = {
      target_id: id,
      x,
      y,
      type: 'VEHICLE',
      priority: 'MEDIUM',
      label,
      description: `Confirmed vehicle target at grid [${x}, ${y}] with ${Math.round(conf * 100)}% confidence`,
      found: false,
      confidence: conf,
      assigned_drone: null,
      rgbConfidence: 0,
      lidarConfidence: 0,
      kalmanFusedConfidence: 0,
    };
  });

  return targets;
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
// Implements glitch-free angular smoothing (atan2 normalized difference), continuous step carryover
// across waypoints for seamless 180° lawnmower turns and zero-jitter traversal
export function moveDrone(drone: Drone, dt: number): void {
  if (drone.path.length === 0) return;
  if (['FAILED', 'LOW_BATTERY', 'RETURNING', 'PAUSED', 'COMPLETED'].includes(drone.status)) {
    return;
  }

  // 1. Smooth Linear Motion with Continuous Step Carryover across Waypoints
  let remainingStep = Math.max(0.0, drone.speed * dt);

  while (remainingStep > 0 && drone.path.length > 0) {
    const [cellX, cellY] = drone.path[0];
    const targetX = cellX * CELL + CELL / 2;
    const targetY = cellY * CELL + CELL / 2;

    const dx = targetX - drone.x;
    const dy = targetY - drone.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 0.001) {
      drone.path.shift();
      continue;
    }

    // Smooth Glitch-Free Heading Interpolation (eliminates 180° turn sign-flipping flutter)
    const desiredHeading = Math.atan2(dy, dx);
    const headingDiff = Math.atan2(
      Math.sin(desiredHeading - drone.heading),
      Math.cos(desiredHeading - drone.heading)
    );

    // Exponential smoothing for natural aircraft yaw without oscillation
    const turnRate = 8.5; // rad/sec easing
    drone.heading += headingDiff * Math.min(1.0, turnRate * dt);

    // Smooth IMU banking roll & forward pitch proportional to velocity and angular turn rate
    const targetRoll = -Math.max(-0.35, Math.min(0.35, headingDiff * 0.4));
    drone.imu.roll += (targetRoll - drone.imu.roll) * Math.min(1.0, 10.0 * dt);
    drone.imu.pitch = Math.min(0.22, (drone.speed / 100) * 0.16);
    drone.imu.yaw = drone.heading;

    if (dist <= remainingStep) {
      drone.distance_travelled += dist;
      drone.x = targetX;
      drone.y = targetY;
      drone.battery = Math.max(0.0, drone.battery - dist * 0.0012);
      drone.searched_cells += 1;
      remainingStep -= dist;
      drone.path.shift();
    } else {
      const ratio = remainingStep / dist;
      drone.x += dx * ratio;
      drone.y += dy * ratio;
      drone.distance_travelled += remainingStep;
      drone.battery = Math.max(0.0, drone.battery - remainingStep * 0.0012);
      remainingStep = 0;
    }
  }

  if (drone.battery <= 15 && !['FAILED', 'RETURNING', 'LOW_BATTERY'].includes(drone.status)) {
    drone.status = 'LOW_BATTERY';
    drone.path = [];
  }
}

// Update task progression - Smoothly tracks zone cells without destroying active flight paths
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

    // Advance task progress as drone physically covers each assigned cell
    while (task.progress < task.cells.length) {
      const targetCell = task.cells[task.progress];
      const distToTarget = Math.hypot(
        drone.x / CELL - (targetCell[0] + 0.5),
        drone.y / CELL - (targetCell[1] + 0.5)
      );

      if (distToTarget <= 0.85) {
        task.progress += 1;
      } else {
        break;
      }
    }

    if (task.progress >= task.cells.length) {
      task.status = 'DONE';
      task.progress = task.cells.length;
      drone.task_id = null;
      drone.status = 'COMPLETED';
      drone.path = [];
      continue;
    }

    // Only plan path if current path is depleted, keeping existing waypoints unbroken
    if (drone.path.length === 0) {
      drone.path = buildPathForTask(drone, task, blocked);
    }
  }
}

// ============================================================================
// Hydro-Acoustic, Bathymetric & Marine Technologies Suite
// ============================================================================

// 1. Time-of-Flight (ToF) Depth Calculation: Depth = (v * t) / 2
// v = speed of sound in water (approx 1482 m/s in freshwater at 20°C)
// t = round-trip acoustic pulse echo time in seconds
export function calculateTofDepth(echoTimeMs: number, soundSpeedWater: number = 1482): number {
  const timeSeconds = Math.max(0, echoTimeMs) / 1000.0;
  return parseFloat(((soundSpeedWater * timeSeconds) / 2.0).toFixed(2));
}

// 2. Turtle Mode (Self-Righting Algorithm)
// Software routine that detects if drone is inverted on water and automatically reverses
// the spin direction of two diagonal motors (M1 & M3) to create directional torque and flip upright
export function executeTurtleMode(
  drone: Drone,
  onStep?: (msg: string) => void
): void {
  drone.inverted = true;
  drone.turtleModeActive = true;
  drone.rotorCutState = 'REVERSED_TURTLE';
  onStep?.(`${drone.drone_id}: Inversion detected by 6-axis IMU (pitch > 150°). Turtle Mode self-righting initiated.`);

  setTimeout(() => {
    onStep?.(`${drone.drone_id}: Directional torque applied via reversed M1/M3 motor rotation. Righting hull...`);
  }, 700);

  setTimeout(() => {
    drone.inverted = false;
    drone.turtleModeActive = false;
    drone.rotorCutState = 'ARMED';
    drone.floatingOnWater = true;
    drone.imu.roll = 0;
    drone.imu.pitch = 0;
    onStep?.(`${drone.drone_id}: Craft successfully righted into floating attitude. Propellers locked to standby.`);
  }, 1600);
}

// 3. Automated Rotor-Cut & Winch Control Logic
// Onboard sequencing logic that safely shuts down propulsion motors once the drone detects
// it is floating, then commands motorized winch to lower transducer into calm water
export function executeRotorCutAndWinchDeploy(
  drone: Drone,
  targetDepthMeters: number = 0.5,
  onStep?: (msg: string) => void
): void {
  drone.floatingOnWater = true;
  drone.rotorCutState = 'CUT';
  onStep?.(`${drone.drone_id}: Water landing confirmed via float switches. Propulsion motors CUT (safety shutdown).`);

  drone.winchState = 'DEPLOYING';
  onStep?.(`${drone.drone_id}: Motorized winch deploying acoustic transducer to ${targetDepthMeters}m depth...`);

  setTimeout(() => {
    drone.transducerDepthMeters = targetDepthMeters;
    drone.winchState = 'DEPLOYED';
    onStep?.(`${drone.drone_id}: Transducer stabilized in calm water column. Acoustic sounding active.`);
  }, 1200);
}

// Retract winch and rearm motors
export function executeWinchRetractAndRearm(
  drone: Drone,
  onStep?: (msg: string) => void
): void {
  drone.winchState = 'WINCHING';
  onStep?.(`${drone.drone_id}: Retracting transducer to amphibious fuselage cradle...`);

  setTimeout(() => {
    drone.transducerDepthMeters = 0.0;
    drone.winchState = 'RETRACTED';
    drone.rotorCutState = 'ARMED';
    drone.floatingOnWater = false;
    onStep?.(`${drone.drone_id}: Winch locked. Propulsion motors REARMED for takeoff.`);
  }, 1200);
}

// 4. Acoustic-GNSS Timestamping & Georeferencing
// Coordinates sonar pings with onboard RTK GPS stream in real time, saving synchronized (X, Y, Depth) data points
export function recordAcousticGnssPing(
  drone: Drone,
  measuredDepthMeters: number,
  geoCoordStr: string
): void {
  const echoTime = parseFloat(((measuredDepthMeters * 2 / 1482) * 1000).toFixed(2));
  drone.tofDepthMeters = measuredDepthMeters;
  drone.tofEchoTimeMs = echoTime;

  if (!drone.acousticGnssPoints) {
    drone.acousticGnssPoints = [];
  }

  const newPoint = {
    x: Math.round(drone.x / CELL),
    y: Math.round(drone.y / CELL),
    depthMeters: measuredDepthMeters,
    echoTimeMs: echoTime,
    timestamp: Date.now(),
    rtkQuality: 'RTK_FIXED' as const,
    geoCoord: geoCoordStr,
  };

  // Keep last 30 synchronized acoustic-GNSS points
  drone.acousticGnssPoints = [newPoint, ...drone.acousticGnssPoints].slice(0, 30);
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

      const targetCol = target.col !== undefined ? target.col : target.x;
      const targetRow = target.row !== undefined ? target.row : target.y;

      const droneCellX = Math.floor(drone.x / cellSize);
      const droneCellY = Math.floor(drone.y / cellSize);
      const isExactCell = droneCellX === targetCol && droneCellY === targetRow;

      const dx = drone.x / cellSize - (targetCol + 0.5);
      const dy = drone.y / cellSize - (targetRow + 0.5);
      const d = Math.hypot(dx, dy);

      // Detection threshold: only when drone physically reaches the exact target grid cell
      if (isExactCell || d <= 0.85) {
        // Multi-modal sensor calculations (Slide 6 from PDF):
        // 1. RGB Optical: High resolution, calibrated to ground truth accuracy
        const opticalClarity = Math.max(0.7, 1.0 - darknessLevel * 0.3);
        const calibratedProb =
          target.confidence > 0
            ? target.confidence
            : target.type === 'VEHICLE'
            ? 0.98
            : target.type === 'HUMAN'
            ? 0.98
            : target.type === 'ANIMAL'
            ? 0.96
            : 0.99;

        const rgbScore = Math.min(1.0, calibratedProb * opticalClarity);

        // 2. 360 LiDAR: Active laser sensing unaffected by darkness
        const lidarScore = Math.min(1.0, 0.96 + (1.0 - Math.min(1.0, d / 2.0)) * 0.04);

        // 3. Extended Kalman Filter (EKF) mathematical fusion:
        // Preserves calibrated probability (e.g. 100% remains 100%, 98% remains 98%)
        const fusedConfidence =
          calibratedProb >= 0.99
            ? calibratedProb
            : Math.min(1.0, Math.max(0.92, 0.7 * calibratedProb + 0.15 * rgbScore + 0.15 * lidarScore));

        target.rgbConfidence = rgbScore;
        target.lidarConfidence = lidarScore;
        target.kalmanFusedConfidence = fusedConfidence;
        target.confidence = Math.round(fusedConfidence * 100) / 100;

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
          confidence: target.confidence,
          fps: drone.edgeCompute.inferenceFps,
        };

        logEvent(
          `TARGET_${target.target_id}_[${target.type}]_PINPOINTED_BY_${drone.drone_id}_AT_[${target.x},${target.y}]_CONF_${Math.round(
            target.confidence * 100
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
