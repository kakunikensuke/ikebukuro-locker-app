// 本番公開時はVITE_API_BASE環境変数でバックエンドの実URLに差し替える
const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:4000`;

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
 * フェーズ4: ロッカー詳細（フェーズ6: 周辺写真一覧を含む）
 */
export async function fetchLockerDetail(facilityId) {
  const res = await fetch(`${API_BASE}/api/lockers/${facilityId}`);
  if (!res.ok) throw new Error("詳細情報の取得に失敗しました");
  return res.json();
}

/**
 * フェーズ6: 利用者による周辺写真の投稿
 */
export async function uploadLockerPhoto(facilityId, file) {
  const formData = new FormData();
  formData.append("photo", file);
  const res = await fetch(`${API_BASE}/api/lockers/${facilityId}/photos`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "写真の投稿に失敗しました");
  return data;
}

export function photoUrl(photo) {
  return `${API_BASE}${photo.url}`;
}

/**
 * フェーズ11: 利用者による「昔ながらのロッカー」等の情報投稿
 */
export async function submitLocker(payload) {
  const res = await fetch(`${API_BASE}/api/lockers/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "投稿に失敗しました");
  return data;
}
