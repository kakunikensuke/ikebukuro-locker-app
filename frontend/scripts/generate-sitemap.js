// sitemap.xmlを生成するビルド前スクリプト（`npm run build`のprebuildフックから実行される）
// フェーズ7: 多言語化対応。ja/en両方のURLをhreflang alternateつきで出力する
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { STATIONS, PREFECTURES, pathForStation, pathForPrefecture } from "../src/stations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.VITE_SITE_URL || "https://example.com";
const LOCKERS_PATH = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const USER_SUBMITTED_PATH = path.join(__dirname, "..", "..", "backend", "data", "user-submitted-lockers.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "sitemap.xml");

const lockers = JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));
const userSubmittedLockers = fs.existsSync(USER_SUBMITTED_PATH)
  ? JSON.parse(fs.readFileSync(USER_SUBMITTED_PATH, "utf-8"))
  : [];
// ロッカー実データ（自動取得＋利用者投稿）が無い駅はStationPage側でnoindexになるため、
// sitemapにも含めない（noindexページをsitemapに載せる矛盾を避ける）
const stationsWithLockers = new Set(
  [...lockers, ...userSubmittedLockers].map((l) => l.station_slug)
);

// ja/enのURLペアを生成し、双方に同じhreflang alternateセットを持たせる
function urlPair(pathJa, pathEn, lastmod) {
  const alternates = [
    { hreflang: "ja", href: `${SITE_URL}${pathJa}` },
    { hreflang: "en", href: `${SITE_URL}${pathEn}` },
    { hreflang: "x-default", href: `${SITE_URL}${pathJa}` },
  ];
  return [
    { loc: `${SITE_URL}${pathJa}`, lastmod, alternates },
    { loc: `${SITE_URL}${pathEn}`, lastmod, alternates },
  ];
}

const urls = [...urlPair("/", "/en")];

for (const prefecture of PREFECTURES) {
  urls.push(...urlPair(pathForPrefecture("ja", prefecture), pathForPrefecture("en", prefecture)));
}

for (const station of STATIONS) {
  if (!stationsWithLockers.has(station.slug)) continue;
  urls.push(...urlPair(pathForStation("ja", station.slug), pathForStation("en", station.slug)));
}

// ロッカー詳細ページは2026-08-08にnoindex化したためsitemapから除外している。
// 理由: ロッカー名が駅をまたいで大量に重複し（796件中ユニークは237件）、titleに駅名も入らないため
// 検索需要が無く、1,592ページ（旧sitemapの64%）が重複コンテンツとしてクロール予算を浪費していた。
// noindexページをsitemapに載せない方針は、ロッカー0件の駅ページ（上記）と同じ。

const body = urls
  .map(({ loc, lastmod, alternates }) => {
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
    const alternateTags = alternates
      .map((alt) => `\n    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`)
      .join("");
    return `  <url>\n    <loc>${loc}</loc>${lastmodTag}${alternateTags}\n  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_PATH, xml);

console.log(`sitemap.xml を生成しました（${urls.length}件のURL）: ${OUTPUT_PATH}`);
