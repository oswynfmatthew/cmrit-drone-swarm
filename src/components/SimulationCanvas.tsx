import React, { useEffect, useRef, useState } from 'react';
import { Drone, EnvironmentType, Target, Task } from '../types';
import { CELL, GRID_H, GRID_W, HEIGHT, WIDTH, pointKey } from '../swarmEngine';
import {
  Eye,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Share2,
  Mountain,
  Upload,
  Layers,
  X,
  CheckCircle,
  Trash2,
  Crosshair,
} from 'lucide-react';

interface SimulationCanvasProps {
  drones: Record<string, Drone>;
  targets: Record<string, Target>;
  tasks: Task[];
  blocked: Set<string>;
  selectedDroneId: string | null;
  onSelectDrone: (id: string | null) => void;
  onAddTargetAt: (cellX: number, cellY: number) => void;
  onDeleteTarget?: (targetId: string) => void;
  onAddTargetWithType?: (
    cellX: number,
    cellY: number,
    type: 'HUMAN' | 'ANIMAL' | 'VEHICLE' | 'STRUCTURAL_CRACK',
    initialConfidence?: number
  ) => void;
  missionStatus: string;
  environment: EnvironmentType;
  onChangeEnvironment: (env: EnvironmentType) => void;
  darknessLevel: number;
  // Image Upload Integration
  backgroundImageUrl: string | null;
  backgroundImageName: string | null;
  onOpenUploadModal: () => void;
  onClearBackgroundImage: () => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  drones,
  targets,
  tasks,
  blocked,
  selectedDroneId,
  onSelectDrone,
  onAddTargetAt,
  onDeleteTarget,
  onAddTargetWithType,
  missionStatus,
  environment,
  onChangeEnvironment,
  darknessLevel,
  backgroundImageUrl,
  backgroundImageName,
  onOpenUploadModal,
  onClearBackgroundImage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgImageElementRef = useRef<HTMLImageElement | null>(null);

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [showZones, setShowZones] = useState(false);
  const [showRadar, setShowRadar] = useState(true);
  const [showLidarBeams, setShowLidarBeams] = useState(true);
  const [showMeshLinks, setShowMeshLinks] = useState(true);
  const [showVoxelGrid, setShowVoxelGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTargetType, setActiveTargetType] = useState<
    'HUMAN' | 'ANIMAL' | 'VEHICLE' | 'STRUCTURAL_CRACK'
  >('HUMAN');
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [inspectedTargetId, setInspectedTargetId] = useState<string | null>(null);
  const gridOverlayOpacity = 0.35;

  // Load background image into Image object
  useEffect(() => {
    if (backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = backgroundImageUrl;
      img.onload = () => {
        bgImageElementRef.current = img;
      };
      img.onerror = () => {
        const retryImg = new Image();
        retryImg.src = backgroundImageUrl;
        retryImg.onload = () => {
          bgImageElementRef.current = retryImg;
        };
      };
    } else {
      bgImageElementRef.current = null;
    }
  }, [backgroundImageUrl]);

  // Main canvas render loop
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // 1. Draw Background: Uploaded Satellite Image OR Tactical Dark Environment
      if (bgImageElementRef.current) {
        // Draw the uploaded photo / satellite image
        ctx.drawImage(bgImageElementRef.current, 0, 0, WIDTH, HEIGHT);

        // Optional dark vignette for night / cave missions
        if (darknessLevel > 0) {
          ctx.fillStyle = `rgba(10, 16, 26, ${darknessLevel * 0.65})`;
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
        }
      } else {
        // Procedural environments
        if (environment === 'SUBTERRANEAN_CAVE') {
          ctx.fillStyle = '#0a0e17';
        } else if (environment === 'GPS_DENIED_FOREST') {
          ctx.fillStyle = '#0c151c';
        } else {
          ctx.fillStyle = '#121823';
        }
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      // 2. Draw Grid Lines (Subtle overlay when satellite image is active)
      if (showVoxelGrid) {
        if (bgImageElementRef.current) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${gridOverlayOpacity * 0.4})`;
        } else {
          ctx.strokeStyle = environment === 'SUBTERRANEAN_CAVE' ? '#141d2c' : '#1e2838';
        }
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

      // 3. Draw Zone Column Boundaries if enabled
      if (showZones) {
        const zoneCount = 5;
        const zoneW = Math.floor(GRID_W / zoneCount);
        const zoneColors = [
          'rgba(56, 189, 248, 0.05)',
          'rgba(168, 85, 247, 0.05)',
          'rgba(34, 197, 94, 0.05)',
          'rgba(249, 115, 22, 0.05)',
          'rgba(236, 72, 153, 0.05)',
        ];

        for (let z = 0; z < zoneCount; z++) {
          const x0 = z * zoneW * CELL;
          const x1 = z === zoneCount - 1 ? WIDTH : (z + 1) * zoneW * CELL;
          const w = x1 - x0;

          ctx.fillStyle = zoneColors[z % zoneColors.length];
          ctx.fillRect(x0, 0, w, HEIGHT);

          ctx.strokeStyle = 'rgba(74, 90, 116, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, 0);
          ctx.lineTo(x1, HEIGHT);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.font = '10px monospace';
          ctx.fillText(`ZONE ${z + 1}`, x0 + 8, 16);
        }
      }

      // 4. Draw Obstacles (Cavern Walls) only when not in full satellite picture mode
      if (!bgImageElementRef.current) {
        blocked.forEach((key) => {
          const [ox, oy] = key.split(',').map(Number);
          const px = ox * CELL;
          const py = oy * CELL;

          if (environment === 'SUBTERRANEAN_CAVE') {
            ctx.fillStyle = '#222d3d';
            ctx.fillRect(px, py, CELL, CELL);
            ctx.strokeStyle = '#384860';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
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
      }

      // (Note: Floating red dots have been removed as requested!)

      // 5. Draw Drone Launch Base Pads
      Object.values(drones).forEach((drone) => {
        ctx.strokeStyle = 'rgba(90, 170, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drone.base_x, drone.base_y, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(90, 170, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(drone.base_x, drone.base_y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BASE', drone.base_x, drone.base_y);
      });

      // 6. Draw Hover Indicator
      if (hoverCoord) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(hoverCoord.x * CELL, hoverCoord.y * CELL, CELL, CELL);
        ctx.strokeRect(hoverCoord.x * CELL, hoverCoord.y * CELL, CELL, CELL);
      }

      // 7. Draw Inter-Drone Swarm Mesh Network Wireless Links
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
              ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.75})`;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(d1.x, d1.y);
              ctx.lineTo(d2.x, d2.y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      }

      // 8. Draw Drone Flight Paths
      if (showPaths) {
        Object.values(drones).forEach((drone) => {
          if (!drone.healthy || drone.path.length === 0) return;

          const isSelected = selectedDroneId === drone.drone_id;
          ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
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
            ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.6)';
            ctx.beginPath();
            ctx.arc(last[0] * CELL + CELL / 2, last[1] * CELL + CELL / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // 9. Draw 360° LiDAR Point Cloud Beams
      if (showLidarBeams) {
        Object.values(drones).forEach((drone) => {
          if (!drone.healthy || drone.lidarBeams.length === 0) return;

          const isSelected = selectedDroneId === drone.drone_id;
          const beamAlpha = isSelected ? 0.35 : 0.12;

          drone.lidarBeams.forEach((beam) => {
            ctx.strokeStyle = `rgba(52, 211, 153, ${beamAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(drone.x, drone.y);
            ctx.lineTo(beam.hitX, beam.hitY);
            ctx.stroke();

            if (beam.hitObstacle) {
              ctx.fillStyle = isSelected ? '#34d399' : 'rgba(52, 211, 153, 0.6)';
              ctx.beginPath();
              ctx.arc(beam.hitX, beam.hitY, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        });
      }

      // 10. Draw Detected Targets DIRECTLY ON THE IMAGE with Tactical Highlights
      Object.values(targets).forEach((target) => {
        const tx = target.x * CELL + CELL / 2;
        const ty = target.y * CELL + CELL / 2;

        // Targets ONLY appear when actually pinpointed and verified by a scanning drone in the field
        const isFound = target.found;

        if (isFound) {
          // Detected Target on Image: Pulsing Tactical Rescue Circle & Corner Brackets
          const pulse = (Math.sin(time * 0.008) + 1) * 3;

          // Color scheme specified: Human=Blue, Vehicle=Purple, Animal=Red, Plant=Emerald, Damaged Building=Orange
          const themeColor =
            target.type === 'HUMAN'
              ? '#38bdf8' // Blue
              : target.type === 'VEHICLE'
              ? '#c084fc' // Purple
              : target.type === 'ANIMAL'
              ? '#ef4444' // Red
              : target.type === 'PLANT'
              ? '#10b981' // Emerald
              : '#f59e0b'; // Orange (Damaged Building / Crack)

          // Outer pulsing rescue ring
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(tx, ty, 18 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Subtle glow fill
          ctx.fillStyle = `${themeColor}33`;
          ctx.beginPath();
          ctx.arc(tx, ty, 14, 0, Math.PI * 2);
          ctx.fill();

          // Reticle crosshair ticks
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tx - 26, ty);
          ctx.lineTo(tx - 20, ty);
          ctx.moveTo(tx + 20, ty);
          ctx.lineTo(tx + 26, ty);
          ctx.moveTo(tx, ty - 26);
          ctx.lineTo(tx, ty - 20);
          ctx.moveTo(tx, ty + 20);
          ctx.lineTo(tx, ty + 26);
          ctx.stroke();

          // Tactical Corner brackets
          const bSize = 22;
          const cLen = 7;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;

          // Top-left
          ctx.beginPath();
          ctx.moveTo(tx - bSize, ty - bSize + cLen);
          ctx.lineTo(tx - bSize, ty - bSize);
          ctx.lineTo(tx - bSize + cLen, ty - bSize);
          // Top-right
          ctx.moveTo(tx + bSize - cLen, ty - bSize);
          ctx.lineTo(tx + bSize, ty - bSize);
          ctx.lineTo(tx + bSize, ty - bSize + cLen);
          // Bottom-left
          ctx.moveTo(tx - bSize, ty + bSize - cLen);
          ctx.lineTo(tx - bSize, ty + bSize);
          ctx.lineTo(tx - bSize + cLen, ty + bSize);
          // Bottom-right
          ctx.moveTo(tx + bSize - cLen, ty + bSize);
          ctx.lineTo(tx + bSize, ty + bSize);
          ctx.lineTo(tx + bSize, ty + bSize - cLen);
          ctx.stroke();

          // Tactical Badge Label with Exact Target Type and Probability in brackets [98%]
          const typeLabel =
            target.type === 'HUMAN'
              ? 'HUMAN'
              : target.type === 'VEHICLE'
              ? 'VEHICLE'
              : target.type === 'ANIMAL'
              ? 'ANIMAL'
              : target.type === 'PLANT'
              ? 'PLANT'
              : 'BUILDING';

          const probPercent = Math.min(
            100,
            Math.max(50, Math.round((target.confidence || 0.98) * 100))
          );
          const label = `${typeLabel} [${probPercent}%]`;

          ctx.font = 'bold 9.5px monospace';
          const textMetric = ctx.measureText(label);
          const badgeW = Math.max(86, textMetric.width + 14);
          ctx.fillStyle = '#0e1624';
          ctx.fillRect(tx - badgeW / 2, ty - bSize - 19, badgeW, 16);
          ctx.strokeStyle = themeColor;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(tx - badgeW / 2, ty - bSize - 19, badgeW, 16);

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, tx, ty - bSize - 11);
        }
        // If not found yet: Completely invisible! No markers rendered.
      });

      // 11. Draw Radar Cones around active drones
      if (showRadar) {
        Object.values(drones).forEach((drone) => {
          if (!drone.healthy) return;
          if (!['SEARCHING', 'AVOIDING', 'INVESTIGATING'].includes(drone.status)) return;

          const pulseRadius = Math.max(22, 45 + Math.sin(time * 0.007) * 8);
          const isInvestigating = drone.status === 'INVESTIGATING';

          const fillColor = isInvestigating ? 'rgba(56, 189, 248, 0.16)' : 'rgba(80, 210, 130, 0.14)';
          const strokeColor = isInvestigating ? 'rgba(56, 189, 248, 0.6)' : 'rgba(80, 210, 130, 0.45)';

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

      // 12. Draw Realistic Rotating Autonomous Recon Drones
      Object.values(drones).forEach((drone) => {
        const isSelected = selectedDroneId === drone.drone_id;
        const cx = drone.x;
        const cy = drone.y;

        let primaryColor = '#38bdf8'; // Sky blue reconnaissance livery
        if (!drone.healthy || drone.status === 'FAILED') primaryColor = '#ef4444';
        else if (drone.status === 'INVESTIGATING') primaryColor = '#facc15';
        else if (drone.status === 'LOW_BATTERY' || drone.status === 'RETURNING') primaryColor = '#fb923c';
        else if (drone.status === 'COMPLETED') primaryColor = '#34d399';

        ctx.save();
        ctx.translate(cx, cy);
        // Rotate drone in flight heading direction
        ctx.rotate(drone.heading + Math.PI / 2);

        if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const rotorAngle = (time * 0.035) % (Math.PI * 2);
        const armLength = 11;
        const rotorRadius = 5.5;

        // 4 Aerodynamic Carbon Fiber Drone Arms (X-configuration)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-armLength, -armLength);
        ctx.lineTo(armLength, armLength);
        ctx.moveTo(armLength, -armLength);
        ctx.lineTo(-armLength, armLength);
        ctx.stroke();

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-armLength, -armLength);
        ctx.lineTo(armLength, armLength);
        ctx.moveTo(armLength, -armLength);
        ctx.lineTo(-armLength, armLength);
        ctx.stroke();

        // 4 Brushless Motor Pods & Spinning Propellers
        const motorPositions = [
          [-armLength, -armLength],
          [armLength, -armLength],
          [-armLength, armLength],
          [armLength, armLength],
        ];

        motorPositions.forEach(([mx, my], idx) => {
          // Motor hub
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Spinning Propellers with Motion Blur Ring
          if (drone.healthy && drone.status !== 'PAUSED') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(mx, my, rotorRadius, 0, Math.PI * 2);
            ctx.stroke();

            const angle = rotorAngle * (idx % 2 === 0 ? 1 : -1);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(mx - Math.cos(angle) * rotorRadius, my - Math.sin(angle) * rotorRadius);
            ctx.lineTo(mx + Math.cos(angle) * rotorRadius, my + Math.sin(angle) * rotorRadius);
            ctx.stroke();
          }
        });

        // Navigation Strobes: Red on Port (left), Green on Starboard (right), White rear strobe
        ctx.fillStyle = '#ef4444'; // Red Port LED
        ctx.beginPath();
        ctx.arc(-armLength - 1, -armLength, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22c55e'; // Green Starboard LED
        ctx.beginPath();
        ctx.arc(armLength + 1, -armLength, 2, 0, Math.PI * 2);
        ctx.fill();

        // White rear flashing beacon
        const rearStrobe = Math.sin(time * 0.015) > 0.5 ? 1 : 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${rearStrobe})`;
        ctx.beginPath();
        ctx.arc(0, armLength + 3, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Forward 4K AI Optical Gimbal Camera Pod (pointing forward)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -9, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -10, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Sleek Central Avionics Body
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Drone ID Label Plate (rendered upright, not rotated, for readability)
        ctx.fillStyle = '#0e1624';
        const labelText = drone.drone_id;
        ctx.font = 'bold 10px sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(cx - textWidth / 2 - 4, cy + 14, textWidth + 8, 13);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - textWidth / 2 - 4, cy + 14, textWidth + 8, 13);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cx, cy + 20.5);

        if (!drone.healthy) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('FAIL', cx, cy - 16);
        }
      });

      // 13. Survey Complete Banner directly on Canvas
      if (missionStatus === 'COMPLETE') {
        ctx.fillStyle = 'rgba(14, 22, 36, 0.88)';
        ctx.fillRect(WIDTH / 2 - 180, 20, 360, 48);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.strokeRect(WIDTH / 2 - 180, 20, 360, 48);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AERIAL SURVEY COMPLETED (100%)', WIDTH / 2, 42);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11px sans-serif';
        ctx.fillText('All Calamity Objectives Identified Directly on Image', WIDTH / 2, 58);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [
    drones,
    targets,
    tasks,
    blocked,
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
    missionStatus,
    gridOverlayOpacity,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. Check if an existing target was clicked
    let clickedTargetId: string | null = null;
    for (const target of Object.values(targets)) {
      const tx = target.x * CELL + CELL / 2;
      const ty = target.y * CELL + CELL / 2;
      const dist = Math.hypot(clickX - tx, clickY - ty);
      if (dist <= 22) {
        clickedTargetId = target.target_id;
        break;
      }
    }

    if (clickedTargetId) {
      if (isDeleteMode) {
        onDeleteTarget?.(clickedTargetId);
        setInspectedTargetId(null);
        return;
      }
      setInspectedTargetId((prev) => (prev === clickedTargetId ? null : clickedTargetId));
      return;
    }

    // 2. Check if a drone was clicked
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

    // 3. If in Delete Mode, don't place targets on empty space
    if (isDeleteMode) return;

    // 4. Place precise target at clicked grid cell
    const cellX = Math.floor(clickX / CELL);
    const cellY = Math.floor(clickY / CELL);

    if (cellX >= 0 && cellX < GRID_W && cellY >= 0 && cellY < GRID_H) {
      if (!blocked.has(pointKey([cellX, cellY]))) {
        if (onAddTargetWithType) {
          const conf =
            activeTargetType === 'VEHICLE'
              ? 1.0
              : activeTargetType === 'HUMAN'
              ? 0.98
              : activeTargetType === 'ANIMAL'
              ? 0.97
              : 0.96;
          onAddTargetWithType(cellX, cellY, activeTargetType, conf);
        } else {
          onAddTargetAt(cellX, cellY);
        }
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
      <div className="px-4 py-3 bg-[#182235] border-b border-[#29374d] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Upload / Image Button */}
          <button
            onClick={onOpenUploadModal}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs transition flex items-center gap-1.5 shadow"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{backgroundImageUrl ? 'Change Satellite/Image' : 'Upload Image / Satellite'}</span>
          </button>

          {backgroundImageUrl && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#121a28] border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[150px]">{backgroundImageName}</span>
              <button
                onClick={onClearBackgroundImage}
                className="hover:text-rose-400 ml-1 p-0.5"
                title="Remove Image & Reset Grid"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {!backgroundImageUrl && (
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
                  Standard Facility
                </option>
              </select>
            </div>
          )}

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
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 border ${
              showLidarBeams
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
            title="Toggle 360 LiDAR Point Cloud laser rays"
          >
            <Sparkles className="w-3 h-3" />
            LiDAR
          </button>

          <button
            onClick={() => setShowMeshLinks(!showMeshLinks)}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 border ${
              showMeshLinks
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-[#222c3e] text-slate-400 border-[#334259]'
            }`}
            title="Toggle 802.11s Peer Mesh links"
          >
            <Share2 className="w-3 h-3" />
            Mesh
          </button>

          <button
            onClick={() => setShowPaths(!showPaths)}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 border ${
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
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 border ${
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
            title="Toggle Grid Lines"
          >
            <Layers className="w-3 h-3" />
            Grid
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

      {/* Target Tool Selector Sub-bar */}
      <div className="px-4 py-2 bg-[#141d2b] border-b border-[#243247] flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold flex items-center gap-1 font-mono text-[11px]">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            Click Action:
          </span>

          <button
            onClick={() => {
              setIsDeleteMode(false);
              setActiveTargetType('HUMAN');
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 border text-xs ${
              !isDeleteMode && activeTargetType === 'HUMAN'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow'
                : 'bg-[#1e2838] text-slate-400 border-[#2f3f58] hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Human [Blue]</span>
          </button>

          <button
            onClick={() => {
              setIsDeleteMode(false);
              setActiveTargetType('ANIMAL');
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 border text-xs ${
              !isDeleteMode && activeTargetType === 'ANIMAL'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow'
                : 'bg-[#1e2838] text-slate-400 border-[#2f3f58] hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Animal [Red]</span>
          </button>

          <button
            onClick={() => {
              setIsDeleteMode(false);
              setActiveTargetType('VEHICLE');
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 border text-xs ${
              !isDeleteMode && activeTargetType === 'VEHICLE'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow'
                : 'bg-[#1e2838] text-slate-400 border-[#2f3f58] hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span>Vehicle [Purple]</span>
          </button>

          <button
            onClick={() => {
              setIsDeleteMode(false);
              setActiveTargetType('STRUCTURAL_CRACK');
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 border text-xs ${
              !isDeleteMode && activeTargetType === 'STRUCTURAL_CRACK'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
                : 'bg-[#1e2838] text-slate-400 border-[#2f3f58] hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Damaged Bldg [Yellow]</span>
          </button>

          <button
            onClick={() => setIsDeleteMode(!isDeleteMode)}
            className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 border text-xs ${
              isDeleteMode
                ? 'bg-rose-600 text-white border-rose-400 shadow animate-pulse'
                : 'bg-[#1e2838] text-rose-400 border-[#2f3f58] hover:bg-rose-950/40'
            }`}
            title="Click any target to delete it"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleteMode ? 'Delete Mode Active' : 'Delete Target'}</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {isDeleteMode ? (
            <span className="text-rose-400 font-bold">Click any target to delete</span>
          ) : (
            <span>Click canvas to place {activeTargetType}</span>
          )}
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

          {/* Satellite Background Active Indicator in Green */}
          {backgroundImageUrl && (
            <div className="absolute bottom-2 left-2 pointer-events-none bg-[#0e1624]/90 backdrop-blur border border-emerald-500/50 px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-2 shadow-lg z-20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400 font-semibold">Satellite Background Active</span>
            </div>
          )}

          {/* Inspected Target popup with Delete button */}
          {inspectedTargetId && targets[inspectedTargetId] && (
            <div className="absolute top-2 right-2 bg-[#0e1624]/95 backdrop-blur border border-sky-500/50 px-3 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs z-30 font-mono">
              <div>
                <span className="font-bold text-white">{targets[inspectedTargetId].target_id}: </span>
                <span className="text-sky-300 font-bold">
                  {targets[inspectedTargetId].type} [{Math.round((targets[inspectedTargetId].confidence || 0.98) * 100)}%]
                </span>
                <span className="text-slate-400 ml-1">
                  [{targets[inspectedTargetId].x}, {targets[inspectedTargetId].y}]
                </span>
              </div>
              <button
                onClick={() => {
                  onDeleteTarget?.(inspectedTargetId);
                  setInspectedTargetId(null);
                }}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
              <button
                onClick={() => setInspectedTargetId(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="px-4 py-2 bg-[#182235] border-t border-[#29374d] flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#5aaaff] inline-block border border-white/60"></span>
            <span>Recon Drone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#34d399] inline-block"></span>
            <span>LiDAR Scan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#38bdf8] inline-block border border-white/60"></span>
            <span>Human [Blue]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block"></span>
            <span>Animal [Red]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#c084fc] inline-block"></span>
            <span>Vehicle [Purple]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#eab308] inline-block"></span>
            <span>Damaged Building [Yellow]</span>
          </div>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Mission: <span className="text-emerald-400 font-semibold">{missionStatus}</span>
        </div>
      </div>
    </div>
  );
};
