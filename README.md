# コインロッカー検索アプリ（フェーズ1〜5）

設計書のフェーズ1〜5に対応した実装です。対象エリアは **池袋駅・新宿駅・渋谷駅** の3駅周辺です。

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
実際に外部サイトから収集する場合は、対象サイトの利用規約・robots.txtの確認や、
可能であれば公式APIの利用を検討してください（詳細は同ファイル内コメント参照）。

`backend/data/lockers.json` に入っている池袋駅・新宿駅・渋谷駅周辺のロッカー情報（住所・料金・個数等）は
**デモ用のサンプルデータ**であり、実際の現地情報とは異なります。

## ディレクトリ構成

```
ikebukuro-locker-app/
├── backend/
│   ├── package.json
│   ├── server.js              # APIサーバー（一覧・検索・詳細）
│   ├── data/lockers.json      # サンプルデータ（DB代わり）
│   ├── scraper/updateLockers.js  # フェーズ9: 自動更新バッチ（仕組みのみ）
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

## 使用技術

- フロントエンド: React + Vite
- 地図表示: Leaflet（OpenStreetMap、APIキー不要）
- バックエンド: Node.js + Express
- データ収集・自動更新: Node.js（`backend/scraper/updateLockers.js`、実サイト取得は未実装）
- データ保存: JSONファイル（本番はPostgreSQL等への移行を想定、`db/schema.sql`参照）

## 次のステップ

- データ自動更新バッチの実サイト対応（対象サイト選定・利用規約確認が前提、現状は仕組みのみ実装済み）
