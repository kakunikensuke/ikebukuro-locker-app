// 解説記事のブロックを描くための共通ロジック。
// React（components/GuideBlocks.jsx）とプリレンダ（scripts/prerender.js）が
// 同じ結果になるよう、テキストの組み立てとデータ由来の行の計算をここに集約している。
import { LOCKER_SIZES, sizeSummary } from "./lockerSizes.js";
import { guideVars, stationsBySizeQuantity } from "./lockerStats.js";

// プリレンダが埋め込んだ集計値を取り出すためのDOM要素のid。
// #root の外に置く（Reactがマウント時に#rootの中身を捨てるため）
export const GUIDE_DATA_ELEMENT_ID = "guide-data";

export function readEmbeddedGuideData() {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(GUIDE_DATA_ELEMENT_ID);
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

/**
 * 本文の {{変数}} を実データの値に置き換える。
 * 未定義のキーを見つけたら例外にする。静かに空文字になると
 * 「掲載中の箇所は 箇所です」のような壊れた文が本番に出てしまうため
 */
export function fill(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in vars)) {
      throw new Error(`解説記事の変数が未定義です: {{${name}}}`);
    }
    const value = vars[name];
    return typeof value === "number" ? value.toLocaleString("en-US") : String(value);
  });
}

// サイズ表の行。内寸・代表料金・設置駅数をデータから引く。
// LWは事業者ごとに内寸がばらつき代表値を出せないので、その場合は空欄のままにする
export function sizeTableRows(lockers, lang, t) {
  return LOCKER_SIZES.map((size) => {
    const summary = sizeSummary(lockers, size.sizeType);
    return {
      sizeType: size.sizeType,
      name: t(lang, `sizePage.sizeName${size.sizeType}`),
      dimensions: summary.dimensions,
      minPrice: summary.minPrice,
      maxPrice: summary.maxPrice,
      stationCount: summary.stationCount,
      lockerCount: summary.lockerCount,
    };
  });
}

// 指定サイズを置いている駅を設置個数の多い順に。記事から駅ページへの内部リンクになる
export function stationListRows(lockers, sizeType) {
  return stationsBySizeQuantity(lockers, sizeType);
}

/**
 * 記事の描画に必要な値を1つのオブジェクトにまとめる。
 *
 * これをプリレンダ時に計算してHTMLへ埋め込み、Reactはそれを初期値として使う。
 * こうしないと、バックエンドAPIが落ちている間（Renderの無料プランはスリープする）に
 * 集計が空になり、記事に「0円」「0駅」という誤った数字が出てしまう。
 * 読み物として成立させるためのページで嘘の数字を出すのは、無いより悪い。
 */
export function guideData(lockers, lang, t, blocks) {
  const sizes = new Set(blocks.filter((b) => b.type === "stationList").map((b) => b.size));
  const stationRows = {};
  for (const size of sizes) stationRows[size] = stationListRows(lockers, size);

  return {
    vars: guideVars(lockers),
    sizeRows: blocks.some((b) => b.type === "sizeTable") ? sizeTableRows(lockers, lang, t) : [],
    stationRows,
  };
}
