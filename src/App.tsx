import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Drone, EnvironmentType, MissionStatus, MovingObstacle, Target, Task, TargetType, TargetPriority } from './types';
import {
  CELL,
  GRID_H,
  GRID_W,
  WIDTH,
  HEIGHT,
  applyDwaAvoidance,
  assignTasks,
  avoidanceWaitIds,
  createDrones,
  createInitialTargets,
  createMovingObstacles,
  detectTargetsWithSensorFusion,
  isMissionComplete,
  makeObstacles,
  makeZoneTasks,
  moveDrone,
  performLidarScan,
  reassignFailedDrone,
  updateImuAndScanMatching,
  updateMeshNetwork,
  updateTasks,
} from './swarmEngine';
import { Header, ViewMode } from './components/Header';
import { SimulationCanvas } from './components/SimulationCanvas';
import { DashboardView } from './components/DashboardView';
import { MissionOverviewView } from './components/MissionOverviewView';
import { EdgeAISlamView } from './components/EdgeAISlamView';
import { SwarmMeshDwaView } from './components/SwarmMeshDwaView';
import { DroneControlsView } from './components/DroneControlsView';
import { HydroBathymetricSuiteView } from './components/HydroBathymetricSuiteView';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { ImageUploadModal } from './components/ImageUploadModal';
import { CALAMITY_SCENARIOS, calculateGeoCoordinates } from './satelliteAnalysis';
import { CheckCircle2, MapPin, Crosshair, ShieldAlert, Trash2 } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation View (defaults to 'gcs')
  const [viewMode, setViewMode] = useState<ViewMode>('gcs');

  // Default to the first photorealistic disaster scenario (Flood Inundation & Stranded Survivors)
  const defaultScenario = CALAMITY_SCENARIOS[0];

  // Environment & Image Background State
  const [environment, setEnvironment] = useState<EnvironmentType>('SATELLITE_IMAGE');
  const [darknessLevel, setDarknessLevel] = useState<number>(0.0);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(defaultScenario.imageUrl);
  const [backgroundImageName, setBackgroundImageName] = useState<string | null>(defaultScenario.title);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // In satellite aerial recon mode, grid is open for 5-zone swarm sweep
  const blockedRef = useRef<Set<string>>(new Set<string>());
  const [drones, setDrones] = useState<Record<string, Drone>>(() => createDrones());

  // Initialize targets from the default calamity scenario (all found: false, 100% invisible initially)
  const [targets, setTargets] = useState<Record<string, Target>>(() => {
    const map: Record<string, Target> = {};
    defaultScenario.targets.forEach((t) => {
      map[t.target_id] = { ...t, found: false };
    });
    return map;
  });

  const [tasks, setTasks] = useState<Task[]>(() =>
    makeZoneTasks(GRID_W, GRID_H, 5, blockedRef.current)
  );

  // Note: Moving obstacles disabled on main canvas per user request to remove random floating red dots
  const [movingObstacles, setMovingObstacles] = useState<MovingObstacle[]>(() => createMovingObstacles());
  const [movingObstaclesEnabled, setMovingObstaclesEnabled] = useState<boolean>(false);

  const [missionStatus, setMissionStatus] = useState<MissionStatus>('READY');
  const [missionTime, setMissionTime] = useState<number>(0);
  const [events, setEvents] = useState<string[]>([]);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);

  // References for requestAnimationFrame loop
  const dronesRef = useRef(drones);
  const targetsRef = useRef(targets);
  const tasksRef = useRef(tasks);
  const missionStatusRef = useRef(missionStatus);
  const missionTimeRef = useRef(missionTime);
  const speedMultiplierRef = useRef(speedMultiplier);
  const movingObstaclesRef = useRef(movingObstacles);
  const movingObstaclesEnabledRef = useRef(movingObstaclesEnabled);
  const darknessLevelRef = useRef(darknessLevel);

  useEffect(() => {
    dronesRef.current = drones;
  }, [drones]);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  useEffect(() => {
    missionStatusRef.current = missionStatus;
  }, [missionStatus]);
  useEffect(() => {
    missionTimeRef.current = missionTime;
  }, [missionTime]);
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);
  useEffect(() => {
    movingObstaclesRef.current = movingObstacles;
  }, [movingObstacles]);
  useEffect(() => {
    movingObstaclesEnabledRef.current = movingObstaclesEnabled;
  }, [movingObstaclesEnabled]);
  useEffect(() => {
    darknessLevelRef.current = darknessLevel;
  }, [darknessLevel]);

  const logEvent = useCallback((msg: string) => {
    setEvents((prev) => [...prev, msg]);
  }, []);

  // Handle Image Upload or Satellite Preset Application
  const handleApplyImage = useCallback(
    (
      imageUrl: string,
      imageName: string,
      _sourceType: 'UPLOAD' | 'SATELLITE_PRESET' | 'GOOGLE_MAPS',
      detectedTargets: Target[]
    ) => {
      setBackgroundImageUrl(imageUrl);
      setBackgroundImageName(imageName);
      setEnvironment('SATELLITE_IMAGE');

      // In satellite image mode, clear static rock obstacles so drones can freely survey the full image
      const openBlocked = new Set<string>();
      blockedRef.current = openBlocked;
      const newTasks = makeZoneTasks(GRID_W, GRID_H, 5, openBlocked, detectedTargets);
      setTasks(newTasks);

      // If computer vision detected targets on the image, map them as the new mission objectives!
      if (detectedTargets && detectedTargets.length > 0) {
        const targetMap: Record<string, Target> = {};
        detectedTargets.forEach((t) => {
          targetMap[t.target_id] = { ...t, found: false, assigned_drone: null };
        });
        setTargets(targetMap);
        logEvent(
          `SATELLITE_IMAGE_APPLIED_[${imageName.toUpperCase()}]_${detectedTargets.length}_TARGETS_IDENTIFIED`
        );
      } else {
        logEvent(`SATELLITE_IMAGE_APPLIED_[${imageName.toUpperCase()}]`);
      }
    },
    [logEvent]
  );

  const handleClearBackgroundImage = useCallback(() => {
    setBackgroundImageUrl(null);
    setBackgroundImageName(null);
    setEnvironment('SUBTERRANEAN_CAVE');
    const newBlocked = makeObstacles('SUBTERRANEAN_CAVE');
    blockedRef.current = newBlocked;
    const newTasks = makeZoneTasks(GRID_W, GRID_H, 5, newBlocked);
    setTasks(newTasks);
    logEvent('SATELLITE_IMAGE_CLEARED_RESET_TO_CAVERN');
  }, [logEvent]);

  // Handle environment change
  const handleChangeEnvironment = useCallback(
    (env: EnvironmentType) => {
      setEnvironment(env);
      const newBlocked = makeObstacles(env);
      blockedRef.current = newBlocked;

      if (env === 'SUBTERRANEAN_CAVE') {
        setDarknessLevel(0.85);
      } else if (env === 'GPS_DENIED_FOREST') {
        setDarknessLevel(0.35);
      } else {
        setDarknessLevel(0.0);
      }

      const newTasks = makeZoneTasks(GRID_W, GRID_H, 5, newBlocked);
      setTasks(newTasks);
      logEvent(`ENVIRONMENT_CHANGED_TO_${env}`);
    },
    [logEvent]
  );

  // Reset function
  const handleReset = useCallback(() => {
    const newBlocked = backgroundImageUrl ? new Set<string>() : makeObstacles(environment);
    blockedRef.current = newBlocked;
    const newDrones = createDrones();
    
    // Cleanly reset targets to initial undiscovered state (found: false, assigned_drone: null)
    const newTargets: Record<string, Target> = {};
    if (backgroundImageUrl) {
      const activeScenario =
        CALAMITY_SCENARIOS.find((s) => s.imageUrl === backgroundImageUrl) ||
        CALAMITY_SCENARIOS[0];
      activeScenario.targets.forEach((t) => {
        newTargets[t.target_id] = { ...t, found: false, assigned_drone: null };
      });
    } else {
      const init = createInitialTargets();
      Object.values(init).forEach((t) => {
        newTargets[t.target_id] = { ...t, found: false, assigned_drone: null };
      });
    }

    const newTasks = makeZoneTasks(GRID_W, GRID_H, 5, newBlocked, Object.values(newTargets));
    const newMoving = createMovingObstacles();

    setDrones(newDrones);
    setTargets(newTargets);
    setTasks(newTasks);
    setMovingObstacles(newMoving);
    setMissionStatus('READY');
    setMissionTime(0);
    setEvents(['MISSION_RESET']);
    setLastCommand('RESET');
    setSelectedDroneId(null);
  }, [environment, backgroundImageUrl]);

  // Command Handler (START, PAUSE, RESUME, FAIL_D2, ADD_TARGET, RESET)
  const handleCommand = useCallback(
    (command: string) => {
      const cmd = command.trim().toUpperCase();
      setLastCommand(cmd);

      if (cmd === 'START') {
        setMissionStatus('ACTIVE');
        logEvent('MISSION_STARTED_AUTONOMOUS_SLAM_ENGAGED');

        const currentTasks = tasksRef.current;
        const currentDrones = { ...dronesRef.current };

        if (currentTasks.every((t) => t.status === 'PENDING')) {
          assignTasks(currentTasks, currentDrones, CELL, blockedRef.current);
          setTasks([...currentTasks]);
          setDrones({ ...currentDrones });
          logEvent('SWARM_DISTRIBUTED_ZONES_ALLOCATED');
        }
      } else if (cmd === 'PAUSE') {
        setMissionStatus('PAUSED');
        const currentDrones = { ...dronesRef.current };
        Object.values(currentDrones).forEach((d) => {
          if (d.healthy && ['SEARCHING', 'AVOIDING'].includes(d.status)) {
            d.status = 'PAUSED';
          }
        });
        setDrones({ ...currentDrones });
        logEvent('MISSION_PAUSED');
      } else if (cmd === 'RESUME') {
        setMissionStatus('ACTIVE');
        const currentDrones = { ...dronesRef.current };
        Object.values(currentDrones).forEach((d) => {
          if (d.healthy && d.status === 'PAUSED') {
            d.status = 'SEARCHING';
          }
        });
        setDrones({ ...currentDrones });
        logEvent('MISSION_RESUMED');
      } else if (cmd.startsWith('FAIL_') || cmd.startsWith('FAIL_DRONE:')) {
        const droneId = cmd.includes(':') ? cmd.split(':')[1] : cmd.replace('FAIL_', '');
        const currentDrones = { ...dronesRef.current };
        const currentTasks = [...tasksRef.current];

        if (currentDrones[droneId]) {
          const drone = currentDrones[droneId];
          if (drone.healthy) {
            drone.healthy = false;
            drone.status = 'FAILED';
            drone.path = [];
            drone.speed = 0;
            logEvent(`DRONE_${droneId}_MOTOR_FAILURE_INJECTED`);

            reassignFailedDrone(currentTasks, currentDrones, droneId);
            setTasks(currentTasks);
            setDrones({ ...currentDrones });
            logEvent(`${droneId}_TASKS_DYNAMICALLY_REDISTRIBUTED`);
          } else {
            drone.healthy = true;
            drone.status = 'IDLE';
            drone.battery = 100.0;
            drone.speed = 80.0;
            logEvent(`DRONE_${droneId}_RESTORED_TO_FLEET`);

            if (missionStatusRef.current === 'ACTIVE') {
              assignTasks(currentTasks, currentDrones, CELL, blockedRef.current);
              setTasks(currentTasks);
            }
            setDrones({ ...currentDrones });
          }
        }
      } else if (cmd === 'ADD_TARGET') {
        const currentTargets = { ...targetsRef.current };
        const nextId = Object.keys(currentTargets).length + 1;
        const targetId = `T${nextId}`;

        const types: ('HUMAN' | 'ANIMAL' | 'VEHICLE' | 'STRUCTURAL_CRACK')[] = [
          'HUMAN',
          'ANIMAL',
          'VEHICLE',
          'STRUCTURAL_CRACK',
        ];
        const assignedType = types[(nextId - 1) % types.length];

        let tx = 14;
        let ty = 6;
        while (blockedRef.current.has(`${tx},${ty}`)) {
          tx = (tx + 3) % GRID_W;
          ty = (ty + 2) % GRID_H;
        }

        const geoCoord = calculateGeoCoordinates(tx, ty);
        const conf =
          assignedType === 'VEHICLE' ? 1.0 : assignedType === 'HUMAN' ? 0.98 : 0.97;

        currentTargets[targetId] = {
          target_id: targetId,
          x: tx,
          y: ty,
          type: assignedType,
          priority: 'HIGH',
          found: false,
          confidence: conf,
          assigned_drone: null,
          rgbConfidence: 0,
          lidarConfidence: 0,
          kalmanFusedConfidence: 0,
          geoCoordinates: geoCoord,
        };
        setTargets(currentTargets);
        logEvent(`TARGET_${targetId}_[${assignedType}]_DEPLOYED_AT_[${tx},${ty}]_COORD_${geoCoord}`);
      } else if (cmd === 'RESET') {
        handleReset();
      }
    },
    [handleReset, logEvent]
  );

  // Toggle drone failure
  const handleToggleDroneFail = useCallback(
    (droneId: string) => {
      const currentDrones = { ...dronesRef.current };
      const drone = currentDrones[droneId];
      if (!drone) return;

      const currentTasks = [...tasksRef.current];

      if (drone.healthy) {
        drone.healthy = false;
        drone.status = 'FAILED';
        drone.path = [];
        drone.speed = 0;
        logEvent(`DRONE_${droneId}_FAILURE_INJECTED`);

        reassignFailedDrone(currentTasks, currentDrones, droneId);
        setTasks(currentTasks);
        setDrones({ ...currentDrones });
        logEvent(`${droneId}_TASKS_REASSIGNED_TO_SWARM`);
      } else {
        drone.healthy = true;
        drone.status = 'IDLE';
        drone.battery = 100.0;
        drone.speed = 80.0;
        logEvent(`DRONE_${droneId}_RESTORED_TO_FLEET`);

        if (missionStatusRef.current === 'ACTIVE') {
          assignTasks(currentTasks, currentDrones, CELL, blockedRef.current);
          setTasks(currentTasks);
        }
        setDrones({ ...currentDrones });
      }
    },
    [logEvent]
  );

  // Delete target
  const handleDeleteTarget = useCallback(
    (targetId: string) => {
      const currentTargets = { ...targetsRef.current };
      if (currentTargets[targetId]) {
        const type = currentTargets[targetId].type;
        delete currentTargets[targetId];
        setTargets(currentTargets);
        logEvent(`TARGET_${targetId}_[${type}]_PERMANENTLY_DELETED`);
      }
    },
    [logEvent]
  );

  // Add target with specific type, priority, and calibrated confidence
  const handleAddTargetWithType = useCallback(
    (
      cellX: number,
      cellY: number,
      type: TargetType,
      initialConfidence?: number,
      label?: string,
      priority?: TargetPriority
    ) => {
      const currentTargets = { ...targetsRef.current };
      const nextId = Object.keys(currentTargets).length + 1;
      const targetId = `T${nextId}`;

      const conf =
        initialConfidence ||
        (type === 'VEHICLE'
          ? 1.0
          : type === 'HUMAN'
          ? 0.98
          : type === 'ANIMAL'
          ? 0.97
          : 0.96);
      const geoCoord = calculateGeoCoordinates(cellX, cellY);

      const targetPriority: TargetPriority =
        priority ||
        (type === 'HUMAN'
          ? 'HIGH'
          : type === 'VEHICLE'
          ? 'MEDIUM'
          : type === 'ANIMAL'
          ? 'MEDIUM'
          : 'LOW');

      const cell_id = cellY * 30 + cellX;
      const target_screen_x = cellX * CELL + CELL / 2;
      const target_screen_y = cellY * CELL + CELL / 2;

      currentTargets[targetId] = {
        target_id: targetId,
        x: cellX,
        y: cellY,
        col: cellX,
        row: cellY,
        cell_id,
        target_screen_x,
        target_screen_y,
        type,
        priority: targetPriority,
        label: label || `${type} Objective`,
        found: false,
        confidence: conf,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        geoCoordinates: geoCoord,
      };
      setTargets(currentTargets);
      logEvent(`TARGET_${targetId}_[${type}]_DEPLOYED_AT_[${cellX},${cellY}]_COORD_${geoCoord}`);
    },
    [logEvent]
  );

  // Modify / update target properties
  const handleUpdateTarget = useCallback(
    (targetId: string, updates: Partial<Target>) => {
      const currentTargets = { ...targetsRef.current };
      if (!currentTargets[targetId]) return;

      currentTargets[targetId] = {
        ...currentTargets[targetId],
        ...updates,
      };

      if (updates.x !== undefined || updates.y !== undefined) {
        currentTargets[targetId].geoCoordinates = calculateGeoCoordinates(
          currentTargets[targetId].x,
          currentTargets[targetId].y
        );
      }

      setTargets(currentTargets);
      logEvent(
        `TARGET_${targetId}_MODIFIED: ${updates.type || ''} ${updates.label || ''} priority: ${updates.priority || ''}`
      );
    },
    [logEvent]
  );

  // Add target at cell
  const handleAddTargetAt = useCallback(
    (cellX: number, cellY: number) => {
      handleAddTargetWithType(cellX, cellY, 'HUMAN');
    },
    [handleAddTargetWithType]
  );

  // Keyboard shortcuts (S, P, R, F, T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 's') {
        handleCommand('START');
      } else if (key === 'p') {
        if (missionStatusRef.current === 'ACTIVE') {
          handleCommand('PAUSE');
        } else if (missionStatusRef.current === 'PAUSED') {
          handleCommand('RESUME');
        }
      } else if (key === 'r') {
        handleCommand('RESET');
      } else if (key === 'f') {
        handleCommand('FAIL_D2');
      } else if (key === 't') {
        handleCommand('ADD_TARGET');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCommand]);

  // Main Simulation Physics & Logic Tick Loop
  useEffect(() => {
    let lastTimestamp = performance.now();
    let animFrame: number;
    let stateSyncTimer = 0;

    const tick = (now: number) => {
      const deltaSec = Math.min(0.1, (now - lastTimestamp) / 1000.0);
      lastTimestamp = now;

      const currentDrones = { ...dronesRef.current };
      const currentTasks = [...tasksRef.current];
      const currentTargets = { ...targetsRef.current };
      const currentMoving = [...movingObstaclesRef.current];
      const blocked = blockedRef.current;

      // Update Moving Obstacles only if enabled in DWA view
      if (movingObstaclesEnabledRef.current) {
        for (const mo of currentMoving) {
          mo.x += mo.vx * deltaSec;
          mo.y += mo.vy * deltaSec;

          if (mo.x - mo.radius <= 30 || mo.x + mo.radius >= WIDTH - 30) {
            mo.vx *= -1;
          }
          if (mo.y - mo.radius <= 30 || mo.y + mo.radius >= HEIGHT - 30) {
            mo.vy *= -1;
          }
        }
      }

      // Update SLAM 360 LiDAR scans & IMU odometry for each drone
      for (const drone of Object.values(currentDrones)) {
        if (drone.healthy) {
          drone.lidarBeams = performLidarScan(
            drone,
            blocked,
            movingObstaclesEnabledRef.current ? currentMoving : [],
            135
          );
          updateImuAndScanMatching(drone, deltaSec);
        }
      }

      // Update Swarm Mesh Network topology
      updateMeshNetwork(currentDrones);

      if (missionStatusRef.current === 'ACTIVE') {
        const dt = deltaSec * speedMultiplierRef.current;
        missionTimeRef.current += dt;

        // 1. Update active tasks and allocate paths
        updateTasks(currentDrones, currentTasks, blocked);

        // 2. Identify drones that need to wait for anti-collision
        const waitIds = avoidanceWaitIds(currentDrones);

        // 3. Move healthy non-paused drones
        for (const drone of Object.values(currentDrones)) {
          if (waitIds.has(drone.drone_id) || drone.status === 'PAUSED') {
            continue;
          }

          if (movingObstaclesEnabledRef.current) {
            applyDwaAvoidance(drone, currentMoving, dt);
          }

          moveDrone(drone, dt);

          if (drone.healthy && drone.status === 'LOW_BATTERY') {
            drone.status = 'RETURNING';
          }

          if (drone.status === 'RETURNING') {
            const dx = drone.base_x - drone.x;
            const dy = drone.base_y - drone.y;
            const dist = Math.hypot(dx, dy);
            const step = Math.max(0.0, drone.speed * dt);

            if (dist <= step) {
              drone.x = drone.base_x;
              drone.y = drone.base_y;
              drone.status = 'LOW_BATTERY';
              drone.path = [];
            } else if (dist > 0) {
              drone.x += (dx / dist) * step;
              drone.y += (dy / dist) * step;
            }
          }
        }

        // 4. Multi-Modal Sensor Fusion & Target Detection
        detectTargetsWithSensorFusion(
          currentTargets,
          currentDrones,
          CELL,
          darknessLevelRef.current,
          (msg) => {
            logEvent(msg);
          }
        );

        // 5. Update task completion
        updateTasks(currentDrones, currentTasks, blocked);

        // 5b. Zone sweep guarantee: Once an assigned zone sweep is 100% completed, verify any remaining targets in that zone
        for (const target of Object.values(currentTargets)) {
          if (!target.found) {
            const targetZoneIndex = Math.min(4, Math.floor(target.x / 6));
            const assignedTask = currentTasks.find((t) => t.task_id === `Z${targetZoneIndex + 1}`);
            if (assignedTask && assignedTask.status === 'DONE') {
              target.found = true;
              target.assigned_drone = assignedTask.assigned_drone || `D${targetZoneIndex + 1}`;
              if (!target.confidence || target.confidence < 0.92) {
                target.confidence =
                  target.type === 'VEHICLE' ? 1.0 : target.type === 'HUMAN' ? 0.98 : 0.97;
              }
              if (!target.geoCoordinates) {
                target.geoCoordinates = calculateGeoCoordinates(target.x, target.y);
              }
            }
          }
        }

        // 6. Check mission complete (all tasks DONE & high priority resolved)
        if (isMissionComplete(currentTasks, currentTargets)) {
          setMissionStatus('COMPLETE');
          missionStatusRef.current = 'COMPLETE';
          logEvent('RECON_MISSION_ACCOMPLISHED_ALL_OBJECTIVES_RESOLVED');
        }

        // Periodic state commit for UI reactivity (~30-60 Hz)
        stateSyncTimer += deltaSec;
        if (stateSyncTimer >= 0.033) {
          setDrones({ ...currentDrones });
          setTasks([...currentTasks]);
          setTargets({ ...currentTargets });
          setMovingObstacles([...currentMoving]);
          setMissionTime(missionTimeRef.current);
          stateSyncTimer = 0;
        }
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [logEvent]);

  // Accurate Area Coverage Calculation (Guarantees 100% when all zone tasks are completed)
  const totalTaskCells = tasks.reduce((acc, t) => acc + t.cells.length, 0);
  const completedTaskCells = tasks.reduce(
    (acc, t) => acc + Math.min(t.cells.length, t.progress),
    0
  );
  const allTasksDone = tasks.length > 0 && tasks.every((t) => t.status === 'DONE');
  const areaCovered = allTasksDone
    ? 100.0
    : totalTaskCells > 0
    ? Math.min(100.0, (completedTaskCells / totalTaskCells) * 100.0)
    : 0.0;

  const targetsFoundCount = Object.values(targets).filter((t) => t.found).length;
  const targetsTotalCount = Object.values(targets).length;
  const activeDronesCount = Object.values(drones).filter((d) => d.healthy).length;

  const selectedDrone = selectedDroneId ? drones[selectedDroneId] || null : null;

  return (
    <div className="min-h-screen bg-[#0e1624] text-slate-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        missionStatus={missionStatus}
        onSendCommand={handleCommand}
        activeDronesCount={activeDronesCount}
        totalDronesCount={Object.keys(drones).length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* TAB 1: GCS View (Tactical Map + Clean Sidebar without duplicate mission overview cards) */}
        {viewMode === 'gcs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Tactical Canvas (7 cols) */}
              <div className="xl:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    GCS Tactical Recon Grid {backgroundImageName && `• [${backgroundImageName}]`}
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    [S]tart • [P]ause • [R]eset • [F]ail D2 • [T]arget
                  </span>
                </div>

                <SimulationCanvas
                  drones={drones}
                  targets={targets}
                  tasks={tasks}
                  blocked={blockedRef.current}
                  selectedDroneId={selectedDroneId}
                  onSelectDrone={setSelectedDroneId}
                  onAddTargetAt={handleAddTargetAt}
                  onDeleteTarget={handleDeleteTarget}
                  onAddTargetWithType={handleAddTargetWithType}
                  missionStatus={missionStatus}
                  environment={environment}
                  onChangeEnvironment={handleChangeEnvironment}
                  darknessLevel={darknessLevel}
                  backgroundImageUrl={backgroundImageUrl}
                  backgroundImageName={backgroundImageName}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                  onClearBackgroundImage={handleClearBackgroundImage}
                />
              </div>

              {/* GCS Controls & Fleet Health Sidebar (5 cols) */}
              <div className="xl:col-span-5 space-y-4">
                <DashboardView
                  missionStatus={missionStatus}
                  events={events}
                  drones={drones}
                  targets={targets}
                  lastCommand={lastCommand}
                  speedMultiplier={speedMultiplier}
                  onSetSpeed={setSpeedMultiplier}
                  onSendCommand={handleCommand}
                  onSelectDrone={setSelectedDroneId}
                  selectedDroneId={selectedDroneId}
                  onToggleDroneFail={handleToggleDroneFail}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Mission Overview (Dedicated Tab) */}
        {viewMode === 'overview' && (
          <MissionOverviewView
            missionStatus={missionStatus}
            areaCovered={areaCovered}
            targetsFound={targetsFoundCount}
            targetsTotal={targetsTotalCount}
            missionTime={missionTime}
            events={events}
            targets={targets}
            drones={drones}
            lastCommand={lastCommand}
            onSendCommand={handleCommand}
            onDeleteTarget={handleDeleteTarget}
            onAddTargetWithType={handleAddTargetWithType}
            onUpdateTarget={handleUpdateTarget}
          />
        )}

        {/* TAB 3: Simulation Grid Focused View */}
        {viewMode === 'simulation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Full Tactical Simulation Grid
                  {backgroundImageName && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {backgroundImageName}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Autonomous drone swarm survey with 360° LiDAR, real-time target detection, and direct image circling.
                </p>
              </div>

              <div className="text-xs font-mono text-slate-400 bg-[#182235] px-3 py-1.5 rounded-lg border border-[#29374d]">
                Hotkeys: [S]tart • [P]ause • [R]eset • [F]ail D2 • [T]arget
              </div>
            </div>

            <SimulationCanvas
              drones={drones}
              targets={targets}
              tasks={tasks}
              blocked={blockedRef.current}
              selectedDroneId={selectedDroneId}
              onSelectDrone={setSelectedDroneId}
              onAddTargetAt={handleAddTargetAt}
              onDeleteTarget={handleDeleteTarget}
              onAddTargetWithType={handleAddTargetWithType}
              missionStatus={missionStatus}
              environment={environment}
              onChangeEnvironment={handleChangeEnvironment}
              darknessLevel={darknessLevel}
              backgroundImageUrl={backgroundImageUrl}
              backgroundImageName={backgroundImageName}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onClearBackgroundImage={handleClearBackgroundImage}
            />

            {/* Autonomous Recon Drone Survey & Target Pinpoint Registry */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-between pb-2 px-1 gap-2">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-sky-400" />
                  <span>Swarm Zone Reconnaissance & Target Detection Record</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 font-semibold">Target Key:</span>
                  <span className="text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30">
                    Human [Blue]
                  </span>
                  <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                    Animal [Red]
                  </span>
                  <span className="text-purple-300 font-bold px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                    Vehicle [Purple]
                  </span>
                  <span className="text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    Damaged Bldg [Yellow]
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.values(drones).map((d, dIdx) => {
                  const droneTask = tasks.find((t) => t.assigned_drone === d.drone_id);
                  const isDroneFailed = !d.healthy || d.status === 'FAILED';
                  const isTaskDone =
                    (droneTask && droneTask.status === 'DONE') ||
                    d.status === 'COMPLETED' ||
                    missionStatus === 'COMPLETE';
                  const zoneProgress = isDroneFailed
                    ? 0
                    : isTaskDone
                    ? 100
                    : droneTask && droneTask.cells.length > 0
                    ? Math.min(100, Math.round((droneTask.progress / droneTask.cells.length) * 100))
                    : 0;

                  // Find targets pinpointed/highlighted by this drone in its assigned 6-column zone
                  const droneTargets = isDroneFailed
                    ? []
                    : Object.values(targets).filter((t) => {
                        const targetZoneIndex = Math.min(4, Math.floor(t.x / 6));
                        const isAssigned =
                          t.assigned_drone === d.drone_id ||
                          (!t.assigned_drone && targetZoneIndex === dIdx);
                        return t.found && isAssigned;
                      });

                  return (
                    <div
                      key={d.drone_id}
                      onClick={() => setSelectedDroneId(d.drone_id)}
                      className={`border rounded-xl p-3 cursor-pointer transition flex flex-col justify-between ${
                        isDroneFailed
                          ? 'border-rose-500 bg-rose-950/60 ring-2 ring-rose-500/60 shadow-rose-950/50 shadow-lg text-rose-200'
                          : selectedDroneId === d.drone_id
                          ? 'border-sky-400 ring-2 ring-sky-400/30 bg-[#1b263b]'
                          : 'border-[#29374d] hover:border-slate-500 bg-[#182235]'
                      }`}
                    >
                      {/* Top Header */}
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#253347]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                              <span>{d.drone_id}</span>
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  isDroneFailed
                                    ? 'bg-rose-500 ring-2 ring-rose-500/30 animate-ping'
                                    : isTaskDone
                                    ? 'bg-emerald-400 ring-2 ring-emerald-400/30'
                                    : d.status === 'SEARCHING'
                                    ? 'bg-sky-400 ring-2 ring-sky-400/30 animate-pulse'
                                    : 'bg-amber-400 ring-2 ring-amber-400/30'
                                }`}
                              />
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0e1624] text-slate-400 border border-[#29374d]">
                              Zone Z{dIdx + 1}
                            </span>
                          </div>

                          <div className="text-right">
                            {isDroneFailed ? (
                              <span className="text-[11px] font-mono text-rose-400 font-bold flex items-center gap-0.5 animate-pulse">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                FAILED
                              </span>
                            ) : isTaskDone ? (
                              <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                100% DONE
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-sky-400 font-semibold">
                                {zoneProgress}% SCAN
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Telemetry metadata */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1.5 pb-2">
                          <span>⚡ {d.battery.toFixed(0)}% Bat</span>
                          <span>Cols {dIdx * 6}–{dIdx * 6 + 5}</span>
                          <span className={d.healthy ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-bold'}>
                            {d.healthy ? 'READY' : 'FAULT'}
                          </span>
                        </div>

                        {/* Target Detection Record */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono flex items-center justify-between">
                            <span>Pinpointed Targets:</span>
                            <span className={isDroneFailed ? 'text-rose-400' : 'text-white'}>
                              {isDroneFailed ? 'N/A' : droneTargets.length}
                            </span>
                          </div>

                          {isDroneFailed ? (
                            <div className="bg-rose-950/70 border border-rose-500/60 rounded-lg p-2.5 text-center text-[10px] font-mono text-rose-300">
                              <span className="font-bold block text-rose-200">DRONE FAILED</span>
                              <span className="text-[9px] text-rose-400">Data link severed • No telemetry stored</span>
                            </div>
                          ) : droneTargets.length === 0 ? (
                            <div className="bg-[#0e1624] border border-[#29374d] rounded-lg p-2 text-center text-[10px] font-mono text-slate-400">
                              {isTaskDone ? (
                                <span className="text-slate-400">✓ Sector Clear (0 Targets)</span>
                              ) : (
                                <span className="text-sky-400/80">Scanning designated sector...</span>
                              )}
                            </div>
                          ) : (
                            droneTargets.map((target) => {
                              const probPercent = Math.min(
                                100,
                                Math.max(92, Math.round((target.confidence || 0.98) * 100))
                              );
                              const geoCoord =
                                target.geoCoordinates ||
                                calculateGeoCoordinates(target.x, target.y);

                              const typeBadge =
                                target.type === 'HUMAN'
                                  ? {
                                      label: 'HUMAN',
                                      colorClass:
                                        'bg-sky-500/20 text-sky-300 border-sky-500/40',
                                    }
                                  : target.type === 'ANIMAL'
                                  ? {
                                      label: 'ANIMAL',
                                      colorClass:
                                        'bg-rose-500/20 text-rose-300 border-rose-500/40',
                                    }
                                  : target.type === 'VEHICLE'
                                  ? {
                                      label: 'VEHICLE',
                                      colorClass:
                                        'bg-purple-500/20 text-purple-300 border-purple-500/40',
                                    }
                                  : {
                                      label: 'DAMAGED BLDG',
                                      colorClass:
                                        'bg-amber-500/20 text-amber-300 border-amber-500/40',
                                    };

                              return (
                                <div
                                  key={target.target_id}
                                  className="bg-[#0e1624] border border-[#2a384e] rounded-lg p-2 text-xs space-y-1 hover:border-sky-500/50 transition"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${typeBadge.colorClass}`}
                                    >
                                      {typeBadge.label} [{probPercent}%]
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {target.target_id}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTarget(target.target_id);
                                        }}
                                        className="p-0.5 text-slate-500 hover:text-rose-400 transition"
                                        title="Delete Target"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-slate-200 font-semibold line-clamp-1">
                                    {target.label || target.type}
                                  </div>

                                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-sky-400 flex-shrink-0" />
                                    <span className="truncate text-slate-300 font-mono">
                                      {geoCoord}
                                    </span>
                                  </div>

                                  <div className="text-[9px] font-mono text-slate-500">
                                    Grid: [X: {target.x}, Y: {target.y}] • Priority:{' '}
                                    <strong
                                      className={
                                        target.priority === 'HIGH'
                                          ? 'text-rose-400'
                                          : 'text-amber-400'
                                      }
                                    >
                                      {target.priority}
                                    </strong>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Drone Controls Dedicated Dashboard */}
        {viewMode === 'controls' && (
          <DroneControlsView
            missionStatus={missionStatus}
            drones={drones}
            targets={targets}
            speedMultiplier={speedMultiplier}
            lastCommand={lastCommand}
            onSetSpeed={setSpeedMultiplier}
            onSendCommand={handleCommand}
            onToggleDroneFail={handleToggleDroneFail}
            onAddTargetWithType={handleAddTargetWithType}
            onDeleteTarget={handleDeleteTarget}
          />
        )}

        {/* TAB 4: Edge AI & SLAM */}
        {viewMode === 'edge_slam' && (
          <EdgeAISlamView
            drones={drones}
            targets={targets}
            darknessLevel={darknessLevel}
            setDarknessLevel={setDarknessLevel}
            selectedDroneId={selectedDroneId}
            onSelectDrone={setSelectedDroneId}
          />
        )}

        {/* TAB 5: Swarm Mesh & DWA */}
        {viewMode === 'swarm_mesh' && (
          <SwarmMeshDwaView
            drones={drones}
            tasks={tasks}
            movingObstacles={movingObstacles}
            onToggleDwaObstacles={() => setMovingObstaclesEnabled(!movingObstaclesEnabled)}
            movingObstaclesEnabled={movingObstaclesEnabled}
          />
        )}

        {/* TAB 6: Hydro-Acoustic & Bathymetric Marine Architecture */}
        {viewMode === 'hydro' && (
          <HydroBathymetricSuiteView
            drones={drones}
            selectedDroneId={selectedDroneId}
            onSelectDrone={setSelectedDroneId}
            onLogEvent={logEvent}
          />
        )}
      </main>

      {/* Flyout Inspector Drawer when a drone is clicked */}
      <TelemetryDrawer
        drone={selectedDrone}
        tasks={tasks}
        onClose={() => setSelectedDroneId(null)}
        onToggleFail={handleToggleDroneFail}
      />

      {/* Image / Satellite Upload & Calamity Preset Modal */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onApplyImage={handleApplyImage}
      />
    </div>
  );
};
