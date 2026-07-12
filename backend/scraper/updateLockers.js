/**
 * フェーズ9: データ自動更新バッチ
 *
 * データソース: マルチエキューブ（JR東日本スマートロジスティクス運営 multiecube.com）。
 * フロントエンドが呼んでいる公開JSON API（https://api.multiecube.com/v1/location/ph2）を
 * 直接呼び出す。会員登録・ログイン不要で取得できる、サイト上に表示されているのと
 * 同じロッカー設置情報のみを対象とし、予約・決済等の機能には一切関与しない。
 *
 * リアルタイムの空き数（unreserve.num_empty等）は取得・保存しない。各サイズの
 * 設置個数（num_total、日々変動しない静的な値）のみを記録する方針とした
 * （2026-07-12、ユーザー判断）。刻一刻と変わる商用の空き状況ではなく、
 * 変化の少ない設置数のみを扱うことで、規約上のリスクをさらに下げる狙い。
 *
 * 利用規約・robots.txtにはスクレイピング/自動アクセスを明示的に禁止する記載がない
 * ことをPlaywrightでレンダリングして確認済み（2026-07-12）。ただし規約の沈黙は
 * 明示的な許可ではないため、負荷をかけないよう駅単位・低頻度（デフォルト6時間毎、
 * server.js参照）でのみ実行すること。
 *
 * - facility_idはマルチエキューブ側のロッカーID（loc.id）をそのまま使う。
 *   彼らのシステム内で一意・安定しているため、写真投稿機能等が参照する
 *   facility_idとして継続利用できる。
 * - 駅単位で取得し、その駅の取得に失敗した場合は当該駅の既存レコードを
 *   保持する（他の駅の更新は継続する）。取得に成功した駅は全件を
 *   最新のレスポンスで置き換える（マルチエキューブが全件を返すAPIのため、
 *   置き換え＝実質的なupsert＋削除になる。閉鎖されたロッカーが自然に
 *   消える一方、一時的なAPI不調で誤って全消去されることはない）。
 */

const fs = require("fs");
const path = require("path");

const LOCKERS_PATH = path.join(__dirname, "..", "data", "lockers.json");
const LOG_PATH = path.join(__dirname, "..", "data", "update-log.json");
const MAX_LOG_ENTRIES = 50;

const API_BASE = "https://api.multiecube.com/v1/location/ph2";
const SOURCE_SITE_NAME = "マルチエキューブ（JR東日本スマートロジスティクス）";

// 対象駅とマルチエキューブ側のbase_id（2026-07-12にAPIから特定）
const STATIONS = [
  { slug: "ikebukuro", name: "池袋駅", baseId: 35 },
  { slug: "shinjuku", name: "新宿駅", baseId: 41 },
  { slug: "shibuya", name: "渋谷駅", baseId: 46 },
  { slug: "tokyo", name: "東京駅", baseId: 32 },
  { slug: "shinagawa", name: "品川駅", baseId: 36 },
  { slug: "ueno", name: "上野駅", baseId: 40 },
  { slug: "yokohama", name: "横浜駅", baseId: 44 },
];

// マルチエキューブのサイズ区分。実運用でsm/ml/xl/tlが使われている例は確認できていない。
// 内寸(FAQ https://multiecube.com/faq/ に記載、2026-07-12確認)。LWは公式記載が見当たらず不明のため空欄。
const SIZE_TIERS = [
  { key: "ss", label: "SS", dimensions: "34×65×15cm" },
  { key: "s", label: "S", dimensions: "34×65×33cm" },
  { key: "m", label: "M", dimensions: "34×65×50cm" },
  { key: "l", label: "L", dimensions: "34×65×86cm" },
  { key: "lw", label: "LW", dimensions: "" },
];

// 既存データ・旧Python雛形と表記を揃えるためJST(+09:00)を使う
function nowJstIso() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}` +
    `T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}+09:00`
  );
}

function todayJstDate() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`;
}

function loadLockers() {
  return JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));
}

function saveLockers(lockers) {
  fs.writeFileSync(LOCKERS_PATH, JSON.stringify(lockers, null, 2) + "\n");
}

function loadLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
}

function appendLog(entry) {
  const log = loadLog();
  log.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log.slice(-MAX_LOG_ENTRIES), null, 2) + "\n");
}

function normalizeLocation(loc, station, now) {
  const areaName = loc.area?.attributes?.display_name || "";
  let detailName = loc.attributes?.display_name || "";
  // マルチエキューブ側の名称に既に「付近」が含まれている場合があり、そのまま付けると重複するため除去
  detailName = detailName.replace(/付近$/, "");

  const sizes = [];
  for (const tier of SIZE_TIERS) {
    const box = loc.box_availability?.[tier.key];
    if (!box || box.num_total === 0) continue;
    sizes.push({
      size_type: tier.label,
      price: box.unreserve.price.basic + box.unreserve.price.std,
      quantity: box.num_total,
      dimensions: tier.dimensions,
    });
  }

  return {
    facility_id: loc.id,
    name: `${areaName} コインロッカー`,
    // マルチエキューブAPIは番地までの住所を返さないため、駅・改札・目印を組み合わせた説明文で代用
    address: `${station.name} ${areaName} ${detailName}付近`,
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    nearest_station: station.name,
    station_slug: station.slug,
    business_hours: loc.attributes?.business_hours?.summary || "不明",
    source: {
      site_name: SOURCE_SITE_NAME,
      site_url: `https://multiecube.com/station/${station.baseId}`,
    },
    last_updated_at: now,
    sizes,
  };
}

async function fetchStationLocations(baseId) {
  const dateStr = todayJstDate();
  const results = [];
  let pageNo = 1;

  while (true) {
    const params = new URLSearchParams({
      includes_premium: "true",
      limit: "100",
      page_no: String(pageNo),
      service_type: "3,1",
      includes_no_empty: "false",
      base_id: String(baseId),
      end_at: dateStr,
      from_at: dateStr,
      lang: "ja",
    });

    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Origin: "https://multiecube.com", Referer: "https://multiecube.com/" },
    });
    if (!res.ok) {
      throw new Error(`multiecube API ${res.status} ${res.statusText} (base_id=${baseId})`);
    }
    const data = await res.json();
    results.push(...(data.locations || []));

    if (!data.page_total || pageNo >= data.page_total) break;
    pageNo += 1;
  }

  return results;
}

async function runUpdate() {
  const startedAt = new Date();
  const now = nowJstIso();
  let lockers;

  try {
    lockers = loadLockers();
  } catch (err) {
    const entry = {
      ranAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      status: "error",
      updatedCount: 0,
      stationCounts: {},
      error: err.message,
    };
    appendLog(entry);
    throw err;
  }

  const stationCounts = {};
  const stationErrors = {};

  for (const station of STATIONS) {
    try {
      const locations = await fetchStationLocations(station.baseId);
      const normalized = locations.map((loc) => normalizeLocation(loc, station, now));
      lockers = lockers.filter((l) => l.station_slug !== station.slug);
      lockers.push(...normalized);
      stationCounts[station.slug] = normalized.length;
    } catch (err) {
      stationErrors[station.slug] = err.message;
    }
  }

  const status = Object.keys(stationErrors).length === 0 ? "success" : "partial_error";
  saveLockers(lockers);

  const entry = {
    ranAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    status,
    updatedCount: Object.values(stationCounts).reduce((a, b) => a + b, 0),
    stationCounts,
    error: Object.keys(stationErrors).length ? stationErrors : null,
  };
  appendLog(entry);

  if (status !== "success") {
    throw new Error(`一部の駅で更新に失敗しました: ${JSON.stringify(stationErrors)}`);
  }
  return entry;
}

module.exports = { runUpdate };

if (require.main === module) {
  runUpdate()
    .then((entry) => {
      console.log(`[update-lockers] ${entry.updatedCount}件を更新しました (${entry.durationMs}ms)`);
    })
    .catch((err) => {
      console.error("[update-lockers] 更新に失敗しました:", err.message);
      process.exitCode = 1;
    });
}
