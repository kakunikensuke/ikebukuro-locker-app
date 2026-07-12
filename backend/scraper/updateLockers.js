/**
 * フェーズ9: データ自動更新バッチ（仕組みのみ）
 *
 * 実サイトからの本格スクレイピングは「対象サイト選定・利用規約確認」という
 * 意思決定が未了のため、このモジュールでは扱わない。
 * （旧・Python版の雛形 scrape_lockers.py は退役し、削除用フォルダ/に移動済み。
 *   理由: バックエンドが元々Node/Express構成であること、開発機でPythonが
 *   実行できず動作検証できなかったこと。実サイト対応時はこのファイルの
 *   fetchFromSource() を本実装に置き換える。）
 * ここでは「定期的にデータソースを再取得し、lockers.jsonを安全に更新し、
 * 実行結果をログに残す」という自動更新の仕組みだけを先に用意する。
 *
 * - facility_id 単位でupsertし、ソース側に出てこない既存レコードは
 *   削除しない（安全側に倒す。実際のサイトで一時的に情報が見当たらない
 *   場合でも、施設自体が無くなったとは限らないため）。
 * - fetchFromSource() が本番スクレイピング実装の差し込み口。
 *   対象サイトが決まるまでは、既存レコードをそのまま返すダミー実装。
 */

const fs = require("fs");
const path = require("path");

const LOCKERS_PATH = path.join(__dirname, "..", "data", "lockers.json");
const LOG_PATH = path.join(__dirname, "..", "data", "update-log.json");
const MAX_LOG_ENTRIES = 50;

// 既存データ(lockers.json)・scrape_lockers.pyはJST(+09:00)表記のため揃える
function nowJstIso() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}` +
    `T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}+09:00`
  );
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

/**
 * 対象サイトが決まったら、ここを実際のHTTP取得＋パース処理に置き換える。
 * 現時点では既存レコードをそのまま「最新」として扱うダミー実装。
 */
function fetchFromSource(facility) {
  return facility;
}

async function runUpdate() {
  const startedAt = new Date();
  let status = "success";
  let errorMessage = null;
  let updatedCount = 0;
  const stationCounts = {};

  try {
    const lockers = loadLockers();
    const now = nowJstIso();

    for (const facility of lockers) {
      const fetched = fetchFromSource(facility);
      if (!fetched) continue;
      facility.sizes = fetched.sizes;
      facility.business_hours = fetched.business_hours;
      facility.last_updated_at = now;
      updatedCount += 1;
      stationCounts[facility.station_slug] = (stationCounts[facility.station_slug] || 0) + 1;
    }

    saveLockers(lockers);
  } catch (err) {
    status = "error";
    errorMessage = err.message;
  }

  const entry = {
    ranAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    status,
    updatedCount,
    stationCounts,
    error: errorMessage,
  };
  appendLog(entry);

  if (status === "error") {
    throw new Error(errorMessage);
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
