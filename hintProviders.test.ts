import { parseOpenThesaurus, parseGegenwoerter, stripArticle } from "./hintProviders";

let failures = 0;
function check(name: string, actual: any, expected: any) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}\n   expected ${e}\n   got      ${a}`);
  }
}

// --- stripArticle ---
check("strip der", stripArticle("der Tisch"), "Tisch");
check("strip die", stripArticle("die Geduld"), "Geduld");
check("verb untouched", stripArticle("verstehen"), "verstehen");
check("'derselbe' not mangled", stripArticle("derselbe"), "derselbe");

// --- OpenThesaurus parser (real response shape for 'verstehen') ---
const otVerstehen = {
  metaData: {},
  synsets: [
    {
      id: 1,
      categories: [],
      terms: [
        { term: "verstehen" },
        { term: "begreifen" },
        { term: "kapieren", level: "umgangssprachlich" },
        { term: "raffen", level: "umgangssprachlich" },
        { term: "checken", level: "umgangssprachlich" },
      ],
    },
    {
      id: 2,
      terms: [{ term: "Verständnis haben für" }, { term: "nachvollziehen" }],
    },
  ],
};
check(
  "OT: skips self, keeps order, caps at 3",
  parseOpenThesaurus(otVerstehen, "verstehen"),
  ["begreifen", "kapieren", "raffen"]
);

const otVulgar = {
  synsets: [
    {
      terms: [
        { term: "kacken", level: "derb" },
        { term: "scheißen", level: "vulgär" },
        { term: "austreten", level: "umgangssprachlich" },
      ],
    },
  ],
};
check("OT: filters derb/vulgär", parseOpenThesaurus(otVulgar, "Stuhlgang haben"), ["austreten"]);

check(
  "OT: strips inline annotations like '(ugs.)'",
  parseOpenThesaurus({ synsets: [{ terms: [{ term: "kapieren (ugs.)" }] }] }, "verstehen"),
  ["kapieren"]
);

check(
  "OT: skips long paraphrases",
  parseOpenThesaurus(
    { synsets: [{ terms: [{ term: "sich im Klaren sein über etwas" }, { term: "wissen" }] }] },
    "verstehen"
  ),
  ["wissen"]
);

check("OT: empty/missing synsets -> []", parseOpenThesaurus({ message: "no results" }, "Xyzzy"), []);
check("OT: null json -> []", parseOpenThesaurus(null, "Tisch"), []);
check(
  "OT: dedupes case-insensitively & ignores article on original",
  parseOpenThesaurus({ synsets: [{ terms: [{ term: "Tisch" }, { term: "Tafel" }] }] }, "der Tisch"),
  ["Tafel"]
);

// --- Wiktionary Gegenwörter parser ---
const wikiGluecklich = `
== glücklich ({{Sprache|Deutsch}}) ==
=== {{Wortart|Adjektiv|Deutsch}} ===
{{Bedeutungen}}
:[1] von Glück erfüllt
{{Synonyme}}
:[1] [[froh]], [[zufrieden]]
{{Gegenwörter}}
:[1] [[unglücklich]], [[traurig]], [[deprimiert]]
:[2] [[unzufrieden]]
{{Beispiele}}
:[1] Ich bin sehr glücklich.
`;
check(
  "Wiki: extracts first Gegenwörter lines, caps at 2",
  parseGegenwoerter(wikiGluecklich, "glücklich"),
  ["unglücklich", "traurig"]
);

const wikiPiped = `
{{Gegenwörter}}
:[1] [[Krieg|der Krieg]], [[Streit#Substantiv|Streit]]
{{Beispiele}}
`;
check("Wiki: handles piped links, skips #section links", parseGegenwoerter(wikiPiped, "der Frieden"), ["der Krieg"]);

check("Wiki: no Gegenwörter section -> []", parseGegenwoerter("{{Synonyme}}\n:[1] [[Tafel]]", "der Tisch"), []);
check("Wiki: empty wikitext -> []", parseGegenwoerter("", "Tisch"), []);

const wikiStopsAtNextSection = `
{{Gegenwörter}}
{{Beispiele}}
:[1] [[falsch]] sollte NICHT erscheinen
`;
check("Wiki: stops at next template even if empty", parseGegenwoerter(wikiStopsAtNextSection, "wahr"), []);

check(
  "Wiki: excludes the word itself",
  parseGegenwoerter("{{Gegenwörter}}\n:[1] [[Tisch]], [[Boden]]\n{{Beispiele}}", "der Tisch"),
  ["Boden"]
);


// --- normalizeLemma (new) ---
import { normalizeLemma, parseWikiSection, mergeSynonyms } from "./hintProviders";

check("lemma: strips article", normalizeLemma("der Tisch"), "Tisch");
check("lemma: strips reflexive sich", normalizeLemma("sich freuen"), "freuen");
check("lemma: strips trailing punctuation", normalizeLemma("abholen."), "abholen");
check("lemma: phrase -> null (skip API)", normalizeLemma("zur Verfügung stehen"), null);
check("lemma: article + remaining space -> null", normalizeLemma("die kalte Platte"), null);
check("lemma: empty -> null", normalizeLemma("   "), null);
check("lemma: plain verb untouched", normalizeLemma("verstehen"), "verstehen");

// --- parseWikiSection generalization: {{Synonyme}} ---
const wikiWithBoth = `
{{Synonyme}}
:[1] [[froh]], [[zufrieden]], [[selig]], [[heiter]]
{{Gegenwörter}}
:[1] [[unglücklich]], [[traurig]]
{{Beispiele}}
:[1] Ich bin glücklich.
`;
check(
  "wikiSection: extracts Synonyme capped at 3",
  parseWikiSection(wikiWithBoth, "{{Synonyme}}", "glücklich", 3),
  ["froh", "zufrieden", "selig"]
);
check(
  "wikiSection: Gegenwörter unaffected by Synonyme block above",
  parseWikiSection(wikiWithBoth, "{{Gegenwörter}}", "glücklich", 2),
  ["unglücklich", "traurig"]
);
check(
  "wikiSection: missing-page wikitext (empty) -> []",
  parseWikiSection("", "{{Synonyme}}", "Xyzzy", 3),
  []
);

// --- mergeSynonyms (top-up rule) ---
check(
  "merge: tops up to limit, dedupes case-insensitively",
  mergeSynonyms(["begreifen"], ["Begreifen", "kapieren", "checken"], 3),
  ["begreifen", "kapieren", "checken"]
);
check(
  "merge: primary already full -> unchanged",
  mergeSynonyms(["a", "b", "c"], ["d", "e"], 3),
  ["a", "b", "c"]
);
check("merge: empty primary -> top-up only", mergeSynonyms([], ["froh", "selig"], 3), ["froh", "selig"]);

console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
