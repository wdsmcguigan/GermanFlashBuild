import React, { useState } from "react";
import { VocabWord } from "../types";
import { X, Save, Trash2 } from "lucide-react";

interface WordEditModalProps {
  word: VocabWord;
  onClose: () => void;
  onSave: (id: string, updatedData: Partial<VocabWord>) => void;
  onDelete: (id: string) => void;
}

export function WordEditModal({
  word,
  onClose,
  onSave,
  onDelete,
}: WordEditModalProps) {
  const [formData, setFormData] = useState<Partial<VocabWord>>({ ...word });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(word.id, formData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#4A4A40]/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-[#E0E0D5] shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#F5F5F0] flex justify-between items-center bg-[#FDFDFB]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40]">
            Edit Word Details
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E8E80] hover:bg-[#F5F5F0] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-sm custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                German
              </span>
              <input
                type="text"
                name="german"
                value={formData.german || ""}
                onChange={handleChange}
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                English
              </span>
              <input
                type="text"
                name="english"
                value={formData.english || ""}
                onChange={handleChange}
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Word Type
              </span>
              <select
                name="wordType"
                value={formData.wordType || ""}
                onChange={handleChange}
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              >
                <option value="">Unknown</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
                <option value="preposition">Preposition</option>
                <option value="conjunction">Conjunction</option>
                <option value="pronoun">Pronoun</option>
                <option value="phrase">Phrase</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Plural
              </span>
              <input
                type="text"
                name="plural"
                value={formData.plural || ""}
                onChange={handleChange}
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Präsens
              </span>
              <input
                type="text"
                name="present"
                value={formData.present || ""}
                onChange={handleChange}
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Präteritum
              </span>
              <input
                type="text"
                name="preterite"
                value={formData.preterite || ""}
                onChange={handleChange}
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Perfekt
              </span>
              <input
                type="text"
                name="perfect"
                value={formData.perfect || ""}
                onChange={handleChange}
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                CEFR Level
              </span>
              <input
                type="text"
                name="cefrLevel"
                value={formData.cefrLevel || ""}
                onChange={handleChange}
                placeholder="A1, B2..."
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Theme
              </span>
              <input
                type="text"
                name="theme"
                value={formData.theme || ""}
                onChange={handleChange}
                placeholder="Travel, Food..."
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Synonyms
              </span>
              <input
                type="text"
                name="synonyms"
                value={formData.synonyms?.join(", ") || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    synonyms: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Comma-separated"
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
                Antonyms
              </span>
              <input
                type="text"
                name="antonyms"
                value={formData.antonyms?.join(", ") || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    antonyms: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Comma-separated"
                className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40]"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
              Examples (One per line)
            </span>
            <textarea
              name="examples"
              value={formData.examples?.join("\n") || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  examples: e.target.value.split("\n"),
                }))
              }
              className="border border-[#E0E0D5] rounded-lg px-3 py-2 bg-[#F9F9F4] focus:outline-none focus:border-[#5A5A40] min-h-[80px]"
            />
          </label>

          <label className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[#F5F5F0]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E80]">
              Mastery Level
            </span>
            <div className="flex items-center gap-4">
              <input
                type="range"
                name="level"
                min="1"
                max="5"
                value={formData.level || 1}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    level: parseInt(e.target.value, 10),
                  }))
                }
                className="flex-1 accent-[#5A5A40] h-1.5 bg-[#E0E0D5] rounded-lg appearance-none cursor-pointer"
              />
              <span
                className="text-base font-serif font-bold text-[#5A5A40] w-6 text-center"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {formData.level || 1}
              </span>
            </div>
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-[#8E8E80]">
              <span>New</span>
              <span>Mastered</span>
            </div>
          </label>

          <label className="flex items-center gap-3 mt-4 p-3 bg-pink-50/50 border border-pink-100 rounded-xl cursor-pointer hover:bg-pink-50 transition-colors">
            <input
              type="checkbox"
              checked={!!formData.pinned}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pinned: e.target.checked }))
              }
              className="w-4 h-4 accent-pink-500 rounded border-pink-300"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-pink-700">
                Pin Word
              </span>
              <span className="text-[10px] text-pink-500/80">
                Mark this word for extra focus
              </span>
            </div>
          </label>
        </div>

        <div className="p-4 border-t border-[#F5F5F0] flex justify-between bg-[#FDFDFB]">
          <button
            onClick={() => {
              onDelete(word.id);
              onClose();
            }}
            className="px-4 py-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#E0E0D5] text-[#8E8E80] rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F4] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-[#5A5A40] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
