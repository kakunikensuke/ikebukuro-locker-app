// 解説記事（/guides）で使う集計。数値を本文に直書きすると、6時間ごとのデータ更新で
// すぐ嘘になるため、記事側は {{変数}} を書いてここで計算した値を差し込む。
// lockerSizes.js と同じく、プリレンダとクライアントの双方から使って結果がずれないようにする。
import { LOCKER_SIZES, sizeSummary } from "./lockerSizes.js";

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
// 表記ゆれ（全角チルダ・多言語併記）があるので緩く判定する
export function allDayShare(lockers) {
  const allDay = lockers.filter((l) => /初電|始発/.test(l.business_hours ?? "")).length;
  return { allDay, total: lockers.length, percent: Math.round((allDay / Math.max(lockers.length, 1)) * 100) };
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
  return vars;
}
