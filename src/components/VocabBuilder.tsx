import React, { useState, useRef } from "react";
import { VocabWord } from "../types";
import { Loader2, Plus, Trash2, Languages, BookOpen, Download, Upload, Camera, Check, CheckSquare, Square, X } from "lucide-react";

interface VocabBuilderProps {
  words: VocabWord[];
  loading: boolean;
  onAddWords: (words: string[]) => void;
  onRemoveWord: (id: string) => void;
  onImportWords: (words: Partial<VocabWord>[]) => void;
  onAddPreTranslatedWords: (words: { 
    german: string; 
    english: string; 
    examples?: string[];
    wordType?: "noun" | "verb" | "other"; 
    plural?: string;
    present?: string;
    preterite?: string;
    perfect?: string;
    verbClass?: "regelmäßig" | "unregelmäßig" | "modal";
  }[]) => void;
}

export function VocabBuilder({ words, loading, onAddWords, onRemoveWord, onImportWords, onAddPreTranslatedWords }: VocabBuilderProps) {
  const [inputText, setInputText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [extracting, setExtracting] = useState(false);
  const [extractedWords, setExtractedWords] = useState<{
    german: string;
    english: string;
    examples?: string[];
    wordType?: "noun" | "verb" | "other";
    plural?: string;
    present?: string;
    preterite?: string;
    perfect?: string;
    verbClass?: "regelmäßig" | "unregelmäßig" | "modal";
    selected: boolean;
  }[]>([]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultString = reader.result as string;
        const base64Data = resultString.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      const mimeType = file.type;
      const base64 = await convertToBase64(file);

      const response = await fetch("/api/extract-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      if (!response.ok) {
        throw new Error("Extraction failed");
      }

      const data = await response.json();
      if (data.words && Array.isArray(data.words)) {
        const wordsWithSelection = data.words.map((w: any) => ({
          ...w,
          selected: true,
        }));
        setExtractedWords(wordsWithSelection);
      } else {
        alert("Gemini couldn't find any German words in this image. Try another photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setExtracting(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  };

  const handleTranslate = () => {
    const list = inputText
      .split("\\n")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (list.length > 0) {
      onAddWords(list);
      setInputText("");
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(words, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wortschatz_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onImportWords(parsed);
      } catch (err) {
        alert("Failed to parse the JSON file. Ensure it is a valid backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input after use
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 w-full h-full lg:min-h-0 flex-1">
      {/* Left Column: Input */}
      <section className="flex-none lg:flex-1 h-[240px] lg:h-auto flex flex-col bg-white rounded-2xl lg:rounded-[32px] shadow-sm border border-[#E0E0D5] overflow-hidden shrink-0">
        <div className="px-4 py-3 lg:px-8 lg:py-6 border-b border-[#F5F5F0] flex justify-between items-center">
          <div className="flex items-center gap-2 lg:gap-3">
             <div className="p-1.5 lg:p-2 bg-[#F9F9F4] rounded-lg text-[#5A5A40]">
               <Languages className="w-4 h-4 lg:w-5 lg:h-5" />
             </div>
             <div>
               <h2 className="text-[10px] lg:text-xs uppercase tracking-tighter font-bold text-[#8E8E80]">Add Vocabulary</h2>
               <p className="hidden sm:block text-[10px] lg:text-xs text-[#8E8E80] mt-0.5">Enter German words, one per line.</p>
             </div>
          </div>
        </div>
        
        <div className="flex-1 p-4 lg:p-8 flex flex-col relative bg-gradient-to-b from-white to-[#FDFDFB]">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder="e.g.&#10;Weltraum&#10;Schwerkraft&#10;Galaxie"
            className="flex-1 w-full resize-none outline-none text-[#2A2A20] placeholder:text-[#E0E0D5] focus:ring-0 text-base lg:text-xl font-serif"
            style={{ fontFamily: "'Georgia', serif" }}
          />
          
          <div className="mt-2 pt-2 lg:mt-4 lg:pt-4 flex gap-2 justify-end items-center">
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              onChange={handleImageSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={loading || extracting}
              className="px-4 py-2 lg:px-6 lg:py-3 rounded-full bg-white text-[#5A5A40] border border-[#E0E0D5] text-[10px] lg:text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F4] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:border-[#5A5A40]/50"
              title="Take a photo or select an image to extract vocabulary words with Gemini"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  Photo Scan
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTranslate}
              disabled={loading || extracting || !inputText.trim()}
              className="px-4 py-2 lg:px-6 lg:py-3 rounded-full bg-[#5A5A40] text-white text-[10px] lg:text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-transform flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Translate & Add
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Right Column: List */}
      <section className="flex-1 min-h-[200px] lg:min-h-0 flex flex-col bg-white rounded-2xl lg:rounded-[32px] shadow-sm border border-[#E0E0D5] overflow-hidden shrink-0">
        <div className="px-4 py-3 lg:px-8 lg:py-6 border-b border-[#F5F5F0] flex justify-between items-center">
          <h2 className="text-xs uppercase tracking-tighter font-bold text-[#8E8E80]">Your List</h2>
          <div className="flex items-center gap-1.5 lg:gap-3">
            <input type="file" ref={fileInputRef} accept=".json" onChange={handleImportChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 lg:p-2 text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-lg hover:bg-[#F9F9F4]"
              title="Import Backup"
            >
              <Upload className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <button
              onClick={handleExport}
              disabled={words.length === 0}
              className="p-1.5 lg:p-2 text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-lg hover:bg-[#F9F9F4] disabled:opacity-50"
              title="Export Backup"
            >
              <Download className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <span className="ml-1 text-[10px] font-mono bg-[#F5F5F0] text-[#8E8E80] px-2 py-1 rounded border border-[#E0E0D5]">
              {words.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar">
          {words.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#E0E0D5]">
              <BookOpen className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-sm font-serif italic" style={{ fontFamily: "'Georgia', serif" }}>No vocabulary added yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {words.map(w => (
                <div key={w.id} className="flex items-center px-4 py-3 lg:px-6 lg:py-4 hover:bg-[#F9F9F4] rounded-xl lg:rounded-2xl transition-colors group animate-fade-in">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-base lg:text-lg font-serif text-[#2A2A20]" style={{ fontFamily: "'Georgia', serif" }}>
                      {w.wordType === "noun" && w.plural && !w.plural.toLowerCase().includes("no plural")
                        ? `${w.german}, ${w.plural}`
                        : w.german}
                    </span>
                    {w.wordType === "verb" && (w.present || w.preterite || w.perfect) && (
                      <span className="text-[10px] text-[#8E8E80] font-mono mt-0.5 truncate">
                        {w.present || "—"} • {w.preterite || "—"} • {w.perfect || "—"} <span className="text-[9px] uppercase tracking-wider bg-[#5A5A40]/10 px-1.5 py-0.2 rounded font-bold text-[#5A5A40] ml-1">{w.verbClass || "verb"}</span>
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-3 lg:gap-4 shrink-0">
                    <span className="text-[10px] text-[#8E8E80] opacity-80 uppercase font-medium max-w-[120px] truncate">{w.english}</span>
                    <button
                      onClick={() => onRemoveWord(w.id)}
                      className="text-[#8E8E80] opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#5A5A40]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Photo Vocabulary Extractor Modal */}
      {extractedWords.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A4A40]/30 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl lg:rounded-[32px] border border-[#E0E0D5] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 lg:px-8 border-b border-[#F5F5F0] flex justify-between items-center bg-[#FDFDFB]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#5A5A40]" />
                  Extracted Words
                </h3>
                <p className="text-[10px] lg:text-xs text-[#8E8E80] mt-0.5">
                  Select which vocabulary words you want to save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExtractedWords([])}
                className="p-1.5 text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-lg hover:bg-[#F9F9F4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Controls */}
            <div className="px-6 py-3 bg-[#F9F9F4] border-b border-[#F5F5F0] flex justify-between items-center text-xs text-[#8E8E80]">
              <span>
                {extractedWords.filter(w => w.selected).length} of {extractedWords.length} words selected
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setExtractedWords(words => words.map(w => ({ ...w, selected: true })))}
                  className="font-medium text-[#5A5A40] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[#E0E0D5]">|</span>
                <button
                  type="button"
                  onClick={() => setExtractedWords(words => words.map(w => ({ ...w, selected: false })))}
                  className="font-medium text-[#5A5A40] hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Word List Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 custom-scrollbar">
              {extractedWords.map((word, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setExtractedWords(current =>
                      current.map((w, i) => (i === idx ? { ...w, selected: !w.selected } : w))
                    );
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    word.selected
                      ? "border-[#5A5A40] bg-[#FDFDFB] shadow-sm"
                      : "border-[#E0E0D5] opacity-60 hover:opacity-100 bg-white"
                  }`}
                >
                  <div className="mt-1">
                    {word.selected ? (
                      <CheckSquare className="w-5 h-5 text-[#5A5A40]" />
                    ) : (
                      <Square className="w-5 h-5 text-[#8E8E80]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 font-serif">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-base lg:text-lg text-[#2A2A20] font-medium" style={{ fontFamily: "'Georgia', serif" }}>
                        {word.german}
                      </span>
                      <span className="text-xs text-[#8E8E80] font-mono font-medium max-w-[150px] truncate text-right">
                        {word.english}
                      </span>
                    </div>
                    {word.examples && word.examples.length > 0 && (
                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-[#E0E0D5]/60">
                        {word.examples.map((example, eIdx) => (
                          <p key={eIdx} className="text-xs text-[#8E8E80] italic leading-relaxed font-serif">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 lg:p-6 border-t border-[#F5F5F0] flex gap-3 justify-end bg-[#FDFDFB]">
              <button
                type="button"
                onClick={() => setExtractedWords([])}
                className="px-4 py-2 border border-[#E0E0D5] text-[#8E8E80] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const selected = extractedWords.filter(w => w.selected);
                  if (selected.length > 0) {
                    onAddPreTranslatedWords(selected.map(({ german, english, examples, wordType, plural, present, preterite, perfect, verbClass }) => ({ 
                      german, 
                      english, 
                      examples, 
                      wordType, 
                      plural, 
                      present, 
                      preterite, 
                      perfect, 
                      verbClass 
                    })));
                    setExtractedWords([]);
                  }
                }}
                disabled={extractedWords.filter(w => w.selected).length === 0}
                className="px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Add Selected ({extractedWords.filter(w => w.selected).length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
