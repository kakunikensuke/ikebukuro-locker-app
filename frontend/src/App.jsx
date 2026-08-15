import React from "react";
import { Routes, Route } from "react-router-dom";
import LangLayout from "./LangLayout.jsx";
import AreasIndexPage from "./pages/AreasIndexPage.jsx";
import PrefecturePage from "./pages/PrefecturePage.jsx";
import SizesIndexPage from "./pages/SizesIndexPage.jsx";
import SizePage from "./pages/SizePage.jsx";
import StationPage from "./pages/StationPage.jsx";
import LockerDetailRoute from "./pages/LockerDetailRoute.jsx";
import PrivacyPage from "./pages/PrivacyPage.jsx";
import ContactReceivedPage from "./pages/ContactReceivedPage.jsx";
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

// サイズ別の横断一覧。"sizes"は静的セグメントなので:stationSlugより優先してマッチする
// （同名の駅slugが無いことは確認済み）
function sizeRoutes() {
  return (
    <Route path="sizes">
      <Route index element={<SizesIndexPage />} />
      <Route path=":sizeSlug" element={<SizePage />} />
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
        {sizeRoutes()}
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="contact-received" element={<ContactReceivedPage />} />
        {stationRoutes()}
      </Route>

      <Route path="en" element={<LangLayout lang="en" />}>
        <Route index element={<AreasIndexPage />} />
        {areaRoutes()}
        {sizeRoutes()}
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="contact-received" element={<ContactReceivedPage />} />
        {stationRoutes()}
      </Route>
    </Routes>
  );
}
