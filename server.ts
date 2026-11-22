import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

if (fs.existsSync('.env') && typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile('.env');
  } catch {
    // Ignore optional .env load failure
  }
}

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

function parseSafeBase64Image(
  imageDataUrl: unknown
): { inlineData: { mimeType: string; data: string } } | null {
  if (typeof imageDataUrl !== 'string') return null;
  const trimmed = imageDataUrl.trim();
  const match = trimmed.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) return null;
  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const data = match[2].replace(/[\r\n]/g, '');
  if (data.length > 20 * 1024 * 1024) return null;
  return { inlineData: { mimeType, data } };
}

function classifyGeminiError(error: any): { status: number; message: string } {
  const rawMsg = String(error?.message || error || 'Gemini API request failed');
  if (
    rawMsg.includes('API_KEY_INVALID') ||
    rawMsg.includes('API key not valid') ||
    rawMsg.includes('PERMISSION_DENIED') ||
    rawMsg.includes('403')
  ) {
    return {
      status: 403,
      message:
        'Gemini API authorization failed. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached (429). Retry shortly or check quota/billing in Settings > Secrets.',
    };
  }
  if (rawMsg.includes('NOT_FOUND') || rawMsg.includes('404')) {
    return {
      status: 404,
      message: 'Requested Gemini model endpoint was not found. Please try again.',
    };
  }
  return { status: 500, message: rawMsg };
}

// Post-Scan Structured AI Mission Analysis Endpoint
app.post('/api/gemini/mission-analysis', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.',
      });
    }

    const { imageDataUrl, telemetrySnapshot } = req.body ?? {};
    if (!telemetrySnapshot || typeof telemetrySnapshot !== 'object') {
      return res.status(400).json({ error: 'telemetrySnapshot payload is required.' });
    }

    const imagePart = parseSafeBase64Image(imageDataUrl);

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        executiveSummary: {
          type: Type.STRING,
          description: 'Concise 3-4 sentence executive mission briefing summarizing scene damage, survivor locations, and swarm performance.',
        },
        severityRating: {
          type: Type.STRING,
          enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'],
        },
        operationalVerdict: {
          type: Type.STRING,
          description: 'Short 1-sentence tactical readiness headline.',
        },
        keyFindings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '4 to 6 specific empirical insights grounded strictly in the observed targets and visual frame.',
        },
        zoneAssessments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              zoneId: { type: Type.STRING },
              droneId: { type: Type.STRING },
              coveragePercent: { type: Type.NUMBER },
              targetsDetected: { type: Type.INTEGER },
              statusNote: { type: Type.STRING },
              riskLevel: {
                type: Type.STRING,
                enum: ['CRITICAL', 'HIGH', 'MODERATE', 'CLEAR'],
              },
            },
            required: ['zoneId', 'droneId', 'coveragePercent', 'targetsDetected', 'statusNote', 'riskLevel'],
          },
        },
        prioritizedExtractions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rank: { type: Type.INTEGER },
              targetId: { type: Type.STRING },
              targetType: { type: Type.STRING },
              coordinates: { type: Type.STRING },
              rationale: { type: Type.STRING },
              recommendedAsset: { type: Type.STRING },
            },
            required: ['rank', 'targetId', 'targetType', 'coordinates', 'rationale', 'recommendedAsset'],
          },
          description: 'Top 5-8 highest-priority targets ordered for immediate rescue/response.',
        },
        dispatchRecommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '4 concrete actionable field commands for rescue boats, K9/SAR teams, engineering, and air support.',
        },
        swarmPerformanceAudit: {
          type: Type.OBJECT,
          properties: {
            resilienceNote: { type: Type.STRING },
            batteryAndRangeNote: { type: Type.STRING },
            sensorFusionNote: { type: Type.STRING },
          },
          required: ['resilienceNote', 'batteryAndRangeNote', 'sensorFusionNote'],
        },
      },
      required: [
        'executiveSummary',
        'severityRating',
        'operationalVerdict',
        'keyFindings',
        'zoneAssessments',
        'prioritizedExtractions',
        'dispatchRecommendations',
        'swarmPerformanceAudit',
      ],
    };

    const telemetryText = JSON.stringify(telemetrySnapshot, null, 2).slice(0, 48000);
    const parts: any[] = [];
    if (imagePart) parts.push(imagePart);
    parts.push({
      text: `Perform a comprehensive post-scan Search & Rescue + Swarm Telemetry AI Analysis based strictly on this completed mission telemetry and aerial imagery.

TELEMETRY SNAPSHOT:
${telemetryText}

Requirements:
- Cross-reference every zone Z1..Z5 (cols 0-5, 6-11, 12-17, 18-23, 24-29) and exact detected targets (humans, animals, vehicles, broken infrastructure/dam, structural cracks) with GPS & grid coordinates.
- If any drone failed and surviving drones compensated across zones, explicitly evaluate that failover resilience.
- Rank top priority targets (survivors & critical infrastructure hazards first) with concrete rescue assets (swift-water raft, helicopter hoist, structural USAR team, HazMat/engineering).
- Stay strictly factual to the provided telemetry and visual frame.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'You are a Principal Autonomous Drone Swarm Tactical Commander and Search-and-Rescue Intelligence Analyst. Produce razor-sharp, evidence-grounded post-scan reports without filler or fabricated numbers.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
      },
    });

    const rawText = (response.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText);

    return res.json({
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: 'gemini-4-hydrogen',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/mission-analysis:', error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({ error: classified.message });
  }
});

// Sophisticated Streaming Swarm AI Intelligence Endpoint
app.post('/api/gemini/swarm-chat', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.',
      });
    }

    const {
      message,
      history = [],
      telemetrySnapshot,
      imageDataUrl,
      attachedImages = [],
      reasoningLevel = 'HIGH',
    } = req.body ?? {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A non-empty message prompt is required.' });
    }

    const resolvedThinking =
      reasoningLevel === 'LOW'
        ? ThinkingLevel.LOW
        : reasoningLevel === 'MEDIUM'
        ? ThinkingLevel.MEDIUM
        : ThinkingLevel.HIGH;

    const telemetryJson = telemetrySnapshot
      ? JSON.stringify(telemetrySnapshot, null, 2).slice(0, 48000)
      : '{}';

    const systemInstruction = `You are "Swarm AI" — an ultra-advanced Autonomous Reconnaissance Drone Swarm Architect, Tactical SAR Commander, and Embedded Robotics Engineer integrated inside the Autonomous Recon Swarm GCS.

ARCHITECTURE FACTS OF THIS SWARM PLATFORM:
- Fleet: 5 Autonomous Amphibious Recon Drones (D1–D5) operating over a 30×20 discrete tactical grid (600 cells, 32px/cell = 960×640px).
- Nominal Zones: Z1 (cols 0–5, D1), Z2 (cols 6–11, D2), Z3 (cols 12–17, D3 bridge relay), Z4 (cols 18–23, D4), Z5 (cols 24–29, D5).
- Resilience & Failover: When all 5 are healthy, drones stay strictly in their own 6-column corridors. When any drone fails, surviving drones immediately absorb its unvisited zone cells proportionally across nearest neighbors via serpentine sweeps without waiting for home zones to finish.
- Edge Compute & Sensors: NVIDIA Jetson Orin NX (16GB), 68%-pruned YOLOv8 TensorRT (~4.8 MB, >30 FPS), 360° LiDAR (36 beams), EKF fusion of RGB Optical + LiDAR + IMU scan matching.
- Mesh & Amphibious Hydro Suite: 802.11s peer mesh routing (D3 relay), Turtle Mode (reversing diagonal M1/M3 motors on water inversion), Automated Rotor-Cut, Motorized Winch, Acoustic ToF bathymetry Depth = (v * t) / 2 (v ≈ 1482 m/s), RTK-GNSS sonar timestamping.

CURRENT LIVE TELEMETRY & MISSION CONTEXT:
${telemetryJson}

RESPONSE RULES:
1. Ground every metric, drone status, coordinate, GPS location, battery %, and target ID strictly in the live telemetry snapshot (and any visual frames or uploaded images attached).
2. Answer whatever the user asks cleanly, clearly, and thoroughly — from tactical rescue triage & dispatch to pathfinding math, avionics/SLAM diagnostics, mesh networking, hydro-bathymetry, or visual analysis of uploaded photos.
3. Use clean Markdown formatting (headings, lists, compact tables, formulas) when helpful, without inventing fake sensor readings.`;

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-12)
          .filter(
            (m: any) =>
              m &&
              (m.role === 'user' || m.role === 'model') &&
              typeof m.text === 'string' &&
              m.text.trim().length > 0
          )
          .map((m: any) => ({
            role: m.role as 'user' | 'model',
            parts: [{ text: m.text.slice(0, 8000) }],
          }))
      : [];

    const userParts: any[] = [];
    const visualFramePart = parseSafeBase64Image(imageDataUrl);
    if (visualFramePart) userParts.push(visualFramePart);

    if (Array.isArray(attachedImages)) {
      for (const rawImg of attachedImages.slice(0, 4)) {
        const parsedImg = parseSafeBase64Image(rawImg);
        if (parsedImg) userParts.push(parsedImg);
      }
    }

    userParts.push({ text: message.trim().slice(0, 12000) });

    const contents = [
      ...safeHistory,
      {
        role: 'user' as const,
        parts: userParts,
      },
    ];

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const stream = await ai.models.generateContentStream({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: resolvedThinking,
        },
      },
    });

    for await (const chunk of stream) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return res.end();
  } catch (error: any) {
    console.error('Error in /api/gemini/swarm-chat:', error);
    const classified = classifyGeminiError(error);
    if (!res.headersSent) {
      return res.status(classified.status).json({ error: classified.message });
    }
    res.write(`data: ${JSON.stringify({ error: classified.message })}\n\n`);
    return res.end();
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
    console.log("Server listening on http://localhost:3000");
  });
}

startServer();
