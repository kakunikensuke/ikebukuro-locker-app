/**
 * 複数ソース（マルチエキューブ＋私鉄各社）を横断する汎用ランナー。
 *
 * 各ソース（sources/*.js）は { id, siteName, collect() } を実装し、collect()は
 * [{slug, locations}, {slug, error}, ...] を返す。ここでは駅単位で安全に置換する
 * （取得できた駅だけ既存レコードを最新のものに置き換え、失敗した駅は既存データを
 * 保持する）方針を全ソース共通で適用する。ソース自体が丸ごと失敗した場合（サイト
 * ダウン等）もそのソースをスキップするだけで、他ソース・他駅には影響しない。
 */
const { loadLockers, saveLockers, appendLog } = require("./lib/store");
const { nowJstIso } = require("./lib/time");
const sources = require("./sources");

async function runUpdate() {
  const startedAt = new Date();
  const now = nowJstIso();
  let lockers;

  try {
    lockers = loadLockers();
  } catch (err) {
    appendLog({
      ranAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      status: "error",
      updatedCount: 0,
      stationCounts: {},
      error: err.message,
    });
    throw err;
  }

  const stationCounts = {};
  const stationErrors = {};
  const bySource = {};
  const sourceErrors = {};

  for (const source of sources) {
    let stationResults;
    try {
      stationResults = await source.collect({ now });
    } catch (err) {
      sourceErrors[source.id] = err.message;
      continue;
    }

    const sourceCounts = {};
    for (const r of stationResults) {
      if (r.error) {
        stationErrors[r.slug] = r.error;
        continue;
      }
      lockers = lockers.filter((l) => l.station_slug !== r.slug);
      lockers.push(...r.locations);
      stationCounts[r.slug] = r.locations.length;
      sourceCounts[r.slug] = r.locations.length;
    }
    bySource[source.id] = sourceCounts;
  }

  const hasErrors = Object.keys(stationErrors).length > 0 || Object.keys(sourceErrors).length > 0;
  const status = hasErrors ? "partial_error" : "success";
  saveLockers(lockers);

  const entry = {
    ranAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    status,
    updatedCount: Object.values(stationCounts).reduce((a, b) => a + b, 0),
    stationCounts,
    bySource,
    error: hasErrors ? { stations: stationErrors, sources: sourceErrors } : null,
  };
  appendLog(entry);

  if (status !== "success") {
    throw new Error(
      `一部の更新に失敗しました: ${JSON.stringify({ stations: stationErrors, sources: sourceErrors })}`
    );
  }
  return entry;
}

module.exports = { runUpdate };
