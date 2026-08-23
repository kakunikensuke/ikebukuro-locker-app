import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { fetchLockerDetail } from "../api";
import { pathForLocker, slugToName } from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import { lockerTexts } from "../i18n/lockerText.js";
import AdSlot from "./AdSlot";

/**
 * フェーズ4: ロッカー詳細画面
 * 機能2（料金表示）・機能3（サイズ別個数表示）を実装
 *
 * 2026-08-15: 周辺写真の閲覧・投稿を廃止（保存先が無く、投稿が再デプロイのたびに消えていたため）
 */
export default function LockerDetail({ facilityId, onClose }) {
  const lang = useLang();
  const t = useT();
  const SIZE_LABEL = {
    SS: t("lockerDetail.sizeLabelSS"),
    S: t("lockerDetail.sizeLabelS"),
    M: t("lockerDetail.sizeLabelM"),
    L: t("lockerDetail.sizeLabelL"),
    LW: t("lockerDetail.sizeLabelLW"),
    SLIM: t("lockerDetail.sizeLabelSLIM"),
    // 東京メトロ（Phase 12）は物理サイズ名がなく料金帯のみのデータのため、
    // 料金帯そのものをsize_typeとして扱う（ユーザー確認済み、2026-07-27）
    P300: t("lockerDetail.sizeLabelP300"),
    P500: t("lockerDetail.sizeLabelP500"),
    P600: t("lockerDetail.sizeLabelP600"),
    P900: t("lockerDetail.sizeLabelP900"),
    P1000: t("lockerDetail.sizeLabelP1000"),
  };
  const [locker, setLocker] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!facilityId) return;
    setLocker(null);
    setError(null);
    fetchLockerDetail(facilityId)
      .then(setLocker)
      .catch(() => setError(t("errors.detailFetchFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  if (!facilityId) return null;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>
          ×
        </button>

        {error && <p className="error-message">{error}</p>}
        {!locker && !error && <p>{t("lockerDetail.loading")}</p>}

        {locker && (
          <>
            <LockerDetailMeta locker={locker} lang={lang} t={t} />

            <LockerHeading locker={locker} lang={lang} t={t} />

            <a
              className="gmaps-link"
              href={`https://www.google.com/maps/search/?api=1&query=${locker.latitude},${locker.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("lockerDetail.gmapsLink")}
            </a>

            {locker.sizes.length > 0 ? (
              <table className="size-table">
                <thead>
                  <tr>
                    <th>{t("lockerDetail.sizeHeader")}</th>
                    <th>{t("lockerDetail.priceHeader")}</th>
                    <th>{t("lockerDetail.quantityHeader")}</th>
                    <th>{t("lockerDetail.dimensionsHeader")}</th>
                  </tr>
                </thead>
                <tbody>
                  {locker.sizes.map((s, i) => (
                    <tr key={`${s.size_type}-${i}`}>
                      <td>{SIZE_LABEL[s.size_type]}</td>
                      <td>{t("lockerDetail.priceValue", { price: s.price })}</td>
                      <td>{t("lockerDetail.quantityValue", { count: s.quantity })}
                      </td>
                      <td>{s.dimensions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="size-table-empty">{t("lockerDetail.sizeInfoUnknown")}</p>
            )}

            <p className="detail-updated">
              {t("lockerDetail.updatedAt", {
                datetime: new Date(locker.last_updated_at).toLocaleString(lang === "en" ? "en-US" : "ja-JP"),
              })}
            </p>
            <p className="detail-disclaimer">{t("lockerDetail.disclaimer")}</p>

            <AdSlot />
          </>
        )}
      </div>
    </div>
  );
}

// SEO対応：ロッカー詳細のtitle/meta description/OGP/構造化データ（schema.org）を設定
// フェーズ7: 多言語化対応。hreflang alternate（ja/en/x-default）も出力する
function LockerDetailMeta({ locker, lang, t }) {
  // 表示テキストはプリレンダ（scripts/prerender.js）と同じ関数で解決する。
  // 片方だけ locker.name をそのまま使うと、静的HTMLとハイドレート後で表示がずれる
  const { name, address, hours, stationName } = lockerTexts(locker, lang, t);
  const description =
    locker.sizes.length > 0
      ? t("lockerDetail.metaDescription", {
          address,
          price: Math.min(...locker.sizes.map((s) => s.price)),
          hours,
        })
      : t("lockerDetail.metaDescriptionNoPrice", { address, hours });
  const pageUrl = `${SITE_URL}${pathForLocker(lang, locker.station_slug, locker.facility_id)}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: locker.latitude,
      longitude: locker.longitude,
    },
    url: pageUrl,
  };

  return (
    <Helmet>
      <title>{t("lockerDetail.metaTitle", { name, station: stationName })}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={t("lockerDetail.metaTitle", { name, station: stationName })} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="place" />
      <link rel="canonical" href={pageUrl} />
      <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForLocker("ja", locker.station_slug, locker.facility_id)}`} />
      <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForLocker("en", locker.station_slug, locker.facility_id)}`} />
      <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForLocker("ja", locker.station_slug, locker.facility_id)}`} />
      {/* ロッカー名が駅をまたいで重複するため検索対象から外す（プリレンダ側・sitemapと揃えている、2026-08-08） */}
      <meta name="robots" content="noindex" />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}

// 見出し・所在地・営業時間。英語では lockerTexts が英訳した表記を出し、
// 現地の看板と突き合わせられるよう日本語の原文を lang="ja" で併記する
function LockerHeading({ locker, lang, t }) {
  const { name, address, hours, stationName, signName } = lockerTexts(locker, lang, t);
  return (
    <>
      <h2>{name}</h2>
      <p className="detail-address">
        {stationName} ／ {address}
      </p>
      {lang === "en" && (
        <p className="detail-sign-name">
          {t("lockerDetail.signName", { name: "" }).trim()} <span lang="ja">{signName}</span>
        </p>
      )}
      <p className="detail-hours">{t("lockerDetail.hours", { hours })}</p>
    </>
  );
}
