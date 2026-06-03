import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

function healVerb(w: any) {
  if (!w || typeof w !== "object") return w;
  const type = (w.wordType || "").trim().toLowerCase();
  let german = (w.german || "").trim();
  
  const isVerb = type === "verb" || (!type && german && /^[a-zäöü]+e[nr]l?$/i.test(german));
  
  if (isVerb) {
    w.wordType = "verb";
    
    if (german) {
      w.german = german.charAt(0).toLowerCase() + german.slice(1);
    }
    
    let present = (w.present || "").trim();
    if (!present || present === "—" || present === "-") {
      let stem = w.german;
      if (w.german.endsWith("en")) {
        stem = w.german.slice(0, -2);
      } else if (w.german.endsWith("ern") || w.german.endsWith("eln")) {
        stem = w.german.slice(0, -1);
      }
      const endsInDOrT = stem.endsWith("t") || stem.endsWith("d");
      w.present = `er ${stem}${endsInDOrT ? "et" : "t"}`;
    } else {
      if (!present.toLowerCase().startsWith("er ") && !present.toLowerCase().startsWith("sie ") && !present.toLowerCase().startsWith("es ")) {
        w.present = `er ${present}`;
      }
    }
    
    let preterite = (w.preterite || "").trim();
    if (!preterite || preterite === "—" || preterite === "-") {
      let stem = w.german;
      if (w.german.endsWith("en")) {
        stem = w.german.slice(0, -2);
      } else if (w.german.endsWith("ern") || w.german.endsWith("eln")) {
        stem = w.german.slice(0, -1);
      }
      const endsInDOrT = stem.endsWith("t") || stem.endsWith("d") || /([^aeiouy])([nm])$/i.test(stem);
      w.preterite = `er ${stem}${endsInDOrT ? "ete" : "te"}`;
    } else {
      if (!preterite.toLowerCase().startsWith("er ") && !preterite.toLowerCase().startsWith("sie ") && !preterite.toLowerCase().startsWith("es ")) {
        w.preterite = `er ${preterite}`;
      }
    }
    
    let perfect = (w.perfect || "").trim();
    if (!perfect || perfect === "—" || perfect === "-") {
      const inf = w.german;
      let stem = inf;
      if (inf.endsWith("en")) {
        stem = inf.slice(0, -2);
      } else if (inf.endsWith("ern") || inf.endsWith("eln")) {
        stem = inf.slice(0, -1);
      }
      const isIeren = inf.endsWith("ieren");
      const endsInDOrT = stem.endsWith("t") || stem.endsWith("d") || /([^aeiouy])([nm])$/i.test(stem);
      let participle = "";
      if (isIeren) {
        participle = `${stem}t`;
      } else {
        participle = `ge${stem}${endsInDOrT ? "et" : "t"}`;
      }
      const isMotion = /^(gehen|kommen|reisen|laufen|fliegen|fahren|steigen|fallen|bleiben|werden|springen|wandern)/i.test(inf);
      const aux = isMotion ? "ist" : "hat";
      w.perfect = `${aux} ${participle}`;
    } else {
      let lowerPerf = perfect.toLowerCase().trim();
      const hasAux = lowerPerf.startsWith("hat ") || 
                     lowerPerf.startsWith("ist ") || 
                     lowerPerf.startsWith("haben ") || 
                     lowerPerf.startsWith("sein ") ||
                     lowerPerf.includes(" hat ") ||
                     lowerPerf.includes(" ist ");
      if (!hasAux) {
        const inf = w.german;
        const isMotion = /^(gehen|kommen|reisen|laufen|fliegen|fahren|steigen|fallen|bleiben|werden|springen|wandern)/i.test(inf);
        const aux = isMotion ? "ist" : "hat";
        w.perfect = `${aux} ${perfect}`;
      }
    }
    
    if (!w.verbClass) {
      w.verbClass = "regelmäßig";
    }
  }
  return w;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
- If it is a verb, represent it in the infinitive form first in the 'german' field, then provide its 'present' (3rd person singular e.g. 'er bricht ab'), 'preterite' (3rd person singular e.g. 'er brach ab'), 'perfect' (Perfekt WITH the auxiliary verb 'hat' or 'ist', e.g. 'hat abgebrochen' or 'ist abgefahren') forms, and 'verbClass' ('regelmäßig', 'unregelmäßig', or 'modal'). You MUST include the auxiliary verb 'hat' or 'ist'.
- If it is not a noun or verb, identify its specific part of speech (must be one of: 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'phrase', 'other') in the 'wordType' field. Make sure to identify definite and indefinite pronouns (e.g., jeder, dieser, jemand, etwas, etc.) as 'pronoun', and prepositions (e.g., mit, für, von, etc.) as 'preposition'.

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
                  description: "The specific part of speech of the word (must be one of: 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'phrase', 'other'). Ensure all prepositions are classified as 'preposition' and all pronouns—both definite and indefinite (e.g., 'dieser', 'jeder', 'jemand', 'etwas')—are classified as 'pronoun'.",
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
                  description: "For verbs, the 3rd person singular preterite tense (Präteritum), e.g., 'er brach ab'. Leave empty/omit for other word types.",
                },
                perfect: {
                  type: Type.STRING,
                  description: "For verbs, the perfect tense (Perfekt) WITH the auxiliary verb (hat/ist), e.g., 'hat abgebrochen' or 'ist abgefahren'. REQUIRED for verbs. Leave empty/omit for other word types.",
                },
                verbClass: {
                  type: Type.STRING,
                  description: "For verbs, classification: 'regelmäßig', 'unregelmäßig', 'modal'. Leave empty/omit for other word types.",
                },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "One or two short example sentences. Each example MUST include the German sentence followed by its English translation in the format: 'German sentence. - English translation.'",
                }
              },
              required: ["german", "english", "wordType", "examples"],
            },
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const translations = JSON.parse(text);
      if (Array.isArray(translations)) {
        translations.forEach(healVerb);
      }
      res.json({ translations });
    } catch (error: any) {
      console.error("Translation ERROR:", error);
      
      let message = "Failed to translate words.";
      let details = error?.message || String(error);
      let category = "unknown";
      let status = 500;

      if (!process.env.GEMINI_API_KEY) {
        category = "api_key";
        status = 401;
        message = "Google Gemini API Key is missing. Please declare GEMINI_API_KEY in your workspace environment variables.";
      } else {
        const errStr = String(error).toLowerCase() + " " + (error?.message || "").toLowerCase() + " " + (error?.stack || "").toLowerCase();
        
        if (errStr.includes("api_key") || errStr.includes("api key") || errStr.includes("apikey") || errStr.includes("unauthorized") || errStr.includes("api key not found")) {
          category = "api_key";
          status = 401;
          message = "Google Gemini API Key is invalid or unauthorized. Please check your GEMINI_API_KEY value.";
        } else if (errStr.includes("safety") || errStr.includes("blocked")) {
          category = "safety";
          status = 400;
          message = "Translation was blocked by Gemini safety guidelines.";
        } else if (errStr.includes("quota") || errStr.includes("rate limit") || errStr.includes("429") || error?.status === 429) {
          category = "quota";
          status = 429;
          message = "Gemini API daily quota or rate limit exceeded. Please wait a bit and try again.";
        } else if (error instanceof SyntaxError) {
          category = "parse";
          status = 422;
          message = "The translation data returned from the AI was formatted incorrectly.";
        } else if (errStr.includes("network") || errStr.includes("fetch")) {
          category = "network";
          status = 502;
          message = "Upstream connectivity failure while sending your request to the translation services.";
        }
      }

      res.status(status).json({
        error: message,
        details: details,
        category: category
      });
    }
  });

  app.post("/api/enrich-vocab", async (req, res) => {
    try {
      const { words } = req.body;
      
      if (!words || words.length === 0) {
        return res.status(400).json({ error: "No words provided" });
      }

      if (!process.env.GEMINI_API_KEY) {
        throw new Error("api_key");
      }

      const prompt = `You are a German language expert system. I have a list of raw vocabulary words imported from an external app or source. 
There are ${words.length} items. 
Please analyze them and translate them into a standardized format. 
Critically:
1. Fix "wordType" (must be one of: "noun", "verb", "adjective", "adverb", "preposition", "pronoun", "conjunction", "phrase", "other"). Ensure all prepositions (e.g., mit, für, bei, etc.) are labeled as "preposition" and all pronouns—both definite and indefinite (e.g., jener, jeder, jemand, etwas, wer, was)—are labeled as "pronoun". Notice the original input might use wrong labels like "level", "C2", "TiPP", " Wendungen" as parts of speech. Use your intelligence to infer the actual word type from the German word itself! 
2. Ensure the "german" word contains the singular definite article (der, die, das) prefixed (separated by a space) if it is a noun, exactly matching how words are added directly. For example: "der Tisch" instead of "Tisch", "die Wand" instead of "Wand", "das Buch" instead of "Buch".
3. For nouns: the "plural" field must represent the short plural marker (e.g., "-en", "-e", "-", "-s", "¨-er", "no plural") rather than the full plural word, exactly matching standard additions.
4. For verbs: fill in "present", "preterite", "perfect", "verbClass" ("regelmäßig" | "unregelmäßig" | "modal") if missing.
5. Provide a useful "examples" list (an array of strings) for each word. Each example MUST include the German sentence followed by its English translation in the format: 'German sentence. - English translation.' exactly matching standard additions.
6. The incoming items might have a "level" (like A1, A2, etc) and "lektion" (like "Lektion 2"). Retain them in the output "cefrLevel" (as a string) and "lektion" properties. If missing, infer the CEFR level.

Raw input to process:
${JSON.stringify(words, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              enrichedWords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    german: { type: Type.STRING, description: "The German word (with singular definite article der/die/das if it is a noun, infinitive if it is a verb)." },
                    english: { type: Type.STRING },
                    wordType: { type: Type.STRING, description: "The part of speech of the word (must be one of: 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'phrase', 'other'). Prepositions must be 'preposition', and definite/indefinite pronouns (like 'jeder', 'dieser', 'jemand', 'etwas') must be 'pronoun'." },
                    plural: { type: Type.STRING, description: "For nouns, the short plural marker e.g., '-en', '-e', '-', '-s', '¨-er', 'no plural'. Leave empty/omit for other word types." },
                    present: { type: Type.STRING, description: "For verbs, the 3rd person singular present tense (Präsens), e.g., 'er bricht ab'. Leave empty/omit for other word types." },
                    preterite: { type: Type.STRING, description: "For verbs, the 3rd person singular preterite tense (Präteritum), e.g., 'er brach ab'. Leave empty/omit for other word types." },
                    perfect: { type: Type.STRING, description: "For verbs, the perfect tense (Perfekt) WITH the auxiliary verb (hat/ist), e.g., 'hat abgebrochen' or 'ist abgefahren'. Leave empty/omit for other word types." },
                    verbClass: { type: Type.STRING },
                    examples: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "One or two short example sentences. Each example MUST include the German sentence followed by its English translation in the format: 'German sentence. - English translation.'"
                    },
                    cefrLevel: { type: Type.STRING, description: "e.g. A1, B1" },
                    lektion: { type: Type.STRING }
                  },
                  required: ["german", "english", "wordType"]
                }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");

      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.enrichedWords)) {
        parsed.enrichedWords.forEach(healVerb);
      }
      res.json({ enrichedWords: parsed.enrichedWords });
    } catch (error: any) {
      console.error("Enrichment ERROR:", error);
      
      let message = "Failed to enrich vocabulary from the external import block.";
      let details = error?.message || String(error);
      let category = "unknown";
      let status = 500;

      if (!process.env.GEMINI_API_KEY) {
        category = "api_key";
        status = 401;
        message = "Google Gemini API Key is missing. Please declare GEMINI_API_KEY in your workspace environment variables.";
      } else {
        const errStr = String(error).toLowerCase() + " " + (error?.message || "").toLowerCase() + " " + (error?.stack || "").toLowerCase();
        
        if (errStr.includes("api_key") || errStr.includes("api key") || errStr.includes("apikey") || errStr.includes("unauthorized") || errStr.includes("api key not found")) {
          category = "api_key";
          status = 401;
          message = "Google Gemini API Key is invalid or unauthorized. Please check your GEMINI_API_KEY value.";
        } else if (errStr.includes("quota") || errStr.includes("rate limit") || errStr.includes("429") || error?.status === 429) {
          category = "quota";
          status = 429;
          message = "Gemini API daily quota or rate limit exceeded. Please wait a bit and try again.";
        } else if (error instanceof SyntaxError) {
          category = "parse";
          status = 422;
          message = "The enrichment data returned from the AI was formatted incorrectly.";
        } else if (errStr.includes("network") || errStr.includes("fetch")) {
          category = "network";
          status = 502;
          message = "Upstream connectivity failure while sending your request to the enrichment services.";
        }
      }

      res.status(status).json({
        error: message,
        details: details,
        category: category
      });
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
- If it is a verb, represent it in the infinitive form first in the 'german' field, then provide its 'present' (3rd person singular e.g. 'er bricht ab'), 'preterite' (3rd person singular e.g. 'er brach ab'), 'perfect' (Perfekt WITH the auxiliary verb 'hat' or 'ist', e.g. 'hat abgebrochen' or 'ist abgefahren') forms, and 'verbClass' ('regelmäßig', 'unregelmäßig', or 'modal'). You MUST include the auxiliary verb 'hat' or 'ist'.
- Identify its specific part of speech ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'phrase', 'other') in the 'wordType' field. Make sure prepositions are 'preposition' and definite/indefinite pronouns are 'pronoun'.
- Translate the word accurately into English.
- Generate 1 or 2 natural, short example sentences using the word, including BOTH the German sentence and its English translation.
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
                  description: "The specific part of speech of the word (must be one of: 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'phrase', 'other'). Prepositions must be categorized as 'preposition' and pronouns—including definite and indefinite pronouns—must be categorized as 'pronoun'.",
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
                  description: "For verbs, the 3rd person singular preterite tense (Präteritum), e.g., 'er brach ab'. Leave empty/omit for other word types.",
                },
                perfect: {
                  type: Type.STRING,
                  description: "For verbs, the perfect tense (Perfekt) WITH the auxiliary verb (hat/ist), e.g., 'hat abgebrochen' or 'ist abgefahren'. REQUIRED for verbs. Leave empty/omit for other word types.",
                },
                verbClass: {
                  type: Type.STRING,
                  description: "For verbs, classification: 'regelmäßig', 'unregelmäßig', 'modal'. Leave empty/omit for other word types.",
                },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "1-2 short example sentences. Each example MUST include the German sentence followed by its English translation in the format: 'German sentence. - English translation.'",
                },
              },
              required: ["german", "english", "wordType", "examples"],
            },
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      const extractedWords = JSON.parse(text);
      if (Array.isArray(extractedWords)) {
        extractedWords.forEach(healVerb);
      }
      res.json({ words: extractedWords });
    } catch (error: any) {
      console.error("Extraction ERROR:", error);
      
      let message = "Failed to extract vocabulary from the image.";
      let details = error?.message || String(error);
      let category = "unknown";
      let status = 500;

      if (!process.env.GEMINI_API_KEY) {
        category = "api_key";
        status = 401;
        message = "Google Gemini API Key is missing. Please declare GEMINI_API_KEY in your workspace environment variables.";
      } else {
        const errStr = String(error).toLowerCase() + " " + (error?.message || "").toLowerCase() + " " + (error?.stack || "").toLowerCase();
        
        if (errStr.includes("api_key") || errStr.includes("api key") || errStr.includes("apikey") || errStr.includes("unauthorized") || errStr.includes("api key not found")) {
          category = "api_key";
          status = 401;
          message = "Google Gemini API Key is invalid or unauthorized. Please check your GEMINI_API_KEY value.";
        } else if (errStr.includes("quota") || errStr.includes("rate limit") || errStr.includes("resource exhausted") || errStr.includes("429") || error?.status === 429) {
          category = "quota";
          status = 429;
          message = "Gemini API daily quota or rate limit exceeded. Please try again in a few moments.";
        } else if (errStr.includes("payload") || errStr.includes("too large") || errStr.includes("313") || errStr.includes("image size") || errStr.includes("file size") || errStr.includes("413") || error?.status === 413) {
          category = "payload_size";
          status = 413;
          message = "The uploaded image file size or dimensions exceed allowable limits. Please use a smaller or compressed image.";
        } else if (errStr.includes("safety") || errStr.includes("blocked") || errStr.includes("harassment") || errStr.includes("hate speech")) {
          category = "safety";
          status = 400;
          message = "The vocabulary extraction request was blocked by Gemini safety guidelines because of potentially sensitive content in the image.";
        } else if (error instanceof SyntaxError) {
          category = "parse";
          status = 422;
          message = "The Gemini AI completed successfully but the vocabulary details were returned as invalid structured data.";
        } else if (errStr.includes("network") || errStr.includes("fetch") || errStr.includes("host") || errStr.includes("dns")) {
          category = "network";
          status = 502;
          message = "An upstream connection error occurred while communicating with the Google API servers.";
        }
      }

      res.status(status).json({
        error: message,
        details: details,
        category: category
      });
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
