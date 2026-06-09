import React, { useState } from "react";
import { Header } from "./components/Header";
import { VocabBuilder } from "./components/VocabBuilder";
import { FlashcardStudy } from "./components/FlashcardStudy";
import { ProgressDashboard } from "./components/ProgressDashboard";
import { useVocab } from "./useVocab";
import { AppView } from "./types";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from "lucide-react";

export default function App() {
  const { 
    words, 
    loading, 
    addTranslatedWords, 
    removeWord, 
    updateWord,
    clearAllWords, 
    updateWordLevel, 
    importWords, 
    addPreTranslatedWords,
    notifications,
    addNotification,
    removeNotification
  } = useVocab();
  const [view, setView] = useState<AppView>("list");

  return (
    <div className="h-[100dvh] bg-[#F5F5F0] flex flex-col text-[#4A4A40] overflow-hidden relative" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <Header view={view} setView={setView} wordCount={words.length} />
      
      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-4 lg:p-8">
        {view === "list" ? (
          <VocabBuilder
            words={words}
            loading={loading}
            onAddWords={addTranslatedWords}
            onRemoveWord={removeWord}
            onUpdateWord={updateWord}
            onClearAllWords={clearAllWords}
            onImportWords={importWords}
            onAddPreTranslatedWords={addPreTranslatedWords}
            onAddNotification={addNotification}
          />
        ) : view === "flashcards" ? (
          <FlashcardStudy 
            words={words}
            onUpdateLevel={updateWordLevel}
            onUpdateWord={updateWord}
            onRemoveWord={removeWord}
          />
        ) : (
          <ProgressDashboard words={words} />
        )}
      </main>

      {/* Floating Elegant Notifications Layer */}
      <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {notifications?.map((n) => {
            const isSuccess = n.type === "success";
            const isWarning = n.type === "warning";
            const isError = n.type === "error";

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                layout
                className={`pointer-events-auto p-4 rounded-xl border flex items-start gap-3 shadow-lg ${
                  isSuccess ? "bg-white border-green-150 text-green-800 shadow-green-500/5" :
                  isWarning ? "bg-white border-amber-150 text-amber-800 shadow-amber-500/5" :
                  isError ? "bg-white border-red-150 text-red-800 shadow-red-500/5" :
                  "bg-white border-[#E0E0D5] text-[#4A4A40] shadow-neutral-500/5"
                }`}
              >
                {/* Visual Icon */}
                <span className="shrink-0 mt-0.5">
                  {isSuccess && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {isWarning && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {isError && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {!isSuccess && !isWarning && !isError && <Info className="w-5 h-5 text-blue-500" />}
                </span>

                {/* Text Content */}
                <div className="flex-1 space-y-0.5">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider">{n.title}</h4>
                  <p className="text-xs text-[#8E8E80] leading-normal">{n.message}</p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => removeNotification(n.id)}
                  className="shrink-0 text-neutral-300 hover:text-neutral-500 p-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

