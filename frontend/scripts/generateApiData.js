// backend/data/lockers.json から frontend/public/api/ に静的JSONを書き出すスクリプト。
// `npm run dev` と `npm run build`（prebuild）の両方の先頭で実行される。
//
// なぜ必要か:
// 以前はRender上のExpressがこのJSONを読んで返していたが、Renderの無料枠は
// アカウント単位で月750インスタンス時間しかなく、常時起動1本で月744時間を使い切る状態だった。
// 中身は lockers.json を読んで絞り込むだけで動的な状態を持たないため、
// ビルド時に書き出してCDNから配ればサーバーは要らない（2026-08-15移行）。
//
// ⚠ 生成物は追跡しない（.gitignore に frontend/public/api/ を追加済み）。
//   毎回ディレクトリごと作り直すこと。古いJSONが残ると、消えたはずのロッカーが生き残る。
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectStations, groupByStation } from "../src/lockerFilter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCKERS_PATH = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "api");

const lockers = JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));

// 差分更新にしない。消えたロッカーのJSONが残り続けるのを防ぐため毎回作り直す
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function writeJson(relativePath, value) {
  const outPath = path.join(OUTPUT_DIR, relativePath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(value));
}

// 駅一覧（プルダウン用）
writeJson("stations.json", { stations: selectStations(lockers) });

// 全件。キーワード・サイズ・料金での絞り込みはブラウザ側で行う。
// クエリの組み合わせぶんJSONを作ると組み合わせ爆発するため、ここでは分割しない。
// 生591KB / gzip 42KB（2026-08-15実測）でCDN配信には十分小さい。
writeJson("lockers.json", { count: lockers.length, results: lockers });

// 駅ページは自駅ぶんしか要らないので、駅別にも切り出す（全件JSONの取得を避ける）
const byStation = groupByStation(lockers);
for (const [slug, stationLockers] of byStation) {
  writeJson(path.join("lockers", "by-station", `${slug}.json`), {
    count: stationLockers.length,
    results: stationLockers,
  });
}

// ロッカー詳細
for (const locker of lockers) {
  writeJson(path.join("lockers", `${locker.facility_id}.json`), locker);
}

console.log(
  `静的APIを生成しました（ロッカー${lockers.length}件 / 駅${byStation.size}駅）: ${OUTPUT_DIR}`
);
