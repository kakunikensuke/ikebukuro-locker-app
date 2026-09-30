// 駅の写真を「住みやすさ駅前スコア」（eki-facility-app）から取り込む。手動で実行するスクリプト。
//
//   node scripts/importStationPhotos.mjs
//
// 駅前スコアが Wikipedia / Wikimedia Commons から集めた写真（撮影者・ライセンス付き）を、
// このアプリの駅と slug で突き合わせて先頭の1枚だけ持ってくる。写真はWikimediaのサーバーから
// 直接表示し、画像そのものは保存しない。表示するときは必ず撮影者とライセンスを出すこと。
//
// 出力: src/data/stationPhotos.json（prerender.js が読み、generateApiData.js が駅ごとの
// public/api/photos/<slug>.json に切り出してブラウザに配る）
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EKI_PHOTOS = path.join(
  __dirname,
  "..", "..", "..", "..",
  "駅周辺施設検索アプリプロジェクト",
  "eki-facility-app",
  "backend",
  "data",
  "station-photos.json"
);
const LOCKERS = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const OUT = path.join(__dirname, "..", "src", "data", "stationPhotos.json");

const photos = JSON.parse(fs.readFileSync(EKI_PHOTOS, "utf-8"));
const slugs = new Set(JSON.parse(fs.readFileSync(LOCKERS, "utf-8")).map((l) => l.station_slug));

const out = {};
for (const slug of [...slugs].sort()) {
  const p = photos[slug]?.photos?.[0];
  if (!p?.src || !p.page) continue;
  // 撮影者かライセンスが無い写真は出典を示せないので使わない
  if (!p.artist || !p.license) continue;
  out[slug] = {
    src: p.src,
    width: p.width,
    height: p.height,
    page: p.page,
    artist: p.artist,
    license: p.license,
    licenseUrl: p.license_url ?? null,
  };
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`駅の写真を取り込みました: ${Object.keys(out).length} / ${slugs.size}駅 → ${OUT}`);
