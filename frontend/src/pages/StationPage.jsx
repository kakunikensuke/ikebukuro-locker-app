import React, { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
  Outlet,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers, fetchStations } from "../api";
import { slugToName, nameToSlug, centerForName, distanceKm } from "../stations";
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
  // 地図には駅の全ロッカーを常時表示するため、絞り込み条件なしの全件も別途保持する
  const [allStationLockers, setAllStationLockers] = useState([]);
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

  // 並び替え（フェーズ7）もURLのクエリパラメータで管理する。既定は「駅から近い順」
  const sortBy = searchParams.get("sort") || "distance";
  const setSortBy = (nextSort) => {
    const next = new URLSearchParams(searchParams);
    if (nextSort === "distance") {
      next.delete("sort");
    } else {
      next.set("sort", nextSort);
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
    // 地図用の全件（絞り込みなし）は駅が変わったときだけ取得すればよい
    fetchLockers({ station: stationName })
      .then((data) => setAllStationLockers(data.results))
      .catch(() => setAllStationLockers([]));
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

  const sortedLockers = useMemo(() => {
    const list = [...lockers];
    if (sortBy === "price") {
      list.sort(
        (a, b) =>
          Math.min(...a.sizes.map((s) => s.price)) -
          Math.min(...b.sizes.map((s) => s.price))
      );
    } else if (sortBy === "availability") {
      const totalAvailable = (l) => l.sizes.reduce((sum, s) => sum + s.quantity, 0);
      list.sort((a, b) => totalAvailable(b) - totalAvailable(a));
    } else {
      // distance: 駅の中心座標からの直線距離が近い順（既定）
      const center = centerForName(stationName);
      if (center) {
        list.sort(
          (a, b) =>
            distanceKm(center, [a.latitude, a.longitude]) -
            distanceKm(center, [b.latitude, b.longitude])
        );
      }
    }
    return list;
  }, [lockers, sortBy, stationName]);

  // 地図上で「検索条件に一致したピン」を目立たせるためのID集合
  const matchedIds = useMemo(
    () => new Set(lockers.map((l) => l.facility_id)),
    [lockers]
  );

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
        <>
          <div className="result-bar">
            <span className="result-count">{lockers.length}件見つかりました</span>
            {view === "list" && (
              <label className="sort-control">
                並び替え:
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="distance">駅から近い順</option>
                  <option value="price">料金が安い順</option>
                  <option value="availability">空きが多い順</option>
                </select>
              </label>
            )}
          </div>

          <main className="app-main">
            {view === "map" ? (
              <MapView
                lockers={allStationLockers}
                matchedIds={matchedIds}
                station={stationName}
                onSelectLocker={handleSelectLocker}
              />
            ) : (
              <LockerList lockers={sortedLockers} onSelectLocker={handleSelectLocker} />
            )}
          </main>
        </>
      )}

      <Outlet />

      <AdSlot />
    </div>
  );
}
