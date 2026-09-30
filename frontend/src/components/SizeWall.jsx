import React from "react";

// 扉の高さの縮尺（1cm あたりのpx）。L（高さ86cm）が約155pxになる
const PX_PER_CM = 1.8;
const MIN_DOOR = 26;
// 内寸が公開されていないサイズ（東京メトロの料金帯など）は高さが分からないので、
// 実寸と誤解されないよう点線の扉を一定の高さで描く
const UNKNOWN_DOOR = 64;
const SUITCASE = new Set(["checkedM", "checkedL"]);

/**
 * 駅のロッカーのサイズ図。扉の高さを内寸の高さに比例させて並べる（このサイトの顔になる部品）。
 * 扉そのものは飾り（aria-hidden）で、情報は下のラベルに文字で出す。
 *
 * **静的HTML（scripts/prerender.js）には同じ内容を文字の一覧で出している。**
 * doors は stationSummaryItems() の戻り値
 */
export default function SizeWall({ heading, note, doors }) {
  if (!doors?.length) return null;

  const heights = doors.map((d) =>
    d.height !== null ? Math.max(MIN_DOOR, Math.round(d.height * PX_PER_CM)) : UNKNOWN_DOOR
  );
  // 枠の高さはその駅で一番高い扉に合わせる（小さい扉しか無い駅で上が大きく空くため）
  const wallHeight = Math.max(...heights) + 12;

  return (
    <section className="size-wall">
      <h2>{heading}</h2>
      <ul className="size-wall-bank" style={{ "--wall-h": `${wallHeight}px` }}>
        {doors.map((d) => {
          const known = d.height !== null;
          const h = known ? Math.max(MIN_DOOR, Math.round(d.height * PX_PER_CM)) : UNKNOWN_DOOR;
          return (
            <li key={d.sizeType} className="size-wall-slot">
              <div className="size-wall-door-area" aria-hidden="true">
                <div
                  className={`size-wall-door${known ? "" : " is-unknown"}${SUITCASE.has(d.luggage) ? " is-suitcase" : ""}`}
                  style={{ height: `${h}px` }}
                >
                  <span className="size-wall-handle" />
                </div>
              </div>
              <div className="size-wall-label">
                <strong>{d.name}</strong>
                <span>{d.count}</span>
                <span>{d.price}</span>
                {d.heightText && <span>{d.heightText}</span>}
                <span className={`size-wall-fit${SUITCASE.has(d.luggage) ? " is-suitcase" : ""}`}>
                  {d.luggageText}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="size-wall-note">{note}</p>
    </section>
  );
}
