// 「その荷物がロッカーに入るか」の判定。駅ページ・ロッカー一覧・荷物から探すページが共有する唯一の実装。
//
// **サイズ名（S/M/L）ではなく実際の内寸で判定すること。** 事業者によって同じ「Lサイズ」でも
// 高さが86cm（マルチエキューブ）と50cm台（一部の私鉄）で違う。サイズ名で判定すると、
// 入らないロッカーを「スーツケースが入る」と案内してしまう。
//
// 判定は3辺をそれぞれ小さい順に並べて比べる。荷物を立てても寝かせてもよい前提（向きを
// 6通り試すのと同じ結果になる）。斜めに入れる置き方は考えない（安全側）。

// 代表的な荷物の外寸（cm）。キャスター・取っ手を含めた外寸の一般的な値。
// 機内持ち込みは国内線・国際線とも多くの航空会社が「3辺の合計115cm以内」で、55×40×25がその代表
export const LUGGAGE = [
  { id: "backpack", dims: [50, 32, 20] }, // リュック（30L程度）
  { id: "carryon", dims: [55, 40, 25] }, // 機内持ち込みサイズのスーツケース
  // 60〜70Lの実寸は高さ60〜68cm。65cmにするとMロッカー（奥行65cm）にぴったり入る判定になり、
  // 実際には入らない製品が多いのに「入る」と言ってしまうので、中ほどの67cmで判定する
  { id: "checkedM", dims: [67, 47, 28] }, // 預け入れMサイズ（60〜70L・3〜5泊）
  { id: "checkedL", dims: [75, 52, 30] }, // 預け入れLサイズ（80L以上・1週間以上）
];

/**
 * 内寸の表記を cm の3辺に直す。読めなければ null。
 * - "34×65×33cm"
 * - "342〜355×575〜663×843〜1135mm"（幅のある表記は小さい方を使う。大きい方で判定すると
 *   その駅のロッカーによっては入らないのに「入る」と言ってしまうため）
 */
export function parseDimensions(text) {
  if (!text) return null;
  const s = String(text).replace(/\s/g, "");
  const unit = /mm$/.test(s) ? 0.1 : /cm$/.test(s) ? 1 : null;
  if (unit === null) return null;
  const parts = s.replace(/(mm|cm)$/, "").split(/[×x]/);
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => Number(p.split(/[〜~]/)[0]));
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return nums.map((n) => Math.round(n * unit * 10) / 10);
}

/** 荷物が箱に入るか。どちらも3辺（cm） */
export function fits(box, item) {
  if (!box || !item) return false;
  const b = [...box].sort((x, y) => x - y);
  const it = [...item].sort((x, y) => x - y);
  return it.every((v, i) => v <= b[i]);
}

/**
 * その内寸に入る一番大きい代表的な荷物の id。何も入らなければ "small"、内寸が不明なら null。
 * 「入る」ものの中で最大を返すので、表示は「〇〇まで入る」になる
 */
export function largestLuggage(dimensionsText) {
  const box = parseDimensions(dimensionsText);
  if (!box) return null;
  let best = "small";
  for (const l of LUGGAGE) if (fits(box, l.dims)) best = l.id;
  return best;
}

/** ロッカー1か所（複数サイズを持つ）で入る一番大きい荷物。どのサイズも内寸不明なら null */
export function largestLuggageForLocker(locker) {
  const order = ["small", ...LUGGAGE.map((l) => l.id)];
  let best = null;
  for (const s of locker.sizes ?? []) {
    if (!(s.quantity > 0)) continue;
    const id = largestLuggage(s.dimensions);
    if (id && (best === null || order.indexOf(id) > order.indexOf(best))) best = id;
  }
  return best;
}

/**
 * 内寸の高さ（cm）。表記は「幅×奥行×高さ」の順（マルチエキューブも私鉄も同じ）。
 * サイズ図で扉の高さを決めるのに使う
 */
export function doorHeight(dimensionsText) {
  const box = parseDimensions(dimensionsText);
  return box ? box[2] : null;
}
