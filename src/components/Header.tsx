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
  BrainCircuit,
} from 'lucide-react';

export type ViewMode =
  | 'gcs'
  | 'swarm_ai'
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
  const navTabClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_16px_-2px_rgba(220,38,38,0.6)] border border-red-400/30'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/90 border border-transparent'
    }`;

  return (
    <header className="bg-[#08080b]/95 backdrop-blur-md border-b border-red-900/35 sticky top-0 z-40 px-4 lg:px-6 py-3 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.9)]">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Tactical Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0d0e14] border border-red-600/50 flex items-center justify-center shadow-[0_0_20px_-4px_rgba(220,38,38,0.5)] relative overflow-hidden group">
            <svg
              className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" fill="#dc2626" fillOpacity="0.45" />
              <line x1="5" y1="5" x2="9.8" y2="9.8" />
              <line x1="19" y1="5" x2="14.2" y2="9.8" />
              <line x1="5" y1="19" x2="9.8" y2="14.2" />
              <line x1="19" y1="19" x2="14.2" y2="14.2" />
              <ellipse cx="4.5" cy="4.5" rx="3.5" ry="1.5" />
              <ellipse cx="19.5" cy="4.5" rx="3.5" ry="1.5" />
              <ellipse cx="4.5" cy="19.5" rx="3.5" ry="1.5" />
              <ellipse cx="19.5" cy="19.5" rx="3.5" ry="1.5" />
              <circle cx="12" cy="7.5" r="1" fill="#ef4444" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Autonomous Recon Swarm GCS</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Multi-Modal Sensor Fusion · Edge YOLO CNN · DWA Collision Avoidance · Mesh Relays
            </p>
          </div>
        </div>

        {/* View Switcher Navigation */}
        <div className="flex items-center bg-[#0f1016] p-1 rounded-xl border border-zinc-800/90 flex-wrap gap-1 shadow-inner">
          <button onClick={() => setViewMode('gcs')} className={navTabClass(viewMode === 'gcs')}>
            <Split className="w-3.5 h-3.5" />
            <span>GCS View</span>
          </button>

          <button
            onClick={() => setViewMode('swarm_ai')}
            className={navTabClass(viewMode === 'swarm_ai')}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Swarm AI</span>
          </button>

          <button
            onClick={() => setViewMode('overview')}
            className={navTabClass(viewMode === 'overview')}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mission Overview</span>
          </button>

          <button
            onClick={() => setViewMode('simulation')}
            className={navTabClass(viewMode === 'simulation')}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Simulation Grid</span>
          </button>

          <button
            onClick={() => setViewMode('controls')}
            className={navTabClass(viewMode === 'controls')}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Drone Controls</span>
          </button>

          <button
            onClick={() => setViewMode('edge_slam')}
            className={navTabClass(viewMode === 'edge_slam')}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Edge AI & SLAM</span>
          </button>

          <button
            onClick={() => setViewMode('swarm_mesh')}
            className={navTabClass(viewMode === 'swarm_mesh')}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Swarm Mesh & DWA</span>
          </button>

          <button
            onClick={() => setViewMode('hydro')}
            className={navTabClass(viewMode === 'hydro')}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Hydro & Bathymetry</span>
          </button>
        </div>

        {/* Fleet Status & Quick Launch Controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1016] border border-zinc-800 rounded-lg text-xs font-mono tabular-nums text-zinc-300">
            <span className="text-zinc-500">Fleet:</span>
            <span className="text-red-400 font-bold">{activeDronesCount}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-white font-semibold">{totalDronesCount}</span>
          </div>

          {missionStatus !== 'ACTIVE' ? (
            <button
              onClick={() => onSendCommand('START')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-lg shadow-[0_0_18px_-4px_rgba(220,38,38,0.7)] transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch</span>
            </button>
          ) : (
            <button
              onClick={() => onSendCommand('PAUSE')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={() => onSendCommand('RESET')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#14151c] hover:bg-[#1e202a] border border-zinc-800 hover:border-red-600/50 text-zinc-300 hover:text-white text-xs rounded-lg transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
