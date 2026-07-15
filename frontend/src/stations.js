// 対応駅の一覧（駅名⇔URLスラッグ⇔地図の中心座標を一元管理）
// slugは backend/data/lockers.json の station_slug と一致させる規約
// kana: 都道府県内であいうえお順に並べ替えるための読み仮名（ひらがな）
// prefecture: 都道府県選択の絞り込みに使う（画面上の絞り込みのみで、URL構造には影響しない）
export const STATIONS = [
  {
    slug: "ikebukuro",
    name: { ja: "池袋駅", en: "Ikebukuro Station" },
    kana: "いけぶくろ",
    prefecture: "東京都",
    center: [35.7295, 139.7109],
  },
  {
    slug: "shinjuku",
    name: { ja: "新宿駅", en: "Shinjuku Station" },
    kana: "しんじゅく",
    prefecture: "東京都",
    center: [35.6896, 139.7006],
  },
  {
    slug: "shibuya",
    name: { ja: "渋谷駅", en: "Shibuya Station" },
    kana: "しぶや",
    prefecture: "東京都",
    center: [35.658, 139.7016],
  },
  {
    slug: "tokyo",
    name: { ja: "東京駅", en: "Tokyo Station" },
    kana: "とうきょう",
    prefecture: "東京都",
    center: [35.6812, 139.7671],
  },
  {
    slug: "shinagawa",
    name: { ja: "品川駅", en: "Shinagawa Station" },
    kana: "しながわ",
    prefecture: "東京都",
    center: [35.6284, 139.7387],
  },
  {
    slug: "ueno",
    name: { ja: "上野駅", en: "Ueno Station" },
    kana: "うえの",
    prefecture: "東京都",
    center: [35.7141, 139.7774],
  },
  {
    slug: "yokohama",
    name: { ja: "横浜駅", en: "Yokohama Station" },
    kana: "よこはま",
    prefecture: "神奈川県",
    center: [35.4657, 139.6222],
  },
  {
    slug: "omiya",
    name: { ja: "大宮駅", en: "Omiya Station" },
    kana: "おおみや",
    prefecture: "埼玉県",
    center: [35.906499, 139.624028],
  },
  {
    slug: "shimbashi",
    name: { ja: "新橋駅", en: "Shimbashi Station" },
    kana: "しんばし",
    prefecture: "東京都",
    center: [35.666445, 139.758429],
  },
  {
    slug: "akihabara",
    name: { ja: "秋葉原駅", en: "Akihabara Station" },
    kana: "あきはばら",
    prefecture: "東京都",
    center: [35.698305, 139.773722],
  },
  {
    slug: "kita-senju",
    name: { ja: "北千住駅", en: "Kita-Senju Station" },
    kana: "きたせんじゅ",
    prefecture: "東京都",
    center: [35.748976, 139.804704],
  },
  {
    slug: "kawasaki",
    name: { ja: "川崎駅", en: "Kawasaki Station" },
    kana: "かわさき",
    prefecture: "神奈川県",
    center: [35.531808, 139.69711],
  },
  {
    slug: "takadanobaba",
    name: { ja: "高田馬場駅", en: "Takadanobaba Station" },
    kana: "たかだのばば",
    prefecture: "東京都",
    center: [35.71311, 139.703925],
  },
  {
    slug: "tachikawa",
    name: { ja: "立川駅", en: "Tachikawa Station" },
    kana: "たちかわ",
    prefecture: "東京都",
    center: [35.697927, 139.414032],
  },
  {
    slug: "osaki",
    name: { ja: "大崎駅", en: "Osaki Station" },
    kana: "おおさき",
    prefecture: "東京都",
    center: [35.619669, 139.728642],
  },
  {
    slug: "hamamatsucho",
    name: { ja: "浜松町駅", en: "Hamamatsucho Station" },
    kana: "はままつちょう",
    prefecture: "東京都",
    center: [35.655557, 139.757181],
  },
  {
    slug: "nakano",
    name: { ja: "中野駅", en: "Nakano Station" },
    kana: "なかの",
    prefecture: "東京都",
    center: [35.705692, 139.666927],
  },
  {
    slug: "kichijoji",
    name: { ja: "吉祥寺駅", en: "Kichijoji Station" },
    kana: "きちじょうじ",
    prefecture: "東京都",
    center: [35.703158, 139.580234],
  },
  {
    slug: "yurakucho",
    name: { ja: "有楽町駅", en: "Yurakucho Station" },
    kana: "ゆうらくちょう",
    prefecture: "東京都",
    center: [35.674655, 139.762837],
  },
  {
    slug: "ebisu",
    name: { ja: "恵比寿駅", en: "Ebisu Station" },
    kana: "えびす",
    prefecture: "東京都",
    center: [35.646733, 139.710153],
  },
  {
    slug: "tamachi",
    name: { ja: "田町駅", en: "Tamachi Station" },
    kana: "たまち",
    prefecture: "東京都",
    center: [35.64569, 139.747583],
  },
  {
    slug: "kamata",
    name: { ja: "蒲田駅", en: "Kamata Station" },
    kana: "かまた",
    prefecture: "東京都",
    center: [35.562261, 139.715768],
  },
  {
    slug: "kashiwa",
    name: { ja: "柏駅", en: "Kashiwa Station" },
    kana: "かしわ",
    prefecture: "千葉県",
    center: [35.861908, 139.970781],
  },
  {
    slug: "musashi-kosugi",
    name: { ja: "武蔵小杉駅", en: "Musashi-Kosugi Station" },
    kana: "むさしこすぎ",
    prefecture: "神奈川県",
    center: [35.575944, 139.660799],
  },
  {
    slug: "gotanda",
    name: { ja: "五反田駅", en: "Gotanda Station" },
    kana: "ごたんだ",
    prefecture: "東京都",
    center: [35.62623, 139.723632],
  },
  {
    slug: "nippori",
    name: { ja: "日暮里駅", en: "Nippori Station" },
    kana: "にっぽり",
    prefecture: "東京都",
    center: [35.728153, 139.770553],
  },
  {
    slug: "chiba",
    name: { ja: "千葉駅", en: "Chiba Station" },
    kana: "ちば",
    prefecture: "千葉県",
    center: [35.612936, 140.113384],
  },
  {
    slug: "fujisawa",
    name: { ja: "藤沢駅", en: "Fujisawa Station" },
    kana: "ふじさわ",
    prefecture: "神奈川県",
    center: [35.338688, 139.487515],
  },
  {
    slug: "kokubunji",
    name: { ja: "国分寺駅", en: "Kokubunji Station" },
    kana: "こくぶんじ",
    prefecture: "東京都",
    center: [35.700071, 139.48041],
  },
  {
    slug: "totsuka",
    name: { ja: "戸塚駅", en: "Totsuka Station" },
    kana: "とつか",
    prefecture: "神奈川県",
    center: [35.400672, 139.533951],
  },
  {
    slug: "machida",
    name: { ja: "町田駅", en: "Machida Station" },
    kana: "まちだ",
    prefecture: "東京都",
    center: [35.542074, 139.445578],
  },
  {
    slug: "akabane",
    name: { ja: "赤羽駅", en: "Akabane Station" },
    kana: "あかばね",
    prefecture: "東京都",
    center: [35.777658, 139.721008],
  },
  {
    slug: "meguro",
    name: { ja: "目黒駅", en: "Meguro Station" },
    kana: "めぐろ",
    prefecture: "東京都",
    center: [35.634092, 139.71579],
  },
  {
    slug: "sendai",
    name: { ja: "仙台駅", en: "Sendai Station" },
    kana: "せんだい",
    prefecture: "宮城県",
    center: [38.260516, 140.882226],
  },
  {
    slug: "ofuna",
    name: { ja: "大船駅", en: "Ofuna Station" },
    kana: "おおふな",
    prefecture: "神奈川県",
    center: [35.35414, 139.531221],
  },
  {
    slug: "urawa",
    name: { ja: "浦和駅", en: "Urawa Station" },
    kana: "うらわ",
    prefecture: "埼玉県",
    center: [35.858858, 139.657312],
  },
  {
    slug: "kanda",
    name: { ja: "神田駅", en: "Kanda Station" },
    kana: "かんだ",
    prefecture: "東京都",
    center: [35.691832, 139.770975],
  },
  {
    slug: "matsudo",
    name: { ja: "松戸駅", en: "Matsudo Station" },
    kana: "まつど",
    prefecture: "千葉県",
    center: [35.785237, 139.901071],
  },
  {
    slug: "nishi-nippori",
    name: { ja: "西日暮里駅", en: "Nishi-Nippori Station" },
    kana: "にしにっぽり",
    prefecture: "東京都",
    center: [35.732102, 139.767054],
  },
  {
    slug: "tsudanuma",
    name: { ja: "津田沼駅", en: "Tsudanuma Station" },
    kana: "つだぬま",
    prefecture: "千葉県",
    center: [35.691034, 140.020364],
  },
  {
    slug: "yotsuya",
    name: { ja: "四ツ谷駅", en: "Yotsuya Station" },
    kana: "よつや",
    prefecture: "東京都",
    center: [35.685907, 139.730326],
  },
  {
    slug: "ochanomizu",
    name: { ja: "御茶ノ水駅", en: "Ochanomizu Station" },
    kana: "おちゃのみず",
    prefecture: "東京都",
    center: [35.699616, 139.76512],
  },
  {
    slug: "oimachi",
    name: { ja: "大井町駅", en: "Oimachi Station" },
    kana: "おおいまち",
    prefecture: "東京都",
    center: [35.607556, 139.73414],
  },
  {
    slug: "mitaka",
    name: { ja: "三鷹駅", en: "Mitaka Station" },
    kana: "みたか",
    prefecture: "東京都",
    center: [35.702644, 139.561],
  },
  {
    slug: "omori",
    name: { ja: "大森駅", en: "Omori Station" },
    kana: "おおもり",
    prefecture: "東京都",
    center: [35.588397, 139.728063],
  },
  {
    slug: "ogikubo",
    name: { ja: "荻窪駅", en: "Ogikubo Station" },
    kana: "おぎくぼ",
    prefecture: "東京都",
    center: [35.704451, 139.61981],
  },
  {
    slug: "maihama",
    name: { ja: "舞浜駅", en: "Maihama Station" },
    kana: "まいはま",
    prefecture: "千葉県",
    center: [35.636131, 139.883832],
  },
  {
    slug: "musashi-mizonokuchi",
    name: { ja: "武蔵溝ノ口駅", en: "Musashi-Mizonokuchi Station" },
    kana: "むさしみぞのくち",
    prefecture: "神奈川県",
    center: [35.598997, 139.611155],
  },
  {
    slug: "noborito",
    name: { ja: "登戸駅", en: "Noborito Station" },
    kana: "のぼりと",
    prefecture: "神奈川県",
    center: [35.620664, 139.570106],
  },
  {
    slug: "hachioji",
    name: { ja: "八王子駅", en: "Hachioji Station" },
    kana: "はちおうじ",
    prefecture: "東京都",
    center: [35.655308, 139.338921],
  },
  {
    slug: "kawaguchi",
    name: { ja: "川口駅", en: "Kawaguchi Station" },
    kana: "かわぐち",
    prefecture: "埼玉県",
    center: [35.801959, 139.717574],
  },
  {
    slug: "shin-koiwa",
    name: { ja: "新小岩駅", en: "Shin-Koiwa Station" },
    kana: "しんこいわ",
    prefecture: "東京都",
    center: [35.716828, 139.857821],
  },
  {
    slug: "sakuragicho",
    name: { ja: "桜木町駅", en: "Sakuragicho Station" },
    kana: "さくらぎちょう",
    prefecture: "神奈川県",
    center: [35.450924, 139.63094],
  },
  {
    slug: "tsurumi",
    name: { ja: "鶴見駅", en: "Tsurumi Station" },
    kana: "つるみ",
    prefecture: "神奈川県",
    center: [35.508368, 139.676278],
  },
  {
    slug: "suidobashi",
    name: { ja: "水道橋駅", en: "Suidobashi Station" },
    kana: "すいどうばし",
    prefecture: "東京都",
    center: [35.702051, 139.753386],
  },
  {
    slug: "iidabashi",
    name: { ja: "飯田橋駅", en: "Iidabashi Station" },
    kana: "いいだばし",
    prefecture: "東京都",
    center: [35.700473, 139.744014],
  },
  {
    slug: "harajuku",
    name: { ja: "原宿駅", en: "Harajuku Station" },
    kana: "はらじゅく",
    prefecture: "東京都",
    center: [35.670632, 139.70258],
  },
  {
    slug: "sugamo",
    name: { ja: "巣鴨駅", en: "Sugamo Station" },
    kana: "すがも",
    prefecture: "東京都",
    center: [35.733491, 139.739674],
  },
  {
    slug: "musashi-sakai",
    name: { ja: "武蔵境駅", en: "Musashi-Sakai Station" },
    kana: "むさしさかい",
    prefecture: "東京都",
    center: [35.701931, 139.543866],
  },
  {
    slug: "okachimachi",
    name: { ja: "御徒町駅", en: "Okachimachi Station" },
    kana: "おかちまち",
    prefecture: "東京都",
    center: [35.707371, 139.774743],
  },
  {
    slug: "hashimoto",
    name: { ja: "橋本駅", en: "Hashimoto Station" },
    kana: "はしもと",
    prefecture: "神奈川県",
    center: [35.594817, 139.344868],
  },
  {
    slug: "oji",
    name: { ja: "王子駅", en: "Oji Station" },
    kana: "おうじ",
    prefecture: "東京都",
    center: [35.753294, 139.737271],
  },
  {
    slug: "kaihin-makuhari",
    name: { ja: "海浜幕張駅", en: "Kaihin-Makuhari Station" },
    kana: "かいひんまくはり",
    prefecture: "千葉県",
    center: [35.648083, 140.042184],
  },
  {
    slug: "musashi-koganei",
    name: { ja: "武蔵小金井駅", en: "Musashi-Koganei Station" },
    kana: "むさしこがねい",
    prefecture: "東京都",
    center: [35.701258, 139.506627],
  },
  {
    slug: "hiratsuka",
    name: { ja: "平塚駅", en: "Hiratsuka Station" },
    kana: "ひらつか",
    prefecture: "神奈川県",
    center: [35.327666, 139.350511],
  },
  {
    slug: "yoyogi",
    name: { ja: "代々木駅", en: "Yoyogi Station" },
    kana: "よよぎ",
    prefecture: "東京都",
    center: [35.683007, 139.702086],
  },
  {
    slug: "ichikawa",
    name: { ja: "市川駅", en: "Ichikawa Station" },
    kana: "いちかわ",
    prefecture: "千葉県",
    center: [35.729107, 139.907947],
  },
  {
    slug: "tsujido",
    name: { ja: "辻堂駅", en: "Tsujido Station" },
    kana: "つじどう",
    prefecture: "神奈川県",
    center: [35.336846, 139.447198],
  },
  {
    slug: "nagatsuta",
    name: { ja: "長津田駅", en: "Nagatsuta Station" },
    kana: "ながつた",
    prefecture: "神奈川県",
    center: [35.531705, 139.495186],
  },
  {
    slug: "warabi",
    name: { ja: "蕨駅", en: "Warabi Station" },
    kana: "わらび",
    prefecture: "埼玉県",
    center: [35.827716, 139.690787],
  },
  {
    slug: "minami-urawa",
    name: { ja: "南浦和駅", en: "Minami-Urawa Station" },
    kana: "みなみうらわ",
    prefecture: "埼玉県",
    center: [35.847881, 139.669206],
  },
  {
    slug: "motoyawata",
    name: { ja: "本八幡駅", en: "Motoyawata Station" },
    kana: "もとやわた",
    prefecture: "千葉県",
    center: [35.720983, 139.927267],
  },
  {
    slug: "kameido",
    name: { ja: "亀戸駅", en: "Kameido Station" },
    kana: "かめいど",
    prefecture: "東京都",
    center: [35.697302, 139.826749],
  },
  {
    slug: "nishi-kawaguchi",
    name: { ja: "西川口駅", en: "Nishi-Kawaguchi Station" },
    kana: "にしかわぐち",
    prefecture: "埼玉県",
    center: [35.815661, 139.704536],
  },
  {
    slug: "otsuka",
    name: { ja: "大塚駅", en: "Otsuka Station" },
    kana: "おおつか",
    prefecture: "東京都",
    center: [35.731624, 139.72877],
  },
  {
    slug: "saitama-shintoshin",
    name: { ja: "さいたま新都心駅", en: "Saitama-Shintoshin Station" },
    kana: "さいたましんとしん",
    prefecture: "埼玉県",
    center: [35.893528, 139.633849],
  },
  {
    slug: "kannai",
    name: { ja: "関内駅", en: "Kannai Station" },
    kana: "かんない",
    prefecture: "神奈川県",
    center: [35.443893, 139.636399],
  },
  {
    slug: "chigasaki",
    name: { ja: "茅ケ崎駅", en: "Chigasaki Station" },
    kana: "ちがさき",
    prefecture: "神奈川県",
    center: [35.330657, 139.406554],
  },
  {
    slug: "higashi-totsuka",
    name: { ja: "東戸塚駅", en: "Higashi-Totsuka Station" },
    kana: "ひがしとつか",
    prefecture: "神奈川県",
    center: [35.430381, 139.556676],
  },
  {
    slug: "shin-urayasu",
    name: { ja: "新浦安駅", en: "Shin-Urayasu Station" },
    kana: "しんうらやす",
    prefecture: "千葉県",
    center: [35.649382, 139.912333],
  },
  {
    slug: "ichigaya",
    name: { ja: "市ケ谷駅", en: "Ichigaya Station" },
    kana: "いちがや",
    prefecture: "東京都",
    center: [35.691095, 139.735542],
  },
  {
    slug: "musashi-urawa",
    name: { ja: "武蔵浦和駅", en: "Musashi-Urawa Station" },
    kana: "むさしうらわ",
    prefecture: "埼玉県",
    center: [35.845325, 139.647015],
  },
  {
    slug: "asakusabashi",
    name: { ja: "浅草橋駅", en: "Asakusabashi Station" },
    kana: "あさくさばし",
    prefecture: "東京都",
    center: [35.697488, 139.785952],
  },
  {
    slug: "kanamachi",
    name: { ja: "金町駅", en: "Kanamachi Station" },
    kana: "かなまち",
    prefecture: "東京都",
    center: [35.769753, 139.870812],
  },
  {
    slug: "kunitachi",
    name: { ja: "国立駅", en: "Kunitachi Station" },
    kana: "くにたち",
    prefecture: "東京都",
    center: [35.699234, 139.446219],
  },
  {
    slug: "kita-urawa",
    name: { ja: "北浦和駅", en: "Kita-Urawa Station" },
    kana: "きたうらわ",
    prefecture: "埼玉県",
    center: [35.872125, 139.646397],
  },
  {
    slug: "koenji",
    name: { ja: "高円寺駅", en: "Koenji Station" },
    kana: "こうえんじ",
    prefecture: "東京都",
    center: [35.705453, 139.650098],
  },
  {
    slug: "inage",
    name: { ja: "稲毛駅", en: "Inage Station" },
    kana: "いなげ",
    prefecture: "千葉県",
    center: [35.636869, 140.092427],
  },
  {
    slug: "komagome",
    name: { ja: "駒込駅", en: "Komagome Station" },
    kana: "こまごめ",
    prefecture: "東京都",
    center: [35.737015, 139.748195],
  },
  {
    slug: "nishi-ogikubo",
    name: { ja: "西荻窪駅", en: "Nishi-Ogikubo Station" },
    kana: "にしおぎくぼ",
    prefecture: "東京都",
    center: [35.703832, 139.599905],
  },
];

// 都道府県選択の絞り込み用（現時点の対応駅がある都道府県のみ）。
// 表示順は関東の主要都県を先に、対応駅数が最も少ない宮城県（仙台駅のみ）を末尾に置く。
export const PREFECTURES = ["東京都", "神奈川県", "埼玉県", "千葉県", "宮城県"];

export function stationsInPrefecture(prefecture) {
  return STATIONS.filter((s) => s.prefecture === prefecture).sort((a, b) =>
    a.kana.localeCompare(b.kana, "ja")
  );
}

export function prefectureForSlug(slug) {
  return STATIONS.find((s) => s.slug === slug)?.prefecture;
}

// 英語ページでの都道府県名表示用（施設名・住所は翻訳しない方針だが、都道府県名はUI文言に近いため英訳する）
const PREFECTURE_EN = {
  "東京都": "Tokyo",
  "神奈川県": "Kanagawa",
  "埼玉県": "Saitama",
  "千葉県": "Chiba",
  "宮城県": "Miyagi",
};

export function prefectureName(prefecture, lang = "ja") {
  return lang === "en" ? PREFECTURE_EN[prefecture] || prefecture : prefecture;
}

export function slugToName(slug, lang = "ja") {
  const station = STATIONS.find((s) => s.slug === slug);
  return station ? station.name[lang] || station.name.ja : undefined;
}

export function centerForSlug(slug) {
  return STATIONS.find((s) => s.slug === slug)?.center;
}

// 日本語はプレフィックスなし（既定言語）、英語は/enを付ける
export function langPrefix(lang) {
  return lang === "en" ? "/en" : "";
}

export function pathForStation(lang, slug) {
  return `${langPrefix(lang)}/${slug}`;
}

export function pathForLocker(lang, slug, facilityId) {
  return `${pathForStation(lang, slug)}/lockers/${facilityId}`;
}

// 2点間の距離(km)をハバーサイン公式で算出。並び替え機能（駅から近い順）で使用
export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
