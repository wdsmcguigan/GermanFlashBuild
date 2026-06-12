// hintProviders.ts
// Free, non-AI synonym/antonym lookups for German words.
//   Synonyms: OpenThesaurus.de (CC-BY-SA — attribution required in the UI),
//             topped up from de.wiktionary.org {{Synonyme}} when sparse.
//   Antonyms: de.wiktionary.org "Gegenwörter" sections.
// Both fetched server-side so the browser never deals with CORS or rate limits.

const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT = "Klarheit-GermanFlashcards/1.0 (personal learning app)";
const SYNONYM_LIMIT = 3;
const ANTONYM_LIMIT = 2;

/** "der Tisch" -> "Tisch"; verbs/adjectives pass through unchanged. */
export function stripArticle(word: string): string {
  return word.replace(/^(der|die|das)\s+/i, "").trim();
}

/**
 * Normalize a stored word into a single dictionary lemma, or null if the
 * entry is a phrase that should skip API lookups entirely:
 *   "der Tisch"            -> "Tisch"
 *   "sich freuen"          -> "freuen"   (Wiktionary page is the bare verb)
 *   "abholen."             -> "abholen"
 *   "zur Verfügung stehen" -> null       (multi-word phrase: no API rungs)
 */
export function normalizeLemma(word: string): string | null {
  let w = (word || "").trim();
  w = w.replace(/^(der|die|das)\s+/i, "");
  w = w.replace(/^sich\s+/i, "");
  w = w.replace(/[.,!?;:\u2026]+$/g, "").trim();
  if (!w || /\s/.test(w)) return null;
  return w;
}

/**
 * Parse an OpenThesaurus API response into a short, learner-friendly synonym list.
 * Response shape: { synsets: [ { terms: [ { term: string, level?: string } ] } ] }
 * Each synset is one *meaning*; we cannot disambiguate without AI, so we take
 * terms from the first synsets in order (OpenThesaurus lists common senses first).
 */
export function parseOpenThesaurus(json: any, originalWord: string, limit = SYNONYM_LIMIT): string[] {
  const bannedLevels = new Set(["derb", "vulgär", "vulgar"]);
  const original = stripArticle(originalWord).toLowerCase();
  const seen = new Set<string>([original]);
  const out: string[] = [];

  for (const synset of json?.synsets ?? []) {
    for (const t of synset?.terms ?? []) {
      const rawTerm: string = (t?.term || "").trim();
      const level: string = (t?.level || "").toLowerCase();
      if (!rawTerm) continue;
      if (bannedLevels.has(level)) continue; // skip crude/vulgar register
      // OpenThesaurus sometimes annotates terms inline, e.g. "kapieren (ugs.)" — strip that
      const term = rawTerm.replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (!term) continue;
      if (term.split(/\s+/).length > 3) continue; // skip long paraphrases
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(term);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Parse German Wiktionary wikitext and extract the first block of the given
 * section template (e.g. "{{Gegenwörter}}" or "{{Synonyme}}").
 * Typical wikitext:
 *   {{Gegenwörter}}
 *   :[1] [[unglücklich]], [[traurig]]
 *   :[2] [[unzufrieden]]
 * Links may be piped: [[Wort|Anzeige]] — we take the display text if piped.
 */
export function parseWikiSection(
  wikitext: string,
  marker: string,
  originalWord: string,
  limit: number
): string[] {
  if (!wikitext) return [];
  const idx = wikitext.indexOf(marker);
  if (idx === -1) return [];

  const original = stripArticle(originalWord).toLowerCase();
  const seen = new Set<string>([original]);
  const out: string[] = [];

  const lines = wikitext.slice(idx + marker.length).split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("{{")) break; // reached the next section template
    if (!line.startsWith(":")) continue; // entries are ":[n] ..." lines

    for (const m of line.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g)) {
      const term = (m[2] || m[1]).trim();
      if (!term) continue;
      if (term.split(/\s+/).length > 3) continue;
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(term);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Backwards-compatible wrapper used by the unit tests. */
export function parseGegenwoerter(wikitext: string, originalWord: string, limit = ANTONYM_LIMIT): string[] {
  return parseWikiSection(wikitext, "{{Gegenwörter}}", originalWord, limit);
}

/** Merge a primary synonym list with top-up candidates, deduped, capped. */
export function mergeSynonyms(primary: string[], topUp: string[], limit = SYNONYM_LIMIT): string[] {
  const out = [...primary];
  const seen = new Set(primary.map((s) => s.toLowerCase()));
  for (const s of topUp) {
    if (out.length >= limit) break;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.slice(0, limit);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenThesaurusJson(lemma: string): Promise<any | null> {
  const url = `https://www.openthesaurus.de/synonyme/search?q=${encodeURIComponent(lemma)}&format=application/json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchWiktionaryWikitext(lemma: string): Promise<string> {
  // German Wiktionary page names are case-sensitive: nouns capitalized,
  // verbs/adjectives lowercase. Stored words already follow that convention.
  const url =
    `https://de.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(lemma)}` +
    `&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return "";
  const json = await res.json();
  // A missing page returns HTTP 200 with an { error } object — that is a
  // legitimate "no entry", not a failure. json.parse is absent in that case.
  return json?.parse?.wikitext || "";
}

/**
 * Combined lookup. Phrases ("zur Verfügung stehen", wordType phrase) yield
 * empty lists with NO network call — the client caches that and the
 * dictionary rungs dissolve. Each source failing alone is tolerated
 * (Promise.allSettled): the other still contributes.
 */
export async function fetchHints(germanWord: string): Promise<{ synonyms: string[]; antonyms: string[] }> {
  const lemma = normalizeLemma(germanWord);
  if (!lemma) return { synonyms: [], antonyms: [] };

  const [otRes, wikiRes] = await Promise.allSettled([
    fetchOpenThesaurusJson(lemma),
    fetchWiktionaryWikitext(lemma),
  ]);
  const otJson = otRes.status === "fulfilled" ? otRes.value : null;
  const wikitext = wikiRes.status === "fulfilled" ? wikiRes.value : "";

  let synonyms = otJson ? parseOpenThesaurus(otJson, germanWord) : [];
  if (synonyms.length < SYNONYM_LIMIT && wikitext) {
    // Top up from the SAME wikitext we already downloaded for antonyms — free.
    const wikiSyns = parseWikiSection(wikitext, "{{Synonyme}}", germanWord, SYNONYM_LIMIT);
    synonyms = mergeSynonyms(synonyms, wikiSyns);
  }
  const antonyms = wikitext ? parseWikiSection(wikitext, "{{Gegenwörter}}", germanWord, ANTONYM_LIMIT) : [];

  return { synonyms, antonyms };
}
