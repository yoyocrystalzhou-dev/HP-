/**
 * 子世代（1991，哈利那一代）内置预设包 —— HP 专项的「世界数据」层。
 *
 * 这是内置常量，玩家不可见、不可编辑。进入子世代时由 loadPreset() 在后台
 * 实例化成一个隐藏的 Project 喂给引擎（见 DESIGN_子世代.md 第 5 节）。
 *
 * 源文件放在 ./sources/，通过 Vite 的 `?raw` 以纯文本导入，保持「单一可信源」，
 * 不把 12 万字内容复制成 JS 字面量。解析在加载时完成（一次性、开销极小）。
 *
 * 本文件目前完成：characters（人物卡）+ instructions（世界观硬规则）+ 世界观底本文件。
 * 待补（后续 P1 子步）：worldBook（专用名词卡）、storyMemory（编年时间线）、worldMemory。
 */

import personaRaw from "./sources/人物群像卡.txt?raw";
import worldviewRaw from "./sources/总体世界观.txt?raw";
import canonRaw from "./sources/哈利波特编年时间线.txt?raw";
import glossaryRaw from "./sources/专用名词卡.txt?raw";
import { parsePersona } from "./parsePersona.js";
import { parseCanonTimeline } from "./parseCanon.js";
import { parseGlossary } from "./parseGlossary.js";
import { ROSTER, ROSTER_NAMES } from "./roster.js";

// 人物卡：名册锚定解析 → 合并 roster 元数据（学院 / 身份）
const metaByName = new Map(ROSTER.map((r) => [r.name, r]));
const characters = parsePersona(personaRaw, ROSTER_NAMES).map((c) => {
  const meta = metaByName.get(c.name) || {};
  return { ...c, house: meta.house || "", role: meta.role || "student" };
});

/**
 * 世界观硬规则 —— 注入为 system instruction 的最高层。这是把 AI 关进笼子的核心：
 * 锁死时代、锁死人设、锁死世界规则，并规定「成败由系统判定、AI 只叙事」。
 */
const HARD_RULES = `你是「哈利·波特」子世代（1991 学年）互动叙事的旁白与角色扮演引擎。严格遵守以下不可违反的规则：

【时代锁定】
- 故事固定发生在 1991 年 9 月 1 日开学之后的霍格沃茨学年线上，处于「后伏地魔时代」的虚假和平：表面平静、暗流涌动。
- 不得跳到原著之后的剧情，不得剧透角色的未来命运（如谁会死、谁和谁结婚），除非玩家自身行动自然推进到那里。

【人设锁定】
- 所有出场角色的性格、说话风格、口头禅、血统、立场、人际关系，100% 遵循其角色卡，不得 OOC（脱离人设）。
- 未在资料中明确给出的玩家信息（身份、背景、关系、经历），一律不得编造或脑补；不确定就让角色表现为不知情。

【世界规则锁定】
- 四大学院体系、魁地奇规则、O.W.L./N.E.W.T. 考试、货币体系（1 加隆 = 17 西可 = 493 纳特）等设定固定不变。
- 伏地魔此时是逃逸的灵魂 / 暗线，绝不可在日常场景中实体复活；三大不可饶恕咒仅作为概念存在，不在日常触发使用。
- 保持休闲校园基调：成长、友谊、养成、轻冒险，避免血腥与致死暴力。

【数值与判定 —— 最重要】
- 你只是叙述者，不是裁判。施法是否成功、考试成绩、好感度增减等一切「有成败/数值」的结果，全部由系统预先判定后提供给你。
- 当上下文给出【判定结果】时，你必须严格依据它叙事；禁止自行决定成败、分数或任何数值变化，禁止推翻系统给定的结果。

【写作风格】
- 用简体中文，第三人称沉浸式叙事 + 角色对话（角色发言用「角色名：」标明）。
- 推进剧情、描写场景，但不要替玩家角色做决定或代替其发言。`;

export const childGen = {
  presetId: "child_gen",
  name: "子世代 · 1991 霍格沃茨",
  locked: true,
  era: { start: "1991年9月", tone: "校园日常 / 成长 / 友谊 / 养成" },
  currentTimeLabel: "1991年9月1日",
  instructions: HARD_RULES,
  files: [
    { title: "总体世界观（原著设定底本）", content: worldviewRaw.trim(), enabled: true },
  ],
  characters, // [{ name, persona, avatar, house, role }]
  canonTimeline: parseCanonTimeline(canonRaw), // 原著节点表，驱动时间推进与防跑偏锚点
  worldBook: parseGlossary(glossaryRaw), // 专用名词卡 → 关键词触发的世界书（144 条）
  worldMemory: [], // TODO
  storyMemory: [], // TODO: 编年时间线
};

export default childGen;
