import React from 'react';
import { Target, MissionStatus, Drone } from '../types';
import {
  Activity,
  Clock,
  Terminal,
  Crosshair,
  ShieldCheck,
  Zap,
  Radio,
  Trash2,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { calculateGeoCoordinates } from '../satelliteAnalysis';

interface MissionOverviewViewProps {
  missionStatus: MissionStatus;
  areaCovered: number;
  targetsFound: number;
  targetsTotal: number;
  missionTime: number;
  events: string[];
  targets: Record<string, Target>;
  drones: Record<string, Drone>;
  lastCommand: string;
  onSendCommand: (cmd: string) => void;
  onDeleteTarget?: (targetId: string) => void;
}

export const MissionOverviewView: React.FC<MissionOverviewViewProps> = ({
  missionStatus,
  areaCovered,
  targetsFound,
  targetsTotal,
  missionTime,
  events,
  targets,
  drones,
  lastCommand,
  onSendCommand,
  onDeleteTarget,
}) => {
  const getStatusSymbol = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'SEARCHING':
      case 'INVESTIGATING':
        return '🟢';
      case 'FAILED':
      case 'LOW_BATTERY':
        return '🔴';
      case 'PAUSED':
      case 'RETURNING':
      case 'AVOIDING':
        return '🟡';
      case 'COMPLETED':
      case 'COMPLETE':
        return '🔵';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-sky-400" />
            Autonomous Recon Mission Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive telemetry, area coverage statistics, classified target dossiers, and command event logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1624] border border-[#29374d] rounded-lg text-xs font-mono">
            <span className="text-slate-400">STATUS:</span>
            <span className="text-emerald-400 font-bold">{missionStatus}</span>
          </div>
          <button
            onClick={() => onSendCommand('START')}
            disabled={missionStatus === 'ACTIVE'}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition"
          >
            Start Mission
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Status */}
        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#9ca8b8] mb-1 flex items-center justify-between">
            <span>MISSION STATUS</span>
            <span className="text-slate-400 text-[10px]">GCS ENGINE</span>
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2.5 mt-2">
            <span>{getStatusSymbol(missionStatus)}</span>
            <span>{missionStatus}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {missionStatus === 'ACTIVE'
              ? 'Autonomous SLAM exploration in progress'
              : missionStatus === 'COMPLETE'
              ? 'All objectives located & zones cleared'
              : 'Swarm staged at base pads'}
          </div>
        </div>

        {/* Card 2: Area Covered */}
        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#9ca8b8] mb-1 flex items-center justify-between">
            <span>AREA COVERED</span>
            <span className="text-sky-400 font-mono text-[11px]">VOXEL SWEEP</span>
          </div>
          <div className="text-2xl font-bold text-sky-400 mt-2 font-mono">
            {areaCovered.toFixed(1)}%
          </div>
          <div className="w-full bg-[#0e1624] h-2.5 rounded-full mt-2 overflow-hidden border border-[#29374d]">
            <div
              className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, areaCovered)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex justify-between">
            <span>5 Partitioned Zones</span>
            <span>{Math.round(areaCovered)}% mapped</span>
          </div>
        </div>

        {/* Card 3: Targets */}
        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#9ca8b8] mb-1 flex items-center justify-between">
            <span>DETECTED TARGETS</span>
            <span className="text-amber-400 text-[10px] font-mono">YOLO + EKF</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 flex items-center gap-2">
            <span>🎯</span>
            <span>
              {targetsFound} / {targetsTotal}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {targetsTotal - targetsFound === 0
              ? 'All multi-modal objectives verified'
              : `${targetsTotal - targetsFound} objective(s) unlocated in field`}
          </div>
        </div>

        {/* Card 4: Mission Time */}
        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#9ca8b8] mb-1 flex items-center justify-between">
            <span>MISSION TIME</span>
            <span className="text-emerald-400 text-[10px] font-mono">EDGE CLOCK</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 flex items-center gap-2 font-mono">
            <Clock className="w-6 h-6 text-emerald-400" />
            <span>{missionTime.toFixed(1)}s</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Synchronized across Swarm Mesh Network
          </div>
        </div>
      </div>

      {/* Autonomous Recon Drone Fleet Status (D1 to D5) with EXPLICIT RED HIGHLIGHT if failed */}
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            Autonomous Drone Fleet Telemetry Status (D1 - D5)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {Object.values(drones).filter((d) => d.healthy).length} / 5 Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.values(drones).map((drone, idx) => {
            const isFailed = !drone.healthy || drone.status === 'FAILED';

            return (
              <div
                key={drone.drone_id}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                  isFailed
                    ? 'border-rose-500 bg-rose-950/60 text-rose-200 ring-2 ring-rose-500/60 shadow-rose-950/50 shadow-lg'
                    : 'bg-[#121a28] border-[#29374d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-white text-sm flex items-center gap-1.5">
                    <span>{drone.drone_id}</span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isFailed
                          ? 'bg-rose-500 animate-ping'
                          : drone.status === 'COMPLETED'
                          ? 'bg-emerald-400'
                          : 'bg-sky-400 animate-pulse'
                      }`}
                    />
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0e1624] text-slate-400 border border-[#29374d]">
                    Zone Z{idx + 1}
                  </span>
                </div>

                {isFailed ? (
                  <div className="bg-rose-600 border border-rose-400 text-white font-mono font-bold text-[10px] px-2 py-1 rounded text-center tracking-wide shadow animate-pulse">
                    🚨 FAILED (MOTOR FAULT)
                  </div>
                ) : (
                  <div className="bg-[#0e1624] border border-[#29374d] text-emerald-400 font-mono font-semibold text-[10px] px-2 py-1 rounded text-center">
                    ✓ OPERATIONAL ({drone.status})
                  </div>
                )}

                <div className="text-[11px] font-mono space-y-1 text-slate-400 pt-1 border-t border-[#253347]">
                  <div className="flex justify-between">
                    <span>Battery:</span>
                    <strong className={drone.battery < 20 ? 'text-rose-400' : 'text-slate-200'}>
                      {drone.battery.toFixed(0)}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Task:</span>
                    <span className="text-slate-300 truncate">{drone.task_id || 'IDLE'}</span>
                  </div>
                  {isFailed && (
                    <div className="text-[10px] text-rose-300 font-semibold pt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>Tasks Reassigned</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Intelligence Dossiers */}
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-amber-400" />
            Classified Recon Target Dossiers (Multi-Modal Sensor Fusion)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {targetsFound} / {targetsTotal} Verified by Edge CNN
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                  target.found
                    ? 'bg-[#152336] border-emerald-500/40 shadow-emerald-950/20 shadow-lg'
                    : 'bg-[#121a28] border-[#29374d]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-white flex items-center gap-2">
                      🎯 {target.target_id}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
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
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        target.found
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {target.found ? '🟢 FOUND' : '🟡 SEARCHING'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span className="font-mono text-slate-200 truncate">{geoCoord}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Grid Coordinates:</span>
                      <span className="font-mono text-white">[{target.x}, {target.y}]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Drone:</span>
                      <span className="font-mono text-sky-400 font-semibold">
                        {target.assigned_drone || 'Scanning'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Priority Level:</span>
                      <span
                        className={`font-semibold ${
                          target.priority === 'HIGH' ? 'text-rose-400' : 'text-sky-300'
                        }`}
                      >
                        {target.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sensor Fusion Confidence breakdown */}
                <div className="pt-3 border-t border-[#29374d] space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">RGB Optical Camera:</span>
                    <span className="font-mono text-slate-200">
                      {target.found ? `${Math.round(target.rgbConfidence * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">360° LiDAR / Radar:</span>
                    <span className="font-mono text-slate-200">
                      {target.found ? `${Math.round(target.lidarConfidence * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Kalman Filter Fusion:
                    </span>
                    <span className="font-mono text-emerald-400">
                      {target.found ? `${Math.round(target.kalmanFusedConfidence * 100)}%` : '0%'}
                    </span>
                  </div>

                  {onDeleteTarget && (
                    <button
                      onClick={() => onDeleteTarget(target.target_id)}
                      className="w-full mt-2 py-1 px-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded text-xs font-semibold transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Target</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Events Terminal & Command Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Feed (2 Cols) */}
        <div className="lg:col-span-2 bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              Mission Telemetry Event Feed
            </h3>
            <span className="text-xs font-mono text-slate-400">{events.length} recorded events</span>
          </div>

          <div className="bg-[#0e1624] border border-[#29374d] rounded-lg p-3.5 min-h-[220px] max-h-[300px] overflow-y-auto font-mono text-xs space-y-2">
            {events.length === 0 ? (
              <div className="text-slate-500 italic">No mission events logged yet. Press START to deploy swarm.</div>
            ) : (
              [...events].reverse().map((event, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-300">
                  <span className="text-sky-400">•</span>
                  <span
                    className={
                      event.includes('DETECTED') || event.includes('FOUND')
                        ? 'text-emerald-400 font-bold'
                        : event.includes('FAILED')
                        ? 'text-rose-400 font-bold'
                        : event.includes('STARTED')
                        ? 'text-sky-300 font-semibold'
                        : event.includes('REASSIGNED')
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }
                  >
                    {event}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Command Monitor & Fleet Summary (1 Col) */}
        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              Ground Command Monitor
            </h3>

            <div className="space-y-3 text-xs">
              <div className="bg-[#0e1624] border border-[#29374d] p-3 rounded-lg">
                <span className="text-slate-400 block text-[11px] mb-1">LAST DISPATCHED COMMAND:</span>
                <span className="font-mono text-sky-400 font-bold text-sm">
                  {lastCommand || 'NO PENDING COMMAND'}
                </span>
              </div>

              <div className="bg-[#0e1624] border border-[#29374d] p-3 rounded-lg space-y-1.5">
                <span className="text-slate-400 block text-[11px] mb-1">SWARM COMPUTE HEALTH:</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Operational Drones:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {Object.values(drones).filter((d) => d.healthy).length} / 5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Average Battery Level:</span>
                  <span className="font-mono text-white">
                    {(
                      Object.values(drones).reduce((a, b) => a + b.battery, 0) / 5
                    ).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mesh Network Status:</span>
                  <span className="font-mono text-emerald-400 font-semibold">ONLINE (802.11s)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#29374d] text-xs text-slate-400 text-center">
            CMRIT Autonomous Recon Drones • Bengaluru
          </div>
        </div>
      </div>
    </div>
  );
};
