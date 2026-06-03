import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

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
Identify if each word is a noun, verb, or other.
- If it is a noun, provide its singular definite article (der/die/das) prefixed in the 'german' field, and identify its plural representation (e.g., "-en", "-e", "-", "-s", "¨-er", "no plural").
- If it is a verb, represent it in the infinitive form first in the 'german' field, then provide its 'present' (3rd person singular e.g. 'er bricht ab'), 'preterite' (3rd person singular e.g. 'brach ab'), 'perfect' (Perfekt e.g. 'hat abgebrochen' or 'ist abgefahren') forms, and 'verbClass' ('regelmäßig', 'unregelmäßig', or 'modal').
- If it is other (e.g. adjective, adverb, preposition), set 'wordType' to 'other'.

Words to translate:
${words.join("\\n")}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert German language tutor with advanced grammar expertise.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of translations with rich grammatical annotations corresponding exactly to the provided list.",
            items: {
              type: Type.OBJECT,
              properties: {
                german: {
                  type: Type.STRING,
                  description: "The German word (with singular definite article der/die/das if it's a noun, infinitive if it's a verb).",
                },
                english: {
                  type: Type.STRING,
                  description: "The English translation.",
                },
                wordType: {
                  type: Type.STRING,
                  description: "The category of the word. Must be exactly 'noun', 'verb', or 'other'.",
                },
                plural: {
                  type: Type.STRING,
                  description: "For nouns, the short plural marker e.g., '-en', '-e', '-', '-s', '¨-er', 'no plural'. Leave empty/omit for other word types.",
                },
                present: {
                  type: Type.STRING,
                  description: "For verbs, the 3rd person singular present tense (Präsens), e.g., 'er bricht ab'. Leave empty/omit for other word types.",
                },
                preterite: {
                  type: Type.STRING,
                  description: "For verbs, the 3rd person singular preterite tense (Präteritum), e.g., 'brach ab'. Leave empty/omit for other word types.",
                },
                perfect: {
                  type: Type.STRING,
                  description: "For verbs, the perfect tense (Perfekt), e.g., 'hat abgebrochen' or 'ist abgefahren'. Leave empty/omit for other word types.",
                },
                verbClass: {
                  type: Type.STRING,
                  description: "For verbs, classification: 'regelmäßig', 'unregelmäßig', 'modal'. Leave empty/omit for other word types.",
                },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "One or two short example sentences in German using the word.",
                }
              },
              required: ["german", "english", "wordType"],
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

  app.post("/api/extract-vocab", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      const prompt = `Analyze this image thoroughly (e.g. a mind map, word chart, list, textbook page, product label, sign, menu, handwriting, or text snippet).
Locate and extract ALL useful or interesting German vocabulary words, terms, and expressions found in the image.
Do not artificially limit your output to 12 items. If there are many distinct words (like lists, categories, or branches in a mind map), extract all of them fully! You can extract up to 40 distinct items if the image contains large numbers of words.
For each extracted word:
- If it is a noun, you MUST identify its gender and provide it with its correct singular definite article (der/die/das) prefixed (e.g., 'die Brücke', 'der Fußgänger', 'das Auto'), even if the article itself isn't directly printed in the image. Also identify its short plural representation (e.g., "-en", "-e", "-", "-s", "¨-er", "no plural").
- If it is a verb, represent it in the infinitive form first in the 'german' field, then provide its 'present' (3rd person singular e.g. 'er bricht ab'), 'preterite' (3rd person singular e.g. 'brach ab'), 'perfect' (Perfekt e.g. 'hat abgebrochen' or 'ist abgefahren') forms, and 'verbClass' ('regelmäßig', 'unregelmäßig', or 'modal').
- Identify if each word is a noun, verb, or other. If other, set 'wordType' to 'other'.
- Translate the word accurately into English.
- Generate 1 or 2 natural, short German example sentences using the word.
Be very thorough and comprehensive. Read columns, diagram nodes, notes, labels, and handwriting. Do not skip smaller text if readable.`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          systemInstruction: "You are an expert German language tutor specializing in text analysis, vocabulary extraction, and grammar analysis.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A list of useful German vocabulary words extracted from the image with rich grammatical details.",
            items: {
              type: Type.OBJECT,
              properties: {
                german: {
                  type: Type.STRING,
                  description: "The German word or term (with singular article der/die/das if it is a noun, infinitive form if it is a verb).",
                },
                english: {
                  type: Type.STRING,
                  description: "The English translation.",
                },
                wordType: {
                  type: Type.STRING,
                  description: "The category of the word. Must be exactly 'noun', 'verb', or 'other'.",
                },
                plural: {
                  type: Type.STRING,
                  description: "For nouns, the short plural marker e.g., '-en', '-e', '-', '-s', '¨-er', 'no plural'. Leave empty/omit for other word types.",
                },
                present: {
                  type: Type.STRING,
                  description: "For verbs, the 3rd person singular present tense (Präsens), e.g., 'er bricht ab'. Leave empty/omit for other word types.",
                },
                preterite: {
                  type: Type.STRING,
                  description: "For verbs, the 3rd person singular preterite tense (Präteritum), e.g., 'brach ab'. Leave empty/omit for other word types.",
                },
                perfect: {
                  type: Type.STRING,
                  description: "For verbs, the perfect tense (Perfekt), e.g., 'hat abgebrochen' or 'ist abgefahren'. Leave empty/omit for other word types.",
                },
                verbClass: {
                  type: Type.STRING,
                  description: "For verbs, classification: 'regelmäßig', 'unregelmäßig', 'modal'. Leave empty/omit for other word types.",
                },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "1-2 short example sentences in German using the word.",
                },
              },
              required: ["german", "english", "wordType"],
            },
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const extractedWords = JSON.parse(text);
      res.json({ words: extractedWords });
    } catch (error) {
      console.error("Extraction ERROR:", error);
      res.status(500).json({ error: "Failed to extract vocabulary from the image" });
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
