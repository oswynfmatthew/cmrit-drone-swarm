import React, { useState } from 'react';
import { Drone, Target } from '../types';
import {
  Cpu,
  Eye,
  Crosshair,
  Layers,
  Activity,
  Zap,
  Sparkles,
  Camera,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface EdgeAISlamViewProps {
  drones: Record<string, Drone>;
  targets: Record<string, Target>;
  darknessLevel: number;
  setDarknessLevel: (val: number) => void;
  selectedDroneId: string | null;
  onSelectDrone: (id: string | null) => void;
}

export const EdgeAISlamView: React.FC<EdgeAISlamViewProps> = ({
  drones,
  targets,
  darknessLevel,
  setDarknessLevel,
  selectedDroneId,
  onSelectDrone,
}) => {
  const [activeSensorFeed, setActiveSensorFeed] = useState<'fusion' | 'rgb' | 'lidar' | 'yolo'>('fusion');

  const activeDrone = selectedDroneId
    ? drones[selectedDroneId] || drones['D1']
    : drones['D1'];

  return (
    <div className="space-y-6">
      {/* Edge AI & SLAM Header */}
      <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono text-[11px] font-bold border border-sky-500/30">
              CMRIT AUTONOMOUS RECON ARCHITECTURE
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">SLAM + Edge Inference + Sensor Fusion</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-sky-400" />
            Edge AI, SLAM & Multi-Modal Sensor Fusion Engine
          </h2>
        </div>

        {/* Selected Drone Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Inspecting Drone:</span>
          <div className="flex gap-1.5">
            {Object.keys(drones).map((id) => (
              <button
                key={id}
                onClick={() => onSelectDrone(id)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition border ${
                  activeDrone.drone_id === id
                    ? 'bg-sky-500 text-white border-sky-400 shadow'
                    : 'bg-[#222c3e] text-slate-400 hover:text-white border-[#334259]'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slide 8: Compute at Edge (Nvidia Jetson Orin NX SWaP Architecture) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>ONBOARD SILICON</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white font-mono">
            {activeDrone.edgeCompute.chipset}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Edge Local Processing (No Cloud Required)</span>
          </div>
        </div>

        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>YOLO INFERENCE SPEED</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono">
            {activeDrone.edgeCompute.inferenceFps.toFixed(1)} <span className="text-sm font-normal text-slate-400">FPS</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target: &gt;30 FPS for flight stability (Achieved: {activeDrone.edgeCompute.tensorRtLatencyMs.toFixed(1)}ms latency)
          </div>
        </div>

        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>SWaP CONSTRAINTS</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {activeDrone.edgeCompute.powerWatts.toFixed(1)} <span className="text-sm font-normal text-slate-400">W</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Size, Weight & Power Budget: &lt;15W / 380g payload
          </div>
        </div>

        <div className="bg-[#182235] border border-[#29374d] rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>MODEL PRUNING & TENSORRT</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {activeDrone.edgeCompute.prunedModelSizeMb} <span className="text-sm font-normal text-slate-400">MB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            68% weights pruned to fit constrained edge VRAM
          </div>
        </div>
      </div>

      {/* Main Sensor & SLAM Deep Dive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Real-Time Multi-Modal Feed & YOLO Detection */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2 text-base">
                <Camera className="w-4 h-4 text-sky-400" />
                Live Multi-Modal Sensor Fusion & YOLO Detection Feed
              </h3>

              {/* Feed Switcher */}
              <div className="flex bg-[#0e1624] p-1 rounded-lg border border-[#29374d] text-xs">
                <button
                  onClick={() => setActiveSensorFeed('fusion')}
                  className={`px-2.5 py-1 rounded transition ${
                    activeSensorFeed === 'fusion'
                      ? 'bg-sky-500 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EKF Fusion
                </button>
                <button
                  onClick={() => setActiveSensorFeed('yolo')}
                  className={`px-2.5 py-1 rounded transition ${
                    activeSensorFeed === 'yolo'
                      ? 'bg-sky-500 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  YOLO CNN
                </button>
                <button
                  onClick={() => setActiveSensorFeed('lidar')}
                  className={`px-2.5 py-1 rounded transition ${
                    activeSensorFeed === 'lidar'
                      ? 'bg-sky-500 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  360° LiDAR
                </button>
                <button
                  onClick={() => setActiveSensorFeed('rgb')}
                  className={`px-2.5 py-1 rounded transition ${
                    activeSensorFeed === 'rgb'
                      ? 'bg-sky-500 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  RGB Optical
                </button>
              </div>
            </div>

            {/* Environmental Darkness / Lighting Simulation Slider */}
            <div className="bg-[#0e1624] p-3 rounded-lg border border-[#29374d] mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Ambient Illumination / Cave Darkness:</span>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <span className="text-[11px] text-slate-400">Daylight</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={darknessLevel}
                  onChange={(e) => setDarknessLevel(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <span className="text-[11px] text-amber-400 font-mono">
                  {Math.round(darknessLevel * 100)}% Dark
                </span>
              </div>
            </div>

            {/* Simulated Drone Camera Viewport */}
            <div
              className="relative w-full h-72 rounded-xl overflow-hidden border border-[#29374d] flex items-center justify-center transition-all"
              style={{
                backgroundColor:
                  activeSensorFeed === 'rgb'
                    ? `rgba(14, 22, 36, ${0.4 + darknessLevel * 0.55})`
                    : '#0a101a',
              }}
            >
              {/* Grid / Horizon guidelines */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

              {/* Crosshair Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 border border-sky-400/40 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                </div>
              </div>

              {/* Feed Content based on selection */}
              {activeSensorFeed === 'rgb' && (
                <div className="text-center p-4">
                  <Camera className="w-10 h-10 text-sky-400/70 mx-auto mb-2" />
                  <div className="font-mono text-sm text-slate-200">RGB OPTICAL FEED (High Res)</div>
                  <div className="text-xs text-slate-400 mt-1 max-w-md">
                    {darknessLevel > 0.6 ? (
                      <span className="text-amber-400">
                        ⚠️ Ambient light degraded ({Math.round(darknessLevel * 100)}% Darkness). Optical confidence reduced. LiDAR active sensing engaged.
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        Clear illumination. High-resolution color feature extraction active.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {activeSensorFeed === 'lidar' && (
                <div className="text-center p-4">
                  <div className="w-32 h-32 rounded-full border border-emerald-500/50 relative mx-auto mb-2 flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 rounded-full border border-emerald-500/30" />
                    <div className="w-12 h-12 rounded-full border border-emerald-500/20" />
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  </div>
                  <div className="font-mono text-sm text-emerald-400">360° LiDAR POINT CLOUD</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Active laser distance ranging unaffected by darkness. Scanning 36 directions.
                  </div>
                </div>
              )}

              {activeSensorFeed === 'yolo' && (
                <div className="relative w-full h-full p-4 flex flex-col justify-between">
                  <div className="flex justify-between text-xs font-mono text-sky-400">
                    <span>YOLOv8 Edge CNN</span>
                    <span>34.2 FPS • TensorRT FP16</span>
                  </div>

                  {/* Simulated Bounding Box for detected target */}
                  <div className="self-center border-2 border-emerald-400 bg-emerald-500/10 p-3 rounded shadow-lg animate-pulse">
                    <div className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1">
                      <Crosshair className="w-3 h-3" />
                      <span>
                        {activeDrone.detectedObjectTrack
                          ? `${activeDrone.detectedObjectTrack.type} [${Math.round(
                              activeDrone.detectedObjectTrack.confidence * 100
                            )}%]`
                          : 'TRACKING: HUMAN [SURVIVOR 94%]'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                      BBox: [x: 24, y: 4, w: 32, h: 32]
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                    <span>
                      Tracked Objectives: {Object.values(targets).map((t) => t.type).join(', ')}
                    </span>
                    <span>Single-pass BBox inference</span>
                  </div>
                </div>
              )}

              {activeSensorFeed === 'fusion' && (
                <div className="relative w-full h-full p-4 flex flex-col justify-between">
                  <div className="flex justify-between text-xs font-mono text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Extended Kalman Filter (EKF) Multi-Modal Fusion
                    </span>
                    <span>Noise Covariance: Q=0.02, R=0.08</span>
                  </div>

                  <div className="self-center bg-[#121a28]/90 border border-emerald-500/50 p-4 rounded-xl text-center space-y-2 backdrop-blur">
                    <div className="text-xs text-slate-300">Fused Perception State:</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400">
                      CONFIDENCE: 94.6%
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono pt-1 text-slate-400">
                      <div>RGB Clarity: {Math.round((1 - darknessLevel * 0.8) * 100)}%</div>
                      <div>LiDAR Return: 98.2%</div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Mathematically fuses RGB optical + 360° LiDAR depth + IMU kinematics
                  </div>
                </div>
              )}

              {/* HUD Telemetry Overlay */}
              <div className="absolute top-2 left-2 bg-[#0e1624]/80 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-slate-300 border border-[#29374d]">
                UAV: {activeDrone.drone_id} • ALT: 4.2m • SPD: {activeDrone.speed}px/s
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): SLAM IMU Drift & Scan Matching Correction */}
        <div className="lg:col-span-5 space-y-4">
          {/* SLAM Mapping without GPS Card */}
          <div className="bg-[#182235] border border-[#29374d] rounded-xl p-5 shadow-md space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-emerald-400" />
              SLAM: Mapping without GPS
            </h3>

            <div className="space-y-3 text-xs">
              {/* IMU Odometry with Drift */}
              <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">1. IMU Odometry (Inertial Sensors):</span>
                  <span className="font-mono text-amber-400">Prone to Drift</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Estimates internal velocity and position changes over time. Accumulates dead-reckoning error.
                </p>
                <div className="flex justify-between font-mono text-[11px] text-slate-400 pt-1">
                  <span>Accumulated Drift:</span>
                  <span className="text-amber-400">
                    ΔX: {activeDrone.imu.driftX.toFixed(2)}px, ΔY: {activeDrone.imu.driftY.toFixed(2)}px
                  </span>
                </div>
              </div>

              {/* LiDAR Point Cloud */}
              <div className="p-3 bg-[#0e1624] border border-[#29374d] rounded-lg space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-300">2. 360° LiDAR Point Cloud:</span>
                  <span className="font-mono text-sky-400">36 Lasers Active</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Lasers scan surroundings in 360°, capturing raw geometric snapshot of cavern walls.
                </p>
              </div>

              {/* Scan Matching */}
              <div className="p-3 bg-[#0e1624] border border-emerald-500/30 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-400">3. Scan Matching (ICP):</span>
                  <span className="font-mono text-emerald-400 font-bold">CONVERGED</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Matches new LiDAR points to the global voxel map, correcting IMU drift mathematically in real-time.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Position corrected to millimeter precision.</span>
                </div>
              </div>
            </div>

            {/* Voxel Grid & Active Sensing in Dark */}
            <div className="pt-2 border-t border-[#29374d] space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Navigating the Dark (Pitch Black Caves):</span>
              <p className="text-slate-400 text-[11px]">
                Active LiDAR lasers do not need light to see. Space is partitioned into 3D occupancy Voxel Grids. As newly detected walls are discovered, the A* algorithm dynamically re-routes paths.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
