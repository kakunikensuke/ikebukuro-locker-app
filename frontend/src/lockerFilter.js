// ロッカーの集計・絞り込みロジック。**唯一の実装場所**。
//
// 2026-08-15にAPIをビルド時生成の静的JSONへ移した際、絞り込みがブラウザ側の仕事になった。
// 同じ計算を使う場所が3つあるため、ここに集約している:
//
//   1. frontend/scripts/generateApiData.js — ビルド時にJSONを書き出す
//   2. frontend/src/api.js                 — 取得したJSONをブラウザ内で絞り込む
//   3. backend/server.js                   — ローカル確認用のExpress（本番では使わない）
//
// どれかにコピーを作らないこと。挙動がずれると「ローカルでは出るのに本番で出ない」になる。

/** 駅一覧。slugごとにロッカー件数を数える */
export function selectStations(lockers) {
  const seen = new Map();
  for (const l of lockers) {
    if (!seen.has(l.station_slug)) {
      seen.set(l.station_slug, { slug: l.station_slug, name: l.nearest_station, count: 0 });
    }
    seen.get(l.station_slug).count += 1;
  }
  return [...seen.values()];
}

/** 駅／キーワード／サイズ／最大料金での絞り込み */
export function selectLockers(lockers, { keyword, size, maxPrice, stationSlug } = {}) {
  let results = lockers;

  if (stationSlug) {
    results = results.filter((l) => l.station_slug === stationSlug);
  }

  if (keyword) {
    const kw = String(keyword).toLowerCase();
    results = results.filter(
      (l) => l.name.toLowerCase().includes(kw) || l.address.toLowerCase().includes(kw)
    );
  }

  if (size) {
    // 指定サイズを設置しているロッカーのみ（quantityは設置個数。リアルタイムの空き数は扱わない）
    const target = String(size).toUpperCase();
    results = results.filter((l) => l.sizes.some((s) => s.size_type === target && s.quantity > 0));
  }

  if (maxPrice) {
    const max = Number(maxPrice);
    results = results.filter((l) => l.sizes.some((s) => s.price <= max));
  }

  return results;
}

/** facility_id での1件取得 */
export function selectLockerById(lockers, facilityId) {
  return lockers.find((l) => String(l.facility_id) === String(facilityId)) || null;
}

/** 駅slugごとにロッカーをまとめる */
export function groupByStation(lockers) {
  const byStation = new Map();
  for (const l of lockers) {
    if (!byStation.has(l.station_slug)) byStation.set(l.station_slug, []);
    byStation.get(l.station_slug).push(l);
  }
  return byStation;
}
