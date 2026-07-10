// 対応駅の一覧（駅名⇔URLスラッグ⇔地図の中心座標を一元管理）
// slugは backend/data/lockers.json の station_slug と一致させる規約
export const STATIONS = [
  {
    slug: "ikebukuro",
    name: { ja: "池袋駅", en: "Ikebukuro Station" },
    center: [35.7295, 139.7109],
  },
  {
    slug: "shinjuku",
    name: { ja: "新宿駅", en: "Shinjuku Station" },
    center: [35.6896, 139.7006],
  },
  {
    slug: "shibuya",
    name: { ja: "渋谷駅", en: "Shibuya Station" },
    center: [35.658, 139.7016],
  },
];

export function slugToName(slug, lang = "ja") {
  const station = STATIONS.find((s) => s.slug === slug);
  return station ? station.name[lang] || station.name.ja : undefined;
}

export function centerForSlug(slug) {
  return STATIONS.find((s) => s.slug === slug)?.center;
}

// 日本語はプレフィックスなし（既定言語）、英語は/enを付ける
export function langPrefix(lang) {
  return lang === "en" ? "/en" : "";
}

export function pathForStation(lang, slug) {
  return `${langPrefix(lang)}/${slug}`;
}

export function pathForLocker(lang, slug, facilityId) {
  return `${pathForStation(lang, slug)}/lockers/${facilityId}`;
}

// 2点間の距離(km)をハバーサイン公式で算出。並び替え機能（駅から近い順）で使用
export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
