import React from 'react';
import { Drone, MovingObstacle, Task } from '../types';
import {
  Share2,
  Navigation,
  Radio,
  RefreshCw,
  Compass,
  ShieldCheck,
} from 'lucide-react';

interface SwarmMeshDwaViewProps {
  drones: Record<string, Drone>;
  tasks: Task[];
  movingObstacles: MovingObstacle[];
  onToggleDwaObstacles: () => void;
  movingObstaclesEnabled: boolean;
}

export const SwarmMeshDwaView: React.FC<SwarmMeshDwaViewProps> = ({
  drones,
  tasks,
  movingObstacles,
  onToggleDwaObstacles,
  movingObstaclesEnabled,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-mono text-[11px] font-bold border border-red-500/40">
              SWARM ROBOTICS & DYNAMIC PLANNING
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 font-mono">Distributed Cave Mapping & Mesh Networking</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-red-500" />
            Coordinated AI Fleet, Mesh Relays & Dynamic Window Avoidance (DWA)
          </h2>
        </div>

        <button
          onClick={onToggleDwaObstacles}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 border ${
            movingObstaclesEnabled
              ? 'bg-red-600/20 text-red-300 border-red-500/60 hover:bg-red-600/30 shadow-md shadow-red-950/40'
              : 'bg-[#12131a] text-zinc-300 border-zinc-800 hover:bg-[#1a1b24] hover:border-red-500/40'
          }`}
        >
          <Navigation className="w-4 h-4 text-red-400" />
          <span>
            {movingObstaclesEnabled
              ? 'DWA Moving Obstacles Active (Click to Disable)'
              : 'Inject Moving Obstacles (Test DWA)'}
          </span>
        </button>
      </div>

      {/* Swarm Robotics Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Distributed Mapping */}
        <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase">DISTRIBUTED MAPPING</span>
            <span className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded font-mono text-[10px] border border-red-500/30">
              5 DRONES
            </span>
          </div>
          <div className="text-lg font-bold text-white">Simultaneous Cavern Mapping</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            All 5 drones concurrently explore the dark subterranean environment, fusing their local 3D voxel occupancy observations into a unified master map without centralized bottleneck.
          </p>
          <div className="pt-2 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {tasks.filter((t) => t.status === 'DONE').length}/{tasks.length} Zones Fully Mapped & Synchronized
            </span>
          </div>
        </div>

        {/* Mesh Networks */}
        <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase">PEER-TO-PEER MESH</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">Ad-Hoc Wireless Relays</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            If a drone loses direct line-of-sight to the Ground Station base in deep tunnels, peer drones dynamically act as wireless relay hops to forward telemetry and video.
          </p>
          <div className="pt-2 text-[11px] font-mono text-red-400 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            <span>Multi-hop mesh packets routing (802.11s)</span>
          </div>
        </div>

        {/* Federated Learning */}
        <div className="bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase">FEDERATED LEARNING</span>
            <RefreshCw className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-lg font-bold text-white">Decentralized Model Evolution</div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Target feature models improve across the entire swarm. Drones aggregate local gradient updates over peer mesh links without transmitting raw video feeds.
          </p>
          <div className="pt-2 text-[11px] font-mono text-red-400 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Edge Model Aggregation: Sync Round #14</span>
          </div>
        </div>
      </div>

      {/* Dynamic Path Planning (Global A* + Local DWA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-5 shadow-md space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2 text-base">
            <Compass className="w-4 h-4 text-red-500" />
            Dynamic Path Planning: Global A* & Local DWA Collision Dodging
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#06070a] border border-zinc-800 rounded-lg">
              <span className="font-semibold text-red-400 block mb-1">
                Global Planning (A* / Dijkstra Algorithm):
              </span>
              <p className="text-zinc-300 text-[11px]">
                Calculates the most mathematically optimal route between start coordinate and target cell based on known static map geometry and discovered cavern voxel walls.
              </p>
            </div>

            <div className="p-3 bg-[#06070a] border border-zinc-800 rounded-lg">
              <span className="font-semibold text-amber-400 block mb-1">
                Local Avoidance (Dynamic Window Approach - DWA):
              </span>
              <p className="text-zinc-300 text-[11px]">
                Instantly calculates feasible velocity pairs `(v, ω)` within vehicle acceleration limits to dodge sudden moving obstacles, falling debris, or unexpected hazards in real-time without stopping.
              </p>

              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Active Moving Obstacles in Field:</span>
                <span className="text-amber-400 font-bold">{movingObstacles.length} entities</span>
              </div>
            </div>

            <div className="p-3 bg-[#06070a] border border-zinc-800 rounded-lg">
              <span className="font-semibold text-emerald-400 block mb-1">
                Reinforcement Learning (RL Acrobatic Recovery):
              </span>
              <p className="text-zinc-300 text-[11px]">
                Trained in physics simulators for aggressive obstacle evasion maneuvers, gust recovery, and acrobatic pitch compensation when navigating tight tunnel fissures.
              </p>
            </div>
          </div>
        </div>

        {/* Mesh Network Live Topography Table */}
        <div className="lg:col-span-5 bg-[#0b0c10] border border-zinc-800/90 rounded-xl p-5 shadow-md space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2 text-base">
            <Radio className="w-4 h-4 text-red-500" />
            Swarm Mesh Network Topology (802.11s)
          </h3>

          <div className="space-y-2.5">
            {Object.values(drones).map((d) => (
              <div
                key={d.drone_id}
                className="p-3 bg-[#06070a] border border-zinc-800 rounded-lg text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        d.healthy ? 'bg-emerald-400' : 'bg-red-500'
                      }`}
                    />
                    {d.drone_id}
                    {d.isMeshRelay && (
                      <span className="text-[9px] bg-red-600/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/40">
                        RELAY
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-400">
                    Hops to GCS: <strong className="text-red-400">{d.hopsToGcs}</strong>
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Mesh Peers in Range:</span>
                  <span className="font-mono text-zinc-200">
                    {d.meshPeers.length > 0
                      ? d.meshPeers.map((p) => `${p.peerId} (${p.rssiDbm}dBm)`).join(', ')
                      : 'Base Direct'}
                  </span>
                </div>

                <div className="text-[10px] text-zinc-500 flex justify-between font-mono pt-1 border-t border-zinc-800">
                  <span>Link Bandwidth: 54 Mbps</span>
                  <span>Latency: ~4ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
