import React, { useState } from "react";
import { VocabWord } from "../types";
import { X, CheckCircle2, Edit3 } from "lucide-react";

interface WordFlashcardModalProps {
  word: VocabWord;
  onClose: () => void;
  onMastered: (id: string) => void;
  onEdit: () => void;
}

export function WordFlashcardModal({ word, onClose, onMastered, onEdit }: WordFlashcardModalProps) {
  const [flipped, setFlipped] = useState(false);

  const cleanConjugation = (val: string | undefined | null) => {
    if (!val) return "—";
    return val.replace(/^(er\/sie\/es|er|sie|es|ich|du|wir|ihr|sie\/Sie)\s+/i, "");
  };

  const displayGerman = (() => {
    if (word.wordType === "noun" && word.plural) {
      if (word.plural.toLowerCase().includes("no plural")) return word.german;
      return `${word.german}, ${word.plural}`;
    }
    return word.german;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A4A40]/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg mb-6 lg:mb-8 mt-6 lg:mt-0 relative" 
        style={{ perspective: "1000px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Helper Top Bar */}
        <div className="absolute -top-12 left-0 right-0 flex justify-between items-center text-white/90 px-2 pointer-events-none">
          <div className="flex gap-2"></div>
        </div>

        <div
          onClick={() => setFlipped(!flipped)}
          className={`w-full min-h-[300px] sm:min-h-[340px] rounded-[32px] shadow-sm flex flex-col items-center justify-center p-6 lg:p-8 text-center cursor-pointer relative overflow-hidden select-none transition-all duration-300 ${
            flipped 
              ? "bg-[#5A5A40] border border-[#4A4A30] text-white [transform:rotateX(0deg)]" 
              : "bg-white border border-[#E0E0D5] text-[#2A2A20] [transform:rotateX(0deg)]"
          }`}
        >
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none z-20">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className={`pointer-events-auto p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${flipped ? 'text-white/80' : 'text-[#8E8E80]'}`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMastered(word.id); onClose(); }}
                className={`pointer-events-auto p-2 rounded-full transition-colors ${flipped ? 'bg-green-400/20 text-green-300 hover:bg-green-400/30' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute top-0 left-0 w-full h-1.5 flex bg-[#F9F9F4] z-10 pointer-events-none">
                <div className="h-full bg-green-500" style={{ width: `${(word.level / 5) * 100}%` }} />
            </div>

          {!flipped ? (
            <>
              {(word.wordType || word.cefrLevel || word.theme) && (
                <div className="flex items-center justify-center gap-2 mb-4 mt-8">
                  {word.wordType && (
                    <span className="text-[9px] uppercase tracking-widest bg-[#5A5A40]/10 text-[#5A5A40] px-2.5 py-0.5 rounded-full font-bold">
                      {word.wordType}
                    </span>
                  )}
                  {(word.cefrLevel || word.theme) && (
                    <span className="text-[10px] text-[#8E8E80] opacity-80 font-medium">
                      {word.cefrLevel ? word.cefrLevel : ""}{word.cefrLevel && word.theme ? " - " : ""}{word.theme ? word.theme : ""}
                    </span>
                  )}
                </div>
              )}
              <span className="text-[10px] uppercase tracking-widest text-[#8E8E80] mb-2 font-bold">German</span>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#2A2A20] leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                {displayGerman}
              </h3>
            </>
          ) : (
            <div className="w-full flex flex-col items-center justify-center mt-6">
              <span className="text-[10px] uppercase tracking-widest opacity-60 mb-2 font-bold text-white/80">English</span>
              <h3 className="text-2xl sm:text-3xl font-serif text-white mb-4 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                {word.english}
              </h3>

              {word.wordType === "verb" && (word.present || word.preterite || word.perfect) && (
                <div className="mt-2 mb-4 p-3 bg-white/10 rounded-2xl w-full text-left font-sans text-white/95 border border-white/5 shadow-inner">
                  <div className="grid grid-cols-4 gap-1 text-[9px] uppercase font-bold tracking-wider opacity-70 mb-1.5 border-b border-white/10 pb-1 text-center">
                    <div>Infinitiv</div>
                    <div>Präsens</div>
                    <div>Präteritum</div>
                    <div>Perfekt</div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] sm:text-[11px] md:text-xs text-center font-serif leading-tight">
                    <div className="break-words font-bold italic">{word.german}</div>
                    <div className="break-words">{cleanConjugation(word.present)}</div>
                    <div className="break-words">{cleanConjugation(word.preterite)}</div>
                    <div className="break-words">{cleanConjugation(word.perfect)}</div>
                  </div>
                </div>
              )}

              {word.examples && word.examples.length > 0 && (
                <div className="mt-2 pt-3 border-t border-opacity-20 border-white w-full text-white flex flex-col items-center">
                  <p className="text-[13px] sm:text-sm font-serif italic text-white/90 leading-relaxed max-w-xs text-center">
                    "{word.examples[0]}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 md:-right-12 md:top-0 p-2 bg-white text-[#2A2A20] rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
