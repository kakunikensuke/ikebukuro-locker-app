// 解説記事（/guides）で使う集計。数値を本文に直書きすると、6時間ごとのデータ更新で
// すぐ嘘になるため、記事側は {{変数}} を書いてここで計算した値を差し込む。
// lockerSizes.js と同じく、プリレンダとクライアントの双方から使って結果がずれないようにする。
import { LOCKER_SIZES, sizeSummary } from "./lockerSizes.js";
import { LUGGAGE, fits, parseDimensions } from "./luggageFit.js";

// 改札の内外は住所文字列からしか判別できない（元データに区分のフィールドが無い）。
// マルチエキューブ由来のレコードは「改札内」「改札外」を必ず含むが、
// 私鉄各社のスクレイピング由来には入っていないものがあるので、その分はunknownに落ちる
export function gateCounts(lockers) {
  let inside = 0;
  let outside = 0;
  for (const l of lockers) {
    if (/改札内/.test(l.address)) inside++;
    else if (/改札外/.test(l.address)) outside++;
  }
  return { inside, outside, unknown: lockers.length - inside - outside, total: lockers.length };
}

// サイズごとの代表価格。平均ではなく最頻値を使う。
// 料金は事業者ごとに100円単位の離散値で、平均を取ると実在しない金額（例1,043円）になるため
export function priceModeBySize(lockers, sizeType) {
  const freq = new Map();
  for (const l of lockers) {
    for (const s of l.sizes) {
      if (s.size_type !== sizeType || !s.quantity) continue;
      freq.set(s.price, (freq.get(s.price) ?? 0) + 1);
    }
  }
  if (freq.size === 0) return null;
  let mode = null;
  let best = -1;
  for (const [price, count] of freq) {
    if (count > best) {
      best = count;
      mode = price;
    }
  }
  return mode;
}

// 「初電～終電」のように終日使える設置場所がどれだけあるか。
// 表記ゆれ（全角チルダ・多言語併記）があるので緩く判定する。
//
// **割合の分母は「営業時間が判明しているもの」にする。** 元データには「不明」が
// 121件あり（2026-08-23時点）、これを全体に含めて計算すると、残りがあたかも
// 「時間が限られている」かのように読めてしまう。改札内外の集計（gateCounts）が
// 判明分だけを分母にしているのと揃える
export function allDayShare(lockers) {
  const isUnknown = (l) => !l.business_hours || l.business_hours.trim() === "不明";
  const unknown = lockers.filter(isUnknown).length;
  const known = lockers.length - unknown;
  const allDay = lockers.filter((l) => /初電|始発/.test(l.business_hours ?? "")).length;
  return {
    allDay,
    unknown,
    known,
    limited: known - allDay,
    total: lockers.length,
    percent: Math.round((allDay / Math.max(known, 1)) * 100),
  };
}

// 設置箇所が多い駅の上位。記事から駅ページへの内部リンクにも使う
export function busiestStations(lockers, limit = 10) {
  const counts = new Map();
  for (const l of lockers) counts.set(l.station_slug, (counts.get(l.station_slug) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, count]) => ({ slug, count }));
}

// 指定サイズを設置している駅を、設置個数の多い順に返す
export function stationsBySizeQuantity(lockers, sizeType) {
  const counts = new Map();
  for (const l of lockers) {
    for (const s of l.sizes) {
      if (s.size_type !== sizeType || !s.quantity) continue;
      counts.set(l.station_slug, (counts.get(l.station_slug) ?? 0) + s.quantity);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([slug, quantity]) => ({ slug, quantity }));
}

// 内寸が公開されているLWの高さの幅（cm）。表記は "342〜355×575〜663×843〜1135mm" のように幅を持つので、
// 3辺目（高さ）の下限と上限をそれぞれ取る。LWは「Lより大きい」と思われがちだが、
// 実データでは高さ84cm台のもの（Lの86cmとほぼ同じ）もあるため、記事ではこの幅をそのまま示す
function lwHeightRange(lockers) {
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const l of lockers) {
    for (const s of l.sizes) {
      if (s.size_type !== "LW" || !s.quantity || !parseDimensions(s.dimensions)) continue;
      const text = String(s.dimensions).replace(/\s/g, "");
      const unit = /mm$/.test(text) ? 0.1 : 1;
      const heights = text.replace(/(mm|cm)$/, "").split(/[×x]/)[2].split(/[〜~]/).map(Number);
      min = Math.min(min, heights[0] * unit);
      max = Math.max(max, heights[heights.length - 1] * unit);
      count++;
    }
  }
  // 0件のまま「高さ0〜0cm」と書くより、ビルドを止めて記事を直す方がよい（fill() と同じ考え方）
  if (count === 0) throw new Error("内寸の分かるLWロッカーが無くなりました。large-lockers の記事を見直してください");
  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, count };
}

// 指定の荷物が入るロッカーが1台でもある駅の数。判定は駅ページと同じ内寸ベース（luggageFit.js）
function stationsFitting(lockers, luggageId) {
  const item = LUGGAGE.find((x) => x.id === luggageId).dims;
  const slugs = new Set();
  for (const l of lockers) {
    for (const s of l.sizes) {
      const d = s.quantity ? parseDimensions(s.dimensions) : null;
      if (d && fits(d, item)) slugs.add(l.station_slug);
    }
  }
  return slugs.size;
}

// 内寸の分かる台数のうち、預け入れサイズ（checkedM）が入る台数の割合（%）
function suitcaseUnitPercent(lockers) {
  const item = LUGGAGE.find((x) => x.id === "checkedM").dims;
  let units = 0;
  let fit = 0;
  for (const l of lockers) {
    for (const s of l.sizes) {
      const d = s.quantity ? parseDimensions(s.dimensions) : null;
      if (!d) continue;
      units += s.quantity;
      if (fits(d, item)) fit += s.quantity;
    }
  }
  return Math.round((fit / Math.max(units, 1)) * 100);
}

/**
 * 記事本文の {{変数}} に差し込む値をまとめて作る。
 * ここに無いキーを本文で使うとビルド時に例外になる（guides.js の fill() 参照）ので、
 * 記事を足すときは変数もここに足すこと。
 */
export function guideVars(lockers) {
  const gate = gateCounts(lockers);
  const allDay = allDayShare(lockers);
  const vars = {
    lockerCount: lockers.length,
    stationCount: new Set(lockers.map((l) => l.station_slug)).size,
    gateInside: gate.inside,
    gateOutside: gate.outside,
    gateKnown: gate.inside + gate.outside,
    allDayPercent: allDay.percent,
    hoursKnown: allDay.known,
    hoursUnknown: allDay.unknown,
    hoursLimited: allDay.limited,
  };

  for (const size of LOCKER_SIZES) {
    const summary = sizeSummary(lockers, size.sizeType);
    const key = size.slug.toUpperCase();
    vars[`price${key}`] = priceModeBySize(lockers, size.sizeType) ?? 0;
    vars[`stations${key}`] = summary.stationCount;
    vars[`lockers${key}`] = summary.lockerCount;
    vars[`minPrice${key}`] = summary.minPrice;
    vars[`maxPrice${key}`] = summary.maxPrice;
  }

  // 「1つ上のサイズにしても差はわずか」という記述の根拠。実データから引くので、
  // 料金改定があっても本文と食い違わない
  vars.sizeUpDiff = Math.max((vars.priceM ?? 0) - (vars.priceS ?? 0), 0);

  // large-lockers: LWの実際の高さと、LWを探さなくても大型スーツケースが入る駅の数
  const lw = lwHeightRange(lockers);
  vars.lwKnownCount = lw.count;
  vars.lwMinHeight = lw.min;
  vars.lwMaxHeight = lw.max;
  vars.suitcaseLStations = stationsFitting(lockers, "checkedL");

  // inside-or-outside-gate: 改札内でもスーツケースを預けられるか
  const inside = lockers.filter((l) => /改札内/.test(l.address));
  const outside = lockers.filter((l) => /改札外/.test(l.address));
  vars.insideStations = new Set(inside.map((l) => l.station_slug)).size;
  vars.insideSuitcaseStations = stationsFitting(inside, "checkedM");
  vars.insideSuitcasePercent = suitcaseUnitPercent(inside);
  vars.outsideSuitcasePercent = suitcaseUnitPercent(outside);

  // when-full: 同じ駅に設置場所がいくつあるか（「同じ駅の別の場所を見る」が使える駅の数）
  const sitesPerStation = new Map();
  for (const l of lockers) sitesPerStation.set(l.station_slug, (sitesPerStation.get(l.station_slug) ?? 0) + 1);
  const sites = [...sitesPerStation.values()];
  vars.multiSiteStations = sites.filter((n) => n >= 2).length;
  vars.bigSiteStations = sites.filter((n) => n >= 5).length;
  vars.singleSiteStations = sites.filter((n) => n === 1).length;
  vars.maxSites = Math.max(...sites);
  return vars;
}
