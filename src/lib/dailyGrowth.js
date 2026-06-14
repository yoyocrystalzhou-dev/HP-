import { STAT_MAX, STAMINA_MAX, normalizeStats } from "./stats.js";

const FIELD_ALIASES = {
  学术: "academic",
  学术值: "academic",
  魔法: "magic",
  魔法值: "magic",
  勇气: "courage",
  勇气值: "courage",
  亲和: "affinity",
  亲和力: "affinity",
  敏捷: "agility",
  敏捷值: "agility",
  亲情: "family",
  亲情值: "family",
  学院分: "housePoints",
  体力: "stamina",
};

const FIELD_LABELS = {
  academic: "学术",
  magic: "魔法",
  courage: "勇气",
  affinity: "亲和",
  agility: "敏捷",
  family: "亲情",
  housePoints: "学院分",
  stamina: "体力",
};

const LIMITS = {
  academic: 3,
  magic: 3,
  courage: 3,
  affinity: 3,
  agility: 3,
  family: 3,
  housePoints: 10,
  stamina: 20,
};

export const DAILY_GROWTH_RULES =
  "【日常成长评估】\n" +
  "如果本轮日常生活中确实发生了能带来成长或代价的具体事件，你可以在回复最后单独写一行结构化标签，例如：\n" +
  "【日常成长：学术+1；亲和+1】\n" +
  "规则：\n" +
  "- 只有发生了具体事件才写，没有成长就不要写。\n" +
  "- 由你根据事件自由评估加什么属性，不按地点固定收益；去图书馆不必然加学术，去球场不必然加敏捷。\n" +
  "- 日常变化保持小幅：普通事件通常 +1，明显有效可 +2，强烈事件最多 +3；也可以给轻微扣减。\n" +
  "- 可用字段：学术、魔法、勇气、亲和、敏捷、亲情、学院分、体力。\n" +
  "- 不要在正文中解释数值规则，结构化标签会由系统读取。";

export function parseDailyGrowth(text) {
  const raw = String(text || "");
  const entries = [];
  const cleaned = raw.replace(/【日常成长[:：]([^】]+)】/g, (_, body) => {
    const parts = String(body || "").split(/[；;、，,\n]+/);
    for (const part of parts) {
      const m = part.trim().match(/^([\u4e00-\u9fa5]+)\s*([+-＋－])\s*(\d{1,2})$/);
      if (!m) continue;
      const key = FIELD_ALIASES[m[1]];
      if (!key) continue;
      const sign = m[2] === "-" || m[2] === "－" ? -1 : 1;
      const limit = LIMITS[key] || 3;
      const delta = Math.max(-limit, Math.min(limit, sign * Number(m[3])));
      if (delta) entries.push({ key, delta });
    }
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();

  return { cleaned, entries };
}

export function applyDailyGrowth(stats, entries) {
  const next = normalizeStats(stats);
  for (const { key, delta } of entries || []) {
    if (!(key in next)) continue;
    const max = key === "stamina" ? STAMINA_MAX : key === "housePoints" ? 999 : STAT_MAX;
    next[key] = Math.max(0, Math.min(max, next[key] + delta));
  }
  return next;
}

export function formatDailyGrowth(entries) {
  if (!entries?.length) return "";
  return "✨ 日常成长：" + entries
    .map(({ key, delta }) => `${FIELD_LABELS[key] || key} ${delta > 0 ? "+" : ""}${delta}`)
    .join(" · ");
}
