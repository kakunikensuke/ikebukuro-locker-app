// トップページ（ランキング・このサイトについて）と空港駅のまとめ（/airports）の中身。
//
// **画面（AreasIndexPage.jsx / AirportsPage.jsx）と静的HTML（scripts/prerender.js）は
// ここの関数の戻り値を描くこと。** 片方だけに足すとクローラと画面で中身がずれる。
// 数字はすべて lockers.json から数える。
import { LUGGAGE, fits, parseDimensions } from "./luggageFit.js";
import { langPrefix, pathForStation, slugToName } from "./stations.js";
import { stationSummary } from "./stationSummary.js";

const CHECKED = LUGGAGE.find((l) => l.id === "checkedM").dims;

function groupByStation(lockers) {
  const map = new Map();
  for (const l of lockers) {
    if (!map.has(l.station_slug)) map.set(l.station_slug, []);
    map.get(l.station_slug).push(l);
  }
  return map;
}

/** 駅ごとの「預け入れスーツケースが入る台数」と「入るサイズの最安」 */
function suitcaseByStation(lockers) {
  const out = new Map();
  for (const l of lockers) {
    for (const s of l.sizes ?? []) {
      if (!(s.quantity > 0)) continue;
      const box = parseDimensions(s.dimensions);
      if (!box || !fits(box, CHECKED)) continue;
      const cur = out.get(l.station_slug) ?? { slug: l.station_slug, units: 0, minPrice: Infinity };
      cur.units += s.quantity;
      cur.minPrice = Math.min(cur.minPrice, s.price);
      out.set(l.station_slug, cur);
    }
  }
  return [...out.values()];
}

/**
 * トップページのランキング。
 *   mostSuitcase: 預け入れスーツケースが入る台数の多い駅
 *   cheapestSuitcase: 預け入れスーツケースを最も安く預けられる駅（同額なら台数の多い順）
 *   mostInside: 改札内の設置場所が多い駅（乗り換えの途中で預けられる）
 */
export function homeRankings(lockers, lang, t, limit = 10) {
  const suit = suitcaseByStation(lockers);
  const name = (slug) => slugToName(slug, lang) ?? slug;

  const mostSuitcase = [...suit]
    .sort((a, b) => b.units - a.units || a.slug.localeCompare(b.slug))
    .slice(0, limit)
    .map((s) => ({
      href: pathForStation(lang, s.slug),
      label: name(s.slug),
      value: t("home.rankUnits", { count: s.units, units: s.units.toLocaleString("en-US") }),
    }));

  const cheapestSuitcase = [...suit]
    .sort((a, b) => a.minPrice - b.minPrice || b.units - a.units || a.slug.localeCompare(b.slug))
    .slice(0, limit)
    .map((s) => ({
      href: pathForStation(lang, s.slug),
      label: name(s.slug),
      value: t("home.rankPrice", { price: s.minPrice }),
    }));

  const inside = new Map();
  for (const l of lockers) if (/改札内/.test(l.address)) inside.set(l.station_slug, (inside.get(l.station_slug) ?? 0) + 1);
  const mostInside = [...inside.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([slug, count]) => ({
      href: pathForStation(lang, slug),
      label: name(slug),
      value: t("home.rankInside", { count }),
    }));

  return [
    { id: "mostSuitcase", heading: t("home.rankSuitcaseHeading"), lead: t("home.rankSuitcaseLead"), items: mostSuitcase },
    { id: "cheapestSuitcase", heading: t("home.rankCheapHeading"), lead: t("home.rankCheapLead"), items: cheapestSuitcase },
    { id: "mostInside", heading: t("home.rankInsideHeading"), lead: t("home.rankInsideLead"), items: mostInside },
  ];
}

/** トップの「このサイトについて」。掲載規模の数字を入れる */
export function homeAbout(lockers, t) {
  const stations = new Set(lockers.map((l) => l.station_slug)).size;
  const units = lockers.reduce((sum, l) => sum + (l.sizes ?? []).reduce((s, x) => s + (x.quantity ?? 0), 0), 0);
  const withDims = lockers.filter((l) => (l.sizes ?? []).some((s) => parseDimensions(s.dimensions))).length;
  return [
    t("home.about1", { stations, facilities: lockers.length, units: units.toLocaleString("en-US") }),
    t("home.about2"),
    t("home.about3", { withDims, facilities: lockers.length }),
  ];
}

// ---- 空港駅のまとめ ------------------------------------------------------

// どの駅がどの空港か。駅データに空港の区分が無いので、ここで決める（編集上の分類）
export const AIRPORTS = [
  {
    id: "haneda",
    stations: [
      "tokyo-monorail-haneda-airport-terminal-1",
      "tokyo-monorail-haneda-airport-terminal-2",
      "tokyo-monorail-haneda-airport-terminal-3",
      "keikyu-hanedakukodai3taminaru",
    ],
  },
  { id: "kansai", stations: ["kansai-international-airport"] },
  { id: "itami", stations: ["osaka-international-airport"] },
  // 成田はロッカー情報を掲載できていない（成田空港駅・空港第2ビル駅とも0件）
  { id: "narita", stations: ["keisei-naritakuko", "keisei-kukodai2biru"] },
];

export function pathForAirports(lang) {
  return `${langPrefix(lang)}/airports`;
}

/**
 * 空港ごとのまとめ。駅ごとの要点は駅ページと同じ stationSummary() から出す
 */
export function airportContent(lockers, lang, t) {
  const by = groupByStation(lockers);
  const name = (slug) => slugToName(slug, lang) ?? slug;

  const airports = AIRPORTS.map((a) => {
    const stations = a.stations
      .filter((slug) => by.has(slug))
      .map((slug) => {
        const s = stationSummary(by.get(slug));
        const allUnknown = s.sizes.length > 0 && s.sizes.every((r) => r.luggage === null);
        return {
          href: pathForStation(lang, slug),
          label: name(slug),
          facts: [
            t("airports.stationUnits", { count: s.facilities, units: s.units.toLocaleString("en-US"), facilities: s.facilities }),
            s.suitcaseUnits > 0
              ? t("airports.stationSuitcase", { count: s.suitcaseUnits, units: s.suitcaseUnits })
              : allUnknown
                ? t("airports.stationUnknown")
                : t("airports.stationNoSuitcase"),
            s.minPrice !== null ? t("airports.stationPrice", { price: s.minPrice }) : null,
            // 空港駅は改札の内か外かで「乗る前に預けるか、出てから預けるか」が変わる
            s.inside + s.outside > 0
              ? t("airports.stationGate", { inside: s.inside, outside: s.outside })
              : null,
          ].filter(Boolean),
          units: s.units,
          suitcaseUnits: s.suitcaseUnits,
        };
      });

    const units = stations.reduce((sum, s) => sum + s.units, 0);
    const suitcaseUnits = stations.reduce((sum, s) => sum + s.suitcaseUnits, 0);
    return {
      id: a.id,
      heading: t(`airports.name_${a.id}`),
      summary:
        stations.length > 0
          ? t("airports.summary", { stations: stations.length, units: units.toLocaleString("en-US"), suitcase: suitcaseUnits.toLocaleString("en-US"), count: stations.length })
          : t("airports.noData"),
      stations,
    };
  });

  return {
    heading: t("airports.heading"),
    lead: t("airports.lead"),
    airports,
    // データで裏付けられないこと（到着ロビーの様子など）は書かない
    tips: [t("airports.tipHours")],
  };
}
