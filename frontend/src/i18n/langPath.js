import { langPrefix } from "../stations.js";

export function otherLang(lang) {
  return lang === "en" ? "ja" : "en";
}

// 現在のURLのパス階層（駅slug・ロッカー詳細）とクエリ（?view=/?sort=）を保持したまま、
// もう一方の言語のURLを組み立てる（言語プレフィックスの付け外しのみ行う）
export function otherLangPath(pathname, search, currentLang) {
  const currentPrefix = langPrefix(currentLang);
  const rest = currentPrefix && pathname.startsWith(currentPrefix)
    ? pathname.slice(currentPrefix.length)
    : pathname;
  const restPath = rest === "" ? "/" : rest;
  const nextLang = otherLang(currentLang);
  return `${langPrefix(nextLang)}${restPath}${search || ""}`;
}
