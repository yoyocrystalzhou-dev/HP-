import { ACTIONS, parseActionCommand } from "./checks.js";
import { COURSES, normalizeCourses } from "./courses.js";
import { labelSortKey } from "./timeline.js";
import { HOGWARTS_LOCATIONS } from "./hogwartsLifeEngine.js";
import { hasItem } from "./inventory.js";

const has = (text, words) => words.some((word) => text.includes(word));

function compact(text) {
  return String(text || "").replace(/\s+/g, "");
}

function targetAfter(text, pattern) {
  const m = text.match(pattern);
  return (m?.[1] || "").trim();
}

function matchExplicitLocations(text, limit = 4) {
  const raw = compact(text).toLowerCase();
  const scored = [];
  for (const place of HOGWARTS_LOCATIONS) {
    let score = 0;
    const names = [place.label, place.id, ...(place.aliases || [])];
    for (const name of names) {
      const n = compact(name).toLowerCase();
      if (n && raw.includes(n)) score += n.length > 2 ? 3 : 1;
    }
    if (score) scored.push({ place, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.place.label.localeCompare(b.place.label, "zh-Hans-CN"))
    .slice(0, limit)
    .map((x) => x.place);
}

const SAFE_NIGHT_LOCATIONS = new Set(["common_room", "dormitory", "hospital_wing"]);
const RISK_ACCESS = new Set(["restricted", "forbidden", "hidden"]);
const NIGHT_PUBLIC_RISK = new Set([
  "corridors",
  "grand_staircase",
  "entrance_hall",
  "library",
  "restricted_section",
  "trophy_room",
  "bathrooms",
  "kitchens",
  "staff_room",
  "filch_office",
  "astronomy_tower",
  "secret_passages",
]);

const ACTION_LOCATION_RULES = {
  飞行: {
    allowed: new Set(["flying_lawn", "quidditch_pitch", "lawns"]),
    reason: "飞行和扫帚训练需要在飞行课草坪、魁地奇球场或足够开阔的室外场地进行，不能在城堡室内直接起飞。",
  },
  魔药: {
    allowed: new Set(["potions_dungeon", "common_room", "dormitory"]),
    reason: "熬制魔药需要坩埚、药材和安全桌面，通常应在魔药课地下教室或有明确器材的安全空间进行。",
  },
  草药: {
    allowed: new Set(["herbology_greenhouses", "lawns", "forbidden_forest_edge", "hagrids_hut"]),
    reason: "草药实践需要植物、泥土或温室环境，通常应在温室、草坪、海格小屋附近或禁林边缘进行。",
  },
  防御: {
    allowed: new Set(["dada_classroom", "courtyard", "lawns", "common_room", "quidditch_pitch"]),
    reason: "防御术练习需要相对安全的练习空间，不能在人群拥挤或不适合施咒的地方贸然开始。",
  },
  练咒: {
    blocked: new Set(["great_hall", "library", "hospital_wing"]),
    reason: "这里不适合直接练咒，容易打扰他人或造成事故；应换到课堂、庭院、空教室或更安全的地方。",
  },
  变形: {
    blocked: new Set(["great_hall", "library", "hospital_wing"]),
    reason: "这里不适合直接做变形术练习，容易打扰他人或造成事故；应换到课堂、庭院、空教室或更安全的地方。",
  },
  课堂: {
    allowed: new Set([
      "charms_classroom",
      "transfiguration_classroom",
      "potions_dungeon",
      "dada_classroom",
      "herbology_greenhouses",
      "history_magic_classroom",
      "astronomy_tower",
      "flying_lawn",
    ]),
    reason: "课堂表现需要在课堂或正式教学场景里发生；如果这里只是在走廊或休息室，应该先进入对应课程场景。",
  },
};

function actionLocationIssue(command, places) {
  const rule = ACTION_LOCATION_RULES[command];
  if (!rule || !places.length) return null;
  const ids = new Set(places.map((p) => p.id));
  if (rule.allowed && ![...ids].some((id) => rule.allowed.has(id))) return rule.reason;
  if (rule.blocked && [...ids].some((id) => rule.blocked.has(id))) return rule.reason;
  return null;
}

function withLocationGate(command, action, target, text) {
  const places = matchExplicitLocations(text, 4);
  const issue = actionLocationIssue(command, places);
  return {
    command,
    action,
    target,
    inferred: true,
    places: places.map((p) => ({ id: p.id, label: p.label })),
    blockedReason: issue || "",
  };
}

function inferRiskyMovement(text, periodId) {
  const places = matchExplicitLocations(text, 4);
  const ids = new Set(places.map((p) => p.id));
  if ([...ids].some((id) => SAFE_NIGHT_LOCATIONS.has(id))) {
    const onlySafe = [...ids].every((id) => SAFE_NIGHT_LOCATIONS.has(id));
    if (onlySafe) return null;
  }
  const restricted = places.find((p) => RISK_ACCESS.has(p.access));
  if (restricted) return restricted.label;
  if (!places.length && has(compact(text), ["禁区", "禁地", "不该去的地方", "被禁止的地方"])) return "限制区域";
  if ((periodId === "night" || periodId === "late") && places.some((p) => NIGHT_PUBLIC_RISK.has(p.id))) {
    return places.find((p) => NIGHT_PUBLIC_RISK.has(p.id))?.label || "夜间公共区域";
  }
  if (periodId === "late" && has(compact(text), ["离开", "出去", "走出", "穿过", "前往", "溜出"])) {
    return "深夜离开允许区域";
  }
  return null;
}

export function inferNaturalCommand(text, { periodId = "morning", currentTimeLabel = "" } = {}) {
  const raw = compact(text);
  if (!raw || parseActionCommand(raw)) return null;
  const key = labelSortKey(currentTimeLabel);

  if (has(raw, ["睡觉", "睡下", "入睡", "补眠", "回去睡", "直接睡", "回去休息"]) || /(?:^|[，。！？；、])(?:我)?(?:想|要|准备)?休息(?:一下|一会儿|了|$)/.test(raw)) {
    return { command: "休息", action: ACTIONS.休息, target: "", inferred: true };
  }

  if (has(raw, ["告白", "表白", "说喜欢", "告诉他我喜欢", "告诉她我喜欢"])) {
    const target = targetAfter(raw, /(?:向|对|告诉)(.{1,12}?)(?:告白|表白|说喜欢|我喜欢)/);
    return { command: "告白", action: ACTIONS.告白, target, inferred: true };
  }

  if (has(raw, ["参加考试", "进入考试", "期末考试", "期末考", "考试场景"]) || (key >= 19920601 && key <= 19920605 && has(raw, ["考试", "考场", "试卷"]))) {
    return { command: "考试", action: ACTIONS.考试, target: "", inferred: true };
  }

  const riskyMovement = inferRiskyMovement(text, periodId);
  if (riskyMovement) {
    return { command: "夜游", action: ACTIONS.夜游, target: riskyMovement, inferred: true };
  }

  if (has(raw, ["熬魔药", "调魔药", "配魔药", "搅拌坩埚", "处理坩埚", "切药材", "称量药材", "加入药材"])) {
    return withLocationGate("魔药", ACTIONS.魔药, targetAfter(raw, /(?:熬|调|配)(.{1,12}?)(?:魔药|药剂)/), text);
  }

  if (has(raw, ["变形术", "变成", "变出来", "把", "火柴变针"])) {
    if (has(raw, ["变形术", "变成", "变出来", "火柴变针"])) {
      return withLocationGate("变形", ACTIONS.变形, targetAfter(raw, /把(.{1,16}?)(?:变成|变为)/), text);
    }
  }

  if (has(raw, ["曼德拉草", "照料植物", "处理植物", "给植物", "修剪植物", "移栽", "换盆", "采摘草药"])) {
    return withLocationGate("草药", ACTIONS.草药, "草药课堂/植物照料", text);
  }

  if (has(raw, ["缴械", "除你武器", "盔甲护身", "抵挡咒语", "练防御", "防御术练习", "黑魔法防御练习"])) {
    return withLocationGate("防御", ACTIONS.防御, "防御术练习", text);
  }

  if (has(raw, ["骑扫帚", "骑上扫帚", "跨上扫帚", "飞上", "飞起来", "飞行训练", "魁地奇训练", "魁地奇选拔", "参加选拔"])) {
    return withLocationGate("飞行", ACTIONS.飞行, "扫帚/魁地奇", text);
  }

  if (has(raw, ["练习咒", "练咒", "施咒", "念咒", "挥杖", "漂浮咒", "荧光闪烁", "阿拉霍洞开", "修复如初"])) {
    return withLocationGate("练咒", ACTIONS.练咒, targetAfter(raw, /(漂浮咒|荧光闪烁|阿拉霍洞开|修复如初|除你武器)/) || "咒语练习", text);
  }

  if (has(raw, ["按课表上课", "去上课", "上课", "魔咒课", "魔药课", "变形术课", "草药课", "防御术课", "魔法史课", "飞行课", "课堂表现", "回答问题", "举手回答", "被点名", "课堂展示", "课堂示范", "小测", "随堂测验"])) {
    return withLocationGate("课堂", ACTIONS.课堂, "课堂表现", text);
  }

  if (has(raw, ["推开", "挡住", "争执", "吵起来", "冲突", "对峙", "抢回", "保护"])) {
    return { command: "冲突", action: ACTIONS.冲突, target: "冲突处理", inferred: true };
  }

  const socialTarget = targetAfter(raw, /(?:向|对|安慰|道歉|邀请|送给|请求|拜托|说服)(.{1,12}?)(?:道歉|安慰|解释|邀请|送|请求|拜托|说服)/);
  if (socialTarget) return { command: "社交", action: ACTIONS.社交, target: socialTarget, inferred: true };

  return null;
}

export function adjustedActionCost(action, periodId = "morning") {
  const base = action?.cost || 10;
  if (action?.rest || action?.exam || action?.ending || action?.confess) return 0;
  let extra = 0;
  if (periodId === "night") extra += 4;
  if (periodId === "late") extra += 8;
  if (action?.risky) extra += periodId === "late" ? 6 : periodId === "night" ? 3 : 0;
  return base + extra;
}

export function inventoryIssueForCommand(cmd, inventory) {
  if (!cmd?.command) return "";
  const command = cmd.command;
  const placeIds = new Set((cmd.places || []).map((p) => p.id));
  if (["练咒", "变形", "防御"].includes(command) && !hasItem(inventory, "wand")) {
    return "玩家背包里还没有确认获得魔杖，不能直接进行需要挥杖的练习或防御术。";
  }
  if (command === "魔药") {
    const classroomSupplied = placeIds.has("potions_dungeon");
    if (!classroomSupplied && (!hasItem(inventory, "cauldron") || !hasItem(inventory, "potion_kit"))) {
      return "玩家还没有确认拥有坩埚和魔药材料；除非在正式魔药教室使用课堂器材，否则不能直接熬制魔药。";
    }
  }
  return "";
}

export function shouldAdvancePeriod({ messageKind, command }) {
  if (messageKind === "calendarChoice") return true;
  return !!command && !["休息", "告白", "结局"].includes(command);
}

export function examKeyForTime(currentTimeLabel = "") {
  const key = labelSortKey(currentTimeLabel);
  const year = key ? String(key).slice(0, 4) : "unknown";
  return `${year}-final`;
}

export function gradeForCourseValue(value, favored = false) {
  const v = Number(value || 0) + (favored ? 8 : 0);
  if (v >= 45) return "O";
  if (v >= 35) return "E";
  if (v >= 25) return "A";
  if (v >= 18) return "P";
  if (v >= 12) return "D";
  return "T";
}

export function settleExam(player, currentTimeLabel = "") {
  const cs = normalizeCourses(player?.courses);
  const subs = player?.meta?.subjects || [];
  const results = COURSES.map((s) => ({ s, g: gradeForCourseValue(cs[s], subs.includes(s)) }));
  const hp = results.reduce((a, r) => a + ({ O: 10, E: 6, A: 3, P: 0, D: -2, T: -5 }[r.g] || 0), 0);
  return { key: examKeyForTime(currentTimeLabel), results, hp };
}

export function formatExamLine(results, hp) {
  return `📜 期末成绩：${results.map((r) => `${r.s.replace(" / 魁地奇", "")} ${r.g}`).join(" · ")}  ·  学院分 ${hp >= 0 ? "+" : ""}${hp}`;
}

export function examAnchor(results, hp, { repeated = false } = {}) {
  return `【期末考试结果（旁白必须据此宣布，不得改判等级）】\n` +
    results.map((r) => `${r.s}：${r.g}`).join("\n") +
    `\n（等级：O 优秀 / E 超出预期 / A 及格 / P 较差 / D 糟糕 / T 巨魔）\n学院分变化 ${hp >= 0 ? "+" : ""}${hp}。` +
    (repeated ? "本次成绩此前已经结算过，请作为既定结果回顾或发榜，不要再次考试加分。" : "请描写考试与发榜场景，符合各科水平。");
}
