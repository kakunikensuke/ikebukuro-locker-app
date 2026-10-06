// kakuni-lab.com のビルド。content/ のMarkdownから dist/ に静的HTMLを書き出す。
// 画面側のJSは無い（お問い合わせフォームの送信だけ）。クローラと人間が同じHTMLを読む。
//
//   content/articles/<slug>.md  記事。先頭の --- で囲んだ部分がメタ情報
//   content/pages/<name>.md     固定ページ（運営者情報・プライバシーポリシー）
//   public/                     そのままコピーするファイル（ads.txt・style.css など）
//
// 記事の数字は、各アプリのデータを集計した時点の値を本文に書いている（dataAsOf に時点を書く）。
// 読み物なので自動更新はしない。

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const SITE = "https://kakuni-lab.com";
const SITE_NAME = "kakuni-lab";
const ADSENSE_CLIENT = "ca-pub-1372013098776592";

// 並び順もこの順。記事の category はここのキーのどれか
const CATEGORIES = {
  towns: {
    name: "駅前の店と暮らし",
    lead: "全国1,882駅の徒歩圏にある店や施設を数えたデータから、地域ごとの違いを見ます。",
    intro: [
      "対象は、住みやすさ駅前スコアで扱っている全国1,882駅です。店や施設の場所はOpenStreetMap（2026年9月28日時点）から取り、駅の代表地点からの直線距離で数えています。駅の乗降客数と地価は国土数値情報、住んでいる人は国勢調査（2020年）、家賃の目安は住宅・土地統計調査（2023年）を使っています。",
      "チェーン店は、地図に登録された名前とブランドの欄で見分けています。地図の登録には漏れがあり、駅ビルの中の店は数えられていないこともあります。そのため、どの記事も「全国で何軒」より「駅にいちばん近いのはどこか」「地域でどう違うか」を見るようにしています。",
    ],
  },
  lockers: {
    name: "駅で荷物を預ける",
    lead: "全国のコインロッカーの設置場所・サイズ・料金を集めたデータから分かったことです。",
    intro: [
      "2026年7月から9月まで公開していたコインロッカー検索のために集めた、427駅・818か所のロッカーのデータ（2026年9月17日時点）を使っています。85%はJR東日本系のマルチエキューブのロッカーで、ほかに東京メトロ、東急、京王、西武などの公開情報があります。",
      "スーツケースが入るかどうかは、サイズの名前ではなく、事業者が公開している内寸で判定しています。同じ「Lサイズ」でも事業者によって高さが倍近く違うためです。台数は事業者が公開している値をそのまま足したもので、実際の扉の数と一致するかは確かめられていないため、比率として読んでください。",
    ],
  },
  shopping: {
    name: "日本の商品を海外へ送る",
    lead: "購入代行5社の料金表と各国の送料・関税の決まりを突き合わせて計算しています。",
    intro: [
      "海外から日本の商品を買う人向けの英語の計算機、Japan Proxy Cost Calculatorのデータを使っています。購入代行5社（Buyee、ZenMarket、Neokyo、FROM JAPAN、Doorzo）の料金表と規定、日本郵便の料金表、9か国・地域の税の決まりを、それぞれの公式の情報で確かめています。",
      "日本から家族や友人に荷物を送る人、海外に住む人の買い物を手伝う人に向けて書いています。料金と税の決まりはよく変わるので、各記事の冒頭に、いつ確かめた数字かを書いています。",
    ],
  },
  notes: {
    name: "作り方とデータの話",
    lead: "このサイトで使っている公開データの扱い方と、個人開発の記録です。",
    intro: [
      "ほかの記事の数字を出すときに使った公開データの特徴と、集計でつまずいたこと、閉じたツールの振り返りをまとめています。",
      "同じデータで自分でも数えてみたい人や、個人で公開データを使ったツールを作ろうとしている人の参考になるように、うまくいかなかったことも書いています。",
    ],
  },
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---- Markdown ----

// ```bars ブロック: 1行目が見出し、以降「ラベル | 数値 | 表示（省略可）」。横棒グラフにする
function renderBars(text) {
  const [caption, ...lines] = text.trim().split("\n");
  const rows = lines
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((r) => r.length >= 2)
    .map(([label, value, shown]) => ({ label, value: Number(value), shown: shown ?? value }));
  if (rows.some((r) => !Number.isFinite(r.value))) throw new Error(`bars: 数値でない値があります: ${caption}`);
  const max = Math.max(...rows.map((r) => r.value));
  const items = rows
    .map(
      (r) =>
        `<li><span class="bar-label">${esc(r.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${((r.value / max) * 100).toFixed(1)}%"></span></span><span class="bar-value">${esc(r.shown)}</span></li>`,
    )
    .join("");
  return `<figure class="bars"><figcaption>${esc(caption)}</figcaption><ul>${items}</ul></figure>\n`;
}

const md = new Marked({
  renderer: {
    code({ text, lang }) {
      if (lang === "bars") return renderBars(text);
      return `<pre><code>${esc(text)}</code></pre>\n`;
    },
    table(token) {
      // 横に長い表をスマホで横スクロールさせるための入れ物
      const head = token.header.map((c) => `<th${c.align ? ` class="${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</th>`).join("");
      const body = token.rows
        .map((row) => `<tr>${row.map((c) => `<td${c.align ? ` class="${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
    },
  },
});

function parseFile(path) {
  const raw = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${path}: 先頭のメタ情報（---）がありません`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (value.startsWith("[")) value = JSON.parse(value);
    meta[key] = value;
  }
  return { meta, body: m[2] };
}

// ---- 共通の枠 ----

function layout({ title, description, path, body, jsonLd, noindex = false }) {
  const url = SITE + path;
  const fullTitle = path === "/" ? title : `${title}｜${SITE_NAME}`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}" />
${noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`}
<meta property="og:title" content="${esc(fullTitle)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="${path.startsWith("/articles/") && path !== "/articles/" ? "article" : "website"}" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/style.css" />
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">kakuni-lab</a>
    <nav aria-label="サイト内">
      <a href="/articles/">記事一覧</a>
      <a href="/about/">運営者情報</a>
      <a href="/#contact">お問い合わせ</a>
    </nav>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <nav aria-label="フッター">
      <a href="/articles/">記事一覧</a>
      <a href="/about/">運営者情報</a>
      <a href="/privacy/">プライバシーポリシー</a>
      <a href="/#contact">お問い合わせ</a>
    </nav>
    <p>公開データを自分で集計して書いている個人のサイトです。&copy; kakuni-lab</p>
  </div>
</footer>
</body>
</html>
`;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

// ---- 記事 ----

function loadArticles() {
  const dir = join(ROOT, "content", "articles");
  if (!existsSync(dir)) return [];
  const list = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const { meta, body } = parseFile(join(dir, f));
      for (const key of ["title", "description", "finding", "category", "published", "dataAsOf", "sources"]) {
        if (!meta[key]) throw new Error(`${f}: ${key} がありません`);
      }
      if (!CATEGORIES[meta.category]) throw new Error(`${f}: 知らないカテゴリ ${meta.category}`);
      const html = md.parse(body);
      const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
      return { slug, ...meta, html, chars: text.length, path: `/articles/${slug}/` };
    });
  // 新しい順。同じ日は order（小さいほど先）
  return list.sort((a, b) => b.published.localeCompare(a.published) || Number(a.order ?? 99) - Number(b.order ?? 99));
}

function articleItem(a) {
  return `<li class="article-item"><a href="${a.path}"><span class="article-title">${esc(a.title)}</span><span class="article-desc">${esc(a.description)}</span></a></li>`;
}

function articlePage(a, all) {
  const cat = CATEGORIES[a.category];
  const related = all.filter((x) => x.category === a.category && x.slug !== a.slug).slice(0, 5);
  const sources = a.sources
    .map((s) => {
      const [label, url] = s.split(" | ");
      return `<li>${url ? `<a href="${esc(url)}" rel="noopener">${esc(label)}</a>` : esc(label)}</li>`;
    })
    .join("");
  const body = `
<article class="article">
  <p class="crumbs"><a href="/articles/">記事一覧</a> ／ <a href="${topicPath(a.category)}">${esc(cat.name)}</a></p>
  <h1>${esc(a.title)}</h1>
  <p class="article-meta">公開 ${fmtDate(a.published)}${a.updated ? `（更新 ${fmtDate(a.updated)}）` : ""}　データの時点: ${esc(a.dataAsOf)}</p>
  <div class="prose">
${a.html}
  </div>
  <aside class="sources">
    <h2>使ったデータ</h2>
    <ul>${sources}</ul>
  </aside>
  <aside class="author">
    <p><strong>書いた人: kakuni-lab</strong><br />公開データを集計するツールを個人で作っています。数字はすべて自分で集計したもので、集計の方法は本文に書いています。誤りに気づいたら<a href="/#contact">お問い合わせ</a>から教えてください。</p>
  </aside>
  ${related.length ? `<nav class="related" aria-label="関連記事"><h2>${esc(cat.name)}の記事</h2><ul class="article-list">${related.map(articleItem).join("")}</ul></nav>` : ""}
</article>`;
  return layout({
    title: a.title,
    description: a.description,
    path: a.path,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.description,
      datePublished: a.published,
      dateModified: a.updated || a.published,
      author: { "@type": "Person", name: "kakuni-lab", url: `${SITE}/about/` },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE },
      mainEntityOfPage: SITE + a.path,
    },
  });
}

function categorySections(articles, { headingLevel }) {
  return Object.entries(CATEGORIES)
    .map(([key, cat]) => {
      const items = articles.filter((a) => a.category === key);
      if (!items.length) return "";
      return `<section class="category" id="${key}">
  <h${headingLevel}><a href="${topicPath(key)}">${esc(cat.name)}</a></h${headingLevel}>
  <p class="category-lead">${esc(cat.lead)}</p>
  <ul class="article-list">${items.map(articleItem).join("")}</ul>
</section>`;
    })
    .join("\n");
}

const topicPath = (key) => `/topics/${key}/`;

// 記事の「分かったこと」1行と、そこへのリンク
function findingItem(a) {
  return `<li><a href="${a.path}">${esc(a.finding)}</a></li>`;
}

// テーマごとのページ。テーマの説明、そのテーマで分かったことの一覧、使ったデータ、記事の一覧
function topicPage(key, articles) {
  const cat = CATEGORIES[key];
  const items = articles.filter((a) => a.category === key);
  const sources = [...new Map(items.flatMap((a) => a.sources).map((s) => {
    const [label, url] = s.split(" | ");
    return [label.replace(/（この記事の計算に使ったツール）$/, ""), url];
  })).entries()];
  const lastDate = items.map((a) => a.updated || a.published).sort().at(-1);
  const body = `
<article class="article topic">
  <p class="crumbs"><a href="/articles/">記事一覧</a></p>
  <h1>${esc(cat.name)}</h1>
  <p class="article-meta">記事${items.length}本　最終更新 ${fmtDate(lastDate)}</p>
  <div class="prose">
    ${cat.intro.map((p) => `<p>${esc(p)}</p>`).join("")}
    <h2>このテーマで分かったこと</h2>
    <ul class="findings">${items.map(findingItem).join("")}</ul>
  </div>
  <section class="category">
    <h2>記事</h2>
    <ul class="article-list">${items.map(articleItem).join("")}</ul>
  </section>
  <aside class="sources">
    <h2>このテーマで使ったデータ</h2>
    <ul>${sources.map(([label, url]) => `<li>${url ? `<a href="${esc(url)}" rel="noopener">${esc(label)}</a>` : esc(label)}</li>`).join("")}</ul>
  </aside>
</article>`;
  return layout({
    title: cat.name,
    description: `${cat.lead}${items.slice(0, 2).map((a) => a.finding).join("。")}。記事${items.length}本。`,
    path: topicPath(key),
    body,
  });
}

function articlesIndex(articles) {
  const body = `
<h1 class="page-title">記事一覧</h1>
<p class="page-lead">公開データを自分で集計して分かったことを書いた記事です。全${articles.length}本。</p>
${categorySections(articles, { headingLevel: 2 })}`;
  return layout({
    title: "記事一覧",
    description: `駅前の店の地域差、コインロッカーの大きさと料金、日本の商品を海外へ送る費用など、公開データを集計して書いた記事${articles.length}本の一覧です。`,
    path: "/articles/",
    body,
  });
}

// ---- トップ ----

const CONTACT_FORM = readFileSync(join(ROOT, "content", "contact-form.html"), "utf8");

function homePage(articles) {
  const latest = articles.slice(0, 6);
  const body = `
<section class="intro">
  <h1>駅と暮らしを、公開データで数える</h1>
  <p>kakuni-labは、個人でWebツールを作っている開発者のサイトです。OpenStreetMapの店舗データや国の統計、鉄道会社や購入代行会社が公開している料金表を自分で集計し、分かったことを記事にしています。</p>
  <p>数字はどれも自分で数え直したもので、集計の仕方と限界も本文に書いています。</p>
</section>

<section>
  <h2>集計して分かったこと</h2>
  <p>テーマごとに、新しい記事から2本ずつ。どの数字も、リンク先の記事に数え方と限界を書いています。</p>
  ${Object.entries(CATEGORIES)
    .filter(([key]) => key !== "notes" && articles.some((a) => a.category === key))
    .map(([key, cat]) => `<h3><a href="${topicPath(key)}">${esc(cat.name)}</a></h3>
  <ul class="findings">${articles.filter((a) => a.category === key).slice(0, 2).map(findingItem).join("")}</ul>`)
    .join("")}
</section>

<section>
  <h2>新しい記事</h2>
  <ul class="article-list">${latest.map(articleItem).join("")}</ul>
  <p class="more"><a href="/articles/">記事一覧（${articles.length}本）を見る</a></p>
</section>

<section>
  <h2>テーマ</h2>
  <ul class="topics">
    ${Object.entries(CATEGORIES)
      .filter(([key]) => articles.some((a) => a.category === key))
      .map(
        ([key, cat]) =>
          `<li><a href="${topicPath(key)}"><span class="topic-name">${esc(cat.name)}</span><span class="topic-count">${articles.filter((a) => a.category === key).length}本</span></a><p>${esc(cat.lead)}</p></li>`,
      )
      .join("")}
  </ul>
</section>

<section>
  <h2>公開しているツール</h2>
  <ul class="tools">
    <li>
      <a href="https://eki.kakuni-lab.com/"><span class="tool-name">住みやすさ駅前スコア</span><span class="tool-url">eki.kakuni-lab.com</span></a>
      <p>駅を選ぶと、徒歩圏内のスーパー・コンビニ・病院・飲食店などの数が分かります。全国1,882駅を同じ基準で比べられます。「駅前の店と暮らし」の記事は、このツールのデータを使っています。</p>
    </li>
    <li>
      <a href="https://japanproxy.kakuni-lab.com/"><span class="tool-name">Japan Proxy Cost Calculator（英語）</span><span class="tool-url">japanproxy.kakuni-lab.com</span></a>
      <p>海外から日本の商品を買うときの、購入代行5社の総額（手数料・送料・関税）を比べる計算機です。</p>
    </li>
  </ul>
  <p class="note">2026年9月まで公開していた「コインロッカー検索」は終了しました。集めたデータは「駅で荷物を預ける」の記事で使っています。</p>
</section>

<section id="contact">
  <h2>お問い合わせ</h2>
  <p>記事やツールの誤りのご指摘、削除のご依頼、その他のお問い合わせはこちらからどうぞ。個人で運営しているため、返信までに数日いただくことがあります。</p>
  ${CONTACT_FORM}
</section>`;
  return layout({
    title: "kakuni-lab｜駅と暮らしを公開データで数える個人のサイト",
    description:
      "個人開発者kakuni-labのサイトです。OpenStreetMapや国の統計を自分で集計し、駅前の店の地域差、コインロッカーの大きさと料金、日本の商品を海外へ送る費用などを記事にしています。",
    path: "/",
    body,
    jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE + "/" },
  });
}

// ---- 固定ページ ----

function staticPage(name, path) {
  const { meta, body } = parseFile(join(ROOT, "content", "pages", `${name}.md`));
  return layout({
    title: meta.title,
    description: meta.description,
    path,
    body: `<article class="article"><h1>${esc(meta.title)}</h1><p class="article-meta">最終更新 ${fmtDate(meta.updated)}</p><div class="prose">${md.parse(body)}</div></article>`,
  });
}

function notFoundPage() {
  return layout({
    title: "ページが見つかりません",
    description: "お探しのページは見つかりませんでした。",
    path: "/404.html",
    noindex: true,
    body: `<article class="article"><h1>ページが見つかりません</h1><div class="prose"><p>URLが変わったか、ページを削除した可能性があります。<a href="/articles/">記事一覧</a>からお探しください。</p><p>2026年9月まで公開していたコインロッカー検索は終了しました。</p></div></article>`,
  });
}

// ---- 書き出し ----

function write(path, html) {
  const file = path.endsWith(".html") ? join(DIST, path) : join(DIST, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const articles = loadArticles();
// フォルダ自体は消さず中身だけ入れ替える（手元の確認用サーバーがフォルダを開いていても動くように）
mkdirSync(DIST, { recursive: true });
for (const f of readdirSync(DIST)) rmSync(join(DIST, f), { recursive: true, force: true });
cpSync(join(ROOT, "public"), DIST, { recursive: true });

write("/", homePage(articles));
write("/articles/", articlesIndex(articles));
for (const a of articles) write(a.path, articlePage(a, articles));
const topicKeys = Object.keys(CATEGORIES).filter((key) => articles.some((a) => a.category === key));
for (const key of topicKeys) write(topicPath(key), topicPage(key, articles));
write("/about/", staticPage("about", "/about/"));
write("/privacy/", staticPage("privacy", "/privacy/"));
write("/404.html", notFoundPage());

const urls = ["/", "/articles/", ...topicKeys.map(topicPath), "/about/", "/privacy/", ...articles.map((a) => a.path)];
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => {
      const a = articles.find((x) => x.path === u);
      return `  <url><loc>${SITE}${u}</loc>${a ? `<lastmod>${a.updated || a.published}</lastmod>` : ""}</url>`;
    })
    .join("\n")}\n</urlset>\n`,
);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// 薄い記事を出さないための検査。本文（見出し・表を含む、タグを除いた文字数）が2,000字未満なら落とす
const thin = articles.filter((a) => a.chars < 2000);
for (const a of articles) console.log(`${String(a.chars).padStart(6)}字  ${a.slug}`);
if (thin.length) {
  console.error(`本文が2,000字未満の記事があります: ${thin.map((a) => a.slug).join(", ")}`);
  process.exit(1);
}
console.log(`記事${articles.length}本、ページ${urls.length}件を dist/ に書き出しました`);
