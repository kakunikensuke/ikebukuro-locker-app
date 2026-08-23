import React from "react";
import { slugToName } from "../stations";
import { useLang, useT } from "../i18n/LangContext.js";
import { lockerTexts } from "../i18n/lockerText.js";

/**
 * 一覧画面：地図の代替ビュー。検索結果をリスト表示する。
 * 機能2・3の要約（最安値・サイズ在庫の有無）もここで表示する。
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
        const { name, address, stationName } = lockerTexts(locker, lang, t);
        const hasSizes = locker.sizes.length > 0;
        const minPrice = hasSizes ? Math.min(...locker.sizes.map((s) => s.price)) : null;
        const offeredSizes = locker.sizes.map((s) => s.size_type).join(" / ");

        return (
          <li
            key={locker.facility_id}
            className="locker-card"
            onClick={() => onSelectLocker(locker.facility_id)}
          >
            <div className="locker-card-top">
              <span className="locker-card-name">{name}</span>
              <span className="locker-card-price">
                {hasSizes ? t("lockerList.priceFrom", { price: minPrice }) : t("lockerList.priceUnknown")}
              </span>
            </div>
            <div className="locker-card-address">{address}</div>
            <div className="locker-card-tags">
              <span className="tag">{stationName}</span>
              {hasSizes && <span className="tag">{t("lockerList.offeredSizes", { sizes: offeredSizes })}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
