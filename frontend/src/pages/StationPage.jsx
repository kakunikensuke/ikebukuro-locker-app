import React, { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
  Outlet,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers, fetchStations } from "../api";
import { slugToName, nameToSlug } from "../stations";
import { SITE_URL } from "../config";
import MapView from "../components/MapView";
import SearchBar from "../components/SearchBar";
import LockerList from "../components/LockerList";
import AdSlot from "../components/AdSlot";

export default function StationPage() {
  const { stationSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stationName = slugToName(stationSlug);

  const [lockers, setLockers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 表示切替（地図/一覧）もURLのクエリパラメータで管理し、ブラウザの戻る/進むで切り替えられるようにする
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "map";
  const setView = (nextView) => {
    const next = new URLSearchParams(searchParams);
    if (nextView === "list") {
      next.set("view", "list");
    } else {
      next.delete("view");
    }
    setSearchParams(next);
  };

  // 駅一覧（プルダウン用）は初回のみ取得
  useEffect(() => {
    fetchStations()
      .then((data) => setStations(data.stations || []))
      .catch(() => setStations([]));
  }, []);

  // URLの駅が変わるたびにロッカーを再取得。ページ遷移直前の絞り込み条件があれば引き継ぐ
  useEffect(() => {
    if (!stationName) return;
    const filters = location.state?.filters || {};
    loadLockers({ station: stationName, ...filters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationSlug]);

  const loadLockers = (params) => {
    setLoading(true);
    setError(null);
    fetchLockers(params)
      .then((data) => setLockers(data.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const handleSearch = (params) => {
    loadLockers(params);
  };

  const handleStationChange = ({ station: newStationName, keyword, size, maxPrice }) => {
    const newSlug = nameToSlug(newStationName);
    if (!newSlug) return;
    navigate(`/${newSlug}`, { state: { filters: { keyword, size, maxPrice } } });
  };

  const handleSelectLocker = (facilityId) => {
    // 現在の表示切替（?view=）を維持したまま詳細を開く
    navigate({ pathname: `/${stationSlug}/lockers/${facilityId}`, search: location.search });
  };

  if (!stationName) {
    return null; // 不正なスラッグは親のcatch-allルート（NotFound）で処理される想定外ケース
  }

  const description = `${stationName}周辺のコインロッカーの空き状況・料金をまとめて検索。${
    loading ? "" : `${lockers.length}件のロッカー情報を掲載。`
  }`;

  return (
    <div className="app-container">
      <Helmet>
        <title>{stationName}のコインロッカー検索｜コインロッカー検索</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`${stationName}のコインロッカー検索`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}/${stationSlug}`} />
      </Helmet>

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

      <SearchBar
        station={stationName}
        onStationChange={handleStationChange}
        onSearch={handleSearch}
        stations={stations}
      />

      {loading && <p className="loading-message">読み込み中...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <main className="app-main">
          {view === "map" ? (
            <MapView
              lockers={lockers}
              station={stationName}
              onSelectLocker={handleSelectLocker}
            />
          ) : (
            <LockerList lockers={lockers} onSelectLocker={handleSelectLocker} />
          )}
        </main>
      )}

      <Outlet />

      <AdSlot />
    </div>
  );
}
