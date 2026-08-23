# ikebukuro-locker-app（コインロッカー検索アプリ）

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
