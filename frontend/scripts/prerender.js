// dist配下の各ルートに静的HTMLを生成するビルド後スクリプト（`npm run build`のpostbuildフックから実行）
//
// なぜ必要か:
// このアプリはCSRのSPAで、react-helmet-asyncによるtitle/meta設定はブラウザでJSが
// 実行されて初めて反映される。GooglebotはJSを実行するが、それは通常のクロールとは
// 別キューで後回しに処理されるため、評価の無い新規ドメインでは全ページが
// 「同一タイトル・空の本文」のまま扱われてしまう（2026-08-01時点で実際にそうなっていた）。
// そこでビルド時にlockers.jsonから、ルートごとのtitle/description/canonical/hreflang/
// 構造化データと、本文テキスト（見出し・ロッカー一覧・内部リンク）を埋め込んだHTMLを出力する。
//
// ReactはcreateRootで#rootの中身を丸ごと置き換えるため（hydrateRootではない）、
// ここで埋め込んだ本文はマウント時に破棄される。hydration mismatchは発生しない。
//
// title/descriptionの文言は各ページのHelmetと同じ翻訳キーから引くこと。
// 文言を変える場合はlocales側を直せば双方に反映される。
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  STATIONS,
  PREFECTURES,
  stationsInPrefecture,
  prefectureName,
  prefectureForSlug,
  pathForStation,
  pathForLocker,
  pathForPrefecture,
  pathForPrefectureList,
} from "../src/stations.js";
import { LOCKER_SIZES, sizeSummary, pathForSize, pathForSizeList } from "../src/lockerSizes.js";
import { translateBusinessHours } from "../src/i18n/businessHours.js";
import ja from "../src/locales/ja.json" with { type: "json" };
import en from "../src/locales/en.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.VITE_SITE_URL || "https://example.com";
const DIST = path.join(__dirname, "..", "dist");
const LOCKERS_PATH = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const USER_SUBMITTED_PATH = path.join(__dirname, "..", "..", "backend", "data", "user-submitted-lockers.json");
const LANGS = ["ja", "en"];

const lockers = JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));
const userSubmittedLockers = fs.existsSync(USER_SUBMITTED_PATH)
  ? JSON.parse(fs.readFileSync(USER_SUBMITTED_PATH, "utf-8"))
  : [];
// 駅ページの件数表示・noindex判定は投稿分も含めた全ロッカーで行う（StationPageの挙動と揃える）
const allLockers = [...lockers, ...userSubmittedLockers];

const lockersByStation = new Map();
for (const locker of allLockers) {
  if (!lockersByStation.has(locker.station_slug)) lockersByStation.set(locker.station_slug, []);
  lockersByStation.get(locker.station_slug).push(locker);
}

const TEMPLATE_PATH = path.join(DIST, "index.html");
if (!fs.existsSync(TEMPLATE_PATH)) {
  throw new Error(`dist/index.html がありません。先に vite build を実行してください: ${TEMPLATE_PATH}`);
}
const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, "utf-8");

// --- 翻訳 -------------------------------------------------------------------

const LOCALES = { ja, en };

function t(lang, key, vars = {}) {
  // countを渡した場合はi18nextと同じく `_one` / `_other` 付きのキーを優先し、
  // 無ければサフィックス無しのキーにフォールバックする。英語だけ単複を区別したいが、
  // 日本語は区別が無くサフィックス無しのキーしか持たないため、この順序で両対応になる
  const candidates =
    typeof vars.count === "number" ? [`${key}_${vars.count === 1 ? "one" : "other"}`, key] : [key];

  for (const candidate of candidates) {
    const raw = candidate.split(".").reduce((obj, k) => (obj == null ? undefined : obj[k]), LOCALES[lang]);
    if (typeof raw === "string") {
      return raw.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ""));
    }
  }
  throw new Error(`翻訳キーが見つかりません: ${lang}.${key}`);
}

// --- HTML組み立て -----------------------------------------------------------

function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function metaTags({ lang, title, description, canonicalPath, altJa, altEn, noindex, ogType, jsonLd }) {
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${esc(SITE_URL + canonicalPath)}" />`,
    `<link rel="canonical" href="${esc(SITE_URL + canonicalPath)}" />`,
    `<link rel="alternate" hreflang="ja" href="${esc(SITE_URL + altJa)}" />`,
    `<link rel="alternate" hreflang="en" href="${esc(SITE_URL + altEn)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${esc(SITE_URL + altJa)}" />`,
  ];
  if (noindex) tags.push(`<meta name="robots" content="noindex" />`);
  if (jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
  return tags.map((tag) => `    ${tag}`).join("\n");
}

function link(href, text) {
  return `<a href="${esc(href)}">${esc(text)}</a>`;
}

function renderPage(page) {
  let html = TEMPLATE;
  // テンプレート（index.html）が持つ既定のtitle/descriptionは、ページ固有のものに差し替える
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${page.lang}">`);
  html = html.replace(/\s*<title>[\s\S]*?<\/title>/, "");
  html = html.replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, "");
  html = html.replace("</head>", `${metaTags(page)}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${page.body}</div>`);
  return html;
}

// 出力先は `<パス>.html`（`<パス>/index.html` ではない）。
// Cloudflare Workers静的アセットの既定（html_handling = "auto-trailing-slash"）では、
// 中身が `/ikebukuro/index.html` だと `/ikebukuro` へのリクエストが `/ikebukuro/` へ
// 307リダイレクトされてしまい、sitemap/canonicalが指すスラッシュなしURLと食い違う。
// `/ikebukuro.html` に置けばリダイレクトなしで200が返る。
// `/ikebukuro.html`（ファイル）と `/ikebukuro/`（配下のロッカー詳細用ディレクトリ）は共存できる。
// filePathは出力先だけを変えたい場合に指定する（canonicalは別URLを指したままにする）。
// 未指定ならcanonicalPathと同じ場所に出す。
function writePage(page) {
  const routePath = page.filePath ?? page.canonicalPath;
  const outPath =
    routePath === "/"
      ? path.join(DIST, "index.html")
      : path.join(DIST, `${routePath.replace(/^\//, "")}.html`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderPage(page));
}

// --- 各ルートの本文 ---------------------------------------------------------

// トップ（都道府県一覧）。JSなしのクローラに全都道府県ページへの導線を渡す
function topPage(lang) {
  const stationCount = STATIONS.filter((s) => lockersByStation.has(s.slug)).length;
  const description = t(lang, "areasPage.description", { count: stationCount });
  const items = PREFECTURES.map((pref) => {
    const count = stationsInPrefecture(pref).filter((s) => lockersByStation.has(s.slug)).length;
    const label = t(lang, "areasPage.prefectureStationCount", { count });
    return `<li>${link(pathForPrefecture(lang, pref), prefectureName(pref, lang))}（${esc(label)}）</li>`;
  }).join("");

  return {
    lang,
    title: t(lang, "areasPage.titleTag"),
    description,
    canonicalPath: pathForPrefectureList(lang),
    altJa: pathForPrefectureList("ja"),
    altEn: pathForPrefectureList("en"),
    ogType: "website",
    body: `<main><h1>${esc(t(lang, "areasPage.ogTitle"))}</h1><p>${esc(description)}</p><h2>${esc(
      t(lang, "areasPage.heading")
    )}</h2><ul>${items}</ul></main>`,
  };
}

// 都道府県ページ。配下の駅ページへの導線になる
function prefecturePage(lang, prefecture) {
  const label = prefectureName(prefecture, lang);
  const stations = stationsInPrefecture(prefecture);
  const withLockers = stations.filter((s) => lockersByStation.has(s.slug));
  const description = t(lang, "prefecturePage.description", { count: withLockers.length });
  const items = stations
    .map((station) => {
      const count = lockersByStation.get(station.slug)?.length ?? 0;
      const countLabel = t(lang, "prefecturePage.stationLockerCount", { count });
      return `<li>${link(pathForStation(lang, station.slug), station.name[lang] || station.name.ja)}（${esc(
        countLabel
      )}）</li>`;
    })
    .join("");

  return {
    lang,
    title: t(lang, "prefecturePage.titleTag", { prefecture: label }),
    description,
    canonicalPath: pathForPrefecture(lang, prefecture),
    altJa: pathForPrefecture("ja", prefecture),
    altEn: pathForPrefecture("en", prefecture),
    ogType: "website",
    body: `<main><h1>${esc(t(lang, "prefecturePage.ogTitle", { prefecture: label }))}</h1><p>${esc(
      description
    )}</p><h2>${esc(t(lang, "prefecturePage.heading", { prefecture: label }))}</h2><ul>${items}</ul><p>${link(
      pathForPrefectureList(lang),
      t(lang, "prefecturePage.backToAreas")
    )}</p></main>`,
  };
}

// 駅ページ。ロッカー0件の駅はStationPage側と同じくnoindexにする
// （sitemapには載っていないが都道府県ページからは全駅リンクされているため、
//   ここでnoindexを出しておかないと空ページが重複コンテンツとして拾われうる）
function stationPage(lang, station) {
  const stationLockers = lockersByStation.get(station.slug) ?? [];
  const stationName = station.name[lang] || station.name.ja;
  const hasLockers = stationLockers.length > 0;
  const description = hasLockers
    ? t(lang, "stationPage.descriptionLoaded", { station: stationName, count: stationLockers.length })
    : t(lang, "stationPage.descriptionLoading", { station: stationName });

  const items = stationLockers
    .map((locker) => {
      const hours = translateBusinessHours(locker.business_hours, (key, vars) => t(lang, key, vars));
      const sizes = (locker.sizes ?? [])
        .map((s) => (lang === "en" ? `${s.size_type} ¥${s.price}` : `${s.size_type} ${s.price}円`))
        .join(" / ");
      const detail = [locker.address, hours, sizes].filter(Boolean).map(esc).join(" ／ ");
      return `<li>${link(
        pathForLocker(lang, station.slug, locker.facility_id),
        locker.name
      )}<br />${detail}</li>`;
    })
    .join("");

  const prefecture = prefectureForSlug(station.slug);
  const backLink = prefecture
    ? `<p>${link(
        pathForPrefecture(lang, prefecture),
        t(lang, "stationPage.otherStationsInPrefecture", { prefecture: prefectureName(prefecture, lang) })
      )}</p>`
    : "";

  const listOrNotice = hasLockers
    ? `<p>${esc(t(lang, "stationPage.resultCount", { count: stationLockers.length }))}</p><ul>${items}</ul>`
    : `<p>${esc(t(lang, "stationPage.noLockersYet"))}</p>`;

  return {
    lang,
    // ロッカー件数をtitleに入れる（2026-08-08）。「〇〇駅 コインロッカー 料金／サイズ」等の
    // 実際の検索クエリに寄せる狙い。件数が無い駅は「0箇所」と出すと不自然なので別文言にする
    title: hasLockers
      ? t(lang, "stationPage.titleTag", { station: stationName, count: stationLockers.length })
      : t(lang, "stationPage.titleTagNoData", { station: stationName }),
    description,
    canonicalPath: pathForStation(lang, station.slug),
    altJa: pathForStation("ja", station.slug),
    altEn: pathForStation("en", station.slug),
    ogType: "website",
    noindex: !hasLockers,
    body: `<main><h1>${esc(
      t(lang, "stationPage.ogTitle", { station: stationName })
    )}</h1><p>${esc(description)}</p>${listOrNotice}${backLink}</main>`,
  };
}

// サイズ別一覧のハブ（/sizes）。SizesIndexPageと同じ翻訳キー・同じ集計を使う
function sizesIndexPage(lang) {
  const cards = LOCKER_SIZES.map((size) => {
    const summary = sizeSummary(allLockers, size.sizeType);
    const note = summary.dimensions
      ? ` ${esc(t(lang, "sizesPage.sizeCardDimensions", { dimensions: summary.dimensions }))}`
      : "";
    return `<li>${link(pathForSize(lang, size.slug), t(lang, `sizePage.sizeName${size.sizeType}`))} ${esc(
      t(lang, "sizesPage.sizeCardSummary", {
        stationCount: summary.stationCount,
        lockerCount: summary.lockerCount,
      })
    )}${note}</li>`;
  }).join("");

  return {
    lang,
    title: t(lang, "sizesPage.titleTag"),
    description: t(lang, "sizesPage.description"),
    canonicalPath: pathForSizeList(lang),
    altJa: pathForSizeList("ja"),
    altEn: pathForSizeList("en"),
    ogType: "website",
    body: `<main><h1>${esc(t(lang, "sizesPage.heading"))}</h1><p>${esc(
      t(lang, "sizesPage.lead")
    )}</p><ul>${cards}</ul><p>${link(
      pathForPrefectureList(lang),
      t(lang, "prefecturePage.backToAreas")
    )}</p></main>`,
  };
}

// サイズ別の駅一覧（/sizes/:sizeSlug）。SizePageと同じく都道府県ごとにまとめる。
// 駅ページへの内部リンクを大量に張るため、クロールを駅ページへ流す導線にもなっている
function sizePage(lang, size) {
  const summary = sizeSummary(allLockers, size.sizeType);
  const sizeName = t(lang, `sizePage.sizeName${size.sizeType}`);
  const vars = {
    size: sizeName,
    dimensions: summary.dimensions,
    stationCount: summary.stationCount,
    lockerCount: summary.lockerCount,
    minPrice: summary.minPrice,
    maxPrice: summary.maxPrice,
  };

  const groups = PREFECTURES.map((prefecture) => {
    const stations = [...summary.byStation.values()]
      .filter((entry) => prefectureForSlug(entry.slug) === prefecture)
      .sort((a, b) => b.lockerCount - a.lockerCount);
    return { prefecture, stations };
  }).filter((group) => group.stations.length > 0);

  const sections = groups
    .map(({ prefecture, stations }) => {
      const items = stations
        .map((entry) => {
          const station = stationBySlug.get(entry.slug);
          const name = station ? station.name[lang] || station.name.ja : entry.slug;
          return `<li>${link(pathForStation(lang, entry.slug), name)} ${esc(
            t(lang, "sizePage.stationLockerCount", { count: entry.lockerCount })
          )}</li>`;
        })
        .join("");
      return `<h2>${esc(prefectureName(prefecture, lang))}</h2><ul>${items}</ul>`;
    })
    .join("");

  return {
    lang,
    title: t(lang, "sizePage.titleTag", { size: sizeName, count: summary.stationCount }),
    description: t(lang, "sizePage.description", vars),
    canonicalPath: pathForSize(lang, size.slug),
    altJa: pathForSize("ja", size.slug),
    altEn: pathForSize("en", size.slug),
    ogType: "website",
    body: `<main><h1>${esc(t(lang, "sizePage.heading", { size: sizeName }))}</h1><p>${esc(
      t(lang, "sizePage.summary", vars)
    )}</p>${sections}<p>${link(pathForSizeList(lang), t(lang, "sizePage.backToSizes"))}</p></main>`,
  };
}

// ロッカー詳細。LockerDetailMetaと同じくschema.org LocalBusinessの構造化データを出す。
// 2026-08-08: 全ページnoindex化。ロッカー名（「改札外 コインロッカー」等）は駅をまたいで
// 大量に重複しており（796件中ユニークは237件、最多の名前は204件が同名）、titleに駅名も入らないため
// 検索クエリにマッチせず重複コンテンツ判定を招いていた。sitemapからも除外している
// （generate-sitemap.js側）。中身は駅ページから辿れるのでユーザー体験には影響しない。
function lockerPage(lang, locker, station) {
  const hours = translateBusinessHours(locker.business_hours, (key, vars) => t(lang, key, vars));
  const sizes = locker.sizes ?? [];
  const description =
    sizes.length > 0
      ? t(lang, "lockerDetail.metaDescription", {
          address: locker.address,
          price: Math.min(...sizes.map((s) => s.price)),
          hours,
        })
      : t(lang, "lockerDetail.metaDescriptionNoPrice", { address: locker.address, hours });

  const canonicalPath = pathForLocker(lang, station.slug, locker.facility_id);
  const sizeRows = sizes
    .map(
      (s) =>
        `<tr><td>${esc(s.size_type)}</td><td>${esc(s.price)}</td><td>${esc(s.quantity ?? "")}</td><td>${esc(
          s.dimensions ?? ""
        )}</td></tr>`
    )
    .join("");
  const sizeTable =
    sizes.length > 0
      ? `<table><thead><tr><th>${esc(t(lang, "lockerDetail.sizeHeader"))}</th><th>${esc(
          t(lang, "lockerDetail.priceHeader")
        )}</th><th>${esc(t(lang, "lockerDetail.quantityHeader"))}</th><th>${esc(
          t(lang, "lockerDetail.dimensionsHeader")
        )}</th></tr></thead><tbody>${sizeRows}</tbody></table>`
      : `<p>${esc(t(lang, "lockerDetail.sizeInfoUnknown"))}</p>`;

  return {
    lang,
    title: t(lang, "lockerDetail.metaTitle", { name: locker.name }),
    description,
    canonicalPath,
    altJa: pathForLocker("ja", station.slug, locker.facility_id),
    altEn: pathForLocker("en", station.slug, locker.facility_id),
    noindex: true,
    ogType: "place",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: locker.name,
      address: { "@type": "PostalAddress", streetAddress: locker.address },
      geo: { "@type": "GeoCoordinates", latitude: locker.latitude, longitude: locker.longitude },
      url: `${SITE_URL}${canonicalPath}`,
    },
    body: `<main><h1>${esc(locker.name)}</h1><p>${esc(locker.address)}</p><p>${esc(
      t(lang, "lockerDetail.hours", { hours })
    )}</p>${sizeTable}<p>${link(
      pathForStation(lang, station.slug),
      t(lang, "stationPage.ogTitle", { station: station.name[lang] || station.name.ja })
    )}</p></main>`,
  };
}

// --- 生成 -------------------------------------------------------------------

const stationBySlug = new Map(STATIONS.map((s) => [s.slug, s]));
let count = 0;

for (const lang of LANGS) {
  const top = topPage(lang);
  writePage(top);
  count++;

  // /areas と /en/areas もAreasIndexPageを表示するルート（sitemapには載せていないが
  // 直接アクセスされうる）。中身はトップと同一なので、canonicalはトップに向けて
  // 重複コンテンツにならないようにする。
  writePage({ ...top, filePath: `${lang === "en" ? "/en" : ""}/areas` });
  count++;

  for (const prefecture of PREFECTURES) {
    writePage(prefecturePage(lang, prefecture));
    count++;
  }

  writePage(sizesIndexPage(lang));
  count++;

  for (const size of LOCKER_SIZES) {
    writePage(sizePage(lang, size));
    count++;
  }

  for (const station of STATIONS) {
    writePage(stationPage(lang, station));
    count++;
  }

  for (const locker of allLockers) {
    const station = stationBySlug.get(locker.station_slug);
    if (!station) continue;
    writePage(lockerPage(lang, locker, station));
    count++;
  }
}

console.log(`静的HTMLを生成しました（${count}ページ、SITE_URL=${SITE_URL}）: ${DIST}`);
