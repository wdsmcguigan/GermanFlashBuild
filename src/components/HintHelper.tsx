import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Lightbulb, Loader2, WifiOff } from "lucide-react";
import { VocabWord } from "../types";
import { motion, AnimatePresence } from "motion/react";

/* ----------------------------- Brand tokens ----------------------------- */
const C = {
  olive: "#5A5A40",
  oliveDark: "#4A4A30",
  ink: "#2A2A20",
  muted: "#8E8E80",
  faint: "#B0B0A5",
  cream: "#F5F5F0",
  paper: "#F9F9F4",
  border: "#E0E0D5",
  amber: "#B45309",
  amberBg: "#FEF3C7",
  amberBorder: "#FDE68A",
};
const serif = { fontFamily: "Georgia, serif" };

function germanExampleOf(word: VocabWord): string | null {
  const ex = word.examples && word.examples[0];
  if (!ex) return null;
  const parts = ex.split(/ - | \u2013 | \u2014 /);
  return parts[0] ? parts[0].trim() : ex.trim();
}

function letterShape(english: string): string {
  const first = english
    .split(",")[0]
    .replace(/^to\s+/i, "")
    .trim();
  if (!first) return "?";
  return (
    first[0] +
    " " +
    Array.from(first.slice(1))
      .map((ch) => (ch === " " ? "·" : "‿"))
      .join(" ")
  );
}

export function normalizeLemma(word: string): string | null {
  let w = (word || "").trim();
  w = w.replace(/^(der|die|das)\s+/i, "");
  w = w.replace(/^sich\s+/i, "");
  w = w.replace(/[.,!?;:\u2026]+$/g, "").trim();
  if (!w || /\s/.test(w)) return null;
  return w;
}

function boldTargetWord(sentence: string | null, word: VocabWord) {
  if (!sentence) return null;
  const lemma =
    normalizeLemma(word.german) || word.german.split(/\s+/).pop() || "";
  const stem = lemma.toLowerCase().slice(0, Math.min(4, lemma.length));
  if (!stem) return <span>{sentence}</span>;
  return sentence.split(/(\s+)/).map((token, i) => {
    const clean = token.toLowerCase().replace(/[.,!?;:„“"]+/g, "");
    return clean && clean.startsWith(stem) ? (
      <strong key={i}>{token}</strong>
    ) : (
      token
    );
  });
}

type RungKey = "context" | "gegenteil" | "synonym" | "letter";

const RUNG_LABEL: Record<RungKey, string> = {
  context: "Kontext",
  gegenteil: "Gegenteil",
  synonym: "Synonym",
  letter: "Anfangsbuchstabe",
};

/** Owner's order: Kontext → Gegenteil → Synonym → Anfangsbuchstabe. Do not reorder. */
function buildLadder(word: VocabWord): RungKey[] {
  const fetched = !!word.hintsFetchedAt || (word as any).hintsFetched === true; // legacy compat
  const rungs: RungKey[] = [];
  if (germanExampleOf(word)) rungs.push("context");
  if (!fetched || (word.antonyms?.length ?? 0) > 0) rungs.push("gegenteil");
  if (!fetched || (word.synonyms?.length ?? 0) > 0) rungs.push("synonym");
  rungs.push("letter");
  return rungs;
}

interface HintHelperProps {
  word: VocabWord;
  onUpdateWord: (id: string, data: Partial<VocabWord>) => void;
  onHelpUsed: () => void;
  children?: React.ReactNode;
}

export function HintHelper({
  word,
  onUpdateWord,
  onHelpUsed,
  children,
}: HintHelperProps) {
  const [hintRung, setHintRung] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ladder = useMemo(() => buildLadder(word), [word]);
  const rung = Math.min(hintRung, ladder.length); // clamp after dissolution
  const hintUsed = rung > 0;

  const pressHint = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (loading) return; // ignore presses mid-fetch
      const next = rung >= ladder.length ? 0 : rung + 1;
      setHintRung(next);
      setError(null);
      if (next > 0) onHelpUsed();

      const rungKey = ladder[next - 1];
      const fetched =
        !!word.hintsFetchedAt || (word as any).hintsFetched === true;
      if (
        !(next > 0 && (rungKey === "gegenteil" || rungKey === "synonym")) ||
        fetched
      )
        return;

      setLoading(true);
      try {
        const res = await fetch("/api/word-hints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ german: word.german }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch hints");
        // CACHE ONLY ON SUCCESS — failure must never be stored as "no hints exist"
        onUpdateWord(word.id, {
          synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
          antonyms: Array.isArray(data.antonyms) ? data.antonyms : [],
          hintsFetchedAt: Date.now(),
        });
      } catch {
        setError("Couldn't reach the dictionaries — try again later.");
        // do NOT persist; fall through so the press still helps:
        setHintRung(ladder.length); // reveals remaining rungs incl. Anfangsbuchstabe
      } finally {
        setLoading(false);
      }
    },
    [rung, ladder, word, loading, onUpdateWord, onHelpUsed],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT" ||
        document.querySelector("[data-modal-open='true']")
      ) {
        return;
      }
      if (e.key === "h" || e.key === "H") {
        pressHint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pressHint]);

  // Rung Renderer
  const renderRung = (rungKey: RungKey, isCurrent: boolean) => {
    const baseStyle = {
      borderRadius: 16,
      padding: "10px 14px",
      border: `1px solid ${isCurrent ? C.amberBorder : C.border}`,
      background: isCurrent ? C.amberBg : "white",
      opacity: isCurrent ? 1 : 0.75,
    };
    const label = (
      <div className="flex items-center gap-2 mb-1">
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.15em",
            fontWeight: 700,
            textTransform: "uppercase",
            color: isCurrent ? C.amber : C.muted,
          }}
        >
          {RUNG_LABEL[rungKey]}
        </span>
      </div>
    );

    if (rungKey === "context") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={baseStyle}
          key={rungKey}
        >
          {label}
          <p
            style={{
              ...serif,
              fontStyle: "italic",
              fontSize: 14,
              color: C.ink,
            }}
          >
            „{boldTargetWord(germanExampleOf(word), word)}“
          </p>
        </motion.div>
      );
    }

    if (rungKey === "gegenteil" || rungKey === "synonym") {
      const isSyn = rungKey === "synonym";
      const fetched =
        !!word.hintsFetchedAt || (word as any).hintsFetched === true;
      const items = fetched ? (isSyn ? word.synonyms : word.antonyms) : null;
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={baseStyle}
          key={rungKey}
        >
          {label}
          {!fetched && loading ? (
            <p
              className="flex items-center gap-2"
              style={{ fontSize: 12, color: C.muted }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up
              OpenThesaurus / Wiktionary…
            </p>
          ) : items && items.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {items.map((t) =>
                  isSyn ? (
                    <span
                      key={t}
                      style={{
                        ...serif,
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "#ECFDF5",
                        color: "#065F46",
                        border: "1px solid #A7F3D0",
                      }}
                    >
                      ≈ {t}
                    </span>
                  ) : (
                    <span
                      key={t}
                      style={{
                        ...serif,
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "#FFF1F2",
                        color: "#9F1239",
                        border: "1px solid #FECDD3",
                      }}
                    >
                      ≠ {t}
                    </span>
                  ),
                )}
              </div>
              <p
                style={{
                  fontSize: 9,
                  color: C.faint,
                  marginTop: 6,
                  opacity: 0.8,
                }}
              >
                Quelle:{" "}
                <a
                  href="https://www.openthesaurus.de"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  OpenThesaurus
                </a>{" "}
                /{" "}
                <a
                  href="https://de.wiktionary.org"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Wiktionary
                </a>
              </p>
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
              Nothing found in the dictionaries.
            </p>
          )}
        </motion.div>
      );
    }

    // letter
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={baseStyle}
        key={rungKey}
      >
        {label}
        <p
          style={{
            fontSize: 18,
            letterSpacing: "0.05em",
            color: C.ink,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {letterShape(word.english)}
        </p>
      </motion.div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full">
        {children}
        <div
          className="absolute flex flex-col items-center pointer-events-auto z-40"
          style={{ bottom: -26, right: 32 }}
        >
          <button
            onClick={pressHint}
            title="Hilfe — each press reveals a little more (H)"
            className="rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{
              width: 52,
              height: 52,
              cursor: "pointer",
              background: hintUsed ? C.amber : "white",
              color: hintUsed ? "white" : C.muted,
              border: `1px solid ${hintUsed ? C.amber : C.border}`,
              boxShadow: "0 4px 12px rgba(42,42,32,0.15)",
            }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lightbulb
                className="w-5 h-5"
                style={hintUsed ? { fill: "rgba(255,255,255,0.3)" } : {}}
              />
            )}
          </button>
          <div className="flex gap-1.5 mt-2">
            {ladder.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: i < rung ? C.amber : "#D6D6CB",
                  transition: "background 0.15s ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="w-full flex flex-col gap-2 relative z-30"
        style={{ maxWidth: 480, marginTop: 44, minHeight: 45 }}
      >
        {error && (
          <p
            className="flex items-center gap-2 justify-center pointer-events-auto"
            style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}
          >
            <WifiOff className="w-3.5 h-3.5" /> {error} (nothing was cached —
            press again to retry)
          </p>
        )}
        {rung > 0 &&
          ladder.slice(0, rung).map((rungKey, i) => (
            <div key={rungKey} className="pointer-events-auto">
              {renderRung(rungKey, i === rung - 1)}
            </div>
          ))}
      </div>
    </div>
  );
}
