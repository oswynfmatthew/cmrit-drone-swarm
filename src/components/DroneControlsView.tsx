import React, { useState } from 'react';
import { Drone, Target, MissionStatus, TargetType } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  PlusCircle,
  Trash2,
  Zap,
  Sliders,
  ChevronDown,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { calculateGeoCoordinates } from '../satelliteAnalysis';

interface DroneControlsViewProps {
  missionStatus: MissionStatus;
  drones: Record<string, Drone>;
  targets: Record<string, Target>;
  speedMultiplier: number;
  lastCommand: string;
  onSetSpeed: (speed: number) => void;
  onSendCommand: (cmd: string) => void;
  onToggleDroneFail: (droneId: string) => void;
  onAddTargetWithType?: (
    cellX: number,
    cellY: number,
    type: TargetType,
    initialConfidence?: number
  ) => void;
  onDeleteTarget: (targetId: string) => void;
}

export const DroneControlsView: React.FC<DroneControlsViewProps> = ({
  missionStatus,
  drones,
  targets,
  speedMultiplier,
  lastCommand,
  onSetSpeed,
  onSendCommand,
  onToggleDroneFail,
  onDeleteTarget,
}) => {
  const [isFailDropdownOpen, setIsFailDropdownOpen] = useState(false);

  const droneList = Object.values(drones);
  const failedDrones = droneList.filter((d) => !d.healthy || d.status === 'FAILED');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-red-500" />
            Autonomous Drone Swarm Flight & Dispatch Controls
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Ground Control Station direct telemetry dispatch deck. Command drones, simulate hardware failures, and control targets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#06070a] border border-zinc-800 text-xs font-mono">
            <span className="text-zinc-400">STATE: </span>
            <strong
              className={
                missionStatus === 'ACTIVE'
                  ? 'text-emerald-400'
                  : missionStatus === 'PAUSED'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }
            >
              {missionStatus}
            </strong>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#06070a] border border-zinc-800 text-xs font-mono">
            <span className="text-zinc-400">FAILED DRONES: </span>
            <strong className={failedDrones.length > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>
              {failedDrones.length} / {droneList.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Critical Failure Alert Banner if any drone failed */}
      {failedDrones.length > 0 && (
        <div className="bg-red-950/60 border-2 border-red-600 rounded-xl p-4 shadow-red-950/50 shadow-xl flex items-center justify-between gap-3 text-red-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 animate-bounce" />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>CRITICAL DRONE HARDWARE FAILURE DETECTED</span>
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-mono">
                  {failedDrones.map((d) => d.drone_id).join(', ')} FAILED
                </span>
              </div>
              <p className="text-xs text-red-300 mt-0.5">
                The failed drone has stopped immediately. Its zone tasks have been dynamically redistributed across the remaining active swarm via 802.11s peer mesh.
              </p>
            </div>
          </div>
          <button
            onClick={() => failedDrones.forEach((d) => onToggleDroneFail(d.drone_id))}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
          >
            Restore All Drones
          </button>
        </div>
      )}

      {/* PRIMARY MASTER DISPATCH CONTROLS */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-zinc-800 gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500" />
            Master Swarm Dispatch Commands
          </h3>

          {/* Simulation Rate */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400">Simulation Rate:</span>
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetSpeed(spd)}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  speedMultiplier === spd
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/60 border border-red-500'
                    : 'bg-[#06070a] text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* 6 Core Operation Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* 1. START */}
          <button
            onClick={() => onSendCommand('START')}
            disabled={missionStatus === 'ACTIVE'}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/50 border border-red-500/40 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START</span>
          </button>

          {/* 2. PAUSE */}
          <button
            onClick={() => onSendCommand('PAUSE')}
            disabled={missionStatus !== 'ACTIVE'}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#14151c] hover:bg-amber-600/20 disabled:opacity-35 disabled:cursor-not-allowed text-amber-400 border border-amber-500/35 hover:border-amber-400 font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>PAUSE</span>
          </button>

          {/* 3. RESUME */}
          <button
            onClick={() => onSendCommand('RESUME')}
            disabled={missionStatus !== 'PAUSED'}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#14151c] hover:bg-emerald-600/20 disabled:opacity-35 disabled:cursor-not-allowed text-emerald-400 border border-emerald-500/35 hover:border-emerald-400 font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <Play className="w-4 h-4" />
            <span>RESUME</span>
          </button>

          {/* 4. FAIL A DRONE with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFailDropdownOpen(!isFailDropdownOpen)}
              className="w-full flex items-center justify-between gap-1.5 py-3 px-3 bg-red-950/70 hover:bg-red-900 text-red-200 font-bold text-xs rounded-xl shadow-lg transition active:scale-95 border border-red-600/60"
              title="Fail any specific drone (D1 to D5) with decentralized fault redistribution"
            >
              <div className="flex items-center gap-1.5 truncate">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span className="truncate">FAIL A DRONE</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-red-300" />
            </button>

            {isFailDropdownOpen && (
              <div className="absolute left-0 mt-2 w-52 bg-[#090a0f] border-2 border-red-600 rounded-xl shadow-2xl shadow-black z-50 p-2 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 py-1 font-bold border-b border-zinc-800">
                  Select Drone to Fail / Restore:
                </div>
                {['D1', 'D2', 'D3', 'D4', 'D5'].map((dId) => {
                  const targetDrone = drones[dId];
                  const isFailed = targetDrone && (!targetDrone.healthy || targetDrone.status === 'FAILED');

                  return (
                    <button
                      key={dId}
                      onClick={() => {
                        onToggleDroneFail(dId);
                        setIsFailDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-bold transition text-left ${
                        isFailed
                          ? 'bg-red-950/80 text-red-200 hover:bg-red-900 border border-red-500/40'
                          : 'bg-[#12131a] text-zinc-200 hover:bg-red-600 hover:text-white border border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isFailed ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
                          }`}
                        />
                        <span>{isFailed ? `Fix / Restore ${dId}` : `Fail ${dId}`}</span>
                      </div>
                      <span className="text-[10px] opacity-75">
                        {isFailed ? '[FAILED]' : '[OK]'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. ADD TARGET */}
          <button
            onClick={() => onSendCommand('ADD_TARGET')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#14151c] hover:bg-[#1d1e28] border border-zinc-700 hover:border-red-500/50 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-red-400" />
            <span>+ TARGET</span>
          </button>

          {/* 6. RESET */}
          <button
            onClick={() => onSendCommand('RESET')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#12131a] hover:bg-[#1a1b24] border border-zinc-800 text-zinc-200 font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET</span>
          </button>
        </div>

        {/* Last Command Status */}
        <div className="bg-[#06070a] border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400">LAST GROUND DISPATCH:</span>
          <span className="text-red-400 font-bold">{lastCommand || 'AWAITING DISPATCH'}</span>
        </div>
      </div>

      {/* INDIVIDUAL DRONE OVERRIDE CARDS (D1 through D5) */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500" />
            Individual Drone Flight Controls (D1 - D5)
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            Direct Overrides: Fail / Recover • RTL • Recharge
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {['D1', 'D2', 'D3', 'D4', 'D5'].map((droneId, idx) => {
            const drone = drones[droneId];
            if (!drone) return null;
            const isFailed = !drone.healthy || drone.status === 'FAILED';

            return (
              <div
                key={droneId}
                className={`rounded-xl p-3.5 border transition flex flex-col justify-between gap-3 ${
                  isFailed
                    ? 'border-red-600 bg-red-950/40 ring-2 ring-red-500/50 shadow-red-950/50 shadow-lg'
                    : 'border-zinc-800 bg-[#07080c] hover:border-red-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">{droneId}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFailed
                            ? 'bg-red-500 animate-ping'
                            : drone.status === 'SEARCHING'
                            ? 'bg-red-500 animate-pulse'
                            : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#050507] text-zinc-400 border border-zinc-800">
                      Z{idx + 1}
                    </span>
                  </div>

                  {/* Status Banner */}
                  <div className="pt-2 pb-1">
                    {isFailed ? (
                      <div className="bg-red-900/80 border border-red-500/80 text-red-200 font-mono font-bold text-[10px] px-2 py-1 rounded text-center flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <span>CRITICAL FAULT (FAILED)</span>
                      </div>
                    ) : (
                      <div className="bg-[#050507] border border-zinc-800 text-zinc-300 font-mono text-[10px] px-2 py-1 rounded text-center flex items-center justify-between">
                        <span className="text-zinc-400">STATUS:</span>
                        <span className="text-emerald-400 font-bold">{drone.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Telemetry */}
                  <div className="text-[10px] font-mono text-zinc-400 space-y-1 py-1">
                    <div className="flex justify-between">
                      <span>Battery:</span>
                      <strong className={drone.battery < 20 ? 'text-red-400' : 'text-emerald-400'}>
                        {drone.battery.toFixed(0)}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span>{isFailed ? '0 px/s' : `${drone.speed.toFixed(0)} px/s`}</span>
                    </div>
                  </div>
                </div>

                {/* Drone Direct Action Controls */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => onToggleDroneFail(droneId)}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 ${
                      isFailed
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                        : 'bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{isFailed ? `Restore ${droneId}` : `Fail ${droneId}`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SWARM FLIGHT OPERATIONS & EMERGENCY PROTOCOLS */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-500" />
            Swarm Flight Operations & Fleet Maintenance
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Automated Mesh Telemetry Synchronization
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onSendCommand('RTL')}
            className="p-3 bg-[#07080c] hover:bg-[#13141b] border border-zinc-800 hover:border-red-500 rounded-xl text-left transition flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Return to Base (RTL)</div>
              <div className="text-[10px] text-zinc-400 font-mono">Recall all 5 drones to pad</div>
            </div>
          </button>

          <button
            onClick={() => onSendCommand('RECHARGE')}
            className="p-3 bg-[#07080c] hover:bg-[#13141b] border border-zinc-800 hover:border-emerald-500 rounded-xl text-left transition flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Fast Fleet Recharge</div>
              <div className="text-[10px] text-zinc-400 font-mono">Restore battery to 100%</div>
            </div>
          </button>

          <button
            onClick={() => onSendCommand('CALIBRATE')}
            className="p-3 bg-[#07080c] hover:bg-[#13141b] border border-zinc-800 hover:border-amber-500 rounded-xl text-left transition flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">IMU Sensor Zeroing</div>
              <div className="text-[10px] text-zinc-400 font-mono">Correct gyro drift</div>
            </div>
          </button>

          <button
            onClick={() => onSendCommand('RESET')}
            className="p-3 bg-[#07080c] hover:bg-red-950/40 border border-zinc-800 hover:border-red-500 rounded-xl text-left transition flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Emergency Swarm Reset</div>
              <div className="text-[10px] text-zinc-400 font-mono">Full system reboot</div>
            </div>
          </button>
        </div>
      </div>

      {/* REAL-TIME VERIFIED TARGETS MONITOR */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              Real-Time Verified Targets Field Feed
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              100% synchronized with aerial drone sensor fusion. Only confirmed targets appear upon drone arrival.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
            {Object.values(targets).filter((t) => t.found).length} Verified Found
          </span>
        </div>

        {Object.values(targets).filter((t) => t.found).length === 0 ? (
          <div className="py-10 px-4 bg-[#06070a] border border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full border border-red-500/35 bg-red-500/10 flex items-center justify-center animate-pulse">
              <Zap className="w-6 h-6 text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Swarm Surveying Recon Grid</p>
              <p className="text-xs text-zinc-400 max-w-md">
                Zero pre-set targets are exposed. As drones fly across coordinates and detect stranded victims or vehicles, verified dossiers will appear here in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(targets)
              .filter((t) => t.found)
              .map((target) => {
                const prob = Math.min(
                  100,
                  Math.max(92, Math.round((target.confidence || 0.98) * 100))
                );
                const geoCoord =
                  target.geoCoordinates || calculateGeoCoordinates(target.x, target.y);

                return (
                  <div
                    key={target.target_id}
                    className="p-3.5 bg-[#07080c] border border-emerald-500/40 rounded-xl flex flex-col justify-between gap-2.5 transition shadow-sm animate-fade-in"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                          <span className="text-red-400">{target.target_id}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                              target.type === 'HUMAN'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : target.type === 'ANIMAL' || target.type === 'BROKEN_DAM'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : target.type === 'BROKEN_INFRASTRUCTURE'
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                : target.type === 'VEHICLE'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {target.type.replace(/_/g, ' ')} [{prob}%]
                          </span>
                        </span>

                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                          VERIFIED
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-zinc-300 mt-2 space-y-1">
                        <div className="flex items-center gap-1 text-zinc-200 truncate">
                          <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                          <span className="truncate">{geoCoord}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Grid Cell: [{target.x}, {target.y}]</span>
                          <span>By: <strong className="text-red-300">{target.assigned_drone || 'D1'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {onDeleteTarget && (
                      <button
                        onClick={() => onDeleteTarget(target.target_id)}
                        className="w-full py-1.5 px-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Target</span>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
