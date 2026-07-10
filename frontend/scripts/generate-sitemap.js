// sitemap.xmlを生成するビルド前スクリプト（`npm run build`のprebuildフックから実行される）
// フェーズ7: 多言語化対応。ja/en両方のURLをhreflang alternateつきで出力する
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { STATIONS, pathForStation, pathForLocker } from "../src/stations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.VITE_SITE_URL || "https://example.com";
const LOCKERS_PATH = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "sitemap.xml");

const lockers = JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));

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

for (const station of STATIONS) {
  urls.push(...urlPair(pathForStation("ja", station.slug), pathForStation("en", station.slug)));
}

for (const locker of lockers) {
  const station = STATIONS.find((s) => s.slug === locker.station_slug);
  if (!station) continue;
  urls.push(
    ...urlPair(
      pathForLocker("ja", station.slug, locker.facility_id),
      pathForLocker("en", station.slug, locker.facility_id),
      locker.last_updated_at
    )
  );
}

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
