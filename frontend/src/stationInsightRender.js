// stationInsightBlocks() が返したブロックを、表示用の文字列の並びに変換する。
//
// prerender.js（HTML文字列を組む）と StationPage.jsx（Reactを描く）で必要な出力の形は
// 違うが、**どの文をどの順で出すかの判断はここ1か所に集約する。** 片方だけ直すと
// 静的HTMLとハイドレート後で本文がずれる（CLAUDE.md参照）。
import { prefectureInsightBlocks, stationInsightBlocks } from "./stationInsight.js";
import { prefectureName, pathForStation } from "./stations.js";

/**
 * 表示用に正規化したブロックを返す。
 *
 * 各要素は次のいずれか:
 *   { type: "p", text }                          段落
 *   { type: "list", text, items: [string] }      導入文＋箇条書き
 *   { type: "links", text, items: [{href,label}] } 導入文＋リンクの箇条書き
 *
 * @param {object} args
 * @param {object[]} args.stationLockers 駅のロッカー全件
 * @param {object[]} args.allLockers 全国のロッカー
 * @param {string} args.stationSlug
 * @param {string} args.stationName 表示用の駅名（言語に合わせて解決済み）
 * @param {string} args.lang
 * @param {(key: string, vars?: object) => string} args.t
 */
export function stationInsightItems({ stationLockers, allLockers, stationSlug, stationName, lang, t }) {
  const blocks = stationInsightBlocks(stationLockers, allLockers, stationSlug);
  const sizeLabel = (sizeType) => t(`lockerDetail.sizeLabel${sizeType}`);

  return blocks.map((block) => {
    if (block.list) {
      return {
        type: "list",
        text: t(block.key),
        items: block.vars.list.map((row) =>
          t("stationInsight.sizeItem", {
            sizeName: sizeLabel(row.sizeType),
            quantity: row.quantity,
            minPrice: row.minPrice,
            count: row.quantity,
          })
        ),
      };
    }

    if (block.alternatives) {
      // 「同じ県で設置箇所が多い駅」への導線。1駅1ロッカーの駅に来た人が
      // 行き止まりにならないようにするためのもの
      return {
        type: "links",
        text: t(block.key, { prefecture: prefectureName(block.prefecture, lang) }),
        items: block.alternatives.map((a) => ({
          href: pathForStation(lang, a.slug),
          label: t("stationInsight.alternativeItem", {
            station: a.name[lang] || a.name.ja,
            count: a.count,
          }),
        })),
      };
    }

    const vars = { ...block.vars, station: stationName };
    if (block.vars?.sizeType) vars.sizeName = sizeLabel(block.vars.sizeType);
    if (block.prefecture) vars.prefecture = prefectureName(block.prefecture, lang);
    return { type: "p", text: t(block.key, vars) };
  });
}

/**
 * 都道府県ページ用。stationInsightItems と同じ形の配列を返す。
 * 使う側（prerender.js / PrefecturePage.jsx）は同じ描画コードで扱える。
 */
export function prefectureInsightItems({ prefectureLockers, allLockers, prefecture, lang, t }) {
  const blocks = prefectureInsightBlocks(prefectureLockers, allLockers, prefecture);
  const label = prefectureName(prefecture, lang);
  const sizeLabel = (sizeType) => t(`lockerDetail.sizeLabel${sizeType}`);

  return blocks.map((block) => {
    if (block.list) {
      return {
        type: "list",
        text: t(block.key),
        items: block.vars.list.map((row) =>
          t("stationInsight.sizeItem", {
            sizeName: sizeLabel(row.sizeType),
            quantity: row.quantity,
            minPrice: row.minPrice,
            count: row.quantity,
          })
        ),
      };
    }
    if (block.alternatives) {
      return {
        type: "links",
        text: t(block.key, { prefecture: label }),
        items: block.alternatives.map((a) => ({
          href: pathForStation(lang, a.slug),
          label: t("stationInsight.alternativeItem", {
            station: a.name[lang] || a.name.ja,
            count: a.count,
          }),
        })),
      };
    }
    return { type: "p", text: t(block.key, { ...block.vars, prefecture: label }) };
  });
}
