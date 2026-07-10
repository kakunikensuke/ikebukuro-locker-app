import React from "react";
import { slugToName } from "../stations";
import { useLang, useT } from "../i18n/LangContext.js";

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
        const minPrice = Math.min(...locker.sizes.map((s) => s.price));
        const availableSizes = locker.sizes
          .filter((s) => s.quantity > 0)
          .map((s) => s.size_type)
          .join(" / ");

        return (
          <li
            key={locker.facility_id}
            className="locker-card"
            onClick={() => onSelectLocker(locker.facility_id)}
          >
            <div className="locker-card-top">
              <span className="locker-card-name">{locker.name}</span>
              <span className="locker-card-price">{t("lockerList.priceFrom", { price: minPrice })}</span>
            </div>
            <div className="locker-card-address">{locker.address}</div>
            <div className="locker-card-tags">
              <span className="tag">{slugToName(locker.station_slug, lang) ?? locker.nearest_station}</span>
              <span className={`tag ${availableSizes ? "" : "tag-empty"}`}>
                {t("lockerList.availableSizes", { sizes: availableSizes || t("lockerList.noneAvailable") })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
