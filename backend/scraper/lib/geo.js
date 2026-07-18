const crypto = require("crypto");

// facility_idから決定論的に0〜1の値を作る（再スクレイピングしても同じ値になる＝ピン位置が動かない）
function seededUnit(seed) {
  const hash = crypto.createHash("md5").update(seed).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}

// 駅center座標に、facility_id由来の決定論的な小さいオフセットを加算する。
// ロッカー個別の正確な座標が取得できないソース向けに、同一駅内の複数facilityが
// 地図上でピン重複してクリック不能になる（MapView.jsxはマーカークラスタリング未導入）
// のを避けるための「見た目上の分散」であり、実在の設置場所座標ではない。
function offsetFromCenter([lat, lng], seed, radiusMeters = 20) {
  const angle = seededUnit(seed) * 2 * Math.PI;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const dLat = (radiusMeters * Math.sin(angle)) / metersPerDegLat;
  const dLng = (radiusMeters * Math.cos(angle)) / metersPerDegLng;
  return [lat + dLat, lng + dLng];
}

module.exports = { offsetFromCenter };
