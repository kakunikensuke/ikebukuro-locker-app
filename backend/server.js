/**
 * コインロッカー検索アプリ バックエンドAPI
 *
 * フェーズ2: GET /api/lockers          -> 地図表示用に全件返す
 * フェーズ3: GET /api/lockers?keyword= -> キーワード・サイズ・料金での検索
 * フェーズ4: GET /api/lockers/:id      -> 詳細（料金・サイズ別個数）
 * フェーズ5: GET /api/stations         -> 対応駅一覧
 *            GET /api/lockers?station= -> 駅での絞り込み（対象エリアの拡大）
 * フェーズ9: データ自動更新バッチ（仕組みのみ、詳細はscraper/updateLockers.js参照）
 *            更新バッチのスケジューリングはGitHub Actionsの定期実行に委譲しており、
 *            このプロセス内では行わない（無料ホスティングのスリープ中はプロセス内cronが発火しないため）。
 *
 * 2026-08-15: 書き込みAPI（周辺写真の投稿・利用者によるロッカー情報の投稿）を廃止した。
 * Renderの無料プランは永続ディスクを持てず、投稿されたデータが再デプロイのたびに消えていたため
 * （実投稿は0件）。
 *
 * 🔴 同時に、本番のAPIはビルド時生成の静的JSON（frontend/public/api/）へ移行した。
 *    **このサーバーは本番では使っていない。** 残してあるのは、静的化に問題が出たときの
 *    切り戻し先と、APIの挙動をローカルで確認する用途のため。
 *    絞り込みロジックは frontend/src/lockerFilter.js が唯一の実装で、ここはそれを呼ぶだけ。
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_PATH = path.join(__dirname, "data", "lockers.json");

app.use(cors());
app.use(express.json());

function loadLockers() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

// lockerFilter.js はESM。CJSのこのファイルからは動的importでしか読めないため、
// 起動時に一度だけ読み込んでからlistenする。
async function main() {
  const { selectStations, selectLockers, selectLockerById } = await import(
    "../frontend/src/lockerFilter.js"
  );

  // フェーズ5: 対応駅一覧（フロントの駅選択プルダウン用）
  // フェーズ7: 多言語化のため日本語名ではなくslugベースで返す（表示名はフロントのstations.jsが多言語で持つ）
  app.get("/api/stations", (req, res) => {
    res.json({ stations: selectStations(loadLockers()) });
  });

  // フェーズ2・3・5: 一覧取得＋検索（駅／キーワード／サイズ／最大料金でフィルタ）
  // フェーズ7: 駅の絞り込みはstation_slugベース（日本語名に依存しない）
  app.get("/api/lockers", (req, res) => {
    const { keyword, size, maxPrice, station_slug: stationSlug } = req.query;
    const results = selectLockers(loadLockers(), { keyword, size, maxPrice, stationSlug });
    res.json({ count: results.length, results });
  });

  // フェーズ4: 詳細取得（料金・サイズ別個数を含む）
  app.get("/api/lockers/:id", (req, res) => {
    const locker = selectLockerById(loadLockers(), req.params.id);
    if (!locker) {
      return res.status(404).json({ error: "指定されたロッカーが見つかりません" });
    }
    res.json(locker);
  });

  app.get("/", (req, res) => {
    res.json({ message: "コインロッカー検索API稼働中（ローカル確認用。本番は静的JSON）" });
  });

  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

main();
