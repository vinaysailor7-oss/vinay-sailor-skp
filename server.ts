import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Server-side AI generation proxy for SketchUp extension generation
  app.post('/api/ai/generate-extension', async (req, res) => {
    try {
      const { prompt, extensionType, unitSystem } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(200).json({
          success: false,
          fallback: true,
          message: 'No GEMINI_API_KEY provided in environment. Using built-in generator engine.',
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are a Principal SketchUp Ruby API Architect and extension developer.
Generate an installable Trimble SketchUp extension package based on the user's request.
Requirements for SketchUp Extensions:
1. Root registrar file must use SketchupExtension.new and Sketchup.register_extension.
2. Code must be scoped in a unique double-module (e.g. module Author; module ExtensionName; ... end; end).
3. Ruby methods must wrap model changes in model.start_operation("Action Name", true) and model.commit_operation.
4. If UI is needed, use modern UI::HtmlDialog (NOT deprecated UI::WebDialog).
5. Always handle units correctly (SketchUp internal units are inches; use .to_l, .mm, .inch, .feet, etc.).
6. Output JSON format strictly matching:
{
  "id": "extension_slug",
  "name": "Human Friendly Name",
  "version": "1.0.0",
  "description": "Short description",
  "author": "Your Name / Studio",
  "category": "Architecture | Woodworking | BIM | Utilities | Modeling",
  "files": {
    "registrarRb": "string (root ruby loader file e.g. su_extension.rb)",
    "mainRb": "string (main extension logic in plugin folder)",
    "dialogHtml": "string (HTML for HtmlDialog UI)",
    "dialogJs": "string (JavaScript bridge to SketchUp via sketchup.callAction)",
    "dialogCss": "string (CSS styles for HtmlDialog)"
  },
  "previewParameters": [
    { "key": "width", "label": "Width", "type": "number", "default": 1000, "unit": "mm", "min": 100, "max": 10000 },
    { "key": "height", "label": "Height", "type": "number", "default": 2400, "unit": "mm", "min": 500, "max": 10000 },
    { "key": "depth", "label": "Depth", "type": "number", "default": 600, "unit": "mm", "min": 50, "max": 3000 }
  ],
  "geometryType": "stairs | cabinet | framing | window | custom",
  "summary": "Brief explanation of how this extension works in SketchUp"
}`;

      const userPrompt = `Create a complete Trimble SketchUp extension for: "${prompt || 'Parametric Spiral Stairs'}". Extension type: ${extensionType || 'Architectural'}. Preferred units: ${unitSystem || 'Metric (mm)'}. Return ONLY valid raw JSON with no markdown formatting around it if possible or pure json block.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, data: parsed });
      } catch (parseErr) {
        // Fallback cleanup if model wrapped in markdown
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, data: parsed });
      }
    } catch (err: any) {
      console.error('Error generating extension via Gemini:', err);
      return res.status(200).json({
        success: false,
        fallback: true,
        error: err.message || 'Generation failed',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      time: new Date().toISOString(),
    });
  });

  // Dev server setup with Vite
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SketchUp Extension Studio running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
