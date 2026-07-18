/**
 * データソース: 京王電鉄公式コインロッカー案内サイト「けいおちか」(keiochika.co.jp)。
 * 静的HTMLに駅ごと・設置場所ごとのサイズ別設置数・料金が掲載されている
 * （2026-07-18にHTML構造を確認済み）。「空き数」列はJSで非同期更新される
 * プレースホルダー（"読み込み中"）のみが静的HTMLに含まれ実データは取得できないため、
 * マルチエキューブと同じ方針で設置数のみを記録し空き状況は扱わない。
 *
 * サイズ区分は「小・標準・中・大・特大」の5段階で、価格の安い順に並んでおり、
 * マルチエキューブのSS/S/M/L/LWという5段階の区分と個数・並び順が構造的に一致するため、
 * 相場からの推測ではなく構造的対応としてラベルを揃えている。
 *
 * 対象駅のうち5駅（明大前・高幡不動・北野・東府中・京王八王子）は共通のインデックス
 * ページ(service/index.html)に、京王多摩センター駅のみ専用ページ(service/center.html)
 * に掲載されている。
 */
const cheerio = require("cheerio");
const { politeFetchText, politeDelay } = require("../lib/politeFetch");
const { centerForSlug } = require("../lib/privateLineStations");
const { offsetFromCenter } = require("../lib/geo");

const SOURCE_SITE_NAME = "京王電鉄（けいおちか）";
const INDEX_URL = "https://www.keiochika.co.jp/locker/service/index.html";
const CENTER_URL = "https://www.keiochika.co.jp/locker/service/center.html";

// 価格の安い順（小<標準<中<大<特大）がマルチエキューブのSS<S<M<L<LWと対応する
const SIZE_TIER_MAP = {
  小: "SS",
  標準: "S",
  中: "M",
  大: "L",
  特大: "LW",
};

const STATIONS = [
  { slug: "keio-meidaimae", name: "明大前駅", heading: "明大前駅", page: INDEX_URL },
  { slug: "keio-takahatafudo", name: "高幡不動駅", heading: "高幡不動駅", page: INDEX_URL },
  { slug: "keio-kitano", name: "北野駅", heading: "北野駅", page: INDEX_URL },
  { slug: "keio-higashifuchu", name: "東府中駅", heading: "東府中駅", page: INDEX_URL },
  { slug: "keio-keiohachioji", name: "京王八王子駅", heading: "京王八王子駅", page: INDEX_URL },
  { slug: "keio-keiotamasenta", name: "京王多摩センター駅", heading: null, page: CENTER_URL },
];

function parseSizeTable($, $table) {
  const sizes = [];
  $table.find("tr").each((_, tr) => {
    const $tr = $(tr);
    const $sizeTd = $tr.find("td.size");
    if ($sizeTd.length === 0) return; // ヘッダー行
    const sizeLabelJa = $sizeTd.clone().children().remove().end().text().trim();
    const tier = SIZE_TIER_MAP[sizeLabelJa];
    if (!tier) return;
    const cells = $tr.find("td");
    const total = parseInt($(cells[1]).text().trim(), 10) || 0;
    if (total === 0) return;
    const priceText = $(cells[cells.length - 1]).text().trim();
    const priceMatch = priceText.match(/[\d,]+/);
    if (!priceMatch) return; // 料金が読み取れない区分は出力しない
    sizes.push({
      size_type: tier,
      price: parseInt(priceMatch[0].replace(/,/g, ""), 10),
      quantity: total,
      dimensions: "",
    });
  });
  return sizes;
}

// index.html: <div class="list__col"> 1つが1駅。中にh3(駅名)＋(h4ラベル＋table)の
// 組が設置場所の数だけドキュメント順で並ぶ
function parseIndexPage(html, targetHeading) {
  const $ = cheerio.load(html);
  let locations = null;
  $("div.list__col").each((_, col) => {
    if (locations) return;
    const $col = $(col);
    const stationName = $col.find("h3").first().text().trim();
    if (stationName !== targetHeading) return;

    const found = [];
    let currentLabel = null;
    $col.find("h4, table.price__table").each((__, el) => {
      if (el.tagName === "h4") {
        currentLabel = $(el).text().trim();
      } else if (el.tagName === "table") {
        found.push({ label: currentLabel, sizes: parseSizeTable($, $(el)) });
      }
    });
    locations = found;
  });
  return locations || [];
}

// center.html: <div class="col">1つが1設置場所。h3自体がラベル（"A東口改札内..."のようにarea_num込み）
function parseCenterPage(html) {
  const $ = cheerio.load(html);
  const locations = [];
  $("div.col").each((_, col) => {
    const $col = $(col);
    const $h3 = $col.find("h3").first();
    const $table = $col.find("table.price__table").first();
    if ($h3.length === 0 || $table.length === 0) return;
    locations.push({ label: $h3.text().trim(), sizes: parseSizeTable($, $table) });
  });
  return locations;
}

function buildLockerRecord(station, location, index, now) {
  const localKey = `loc${index + 1}`;
  const center = centerForSlug(station.slug);
  const facilityId = `keio-${station.slug}-${localKey}`;
  const [lat, lng] =
    index === 0 ? center : offsetFromCenter(center, facilityId, 20);
  return {
    facility_id: facilityId,
    name: `${station.name} コインロッカー`,
    address: `${station.name} ${location.label}付近`,
    latitude: lat,
    longitude: lng,
    nearest_station: station.name,
    station_slug: station.slug,
    business_hours: "不明",
    source: {
      site_name: SOURCE_SITE_NAME,
      site_url: station.page,
    },
    last_updated_at: now,
    sizes: location.sizes,
  };
}

module.exports = {
  id: "keio",
  siteName: SOURCE_SITE_NAME,
  async collect({ now }) {
    const results = [];
    let indexHtml = null;
    let centerHtml = null;

    try {
      indexHtml = await politeFetchText(INDEX_URL);
    } catch (err) {
      // インデックスページ自体が落ちている場合、それに依存する5駅すべてをエラーにする
      for (const station of STATIONS) {
        if (station.page === INDEX_URL) results.push({ slug: station.slug, error: err.message });
      }
    }
    await politeDelay();
    try {
      centerHtml = await politeFetchText(CENTER_URL);
    } catch (err) {
      for (const station of STATIONS) {
        if (station.page === CENTER_URL) results.push({ slug: station.slug, error: err.message });
      }
    }

    for (const station of STATIONS) {
      if (results.some((r) => r.slug === station.slug)) continue; // 既にページ取得失敗でエラー計上済み
      try {
        const locations =
          station.page === INDEX_URL
            ? parseIndexPage(indexHtml, station.heading)
            : parseCenterPage(centerHtml);
        if (locations.length === 0) {
          throw new Error("駅のセクションが見つかりませんでした（サイト構造が変わった可能性）");
        }
        const normalized = locations.map((loc, i) => buildLockerRecord(station, loc, i, now));
        results.push({ slug: station.slug, locations: normalized });
      } catch (err) {
        results.push({ slug: station.slug, error: err.message });
      }
    }

    return results;
  },
};
