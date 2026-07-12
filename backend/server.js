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
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const cron = require("node-cron");
const { runUpdate } = require("./scraper/updateLockers");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_PATH = path.join(__dirname, "data", "lockers.json");
const PHOTOS_DIR = path.join(__dirname, "data", "photos");
const PHOTOS_INDEX_PATH = path.join(__dirname, "data", "photos.json");
const ALLOWED_MIME_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

fs.mkdirSync(PHOTOS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/photos", express.static(PHOTOS_DIR));

function loadLockers() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
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
  limits: { fileSize: MAX_PHOTO_SIZE },
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
    // 指定サイズの空き（quantity > 0）があるロッカーのみ
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
  const locker = lockers.find((l) => l.facility_id === Number(req.params.id));
  if (!locker) {
    return res.status(404).json({ error: "指定されたロッカーが見つかりません" });
  }
  res.json({ ...locker, photos: getPhotos(req.params.id) });
});

// フェーズ6: 周辺写真一覧
app.get("/api/lockers/:id/photos", (req, res) => {
  const lockers = loadLockers();
  const locker = lockers.find((l) => l.facility_id === Number(req.params.id));
  if (!locker) {
    return res.status(404).json({ error: "指定されたロッカーが見つかりません" });
  }
  res.json({ photos: getPhotos(req.params.id) });
});

// フェーズ6: 利用者による周辺写真の投稿
app.post("/api/lockers/:id/photos", (req, res) => {
  const lockers = loadLockers();
  const locker = lockers.find((l) => l.facility_id === Number(req.params.id));
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

app.get("/", (req, res) => {
  res.json({ message: "コインロッカー検索API稼働中" });
});

// フェーズ9: データ自動更新バッチのスケジュール実行（デフォルト6時間ごと）
const UPDATE_CRON_SCHEDULE = process.env.LOCKER_UPDATE_CRON || "0 */6 * * *";
cron.schedule(UPDATE_CRON_SCHEDULE, () => {
  runUpdate().catch((err) => console.error("[update-lockers] 定期更新に失敗しました:", err.message));
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
