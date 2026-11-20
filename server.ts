import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Support large image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Google GenAI SDK (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Parse JSON detections even if truncated mid-array
function safeParseDetections(textOutput: string): any[] {
  const cleaned = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed?.detections) ? parsed.detections : [];
  } catch {
    const objects: any[] = [];
    const objRegex = /\{[^{}]*"box_2d"\s*:\s*\[[^\]]+\][^{}]*\}/g;
    const matches = cleaned.match(objRegex);
    if (matches) {
      for (const m of matches) {
        try {
          objects.push(JSON.parse(m));
        } catch {
          // ignore malformed fragment
        }
      }
    }
    return objects;
  }
}

// Helper: Run promise-returning tasks with bounded concurrency and retry on transient/429 errors
async function runWithConcurrencyAndRetry<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number = 4
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: any }>> {
  const results: Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: any }> =
    new Array(tasks.length);
  let nextIdx = 0;

  const execWithRetry = async (fn: () => Promise<T>): Promise<T> => {
    let lastErr: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err || '');
        const isAuthOrConfig =
          msg.includes('API_KEY_INVALID') ||
          msg.includes('API key not valid') ||
          msg.includes('PERMISSION_DENIED');
        if (isAuthOrConfig) throw err;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
        }
      }
    }
    throw lastErr;
  };

  const worker = async () => {
    while (true) {
      const idx = nextIdx++;
      if (idx >= tasks.length) break;
      try {
        const value = await execWithRetry(tasks[idx]);
        results[idx] = { status: 'fulfilled', value };
      } catch (reason) {
        console.warn(`Vision pass #${idx} failed:`, (reason as any)?.message || reason);
        results[idx] = { status: 'rejected', reason };
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Gemini Vision 600-cell SAR Target Detection Endpoint
app.post('/api/gemini/detect-targets', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg', tiles } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.',
      });
    }

    const parseDataUrlOrFetch = async (src: string, fallbackMime = 'image/jpeg') => {
      let data = src;
      let resolvedMime = fallbackMime;
      if (src.startsWith('data:')) {
        const match = src.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          resolvedMime = match[1];
          data = match[2];
        }
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        const imgRes = await fetch(src);
        const arrayBuffer = await imgRes.arrayBuffer();
        data = Buffer.from(arrayBuffer).toString('base64');
        resolvedMime = imgRes.headers.get('content-type') || fallbackMime;
      }
      return { inlineData: { mimeType: resolvedMime, data } };
    };

    const fullImagePart = await parseDataUrlOrFetch(image, mimeType);

    // Lean native grounding schemas (deterministic col/row/cell_id computed server-side from box_2d)
    const allTargetsSchema = {
      type: Type.OBJECT,
      properties: {
        detections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              box_2d: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: 'Tight bounding box [ymin, xmin, ymax, xmax] normalized 0 to 1000',
              },
              type: {
                type: Type.STRING,
                enum: ['human', 'vehicle', 'boat', 'animal'],
                description: 'Target class: human, vehicle, boat, or animal',
              },
              sub_type: {
                type: Type.STRING,
                description:
                  'Specific category e.g. car, suv, sedan, van, pickup_truck, box_truck, submerged_car, rescue_boat, rooftop_survivor, water_person, livestock',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence score from 0.45 to 1.0',
              },
              description: {
                type: Type.STRING,
                description: 'Short visual cue (3-8 words)',
              },
            },
            required: ['box_2d', 'type', 'sub_type', 'confidence', 'description'],
          },
        },
      },
      required: ['detections'],
    };

    const vehicleOnlySchema = {
      type: Type.OBJECT,
      properties: {
        detections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              box_2d: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: 'Tight bounding box [ymin, xmin, ymax, xmax] normalized 0 to 1000',
              },
              type: {
                type: Type.STRING,
                enum: ['vehicle', 'boat'],
                description:
                  'Use "boat" for boats/rafts/dinghies and "vehicle" for all cars/trucks/vans/SUVs/buses',
              },
              sub_type: {
                type: Type.STRING,
                description:
                  'Vehicle type: car, sedan, suv, pickup_truck, van, box_truck, bus, submerged_car, submerged_truck, or boat',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence score from 0.45 to 1.0',
              },
              description: {
                type: Type.STRING,
                description: 'Short visual cue e.g. white sedan on road or half-submerged black car',
              },
            },
            required: ['box_2d', 'type', 'sub_type', 'confidence', 'description'],
          },
        },
      },
      required: ['detections'],
    };

    const livingOnlySchema = {
      type: Type.OBJECT,
      properties: {
        detections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              box_2d: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: 'Tight bounding box [ymin, xmin, ymax, xmax] normalized 0 to 1000',
              },
              type: {
                type: Type.STRING,
                enum: ['human', 'animal'],
                description: 'Target class: human or animal',
              },
              sub_type: {
                type: Type.STRING,
                description:
                  'rooftop_survivor, water_person, pedestrian, rescuer, livestock, dog, horse, or other',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence score from 0.50 to 1.0',
              },
              description: {
                type: Type.STRING,
                description: 'Short visual cue (3-8 words)',
              },
            },
            required: ['box_2d', 'type', 'sub_type', 'confidence', 'description'],
          },
        },
      },
      required: ['detections'],
    };

    const fullAllPrompt = `Detect ALL humans, vehicles (cars, SUVs, vans, trucks, buses), boats, and animals in this aerial image.
Scan top-to-bottom and left-to-right across every road, flooded street, intersection, driveway, yard, parking area, grassy island, water channel, and rooftop:
- Output ONE separate bounding box [ymin, xmin, ymax, xmax] (0 to 1000) for EVERY individual vehicle — both completely visible dry/parked vehicles AND half-submerged/partially underwater vehicles.
- Output ONE separate bounding box for EVERY individual human (never group multiple people on a roof into a single box).
- Output ONE separate bounding box for EVERY boat/raft and visible animal/livestock.
Never confuse a whole house/building roof with a vehicle.`;

    const buildVehicleOnlyPrompt = (regionScope?: string) =>
      `Detect EVERY SINGLE vehicle and watercraft in ${
        regionScope ? `this zoomed ${regionScope} aerial crop` : 'this aerial image'
      } with 100% recall — DO NOT MISS A SINGLE OBVIOUS OR HALF-SUBMERGED CAR!

Systematic street-by-street & yard-by-yard sweep (scan from top edge y=0 down to bottom edge y=1000, left to right):
1. Clearly visible cars, sedans, SUVs, hatchbacks, vans, pickup trucks, delivery/box trucks, buses on roads, intersections, shoulders, driveways, yards, and parking lots.
2. Half-submerged & heavily flooded cars/trucks in murky brown water — including vehicles where only the roof, windshield glare, hood, trunk, or truck bed breaks the surface, plus dark cars in shadow next to buildings or trees.
3. Boats, inflatable rescue craft, dinghies, and rafts (use type: "boat").
4. Output a SEPARATE tight box_2d [ymin, xmin, ymax, xmax] (normalized 0 to 1000) for EVERY individual vehicle (never merge queued/parked cars into one box, and never stop early after finding only a few!).
5. Exclude building roofs, sheds, air-conditioning units, and debris planks.`;

    const buildLivingOnlyPrompt = (regionScope: string) =>
      `Detect EVERY human and animal in this zoomed ${regionScope} aerial crop with 100% recall.
- Inspect EVERY rooftop (pitched roofs, flat roofs, balconies, porches, near SOS signs or colorful clothing/towels), every flooded street, and open water for stranded people. Output ONE separate box_2d [ymin, xmin, ymax, xmax] (0 to 1000) per distinct person—do NOT merge a group into one box.
- Inspect grassy banks, ridges, yards, and shallow water for cattle, livestock, horses, dogs, or other animals.`;

    const runVisionPass = async (
      part: { inlineData: { mimeType: string; data: string } },
      promptText: string,
      systemInstruction: string,
      schema: any,
      sourcePass: string,
      bounds: [number, number, number, number],
      isTile: boolean,
      thinkingLevel: ThinkingLevel
    ) => {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [part, { text: promptText }],
        },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel },
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const rawDetections = safeParseDetections(response.text || '{}');
      return rawDetections.map((d: any) => ({
        raw: d,
        sourcePass,
        bounds,
        isTile,
      }));
    };

    const passFactories: Array<() => Promise<any[]>> = [
      () =>
        runVisionPass(
          fullImagePart,
          buildVehicleOnlyPrompt(),
          'You are an exhaustive Aerial Vehicle & Watercraft Object Detector. Your sole mission is to output tight box_2d coordinates for EVERY car, SUV, van, pickup, truck, bus, submerged car, and boat in the image without missing a single clearly visible vehicle.',
          vehicleOnlySchema,
          'full_vehicle',
          [0, 0, 1000, 1000],
          false,
          ThinkingLevel.MEDIUM
        ),
      () =>
        runVisionPass(
          fullImagePart,
          fullAllPrompt,
          'You are a high-recall Disaster & Aerial Reconnaissance Object Detector. Detect every visible human, vehicle, boat, and animal with tight box_2d coordinates [ymin, xmin, ymax, xmax].',
          allTargetsSchema,
          'full_all',
          [0, 0, 1000, 1000],
          false,
          ThinkingLevel.LOW
        ),
    ];

    // Scan overlapping zoomed quadrants with dedicated Vehicle-Only + Living-Only passes
    if (Array.isArray(tiles) && tiles.length > 0) {
      const tileNames = ['Top-Left', 'Top-Right', 'Bottom-Left', 'Bottom-Right'];
      const validTiles = tiles.slice(0, 4);
      for (let tIdx = 0; tIdx < validTiles.length; tIdx++) {
        const tile = validTiles[tIdx];
        if (!tile?.dataUrl || !Array.isArray(tile.bounds) || tile.bounds.length !== 4) continue;
        const tilePart = await parseDataUrlOrFetch(tile.dataUrl, 'image/jpeg');
        const bounds = tile.bounds as [number, number, number, number];
        const scope = tileNames[tIdx] || `Quadrant ${tIdx + 1}`;

        // Dedicated Vehicle-Only zoomed pass (prevents humans from crowding out clearly visible cars)
        passFactories.push(() =>
          runVisionPass(
            tilePart,
            buildVehicleOnlyPrompt(scope),
            'You are a high-precision zoomed Vehicle & Boat Object Detector. Locate every clearly visible car, truck, van, SUV, half-submerged car, and boat inside this crop.',
            vehicleOnlySchema,
            `tile_vehicle_${tIdx}`,
            bounds,
            true,
            ThinkingLevel.LOW
          )
        );

        // Dedicated Living-Targets zoomed pass (humans & animals)
        passFactories.push(() =>
          runVisionPass(
            tilePart,
            buildLivingOnlyPrompt(scope),
            'You are a high-precision zoomed Survivor & Livestock Object Detector. Locate every individual person and animal inside this crop.',
            livingOnlySchema,
            `tile_living_${tIdx}`,
            bounds,
            true,
            ThinkingLevel.LOW
          )
        );
      }
    }

    const settled = await runWithConcurrencyAndRetry(passFactories, 4);
    const fulfilled = settled.filter(
      (r): r is { status: 'fulfilled'; value: any[] } => r.status === 'fulfilled'
    );
    const rejected = settled.filter(
      (r): r is { status: 'rejected'; reason: any } => r.status === 'rejected'
    );

    if (fulfilled.length === 0 && rejected.length > 0) {
      throw rejected[0].reason;
    }

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    interface MappedDetection {
      id: string;
      type: string;
      sub_type: string;
      box_2d: [number, number, number, number];
      col: number;
      row: number;
      cell_id: number;
      confidence: number;
      description: string;
      sourcePass: string;
      isTile: boolean;
    }

    const allMapped: MappedDetection[] = [];

    for (const resPass of fulfilled) {
      for (const item of resPass.value) {
        const { raw: d, sourcePass, bounds, isTile } = item;
        const [qYmin, qXmin, qYmax, qXmax] = bounds;
        const qH = qYmax - qYmin;
        const qW = qXmax - qXmin;

        if (!Array.isArray(d.box_2d) || d.box_2d.length !== 4) continue;
        const [lymin, lxmin, lymax, lxmax] = d.box_2d.map((n: any) =>
          clamp(Number(n) || 0, 0, 1000)
        );
        const ymin = clamp(Math.round(qYmin + (Math.min(lymin, lymax) / 1000) * qH), 0, 1000);
        const xmin = clamp(Math.round(qXmin + (Math.min(lxmin, lxmax) / 1000) * qW), 0, 1000);
        const ymax = clamp(Math.round(qYmin + (Math.max(lymin, lymax) / 1000) * qH), 0, 1000);
        const xmax = clamp(Math.round(qXmin + (Math.max(lxmin, lxmax) / 1000) * qW), 0, 1000);
        const normalizedBox: [number, number, number, number] = [ymin, xmin, ymax, xmax];

        const boxW = xmax - xmin;
        const boxH = ymax - ymin;
        if (boxW < 3 || boxH < 3 || boxW > 350 || boxH > 350) continue;

        const cx = (xmin + xmax) / 2;
        const cy = (ymin + ymax) / 2;
        const col = clamp(Math.floor((cx / 1000) * 30), 0, 29);
        const row = clamp(Math.floor((cy / 1000) * 20), 0, 19);
        const cell_id = row * 30 + col;

        const rawTypeStr = String(d.type || '').toLowerCase().trim();
        const rawSubStr = String(d.sub_type || '').toLowerCase().trim();

        let normalizedType = 'human';
        if (
          rawTypeStr.includes('boat') ||
          rawTypeStr.includes('raft') ||
          rawTypeStr.includes('dinghy') ||
          rawTypeStr.includes('watercraft') ||
          rawSubStr.includes('boat') ||
          rawSubStr.includes('raft') ||
          rawSubStr.includes('dinghy')
        ) {
          normalizedType = 'boat';
        } else if (
          rawTypeStr.includes('vehicle') ||
          rawTypeStr.includes('car') ||
          rawTypeStr.includes('truck') ||
          rawTypeStr.includes('van') ||
          rawTypeStr.includes('suv') ||
          rawTypeStr.includes('bus') ||
          rawTypeStr.includes('sedan') ||
          rawTypeStr.includes('pickup') ||
          rawTypeStr.includes('auto') ||
          rawTypeStr.includes('taxi') ||
          rawTypeStr.includes('ambulance') ||
          rawTypeStr.includes('tractor') ||
          sourcePass.includes('vehicle')
        ) {
          normalizedType = 'vehicle';
        } else if (
          rawTypeStr.includes('animal') ||
          rawTypeStr.includes('livestock') ||
          rawTypeStr.includes('cattle') ||
          rawTypeStr.includes('cow') ||
          rawTypeStr.includes('dog') ||
          rawTypeStr.includes('horse') ||
          rawTypeStr.includes('sheep')
        ) {
          normalizedType = 'animal';
        }

        if (sourcePass.includes('living') && normalizedType !== 'human' && normalizedType !== 'animal') {
          continue;
        }

        allMapped.push({
          id: '',
          type: normalizedType,
          sub_type: String(d.sub_type || normalizedType),
          box_2d: normalizedBox,
          col,
          row,
          cell_id,
          confidence:
            typeof d.confidence === 'number' ? clamp(d.confidence, 0.45, 1.0) : 0.88,
          description: String(d.description || ''),
          sourcePass,
          isTile,
        });
      }
    }

    // Cross-pass Class-Aware NMS Deduplication:
    // Merges duplicate detections of the same physical object across DIFFERENT passes/tiles,
    // while NEVER merging distinct targets found within the SAME pass!
    const computeIoU = (
      a: [number, number, number, number],
      b: [number, number, number, number]
    ) => {
      const iy1 = Math.max(a[0], b[0]);
      const ix1 = Math.max(a[1], b[1]);
      const iy2 = Math.min(a[2], b[2]);
      const ix2 = Math.min(a[3], b[3]);
      const inter = Math.max(0, iy2 - iy1) * Math.max(0, ix2 - ix1);
      if (inter <= 0) return 0;
      const areaA = Math.max(1, a[2] - a[0]) * Math.max(1, a[3] - a[1]);
      const areaB = Math.max(1, b[2] - b[0]) * Math.max(1, b[3] - b[1]);
      return inter / (areaA + areaB - inter);
    };

    allMapped.sort((a, b) => {
      if (a.isTile !== b.isTile) return a.isTile ? -1 : 1;
      return b.confidence - a.confidence;
    });

    const isVehicleGroup = (t: string) => t === 'vehicle' || t === 'boat';

    const merged: MappedDetection[] = [];
    for (const cand of allMapped) {
      const cCx = (cand.box_2d[1] + cand.box_2d[3]) / 2;
      const cCy = (cand.box_2d[0] + cand.box_2d[2]) / 2;

      const isDuplicate = merged.some((kept) => {
        if (kept.sourcePass === cand.sourcePass) return false;
        const sameGroup =
          kept.type === cand.type || (isVehicleGroup(kept.type) && isVehicleGroup(cand.type));
        if (!sameGroup) return false;
        const iou = computeIoU(kept.box_2d, cand.box_2d);
        if (iou >= 0.3) return true;
        const kCx = (kept.box_2d[1] + kept.box_2d[3]) / 2;
        const kCy = (kept.box_2d[0] + kept.box_2d[2]) / 2;
        const centerDist = Math.hypot(cCx - kCx, cCy - kCy);
        return centerDist <= 18;
      });

      if (!isDuplicate) {
        merged.push(cand);
      }
    }

    const finalDetections = merged.map(({ sourcePass: _sp, isTile: _it, ...rest }, idx) => ({
      ...rest,
      id: `det_${idx + 1}`,
    }));

    return res.json({
      grid_dimensions: { cols: 30, rows: 20, total_cells: 600 },
      detections: finalDetections,
      passesCompleted: fulfilled.length,
      passesFailed: rejected.length,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/detect-targets:', error);
    return res.status(500).json({
      error: error.message || 'Failed to detect targets with Gemini Vision API',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
