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
];

function exampleLine(data, ex) {
  const res = calculate(data, ex.input);
  const c = res.cheapest;
  const ems = res.rows.find((r) => r.id === "ems");
  const money = (lo, hi, open) => (lo === hi ? yen(lo) : `${yen(lo)}〜${yen(hi)}`) + (open ? "＋α" : "");
  return `<li><strong>${esc(ex.title)}</strong>：合計がいちばん安いのは${esc(c.name)}で${money(c.totalLo, c.totalHi, c.tax.open)}（送料${yen(c.price)}、受け取る人の税${money(c.tax.lo, c.tax.hi, c.tax.open)}）。EMSなら${money(ems.totalLo, ems.totalHi, ems.tax.open)}。</li>`;
}

// 写真の帯に重ねる見出し
export function toolHero(data) {
  return `<p class="crumbs"><a href="/">トップ</a> ／ 道具</p>
  <h1>海外へ荷物を送る料金と、<br />相手が払う税の計算機</h1>
  <p class="hero-lead">送り先・重さ・中身の値段を入れると、日本郵便の5つの送り方の送料と、受け取る人が払う税の目安を並べて比べます。相手の国の贈り物の免税枠や、2025〜2026年に変わった手続きもまとめて表示します。</p>
  <p class="article-meta">日本郵便の5つの送り方 × 9か国・地域　料金と決まりの確認日 ${esc(data.meta.verifiedAt)}</p>`;
}

export function toolBody(data) {
  const res = calculate(data, DEFAULT_INPUT);
  const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
  const countries = Object.fromEntries(Object.entries(data.countries).map(([k, c]) => [k, c.name]));
  const ruleRows = Object.entries(data.countries)
    .map(([k, c]) => `<tr><th scope="row">${esc(c.name)}</th><td>${esc(RULES[k].gift)}</td><td>${esc(RULES[k].sale)}</td><td>${c.lithium === "prohibited" ? "日本郵便では送れない" : "機器に内蔵、1荷物2個まで"}</td></tr>`)
    .join("");
  const methodRows = ["ems", "parcel_air", "airpacket", "small_packet", "parcel_sea"]
    .map((id) => {
      const m = data.methods[id];
      const zoneUs = m.rates.find((r) => r.maxG >= 1000)?.z[3];
      return `<tr><th scope="row">${esc(m.name)}</th><td class="right">${m.maxG / 1000}kg</td><td>${esc(m.days)}</td><td>${m.tracking ? "あり" : "なし"}</td><td class="right">${zoneUs ? yen(zoneUs) : "―"}</td></tr>`;
    })
    .join("");
  const sources = data.meta.sources.map(([label, url, date]) => `<li><a href="${esc(url)}" rel="noopener">${esc(label)}</a>（${esc(date)}に確認）</li>`).join("");
  return `
<article class="article tool">

  <form class="calc-form" id="calc-form" aria-describedby="calc-help">
    <label>送り先<select name="country">${opts(countries, DEFAULT_INPUT.country)}</select></label>
    <label>重さ（箱を含む）<span class="with-unit"><input name="weightG" type="number" inputmode="numeric" min="1" max="30000" step="1" value="${DEFAULT_INPUT.weightG}" required /><span>g</span></span></label>
    <label>中身の値段<span class="with-unit"><input name="valueJpy" type="number" inputmode="numeric" min="0" step="1" value="${DEFAULT_INPUT.valueJpy}" required /><span>円</span></span></label>
    <label>中身の種類<select name="item">${opts(ITEM_TYPES, DEFAULT_INPUT.item)}</select></label>
    <fieldset><legend>送る物</legend>
      <label class="inline"><input type="radio" name="kind" value="gift" checked />贈り物（代金をもらわない）</label>
      <label class="inline"><input type="radio" name="kind" value="sale" />売った物・代金をもらった物</label>
    </fieldset>
    <label class="inline"><input type="checkbox" name="lithium" />電池（リチウム電池）の入った物がある</label>
    <p id="calc-help" class="calc-help">入力を変えると、下の表がすぐに計算し直されます。</p>
  </form>

  <section class="calc-result" id="calc-result" aria-live="polite">
${resultHtml(data, DEFAULT_INPUT, res)}
  </section>

  <div class="prose">
    <h2>計算の例</h2>
    <p>上の計算機で、よくある送り方を計算した結果です。</p>
    <ul>${EXAMPLES.map((ex) => exampleLine(data, ex)).join("")}</ul>
    <p>アメリカへの贈り物は、100米ドル（2026年10月初めのレートで約${yen(100 * data.fx.jpyPer.USD)}）を超えると関税がかかり、手続きも変わります。台湾は2,000台湾ドル（約${yen(2000 * data.fx.jpyPer.TWD)}）までなら、どの送り方でも税がかかりません。</p>

    <h2>国ごとの決まり</h2>
    <p>受け取る人が税を払うかどうかは、中身の値段と「贈り物かどうか」で決まります。各国の税関や日本郵便の公式の情報で確かめた内容です。</p>
    <div class="table-wrap"><table><thead><tr><th>送り先</th><th>贈り物</th><th>売った物</th><th>電池入りの物（日本郵便）</th></tr></thead><tbody>${ruleRows}</tbody></table></div>

    <h2>送り方の違い</h2>
    <div class="table-wrap"><table><thead><tr><th>送り方</th><th class="right">重さの上限</th><th>届くまで（日本郵便の案内）</th><th>追跡</th><th class="right">アメリカへ1kg</th></tr></thead><tbody>${methodRows}</tbody></table></div>
    <p>エコノミー航空（SAL）便は、今は取り扱いが止まっているため入れていません。小形包装物は2025年12月31日で書留の扱いが終わり、追跡も補償もありません。追跡がほしい2kgまでの荷物は国際エアパケットを使います。詳しくは<a href="/articles/japan-post-international-methods/">送り方を比べた記事</a>と<a href="/articles/international-parcel-damage-and-loss/">補償の記事</a>に書きました。</p>

    <h2>計算の前提と限界</h2>
    <ul>
      <li>送料は日本郵便の料金表の値です。郵便局の窓口で払う額と同じですが、割引は入れていません</li>
      <li>税は受け取る人が払う額の目安です。「＋α」は、品目ごとに決まる関税など、金額を出していない部分があることを表します</li>
      <li>外国のお金への換算は、欧州中央銀行の参照レート（${esc(data.fx.asOf.ecb)}）と米連邦準備制度の発表（${esc(data.fx.asOf.fedH10)}）を使っています。免税枠の境目の近くでは、為替で結果が変わります</li>
      <li>運送会社や郵便局が税の立て替えに取る手数料は、カナダ郵便の9.95カナダドルを除いて入れていません</li>
      <li>アメリカの関税は、品物代だけにかけて計算しています。「おもちゃ・フィギュア・ゲーム機」は通常の関税が0%の品目として12.5%、「その他」は12.5%を最低として出しています</li>
      <li>対象は9か国・地域だけです。ほかの国の料金は<a href="https://www.post.japanpost.jp/cgi-charge/index.php" rel="noopener">日本郵便の料金計算</a>で調べられます</li>
    </ul>
  </div>

  <aside class="sources">
    <h2>使ったデータ</h2>
    <ul>${sources}</ul>
  </aside>
</article>
<script type="application/json" id="calc-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
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
