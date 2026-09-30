import React from "react";
import { Link } from "react-router-dom";

// 日本語（ひらがな・カタカナ・漢字）を含むか。英語ページで撮影者名を lang="ja" で包むのに使う
const HAS_JA = /[぀-ヿ一-鿿]/;

/**
 * 駅ページの見出し。駅の写真・駅名・要点（最安・スーツケース・設置場所・規模）。
 *
 * **中身は scripts/prerender.js の stationPage と同じものを出すこと**（stationSummaryItems が
 * 共通の唯一の実装）。写真は駅前スコアが集めた Wikimedia Commons の写真で、撮影者と
 * ライセンスの表示が必須。
 */
export default function StationHero({ stationName, prefectureLabel, prefecturePath, facts, photo, lang, t }) {
  return (
    <section className={`station-hero${photo ? " has-photo" : ""}`}>
      <div className="station-hero-visual">
        {photo && (
          <img
            src={photo.src}
            width={photo.width}
            height={photo.height}
            alt={t("stationSummary.photoAlt", { station: stationName })}
            loading="eager"
            decoding="async"
          />
        )}
        <div className="station-hero-title">
          {prefectureLabel && (
            <Link className="station-hero-pref" to={prefecturePath}>
              {prefectureLabel}
            </Link>
          )}
          <h2>{stationName}</h2>
        </div>
      </div>

      {facts.length > 0 && (
        <dl className="station-facts">
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {photo && (
        <p className="photo-credit">
          {t("stationSummary.photoCreditPrefix")}
          <a href={photo.page} target="_blank" rel="noreferrer">
            {lang === "en" && HAS_JA.test(photo.artist) ? <span lang="ja">{photo.artist}</span> : photo.artist}
          </a>
          {t("stationSummary.photoCreditSuffix", { license: photo.license })}
        </p>
      )}
    </section>
  );
}
