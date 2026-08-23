const ALL_DAY_JA = "終日利用可";

// 営業時間の表示：固定的な言い回し（「終日利用可」）だけ辞書で翻訳し、
// 時刻表記（"5:00〜25:00"等）はそのまま返す
export function translateBusinessHours(value, t) {
  return value === ALL_DAY_JA ? t("businessHours.allDay") : value;
}
