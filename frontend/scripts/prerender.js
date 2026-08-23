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
  slugToName,
} from "../src/stations.js";
import { LOCKER_SIZES, sizeSummary, pathForSize, pathForSizeList } from "../src/lockerSizes.js";
import {
  CONTACT_FORM_ENDPOINT,
  CONTACT_FORM_FIELDS,
  OPERATOR_NAME,
  contactFormHidden,
  hasContactForm,
  pathForContactReceived,
  pathForGuide,
  pathForGuideList,
  pathForPrivacy,
} from "../src/staticPages.js";
import { GUIDES } from "../src/content/guides.js";
import {
  GUIDE_DATA_ELEMENT_ID,
  fill,
  guideData,
  sizeTableRows,
  stationListRows,
} from "../src/guideRender.js";
import {
  hasJapanese,
  lockerDisplayAddress,
  lockerDisplayName,
  translateBusinessHours,
} from "../src/i18n/lockerText.js";
import ja from "../src/locales/ja.json" with { type: "json" };
import en from "../src/locales/en.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.VITE_SITE_URL || "https://example.com";
const DIST = path.join(__dirname, "..", "dist");
const LOCKERS_PATH = path.join(__dirname, "..", "..", "backend", "data", "lockers.json");
const LANGS = ["ja", "en"];

// 2026-08-15に利用者投稿を廃止したため、ロッカーは自動取得データのみ
const lockers = JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));

const lockersByStation = new Map();
for (const locker of lockers) {
  if (!lockersByStation.has(locker.station_slug)) lockersByStation.set(locker.station_slug, []);
  lockersByStation.get(locker.station_slug).push(locker);
}

const TEMPLATE_PATH = path.join(DIST, "index.html");
if (!fs.existsSync(TEMPLATE_PATH)) {
  throw new Error(`dist/index.html がありません。先に vite build を実行してください: ${TEMPLATE_PATH}`);
}
const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, "utf-8");
// dist/index.html はテンプレートであると同時に、このスクリプトが日本語トップページを
// 書き出す先でもある。vite build を挟まずに2回流すと、前回の本文が入ったHTMLを
// テンプレートとして読んでしまい、全ページに日本語トップの内容が焼き付く。
// （`npm run build` は毎回 vite build → prerender の順なので通常は起きない）
if (!TEMPLATE.includes('<div id="root"></div>')) {
  throw new Error(
    "dist/index.html が既にプリレンダ済みです（#rootが空でない）。テンプレートとして使えません。\n" +
      "  `npm run build`（vite build → prerender）を実行してください。"
  );
}

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

// 全ページ共通のフッター（クライアント側のSiteFooter.jsxと同じ内容）。
// これが無いと、JSを実行しないクロールでは/privacyへの内部リンクがどこにも存在せず、
// sitemap経由でしか到達できなくなる
function footerHtml(lang) {
  return `<footer>${link(pathForPrivacy(lang), t(lang, "privacyPage.footerLink"))}</footer>`;
}

function renderPage(page) {
  let html = TEMPLATE;
  // テンプレート（index.html）が持つ既定のtitle/descriptionは、ページ固有のものに差し替える
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${page.lang}">`);
  html = html.replace(/\s*<title>[\s\S]*?<\/title>/, "");
  html = html.replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, "");
  // テンプレートは dist/index.html＝プリレンダ自身の出力先でもある。vite build を挟まずに
  // このスクリプトを2回流すと、前回書き込んだ日本語トップページのog/canonicalを引き継いだまま
  // 全ページを生成してしまう（og:titleが2つ並び、先勝ちで日本語が採用される）。
  // 生成物が実行回数に依存しないよう、ここで前回分を必ず取り除く
  html = html.replace(/\s*<meta\s+property="og:[^"]*"[^>]*\/>/g, "");
  html = html.replace(/\s*<meta\s+name="robots"[^>]*\/>/g, "");
  html = html.replace(/\s*<link\s+rel="canonical"[^>]*\/>/g, "");
  html = html.replace(/\s*<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*\/>/g, "");
  html = html.replace(/\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  html = html.replace("</head>", `${metaTags(page)}\n  </head>`);
  // 集計値は #root の外に置く。Reactはマウント時に#rootの中身を丸ごと捨てるため、
  // 中に入れるとクライアント側から読めなくなる（guideRender.js の readEmbeddedGuideData）
  const embedded = page.embeddedData
    ? `\n    <script type="application/json" id="${GUIDE_DATA_ELEMENT_ID}">${JSON.stringify(
        page.embeddedData
      ).replace(/</g, "\\u003c")}</script>`
    : "";
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${page.body}${footerHtml(page.lang)}</div>${embedded}`
  );
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
    // サイズ別一覧と解説記事への導線をトップに置く。クローラがここから
    // 「駅名クエリ以外」のページ群に入れるようにするため
    body:
      `<main><h1>${esc(t(lang, "areasPage.ogTitle"))}</h1><p>${esc(description)}</p>` +
      `<p>${link(pathForSizeList(lang), t(lang, "sizesPage.linkFromTop"))} ／ ` +
      `${link(pathForGuideList(lang), t(lang, "guidesPage.linkFromTop"))}</p>` +
      `<h2>${esc(t(lang, "areasPage.heading"))}</h2><ul>${items}</ul></main>`,
  };
}

// 都道府県ページ。配下の駅ページへの導線になる
function prefecturePage(lang, prefecture) {
  const label = prefectureName(prefecture, lang);
  const stations = stationsInPrefecture(prefecture);
  const withLockers = stations.filter((s) => lockersByStation.has(s.slug));
  const description = t(lang, "prefecturePage.description", {
    prefecture: label,
    count: withLockers.length,
  });
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
      const hours = translateBusinessHours(
        locker.business_hours,
        (key, vars) => t(lang, key, vars),
        lang
      );
      const sizes = (locker.sizes ?? [])
        .map((s) => (lang === "en" ? `${s.size_type} ¥${s.price}` : `${s.size_type} ${s.price}円`))
        .join(" / ");
      // 英語ページではロッカー名・所在説明を英訳する。スクレイプ元が日本語しか
      // 提供しないため、そのまま出すと英語ページに日本語が混ざる（i18n/lockerText.js参照）
      const name = lockerDisplayName(locker.name, lang, { stationNameJa: station.name.ja });
      const address = lockerDisplayAddress(locker.address, lang, {
        stationNameJa: station.name.ja,
        stationNameEn: station.name.en,
      });
      const detail = [address, hours, sizes].filter(Boolean).map(esc).join(" ／ ");
      return `<li>${link(
        pathForLocker(lang, station.slug, locker.facility_id),
        name
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
    const summary = sizeSummary(lockers, size.sizeType);
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

// 解説記事のブロック。components/GuideBlocks.jsx と同じ内容を静的HTMLでも出す。
// 本文がここに出ていないと、JSを実行しないクローラからは読み物の無いサイトに見える
function guideBlocksHtml(lang, blocks, vars) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "h2":
          return `<h2>${esc(fill(block.text[lang], vars))}</h2>`;
        case "p":
          return `<p>${esc(fill(block.text[lang], vars))}</p>`;
        case "ul":
          return `<ul>${block.items.map((item) => `<li>${esc(fill(item[lang], vars))}</li>`).join("")}</ul>`;
        case "qa":
          return `<p><strong>${esc(fill(block.q[lang], vars))}</strong><br />${esc(
            fill(block.a[lang], vars)
          )}</p>`;
        case "sizeTable": {
          const head =
            `<tr><th>${esc(t(lang, "guidesPage.tableSize"))}</th>` +
            `<th>${esc(t(lang, "guidesPage.tableDimensions"))}</th>` +
            `<th>${esc(t(lang, "guidesPage.tablePrice"))}</th>` +
            `<th>${esc(t(lang, "guidesPage.tableStations"))}</th></tr>`;
          const rows = sizeTableRows(lockers, lang, t)
            .map((row) => {
              const price =
                row.minPrice === row.maxPrice
                  ? t(lang, "guidesPage.tablePriceOne", { price: row.minPrice })
                  : t(lang, "guidesPage.tablePriceRange", { min: row.minPrice, max: row.maxPrice });
              return (
                `<tr><th scope="row">${esc(row.name)}</th><td>${esc(row.dimensions || "—")}</td>` +
                `<td>${esc(price)}</td>` +
                `<td>${esc(t(lang, "guidesPage.tableStationCount", { count: row.stationCount }))}</td></tr>`
              );
            })
            .join("");
          return `<div class="guide-table-wrap"><table class="guide-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
        }
        case "stationList":
          return `<ul class="guide-station-list">${stationListRows(lockers, block.size)
            .map(
              (row) =>
                `<li>${link(pathForStation(lang, row.slug), slugToName(row.slug, lang))} ` +
                `<span class="guide-station-qty">${esc(
                  t(lang, "guidesPage.stationQuantity", { count: row.quantity })
                )}</span></li>`
            )
            .join("")}</ul>`;
        default:
          return "";
      }
    })
    .join("");
}

// 解説記事の一覧（/guides）
function guidesIndexPage(lang) {
  const items = GUIDES.map((g) => `<li>${link(pathForGuide(lang, g.slug), g.heading[lang])}</li>`).join("");

  return {
    lang,
    title: t(lang, "guidesPage.titleTag"),
    description: t(lang, "guidesPage.description"),
    canonicalPath: pathForGuideList(lang),
    altJa: pathForGuideList("ja"),
    altEn: pathForGuideList("en"),
    ogType: "website",
    body:
      `<main><h1>${esc(t(lang, "guidesPage.heading"))}</h1>` +
      `<p>${esc(t(lang, "guidesPage.lead"))}</p><ul>${items}</ul>` +
      `<p>${link(pathForPrefectureList(lang), t(lang, "prefecturePage.backToAreas"))}</p></main>`,
  };
}

// 解説記事の本体（/guides/:slug）
function guidePage(lang, guide) {
  const data = guideData(lockers, lang, t, guide.blocks);
  const vars = data.vars;
  const others = GUIDES.filter((g) => g.slug !== guide.slug)
    .map((g) => `<li>${link(pathForGuide(lang, g.slug), g.heading[lang])}</li>`)
    .join("");

  return {
    lang,
    title: guide.title[lang],
    description: fill(guide.description[lang], vars),
    canonicalPath: pathForGuide(lang, guide.slug),
    altJa: pathForGuide("ja", guide.slug),
    altEn: pathForGuide("en", guide.slug),
    ogType: "article",
    // クライアント側が同じ数値で描けるようHTMLに埋め込む（renderPage参照）。
    // バックエンドAPIが落ちていても記事の数字が「0円」にならないための保険
    embeddedData: data,
    body:
      `<main><p>${link(pathForGuideList(lang), t(lang, "guidesPage.backToList"))}</p>` +
      `<h1>${esc(guide.heading[lang])}</h1>` +
      guideBlocksHtml(lang, guide.blocks, vars) +
      `<h2>${esc(t(lang, "guidesPage.otherGuides"))}</h2><ul>${others}</ul></main>`,
  };
}

// お問い合わせフォーム。pages/PrivacyPage.jsx のJSXと同じ内容を静的HTMLでも出す。
// createRootは#rootの中身を丸ごと捨てて描き直すので、片方だけに足すと
// 「クローラには見えるが人間には見えない」（またはその逆）状態になる。必ず両方を直すこと
function contactFormHtml(lang) {
  const hidden = contactFormHidden(lang, SITE_URL)
    .map((h) => `<input type="hidden" name="${esc(h.name)}" value="${esc(h.value)}" />`)
    .join("");

  const fields = CONTACT_FORM_FIELDS.map((field) => {
    const required = field.required
      ? ` <em>（${esc(t(lang, "privacyPage.formRequired"))}）</em>`
      : "";
    const label = `<span>${esc(t(lang, field.labelKey))}${required}</span>`;
    const attrs = `name="${esc(field.name)}"${field.required ? " required" : ""}`;

    let control;
    if (field.kind === "select") {
      const options = field.options
        .map((o) => `<option value="${esc(o)}">${esc(t(lang, `privacyPage.formTopic_${o}`))}</option>`)
        .join("");
      control = `<select ${attrs}>${options}</select>`;
    } else if (field.kind === "textarea") {
      control = `<textarea ${attrs} rows="${field.rows}"></textarea>`;
    } else {
      control = `<input type="${esc(field.kind)}" ${attrs} />`;
    }

    const note = field.noteKey
      ? `<p class="contact-form-note">${esc(t(lang, field.noteKey))}</p>`
      : "";
    return `<label>${label}${control}</label>${note}`;
  }).join("");

  return (
    `<form class="contact-form" action="${esc(CONTACT_FORM_ENDPOINT)}" method="POST">` +
    hidden +
    `<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" />` +
    fields +
    `<button type="submit">${esc(t(lang, "privacyPage.formSubmit"))}</button>` +
    `</form>`
  );
}

// お問い合わせ送信後の到達ページ（/contact-received）。FormSubmitの_nextの飛び先で、
// 無いと送信後に404になる。中身を1行にせず、受け取った後どう扱うかまで書いている
function contactReceivedPage(lang) {
  const items = ["nextSource", "nextBatch", "nextReply", "nextRemoval"]
    .map((key) => `<li>${esc(t(lang, `contactReceivedPage.${key}`))}</li>`)
    .join("");

  return {
    lang,
    title: t(lang, "contactReceivedPage.titleTag"),
    description: t(lang, "contactReceivedPage.description"),
    canonicalPath: pathForContactReceived(lang),
    altJa: pathForContactReceived("ja"),
    altEn: pathForContactReceived("en"),
    ogType: "article",
    // 「送信ありがとうございます」だけの薄いページ。検索から直接来ても意味がなく、
    // 逆にGoogleにソフト404と判定される（2026-08-17にSearch Consoleで警告）。
    // sitemapからも外している
    noindex: true,
    body:
      `<main><h1>${esc(t(lang, "contactReceivedPage.ogTitle"))}</h1>` +
      `<p>${esc(t(lang, "contactReceivedPage.lead"))}</p>` +
      `<h2>${esc(t(lang, "contactReceivedPage.nextHeading"))}</h2><ul>${items}</ul>` +
      `<p>${link(pathForPrefectureList(lang), t(lang, "contactReceivedPage.backHome"))} ／ ` +
      `${link(pathForPrivacy(lang), t(lang, "contactReceivedPage.backPrivacy"))}</p></main>`,
  };
}

// プライバシーポリシー・免責事項（/privacy）。データに依存しない固定ページ。
// PrivacyPage.jsxと同じ翻訳キーから引いているので、文言の変更はlocales側だけで済む
function privacyPage(lang) {
  const section = (headingKey, bodies) =>
    `<h2>${esc(t(lang, headingKey))}</h2>` +
    (bodies.length === 1
      ? `<p>${esc(bodies[0])}</p>`
      : `<ul>${bodies.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`);

  const contact = hasContactForm()
    ? `<p>${esc(t(lang, "privacyPage.contactBody"))}</p>${contactFormHtml(lang)}`
    : `<p>${esc(t(lang, "privacyPage.contactPending"))}</p>`;

  return {
    lang,
    title: t(lang, "privacyPage.titleTag"),
    description: t(lang, "privacyPage.description"),
    canonicalPath: pathForPrivacy(lang),
    altJa: pathForPrivacy("ja"),
    altEn: pathForPrivacy("en"),
    ogType: "article",
    body:
      `<main><h1>${esc(t(lang, "privacyPage.ogTitle"))}</h1>` +
      `<p>${esc(t(lang, "privacyPage.updated"))}</p>` +
      section("privacyPage.operatorHeading", [t(lang, "privacyPage.operatorBody", { operator: OPERATOR_NAME })]) +
      section("privacyPage.analyticsHeading", [t(lang, "privacyPage.analyticsBody")]) +
      section("privacyPage.adsHeading", [t(lang, "privacyPage.adsBody")]) +
      section("privacyPage.collectHeading", [
        t(lang, "privacyPage.collectNoPersonal"),
        t(lang, "privacyPage.collectSubmit"),
      ]) +
      section("privacyPage.accuracyHeading", [
        t(lang, "privacyPage.accuracySource"),
        t(lang, "privacyPage.accuracyQuantity"),
        t(lang, "privacyPage.accuracyLiability"),
      ]) +
      section("privacyPage.sourcesHeading", [
        t(lang, "privacyPage.sourcesLocker"),
        t(lang, "privacyPage.sourcesStation"),
        t(lang, "privacyPage.sourcesMap"),
      ]) +
      `<h2>${esc(t(lang, "privacyPage.contactHeading"))}</h2>${contact}` +
      `<p>${link(pathForPrefectureList(lang), t(lang, "prefecturePage.backToAreas"))}</p></main>`,
  };
}

// サイズ別の駅一覧（/sizes/:sizeSlug）。SizePageと同じく都道府県ごとにまとめる。
// 駅ページへの内部リンクを大量に張るため、クロールを駅ページへ流す導線にもなっている
function sizePage(lang, size) {
  const summary = sizeSummary(lockers, size.sizeType);
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
  const hours = translateBusinessHours(
    locker.business_hours,
    (key, vars) => t(lang, key, vars),
    lang
  );
  const stationName = station.name[lang] || station.name.ja;
  const name = lockerDisplayName(locker.name, lang, { stationNameJa: station.name.ja });
  const address = lockerDisplayAddress(locker.address, lang, {
    stationNameJa: station.name.ja,
    stationNameEn: station.name.en,
  });
  const sizes = locker.sizes ?? [];
  const description =
    sizes.length > 0
      ? t(lang, "lockerDetail.metaDescription", {
          address,
          price: Math.min(...sizes.map((s) => s.price)),
          hours,
        })
      : t(lang, "lockerDetail.metaDescriptionNoPrice", { address, hours });

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
    // 2026-08-23: titleに駅名を入れた。従来は「改札外 コインロッカー｜コインロッカー検索」で、
    // 同じtitleが205ページ並び、どの駅のロッカーなのか検索結果から判別できなかった
    title: t(lang, "lockerDetail.metaTitle", { name, station: stationName }),
    description,
    canonicalPath,
    altJa: pathForLocker("ja", station.slug, locker.facility_id),
    altEn: pathForLocker("en", station.slug, locker.facility_id),
    noindex: true,
    ogType: "place",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name,
      address: { "@type": "PostalAddress", streetAddress: address },
      geo: { "@type": "GeoCoordinates", latitude: locker.latitude, longitude: locker.longitude },
      url: `${SITE_URL}${canonicalPath}`,
    },
    // 英語ページでは現地の看板が読めないと困るので、日本語の原文を lang="ja" 付きで併記する。
    // title・descriptionには入れない（英語の検索結果で意味を成さなくなるため）
    body: `<main><h1>${esc(name)}</h1><p>${esc(address)}</p>${
      lang === "en"
        ? `<p>${esc(t(lang, "lockerDetail.signName", { name: "" })).trim()} <span lang="ja">${esc(
            locker.name
          )}</span></p>`
        : ""
    }<p>${esc(t(lang, "lockerDetail.hours", { hours }))}</p>${sizeTable}<p>${link(
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

  writePage(guidesIndexPage(lang));
  count++;

  for (const guide of GUIDES) {
    writePage(guidePage(lang, guide));
    count++;
  }

  writePage(privacyPage(lang));
  count++;

  writePage(contactReceivedPage(lang));
  count++;

  for (const size of LOCKER_SIZES) {
    writePage(sizePage(lang, size));
    count++;
  }

  for (const station of STATIONS) {
    writePage(stationPage(lang, station));
    count++;
  }

  for (const locker of lockers) {
    const station = stationBySlug.get(locker.station_slug);
    if (!station) continue;
    writePage(lockerPage(lang, locker, station));
    count++;
  }
}

// dist/404.html は wrangler.toml の not_found_handling = "404-page" の飛び先。
//
// これが無いと（＝SPAフォールバックのままだと）、存在しないURLにトップページのHTMLが
// 200で返り、Googleに「ソフト404」と判定される。2026-08-17にSearch Consoleから
// 実際に警告が来た。全ルートをプリレンダしているので、正規のURLがここに落ちることはない。
//
// 言語別に出し分けられない（Cloudflareは1ファイルしか見ない）ので日本語で出し、
// 英語の文言も併記する。canonicalは持たせない。
function notFoundPage() {
  const body =
    `<main><h1>${esc(t("ja", "notFound.title"))}</h1>` +
    `<p>${esc(t("ja", "notFound.message"))}</p>` +
    `<p>${esc(t("en", "notFound.message"))}</p>` +
    `<p>${link("/", t("ja", "notFound.backHome"))}</p></main>`;

  let html = TEMPLATE;
  html = html.replace(/\s*<title>[\s\S]*?<\/title>/, "");
  html = html.replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, "");
  html = html.replace(
    "</head>",
    `    <title>${esc(t("ja", "notFound.title"))}</title>\n` +
      `    <meta name="robots" content="noindex" />\n  </head>`
  );
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${body}${footerHtml("ja")}</div>`
  );
  fs.writeFileSync(path.join(DIST, "404.html"), html);
}

notFoundPage();
count++;

// 生成物の自己点検：英語ページに日本語が残っていないか。
//
// なぜビルドを落とすか: 2026-08-23時点で英語1,333ページ中1,243ページ（93%）に
// 日本語が混入していた。ロッカー名・住所・営業時間がスクレイプ元の日本語のまま
// titleやdescriptionに入り、英語圏の検索結果で意味を成さない状態だった。
// GSCの実測では英語ページの方が日本語ページより平均掲載順位が良い（areasで9.2位 対 26.5位）
// ため、英語側の品質はこのサイトの数少ない勝ち筋であり、事故を再発させない。
//
// 例外: 現地の看板表記は日本語でないと役に立たないので、<span lang="ja"> の中だけは許可する。
// 同種のチェックは japan-proxy-cost にもある（あちらは日本語混入を本番に出した実績がある）。
function assertEnglishPagesHaveNoJapanese() {
  const offenders = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) check(full);
    }
  };

  const check = (file) => {
    const html = fs.readFileSync(file, "utf-8");
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
    const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1] || "";
    const ogTitle = (html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/) || [])[1] || "";
    const ogDesc = (html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/) || [])[1] || "";

    // 本文は script と lang="ja" の要素を除いてから判定する
    const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/) || [])[1] || "";
    const visible = body
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<[a-z]+[^>]*\slang="ja"[^>]*>[\s\S]*?<\/[a-z]+>/g, "")
      .replace(/<[^>]*>/g, " ");

    const fields = { title, description, ogTitle, ogDesc, body: visible };
    const bad = Object.entries(fields).filter(([, v]) => hasJapanese(v));
    if (bad.length === 0) return;

    const sample = bad
      .map(([k, v]) => {
        const hit = (v.match(/\S*[぀-ゟ゠-ヿㇰ-ㇿｦ-ﾝ一-鿿]\S*/g) || []).slice(0, 3).join(" ");
        return `${k}: ${hit}`;
      })
      .join(" / ");
    offenders.push(`${path.relative(DIST, file).split(path.sep).join("/")} → ${sample}`);
  };

  const enDir = path.join(DIST, "en");
  if (!fs.existsSync(enDir)) return;
  walk(enDir);

  if (offenders.length > 0) {
    console.error(`\n❌ 英語ページに日本語が残っています（${offenders.length}ページ）:\n`);
    for (const line of offenders.slice(0, 20)) console.error("   " + line);
    if (offenders.length > 20) console.error(`   ...他${offenders.length - 20}ページ`);
    console.error(
      "\n   src/i18n/lockerText.js の辞書に語句を追加するか、日本語を出す必要がある箇所は" +
        '\n   <span lang="ja"> で囲んでください。\n'
    );
    process.exit(1);
  }
  console.log("英語ページの日本語混入チェック: 問題なし");
}

assertEnglishPagesHaveNoJapanese();

console.log(`静的HTMLを生成しました（${count}ページ、SITE_URL=${SITE_URL}）: ${DIST}`);
