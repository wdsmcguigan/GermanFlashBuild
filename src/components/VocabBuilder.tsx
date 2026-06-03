import React, { useState, useRef } from "react";
import { VocabWord } from "../types";
import { Loader2, Plus, Trash2, Languages, BookOpen, Download, Upload } from "lucide-react";

interface VocabBuilderProps {
  words: VocabWord[];
  loading: boolean;
  onAddWords: (words: string[]) => void;
  onRemoveWord: (id: string) => void;
  onImportWords: (words: Partial<VocabWord>[]) => void;
}

export function VocabBuilder({ words, loading, onAddWords, onRemoveWord, onImportWords }: VocabBuilderProps) {
  const [inputText, setInputText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          
          <div className="mt-2 pt-2 lg:mt-4 lg:pt-4 flex justify-end">
            <button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="px-4 py-2 lg:px-6 lg:py-3 rounded-full bg-[#5A5A40] text-white text-[10px] lg:text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-transform flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div key={w.id} className="flex items-center px-4 py-3 lg:px-6 lg:py-4 hover:bg-[#F9F9F4] rounded-xl lg:rounded-2xl transition-colors group">
                  <span className="text-base lg:text-lg font-serif text-[#2A2A20]" style={{ fontFamily: "'Georgia', serif" }}>{w.german}</span>
                  <div className="ml-auto flex items-center gap-3 lg:gap-4">
                    <span className="text-[10px] text-[#8E8E80] opacity-80 uppercase font-medium max-w-[100px] truncate">{w.english}</span>
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
    </div>
  );
}
