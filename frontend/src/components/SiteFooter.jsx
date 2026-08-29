import React from "react";
import { Link } from "react-router-dom";
import { pathForGuideList, pathForPrivacy } from "../staticPages";
import { pathForPrefectureList } from "../stations";
import { pathForSizeList } from "../lockerSizes";
import { useLang, useT } from "../i18n/LangContext.js";

// 全ページ共通のフッター。
//
// AdSenseの審査では「サイト運営者に到達できるか」を見られる。2026-08-29の不承認
// （有用性の低いコンテンツ）の時点では、ここにプライバシーポリシーへのリンク1本しか
// 無く、検索から駅ページに着地した人が運営者情報やお問い合わせに辿れなかった。
//
// **プリレンダ（scripts/prerender.js の footerHtml）と同じ構成を保つこと。**
// Reactは#rootを丸ごと置き換えるので、片方だけ直すとJS実行後にリンクが消える。
export default function SiteFooter() {
  const lang = useLang();
  const t = useT();
  // 区切りは言語に合わせる（英語ページに全角スラッシュを出さない）
  const sep = lang === "en" ? " / " : " ／ ";

  return (
    <footer className="site-footer">
      <Link to={pathForPrefectureList(lang)}>{t("siteFooter.footerAreas")}</Link>
      {sep}
      <Link to={pathForSizeList(lang)}>{t("siteFooter.footerSizes")}</Link>
      {sep}
      <Link to={pathForGuideList(lang)}>{t("siteFooter.footerGuides")}</Link>
      {sep}
      <Link to={`${pathForPrivacy(lang)}#contact`}>{t("siteFooter.footerContact")}</Link>
      {sep}
      <Link to={pathForPrivacy(lang)}>{t("privacyPage.footerLink")}</Link>
      {sep}
      {/* 運営者情報はドメイン共通のハブに置いてある（各アプリで重複させない） */}
      <a href={t("siteFooter.footerOperatorUrl")}>{t("siteFooter.footerOperator")}</a>
    </footer>
  );
}
