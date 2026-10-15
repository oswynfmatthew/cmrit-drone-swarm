import React, { useState } from 'react';
import { Drone, Target, MissionStatus } from '../types';
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
  onAddTargetWithType: (
    cellX: number,
    cellY: number,
    type: 'HUMAN' | 'ANIMAL' | 'VEHICLE' | 'STRUCTURAL_CRACK',
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
  onAddTargetWithType,
  onDeleteTarget,
}) => {
  const [isFailDropdownOpen, setIsFailDropdownOpen] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState<
    'HUMAN' | 'ANIMAL' | 'VEHICLE' | 'STRUCTURAL_CRACK'
  >('HUMAN');
  const [customX, setCustomX] = useState<number>(15);
  const [customY, setCustomY] = useState<number>(10);

  const handleDeployTarget = () => {
    const conf =
      selectedTargetType === 'VEHICLE'
        ? 1.0
        : selectedTargetType === 'HUMAN'
        ? 0.98
        : selectedTargetType === 'ANIMAL'
        ? 0.97
        : 0.96;
    onAddTargetWithType(customX, customY, selectedTargetType, conf);
  };

  const droneList = Object.values(drones);
  const failedDrones = droneList.filter((d) => !d.healthy || d.status === 'FAILED');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sky-400" />
            Autonomous Drone Swarm Flight & Dispatch Controls
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ground Control Station direct telemetry dispatch deck. Zero clutter — command drones, simulate hardware failures, and control targets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#0e1624] border border-[#29374d] text-xs font-mono">
            <span className="text-slate-400">STATE: </span>
            <strong
              className={
                missionStatus === 'ACTIVE'
                  ? 'text-emerald-400'
                  : missionStatus === 'PAUSED'
                  ? 'text-amber-400'
                  : 'text-sky-400'
              }
            >
              {missionStatus}
            </strong>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#0e1624] border border-[#29374d] text-xs font-mono">
            <span className="text-slate-400">FAILED DRONES: </span>
            <strong className={failedDrones.length > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}>
              {failedDrones.length} / {droneList.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Critical Failure Alert Banner if any drone failed */}
      {failedDrones.length > 0 && (
        <div className="bg-rose-950/60 border-2 border-rose-500 rounded-xl p-4 shadow-rose-900/40 shadow-xl flex items-center justify-between gap-3 text-rose-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 animate-bounce" />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>CRITICAL DRONE HARDWARE FAILURE DETECTED</span>
                <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-full font-mono">
                  {failedDrones.map((d) => d.drone_id).join(', ')} FAILED
                </span>
              </div>
              <p className="text-xs text-rose-300 mt-0.5">
                The failed drone has stopped immediately. Its zone tasks have been dynamically redistributed across the remaining active swarm via 802.11s peer mesh.
              </p>
            </div>
          </div>
          <button
            onClick={() => failedDrones.forEach((d) => onToggleDroneFail(d.drone_id))}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition"
          >
            Restore All Drones
          </button>
        </div>
      )}

      {/* PRIMARY MASTER DISPATCH CONTROLS */}
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#29374d] gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Master Swarm Dispatch Commands
          </h3>

          {/* Simulation Rate */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Simulation Rate:</span>
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetSpeed(spd)}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  speedMultiplier === spd
                    ? 'bg-sky-500 text-white shadow'
                    : 'bg-[#0e1624] text-slate-400 hover:text-white border border-[#29374d]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* 6 Core Operation Buttons: START, PAUSE, RESUME, FAIL A DRONE dropdown, +TARGET, RESET */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* 1. START */}
          <button
            onClick={() => onSendCommand('START')}
            disabled={missionStatus === 'ACTIVE'}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START</span>
          </button>

          {/* 2. PAUSE */}
          <button
            onClick={() => onSendCommand('PAUSE')}
            disabled={missionStatus !== 'ACTIVE'}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>PAUSE</span>
          </button>

          {/* 3. RESUME */}
          <button
            onClick={() => onSendCommand('RESUME')}
            disabled={missionStatus !== 'PAUSED'}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <Play className="w-4 h-4" />
            <span>RESUME</span>
          </button>

          {/* 4. FAIL A DRONE with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFailDropdownOpen(!isFailDropdownOpen)}
              className="w-full flex items-center justify-between gap-1.5 py-3 px-3 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 border border-rose-500/40"
              title="Fail any specific drone (D1 to D5) with decentralized fault redistribution"
            >
              <div className="flex items-center gap-1.5 truncate">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">FAIL A DRONE</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isFailDropdownOpen && (
              <div className="absolute left-0 mt-2 w-52 bg-[#121a28] border-2 border-rose-500/80 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 font-bold border-b border-[#29374d]">
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
                          ? 'bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-500/40'
                          : 'bg-[#182235] text-slate-200 hover:bg-rose-600 hover:text-white border border-[#29374d]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isFailed ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
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
            className="flex items-center justify-center gap-2 py-3 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ TARGET</span>
          </button>

          {/* 6. RESET */}
          <button
            onClick={() => onSendCommand('RESET')}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-[#222c3e] hover:bg-[#2e3e56] border border-[#374966] text-slate-200 font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET</span>
          </button>
        </div>

        {/* Last Command Status */}
        <div className="bg-[#0e1624] border border-[#29374d] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">LAST GROUND DISPATCH:</span>
          <span className="text-sky-400 font-bold">{lastCommand || 'AWAITING DISPATCH'}</span>
        </div>
      </div>

      {/* INDIVIDUAL DRONE OVERRIDE CARDS (D1 through D5) */}
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#29374d]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-400" />
            Individual Drone Flight Controls (D1 - D5)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
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
                    ? 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/50 shadow-rose-950/50 shadow-lg'
                    : 'border-[#29374d] bg-[#121a28] hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#253347]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">{droneId}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFailed
                            ? 'bg-rose-500 animate-ping'
                            : drone.status === 'SEARCHING'
                            ? 'bg-sky-400 animate-pulse'
                            : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0e1624] text-slate-400 border border-[#29374d]">
                      Z{idx + 1}
                    </span>
                  </div>

                  {/* Status Banner */}
                  <div className="pt-2 pb-1">
                    {isFailed ? (
                      <div className="bg-rose-600/30 border border-rose-500 text-rose-300 font-mono font-bold text-[10px] px-2 py-1 rounded text-center">
                        🚨 FAILED / HALTED
                      </div>
                    ) : (
                      <div className="bg-[#0e1624] border border-[#29374d] text-slate-300 font-mono text-[10px] px-2 py-1 rounded text-center flex items-center justify-between">
                        <span className="text-slate-400">STATUS:</span>
                        <span className="text-emerald-400 font-bold">{drone.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Telemetry */}
                  <div className="text-[10px] font-mono text-slate-400 space-y-1 py-1">
                    <div className="flex justify-between">
                      <span>Battery:</span>
                      <strong className={drone.battery < 20 ? 'text-rose-400' : 'text-emerald-400'}>
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
                <div className="space-y-1.5 pt-2 border-t border-[#253347]">
                  {/* Fail / Fix Toggle */}
                  <button
                    onClick={() => onToggleDroneFail(droneId)}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 ${
                      isFailed
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                        : 'bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50'
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

      {/* TARGET DECK: PRECISE TARGET PLACEMENT & DELETION */}
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#29374d]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            Target Placement & Active Target Deletion Deck
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {Object.keys(targets).length} Registered Targets
          </span>
        </div>

        {/* Target Creation Strip */}
        <div className="bg-[#121a28] border border-[#29374d] rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-300">
            1. Select Precise Target Classification:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => setSelectedTargetType('HUMAN')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                selectedTargetType === 'HUMAN'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400 ring-2 ring-sky-400/30'
                  : 'bg-[#182235] text-slate-400 border-[#29374d] hover:text-white'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-sky-400"></span>
              <span>Human Survivor (Blue)</span>
            </button>

            <button
              onClick={() => setSelectedTargetType('ANIMAL')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                selectedTargetType === 'ANIMAL'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400 ring-2 ring-rose-400/30'
                  : 'bg-[#182235] text-slate-400 border-[#29374d] hover:text-white'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span>Animal / Livestock (Red)</span>
            </button>

            <button
              onClick={() => setSelectedTargetType('VEHICLE')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                selectedTargetType === 'VEHICLE'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400 ring-2 ring-purple-400/30'
                  : 'bg-[#182235] text-slate-400 border-[#29374d] hover:text-white'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-purple-400"></span>
              <span>Vehicle / Asset (Purple)</span>
            </button>

            <button
              onClick={() => setSelectedTargetType('STRUCTURAL_CRACK')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                selectedTargetType === 'STRUCTURAL_CRACK'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400 ring-2 ring-amber-400/30'
                  : 'bg-[#182235] text-slate-400 border-[#29374d] hover:text-white'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span>Damaged Bldg (Yellow)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Grid X (0-29):</span>
              <input
                type="number"
                min="0"
                max="29"
                value={customX}
                onChange={(e) => setCustomX(Math.max(0, Math.min(29, Number(e.target.value))))}
                className="w-16 px-2 py-1 bg-[#0e1624] border border-[#29374d] rounded text-white font-mono text-center outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Grid Y (0-29):</span>
              <input
                type="number"
                min="0"
                max="29"
                value={customY}
                onChange={(e) => setCustomY(Math.max(0, Math.min(29, Number(e.target.value))))}
                className="w-16 px-2 py-1 bg-[#0e1624] border border-[#29374d] rounded text-white font-mono text-center outline-none"
              />
            </div>

            <button
              onClick={handleDeployTarget}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Deploy Target At [{customX}, {customY}]</span>
            </button>
          </div>
        </div>

        {/* Registered Targets List with Delete Option */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>2. Active Target Registry & Deletion Deck:</span>
            <span className="text-slate-400 text-[11px] font-mono">
              Click &quot;Delete Target&quot; to permanently remove any target from the map.
            </span>
          </div>

          {Object.keys(targets).length === 0 ? (
            <div className="p-4 bg-[#0e1624] border border-[#29374d] rounded-xl text-center text-xs text-slate-400 font-mono">
              No targets currently deployed on tactical grid.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(targets).map((target) => {
                const prob = Math.min(
                  100,
                  Math.max(92, Math.round((target.confidence || 0.98) * 100))
                );
                const geoCoord =
                  target.geoCoordinates || calculateGeoCoordinates(target.x, target.y);

                return (
                  <div
                    key={target.target_id}
                    className="p-3 bg-[#121a28] border border-[#29374d] hover:border-slate-500 rounded-xl flex flex-col justify-between gap-2.5 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                          <span>{target.target_id}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                              target.type === 'HUMAN'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : target.type === 'ANIMAL'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : target.type === 'VEHICLE'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {target.type} [{prob}%]
                          </span>
                        </span>

                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            target.found ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {target.found ? '✓ FOUND' : 'UNFOUND'}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 mt-2 space-y-1">
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-sky-400 flex-shrink-0" />
                          <span className="truncate">{geoCoord}</span>
                        </div>
                        <div>
                          Grid: [{target.x}, {target.y}] • Assigned:{' '}
                          <span className="text-sky-300 font-semibold">
                            {target.assigned_drone || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteTarget(target.target_id)}
                      className="w-full py-1.5 px-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Target</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
