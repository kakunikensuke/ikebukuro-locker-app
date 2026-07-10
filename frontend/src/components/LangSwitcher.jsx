import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "../i18n/LangContext.js";
import { otherLangPath } from "../i18n/langPath.js";

// 現在のページ階層・クエリ（?view=/?sort=）を保持したまま日本語⇔英語を切り替えるUI
export default function LangSwitcher() {
  const lang = useLang();
  const location = useLocation();
  const otherPath = otherLangPath(location.pathname, location.search, lang);
  const currentPath = `${location.pathname}${location.search}`;

  return (
    <div className="lang-switcher">
      <Link to={lang === "ja" ? currentPath : otherPath} className={lang === "ja" ? "active" : ""}>
        JA
      </Link>
      <Link to={lang === "en" ? currentPath : otherPath} className={lang === "en" ? "active" : ""}>
        EN
      </Link>
    </div>
  );
}
