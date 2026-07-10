// 対応駅の一覧（駅名⇔URLスラッグ⇔地図の中心座標を一元管理）
export const STATIONS = [
  { slug: "ikebukuro", name: "池袋駅", center: [35.7295, 139.7109] },
  { slug: "shinjuku", name: "新宿駅", center: [35.6896, 139.7006] },
  { slug: "shibuya", name: "渋谷駅", center: [35.658, 139.7016] },
];

export function slugToName(slug) {
  return STATIONS.find((s) => s.slug === slug)?.name;
}

export function nameToSlug(name) {
  return STATIONS.find((s) => s.name === name)?.slug;
}

export function centerForName(name) {
  return STATIONS.find((s) => s.name === name)?.center;
}
