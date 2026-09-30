import React from "react";
import { useLang, useT } from "../i18n/LangContext.js";
import { lockerTexts } from "../i18n/lockerText.js";
import { largestLuggageForLocker } from "../luggageFit.js";

const SUITCASE = new Set(["checkedM", "checkedL"]);

/**
 * 一覧画面：地図の代替ビュー。検索結果をリスト表示する。
 * 最安値・対応サイズ・入る荷物（内寸から判定）を行ごとに出す。
 *
 * 2026-09-30: 各行に付けていた駅名のタグを外した（駅ページの中の一覧なので全行が同じ駅で、
 * 情報が無かった）。代わりに「どの荷物まで入るか」を出す。判定は luggageFit.js が唯一の実装で、
 * 静的HTML（scripts/prerender.js）も同じ関数を使う
 */
export default function LockerList({ lockers, onSelectLocker }) {
  const lang = useLang();
  const t = useT();

  if (lockers.length === 0) {
    return <p className="empty-message">{t("lockerList.empty")}</p>;
  }

  return (
    <ul className="locker-list">
      {lockers.map((locker) => {
        // 英語では名称・所在地を英訳して出す（i18n/lockerText.js が唯一の実装）
        const { name, address } = lockerTexts(locker, lang, t);
        const hasSizes = locker.sizes.length > 0;
        const minPrice = hasSizes ? Math.min(...locker.sizes.map((s) => s.price)) : null;
        const offeredSizes = locker.sizes.map((s) => s.size_type).join(" / ");
        const luggage = largestLuggageForLocker(locker);

        const open = () => onSelectLocker(locker.facility_id);
        return (
          <li
            key={locker.facility_id}
            className="locker-card"
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
          >
            <div className="locker-card-top">
              <span className="locker-card-name">{name}</span>
              <span className="locker-card-price">
                {hasSizes ? t("lockerList.priceFrom", { price: minPrice }) : t("lockerList.priceUnknown")}
              </span>
            </div>
            <div className="locker-card-address">{address}</div>
            <div className="locker-card-tags">
              <span className={`tag tag-fit${SUITCASE.has(luggage) ? " is-suitcase" : ""}`}>
                {t(`luggage.${luggage ?? "unknown"}`)}
              </span>
              {hasSizes && <span className="tag">{t("lockerList.offeredSizes", { sizes: offeredSizes })}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
