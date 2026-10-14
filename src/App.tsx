import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Drone, EnvironmentType, MissionStatus, MovingObstacle, Target, Task } from './types';
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
import { TelemetryDrawer } from './components/TelemetryDrawer';

export const App: React.FC = () => {
  // Navigation View (defaults to 'gcs')
  const [viewMode, setViewMode] = useState<ViewMode>('gcs');

  // Environment State
  const [environment, setEnvironment] = useState<EnvironmentType>('SUBTERRANEAN_CAVE');
  const [darknessLevel, setDarknessLevel] = useState<number>(0.85); // 85% darkness in subterranean cave

  // Core Simulation State
  const blockedRef = useRef<Set<string>>(makeObstacles('SUBTERRANEAN_CAVE'));
  const [drones, setDrones] = useState<Record<string, Drone>>(() => createDrones());
  const [targets, setTargets] = useState<Record<string, Target>>(() => createInitialTargets());
  const [tasks, setTasks] = useState<Task[]>(() =>
    makeZoneTasks(GRID_W, GRID_H, 5, blockedRef.current)
  );

  const [movingObstacles, setMovingObstacles] = useState<MovingObstacle[]>(() => createMovingObstacles());
  const [movingObstaclesEnabled, setMovingObstaclesEnabled] = useState<boolean>(true);

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

  // Handle environment change (Subterranean Cave / GPS-Denied Forest / Standard Facility)
  const handleChangeEnvironment = useCallback(
    (env: EnvironmentType) => {
      setEnvironment(env);
      const newBlocked = makeObstacles(env);
      blockedRef.current = newBlocked;

      // Adjust darkness accordingly
      if (env === 'SUBTERRANEAN_CAVE') {
        setDarknessLevel(0.9);
      } else if (env === 'GPS_DENIED_FOREST') {
        setDarknessLevel(0.4);
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
    const newBlocked = makeObstacles(environment);
    blockedRef.current = newBlocked;
    const newDrones = createDrones();
    const newTargets = createInitialTargets();
    const newTasks = makeZoneTasks(GRID_W, GRID_H, 5, newBlocked);
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
  }, [environment]);

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
      } else if (cmd === 'FAIL_D2') {
        const currentDrones = { ...dronesRef.current };
        const currentTasks = [...tasksRef.current];

        if (currentDrones['D2'] && currentDrones['D2'].healthy) {
          currentDrones['D2'].healthy = false;
          currentDrones['D2'].status = 'FAILED';
          currentDrones['D2'].path = [];
          logEvent('DRONE_D2_INDUCED_MOTOR_FAILURE');

          reassignFailedDrone(currentTasks, currentDrones, 'D2');
          setTasks(currentTasks);
          setDrones({ ...currentDrones });
          logEvent('D2_TASKS_DYNAMICALLY_REDISTRIBUTED');
        }
      } else if (cmd === 'ADD_TARGET') {
        const currentTargets = { ...targetsRef.current };
        const nextId = Object.keys(currentTargets).length + 1;
        const targetId = `T${nextId}`;

        // Cycle through target classes from PDF: HUMAN, VEHICLE, STRUCTURAL_CRACK
        const types: ('HUMAN' | 'VEHICLE' | 'STRUCTURAL_CRACK')[] = [
          'HUMAN',
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

        currentTargets[targetId] = {
          target_id: targetId,
          x: tx,
          y: ty,
          type: assignedType,
          priority: 'HIGH',
          found: false,
          confidence: 0,
          assigned_drone: null,
          rgbConfidence: 0,
          lidarConfidence: 0,
          kalmanFusedConfidence: 0,
        };
        setTargets(currentTargets);
        logEvent(`TARGET_${targetId}_[${assignedType}]_DEPLOYED_AT_[${tx},${ty}]`);
      } else if (cmd === 'RESET') {
        handleReset();
      }
    },
    [handleReset, logEvent]
  );

  // Toggle specific drone failure/repair
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
        logEvent(`DRONE_${droneId}_FAILURE_INJECTED`);

        reassignFailedDrone(currentTasks, currentDrones, droneId);
        setTasks(currentTasks);
        setDrones({ ...currentDrones });
        logEvent(`${droneId}_TASKS_REASSIGNED_TO_SWARM`);
      } else {
        drone.healthy = true;
        drone.status = 'IDLE';
        drone.battery = 100.0;
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

  // Add target at cell
  const handleAddTargetAt = useCallback(
    (cellX: number, cellY: number) => {
      const currentTargets = { ...targetsRef.current };
      const nextId = Object.keys(currentTargets).length + 1;
      const targetId = `T${nextId}`;

      const types: ('HUMAN' | 'VEHICLE' | 'STRUCTURAL_CRACK')[] = [
        'HUMAN',
        'VEHICLE',
        'STRUCTURAL_CRACK',
      ];
      const assignedType = types[(nextId - 1) % types.length];

      currentTargets[targetId] = {
        target_id: targetId,
        x: cellX,
        y: cellY,
        type: assignedType,
        priority: 'HIGH',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
      };
      setTargets(currentTargets);
      logEvent(`TARGET_${targetId}_[${assignedType}]_PLACED_AT_[${cellX},${cellY}]`);
    },
    [logEvent]
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

      // Update Moving Obstacles (Bouncing across cavern)
      if (movingObstaclesEnabledRef.current) {
        for (const mo of currentMoving) {
          mo.x += mo.vx * deltaSec;
          mo.y += mo.vy * deltaSec;

          // Bounce off boundaries
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

        // 3. Move healthy non-paused drones & evaluate DWA local avoidance
        for (const drone of Object.values(currentDrones)) {
          if (waitIds.has(drone.drone_id) || drone.status === 'PAUSED') {
            continue;
          }

          // Evaluate Dynamic Window Approach (DWA) for sudden moving obstacles
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

        // 4. Multi-Modal Sensor Fusion & YOLO Object Detection
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

        // 6. Check mission complete
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

  // Derived Telemetry Values
  const totalSearchedCells = Object.values(drones).reduce((acc, d) => acc + d.searched_cells, 0);
  const totalGridCellsToSearch = tasks.reduce((acc, t) => acc + t.cells.length, 0);
  const areaCovered =
    totalGridCellsToSearch > 0
      ? Math.min(100.0, (totalSearchedCells / totalGridCellsToSearch) * 100.0)
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
                    GCS Swarm Tactical Recon Grid (SLAM & LiDAR Active)
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
                  movingObstacles={movingObstaclesEnabled ? movingObstacles : []}
                  selectedDroneId={selectedDroneId}
                  onSelectDrone={setSelectedDroneId}
                  onAddTargetAt={handleAddTargetAt}
                  missionStatus={missionStatus}
                  environment={environment}
                  onChangeEnvironment={handleChangeEnvironment}
                  darknessLevel={darknessLevel}
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

        {/* TAB 2: Mission Overview (The dedicated tab requested by the user!) */}
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
          />
        )}

        {/* TAB 3: Simulation Grid Focused View */}
        {viewMode === 'simulation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Full Tactical Simulation Grid</h2>
                <p className="text-xs text-slate-400">
                  Subterranean cave exploration with real-time 360° LiDAR raycasting, dynamic moving obstacles, and A* routing.
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
              movingObstacles={movingObstaclesEnabled ? movingObstacles : []}
              selectedDroneId={selectedDroneId}
              onSelectDrone={setSelectedDroneId}
              onAddTargetAt={handleAddTargetAt}
              missionStatus={missionStatus}
              environment={environment}
              onChangeEnvironment={handleChangeEnvironment}
              darknessLevel={darknessLevel}
            />

            {/* Quick Fleet Health Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {Object.values(drones).map((d) => (
                <div
                  key={d.drone_id}
                  onClick={() => setSelectedDroneId(d.drone_id)}
                  className={`bg-[#182235] border p-3 rounded-lg cursor-pointer text-xs flex justify-between items-center transition ${
                    selectedDroneId === d.drone_id ? 'border-sky-400' : 'border-[#29374d]'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{d.drone_id}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !d.healthy
                          ? 'bg-rose-500'
                          : d.status === 'SEARCHING'
                          ? 'bg-emerald-400'
                          : 'bg-sky-400'
                      }`}
                    />
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-slate-300">{d.battery.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-400">{d.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Edge AI & SLAM (PDF Features: SLAM, LiDAR, IMU, Kalman Fusion, YOLO CNN, Jetson Orin NX) */}
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

        {/* TAB 5: Swarm Mesh & DWA (PDF Features: Distributed Mapping, Mesh Relays, Dynamic Window Approach, Federated Learning) */}
        {viewMode === 'swarm_mesh' && (
          <SwarmMeshDwaView
            drones={drones}
            tasks={tasks}
            movingObstacles={movingObstacles}
            onToggleDwaObstacles={() => setMovingObstaclesEnabled(!movingObstaclesEnabled)}
            movingObstaclesEnabled={movingObstaclesEnabled}
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
    </div>
  );
};
