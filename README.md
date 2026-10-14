# CMRIT Drone Swarm Command Center

An autonomous search & rescue drone swarm ground control station (GCS) and real-time 2D simulation built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Decentralized Swarm Coordination**:
  - Lawnmower (boustrophedon) area partitioning across 5 zones (`Z1`–`Z5`).
  - Greedy task allocation incorporating proximity, remaining battery penalty, and historical coverage.
  - Failover re-allocation: If a drone fails (e.g. `FAIL_D2`), its pending task queue is dynamically redistributed to other active drones.
  - Proximity collision arbitration when drones approach within collision threshold.
  - A* pathfinding around fixed obstacles.
  - Proximity target detection and confidence evaluation.
  - Low-battery return-to-base protocols.

- **Dual-Mode Interactive Ground Control Station**:
  - **Live Tactical Canvas**: 30×20 grid (960×640px) matching original Pygame simulation with real-time animated rotors, radar blip cones, flight paths, obstacles, and base markers. Click any cell to deploy a rescue target or inspect drones.
  - **Telemetry Dashboard**: Replicating and enhancing the Streamlit mission control dashboard with real-time coverage meters, mission clock, battery levels, event logs, and command monitors.
  - **Dual GCS View**: Unified simultaneous side-by-side operations screen.

## Controls & Keyboard Shortcuts

- `S`: Launch / Start Mission
- `P`: Pause / Resume Swarm
- `R`: Reset Simulation
- `F`: Fail Drone D2 (Test dynamic task re-assignment)
- `T`: Deploy High-Priority Rescue Target

## Development

```bash
npm install
npm run dev
```

Server runs on `http://0.0.0.0:3000`.
