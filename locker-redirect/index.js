// コインロッカー検索は2026-10-01に撤退した。全ページをルートサイトへ301で送る。
const TARGET = "https://kakuni-lab.com/";

export default {
  fetch() {
    return Response.redirect(TARGET, 301);
  },
};
