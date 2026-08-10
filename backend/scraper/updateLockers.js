/**
 * データ自動更新バッチのエントリポイント。
 * 実体は runner.js（複数ソース横断ランナー）＋ sources/*.js（ソースごとの取得・正規化ロジック）に
 * 分割されている。server.js のcron・package.jsonのupdate:lockersスクリプトからの参照パスを
 * 変えないため、このファイル自体はrunner.jsへの薄い委譲のみを行う。
 */
const { runUpdate } = require("./runner");

module.exports = { runUpdate };

if (require.main === module) {
  runUpdate()
    .then((entry) => {
      console.log(`[update-lockers] ${entry.updatedCount}件を更新しました (${entry.durationMs}ms)`);
      // 部分的な失敗は異常終了させない（取得できた分をコミットさせるため。runner.jsのコメント参照）。
      // ただしログには必ず出して、どのソースが継続的に落ちているか追えるようにする
      if (entry.status !== "success") {
        console.warn(
          `[update-lockers] 一部の取得に失敗しています: ${JSON.stringify(entry.error)}`
        );
      }
    })
    .catch((err) => {
      console.error("[update-lockers] 更新に失敗しました:", err.message);
      process.exitCode = 1;
    });
}
