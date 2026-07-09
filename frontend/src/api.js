const API_BASE = "http://localhost:4000";

/**
 * フェーズ5: 対応駅一覧
 */
export async function fetchStations() {
  const res = await fetch(`${API_BASE}/api/stations`);
  if (!res.ok) throw new Error("駅一覧の取得に失敗しました");
  return res.json();
}

/**
 * フェーズ2・3・5: ロッカー一覧・検索
 * params: { keyword, size, maxPrice, station }
 */
export async function fetchLockers(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  ).toString();
  const url = `${API_BASE}/api/lockers${query ? `?${query}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("ロッカー情報の取得に失敗しました");
  return res.json();
}

/**
 * フェーズ4: ロッカー詳細
 */
export async function fetchLockerDetail(facilityId) {
  const res = await fetch(`${API_BASE}/api/lockers/${facilityId}`);
  if (!res.ok) throw new Error("詳細情報の取得に失敗しました");
  return res.json();
}
