/**
 * 好感度系统（HP 专项）。canon 角色与 OC 通用。
 *
 * 原则：好感度只能由程序结算（社交行动 /社交 触发亲和检定），AI 不得自行宣布关系升级。
 * 自由对话仍可发展剧情，但不动好感度数值。
 * 好感度存玩家层：player.favor = { [charId]: 0-100 }。
 */

export const FAVOR_MAX = 100;

/** 好感度 → 阶段。 */
export function favorStage(v) {
  const n = Number(v || 0);
  if (n >= 60) return "恋人";
  if (n >= 41) return "亲密朋友";
  if (n >= 21) return "朋友";
  return "陌生";
}

/** 检定等级 → 好感度增减。 */
export function favorDelta(tier) {
  return { 大成功: 6, 成功: 3, 失败: 0, 大失败: -2 }[tier] ?? 0;
}

/** 在 canon 角色 + OC 里按名字宽松匹配。返回 { id, name, kind } 或 null。 */
export function findCharacter(name, characters = [], ocs = []) {
  const q = String(name || "").trim();
  if (!q) return null;
  const all = [
    ...(characters || []).map((c) => ({ id: c.id, name: c.name, kind: "canon" })),
    ...(ocs || []).map((o) => ({ id: o.id, name: o.name, kind: "oc" })),
  ];
  return (
    all.find((c) => c.name === q) ||
    all.find((c) => c.name.includes(q) || q.includes(c.name)) ||
    all.find((c) => c.name.split(/[·・]/)[0] === q) ||
    null
  );
}

/** 注入 prompt：玩家已建立的关系（好感度>0）。让 AI 据此体现亲疏。 */
export function formatFavorBlock(favor = {}, nameById = {}) {
  const lines = Object.entries(favor)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => `${nameById[id] || id}：${favorStage(v)}（好感度 ${Math.round(v)}）`);
  if (!lines.length) return null;
  return (
    "【玩家与角色的好感度（据此体现亲疏；不得自行宣布关系跨级升级，如未告白就变恋人）】\n- " +
    lines.join("\n- ")
  );
}

/** 注入 prompt：本次社交对象的当前关系（给 AI 这一轮的依据）。 */
export function socialAnchor(targetName, newFavor) {
  return (
    `社交对象：${targetName}，当前好感度 ${Math.round(newFavor)}（${favorStage(newFavor)}）。` +
    `请按此亲疏自然演绎这次社交的结果；好感度变化已由系统结算，你不得自行宣布关系跨级升级。`
  );
}
