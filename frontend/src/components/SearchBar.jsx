import React, { useState } from "react";
import { slugToName } from "../stations";
import { useT } from "../i18n/LangContext.js";

/**
 * フェーズ3: 検索機能
 * フェーズ5: 駅選択（対象エリアの拡大）を追加
 * SEO対応: 駅選択は親（StationPage）がURLで管理する制御propに変更。
 * フェーズ7: 駅選択をslugベースに変更（多言語化対応、表示名はlangに応じて切り替え）。
 * キーワード・サイズ・料金は引き続きこのコンポーネントのローカルstateで管理する。
 */
export default function SearchBar({ stationSlug, lang, onStationChange, onSearch, stations = [] }) {
  const t = useT();
  const [keyword, setKeyword] = useState("");
  const [size, setSize] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ station_slug: stationSlug, keyword, size, maxPrice });
  };

  const handleReset = () => {
    setKeyword("");
    setSize("");
    setMaxPrice("");
    onSearch({ station_slug: stationSlug });
  };

  // 駅選択は検索ボタンを待たずに即座に反映する（絞り込み条件はそのまま引き継ぐ）
  const handleStationChange = (e) => {
    onStationChange({ stationSlug: e.target.value, keyword, size, maxPrice });
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <select value={stationSlug} onChange={handleStationChange}>
        {stations.map((s) => (
          <option key={s.slug} value={s.slug}>
            {slugToName(s.slug, lang) ?? s.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder={t("searchBar.keywordPlaceholder")}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <select value={size} onChange={(e) => setSize(e.target.value)}>
        <option value="">{t("searchBar.sizeAny")}</option>
        <option value="SS">{t("searchBar.sizeSS")}</option>
        <option value="S">{t("searchBar.sizeS")}</option>
        <option value="M">{t("searchBar.sizeM")}</option>
        <option value="L">{t("searchBar.sizeL")}</option>
        <option value="LW">{t("searchBar.sizeLW")}</option>
      </select>

      <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
        <option value="">{t("searchBar.priceAny")}</option>
        <option value="800">{t("searchBar.priceUnder", { price: 800 })}</option>
        <option value="1000">{t("searchBar.priceUnder", { price: 1000 })}</option>
        <option value="1200">{t("searchBar.priceUnder", { price: 1200 })}</option>
        <option value="1400">{t("searchBar.priceUnder", { price: 1400 })}</option>
      </select>

      <button type="submit">{t("searchBar.search")}</button>
      <button type="button" className="reset-btn" onClick={handleReset}>
        {t("searchBar.reset")}
      </button>
    </form>
  );
}
