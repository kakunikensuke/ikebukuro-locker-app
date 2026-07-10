import React, { useEffect, useState } from "react";
import { fetchLockers, fetchStations } from "./api";
import MapView from "./components/MapView";
import SearchBar from "./components/SearchBar";
import LockerList from "./components/LockerList";
import LockerDetail from "./components/LockerDetail";

export default function App() {
  const [lockers, setLockers] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [view, setView] = useState("map"); // "map" | "list"
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLockers = (params = {}) => {
    setLoading(true);
    setError(null);
    setSelectedStation(params.station || "");
    fetchLockers(params)
      .then((data) => setLockers(data.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // 初期表示：対応駅一覧を取得し、先頭の駅でロッカーを絞り込む（フェーズ2・5・6）
  // 全駅横断の検索は利用シーンとして想定しないため、常にいずれか1駅を選択させる
  useEffect(() => {
    fetchStations()
      .then((data) => {
        const list = data.stations || [];
        setStations(list);
        loadLockers({ station: list[0] || "" });
      })
      .catch(() => {
        setStations([]);
        loadLockers();
      });
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>コインロッカー検索</h1>
        <div className="view-toggle">
          <button
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
          >
            地図表示
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            一覧表示
          </button>
        </div>
      </header>

      <SearchBar onSearch={loadLockers} stations={stations} />

      {loading && <p className="loading-message">読み込み中...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <main className="app-main">
          {view === "map" ? (
            <MapView
              lockers={lockers}
              station={selectedStation}
              onSelectLocker={setSelectedFacilityId}
            />
          ) : (
            <LockerList lockers={lockers} onSelectLocker={setSelectedFacilityId} />
          )}
        </main>
      )}

      <LockerDetail
        facilityId={selectedFacilityId}
        onClose={() => setSelectedFacilityId(null)}
      />
    </div>
  );
}
