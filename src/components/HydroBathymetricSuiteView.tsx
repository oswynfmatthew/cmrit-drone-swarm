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
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/15 border border-red-500/40 text-red-400">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Hydro-Acoustic & Bathymetric Marine Architecture
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Amphibious operations: Turtle Mode self-righting, Time-of-Flight sonar, RTK Acoustic-GNSS, automated winch sequencing & 3D data fusion.
              </p>
            </div>
          </div>
        </div>

        {/* Drone Selector Tabs */}
        <div className="flex items-center gap-2 bg-[#06070a] p-1.5 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-mono text-zinc-400 px-2 font-semibold">CRAFT:</span>
          {Object.keys(drones).map((dId) => (
            <button
              key={dId}
              onClick={() => {
                setActiveDroneId(dId);
                onSelectDrone?.(dId);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                activeDroneId === dId
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/60'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {dId}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: 2 Columns for Tech Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MODULE 1: TURTLE MODE */}
        <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-bold text-white">Turtle Mode (Self-Righting Algorithm)</h3>
                <p className="text-[11px] text-zinc-400">
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

          <div className="bg-[#06070a] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Attitude Detection:</span>
              <span className={drone?.inverted ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {drone?.inverted ? 'INVERTED ON WATER (180° Pitch)' : 'UPRIGHT (Floating Nominal)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Torque Reversal Pair:</span>
              <span className="text-red-300">Motors M1 (CW) & M3 (CCW) Inverted</span>
            </div>

            {/* Visual Motor Diagram */}
            <div className="relative h-28 bg-[#0b0c10] rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden">
              <div
                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-transform duration-700 ${
                  drone?.inverted
                    ? 'rotate-180 border-red-500 bg-red-950/40 text-red-300'
                    : 'rotate-0 border-red-500/70 bg-red-950/20 text-red-300'
                }`}
              >
                <span className="text-xs font-mono font-bold">{activeDroneId}</span>
              </div>

              <div className="absolute top-2 left-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#06070a] text-amber-300 border border-amber-500/30">
                M1: {drone?.turtleModeActive ? 'REV (CCW)' : 'FWD (CW)'}
              </div>
              <div className="absolute top-2 right-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#06070a] text-zinc-300 border border-zinc-800">
                M2: FWD (CCW)
              </div>
              <div className="absolute bottom-2 left-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#06070a] text-zinc-300 border border-zinc-800">
                M4: FWD (CW)
              </div>
              <div className="absolute bottom-2 right-6 text-[10px] font-mono px-2 py-0.5 rounded bg-[#06070a] text-amber-300 border border-amber-500/30">
                M3: {drone?.turtleModeActive ? 'REV (CW)' : 'FWD (CCW)'}
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-300 p-2.5 rounded bg-[#0b0c10] border border-zinc-800">
              {turtleStatusMessage}
            </div>
          </div>

          <button
            onClick={handleTriggerTurtle}
            disabled={drone?.turtleModeActive}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-red-950/60 transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Simulate Inversion & Execute Turtle Mode Flip</span>
          </button>
        </div>

        {/* MODULE 2: TIME-OF-FLIGHT (ToF) DEPTH CALCULATION */}
        <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-bold text-white">Time-of-Flight (ToF) Depth Calculation</h3>
                <p className="text-[11px] text-zinc-400">
                  Hydro-acoustic pulse round-trip millisecond sounding equation
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/40">
              Depth = (v × t) / 2
            </span>
          </div>

          <div className="bg-[#06070a] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="bg-[#0b0c10] border border-red-500/30 p-3 rounded-lg text-center font-mono">
              <span className="text-xs text-zinc-400 block mb-1">ACOUSTIC BATHYMETRY CORE ALGORITHM</span>
              <div className="text-base font-bold text-red-400">
                Depth = (v × t) / 2 = ({soundSpeedWater} m/s × {echoTimeMs} ms) / 2 ={' '}
                <span className="text-emerald-400 text-lg">{computedDepth} m</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-zinc-400 font-mono text-[11px] block mb-1">
                  Acoustic Echo Time (t): <strong>{echoTimeMs} ms</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="20.0"
                  step="0.1"
                  value={echoTimeMs}
                  onChange={(e) => setEchoTimeMs(parseFloat(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-mono text-[11px] block mb-1">
                  Speed of Sound in Water (v): <strong>{soundSpeedWater} m/s</strong>
                </label>
                <input
                  type="range"
                  min="1400"
                  max="1550"
                  step="2"
                  value={soundSpeedWater}
                  onChange={(e) => setSoundSpeedWater(parseInt(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs font-mono">
              <span className="text-zinc-400">Echo Pulse Waveform:</span>
              <span className="text-emerald-400">Return Peak SNR: +28.4 dB</span>
            </div>
          </div>

          <button
            onClick={handleRecordPing}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-950/60 transition flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4" />
            <span>Emit Sonar Ping & Store Synchronized Point</span>
          </button>
        </div>

        {/* MODULE 3: AUTOMATED ROTOR-CUT & WINCH CONTROL LOGIC */}
        <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-bold text-white">Automated Rotor-Cut & Winch Control Logic</h3>
                <p className="text-[11px] text-zinc-400">
                  Float-detect shutdown and motorized acoustic transducer deployment
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                drone?.rotorCutState === 'CUT'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {drone?.rotorCutState === 'CUT' ? 'ROTORS CUT (SAFE)' : 'ROTORS ARMED'}
            </span>
          </div>

          <div className="bg-[#06070a] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#0b0c10] border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">WATER FLOAT SWITCH:</span>
                <span className={drone?.floatingOnWater ? 'text-red-300 font-bold' : 'text-zinc-300'}>
                  {drone?.floatingOnWater ? 'WATER DETECTED' : 'DRY AIR (FLYING)'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#0b0c10] border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">TRANSDUCER WINCH:</span>
                <span className="text-red-400 font-bold">
                  {drone?.winchState || 'RETRACTED'} ({(drone?.transducerDepthMeters || 0).toFixed(1)}m)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <span className="text-zinc-400">Autonomous Sequencing Sequence:</span>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
                <div
                  className={`p-1.5 rounded border ${
                    drone?.floatingOnWater
                      ? 'bg-red-600/20 text-red-300 border-red-500/40'
                      : 'bg-[#0b0c10] text-zinc-400 border-zinc-800'
                  }`}
                >
                  1. Touchdown
                </div>
                <div
                  className={`p-1.5 rounded border ${
                    drone?.rotorCutState === 'CUT'
                      ? 'bg-red-600/20 text-red-300 border-red-500/40'
                      : 'bg-[#0b0c10] text-zinc-400 border-zinc-800'
                  }`}
                >
                  2. Rotor Cut
                </div>
                <div
                  className={`p-1.5 rounded border ${
                    drone?.winchState === 'DEPLOYED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#0b0c10] text-zinc-400 border-zinc-800'
                  }`}
                >
                  3. Lower Winch
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-300 p-2.5 rounded bg-[#0b0c10] border border-zinc-800">
              {winchStatusMessage}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDeployWinch}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Cut Motors & Lower Winch
            </button>
            <button
              onClick={handleRetractWinch}
              className="flex-1 py-2.5 px-3 bg-[#12131a] hover:bg-[#1a1b24] border border-zinc-800 text-zinc-200 font-bold text-xs rounded-xl shadow transition"
            >
              Retract Winch & Rearm
            </button>
          </div>
        </div>

        {/* MODULE 4: ACOUSTIC-GNSS TIMESTAMPING & GEOREFERENCING */}
        <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Acoustic-GNSS Real-Time Georeferencing</h3>
                <p className="text-[11px] text-zinc-400">
                  Synchronized (X, Y, Depth) point stream with RTK centimeter precision
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              RTK FIXED ±1cm
            </span>
          </div>

          <div className="bg-[#06070a] border border-zinc-800 rounded-xl p-3.5 max-h-56 overflow-y-auto font-mono text-[11px] space-y-2">
            {livePoints.map((pt) => (
              <div
                key={pt.id}
                className="p-2 rounded bg-[#0b0c10] border border-zinc-800 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-400">{pt.id}</span>
                    <span className="text-zinc-400">[{pt.x}, {pt.y}]</span>
                    <span className="text-zinc-500">• {pt.time}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">{pt.geo}</div>
                </div>

                <div className="text-right">
                  <div className="text-emerald-400 font-bold">{pt.depth.toFixed(2)} m</div>
                  <div className="text-[9px] text-zinc-500">{pt.rtk}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-zinc-400 px-1">
            <span>Points Georeferenced: {livePoints.length}</span>
            <span>Coordinate Frame: WGS-84 / UTM Zone 43N</span>
          </div>
        </div>
      </div>

      {/* MODULE 5: 3D DATA FUSION ENGINE */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-zinc-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/15 border border-red-500/35 text-red-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Data Fusion Engine: Aerial Photogrammetry & Underwater Acoustic Bathymetry
              </h3>
              <p className="text-xs text-zinc-400">
                Stitches aerial terrain/banks photogrammetry with underwater bedrock bathymetry using shared RTK coordinates into a unified 3D CAD digital terrain model (DTM).
              </p>
            </div>
          </div>

          <button
            onClick={handleRunFusion}
            disabled={isFusing}
            className="py-2 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-red-950/60 transition flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isFusing ? 'Aligning Point Clouds...' : 'Execute 3D Data Fusion'}</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-zinc-400">RTK Spatial Alignment & Point Cloud Stitching:</span>
            <span className="text-red-400 font-bold">{fusionProgress}%</span>
          </div>
          <div className="w-full bg-[#050507] h-2.5 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${fusionProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#06070a] border border-zinc-800 space-y-2">
            <span className="text-red-400 font-bold block text-[11px]">DATASET 1: AERIAL OPTICAL</span>
            <p className="text-zinc-300 text-[11px]">
              High-resolution photogrammetry of dry banks, rooftops, levee structures, and survivor locations.
            </p>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
              Source: RGB Sensor & 360° LiDAR Voxel Sweep
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#06070a] border border-zinc-800 space-y-2">
            <span className="text-amber-400 font-bold block text-[11px]">DATASET 2: UNDERWATER BATHYMETRY</span>
            <p className="text-zinc-300 text-[11px]">
              Acoustic depth profiles of submerged roadways, sediment depth, bedrock foundation, and flood bottom contours.
            </p>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
              Source: Time-of-Flight Sonar Transducer (1482 m/s)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#06070a] border border-red-500/40 space-y-2 bg-gradient-to-br from-red-950/25 to-[#06070a]">
            <span className="text-red-300 font-bold block text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              UNIFIED 3D CAD DTM
            </span>
            <p className="text-zinc-200 text-[11px]">
              Seamless Digital Terrain Model with zero boundary seam error, ready for flood mitigation and rescue routing.
            </p>
            <div className="text-[10px] text-emerald-400 pt-1 border-t border-zinc-800 font-semibold">
              Point Cloud Registration: 0.03m RMSE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
