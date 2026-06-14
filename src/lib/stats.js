/**
 * 养成数值系统（HP 专项）。
 *
 * 数值存在 player.stats 上，随养成/行动/日常事件增减。
 * 初始值由角色创建的选择（学院/血统/魔杖/擅长）确定性生成，体现"出身影响起点"。
 *
 * 这里只定义数值与初始化；判定（施法成败、期末成绩）见 lib/checks.js。
 */

export const STAT_MAX = 100;
export const STAMINA_MAX = 100; // 体力上限（消耗型资源，控制行动节奏）

// 六维养成数值（来自专用名词卡的核心数值）
export const STAT_DEFS = [
  { key: "academic", label: "学术", icon: "📖" },
  { key: "magic", label: "魔法", icon: "✨" },
  { key: "courage", label: "勇气", icon: "🦁" },
  { key: "affinity", label: "亲和", icon: "🤝" },
  { key: "agility", label: "敏捷", icon: "🧹" },
  { key: "family", label: "亲情", icon: "🦉" },
];

// 学院 → 初始属性加成。学院不是职业锁定，只是性格与环境给出的起点倾向。
export const HOUSE_BONUSES = {
  格兰芬多: { courage: 5 },
  拉文克劳: { academic: 5 },
  赫奇帕奇: { affinity: 5 },
  斯莱特林: { magic: 5 },
};

// 血统 → 加成（贴合世界观：纯血家学魔法、混血亲和、麻瓜出身逻辑思维强）
const BLOOD_STAT = {
  纯血: "magic",
  混血: "affinity",
  麻瓜出身: "academic",
};

// 擅长学科 → 对应数值（也用于判定加成）
export const SUBJECT_STAT = {
  魔咒学: "magic",
  魔药学: "academic",
  变形术: "magic",
  草药学: "academic",
  黑魔法防御术: "courage",
  魔法史: "academic",
  天文学: "academic",
  "飞行 / 魁地奇": "agility",
};

// 魔杖木材 → 解释 + 初始属性加成。描述偏“魔杖气质”，不是玩法锁死。
export const WAND_WOODS = [
  { key: "橡木", blurb: "稳重、忠诚，适合意志坚定且重视承诺的巫师。", bonuses: { courage: 2, family: 1 } },
  { key: "胡桃木", blurb: "敏锐、聪慧，偏爱有创造力和理解力的主人。", bonuses: { academic: 2, magic: 1 } },
  { key: "樱桃木", blurb: "华丽而敏感，适合情感细腻、魔力表现鲜明的人。", bonuses: { magic: 2, affinity: 1 } },
  { key: "冬青木", blurb: "保护性强，常与危险命运和坚韧心性相伴。", bonuses: { courage: 2, magic: 1 } },
  { key: "黑檀木", blurb: "意志强硬、独立，适合不轻易屈服的巫师。", bonuses: { magic: 2, courage: 1 } },
  { key: "柳木", blurb: "柔韧、治愈感强，常青睐有潜力但不张扬的人。", bonuses: { academic: 1, affinity: 2 } },
  { key: "紫杉", blurb: "古老、强烈，适合野心、转变与深层魔力。", bonuses: { magic: 3 } },
  { key: "山楂木", blurb: "矛盾而灵巧，适合复杂、机敏、带一点锋芒的人。", bonuses: { agility: 2, magic: 1 } },
];

// 杖芯 → 解释 + 初始属性加成。
export const WAND_CORES = [
  { key: "凤凰羽毛", blurb: "魔力范围广，可能表现出出人意料的独立性。", bonuses: { magic: 3, courage: 1 } },
  { key: "独角兽毛", blurb: "稳定、忠诚，不易走偏，适合温和而坚定的魔法。", bonuses: { affinity: 3, family: 1 } },
  { key: "龙心弦", blurb: "力量强、反应快，适合爆发力和进取心。", bonuses: { magic: 2, courage: 2 } },
];

const BASE = 10;

export const STAT_LABELS = Object.fromEntries(STAT_DEFS.map((d) => [d.key, d.label]));

export function formatBonuses(bonuses = {}) {
  return Object.entries(bonuses)
    .filter(([, v]) => Number(v) !== 0)
    .map(([k, v]) => `${STAT_LABELS[k] || k} ${v > 0 ? "+" : ""}${v}`)
    .join(" · ");
}

function applyBonuses(stats, bonuses = {}) {
  for (const [k, v] of Object.entries(bonuses)) {
    if (k in stats) stats[k] = Math.max(0, Math.min(STAT_MAX, stats[k] + Number(v || 0)));
  }
}

/** 由角色创建的 meta 生成初始数值。纯函数。 */
export function initialStats(meta = {}) {
  const s = { academic: BASE, magic: BASE, courage: BASE, affinity: BASE, agility: BASE, family: BASE, housePoints: 0, stamina: STAMINA_MAX };
  const bump = (k, n) => { if (k && k in s) s[k] = Math.min(STAT_MAX, s[k] + n); };

  applyBonuses(s, HOUSE_BONUSES[meta.house]);
  bump(BLOOD_STAT[meta.blood], 3);
  applyBonuses(s, WAND_WOODS.find((w) => w.key === meta.wand?.wood)?.bonuses);
  applyBonuses(s, WAND_CORES.find((c) => c.key === meta.wand?.core)?.bonuses);
  (meta.subjects || []).forEach((sub) => bump(SUBJECT_STAT[sub], 4));

  return s;
}

/** 安全读取一份完整 stats（兼容旧存档/缺字段）。 */
export function normalizeStats(stats) {
  const s = { academic: BASE, magic: BASE, courage: BASE, affinity: BASE, agility: BASE, family: BASE, housePoints: 0, stamina: STAMINA_MAX };
  if (stats && typeof stats === "object") for (const k in s) if (typeof stats[k] === "number") s[k] = stats[k];
  return s;
}

/** 玩家擅长的学科是否覆盖某数值（用于判定加成）。 */
export function isSpecialized(meta, statKey) {
  return (meta?.subjects || []).some((sub) => SUBJECT_STAT[sub] === statKey);
}

/** 注入 prompt：玩家当前养成数值一行。 */
export function formatStatsLine(stats) {
  const s = normalizeStats(stats);
  return (
    `【玩家当前状态】体力 ${s.stamina}/100 · 学术 ${s.academic} · 魔法 ${s.magic} · 勇气 ${s.courage} · ` +
    `亲和 ${s.affinity} · 敏捷 ${s.agility} · 亲情 ${s.family} · 学院分 ${s.housePoints}`
  );
}

/**
 * 注入 prompt：数值/好感度门槛裁决规则。核心——
 * 玩家不能仅凭自由叙述就兑现需要数值/好感度支撑的结果，由旁白依据真实数字裁决。
 */
export const GATING_RULES =
  "【数值 / 好感度裁决规则（旁白必须严格执行）】\n" +
  "1. 玩家在自由叙述中不能仅凭一句话就达成需要数值或好感度支撑的结果。凡涉及：" +
  "入选魁地奇队 / 社团、施法或魔药是否成功、考试与课堂成绩、决斗与对抗胜负、" +
  "成为朋友 / 亲密 / 恋人、被某人接纳或信任等——必须由你依据上方【养成数值】与【好感度】裁决是否成立。\n" +
  "2. 数值或好感度不足时，演绎为受挫、被拒、勉强、未达成或需要更多努力，而不是顺着玩家的描述兑现。" +
  "（例：好感度＜60 不可成为恋人；敏捷偏低难入选魁地奇队；学术偏低则考试平平。）\n" +
  "3. 关键数值 / 好感度增减由系统结算；你不得在正文中随口宣布数值已经改变，也不得替玩家宣布已达成这些结果。\n" +
  "4. 对于无法预设的日常事件，你可以在回复末尾用【日常成长：学术+1；亲和+1】这种结构化标签提出小幅成长建议；系统会解析、限制幅度并应用。没有明确成长就不要写。\n" +
  "5. 你仍可自由推进日常剧情与对话——只是别让玩家空口越过数值门槛。";
