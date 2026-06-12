import React, { useState, useRef } from "react";
import { VocabWord } from "../types";
import {
  Loader2,
  Plus,
  Trash2,
  Languages,
  BookOpen,
  Download,
  Upload,
  Camera,
  Check,
  CheckSquare,
  Square,
  X,
  Search,
  AlertTriangle,
  Info,
  Edit3,
  Filter,
  ArrowUpDown,
  Pin,
} from "lucide-react";
import { WordFlashcardModal } from "./WordFlashcardModal";
import { WordEditModal } from "./WordEditModal";

interface VocabBuilderProps {
  words: VocabWord[];
  loading: boolean;
  onAddWords: (words: string[]) => void;
  onRemoveWord: (id: string) => void;
  onUpdateWord: (id: string, updatedData: Partial<VocabWord>) => void;
  onClearAllWords?: () => void;
  onImportWords: (words: Partial<VocabWord>[]) => void;
  onAddPreTranslatedWords: (
    words: {
      german: string;
      english: string;
      examples?: string[];
      wordType?: string;
      plural?: string;
      present?: string;
      preterite?: string;
      perfect?: string;
      verbClass?: "regelmäßig" | "unregelmäßig" | "modal";
    }[],
  ) => void;
  onAddNotification: (
    type: "success" | "info" | "warning" | "error",
    title: string,
    message: string,
  ) => void;
}

export function getCategoryBadgeStyles(wordType?: string) {
  const type = (wordType || "other").trim().toLowerCase();

  switch (type) {
    case "noun":
      return {
        bg: "bg-[#FFF0F4]",
        text: "text-[#C0567A]",
        border: "border-[#FFE5EC]",
        label: "Noun",
      };
    case "verb":
      return {
        bg: "bg-[#F0F5F1]",
        text: "text-[#4F7E65]",
        border: "border-[#E1EDE6]",
        label: "Verb",
      };
    case "adjective":
      return {
        bg: "bg-[#F0F7FA]",
        text: "text-[#3D7A94]",
        border: "border-[#E1EFF5]",
        label: "Adjective",
      };
    case "adverb":
      return {
        bg: "bg-[#F5F2FA]",
        text: "text-[#6A4E9E]",
        border: "border-[#EAE1F5]",
        label: "Adverb",
      };
    case "conjunction":
      return {
        bg: "bg-[#FCF8E3]",
        text: "text-[#A67C1E]",
        border: "border-[#FAF2CC]",
        label: "Conjunction",
      };
    case "preposition":
      return {
        bg: "bg-[#FAF0E6]",
        text: "text-[#9E6A4E]",
        border: "border-[#F5E2D1]",
        label: "Preposition",
      };
    case "pronoun":
      return {
        bg: "bg-[#F0F0FF]",
        text: "text-[#5C5C9E]",
        border: "border-[#E2E2FF]",
        label: "Pronoun",
      };
    case "phrase":
      return {
        bg: "bg-[#F4F4F0]",
        text: "text-[#6E6E60]",
        border: "border-[#E9E9E0]",
        label: "Phrase",
      };
    default:
      const label = wordType
        ? wordType.charAt(0).toUpperCase() + wordType.slice(1)
        : "Other";
      return {
        bg: "bg-[#F5F5F0]",
        text: "text-[#8E8E80]",
        border: "border-[#E0E0D5]",
        label: label,
      };
  }
}

function getNormalizedGerman(wordStr: any): string {
  if (!wordStr || typeof wordStr !== "string") return "";
  let norm = wordStr.trim().toLowerCase();

  // Strip common indicators of nouns
  if (norm.startsWith("der ")) norm = norm.slice(4).trim();
  else if (norm.startsWith("die ")) norm = norm.slice(4).trim();
  else if (norm.startsWith("das ")) norm = norm.slice(4).trim();

  // Strip plural endings if written like "Zahl, -en" or "Tisch, -e"
  const commaIndex = norm.indexOf(",");
  if (commaIndex !== -1) {
    norm = norm.substring(0, commaIndex).trim();
  }
  return norm;
}

function getGermanFromImportItem(item: any): string {
  if (typeof item === "string") {
    return item;
  }
  if (item && typeof item === "object") {
    const val = item.german || item.word || item.vocab || item.text || "";
    return typeof val === "string" ? val : String(val);
  }
  return "";
}

export function VocabBuilder({
  words,
  loading,
  onAddWords,
  onRemoveWord,
  onUpdateWord,
  onClearAllWords,
  onImportWords,
  onAddPreTranslatedWords,
  onAddNotification,
}: VocabBuilderProps) {
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    | "newest"
    | "oldest"
    | "az"
    | "za"
    | "cefr-asc"
    | "cefr-desc"
    | "level-asc"
    | "level-desc"
  >("newest");
  const [viewingWordId, setViewingWordId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    category?: string;
    technicalDetails?: string;
  } | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const filteredWords = words.filter((w) => {
    if (filterType !== "all" && w.wordType !== filterType) {
      return false;
    }
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      w.german?.toLowerCase().includes(query) ||
      w.english?.toLowerCase().includes(query) ||
      w.cefrLevel?.toLowerCase().includes(query) ||
      w.theme?.toLowerCase().includes(query) ||
      w.wordType?.toLowerCase().includes(query) ||
      w.plural?.toLowerCase().includes(query) ||
      w.present?.toLowerCase().includes(query) ||
      w.preterite?.toLowerCase().includes(query) ||
      w.perfect?.toLowerCase().includes(query) ||
      w.verbClass?.toLowerCase().includes(query)
    );
  });

  if (sortBy === "oldest") {
    filteredWords.reverse();
  } else if (sortBy === "az") {
    filteredWords.sort((a, b) =>
      (a.german || "").localeCompare(b.german || ""),
    );
  } else if (sortBy === "za") {
    filteredWords.sort((a, b) =>
      (b.german || "").localeCompare(a.german || ""),
    );
  } else if (sortBy === "cefr-asc") {
    filteredWords.sort((a, b) => {
      if (!a.cefrLevel && !b.cefrLevel) return 0;
      if (!a.cefrLevel) return 1;
      if (!b.cefrLevel) return -1;
      return a.cefrLevel.localeCompare(b.cefrLevel);
    });
  } else if (sortBy === "cefr-desc") {
    filteredWords.sort((a, b) => {
      if (!a.cefrLevel && !b.cefrLevel) return 0;
      if (!a.cefrLevel) return 1;
      if (!b.cefrLevel) return -1;
      return b.cefrLevel.localeCompare(a.cefrLevel);
    });
  } else if (sortBy === "level-asc") {
    filteredWords.sort((a, b) => a.level - b.level);
  } else if (sortBy === "level-desc") {
    filteredWords.sort((a, b) => b.level - a.level);
  }

  const [extracting, setExtracting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [isImportCancelling, setIsImportCancelling] = useState(false);
  const importCancelledRef = useRef(false);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [extractedWords, setExtractedWords] = useState<
    {
      german: string;
      english: string;
      examples?: string[];
      wordType?: string;
      plural?: string;
      present?: string;
      preterite?: string;
      perfect?: string;
      verbClass?: "regelmäßig" | "unregelmäßig" | "modal";
      selected: boolean;
    }[]
  >([]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultString = reader.result as string;
        const base64Data = resultString.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    setShowTechDetails(false);
    setErrorDetails(null);

    try {
      const mimeType = file.type;
      const base64 = await convertToBase64(file);

      // Simple client-side size check (25MB soft warning limit)
      if (file.size > 25 * 1024 * 1024) {
        setErrorDetails({
          title: "File Too Large",
          message:
            "The uploaded image file is larger than 25MB. Please use a smaller or compressed image to prevent processing limits.",
          category: "payload_size",
          technicalDetails: `Local file size detection: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        });
        setExtracting(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 sec timeout

      let response;
      try {
        response = await fetch("/api/extract-vocab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          throw {
            category: "network",
            message:
              "The scanning request timed out after 90 seconds. Your upload or connection might be slow.",
            details: "Client Timeout (AbortError)",
          };
        } else {
          throw {
            category: "network",
            message:
              "A network connectivity error occurred. Please verify your internet connection.",
            details: fetchErr.message || String(fetchErr),
          };
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (_) {}
        throw {
          status: response.status,
          message:
            errorData.error ||
            "The server encountered an issue processing the image.",
          details: errorData.details || `HTTP Status: ${response.status}`,
          category: errorData.category || "unknown",
        };
      }

      const data = await response.json();
      if (data.words && Array.isArray(data.words)) {
        if (data.words.length === 0) {
          setErrorDetails({
            title: "No German Words Detected",
            message:
              "Gemini analyzed the image, but couldn't detect any structured German vocabulary words. Please verify that text is clear, non-blurry, and clearly written in German.",
            category: "parse",
          });
        } else {
          const wordsWithSelection = data.words.map((w: any) => ({
            ...w,
            selected: true,
          }));
          setExtractedWords(wordsWithSelection);
        }
      } else {
        setErrorDetails({
          title: "Invalid Response Format",
          message:
            "The translation engine responded, but the output structure was unexpected.",
          category: "parse",
          technicalDetails: JSON.stringify(data),
        });
      }
    } catch (err: any) {
      console.error("Scanning Error Handled:", err);

      let title = "Failed to Analyze Image";
      let message =
        "An issue occurred while attempting to process your image scan.";
      let category = err.category || "unknown";
      let details = err.details || err.message || String(err);

      if (category === "unknown") {
        const lowerDetails = details.toLowerCase();
        if (
          lowerDetails.includes("api_key") ||
          lowerDetails.includes("api key") ||
          lowerDetails.includes("unauthorized") ||
          lowerDetails.includes("api key not found")
        ) {
          category = "api_key";
          title = "API Key Configuration Required";
          message =
            "The Google Gemini API Key is missing or invalid. Please configure your GEMINI_API_KEY environment variable in your project settings.";
        } else if (
          lowerDetails.includes("network") ||
          lowerDetails.includes("fetch") ||
          lowerDetails.includes("failed to fetch") ||
          lowerDetails.includes("internet")
        ) {
          category = "network";
          title = "Network Connection Issue";
          message =
            "Could not establish a network connection. Please check your Wi-Fi or cellular data connection.";
        } else if (
          lowerDetails.includes("rate") ||
          lowerDetails.includes("quota") ||
          lowerDetails.includes("limit") ||
          lowerDetails.includes("429") ||
          err.status === 429
        ) {
          category = "quota";
          title = "API Frequency Quota Limit";
          message =
            "The application has reached Gemini API rate frequency thresholds. Please wait a minute and re-submit your photo.";
        } else if (
          lowerDetails.includes("too large") ||
          lowerDetails.includes("file size") ||
          lowerDetails.includes("image size") ||
          lowerDetails.includes("413") ||
          err.status === 413
        ) {
          category = "payload_size";
          title = "Image Payload Size Limit";
          message =
            "The uploaded file is too large for the processing container limits. Try choosing an image with lower resolution or smaller size.";
        } else if (
          lowerDetails.includes("safety") ||
          lowerDetails.includes("blocked") ||
          lowerDetails.includes("candidate")
        ) {
          category = "safety";
          title = "Safety Filter Intercepted";
          message =
            "The request was blocked by Gemini's AI safety rules. This sometimes triggers on handwritten notes or tables containing words that look like sensitive content.";
        }
      } else {
        // Map backend preset strings cleanly
        message = err.message;
        if (category === "api_key") title = "API Key Error";
        else if (category === "payload_size") title = "Payload Size Limit";
        else if (category === "network") title = "Network Failure";
        else if (category === "safety") title = "Safety Intercept";
        else if (category === "parse") title = "Parsing Response Error";
        else if (category === "quota") title = "Gemini Quota Reached";
      }

      setErrorDetails({
        title,
        message,
        category,
        technicalDetails: details,
      });
    } finally {
      setExtracting(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  };

  const handleTranslate = () => {
    const list = inputText
      .split("\\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (list.length > 0) {
      onAddWords(list);
      setInputText("");
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(words, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wortschatz_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processExternalImport = async (
    wordsToImport: any[],
    alreadyCompletePrefix: any[] = [],
  ) => {
    importCancelledRef.current = false;
    setIsImportCancelling(false);
    setImportProgress({ current: 0, total: wordsToImport.length });
    setErrorDetails(null);
    let importedCount = 0;

    // Accumulate enriched words locally
    const enrichedAccumulatedList: any[] = [];

    // Using a safe, highly-stable chunk size (12 instead of 40)
    // to prevent response truncation or backend timeout on large tasks.
    const chunkSize = 12;

    for (let i = 0; i < wordsToImport.length; i += chunkSize) {
      if (importCancelledRef.current) {
        break;
      }

      const chunk = wordsToImport.slice(i, i + chunkSize);
      try {
        const response = await fetch("/api/enrich-vocab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: chunk }),
        });

        if (!response.ok) {
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch (_) {}
          throw {
            category: errorData.category || "unknown",
            message: errorData.error || "Failed to process import chunk.",
            details: errorData.details || `HTTP Status: ${response.status}`,
          };
        }

        const data = await response.json();

        if (importCancelledRef.current) {
          break;
        }

        if (data.enrichedWords && Array.isArray(data.enrichedWords)) {
          enrichedAccumulatedList.push(...data.enrichedWords);
        }
      } catch (err: any) {
        console.error("Import Error Handled:", err);

        let title = "Import Interrupted";
        let message =
          "An issue occurred while attempting to process and enrich your imported words.";
        let category = err.category || "unknown";
        let details = err.details || err.message || String(err);

        if (category === "unknown") {
          const lowerDetails = details.toLowerCase();
          if (
            lowerDetails.includes("api_key") ||
            lowerDetails.includes("api key") ||
            lowerDetails.includes("unauthorized") ||
            lowerDetails.includes("api key not found")
          ) {
            category = "api_key";
            title = "API Key Configuration Required";
            message =
              "The Google Gemini API Key is missing or invalid. Please configure your GEMINI_API_KEY environment variable in your project settings.";
          } else if (
            lowerDetails.includes("network") ||
            lowerDetails.includes("fetch") ||
            lowerDetails.includes("failed to fetch") ||
            lowerDetails.includes("internet")
          ) {
            category = "network";
            title = "Network Connection Issue";
            message =
              "Could not establish a network connection. Please check your Wi-Fi or cellular data connection.";
          } else if (
            lowerDetails.includes("rate") ||
            lowerDetails.includes("quota") ||
            lowerDetails.includes("limit") ||
            lowerDetails.includes("429")
          ) {
            category = "quota";
            title = "API Frequency Quota Limit";
            message =
              "The application has reached Gemini API rate frequency thresholds. Please wait a minute and try the import again.";
          } else if (
            lowerDetails.includes("format") ||
            lowerDetails.includes("formatted") ||
            lowerDetails.includes("syntaxerror") ||
            lowerDetails.includes("json") ||
            lowerDetails.includes("incorrectly")
          ) {
            category = "parse";
            title = "Enrichment Response Error";
            message =
              "The translation engine responded, but the output structure was formatted incorrectly or truncated.";
          }
        } else {
          message = err.message;
          if (category === "api_key") title = "API Key Error";
          else if (category === "network") title = "Network Failure";
          else if (category === "safety") title = "Safety Intercept";
          else if (category === "parse") title = "Parsing Response Error";
          else if (category === "quota") title = "Gemini Quota Reached";
        }

        setErrorDetails({
          title,
          message,
          category,
          technicalDetails: details,
        });
        break;
      }

      importedCount += chunk.length;
      setImportProgress({
        current: Math.min(importedCount, wordsToImport.length),
        total: wordsToImport.length,
      });
    }

    // Conclude the import once with combined values
    if (
      enrichedAccumulatedList.length > 0 ||
      alreadyCompletePrefix.length > 0
    ) {
      onImportWords([...alreadyCompletePrefix, ...enrichedAccumulatedList]);
    }

    setImportProgress(null);
    setIsImportCancelling(false);
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const resultText = event.target?.result as string;
        if (!resultText) {
          throw new Error("The selected file is empty.");
        }

        const parsed = JSON.parse(resultText);

        let rawItems: any[] = [];
        if (parsed && typeof parsed === "object") {
          if (parsed.words && Array.isArray(parsed.words)) {
            rawItems = parsed.words;
          } else if (Array.isArray(parsed)) {
            rawItems = parsed;
          } else {
            // Check if it is a flat dictionary of { "GermanWord": "EnglishWord" }
            const entries = Object.entries(parsed);
            if (
              entries.length > 0 &&
              entries.every(
                ([k, v]) =>
                  typeof k === "string" &&
                  (typeof v === "string" || typeof v === "object"),
              )
            ) {
              rawItems = entries.map(([k, v]) => {
                if (v && typeof v === "object") {
                  return { german: k, ...v };
                }
                return { german: k, english: String(v) };
              });
            }
          }
        }

        if (!Array.isArray(rawItems) || rawItems.length === 0) {
          onAddNotification(
            "warning",
            "Empty File",
            "No vocabulary words found inside the selected JSON file.",
          );
          return;
        }

        // Standardize raw items with fallback fields
        const standardizedItems = rawItems
          .map((w: any) => {
            if (!w) return null;
            if (typeof w === "string") {
              return { german: w, english: "" };
            }
            if (typeof w === "object") {
              const german =
                w.german ||
                w.word ||
                w.vocab ||
                w.text ||
                w.de ||
                w.German ||
                w.Vocab ||
                "";
              const english =
                w.english ||
                w.translation ||
                w.translationen ||
                w.meaning ||
                w.en ||
                w.English ||
                w.Translation ||
                "";
              return {
                ...w,
                german: typeof german === "string" ? german : String(german),
                english:
                  typeof english === "string" ? english : String(english),
              };
            }
            return null;
          })
          .filter((item) => item !== null && item.german.trim() !== "");

        if (standardizedItems.length === 0) {
          onAddNotification(
            "warning",
            "No Words Match",
            "None of the objects inside the file could be parsed as German words.",
          );
          return;
        }

        // De-duplicate imported items among themselves first!
        const uniqueImportedMap = new Map<string, any>();
        standardizedItems.forEach((w: any) => {
          const norm = getNormalizedGerman(w.german);
          if (norm && !uniqueImportedMap.has(norm)) {
            uniqueImportedMap.set(norm, w);
          }
        });
        const deDuplicatedRawItems = Array.from(uniqueImportedMap.values());

        const existingNormalized = new Set(
          (Array.isArray(words) ? words : [])
            .filter((w: any) => w && typeof w.german === "string")
            .map((w: any) => getNormalizedGerman(w.german)),
        );

        const filteredItems = deDuplicatedRawItems.filter((w: any) => {
          const normalized = getNormalizedGerman(w.german);
          return normalized && !existingNormalized.has(normalized);
        });

        const skippedCount = deDuplicatedRawItems.length - filteredItems.length;

        if (filteredItems.length === 0) {
          onAddNotification(
            "info",
            "Smart-Resume Tracker",
            `Smart-Resume: All ${deDuplicatedRawItems.length} word(s) inside this file are already in your vocabulary list.`,
          );
          return;
        }

        if (skippedCount > 0) {
          onAddNotification(
            "info",
            "Skipped Duplicates",
            `Smart-Resume: Skipping ${skippedCount} duplicate word(s) that already exist in your deck.`,
          );
        }

        // Avoid crashes inside iframe sandbox by utilizing onAddNotification instead of alerts
        const isInternalFormat =
          filteredItems[0] &&
          typeof filteredItems[0] === "object" &&
          filteredItems[0].german &&
          filteredItems[0].english;

        if (isInternalFormat) {
          const incompleteWords: any[] = [];
          const completeWords: any[] = [];

          filteredItems.forEach((w: any) => {
            if (!w || typeof w !== "object") return;
            const hasGerman = typeof w.german === "string" && !!w.german;
            const hasEnglish = typeof w.english === "string" && !!w.english;
            if (!hasGerman || !hasEnglish) return;

            const type =
              typeof w.wordType === "string"
                ? w.wordType.trim().toLowerCase()
                : "";
            const isVerb =
              type === "verb" ||
              (!type &&
                w.german &&
                /^[a-zäöü]+e[nr]l?$/i.test(w.german.trim()));

            if (isVerb) {
              const hasPerfect =
                typeof w.perfect === "string" &&
                w.perfect.trim() !== "" &&
                w.perfect.trim() !== "—" &&
                w.perfect.trim() !== "-";
              const lowercasePerfect =
                hasPerfect && typeof w.perfect === "string"
                  ? w.perfect.toLowerCase().trim()
                  : "";
              const hasHelper =
                hasPerfect &&
                (lowercasePerfect.startsWith("hat ") ||
                  lowercasePerfect.startsWith("ist ") ||
                  lowercasePerfect.startsWith("haben ") ||
                  lowercasePerfect.startsWith("sein ") ||
                  lowercasePerfect.includes(" hat ") ||
                  lowercasePerfect.includes(" ist "));
              const hasPresent =
                typeof w.present === "string" &&
                w.present.trim() !== "" &&
                w.present.trim() !== "—" &&
                w.present.trim() !== "-";
              const hasPreterite =
                typeof w.preterite === "string" &&
                w.preterite.trim() !== "" &&
                w.preterite.trim() !== "—" &&
                w.preterite.trim() !== "-";

              if (!hasPerfect || !hasHelper || !hasPresent || !hasPreterite) {
                incompleteWords.push(w);
              } else {
                completeWords.push(w);
              }
            } else if (type === "noun") {
              const hasPlural =
                typeof w.plural === "string" &&
                w.plural.trim() !== "" &&
                w.plural.trim() !== "—" &&
                w.plural.trim() !== "-";
              const hasArticle =
                w.german &&
                (w.german.toLowerCase().startsWith("der ") ||
                  w.german.toLowerCase().startsWith("die ") ||
                  w.german.toLowerCase().startsWith("das "));
              if (!hasPlural || !hasArticle) {
                incompleteWords.push(w);
              } else {
                completeWords.push(w);
              }
            } else {
              completeWords.push(w);
            }
          });

          if (incompleteWords.length > 0) {
            onAddNotification(
              "info",
              "Enrichment Initiated",
              `Detected ${incompleteWords.length} words with incomplete grammatical metadata. Starting automatic AI metadata completion...`,
            );
            processExternalImport(incompleteWords, completeWords);
          } else {
            onImportWords(filteredItems);
          }
          return;
        }

        processExternalImport(filteredItems);
      } catch (err: any) {
        console.error("FileReader onload error details:", err);
        onAddNotification(
          "error",
          "Parse Failed",
          `Failed to parse the JSON file: ${err.message || String(err)}`,
        );
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input after use
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 w-full h-full lg:min-h-0 flex-1">
      {/* Left Column: Input */}
      <section className="flex-none lg:flex-1 h-[240px] lg:h-auto flex flex-col bg-white rounded-2xl lg:rounded-[32px] shadow-sm border border-[#E0E0D5] overflow-hidden shrink-0">
        <div className="px-4 py-3 lg:px-8 lg:py-6 border-b border-[#F5F5F0] flex justify-between items-center">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-[#F9F9F4] rounded-lg text-[#5A5A40]">
              <Languages className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
            <div>
              <h2 className="text-[10px] lg:text-xs uppercase tracking-tighter font-bold text-[#8E8E80]">
                Add Vocabulary
              </h2>
              <p className="hidden sm:block text-[10px] lg:text-xs text-[#8E8E80] mt-0.5">
                Enter German words, one per line.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8 flex flex-col relative bg-gradient-to-b from-white to-[#FDFDFB]">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder="e.g.&#10;Weltraum&#10;Schwerkraft&#10;Galaxie"
            className="flex-1 w-full resize-none outline-none text-[#2A2A20] placeholder:text-[#E0E0D5] focus:ring-0 text-base lg:text-xl font-serif"
            style={{ fontFamily: "'Georgia', serif" }}
          />

          <div className="mt-2 pt-2 lg:mt-4 lg:pt-4 flex gap-2 justify-end items-center">
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              onChange={handleImageSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={loading || extracting}
              className="px-4 py-2 lg:px-6 lg:py-3 rounded-full bg-white text-[#5A5A40] border border-[#E0E0D5] text-[10px] lg:text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F4] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:border-[#5A5A40]/50"
              title="Take a photo or select an image to extract vocabulary words with Gemini"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  Photo Scan
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTranslate}
              disabled={loading || extracting || !inputText.trim()}
              className="px-4 py-2 lg:px-6 lg:py-3 rounded-full bg-[#5A5A40] text-white text-[10px] lg:text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-transform flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Translate & Add
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Right Column: List */}
      <section className="flex-1 min-h-[200px] lg:min-h-0 flex flex-col bg-white rounded-2xl lg:rounded-[32px] shadow-sm border border-[#E0E0D5] overflow-hidden shrink-0">
        <div className="px-3 py-2 lg:px-6 lg:py-4 border-b border-[#F5F5F0] flex justify-between items-center">
          <h2 className="text-xs uppercase tracking-tighter font-bold text-[#8E8E80]">
            Your List
          </h2>
          <div className="flex items-center gap-1.5 lg:gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 lg:p-2 text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-lg hover:bg-[#F9F9F4]"
              title="Import Backup"
            >
              <Upload className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <button
              onClick={handleExport}
              disabled={words.length === 0}
              className="p-1.5 lg:p-2 text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-lg hover:bg-[#F9F9F4] disabled:opacity-50"
              title="Export Backup"
            >
              <Download className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            {!showTrashBin ? (
              <button
                onClick={() => {
                  if (words.length > 0) {
                    setShowTrashBin(true);
                  }
                }}
                disabled={words.length === 0}
                title="Select all to clear"
                className="ml-1 text-[11px] font-bold font-mono bg-[#F5F5F0] text-[#8E8E80] px-3 py-1 rounded hover:border-red-300 hover:text-red-500 hover:bg-[#FFF0F0] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-[#E0E0D5]"
              >
                {words.length}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 ml-1 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(true)}
                  title="Clear all words"
                  className="p-1.5 text-red-500 bg-[#FFF0F4] hover:bg-[#FFE2E7] transition-colors border border-[#FFD2DB] rounded-lg flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTrashBin(false)}
                  title="Keep words"
                  className="p-1 px-[7px] text-[10px] uppercase tracking-widest font-mono font-bold text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-lg bg-[#F5F5F0] border border-[#E0E0D5] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Input Bar */}
        {words.length > 0 && (
          <div className="px-3 py-1.5 lg:px-4 lg:py-2 bg-[#FDFDFB] border-b border-[#F5F5F0] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#8E8E80] shrink-0" />
            <input
              type="text"
              placeholder="Search words by German, English, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs lg:text-sm text-[#2A2A20] placeholder:text-[#8E8E80]/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 hover:bg-[#F5F5F0] rounded text-[#8E8E80] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center gap-1 border-l border-[#E0E0D5] pl-1.5 ml-1 shrink-0">
              {/* Filter Icon Button with Hidden Native Select overlay */}
              <div
                className="relative p-1.5 text-[#8E8E80] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-[#E0E0D5]/60"
                title={`Filter Type: ${filterType}`}
              >
                <Filter className="w-4 h-4" />
                {filterType !== "all" && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#5A5A40] rounded-full" />
                )}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                >
                  <option value="all">Any Type</option>
                  <option value="noun">Noun</option>
                  <option value="verb">Verb</option>
                  <option value="adjective">Adjective</option>
                  <option value="adverb">Adverb</option>
                  <option value="preposition">Preposition</option>
                  <option value="conjunction">Conjunction</option>
                  <option value="pronoun">Pronoun</option>
                  <option value="phrase">Phrase</option>
                </select>
              </div>

              {/* Sort Icon Button with Hidden Native Select overlay */}
              <div
                className="relative p-1.5 text-[#8E8E80] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-[#E0E0D5]/60"
                title={`Sort: ${sortBy}`}
              >
                <ArrowUpDown className="w-4 h-4" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                  <option value="level-desc">Mastery (Highest)</option>
                  <option value="level-asc">Mastery (Lowest)</option>
                  <option value="cefr-asc">CEFR (Asc)</option>
                  <option value="cefr-desc">CEFR (Desc)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-0.5 custom-scrollbar">
          {words.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#E0E0D5]">
              <BookOpen className="w-8 h-8 mb-3 opacity-20" />
              <p
                className="text-sm font-serif italic"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                No vocabulary added yet.
              </p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#E0E0D5] py-8">
              <Search className="w-8 h-8 mb-2 opacity-20" />
              <p
                className="text-sm font-serif italic"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                No matching words found.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredWords.map((w) => {
                const badge = getCategoryBadgeStyles(w.wordType);
                return (
                  <div
                    key={w.id}
                    onClick={() => setViewingWordId(w.id)}
                    className="flex items-center px-1.5 py-1.5 lg:px-3 lg:py-2.5 hover:bg-[#F9F9F4] rounded-lg lg:rounded-xl transition-colors group animate-fade-in cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Mastery Indicator */}
                        <div
                          className="relative flex items-center justify-center opacity-40 shrink-0"
                          title={`Mastery: ${w.level || 1}/5`}
                        >
                          <svg
                            viewBox="0 0 12 12"
                            height="12"
                            width="12"
                            className="-rotate-90"
                          >
                            <circle
                              stroke="#E0E0D5"
                              fill="transparent"
                              strokeWidth="2"
                              r="5"
                              cx="6"
                              cy="6"
                            />
                            <circle
                              stroke={
                                (w.level || 1) >= 5 ? "#22c55e" : "#5A5A40"
                              }
                              fill="transparent"
                              strokeWidth="2"
                              strokeDasharray={`${2 * Math.PI * 5}`}
                              style={{
                                strokeDashoffset: `${2 * Math.PI * 5 * (1 - (w.level || 1) / 5)}`,
                              }}
                              strokeLinecap="round"
                              r="5"
                              cx="6"
                              cy="6"
                            />
                          </svg>
                        </div>
                        <span
                          className="text-base lg:text-lg font-serif text-[#2A2A20]"
                          style={{ fontFamily: "'Georgia', serif" }}
                        >
                          {w.wordType === "noun" &&
                          w.plural &&
                          !w.plural.toLowerCase().includes("no plural")
                            ? `${w.german}, ${w.plural}`
                            : w.german}
                        </span>
                        {w.wordType && (
                          <span
                            className={`text-[8px] uppercase tracking-wider px-1 py-0.5 rounded font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        )}
                        {(w.cefrLevel || w.theme) && (
                          <span className="text-[10px] text-[#8E8E80] opacity-80 font-medium ml-1">
                            {w.cefrLevel ? w.cefrLevel : ""}
                            {w.cefrLevel && w.theme ? " - " : ""}
                            {w.theme ? w.theme : ""}
                          </span>
                        )}
                        {w.pinned && (
                          <Pin className="w-3 h-3 text-pink-500 fill-current ml-1 opacity-80" />
                        )}
                      </div>
                      {w.wordType === "verb" &&
                        (w.present || w.preterite || w.perfect) && (
                          <span className="text-[10px] text-[#8E8E80] font-mono mt-0.5 truncate">
                            {w.present || "—"} • {w.preterite || "—"} •{" "}
                            {w.perfect || "—"}{" "}
                            <span className="text-[8px] uppercase tracking-wider bg-[#5A5A40]/10 px-1 py-0.5 rounded font-bold text-[#5A5A40] ml-1">
                              {w.verbClass || "verb"}
                            </span>
                          </span>
                        )}
                    </div>
                    <div className="ml-auto flex items-center gap-2 lg:gap-3 shrink-0">
                      <span className="text-[10px] text-[#8E8E80] opacity-80 uppercase font-medium max-w-[120px] truncate">
                        {w.english}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWordId(w.id);
                        }}
                        className="hidden md:block p-1 text-[#8E8E80] lg:opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#5A5A40] hover:bg-white rounded"
                        title="Edit Word"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveWord(w.id);
                        }}
                        className="p-1 text-[#8E8E80] opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete Word"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Photo Vocabulary Extractor Modal */}
      {extractedWords.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A4A40]/30 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl lg:rounded-[32px] border border-[#E0E0D5] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 lg:px-8 border-b border-[#F5F5F0] flex justify-between items-center bg-[#FDFDFB]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#5A5A40]" />
                  Extracted Words
                </h3>
                <p className="text-[10px] lg:text-xs text-[#8E8E80] mt-0.5">
                  Select which vocabulary words you want to save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExtractedWords([])}
                className="p-1.5 text-[#8E8E80] hover:text-[#5A5A40] transition-colors rounded-lg hover:bg-[#F9F9F4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Controls */}
            <div className="px-6 py-3 bg-[#F9F9F4] border-b border-[#F5F5F0] flex justify-between items-center text-xs text-[#8E8E80]">
              <span>
                {extractedWords.filter((w) => w.selected).length} of{" "}
                {extractedWords.length} words selected
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setExtractedWords((words) =>
                      words.map((w) => ({ ...w, selected: true })),
                    )
                  }
                  className="font-medium text-[#5A5A40] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[#E0E0D5]">|</span>
                <button
                  type="button"
                  onClick={() =>
                    setExtractedWords((words) =>
                      words.map((w) => ({ ...w, selected: false })),
                    )
                  }
                  className="font-medium text-[#5A5A40] hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Word List Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 custom-scrollbar">
              {extractedWords.map((word, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setExtractedWords((current) =>
                      current.map((w, i) =>
                        i === idx ? { ...w, selected: !w.selected } : w,
                      ),
                    );
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    word.selected
                      ? "border-[#5A5A40] bg-[#FDFDFB] shadow-sm"
                      : "border-[#E0E0D5] opacity-60 hover:opacity-100 bg-white"
                  }`}
                >
                  <div className="mt-1">
                    {word.selected ? (
                      <CheckSquare className="w-5 h-5 text-[#5A5A40]" />
                    ) : (
                      <Square className="w-5 h-5 text-[#8E8E80]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 font-serif">
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-base lg:text-lg text-[#2A2A20] font-medium"
                          style={{ fontFamily: "'Georgia', serif" }}
                        >
                          {word.german}
                        </span>
                        {word.wordType && (
                          <span
                            className={`text-[8px] uppercase tracking-wider px-1 py-0.5 rounded font-bold border ${getCategoryBadgeStyles(word.wordType).bg} ${getCategoryBadgeStyles(word.wordType).text} ${getCategoryBadgeStyles(word.wordType).border}`}
                          >
                            {getCategoryBadgeStyles(word.wordType).label}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#8E8E80] font-mono font-medium max-w-[150px] truncate text-right">
                        {word.english}
                      </span>
                    </div>
                    {word.examples && word.examples.length > 0 && (
                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-[#E0E0D5]/60">
                        {word.examples.map((example, eIdx) => (
                          <p
                            key={eIdx}
                            className="text-xs text-[#8E8E80] italic leading-relaxed font-serif"
                          >
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 lg:p-6 border-t border-[#F5F5F0] flex gap-3 justify-end bg-[#FDFDFB]">
              <button
                type="button"
                onClick={() => setExtractedWords([])}
                className="px-4 py-2 border border-[#E0E0D5] text-[#8E8E80] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const selected = extractedWords.filter((w) => w.selected);
                  if (selected.length > 0) {
                    onAddPreTranslatedWords(
                      selected.map(
                        ({
                          german,
                          english,
                          examples,
                          wordType,
                          plural,
                          present,
                          preterite,
                          perfect,
                          verbClass,
                        }) => ({
                          german,
                          english,
                          examples,
                          wordType,
                          plural,
                          present,
                          preterite,
                          perfect,
                          verbClass,
                        }),
                      ),
                    );
                    setExtractedWords([]);
                  }
                }}
                disabled={extractedWords.filter((w) => w.selected).length === 0}
                className="px-5 py-2.5 bg-[#5A5A40] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Add Selected ({extractedWords.filter((w) => w.selected).length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear List Confirmation Modal (Safety Modal) */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-[#4A4A40]/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl lg:rounded-[28px] border border-[#E0E0D5] shadow-2xl p-6 flex flex-col items-center">
            <div className="p-3 bg-red-50 text-red-500 rounded-full mb-4 border border-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-sm font-bold uppercase tracking-widest font-mono text-[#2A2A20] mb-2 text-center">
              Danger Zone
            </h3>

            <p className="text-xs text-[#8E8E80] text-center mb-6 leading-relaxed">
              This will permanently delete all{" "}
              <strong className="text-red-500 font-bold">
                {words.length} words
              </strong>{" "}
              from your deck. This process cannot be undone. Are you sure?
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  setShowTrashBin(false);
                }}
                className="flex-1 py-2.5 rounded-full border border-[#E0E0D5] hover:bg-[#F5F5F0] transition-colors text-xs font-bold uppercase tracking-wider font-mono text-[#8E8E80] text-center cursor-pointer"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllWords?.();
                  setShowClearConfirmModal(false);
                  setShowTrashBin(false);
                }}
                className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors text-xs font-bold uppercase tracking-wider font-mono text-white text-center cursor-pointer shadow-md shadow-red-500/10"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Progress Modal */}
      {importProgress && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#4A4A40]/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl lg:rounded-[28px] border border-[#E0E0D5] shadow-2xl overflow-hidden p-6 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-[#5A5A40] animate-spin mb-4" />
            <h3 className="text-sm font-bold uppercase tracking-widest font-mono text-[#2A2A20] mb-2 text-center">
              Processing External Word List
            </h3>
            <p className="text-xs text-[#8E8E80] text-center mb-4">
              {isImportCancelling
                ? "Cancelling at next batch..."
                : "Analyzing metadata and enriching translations..."}
            </p>
            <div className="w-full bg-[#F5F5F0] rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-[#5A5A40] h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(importProgress.current / importProgress.total) * 100}%`,
                }}
              ></div>
            </div>
            <p className="text-[10px] font-mono font-bold text-[#8E8E80] uppercase tracking-widest mb-6">
              {importProgress.current} / {importProgress.total} Words
            </p>

            <button
              onClick={() => {
                setIsImportCancelling(true);
                importCancelledRef.current = true;
              }}
              disabled={isImportCancelling}
              className={`w-full py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono border transition-colors ${
                isImportCancelling
                  ? "bg-[#F5F5F0] text-[#8E8E80] border-[#E0E0D5] cursor-not-allowed"
                  : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
              }`}
            >
              {isImportCancelling ? "Cancelling..." : "Cancel Import"}
            </button>
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {errorDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#4A4A40]/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl lg:rounded-[28px] border border-[#E0E0D5] shadow-2xl overflow-hidden flex flex-col">
            {/* Header with Categorized Colors */}
            <div
              className={`px-6 py-4 flex items-center gap-3 border-b border-[#F5F5F0] ${
                errorDetails.category === "api_key"
                  ? "bg-amber-50 text-amber-800"
                  : errorDetails.category === "payload_size"
                    ? "bg-orange-50 text-orange-800"
                    : errorDetails.category === "network"
                      ? "bg-red-50 text-red-800"
                      : errorDetails.category === "safety"
                        ? "bg-rose-50 text-rose-800"
                        : errorDetails.category === "quota"
                          ? "bg-blue-50 text-blue-800"
                          : "bg-neutral-50 text-neutral-800"
              }`}
            >
              <div className="p-2 bg-white/80 rounded-lg shrink-0 shadow-sm border border-current/10">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest font-mono">
                  {errorDetails.title}
                </h3>
                <p className="text-[10px] opacity-85 uppercase tracking-wider mt-0.5">
                  Category: {errorDetails.category || "unknown"}
                </p>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#4A4A40] leading-relaxed font-serif">
                {errorDetails.message}
              </p>

              {/* Specific helpful instructions based on category */}
              <div className="bg-[#F9F9F4] rounded-xl p-4 border border-[#E0E0D5]/50 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] flex items-center gap-1.5 font-sans">
                  <Info className="w-3.5 h-3.5 text-[#5A5A40]" />
                  How to Fix / Troubleshoot:
                </h4>
                <ul className="text-xs text-[#8E8E80] space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                  {errorDetails.category === "api_key" && (
                    <>
                      <li>
                        Check if{" "}
                        <code className="bg-neutral-150 px-1 py-0.5 rounded text-neutral-700">
                          GEMINI_API_KEY
                        </code>{" "}
                        is correctly specified in your environment settings.
                      </li>
                      <li>
                        Ensure that there are no blank spaces or quote marks
                        around the key.
                      </li>
                      <li>
                        In AI Studio build, you can set keys in the Settings
                        menu.
                      </li>
                    </>
                  )}
                  {errorDetails.category === "payload_size" && (
                    <>
                      <li>The raw image data is too large to process.</li>
                      <li>
                        Try uploading a standard low-resolution JPEG instead of
                        a high-resolution PNG, or compress it first.
                      </li>
                      <li>
                        Avoid uploading extremely large high-megapixel photos
                        directly.
                      </li>
                    </>
                  )}
                  {errorDetails.category === "network" && (
                    <>
                      <li>
                        Ensure your mobile phone or laptop has an active
                        internet connection (check Wi-Fi / cellular signal).
                      </li>
                      <li>
                        The request may have aborted due to a slow link. Please
                        retry the scan when your bandwidth is stable.
                      </li>
                    </>
                  )}
                  {errorDetails.category === "safety" && (
                    <>
                      <li>
                        Gemini API safety filters check content for potentially
                        sensitive material.
                      </li>
                      <li>
                        Ensure the image only contains linguistic German
                        training terms, without political, aggressive, or
                        medical illustrations.
                      </li>
                    </>
                  )}
                  {errorDetails.category === "quota" && (
                    <>
                      <li>
                        Gemini's daily or minute-ly frequency bounds have been
                        exceeded.
                      </li>
                      <li>
                        Please wait 30–60 seconds, then tap "Photo Scan" again.
                      </li>
                    </>
                  )}
                  {errorDetails.category === "parse" && (
                    <>
                      <li>
                        For file imports: The translation engine response may
                        have been truncated or corrupted due to massive batch
                        sizes. We have reduced the batch chunk size to prevent
                        this. Ensure your JSON file is intact and not corrupted.
                      </li>
                      <li>
                        For image scans: Ensure the photo has clear lighting, is
                        centered, and the vocabulary text runs in clear,
                        readable columns.
                      </li>
                      <li>
                        If handwriting or text is highly cursive or blurry,
                        rewrite or retype a smaller list of terms and scan
                        again.
                      </li>
                    </>
                  )}
                  {(!errorDetails.category ||
                    errorDetails.category === "unknown") && (
                    <>
                      <li>
                        Verify your internet connection remains active and
                        stable.
                      </li>
                      <li>
                        For imports: If you are importing a massive dataset, try
                        splitting the file or resuming the import.
                      </li>
                      <li>
                        For image scans: Try taking a closer, cropped photo
                        focusing only on specific words rather than an entire
                        page.
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Technical Details Collapsible */}
              {errorDetails.technicalDetails && (
                <div className="border border-[#E0E0D5] rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setShowTechDetails(!showTechDetails)}
                    className="w-full px-4 py-2 text-left bg-neutral-50 hover:bg-neutral-100 transition-colors flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-[#8E8E80] cursor-pointer"
                  >
                    <span>Technical Log Information</span>
                    <span className="text-[10px] font-mono">
                      {showTechDetails ? "Hide [-]" : "Show [+]"}
                    </span>
                  </button>
                  {showTechDetails && (
                    <div className="p-3 bg-neutral-900 border-t border-[#E0E0D5] overflow-x-auto max-h-[120px] custom-scrollbar">
                      <pre className="text-[9px] font-mono text-neutral-300 whitespace-pre-wrap leading-normal break-all">
                        {errorDetails.technicalDetails}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#F9F9F4] border-t border-[#F5F5F0] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setErrorDetails(null);
                  setShowTechDetails(false);
                }}
                className="px-6 py-2 bg-[#5A5A40] hover:bg-[#4A4A30] text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm hover:translate-y-[-1px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingWordId && (
        <WordFlashcardModal
          word={words.find((w) => w.id === viewingWordId)!}
          onClose={() => setViewingWordId(null)}
          onMastered={(id) => {
            onUpdateWord(id, {
              level: 5,
              nextReview: Date.now() + 60 * 60 * 1000 * 24 * 30,
            });
          }}
          onEdit={() => {
            setEditingWordId(viewingWordId);
            setViewingWordId(null);
          }}
        />
      )}

      {editingWordId && (
        <WordEditModal
          word={words.find((w) => w.id === editingWordId)!}
          onClose={() => setEditingWordId(null)}
          onSave={(id, data) => onUpdateWord(id, data)}
          onDelete={(id) => {
            onRemoveWord(id);
            setEditingWordId(null);
          }}
        />
      )}
    </div>
  );
}
