import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { GUIDES } from "../content/guides";
import { pathForGuide, pathForGuideList } from "../staticPages";
import { pathForPrefectureList } from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";

// 解説記事の一覧（/guides）。記事側のdescriptionには実データの{{変数}}が入るため、
// ここでは変数を含まないheadingだけを出して、データ取得を待たずに描けるようにしている
export default function GuidesIndexPage() {
  const lang = useLang();
  const t = useT();

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("guidesPage.titleTag")}</title>
        <meta name="description" content={t("guidesPage.description")} />
        <meta property="og:title" content={t("guidesPage.heading")} />
        <meta property="og:description" content={t("guidesPage.description")} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForGuideList(lang)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForGuideList("ja")}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForGuideList("en")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForGuideList("ja")}`} />
      </Helmet>

      <header className="app-header">
        <h1>
          <Link to={pathForPrefectureList(lang)} className="app-title-link">
            {t("app.title")}
          </Link>
        </h1>
        <div className="header-controls">
          <LangSwitcher />
        </div>
      </header>

      <main className="app-main guide-page">
        <h2>{t("guidesPage.heading")}</h2>
        <p>{t("guidesPage.lead")}</p>

        <ul className="guide-index">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link to={pathForGuide(lang, guide.slug)}>{guide.heading[lang]}</Link>
            </li>
          ))}
        </ul>

        <p>
          <Link to={pathForPrefectureList(lang)}>{t("prefecturePage.backToAreas")}</Link>
        </p>
      </main>
    </div>
  );
}
