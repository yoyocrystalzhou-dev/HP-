/**
 * 好感度系统（HP 专项）。canon 角色与 OC 通用。
 *
 * 原则：好感度只能由程序结算（社交行动 /社交 触发亲和检定），AI 不得自行宣布关系升级。
 * 自由对话仍可发展剧情，但不动好感度数值。
 * 好感度存玩家层：player.favor = { [charId]: 0-100 }。
 */

export const FAVOR_MAX = 100;
export const CONFESSION_THRESHOLD = 60;

/** 好感度 → 阶段。 */
export function favorStage(v, relationship = null) {
  const status = relationship?.status || relationship?.stage || "";
  if (status === "恋人") return "恋人";
  const n = Number(v || 0);
  if (n >= CONFESSION_THRESHOLD) return "心动";
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
    "【玩家与角色的好感度（据此体现亲疏；不得自行宣布关系跨级升级；好感度≥60只是心动/可告白，不等于恋人）】\n- " +
    lines.join("\n- ")
  );
}

/** 注入 prompt：本次社交对象的当前关系（给 AI 这一轮的依据）。 */
export function socialAnchor(targetName, newFavor) {
  return (
    `社交对象：${targetName}，当前好感度 ${Math.round(newFavor)}（${favorStage(newFavor)}）。` +
    `请按此亲疏自然演绎这次社交的结果；好感度变化已由系统结算，你不得自行宣布关系跨级升级。若达到心动，也必须等系统告白结果才能成为恋人。`
  );
}

const REL_LIMIT = 3;

/** AI 只能建议日常关系小幅变化，系统解析、限幅并清洗标签。 */
export function parseRelationshipDeltas(text, characters = [], ocs = []) {
  const raw = String(text || "");
  const entries = [];
  const cleaned = raw.replace(/【关系变化[:：]([^】]+)】/g, (_, body) => {
    const parts = String(body || "").split(/[；;、，,\n]+/);
    for (const part of parts) {
      const m = part.trim().match(/^(.{1,18}?)([+-＋－])\s*(\d{1,2})(?:\s*[:：]\s*(.{1,40}))?$/);
      if (!m) continue;
      const target = findCharacter(m[1].trim(), characters, ocs);
      if (!target) continue;
      const sign = m[2] === "-" || m[2] === "－" ? -1 : 1;
      const delta = Math.max(-REL_LIMIT, Math.min(REL_LIMIT, sign * Number(m[3])));
      if (delta) entries.push({ id: target.id, name: target.name, kind: target.kind, delta, note: (m[4] || "").trim() });
    }
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();

  return { cleaned, entries };
}

export function applyRelationshipDeltas(player, entries = []) {
  const next = {
    ...player,
    favor: { ...(player?.favor || {}) },
    state: {
      ...(player?.state || {}),
      relationships: { ...(player?.state?.relationships || {}) },
    },
  };
  const applied = [];

  for (const entry of entries) {
    const oldValue = Number(next.favor[entry.id] || 0);
    const value = Math.max(0, Math.min(FAVOR_MAX, oldValue + entry.delta));
    next.favor[entry.id] = value;

    const rel = next.state.relationships[entry.id] || {};
    next.state.relationships[entry.id] = {
      ...rel,
      status: rel.status === "恋人" ? "恋人" : favorStage(value),
      feeling: entry.note || rel.feeling || "",
      updatedAt: Date.now(),
    };
    applied.push({ ...entry, oldValue, value, stage: favorStage(value, next.state.relationships[entry.id]) });
  }

  return { player: next, applied };
}

export function formatRelationshipDeltaLine(applied = []) {
  if (!applied.length) return "";
  return "💛 关系变化：" + applied
    .map((x) => `${x.name} ${x.delta > 0 ? "+" : ""}${x.delta} → ${Math.round(x.value)}（${x.stage}）`)
    .join(" · ");
}

export function relationshipRulesBlock(characters = [], ocs = []) {
  const names = [
    ...(characters || []).map((c) => c.name).filter(Boolean),
    ...(ocs || []).map((o) => o.name).filter(Boolean),
  ].slice(0, 80);
  return (
    "【关系与好感度规则】\n" +
    "- 好感度只由系统结算；你不得在正文中自行宣布数值、关系跨级、恋人关系或婚约。\n" +
    "- 普通日常里，如果本轮确实发生了具体社交变化，可在回复最后单独写一行结构化标签：`【关系变化：角色名+1；角色名-1】`。\n" +
    "- 只有明确互动才写；擦肩而过、远远看见、单方面猜测通常不写。\n" +
    "- 日常关系变化保持小幅：普通友好/尴尬通常 ±1，明显互助/冲突 ±2，强烈共同经历最多 ±3。\n" +
    "- 好感度≥60 只是心动/可告白，不等于恋人；恋人必须由系统告白结算成功后才成立。\n" +
    "- 可识别角色名：" + (names.join("、") || "当前暂无") + "。"
  );
}
