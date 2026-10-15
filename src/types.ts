export type Point = [number, number];

export type DroneStatus =
  | 'IDLE'
  | 'SEARCHING'
  | 'INVESTIGATING'
  | 'AVOIDING'
  | 'LOW_BATTERY'
  | 'RETURNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED';

export type TargetType = 'HUMAN' | 'ANIMAL' | 'VEHICLE' | 'STRUCTURAL_CRACK' | 'ANOMALY';
export type TargetPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Target {
  target_id: string;
  x: number; // cell coord (0 - 29)
  y: number; // cell coord (0 - 19)
  type: TargetType;
  priority: TargetPriority;
  label?: string; // e.g. "Stranded Survivor", "Trapped Animal", "Submerged Vehicle"
  description?: string;
  found: boolean;
  confidence: number;
  assigned_drone: string | null;
  // Multi-modal sensor fusion breakdowns
  rgbConfidence: number;
  lidarConfidence: number;
  kalmanFusedConfidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
  geoCoordinates?: string; // e.g. "34.0538° N, 118.2415° W"
}

export type TaskStatus = 'PENDING' | 'ACTIVE' | 'DONE';

export interface Task {
  task_id: string;
  cells: Point[];
  assigned_drone: string | null;
  status: TaskStatus;
  progress: number;
}

export interface LidarBeam {
  angle: number; // radians
  distance: number; // in pixels
  hitX: number;
  hitY: number;
  hitObstacle: boolean;
}

export interface EdgeComputeStats {
  chipset: string; // e.g. "NVIDIA Jetson Orin NX (16GB)"
  gpuUtil: number; // 0 - 100%
  inferenceFps: number; // e.g. 34.2 FPS (>30 FPS required by spec)
  tensorRtLatencyMs: number; // e.g. 18.4 ms
  powerWatts: number; // e.g. 14.8 W (SWaP constraint)
  vramUsageMb: number; // e.g. 3840 MB
  prunedModelSizeMb: number; // e.g. 4.8 MB (68% pruned)
}

export interface ImuState {
  roll: number;
  pitch: number;
  yaw: number;
  driftX: number; // accumulated IMU drift in pixels
  driftY: number;
  driftCorrected: boolean;
}

export interface MeshConnection {
  peerId: string;
  rssiDbm: number; // -35 to -90 dBm
  latencyMs: number;
  bandwidthMbps: number;
}

export interface Drone {
  drone_id: string;
  x: number; // in pixels
  y: number; // in pixels
  base_x: number;
  base_y: number;
  speed: number; // pixels per second
  heading: number; // radians
  battery: number; // 0 - 100
  status: DroneStatus;
  task_id: string | null;
  task_queue: string[];
  path: Point[];
  searched_cells: number;
  distance_travelled: number;
  healthy: boolean;

  // Features from Autonomous Recon Drone PDF:
  // 1. SLAM & Sensors
  lidarBeams: LidarBeam[];
  imu: ImuState;
  estimatedPose: Point; // Kalman filter fused position estimate
  scanMatchingSuccess: boolean;

  // 2. Edge AI & YOLO Detection
  edgeCompute: EdgeComputeStats;
  detectedObjectTrack: {
    targetId: string;
    type: TargetType;
    confidence: number;
    fps: number;
  } | null;

  // 3. Dynamic Window Approach (DWA) local obstacle avoidance
  dwaActive: boolean;
  dwaVelocity: { v: number; omega: number };

  // 4. Swarm Mesh Networking
  meshPeers: MeshConnection[];
  isMeshRelay: boolean;
  hopsToGcs: number;
}

export type MissionStatus = 'READY' | 'ACTIVE' | 'PAUSED' | 'COMPLETE';
export type EnvironmentType = 'SUBTERRANEAN_CAVE' | 'GPS_DENIED_FOREST' | 'STANDARD_FACILITY' | 'SATELLITE_IMAGE';

export interface BackgroundImageConfig {
  url: string;
  name: string;
  sourceType: 'UPLOAD' | 'SATELLITE_PRESET' | 'GOOGLE_MAPS';
  opacity: number;
}

export interface MovingObstacle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface MissionState {
  mission_status: MissionStatus;
  area_covered: number; // 0 to 100 
  targets_found: number;
  targets_total: number;
  mission_time: number;
  events: string[];
  drones: Drone[];
  targets: Target[];
  tasks: Task[];
  lastCommand: string;
}

export interface SwarmSimulationConfig {
  environment: EnvironmentType;
  darknessLevel: number; // 0 (daylight) to 1 (pitch black cave)
  fogOfWar: boolean;
  showLidarPointClouds: boolean;
  showVoxelGrid: boolean;
  showMeshNetwork: boolean;
  showDwaVectors: boolean;
  movingObstaclesEnabled: boolean;
  gpsAvailable: boolean; // false in tunnels/caves
}
