import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import LockerDetail from "../components/LockerDetail.jsx";
import { pathForStation } from "../stations";
import { useLang } from "../i18n/LangContext.js";

/**
 * /:stationSlug/lockers/:facilityId のURLとLockerDetailコンポーネントを繋ぐ薄いラッパー
 */
export default function LockerDetailRoute() {
  const { stationSlug, facilityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = useLang();

  const handleClose = () => {
    // アプリ内から遷移してきた場合は1つ戻ることで表示切替(?view=)等の状態も自然に復元される。
    // 直リンクなどアプリ外から直接この詳細URLに来た場合（履歴が無い）は駅ページへ遷移する
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(pathForStation(lang, stationSlug));
    }
  };

  return <LockerDetail facilityId={facilityId} onClose={handleClose} />;
}
