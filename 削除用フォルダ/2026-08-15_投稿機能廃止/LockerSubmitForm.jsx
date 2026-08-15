import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { STATIONS, centerForSlug, slugToName } from "../stations";
import { submitLocker } from "../api";
import { useT } from "../i18n/LangContext.js";

const COMMENT_MAX = 500;
const NAME_MAX = 100;
const DETAILS_MAX = 500;
const ADDRESS_MAX = 200;
const HOURS_MAX = 100;

// 地図クリックでピンの位置を更新するための内部コンポーネント（react-leafletの流儀）
function PinPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/**
 * フェーズ11: 利用者による「昔ながらのロッカー」等の情報投稿フォーム
 * 自動取得データ（マルチエキューブ由来）とは別に、利用者が地図上でピンを立てて
 * 場所・名称・コメントなどを投稿できる。承認フローなしで即時反映される。
 */
export default function LockerSubmitForm({ stationSlug, lang, onClose, onSubmitted }) {
  const t = useT();
  const [selectedSlug, setSelectedSlug] = useState(stationSlug);
  const [pin, setPin] = useState(null);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [address, setAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const mapCenter = useMemo(() => centerForSlug(selectedSlug) || STATIONS[0].center, [selectedSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError(t("lockerSubmit.errorPinRequired"));
      return;
    }
    if (!name.trim() || !comment.trim()) {
      setError(t("lockerSubmit.errorRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitLocker({
        station_slug: selectedSlug,
        nearest_station: slugToName(selectedSlug, "ja"),
        name: name.trim(),
        comment: comment.trim(),
        latitude: pin[0],
        longitude: pin[1],
        address: address.trim(),
        business_hours: businessHours.trim(),
        details: details.trim(),
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err.message || t("lockerSubmit.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel submit-panel" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>
          ×
        </button>

        <h2>{t("lockerSubmit.title")}</h2>
        <p className="submit-intro">{t("lockerSubmit.intro")}</p>

        {done ? (
          <div className="submit-success-wrap">
            <p className="submit-success">{t("lockerSubmit.successMessage")}</p>
            <div className="submit-actions">
              <button type="button" onClick={onClose}>
                {t("lockerSubmit.close")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="submit-field">
              {t("lockerSubmit.stationLabel")}
              <select value={selectedSlug} onChange={(e) => { setSelectedSlug(e.target.value); setPin(null); }}>
                {STATIONS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {slugToName(s.slug, lang)}
                  </option>
                ))}
              </select>
            </label>

            <p className="submit-map-hint">{t("lockerSubmit.mapHint")}</p>
            <div className="submit-map-wrap">
              <MapContainer center={mapCenter} zoom={16} className="submit-map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <PinPicker onPick={setPin} />
                {pin && <Marker position={pin} />}
              </MapContainer>
            </div>
            <p className="submit-pin-status">
              {pin ? t("lockerSubmit.pinSet") : t("lockerSubmit.pinNotSet")}
            </p>

            <label className="submit-field">
              {t("lockerSubmit.nameLabel")}
              <input
                type="text"
                value={name}
                maxLength={NAME_MAX}
                placeholder={t("lockerSubmit.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="submit-field">
              {t("lockerSubmit.commentLabel")}
              <textarea
                value={comment}
                maxLength={COMMENT_MAX}
                placeholder={t("lockerSubmit.commentPlaceholder")}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </label>

            <label className="submit-field">
              {t("lockerSubmit.addressLabel")}
              <input
                type="text"
                value={address}
                maxLength={ADDRESS_MAX}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <label className="submit-field">
              {t("lockerSubmit.hoursLabel")}
              <input
                type="text"
                value={businessHours}
                maxLength={HOURS_MAX}
                onChange={(e) => setBusinessHours(e.target.value)}
              />
            </label>

            <label className="submit-field">
              {t("lockerSubmit.detailsLabel")}
              <textarea
                value={details}
                maxLength={DETAILS_MAX}
                placeholder={t("lockerSubmit.detailsPlaceholder")}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
              />
            </label>

            {error && <p className="error-message">{error}</p>}
            <p className="submit-disclaimer">{t("lockerSubmit.disclaimer")}</p>

            <div className="submit-actions">
              <button type="button" className="reset-btn" onClick={onClose}>
                {t("lockerSubmit.cancel")}
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? t("lockerSubmit.submitting") : t("lockerSubmit.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
