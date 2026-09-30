// コインロッカー検索は2026-10-01に撤退した。全ページを、集めたデータで書いた
// ルートサイトの記事一覧（「駅で荷物を預ける」）へ301で送る。
const TARGET = "https://kakuni-lab.com/articles/#lockers";

export default {
  fetch() {
    return Response.redirect(TARGET, 301);
  },
};
