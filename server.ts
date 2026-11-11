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

    const promptText = `You are an autonomous aerial drone search-and-rescue (SAR) detection engine.

The uploaded reconnaissance image is divided into a discrete 600-cell coordinate grid:
- Grid layout: 30 columns wide (X: 0 to 29) by 20 rows high (Y: 0 to 19).
- Total cells = 600.
- Cell Index formula: cell_id = (row * 30) + col (range: 0 to 599).

Analyze the uploaded aerial/satellite image and identify all targets belonging to these classes:
1. "human" (stranded victims on rooftops, balconies, or in water)
2. "vehicle" (cars, trucks, vans, floating/submerged vehicles)
3. "boat" (rescue boats, dinghies, rafts)
4. "animal" (stranded domestic or farm animals)

For each detected entity, determine its exact grid square position based on its visual center:
- "col": Horizontal grid column index (0 to 29)
- "row": Vertical grid row index (0 to 19)
- "cell_id": Discrete cell index from 0 to 599

Rules:
- Do not output markdown text or explanations.
- If a cluster exists (e.g., several people on one rooftop), output each person with their respective grid cell.
- If multiple entities occupy the same grid cell, output them as separate entries in the detections array.
- Carefully scan across the entire 30x20 grid (cols 0-29, rows 0-19) for all visible stranded humans, submerged/parked vehicles, boats, and animals.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [imagePart, { text: promptText }],
      },
      config: {
        systemInstruction:
          'You are an expert autonomous search-and-rescue aerial drone sensor payload processor with high-precision computer vision. Always return valid structured JSON mapping visual targets to the 30x20 (600-cell) discrete coordinate grid.',
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
                    description: 'Target class: "human", "vehicle", "boat", or "animal"',
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
    let parsedJson;
    try {
      parsedJson = JSON.parse(textOutput);
    } catch {
      // Fallback clean markdown if any
      const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleaned);
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
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
