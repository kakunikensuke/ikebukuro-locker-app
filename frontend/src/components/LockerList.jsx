import React from "react";

/**
 * 一覧画面：地図の代替ビュー。検索結果をリスト表示する。
 * 機能2・3の要約（最安値・サイズ在庫の有無）もここで表示する。
 */
export default function LockerList({ lockers, onSelectLocker }) {
  if (lockers.length === 0) {
    return <p className="empty-message">該当するロッカーが見つかりませんでした。</p>;
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
            className="locker-list-item"
            onClick={() => onSelectLocker(locker.facility_id)}
          >
            <div className="locker-list-name">{locker.name}</div>
            <div className="locker-list-sub">{locker.address}</div>
            <div className="locker-list-tags">
              <span className="tag">{locker.nearest_station}</span>
              <span className="tag">最安 {minPrice}円〜</span>
              <span className="tag">
                空きサイズ: {availableSizes || "なし"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
