// 新規追加ソース（私鉄各社サイト）向けの共通fetchヘルパー。
// 通常のブラウザと同じUser-Agentで取得し、駅間には間隔を空けて負荷をかけない。
const USER_AGENT =
  "Mozilla/5.0 (compatible; ikebukuro-locker-app/1.0)";

async function politeFetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`${url} ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function politeDelay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { politeFetchText, politeDelay, USER_AGENT };
