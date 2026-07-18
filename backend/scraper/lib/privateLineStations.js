// frontend側が真実源の私鉄駅データ（slug/name/center座標）をバックエンドのスクレイパーから
// 参照するための共有ヘルパー。私鉄各社のソースサイトはロッカー個別の緯度経度を提供しない
// ため、駅centerを代用する（geo.jsのoffsetFromCenterと組み合わせて使う）。
const stations = require("../../../frontend/src/data/privateLineStations.json");

const bySlug = new Map(stations.map((s) => [s.slug, s]));

function centerForSlug(slug) {
  const station = bySlug.get(slug);
  if (!station) {
    throw new Error(`private-line-stations.jsonに存在しない駅slugです: ${slug}`);
  }
  return station.center;
}

module.exports = { centerForSlug };
