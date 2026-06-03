import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API constraints
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // API routes FIRST
  app.post("/api/translate", async (req, res) => {
    try {
      const { words } = req.body;
      
      if (!words || words.length === 0) {
        return res.status(400).json({ error: "No words provided" });
      }

      const prompt = `Translate the following list of German vocabulary words into English.
      If it is a noun, provide the article if not already present, but the main translation should be accurate.
      Words to translate:
      ${words.join("\\n")}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert German language tutor.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of translations corresponding exactly to the provided list.",
            items: {
              type: Type.OBJECT,
              properties: {
                german: {
                  type: Type.STRING,
                  description: "The German word (with definite article if it's a noun).",
                },
                english: {
                  type: Type.STRING,
                  description: "The English translation.",
                },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "One or two short example sentences in German using the word.",
                }
              },
              required: ["german", "english"],
            },
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const translations = JSON.parse(text);
      res.json({ translations });
    } catch (error) {
      console.error("Translation ERROR:", error);
      res.status(500).json({ error: "Failed to translate words" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
