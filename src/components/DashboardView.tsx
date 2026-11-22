import React, { useState } from 'react';
import { Drone, Target, MissionStatus } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  PlusCircle,
  Radio,
  Zap,
  Cpu,
  ChevronDown,
} from 'lucide-react';

interface DashboardViewProps {
  missionStatus: MissionStatus;
  events: string[];
  drones: Record<string, Drone>;
  targets: Record<string, Target>;
  lastCommand: string;
  speedMultiplier: number;
  onSetSpeed: (speed: number) => void;
  onSendCommand: (cmd: string) => void;
  onSelectDrone: (id: string | null) => void;
  selectedDroneId: string | null;
  onToggleDroneFail: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  missionStatus,
  drones,
  lastCommand,
  speedMultiplier,
  onSetSpeed,
  onSendCommand,
  onSelectDrone,
  selectedDroneId,
  onToggleDroneFail,
}) => {
  const [isFailDropdownOpen, setIsFailDropdownOpen] = useState(false);

  const getDroneIndicator = (drone: Drone) => {
    if (!drone.healthy) return '🔴';
    if (drone.battery <= 20) return '🟠';
    if (drone.status === 'PAUSED') return '🟡';
    if (drone.status === 'COMPLETED') return '🔵';
    if (drone.status === 'INVESTIGATING') return '🟡';
    return '🟢';
  };

  return (
    <div className="space-y-4">
      {/* Simulation Connected & Speed Multiplier */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0c10] border border-zinc-800/90 px-4 py-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
          <span className="text-zinc-200 font-semibold text-xs tracking-wide uppercase">
            GCS Swarm Telemetry Link <span className="text-emerald-400 font-mono ml-1">● ONLINE</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-400 font-mono text-[11px] mr-1">RATE:</span>
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => onSetSpeed(spd)}
              className={`px-2.5 py-1 rounded-md font-mono font-bold transition ${
                speedMultiplier === spd
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/60 border border-red-500'
                  : 'bg-[#12131a] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Mission Rapid Controls */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-4 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center justify-between tracking-tight">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500" />
            <span>Swarm Dispatch Controls</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-400 bg-[#06070a] px-2.5 py-1 rounded-md border border-zinc-800">
            STATE:{' '}
            <strong
              className={
                missionStatus === 'ACTIVE'
                  ? 'text-red-400'
                  : missionStatus === 'COMPLETE'
                  ? 'text-emerald-400'
                  : 'text-zinc-200'
              }
            >
              {missionStatus}
            </strong>
          </span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {/* START */}
          <button
            onClick={() => onSendCommand('START')}
            disabled={missionStatus === 'ACTIVE'}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-35 text-white font-bold text-xs rounded-lg shadow-md shadow-red-950/50 transition active:scale-95 border border-red-500/40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START</span>
          </button>

          {/* PAUSE */}
          <button
            onClick={() => onSendCommand('PAUSE')}
            disabled={missionStatus !== 'ACTIVE'}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#14151c] hover:bg-amber-600/20 disabled:opacity-35 text-amber-400 border border-amber-500/35 hover:border-amber-400 font-bold text-xs rounded-lg shadow transition active:scale-95"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE</span>
          </button>

          {/* RESUME */}
          <button
            onClick={() => onSendCommand('RESUME')}
            disabled={missionStatus !== 'PAUSED'}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#14151c] hover:bg-emerald-600/20 disabled:opacity-35 text-emerald-400 border border-emerald-500/35 hover:border-emerald-400 font-bold text-xs rounded-lg shadow transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5" />
            <span>RESUME</span>
          </button>

          {/* FAIL A DRONE with interactive dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFailDropdownOpen(!isFailDropdownOpen)}
              className="w-full flex items-center justify-between gap-1 py-2.5 px-2 bg-red-950/60 hover:bg-red-900/80 text-red-200 font-bold text-xs rounded-lg shadow transition active:scale-95 border border-red-600/60"
              title="Fail a specific drone (D1 to D5)"
            >
              <div className="flex items-center gap-1 truncate">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                <span className="truncate">FAIL DRONE</span>
              </div>
              <ChevronDown className="w-3 h-3 flex-shrink-0 text-red-300" />
            </button>

            {isFailDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-[#090a0f] border-2 border-red-600 rounded-xl shadow-2xl shadow-black z-50 p-1.5 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 py-1 border-b border-zinc-800">
                  Select Drone to Fail:
                </div>
                {['D1', 'D2', 'D3', 'D4', 'D5'].map((dId) => {
                  const d = drones[dId];
                  const isFailed = d && (!d.healthy || d.status === 'FAILED');
                  return (
                    <button
                      key={dId}
                      onClick={() => {
                        onToggleDroneFail(dId);
                        setIsFailDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition text-left ${
                        isFailed
                          ? 'bg-red-950/80 text-red-200 hover:bg-red-900 border border-red-500/50'
                          : 'bg-[#12131a] text-zinc-200 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isFailed ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
                          }`}
                        />
                        <span>{isFailed ? `Fix ${dId}` : `Fail ${dId}`}</span>
                      </div>
                      <span className="text-[9px] opacity-75">
                        {isFailed ? '[FAILED]' : '[OK]'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* TARGET */}
          <button
            onClick={() => onSendCommand('ADD_TARGET')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#14151c] hover:bg-[#1e1f29] border border-zinc-700 hover:border-red-500/50 text-zinc-100 font-bold text-xs rounded-lg shadow transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5 text-red-400" />
            <span>+TARGET</span>
          </button>

          {/* RESET */}
          <button
            onClick={() => onSendCommand('RESET')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#12131a] hover:bg-[#1b1c26] border border-zinc-800 hover:border-zinc-600 text-zinc-300 font-bold text-xs rounded-lg shadow transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Drone Fleet Operational Grid */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            <span>Recon Drone Fleet Health</span>
          </h2>
          <span className="text-xs font-mono text-zinc-400 bg-[#06070a] px-2.5 py-0.5 rounded-md border border-zinc-800">
            {Object.values(drones).filter((d) => d.healthy).length} / {Object.values(drones).length} active
          </span>
        </div>

        <div className="space-y-2">
          {Object.values(drones).map((drone) => {
            const isSelected = selectedDroneId === drone.drone_id;
            const isFailed = !drone.healthy || drone.status === 'FAILED';

            return (
              <div
                key={drone.drone_id}
                onClick={() => onSelectDrone(isSelected ? null : drone.drone_id)}
                className={`border rounded-lg p-3 transition cursor-pointer flex items-center justify-between gap-3 hover:border-red-500/60 ${
                  isFailed
                    ? 'border-red-600 bg-red-950/40 ring-1 ring-red-500/50 shadow-red-950/60 shadow-lg text-red-200'
                    : isSelected
                    ? 'bg-[#170c10] border-red-500 ring-1 ring-red-500/40 shadow-md shadow-red-950/30'
                    : 'bg-[#07080c] border-zinc-800/90'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{getDroneIndicator(drone)}</span>
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <span className="font-mono">{drone.drone_id}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isFailed
                            ? 'bg-red-600 text-white animate-pulse'
                            : drone.status === 'SEARCHING'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : drone.status === 'COMPLETED'
                            ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {isFailed ? 'FAILED' : drone.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {isFailed ? (
                        <span className="text-red-400 font-semibold">MOTOR FAULT • Tasks Reassigned</span>
                      ) : (
                        <span>Task: {drone.task_id || '-'} • Hops: {drone.hopsToGcs}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Battery & Health */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-bold ${
                        drone.battery <= 20
                          ? 'text-red-400'
                          : drone.battery <= 50
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {drone.battery.toFixed(0)}%
                    </span>
                    <div className="w-16 bg-[#050507] h-1.5 rounded-full overflow-hidden border border-zinc-800 mt-1">
                      <div
                        className={`h-full rounded-full ${
                          drone.battery <= 20
                            ? 'bg-red-500'
                            : drone.battery <= 50
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, drone.battery))}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDroneFail(drone.drone_id);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded font-mono font-bold border transition ${
                      drone.healthy
                        ? 'bg-red-600/15 text-red-400 border-red-500/40 hover:bg-red-600 hover:text-white'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {drone.healthy ? 'Fail' : 'Fix'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edge Compute Hardware Mini HUD (Nvidia Jetson Orin NX) */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-3.5 text-xs shadow-lg">
        <div className="flex items-center justify-between text-zinc-200 font-semibold mb-2">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-red-500" />
            <span>NVIDIA Jetson Orin NX Edge Silicon</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400">TensorRT Active</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-zinc-400 bg-[#06070a] p-2.5 rounded-lg border border-zinc-800/80">
          <div>
            <span className="block text-[10px] text-zinc-500">INFERENCE</span>
            <span className="text-red-400 font-bold">34.5 FPS</span>
          </div>
          <div>
            <span className="block text-[10px] text-zinc-500">LATENCY</span>
            <span className="text-white font-bold">16.8 ms</span>
          </div>
          <div>
            <span className="block text-[10px] text-zinc-500">POWER DRAW</span>
            <span className="text-amber-400 font-bold">14.2 W</span>
          </div>
        </div>
      </div>

      {/* Command Monitor */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-3 flex items-center justify-between text-xs font-mono shadow-lg">
        <span className="text-zinc-500">LAST DISPATCH:</span>
        <span className="text-red-400 font-bold">{lastCommand || 'IDLE'}</span>
      </div>
    </div>
  );
};
