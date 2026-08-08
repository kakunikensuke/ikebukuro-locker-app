// サイズ別の横断一覧ページ（/sizes・/sizes/:sizeSlug）で使うロジック。
// プリレンダ（scripts/prerender.js）とクライアント（pages/SizePage.jsx）の双方から使い、
// 両者の集計結果がずれないようにここに集約している。
import { langPrefix } from "./stations.js";

// 横断ページを用意するサイズ。上ほど検索需要が高い（大型ほど「入るかどうか」を事前に調べられる）。
// P300〜P1000は東京メトロの料金帯であって物理サイズではなく内寸を持たないため対象外。
// SLIM（細型）は2駅しかなく一覧にする意味が薄いので除外している。
export const LOCKER_SIZES = [
  { slug: "lw", sizeType: "LW" },
  { slug: "l", sizeType: "L" },
  { slug: "m", sizeType: "M" },
  { slug: "s", sizeType: "S" },
  { slug: "ss", sizeType: "SS" },
];

export function sizeBySlug(slug) {
  return LOCKER_SIZES.find((s) => s.slug === slug);
}

export function pathForSizeList(lang) {
  return `${langPrefix(lang)}/sizes`;
}

export function pathForSize(lang, slug) {
  return `${langPrefix(lang)}/sizes/${slug}`;
}

// 指定サイズを設置しているロッカーを駅ごとに集計する。
// 「設置しているか」の判定はAPI（backend/server.jsのsizeフィルタ）と揃えてquantity>0とする。
// quantityは設置個数であって空き数ではない点に注意（空き状況は当アプリでは扱わない）。
export function stationsWithSize(lockers, sizeType) {
  const byStation = new Map();
  for (const locker of lockers) {
    const size = (locker.sizes ?? []).find((s) => s.size_type === sizeType && s.quantity > 0);
    if (!size) continue;
    const entry = byStation.get(locker.station_slug) ?? {
      slug: locker.station_slug,
      lockerCount: 0,
      minPrice: Infinity,
      maxPrice: 0,
    };
    entry.lockerCount += 1;
    entry.minPrice = Math.min(entry.minPrice, size.price);
    entry.maxPrice = Math.max(entry.maxPrice, size.price);
    byStation.set(locker.station_slug, entry);
  }
  return byStation;
}

// 一覧ページの見出し・descriptionに出す全体集計（駅数・箇所数・料金帯・代表的な内寸）。
// 内寸はロッカーごとに表記が揺れるため、最も多く使われている表記を代表値として採用する。
export function sizeSummary(lockers, sizeType) {
  const byStation = stationsWithSize(lockers, sizeType);
  const prices = [];
  const dimensionCounts = new Map();
  let lockerCount = 0;

  for (const locker of lockers) {
    const size = (locker.sizes ?? []).find((s) => s.size_type === sizeType && s.quantity > 0);
    if (!size) continue;
    lockerCount += 1;
    prices.push(size.price);
    if (size.dimensions) {
      dimensionCounts.set(size.dimensions, (dimensionCounts.get(size.dimensions) ?? 0) + 1);
    }
  }

  const dimensions =
    [...dimensionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return {
    stationCount: byStation.size,
    lockerCount,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    dimensions,
    byStation,
  };
}
