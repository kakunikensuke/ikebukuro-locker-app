import React from "react";
import { Link } from "react-router-dom";

/**
 * 駅ページ・都道府県ページの解説セクション。
 *
 * **プリレンダ（scripts/prerender.js の insightHtml）と同じ配列を同じ順で描くこと。**
 * Reactは createRoot で #root の中身を丸ごと置き換えるため、ここを実装しないと
 * JSを実行するクローラからは解説が存在しないページに見える。静的HTMLにだけ
 * 本文がある状態は、2026-08-29のAdSense不承認（有用性の低いコンテンツ）の
 * 対応として意味を成さない。
 *
 * @param {object} props
 * @param {string} props.heading 見出し
 * @param {Array} props.items stationInsightItems() / prefectureInsightItems() の戻り値
 */
export default function InsightSection({ heading, items }) {
  if (!items?.length) return null;

  return (
    <section className="station-insight">
      <h2>{heading}</h2>
      {items.map((item, i) => {
        if (item.type === "list") {
          return (
            <div key={i}>
              <p>{item.text}</p>
              <ul>
                {item.items.map((text, j) => (
                  <li key={j}>{text}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (item.type === "links") {
          return (
            <div key={i}>
              <p>{item.text}</p>
              <ul>
                {item.items.map((linkItem, j) => (
                  <li key={j}>
                    <Link to={linkItem.href}>{linkItem.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return <p key={i}>{item.text}</p>;
      })}
    </section>
  );
}
