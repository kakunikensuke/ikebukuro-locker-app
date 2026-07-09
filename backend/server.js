/**
 * コインロッカー検索アプリ バックエンドAPI
 *
 * フェーズ2: GET /api/lockers          -> 地図表示用に全件返す
 * フェーズ3: GET /api/lockers?keyword= -> キーワード・サイズ・料金での検索
 * フェーズ4: GET /api/lockers/:id      -> 詳細（料金・サイズ別個数）
 * フェーズ5: GET /api/stations         -> 対応駅一覧
 *            GET /api/lockers?station= -> 駅での絞り込み（対象エリアの拡大）
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_PATH = path.join(__dirname, "data", "lockers.json");

app.use(cors());
app.use(express.json());

function loadLockers() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

// フェーズ5: 対応駅一覧（フロントの駅選択プルダウン用）
app.get("/api/stations", (req, res) => {
  const lockers = loadLockers();
  const stations = [...new Set(lockers.map((l) => l.nearest_station))];
  res.json({ stations });
});

// フェーズ2・3・5: 一覧取得＋検索（駅／キーワード／サイズ／最大料金でフィルタ）
app.get("/api/lockers", (req, res) => {
  const { keyword, size, maxPrice, station } = req.query;
  let lockers = loadLockers();

  if (station) {
    lockers = lockers.filter((l) => l.nearest_station === station);
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
app.get("/api/lockers/:id", (req, res) => {
  const lockers = loadLockers();
  const locker = lockers.find((l) => l.facility_id === Number(req.params.id));
  if (!locker) {
    return res.status(404).json({ error: "指定されたロッカーが見つかりません" });
  }
  res.json(locker);
});

app.get("/", (req, res) => {
  res.json({ message: "コインロッカー検索API稼働中" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
