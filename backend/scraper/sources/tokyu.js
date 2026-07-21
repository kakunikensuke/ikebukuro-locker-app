/**
 * データソース: 東急電鉄公式サイト（tokyu.co.jp）駅別コインロッカー案内ページ。
 * 索引ページ（/railway/coin-locker/）から対象8駅の個別ページURLを機械抽出し、
 * 目視で駅名突合済み（2026-07-21確認）。1駅に複数設置場所があるケースが3駅
 * （日吉・旗の台・自由が丘）あり、いずれもサイト側が既に"A："/"B："という
 * 安定ラベルを設置場所名の先頭に付与しているため、これをそのままlocalKeyに使う
 * （プランで想定していた「人間が確認した静的ラベル表」を用意するまでもなく、
 * サイト自身の採番がそのまま安定キーとして使えた）。
 *
 * サイズ区分は「細型・小型・大型・特大型」の4段階。小型→S・大型→L・特大型→LWは
 * 名称・料金順から直接対応するが、「細型」（幅135mm程度の傘立て状の特殊形状、
 * 300円）は既存のSS/S/M/L/LWのどれとも一致しない東急独自の区分のため、ユーザー
 * 確認の上で新規size_type「SLIM」を追加した（フロント側の表示ラベルも追加済み）。
 * 料金・内寸は駅ごとの記載がなく、共通ページ（/railway/coin-locker/index.html#price）
 * に全駅共通の基本料金・内寸レンジが掲載されているため、これを定数として使う
 * （横浜市営地下鉄と同じ考え方）。
 *
 * 下高井戸駅（世田谷線）のみ、索引ページのURLパターンから機械的に導いた
 * ページが実際には404だった（2026-07-21確認、コインロッカー案内の対象駅一覧に
 * 世田谷線は三軒茶屋しか掲載されていない）。小田急の湘南台・片瀬江ノ島・唐木田と
 * 同じ「掲載自体が存在しない」ケースとして正直に0件を返す（knownMissingフラグで
 * この駅だけ404を許容し、他7駅で404が起きた場合は通常通りエラーとして扱う）。
 */
const cheerio = require("cheerio");
const { politeFetchText, politeDelay } = require("../lib/politeFetch");
const { centerForSlug } = require("../lib/privateLineStations");
const { offsetFromCenter } = require("../lib/geo");

const SOURCE_SITE_NAME = "東急電鉄公式サイト";

// 2026-07-21確認: /railway/coin-locker/index.html#price の共通料金・内寸表
// (幅×奥行き×高さの順、既存yokohama-municipal.jsの表記に合わせて統一)
const SIZE_TIER_MAP = {
  細型: { label: "SLIM", price: 300, dimensions: "135〜141×640〜678×325〜335mm" },
  小型: { label: "S", price: 500, dimensions: "342〜355×575〜663×316〜326mm" },
  大型: { label: "L", price: 600, dimensions: "342〜355×575〜663×502〜567mm" },
  特大型: { label: "LW", price: 900, dimensions: "342〜355×575〜663×843〜1135mm" },
};

const STATIONS = [
  { slug: "tokyu-hiyoshi", name: "日吉駅", url: "https://www.tokyu.co.jp/area/hiyoshi/station/coin-locker/" },
  { slug: "tokyu-azamino", name: "あざみ野駅", url: "https://www.tokyu.co.jp/area/azamino/station/coin-locker/" },
  {
    slug: "tokyu-shimotakaido",
    name: "下高井戸駅",
    url: "https://www.tokyu.co.jp/area/shimo-takaido/station/coin-locker/",
    knownMissing: true,
  },
  { slug: "tokyu-chuorinkan", name: "中央林間駅", url: "https://www.tokyu.co.jp/area/chuo-rinkan/station/coin-locker/" },
  {
    slug: "tokyu-futagotamagawa",
    name: "二子玉川駅",
    url: "https://www.tokyu.co.jp/area/futako-tamagawa/station/coin-locker/",
  },
  { slug: "tokyu-hatanodai", name: "旗の台駅", url: "https://www.tokyu.co.jp/area/hatanodai/station/coin-locker/" },
  { slug: "tokyu-jiyugaoka", name: "自由が丘駅", url: "https://www.tokyu.co.jp/area/jiyugaoka/station/coin-locker/" },
  { slug: "tokyu-tamagawa", name: "多摩川駅", url: "https://www.tokyu.co.jp/area/tamagawa/station/coin-locker/" },
];

// 「特大型」の内部に部分文字列として「大型」を含むため、先読み分割ではなく
// グローバルマッチで1回ずつ消費する方式にする（「特大型4台」を「特大型4」で
// 一致させれば、内部の「大型4」を再度スキャンして誤って"大型"と取り違えない）。
function parseSizes(text) {
  const sizes = [];
  const re = /(特大型|細型|小型|大型)(\d+)台/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tier = SIZE_TIER_MAP[m[1]];
    const quantity = parseInt(m[2], 10);
    if (!tier || quantity === 0) continue;
    sizes.push({ size_type: tier.label, price: tier.price, quantity, dimensions: tier.dimensions });
  }
  return sizes;
}

// 設置場所ラベルの先頭に"A："のようなアルファベット接頭辞がある場合はそれを安定キーに使う
function localKeyFor(label, index) {
  const m = label.match(/^([A-Z])[：:]/);
  return m ? m[1].toLowerCase() : `loc${index + 1}`;
}

function parseStationPage(html) {
  const $ = cheerio.load(html);
  const locations = [];

  $(".portal-coin-locker__location-item").each((_, item) => {
    const $item = $(item);
    const label = $item.find(".portal-coin-locker__location-item-title").first().text().trim();
    if (!label) return;

    let sizes = [];
    $item.find(".portal-coin-locker__location-item-group").each((__, group) => {
      const $group = $(group);
      const groupTitle = $group.find(".portal-coin-locker__location-item-group-title").first().text().trim();
      if (groupTitle !== "ロッカー数") return;
      const items = $group
        .find(".portal-coin-locker__location-item-group-item")
        .map((___, p) => $(p).text().trim())
        .get()
        .join("");
      sizes = parseSizes(items);
    });

    if (sizes.length > 0) locations.push({ label, sizes });
  });

  return locations;
}

function buildLockerRecord(station, location, index, now) {
  const localKey = localKeyFor(location.label, index);
  const center = centerForSlug(station.slug);
  const facilityId = `tokyu-${station.slug}-${localKey}`;
  const [lat, lng] = index === 0 ? center : offsetFromCenter(center, facilityId, 20);
  return {
    facility_id: facilityId,
    name: `${station.name} コインロッカー`,
    address: `${station.name} ${location.label}`,
    latitude: lat,
    longitude: lng,
    nearest_station: station.name,
    station_slug: station.slug,
    business_hours: "不明",
    source: {
      site_name: SOURCE_SITE_NAME,
      site_url: station.url,
    },
    last_updated_at: now,
    sizes: location.sizes,
  };
}

module.exports = {
  id: "tokyu",
  siteName: SOURCE_SITE_NAME,
  async collect({ now }) {
    const results = [];
    for (const station of STATIONS) {
      try {
        let html;
        try {
          html = await politeFetchText(station.url);
        } catch (err) {
          if (station.knownMissing && /\b404\b/.test(err.message)) {
            results.push({ slug: station.slug, locations: [] });
            continue;
          }
          throw err;
        }
        const locations = parseStationPage(html);
        if (locations.length === 0 && !station.knownMissing) {
          throw new Error("駅のセクションが見つかりませんでした（サイト構造が変わった可能性）");
        }
        const normalized = locations.map((loc, i) => buildLockerRecord(station, loc, i, now));
        results.push({ slug: station.slug, locations: normalized });
      } catch (err) {
        results.push({ slug: station.slug, error: err.message });
      }
      await politeDelay(300);
    }
    return results;
  },
};
