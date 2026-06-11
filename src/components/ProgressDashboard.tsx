import React, { useMemo, useState, useEffect, useRef } from "react";
import { VocabWord } from "../types";
import { Award, BookOpen, GraduationCap, TrendingUp, CheckSquare, Layers, HelpCircle, CheckCircle, X, Play } from "lucide-react";
import { getCategoryBadgeStyles } from "./VocabBuilder";

interface ProgressDashboardProps {
  words: VocabWord[];
  onStartTest: (category: "all" | "new" | "learning" | "mastered") => void;
}

export function ProgressDashboard({ words, onStartTest }: ProgressDashboardProps) {
  const [expandedCategory, setExpandedCategory] = useState<"New" | "Learning" | "Mastered" | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.list-container') || target.closest('.metric-button')) {
        return;
      }
      setExpandedCategory(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const expandedWords = useMemo(() => {
    if (!expandedCategory) return [];
    if (expandedCategory === "New") return words.filter((w) => (w.level || 1) <= 1);
    if (expandedCategory === "Learning") return words.filter((w) => (w.level || 1) > 1 && (w.level || 1) < 5);
    if (expandedCategory === "Mastered") return words.filter((w) => (w.level || 1) >= 5);
    return [];
  }, [expandedCategory, words]);

  // Metric calculations
  const totalCount = words.length;

  const stats = useMemo(() => {
    let newCount = 0;      // Level 1
    let learningCount = 0; // Level 2-4
    let masteredCount = 0; // Level 5

    words.forEach((w) => {
      if (w.level >= 5) {
        masteredCount++;
      } else if (w.level > 1) {
        learningCount++;
      } else {
        newCount++;
      }
    });

    const masteryRate = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
    const learningRate = totalCount > 0 ? Math.round((learningCount / totalCount) * 100) : 0;
    const newRate = totalCount > 0 ? Math.round((newCount / totalCount) * 100) : 0;

    return {
      newCount,
      learningCount,
      masteredCount,
      masteryRate,
      learningRate,
      newRate,
    };
  }, [words]);

  // CEFR Distribution
  const cefrStats = useMemo(() => {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const counts: Record<string, { total: number; mastered: number }> = {};
    
    levels.forEach((l) => {
      counts[l] = { total: 0, mastered: 0 };
    });

    let withCefr = 0;
    words.forEach((w) => {
      if (w.cefrLevel) {
        const lvl = w.cefrLevel.toUpperCase().trim();
        if (counts[lvl]) {
          counts[lvl].total++;
          if (w.level >= 5) {
            counts[lvl].mastered++;
          }
          withCefr++;
        }
      }
    });

    return {
      distribution: levels.map((l) => ({
        level: l,
        total: counts[l].total,
        mastered: counts[l].mastered,
        percentage: totalCount > 0 ? Math.round((counts[l].total / totalCount) * 100) : 0,
      })),
      hasCefrData: withCefr > 0,
    };
  }, [words, totalCount]);

  // Category Word Type Breakdown
  const categoryStats = useMemo(() => {
    const counts: Record<string, { total: number; mastered: number }> = {};
    
    words.forEach((w) => {
      const cat = w.wordType ? w.wordType.trim().toLowerCase() : "other";
      if (!counts[cat]) {
        counts[cat] = { total: 0, mastered: 0 };
      }
      counts[cat].total++;
      if (w.level >= 5) {
        counts[cat].mastered++;
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        total: data.total,
        mastered: data.mastered,
        percentage: totalCount > 0 ? Math.round((data.total / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // top 5
  }, [words, totalCount]);

  if (totalCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center w-full">
        <div className="w-16 h-16 bg-[#F9F9F4] rounded-2xl flex items-center justify-center text-[#5A5A40] mb-4 border border-[#E0E0D5]">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-serif text-[#2A2A20]" style={{ fontFamily: "Georgia, serif" }}>No progress tracked yet</h2>
        <p className="text-[#8E8E80] mt-2 max-w-sm mx-auto">Add vocabulary words and practice with flashcards to build your learning profile.</p>
      </div>
    );
  }

  // Circular progress properties
  const radius = 64;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (stats.masteryRate / 100) * circumference;

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 py-2 lg:py-6 space-y-6 custom-scrollbar">
      
      {/* Title */}
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-2xl font-serif text-[#5A5A40] italic font-normal" style={{ fontFamily: "Georgia, serif" }}>
          Your Learning Progress
        </h2>
        <p className="text-xs text-[#8E8E80] uppercase tracking-wider font-bold">
          Spaced Repetition Mastery Distribution
        </p>
      </div>

      {/* Grid of Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Deck Size */}
        <div className="relative bg-white border border-[#E0E0D5] rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-[#F5F5F0] rounded-2xl flex items-center justify-center text-[#5A5A40] shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block">Total Deck</span>
            <span className="text-2xl font-serif font-bold text-[#2A2A20]" style={{ fontFamily: "Georgia, serif" }}>{totalCount}</span>
            <span className="text-[10px] text-[#8E8E80] block mt-0.5">words practicing</span>
          </div>
          {totalCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTest("all");
              }}
              className="absolute top-4 right-4 px-2.5 py-1 bg-[#5A5A40]/10 hover:bg-[#5A5A40] hover:text-white text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 border border-[#5A5A40]/20 shadow-sm"
              title="Test all words"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test</span>
            </button>
          )}
        </div>

        {/* New Ratio */}
        <div 
          onClick={(e) => { e.stopPropagation(); setExpandedCategory(expandedCategory === "New" ? null : "New"); }}
          className={`relative metric-button border rounded-3xl p-5 shadow-sm flex items-center gap-4 cursor-pointer transition-colors ${expandedCategory === "New" ? "bg-[#F9F9F4] border-[#D0D0C5]" : "bg-white border-[#E0E0D5] hover:border-[#D0D0C5] hover:bg-[#F9F9F4]"}`}
        >
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 pointer-events-none">
            <Layers className="w-6 h-6" />
          </div>
          <div className="pointer-events-none">
            <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block">New Words</span>
            <span className="text-2xl font-serif font-bold text-blue-600" style={{ fontFamily: "Georgia, serif" }}>{stats.newCount}</span>
            <span className="text-[10px] text-[#8E8E80] block mt-0.5">{stats.newRate}% of whole deck</span>
          </div>
          {stats.newCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTest("new");
              }}
              className="absolute top-4 right-4 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 border border-blue-500/20 shadow-sm"
              title="Test New words"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test</span>
            </button>
          )}
        </div>

        {/* Learning */}
        <div 
          onClick={(e) => { e.stopPropagation(); setExpandedCategory(expandedCategory === "Learning" ? null : "Learning"); }}
          className={`relative metric-button border rounded-3xl p-5 shadow-sm flex items-center gap-4 cursor-pointer transition-colors ${expandedCategory === "Learning" ? "bg-[#F9F9F4] border-[#D0D0C5]" : "bg-white border-[#E0E0D5] hover:border-[#D0D0C5] hover:bg-[#F9F9F4]"}`}
        >
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 pointer-events-none">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="pointer-events-none">
            <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block">Learning</span>
            <span className="text-2xl font-serif font-bold text-amber-600" style={{ fontFamily: "Georgia, serif" }}>{stats.learningCount}</span>
            <span className="text-[10px] text-[#8E8E80] block mt-0.5">{stats.learningRate}% in active rotation</span>
          </div>
          {stats.learningCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTest("learning");
              }}
              className="absolute top-4 right-4 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 border border-amber-500/20 shadow-sm"
              title="Test Learning words"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test</span>
            </button>
          )}
        </div>

        {/* Mastered */}
        <div 
          onClick={(e) => { e.stopPropagation(); setExpandedCategory(expandedCategory === "Mastered" ? null : "Mastered"); }}
          className={`relative metric-button border rounded-3xl p-5 shadow-sm flex items-center gap-4 cursor-pointer transition-colors ${expandedCategory === "Mastered" ? "bg-[#F9F9F4] border-[#D0D0C5]" : "bg-white border-[#E0E0D5] hover:border-[#D0D0C5] hover:bg-[#F9F9F4]"}`}
        >
          <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-700 shrink-0 pointer-events-none">
            <Award className="w-6 h-6" />
          </div>
          <div className="pointer-events-none">
            <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block">Mastered</span>
            <span className="text-2xl font-serif font-bold text-green-700" style={{ fontFamily: "Georgia, serif" }}>{stats.masteredCount}</span>
            <span className="text-[10px] text-[#8E8E80] block mt-0.5">{stats.masteryRate}% at top durability</span>
          </div>
          {stats.masteredCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTest("mastered");
              }}
              className="absolute top-4 right-4 px-2.5 py-1 bg-green-500/10 hover:bg-green-700 hover:text-white text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 border border-green-500/20 shadow-sm"
              title="Test Mastered words"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Category List View */}
      {expandedCategory && (
        <div className="list-container bg-white border border-[#E0E0D5] rounded-[32px] overflow-hidden shadow-sm animate-fade-in relative z-10 w-full mb-6">
          <div className="p-4 border-b border-[#F5F5F0] bg-[#FDFDFB] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-widest pl-2">
              {expandedCategory} Words ({expandedWords.length})
            </h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setExpandedCategory(null); }} 
              className="p-2 text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-full hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar w-full">
            {expandedWords.length === 0 ? (
              <div className="p-8 text-center text-[#8E8E80] text-sm italic font-serif" style={{ fontFamily: "Georgia, serif" }}>
                No words in this category.
              </div>
            ) : (
              expandedWords.map((w) => {
                const badge = getCategoryBadgeStyles(w.wordType);
                return (
                  <div 
                    key={w.id} 
                    className="flex items-center px-4 py-3 lg:px-6 lg:py-4 bg-white hover:bg-[#F9F9F4] rounded-xl lg:rounded-2xl transition-colors group"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Mastery Indicator */}
                        <div className="relative flex items-center justify-center opacity-40 shrink-0" title={`Mastery: ${w.level || 1}/5`}>
                          <svg viewBox="0 0 12 12" height="12" width="12" className="-rotate-90">
                            <circle stroke="#E0E0D5" fill="transparent" strokeWidth="2" r="5" cx="6" cy="6" />
                            <circle
                              stroke={(w.level || 1) >= 5 ? "#22c55e" : "#5A5A40"}
                              fill="transparent"
                              strokeWidth="2"
                              strokeDasharray={`${2 * Math.PI * 5}`}
                              style={{ strokeDashoffset: `${2 * Math.PI * 5 * (1 - ((w.level || 1) / 5))}` }}
                              strokeLinecap="round"
                              r="5"
                              cx="6"
                              cy="6"
                            />
                          </svg>
                        </div>
                        <span className="text-base lg:text-lg font-serif text-[#2A2A20]" style={{ fontFamily: "'Georgia', serif" }}>
                          {w.wordType === "noun" && w.plural && !w.plural.toLowerCase().includes("no plural")
                            ? `${w.german}, ${w.plural}`
                            : w.german}
                        </span>
                        {w.wordType && (
                          <span className={`text-[8px] uppercase tracking-wider px-1 py-0.5 rounded font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        )}
                        {(w.cefrLevel || w.theme) && (
                          <span className="text-[10px] text-[#8E8E80] opacity-80 font-medium ml-1">
                            {w.cefrLevel ? w.cefrLevel : ""}{w.cefrLevel && w.theme ? " - " : ""}{w.theme ? w.theme : ""}
                          </span>
                        )}
                      </div>
                      {w.wordType === "verb" && (w.present || w.preterite || w.perfect) && (
                        <span className="text-[10px] text-[#8E8E80] font-mono mt-0.5 truncate">
                          {w.present || "—"} • {w.preterite || "—"} • {w.perfect || "—"} 
                          <span className="text-[8px] uppercase tracking-wider bg-[#5A5A40]/10 px-1 py-0.5 rounded font-bold text-[#5A5A40] ml-1">
                            {w.verbClass || "verb"}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-2 lg:gap-3 shrink-0">
                      <span className="text-[10px] text-[#8E8E80] opacity-80 uppercase font-medium max-w-[120px] truncate">{w.english}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Stats Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Side: Circular Mastery Ring Dashboard Widget */}
        <div className="bg-white border border-[#E0E0D5] rounded-[32px] p-6 shadow-sm md:col-span-2 flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block">Overall Mastery Rate</span>
          
          {/* Radial Progress SVG */}
          <div className="relative flex items-center justify-center">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="transform -rotate-90"
            >
              <circle
                stroke="#F0F0E5"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke="#5A5A40"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-serif font-bold text-[#2A2A20]" style={{ fontFamily: "Georgia, serif" }}>
                {stats.masteryRate}%
              </span>
              <span className="text-[8px] text-[#8E8E80] font-mono tracking-wider uppercase font-bold mt-0.5">Retained</span>
            </div>
          </div>

          <div className="space-y-1.5 w-full pt-1">
            <div className="flex justify-between items-center text-xs text-[#2A2A20]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5A5A40]"></span>
                <span className="font-medium text-[#4A4A40]">Mastered (Lvl 5)</span>
              </div>
              <span className="font-bold">{stats.masteredCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#2A2A20]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="font-medium text-[#4A4A40]">Learning (Lvl 2-4)</span>
              </div>
              <span className="font-bold">{stats.learningCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#2A2A20]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300"></span>
                <span className="font-medium text-[#4A4A40]">New (Lvl 1)</span>
              </div>
              <span className="font-bold">{stats.newCount}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Progressive Stack Bar & Dynamic breakdown lists */}
        <div className="bg-white border border-[#E0E0D5] rounded-[32px] p-6 shadow-sm md:col-span-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block mb-4">Deck Progression Share</span>
            
            {/* Elegant Stacked Progress Bar */}
            <div className="w-full h-7 bg-[#F5F5F0] rounded-full overflow-hidden flex mb-2 border border-[#E0E0D5]/60">
              <div 
                style={{ width: `${stats.masteryRate}%` }} 
                className="bg-[#5A5A40] h-full relative group transition-all"
                title={`Mastered: ${stats.masteryRate}%`}
              />
              <div 
                style={{ width: `${stats.learningRate}%` }} 
                className="bg-amber-400 h-full relative group transition-all"
                title={`Learning: ${stats.learningRate}%`}
              />
              <div 
                style={{ width: `${stats.newRate}%` }} 
                className="bg-blue-300 h-full relative group transition-all"
                title={`New: ${stats.newRate}%`}
              />
            </div>

            <p className="text-xs text-[#8E8E80] mt-3 leading-relaxed">
              Words are shifted between boxes based on your review results. Standard intervals automatically space flashcard recurrences relative to each box level.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F5F5F0] grid grid-cols-3 text-center gap-2">
            <div className="p-2.5 bg-[#FDFDFB] rounded-2xl border border-[#F5F5F0]">
              <span className="text-[9px] font-mono uppercase text-[#8E8E80] block font-bold">New</span>
              <span className="text-base font-serif font-bold text-[#4A4A40] inline-flex items-center gap-1" style={{ fontFamily: "Georgia, serif" }}>
                1 <span className="text-[10px] font-sans font-normal opacity-60">day</span>
              </span>
              <span className="text-[8px] text-[#8E8E80] block mt-0.5">interval</span>
            </div>
            <div className="p-2.5 bg-[#FDFDFB] rounded-2xl border border-[#F5F5F0]">
              <span className="text-[9px] font-mono uppercase text-[#8E8E80] block font-bold">Learning</span>
              <span className="text-base font-serif font-bold text-[#4A4A40] inline-flex items-center gap-1" style={{ fontFamily: "Georgia, serif" }}>
                3-10 <span className="text-[10px] font-sans font-normal opacity-60">days</span>
              </span>
              <span className="text-[8px] text-[#8E8E80] block mt-0.5">interval</span>
            </div>
            <div className="p-2.5 bg-[#FDFDFB] rounded-2xl border border-[#F5F5F0]">
              <span className="text-[9px] font-mono uppercase text-[#8E8E80] block font-bold">Mastered</span>
              <span className="text-base font-serif font-bold text-green-700 inline-flex items-center gap-1" style={{ fontFamily: "Georgia, serif" }}>
                30 <span className="text-[10px] font-sans font-normal opacity-60">days</span>
              </span>
              <span className="text-[8px] text-[#8E8E80] block mt-0.5">interval</span>
            </div>
          </div>
        </div>

      </div>

      {/* Secondary Level Breakdowns: CEFR Levels and top Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CEFR Level distribution */}
        <div className="bg-white border border-[#E0E0D5] rounded-[32px] p-6 shadow-sm space-y-4">
          <div className="justify-between flex items-center">
            <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block">CEFR Level Progression</span>
            <span className="text-[9px] font-mono bg-[#F5F5F0] text-[#5A5A40] px-2 py-0.5 rounded uppercase font-bold">Common European Framework</span>
          </div>

          {!cefrStats.hasCefrData ? (
            <div className="py-8 flex flex-col items-center justify-center text-[#E0E0D5] text-center border border-dashed border-[#F5F5F0] rounded-2xl">
              <Layers className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs font-serif italic text-[#8E8E80]" style={{ fontFamily: "Georgia, serif" }}>
                Add vocabulary with CEFR levels (e.g., A1, B2) to populate this matrix.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cefrStats.distribution.map((item) => {
                const ratio = item.total > 0 ? (item.mastered / item.total) * 100 : 0;
                return (
                  <div key={item.level} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#2A2A20]">{item.level}</span>
                      <span className="text-[#8E8E80] text-[10px]">
                        {item.total > 0 ? `${item.mastered} of ${item.total} mastered` : "0 words"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F5F5F0] rounded-full overflow-hidden border border-[#E0E0D5]/40 relative">
                      {item.total > 0 ? (
                        <>
                          <div 
                            style={{ width: `${(item.total / totalCount) * 100}%` }}
                            className="absolute top-0 left-0 h-full bg-[#E0E0D5]"
                          />
                          <div 
                            style={{ width: `${(item.mastered / totalCount) * 100}%` }}
                            className="absolute top-0 left-0 h-full bg-[#5A5A40] transition-all"
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Categories Distribution */}
        <div className="bg-white border border-[#E0E0D5] rounded-[32px] p-6 shadow-sm space-y-4">
          <span className="text-[10px] text-[#8E8E80] uppercase font-bold tracking-widest block">Top Categories</span>

          <div className="space-y-4">
            {categoryStats.length === 0 ? (
              <p className="text-xs italic text-[#8E8E80] font-serif" style={{ fontFamily: "Georgia, serif" }}>No categories tracked yet.</p>
            ) : (
              categoryStats.map((cat) => {
                const ratio = cat.total > 0 ? Math.round((cat.mastered / cat.total) * 100) : 0;
                return (
                  <div key={cat.name} className="flex items-center justify-between border-b border-[#F5F5F0] pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <span className="text-xs font-semibold text-[#2A2A20] block">{cat.name}</span>
                      <span className="text-[10px] text-[#8E8E80]">{cat.total} words added</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-serif font-bold text-[#5A5A40] block">{ratio}% Mastered</span>
                      <span className="text-[9px] uppercase tracking-wider text-[#8E8E80] block font-mono">
                        {cat.mastered}/{cat.total} Completed
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
