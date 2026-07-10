import React, { useEffect, useRef, useState } from "react";
import { fetchLockerDetail, uploadLockerPhoto, photoUrl } from "../api";

const SIZE_LABEL = { S: "Sサイズ", M: "Mサイズ", L: "Lサイズ" };
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

/**
 * フェーズ4: ロッカー詳細画面
 * 機能2（料金表示）・機能3（サイズ別個数表示）を実装
 * フェーズ6: 利用者投稿による周辺写真の閲覧・投稿を追加（ストリートビューの代替）
 */
export default function LockerDetail({ facilityId, onClose }) {
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
      .catch((e) => setError(e.message));
  }, [facilityId]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("対応していないファイル形式です（JPEG・PNG・WebPのみ）");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setUploadError("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const { photos } = await uploadLockerPhoto(facilityId, file);
      setLocker((prev) => (prev ? { ...prev, photos } : prev));
    } catch (err) {
      setUploadError(err.message);
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

            <div className="photo-section">
              <h3 className="photo-section-title">周辺写真</h3>

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
                      <img src={photoUrl(photo)} alt={`${locker.name}の周辺写真`} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="photo-empty">まだ写真が投稿されていません。</p>
              )}

              <label className="photo-upload-btn">
                {uploading ? "アップロード中..." : "写真を投稿する"}
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
              <p className="photo-disclaimer">
                ※投稿された写真は現地の様子と異なる場合があります。不適切な写真の削除は今後対応予定です。
              </p>
            </div>

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
