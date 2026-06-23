import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Configure this in the Secrets panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // AI assistant endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const client = getAiClient();

      const systemInstruction = `You are the Cricket Explorer AI Search Assistant.
Your goal is to instantly find and display cricket statistics, records, scorecards, series standings, and highlights.
Use your web search tool to ground your facts, bringing high-fidelity, accurate numbers for international matches, IPL, T20 World Cups, Ashes, etc.

You MUST respond in JSON complying with the requested schema. Ensure 'textResponse' is a highly detailed, comprehensive, beautifully structured Markdown response with markdown tables for stats, scorecards or timelines when appropriate.

Make sure you try to match the query to any of the following entity types and IDs built into the local application database. If there is a match, specify the 'entityType' and 'entityId' inside the JSON response:
- Players: 'virat-kohli', 'ms-dhoni', 'sachin-tendulkar', 'rohit-sharma', 'jasprit-bumrah', 'joe-root', 'ben-stokes', 'kane-williamson', 'babar-azam', 'ab-de-villiers'.
- Teams: 'india', 'australia', 'england', 'csk', 'mi', 'rcb'.
- Series: 'ipl-2025', 'ipl-2024', 'world-cup-2023', 'ashes-2019'.
- Matches: 'ind-vs-pak-2024', 'csk-vs-mi-2024', 'aus-vs-eng-3rd-ashes-2019'.

For example, if someone asks "Show Virat Kohli stats in IPL 2024", return "player" as entityType and "virat-kohli" as entityId. If they ask about CSK vs MI 2024 match, return "match" as entityType and "csk-vs-mi-2024" as entityId. If there is no specific match, set entityType to "none".`;

      // Build contents array with a simplified history representing prior turns
      const contents = [];
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              textResponse: {
                type: Type.STRING,
                description: 'The Markdown answer responding to the user Cricket query.'
              },
              entityType: {
                type: Type.STRING,
                description: "Recognized cricket element. Must be 'player', 'team', 'match', 'series', 'news' or 'none'."
              },
              entityId: {
                type: Type.STRING,
                description: 'The exact ID of the local database entity if matched, or empty string.'
              }
            },
            required: ['textResponse', 'entityType', 'entityId']
          },
          tools: [{ googleSearch: {} }],
        }
      });

      const responseText = response.text || '{}';
      let resultData;
      try {
        resultData = JSON.parse(responseText.trim());
      } catch (err) {
        // Fallback if parsing fails
        resultData = {
          textResponse: responseText,
          entityType: 'none',
          entityId: ''
        };
      }

      // Add search grounding URLs if present
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingUrls: string[] = [];
      if (groundingChunks && Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            groundingUrls.push(chunk.web.uri);
          }
        }
      }
      resultData.groundingUrls = groundingUrls;

      res.json(resultData);
    } catch (error: any) {
      console.error('Gemini error:', error);
      res.status(500).json({
        error: 'Failed to generate response. Please verify your GEMINI_API_KEY in Settings > Secrets.',
        details: error.message
      });
    }
  });

  // Serve static assets out of dist (compiled assets) or trigger Vite in dev
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Match all other requests to deliver single-page index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Cricket Explorer running on http://localhost:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer();
