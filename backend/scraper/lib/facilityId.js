// 同一実行(collect())内でfacility_idが重複していないかを検出するガード。
// マッピング表の書き間違い（同じ駅・同じlocalKeyを2回登録した等）を静かに見逃さないための安全装置。
function createIdRegistry() {
  const seen = new Set();
  return {
    check(id) {
      if (seen.has(id)) {
        throw new Error(`facility_id が同一実行内で重複しています: ${id}`);
      }
      seen.add(id);
      return id;
    },
  };
}

module.exports = { createIdRegistry };
