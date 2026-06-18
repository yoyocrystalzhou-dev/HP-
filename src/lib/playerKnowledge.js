import { labelSortKey } from "./timeline.js";

const SORTING_DAY = 19910901;
const HOUSE_NAMES = ["格兰芬多", "斯莱特林", "拉文克劳", "赫奇帕奇"];

function stateText(currentState = {}) {
  const listText = (items = []) => items.map((item) => item?.content || item?.ref || item || "").join("；");
  return [
    currentState.location,
    currentState.scene,
    currentState.arc,
    listText(currentState.presentCharacters),
    listText(currentState.recentEvents),
    listText(currentState.unresolvedThreads),
    listText(currentState.knownFacts),
  ].filter(Boolean).join("；");
}

export function housePublicInStory({ currentTimeLabel = "", periodId = "", currentState = {} } = {}) {
  const key = labelSortKey(currentTimeLabel);
  const state = stateText(currentState);
  if (key && key < SORTING_DAY) return false;
  if (key > SORTING_DAY) return true;
  if (/分院帽|分院仪式|被分到|分入|正式分院|公共休息室|跟着级长/.test(state)) return true;
  return false;
}

export function containsPreSortingHouseClaim(text = "", playerName = "") {
  const source = String(text || "");
  if (!source) return false;
  const houses = HOUSE_NAMES.join("|");
  const names = ["你", "玩家", "主控", playerName].filter(Boolean).map((name) => String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const verbs = "分在|分到|分入|分进|进入|进了|进到|属于|成为|成了|是";
  return new RegExp(`(${names}).{0,24}(果然|已经|将会|会|被|正式)?.{0,8}(${verbs}).{0,8}(${houses})`).test(source) ||
    new RegExp(`(果然|已经|早就).{0,10}(${verbs}).{0,8}(${houses})`).test(source);
}

function filterItems(items = [], playerName = "") {
  return (items || []).filter((item) => !containsPreSortingHouseClaim(item?.content || item?.ref || item || "", playerName));
}

export function currentStateForNarration(currentState = {}, player = {}, context = {}) {
  if (housePublicInStory({ ...context, currentState })) return currentState;
  const playerName = player?.name || "";
  return {
    ...(currentState || {}),
    scene: containsPreSortingHouseClaim(currentState?.scene, playerName) ? "" : currentState?.scene,
    recentEvents: filterItems(currentState?.recentEvents, playerName),
    unresolvedThreads: filterItems(currentState?.unresolvedThreads, playerName),
    knownFacts: filterItems(currentState?.knownFacts, playerName),
  };
}

export function lifeLogForNarration(lifeLog = [], player = {}, context = {}) {
  if (housePublicInStory(context)) return Array.isArray(lifeLog) ? lifeLog : [];
  const playerName = player?.name || "";
  return (Array.isArray(lifeLog) ? lifeLog : []).filter((entry) => !containsPreSortingHouseClaim([
    entry?.scene,
    entry?.userText,
    entry?.assistantText,
    entry?.rollLine,
  ].filter(Boolean).join(" "), playerName));
}

export function sanitizePlayerPersonaForNarration(persona = "", housePublic = false) {
  const text = String(persona || "");
  if (housePublic) return text;
  return text
    .split(/\n/)
    .map((line) => (/^\s*学院\s*[:：]/.test(line) ? "学院：尚未正式分院（分院前不得作为公开事实）" : line))
    .join("\n");
}

export function playerForNarration(player = {}, context = {}) {
  const publicHouse = housePublicInStory(context);
  if (publicHouse) return player;
  return {
    ...player,
    persona: sanitizePlayerPersonaForNarration(player.persona, false),
    meta: { ...(player.meta || {}), house: "" },
  };
}

export function preSortingHouseGuard(player = {}, context = {}) {
  const house = player?.meta?.house || "";
  if (!house || housePublicInStory(context)) return "";
  return [
    "【分院前学院保密（硬规则）】",
    "玩家建卡时选择的学院只用于后台数值与未来分院倾向；当前剧情尚未正式完成分院。",
    "在正式分院发生前，任何 NPC 都不知道玩家最终学院，也不能说玩家已经属于、将会属于、果然分到或适合某个具体学院。",
    "如果旧日志、摘要或上一条错误回复中出现玩家已被分入某学院的说法，在分院前一律视为无效错误记忆并忽略。",
    "本轮可以描写他人猜测、试探、偏见或好奇，但必须保持不确定，不能说破具体学院结论。",
  ].join("\n");
}
