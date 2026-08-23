// APIの取得口。2026-08-15にRenderのExpressから、ビルド時生成の静的JSONに移行した。
// 生成しているのは frontend/scripts/generateApiData.js、絞り込みは src/lockerFilter.js。
//
// 🔴 VITE_API_BASE による切り替えは廃止した。どちらが効いているのか分からなくなるため、
//    環境変数で外部APIに戻す道は残していない。切り戻す場合はこのファイルごと差し替える。
import { selectLockers } from "./lockerFilter.js";

const API_BASE = "/api";

/**
 * 静的JSONの取得。見つからない場合は例外ではなく null を返す。
 *
 * ⚠ ステータスコードだけで判定してはいけない。wrangler.toml が
 *   not_found_handling = "single-page-application" のため、存在しないパスにも
 *   SPAフォールバックで 200 + HTML が返る。Content-Type まで見ないと、
 *   HTMLをJSONとしてパースして意味不明なエラーになる。
 */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  if (!(res.headers.get("content-type") || "").includes("application/json")) return null;
  return res.json();
}

/**
 * フェーズ5: 対応駅一覧
 */
export async function fetchStations() {
  const data = await fetchJson(`${API_BASE}/stations.json`);
  if (!data) throw new Error("駅一覧の取得に失敗しました");
  return data;
}

/**
 * フェーズ2・3・5: ロッカー一覧・検索
 * params: { keyword, size, maxPrice, station_slug }
 *
 * 駅が指定されていれば駅別JSON、無ければ全件JSONを取り、
 * キーワード・サイズ・料金の絞り込みはブラウザ内で行う（815件なら十分速い）。
 */
export async function fetchLockers(params = {}) {
  const { station_slug: stationSlug, keyword, size, maxPrice, lang } = params;

  if (stationSlug) {
    const data = await fetchJson(`${API_BASE}/lockers/by-station/${stationSlug}.json`);
    // 駅別JSONはロッカーがある駅のぶんしか生成しない。無い駅は「0件」であって異常ではない
    const results = selectLockers(data?.results ?? [], { keyword, size, maxPrice, lang });
    return { count: results.length, results };
  }

  const data = await fetchJson(`${API_BASE}/lockers.json`);
  if (!data) throw new Error("ロッカー情報の取得に失敗しました");
  const results = selectLockers(data.results, { keyword, size, maxPrice, lang });
  return { count: results.length, results };
}

/**
 * フェーズ4: ロッカー詳細
 */
export async function fetchLockerDetail(facilityId) {
  const data = await fetchJson(`${API_BASE}/lockers/${facilityId}.json`);
  if (!data) throw new Error("詳細情報の取得に失敗しました");
  return data;
}
