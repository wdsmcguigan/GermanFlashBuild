export interface VocabWord {
  id: string;
  german: string;
  english: string;
  examples?: string[];
  level: number; // Spaced repetition level (1-5)
  nextReview: number; // Timestamp
}

export type AppView = "list" | "flashcards";
