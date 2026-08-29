// 駅ページに載せる「その駅固有の解説」を実データから組み立てる。
//
// なぜ必要か: 2026-08-29にAdSenseが3度目の「有用性の低いコンテンツ」で不承認になった。
// 当時の駅ページはタイトル・件数・ロッカーの羅列・戻るリンクだけで、**独自の文章が一行も
// 無かった**（本文の中央値335字、932ページ中89%が600字未満）。ドメイン全体の
// インデックス対象の66%がこの状態で、サイト群全体の評価を下げていた。
//
// 方針:
// - **すべての文をデータから導く。** 駅が変われば数字と結論が変わるものだけを書く。
//   言い回しを変えただけのテンプレートは Google の "scaled content abuse" に当たる
//   （japan-proxy-cost が2026-08-27に256→126ページへ削った際の教訓）
// - データが無い項目は書かない。「不明」を「時間が限られている」と言い換えない
//   （lockerStats.js の allDayShare と同じ考え方）
// - 文面そのものは locales に置き、ここは「どのブロックをどの値で出すか」だけを決める。
//   prerender.js（ビルド時）と StationPage.jsx（ブラウザ）が同じ結果を描くための唯一の実装。
import { LOCKER_SIZES } from "./lockerSizes.js";
import { STATIONS, prefectureForSlug } from "./stations.js";

// スーツケースが入る目安のサイズ。利用者が最も知りたい情報なので独立して扱う
const SUITCASE_SIZES = ["L", "LW"];

function totalQuantity(locker) {
  return (locker.sizes ?? []).reduce((sum, s) => sum + (s.quantity ?? 0), 0);
}

// 表示の並び順。LOCKER_SIZES（内寸を持つ物理サイズ）を先に置き、そのあとに
// 東京メトロの料金帯（P300〜P1000）と細型を続ける。
//
// **LOCKER_SIZES だけを見てはいけない。** あちらは「サイズ別の横断ページを作る対象」の
// 定義で、内寸が公開されていない料金帯は意図的に外してある。しかし駅ページの内訳では
// 「500円ロッカーが11台」も利用者には必要な情報で、これを落とすと料金帯しか置いていない
// 36駅（2026-08-29時点）の解説が丸ごと空になる。
const EXTRA_SIZE_TYPES = ["P300", "P500", "P600", "P900", "P1000", "SLIM"];
const SIZE_ORDER = [...LOCKER_SIZES.map((s) => s.sizeType), ...EXTRA_SIZE_TYPES];

/** 駅内のサイズ別の設置台数と価格帯 */
export function sizeBreakdown(stationLockers) {
  const rows = [];
  for (const sizeType of SIZE_ORDER) {
    let quantity = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const l of stationLockers) {
      for (const s of l.sizes ?? []) {
        if (s.size_type !== sizeType || !(s.quantity > 0)) continue;
        quantity += s.quantity;
        min = Math.min(min, s.price);
        max = Math.max(max, s.price);
      }
    }
    if (quantity > 0) rows.push({ sizeType, quantity, minPrice: min, maxPrice: max });
  }
  return rows;
}

/** 改札の内外。lockers.json に区分のフィールドが無いため住所文字列から判定する */
export function gateSplit(stationLockers) {
  let inside = 0;
  let outside = 0;
  for (const l of stationLockers) {
    if (/改札内/.test(l.address)) inside++;
    else if (/改札外/.test(l.address)) outside++;
  }
  return { inside, outside, unknown: stationLockers.length - inside - outside };
}

/** 営業時間。「不明」と「時間が限られている」を混同しないこと */
export function hoursSplit(stationLockers) {
  let allDay = 0;
  let unknown = 0;
  for (const l of stationLockers) {
    const h = (l.business_hours ?? "").trim();
    if (!h || h === "不明") unknown++;
    else if (/初電|始発/.test(h)) allDay++;
  }
  return { allDay, unknown, limited: stationLockers.length - allDay - unknown };
}

/**
 * 全国の同サイズの代表価格（最頻値）。駅ごとの料金を「高い/安い/同水準」と
 * 言い切るための基準にする。平均だと実在しない金額になるので最頻値を使う。
 */
export function nationalModePrice(allLockers, sizeType) {
  const freq = new Map();
  for (const l of allLockers) {
    for (const s of l.sizes ?? []) {
      if (s.size_type !== sizeType || !(s.quantity > 0)) continue;
      freq.set(s.price, (freq.get(s.price) ?? 0) + 1);
    }
  }
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

/** 同じ都道府県で設置箇所が多い順に並べ、対象駅の位置と近い規模の駅を返す */
export function prefectureContext(allLockers, stationSlug) {
  const prefecture = prefectureForSlug(stationSlug);
  if (!prefecture) return null;

  const counts = new Map();
  for (const l of allLockers) {
    if (prefectureForSlug(l.station_slug) !== prefecture) continue;
    counts.set(l.station_slug, (counts.get(l.station_slug) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const index = ranked.findIndex(([slug]) => slug === stationSlug);
  if (index < 0) return null;

  // 「他にどこを見ればいいか」の導線。同県で設置数が多い駅を、自駅を除いて上位3つ
  const alternatives = ranked
    .filter(([slug]) => slug !== stationSlug)
    .slice(0, 3)
    .map(([slug, count]) => ({ slug, count, name: STATIONS.find((s) => s.slug === slug)?.name }))
    .filter((a) => a.name);

  return { prefecture, rank: index + 1, total: ranked.length, alternatives };
}

/**
 * 駅ページ用の解説ブロックを組み立てる。
 *
 * 返すのは { key, vars } の配列で、文面は locales の stationInsight.* に置く。
 * **データが無い項目はブロックごと返さない。** 空欄を埋めるための文を作らないこと。
 *
 * @param {object[]} stationLockers その駅のロッカー（絞り込み前の全件）
 * @param {object[]} allLockers 全国のロッカー（比較の基準に使う）
 * @param {string} stationSlug
 */
export function stationInsightBlocks(stationLockers, allLockers, stationSlug) {
  if (!stationLockers.length) return [];

  const blocks = [];
  const facilities = stationLockers.length;
  const units = stationLockers.reduce((sum, l) => sum + totalQuantity(l), 0);
  const sizes = sizeBreakdown(stationLockers);

  // 1. 規模。台数まで出すと「箇所数」だけの表示より実態が分かる
  const suitcase = sizes
    .filter((r) => SUITCASE_SIZES.includes(r.sizeType))
    .reduce((sum, r) => sum + r.quantity, 0);
  // count は t() が英語の単複（`_one` / `_other`）を選ぶために必要。
  // 日本語側は単複の区別が無いのでサフィックス無しのキーにフォールバックする
  blocks.push({
    key: suitcase > 0 ? "stationInsight.scaleWithSuitcase" : "stationInsight.scaleNoSuitcase",
    vars: { facilities, units, suitcase, count: facilities },
  });

  // 2. サイズ別の内訳。表にせず文章にするのは、1サイズしか無い駅が多いため
  if (sizes.length) {
    blocks.push({
      key: "stationInsight.sizes",
      vars: {
        list: sizes.map((r) => ({ sizeType: r.sizeType, quantity: r.quantity, minPrice: r.minPrice })),
      },
      list: true,
    });
  }

  // 3. 料金。全国の最頻値と比べて高い/安い/同水準を言い切る
  const cheapest = sizes.reduce((min, r) => (r.minPrice < min ? r.minPrice : min), Infinity);
  const cheapestRow = sizes.find((r) => r.minPrice === cheapest);
  if (cheapestRow) {
    const national = nationalModePrice(allLockers, cheapestRow.sizeType);
    if (national) {
      const diff = cheapest - national;
      const key =
        diff <= -100
          ? "stationInsight.priceCheaper"
          : diff >= 100
            ? "stationInsight.pricePricier"
            : "stationInsight.priceSame";
      blocks.push({
        key,
        vars: { price: cheapest, sizeType: cheapestRow.sizeType, national, diff: Math.abs(diff) },
      });
    }
  }

  // 4. 改札の内外。乗り換えの途中で預けられるかどうかに直結する
  const gate = gateSplit(stationLockers);
  if (gate.inside + gate.outside > 0) {
    const key =
      gate.inside === 0
        ? "stationInsight.gateOutsideOnly"
        : gate.outside === 0
          ? "stationInsight.gateInsideOnly"
          : "stationInsight.gateBoth";
    blocks.push({
      key,
      vars: { inside: gate.inside, outside: gate.outside, count: gate.inside || gate.outside },
    });
  }

  // 5. 営業時間。全件が初電〜終電のときだけ言い切り、不明が混ざるならそう書く
  const hours = hoursSplit(stationLockers);
  if (hours.allDay === facilities) {
    blocks.push({ key: "stationInsight.hoursAllDay", vars: { facilities, count: facilities } });
  } else if (hours.allDay > 0) {
    blocks.push({
      key: "stationInsight.hoursMixed",
      vars: {
        allDay: hours.allDay,
        facilities,
        unknown: hours.unknown,
        limited: hours.limited,
        count: facilities,
      },
    });
  }

  // 6. 同じ都道府県での位置づけと、代わりに見るべき駅
  const context = prefectureContext(allLockers, stationSlug);
  if (context && context.total > 1) {
    blocks.push({
      key: "stationInsight.prefectureRank",
      vars: { rank: context.rank, total: context.total },
      prefecture: context.prefecture,
    });
    if (context.alternatives.length) {
      blocks.push({
        key: "stationInsight.alternatives",
        prefecture: context.prefecture,
        alternatives: context.alternatives,
      });
    }
  }

  return blocks;
}

/**
 * 都道府県ページ用の解説ブロック。
 *
 * 駅ページと同じ考え方で、県が変われば数字と結論が変わるものだけを書く。
 * 2026-08-29時点でこのページ群は本文の中央値が232字しかなく、サイト内で最も薄かった。
 *
 * @param {object[]} prefectureLockers その県のロッカー
 * @param {object[]} allLockers 全国のロッカー（全国順位の算出に使う）
 * @param {string} prefecture
 */
export function prefectureInsightBlocks(prefectureLockers, allLockers, prefecture) {
  if (!prefectureLockers.length) return [];

  const blocks = [];
  const stations = new Set(prefectureLockers.map((l) => l.station_slug));
  const facilities = prefectureLockers.length;
  const units = prefectureLockers.reduce((sum, l) => sum + totalQuantity(l), 0);
  const sizes = sizeBreakdown(prefectureLockers);

  // 1. 規模。全国に占める割合まで出すと、その県の位置づけが分かる
  const nationalFacilities = allLockers.length;
  blocks.push({
    key: "prefectureInsight.scale",
    vars: {
      stations: stations.size,
      facilities,
      units,
      share: Math.max(1, Math.round((facilities / nationalFacilities) * 100)),
    },
  });

  // 2. スーツケースが入る駅がどれだけあるか。これが県ページで最も知りたい情報
  const suitcaseStations = new Set(
    prefectureLockers
      .filter((l) => (l.sizes ?? []).some((s) => SUITCASE_SIZES.includes(s.size_type) && s.quantity > 0))
      .map((l) => l.station_slug)
  );
  blocks.push({
    key: suitcaseStations.size ? "prefectureInsight.suitcase" : "prefectureInsight.suitcaseNone",
    vars: { suitcaseStations: suitcaseStations.size, stations: stations.size, count: suitcaseStations.size },
  });

  // 3. サイズ別の総台数
  if (sizes.length) {
    blocks.push({
      key: "prefectureInsight.sizes",
      vars: { list: sizes.map((r) => ({ sizeType: r.sizeType, quantity: r.quantity, minPrice: r.minPrice })) },
      list: true,
    });
  }

  // 4. 料金の幅。県内で選ぶ余地があるかどうかを示す
  const prices = prefectureLockers.flatMap((l) => (l.sizes ?? []).filter((s) => s.quantity > 0).map((s) => s.price));
  if (prices.length) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    blocks.push({
      key: min === max ? "prefectureInsight.priceFlat" : "prefectureInsight.priceRange",
      vars: { min, max },
    });
  }

  // 5. 設置箇所が多い駅。県ページから駅ページへの導線でもある
  const counts = new Map();
  for (const l of prefectureLockers) counts.set(l.station_slug, (counts.get(l.station_slug) ?? 0) + 1);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([slug, count]) => ({ slug, count, name: STATIONS.find((s) => s.slug === slug)?.name }))
    .filter((x) => x.name);
  if (top.length > 1) {
    blocks.push({ key: "prefectureInsight.busiest", alternatives: top, prefecture });
  }

  return blocks;
}
