import React, { useState } from 'react';
import { Target, MissionStatus, Drone, TargetType, TargetPriority } from '../types';
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
  PlusCircle,
  Edit2,
  Check,
  X,
  Target as TargetIcon,
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
  onAddTargetWithType?: (
    cellX: number,
    cellY: number,
    type: TargetType,
    initialConfidence?: number,
    label?: string,
    priority?: TargetPriority
  ) => void;
  onUpdateTarget?: (targetId: string, updates: Partial<Target>) => void;
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
  onAddTargetWithType,
  onUpdateTarget,
}) => {
  // Custom Target Form State
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [formType, setFormType] = useState<TargetType>('HUMAN');
  const [formPriority, setFormPriority] = useState<TargetPriority>('HIGH');
  const [formX, setFormX] = useState<number>(15);
  const [formY, setFormY] = useState<number>(10);
  const [formLabel, setFormLabel] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const handleEditClick = (target: Target) => {
    setEditingTargetId(target.target_id);
    setFormType(target.type);
    setFormPriority(target.priority);
    setFormX(target.x);
    setFormY(target.y);
    setFormLabel(target.label || '');
    setFormDescription(target.description || '');
  };

  const handleCancelEdit = () => {
    setEditingTargetId(null);
    setFormLabel('');
    setFormDescription('');
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTargetId) {
      onUpdateTarget?.(editingTargetId, {
        type: formType,
        priority: formPriority,
        x: formX,
        y: formY,
        label: formLabel || `${formType} Target`,
        description: formDescription,
      });
      setEditingTargetId(null);
    } else {
      const conf =
        formType === 'VEHICLE'
          ? 1.0
          : formType === 'HUMAN'
          ? 0.98
          : formType === 'ANIMAL'
          ? 0.97
          : 0.96;
      onAddTargetWithType?.(
        formX,
        formY,
        formType,
        conf,
        formLabel || `${formType} Recon Target`,
        formPriority
      );
    }
    setFormLabel('');
    setFormDescription('');
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'SEARCHING':
      case 'INVESTIGATING':
        return (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACTIVE</span>
          </span>
        );
      case 'FAILED':
      case 'LOW_BATTERY':
        return (
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>FAULT</span>
          </span>
        );
      case 'PAUSED':
      case 'RETURNING':
      case 'AVOIDING':
        return (
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>{status.toUpperCase()}</span>
          </span>
        );
      case 'COMPLETED':
      case 'COMPLETE':
        return (
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>COMPLETE</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>READY</span>
          </span>
        );
    }
  };

  const allTargetsList = Object.values(targets);
  const filteredTargets =
    filterType === 'ALL'
      ? allTargetsList
      : allTargetsList.filter((t) => t.type === filterType);

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
            Comprehensive telemetry, area coverage statistics, classified target dossiers, and ground control dispatch feed.
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
          <div className="text-2xl font-bold text-white mt-2">
            {renderStatusBadge(missionStatus)}
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
            <Crosshair className="w-6 h-6 text-amber-400" />
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
                  <div className="bg-rose-900/80 border border-rose-500/80 text-rose-200 font-mono font-bold text-[10px] px-2 py-1 rounded text-center tracking-wide shadow">
                    CRITICAL FAULT (FAILED)
                  </div>
                ) : (
                  <div className="bg-[#0e1624] border border-[#29374d] text-emerald-400 font-mono font-semibold text-[10px] px-2 py-1 rounded text-center">
                    ONLINE ({drone.status})
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
              Math.max(88, Math.round((target.confidence || 0.98) * 100))
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
                      <span className="font-mono text-sky-400">{target.target_id}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                          target.type === 'HUMAN'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : target.type === 'VEHICLE'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : target.type === 'ANIMAL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : target.type === 'PLANT'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {target.type} [{prob}%]
                      </span>
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        target.found
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {target.found ? 'FOUND' : 'SEARCHING'}
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
                    {/* Priority Level: Humans=HIGH in RED, Vehicles=MEDIUM in BLUE, Damaged Building=LOW in ORANGE */}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Priority Level:</span>
                      <span
                        className={
                          target.type === 'HUMAN'
                            ? 'text-rose-400 font-bold'
                            : target.type === 'VEHICLE'
                            ? 'text-sky-400 font-bold'
                            : target.type === 'PLANT'
                            ? 'text-emerald-400 font-bold'
                            : 'text-amber-500 font-bold'
                        }
                      >
                        {target.type === 'HUMAN'
                          ? 'HIGH'
                          : target.type === 'VEHICLE'
                          ? 'MEDIUM'
                          : target.type === 'ANIMAL'
                          ? 'MEDIUM'
                          : 'LOW'}
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

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleEditClick(target)}
                      className="flex-1 py-1 px-2 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 rounded text-xs font-semibold transition flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Modify</span>
                    </button>

                    {onDeleteTarget && (
                      <button
                        onClick={() => onDeleteTarget(target.target_id)}
                        className="flex-1 py-1 px-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded text-xs font-semibold transition flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUSTOM TARGET SEARCH & PRIORITY REGISTRY (User Requested: Add/Delete/Modify any target) */}
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#29374d] gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TargetIcon className="w-5 h-5 text-indigo-400" />
              Autonomous Search Target Director & Priority Focus Registry
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure custom search objectives across categories (Humans, Vehicles, Buildings, Plants, Animals). Swarm drones prioritize and allocate sensor cones specifically to these designated targets.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#0e1624] p-1 rounded-lg border border-[#29374d] text-xs">
            {['ALL', 'HUMAN', 'VEHICLE', 'BUILDING', 'PLANT', 'ANIMAL'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  filterType === cat
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Target Form (Add New or Edit Existing) */}
        <form onSubmit={handleSaveTarget} className="bg-[#0e1624] border border-[#29374d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              {editingTargetId ? `Modify Target ${editingTargetId}` : 'Register New Mission Search Target'}
            </span>
            {editingTargetId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <X className="w-3.5 h-3.5" />
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Target Category */}
            <div>
              <label className="text-slate-400 block mb-1 font-mono">Target Category:</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as TargetType)}
                className="w-full bg-[#182235] border border-[#29374d] rounded-lg px-2.5 py-2 text-white font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="HUMAN">HUMAN (Survivors / Evacuees)</option>
                <option value="VEHICLE">VEHICLE (Cars, Trucks, Boats)</option>
                <option value="BUILDING">BUILDING (Structural Damage)</option>
                <option value="PLANT">PLANT (Environmental Recon)</option>
                <option value="ANIMAL">ANIMAL (Livestock & Wildlife)</option>
              </select>
            </div>

            {/* Priority Level */}
            <div>
              <label className="text-slate-400 block mb-1 font-mono">Priority Level:</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as TargetPriority)}
                className="w-full bg-[#182235] border border-[#29374d] rounded-lg px-2.5 py-2 text-white font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="HIGH">HIGH (Red Alert Focus)</option>
                <option value="MEDIUM">MEDIUM (Standard Recon)</option>
                <option value="LOW">LOW (Secondary Sweep)</option>
              </select>
            </div>

            {/* Grid X Coordinate */}
            <div>
              <label className="text-slate-400 block mb-1 font-mono">Grid X (0 - 29):</label>
              <input
                type="number"
                min="0"
                max="29"
                value={formX}
                onChange={(e) => setFormX(Math.min(29, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full bg-[#182235] border border-[#29374d] rounded-lg px-2.5 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Grid Y Coordinate */}
            <div>
              <label className="text-slate-400 block mb-1 font-mono">Grid Y (0 - 19):</label>
              <input
                type="number"
                min="0"
                max="19"
                value={formY}
                onChange={(e) => setFormY(Math.min(19, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full bg-[#182235] border border-[#29374d] rounded-lg px-2.5 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Target Label */}
            <div>
              <label className="text-slate-400 block mb-1 font-mono">Target Label / Note:</label>
              <input
                type="text"
                placeholder="e.g. Roof Group, Rare Flora..."
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                className="w-full bg-[#182235] border border-[#29374d] rounded-lg px-2.5 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#253347]">
            {editingTargetId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-[#222c3e] hover:bg-[#2b394e] text-slate-300 font-semibold text-xs rounded-lg transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingTargetId ? 'Apply Target Modifications' : 'Add Target to Autonomous Swarm Focus'}</span>
            </button>
          </div>
        </form>

        {/* Targets Table */}
        <div className="border border-[#29374d] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e1624] text-slate-400 border-b border-[#29374d]">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Grid Coord</th>
                  <th className="py-2.5 px-3">Geo Position</th>
                  <th className="py-2.5 px-3">Target Label</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#253347]">
                {filteredTargets.map((t) => {
                  const geo = t.geoCoordinates || calculateGeoCoordinates(t.x, t.y);
                  return (
                    <tr key={t.target_id} className="hover:bg-[#152336] transition">
                      <td className="py-2 px-3 font-bold text-sky-400">{t.target_id}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            t.type === 'HUMAN'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : t.type === 'VEHICLE'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : t.type === 'ANIMAL'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : t.type === 'PLANT'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            t.type === 'HUMAN'
                              ? 'text-rose-400 font-bold'
                              : t.type === 'VEHICLE'
                              ? 'text-sky-400 font-bold'
                              : t.type === 'PLANT'
                              ? 'text-emerald-400 font-bold'
                              : 'text-amber-500 font-bold'
                          }
                        >
                          {t.type === 'HUMAN'
                            ? 'HIGH'
                            : t.type === 'VEHICLE'
                            ? 'MEDIUM'
                            : t.type === 'ANIMAL'
                            ? 'MEDIUM'
                            : 'LOW'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white">[{t.x}, {t.y}]</td>
                      <td className="py-2 px-3 text-slate-400 text-[10px] truncate max-w-[130px]">{geo}</td>
                      <td className="py-2 px-3 text-slate-200">{t.label || `${t.type} Objective`}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.found
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {t.found ? 'VERIFIED' : 'SEARCHING'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(t)}
                            className="p-1 hover:bg-sky-600/30 text-sky-400 rounded transition"
                            title="Modify Target"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteTarget && (
                            <button
                              onClick={() => onDeleteTarget(t.target_id)}
                              className="p-1 hover:bg-rose-600/30 text-rose-400 rounded transition"
                              title="Delete Target"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        </div>
      </div>
    </div>
  );
};
