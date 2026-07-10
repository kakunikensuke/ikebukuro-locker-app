import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { LangContext } from "./i18n/LangContext.js";

// URLの言語セグメント（ja=プレフィックスなし/en=/en）ごとにマウントされ、
// 配下のページ全体にlangをContextで配布するレイアウトRoute
export default function LangLayout({ lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={lang}>
      <Outlet />
    </LangContext.Provider>
  );
}
