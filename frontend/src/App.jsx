import React from "react";
import { Routes, Route } from "react-router-dom";
import LangLayout from "./LangLayout.jsx";
import AreasIndexPage from "./pages/AreasIndexPage.jsx";
import PrefecturePage from "./pages/PrefecturePage.jsx";
import StationPage from "./pages/StationPage.jsx";
import LockerDetailRoute from "./pages/LockerDetailRoute.jsx";
import NotFound from "./pages/NotFound.jsx";

// ja/en共通のルート木。LangLayout配下のindex Routeと組み合わせて使う
function areaRoutes() {
  return (
    <Route path="areas">
      <Route index element={<AreasIndexPage />} />
      <Route path=":prefectureSlug" element={<PrefecturePage />} />
    </Route>
  );
}

function stationRoutes() {
  return (
    <>
      <Route path=":stationSlug" element={<StationPage />}>
        <Route path="lockers/:facilityId" element={<LockerDetailRoute />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </>
  );
}

/**
 * SEO対応：駅・ロッカーごとに固有URLを持たせるためのルート定義。
 * 多言語化対応：日本語はプレフィックスなし（既定言語）、英語は/enプレフィックス。
 * トップページは都道府県一覧（AreasIndexPage）を直接表示し、リダイレクトは挟まない。
 * 実際の画面はStationPage/LockerDetailRouteに委譲する。
 */
export default function App() {
  return (
    <Routes>
      <Route element={<LangLayout lang="ja" />}>
        <Route index element={<AreasIndexPage />} />
        {areaRoutes()}
        {stationRoutes()}
      </Route>

      <Route path="en" element={<LangLayout lang="en" />}>
        <Route index element={<AreasIndexPage />} />
        {areaRoutes()}
        {stationRoutes()}
      </Route>
    </Routes>
  );
}
