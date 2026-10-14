import React from 'react';
import { Drone, Task } from '../types';
import { CELL } from '../swarmEngine';
import {
  X,
  Battery,
  Compass,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Sparkles,
  Share2,
} from 'lucide-react';

interface TelemetryDrawerProps {
  drone: Drone | null;
  tasks: Task[];
  onClose: () => void;
  onToggleFail: (id: string) => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  drone,
  tasks,
  onClose,
  onToggleFail,
}) => {
  if (!drone) return null;

  const currentTask = tasks.find((t) => t.task_id === drone.task_id);
  const cellX = (drone.x / CELL).toFixed(2);
  const cellY = (drone.y / CELL).toFixed(2);

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#182235]/95 backdrop-blur-md border-l border-[#29374d] shadow-2xl p-5 flex flex-col z-50 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#29374d] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center font-bold text-sky-400 font-mono text-base">
            {drone.drone_id}
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Autonomous Recon UAV</h3>
            <span className="text-xs text-emerald-400 font-mono">SLAM • Jetson Orin NX</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#222c3e] transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Stats */}
      <div className="mt-5 space-y-4">
        {/* Status card */}
        <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg flex items-center justify-between">
          <span className="text-xs text-slate-400">FLIGHT STATUS</span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
              !drone.healthy
                ? 'bg-rose-500/20 text-rose-400'
                : drone.status === 'SEARCHING'
                ? 'bg-emerald-500/20 text-emerald-400'
                : drone.status === 'INVESTIGATING'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-sky-500/20 text-sky-400'
            }`}
          >
            {drone.status}
          </span>
        </div>

        {/* Battery gauge */}
        <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Battery className="w-4 h-4 text-emerald-400" />
              Power Reserve
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {drone.battery.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[#182235] h-2.5 rounded-full overflow-hidden border border-[#29374d]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                drone.battery <= 20
                  ? 'bg-rose-500'
                  : drone.battery <= 50
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, drone.battery))}%` }}
            />
          </div>
        </div>

        {/* SLAM & 360° LiDAR Status (PDF Slide 3 & 4) */}
        <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-2">
          <div className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            SLAM & Odometry
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#182235] p-2 rounded">
              <span className="text-slate-500 block text-[10px]">360° LiDAR</span>
              <span className="font-mono text-emerald-400 font-bold">36 Beams</span>
            </div>
            <div className="bg-[#182235] p-2 rounded">
              <span className="text-slate-500 block text-[10px]">SCAN MATCHING</span>
              <span className="font-mono text-emerald-400 font-bold">CONVERGED</span>
            </div>
            <div className="bg-[#182235] p-2 rounded">
              <span className="text-slate-500 block text-[10px]">IMU DRIFT ΔX</span>
              <span className="font-mono text-amber-400">
                {drone.imu.driftX.toFixed(2)} px
              </span>
            </div>
            <div className="bg-[#182235] p-2 rounded">
              <span className="text-slate-500 block text-[10px]">IMU DRIFT ΔY</span>
              <span className="font-mono text-amber-400">
                {drone.imu.driftY.toFixed(2)} px
              </span>
            </div>
          </div>
        </div>

        {/* Onboard Edge AI Silicon (NVIDIA Jetson Orin NX) (PDF Slide 8) */}
        <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-2">
          <div className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-sky-400" />
            Edge Compute (NVIDIA Jetson)
          </div>
          <div className="text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">YOLO Inference:</span>
              <span className="font-mono text-sky-400 font-bold">
                {drone.edgeCompute.inferenceFps.toFixed(1)} FPS
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TensorRT Latency:</span>
              <span className="font-mono text-white">
                {drone.edgeCompute.tensorRtLatencyMs.toFixed(1)} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Power Draw (SWaP):</span>
              <span className="font-mono text-amber-400 font-bold">
                {drone.edgeCompute.powerWatts.toFixed(1)} W
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pruned Model Size:</span>
              <span className="font-mono text-purple-400">
                {drone.edgeCompute.prunedModelSizeMb} MB (68% Pruned)
              </span>
            </div>
          </div>
        </div>

        {/* Mesh Networking & DWA (PDF Slide 7 & 9) */}
        <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-2">
          <div className="text-xs font-semibold uppercase text-slate-300 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-purple-400" />
            Mesh & Dynamic Avoidance (DWA)
          </div>
          <div className="text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Hops to Ground Station:</span>
              <span className="font-mono text-emerald-400 font-bold">{drone.hopsToGcs} hop(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Connected Mesh Peers:</span>
              <span className="font-mono text-white">
                {drone.meshPeers.length > 0
                  ? drone.meshPeers.map((p) => p.peerId).join(', ')
                  : 'Base Pad'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DWA Local Dodging:</span>
              <span className={`font-mono font-bold ${drone.dwaActive ? 'text-amber-400' : 'text-slate-400'}`}>
                {drone.dwaActive ? 'ACTIVE (DODGING)' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>

        {/* Coordinates */}
        <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-2">
          <div className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-400" />
            Position & Kinematics
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#182235] p-2 rounded">
              <span className="text-slate-500 block text-[10px]">GRID COORD</span>
              <span className="font-mono text-white font-semibold">[{cellX}, {cellY}]</span>
            </div>
            <div className="bg-[#182235] p-2 rounded">
              <span className="text-slate-500 block text-[10px]">SPEED</span>
              <span className="font-mono text-white font-semibold">{drone.speed} px/s</span>
            </div>
          </div>
        </div>

        {/* Task Progress */}
        {currentTask && (
          <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-sky-400">Task {currentTask.task_id} Progress</span>
              <span className="font-mono text-white">
                {currentTask.progress} / {currentTask.cells.length} cells
              </span>
            </div>
            <div className="w-full bg-[#182235] h-2 rounded-full overflow-hidden border border-[#29374d]">
              <div
                className="bg-sky-400 h-full rounded-full transition-all"
                style={{
                  width: `${(currentTask.progress / currentTask.cells.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Emergency Fail / Repair Button */}
        <div className="pt-2">
          <button
            onClick={() => onToggleFail(drone.drone_id)}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-2 border ${
              drone.healthy
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {drone.healthy ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                Inject Motor Failure (Trigger Re-allocation)
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Repair & Restore Drone
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
