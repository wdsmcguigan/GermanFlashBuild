import React from "react";
import { AppView } from "../types";

interface HeaderProps {
  view: AppView;
  setView: (v: AppView) => void;
  wordCount: number;
}

export function Header({ view, setView, wordCount }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-10 py-4 sm:py-6 border-b border-[#E0E0D5] bg-[#F5F5F0] gap-4">
      <div className="flex items-center justify-between w-full sm:w-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">W</div>
          <h1 className="text-xl sm:text-2xl font-serif italic tracking-tight text-[#5A5A40]" style={{ fontFamily: "Georgia, serif" }}>Wortschatz</h1>
        </div>
        <div className="flex sm:hidden items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#E0E0D5] shadow-sm text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">
           {wordCount} Words
        </div>
      </div>
      <nav className="flex gap-4 sm:gap-8 text-xs sm:text-sm font-medium uppercase tracking-widest w-full sm:w-auto justify-center sm:justify-start">
        <button
          onClick={() => setView("list")}
          className={`transition-opacity cursor-pointer ${view === "list" ? "text-[#5A5A40] border-b-2 border-[#5A5A40] pb-1 font-bold" : "text-[#5A5A40] opacity-50 hover:opacity-100"}`}
        >
          Vocabulary List
        </button>
        <button
          onClick={() => setView("flashcards")}
          className={`transition-opacity cursor-pointer ${view === "flashcards" ? "text-[#5A5A40] border-b-2 border-[#5A5A40] pb-1 font-bold" : "text-[#5A5A40] opacity-50 hover:opacity-100"}`}
        >
          Flashcards
        </button>
        <button
          onClick={() => setView("progress")}
          className={`transition-opacity cursor-pointer ${view === "progress" ? "text-[#5A5A40] border-b-2 border-[#5A5A40] pb-1 font-bold" : "text-[#5A5A40] opacity-50 hover:opacity-100"}`}
        >
          Progress
        </button>
      </nav>
      <div className="hidden sm:flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-[#E0E0D5] shadow-sm text-xs font-semibold uppercase tracking-wider text-[#5A5A40]">
        <span className="w-2 h-2 rounded-full bg-green-500"></span> {wordCount} Words Mastery
      </div>
    </header>
  );
}
