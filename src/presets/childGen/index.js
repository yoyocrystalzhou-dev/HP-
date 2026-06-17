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
const parsedCharacters = parsePersona(personaRaw, ROSTER_NAMES).map((c) => {
  const meta = metaByName.get(c.name) || {};
  return { ...c, house: meta.house || "", role: meta.role || "student" };
});
const parsedByName = new Map(parsedCharacters.map((c) => [c.name, c]));
const fallbackPersona = (meta) => [
  `基础信息：${meta.name}，${meta.house ? `${meta.house}学院，` : ""}${meta.role || "student"}。`,
  meta.persona ? `人物定位：${meta.persona}` : "",
  "使用规则：遵循原著时间线与身份边界；若当前年份尚未到其高频出场阶段，只能作为背景、传闻、书信或短暂相遇出现，不得提前推进后期重大事件。",
].filter(Boolean).join("\n");
const characters = ROSTER.map((meta) => {
  const parsed = parsedByName.get(meta.name);
  if (parsed) return { ...parsed, house: meta.house || parsed.house || "", role: meta.role || parsed.role || "student" };
  return {
    name: meta.name,
    persona: fallbackPersona(meta),
    avatar: "🪄",
    house: meta.house || "",
    role: meta.role || "student",
  };
});

/**
 * 世界观硬规则 —— 注入为 system instruction 的最高层。这是把 AI 关进笼子的核心：
 * 锁死时代、锁死人设、锁死世界规则，并规定「成败由系统判定、AI 只叙事」。
 */
const HARD_RULES = `你是「哈利·波特」子世代（1991 学年）互动叙事的旁白与角色扮演引擎。严格遵守以下不可违反的规则：

【时间线锁定】
- 故事从 1991 年 8 月中下旬的开学前采购序章开始，沿原著编年顺次跨越 1991–1998 共七个学年（魔法石→密室→阿兹卡班的囚徒→火焰杯→凤凰社→混血王子→死亡圣器），直至 1998 年霍格沃茨大战与十九年后的尾声。
- 当前所处阶段以上下文给出的【原著剧情锚点】为准：只演绎「锚点所在阶段及之前」已发生的剧情，绝不得抢先发生更后面的事件，也不得剧透尚未到来的角色命运（如谁会死、谁和谁结婚）。
- 早期学年（1991–1994 上半段）整体是「后伏地魔时代」的虚假和平：表面平静、暗流涌动；随时间线推进，黑暗会按原著节奏逐步降临。

【人设锁定】
- 所有出场角色的性格、说话风格、口头禅、血统、立场、人际关系，100% 遵循其角色卡，不得 OOC（脱离人设）。
- 未在资料中明确给出的玩家信息（身份、背景、关系、经历），一律不得编造或脑补；不确定就让角色表现为不知情。

【世界规则锁定】
- 四大学院体系、魁地奇规则、O.W.L./N.E.W.T. 考试、货币体系（1 加隆 = 17 西可 = 493 纳特）等设定固定不变。
- 伏地魔的状态随时间线变化：第四学年三强争霸赛（1995 年 6 月）之前，他只是逃逸的灵魂 / 暗线，不得在日常场景中提前实体复活；其复活及之后的崛起，只在时间线推进到相应阶段（以【原著剧情锚点】为准）时才发生。
- 三大不可饶恕咒在日常校园里不随意触发；但原著重大事件（如墓地复活、神秘事务司之战、霍格沃茨大战）按其原著严肃程度演绎。
- 日常以休闲校园基调为主：成长、友谊、养成、轻冒险；进入后期黑暗学年时可转为紧张严肃，但避免无谓血腥与过度致死暴力描写。

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
  currentTimeLabel: "1991年8月16日 · 对角巷采购",
  instructions: HARD_RULES,
  files: [
    { title: "总体世界观（原著设定底本）", content: worldviewRaw.trim(), enabled: true },
  ],
  characters, // [{ name, persona, avatar, house, role }]
  canonTimeline: parseCanonTimeline(canonRaw), // 原著节点表，驱动时间推进与防跑偏锚点
  worldBook: parseGlossary(glossaryRaw), // 专用名词卡 → 关键词触发的世界书（144 条）
  worldMemory: [], // TODO
  storyMemory: [], // TODO: 编年时间线
  currentState: {
    location: "对角巷",
    scene: "开学前采购",
    arc: "入学准备",
    presentCharacters: [],
    recentEvents: [],
    unresolvedThreads: [],
    knownFacts: [
      { content: "玩家即将入读霍格沃茨，需要完成开学前采购。" },
      { content: "采购序章结束后，玩家将于 1991 年 9 月 1 日前往国王十字车站和九又四分之三站台。" },
    ],
    forbiddenAssumptions: [
      { content: "不得跳过开学前采购直接进入长期校园日常，除非玩家明确选择准备出发或类似过渡。" },
    ],
  },
};

export default childGen;
