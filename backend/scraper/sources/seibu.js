/**
 * データソース: セントラルオペレーション（central-op.com/case.html）。
 * 西武鉄道のロッカー設置業務を受託している委託先事業者の公式サイト。鉄道会社
 * 本体ではないが、ユーザー確認済みの「事実データに著作物性なし」という整理を
 * 適用する対象に含める（2026-07-18確認）。
 *
 * 単一ページに全駅の設置場所ごとの表が並ぶ単一ページ集約型。表の各行は
 * 「1設置場所×1サイズ」を表し、小型/中型/大型のいずれかの列に○印がある行が
 * そのサイズの実データ（口数・料金）を持つ、という行指向のレイアウト
 * （2026-07-19にHTML構造を確認済み）。同じ設置場所ラベルが複数行にまたがる
 * ため、ラベル単位でグルーピングしてfacilityを構成する。1駅に複数設置場所が
 * ある駅（西武球場前・所沢）もある。
 */
const cheerio = require("cheerio");
const { politeFetchText } = require("../lib/politeFetch");
const { centerForSlug } = require("../lib/privateLineStations");
const { offsetFromCenter } = require("../lib/geo");

const SOURCE_SITE_NAME = "セントラルオペレーション（西武線ロッカー設置委託先）";
const PAGE_URL = "https://central-op.com/case.html";

const SIZE_COLUMNS = [
  { column: "小型", label: "S" },
  { column: "中型", label: "M" },
  { column: "大型", label: "L" },
];

const STATIONS = [
  { slug: "seibu-higashimurayama", name: "東村山駅", heading: "東村山駅" },
  { slug: "seibu-nishitokorozawa", name: "西所沢駅", heading: "西所沢駅" },
  { slug: "seibu-seibukyujomae", name: "西武球場前駅", heading: "西武球場前駅" },
  { slug: "seibu-ogawa", name: "小川駅", heading: "小川駅" },
  { slug: "seibu-tamako", name: "多摩湖駅", heading: "多摩湖駅" },
  { slug: "seibu-kodaira", name: "小平駅", heading: "小平駅" },
  { slug: "seibu-tokorozawa", name: "所沢駅", heading: "所沢駅" },
  { slug: "seibu-agano", name: "吾野駅", heading: "吾野駅" },
  { slug: "seibu-hagiyama", name: "萩山駅", heading: "萩山駅" },
  { slug: "seibu-honkawagoe", name: "本川越駅", heading: "本川越駅" },
  { slug: "seibu-seibuchichibu", name: "西武秩父駅", heading: "西武秩父駅" },
  { slug: "seibu-hanno", name: "飯能駅", heading: "飯能駅" },
];

function isMarked(text) {
  const t = (text || "").trim();
  return t === "○" || t === "〇";
}

function parseStationTable($, $table) {
  const locationsOrder = [];
  const byLabel = new Map();

  $table.find("tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const label = $tr.find("th a").first().text().trim() || $tr.find("th").first().text().trim();
    if (!label) return; // 装飾用の空行等はスキップ

    const priceText = $tr.find('td[data-title^="料金"]').first().text().trim();
    const countText = $tr.find('td[data-title="口数"]').first().text().trim();
    const priceMatch = priceText.match(/[\d,]+/);
    const quantity = parseInt(countText.replace(/,/g, ""), 10);
    if (!priceMatch || !quantity) return;

    const sizeCol = SIZE_COLUMNS.find((c) => isMarked($tr.find(`td[data-title="${c.column}"]`).first().text()));
    if (!sizeCol) return;

    if (!byLabel.has(label)) {
      byLabel.set(label, []);
      locationsOrder.push(label);
    }
    byLabel.get(label).push({
      size_type: sizeCol.label,
      price: parseInt(priceMatch[0].replace(/,/g, ""), 10),
      quantity,
      dimensions: "",
    });
  });

  return locationsOrder.map((label) => ({ label, sizes: byLabel.get(label) }));
}

function buildLockerRecord(station, location, index, now) {
  const localKey = `loc${index + 1}`;
  const center = centerForSlug(station.slug);
  const facilityId = `seibu-${station.slug}-${localKey}`;
  const [lat, lng] = index === 0 ? center : offsetFromCenter(center, facilityId, 20);
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
      site_url: PAGE_URL,
    },
    last_updated_at: now,
    sizes: location.sizes,
  };
}

module.exports = {
  id: "seibu",
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
        let matchedTable = null;
        $("h4").each((_, h4) => {
          if (matchedTable) return;
          if ($(h4).text().trim().startsWith(station.heading)) {
            matchedTable = $(h4).nextAll("table").first();
          }
        });
        if (!matchedTable || matchedTable.length === 0) {
          throw new Error("駅のセクションが見つかりませんでした（サイト構造が変わった可能性）");
        }
        const locations = parseStationTable($, matchedTable);
        if (locations.length === 0) {
          throw new Error("サイズ別個数を読み取れませんでした");
        }
        const normalized = locations.map((loc, i) => buildLockerRecord(station, loc, i, now));
        return { slug: station.slug, locations: normalized };
      } catch (err) {
        return { slug: station.slug, error: err.message };
      }
    });
  },
};
