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
    <div className="space-y-5">
      {/* Simulation Connected & Speed Multiplier */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#182235] border border-[#29374d] px-4 py-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 font-semibold text-xs tracking-wide">
            ● GCS Swarm Telemetry Connected
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Sim Rate:</span>
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => onSetSpeed(spd)}
              className={`px-2 py-0.5 rounded font-mono font-semibold transition ${
                speedMultiplier === spd
                  ? 'bg-sky-500 text-white shadow'
                  : 'bg-[#222c3e] text-slate-400 hover:text-white border border-[#334259]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Mission Rapid Controls */}
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-4 shadow-md">
        <h2 className="text-sm font-semibold text-slate-100 mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            Swarm Dispatch Controls
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            State: <strong className="text-emerald-400">{missionStatus}</strong>
          </span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {/* START */}
          <button
            onClick={() => onSendCommand('START')}
            disabled={missionStatus === 'ACTIVE'}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START</span>
          </button>

          {/* PAUSE */}
          <button
            onClick={() => onSendCommand('PAUSE')}
            disabled={missionStatus !== 'ACTIVE'}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow transition active:scale-95"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE</span>
          </button>

          {/* RESUME */}
          <button
            onClick={() => onSendCommand('RESUME')}
            disabled={missionStatus !== 'PAUSED'}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5" />
            <span>RESUME</span>
          </button>

          {/* FAIL A DRONE with interactive dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFailDropdownOpen(!isFailDropdownOpen)}
              className="w-full flex items-center justify-between gap-1 py-2 px-2 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs rounded-lg shadow transition active:scale-95 border border-rose-500/50"
              title="Fail a specific drone (D1 to D5)"
            >
              <div className="flex items-center gap-1 truncate">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">FAIL A DRONE</span>
              </div>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>

            {isFailDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-[#121a28] border-2 border-rose-500 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-0.5 border-b border-[#29374d]">
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition text-left ${
                        isFailed
                          ? 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-500/40'
                          : 'bg-[#182235] text-slate-200 hover:bg-rose-600 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isFailed ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
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
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+TARGET</span>
          </button>

          {/* RESET */}
          <button
            onClick={() => onSendCommand('RESET')}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-[#222c3e] hover:bg-[#2e3e56] border border-[#374966] text-slate-300 font-semibold text-xs rounded-lg shadow transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Drone Fleet Operational Grid */}
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            Recon Drone Fleet Health
          </h2>
          <span className="text-xs text-slate-400">
            {Object.values(drones).filter((d) => d.healthy).length} / {Object.values(drones).length} operational
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
                className={`border rounded-lg p-3 transition cursor-pointer flex items-center justify-between gap-3 hover:border-sky-500/60 ${
                  isFailed
                    ? 'border-rose-500 bg-rose-950/50 ring-2 ring-rose-500/50 shadow-rose-950/50 shadow-lg text-rose-200'
                    : isSelected
                    ? 'bg-[#1b263b] border-sky-400 ring-1 ring-sky-400/30'
                    : 'bg-[#121a28] border-[#29374d]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{getDroneIndicator(drone)}</span>
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <span>{drone.drone_id}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isFailed
                            ? 'bg-rose-600 text-white animate-pulse'
                            : drone.status === 'SEARCHING'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isFailed ? '🚨 FAILED' : drone.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {isFailed ? (
                        <span className="text-rose-400 font-semibold">MOTOR FAULT • Tasks Reassigned</span>
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
                          ? 'text-rose-400'
                          : drone.battery <= 50
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {drone.battery.toFixed(0)}%
                    </span>
                    <div className="w-16 bg-[#0e1624] h-1.5 rounded-full overflow-hidden border border-[#29374d] mt-1">
                      <div
                        className={`h-full rounded-full ${
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDroneFail(drone.drone_id);
                    }}
                    className={`text-[10px] px-2 py-1 rounded font-mono border ${
                      drone.healthy
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
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
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-3.5 text-xs">
        <div className="flex items-center justify-between text-slate-300 font-semibold mb-2">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            NVIDIA Jetson Orin NX Edge Silicon
          </span>
          <span className="text-[10px] font-mono text-emerald-400">TensorRT Active</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 bg-[#0e1624] p-2 rounded border border-[#29374d]">
          <div>
            <span className="block text-[10px] text-slate-500">INFERENCE</span>
            <span className="text-sky-400 font-bold">34.5 FPS</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500">LATENCY</span>
            <span className="text-white">16.8 ms</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-500">POWER DRAW</span>
            <span className="text-amber-400 font-bold">14.2 W</span>
          </div>
        </div>
      </div>

      {/* Command Monitor */}
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-3 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">LAST DISPATCH:</span>
        <span className="text-sky-400 font-semibold">{lastCommand || 'IDLE'}</span>
      </div>
    </div>
  );
};
