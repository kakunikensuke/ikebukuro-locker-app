// 都道府県のタイル地図（47の正方形を、おおよその位置に並べる）。記事の ```tilemap <データのキー> | <見出し> で使う。
// 色は「その県でいちばん多かったチェーン」。多いチェーンから6つまで色を付け、残りは「その他」、同数は「同数」にする。

// [列, 行]
const TILES = {
  北海道: [11, 0], 青森県: [11, 1], 秋田県: [10, 2], 岩手県: [11, 2],
  石川県: [8, 3], 新潟県: [9, 3], 山形県: [10, 3], 宮城県: [11, 3],
  福井県: [7, 4], 富山県: [8, 4], 長野県: [9, 4], 福島県: [10, 4],
  島根県: [3, 5], 鳥取県: [4, 5], 兵庫県: [5, 5], 京都府: [6, 5], 滋賀県: [7, 5], 岐阜県: [8, 5], 群馬県: [9, 5], 栃木県: [10, 5], 茨城県: [11, 5],
  山口県: [2, 6], 広島県: [3, 6], 岡山県: [4, 6], 大阪府: [5, 6], 奈良県: [6, 6], 三重県: [7, 6], 愛知県: [8, 6], 山梨県: [9, 6], 埼玉県: [10, 6],
  佐賀県: [0, 7], 福岡県: [1, 7], 大分県: [2, 7], 愛媛県: [3, 7], 香川県: [4, 7], 和歌山県: [5, 7], 静岡県: [8, 7], 神奈川県: [9, 7], 東京都: [10, 7], 千葉県: [11, 7],
  長崎県: [0, 8], 熊本県: [1, 8], 宮崎県: [2, 8], 高知県: [3, 8], 徳島県: [4, 8],
  鹿児島県: [1, 9],
  沖縄県: [0, 10],
};
if (Object.keys(TILES).length !== 47) throw new Error("tilemap: 47都道府県ではありません");

// 藍・山吹を先頭に、落ち着いた和の色を並べる（サイトの色の決まりの中で、地図の凡例だけに使う）
const PALETTE = ["#1f3a5f", "#e9a92c", "#4f9fb0", "#b5533c", "#7d8f4e", "#8a77b0"];
const OTHER = "#a9b3bd";
const TIE = "#dfe4ea";
const NONE = "transparent";

const short = (p) => (p === "北海道" ? p : p.replace(/[都府県]$/, ""));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function textColor(hex) {
  if (!hex.startsWith("#")) return "var(--ink)";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.6 ? "#141c26" : "#ffffff";
}

export function renderTilemap(data, key, caption) {
  const prefs = data[key];
  if (!prefs) throw new Error(`tilemap: データ ${key} がありません`);
  for (const p of Object.keys(TILES)) if (!prefs[p]) throw new Error(`tilemap: ${key} に ${p} がありません`);
  // 1位になった県の数が多い順に色を割り当てる
  const wins = {};
  for (const v of Object.values(prefs)) if (v.top) wins[v.top] = (wins[v.top] || 0) + 1;
  const ranked = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  const colored = ranked.slice(0, PALETTE.length).map(([name], i) => [name, PALETTE[i]]);
  const colorOf = Object.fromEntries(colored);
  const others = ranked.slice(PALETTE.length);
  const fillOf = (v) => (v.top ? colorOf[v.top] ?? OTHER : v.tie ? TIE : NONE);
  const S = 44, G = 3;
  const tiles = Object.entries(TILES)
    .map(([p, [c, r]]) => {
      const v = prefs[p];
      const fill = fillOf(v);
      const label = v.top ? v.top : v.tie ? `同数（${v.tie.join("・")}）` : "チェーンの店が見つからない";
      const x = c * S, y = r * S;
      return `<g><title>${esc(p)}：${esc(label)}（${v.stations}駅）</title><rect x="${x + G / 2}" y="${y + G / 2}" width="${S - G}" height="${S - G}" rx="4" fill="${fill}"${fill === NONE ? ' stroke="var(--line)" stroke-dasharray="3 2"' : ""}/><text x="${x + S / 2}" y="${y + S / 2 + 4}" text-anchor="middle" font-size="${short(p).length > 2 ? 10.5 : 12}" fill="${fill === NONE || fill === TIE ? "var(--ink)" : textColor(fill)}">${esc(short(p))}</text></g>`;
    })
    .join("");
  const legendItems = [
    ...colored.map(([name, col]) => [col, `${name}（${wins[name]}）`]),
    ...(others.length ? [[OTHER, `その他のチェーン（${others.map(([n, k]) => `${n}${k}`).join("、")}）`]] : []),
    ...(Object.values(prefs).some((v) => v.tie) ? [[TIE, `同数で並ぶ（${Object.values(prefs).filter((v) => v.tie).length}）`]] : []),
    ...(Object.values(prefs).some((v) => !v.top && !v.tie) ? [[NONE, `見つからない（${Object.values(prefs).filter((v) => !v.top && !v.tie).length}）`]] : []),
  ];
  const legend = legendItems
    .map(([col, text]) => `<li><span class="swatch" style="background:${col}${col === NONE ? ";border:1px dashed var(--line)" : ""}"></span>${esc(text)}</li>`)
    .join("");
  return `<figure class="tilemap"><figcaption>${esc(caption)}</figcaption><svg viewBox="0 0 ${12 * S} ${11 * S}" role="img" aria-label="${esc(caption)}">${tiles}</svg><ul class="tilemap-legend">${legend}</ul><p class="tilemap-note">かっこ内は1位になった都道府県の数。駅が3〜5駅しかない県も多いので、色は傾向として見てください。パソコンでは、県の上にカーソルを置くとチェーン名と駅の数が出ます。</p></figure>\n`;
}
