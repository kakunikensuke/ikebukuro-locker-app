# RenderからのAPI静的化と、コールドスタートの確認（引き継ぎ）

作成日: 2026-08-15
作成元: eki-facility-app（住みやすさ駅前スコア）で同じ静的化をやったセッション

---

## 0. 要点

**このアプリは駅前スコアと違って、そのまま静的化できない。** 書き込みAPIが2本あるため。
ただし**そのデータは現状すでに消えている**（§3）ので、機能を捨てる判断が成り立つ可能性が高い。

**先に §3 を読んで、投稿機能をどうするかをユーザーに確認すること。決め打ちで実装に入らない。**

また、依頼にあった「コールドスタートの確認」は**このドキュメントで実測済み。問題なし**（§5）。
そちらは調べ直さなくてよい。

---

## 1. なぜこの話が出たか

2026-08-14にRenderから「無料枠の使用量が上限に近い」警告が来た。

**Renderの無料枠は月750インスタンス時間で、サービス単位ではなくアカウント単位。**
駅前スコアとロッカーアプリの2サービスを常時起動していたため1日48時間消費し、
15.6日で使い切る計算だった。

駅前スコア側は**バックエンドを廃してビルド時生成の静的JSONに移行し、2026-08-15に
Renderのサービスをsuspend済み**（UptimeRobotの監視もpause済み）。

これで **ロッカーアプリが唯一の常時起動サービス**になった。

| | 消費 |
|---|---|
| ロッカーアプリ1本を常時起動 | 月744時間 |
| 無料枠 | 月750時間 |

**収まってはいるが余裕が6時間しかない。** 再デプロイやブランチ環境が増えると即あふれる。
これがこのアプリも静的化を検討する理由。急ぎではないが、余裕はない。

---

## 2. 静的化できる部分（読み取りAPI・4本）

`backend/server.js` の読み取り系は**全て `backend/data/lockers.json` を読んで
その場でフィルタしているだけ**で、動的な状態を持たない。駅前スコアと同じ形にできる。

| エンドポイント | 実装 | 静的化後 |
|---|---|---|
| `GET /api/stations` | lockers.jsonからstation_slugを集約 | `/api/stations.json` |
| `GET /api/lockers` | keyword/size/maxPrice/station_slugで絞り込み | §2.1 参照 |
| `GET /api/lockers/:id` | facility_idで1件検索＋写真 | `/api/lockers/<id>.json` |
| `GET /api/lockers/:id/photos` | 写真indexを引く | §3 の判断次第 |

データ規模（2026-08-15実測）:

- ロッカー **815件** / 駅 **427駅** / `lockers.json` は **850KB**

### 2.1 `GET /api/lockers` の絞り込みをどうするか

**クエリの組み合わせぶんJSONを作ってはいけない。** 組み合わせ爆発する。

幸い、**フロントは既に全件取得してから自前で絞り込んでいる箇所が複数ある**。
`GuideArticlePage.jsx` / `SizePage.jsx` / `SizesIndexPage.jsx` はいずれも
`fetchLockers({})` を引数なしで呼んでいる。つまり全件JSONを1本置けば足りる。

`StationPage.jsx` だけが `{ station_slug }` を渡しているので、
**駅別に `/api/lockers/by-station/<slug>.json` を出す**のが素直（427ファイル）。
keyword / size / maxPrice の絞り込みは**フロント側に移す**。815件なら
ブラウザ内フィルタで十分速い。

転送量の実測（本番で計測済み）:

- 全件JSON: 生 **591KB** → gzip **42KB**

**42KBならCloudflareのCDN配信で問題ない。** ここは心配しなくてよい。

---

## 3. 🔴 静的化できない部分（書き込みAPI・2本）— ここが判断ポイント

| エンドポイント | 何をするか | 書き込み先 |
|---|---|---|
| `POST /api/lockers/:id/photos` | 利用者が周辺写真を投稿（フェーズ6） | `backend/data/photos/` と `photos.json` |
| `POST /api/lockers/submit` | 利用者が「昔ながらのロッカー」等を投稿（フェーズ11） | `backend/data/user-submitted-lockers.json` |

静的サイトには書き込み先が無いので、この2本は移行できない。

### 🔴 ただし、この2機能は現時点で実質的に壊れている

**Renderの無料プランは永続ディスクを持てず、`render.yaml` にも `disk:` の指定が無い。**
コンテナのファイルシステムは再デプロイ・再起動・スリープ復帰のたびに作り直される。

つまり **利用者が投稿した写真も情報も、次のデプロイで消える。**

さらに `.gitignore` に以下があるため、投稿されたデータはリポジトリにも残らない。

```
backend/data/photos/
backend/data/photos.json
```

`user-submitted-lockers.json` は追跡されているが**中身は空配列**（2026-08-15時点、
ローカル・本番とも投稿ゼロ）。実際に使われた形跡も無い。

**→ 「消えるデータを保存するために月744時間のサーバーを維持している」状態。**
これは §1 の警告の直接の原因である。

### 判断が必要なこと（ユーザーに聞くこと）

この2つの投稿機能をどうするか。**実装者が勝手に決めないこと。**

1. **機能ごと廃止する** — 一番単純。Renderが完全に不要になり、無料枠の問題が消える。
   投稿ゼロ・データも保持できていない以上、失うものは実質的に無い
2. **外部サービスに逃がす** — 例えば写真投稿をやめて情報投稿だけ残し、
   お問い合わせと同じ **FormSubmit** で運営者のメールに送る（承認して手でデータに入れる）。
   Renderは不要になる。詳細は `お問い合わせフォーム移行_引き継ぎ.md`
3. **現状維持** — Renderを残す。枠には収まるが余裕6時間

⚠ 1・2を選ぶ場合、`削除用フォルダ/` へ移動する（リポジトリ直下のCLAUDE.mdのルール）。
**ファイルを直接削除しないこと。**

---

## 4. 実装手順（§3の判断が済んでから）

駅前スコア側の実装をほぼそのまま持ってこられる。参照:
`駅周辺施設検索アプリプロジェクト/eki-facility-app/frontend/scripts/generateApiData.js`
（commit `c2fe218`）

1. `frontend/scripts/generateApiData.js` を新規作成し、`backend/data/lockers.json` から
   `frontend/public/api/` 配下にJSONを書き出す
   - **集計ロジックは `backend/server.js` からimportして使い回すこと。**
     駅前スコアでは `backend/stationScores.js` 等をそのまま読んでおり、二重実装していない。
     このアプリは集計がserver.jsに直書きなので、**先に純粋関数として切り出す**必要がある
   - 出力先の `frontend/public/api/` は毎回 `fs.rmSync(..., {recursive:true, force:true})` で
     作り直す。古いJSONが残ると消えたはずのロッカーが生き残る
2. `frontend/package.json` の `dev` と `prebuild` の先頭でこのスクリプトを走らせる
   - 現状 `prebuild` は `npm run sitemap` のみ。ここに足す
3. `frontend/src/api.js` の `API_BASE` を `"/api"` に変える
   - **`VITE_API_BASE` 環境変数の分岐は消す**（Cloudflare Pages側の設定に残っていても無害だが、
     コードから消さないと「どっちが効いているか」で必ず迷う）
4. `.gitignore` に `frontend/public/api/` を追加（生成物なので追跡しない）
5. `frontend/scripts/prerender.js` は既に `lockers.json` を直接読んでいるので**変更不要**

### 🔴 罠対策その1: データ更新がデプロイに繋がらない（このアプリ固有・最重要）

**駅前スコアと違い、このアプリはデータを更新しても自動でデプロイされない。**
静的化すると **JSONが永久に古いまま**になる。必ず先に手当てすること。

- 駅前スコアは Cloudflare Pages の**Git連携**なので、どのファイルへのpushでも再ビルドされる
- このアプリは Cloudflare **Workers**（`frontend/wrangler.toml`、静的アセット配信）で、
  デプロイは GitHub Actions の `deploy-frontend.yml` が担う。そのトリガーが**これ**:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "frontend/**"          # ← backend/data/lockers.json は該当しない
```

一方 `update-lockers.yml`（6時間ごと）がコミットするのは
**`backend/data/lockers.json`**。`frontend/**` に当たらないので**デプロイは走らない**。

今は実データをRenderが配信しているので問題になっていないが、静的化した瞬間に
「バッチは動いているのにサイトのデータが更新されない」という、**気づきにくい壊れ方**になる。

対応は `deploy-frontend.yml` の `paths` に以下を足すだけ:

```yaml
      - "backend/data/lockers.json"
```

⚠ GitHub Actionsは**ワークフローからのpushでは他のワークフローを起動しない**（無限ループ防止）。
`update-lockers.yml` が `GITHUB_TOKEN` でpushしている場合、`paths` を足しても
`deploy-frontend.yml` は起動しない。その場合は `update-lockers.yml` の末尾で
`workflow_dispatch` を明示的に叩く（`gh workflow run deploy-frontend.yml`）か、
`workflow_run` トリガーに変える。**実装前に実際にpushして起動するか確かめること。**

### 🔴 罠対策その2: 存在しないパスにも200が返る

`wrangler.toml` に `not_found_handling = "single-page-application"` があるため、
**存在しないパスにもSPAフォールバックで200 + HTMLが返る**（Cloudflare Pagesと同じ挙動）。
ステータスコードだけでは「データが無い」を判定できない。駅前スコアではこうしている:

```js
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  if (!(response.headers.get("content-type") || "").includes("application/json")) return null;
  return response.json();
}
```

Content-Typeまで見ないと、**存在しない駅のページでHTMLをJSONとしてパースしようとして
意味不明なエラーになる。**

### 検証方法

**バックエンドを起動せずに** フロントだけ動かして、全ページが描画されることを確認する。
これをやらないと「実はまだRenderを叩いていた」に気づけない。

ビルド後のバンドルに以下が**残っていないこと**もgrepで確認する。

```
onrender / localhost:4000 / VITE_API_BASE
```

---

## 5. コールドスタートの確認（実測済み・対応不要）

UptimeRobotの監視対象が駅前スコアの1件だけで、**このアプリのRenderサービスは
監視されていない**。Renderの無料プランは15分アクセスが無いとスリープするため、
初回アクセスに数十秒かかる懸念があった。

**2026-08-15に本番で実測した結果、問題なし。**

| 対象 | 結果 |
|---|---|
| `GET /api/stations`（1回目） | 200 / **0.45秒** / 25KB |
| `GET /api/stations`（2回目） | 200 / 0.37秒 |
| `GET /api/lockers` | 200 / 0.28秒 / 生591KB・gzip 42KB |

1回目から0.45秒なので、**計測時点でサービスは起動していた**（スリープしていれば
30〜60秒かかる）。実アクセスか日次バッチで起きているとみられる。

**UptimeRobotに監視を足さないこと。** 追加するとスリープしなくなり、
インスタンス時間の消費が増えて §1 の枠を圧迫する。今は監視しない方が得。

⚠ ただしこれは**1回の実測**であり、深夜など長時間アクセスが途切れた後は
スリープしている可能性がある。気になるなら時間帯を変えて再計測すること。
静的化すればこの懸念自体が消える。

---

## 6. やってはいけないこと

- **`backend/` を消さない。** 静的化しても、JSONを生成するために `lockers.json` と
  集計ロジックが要る。駅前スコアでも `backend/server.js` はローカル確認用に残してある
- **スクレイパーと更新バッチを止めない。** `backend/scraper/` とGitHub Actions
  （`update-lockers.yml`、6時間ごと）が `lockers.json` を更新している。
  **静的化してもバッチは必要。** ただし §4「罠対策その1」のとおり、
  バッチのコミットは現状フロントのデプロイを起動しない。ここを繋ぐのが移行の必須条件
- **ファイルを直接削除しない。** `削除用フォルダ/` へ移動する
- **Renderのサービスを消す前に、静的化後の本番で全ページの動作を確認すること。**
  suspendなら戻せるが、deleteは戻せない
- **クエリの組み合わせぶんのJSONを生成しない**（§2.1）

---

## 7. Renderの操作手順（確認できたら実施）

静的化して本番確認が済んだら、ユーザーに以下を依頼する。**自分では実施できない。**

1. https://dashboard.render.com/ → `ikebukuro-locker-app-backend` → `Settings`
2. 最下部の危険ゾーンの **`Suspend Web Service`**
3. 確認ダイアログに `sudo suspend web service ikebukuro-locker-app-backend` を入力

suspend後、`https://ikebukuro-locker-app-backend.onrender.com/` は
**503 + HTMLのメンテナンスページ**を返す。これが停止できた証拠になる。
（駅前スコア側で同じ挙動を確認済み）

---

## 8. 関連

- 駅前スコア側の実施記録: `駅周辺施設検索アプリプロジェクト/eki-facility-app/設計書.md` の §5.3
- 生成スクリプトの実物: `駅周辺施設検索アプリプロジェクト/eki-facility-app/frontend/scripts/generateApiData.js`
- お問い合わせフォーム（§3の選択肢2で使う）: 同フォルダの `お問い合わせフォーム移行_引き継ぎ.md`
- 本番: フロント https://locker.kakuni-lab.com （Cloudflare **Workers**、Pagesではない）/
  API https://ikebukuro-locker-app-backend.onrender.com
- デプロイ構成の詳細は README.md の「本番環境」節と、ルートの
  `デプロイ・インフラ運用ノウハウ.md`。**Cloudflare側のGit連携は不具合で使っておらず、
  GitHub Actionsから `wrangler deploy` している**点が駅前スコアとの最大の差
