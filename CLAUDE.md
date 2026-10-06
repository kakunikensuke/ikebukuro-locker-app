# ikebukuro-locker-app（コインロッカー検索アプリ）

## 🔴 2026-10-01 ロッカー検索は撤退。このリポジトリはルートサイト kakuni-lab.com の置き場になった

- **locker.kakuni-lab.com は全ページを https://kakuni-lab.com/ へ301で転送している**（`locker-redirect/`、
  `deploy-frontend.yml` がこれだけを配信する）。元のアプリ（`frontend/`・`backend/`）はコードとデータを残してあるだけで配信していない。
  戻すときはタグ `locker-final` の `deploy-frontend.yml` と `update-lockers.yml` に戻す。データの複製は `D:\ClaudeData\locker-archive`
- データ更新バッチ（`update-lockers.yml`）の定期実行は止めた。multiecube のAPIが2026-09に形式を変え、9/17以降は更新できていなかった
- **`site/` がルートドメイン kakuni-lab.com のサイト**（旧 `ハブサイトプロジェクト/kakuni-lab-hub` から移設）。
  `site/**` への push で `deploy-site.yml` がビルドしてデプロイする。手元の wrangler はCloudflareにログインしておらず、
  Cloudflareの鍵はこのリポジトリのGitHub Actionsにしか無いため、ここに置いた
  - 記事は `site/content/articles/<slug>.md`。数字は集計した時点の値を本文に書き、`dataAsOf` に時点を書く（自動更新しない）
  - `npm run build` は本文2,000字未満の記事があると落ちる（AdSense審査で薄いページを出さないため）
  - 記事の frontmatter には `finding:`（その記事で分かったことを1行）が必須。テーマのページ `/topics/<category>/` とトップの「集計して分かったこと」に並ぶ（2026-10-06〜）
  - 購入代行の記事3本（送料・海外の税・送れない物）と海外発送の記事2本は japan-proxy-cost の data/ の値を手で写している。向こうのデータを直したらこちらも合わせる
  - **海外発送の計算機 `/tools/overseas-shipping/`（2026-10-06〜、トップの最上部）**: 計算は `site/src/shipping-calc.mjs` だけ（ブラウザは `/js/shipping-calc.js` としてコピーを読み、ビルドは入力例の結果を静的HTMLに書く）。データは `site/data/overseas-shipping.json`（料金・補償・為替は japan-proxy-cost の data/ から写した値、国際エアパケットの料金と各国の贈り物の決まりは2026-10-06に公式で確認）。`npm run build` の前に `scripts/verify-shipping-calc.mjs` が手計算の値28件と照合する。日本郵便の料金改定・各国の税の変更があったら、データと照合スクリプトの両方を直す
  - **写真（2026-10-06〜）**: `site/public/img/<key>-800.webp` / `-1600.webp`（hero・towns・lockers・shopping・notes・tool）。Wikimedia Commons の CC0 / CC BY / CC BY-SA だけ。作者とライセンスは `site/data/photo-credits.json` にあり、写真の右上と運営者情報の「写真のクレジット」に出る。**消さないこと**（CC BY 系の利用条件）。色は藍と山吹の2色だけ（`public/style.css` の先頭）
  - お問い合わせフォームはトップ（`/#contact`）に置く。FormSubmitは送信元URLごとに有効化が要るので、別URLへ移さない
  - 集計に使ったスクリプトは残していない。記事を更新するときは、元データ（eki-facility-app の backend/data、
    このリポジトリの backend/data/lockers.json、japan-proxy-cost の data/）から集計し直す

以下は撤退前のロッカーアプリの記録。

## お問い合わせフォーム（2026-08-15移行済み）

Googleフォームからサイト内フォーム（FormSubmit）へ移行した。定義は`src/staticPages.js`に集約してあり、
Reactの`ContactForm.jsx`とビルド時の`scripts/prerender.js`が同じ定義から生成する。片方だけ直さないこと。

**FormSubmitは送信元URLごとに有効化が必要**で、有効化前でもHTTP 200を返す。
そのためステータスではなく応答本文の`success`を見て成功判定している。経緯は
[お問い合わせフォーム移行_引き継ぎ.md](./お問い合わせフォーム移行_引き継ぎ.md)参照。

## APIは静的JSON（2026-08-15移行済み）

**本番にAPIサーバーは無い。** `frontend/scripts/generateApiData.js` がビルド時に
`backend/data/lockers.json` から `frontend/public/api/` へJSONを書き出し、フロントと同じWorkerが配信する。
Renderの無料枠（アカウント単位で月750時間）を使い切る状態だったための移行。

守ること:

- **絞り込みロジックの実装は `frontend/src/lockerFilter.js` だけ。** `backend/server.js`・
  `generateApiData.js`・ブラウザの3か所がこれを共有する。コピーを作ると挙動がずれる
- **`backend/server.js` は本番では動いていない。** 切り戻し用に残してあるだけ
- **存在しないパスにも200+HTMLが返る**（`not_found_handling = "single-page-application"`）。
  取得側はContent-Typeまで検証すること（`src/api.js`の`fetchJson`）
- **`deploy-frontend.yml` の `workflow_run` トリガーを外さない。** データ更新バッチの
  コミットはGITHUB_TOKENによるpushなので、pathsだけではデプロイが起動しない
- 利用者投稿（写真・ロッカー情報）は廃止済み。復活させる場合は保存先の確保から必要

## 英語ページ（2026-08-23）

**英語ページに日本語を出さないこと。** `npm run build` が生成物を検査してビルドを落とす
（`scripts/prerender.js` 末尾の `assertEnglishPagesHaveNoJapanese`）。

- ロッカー名・所在地・営業時間は multiecube 由来で日本語しか無い。英訳は
  **`src/i18n/lockerText.js` の `lockerTexts()` が唯一の実装**で、prerender.js と
  ブラウザの両方がこれを呼ぶ。片方だけ `locker.name` を直接使うと、静的HTMLと
  ハイドレート後で表示がずれる
- 辞書（`PLACE_TERMS`）は**長い語から順に並べる**（最長一致のため）。辞書に無い語が
  残った場合は詳細を捨てて "Coin Lockers (Outside the Gates)" に落ちる仕様。
  訳を足したいときはここに追加する
- 現地の看板は日本語なので、原文は `<span lang="ja">` で併記する。
  **title・description・og には絶対に入れない**（チェックが落とす）

### なぜ英語を優先するか

Search Consoleの3か月実測（2026-08-23）で、英語ページの方が掲載順位が良い。

| | 英語 | 日本語 |
|---|---|---|
| areasページ 平均掲載順位 | 9.2 | 26.5 |
| 駅ページ 平均掲載順位 | 12.7 | 16.4 |

日本語の「駅名＋コインロッカー」はGoogleマップとmultiecube公式に押さえられている
（新宿はインデックス済みだが40.5位・3か月で表示2回）。英語側がこのサイトの数少ない勝ち筋。

## プリレンダの注意

`scripts/prerender.js` のテンプレートは `dist/index.html` で、**これは同スクリプトが
日本語トップページを書き出す先でもある**。`vite build` を挟まずに `npm run prerender` を
2回流すと前回の出力をテンプレートとして読んでしまう。#rootが空でなければエラーで止まるので、
`npm run build`（vite build → prerender）を使うこと。

## 技術スタック

- フロントエンド: React + Vite
- 地図表示: Leaflet + OpenStreetMap（APIキー不要・無料）
- バックエンド: 本番では不使用（ローカル確認用にNode.js + Expressを残置）
- データ保存: JSONファイル（`backend/data/lockers.json`をスクレイパが更新する）

## プラットフォーム方針（2026-07-10更新）

- **当面はWEBアプリのみでリリースし、iOSアプリ化は保留する。**
- 理由: このアプリの収益化モデル（キャリー預かりサービスとのアフィリエイト＋広告表示）は、検索エンジンからの流入をそのままサービスへのコンバージョンに繋げる導線が軸になる。App Store経由のインストールを挟むiOSアプリより、SEOで発見されやすいWEBアプリの方が効率的と判断した。iOS化は審査コスト・年間開発者登録費・ネイティブ保守コストに見合う効果が現段階では見込めない。
- ホーム画面設置やプッシュ通知（空き通知機能など）が必要になった場合は、まずPWA化での代替を検討してからネイティブ化を判断する。
- ルートのCLAUDE.mdにある「Web版とiOS版でコア機能・仕様の整合性を保つ」方針は、iOS版の着手を再開するまで本プロジェクトでは一時的に適用対象外とする。

## 荷物が入るかの判定と共通モジュール（2026-09-30）

**スーツケースが入るかはサイズ名（S/M/L）ではなく内寸で判定する。** 同じ「Lサイズ」でも事業者によって
高さが86cmと50cm台で違う。判定の実装は `frontend/src/luggageFit.js` だけ（荷物の外寸の定義もここ）。
幅のある内寸は小さい方、内寸が不明なものは「入る」とも「入らない」とも言わない。

画面と静的HTMLの両方から呼ぶ共通モジュール（片方だけ直さない）:

- `src/stationSummary.js` — 駅ごとの要点（最安・スーツケースが入る台数・改札内外）、県ページの駅一覧の1行、サイズの「入る荷物の目安」
- `src/luggageSearch.js`・`src/luggagePageContent.js` — /luggage の検索と本文
- `src/homeContent.js` — トップのランキング・説明、/airports の本文
- `src/stationInsight.js` — 駅・県の解説文。**文はデータから導き、駅が変われば結論が変わるものだけを書く**（言い回しの入れ替えはscaled content abuseに当たる）
- `src/lockerStats.js` の `guideVars()` — ガイド記事の {{変数}}。記事に数値を直書きしない

**荷物の種類ごとのページ（/luggage/carryon 等）は作らない。** 預け入れMとLは入る駅・台数が完全に同じ
（350駅）で、分けると中身が同じページが並ぶだけになる。

### デザイン

`src/styles.css` の先頭のトークン（`--ink`・`--tenji` 等）を使う。アクセントは点字ブロックの黄色
（`--tenji`）1色だけで、「スーツケースが入る」の目印にも使っている。新しい色を足さないこと。
