/**
 * Arabic-aware, case-insensitive normalization for client-side search matching.
 *
 * Mirrors the helper used inside the Combobox: strips Arabic diacritics
 * (tashkeel) and the tatweel, folds alef variants and common letter shapes so
 * "احمد" matches "أحمد", and lowercases Latin text. Shared so the command
 * palette filter and its tests use the exact same matching rules.
 */
export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "") // tashkeel + superscript alef + tatweel
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ى/g, "ي") // ى → ي
    .trim();
}
