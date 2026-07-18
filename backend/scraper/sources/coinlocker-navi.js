/**
 * データソース: コインロッカーなび（coinlocker-navi.com）。
 * 鉄道会社自体の公式情報源が見つからなかった事業者（東武・京急・小田急・相鉄・
 * りんかい線）向けの代替ソース。データ集約自体を商品とする第三者サイトであり
 * 利用規約は複製・転載を明記して禁止しているが、事実データ自体には著作物性が
 * ないという整理をここにも適用する方針をユーザー確認済み（2026-07-18）。
 *
 * 駅ページには「最寄りのコインロッカー」が複数件、駅からの距離順に並ぶ。
 * 重要な注意点: 一部の掲載はコインロッカーではなく「ecbo cloak」等の有人荷物
 * 預かりサービス（アイコンが異なる）であり、これらはコインロッカーではないため
 * 除外する。また駅によっては掲載自体はあってもサイズ・料金が「情報なし」の
 * ケースがあり、その場合はそのロケーションを丸ごとスキップする（駅により
 * データ粒度に大きな差があることは調査済み・許容済み）。
 *
 * facility_idはサイト側の個別ロッカーページID（/cl/xxxx）を流用する
 * （マルチエキューブのfacility_id流用と同じ考え方）。
 */
const cheerio = require("cheerio");
const { politeFetchText, politeDelay } = require("../lib/politeFetch");
const { centerForSlug } = require("../lib/privateLineStations");
const { offsetFromCenter } = require("../lib/geo");

const SOURCE_SITE_NAME = "コインロッカーなび";

const SIZE_TIER_MAP = { 小: "S", 中: "M", 大: "L" };

// 対象駅とコインロッカーなび側のページURL。事業者ごとにPhaseを分けて追記していく。
const STATIONS = [
  // Phase 3: りんかい線
  {
    slug: "rinkai-tennoshuairu",
    name: "天王洲アイル駅",
    url: "https://www.coinlocker-navi.com/tokyo/eki/99337/9933705/",
  },
  // Phase 4: 相模鉄道
  {
    slug: "sotetsu-futamatagawa",
    name: "二俣川駅",
    url: "https://www.coinlocker-navi.com/kanagawa/eki/29002/2900201/",
  },
  {
    slug: "sotetsu-nishitani",
    name: "西谷駅",
    url: "https://www.coinlocker-navi.com/kanagawa/eki/29001/2900108/",
  },
];

function parseStationPage(html) {
  const $ = cheerio.load(html);
  const locations = [];

  $(".nearest-wrap").each((_, wrap) => {
    const $wrap = $(wrap);
    const iconAlt = $wrap.find(".distance-wrap img").attr("alt") || "";
    if (iconAlt !== "コインロッカー") return; // ecbo cloak等の預かりサービスは対象外

    const $link = $wrap.find(".txt-wrap .title a");
    const label = $link.text().trim();
    const href = $link.attr("href") || "";
    const idMatch = href.match(/\/cl\/(\d+)/);
    if (!label || !idMatch) return;

    const sizes = [];
    $wrap.find(".price-list > ul.nav.f-release > li").each((__, li) => {
      const $li = $(li);
      const sizeNameJa = $li.find(".size-name").text().trim();
      const tier = SIZE_TIER_MAP[sizeNameJa];
      if (!tier) return;
      const detailText = $li.find(".detail").text().trim();
      const m = detailText.match(/([\d,]+)\s*円\s*\/\s*([\d,]+)\s*個/);
      if (!m) return; // "情報なし"等、個数が読み取れないものは出力しない
      const price = parseInt(m[1].replace(/,/g, ""), 10);
      const quantity = parseInt(m[2].replace(/,/g, ""), 10);
      if (quantity === 0) return;
      sizes.push({ size_type: tier, price, quantity, dimensions: "" });
    });

    if (sizes.length === 0) return; // サイズ・料金が「情報なし」だったロケーションは除外

    locations.push({ clId: idMatch[1], label, sizes });
  });

  return locations;
}

function buildLockerRecord(station, location, index, now) {
  const center = centerForSlug(station.slug);
  const facilityId = `coinlocker-navi-${station.slug}-${location.clId}`;
  const [lat, lng] = index === 0 ? center : offsetFromCenter(center, facilityId, 20);
  return {
    facility_id: facilityId,
    name: `${station.name} コインロッカー`,
    address: location.label,
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
  id: "coinlocker-navi",
  siteName: SOURCE_SITE_NAME,
  // テスト・デバッグ用に内部パーサーも公開しておく
  _parseStationPage: parseStationPage,
  async collect({ now }) {
    const results = [];
    for (const station of STATIONS) {
      try {
        const html = await politeFetchText(station.url);
        const locations = parseStationPage(html);
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
