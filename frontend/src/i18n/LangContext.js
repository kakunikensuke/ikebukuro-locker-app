import { createContext, useContext, useMemo } from "react";
import i18n from "./index.js";

export const SUPPORTED_LANGS = ["ja", "en"];

export const LangContext = createContext("ja");

export function useLang() {
  return useContext(LangContext);
}

// react-i18nextのuseTranslation()（グローバルなchangeLanguageに依存）ではなく、
// URL由来のlangからgetFixedTで都度tを算出する。切り替え時の一瞬の言語ちらつきを防ぐため。
export function useT() {
  const lang = useLang();
  return useMemo(() => i18n.getFixedT(lang), [lang]);
}
