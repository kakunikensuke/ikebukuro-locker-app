// 海外へ荷物を送るときの料金と、受け取る人が払う税の目安の計算。
// ブラウザ（/js/shipping-calc.js）とビルド（静的HTMLの入力例）の両方がこのファイルを使う。片方だけ直さないこと。
// データは site/data/overseas-shipping.json。

const METHOD_ORDER = ["ems", "parcel_air", "airpacket", "small_packet", "parcel_sea"];

// 国ごとの決まり。文はどれも公式の情報で確かめたもの（出典はデータの meta.sources）
export const RULES = {
  US: {
    gift: "100米ドル以下の個人間の贈り物は関税なし（同じ人が1日に受け取る合計が100米ドルまで）",
    sale: "金額にかかわらず関税がかかる（2025年8月に少額の免税が停止）",
    duty: "日本製の品物は2026年7月24日から最低12.5%。本・CDなどの情報資料は対象外",
    procedure: "100米ドルを超える物・売った物は、アメリカの税関が認めた事業者のアプリで関税を先に払い、日本郵便が指定する郵便局から出す",
  },
  CA: {
    gift: "60カナダドル以下の贈り物は税なし。超えた分に税がかかる",
    sale: "20カナダドルを超えると税がかかる",
    duty: "売上税（GST・HST・州税）は州によって5〜15%。関税は品目による（この計算に含めない）",
    procedure: "税がかかる荷物には、カナダ郵便の手数料9.95カナダドルが別にかかる",
  },
  GB: {
    gift: "39ポンド以下の贈り物は付加価値税なし。関税は135ポンドを超えたときだけ",
    sale: "付加価値税20%がかかる。関税は135ポンドを超えたときだけ",
    duty: "付加価値税は品物代と送料の合計にかかる",
    procedure: "135ポンドまでの関税の免除は、遅くとも2028年10月になくなる予定",
  },
  DE: {
    gift: "45ユーロ以下の個人間の贈り物は税なし。45ユーロを超えると付加価値税と関税（品目による）",
    sale: "付加価値税19%に加え、150ユーロ未満の通販の品は内容品ごとに3ユーロの関税",
    duty: "付加価値税は品物代と送料の合計にかかる",
    procedure: "2026年7月1日に150ユーロ未満の免税が廃止された",
  },
  FR: {
    gift: "45ユーロ以下の個人間の贈り物は税なし。45ユーロを超えると付加価値税と関税（品目による）",
    sale: "付加価値税20%に加え、150ユーロ未満の通販の品は内容品ごとに3ユーロの関税",
    duty: "付加価値税は品物代と送料の合計にかかる",
    procedure: "2026年7月1日に150ユーロ未満の免税が廃止された",
  },
  AU: {
    gift: "贈り物の特例は無い（2008年に廃止）。郵便で届く1,000豪ドル以下の荷物は国境で税がかからない",
    sale: "1,000豪ドル以下は国境で税がかからない（登録した海外の売り手は販売時に消費税を集める）",
    duty: "1,000豪ドルを超えると消費税10%と関税（品目による）",
    procedure: "",
  },
  SG: {
    gift: "郵便・航空で届く品は、品物代・送料・保険の合計が400シンガポールドル以下なら消費税なし",
    sale: "合計400シンガポールドル以下なら国境では消費税なし（登録した海外の売り手は販売時に集める）",
    duty: "400シンガポールドルを超えると、合計の全額に消費税9%",
    procedure: "",
  },
  HK: {
    gift: "酒・たばこ・燃料油・メチルアルコール以外は税がない",
    sale: "酒・たばこ・燃料油・メチルアルコール以外は税がない",
    duty: "",
    procedure: "",
  },
  CN: {
    gift: "個人の郵便物は、税額が50元以下なら免税。日本からは1回1,000元まで（分けられない1点の品は例外）",
    sale: "個人の郵便物は、税額が50元以下なら免税。日本からは1回1,000元まで",
    duty: "税率は品目で決まる：本・おもちゃ・食品などは13%、服などの繊維製品や電気製品は20%、化粧品・酒・たばこは50%",
    procedure: "1,000元を超えると、送り返すか、貨物として通関する手続きが必要になる",
  },
  KR: {
    gift: "自分で使う物として受け取る150米ドル以下の品は免税（海外の親族や友人からの郵便の贈り物を含む）",
    sale: "150米ドル以下で自分で使う物は免税",
    duty: "150米ドルを超えると、関税（品目による）と付加価値税10%",
    procedure: "",
  },
  TH: {
    gift: "2026年から、少額の輸入品の免税がなくなった（基準を1,500バーツから1バーツに引き下げ）",
    sale: "2026年から、金額にかかわらず関税と付加価値税7%がかかる",
    duty: "付加価値税7%に加え、関税（品目による）",
    procedure: "",
  },
  VN: {
    gift: "個人への贈り物は、200万ドン以下（または税額が20万ドン未満）なら免税。年4回まで",
    sale: "2025年2月18日に、少額の輸入品の免税（100万ドン以下）が廃止された",
    duty: "付加価値税と関税（品目による。この計算では金額を出さない）",
    procedure: "",
  },
  PH: {
    gift: "1万ペソ以下の品は関税も税もかからない",
    sale: "1万ペソ以下の品は関税も税もかからない",
    duty: "1万ペソを超えると、付加価値税12%と関税（品目による）",
    procedure: "",
  },
  NZ: {
    gift: "1,000ニュージーランドドル以下なら、税関は関税も消費税も集めない（酒・たばこを除く）",
    sale: "1,000ニュージーランドドル以下なら、税関は関税も消費税も集めない（登録した海外の売り手は販売時に消費税を集める）",
    duty: "1,000ニュージーランドドルを超えると、消費税15%と関税（品目による）。税関の手数料（Goods Management Levy）がかかることもある",
    procedure: "",
  },
  TW: {
    gift: "郵便小包は2,000台湾ドル以下なら免税",
    sale: "郵便小包は2,000台湾ドル以下なら免税",
    duty: "2,000台湾ドルを超えると営業税5%と関税（品目による）",
    procedure: "",
  },
};

export const ITEM_TYPES = {
  toy: "おもちゃ・フィギュア・ゲーム機",
  book: "本・雑誌・CD",
  other: "服・お菓子・雑貨・その他",
};

const round = (v) => Math.round(v);
export const yen = (v) => `${Math.round(v).toLocaleString("ja-JP")}円`;

function rateFor(method, zone, weightG) {
  if (!(weightG > 0) || weightG > method.maxG) return null;
  const row = method.rates.find((r) => r.maxG >= weightG);
  return row ? row.z[zone - 1] : null;
}

// 何もしない場合の補償
function coverFor(id, data, weightG, valueJpy) {
  const c = data.cover;
  if (id === "ems") {
    const free = c.ems.freeUpToJpy;
    const need = Math.min(Math.max(valueJpy, 0), c.ems.maxJpy);
    const extra = need > free ? Math.ceil((need - free) / c.ems.perStepJpy) * c.ems.stepFee : 0;
    return { text: `${yen(free)}まで`, extraText: extra ? `中身の値段まで増やすと＋${yen(extra)}` : "" };
  }
  if (id === "parcel_air" || id === "parcel_sea") {
    const band = c.parcelNoInsurance.find(([g]) => weightG <= g);
    return { text: band ? `${yen(band[1])}まで（重さで決まる）` : "―", extraText: `保険を付けられる（2万円までで${yen(c.parcelInsuranceBaseFee)}）` };
  }
  if (id === "small_packet") return { text: "なし", extraText: "保険も付けられない" };
  return { text: "日本郵便の案内に記載なし", extraText: "" };
}

// 受け取る人が払う税の目安（円）。lo と hi が違うときは幅で出す。null は「品目による」で金額を出さない部分がある
function taxFor(code, input, data, shippingJpy) {
  const fx = data.fx.jpyPer;
  const cur = data.countries[code].cur;
  const v = input.valueJpy;
  const local = v / fx[cur];
  const gift = input.kind === "gift";
  const out = (lo, hi, label, extra = "") => ({ lo: round(lo), hi: round(hi ?? lo), label, extra });
  switch (code) {
    case "US": {
      if (gift && local <= 100) return out(0, 0, "かからない（100米ドル以下の贈り物）");
      if (input.item === "book") return out(0, 0, "かからない見込み（本・CDなどは対象外）");
      if (input.item === "toy") return out(v * 0.125, v * 0.125, "関税12.5%");
      return { ...out(v * 0.125, v * 0.125, "関税12.5%以上"), open: true };
    }
    case "CA": {
      const limit = gift ? 60 : 20;
      if (local <= limit) return out(0, 0, gift ? "かからない（60カナダドル以下の贈り物）" : "かからない（20カナダドル以下）");
      const base = gift ? (local - 60) * fx.CAD : v;
      const fee = 9.95 * fx.CAD;
      return { ...out(base * 0.05 + fee, base * 0.15 + fee, "売上税5〜15%＋手数料", "関税は品目による"), open: true };
    }
    case "GB": {
      if (gift && local <= 39) return out(0, 0, "かからない（39ポンド以下の贈り物）");
      const vat = (v + shippingJpy) * 0.2;
      return local > 135 ? { ...out(vat, vat, "付加価値税20%＋関税", "関税は品目による"), open: true } : out(vat, vat, "付加価値税20%");
    }
    case "DE":
    case "FR": {
      const rate = data.countries[code].vat;
      const pct = `${Math.round(rate * 100)}%`;
      if (gift && local <= 45) return out(0, 0, "かからない（45ユーロ以下の贈り物）");
      const vat = (v + shippingJpy) * rate;
      if (gift) return { ...out(vat, vat, `付加価値税${pct}＋関税`, "関税は品目による"), open: true };
      if (local < 150) { const t = vat + 3 * fx.EUR; return out(t, t, `付加価値税${pct}＋3ユーロ`); }
      return { ...out(vat, vat, `付加価値税${pct}＋関税`, "関税は品目による"), open: true };
    }
    case "AU": {
      if (local <= 1000) return out(0, 0, "かからない（1,000豪ドル以下）");
      const gst = (v + shippingJpy) * 0.1;
      return { ...out(gst, gst, "消費税10%＋関税", "関税は品目による"), open: true };
    }
    case "SG": {
      const cif = (v + shippingJpy) / fx.SGD;
      if (cif <= 400) return out(0, 0, "かからない（送料込みで400シンガポールドル以下）");
      const gst = (v + shippingJpy) * 0.09;
      return out(gst, gst, "消費税9%（送料込みの全額に）");
    }
    case "HK":
      return out(0, 0, "かからない");
    case "CN": {
      const [rLo, rHi] = input.item === "other" ? [0.13, 0.2] : [0.13, 0.13];
      const ex = (r) => (local * r <= 50 ? 0 : v * r);
      const lo = ex(rLo), hi = ex(rHi);
      if (hi === 0) return out(0, 0, "かからない（税額50元以下）");
      return out(lo, hi, input.item === "other" ? "輸入税13〜20%（化粧品は50%）" : "輸入税13%");
    }
    case "KR": {
      const usd = v / fx.USD;
      if (usd <= 150) return out(0, 0, "かからない（150米ドル以下）");
      const t = (v + shippingJpy) * 0.1;
      return { ...out(t, t, "付加価値税10%＋関税", "関税は品目による"), open: true };
    }
    case "TH": {
      const t = (v + shippingJpy) * 0.07;
      return { ...out(t, t, "付加価値税7%＋関税", "関税は品目による"), open: true };
    }
    case "VN": {
      if (gift && local <= 2000000) return out(0, 0, "かからない（200万ドン以下の贈り物）");
      return { ...out(0, 0, "付加価値税と関税", "品目による"), open: true, unknown: true };
    }
    case "PH": {
      if (local <= 10000) return out(0, 0, "かからない（1万ペソ以下）");
      const t = (v + shippingJpy) * 0.12;
      return { ...out(t, t, "付加価値税12%＋関税", "関税は品目による"), open: true };
    }
    case "NZ": {
      if (local <= 1000) return out(0, 0, "かからない（1,000NZドル以下）");
      const t = (v + shippingJpy) * 0.15;
      return { ...out(t, t, "消費税15%＋関税", "関税は品目による"), open: true };
    }
    case "TW": {
      if (local <= 2000) return out(0, 0, "かからない（2,000台湾ドル以下）");
      const t = (v + shippingJpy) * 0.05;
      return { ...out(t, t, "営業税5%＋関税", "関税は品目による"), open: true };
    }
  }
  return null;
}

export function calculate(data, input) {
  const c = data.countries[input.country];
  if (!c) throw new Error("unknown country");
  const notes = [];
  const lith = c.lithium ?? { air: false, sea: false };
  const batteryBlocks = (id) => input.lithium && (id === "parcel_sea" ? !lith.sea : !lith.air);
  if (input.lithium) {
    if (!lith.air && !lith.sea) notes.push(`${c.name}へは、日本郵便では電池の入った物を航空便でも船便でも送れません（日本郵便の受付一覧に入っていない国）。国際宅配便（DHL・FedExなど）を検討してください。`);
    else if (!lith.air) notes.push(`${c.name}へは、電池の入った物は日本郵便の航空便・EMSでは送れず、船便だけ受け付けています。`);
    else if (!lith.sea) notes.push(`${c.name}へは、電池の入った物は航空便・EMSなら送れますが、船便では送れません。`);
    notes.push("電池は機器に入っている物に限ります。電池だけやモバイルバッテリーは送れません。");
  }
  const rows = METHOD_ORDER.map((id) => {
    const m = data.methods[id];
    const price = rateFor(m, c.zone, input.weightG);
    let reason = "";
    if (batteryBlocks(id)) reason = "電池入りは不可";
    else if (price == null) reason = input.weightG > m.maxG ? `${m.maxG / 1000}kgまで` : "料金なし";
    const available = !reason;
    const tax = available ? taxFor(input.country, input, data, price) : null;
    const cover = available ? coverFor(id, data, input.weightG, input.valueJpy) : null;
    const std = data.standardDays?.byCountry?.[input.country]?.[id];
    return { id, name: m.name, available, reason, price, days: std ? `標準${std}日` : m.days, tracking: m.tracking, note: m.note ?? "", tax, cover, totalLo: available ? price + tax.lo : null, totalHi: available ? price + tax.hi : null };
  });
  const usable = rows.filter((r) => r.available);
  const cheapest = usable.length ? usable.reduce((a, b) => (b.totalLo < a.totalLo ? b : a)) : null;
  if (input.country === "US") {
    const usd = input.valueJpy / data.fx.jpyPer.USD;
    if (usd > 2500) notes.push("2,500米ドルを超える物は、アメリカで正式な輸入申告が必要になります。");
    else if (!(input.kind === "gift" && usd <= 100)) notes.push(`${RULES.US.procedure}必要があります（日本郵便の国別条件表）。`);
  }
  if (input.country === "CN" && input.valueJpy / data.fx.jpyPer.CNY > 1000) notes.push("中身が1,000元を超えています。中国は日本からの個人の郵便物を1回1,000元までとしていて、超えると送り返すか、貨物としての通関が必要になります（分けられない1点の品は例外）。");
  const r = RULES[input.country];
  return { country: c, rule: r, rows, cheapest, notes, valueLocal: input.valueJpy / data.fx.jpyPer[c.cur] };
}

// 結果の表のHTML。ブラウザとビルドで同じものを出す
export function resultHtml(data, input, res) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const money = (lo, hi) => (lo === hi ? yen(lo) : `${yen(lo)}〜${yen(hi)}`);
  const cur = res.country.cur;
  const head = `<p class="calc-summary">${esc(res.country.name)}へ、${(input.weightG / 1000).toLocaleString("ja-JP")}kg・中身${yen(input.valueJpy)}（約${Math.round(res.valueLocal).toLocaleString("ja-JP")}${esc(cur)}）の${input.kind === "gift" ? "贈り物" : "売った物"}を送る場合</p>`;
  const rows = res.rows
    .map((r) => {
      if (!r.available) return `<tr class="off"><th scope="row">${esc(r.name)}</th><td colspan="5" data-label="">使えない（${esc(r.reason)}）</td></tr>`;
      const best = res.cheapest && res.cheapest.id === r.id ? ' class="best"' : "";
      const tax = r.tax.unknown
        ? `品目による<span class="sub">${esc(r.tax.label)}</span>`
        : `${money(r.tax.lo, r.tax.hi)}${r.tax.open ? "＋α" : ""}<span class="sub">${esc(r.tax.label)}${r.tax.extra ? `。${esc(r.tax.extra)}` : ""}</span>`;
      const cell = (cls, label, html) => `<td class="${cls}" data-label="${label}"><span class="val">${html}</span></td>`;
      return `<tr${best}><th scope="row">${esc(r.name)}${best ? '<span class="tag">合計がいちばん安い</span>' : ""}</th>${cell("right", "送料（送る人）", yen(r.price))}${cell("right", "税の目安（受け取る人）", tax)}${cell("right total", "合計", r.tax.unknown ? `${yen(r.price)}＋税` : `${money(r.totalLo, r.totalHi)}${r.tax.open ? "＋α" : ""}`)}${cell("", "届くまで", `${esc(r.days)}<span class="sub">追跡${r.tracking ? "あり" : "なし"}</span>`)}${cell("", "補償（何もしない場合）", `${esc(r.cover.text)}${r.cover.extraText ? `<span class="sub">${esc(r.cover.extraText)}</span>` : ""}`)}</tr>`;
    })
    .join("");
  const table = `<div class="table-wrap"><table class="calc-table"><thead><tr><th>送り方</th><th class="right">送料（送る人）</th><th class="right">税の目安（受け取る人）</th><th class="right">合計</th><th>届くまで</th><th>補償（何もしない場合）</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const rule = `<ul class="calc-rules"><li>${esc(input.kind === "gift" ? res.rule.gift : res.rule.sale)}</li>${res.rule.duty ? `<li>${esc(res.rule.duty)}</li>` : ""}${res.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
  return head + table + `<h3>${esc(res.country.name)}あての決まり</h3>` + rule;
}
