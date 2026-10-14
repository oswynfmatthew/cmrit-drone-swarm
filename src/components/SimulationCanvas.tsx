import React, { useEffect, useRef, useState } from 'react';
import { Drone, EnvironmentType, MovingObstacle, Target, Task } from '../types';
import { CELL, GRID_H, GRID_W, HEIGHT, WIDTH, pointKey } from '../swarmEngine';
import {
  Eye,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Share2,
  Mountain,
} from 'lucide-react';

interface SimulationCanvasProps {
  drones: Record<string, Drone>;
  targets: Record<string, Target>;
  tasks: Task[];
  blocked: Set<string>;
  movingObstacles: MovingObstacle[];
  selectedDroneId: string | null;
  onSelectDrone: (id: string | null) => void;
  onAddTargetAt: (cellX: number, cellY: number) => void;
  missionStatus: string;
  environment: EnvironmentType;
  onChangeEnvironment: (env: EnvironmentType) => void;
  darknessLevel: number;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  drones,
  targets,
  tasks,
  blocked,
  movingObstacles,
  selectedDroneId,
  onSelectDrone,
  onAddTargetAt,
  missionStatus,
  environment,
  onChangeEnvironment,
  darknessLevel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [showZones, setShowZones] = useState(false);
  const [showRadar, setShowRadar] = useState(true);
  const [showLidarBeams, setShowLidarBeams] = useState(true);
  const [showMeshLinks, setShowMeshLinks] = useState(true);
  const [showVoxelGrid, setShowVoxelGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Canvas render animation loop
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Environment Backdrop
      if (environment === 'SUBTERRANEAN_CAVE') {
        ctx.fillStyle = '#0a0e17'; // Pitch black cave interior
      } else if (environment === 'GPS_DENIED_FOREST') {
        ctx.fillStyle = '#0c151c'; // Forest ruins
      } else {
        ctx.fillStyle = '#121823';
      }
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Draw Voxel Grid / Ambient Background Grids
      if (showVoxelGrid) {
        ctx.strokeStyle = environment === 'SUBTERRANEAN_CAVE' ? '#141d2c' : '#1e2838';
        ctx.lineWidth = 1;

        for (let x = 0; x <= WIDTH; x += CELL) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, HEIGHT);
          ctx.stroke();
        }

        for (let y = 0; y <= HEIGHT; y += CELL) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(WIDTH, y);
          ctx.stroke();
        }
      }

      // Draw Zone Column Backgrounds / Borders if enabled
      if (showZones) {
        const zoneCount = 5;
        const zoneW = Math.floor(GRID_W / zoneCount);
        const zoneColors = [
          'rgba(56, 189, 248, 0.04)',
          'rgba(168, 85, 247, 0.04)',
          'rgba(34, 197, 94, 0.04)',
          'rgba(249, 115, 22, 0.04)',
          'rgba(236, 72, 153, 0.04)',
        ];

        for (let z = 0; z < zoneCount; z++) {
          const x0 = z * zoneW * CELL;
          const x1 = z === zoneCount - 1 ? WIDTH : (z + 1) * zoneW * CELL;
          const w = x1 - x0;

          ctx.fillStyle = zoneColors[z % zoneColors.length];
          ctx.fillRect(x0, 0, w, HEIGHT);

          ctx.strokeStyle = 'rgba(74, 90, 116, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, 0);
          ctx.lineTo(x1, HEIGHT);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`ZONE ${z + 1}`, x0 + 8, 16);
        }
      }

      // Draw Static Obstacles (Cavern Walls / Rubble)
      blocked.forEach((key) => {
        const [ox, oy] = key.split(',').map(Number);
        const px = ox * CELL;
        const py = oy * CELL;

        if (environment === 'SUBTERRANEAN_CAVE') {
          // Rocky subterranean cave wall styling
          ctx.fillStyle = '#222d3d';
          ctx.fillRect(px, py, CELL, CELL);
          ctx.strokeStyle = '#384860';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);

          // Cavern rock texture
          ctx.fillStyle = '#192230';
          ctx.fillRect(px + 4, py + 4, CELL - 8, CELL - 8);
        } else {
          ctx.fillStyle = '#374150';
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 1.5;
          ctx.fillRect(px, py, CELL, CELL);
          ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        }
      });

      // Draw Moving Obstacles (Triggers Dynamic Window Approach [DWA])
      movingObstacles.forEach((mo) => {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(mo.x, mo.y, mo.radius + 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(mo.x, mo.y, mo.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mo.x, mo.y, mo.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DWA', mo.x, mo.y);
      });

      // Draw Drone Launch Bases
      Object.values(drones).forEach((drone) => {
        ctx.strokeStyle = 'rgba(90, 170, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drone.base_x, drone.base_y, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(90, 170, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(drone.base_x, drone.base_y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(90, 170, 255, 0.8)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BASE', drone.base_x, drone.base_y);
      });

      // Draw Hover Indicator
      if (hoverCoord) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(hoverCoord.x * CELL, hoverCoord.y * CELL, CELL, CELL);
        ctx.strokeRect(hoverCoord.x * CELL, hoverCoord.y * CELL, CELL, CELL);
      }

      // Draw Inter-Drone Swarm Mesh Network Wireless Links (PDF Slide 9)
      if (showMeshLinks) {
        const droneList = Object.values(drones);
        ctx.lineWidth = 1.2;

        for (let i = 0; i < droneList.length; i++) {
          for (let j = i + 1; j < droneList.length; j++) {
            const d1 = droneList[i];
            const d2 = droneList[j];
            if (!d1.healthy || !d2.healthy) continue;

            const dist = Math.hypot(d1.x - d2.x, d1.y - d2.y);
            if (dist <= 300) {
              const alpha = Math.max(0.15, 1 - dist / 300);
              ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.7})`;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(d1.x, d1.y);
              ctx.lineTo(d2.x, d2.y);
              ctx.stroke();
              ctx.setLineDash([]);

              // Midpoint RSSI marker
              if (dist < 180) {
                const mx = (d1.x + d2.x) / 2;
                const my = (d1.y + d2.y) / 2;
                ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('MESH LINK', mx, my - 3);
              }
            }
          }
        }
      }

      // Draw Drone Flight Paths (A* waypoints)
      if (showPaths) {
        Object.values(drones).forEach((drone) => {
          if (!drone.healthy || drone.path.length === 0) return;

          const isSelected = selectedDroneId === drone.drone_id;
          ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.setLineDash(isSelected ? [3, 2] : [4, 4]);

          ctx.beginPath();
          ctx.moveTo(drone.x, drone.y);

          drone.path.forEach(([cx, cy]) => {
            ctx.lineTo(cx * CELL + CELL / 2, cy * CELL + CELL / 2);
          });
          ctx.stroke();
          ctx.setLineDash([]);

          if (drone.path.length > 0) {
            const last = drone.path[drone.path.length - 1];
            ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.5)';
            ctx.beginPath();
            ctx.arc(last[0] * CELL + CELL / 2, last[1] * CELL + CELL / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // Draw 360° LiDAR Point Cloud Beams (PDF Slide 3 & 4)
      if (showLidarBeams) {
        Object.values(drones).forEach((drone) => {
          if (!drone.healthy || drone.lidarBeams.length === 0) return;

          const isSelected = selectedDroneId === drone.drone_id;
          const beamAlpha = isSelected ? 0.35 : 0.12;

          drone.lidarBeams.forEach((beam) => {
            // Laser beam ray
            ctx.strokeStyle = `rgba(52, 211, 153, ${beamAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(drone.x, drone.y);
            ctx.lineTo(beam.hitX, beam.hitY);
            ctx.stroke();

            // Point Cloud hit contact point
            if (beam.hitObstacle) {
              ctx.fillStyle = isSelected ? '#34d399' : 'rgba(52, 211, 153, 0.6)';
              ctx.beginPath();
              ctx.arc(beam.hitX, beam.hitY, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        });
      }

      // Draw Targets & YOLO Bounding Boxes (PDF Slide 5)
      Object.values(targets).forEach((target) => {
        const tx = target.x * CELL + CELL / 2;
        const ty = target.y * CELL + CELL / 2;

        if (target.found) {
          // Found target: Green beacon with badge
          ctx.strokeStyle = '#50d282';
          ctx.fillStyle = 'rgba(80, 210, 130, 0.2)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tx, ty, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // YOLO Bounding Box Overlay
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tx - 16, ty - 16, 32, 32);

          // YOLO Tag Label
          ctx.fillStyle = '#0e1624';
          ctx.fillRect(tx - 20, ty - 27, 48, 12);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${target.type} ${Math.round(target.confidence * 100)}%`, tx + 4, ty - 18);
        } else {
          // Unfound rescue target: Pulsing golden rings
          const pulse = (Math.sin(time * 0.006) + 1) * 3;

          ctx.fillStyle = '#f5d246';
          ctx.beginPath();
          ctx.arc(tx, ty, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(245, 210, 70, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(tx, ty, 10 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Crosshairs
          ctx.strokeStyle = 'rgba(245, 210, 70, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx - 14, ty);
          ctx.lineTo(tx + 14, ty);
          ctx.moveTo(tx, ty - 14);
          ctx.lineTo(tx, ty + 14);
          ctx.stroke();

          ctx.fillStyle = '#f5d246';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${target.target_id} (${target.type})`, tx, ty + 18);
        }
      });

      // Draw Radar Cones around active drones
      if (showRadar) {
        Object.values(drones).forEach((drone) => {
          if (!drone.healthy) return;
          if (!['SEARCHING', 'AVOIDING', 'INVESTIGATING'].includes(drone.status)) return;

          const pulseRadius = Math.max(22, 45 + Math.sin(time * 0.007) * 8);
          const isInvestigating = drone.status === 'INVESTIGATING';

          const fillColor = isInvestigating ? 'rgba(245, 210, 70, 0.16)' : 'rgba(80, 210, 130, 0.12)';
          const strokeColor = isInvestigating ? 'rgba(245, 210, 70, 0.6)' : 'rgba(80, 210, 130, 0.45)';

          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.arc(drone.x, drone.y, pulseRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(drone.x, drone.y, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
        });
      }

      // Draw Drones
      Object.values(drones).forEach((drone) => {
        const isSelected = selectedDroneId === drone.drone_id;
        const cx = drone.x;
        const cy = drone.y;

        let primaryColor = '#5aaaff';
        if (!drone.healthy || drone.status === 'FAILED') primaryColor = '#eb5a5a';
        else if (drone.status === 'INVESTIGATING') primaryColor = '#f5d246';
        else if (drone.status === 'LOW_BATTERY' || drone.status === 'RETURNING') primaryColor = '#eb9646';

        // Draw IMU Drift Shadow if drift exists (PDF Slide 3)
        if (drone.healthy && (Math.abs(drone.imu.driftX) > 1.0 || Math.abs(drone.imu.driftY) > 1.0)) {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(cx + drone.imu.driftX, cy + drone.imu.driftY, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Selection highlight ring
        if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(cx, cy, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Rotor spin animation
        const rotorAngle = (time * 0.02) % (Math.PI * 2);
        const rotorOffset = 9;

        // Draw drone arms (X shape)
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy - 7);
        ctx.lineTo(cx + 7, cy + 7);
        ctx.moveTo(cx + 7, cy - 7);
        ctx.lineTo(cx - 7, cy + 7);
        ctx.stroke();

        // Rotors
        if (drone.healthy && drone.status !== 'PAUSED') {
          const rotorRadius = 4.5;
          const rotorPositions = [
            [cx - rotorOffset, cy - rotorOffset],
            [cx + rotorOffset, cy - rotorOffset],
            [cx - rotorOffset, cy + rotorOffset],
            [cx + rotorOffset, cy + rotorOffset],
          ];

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1;

          rotorPositions.forEach(([rx, ry], idx) => {
            const angle = rotorAngle * (idx % 2 === 0 ? 1 : -1);
            ctx.beginPath();
            ctx.arc(rx, ry, rotorRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(rx - Math.cos(angle) * rotorRadius, ry - Math.sin(angle) * rotorRadius);
            ctx.lineTo(rx + Math.cos(angle) * rotorRadius, ry + Math.sin(angle) * rotorRadius);
            ctx.stroke();
          });
        }

        // Central body circle
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.stroke();

        // Drone ID Label badge
        ctx.fillStyle = '#0e1624';
        const labelText = drone.drone_id;
        ctx.font = 'bold 10px sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(cx - textWidth / 2 - 3, cy + 13, textWidth + 6, 12);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - textWidth / 2 - 3, cy + 13, textWidth + 6, 12);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cx, cy + 19);

        // DWA active indicator
        if (drone.dwaActive) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('DWA', cx, cy - 14);
        } else if (!drone.healthy) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('FAIL', cx, cy - 14);
        }
      });

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [
    drones,
    targets,
    tasks,
    blocked,
    movingObstacles,
    selectedDroneId,
    hoverCoord,
    showPaths,
    showZones,
    showRadar,
    showLidarBeams,
    showMeshLinks,
    showVoxelGrid,
    environment,
    darknessLevel,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let clickedDrone: string | null = null;
    for (const drone of Object.values(drones)) {
      const dist = Math.hypot(clickX - drone.x, clickY - drone.y);
      if (dist <= 20) {
        clickedDrone = drone.drone_id;
        break;
      }
    }

    if (clickedDrone) {
      onSelectDrone(selectedDroneId === clickedDrone ? null : clickedDrone);
      return;
    }

    const cellX = Math.floor(clickX / CELL);
    const cellY = Math.floor(clickY / CELL);

    if (cellX >= 0 && cellX < GRID_W && cellY >= 0 && cellY < GRID_H) {
      if (!blocked.has(pointKey([cellX, cellY]))) {
        onAddTargetAt(cellX, cellY);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const cellX = Math.floor(mouseX / CELL);
    const cellY = Math.floor(mouseY / CELL);

    if (cellX >= 0 && cellX < GRID_W && cellY >= 0 && cellY < GRID_H) {
      setHoverCoord({ x: cellX, y: cellY });
    } else {
      setHoverCoord(null);
    }
  };

  return (
    <div className="flex flex-col bg-[#121823] rounded-xl border border-[#29374d] overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="px-4 py-3 bg-[#182235] border-b border-[#29374d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Environment Switcher */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#222c3e] rounded-md border border-[#334259] text-xs">
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={environment}
              onChange={(e) => onChangeEnvironment(e.target.value as EnvironmentType)}
              className="bg-transparent text-slate-200 outline-none text-xs font-semibold cursor-pointer"
            >
              <option value="SUBTERRANEAN_CAVE" className="bg-[#182235] text-white">
                Underground Cave / Tunnel (Dark)
              </option>
              <option value="GPS_DENIED_FOREST" className="bg-[#182235] text-white">
                GPS-Denied Disaster Ruins
              </option>
              <option value="STANDARD_FACILITY" className="bg-[#182235] text-white">
                Standard Search Facility
              </option>
            </select>
          </div>

          {hoverCoord && (
            <span className="text-xs font-mono text-slate-400">
              [{hoverCoord.x}, {hoverCoord.y}]
            </span>
          )}
        </div>

        {/* Feature Toggles */}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <button
            onClick={() => setShowLidarBeams(!showLidarBeams)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 border ${
              showLidarBeams
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
            title="Toggle 360 LiDAR Point Cloud laser rays"
          >
            <Sparkles className="w-3 h-3" />
            LiDAR Cloud
          </button>

          <button
            onClick={() => setShowMeshLinks(!showMeshLinks)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 border ${
              showMeshLinks
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
            title="Toggle 802.11s Peer Mesh links"
          >
            <Share2 className="w-3 h-3" />
            Mesh Relays
          </button>

          <button
            onClick={() => setShowPaths(!showPaths)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 border ${
              showPaths
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
          >
            <Eye className="w-3 h-3" />
            Paths
          </button>

          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 border ${
              showRadar
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
          >
            Radar
          </button>

          <button
            onClick={() => setShowVoxelGrid(!showVoxelGrid)}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 border ${
              showVoxelGrid
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
            title="Toggle 3D Voxel Occupancy Grid"
          >
            Voxels
          </button>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 border ${
              showZones
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
            title="Toggle Swarm Zones Z1-Z5"
          >
            Zones
          </button>

          <div className="flex items-center border border-[#334259] rounded overflow-hidden">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              className="p-1 hover:bg-[#222c3e] text-slate-300"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1 hover:bg-[#222c3e] text-slate-300"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-[#222c3e] text-slate-300 border-l border-[#334259]"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative overflow-auto flex items-center justify-center p-2 bg-[#0c121c] min-h-[500px]"
      >
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
          className="relative inline-block cursor-crosshair shadow-lg"
        >
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverCoord(null)}
            className="rounded border border-[#2a384e] block max-w-full"
            style={{ width: `${WIDTH}px`, height: `${HEIGHT}px` }}
          />

          <div className="absolute bottom-2 left-2 pointer-events-none bg-[#0e1624]/85 backdrop-blur border border-[#2a384e] px-2.5 py-1 rounded text-[11px] text-slate-300 font-mono flex items-center gap-2">
            <span>🖱️ Click drone to inspect</span>
            <span>•</span>
            <span>Click empty cell to deploy Target</span>
            <span>•</span>
            <span className="text-emerald-400">360° LiDAR Active</span>
          </div>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="px-4 py-2 bg-[#182235] border-t border-[#29374d] flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#5aaaff] inline-block border border-white/60"></span>
            <span>Recon Drone (Active)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#34d399] inline-block"></span>
            <span>LiDAR Point Cloud</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block"></span>
            <span>Dynamic Moving Obstacle (DWA)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#f5d246] inline-block"></span>
            <span>Target (Human / Rover / Crack)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#222d3d] border border-[#384860] inline-block"></span>
            <span>Cavern Wall</span>
          </div>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Mission: <span className="text-emerald-400 font-semibold">{missionStatus}</span>
        </div>
      </div>
    </div>
  );
};
