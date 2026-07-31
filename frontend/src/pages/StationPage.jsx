import React, { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
  Outlet,
  Link,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchLockers, fetchStations } from "../api";
import {
  slugToName,
  centerForSlug,
  pathForStation,
  pathForLocker,
  distanceKm,
  prefectureForSlug,
  prefectureName,
  pathForPrefecture,
  pathForPrefectureList,
} from "../stations";
import { SITE_URL } from "../config";
import { useLang, useT } from "../i18n/LangContext.js";
import MapView from "../components/MapView";
import SearchBar from "../components/SearchBar";
import LockerList from "../components/LockerList";
import LangSwitcher from "../components/LangSwitcher.jsx";
import AdSlot from "../components/AdSlot";
import LockerSubmitForm from "../components/LockerSubmitForm";
import NotFound from "./NotFound.jsx";

export default function StationPage() {
  const { stationSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = useLang();
  const t = useT();
  const stationName = slugToName(stationSlug, lang);

  const [lockers, setLockers] = useState([]);
  // 地図には駅の全ロッカーを常時表示するため、絞り込み条件なしの全件も別途保持する
  const [allStationLockers, setAllStationLockers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

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
    loadLockers({ station_slug: stationSlug, ...filters });
    // 地図用の全件（絞り込みなし）は駅が変わったときだけ取得すればよい
    fetchLockers({ station_slug: stationSlug })
      .then((data) => setAllStationLockers(data.results))
      .catch(() => setAllStationLockers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationSlug]);

  const loadLockers = (params) => {
    setLoading(true);
    setError(null);
    fetchLockers(params)
      .then((data) => setLockers(data.results))
      .catch(() => setError(t("errors.lockersFetchFailed")))
      .finally(() => setLoading(false));
  };

  const handleSearch = (params) => {
    loadLockers(params);
  };

  // 投稿完了後は絞り込み条件をリセットし、投稿したロッカーが確実に見えるよう全件を再取得する
  // モーダルを閉じるのはフォーム側の完了画面（ユーザー操作）に任せ、ここでは閉じない
  const handleLockerSubmitted = () => {
    fetchLockers({ station_slug: stationSlug })
      .then((data) => {
        setLockers(data.results);
        setAllStationLockers(data.results);
      })
      .catch(() => {});
  };

  const handleStationChange = ({ stationSlug: newStationSlug, keyword, size, maxPrice }) => {
    if (!newStationSlug) return;
    navigate(pathForStation(lang, newStationSlug), { state: { filters: { keyword, size, maxPrice } } });
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
      const totalLockerCount = (l) => l.sizes.reduce((sum, s) => sum + s.quantity, 0);
      list.sort((a, b) => totalLockerCount(b) - totalLockerCount(a));
    } else {
      // distance: 駅の中心座標からの直線距離が近い順（既定）
      const center = centerForSlug(stationSlug);
      if (center) {
        list.sort(
          (a, b) =>
            distanceKm(center, [a.latitude, a.longitude]) -
            distanceKm(center, [b.latitude, b.longitude])
        );
      }
    }
    return list;
  }, [lockers, sortBy, stationSlug]);

  // 地図上で「検索条件に一致したピン」を目立たせるためのID集合
  const matchedIds = useMemo(
    () => new Set(lockers.map((l) => l.facility_id)),
    [lockers]
  );

  const handleSelectLocker = (facilityId) => {
    // 現在の表示切替（?view=）を維持したまま詳細を開く
    navigate({ pathname: pathForLocker(lang, stationSlug, facilityId), search: location.search });
  };

  if (!stationName) {
    // :stationSlugは任意の1階層パスにマッチするため、親のcatch-allルート（*）には到達しない。
    // 存在しない駅slugの場合はここで明示的にNotFoundを表示する。
    return <NotFound />;
  }

  const description = loading
    ? t("stationPage.descriptionLoading", { station: stationName })
    : t("stationPage.descriptionLoaded", { station: stationName, count: lockers.length });
  const prefecture = prefectureForSlug(stationSlug);
  // 検索絞り込みの影響を受けない駅の全ロッカー件数で判定する（loading中は安全側でnoindex扱い）
  const showNoindex = loading || allStationLockers.length === 0;

  return (
    <div className="app-container">
      <Helmet>
        <title>{t("stationPage.titleTag", { station: stationName })}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={t("stationPage.ogTitle", { station: stationName })} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${SITE_URL}${pathForStation(lang, stationSlug)}`} />
        <link rel="alternate" hreflang="ja" href={`${SITE_URL}${pathForStation("ja", stationSlug)}`} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${pathForStation("en", stationSlug)}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathForStation("ja", stationSlug)}`} />
        {showNoindex && <meta name="robots" content="noindex" />}
      </Helmet>

      <header className="app-header">
        <h1>
          <Link to={pathForPrefectureList(lang)} className="app-title-link">
            {t("app.title")}
          </Link>
        </h1>
        <div className="header-controls">
          <div className="view-toggle">
            <button
              className={view === "map" ? "active" : ""}
              onClick={() => setView("map")}
            >
              {t("stationPage.viewMap")}
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              {t("stationPage.viewList")}
            </button>
          </div>
          <LangSwitcher />
        </div>
      </header>

      {prefecture && (
        <Link className="back-to-areas" to={pathForPrefecture(lang, prefecture)}>
          {t("stationPage.otherStationsInPrefecture", { prefecture: prefectureName(prefecture, lang) })}
        </Link>
      )}

      <SearchBar
        stationSlug={stationSlug}
        lang={lang}
        onStationChange={handleStationChange}
        onSearch={handleSearch}
        stations={stations}
      />

      {!loading && allStationLockers.length === 0 && (
        <p className="no-lockers-yet-message">{t("stationPage.noLockersYet")}</p>
      )}

      <div className="submit-cta-row">
        <button type="button" className="submit-cta-btn" onClick={() => setShowSubmitForm(true)}>
          {t("lockerSubmit.openButton")}
        </button>
      </div>

      {showSubmitForm && (
        <LockerSubmitForm
          stationSlug={stationSlug}
          lang={lang}
          onClose={() => setShowSubmitForm(false)}
          onSubmitted={handleLockerSubmitted}
        />
      )}

      {loading && <p className="loading-message">{t("stationPage.loading")}</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <>
          <div className="result-bar">
            <span className="result-count">{t("stationPage.resultCount", { count: lockers.length })}</span>
            {view === "list" && (
              <label className="sort-control">
                {t("stationPage.sortLabel")}
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="distance">{t("stationPage.sortDistance")}</option>
                  <option value="price">{t("stationPage.sortPrice")}</option>
                  <option value="availability">{t("stationPage.sortAvailability")}</option>
                </select>
              </label>
            )}
          </div>

          <main className="app-main">
            {view === "map" ? (
              <MapView
                lockers={allStationLockers}
                matchedIds={matchedIds}
                stationSlug={stationSlug}
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
