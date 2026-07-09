import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// フェーズ5: 対応駅ごとの中心座標（対象エリアの拡大）
const STATION_CENTERS = {
  池袋駅: [35.7295, 139.7109],
  新宿駅: [35.6896, 139.7006],
  渋谷駅: [35.658, 139.7016],
};
const DEFAULT_CENTER = STATION_CENTERS["池袋駅"];

// デフォルトのマーカーアイコン設定（Viteでのパス解決対応）
const lockerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// 駅選択時はその駅を中心に、未選択時は表示中の全ロッカーが収まるように地図を調整する
function MapUpdater({ lockers, station }) {
  const map = useMap();

  useEffect(() => {
    if (station && STATION_CENTERS[station]) {
      map.setView(STATION_CENTERS[station], 16);
    } else if (lockers.length > 0) {
      const bounds = L.latLngBounds(
        lockers.map((l) => [l.latitude, l.longitude])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [station, lockers, map]);

  return null;
}

/**
 * フェーズ2: 地図画面（MVP）
 * フェーズ5: 駅選択に応じて地図の中心・ズームを切り替える
 * 収集したロッカー施設をピンで地図上に表示する
 */
export default function MapView({ lockers, station, onSelectLocker }) {
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

      <MapUpdater lockers={lockers} station={station} />

      {lockers.map((locker) => (
        <Marker
          key={locker.facility_id}
          position={[locker.latitude, locker.longitude]}
          icon={lockerIcon}
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
              詳細を見る
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
