import React, { useEffect, useMemo, useState } from "react";
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
import { pathForSizeList } from "../lockerSizes";
import { pathForGuideList } from "../staticPages";
import { pathForLuggageList } from "../luggageSearch.js";
import { homeAbout, homeRankings, pathForAirports } from "../homeContent.js";
import { fetchLockers } from "../api";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";

/**
 * トップページ（都道府県一覧を兼ねる）。
 *
 * 2026-09-30 作り直し: それまでは都道府県のカードが並ぶだけで、何のサイトかの説明も無かった
 * （本文257字）。目的別の入口・ランキング・このサイトについてを足した。
 * **ランキングと「このサイトについて」は scripts/prerender.js の topPage と同じ
 * homeContent.js の関数から作ること**（片方だけだとクローラと画面で中身がずれる）
 */
export default function AreasIndexPage() {
  const lang = useLang();
  const t = useT();
  const [query, setQuery] = useState("");
  const [lockers, setLockers] = useState([]);

  useEffect(() => {
    fetchLockers({})
      .then((data) => setLockers(data.results ?? []))
      .catch(() => setLockers([]));
  }, []);

  const stationsWithLockers = useMemo(() => new Set(lockers.map((l) => l.station_slug)), [lockers]);
  const stationCount = lockers.length ? stationsWithLockers.size : STATIONS.length;
  const description = t("areasPage.description", { count: stationCount });
  const rankings = useMemo(() => (lockers.length ? homeRankings(lockers, lang, t) : []), [lockers, lang, t]);
  const about = useMemo(() => (lockers.length ? homeAbout(lockers, t) : []), [lockers, t]);

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

  // 目的別の入口。先頭（スーツケース）だけ黄色の扉にする（ロゴの「自分が使う扉」と同じ意味）
  const entries = [
    { to: pathForLuggageList(lang), label: t("home.entryLuggage"), note: t("home.entryLuggageNote"), primary: true },
    { to: pathForAirports(lang), label: t("home.entryAirports"), note: t("home.entryAirportsNote") },
    { to: pathForSizeList(lang), label: t("home.entrySizes"), note: t("home.entrySizesNote") },
    { to: pathForGuideList(lang), label: t("home.entryGuides"), note: t("home.entryGuidesNote") },
  ];

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
        <h1>
          <Link to={pathForPrefectureList(lang)} className="app-title-link">
            {t("app.title")}
          </Link>
        </h1>
        <div className="header-controls">
          <LangSwitcher />
        </div>
      </header>

      <main className="app-main home">
        <section className="home-hero">
          <h2>{t("home.heroHeading")}</h2>
          <p className="page-lead">{t("home.heroLead", { stations: stationCount })}</p>
          <input
            type="search"
            className="page-search-input"
            placeholder={t("areasPage.searchPlaceholder")}
            aria-label={t("areasPage.searchPlaceholder")}
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
                      <span className="area-card-note">{prefectureName(s.prefecture, lang)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {!hasQuery && (
          <section className="home-entries">
            <h3 className="visually-hidden">{t("home.entryHeading")}</h3>
            <ul>
              {entries.map((e) => (
                <li key={e.to}>
                  <Link className={`entry-door${e.primary ? " is-primary" : ""}`} to={e.to}>
                    <strong>{e.label}</strong>
                    <span>{e.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2>{t("home.prefHeading")}</h2>
          {filteredPrefectures.length > 0 && (
            <ul className="area-grid">
              {filteredPrefectures.map((pref) => (
                <li key={pref}>
                  <Link className="area-card" to={pathForPrefecture(lang, pref)}>
                    <span className="area-card-name">{prefectureName(pref, lang)}</span>
                    <span className="area-card-note">
                      {/* ロッカーのある駅だけ数える（静的HTMLの topPage と同じ）。駅データには
                          ロッカー0件の駅も入っていて、全部数えると「全国427駅」と合わなくなる */}
                      {t("areasPage.prefectureStationCount", {
                        count: lockers.length
                          ? stationsInPrefecture(pref).filter((s) => stationsWithLockers.has(s.slug)).length
                          : stationsInPrefecture(pref).length,
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {rankings.length > 0 && (
          <section className="home-rankings">
            {rankings.map((r) => (
              <div key={r.id}>
                <h3>{r.heading}</h3>
                <p className="home-ranking-lead">{r.lead}</p>
                <ol>
                  {r.items.map((x) => (
                    <li key={x.href}>
                      <Link to={x.href}>{x.label}</Link>
                      <span>{x.value}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}

        {about.length > 0 && (
          <section className="home-about">
            <h2>{t("home.aboutHeading")}</h2>
            {about.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        )}

        <p className="data-source-credit">{t("areasPage.dataSourceCredit")}</p>
      </main>
    </div>
  );
}
