import React, { useState, useMemo, useEffect } from "react";
import { VocabWord } from "../types";
import { CheckCircle2, XCircle, RotateCcw, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FlashcardStudyProps {
  words: VocabWord[];
  onUpdateLevel: (id: string, knewIt: boolean) => void;
}

export function FlashcardStudy({ words, onUpdateLevel }: FlashcardStudyProps) {
  const [flipped, setFlipped] = useState(false);
  
  // Find words due for review: those where nextReview <= now
  // For this local demo, if none are strictly "due", we just take the oldest ones loosely
  const dueWords = useMemo(() => {
    const now = Date.now();
    const due = words.filter(w => w.nextReview <= now);
    if (due.length > 0) return due.sort((a,b) => a.nextReview - b.nextReview);
    // If no one is strictly due but they want to study, just give them some lowest level words
    return [...words].sort((a, b) => a.level - b.level);
  }, [words]);

  const activeWord = dueWords[0];

  const displayGerman = useMemo(() => {
    if (!activeWord) return "";
    if (activeWord.wordType === "noun" && activeWord.plural) {
      if (activeWord.plural.toLowerCase().includes("no plural")) {
        return activeWord.german;
      }
      return `${activeWord.german}, ${activeWord.plural}`;
    }
    return activeWord.german;
  }, [activeWord]);

  const handleResult = (knewIt: boolean) => {
    if (!activeWord) return;
    setFlipped(false);
    onUpdateLevel(activeWord.id, knewIt);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped(prev => !prev);
      } else if (e.key === "1") {
        handleResult(false);
      } else if (e.key === "2") {
        handleResult(true);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, activeWord]);

  if (words.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center w-full">
        <div className="w-16 h-16 bg-[#F9F9F4] rounded-2xl flex items-center justify-center text-[#5A5A40] mb-4 border border-[#E0E0D5]">
          <PartyPopper className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-serif text-[#2A2A20]" style={{ fontFamily: "Georgia, serif" }}>Your deck is empty</h2>
        <p className="text-[#8E8E80] mt-2">Head over to the Builder to add some words first.</p>
      </div>
    );
  }

  if (!activeWord) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center w-full">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4 border border-green-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif text-[#2A2A20]" style={{ fontFamily: "Georgia, serif" }}>All caught up!</h2>
          <p className="text-[#8E8E80] mt-2">You've successfully cleared your review queue.</p>
        </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4 w-full h-full lg:min-h-0 min-h-[400px]">
      
      <div className="absolute top-0 right-2 lg:top-8 lg:right-8 flex items-center gap-2 text-xs uppercase tracking-widest text-[#8E8E80] font-bold">
        <span className="w-2 h-2 rounded-full bg-[#5A5A40] animate-pulse"></span>
        {dueWords.length} due
      </div>

      <div className="w-full max-w-lg mb-6 lg:mb-8 mt-6 lg:mt-0" style={{ perspective: "1000px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeWord.id + (flipped ? "-back" : "-front")}
            initial={{ opacity: 0, rotateX: flipped ? -90 : 90, scale: 0.95 }}
            animate={{ opacity: 1, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, rotateX: flipped ? 90 : -90, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            onClick={() => setFlipped(!flipped)}
            className={`w-full min-h-[300px] sm:min-h-[340px] rounded-[32px] shadow-sm flex flex-col items-center justify-center p-6 lg:p-8 text-center cursor-pointer relative overflow-hidden select-none ${
              flipped 
                ? "bg-[#5A5A40] border border-[#4A4A30] text-white" 
                : "bg-white border border-[#E0E0D5] text-[#2A2A20] hover:scale-[1.01] transition-transform"
            }`}
          >
            {/* Level Indicator line */}
            <div className="absolute top-0 left-0 w-full h-1.5 flex bg-[#F9F9F4]">
                <div className="h-full bg-green-500" style={{ width: `${(activeWord.level / 5) * 100}%` }} />
            </div>

            {!flipped ? (
              <>
                {activeWord.wordType && (
                  <span className="text-[9px] uppercase tracking-widest bg-[#5A5A40]/10 text-[#5A5A40] px-2.5 py-0.5 rounded-full font-bold mb-4">
                    {activeWord.wordType}
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-widest text-[#8E8E80] mb-2 font-bold">German</span>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#2A2A20] leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                  {displayGerman}
                </h3>
                <p className="mt-8 text-xs text-[#8E8E80] flex items-center gap-2 italic">
                  <RotateCcw className="w-3.5 h-3.5" /> Tap to reveal English
                </p>
              </>
            ) : (
              <div className="w-full flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest opacity-60 mb-2 font-bold text-white/80">English</span>
                <h3 className="text-2xl sm:text-3xl font-serif text-white mb-4 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                  {activeWord.english}
                </h3>
                
                {/* Verb conjugation details table */}
                {activeWord.wordType === "verb" && (activeWord.present || activeWord.preterite || activeWord.perfect) && (
                  <div className="mt-2 mb-4 p-3 bg-white/10 rounded-2xl w-full text-left font-sans text-white/95 border border-white/5 shadow-inner">
                    <div className="grid grid-cols-4 gap-1 text-[9px] uppercase font-bold tracking-wider opacity-70 mb-1.5 border-b border-white/10 pb-1 text-center">
                      <div>Infinitiv</div>
                      <div>Präsens</div>
                      <div>Präteritum</div>
                      <div>Perfekt</div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs text-center font-serif leading-tight">
                      <div className="truncate font-bold italic" style={{ fontFamily: "Georgia, serif" }}>{activeWord.german}</div>
                      <div className="truncate">{activeWord.present || "—"}</div>
                      <div className="truncate">{activeWord.preterite || "—"}</div>
                      <div className="truncate">{activeWord.perfect || "—"}</div>
                    </div>
                    {activeWord.verbClass && (
                      <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-[10px]">
                        <span className="opacity-70 uppercase tracking-widest text-[9px]">Verb Type</span>
                        <span className="font-bold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded text-[9px]">
                          {activeWord.verbClass}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Removed noun singular and plural details */}

                {activeWord.examples && activeWord.examples.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-opacity-20 border-white w-full text-white flex flex-col items-center">
                    {(() => {
                      const example = activeWord.examples[0];
                      const parts = example.split(/ - | \u2013 | \u2014 /);
                      if (parts.length >= 2) {
                        return (
                          <>
                            <p className="text-[13px] sm:text-sm font-serif italic opacity-95 mb-1 max-w-xs leading-relaxed text-center">"{parts[0].trim()}"</p>
                            <p className="text-[11px] sm:text-xs font-sans opacity-75 max-w-xs leading-relaxed text-center">{parts.slice(1).join(" - ").trim()}</p>
                          </>
                        );
                      }
                      return <p className="text-[13px] sm:text-sm italic opacity-85 leading-relaxed max-w-xs mx-auto font-serif text-center">"{example}"</p>;
                    })()}
                  </div>
                )}

                <p className="mt-6 text-[10px] text-white/50 flex items-center gap-1.5 italic">
                  <RotateCcw className="w-3 h-3" /> Tap to toggle back to German
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-lg flex items-center justify-between gap-4">
        <button
          onClick={() => handleResult(false)}
          className="flex-1 py-4 flex items-center justify-center gap-3 bg-white border border-[#E0E0D5] hover:bg-[#F9F9F4] text-[#4A4A40] rounded-full shadow-sm transition-all"
        >
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-widest">Need review (1)</span>
        </button>
        <button
          onClick={() => handleResult(true)}
          className="flex-1 py-4 flex items-center justify-center gap-3 bg-[#5A5A40] text-white hover:bg-[#4A4A30] rounded-full shadow-sm transition-all"
        >
          <div className="bg-white rounded-full p-0.5 text-[#5A5A40]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Got it (2)</span>
        </button>
      </div>

      {/* Keyboard shortcuts hints */}
      <p className="mt-8 text-[10px] uppercase tracking-widest text-[#8E8E80] font-medium hidden sm:block">
        Pro tip: Use spacebar to flip, 1 or 2 to rate.
      </p>

    </div>
  );
}
