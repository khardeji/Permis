// Lightweight i18n: French is the source language; add "ar" / "en" dictionaries
// with the same keys. Missing keys fall back to French.
import { fr } from "./fr";

export type Locale = "fr" | "ar" | "en";
export type Dict = typeof fr;

const dictionaries: Record<Locale, Partial<Dict>> = { fr, ar: {}, en: {} };

let current: Locale = "fr";
export function setLocale(l: Locale) {
  current = l;
}
export const isRtl = (l: Locale) => l === "ar";

export function t(key: keyof Dict): string {
  return (dictionaries[current][key] as string | undefined) ?? fr[key];
}
