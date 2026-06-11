# Feature Brief: Progressive Hint "Lightbulb" (Hilfe — Synonym / Gegenteil)

Instructions for the coding agent building this feature in the Klarheit German flashcard app.
Everything in here has been verified against the actual codebase and live APIs — do not substitute
AI/LLM calls or alternative data sources.

---

## 1. What to build

A **floating lightbulb button outside the flashcard** in the study view
(`src/components/FlashcardStudy.tsx`). Each press reveals a progressively stronger hint for
recalling the meaning of the current German word, in this order:

1. **Beispiel** — the word's German example sentence (English half withheld)
2. **Synonyme** — German synonyms
3. **Gegenteil** — German antonyms
4. **First letter** — first letter + length of the English translation

### Hard constraints

- **No AI / LLM / Gemini calls.** Synonyms and antonyms come from the free APIs in §2.
- **No data migration.** The user has ~3000 words in `localStorage["german_vocab"]`. Only add
  *optional* fields to the `VocabWord` interface (`src/types.ts`); existing entries must load
  unchanged.
- **Fetch each word at most once, ever.** Cache results onto the word record (see §4.2).
- **SRS honesty rule:** the moment a hint is used on a card, the green "mark as mastered"
  button (`CheckCircle2`, top-right of the card in `FlashcardStudy.tsx`) is greyed out and
  disabled. It re-enables automatically when the user navigates to a different card.
- **Match the existing UI idioms:** Tailwind utility classes inline; palette olive `#5A5A40`,
  cream `#F9F9F4`, border `#E0E0D5`, muted text `#8E8E80`; Georgia serif for German words;
  `lucide-react` icons; `motion/react` for enter/exit animations; tiny uppercase
  `tracking-widest` labels.

---

## 2. Data sources (verified working — use exactly these)

### 2.1 OpenThesaurus — synonyms

```
GET https://www.openthesaurus.de/synonyme/search?q=<word>&format=application/json
```

- No API key. Sends `Access-Control-Allow-Origin: *` (verified), so it is callable directly
  from the browser.
- Response shape (verified with `q=glücklich`):

```json
{
  "synsets": [
    { "terms": [ {"term": "froh"}, {"term": "glücklich"}, {"term": "zufrieden"},
                 {"term": "happy", "level": "umgangssprachlich"} ] },
    { "terms": [ {"term": "angenehm"}, {"term": "erfreulich"}, "..." ] }
  ]
}
```

- Parsing: flatten `synsets[].terms[].term`; drop the looked-up word itself
  (case-insensitive); drop any term whose `level` is `"vulgär"`; dedupe; cap at 8.
- Rate limit ~60 requests/min per IP — irrelevant for one lazy lookup per button press, but do
  not bulk-prefetch the whole deck.
- **License: CC-BY-SA — attribution is required.** Whenever fetched synonyms/antonyms are
  displayed, show a tiny footer line:
  `Synonyms: OpenThesaurus.de (CC-BY-SA) · Wiktionary` with a link to https://www.openthesaurus.de.

### 2.2 German Wiktionary — antonyms (Gegenwörter) + extra synonyms

```
GET https://de.wiktionary.org/w/api.php?action=parse&page=<word>&prop=wikitext&format=json&formatversion=2&origin=*
```

- `origin=*` enables CORS for browser calls. No key.
- Extract from `response.parse.wikitext`: the lines following the `{{Gegenwörter}}` (and
  optionally `{{Synonyme}}`) section markers. Lines look like:

```
{{Gegenwörter}}
:[1–3] [[unglücklich]]
:[2] [[traurig]]
```

- Parsing rule: after the `{{SectionName}}` marker, take consecutive lines starting with `:`
  (stop at a blank line or the next `{{`), then collect link targets with
  `/\[\[([^\]|#]+)/g`; dedupe; cap at 8.
- A missing page returns HTTP 200 with an `error` object in the JSON — treat that as
  "no results", **not** as a failure.

### 2.3 Merge rule

- `synonyms` = OpenThesaurus results, topped up with Wiktionary `{{Synonyme}}` entries if
  OpenThesaurus returned fewer than ~5.
- `antonyms` = Wiktionary `{{Gegenwörter}}` entries (OpenThesaurus has no antonym data).
- Fire both requests in parallel (`Promise.allSettled`, ~5 s timeout each via
  `AbortSignal.timeout(5000)`). One source failing is fine — use the other and treat the
  lookup as successful.

---

## 3. Implementation options (pick one)

### Option A — frontend-only (RECOMMENDED)

Fetch both sources directly from the browser (CORS verified for both). Zero changes to
`server.ts`. Simplest to build, and keeps working if the app is ever published as a static
site without the Express backend.

### Option B — server proxy

Add `GET /api/word-hints?word=<term>` to `server.ts` (place it before the Vite middleware
mount), doing the fetching/merging of §2 server-side and returning
`200 { synonyms: string[], antonyms: string[] }`, or `502 { error: "sources_unavailable" }`
only when **both** sources fail. Choose this only if you want to hide third-party calls from
the client or add server-side caching later. Note the Express server is the app's only
server (Vite runs as middleware on the same port), so the frontend can call it as
`/api/word-hints` like the existing `/api/translate`.

Everything in §4 applies identically to both options.

---

## 4. Shared spec

### 4.1 Data model (`src/types.ts`)

Add to `VocabWord` — optional fields only:

```ts
synonyms?: string[];       // German synonyms, fetched once (or hand-entered)
antonyms?: string[];       // German antonyms (Gegenwörter)
hintsFetchedAt?: number;   // timestamp; its presence means "lookup completed, even if
                           // results were empty" — never re-fetch when set
```

### 4.2 Caching

Persist fetched results with the existing `updateWord(id, Partial<VocabWord>)` from
`src/useVocab.ts` (it spreads the partial onto the word and saves the whole array to
localStorage — already passed into `FlashcardStudy` as the `onUpdateWord` prop):

- Successful lookup (even with empty results):
  `onUpdateWord(word.id, { synonyms, antonyms, hintsFetchedAt: Date.now() })`
- Failed lookup (both sources unreachable): persist **nothing**, so it can be retried later.

### 4.3 Lemma normalization (before any API lookup)

- `wordType === "phrase"` → skip API lookup entirely.
- Strip a leading article: `/^(der|die|das)\s+/i` (nouns are stored as `"der Tisch"`).
- Strip leading reflexive `sich`: `/^sich\s+/i`. Trim trailing punctuation.
- If the remainder still contains a space (e.g. `"zur Verfügung stehen"`) → treat like a
  phrase and skip the API rungs.

### 4.4 The press ladder (exact logic)

Each press reveals the **first not-yet-revealed rung that has data**; rungs without data are
skipped silently and never consume a press. Every press also triggers the mastered-button
disable (§4.6). Ignore presses while a fetch is in flight.

1. **Beispiel (local):** if `word.examples[0]` exists, split it on ` - ` / ` – ` / ` — `
   (the same split the card back already uses) and show only the German half, with the
   target word bolded (cheap match: bold tokens whose lowercase form starts with the first
   `min(4, lemma.length)` characters of the lemma — handles conjugated/declined forms).
   Do NOT show the English half.
2. **Synonyme (remote, cached):** use `word.synonyms` if present; if `hintsFetchedAt` is set
   and `synonyms` is empty, skip; otherwise fetch per §2/§3 and persist per §4.2, then
   reveal if non-empty. On fetch failure: show a quiet muted line
   "Couldn't reach synonym sources", persist nothing, and fall through to rung 4.
   If the lemma is null (§4.3), skip rungs 2 **and** 3 with no network call.
3. **Gegenteil (same cached data):** reveal `word.antonyms` if non-empty.
4. **First letter (local, always available):** from the English gloss (text before the first
   comma, trimmed), show: `Starts with "X" · N letters`.

When every available rung is revealed: dim the button and show
"No more hints — flip the card."

### 4.5 UI

- **FAB:** `fixed bottom-6 right-6 z-30`, `w-12 h-12 rounded-full bg-white border
  border-[#E0E0D5] shadow-sm text-[#5A5A40] hover:bg-[#F9F9F4]`, lucide `Lightbulb` icon,
  `title="Hint (H)"`. Once used on the current card: filled style (`bg-[#5A5A40]
  text-amber-300`). While fetching: `Loader2` with `animate-spin`.
- **Panel:** popover above the FAB — `fixed bottom-20 right-6 z-30 w-80
  max-w-[calc(100vw-3rem)] bg-white border border-[#E0E0D5] rounded-2xl shadow-lg p-4`,
  animated in with `motion.div` (`initial={{opacity:0, y:8}}`). Revealed rungs stack, each
  with a tiny label (`text-[9px] uppercase tracking-widest text-[#8E8E80] font-bold`):
  "Beispiel" / "Synonyme" / "Gegenteil" / "First letter". Synonyms/antonyms render as pill
  chips (`bg-[#5A5A40]/10 text-[#5A5A40] px-2.5 py-0.5 rounded-full text-xs`, Georgia
  serif). Attribution footer (§2.1) appears only when remote data is shown.
- **Lifecycle:** implement as a self-contained component (e.g.
  `src/components/HintHelper.tsx`) mounted in `FlashcardStudy` with `key={activeWord.id}` so
  all hint state resets automatically on card change. The panel persists across the card
  flip (useful for comparing the hint with the revealed answer) and resets only when the
  card changes.
- **Keyboard:** `h` triggers a press. Guard like the existing keydown handler in
  `FlashcardStudy.tsx` (lines ~84–106): ignore when an INPUT/TEXTAREA/SELECT is focused or
  the edit modal is open. `h` does not conflict with the existing Space/1/2/arrow keys.

### 4.6 Mastered-button disable

In `FlashcardStudy.tsx`: track `helpUsedForId: string | null`; the HintHelper calls an
`onHelpUsed()` prop on every press which sets it to the active word's id. The green
`CheckCircle2` mastered button (top-right of the card, lines ~201–206) gets
`disabled={helpUsedForId === activeWord.id}` with greyed styling
(`bg-neutral-200/60 text-neutral-400 cursor-not-allowed`), tooltip
"Mastering disabled after using a hint", and a guard inside `handleMastered`. Navigating to
any other card (next/prev/random/rating) changes `activeWord.id`, so it re-enables on its
own. The normal "Got it" / "Need review" rating buttons are NOT affected.

### 4.7 Nice-to-have

Add "Synonyms" and "Antonyms" comma-separated text inputs to
`src/components/WordEditModal.tsx` (join with `", "` for display; split on `,`, trim, drop
empties on save) so the user can correct or hand-author hint data.

---

## 5. Acceptance checklist

- [ ] Adjective with an example (e.g. add `glücklich`): pressing the lightbulb 4 times
      reveals, in order: German example (English withheld, word bolded) → synonym chips with
      attribution footer → Gegenteil chips → first-letter hint. One rung per press.
- [ ] Noun `der Tisch`: the API lookup uses `Tisch` (article stripped — check Network tab).
- [ ] A `wordType: "phrase"` or multi-word entry: no network request; only local rungs.
- [ ] Word without examples: first press goes straight to synonyms.
- [ ] After any press: green mastered check is greyed/unclickable; navigate away → enabled
      again. "Got it"/"Need review" still work.
- [ ] Reload the page, revisit the same word: synonyms appear instantly with **no** network
      call; `localStorage["german_vocab"]` entry now contains `synonyms`/`antonyms`/
      `hintsFetchedAt`.
- [ ] Simulate offline: pressing past the example rung shows the quiet error note and falls
      through to the first-letter rung; `hintsFetchedAt` is NOT persisted (retryable).
- [ ] Existing shortcuts (Space, 1, 2, arrows) unaffected; typing `h` in any input or the
      edit modal does not trigger hints.
- [ ] `npm run lint` passes; existing 3000-word deck loads exactly as before.
