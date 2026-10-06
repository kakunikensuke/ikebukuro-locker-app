// /tools/overseas-shipping/ のページ本体。build.mjs から呼ぶ。
// 入力例の結果を静的なHTMLに書いておき（検索エンジンとJSが動かない人のため）、ブラウザでは同じ calculate() で書き換える。
import { calculate, resultHtml, RULES, ITEM_TYPES, yen } from "./shipping-calc.mjs";

export const TOOL_PATH = "/tools/overseas-shipping/";
export const DEFAULT_INPUT = { country: "US", weightG: 1000, valueJpy: 5000, kind: "gift", item: "other", lithium: false };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 入力例。どれも同じ calculate() で計算した結果を本文に出す
const EXAMPLES = [
  { title: "アメリカに住む家族へ、5,000円・1kgの贈り物", input: DEFAULT_INPUT },
  { title: "アメリカへ、2万円・1kgの贈り物（100米ドルを超える）", input: { ...DEFAULT_INPUT, valueJpy: 20000 } },
  { title: "イギリスへ、1万円・2kgの贈り物", input: { ...DEFAULT_INPUT, country: "GB", weightG: 2000, valueJpy: 10000 } },
  { title: "ドイツへ、5,000円・500gの贈り物（45ユーロ以下）", input: { ...DEFAULT_INPUT, country: "DE", weightG: 500, valueJpy: 5000 } },
  { title: "台湾へ、8,000円・3kgの贈り物", input: { ...DEFAULT_INPUT, country: "TW", weightG: 3000, valueJpy: 8000 } },
  { title: "中国へ、1万円・2kgの服の贈り物", input: { ...DEFAULT_INPUT, country: "CN", weightG: 2000, valueJpy: 10000 } },
  { title: "タイへ、5,000円・1kgの贈り物", input: { ...DEFAULT_INPUT, country: "TH" } },
];

function exampleLine(data, ex) {
  const res = calculate(data, ex.input);
  const c = res.cheapest;
  const ems = res.rows.find((r) => r.id === "ems");
  const money = (lo, hi, open) => (lo === hi ? yen(lo) : `${yen(lo)}〜${yen(hi)}`) + (open ? "＋α" : "");
  return `<li><strong>${esc(ex.title)}</strong>：合計がいちばん安いのは${esc(c.name)}で${money(c.totalLo, c.totalHi, c.tax.open)}（送料${yen(c.price)}、受け取る人の税${money(c.tax.lo, c.tax.hi, c.tax.open)}、${esc(c.days)}）。EMSなら${money(ems.totalLo, ems.totalHi, ems.tax.open)}で${esc(ems.days)}。</li>`;
}

// 写真の帯に重ねる見出し
export function toolHero(data) {
  return `<p class="crumbs"><a href="/">トップ</a> ／ 道具</p>
  <h1>海外へ荷物を送る料金と、<br />相手が払う税の計算機</h1>
  <p class="hero-lead">送り先・重さ・中身の値段を入れると、日本郵便の5つの送り方の送料と、受け取る人が払う税の目安を並べて比べます。相手の国の贈り物の免税枠や、2025〜2026年に変わった手続きもまとめて表示します。</p>
  <p class="article-meta">日本郵便の5つの送り方 × ${Object.keys(data.countries).length}か国・地域　料金と決まりの確認日 ${esc(data.meta.verifiedAt)}</p>`;
}

export const COUNTRY_SLUG = { US: "us", CA: "ca", GB: "gb", DE: "de", FR: "fr", AU: "au", SG: "sg", HK: "hk", TW: "tw", CN: "cn", KR: "kr", TH: "th", VN: "vn", PH: "ph", NZ: "nz" };
export const countryPath = (code) => `${TOOL_PATH}${COUNTRY_SLUG[code]}/`;

const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v)}</option>`).join("");

function lithiumText(c) {
  return c.lithium.air && c.lithium.sea ? "航空便・船便とも可" : c.lithium.air ? "航空便・EMSは可、船便は不可" : c.lithium.sea ? "船便だけ可" : "日本郵便では送れない";
}

// 入力欄と結果（静的HTMLにも入力の結果を書いておく）
function calcWidget(data, input) {
  const countries = Object.fromEntries(Object.entries(data.countries).map(([k, c]) => [k, c.name]));
  return `
  <form class="calc-form" id="calc-form" aria-describedby="calc-help">
    <label>送り先<select name="country">${opts(countries, input.country)}</select></label>
    <label>重さ（箱を含む）<span class="with-unit"><input name="weightG" type="number" inputmode="numeric" min="1" max="30000" step="1" value="${input.weightG}" required /><span>g</span></span></label>
    <label>中身の値段<span class="with-unit"><input name="valueJpy" type="number" inputmode="numeric" min="0" step="1" value="${input.valueJpy}" required /><span>円</span></span></label>
    <label>中身の種類<select name="item">${opts(ITEM_TYPES, input.item)}</select></label>
    <fieldset><legend>送る物</legend>
      <label class="inline"><input type="radio" name="kind" value="gift" checked />贈り物（代金をもらわない）</label>
      <label class="inline"><input type="radio" name="kind" value="sale" />売った物・代金をもらった物</label>
    </fieldset>
    <label class="inline"><input type="checkbox" name="lithium" />電池（リチウム電池）の入った物がある</label>
    <p id="calc-help" class="calc-help">入力を変えると、下の表がすぐに計算し直されます。</p>
  </form>

  <section class="calc-result" id="calc-result" aria-live="polite">
${resultHtml(data, input, calculate(data, input))}
  </section>`;
}

function calcScript(data) {
  return `<script type="application/json" id="calc-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script type="module">
import { calculate, resultHtml } from "/js/shipping-calc.js";
const data = JSON.parse(document.getElementById("calc-data").textContent);
const form = document.getElementById("calc-form");
const out = document.getElementById("calc-result");
function read() {
  const f = new FormData(form);
  return {
    country: f.get("country"),
    weightG: Math.max(1, Number(f.get("weightG")) || 0),
    valueJpy: Math.max(0, Number(f.get("valueJpy")) || 0),
    kind: f.get("kind"),
    item: f.get("item"),
    lithium: f.get("lithium") === "on",
  };
}
function render() {
  const input = read();
  out.innerHTML = resultHtml(data, input, calculate(data, input));
}
form.addEventListener("input", render);
form.addEventListener("submit", (e) => { e.preventDefault(); render(); });
</script>`;
}

function sourcesHtml(list) {
  return list.map(([label, url, date]) => `<li><a href="${esc(url)}" rel="noopener">${esc(label)}</a>（${esc(date)}に確認）</li>`).join("");
}

export function toolBody(data) {
  const ruleRows = Object.entries(data.countries)
    .map(([k, c]) => `<tr><th scope="row"><a href="${countryPath(k)}">${esc(c.name)}</a></th><td>${esc(RULES[k].gift)}</td><td>${esc(RULES[k].sale)}</td><td>${lithiumText(c)}</td></tr>`)
    .join("");
  const methodRows = ["ems", "parcel_air", "airpacket", "small_packet", "parcel_sea"]
    .map((id) => {
      const m = data.methods[id];
      const zoneUs = m.rates.find((r) => r.maxG >= 1000)?.z[3];
      return `<tr><th scope="row">${esc(m.name)}</th><td class="right">${m.maxG / 1000}kg</td><td>${esc(m.days)}</td><td>${m.tracking ? "あり" : "なし"}</td><td class="right">${zoneUs ? yen(zoneUs) : "―"}</td></tr>`;
    })
    .join("");
  return `
<article class="article tool">
${calcWidget(data, DEFAULT_INPUT)}

  <div class="prose">
    <h2>計算の例</h2>
    <p>上の計算機で、よくある送り方を計算した結果です。</p>
    <ul>${EXAMPLES.map((ex) => exampleLine(data, ex)).join("")}</ul>
    <p>アメリカへの贈り物は、100米ドル（2026年10月初めのレートで約${yen(100 * data.fx.jpyPer.USD)}）を超えると関税がかかり、手続きも変わります。台湾は2,000台湾ドル（約${yen(2000 * data.fx.jpyPer.TWD)}）までなら、どの送り方でも税がかかりません。</p>

    <h2>国ごとの決まり</h2>
    <p>受け取る人が税を払うかどうかは、中身の値段と「贈り物かどうか」で決まります。各国の税関や日本郵便の公式の情報で確かめた内容です。国の名前から、その国あての料金表・日数・税の例をまとめたページに進めます。</p>
    <div class="table-wrap"><table><thead><tr><th>送り先</th><th>贈り物</th><th>売った物</th><th>電池入りの物（日本郵便）</th></tr></thead><tbody>${ruleRows}</tbody></table></div>

    <h2>送り方の違い</h2>
    <div class="table-wrap"><table><thead><tr><th>送り方</th><th class="right">重さの上限</th><th>届くまで（日本郵便の案内）</th><th>追跡</th><th class="right">アメリカへ1kg</th></tr></thead><tbody>${methodRows}</tbody></table></div>
    <p>エコノミー航空（SAL）便は、今は取り扱いが止まっているため入れていません。小形包装物は2025年12月31日で書留の扱いが終わり、追跡も補償もありません。追跡がほしい2kgまでの荷物は国際エアパケットを使います。詳しくは<a href="/articles/japan-post-international-methods/">送り方を比べた記事</a>と<a href="/articles/international-parcel-damage-and-loss/">補償の記事</a>に書きました。</p>

${limitsHtml(data)}
  </div>

  <aside class="sources">
    <h2>使ったデータ</h2>
    <ul>${sourcesHtml(data.meta.sources)}</ul>
  </aside>
</article>
${calcScript(data)}`;
}

function limitsHtml(data) {
  return `    <h2>計算の前提と限界</h2>
    <ul>
      <li>送料は日本郵便の料金表の値です。郵便局の窓口で払う額と同じですが、割引は入れていません</li>
      <li>税は受け取る人が払う額の目安です。「＋α」は、品目ごとに決まる関税など、金額を出していない部分があることを表します</li>
      <li>外国のお金への換算は、欧州中央銀行の参照レート（${esc(data.fx.asOf.ecb)}）、台湾ドルは米連邦準備制度の発表（${esc(data.fx.asOf.fedH10)}）、ベトナム・ドンはベトコムバンクのレート（${esc(data.fx.asOf.vcb)}）を使っています。免税枠の境目の近くでは、為替で結果が変わります</li>
      <li>届くまでの日数は、日本郵便の料金計算で東京都から出す場合の標準日数です。土日・休日や検査、航空機の遅れがあると、さらにかかります</li>
      <li>運送会社や郵便局が税の立て替えに取る手数料は、カナダ郵便の9.95カナダドルを除いて入れていません</li>
      <li>アメリカの関税は、品物代だけにかけて計算しています。「おもちゃ・フィギュア・ゲーム機」は通常の関税が0%の品目として12.5%、「その他」は12.5%を最低として出しています</li>
      <li>対象は${Object.keys(data.countries).length}か国・地域だけです。ほかの国の料金は<a href="https://www.post.japanpost.jp/cgi-charge/index.php" rel="noopener">日本郵便の料金計算</a>で調べられます</li>
    </ul>`;
}

// ---- 国ごとのページ ----

// その国の公式の出典を選ぶ（データの meta.sources のラベルで見分ける）
const SOURCE_KEYS = {
  US: ["米国", "アメリカ"], CA: ["カナダ"], GB: ["英国"], DE: ["欧州委員会", "EUの"], FR: ["欧州委員会", "EUの"], AU: ["オーストラリア"], SG: ["シンガポール"],
  HK: ["香港"], TW: ["台湾"], CN: ["中国"], KR: ["韓国"], TH: ["タイ"], VN: ["ベトナム", "ベトコム"], PH: ["フィリピン"], NZ: ["ニュージーランド"],
};

const SHORT_NAME = { ems: "EMS", parcel_air: "航空小包", airpacket: "エアパケット", small_packet: "小形包装物", parcel_sea: "船便" };

const WEEK = "日月火水木金土";
function deadline(days) {
  // 12月24日（2026年）に届くよう、標準日数にさらに7日の余裕。土日なら前の金曜日
  const d = new Date(Date.UTC(2026, 11, 24));
  d.setUTCDate(d.getUTCDate() - days - 7);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEK[d.getUTCDay()]}）`;
}

export function countryHero(data, code) {
  const c = data.countries[code];
  return `<p class="crumbs"><a href="/">トップ</a> ／ <a href="${TOOL_PATH}">海外発送の計算機</a> ／ ${esc(c.name)}</p>
  <h1>${esc(c.name)}へ荷物を送る料金と、<br />相手が払う税</h1>
  <p class="hero-lead">${esc(countryLead(data, code))}</p>
  <p class="article-meta">日本郵便の5つの送り方の料金・標準日数と、${esc(c.name)}の税の決まり　確認日 ${esc(data.meta.verifiedAt)}</p>`;
}

export function countryLead(data, code) {
  const c = data.countries[code];
  const res = calculate(data, { ...DEFAULT_INPUT, country: code });
  const ems = res.rows.find((r) => r.id === "ems");
  const best = res.cheapest;
  return `日本から${c.name}へ1kgの荷物を送ると、EMSは${yen(ems.price)}で${ems.days}、いちばん安い${best.name}は${yen(best.price)}です。${RULES[code].gift}。`;
}

export function countryBody(data, code) {
  const c = data.countries[code];
  const rule = RULES[code];
  const input = { ...DEFAULT_INPUT, country: code };
  const ids = ["ems", "parcel_air", "airpacket", "small_packet", "parcel_sea"];
  // 重さごとの送料
  const weights = [500, 1000, 2000, 5000, 10000];
  const rateRows = weights
    .map((w) => {
      const r = calculate(data, { ...input, weightG: w, valueJpy: 10000 }).rows;
      const cell = (x) => {
        if (!x.available) return `<td class="right">―</td>`;
        const t = x.tax;
        const total = t.unknown ? "税は品目による" : `税込み${t.lo === t.hi ? yen(x.totalLo) : `${yen(x.totalLo)}〜${yen(x.totalHi)}`}${t.open ? "＋α" : ""}`;
        return `<td class="right">${yen(x.price)}<span class="sub">${total}</span></td>`;
      };
      return `<tr><th scope="row">${w >= 1000 ? `${w / 1000}kg` : `${w}g`}</th>${ids.map((id) => cell(r.find((y) => y.id === id))).join("")}</tr>`;
    })
    .join("");
  // 中身の値段ごとの税（1kg・EMS）
  const values = [5000, 10000, 20000, 50000, 100000];
  const fx = data.fx.jpyPer[c.cur];
  const taxRows = (kind) =>
    values
      .map((v) => {
        const row = calculate(data, { ...input, valueJpy: v, kind }).rows.find((x) => x.id === "ems");
        const t = row.tax;
        const amount = t.unknown ? "品目による" : `${t.lo === t.hi ? yen(t.lo) : `${yen(t.lo)}〜${yen(t.hi)}`}${t.open ? "＋α" : ""}`;
        return `<tr><th scope="row">${yen(v)}</th><td class="right">約${Math.round(v / fx).toLocaleString("ja-JP")} ${esc(c.cur)}</td><td class="right">${amount}</td><td>${esc(t.label)}</td></tr>`;
      })
      .join("");
  // 日数とクリスマスの締切
  const std = data.standardDays.byCountry[code];
  const dayRows = ["ems", "parcel_air", "airpacket", "small_packet"]
    .map((id) => `<tr><th scope="row">${esc(data.methods[id].name)}</th><td class="right">${std[id]}日</td><td>${deadline(std[id])}</td></tr>`)
    .join("");
  const others = Object.entries(data.countries).filter(([k]) => k !== code).map(([k, x]) => `<a href="${countryPath(k)}">${esc(x.name)}</a>`).join("・");
  const keys = SOURCE_KEYS[code];
  const sources = data.meta.sources.filter(([label]) => label.startsWith("日本郵便") || keys.some((k) => label.includes(k)) || label.startsWith("為替"));
  const lith = c.lithium;
  const lithText = lith.air && lith.sea
    ? `${c.name}へは、機器に内蔵されたリチウム電池なら、航空便・EMSでも船便でも送れます（1つの荷物に2個まで）。`
    : lith.air
      ? `${c.name}へは、機器に内蔵されたリチウム電池なら航空便・EMSで送れますが、船便では送れません（日本郵便の船便の受付一覧に入っていないため）。`
      : lith.sea
        ? `${c.name}へは、電池の入った物を日本郵便の航空便・EMSでは送れません。船便の受付一覧には入っているので、急がない物なら船便で送れます。`
        : `${c.name}へは、電池の入った物を日本郵便の航空便でも船便でも送れません。国際宅配便（DHL・FedExなど）を検討してください。`;
  return `
<article class="article tool">
${calcWidget(data, input)}

  <div class="prose">
    <h2>${esc(c.name)}あての税の決まり</h2>
    <ul>
      <li><strong>贈り物：</strong>${esc(rule.gift)}</li>
      <li><strong>売った物：</strong>${esc(rule.sale)}</li>
      ${rule.duty ? `<li>${esc(rule.duty)}</li>` : ""}
      ${rule.procedure ? `<li>${esc(rule.procedure)}</li>` : ""}
    </ul>

    <h2>中身の値段ごとの税の目安</h2>
    <p>1kgの荷物をEMSで送る場合に、受け取る人が払う税の目安です。${esc(c.cur)}への換算は${esc(code === "TW" ? data.fx.asOf.fedH10 : code === "VN" ? data.fx.asOf.vcb : data.fx.asOf.ecb)}のレートです。</p>
    <h3>贈り物の場合</h3>
    <div class="table-wrap"><table><thead><tr><th>中身の値段</th><th class="right">${esc(c.cur)}で</th><th class="right">税の目安</th><th>内訳</th></tr></thead><tbody>${taxRows("gift")}</tbody></table></div>
    <h3>売った物の場合</h3>
    <div class="table-wrap"><table><thead><tr><th>中身の値段</th><th class="right">${esc(c.cur)}で</th><th class="right">税の目安</th><th>内訳</th></tr></thead><tbody>${taxRows("sale")}</tbody></table></div>

    <h2>重さごとの送料</h2>
    <p>日本郵便の料金表で、${esc(c.name)}は第${c.zone}地帯です。上の段が送料、下の段は中身1万円の贈り物を送ったときの、送料と受け取る人の税を足した額です。</p>
    <div class="table-wrap"><table class="rate-table"><thead><tr><th>重さ</th>${ids.map((id) => `<th class="right">${esc(SHORT_NAME[id])}</th>`).join("")}</tr></thead><tbody>${rateRows}</tbody></table></div>
    <p>「―」は、その重さでは使えない送り方です（小形包装物と国際エアパケットは2kgまで）。</p>

    <h2>届くまでの日数と、クリスマスの締切</h2>
    <p>日本郵便の料金計算で、東京都から出す場合の標準日数です。12月24日に届けるための目安は、標準日数にさらに1週間の余裕を足し、土日に当たるときは前の金曜日にした日です。船便は2〜4か月かかります。</p>
    <div class="table-wrap"><table><thead><tr><th>送り方</th><th class="right">標準日数</th><th>12月24日に届けるための目安</th></tr></thead><tbody>${dayRows}</tbody></table></div>
    <p>ほかの国と比べた表は<a href="/articles/christmas-overseas-shipping-deadline-2026/">クリスマスの締切の記事</a>にあります。</p>

    <h2>電池の入った物</h2>
    <p>${esc(lithText)}電池だけやモバイルバッテリーは、どの国へも送れません。</p>

    <h2>ほかの国へ送る場合</h2>
    <p>${others}</p>

${limitsHtml(data)}
  </div>

  <aside class="sources">
    <h2>使ったデータ</h2>
    <ul>${sourcesHtml(sources)}</ul>
  </aside>
</article>
${calcScript(data)}`;
}
