import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { fetchLockerDetail, uploadLockerPhoto, photoUrl } from "../api";
import { pathForLocker, slugToName } from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import { translateBusinessHours } from "../i18n/businessHours.js";
import AdSlot from "./AdSlot";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

/**
 * フェーズ4: ロッカー詳細画面
 * 機能2（料金表示）・機能3（サイズ別個数表示）を実装
 * フェーズ6: 利用者投稿による周辺写真の閲覧・投稿を追加（ストリートビューの代替）
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!facilityId) return;
    setLocker(null);
    setError(null);
    setUploadError(null);
    fetchLockerDetail(facilityId)
      .then(setLocker)
      .catch(() => setError(t("errors.detailFetchFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(t("lockerDetail.errorUnsupportedFile"));
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setUploadError(t("lockerDetail.errorFileSize"));
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const { photos } = await uploadLockerPhoto(facilityId, file);
      setLocker((prev) => (prev ? { ...prev, photos } : prev));
    } catch {
      // バックエンドは日本語の生エラーメッセージを返すため、英語ページではそのまま出さず固定文言にフォールバックする
      setUploadError(t("lockerDetail.photoUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

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

            <h2>{locker.name}</h2>
            <p className="detail-address">
              {slugToName(locker.station_slug, lang) ?? locker.nearest_station} ／ {locker.address}
            </p>
            <p className="detail-hours">
              {t("lockerDetail.hours", { hours: translateBusinessHours(locker.business_hours, t) })}
            </p>

            <a
              className="gmaps-link"
              href={`https://www.google.com/maps/search/?api=1&query=${locker.latitude},${locker.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("lockerDetail.gmapsLink")}
            </a>

            {/* アフィリエイト提携先はマルチエキューブ等のスマートロッカー想定のため、利用者投稿分には表示しない */}
            {!locker.user_submitted && (
              <div className="reserve-cta">
                <span className="reserve-cta-badge">{t("lockerDetail.reserveBadge")}</span>
                <button type="button" className="reserve-cta-btn" disabled>
                  {t("lockerDetail.reserveButton")}
                </button>
              </div>
            )}

            {locker.user_submitted && (
              <div className="submitted-info">
                <span className="tag tag-user-submitted">{t("lockerList.userSubmittedTag")}</span>
                <p className="submitted-comment">{locker.comment}</p>
                {locker.details && <p className="submitted-details">{locker.details}</p>}
              </div>
            )}

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

            <div className="photo-section">
              <h3 className="photo-section-title">{t("lockerDetail.photoSectionTitle")}</h3>

              {locker.photos.length > 0 ? (
                <div className="photo-gallery">
                  {locker.photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photoUrl(photo)}
                      target="_blank"
                      rel="noreferrer"
                      className="photo-thumb"
                    >
                      <img src={photoUrl(photo)} alt={t("lockerDetail.photoAlt", { name: locker.name })} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="photo-empty">{t("lockerDetail.photoEmpty")}</p>
              )}

              <label className="photo-upload-btn">
                {uploading ? t("lockerDetail.photoUploading") : t("lockerDetail.photoUpload")}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  disabled={uploading}
                  hidden
                />
              </label>
              {uploadError && <p className="error-message photo-upload-error">{uploadError}</p>}
              <p className="photo-disclaimer">{t("lockerDetail.photoDisclaimer")}</p>
            </div>

            <p className="detail-updated">
              {t("lockerDetail.updatedAt", {
                datetime: new Date(locker.last_updated_at).toLocaleString(lang === "en" ? "en-US" : "ja-JP"),
              })}
            </p>
            <p className="detail-source">
              {t("lockerDetail.sourceLabel")}{" "}
              {locker.user_submitted ? (
                t("lockerDetail.sourceUserSubmitted")
              ) : (
                <a href={locker.source.site_url} target="_blank" rel="noreferrer">
                  {locker.source.site_name}
                </a>
              )}
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
  const hours = translateBusinessHours(locker.business_hours, t);
  const description =
    locker.sizes.length > 0
      ? t("lockerDetail.metaDescription", {
          address: locker.address,
          price: Math.min(...locker.sizes.map((s) => s.price)),
          hours,
        })
      : t("lockerDetail.metaDescriptionNoPrice", { address: locker.address, hours });
  const pageUrl = `${SITE_URL}${pathForLocker(lang, locker.station_slug, locker.facility_id)}`;
  const ogImage = locker.photos?.[0] ? photoUrl(locker.photos[0]) : undefined;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: locker.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: locker.address,
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
      <title>{t("lockerDetail.metaTitle", { name: locker.name })}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={locker.name} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="place" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <link rel="canonical" href={pageUrl} />
      <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForLocker("ja", locker.station_slug, locker.facility_id)}`} />
      <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForLocker("en", locker.station_slug, locker.facility_id)}`} />
      <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForLocker("ja", locker.station_slug, locker.facility_id)}`} />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}
