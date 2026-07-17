import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  PREFECTURES,
  STATIONS,
  stationsInPrefecture,
  prefectureName,
  pathForPrefecture,
  pathForPrefectureList,
} from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";

export default function AreasIndexPage() {
  const lang = useLang();
  const t = useT();
  const description = t("areasPage.description", { count: STATIONS.length });

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("areasPage.titleTag")}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={t("areasPage.ogTitle")} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForPrefectureList(lang)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForPrefectureList("ja")}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForPrefectureList("en")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForPrefectureList("ja")}`} />
      </Helmet>

      <header className="app-header">
        <h1>{t("app.title")}</h1>
        <div className="header-controls">
          <LangSwitcher />
        </div>
      </header>

      <main className="app-main">
        <h2>{t("areasPage.heading")}</h2>
        <ul className="area-grid">
          {PREFECTURES.map((pref) => (
            <li key={pref}>
              <Link className="area-card" to={pathForPrefecture(lang, pref)}>
                <span className="area-card-name">{prefectureName(pref, lang)}</span>
                <div className="locker-card-tags">
                  <span className="tag">
                    {t("areasPage.prefectureStationCount", { count: stationsInPrefecture(pref).length })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
