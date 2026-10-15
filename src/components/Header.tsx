import React from 'react';
import { MissionStatus } from '../types';
import {
  Split,
  Activity,
  Monitor,
  Cpu,
  Share2,
  Play,
  Pause,
  RotateCcw,
  Sliders,
} from 'lucide-react';

export type ViewMode =
  | 'gcs'
  | 'overview'
  | 'simulation'
  | 'controls'
  | 'edge_slam'
  | 'swarm_mesh';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  missionStatus: MissionStatus;
  onSendCommand: (cmd: string) => void;
  activeDronesCount: number;
  totalDronesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  missionStatus,
  onSendCommand,
  activeDronesCount,
  totalDronesCount,
}) => {
  return (
    <header className="bg-[#121a29] border-b border-[#29374d] sticky top-0 z-40 px-4 lg:px-6 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-sky-500/20">
            🚁
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              CMRIT Autonomous Recon Swarm
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SLAM + Edge AI
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Multi-Modal Sensor Fusion • YOLO Edge CNN • Dynamic Window Approach • Mesh Relays
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-[#182235] p-1 rounded-lg border border-[#29374d] flex-wrap gap-1">
          <button
            onClick={() => setViewMode('gcs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'gcs'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>GCS View</span>
          </button>

          <button
            onClick={() => setViewMode('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'overview'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mission Overview</span>
          </button>

          <button
            onClick={() => setViewMode('simulation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'simulation'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Simulation Grid</span>
          </button>

          <button
            onClick={() => setViewMode('controls')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'controls'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Drone Controls</span>
          </button>

          <button
            onClick={() => setViewMode('edge_slam')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'edge_slam'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Edge AI & SLAM</span>
          </button>

          <button
            onClick={() => setViewMode('swarm_mesh')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'swarm_mesh'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Swarm Mesh & DWA</span>
          </button>
        </div>

        {/* Quick Swarm Actions & Fleet Count */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#182235] border border-[#29374d] rounded-lg text-xs font-mono text-slate-300">
            <span className="text-slate-500">Fleet:</span>
            <span className="text-emerald-400 font-bold">{activeDronesCount}</span>
            <span className="text-slate-500">/</span>
            <span>{totalDronesCount}</span>
          </div>

          {missionStatus !== 'ACTIVE' ? (
            <button
              onClick={() => onSendCommand('START')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch</span>
            </button>
          ) : (
            <button
              onClick={() => onSendCommand('PAUSE')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow transition active:scale-95"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => onSendCommand('RESET')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#222c3e] hover:bg-[#2b394e] border border-[#374966] text-slate-300 text-xs rounded-lg transition"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
