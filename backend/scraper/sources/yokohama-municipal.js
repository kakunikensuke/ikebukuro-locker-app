/**
 * データソース: 横浜市交通局協力会（kyouryokukai.or.jp）「コインロッカー」ページ。
 * ブルーライン・グリーンライン全駅のサイズ別設置数が単一の静的HTMLテーブルに
 * まとまっている（2026-07-18にHTML構造を確認済み）。対象は`private-line-stations.json`
 * の`yokohama-municipal-*`スラッグであるセンター北・センター南の2駅のみ
 * （関内・新横浜はマルチエキューブ経由で既に別スラッグとして取得済みのため対象外）。
 *
 * 料金は駅ごとの個別記載がなく、ページ内の「コインロッカーサイズと料金」セクションに
 * 全駅共通の基本料金（小型500円〜・中型700円〜・大型1000円〜）と内寸レンジが
 * 案内されているため、これを全駅共通の料金・内寸として使う。「小/中/大」は
 * Small/Medium/Largeという英語表記が併記されており、相場推測ではなく直接対応としてS/M/Lを使う。
 */
const cheerio = require("cheerio");
const { politeFetchText } = require("../lib/politeFetch");
const { centerForSlug } = require("../lib/privateLineStations");

const SOURCE_SITE_NAME = "横浜市交通局協力会";
const PAGE_URL = "https://www.kyouryokukai.or.jp/business/coinlocker/";

// 2026-07-18確認: サイズと料金セクションの記載値（全駅共通）
const SIZE_TIER_MAP = {
  小: { label: "S", price: 500, dimensions: "342〜352×575〜678×320〜335mm" },
  中: { label: "M", price: 700, dimensions: "342〜352×575〜678×492〜572mm" },
  大: { label: "L", price: 1000, dimensions: "342〜352×575〜678×840〜872mm" },
};

const STATIONS = [
  { slug: "yokohama-municipal-sentakita", name: "センター北駅", heading: "センター北" },
  { slug: "yokohama-municipal-sentaminami", name: "センター南駅", heading: "センター南" },
];

function parseSizes(cellHtml) {
  const sizes = [];
  const parts = (cellHtml || "")
    .split(/<br\s*\/?>/i)
    .map((s) => s.replace(/<[^>]+>/g, "").trim());
  for (const part of parts) {
    const m = part.match(/^(小|中|大)\s*(\d+)$/);
    if (!m) continue;
    const tier = SIZE_TIER_MAP[m[1]];
    const quantity = parseInt(m[2], 10);
    if (!tier || quantity === 0) continue;
    sizes.push({
      size_type: tier.label,
      price: tier.price,
      quantity,
      dimensions: tier.dimensions,
    });
  }
  return sizes;
}

function buildLockerRecord(station, sizes, now) {
  const center = centerForSlug(station.slug);
  return {
    facility_id: `yokohama-municipal-${station.slug}-main`,
    name: `${station.name} コインロッカー`,
    address: `${station.name} コインロッカー`,
    latitude: center[0],
    longitude: center[1],
    nearest_station: station.name,
    station_slug: station.slug,
    business_hours: "不明",
    source: {
      site_name: SOURCE_SITE_NAME,
      site_url: PAGE_URL,
    },
    last_updated_at: now,
    sizes,
  };
}

module.exports = {
  id: "yokohama-municipal",
  siteName: SOURCE_SITE_NAME,
  async collect({ now }) {
    let html;
    try {
      html = await politeFetchText(PAGE_URL);
    } catch (err) {
      return STATIONS.map((s) => ({ slug: s.slug, error: err.message }));
    }
    const $ = cheerio.load(html);

    return STATIONS.map((station) => {
      try {
        let matchedCell = null;
        $("td").each((_, el) => {
          if (matchedCell) return;
          if ($(el).text().trim() === station.heading) {
            matchedCell = $(el).next("td");
          }
        });
        if (!matchedCell || matchedCell.length === 0) {
          throw new Error("駅の行が見つかりませんでした（サイト構造が変わった可能性）");
        }
        const sizes = parseSizes(matchedCell.html());
        if (sizes.length === 0) {
          throw new Error("サイズ別個数を読み取れませんでした");
        }
        return { slug: station.slug, locations: [buildLockerRecord(station, sizes, now)] };
      } catch (err) {
        return { slug: station.slug, error: err.message };
      }
    });
  },
};
