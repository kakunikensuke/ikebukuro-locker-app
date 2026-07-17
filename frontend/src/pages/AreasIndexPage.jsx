import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  PREFECTURES,
  STATIONS,
  stationsInPrefecture,
  prefectureName,
  pathForPrefecture,
  pathForPrefectureList,
  pathForStation,
  slugToName,
} from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";

export default function AreasIndexPage() {
  const lang = useLang();
  const t = useT();
  const [query, setQuery] = useState("");
  const description = t("areasPage.description", { count: STATIONS.length });

  const filteredPrefectures = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PREFECTURES;
    return PREFECTURES.filter((pref) => prefectureName(pref, lang).toLowerCase().includes(q));
  }, [query, lang]);

  // 都道府県名だけでなく駅名（例：品川）でも検索できるよう、マッチした駅も別枠で表示する
  const filteredStations = useMemo(() => {
    const qRaw = query.trim();
    const q = qRaw.toLowerCase();
    if (!q) return [];
    return STATIONS.filter((s) => {
      const name = s.name[lang] || s.name.ja;
      return name.toLowerCase().includes(q) || s.kana.includes(qRaw);
    });
  }, [query, lang]);

  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && filteredPrefectures.length === 0 && filteredStations.length === 0;

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
        <input
          type="text"
          className="page-search-input"
          placeholder={t("areasPage.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {noResults && <p className="empty-message">{t("areasPage.searchNoResults")}</p>}

        {filteredStations.length > 0 && (
          <>
            <h3>{t("areasPage.stationResultsHeading")}</h3>
            <ul className="area-grid">
              {filteredStations.map((s) => (
                <li key={s.slug}>
                  <Link className="area-card" to={pathForStation(lang, s.slug)}>
                    <span className="area-card-name">{slugToName(s.slug, lang)}</span>
                    <div className="locker-card-tags">
                      <span className="tag">{prefectureName(s.prefecture, lang)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {filteredPrefectures.length > 0 && (
          <ul className="area-grid">
            {filteredPrefectures.map((pref) => (
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
        )}

        <p className="data-source-credit">{t("areasPage.dataSourceCredit")}</p>
      </main>
    </div>
  );
}
