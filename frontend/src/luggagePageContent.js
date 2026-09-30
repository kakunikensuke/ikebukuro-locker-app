// 「荷物の大きさから探す」（/luggage）の読み物部分（比較表・違いが出る駅・都道府県の表・判定のしかた）。
//
// **画面（pages/LuggagePage.jsx）と静的HTML（scripts/prerender.js）はこの関数の戻り値を描くこと。**
// 寸法を入れて調べる道具だけは画面のみ（操作が要るため）。
import { LUGGAGE } from "./luggageFit.js";
import { compareLuggage, differingStations, formatDims, prefectureSuitcaseTable, searchByDims } from "./luggageSearch.js";
import { pathForStation, prefectureName, slugToName } from "./stations.js";

/**
 * @param {object[]} lockers 全国のロッカー
 * @param {string} lang
 * @param {(key: string, vars?: object) => string} t
 */
export function luggagePageContent(lockers, lang, t) {
  const stationLabel = (slug) => slugToName(slug, lang) ?? slug;

  const compare = {
    heading: t("luggagePage.compareHeading"),
    columns: [
      t("luggagePage.compareColItem"),
      t("luggagePage.compareColDims"),
      t("luggagePage.compareColStations"),
      t("luggagePage.compareColUnits"),
      t("luggagePage.compareColCheapest"),
    ],
    rows: compareLuggage(lockers).map((r) => [
      t(`luggageName.${r.id}`),
      `${formatDims(r.dims)}cm`,
      t("luggagePage.compareStations", { stations: r.totalStations, all: r.allStations }),
      t("luggagePage.compareUnits", { units: r.totalUnits.toLocaleString("en-US") }),
      r.cheapest ? t("luggagePage.compareCheapest", { price: r.cheapest.price, station: stationLabel(r.cheapest.slug) }) : "—",
    ]),
    note: t("luggagePage.compareNote"),
  };

  const diff = differingStations(lockers);
  const carryonOnly = {
    heading: t("luggagePage.carryonOnlyHeading"),
    lead: t("luggagePage.carryonOnlyLead", { count: diff.carryonOnly.length }),
    items: diff.carryonOnly.map((s) => ({
      href: pathForStation(lang, s.slug),
      label: t("luggagePage.stationItem", { station: stationLabel(s.slug), units: s.units, price: s.minPrice }),
    })),
  };
  const noSuitcase = {
    heading: t("luggagePage.noSuitcaseHeading"),
    lead: t("luggagePage.noSuitcaseLead", { count: diff.noSuitcase.length }),
    items: diff.noSuitcase.map((slug) => ({ href: pathForStation(lang, slug), label: stationLabel(slug) })),
    note: t("luggagePage.unknownNote", { count: diff.unknownOnly }),
  };

  const pref = {
    heading: t("luggagePage.prefHeading"),
    lead: t("luggagePage.prefLead"),
    columns: [
      t("luggagePage.prefColPref"),
      t("luggagePage.prefColStations"),
      t("luggagePage.prefColChecked"),
      t("luggagePage.prefColCarryon"),
    ],
    rows: prefectureSuitcaseTable(lockers).map((r) => [
      prefectureName(r.prefecture, lang),
      String(r.stations),
      String(r.checked),
      String(r.carryon),
    ]),
  };

  const rules = {
    heading: t("luggagePage.ruleHeading"),
    items: ["rule1", "rule2", "rule3", "rule4"].map((k) => t(`luggagePage.${k}`)),
  };

  // ページ全体の駅数（説明文用）
  const allStations = new Set(lockers.map((l) => l.station_slug)).size;
  return { compare, carryonOnly, noSuitcase, pref, rules, allStations };
}

/** 道具の初期値・プリセットに使う代表的な荷物 */
export function luggagePresets(t) {
  return LUGGAGE.map((l) => ({ id: l.id, dims: l.dims, label: t(`luggageName.${l.id}`) }));
}

/** 道具の検索結果を表示用に組み立てる */
export function luggageResult(lockers, dims, lang, t) {
  const r = searchByDims(lockers, dims);
  const stationLabel = (slug) => slugToName(slug, lang) ?? slug;
  return {
    total: r,
    summary:
      r.totalStations > 0
        ? t("luggagePage.resultSummary", {
            dims: formatDims(dims),
            stations: r.totalStations,
            units: r.totalUnits.toLocaleString("en-US"),
            count: r.totalStations,
          })
        : t("luggagePage.resultNone"),
    cheapest: r.cheapest
      ? t("luggagePage.resultCheapest", { station: stationLabel(r.cheapest.slug), price: r.cheapest.price })
      : null,
    unknown: r.unknownUnits > 0 ? t("luggagePage.resultUnknown", { units: r.unknownUnits.toLocaleString("en-US") }) : null,
    stations: r.stations,
  };
}
