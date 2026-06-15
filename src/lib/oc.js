/**
 * 原创角色（OC）—— 玩家自创、可加可改的世界成员（与锁定的原著角色分开存）。
 * OC 可挂「与原著角色的外围关系」（如德拉科的发小），但只在日常/社交层生效，不改原著主线。
 */

import { uid } from "./utils.js";

/** 常用关系预设（玩家也可自填）。 */
export const OC_RELATIONS = ["发小", "青梅竹马", "邻居", "远亲", "同级新生", "笔友", "旧识", "同伙"];

export function createOC(partial = {}) {
  return {
    id: partial.id || uid(),
    name: String(partial.name || "").trim(),
    gender: partial.gender || "",
    house: partial.house || "",
    family: partial.family || "",                       // 家世背景
    familyDetail: String(partial.familyDetail || "").trim(),
    appearance: String(partial.appearance || "").trim(), // 相貌
    persona: String(partial.persona || "").trim(),       // 性格 / 设定
    tieName: partial.tieName || "",        // 关联的原著角色名（可空）
    tieRelation: partial.tieRelation || "", // 关系类型
    romanceable: partial.romanceable !== false,
    createdAt: partial.createdAt || Date.now(),
  };
}

/** 把 OC 列表格式化成注入 prompt 的角色卡块（无有效 OC 返回 null）。 */
export function formatOcs(ocs) {
  if (!Array.isArray(ocs)) return null;
  const cards = ocs
    .filter((o) => o && o.name)
    .map((o) => {
      const lines = [`【原创角色（玩家自创 · 世界成员）：${o.name}】`];
      const meta = [o.gender, o.house].filter(Boolean).join(" · ");
      if (meta) lines.push(meta);
      if (o.family) lines.push(`家世：${o.family}${o.familyDetail ? `；${o.familyDetail}` : ""}`);
      if (o.appearance) lines.push(`相貌：${o.appearance}`);
      if (o.persona) lines.push(`性格 / 设定：${o.persona}`);
      if (o.tieName) lines.push(`与原著角色的关系：${o.tieName} 的${o.tieRelation || "熟人"}`);
      lines.push(`互动定位：可参与日常、可积累好感${o.romanceable === false ? "" : "、可攻略/可进入结局素材"}；不得改写原著主线。`);
      return lines.join("\n");
    });
  return cards.length ? cards.join("\n\n") : null;
}

/** 注入 prompt 的原创角色规则（约束 AI）。 */
export const OC_GUARD =
  "【原创角色规则】上述原创角色是玩家加入这个世界的普通成员。请按其设定自然扮演 TA；" +
  "当你扮演与其有关系的原著角色时，依该关系自然对待 TA（如『德拉科的发小』，德拉科会与其熟络）。" +
  "OC 与原著角色共用好感度、告白和结局素材规则，可以参与日常、支线与情感发展。" +
  "但原创角色及其关系仅在日常 / 社交层面生效——不得改变原著大事件、主线走向与原著角色的既定命运，" +
  "也不得让原创角色凌驾于原著设定之上。";
