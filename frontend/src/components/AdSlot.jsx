import React from "react";

/**
 * 広告枠のプレースホルダー。
 * 現時点ではAdSense等は未申請のため、実際の広告タグは組み込まず枠のUIのみ用意する。
 * 審査通過後、この中身を実際の広告スクリプト/タグに差し替える想定。
 */
export default function AdSlot({ label = "広告" }) {
  return (
    <div className="ad-slot">
      <span className="ad-slot-label">{label}</span>
    </div>
  );
}
