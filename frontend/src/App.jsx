import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { STATIONS } from "./stations";
import StationPage from "./pages/StationPage.jsx";
import LockerDetailRoute from "./pages/LockerDetailRoute.jsx";
import NotFound from "./pages/NotFound.jsx";

/**
 * SEO対応：駅・ロッカーごとに固有URLを持たせるためのルート定義。
 * 実際の画面はStationPage/LockerDetailRouteに委譲する。
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${STATIONS[0].slug}`} replace />} />
      <Route path="/:stationSlug" element={<StationPage />}>
        <Route path="lockers/:facilityId" element={<LockerDetailRoute />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
