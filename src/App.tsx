import React, { useState } from "react";
import { Header } from "./components/Header";
import { VocabBuilder } from "./components/VocabBuilder";
import { FlashcardStudy } from "./components/FlashcardStudy";
import { useVocab } from "./useVocab";
import { AppView } from "./types";

export default function App() {
  const { words, loading, addTranslatedWords, removeWord, updateWordLevel, importWords } = useVocab();
  const [view, setView] = useState<AppView>("list");

  return (
    <div className="h-[100dvh] bg-[#F5F5F0] flex flex-col text-[#4A4A40] overflow-hidden" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <Header view={view} setView={setView} wordCount={words.length} />
      
      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-4 lg:p-8">
        {view === "list" ? (
          <VocabBuilder
            words={words}
            loading={loading}
            onAddWords={addTranslatedWords}
            onRemoveWord={removeWord}
            onImportWords={importWords}
          />
        ) : (
          <FlashcardStudy 
            words={words}
            onUpdateLevel={updateWordLevel}
          />
        )}
      </main>
    </div>
  );
}
