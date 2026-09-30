import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers } from "../api";
import { LOCKER_SIZES, sizeSummary, pathForSize, pathForSizeList } from "../lockerSizes";
import { pathForPrefectureList } from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import LangSwitcher from "../components/LangSwitcher.jsx";
import { sizeFitText } from "../stationSummary.js";
import { sizeUnitBreakdown } from "../lockerStats.js";
import { pathForLuggageList } from "../luggageSearch.js";

/**
 * サイズ別一覧のハブページ（/sizes）。
 * 駅名単体のクエリはGoogleマップと競合して勝ちにくいため、
 * 「荷物が入るサイズから駅を探す」という地図では代替できない切り口の入口として用意している。
 */
export default function SizesIndexPage() {
  const lang = useLang();
  const t = useT();
  const [summaries, setSummaries] = useState([]);
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    fetchLockers({})
      .then((data) => {
        const lockers = data.results ?? [];
        setSummaries(
          LOCKER_SIZES.map((size) => ({ ...size, ...sizeSummary(lockers, size.sizeType) }))
        );
        setBreakdown(sizeUnitBreakdown(lockers));
      })
      .catch(() => setSummaries([]));
  }, []);

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("sizesPage.titleTag")}</title>
        <meta name="description" content={t("sizesPage.description")} />
        <meta property="og:title" content={t("sizesPage.ogTitle")} />
        <meta property="og:description" content={t("sizesPage.description")} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForSizeList(lang)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForSizeList("ja")}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForSizeList("en")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForSizeList("ja")}`} />
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
        <h2>{t("sizesPage.heading")}</h2>
        <p className="page-lead">{t("sizesPage.lead")}</p>

        <ul className="area-grid">
          {summaries.map((size) => (
            <li key={size.slug}>
              <Link className="area-card" to={pathForSize(lang, size.slug)}>
                <span className="area-card-name">{t(`sizePage.sizeName${size.sizeType}`)}</span>
                <div className="locker-card-tags">
                  <span className="tag">
                    {t("sizesPage.sizeCardSummary", {
                      stationCount: size.stationCount,
                      lockerCount: size.lockerCount,
                    })}
                  </span>
                </div>
                {size.dimensions && (
                  <span className="area-card-note">
                    {t("sizesPage.sizeCardDimensions", { dimensions: size.dimensions })}
                  </span>
                )}
                {/* 料金の幅と入る荷物の目安。静的HTML（prerender.js の sizesIndexPage）と同じ内容 */}
                {size.minPrice && size.maxPrice && (
                  <span className="area-card-note">
                    {t("sizesPage.sizeCardPrice", { minPrice: size.minPrice, maxPrice: size.maxPrice })}
                  </span>
                )}
                {sizeFitText(size.dimensions, t, "sizesPage.sizeCardFit") && (
                  <span className="area-card-note size-card-fit">
                    {sizeFitText(size.dimensions, t, "sizesPage.sizeCardFit")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* 設置台数の内訳。静的HTML（prerender.js の sizeBreakdownHtml）と同じ sizeUnitBreakdown */}
        {breakdown && breakdown.total > 0 && (
          <section>
            <h2>{t("sizesPage.breakdownHeading")}</h2>
            <p>
              {t("sizesPage.breakdownLead", {
                total: breakdown.total.toLocaleString("en-US"),
                top: t(`sizePage.sizeName${breakdown.top.sizeType}`),
                share: breakdown.top.share,
              })}
            </p>
            <ul>
              {breakdown.rows.map((r) => (
                <li key={r.sizeType}>
                  {t("sizesPage.breakdownItem", {
                    size: t(`sizePage.sizeName${r.sizeType}`),
                    units: r.units.toLocaleString("en-US"),
                    share: r.share,
                  })}
                </li>
              ))}
            </ul>
            <p>
              {t("sizesPage.luggageHint")}{" "}
              <Link to={pathForLuggageList(lang)}>{t("sizesPage.luggageLink")}</Link>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
