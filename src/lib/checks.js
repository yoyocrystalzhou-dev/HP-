/**
 * 判定引擎（HP 专项 · 透明裁决层）。
 *
 * 原则：成败由程序掷骰 + 数值决定，AI 只负责沉浸叙事。掷骰透明可见。
 * 只有玩家主动发起「行动/指令」才触发检定；自由对话不掷骰。
 *
 * 纯逻辑、无副作用（除可注入的 rng，默认 Math.random）。
 */

import { isSpecialized } from "./stats.js";

export const SPECIALIZED_BONUS = 5; // 擅长学科加成
const DIE_FACES = 12; // d12 受控随机

/** 可用「行动」注册表：指令名 → 定义。command 同时作为 /指令 关键字。 */
export const ACTIONS = {
  练咒: { label: "练习咒语", stat: "magic", statLabel: "魔法", difficulty: 22, subject: "魔咒学", cost: 12 },
  魔药: { label: "熬制魔药", stat: "academic", statLabel: "学术", difficulty: 24, subject: "魔药学", cost: 15 },
  变形: { label: "变形术", stat: "magic", statLabel: "魔法", difficulty: 24, subject: "变形术", cost: 15 },
  草药: { label: "草药学", stat: "academic", statLabel: "学术", difficulty: 21, subject: "草药学", cost: 12 },
  防御: { label: "黑魔法防御", stat: "courage", statLabel: "勇气", difficulty: 23, subject: "黑魔法防御术", cost: 14 },
  飞行: { label: "飞行 / 魁地奇", stat: "agility", statLabel: "敏捷", difficulty: 20, subject: "飞行 / 魁地奇", cost: 18 },
  夜游: { label: "夜间探索", stat: "courage", statLabel: "勇气", difficulty: 25, risky: true, cost: 25 },
  社交: { label: "社交", stat: "affinity", statLabel: "亲和", difficulty: 16, social: true, cost: 8 },
  休息: { label: "休息", rest: true },
  告白: { label: "告白", confess: true },
  考试: { label: "期末考试", exam: true },
  结局: { label: "结局", ending: true },
};

/** 指令别名 → 标准 command（方便玩家少打字）。 */
const ALIASES = {
  施法: "练咒", 咒语: "练咒", 魔咒: "练咒", 魁地奇: "飞行", 黑魔法防御术: "防御",
  搭讪: "社交", 聊天: "社交", 睡觉: "休息", 睡眠: "休息", 补眠: "休息",
  表白: "告白", 期末: "考试", 大结局: "结局", 尾声: "结局",
};

/**
 * 解析一条用户输入是否为「行动指令」。
 * 形如 "/练咒 漂浮咒" 或 "/飞行"。返回 { action, command, target } 或 null（即普通对话）。
 */
export function parseActionCommand(text) {
  const m = String(text || "").trim().match(/^[/／]\s*([^\s]+)\s*(.*)$/);
  if (!m) return null;
  const key = ALIASES[m[1]] || m[1];
  const action = ACTIONS[key];
  if (!action) return null;
  return { command: key, action, target: m[2].trim() };
}

/** 掷一个 1..DIE_FACES 的骰（受控随机，可注入 rng 以便复现/测试）。 */
export function rollDie(rng = Math.random) {
  return 1 + Math.floor(rng() * DIE_FACES);
}

const tierOf = (score) =>
  score >= 15 ? "大成功" : score >= 0 ? "成功" : score > -15 ? "失败" : "大失败";

/**
 * 核心检定：score = 数值 + 擅长加成 + 骰 − 难度。
 * @returns { tier, success, statValue, bonus, roll, difficulty, score }
 */
export function resolveCheck({ statValue, difficulty, favored = false, roll, rng = Math.random }) {
  const bonus = favored ? SPECIALIZED_BONUS : 0;
  const r = typeof roll === "number" ? roll : rollDie(rng);
  const score = statValue + bonus + r - difficulty;
  return { tier: tierOf(score), success: score >= 0, statValue, bonus, roll: r, difficulty, score };
}

/** 用一个 action + 玩家来跑检定。返回检定结果（含 action 信息）。 */
export function runAction(action, player, { roll, rng } = {}) {
  const stats = player?.stats || {};
  const meta = player?.meta || {};
  const statValue = Number(stats[action.stat] || 0);
  const favored = action.subject ? isSpecialized(meta, action.stat) : false;
  const check = resolveCheck({ statValue, difficulty: action.difficulty, favored, roll, rng });
  return { ...check, statLabel: action.statLabel };
}

/** 期末成绩：学术值（+擅长）映射到原著等级。 */
export function examGrade(academic, favored = false) {
  const v = Number(academic || 0) + (favored ? 8 : 0);
  if (v >= 45) return "O"; // Outstanding 优秀
  if (v >= 35) return "E"; // Exceeds Expectations 超出预期
  if (v >= 25) return "A"; // Acceptable 及格
  if (v >= 18) return "P"; // Poor 较差
  if (v >= 12) return "D"; // Dreadful 糟糕
  return "T"; // Troll 巨魔
}

/** 检定结果 → 数值结算（轻量）。返回 { stat, delta, housePoints } 供 app 应用。 */
export function checkEffects(action, check) {
  const map = { 大成功: 2, 成功: 1, 失败: 0, 大失败: -1 };
  const delta = map[check.tier] ?? 0;
  const housePoints = check.tier === "大成功" ? 5 : check.tier === "大失败" ? -3 : 0;
  return { stat: action.stat, delta, housePoints };
}

/** 生成给玩家看的透明判定文本。 */
export function formatRoll(action, check) {
  const parts = [`${check.statLabel} ${check.statValue}`];
  if (check.bonus) parts.push(`擅长 ${check.bonus}`);
  parts.push(`骰 ${check.roll}`);
  return `🎲 ${action.label} → ${parts.join(" + ")} − 难度 ${check.difficulty} = ${check.score}｜${check.tier}`;
}

/** 生成注入 prompt 的「检定结果」块（AI 据此叙事，不得改判）。 */
export function checkAnchor(action, check, target) {
  const what = target ? `「${action.label}：${target}」` : `「${action.label}」`;
  return (
    `【本回合检定结果（旁白必须据此叙事，不得改判成败）】\n` +
    `玩家发起行动：${what}\n` +
    `系统判定：${check.tier}（${check.success ? "成功" : "失败"}）` +
    `｜${check.statLabel} ${check.statValue} + 擅长 ${check.bonus} + 骰 ${check.roll} − 难度 ${check.difficulty} = ${check.score}\n` +
    `请把这个结果自然地演绎出来：成功则顺利、失败则受挫，符合该数值水平与霍格沃茨情境；不要替玩家做额外决定。`
  );
}
