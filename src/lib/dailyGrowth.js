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
  "- 学院分只有在教授/级长明确加分扣分、课堂表现、帮助他人、违规被抓等具体后果出现时才写；必须带理由，如【日常成长：学院分+5：麦格教授因课堂回答加分】。不要为了氛围随便加扣学院分。\n" +
  "- 如果本轮已经给出【本回合检定结果】或【期末考试结果】，不要再为同一件事额外写日常成长，避免重复结算。\n" +
  "- 可用字段：学术、魔法、勇气、亲和、敏捷、亲情、学院分、体力。\n" +
  "- 不要在正文中解释数值规则；结构化标签会被系统读取并从正文隐藏。";

const HOUSE_POINT_REASON_WORDS = [
  "教授", "级长", "加分", "扣分", "课堂", "回答", "表现", "帮助", "救", "违反", "违规",
  "宵禁", "夜游", "被抓", "费尔奇", "麦格", "斯内普", "弗立维", "霍琦", "比赛", "魁地奇", "惩罚",
];

function validHousePointReason(reason) {
  const text = String(reason || "");
  return HOUSE_POINT_REASON_WORDS.some((word) => text.includes(word));
}

export function parseDailyGrowth(text) {
  const raw = String(text || "");
  const entries = [];
  const cleaned = raw.replace(/【日常成长[:：]([^】]+)】/g, (_, body) => {
    const parts = String(body || "").split(/[；;、，,\n]+/);
    for (const part of parts) {
      const m = part.trim().match(/^([\u4e00-\u9fa5]+)\s*([+-＋－])\s*(\d{1,2})(?:\s*[:：]\s*(.{1,60}))?$/);
      if (!m) continue;
      const key = FIELD_ALIASES[m[1]];
      if (!key) continue;
      const reason = String(m[4] || "").trim();
      if (key === "housePoints" && (!reason || !validHousePointReason(reason))) continue;
      const sign = m[2] === "-" || m[2] === "－" ? -1 : 1;
      const limit = LIMITS[key] || 3;
      const delta = Math.max(-limit, Math.min(limit, sign * Number(m[3])));
      if (delta) entries.push({ key, delta, reason });
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
    .map(({ key, delta, reason }) => `${FIELD_LABELS[key] || key} ${delta > 0 ? "+" : ""}${delta}${reason ? `（${reason}）` : ""}`)
    .join(" · ");
}
