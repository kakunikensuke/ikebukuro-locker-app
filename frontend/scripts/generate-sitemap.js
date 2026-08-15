// sitemap.xmlを生成するビルド前スクリプト（`npm run build`のprebuildフックから実行される）
// フェーズ7: 多言語化対応。ja/en両方のURLをhreflang alternateつきで出力する
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { STATIONS, PREFECTURES, pathForStation, pathForPrefecture } from "../src/stations.js";
import { LOCKER_SIZES, pathForSize, pathForSizeList } from "../src/lockerSizes.js";
import {
  pathForContactReceived,
  pathForGuide,
  pathForGuideList,
  pathForPrivacy,
} from "../src/staticPages.js";
import { GUIDES } from "../src/content/guides.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.VITE_SITE_URL || "https://example.com";
const LOCKERS_PATH = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "sitemap.xml");

const lockers = JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));
// ロッカー実データが無い駅はStationPage側でnoindexになるため、
// sitemapにも含めない（noindexページをsitemapに載せる矛盾を避ける）
const stationsWithLockers = new Set(lockers.map((l) => l.station_slug));

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

// サイズ別の横断一覧（/sizes・/sizes/:sizeSlug）。駅名単体のクエリと違って
// Googleマップと競合しない切り口なので、インデックス対象として載せる
urls.push(...urlPair(pathForSizeList("ja"), pathForSizeList("en")));
for (const size of LOCKER_SIZES) {
  urls.push(...urlPair(pathForSize("ja", size.slug), pathForSize("en", size.slug)));
}

// プライバシーポリシー・免責事項。検索需要のあるページではないが、
// 運営者情報に到達できることを示す必要があるためインデックス対象にする
// 解説記事。駅名単体のクエリと違ってGoogleマップと競合しない切り口で、
// このサイトで唯一「読み物」として成立するページ群なので必ずインデックス対象にする
urls.push(...urlPair(pathForGuideList("ja"), pathForGuideList("en")));
for (const guide of GUIDES) {
  urls.push(...urlPair(pathForGuide("ja", guide.slug), pathForGuide("en", guide.slug)));
}

urls.push(...urlPair(pathForPrivacy("ja"), pathForPrivacy("en")));
urls.push(...urlPair(pathForContactReceived("ja"), pathForContactReceived("en")));

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
