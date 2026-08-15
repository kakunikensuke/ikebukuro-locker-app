# コインロッカー検索アプリ（フェーズ1〜5）

設計書のフェーズ1〜5に対応した実装です。対象エリアはマルチエキューブ対応駅全349駅（2026-07-16時点、JR東日本に加えOsaka Metro・京阪・東急・札幌市営地下鉄等の他社線・全国エリアを含む）です。

## 本番環境（2026-07-28公開）

| 役割 | URL / サービス |
|---|---|
| フロントエンド | https://locker.kakuni-lab.com （Cloudflare Workers、`ikebukuro-locker-app`） |
| API | **サーバーは無い。** `frontend/public/api/` にビルド時生成した静的JSONを同じWorkerから配信（2026-08-15移行） |
| GitHubリポジトリ | https://github.com/kakunikensuke/ikebukuro-locker-app |
| データ自動更新 | GitHub Actions（`.github/workflows/update-lockers.yml`、6時間ごと） |
| フロントエンドデプロイ | GitHub Actions（`.github/workflows/deploy-frontend.yml`、mainへのpush時＋データ更新バッチの完了時） |

### APIの静的化について（2026-08-15）

以前はRender上のExpress（`ikebukuro-locker-app-backend.onrender.com`）がAPIを返していたが、
**Renderの無料枠は月750インスタンス時間でアカウント単位**のため、常時起動1本で月744時間を消費し余裕が無かった。
APIは `backend/data/lockers.json` を読んで絞り込むだけで動的な状態を持たないため、
ビルド時に `frontend/scripts/generateApiData.js` がJSONを書き出す方式に変更した。

同時に、書き込みAPI（周辺写真の投稿・ロッカー情報の投稿）を廃止した。
Renderの無料プランは永続ディスクを持てず、投稿データが再デプロイのたびに消えていたため（実投稿は0件）。
削除したファイルは `削除用フォルダ/2026-08-15_投稿機能廃止/` にある。

⚠ **`backend/server.js` は本番では使っていない。** 静的化に問題が出たときの切り戻し先として残してある。
絞り込みロジックの唯一の実装は `frontend/src/lockerFilter.js` で、server.js・generateApiData.js・
ブラウザの3か所がこれを共有する。**どこかにコピーを作らないこと。**

⚠ **データ更新バッチとデプロイの接続に注意。** `update-lockers.yml` がコミットするのは
`backend/data/lockers.json` で、GitHub Actionsは GITHUB_TOKEN によるpushでは他のワークフローを起動しない。
そのため `deploy-frontend.yml` は `workflow_run`（"Update lockers" の完了）でも起動するようにしてある。
ここを外すと「バッチは動いているのにサイトのデータが永久に古いまま」になる。

デプロイ構成の詳細・トラブルシューティングの型は、ルートの「デプロイ・インフラ運用ノウハウ.md」を参照。
このアプリはCloudflareダッシュボードのUI変更により、従来の「Pages」ではなく**Workers（静的アセット配信、`frontend/wrangler.toml`使用）**でデプロイしている。
またCloudflare側のGit連携（Workers Builds）が「disconnected」状態になり、push/Retry buildをしても最新コミットが反映されない不具合があったため、
**フロントエンドのデプロイはCloudflareのGit連携に頼らず、GitHub Actionsから`wrangler deploy`を実行する方式**に変更済み（`CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`をGitHub Secretsに登録し、mainへのpushで自動デプロイされる）。

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

### 1. フロントエンドの起動（これだけでよい）

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` をブラウザで開くとアプリが表示されます。
`npm run dev` の先頭で `generateApiData.js` が走り、`public/api/` にJSONが生成されるため、
**バックエンドを起動する必要はありません**（2026-08-15の静的化以降）。

### 2. バックエンドAPIの起動（任意・ローカル確認用）

```bash
cd backend
npm install
npm start
```

`http://localhost:4000` でAPIサーバーが起動します。
**本番では使っていません。** フロントはこのサーバーを見ないので、起動しても表示は変わりません。

### 3. データ自動更新バッチの手動実行確認（任意）

```bash
cd backend
npm run update:lockers
```

`backend/data/lockers.json`のlast_updated_atが更新され、実行結果が`backend/data/update-log.json`に記録されます。
本番環境ではGitHub Actions（`.github/workflows/update-lockers.yml`）が6時間ごとに自動実行し、`lockers.json`をリポジトリにコミット・pushします
（無料ホスティングのスリープ中はサーバー内cronが発火しないため、サーバープロセス内では実行しない方針。2026-07-28変更）。
`update-log.json`は`.gitignore`対象の実行時生成物なのでコミットしません。CI上での失敗内容はActionsのログで確認してください。

### 自動更新バッチの失敗の扱い（2026-08-10修正）

100駅超を10社以上の外部サイトから取得しているため、一部の駅・ソースの取得失敗は日常的に起きます。
そのため**部分的な失敗（`partial_error`）では異常終了させず、取得できた分をコミットします**。
1駅も取得できなかった場合のみ異常終了します（`backend/scraper/runner.js`）。

この方針にする前は、1駅でも失敗すると例外を投げていたため、
GitHub Actions側でコミット手順ごとスキップされ、取得できた大半のデータが毎回捨てられていました
（2026-07-31〜08-10の全実行が失敗し、データが7/27から更新されない状態になっていました）。

また、**0件の応答は成功として扱わず、既存データを保持します**（`backend/scraper/runner.js`）。
外部サイトは200を返しながら中身が空という応答を稀に返すため、素直に受けると
「この駅にはロッカーが無い」と解釈して既存の設置情報を失います。
元々データを持たない駅（そもそもロッカーが無い駅）の0件は正常な応答なので記録しません。

### マルチエキューブAPIの照会日について（2026-08-10修正）

`box_availability.*.num_total`は設置個数ではなく**照会日に確保できる個数**です。
照会日が近いほど予約で削られるため、当日を照会すると実態の1/5〜1/7まで落ち込みます
（2026-08-10実測: 東京駅 当日2,505 → +5日11,590 ／ 池袋駅 当日325 → +1日2,165）。
当日分が満杯の駅は0件で返るため、博多・新大阪など16駅がデータから消える事故も起きました。
そのため`QUERY_DAYS_AHEAD`（14日）先を照会しています（`backend/scraper/sources/multiecube.js`）。

またこのAPIは特定の駅に対して504を断続的に返します。東京駅(base_id=32)は2026-08-10に
数時間504が続き、既存データ保持のおかげでページは残ったものの値が古いまま取り残されました。
時間を空ければ成功するため、5xxと通信エラーは`RETRY_DELAYS_MS`（2秒・5秒）で最大3回まで叩き直します。
4xxはリトライしても変わらないので即座に諦めます。

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
