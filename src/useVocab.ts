import { useState, useEffect } from "react";
import { VocabWord } from "./types";

function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (err) {
    // Fallback on error
  }
  return "xxxx-xxxx-xxxx-xxxx-xxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function healWord(w: any): any {
  if (!w || typeof w !== "object") return w;
  const word = { ...w };

  // Convert properties to string if they of some other type
  if (word.german !== undefined && word.german !== null && typeof word.german !== "string") {
    word.german = String(word.german);
  }
  if (word.english !== undefined && word.english !== null && typeof word.english !== "string") {
    word.english = String(word.english);
  }
  if (word.wordType !== undefined && word.wordType !== null && typeof word.wordType !== "string") {
    word.wordType = String(word.wordType);
  }
  if (word.plural !== undefined && word.plural !== null && typeof word.plural !== "string") {
    word.plural = String(word.plural);
  }
  if (word.present !== undefined && word.present !== null && typeof word.present !== "string") {
    word.present = String(word.present);
  }
  if (word.preterite !== undefined && word.preterite !== null && typeof word.preterite !== "string") {
    word.preterite = String(word.preterite);
  }
  if (word.perfect !== undefined && word.perfect !== null && typeof word.perfect !== "string") {
    word.perfect = String(word.perfect);
  }

  // Standardize wordType as lowercase
  if (word.wordType) {
    word.wordType = word.wordType.trim().toLowerCase();
  }

  const type = word.wordType || "";
  let german = (word.german || "").trim();

  const isVerb = type === "verb" || (!type && german && /^[a-zäöü]+e[nr]l?$/i.test(german));

  if (isVerb) {
    word.wordType = "verb";
    
    if (german) {
      word.german = german.charAt(0).toLowerCase() + german.slice(1);
    }
    
    let present = (word.present || "").trim();
    if (!present || present === "—" || present === "-") {
      let stem = word.german;
      if (word.german.endsWith("en")) {
        stem = word.german.slice(0, -2);
      } else if (word.german.endsWith("ern") || word.german.endsWith("eln")) {
        stem = word.german.slice(0, -1);
      }
      const endsInDOrT = stem.endsWith("t") || stem.endsWith("d");
      word.present = `er ${stem}${endsInDOrT ? "et" : "t"}`;
    } else {
      if (!present.toLowerCase().startsWith("er ") && !present.toLowerCase().startsWith("sie ") && !present.toLowerCase().startsWith("es ")) {
        word.present = `er ${present}`;
      }
    }
    
    let preterite = (word.preterite || "").trim();
    if (!preterite || preterite === "—" || preterite === "-") {
      let stem = word.german;
      if (word.german.endsWith("en")) {
        stem = word.german.slice(0, -2);
      } else if (word.german.endsWith("ern") || word.german.endsWith("eln")) {
        stem = word.german.slice(0, -1);
      }
      const endsInDOrT = stem.endsWith("t") || stem.endsWith("d") || /([^aeiouy])([nm])$/i.test(stem);
      word.preterite = `er ${stem}${endsInDOrT ? "ete" : "te"}`;
    } else {
      if (!preterite.toLowerCase().startsWith("er ") && !preterite.toLowerCase().startsWith("sie ") && !preterite.toLowerCase().startsWith("es ")) {
        word.preterite = `er ${preterite}`;
      }
    }
    
    let perfect = (word.perfect || "").trim();
    if (!perfect || perfect === "—" || perfect === "-") {
      const inf = word.german;
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
      word.perfect = `${aux} ${participle}`;
    } else {
      let lowerPerf = perfect.toLowerCase().trim();
      const hasAux = lowerPerf.startsWith("hat ") || 
                     lowerPerf.startsWith("ist ") || 
                     lowerPerf.startsWith("haben ") || 
                     lowerPerf.startsWith("sein ") ||
                     lowerPerf.includes(" hat ") ||
                     lowerPerf.includes(" ist ");
      if (!hasAux) {
        const inf = word.german;
        const isMotion = /^(gehen|kommen|reisen|laufen|fliegen|fahren|steigen|fallen|bleiben|werden|springen|wandern)/i.test(inf);
        const aux = isMotion ? "ist" : "hat";
        word.perfect = `${aux} ${perfect}`;
      }
    }
    
    if (!word.verbClass) {
      word.verbClass = "regelmäßig";
    }
  }

  // Double check noun formatting too
  if (type === "noun") {
    // 1. Unify standard noun format (prefixed singular article like "der Tisch")
    let germanText = (word.german || "").trim();
    const lowerGerman = germanText.toLowerCase();

    if (germanText && !lowerGerman.startsWith("der ") && !lowerGerman.startsWith("die ") && !lowerGerman.startsWith("das ")) {
      const artText = (word.article || "").trim().toLowerCase();
      if (artText && (artText === "der" || artText === "die" || artText === "das")) {
        word.german = `${artText} ${germanText}`;
      }
    }

    // 2. Clean up plural fields that might come with standard "die " articles
    if (word.plural) {
      let plText = word.plural.trim();
      if (plText.toLowerCase().startsWith("die ")) {
        plText = plText.slice(4).trim();
      }
      word.plural = plText;
    }
  }

  return word;
}

export function useVocab() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("german_vocab");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWords(Array.isArray(parsed) ? parsed.map(healWord) : []);
      } catch (e) {
        console.error("Failed to load vocabulary from local storage");
      }
    }
  }, []);

  const saveWords = (newWords: VocabWord[]) => {
    const healed = newWords.map(healWord);
    setWords(healed);
    localStorage.setItem("german_vocab", JSON.stringify(healed));
  };

  const addTranslatedWords = async (inputList: string[]) => {
    if (!inputList.length) return;
    setLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: inputList }),
      });
      if (!response.ok) {
        throw new Error("Translation failed");
      }
      const data = await response.json();
      
      const existingGermanWords = new Set(
        words
          .filter(w => w && typeof w.german === "string")
          .map(w => w.german.trim().toLowerCase())
      );
      
      const newVocab: VocabWord[] = data.translations
        .filter((t: any) => t && t.german && typeof t.german === "string" && !existingGermanWords.has(t.german.trim().toLowerCase()))
        .map((t: any) => ({
          id: generateId(),
          german: t.german,
          english: t.english,
          examples: t.examples || [],
          level: 1,
          nextReview: Date.now(),
          wordType: t.wordType,
          plural: t.plural,
          present: t.present,
          preterite: t.preterite,
          perfect: t.perfect,
          verbClass: t.verbClass,
        }));

      if (newVocab.length === 0) {
        alert("All words were duplicates and already exist in your vocabulary.");
      } else if (newVocab.length < data.translations.length) {
        alert(`${data.translations.length - newVocab.length} duplicate word(s) were skipped.`);
      }

      // Prepend new words
      saveWords([...newVocab, ...words]);
    } catch (e) {
      console.error(e);
      alert("Failed to translate and add words. Check your API key or network.");
    } finally {
      setLoading(false);
    }
  };

  const removeWord = (id: string) => {
    saveWords(words.filter(w => w.id !== id));
  };

  const clearAllWords = () => {
    saveWords([]);
  };

  const updateWordLevel = (id: string, knewIt: boolean) => {
    const updated = words.map(w => {
      if (w.id === id) {
        let nextLevel = w.level;
        if (knewIt) {
          nextLevel = Math.min(w.level + 1, 5);
        } else {
          nextLevel = 1; // RESET to 1 if forgotten
        }
        
        // Calculate next review (simple Leitner spacing)
        const ONE_HOUR = 60 * 60 * 1000;
        const delays = [
          0,                // level 0 (not used)
          ONE_HOUR * 1,     // level 1: 1 hour
          ONE_HOUR * 12,    // level 2: 12 hours
          ONE_HOUR * 24 * 2,// level 3: 2 days
          ONE_HOUR * 24 * 7,// level 4: 1 week
          ONE_HOUR * 24 * 30// level 5: 1 month
        ];
        
        return {
          ...w,
          level: nextLevel,
          nextReview: Date.now() + delays[nextLevel],
        };
      }
      return w;
    });
    saveWords(updated);
  };

  const importWords = (importedList: Partial<VocabWord>[]) => {
    // Map and sanitize the incoming items so they are shaped identically to manually translated or added words
    const sanitizedList = importedList.map((item: any) => {
      const sanitized = { ...item };

      // Standardize wordType as lowercase
      if (sanitized.wordType) {
        sanitized.wordType = sanitized.wordType.trim().toLowerCase();
      }

      // 1. Unify standard noun format (prefixed singular article like "der Tisch")
      if (sanitized.wordType === "noun") {
        let germanText = (sanitized.german || "").trim();
        const lowerGerman = germanText.toLowerCase();

        // If 'german' is just "Tisch" and we have an 'article' property we can prefix e.g., "der"
        if (germanText && !lowerGerman.startsWith("der ") && !lowerGerman.startsWith("die ") && !lowerGerman.startsWith("das ")) {
          const artText = (sanitized.article || "").trim().toLowerCase();
          if (artText && (artText === "der" || artText === "die" || artText === "das")) {
            sanitized.german = `${artText} ${germanText}`;
          }
        }

        // 2. Clean up plural fields that might come with standard "die " articles
        if (sanitized.plural) {
          let plText = sanitized.plural.trim();
          if (plText.toLowerCase().startsWith("die ")) {
            plText = plText.slice(4).trim();
          }
          sanitized.plural = plText;
        }
      }

      // 3. Translate separated exampleSentence and exampleTranslation fields to the standard examples: [] array
      if (!sanitized.examples || !Array.isArray(sanitized.examples) || sanitized.examples.length === 0) {
        if (sanitized.exampleSentence) {
          const sentence = sanitized.exampleSentence.trim();
          const translation = (sanitized.exampleTranslation || "").trim();
          sanitized.examples = translation ? [`${sentence} - ${translation}`] : [sentence];
        } else {
          sanitized.examples = [];
        }
      }

      return sanitized;
    });

    setWords(currentWords => {
      // Match on 'german' exact spelling to avoid duplicates
      const existingGerman = new Set(
        (Array.isArray(currentWords) ? currentWords : [])
          .filter(w => w && typeof w.german === "string")
          .map(w => w.german.toLowerCase().trim())
      );
      
      const validAdditions = sanitizedList.filter((w) => {
        // Assign UUID if missing to handle custom created objects
        w.id = w.id || generateId();
        // Also init level/nextReview if missing
        w.level = w.level || 1;
        w.nextReview = w.nextReview || Date.now();
        // Skip duplicate german word to avoid filling up the deck endlessly
        const isDuplicate = w.german && typeof w.german === "string" ? existingGerman.has(w.german.toLowerCase().trim()) : false;
        return !!w.id && !!w.german && !!w.english && !isDuplicate;
      }) as VocabWord[];
      
      if (validAdditions.length > 0) {
        const nextWords = [...validAdditions, ...currentWords].map(healWord);
        localStorage.setItem("german_vocab", JSON.stringify(nextWords));
        alert(`Successfully imported ${validAdditions.length} new words!`);
        return nextWords;
      }
      alert("No new words found to import (all words either had missing info or already exist in your deck).");
      return currentWords;
    });
  };

  const addPreTranslatedWords = (newWords: { 
    german: string; 
    english: string; 
    examples?: string[]; 
    wordType?: string;
    plural?: string;
    present?: string;
    preterite?: string;
    perfect?: string;
    verbClass?: "regelmäßig" | "unregelmäßig" | "modal";
  }[]) => {
    const existingGermanWords = new Set(
      words
        .filter(w => w && typeof w.german === "string")
        .map(w => w.german.trim().toLowerCase())
    );
    
    const newVocab: VocabWord[] = newWords
      .filter((t) => t && t.german && typeof t.german === "string" && !existingGermanWords.has(t.german.trim().toLowerCase()))
      .map((t) => ({
        id: generateId(),
        german: t.german,
        english: t.english,
        examples: t.examples || [],
        level: 1,
        nextReview: Date.now(),
        wordType: t.wordType,
        plural: t.plural,
        present: t.present,
        preterite: t.preterite,
        perfect: t.perfect,
        verbClass: t.verbClass,
      }));

    if (newVocab.length === 0) {
      alert("All extracted words were duplicates and already exist in your vocabulary.");
    } else if (newVocab.length < newWords.length) {
      alert(`${newWords.length - newVocab.length} duplicate word(s) were skipped.`);
    }

    saveWords([...newVocab, ...words]);
  };

  return { words, loading, addTranslatedWords, removeWord, clearAllWords, updateWordLevel, importWords, addPreTranslatedWords };
}
