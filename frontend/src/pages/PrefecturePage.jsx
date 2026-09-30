import React, { useEffect, useMemo, useState } from "react";
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
import { fetchLockers, fetchStations } from "../api";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";
import NotFound from "./NotFound.jsx";
import InsightSection from "../components/InsightSection.jsx";
import { prefectureInsightItems } from "../stationInsightRender.js";
import { stationListLine } from "../stationSummary.js";
import { prefectureForSlug } from "../stations";

export default function PrefecturePage() {
  const { prefectureSlug } = useParams();
  const lang = useLang();
  const t = useT();
  const [query, setQuery] = useState("");
  const [lockerCounts, setLockerCounts] = useState({});
  // 県ごとの解説に必要。プリレンダ（scripts/prerender.js）と同じ内容を描くためのもので、
  // ここが無いとJSを実行するクローラからは解説の無いページに見える
  const [allLockers, setAllLockers] = useState([]);
  const prefecture = prefectureForPrefectureSlug(prefectureSlug);

  // 駅一覧の各行に要点を出すため、駅ごとにロッカーをまとめておく
  const lockersByStation = useMemo(() => {
    const map = new Map();
    for (const l of allLockers) {
      if (!map.has(l.station_slug)) map.set(l.station_slug, []);
      map.get(l.station_slug).push(l);
    }
    return map;
  }, [allLockers]);

  const insightItems = useMemo(() => {
    if (!prefecture || !allLockers.length) return [];
    const prefectureLockers = allLockers.filter((l) => prefectureForSlug(l.station_slug) === prefecture);
    if (!prefectureLockers.length) return [];
    return prefectureInsightItems({ prefectureLockers, allLockers, prefecture, lang, t });
  }, [prefecture, allLockers, lang, t]);

  useEffect(() => {
    fetchStations()
      .then((data) => {
        const counts = {};
        for (const s of data.stations || []) counts[s.slug] = s.count;
        setLockerCounts(counts);
      })
      .catch(() => setLockerCounts({}));
  }, []);

  useEffect(() => {
    fetchLockers({})
      .then((data) => setAllLockers(data.results))
      .catch(() => setAllLockers([]));
  }, []);

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
        <h1>
          <Link to={pathForPrefectureList(lang)} className="app-title-link">
            {t("app.title")}
          </Link>
        </h1>
        <div className="header-controls">
          <LangSwitcher />
        </div>
      </header>

      <main className="app-main">
        <Link className="back-to-areas" to={pathForPrefectureList(lang)}>
          {t("prefecturePage.backToAreas")}
        </Link>
        <InsightSection
          heading={t("prefectureInsight.heading", { prefecture: prefLabel })}
          items={insightItems}
        />

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
          // 各駅の要点（台数・スーツケースが入る台数・最安）を1行で出す（2026-09-30）。
          // 静的HTML（prerender.js の prefecturePage）と同じ stationListLine() から作る
          <ul className="station-rows">
            {filteredStations.map((s) => {
              const ls = lockersByStation.get(s.slug);
              return (
                <li key={s.slug}>
                  <Link to={pathForStation(lang, s.slug)}>{slugToName(s.slug, lang)}</Link>
                  <span>
                    {ls
                      ? stationListLine(ls, t, lang)
                      : t("prefecturePage.stationLockerCount", { count: lockerCounts[s.slug] || 0 })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
