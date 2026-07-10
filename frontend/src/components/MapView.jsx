import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { STATIONS, centerForSlug } from "../stations";
import { useT } from "../i18n/LangContext.js";

// フェーズ5: 対応駅ごとの中心座標（対象エリアの拡大）。一覧はstations.jsで一元管理
const DEFAULT_CENTER = STATIONS[0].center;

// マーカーアイコン設定。検索条件に一致したロッカーは目立つ色、それ以外は控えめな色にする
function buildLockerIcon(matched) {
  const pinClass = matched ? "locker-marker-pin locker-marker-pin-matched" : "locker-marker-pin locker-marker-pin-muted";
  return L.divIcon({
    className: "locker-marker",
    html: `
      <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg" class="${pinClass}">
        <path class="locker-pin-fill" d="M14 0C6.3 0 0 6.3 0 14c0 10 14 24 14 24s14-14 14-24C28 6.3 21.7 0 14 0z" stroke="#fff" stroke-width="2"/>
        <circle cx="14" cy="14" r="5.5" fill="#fff"/>
      </svg>
    `,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

const lockerIconMatched = buildLockerIcon(true);
const lockerIconMuted = buildLockerIcon(false);

// 駅選択時はその駅を中心に、未選択時は表示中の全ロッカーが収まるように地図を調整する
function MapUpdater({ lockers, stationSlug }) {
  const map = useMap();

  useEffect(() => {
    const center = stationSlug && centerForSlug(stationSlug);
    if (center) {
      map.setView(center, 16);
    } else if (lockers.length > 0) {
      const bounds = L.latLngBounds(
        lockers.map((l) => [l.latitude, l.longitude])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [stationSlug, lockers, map]);

  return null;
}

/**
 * フェーズ2: 地図画面（MVP）
 * フェーズ5: 駅選択に応じて地図の中心・ズームを切り替える
 * 収集したロッカー施設をピンで地図上に表示する
 */
export default function MapView({ lockers, matchedIds, stationSlug, onSelectLocker }) {
  const t = useT();
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={16}
      className="map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater lockers={lockers} stationSlug={stationSlug} />

      {lockers.map((locker) => (
        <Marker
          key={locker.facility_id}
          position={[locker.latitude, locker.longitude]}
          icon={matchedIds.has(locker.facility_id) ? lockerIconMatched : lockerIconMuted}
          eventHandlers={{
            click: () => onSelectLocker(locker.facility_id),
          }}
        >
          <Popup>
            <strong>{locker.name}</strong>
            <br />
            {locker.address}
            <br />
            <button onClick={() => onSelectLocker(locker.facility_id)}>
              {t("mapView.detailButton")}
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
