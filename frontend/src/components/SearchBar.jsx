import React, { useState } from "react";

/**
 * フェーズ3: 検索機能
 * フェーズ5: 駅選択（対象エリアの拡大）を追加
 * 駅・キーワード（施設名・住所）、サイズ、上限料金でフィルタする
 */
export default function SearchBar({ onSearch, stations = [] }) {
  const [station, setStation] = useState("");
  const [keyword, setKeyword] = useState("");
  const [size, setSize] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ station, keyword, size, maxPrice });
  };

  const handleReset = () => {
    setStation("");
    setKeyword("");
    setSize("");
    setMaxPrice("");
    onSearch({});
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <select value={station} onChange={(e) => setStation(e.target.value)}>
        <option value="">すべての駅</option>
        {stations.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="施設名・住所で検索（例：東口、サンシャイン）"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <select value={size} onChange={(e) => setSize(e.target.value)}>
        <option value="">サイズ指定なし</option>
        <option value="S">Sサイズが空きあり</option>
        <option value="M">Mサイズが空きあり</option>
        <option value="L">Lサイズが空きあり</option>
      </select>

      <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
        <option value="">料金指定なし</option>
        <option value="400">400円以下</option>
        <option value="500">500円以下</option>
        <option value="700">700円以下</option>
      </select>

      <button type="submit">検索</button>
      <button type="button" className="reset-btn" onClick={handleReset}>
        リセット
      </button>
    </form>
  );
}
