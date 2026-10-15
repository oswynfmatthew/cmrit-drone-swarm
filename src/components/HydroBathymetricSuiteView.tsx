import React, { useState } from 'react';
import { Drone } from '../types';
import {
  Waves,
  RotateCcw,
  Compass,
  Radio,
  Layers,
  Activity,
  Anchor,
  Play,
  ShieldCheck,
} from 'lucide-react';
import {
  executeTurtleMode,
  executeRotorCutAndWinchDeploy,
  executeWinchRetractAndRearm,
  calculateTofDepth,
  recordAcousticGnssPing,
} from '../swarmEngine';
import { calculateGeoCoordinates } from '../satelliteAnalysis';

interface HydroBathymetricSuiteViewProps {
  drones: Record<string, Drone>;
  selectedDroneId?: string | null;
  onSelectDrone?: (id: string) => void;
  onLogEvent?: (msg: string) => void;
}

export const HydroBathymetricSuiteView: React.FC<HydroBathymetricSuiteViewProps> = ({
  drones,
  selectedDroneId = 'D1',
  onSelectDrone,
  onLogEvent,
}) => {
  const [activeDroneId, setActiveDroneId] = useState<string>(selectedDroneId || 'D1');
  const [echoTimeMs, setEchoTimeMs] = useState<number>(5.4); // ms
  const [soundSpeedWater, setSoundSpeedWater] = useState<number>(1482); // m/s freshwater 20°C
  const [turtleStatusMessage, setTurtleStatusMessage] = useState<string>(
    'IMU Nominal (Pitch: 0.0°, Roll: 0.0°). Craft floating upright.'
  );
  const [winchStatusMessage, setWinchStatusMessage] = useState<string>(
    'Winch Retracted. Propulsion motors ARMED.'
  );
  const [fusionProgress, setFusionProgress] = useState<number>(78);
  const [isFusing, setIsFusing] = useState<boolean>(false);
  const [livePoints, setLivePoints] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      depth: number;
      time: string;
      rtk: string;
      geo: string;
    }>
  >([
    {
      id: 'PING-01',
      x: 14,
      y: 9,
      depth: 3.42,
      time: '14:22:04.102',
      rtk: 'RTK_FIXED (±1.2cm)',
      geo: '12.9716° N, 77.5946° E',
    },
    {
      id: 'PING-02',
      x: 14,
      y: 10,
      depth: 3.86,
      time: '14:22:05.114',
      rtk: 'RTK_FIXED (±0.9cm)',
      geo: '12.9717° N, 77.5947° E',
    },
    {
      id: 'PING-03',
      x: 15,
      y: 10,
      depth: 4.15,
      time: '14:22:06.128',
      rtk: 'RTK_FIXED (±1.1cm)',
      geo: '12.9719° N, 77.5948° E',
    },
    {
      id: 'PING-04',
      x: 15,
      y: 11,
      depth: 4.62,
      time: '14:22:07.135',
      rtk: 'RTK_FIXED (±0.8cm)',
      geo: '12.9721° N, 77.5950° E',
    },
  ]);

  const drone = drones[activeDroneId] || Object.values(drones)[0];

  // Calculated depth from formula: Depth = (v * t) / 2
  const computedDepth = calculateTofDepth(echoTimeMs, soundSpeedWater);

  const handleTriggerTurtle = () => {
    if (!drone) return;
    setTurtleStatusMessage('Inverting craft on water... Accelerometers sensing inverted state.');
    executeTurtleMode(drone, (msg) => {
      setTurtleStatusMessage(msg);
      onLogEvent?.(msg);
    });
  };

  const handleDeployWinch = () => {
    if (!drone) return;
    executeRotorCutAndWinchDeploy(drone, 0.5, (msg) => {
      setWinchStatusMessage(msg);
      onLogEvent?.(msg);
    });
  };

  const handleRetractWinch = () => {
    if (!drone) return;
    executeWinchRetractAndRearm(drone, (msg) => {
      setWinchStatusMessage(msg);
      onLogEvent?.(msg);
    });
  };

  const handleRecordPing = () => {
    if (!drone) return;
    const geo = calculateGeoCoordinates(Math.round(drone.x / 28), Math.round(drone.y / 28));
    recordAcousticGnssPing(drone, computedDepth, geo);
    const now = new Date();
    const timeStr =
      now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLivePoints((prev) => [
      {
        id: `PING-${String(prev.length + 1).padStart(2, '0')}`,
        x: Math.round(drone.x / 28),
        y: Math.round(drone.y / 28),
        depth: computedDepth,
        time: timeStr,
        rtk: 'RTK_FIXED (±0.8cm)',
        geo,
      },
      ...prev.slice(0, 7),
    ]);
    onLogEvent?.(
      `${activeDroneId}: Acoustic-GNSS coordinate recorded: [${Math.round(
        drone.x / 28
      )}, ${Math.round(drone.y / 28)}] Depth: ${computedDepth}m | RTK Fixed`
    );
  };

  const handleRunFusion = () => {
    setIsFusing(true);
    setFusionProgress(0);
    const interval = setInterval(() => {
      setFusionProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsFusing(false);
          onLogEvent?.(
            'Data Fusion Engine: 3D CAD Digital Terrain Model (DTM) aligned and generated with 0.03m RMSE.'
          );
          return 100;
        }
        return p + 20;
      });
    }, 350);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Hydro-Acoustic & Bathymetric Marine Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Amphibious operations: Turtle Mode self-righting, Time-of-Flight sonar, RTK Acoustic-GNSS, automated winch sequencing & 3D data fusion.
              </p>
            </div>
          </div>
        </div>

        {/* Drone Selector Pills */}
        <div className="flex items-center gap-2 bg-[#0e1624] p-1.5 rounded-xl border border-[#29374d]">
          <span className="text-[11px] font-mono text-slate-400 px-2 font-semibold">CRAFT:</span>
          {Object.keys(drones).map((dId) => (
            <button
              key={dId}
              onClick={() => {
                setActiveDroneId(dId);
                onSelectDrone?.(dId);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                activeDroneId === dId
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {dId}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: 2 Columns for Tech Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MODULE 1: TURTLE MODE (Self-Righting Algorithm) */}
        <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#29374d]">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Turtle Mode (Self-Righting Algorithm)</h3>
                <p className="text-[11px] text-slate-400">
                  Inverted craft water recovery via directional motor torque reversal
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                drone?.turtleModeActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {drone?.turtleModeActive ? 'REVERSING TORQUE' : 'READY / STANDBY'}
            </span>
          </div>

          <div className="bg-[#0e1624] border border-[#29374d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Attitude Detection:</span>
              <span className={drone?.inverted ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {drone?.inverted ? 'INVERTED ON WATER (180° Pitch)' : 'UPRIGHT (Floating Nominal)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Torque Reversal Pair:</span>
              <span className="text-sky-300">Motors M1 (CW) & M3 (CCW) Inverted</span>
            </div>

            {/* Visual Motor Diagram */}
            <div className="relative h-28 bg-[#121a28] rounded-lg border border-[#253347] flex items-center justify-center overflow-hidden">
              <div
                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-transform duration-700 ${
                  drone?.inverted
                    ? 'rotate-180 border-rose-500 bg-rose-950/40 text-rose-300'
                    : 'rotate-0 border-cyan-500 bg-cyan-950/30 text-cyan-300'
                }`}
              >
                <span className="text-xs font-mono font-bold">{activeDroneId}</span>
              </div>

              {/* 4 Rotors indicator */}
              <div className="absolute top-2 left-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#182235] text-amber-300 border border-amber-500/30">
                M1: {drone?.turtleModeActive ? 'REV (CCW)' : 'FWD (CW)'}
              </div>
              <div className="absolute top-2 right-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#182235] text-slate-300 border border-[#29374d]">
                M2: FWD (CCW)
              </div>
              <div className="absolute bottom-2 left-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#182235] text-slate-300 border border-[#29374d]">
                M4: FWD (CW)
              </div>
              <div className="absolute bottom-2 right-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#182235] text-amber-300 border border-amber-500/30">
                M3: {drone?.turtleModeActive ? 'REV (CW)' : 'FWD (CCW)'}
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-300 p-2.5 rounded bg-[#141d2c] border border-[#253347]">
              {turtleStatusMessage}
            </div>
          </div>

          <button
            onClick={handleTriggerTurtle}
            disabled={drone?.turtleModeActive}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Simulate Inversion & Execute Turtle Mode Flip</span>
          </button>
        </div>

        {/* MODULE 2: TIME-OF-FLIGHT (ToF) DEPTH CALCULATION */}
        <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#29374d]">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Time-of-Flight (ToF) Depth Calculation</h3>
                <p className="text-[11px] text-slate-400">
                  Hydro-acoustic pulse round-trip millisecond sounding equation
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
              Depth = (v × t) / 2
            </span>
          </div>

          <div className="bg-[#0e1624] border border-[#29374d] rounded-xl p-4 space-y-3">
            {/* Mathematical Equation Display */}
            <div className="bg-[#121a28] border border-sky-500/30 p-3 rounded-lg text-center font-mono">
              <span className="text-xs text-slate-400 block mb-1">ACOUSTIC BATHYMETRY CORE ALGORITHM</span>
              <div className="text-base font-bold text-sky-400">
                Depth = (v × t) / 2 = ({soundSpeedWater} m/s × {echoTimeMs} ms) / 2 ={' '}
                <span className="text-emerald-400 text-lg">{computedDepth} m</span>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-mono text-[11px] block mb-1">
                  Acoustic Echo Time (t): <strong>{echoTimeMs} ms</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="20.0"
                  step="0.1"
                  value={echoTimeMs}
                  onChange={(e) => setEchoTimeMs(parseFloat(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-mono text-[11px] block mb-1">
                  Speed of Sound in Water (v): <strong>{soundSpeedWater} m/s</strong>
                </label>
                <input
                  type="range"
                  min="1400"
                  max="1550"
                  step="2"
                  value={soundSpeedWater}
                  onChange={(e) => setSoundSpeedWater(parseInt(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#253347] text-xs font-mono">
              <span className="text-slate-400">Echo Pulse Waveform:</span>
              <span className="text-emerald-400">Return Peak SNR: +28.4 dB</span>
            </div>
          </div>

          <button
            onClick={handleRecordPing}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4" />
            <span>Emit Sonar Ping & Store Synchronized Point</span>
          </button>
        </div>

        {/* MODULE 3: AUTOMATED ROTOR-CUT & WINCH CONTROL LOGIC */}
        <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#29374d]">
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Automated Rotor-Cut & Winch Control Logic</h3>
                <p className="text-[11px] text-slate-400">
                  Float-detect shutdown and motorized acoustic transducer deployment
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                drone?.rotorCutState === 'CUT'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {drone?.rotorCutState === 'CUT' ? 'ROTORS CUT (SAFE)' : 'ROTORS ARMED'}
            </span>
          </div>

          <div className="bg-[#0e1624] border border-[#29374d] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#121a28] border border-[#253347]">
                <span className="text-slate-400 block text-[10px]">WATER FLOAT SWITCH:</span>
                <span className={drone?.floatingOnWater ? 'text-cyan-300 font-bold' : 'text-slate-300'}>
                  {drone?.floatingOnWater ? 'WATER DETECTED' : 'DRY AIR (FLYING)'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#121a28] border border-[#253347]">
                <span className="text-slate-400 block text-[10px]">TRANSDUCER WINCH:</span>
                <span className="text-indigo-400 font-bold">
                  {drone?.winchState || 'RETRACTED'} ({(drone?.transducerDepthMeters || 0).toFixed(1)}m)
                </span>
              </div>
            </div>

            {/* Sequencing Pipeline Bar */}
            <div className="space-y-1.5 text-[11px] font-mono">
              <span className="text-slate-400">Autonomous Sequencing Sequence:</span>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
                <div
                  className={`p-1.5 rounded border ${
                    drone?.floatingOnWater
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-[#182235] text-slate-400 border-[#29374d]'
                  }`}
                >
                  1. Touchdown
                </div>
                <div
                  className={`p-1.5 rounded border ${
                    drone?.rotorCutState === 'CUT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-[#182235] text-slate-400 border-[#29374d]'
                  }`}
                >
                  2. Rotor Cut
                </div>
                <div
                  className={`p-1.5 rounded border ${
                    drone?.winchState === 'DEPLOYED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#182235] text-slate-400 border-[#29374d]'
                  }`}
                >
                  3. Lower Winch
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-300 p-2.5 rounded bg-[#141d2c] border border-[#253347]">
              {winchStatusMessage}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDeployWinch}
              className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Cut Motors & Lower Winch
            </button>
            <button
              onClick={handleRetractWinch}
              className="flex-1 py-2.5 px-3 bg-[#222c3e] hover:bg-[#2b394e] border border-[#374966] text-slate-200 font-bold text-xs rounded-xl shadow transition"
            >
              Retract Winch & Rearm
            </button>
          </div>
        </div>

        {/* MODULE 4: ACOUSTIC-GNSS TIMESTAMPING & GEOREFERENCING */}
        <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#29374d]">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Acoustic-GNSS Real-Time Georeferencing</h3>
                <p className="text-[11px] text-slate-400">
                  Synchronized (X, Y, Depth) point stream with RTK centimeter precision
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              RTK FIXED ±1cm
            </span>
          </div>

          <div className="bg-[#0e1624] border border-[#29374d] rounded-xl p-3.5 max-h-56 overflow-y-auto font-mono text-[11px] space-y-2">
            {livePoints.map((pt) => (
              <div
                key={pt.id}
                className="p-2 rounded bg-[#121a28] border border-[#253347] flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400">{pt.id}</span>
                    <span className="text-slate-400">[{pt.x}, {pt.y}]</span>
                    <span className="text-slate-500">• {pt.time}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{pt.geo}</div>
                </div>

                <div className="text-right">
                  <div className="text-emerald-400 font-bold">{pt.depth.toFixed(2)} m</div>
                  <div className="text-[9px] text-slate-500">{pt.rtk}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1">
            <span>Points Georeferenced: {livePoints.length}</span>
            <span>Coordinate Frame: WGS-84 / UTM Zone 43N</span>
          </div>
        </div>
      </div>

      {/* MODULE 5: 3D DATA FUSION ENGINE (Photogrammetry + Bathymetry) */}
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#29374d] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Data Fusion Engine: Aerial Photogrammetry & Underwater Acoustic Bathymetry
              </h3>
              <p className="text-xs text-slate-400">
                Stitches aerial terrain/banks photogrammetry with underwater bedrock bathymetry using shared RTK coordinates into a unified 3D CAD digital terrain model (DTM).
              </p>
            </div>
          </div>

          <button
            onClick={handleRunFusion}
            disabled={isFusing}
            className="py-2 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isFusing ? 'Aligning Point Clouds...' : 'Execute 3D Data Fusion'}</span>
          </button>
        </div>

        {/* Fusion Status Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">RTK Spatial Alignment & Point Cloud Stitching:</span>
            <span className="text-purple-300 font-bold">{fusionProgress}%</span>
          </div>
          <div className="w-full bg-[#0e1624] h-2.5 rounded-full overflow-hidden border border-[#29374d]">
            <div
              className="bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${fusionProgress}%` }}
            />
          </div>
        </div>

        {/* Unified 3D Digital Terrain Model Visual Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#0e1624] border border-[#29374d] space-y-2">
            <span className="text-sky-400 font-bold block text-[11px]">DATASET 1: AERIAL OPTICAL</span>
            <p className="text-slate-300 text-[11px]">
              High-resolution photogrammetry of dry banks, rooftops, levee structures, and survivor locations.
            </p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-[#253347]">
              Source: RGB Sensor & 360° LiDAR Voxel Sweep
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1624] border border-[#29374d] space-y-2">
            <span className="text-cyan-400 font-bold block text-[11px]">DATASET 2: UNDERWATER BATHYMETRY</span>
            <p className="text-slate-300 text-[11px]">
              Acoustic depth profiles of submerged roadways, sediment depth, bedrock foundation, and flood bottom contours.
            </p>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-[#253347]">
              Source: Time-of-Flight Sonar Transducer (1482 m/s)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1624] border border-purple-500/40 space-y-2 bg-gradient-to-br from-purple-950/20 to-[#0e1624]">
            <span className="text-purple-300 font-bold block text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              UNIFIED 3D CAD DTM
            </span>
            <p className="text-slate-200 text-[11px]">
              Seamless Digital Terrain Model with zero boundary seam error, ready for flood mitigation and rescue routing.
            </p>
            <div className="text-[10px] text-emerald-400 pt-1 border-t border-[#253347] font-semibold">
              Point Cloud Registration: 0.03m RMSE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
