import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

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

// Gemini Vision 600-cell SAR Target Detection Endpoint
app.post('/api/gemini/detect-targets', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.',
      });
    }

    // Extract base64 and mimeType
    let base64Data = image;
    let resolvedMimeType = mimeType;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        resolvedMimeType = match[1];
        base64Data = match[2];
      }
    } else if (image.startsWith('http://') || image.startsWith('https://')) {
      // Fetch image from URL
      const imgRes = await fetch(image);
      const arrayBuffer = await imgRes.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
      resolvedMimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    }

    const imagePart = {
      inlineData: {
        mimeType: resolvedMimeType,
        data: base64Data,
      },
    };

    const promptText = `You are an elite autonomous aerial drone search-and-rescue (SAR) computer vision engine.

The reconnaissance image covers a disaster zone partitioned into a discrete 600-cell coordinate grid:
- Grid dimensions: exactly 30 columns wide (X / col: 0 to 29) by 20 rows high (Y / row: 0 to 19).
- Total cells = 600.
- Cell index formula: cell_id = (row * 30) + col (range: 0 to 599).

SYSTEMATIC MULTI-SECTOR HIGH-RECALL SCAN INSTRUCTIONS:
Execute an exhaustive, high-recall visual scan across all four quadrants:
1. Quadrant 1 (North-West: cols 0-14, rows 0-9)
2. Quadrant 2 (North-East: cols 15-29, rows 0-9)
3. Quadrant 3 (South-West: cols 0-14, rows 10-19)
4. Quadrant 4 (South-East: cols 15-29, rows 10-19)

In each quadrant, carefully examine and pinpoint every target belonging to these categories:
1. "human":
   - Rooftop survivors: people on building roofs, apexes, terraces, chimneys, fire escapes, and balconies (including people waving orange tarps, cloths, or distress signals).
   - Water / drowning victims: individuals in floodwaters, canals, rivers, swirling torrents, or clinging to debris, trees, lampposts, or submerged structures.
   - Ground evacuees: stranded citizens trapped on porches, isolated mounds, or road edges surrounded by floodwater or rubble.
2. "vehicle":
   - Partially submerged, floating, overturned, or angled cars, SUVs, pickup trucks, delivery vans, box trucks, and commuter buses in flooded streets, intersections, and driveways.
3. "boat":
   - Swift-water rescue craft, dinghies, inflatable rafts, zodiacs, or civilian flood boats.
4. "animal":
   - Stranded domestic pets or farm livestock isolated on high ground, roofs, or porches.
5. "damaged_building":
   - Severely damaged structures, collapsed roofs, breached levees, cracked bridges, and impassable rubble piles.

ACCURACY & GRID MAPPING RULES:
- High recall is critical: do NOT miss small or distant individuals on roofs or in murky floodwaters, nor partially visible vehicle roofs/hoods poking through water.
- Determine the visual center of each detected entity and map to:
  * "col": Horizontal column index (0 to 29)
  * "row": Vertical row index (0 to 19)
  * "cell_id": (row * 30) + col (0 to 599)
- If a cluster exists (e.g. multiple survivors on a roof or adjacent flooded cars), output each entity with its respective cell coordinates.
- Output ONLY valid JSON according to the schema without conversational markdown or text outside JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [imagePart, { text: promptText }],
      },
      config: {
        systemInstruction:
          'You are an expert autonomous search-and-rescue aerial drone sensor payload processor with high-precision computer vision. Always return valid structured JSON mapping visual targets to the 30x20 (600-cell) discrete coordinate grid with high recall for rooftop survivors, drowning victims, submerged vehicles, and disaster targets.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid_dimensions: {
              type: Type.OBJECT,
              properties: {
                cols: { type: Type.INTEGER },
                rows: { type: Type.INTEGER },
                total_cells: { type: Type.INTEGER },
              },
              required: ['cols', 'rows', 'total_cells'],
            },
            detections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: {
                    type: Type.STRING,
                    description: 'Target class: "human", "vehicle", "boat", "animal", or "damaged_building"',
                  },
                  sub_type: {
                    type: Type.STRING,
                    description: 'Detailed category: "rooftop_human", "drowning_human", "balcony_human", "submerged_vehicle", "stranded_vehicle", "rescue_boat", "animal", "damaged_building"',
                  },
                  description: {
                    type: Type.STRING,
                    description: 'Brief tactical observation note of target location and condition',
                  },
                  col: {
                    type: Type.INTEGER,
                    description: 'Horizontal column index (0 to 29)',
                  },
                  row: {
                    type: Type.INTEGER,
                    description: 'Vertical row index (0 to 19)',
                  },
                  cell_id: {
                    type: Type.INTEGER,
                    description: 'Discrete cell index (row * 30 + col) from 0 to 599',
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: 'Confidence score between 0.0 and 1.0',
                  },
                },
                required: ['label', 'col', 'row', 'cell_id', 'confidence'],
              },
            },
          },
          required: ['grid_dimensions', 'detections'],
        },
      },
    });

    const textOutput = response.text || '{}';
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(textOutput);
    } catch {
      // Fallback clean markdown if any
      const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleaned);
    }

    // Sanitize and ensure coordinates strictly match 30x20 grid constraints
    if (parsedJson && Array.isArray(parsedJson.detections)) {
      parsedJson.detections = parsedJson.detections.map((d: any) => {
        const col = Math.max(0, Math.min(29, Math.round(Number(d.col) || 0)));
        const row = Math.max(0, Math.min(19, Math.round(Number(d.row) || 0)));
        const cell_id = row * 30 + col;
        const confidence = typeof d.confidence === 'number' ? Math.max(0.5, Math.min(1.0, d.confidence)) : 0.95;
        return {
          ...d,
          col,
          row,
          cell_id,
          confidence,
        };
      });
    }

    return res.json(parsedJson);
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
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
