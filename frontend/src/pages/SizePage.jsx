import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers } from "../api";
import { sizeBySlug, sizeSummary, pathForSize, pathForSizeList } from "../lockerSizes";
import {
  PREFECTURES,
  prefectureName,
  prefectureForSlug,
  pathForStation,
  pathForPrefectureList,
  slugToName,
} from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";
import NotFound from "./NotFound.jsx";

/**
 * サイズ別の駅一覧（/sizes/:sizeSlug）。
 * 「Lサイズのロッカーがある駅」のような横断的な切り口はGoogleマップが出せない情報で、
 * かつ駅ページへの内部リンクを大量に張れるためクロールの導線にもなる。
 */
export default function SizePage() {
  const { sizeSlug } = useParams();
  const lang = useLang();
  const t = useT();
  const [summary, setSummary] = useState(null);
  const size = sizeBySlug(sizeSlug);

  useEffect(() => {
    if (!size) return;
    fetchLockers({})
      .then((data) => setSummary(sizeSummary(data.results ?? [], size.sizeType)))
      .catch(() => setSummary(null));
  }, [size]);

  if (!size) {
    // :sizeSlugは任意の文字列にマッチするため、未知のスラッグはここでNotFoundにする
    return <NotFound />;
  }

  const sizeName = t(`sizePage.sizeName${size.sizeType}`);
  const stationCount = summary?.stationCount ?? 0;
  const lockerCount = summary?.lockerCount ?? 0;
  const dimensions = summary?.dimensions ?? "";

  // 都道府県ごとにまとめて表示する。PREFECTURESの順序をそのまま使い、該当駅が無い県は出さない
  const groups = PREFECTURES.map((prefecture) => {
    const stations = [...(summary?.byStation.values() ?? [])]
      .filter((entry) => prefectureForSlug(entry.slug) === prefecture)
      .sort((a, b) => b.lockerCount - a.lockerCount);
    return { prefecture, stations };
  }).filter((group) => group.stations.length > 0);

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("sizePage.titleTag", { size: sizeName, count: stationCount })}</title>
        <meta
          name="description"
          content={t("sizePage.description", {
            size: sizeName,
            dimensions,
            stationCount,
            lockerCount,
            minPrice: summary?.minPrice ?? 0,
            maxPrice: summary?.maxPrice ?? 0,
          })}
        />
        <meta property="og:title" content={t("sizePage.ogTitle", { size: sizeName })} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForSize(lang, size.slug)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForSize("ja", size.slug)}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForSize("en", size.slug)}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForSize("ja", size.slug)}`} />
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
        <Link className="back-to-areas" to={pathForSizeList(lang)}>
          {t("sizePage.backToSizes")}
        </Link>
        <h2>{t("sizePage.heading", { size: sizeName })}</h2>
        {summary && (
          <p className="page-lead">
            {t("sizePage.summary", {
              dimensions,
              stationCount,
              lockerCount,
              minPrice: summary.minPrice,
              maxPrice: summary.maxPrice,
            })}
          </p>
        )}

        {groups.map(({ prefecture, stations }) => (
          <section key={prefecture}>
            <h3>{prefectureName(prefecture, lang)}</h3>
            <ul className="area-grid">
              {stations.map((entry) => (
                <li key={entry.slug}>
                  <Link className="area-card" to={pathForStation(lang, entry.slug)}>
                    <span className="area-card-name">{slugToName(entry.slug, lang)}</span>
                    <div className="locker-card-tags">
                      <span className="tag">
                        {t("sizePage.stationLockerCount", { count: entry.lockerCount })}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
