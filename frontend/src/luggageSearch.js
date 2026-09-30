// 「荷物の大きさから探す」（/luggage）の計算。画面（pages/LuggagePage.jsx）と
// 静的HTML（scripts/prerender.js）が共有する唯一の実装。
//
// 荷物が入るかの判定そのものは luggageFit.js の fits()（内寸で判定）。ここはそれを
// 全国のロッカーに当てはめて、駅ごと・都道府県ごとに数える。
//
// **荷物の種類ごとにページを分けないこと。** 2026-09-30に実測したところ、預け入れMと
// 預け入れLは入る駅・台数が完全に同じ（どちらも入るのは高さ86cm前後のLサイズ以上だけ）で、
// 機内持ち込みとリュックも駅の顔ぶれが99%同じだった。分けると中身が同じページが並ぶ
// （japan-proxy-cost が「答えが変わらない軸でページを割らない」として256→126ページに削った失敗）。
// 1ページで比較し、違いが出る駅（機内持ち込みまでしか入らない駅など）だけを一覧にする。
import { LUGGAGE, fits, parseDimensions } from "./luggageFit.js";
import { langPrefix, PREFECTURES, prefectureForSlug } from "./stations.js";

export function pathForLuggageList(lang) {
  return `${langPrefix(lang)}/luggage`;
}

export function formatDims(dims) {
  return dims.map((n) => (Number.isInteger(n) ? n : n.toFixed(1))).join("×");
}

/**
 * その荷物が入るロッカーを全国で数える。
 *
 * 戻り値:
 *   stations: [{ slug, units, facilities, minPrice }]（入る台数の多い順）
 *   totalStations / totalUnits: 入る駅・台数の合計
 *   allStations: ロッカーがある駅の数（分母）
 *   unknownUnits: 内寸が公開されておらず判定から外した台数（隠さず表示する）
 *   cheapest: 入るサイズで最も安い { price, slug }
 */
export function searchByDims(lockers, itemDims) {
  const byStation = new Map();
  const allStations = new Set();
  let unknownUnits = 0;

  for (const l of lockers) {
    allStations.add(l.station_slug);
    let lockerHit = false;
    for (const s of l.sizes ?? []) {
      if (!(s.quantity > 0)) continue;
      const box = parseDimensions(s.dimensions);
      if (!box) {
        unknownUnits += s.quantity;
        continue;
      }
      if (!fits(box, itemDims)) continue;
      const cur = byStation.get(l.station_slug) ?? { slug: l.station_slug, units: 0, facilities: 0, minPrice: Infinity };
      cur.units += s.quantity;
      cur.minPrice = Math.min(cur.minPrice, s.price);
      if (!lockerHit) {
        cur.facilities += 1;
        lockerHit = true;
      }
      byStation.set(l.station_slug, cur);
    }
  }

  const stations = [...byStation.values()].sort((a, b) => b.units - a.units || a.slug.localeCompare(b.slug));
  const cheapest = stations.reduce(
    (best, s) => (best === null || s.minPrice < best.price ? { price: s.minPrice, slug: s.slug } : best),
    null
  );

  return {
    stations,
    totalStations: stations.length,
    totalUnits: stations.reduce((sum, s) => sum + s.units, 0),
    allStations: allStations.size,
    unknownUnits,
    cheapest,
  };
}

/** 代表的な荷物ごとの比較表の行 */
export function compareLuggage(lockers) {
  return LUGGAGE.map((l) => {
    const r = searchByDims(lockers, l.dims);
    return {
      id: l.id,
      dims: l.dims,
      totalStations: r.totalStations,
      totalUnits: r.totalUnits,
      allStations: r.allStations,
      cheapest: r.cheapest,
    };
  });
}

/** 内寸が1つでも公開されている駅（「入らない」と言い切れるのはこの駅だけ） */
function stationsWithKnownDims(lockers) {
  const set = new Set();
  for (const l of lockers) {
    if ((l.sizes ?? []).some((s) => s.quantity > 0 && parseDimensions(s.dimensions))) set.add(l.station_slug);
  }
  return set;
}

/**
 * 荷物によって答えが変わる駅だけを取り出す。
 *   carryonOnly: 機内持ち込みは入るが、預け入れスーツケースは入らない駅
 *   noSuitcase: 内寸が分かっていて、機内持ち込みも入らない駅
 *   unknownOnly: 内寸が1つも公開されておらず判定できない駅の数
 */
export function differingStations(lockers) {
  const carry = new Map(searchByDims(lockers, LUGGAGE.find((l) => l.id === "carryon").dims).stations.map((s) => [s.slug, s]));
  const checked = new Set(searchByDims(lockers, LUGGAGE.find((l) => l.id === "checkedM").dims).stations.map((s) => s.slug));
  const known = stationsWithKnownDims(lockers);
  const all = new Set(lockers.map((l) => l.station_slug));

  const carryonOnly = [...carry.values()].filter((s) => !checked.has(s.slug));
  const noSuitcase = [...known].filter((slug) => !carry.has(slug)).sort();
  return { carryonOnly, noSuitcase, unknownOnly: [...all].filter((slug) => !known.has(slug)).length };
}

/** 都道府県ごとに、ロッカーのある駅のうちスーツケースが入る駅がいくつあるか */
export function prefectureSuitcaseTable(lockers) {
  const checked = new Set(searchByDims(lockers, LUGGAGE.find((l) => l.id === "checkedM").dims).stations.map((s) => s.slug));
  const carry = new Set(searchByDims(lockers, LUGGAGE.find((l) => l.id === "carryon").dims).stations.map((s) => s.slug));
  const byPref = new Map();
  for (const slug of new Set(lockers.map((l) => l.station_slug))) {
    const pref = prefectureForSlug(slug);
    if (!pref) continue;
    const row = byPref.get(pref) ?? { prefecture: pref, stations: 0, checked: 0, carryon: 0 };
    row.stations += 1;
    if (checked.has(slug)) row.checked += 1;
    if (carry.has(slug)) row.carryon += 1;
    byPref.set(pref, row);
  }
  return PREFECTURES.filter((p) => byPref.has(p)).map((p) => byPref.get(p));
}

/** 検索結果の駅を都道府県ごとにまとめる。都道府県の並びは PREFECTURES の順（北から） */
export function groupByPrefecture(stations) {
  const map = new Map();
  for (const s of stations) {
    const pref = prefectureForSlug(s.slug);
    if (!pref) continue;
    if (!map.has(pref)) map.set(pref, []);
    map.get(pref).push(s);
  }
  return PREFECTURES.filter((p) => map.has(p)).map((p) => ({ prefecture: p, stations: map.get(p) }));
}

/** 入力された寸法（文字列の配列）を cm の数値3つにする。不正なら null */
export function parseInputDims(values) {
  const nums = values.map((v) => Number(String(v).replace(/[^\d.]/g, "")));
  if (nums.length !== 3 || nums.some((n) => !Number.isFinite(n) || n <= 0 || n > 300)) return null;
  return nums;
}
