import React, { useEffect, useState } from "react";

/**
 * フェーズ3: 検索機能
 * フェーズ5: 駅選択（対象エリアの拡大）を追加
 * 駅は必ずいずれか1駅を選択する（全駅横断検索は行わない）
 * 駅・キーワード（施設名・住所）、サイズ、上限料金でフィルタする
 */
export default function SearchBar({ onSearch, stations = [] }) {
  const [station, setStation] = useState("");
  const [keyword, setKeyword] = useState("");
  const [size, setSize] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // 駅一覧が取得できたら、未選択なら先頭の駅を初期選択にする
  useEffect(() => {
    if (!station && stations.length > 0) {
      setStation(stations[0]);
    }
  }, [stations]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ station, keyword, size, maxPrice });
  };

  const handleReset = () => {
    setKeyword("");
    setSize("");
    setMaxPrice("");
    onSearch({ station });
  };

  // 駅選択は検索ボタンを待たずに即座に反映する（絞り込み条件はそのまま引き継ぐ）
  const handleStationChange = (e) => {
    const newStation = e.target.value;
    setStation(newStation);
    onSearch({ station: newStation, keyword, size, maxPrice });
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <select value={station} onChange={handleStationChange}>
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
