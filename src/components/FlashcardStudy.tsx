import React, { useState, useMemo, useEffect } from "react";
import { VocabWord } from "../types";
import { CheckCircle2, XCircle, RotateCcw, PartyPopper, ChevronLeft, ChevronRight, Dices, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WordEditModal } from "./WordEditModal";

interface FlashcardStudyProps {
  words: VocabWord[];
  onUpdateLevel: (id: string, knewIt: boolean) => void;
  onUpdateWord: (id: string, data: Partial<VocabWord>) => void;
  onRemoveWord: (id: string) => void;
}

export function FlashcardStudy({ words, onUpdateLevel, onUpdateWord, onRemoveWord }: FlashcardStudyProps) {
  const [flipped, setFlipped] = useState(false);
  const [overrideIndex, setOverrideIndex] = useState(0);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  
  const sortedWords = useMemo(() => {
    // Sort all words by nextReview date
    return [...words].sort((a,b) => a.nextReview - b.nextReview);
  }, [words]);

  const currentIndex = Math.min(Math.max(0, overrideIndex), Math.max(0, sortedWords.length - 1));
  const activeWord = sortedWords[currentIndex];

  const cleanConjugation = (val: string | undefined | null) => {
    if (!val) return "—";
    return val.replace(/^(er\/sie\/es|er|sie|es|ich|du|wir|ihr|sie\/Sie)\s+/i, "");
  };

  const dueCount = useMemo(() => {
    const now = Date.now();
    return sortedWords.filter(w => w.nextReview <= now).length;
  }, [sortedWords]);

  const masteredCount = useMemo(() => {
    return words.filter(w => w.level >= 5).length;
  }, [words]);

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
    // Move to next word automatically if assessing (which bumps nextReview so we can stay at index or move)
    // Actually when we update level, the word's nextReview changes so it moves to end of sorted words.
    // So staying at the same overrideIndex will essentially show the next word.
  };

  const skipForward = () => {
    setFlipped(false);
    setOverrideIndex(prev => (prev + 1) % sortedWords.length);
  };

  const skipBackward = () => {
    setFlipped(false);
    setOverrideIndex(prev => (prev - 1 + sortedWords.length) % sortedWords.length);
  };

  const skipRandom = () => {
    setFlipped(false);
    setOverrideIndex(Math.floor(Math.random() * sortedWords.length));
  };

  const handleMastered = () => {
    if (!activeWord) return;
    onUpdateWord(activeWord.id, { level: 5, nextReview: Date.now() + 60 * 60 * 1000 * 24 * 30 });
    setFlipped(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "SELECT") return;
      if (editingWordId) return;
      
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped(prev => !prev);
      } else if (e.key === "1") {
        handleResult(false);
      } else if (e.key === "2") {
        handleResult(true);
      } else if (e.key === "ArrowRight") {
        skipForward();
      } else if (e.key === "ArrowLeft") {
        skipBackward();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, activeWord, sortedWords.length, editingWordId]);

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

  if (!activeWord) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4 w-full h-full lg:min-h-0 min-h-[400px]">
      
      <div className="w-full max-w-lg mb-6 lg:mb-8 lg:mt-0" style={{ perspective: "1000px" }}>
        <div className="flex justify-center items-center gap-3 mb-4 text-[10px] uppercase tracking-widest text-[#8E8E80] font-bold">
          <span className="flex items-center gap-1.5">
            {dueCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] animate-pulse"></span>}
            {dueCount} due
          </span>
          <span className="text-neutral-300">•</span>
          <span className="text-green-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {masteredCount} mastered
          </span>
        </div>
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
            {/* Top Action Actions */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setEditingWordId(activeWord.id); }}
                className={`pointer-events-auto p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${flipped ? 'text-white/80' : 'text-[#8E8E80]'}`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleMastered(); }}
                className={`pointer-events-auto p-2 rounded-full transition-colors ${flipped ? 'bg-green-400/20 text-green-300 hover:bg-green-400/30' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

            {/* Level Indicator line */}
            <div className="absolute top-0 left-0 w-full h-1.5 flex bg-[#F9F9F4]">
                <div className="h-full bg-green-500" style={{ width: `${(activeWord.level / 5) * 100}%` }} />
            </div>

            {!flipped ? (
              <>
                {(activeWord.wordType || activeWord.cefrLevel || activeWord.theme) && (
                  <div className="flex items-center justify-center gap-2 mb-4 mt-8">
                    {activeWord.wordType && (
                      <span className="text-[9px] uppercase tracking-widest bg-[#5A5A40]/10 text-[#5A5A40] px-2.5 py-0.5 rounded-full font-bold">
                        {activeWord.wordType}
                      </span>
                    )}
                    {(activeWord.cefrLevel || activeWord.theme) && (
                      <span className="text-[10px] text-[#8E8E80] opacity-80 font-medium">
                        {activeWord.cefrLevel ? activeWord.cefrLevel : ""}{activeWord.cefrLevel && activeWord.theme ? " - " : ""}{activeWord.theme ? activeWord.theme : ""}
                      </span>
                    )}
                  </div>
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
              <div className="w-full flex flex-col items-center justify-center mt-6">
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
                    <div className="grid grid-cols-4 gap-1 text-[10px] sm:text-[11px] md:text-xs text-center font-serif leading-tight">
                      <div className="break-words font-bold italic" style={{ fontFamily: "Georgia, serif" }}>{activeWord.german}</div>
                      <div className="break-words">{cleanConjugation(activeWord.present)}</div>
                      <div className="break-words">{cleanConjugation(activeWord.preterite)}</div>
                      <div className="break-words">{cleanConjugation(activeWord.perfect)}</div>
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

      <div className="w-full max-w-lg flex flex-col gap-4">
        {/* Rating Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => handleResult(false)}
            className="flex-1 py-4 flex items-center justify-center gap-3 bg-white border border-[#E0E0D5] hover:bg-[#F9F9F4] text-[#4A4A40] rounded-full shadow-sm transition-all"
          >
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Need review<span className="hidden sm:inline"> (1)</span>
            </span>
          </button>
          <button
            onClick={() => handleResult(true)}
            className="flex-1 py-4 flex items-center justify-center gap-3 bg-[#5A5A40] text-white hover:bg-[#4A4A30] rounded-full shadow-sm transition-all"
          >
            <div className="bg-white rounded-full p-0.5 text-[#5A5A40]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">
              Got it<span className="hidden sm:inline"> (2)</span>
            </span>
          </button>
        </div>
        
        {/* Navigation / Skip Controls */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={skipBackward} className="p-2 text-[#8E8E80] hover:text-[#5A5A40] hover:bg-white rounded-full transition-colors shadow-sm bg-transparent" title="Previous word">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={skipRandom} className="flex items-center gap-2 px-4 py-2 text-[#8E8E80] hover:text-[#5A5A40] text-[10px] font-bold uppercase tracking-widest hover:bg-white rounded-full transition-colors shadow-sm bg-transparent" title="Random word">
            <Dices className="w-4 h-4" />
            Random
          </button>
          <button onClick={skipForward} className="p-2 text-[#8E8E80] hover:text-[#5A5A40] hover:bg-white rounded-full transition-colors shadow-sm bg-transparent" title="Next word">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {editingWordId && (
        <WordEditModal 
          word={activeWord} 
          onClose={() => setEditingWordId(null)} 
          onSave={onUpdateWord}
          onDelete={(id) => { setEditingWordId(null); onRemoveWord(id); }}
        />
      )}

    </div>
  );
}
