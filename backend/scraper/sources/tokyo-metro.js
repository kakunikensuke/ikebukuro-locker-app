/**
 * データソース: メトロコマース（metocan.co.jp/locker/、東京メトロのロッカー設置業務を
 * 担うグループ会社の公式サイト）。単一ページに9路線・全140駅（対象は私鉄129駅追加時に
 * 選定した43駅のみ）が路線セクションごとに列挙される単一ページ集約型（2026-07-27確認）。
 *
 * 【要ユーザー確認事項の決定（2026-07-27）】このソースは物理サイズ名（S/M/L等）ではなく
 * 「料金 300円/500円/600円/900円/1000円」の5段階の料金帯ごとの口数のみを掲載している。
 * 既存のsize_type（SS/S/M/L/LW/SLIM）はいずれも物理サイズ由来のため、根拠のない推測で
 * 対応づけることはせず、ユーザーに相談の上「料金帯そのものを新size_typeにする」方針で
 * 決定した。size_typeは`P300`〜`P1000`（Pは price-tier の意）。フロント側は物理サイズと
 * 同じテーブルに表示されるが、SIZE_LABELには「300円ロッカー」等の料金帯ラベルを追加する
 * （既存のサイズ絞り込みドロップダウン(SS/S/M/L/LW)には追加しない＝メトロの駅はサイズ
 * 絞り込みの対象外になるが、料金上限の絞り込み(maxPrice)は従来通り機能する）。
 *
 * 乗換駅（1駅で複数路線に掲載）の扱い: 東武・京急等の第三者アグリゲーターで頻出した
 * 「同一内容の完全重複掲載」とは異なり、このソースは同じ駅名でも路線ごとに口数が
 * 異なっていた（路線ホーム付近など、路線ごとに物理的に別のロッカー群があるとみられる）。
 * そのため重複除去はせず、路線ごとに別facility（loc1, loc2, ...）として扱う。
 */
const cheerio = require("cheerio");
const { politeFetchText } = require("../lib/politeFetch");
const { centerForSlug } = require("../lib/privateLineStations");
const { offsetFromCenter } = require("../lib/geo");

const SOURCE_SITE_NAME = "メトロコマース（東京メトロ公式コインロッカー案内）";
const PAGE_URL = "https://www.metocan.co.jp/locker/";

// 私鉄129駅追加時（2026-07-18）に選定した対象43駅。駅名はfrontend/src/data/privateLineStations.json
// の表記と一致させてある（サイト側の駅名突合に使う）。
const STATIONS = [
  { slug: "tokyo-metro-otemachi", name: "大手町駅" },
  { slug: "tokyo-metro-oshiage", name: "押上駅" },
  { slug: "tokyo-metro-kotakemukaihara", name: "小竹向原駅" },
  { slug: "tokyo-metro-ginza", name: "銀座駅" },
  { slug: "tokyo-metro-kasumigaseki", name: "霞ヶ関駅" },
  { slug: "tokyo-metro-hibiya", name: "日比谷駅" },
  { slug: "tokyo-metro-asakusa", name: "浅草駅" },
  { slug: "tokyo-metro-nihombashi", name: "日本橋駅" },
  { slug: "tokyo-metro-aoyamaichichome", name: "青山一丁目駅" },
  { slug: "tokyo-metro-omotesando", name: "表参道駅" },
  { slug: "tokyo-metro-nakanosakaue", name: "中野坂上駅" },
  { slug: "tokyo-metro-shinjukusanchome", name: "新宿三丁目駅" },
  { slug: "tokyo-metro-kudanshita", name: "九段下駅" },
  { slug: "tokyo-metro-nagatacho", name: "永田町駅" },
  { slug: "tokyo-metro-ichigaya", name: "市ヶ谷駅" },
  { slug: "tokyo-metro-jimbomachi", name: "神保町駅" },
  { slug: "tokyo-metro-toyosu", name: "豊洲駅" },
  { slug: "tokyo-metro-machiya", name: "町屋駅" },
  { slug: "tokyo-metro-akabaneiwabuchi", name: "赤羽岩淵駅" },
  { slug: "tokyo-metro-yoyogiuehara", name: "代々木上原駅" },
  { slug: "tokyo-metro-nakameguro", name: "中目黒駅" },
  { slug: "tokyo-metro-higashiginza", name: "東銀座駅" },
  { slug: "tokyo-metro-ningyomachi", name: "人形町駅" },
  { slug: "tokyo-metro-kayabamachi", name: "茅場町駅" },
  { slug: "tokyo-metro-roppongi", name: "六本木駅" },
  { slug: "tokyo-metro-tameikesanno", name: "溜池山王駅" },
  { slug: "tokyo-metro-akasakamitsuke", name: "赤坂見附駅" },
  { slug: "tokyo-metro-mitsukoshimae", name: "三越前駅" },
  { slug: "tokyo-metro-korakuen", name: "後楽園駅" },
  { slug: "tokyo-metro-hongosanchome", name: "本郷三丁目駅" },
  { slug: "tokyo-metro-kokkaigijidomae", name: "国会議事堂前駅" },
  { slug: "tokyo-metro-monzennakamachi", name: "門前仲町駅" },
  { slug: "tokyo-metro-mafujuban", name: "麻布十番駅" },
  { slug: "tokyo-metro-shiroganetakanawa", name: "白金高輪駅" },
  { slug: "tokyo-metro-senkawa", name: "千川駅" },
  { slug: "tokyo-metro-kanamecho", name: "要町駅" },
  { slug: "tokyo-metro-wakoshi", name: "和光市駅" },
  { slug: "tokyo-metro-tsukishima", name: "月島駅" },
  { slug: "tokyo-metro-shinkiba", name: "新木場駅" },
  { slug: "tokyo-metro-meijijingumae", name: "明治神宮前駅" },
  { slug: "tokyo-metro-sumiyoshi", name: "住吉駅" },
  { slug: "tokyo-metro-kiyosumishirakawa", name: "清澄白河駅" },
  { slug: "tokyo-metro-shirokanedai", name: "白金台駅" },
];

// ページ全体をパースし、駅名 -> [{ line, sizes }] のMapを返す（同名駅が複数路線に
// またがる場合は出現順にすべて集める）。
function parsePage(html) {
  const $ = cheerio.load(html);
  const byName = new Map();

  $(".list_box").each((_, listEl) => {
    const line = $(listEl).find(".title_obj").first().text().trim();

    $(listEl)
      .find(".station_title")
      .each((__, stEl) => {
        const name = $(stEl).text().trim();
        const $table = $(stEl).next(".table");
        const $rows = $table.find(".t_txt.flex_box");
        const priceCells = $($rows[0])
          .find("p")
          .slice(1)
          .map((i, p) => $(p).text().trim())
          .get();
        const countCells = $($rows[1])
          .find("p")
          .slice(1)
          .map((i, p) => $(p).text().trim())
          .get();

        const sizes = [];
        priceCells.forEach((priceText, i) => {
          const priceMatch = priceText.match(/\d+/);
          const quantity = parseInt((countCells[i] || "").replace(/,/g, ""), 10);
          if (!priceMatch || !Number.isInteger(quantity) || quantity <= 0) return; // "-"（設置なし）は出力しない
          const price = parseInt(priceMatch[0], 10);
          sizes.push({ size_type: `P${price}`, price, quantity, dimensions: "" });
        });
        if (sizes.length === 0) return; // この路線区画にはロッカーなし

        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push({ line, sizes });
      });
  });

  return byName;
}

function buildLockerRecord(station, location, index, now) {
  const localKey = `loc${index + 1}`;
  const center = centerForSlug(station.slug);
  const facilityId = `tokyo-metro-${station.slug}-${localKey}`;
  const [lat, lng] = index === 0 ? center : offsetFromCenter(center, facilityId, 20);
  return {
    facility_id: facilityId,
    name: `${station.name} コインロッカー`,
    address: `${station.name} ${location.line}付近`,
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
  id: "tokyo-metro",
  siteName: SOURCE_SITE_NAME,
  // テスト・デバッグ用に内部パーサーも公開しておく
  _parsePage: parsePage,
  async collect({ now }) {
    let html;
    try {
      html = await politeFetchText(PAGE_URL);
    } catch (err) {
      return STATIONS.map((s) => ({ slug: s.slug, error: err.message }));
    }

    const byName = parsePage(html);

    return STATIONS.map((station) => {
      try {
        const locations = byName.get(station.name) || [];
        const normalized = locations.map((loc, i) => buildLockerRecord(station, loc, i, now));
        return { slug: station.slug, locations: normalized };
      } catch (err) {
        return { slug: station.slug, error: err.message };
      }
    });
  },
};
