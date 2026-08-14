import React from "react";
import { Link } from "react-router-dom";
import { pathForPrivacy } from "../staticPages";
import { useLang, useT } from "../i18n/LangContext.js";

// 全ページ共通のフッター。プライバシーポリシーへの導線は
// AdSenseの審査で「サイト運営者に到達できるか」を見られるため、
// 一部のページだけでなく全ページから辿れる位置に置いている
export default function SiteFooter() {
  const lang = useLang();
  const t = useT();

  return (
    <footer className="site-footer">
      <Link to={pathForPrivacy(lang)}>{t("privacyPage.footerLink")}</Link>
    </footer>
  );
}
