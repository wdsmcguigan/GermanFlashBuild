export interface VocabWord {
  id: string;
  german: string;
  english: string;
  examples?: string[];
  level: number; // Spaced repetition level (1-5)
  nextReview: number; // Timestamp
  wordType?: string; // noun, verb, adjective, adverb, etc.
  plural?: string; // plural representation e.g. "-en", "-e", "-", "-s", "¨-er"
  present?: string; // e.g. "er bricht ab"
  preterite?: string; // e.g. "brach ab"
  perfect?: string; // e.g. "hat abgebrochen" or "ist abgefahren"
  verbClass?: "regelmäßig" | "unregelmäßig" | "modal";
  // Additional Metadata
  cefrLevel?: string;
  theme?: string;
  lektion?: string;
  pinned?: boolean; // Pinned as extra important

  // Hint data (lazily fetched from free dictionaries, then cached)
  synonyms?: string[]; // German synonyms, e.g. ["begreifen", "kapieren"]
  antonyms?: string[]; // German antonyms (Gegenteile), e.g. ["missverstehen"]
  hintsFetchedAt?: number; // Date.now() when lookup completed (even if empty) — never re-fetch when set
}

export type AppView = "list" | "flashcards" | "progress";

export interface AppNotification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
}
