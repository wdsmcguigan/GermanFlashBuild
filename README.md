# Klarheit — German Vocabulary Builder

A minimalist, elegant full-stack web application designed for learning German vocabulary using spaced repetition. Klarheit empowers you to easily import vocabulary lists, extract words from images using AI, and study efficiently through an intuitive flashcard interface.

**[🌐 Live Demo: Try Klarheit Here](https://klarheit-607952188632.us-west2.run.app/)**

## Features

- **Spaced Repetition Flashcards:** Study intelligently as the app calculates the optimal review intervals based on your recall.
- **Smart Imports:** Paste a list of English or German words and the system automatically translates, extracts grammatical data, and creates flashcards.
- **Image Vocabulary Extraction:** Upload an image of text, a mind map, or a whiteboard, and AI extracts the vocabulary words, automatically recognizing nouns, verbs, and giving you example sentences. 
- **Grammar Intelligence:** Automatically categorizes words into nouns, verbs, adjectives, etc. It provides genders, plural forms for nouns, and present, preterite, and perfect tenses for verbs.

## Built With

- React & Vite
- TypeScript
- Tailwind CSS
- Express (Node.js)
- Google Gemini API (for intelligent translation and OCR extraction)

## Getting Started

To run the application locally:

1. Clone the repository.
2. Ensure you have `node` installed.
3. Add a `.env` file based on `.env.example` and include your `GEMINI_API_KEY`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

Enjoy building your German _Wortschatz_!
