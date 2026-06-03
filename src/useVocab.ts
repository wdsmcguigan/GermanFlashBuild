import { useState, useEffect } from "react";
import { VocabWord } from "./types";

export function useVocab() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("german_vocab");
    if (saved) {
      try {
        setWords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load vocabulary from local storage");
      }
    }
  }, []);

  const saveWords = (newWords: VocabWord[]) => {
    setWords(newWords);
    localStorage.setItem("german_vocab", JSON.stringify(newWords));
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
      
      const newVocab: VocabWord[] = data.translations.map((t: any) => ({
        id: crypto.randomUUID(),
        german: t.german,
        english: t.english,
        examples: t.examples || [],
        level: 1,
        nextReview: Date.now(),
      }));

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

  const importWords = (imported: Partial<VocabWord>[]) => {
    if (!Array.isArray(imported)) {
      alert("Invalid backup file format.");
      return;
    }
    
    setWords(currentWords => {
      const existingIds = new Set(currentWords.map(w => w.id));
      const validAdditions = imported.filter((w): w is VocabWord => 
        !!w.id && !!w.german && !!w.english && !existingIds.has(w.id)
      );
      
      if (validAdditions.length > 0) {
        const nextWords = [...validAdditions, ...currentWords];
        localStorage.setItem("german_vocab", JSON.stringify(nextWords));
        return nextWords;
      }
      alert("No new words found to import (or IDs already exist).");
      return currentWords;
    });
  };

  return { words, loading, addTranslatedWords, removeWord, updateWordLevel, importWords };
}
