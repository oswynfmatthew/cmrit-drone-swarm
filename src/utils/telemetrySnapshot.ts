import { Drone, EnvironmentType, MissionStatus, Target, Task } from '../types';
import { CELL } from '../swarmEngine';

export interface TelemetrySnapshotParams {
  missionStatus: MissionStatus;
  missionTime: number;
  areaCovered: number;
  environment: EnvironmentType;
  darknessLevel: number;
  backgroundImageName: string | null;
  drones: Record<string, Drone>;
  tasks: Task[];
  targets: Record<string, Target>;
  events: string[];
}

export function buildTelemetrySnapshot({
  missionStatus,
  missionTime,
  areaCovered,
  environment,
  darknessLevel,
  backgroundImageName,
  drones,
  tasks,
  targets,
  events,
}: TelemetrySnapshotParams) {
  const targetList = Object.values(targets);
  const foundTargets = targetList.filter((t) => t.found);

  const byType: Record<string, number> = {};
  for (const t of targetList) {
    byType[t.type] = (byType[t.type] || 0) + 1;
  }

  return {
    mission: {
      status: missionStatus,
      elapsedSeconds: Number(missionTime.toFixed(1)),
      areaCoveredPercent: Number(areaCovered.toFixed(1)),
      environment,
      darknessLevel,
      sceneName: backgroundImageName || 'Tactical Simulation Grid (No Photo Attached)',
      totalTargets: targetList.length,
      foundTargetsCount: foundTargets.length,
      targetBreakdownByType: byType,
    },
    zones: tasks.map((t, idx) => ({
      zoneId: t.task_id,
      columns: `${idx * 6}-${idx * 6 + 5}`,
      assignedDrone: t.assigned_drone,
      status: t.status,
      progressCells: t.progress,
      totalCells: t.cells.length,
      coveragePercent: t.cells.length > 0 ? Math.round((t.progress / t.cells.length) * 100) : 0,
    })),
    fleet: Object.values(drones).map((d) => ({
      droneId: d.drone_id,
      healthy: d.healthy,
      status: d.status,
      batteryPercent: Number(d.battery.toFixed(1)),
      speedPxPerSec: d.speed,
      gridCell: [Math.floor(d.x / CELL), Math.floor(d.y / CELL)],
      pixelPosition: [Math.round(d.x), Math.round(d.y)],
      activeTask: d.task_id,
      queuedTasks: d.task_queue,
      remainingSweepCells: d.sweep_cells?.length ?? 0,
      searchedCellsTotal: d.searched_cells,
      distanceTravelledPx: Math.round(d.distance_travelled),
      isMeshRelay: d.isMeshRelay,
      hopsToGcs: d.hopsToGcs,
      meshPeersCount: d.meshPeers.length,
      dwaActive: d.dwaActive,
      imuDriftCorrected: d.imu.driftCorrected,
      edgeCompute: {
        chipset: d.edgeCompute.chipset,
        inferenceFps: Number(d.edgeCompute.inferenceFps.toFixed(1)),
        tensorRtLatencyMs: Number(d.edgeCompute.tensorRtLatencyMs.toFixed(1)),
        powerWatts: Number(d.edgeCompute.powerWatts.toFixed(1)),
        gpuUtilPercent: d.edgeCompute.gpuUtil,
      },
      hydroSuite: {
        floatingOnWater: Boolean(d.floatingOnWater),
        rotorCutState: d.rotorCutState || 'ARMED',
        winchState: d.winchState || 'RETRACTED',
        transducerDepthMeters: d.transducerDepthMeters ?? 0,
        tofDepthMeters: d.tofDepthMeters ?? 0,
        tofEchoTimeMs: d.tofEchoTimeMs ?? 0,
        acousticPingCount: d.acousticGnssPoints?.length ?? 0,
      },
    })),
    detectedTargets: foundTargets.map((t) => ({
      targetId: t.target_id,
      type: t.type,
      subType: t.sub_type,
      priority: t.priority,
      gridCoord: [t.x, t.y],
      zone: `Z${Math.max(1, Math.min(5, Math.floor(t.x / 6) + 1))}`,
      assignedDrone: t.assigned_drone,
      confidence: Number((t.confidence || 0).toFixed(2)),
      rgbConfidence: Number((t.rgbConfidence || 0).toFixed(2)),
      lidarConfidence: Number((t.lidarConfidence || 0).toFixed(2)),
      kalmanFusedConfidence: Number((t.kalmanFusedConfidence || 0).toFixed(2)),
      geoCoordinates: t.geoCoordinates,
      label: t.label,
      description: t.description,
    })),
    undetectedTargetsRemaining: targetList
      .filter((t) => !t.found)
      .slice(0, 40)
      .map((t) => ({
        targetId: t.target_id,
        type: t.type,
        gridCoord: [t.x, t.y],
        zone: `Z${Math.max(1, Math.min(5, Math.floor(t.x / 6) + 1))}`,
        priority: t.priority,
      })),
    recentEvents: events.slice(0, 20),
  };
}

export async function encodeImageUrlToJpegDataUrl(
  imageUrl: string | null,
  maxDimension: number = 1024
): Promise<string | null> {
  if (!imageUrl) return null;

  if (
    imageUrl.startsWith('data:image/jpeg;base64,') ||
    imageUrl.startsWith('data:image/jpg;base64,')
  ) {
    if (imageUrl.length <= 2_200_000) return imageUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round((img.width || 960) * scale));
        const h = Math.max(1, Math.round((img.height || 640) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
