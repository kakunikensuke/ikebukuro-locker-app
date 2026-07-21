// ソースレジストリ。runner.jsはこの配列を先頭から順に実行する。
// 新規ソースはこの配列に追記していく（実装順はPRIVATE_LINE_SCRAPING_PLAN参照）。
module.exports = [
  require("./multiecube"),
  require("./keio"),
  require("./yokohama-municipal"),
  require("./coinlocker-navi"),
  require("./seibu"),
  require("./tokyu"),
];
