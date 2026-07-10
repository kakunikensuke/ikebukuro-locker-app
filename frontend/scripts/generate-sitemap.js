// sitemap.xmlを生成するビルド前スクリプト（`npm run build`のprebuildフックから実行される）
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { STATIONS } from "../src/stations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.VITE_SITE_URL || "https://example.com";
const LOCKERS_PATH = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "sitemap.xml");

const lockers = JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));

const urls = [{ loc: `${SITE_URL}/` }];

for (const station of STATIONS) {
  urls.push({ loc: `${SITE_URL}/${station.slug}` });
}

for (const locker of lockers) {
  const station = STATIONS.find((s) => s.name === locker.nearest_station);
  if (!station) continue;
  urls.push({
    loc: `${SITE_URL}/${station.slug}/lockers/${locker.facility_id}`,
    lastmod: locker.last_updated_at,
  });
}

const body = urls
  .map(({ loc, lastmod }) => {
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
    return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_PATH, xml);

console.log(`sitemap.xml を生成しました（${urls.length}件のURL）: ${OUTPUT_PATH}`);
