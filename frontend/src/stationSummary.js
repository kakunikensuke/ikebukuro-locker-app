// 駅ページの上部（要点とサイズ図）に出す値を計算する。
//
// **prerender.js（静的HTML）と StationPage.jsx（画面）の両方がこのファイルの関数を呼ぶこと。**
// Reactは#rootを丸ごと置き換えるので、片方だけに足すとクローラと画面で中身がずれる
// （駅前スコアはこれでAdSenseに2回落ちている）。
import { largestLuggage, doorHeight, parseDimensions } from "./luggageFit.js";

// 表示の並び順。物理サイズ（小さい順）→ 東京メトロの料金帯 → 細型
const SIZE_ORDER = ["SS", "S", "M", "L", "LW", "P300", "P500", "P600", "P900", "P1000", "SLIM"];
const LUGGAGE_ORDER = ["small", "backpack", "carryon", "checkedM", "checkedL"];
const SUITCASE = new Set(["checkedM", "checkedL"]);
const CARRYON_OR_MORE = new Set(["carryon", "checkedM", "checkedL"]);

/**
 * 駅のロッカーをサイズごとにまとめる。
 * 同じサイズ名でも事業者で内寸が違うことがある（Lが高さ86cmと50cm台）ので、
 * 高さと入る荷物は**小さい方**を採る。大きい方を採ると入らない所を「入る」と言ってしまう
 */
export function stationSizes(stationLockers) {
  const map = new Map();
  for (const l of stationLockers) {
    for (const s of l.sizes ?? []) {
      if (!(s.quantity > 0)) continue;
      const cur = map.get(s.size_type) ?? {
        sizeType: s.size_type,
        quantity: 0,
        minPrice: Infinity,
        height: null,
        luggage: undefined,
        dimensions: null,
      };
      cur.quantity += s.quantity;
      cur.minPrice = Math.min(cur.minPrice, s.price);
      const h = doorHeight(s.dimensions);
      const lug = largestLuggage(s.dimensions);
      if (h !== null && (cur.height === null || h < cur.height)) {
        cur.height = h;
        cur.dimensions = parseDimensions(s.dimensions);
      }
      // 内寸不明（null）が混ざったら、そのサイズの「入る荷物」は言い切らない
      if (cur.luggage === undefined) cur.luggage = lug;
      else if (cur.luggage !== null && (lug === null || LUGGAGE_ORDER.indexOf(lug) < LUGGAGE_ORDER.indexOf(cur.luggage)))
        cur.luggage = lug;
      map.set(s.size_type, cur);
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, luggage: r.luggage ?? null }))
    .sort((a, b) => SIZE_ORDER.indexOf(a.sizeType) - SIZE_ORDER.indexOf(b.sizeType));
}

/** 駅の要点。数字はすべて lockers.json から数える */
export function stationSummary(stationLockers) {
  const sizes = stationSizes(stationLockers);
  let inside = 0;
  let outside = 0;
  let allDay = 0;
  for (const l of stationLockers) {
    if (/改札内/.test(l.address)) inside++;
    else if (/改札外/.test(l.address)) outside++;
    if (/初電|始発/.test(l.business_hours ?? "")) allDay++;
  }
  const units = sizes.reduce((sum, r) => sum + r.quantity, 0);
  const cheapest = sizes.reduce((best, r) => (best === null || r.minPrice < best.minPrice ? r : best), null);
  const suitcaseUnits = sizes.filter((r) => SUITCASE.has(r.luggage)).reduce((s, r) => s + r.quantity, 0);
  const carryonUnits = sizes.filter((r) => CARRYON_OR_MORE.has(r.luggage)).reduce((s, r) => s + r.quantity, 0);

  return {
    facilities: stationLockers.length,
    units,
    minPrice: cheapest ? cheapest.minPrice : null,
    minPriceSize: cheapest ? cheapest.sizeType : null,
    suitcaseUnits,
    carryonUnits,
    inside,
    outside,
    allDay,
    sizes,
  };
}

/**
 * 表示用の文字列に組み立てる。t は (key, vars) => string。
 *
 * facts: 見出しの下に並べる要点 [{ label, value }]
 * doors: サイズ図の扉 [{ sizeType, name, count, price, height, luggage, luggageText }]
 * データが無い要点は出さない（「不明」で埋めない）
 */
export function stationSummaryItems(stationLockers, t) {
  const s = stationSummary(stationLockers);
  const facts = [];

  if (s.minPrice !== null) {
    facts.push({
      label: t("stationSummary.factPrice"),
      value: t("stationSummary.factPriceValue", {
        price: s.minPrice,
        size: t(`lockerDetail.sizeLabel${s.minPriceSize}`),
      }),
    });
  }
  // 入るかどうかは内寸で判定する。内寸が公開されていないサイズ（東京メトロの料金帯など）
  // しか無い駅で「入るサイズがありません」と断定しないこと。分からないものは分からないと書く
  const allUnknown = s.sizes.length > 0 && s.sizes.every((r) => r.luggage === null);
  facts.push({
    label: t("stationSummary.factSuitcase"),
    value:
      s.suitcaseUnits > 0
        ? t("stationSummary.factUnits", { count: s.suitcaseUnits })
        : s.carryonUnits > 0
          ? t("stationSummary.factCarryonOnly", { count: s.carryonUnits })
          : allUnknown
            ? t("stationSummary.factUnknown")
            : t("stationSummary.factNone"),
  });
  if (s.inside + s.outside > 0) {
    facts.push({
      label: t("stationSummary.factGate"),
      value: t("stationSummary.factGateValue", { inside: s.inside, outside: s.outside }),
    });
  }
  facts.push({
    label: t("stationSummary.factScale"),
    value: t("stationSummary.factScaleValue", { facilities: s.facilities, units: s.units, count: s.units }),
  });

  const doors = s.sizes.map((r) => ({
    sizeType: r.sizeType,
    name: t(`lockerDetail.sizeLabel${r.sizeType}`),
    count: t("stationSummary.doorCount", { count: r.quantity }),
    price: t("stationSummary.doorPrice", { price: r.minPrice }),
    height: r.height,
    heightText: r.height !== null ? t("stationSummary.doorHeight", { height: Math.round(r.height) }) : null,
    luggage: r.luggage,
    luggageText: t(`luggage.${r.luggage ?? "unknown"}`),
  }));

  return { summary: s, facts, doors };
}

/** ロッカー1か所に付ける「〇〇まで入る」の文言 */
export function lockerLuggageText(luggageId, t) {
  return t(`luggage.${luggageId ?? "unknown"}`);
}
