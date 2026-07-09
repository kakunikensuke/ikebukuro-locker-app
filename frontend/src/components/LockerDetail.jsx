import React, { useEffect, useState } from "react";
import { fetchLockerDetail } from "../api";

const SIZE_LABEL = { S: "Sサイズ", M: "Mサイズ", L: "Lサイズ" };

/**
 * フェーズ4: ロッカー詳細画面
 * 機能2（料金表示）・機能3（サイズ別個数表示）を実装
 */
export default function LockerDetail({ facilityId, onClose }) {
  const [locker, setLocker] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!facilityId) return;
    setLocker(null);
    setError(null);
    fetchLockerDetail(facilityId)
      .then(setLocker)
      .catch((e) => setError(e.message));
  }, [facilityId]);

  if (!facilityId) return null;

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>
          ×
        </button>

        {error && <p className="error-message">{error}</p>}
        {!locker && !error && <p>読み込み中...</p>}

        {locker && (
          <>
            <h2>{locker.name}</h2>
            <p className="detail-address">
              {locker.nearest_station} ／ {locker.address}
            </p>
            <p className="detail-hours">利用可能時間：{locker.business_hours}</p>

            <table className="size-table">
              <thead>
                <tr>
                  <th>サイズ</th>
                  <th>料金</th>
                  <th>設置個数</th>
                  <th>内寸</th>
                </tr>
              </thead>
              <tbody>
                {locker.sizes.map((s) => (
                  <tr key={s.size_type}>
                    <td>{SIZE_LABEL[s.size_type]}</td>
                    <td>{s.price}円</td>
                    <td className={s.quantity === 0 ? "qty-zero" : ""}>
                      {s.quantity}個{s.quantity === 0 ? "（満）" : ""}
                    </td>
                    <td>{s.dimensions}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="detail-updated">
              最終更新: {new Date(locker.last_updated_at).toLocaleString("ja-JP")}
            </p>
            <p className="detail-source">
              情報提供元:{" "}
              <a href={locker.source.site_url} target="_blank" rel="noreferrer">
                {locker.source.site_name}
              </a>
            </p>
            <p className="detail-disclaimer">
              ※料金・空き個数は変動する場合があります。最新情報は現地または情報提供元サイトでご確認ください。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
