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
  lektion?: string;
}

export type AppView = "list" | "flashcards";
