// マルチエキューブ由来のロッカーデータ（名称・住所・営業時間）を英語表示に変換する。
//
// なぜ必要か: `backend/data/lockers.json` はスクレイプ元が日本語しか提供しないため、
// name / address / business_hours に英語フィールドが存在しない。これをそのまま出すと
// 英語ページのtitle・descriptionまで日本語になり、英語圏の検索結果で意味を成さなくなる。
// 実際に2026-08-23時点で英語1,333ページ中1,243ページに日本語が混入していた。
//
// 方針:
// - ロッカー名は「改札内/改札外」＋「方角・出口・フロア」＋「コインロッカー」という
//   定型構造をしているので、語句辞書の最長一致で置換する
// - **辞書に無い語が残ったら、その部分を捨てて粗い表現に落とす**（例: 「Coin Lockers
//   (Outside the Gates)」）。中途半端に日本語を残すより、英語として読める方を優先する
// - 現地の看板は日本語なので、日本語原文は捨てずに別途「看板表記」として lang="ja" を
//   付けて併記する（呼び出し側の責務）。titleやdescriptionには入れないこと
//
// ⚠ この実装が唯一の変換ロジック。prerender.js とブラウザの両方がこれを共有する。
//   コピーを作ると英語ページの表記がビルド時と実行時でずれる（CLAUDE.md参照）。

import { slugToName } from "../stations.js";

// ひらがな・カタカナ（半角カナ含む）・漢字。ビルドを止める判定に使うので、
// ファイルの文字コードに左右されないようコードポイントで書く
const JAPANESE_RE = /[぀-ゟ゠-ヿㇰ-ㇿｦ-ﾝ一-鿿]/;

/** 日本語（ひらがな・カタカナ・漢字）が含まれるか */
export function hasJapanese(text) {
  return JAPANESE_RE.test(String(text ?? ""));
}

// 改札の内外。ロッカー名・住所の先頭に付き、利用者が最も知りたい情報なので必ず訳す
const GATE_ZONES = [
  { ja: "改札内", en: "Inside the Gates" },
  { ja: "改札外", en: "Outside the Gates" },
];

// 出口・改札・通路・フロアなどの語句辞書。**必ず長い語から順に並べること**（最長一致のため）。
// 固有名詞はヘボン式のローマ字にする（訳語を当てると現地の表記と対応が取れなくなる）。
const PLACE_TERMS = [
  // 東京駅（語が長いので先に置く）
  ["八重洲地下中央口", "Yaesu Underground Central Exit"],
  ["八重洲南口地下", "Yaesu South Exit Underground"],
  ["グランスタ地下北口", "GRANSTA Underground North Exit"],
  ["丸の内南北通路", "Marunouchi North-South Passage"],
  ["丸の内地下北口", "Marunouchi Underground North Exit"],
  ["八重洲地下街", "Yaesu Underground Mall"],
  ["八重洲中央口", "Yaesu Central Exit"],
  ["丸の内中央口", "Marunouchi Central Exit"],
  ["東北･北陸新幹線", "Tohoku / Hokuriku Shinkansen"],
  ["東北・北陸新幹線", "Tohoku / Hokuriku Shinkansen"],
  ["八重洲北口", "Yaesu North Exit"],
  ["八重洲南口", "Yaesu South Exit"],
  ["丸の内南口", "Marunouchi South Exit"],
  ["KITTE丸の内", "KITTE Marunouchi"],
  ["京葉線連絡通路", "Keiyo Line Connecting Passage"],
  ["京葉地下2階", "Keiyo Line B2F"],
  ["京葉線B3F", "Keiyo Line B3F"],
  ["日本橋口", "Nihombashi Exit"],
  ["丸の内B1", "Marunouchi B1"],
  ["総武線", "Sobu Line"],

  // 新幹線・在来線
  ["新幹線中央口改札", "Shinkansen Central Gate"],
  ["新幹線中央口", "Shinkansen Central Exit"],
  ["新幹線改札口", "Shinkansen Gate"],
  ["新幹線改札", "Shinkansen Gate"],
  ["在来線改札口", "Local Line Gate"],
  ["在来東改札", "Local Line East Gate"],

  // 改札（複合語を先に）
  ["中央改札券売機付近", "near the Central Gate Ticket Machines"],
  ["世田谷線改札外降車ホーム付近", "near the Setagaya Line Arrival Platform"],
  ["中央北改札", "Central North Gate"],
  ["中央西改札", "Central West Gate"],
  ["中央1改札", "Central Gate 1"],
  ["中央2改札", "Central Gate 2"],
  ["ルミネ南改札", "LUMINE South Gate"],
  ["汐留地下改札", "Shiodome Underground Gate"],
  ["昭和通り改札", "Showa-dori Gate"],
  ["不忍改札通路", "Shinobazu Gate Passage"],
  ["入谷口改札", "Iriya Gate"],
  ["電気街改札", "Electric Town Gate"],
  ["表参道改札", "Omotesando Gate"],
  ["馬車道改札", "Bashamichi Gate"],
  ["JR方面改札", "JR Lines Gate"],
  ["不忍改札", "Shinobazu Gate"],
  ["公園改札", "Park Gate"],
  ["新南改札", "New South Gate"],
  ["中央改札外", "Outside the Central Gate"],
  ["中央改札口", "Central Gate"],
  ["中央改札", "Central Gate"],
  ["南口改札内", "Inside the South Exit Gate"],
  ["南口改札外", "Outside the South Exit Gate"],
  ["南改札口", "South Gate"],
  ["北改札口", "North Gate"],
  ["東改札口", "East Gate"],
  ["西改札口", "West Gate"],
  ["南口改札", "South Exit Gate"],
  ["北口改札", "North Exit Gate"],
  ["東口改札", "East Exit Gate"],
  ["西口改札", "West Exit Gate"],
  ["南改札", "South Gate"],
  ["北改札", "North Gate"],
  ["東改札", "East Gate"],
  ["西改札", "West Gate"],
  ["改札正面付近", "near the front of the gates"],
  ["改札外券売機付近", "near the ticket machines outside the gates"],

  // 乗換え・連絡通路
  ["京成線のりかえ口", "Keisei Line Transfer"],
  ["東武線連絡通路", "Tobu Line Connecting Passage"],
  ["京葉線連絡通路", "Keiyo Line Connecting Passage"],
  ["京急連絡通路", "Keikyu Connecting Passage"],
  ["6番線乗換え通路", "Platform 6 Transfer Passage"],
  ["5・6番線行きエスカレーター付近", "near the escalator to Platforms 5 and 6"],
  ["4番線ホーム内", "on Platform 4"],
  ["南のりかえ口", "South Transfer"],

  // 通路・コンコース
  ["北地下自由通路", "North Underground Free Passage"],
  ["東西自由通路", "East-West Free Passage"],
  ["中央地下通路", "Central Underground Passage"],
  ["エキュート品川南通路", "ecute Shinagawa South Passage"],
  ["中央北コンコース", "Central North Concourse"],
  ["コンコース大宮側", "Concourse (Omiya side)"],
  ["南口ｺﾝｺｰｽ", "South Exit Concourse"],
  ["1階コンコース", "1F Concourse"],
  ["2Fコンコース", "2F Concourse"],
  ["アトレ通路", "Atre Passage"],
  ["中央通路", "Central Passage"],
  ["自由通路", "Free Passage"],
  ["南通路", "South Passage"],
  ["コンコース", "Concourse"],

  // 出口（固有名詞）
  ["中華街口（北口）", "Chinatown Exit (North Exit)"],
  ["メトロポリタン口", "Metropolitan Exit"],
  ["正面玄関口", "Main Entrance"],
  ["ハチ公口", "Hachiko Exit"],
  ["早稲田口", "Waseda Exit"],
  ["聖橋口", "Hijiribashi Exit"],
  ["四ツ谷口", "Yotsuya Exit"],
  ["赤坂口", "Akasaka Exit"],
  ["麹町口", "Kojimachi Exit"],
  ["博多口", "Hakata Exit"],
  ["八条口", "Hachijo Exit"],
  ["篠原口", "Shinohara Exit"],
  ["浮間口", "Ukima Exit"],
  ["赤羽口", "Akabane Exit"],
  ["銀座口", "Ginza Exit"],
  ["港南口", "Konan Exit"],
  ["公園口", "Park Exit"],

  // 出口（方角）とロータリー
  ["東口ロータリー", "East Exit Rotary"],
  ["西口ロータリー", "West Exit Rotary"],
  ["中央東口B1", "Central East Exit B1"],
  ["中央東(東口B1)", "Central East (East Exit B1)"],
  ["東口(北)", "East Exit (North)"],
  ["北口1階", "North Exit 1F"],
  ["東口1階", "East Exit 1F"],
  ["南口1階", "South Exit 1F"],
  ["東口1F", "East Exit 1F"],
  ["新南口", "New South Exit"],
  ["中央口", "Central Exit"],
  ["東口", "East Exit"],
  ["西口", "West Exit"],
  ["南口", "South Exit"],
  ["北口", "North Exit"],

  // 商業施設
  ["イオンモール仙台上杉", "AEON MALL Sendai Uesugi"],
  ["ALVARIS鎌倉ビル地下1階", "ALVARIS Kamakura Building B1F"],
  ["アトレ吉祥寺東館", "Atre Kichijoji East Building"],
  ["アトレ本館地下1階", "Atre Main Building B1F"],
  ["nonowa東小金井", "nonowa Higashi-Koganei"],
  ["イーサイト高崎", "E'site Takasaki"],
  ["エスパル東館", "S-PAL East Building"],
  ["ペリエ千葉", "Perie Chiba"],
  ["アークロード", "Arc Road"],
  ["エスパル", "S-PAL"],
  ["ルミネ1", "LUMINE 1"],

  // 空港
  ["第1ターミナルビル", "Terminal 1 Building"],
  ["第2ターミナルビル", "Terminal 2 Building"],
  ["中央ターミナル", "Central Terminal"],
  ["南ターミナル", "South Terminal"],
  ["北ターミナル", "North Terminal"],
  ["エアロプラザ", "Aeroplaza"],

  // その他の目印
  ["サービスステーション内", "inside the service station"],
  ["郵便局前", "in front of the post office"],
  ["薬師寺", "Yakushiji Temple"],
  ["入口横", "next to the entrance"],

  // フロア表記
  ["改札外3F", "3F Outside the Gates"],
  ["3階改札外", "3F Outside the Gates"],
  ["改札内B1F", "B1F Inside the Gates"],
  ["地下1階", "B1F"],
  ["地下2階", "B2F"],
  ["1階", "1F"],
  ["2階", "2F"],
  ["3階", "3F"],
  ["中央", "Central"],
];

const COIN_LOCKER_JA = "コインロッカー";

/**
 * ロッカー名の日本語部分を辞書で置換する。
 * 置換しきれなかった場合は日本語が残るので、呼び出し側で捨てる判断をする。
 */
function translatePlaceText(text) {
  let out = String(text ?? "").trim();
  for (const [ja, en] of PLACE_TERMS) {
    if (out.includes(ja)) out = out.split(ja).join(` ${en} `);
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * ロッカー名を表示用の文字列にする。
 *
 * 日本語（lang="ja"）では原文をそのまま返す。英語では
 * 「Coin Lockers – West Exit (Outside the Gates)」のように組み立て、
 * 辞書に無い語が残る場合は場所の詳細を落として「Coin Lockers (Outside the Gates)」にする。
 *
 * @param {string} rawName lockers.json の name
 * @param {string} lang "ja" | "en"
 * @param {{ stationNameJa?: string }} [options] 駅名がロッカー名に含まれる場合に取り除く
 */
export function lockerDisplayName(rawName, lang, options = {}) {
  const name = String(rawName ?? "").trim();
  if (lang !== "en") return name;
  if (!name) return "Coin Lockers";

  // 「明大前駅 コインロッカー」のように駅名が入っている場合、英語では駅名が
  // ページ側（titleや見出し）に必ず出るため重複になる。取り除く
  let rest = name;
  const stationNameJa = options.stationNameJa;
  if (stationNameJa && rest.includes(stationNameJa)) {
    rest = rest.split(stationNameJa).join(" ");
  }

  // 改札の内外を抜き出す
  let zone = null;
  for (const g of GATE_ZONES) {
    if (rest.includes(g.ja)) {
      zone = g.en;
      rest = rest.split(g.ja).join(" ");
      break;
    }
  }

  // 「コインロッカー」自体は英語のラベルにするので取り除く
  rest = rest.split(COIN_LOCKER_JA).join(" ").replace(/\s+/g, " ").trim();

  const detail = translatePlaceText(rest);
  // 辞書で訳しきれなかったら詳細ごと捨てる。日本語を混ぜたまま出さない
  const safeDetail = detail && !hasJapanese(detail) ? detail : "";

  const parts = ["Coin Lockers"];
  if (safeDetail) parts.push(`– ${safeDetail}`);
  if (zone) parts.push(`(${zone})`);
  return parts.join(" ");
}

/**
 * ロッカーの所在説明（address）を表示用にする。
 * 住所は「〇〇駅 改札外 改札正面付近」の形式で、正式な住所ではない（README参照）。
 */
export function lockerDisplayAddress(rawAddress, lang, options = {}) {
  const address = String(rawAddress ?? "").trim();
  if (lang !== "en") return address;
  if (!address) return "";

  let rest = address;
  // 先頭の駅名を英語の駅名に差し替える
  const { stationNameJa, stationNameEn } = options;
  if (stationNameJa && stationNameEn && rest.includes(stationNameJa)) {
    rest = rest.split(stationNameJa).join(" ");
  }

  let zone = null;
  for (const g of GATE_ZONES) {
    if (rest.includes(g.ja)) {
      zone = g.en;
      rest = rest.split(g.ja).join(" ");
      break;
    }
  }
  rest = rest.split(COIN_LOCKER_JA).join(" ").replace(/\s+/g, " ").trim();

  const detail = translatePlaceText(rest);
  const safeDetail = detail && !hasJapanese(detail) ? detail : "";

  const parts = [];
  if (stationNameEn) parts.push(stationNameEn);
  if (zone) parts.push(zone);
  if (safeDetail) parts.push(safeDetail);
  return parts.join(", ");
}

// 営業時間。実データは「初電～終電」が668件・「不明」が121件で、
// 以前の実装が見ていた「終日利用可」は現在1件も無かった（2026-08-23時点）。
// 一部の値は改行区切りで多言語訳を含むので、その場合は英字だけの行を採用する。
const BUSINESS_HOURS = [
  { pattern: /^初電\s*[～〜~]\s*終電$/, key: "businessHours.firstToLastTrain" },
  { pattern: /^終日利用可$/, key: "businessHours.allDay" },
  { pattern: /^不明$/, key: "businessHours.unknown" },
];

/**
 * 営業時間の表示。定型の言い回しだけ辞書で翻訳し、
 * 時刻表記（"5:00〜25:00"等）はそのまま返す。
 */
export function translateBusinessHours(value, t, lang = "ja") {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;

  // 「初電～終電\nFirst train to last train\n首班车到末班车…」のような多言語混在の値。
  // 日本語ページは1行目、英語ページは英字だけの行を使う
  if (raw.includes("\n")) {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lang === "en") {
      const asciiLine = lines.find((l) => !hasJapanese(l) && /^[\x20-\x7E]+$/.test(l));
      if (asciiLine) return asciiLine;
    }
    return translateBusinessHours(lines[0], t, lang);
  }

  for (const { pattern, key } of BUSINESS_HOURS) {
    if (pattern.test(raw)) return t(key);
  }
  // 「初電～22:00」のように片側だけ定型の場合も英語に寄せる
  if (lang === "en") {
    const partial = raw
      .replace(/初電/g, "first train")
      .replace(/終電/g, "last train")
      .replace(/[～〜]/g, " – ");
    if (!hasJapanese(partial)) return partial;
    return t("businessHours.unknown");
  }
  return raw;
}

/**
 * ロッカー1件の表示テキストをまとめて解決する。
 *
 * **prerender.js（ビルド時）とReactコンポーネント（ブラウザ）は必ずこれを使うこと。**
 * どちらかが locker.name をそのまま出すと、静的HTMLとハイドレート後で表示がずれる。
 *
 * @param {object} locker lockers.json の1件
 * @param {string} lang "ja" | "en"
 * @param {(key: string, vars?: object) => string} t 翻訳関数
 */
export function lockerTexts(locker, lang, t) {
  const stationNameJa = slugToName(locker.station_slug, "ja") ?? locker.nearest_station;
  const stationNameEn = slugToName(locker.station_slug, "en") ?? stationNameJa;
  return {
    stationName: lang === "en" ? stationNameEn : stationNameJa,
    name: lockerDisplayName(locker.name, lang, { stationNameJa }),
    address: lockerDisplayAddress(locker.address, lang, { stationNameJa, stationNameEn }),
    hours: translateBusinessHours(locker.business_hours, t, lang),
    // 現地の看板は日本語なので原文も返す。表示するときは lang="ja" を付けること
    signName: locker.name,
  };
}
