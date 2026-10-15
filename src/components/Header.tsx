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
  Waves,
} from 'lucide-react';

export type ViewMode =
  | 'gcs'
  | 'overview'
  | 'simulation'
  | 'controls'
  | 'edge_slam'
  | 'swarm_mesh'
  | 'hydro';

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
          <div className="w-10 h-10 rounded-xl bg-[#0b1320] border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-950/50 relative overflow-hidden group">
            {/* High-tech tactical dark drone quadcopter silhouette */}
            <svg
              className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Central fuselage */}
              <circle cx="12" cy="12" r="3" fill="#0284c7" fillOpacity="0.4" />
              {/* Cross arms */}
              <line x1="5" y1="5" x2="9.8" y2="9.8" />
              <line x1="19" y1="5" x2="14.2" y2="9.8" />
              <line x1="5" y1="19" x2="9.8" y2="14.2" />
              <line x1="19" y1="19" x2="14.2" y2="14.2" />
              {/* 4 Rotors */}
              <ellipse cx="4.5" cy="4.5" rx="3.5" ry="1.5" />
              <ellipse cx="19.5" cy="4.5" rx="3.5" ry="1.5" />
              <ellipse cx="4.5" cy="19.5" rx="3.5" ry="1.5" />
              <ellipse cx="19.5" cy="19.5" rx="3.5" ry="1.5" />
              {/* Forward camera gimbal */}
              <circle cx="12" cy="7.5" r="1" fill="#38bdf8" />
            </svg>
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Autonomous Recon Swarm GCS
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

          <button
            onClick={() => setViewMode('hydro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'hydro'
                ? 'bg-cyan-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Hydro & Bathymetry</span>
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
