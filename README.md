# コインロッカー検索アプリ（フェーズ1〜5）

設計書のフェーズ1〜5に対応した実装です。対象エリアはマルチエキューブ対応駅全349駅（2026-07-16時点、JR東日本に加えOsaka Metro・京阪・東急・札幌市営地下鉄等の他社線・全国エリアを含む）です。

## 対応フェーズ

| フェーズ | 内容 | 対応ファイル |
|---|---|---|
| フェーズ1 | データ収集基盤（雛形）＋サンプルデータ | `backend/data/lockers.json`, `backend/db/schema.sql` |
| フェーズ2 | 地図画面（MVP） | `frontend/src/components/MapView.jsx` |
| フェーズ3 | 検索機能 | `frontend/src/components/SearchBar.jsx`, `backend/server.js` |
| フェーズ4 | 詳細画面（料金・サイズ別個数） | `frontend/src/components/LockerDetail.jsx` |
| フェーズ5 | 対象エリアの拡大（池袋駅以外の主要駅へ） | `backend/server.js`（`/api/stations`, `station`検索）, `frontend/src/components/SearchBar.jsx`, `frontend/src/components/MapView.jsx` |

## 重要な注意点（フェーズ1・9について）

フェーズ1では収集の仕組みを示す雛形としてPython製の`scrape_lockers.py`を用意していましたが、
バックエンドがNode.js/Express構成であること、開発機でPythonが実行できず動作検証ができなかったことから、
フェーズ9（データ自動更新バッチ）でNode.js側に統合し、Python版は退役させました（`削除用フォルダ/`に移動済み）。
現在の収集・更新の仕組みは`backend/scraper/updateLockers.js`を参照してください。

`backend/data/lockers.json` の内容は、マルチエキューブ（JR東日本スマートロジスティクス運営 multiecube.com）の
公開JSON APIから取得した**実データ**です（2026-07-12〜）。予約・決済等の機能には一切関与せず、
サイト上に表示されているのと同じ空きロッカー情報（設置場所・サイズ・料金・空き数）のみを取得しています。
サイズ区分はSS/S/M/L/LWの5段階（マルチエキューブの区分に準拠、SS/S/M/Lの内寸はよくある質問ページで公開されている値、
LWは公式な寸法記載が見当たらず未掲載）。住所欄はマルチエキューブAPIが番地までの住所を提供しないため、
駅名・改札・目印を組み合わせた説明文で代用しています（正式な住所ではありません）。

## ディレクトリ構成

```
ikebukuro-locker-app/
├── backend/
│   ├── package.json
│   ├── server.js              # APIサーバー（一覧・検索・詳細）
│   ├── data/lockers.json      # マルチエキューブAPI由来の実データ（DB代わり）
│   ├── scraper/updateLockers.js  # フェーズ9: 自動更新バッチ（マルチエキューブAPI連携）
│   └── db/schema.sql          # 本番用DBスキーマ
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── styles.css
        └── components/
            ├── MapView.jsx      # フェーズ2
            ├── SearchBar.jsx    # フェーズ3
            ├── LockerList.jsx
            └── LockerDetail.jsx # フェーズ4
```

## セットアップ・起動方法

### 1. バックエンドAPIの起動

```bash
cd backend
npm install
npm start
```

`http://localhost:4000` でAPIサーバーが起動します。

### 2. フロントエンドの起動（別ターミナルで）

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` をブラウザで開くとアプリが表示されます。

### 3. データ自動更新バッチの手動実行確認（任意）

```bash
cd backend
npm run update:lockers
```

`backend/data/lockers.json`のlast_updated_atが更新され、実行結果が`backend/data/update-log.json`に記録されます。
サーバー起動中は`node-cron`によりデフォルト6時間ごとに自動実行されます（`LOCKER_UPDATE_CRON`環境変数で変更可）。

## 自動更新バッチのソース対応状況（Phase 0〜12・完了）

フェーズ9で作った自動更新バッチを、複数データソース対応のプラガブルなランナー（`backend/scraper/runner.js` + `backend/scraper/sources/*.js`）に拡張し、
首都圏私鉄・地下鉄129駅（当初はユーザー投稿主導で追加）のうち116駅を自動取得に対応させた（Phase 0〜12・最終フェーズ完了、2026-07-27時点）。

| ソース | 対応事業者 | 実装ファイル |
|---|---|---|
| マルチエキューブ公式API | JR東日本ほかマルチエキューブ対応事業者 | `backend/scraper/sources/multiecube.js` |
| 公式サイトスクレイピング | 京王電鉄・西武鉄道・東急電鉄・東京メトロ・横浜市営地下鉄 | `keio.js` / `seibu.js` / `tokyu.js` / `tokyo-metro.js` / `yokohama-municipal.js` |
| 第三者アグリゲーター（コインロッカーなび） | 公式情報源が見つからなかった事業者向けの代替: 東武・京急・小田急・相鉄・りんかい線・京成・北総 | `coinlocker-navi.js` |

**残タスク**: 都営地下鉄13駅は自動取得ソースが未実装で、ユーザー投稿データのみに依存している（`backend/data/private-line-stations.json`参照）。
2026-07-28時点、都営地下鉄向けの自動取得スクレイパーは追加しない方針とし、引き続きユーザー投稿データに任せることとした。

## 使用技術

- フロントエンド: React + Vite
- 地図表示: Leaflet（OpenStreetMap、APIキー不要）
- バックエンド: Node.js + Express
- データ収集・自動更新: Node.js（`backend/scraper/updateLockers.js`、マルチエキューブの公開JSON APIから取得）
- データ保存: JSONファイル（本番はPostgreSQL等への移行を想定、`db/schema.sql`参照）

## 次のステップ

- 都営地下鉄13駅は自動取得対応をしない方針（ユーザー投稿データに任せる、2026-07-28決定）
- それ以外は方針未定。着手前に方針を固めること
