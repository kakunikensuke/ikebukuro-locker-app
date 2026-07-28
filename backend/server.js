/**
 * コインロッカー検索アプリ バックエンドAPI
 *
 * フェーズ2: GET /api/lockers          -> 地図表示用に全件返す
 * フェーズ3: GET /api/lockers?keyword= -> キーワード・サイズ・料金での検索
 * フェーズ4: GET /api/lockers/:id      -> 詳細（料金・サイズ別個数）
 * フェーズ5: GET /api/stations         -> 対応駅一覧
 *            GET /api/lockers?station= -> 駅での絞り込み（対象エリアの拡大）
 * フェーズ6: GET  /api/lockers/:id/photos -> 周辺写真一覧
 *            POST /api/lockers/:id/photos -> 利用者による周辺写真の投稿
 * フェーズ9: データ自動更新バッチ（仕組みのみ、詳細はscraper/updateLockers.js参照）
 *            更新バッチのスケジューリングはGitHub Actionsの定期実行に委譲しており、
 *            このプロセス内では行わない（無料ホスティングのスリープ中はプロセス内cronが発火しないため）。
 * フェーズ11: POST /api/lockers/submit -> 利用者による「昔ながらのロッカー」等の情報投稿
 *             自動取得データ（lockers.json）とは別ファイル（user-submitted-lockers.json）で管理し、
 *             loadLockers()でマージして返す。自動更新バッチが駅単位で全置換する仕組みのため、
 *             同じファイルに混ぜると次回バッチ実行時に投稿分が消えてしまうことに注意。
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_PATH = path.join(__dirname, "data", "lockers.json");
const USER_SUBMITTED_PATH = path.join(__dirname, "data", "user-submitted-lockers.json");
const PRIVATE_STATIONS_PATH = path.join(__dirname, "data", "private-line-stations.json");
const PHOTOS_DIR = path.join(__dirname, "data", "photos");
const PHOTOS_INDEX_PATH = path.join(__dirname, "data", "photos.json");
const ALLOWED_MIME_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

// フェーズ11: 利用者投稿の入力上限・位置情報の妥当範囲（日本国内の大まかな範囲）
const SUBMIT_NAME_MAX = 100;
const SUBMIT_COMMENT_MAX = 500;
const SUBMIT_ADDRESS_MAX = 200;
const SUBMIT_HOURS_MAX = 100;
const SUBMIT_DETAILS_MAX = 500;
const JAPAN_LAT_RANGE = [20, 46];
const JAPAN_LNG_RANGE = [122, 154];

fs.mkdirSync(PHOTOS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/photos", express.static(PHOTOS_DIR));

function loadAutoLockers() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function loadUserSubmittedLockers() {
  if (!fs.existsSync(USER_SUBMITTED_PATH)) return [];
  return JSON.parse(fs.readFileSync(USER_SUBMITTED_PATH, "utf-8"));
}

function saveUserSubmittedLockers(lockers) {
  fs.writeFileSync(USER_SUBMITTED_PATH, JSON.stringify(lockers, null, 2) + "\n");
}

// 首都圏私鉄・地下鉄駅（マルチエキューブ非対応、ロッカーはユーザー投稿頼み）のslug一覧。
// frontend/src/data/privateLineStations.json と同じ元データから生成した軽量版。
function loadPrivateStationSlugs() {
  if (!fs.existsSync(PRIVATE_STATIONS_PATH)) return [];
  return JSON.parse(fs.readFileSync(PRIVATE_STATIONS_PATH, "utf-8"));
}

// 自動取得データ（マルチエキューブ由来）と利用者投稿データを合わせて返す
function loadLockers() {
  return [...loadAutoLockers(), ...loadUserSubmittedLockers()];
}

function loadPhotoIndex() {
  if (!fs.existsSync(PHOTOS_INDEX_PATH)) return {};
  return JSON.parse(fs.readFileSync(PHOTOS_INDEX_PATH, "utf-8"));
}

function savePhotoIndex(index) {
  fs.writeFileSync(PHOTOS_INDEX_PATH, JSON.stringify(index, null, 2));
}

function getPhotos(facilityId) {
  const index = loadPhotoIndex();
  return index[facilityId] || [];
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTOS_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED_MIME_TYPES[file.mimetype];
      cb(null, `${req.params.id}-${Date.now()}-${crypto.randomUUID()}.${ext}`);
    },
  }),
  // multer(busboy)はfileSizeちょうどのファイルを超過扱いで拒否するため、
  // 「5MB以下」という案内文言どおりの挙動にするには+1して境界を1バイト緩める必要がある
  limits: { fileSize: MAX_PHOTO_SIZE + 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      return cb(new Error("対応していないファイル形式です（JPEG・PNG・WebPのみ）"));
    }
    cb(null, true);
  },
});

// フェーズ5: 対応駅一覧（フロントの駅選択プルダウン用）
// フェーズ7: 多言語化のため日本語名ではなくslugベースで返す（表示名はフロントのstations.jsが多言語で持つ）
app.get("/api/stations", (req, res) => {
  const lockers = loadLockers();
  const seen = new Map();
  for (const l of lockers) {
    if (!seen.has(l.station_slug)) {
      seen.set(l.station_slug, { slug: l.station_slug, name: l.nearest_station });
    }
  }
  res.json({ stations: [...seen.values()] });
});

// フェーズ2・3・5: 一覧取得＋検索（駅／キーワード／サイズ／最大料金でフィルタ）
// フェーズ7: 駅の絞り込みはstation_slugベース（日本語名に依存しない）
app.get("/api/lockers", (req, res) => {
  const { keyword, size, maxPrice, station_slug: stationSlug } = req.query;
  let lockers = loadLockers();

  if (stationSlug) {
    lockers = lockers.filter((l) => l.station_slug === stationSlug);
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    lockers = lockers.filter(
      (l) =>
        l.name.toLowerCase().includes(kw) ||
        l.address.toLowerCase().includes(kw)
    );
  }

  if (size) {
    // 指定サイズを設置しているロッカーのみ（quantityは設置個数。リアルタイムの空き数は扱わない）
    lockers = lockers.filter((l) =>
      l.sizes.some((s) => s.size_type === size.toUpperCase() && s.quantity > 0)
    );
  }

  if (maxPrice) {
    const max = Number(maxPrice);
    lockers = lockers.filter((l) => l.sizes.some((s) => s.price <= max));
  }

  res.json({ count: lockers.length, results: lockers });
});

// フェーズ4: 詳細取得（料金・サイズ別個数を含む）
// フェーズ6: 利用者投稿の周辺写真一覧も併せて返す
app.get("/api/lockers/:id", (req, res) => {
  const lockers = loadLockers();
  const locker = lockers.find((l) => String(l.facility_id) === req.params.id);
  if (!locker) {
    return res.status(404).json({ error: "指定されたロッカーが見つかりません" });
  }
  res.json({ ...locker, photos: getPhotos(req.params.id) });
});

// フェーズ6: 周辺写真一覧
app.get("/api/lockers/:id/photos", (req, res) => {
  const lockers = loadLockers();
  const locker = lockers.find((l) => String(l.facility_id) === req.params.id);
  if (!locker) {
    return res.status(404).json({ error: "指定されたロッカーが見つかりません" });
  }
  res.json({ photos: getPhotos(req.params.id) });
});

// フェーズ6: 利用者による周辺写真の投稿
app.post("/api/lockers/:id/photos", (req, res) => {
  const lockers = loadLockers();
  const locker = lockers.find((l) => String(l.facility_id) === req.params.id);
  if (!locker) {
    return res.status(404).json({ error: "指定されたロッカーが見つかりません" });
  }

  upload.single("photo")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "写真のアップロードに失敗しました" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "写真ファイルが指定されていません" });
    }

    const index = loadPhotoIndex();
    const facilityId = req.params.id;
    const photo = {
      id: crypto.randomUUID(),
      filename: req.file.filename,
      url: `/photos/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
    };
    index[facilityId] = [...(index[facilityId] || []), photo];
    savePhotoIndex(index);

    res.status(201).json({ photos: index[facilityId] });
  });
});

// フェーズ11: 利用者による「昔ながらのロッカー」等の情報投稿
// 写真投稿と同じ方針で承認フローなし・即時反映。悪意ある投稿を検知した場合は
// user-submitted-lockers.jsonから該当エントリを手動で削除して対応する想定。
app.post("/api/lockers/submit", (req, res) => {
  const {
    station_slug: stationSlug,
    nearest_station: nearestStation,
    name,
    comment,
    latitude,
    longitude,
    address,
    business_hours: businessHours,
    details,
  } = req.body || {};

  const errors = [];

  // 実在する駅（自動取得データに含まれる駅）のみ受け付ける。フロントの選択肢は常にこの集合の
  // 範囲内だが、APIを直接叩かれた場合に備え、形式チェックだけでなく実在性もここで担保する。
  const knownStationSlugs = new Set([
    ...loadAutoLockers().map((l) => l.station_slug),
    ...loadPrivateStationSlugs(),
  ]);
  if (!stationSlug || typeof stationSlug !== "string" || !knownStationSlugs.has(stationSlug)) {
    errors.push("駅を選択してください");
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("名称を入力してください");
  } else if (name.length > SUBMIT_NAME_MAX) {
    errors.push(`名称は${SUBMIT_NAME_MAX}文字以内で入力してください`);
  }
  if (!comment || typeof comment !== "string" || !comment.trim()) {
    errors.push("コメントを入力してください");
  } else if (comment.length > SUBMIT_COMMENT_MAX) {
    errors.push(`コメントは${SUBMIT_COMMENT_MAX}文字以内で入力してください`);
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || lat < JAPAN_LAT_RANGE[0] || lat > JAPAN_LAT_RANGE[1]) {
    errors.push("位置情報が取得できませんでした。地図上でピンを立て直してください");
  }
  if (!Number.isFinite(lng) || lng < JAPAN_LNG_RANGE[0] || lng > JAPAN_LNG_RANGE[1]) {
    errors.push("位置情報が取得できませんでした。地図上でピンを立て直してください");
  }

  if (address && (typeof address !== "string" || address.length > SUBMIT_ADDRESS_MAX)) {
    errors.push(`補足住所は${SUBMIT_ADDRESS_MAX}文字以内で入力してください`);
  }
  if (businessHours && (typeof businessHours !== "string" || businessHours.length > SUBMIT_HOURS_MAX)) {
    errors.push(`営業時間は${SUBMIT_HOURS_MAX}文字以内で入力してください`);
  }
  if (details && (typeof details !== "string" || details.length > SUBMIT_DETAILS_MAX)) {
    errors.push(`サイズ・料金等の補足は${SUBMIT_DETAILS_MAX}文字以内で入力してください`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const locker = {
    facility_id: `u-${crypto.randomUUID()}`,
    name: name.trim(),
    address: address?.trim() || "",
    latitude: lat,
    longitude: lng,
    nearest_station: nearestStation?.trim() || "",
    station_slug: stationSlug,
    business_hours: businessHours?.trim() || "不明",
    source: { site_name: null, site_url: null },
    last_updated_at: new Date().toISOString(),
    sizes: [],
    user_submitted: true,
    comment: comment.trim(),
    details: details?.trim() || "",
    submitted_at: new Date().toISOString(),
  };

  const submitted = loadUserSubmittedLockers();
  submitted.push(locker);
  saveUserSubmittedLockers(submitted);

  res.status(201).json({ locker: { ...locker, photos: [] } });
});

app.get("/", (req, res) => {
  res.json({ message: "コインロッカー検索API稼働中" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
