import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  prefectureForPrefectureSlug,
  prefectureName,
  stationsInPrefecture,
  pathForPrefecture,
  pathForPrefectureList,
  pathForStation,
  slugToName,
} from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";
import NotFound from "./NotFound.jsx";

export default function PrefecturePage() {
  const { prefectureSlug } = useParams();
  const lang = useLang();
  const t = useT();
  const [query, setQuery] = useState("");
  const prefecture = prefectureForPrefectureSlug(prefectureSlug);

  if (!prefecture) {
    // :prefectureSlugは何にでもマッチするため、未知の都道府県slugはここで明示的にNotFoundを表示する。
    return <NotFound />;
  }

  const stations = stationsInPrefecture(prefecture);
  const prefLabel = prefectureName(prefecture, lang);
  const description = t("prefecturePage.description", { prefecture: prefLabel, count: stations.length });

  const q = query.trim().toLowerCase();
  const filteredStations = q
    ? stations.filter((s) => {
        const name = slugToName(s.slug, lang) || "";
        return name.toLowerCase().includes(q) || s.kana.includes(query.trim());
      })
    : stations;

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("prefecturePage.titleTag", { prefecture: prefLabel })}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={t("prefecturePage.ogTitle", { prefecture: prefLabel })} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForPrefecture(lang, prefecture)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForPrefecture("ja", prefecture)}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForPrefecture("en", prefecture)}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForPrefecture("ja", prefecture)}`} />
      </Helmet>

      <header className="app-header">
        <h1>{t("app.title")}</h1>
        <div className="header-controls">
          <LangSwitcher />
        </div>
      </header>

      <main className="app-main">
        <Link className="back-to-areas" to={pathForPrefectureList(lang)}>
          {t("prefecturePage.backToAreas")}
        </Link>
        <h2>{t("prefecturePage.heading", { prefecture: prefLabel })}</h2>
        <input
          type="text"
          className="page-search-input"
          placeholder={t("prefecturePage.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filteredStations.length === 0 ? (
          <p className="empty-message">{t("prefecturePage.searchNoResults")}</p>
        ) : (
          <ul className="area-grid">
            {filteredStations.map((s) => (
              <li key={s.slug}>
                <Link className="area-card" to={pathForStation(lang, s.slug)}>
                  <span className="area-card-name">{slugToName(s.slug, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
