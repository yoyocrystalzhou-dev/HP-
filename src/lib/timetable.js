import { labelSortKey } from "./timeline.js";

const COURSE_META = {
  "魔咒学": { teacher: "弗立维教授", location: "魔咒课教室", locationId: "charms_classroom" },
  "魔药学": { teacher: "斯内普教授", location: "魔药课地下教室", locationId: "potions_dungeon" },
  "变形术": { teacher: "麦格教授", location: "变形术教室", locationId: "transfiguration_classroom" },
  "草药学": { teacher: "斯普劳特教授", location: "草药课温室", locationId: "herbology_greenhouses" },
  "黑魔法防御术": { teacher: "奇洛教授", location: "黑魔法防御术教室", locationId: "dada_classroom" },
  "魔法史": { teacher: "宾斯教授", location: "魔法史教室", locationId: "history_magic_classroom" },
  "天文学": { teacher: "辛尼斯塔教授", location: "天文塔", locationId: "astronomy_tower" },
  "飞行 / 魁地奇": { teacher: "霍琦夫人", location: "飞行课草坪", locationId: "flying_lawn" },
};

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// 一年级生活课表：用于自然场景和课堂地点约束，不代表每天只有这些事。
export const FIRST_YEAR_TIMETABLE = {
  1: {
    morning: ["魔咒学", "魔法史"],
    afternoon: ["草药学"],
    evening: ["作业 / 公共休息室"],
  },
  2: {
    morning: ["变形术"],
    afternoon: ["黑魔法防御术", "飞行 / 魁地奇"],
    evening: ["图书馆 / 复习"],
  },
  3: {
    morning: ["魔药学"],
    afternoon: ["魔咒学"],
    evening: ["学院活动 / 休息室"],
  },
  4: {
    morning: ["草药学", "魔法史"],
    afternoon: ["变形术"],
    evening: ["作业 / 自由活动"],
  },
  5: {
    morning: ["黑魔法防御术"],
    afternoon: ["魔药学"],
    evening: ["礼堂晚餐 / 周末前闲聊"],
  },
};

export function datePartsFromLabel(label = "") {
  const m = String(label || "").match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function weekdayForLabel(label = "") {
  const parts = datePartsFromLabel(label);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function isBeforeTerm(label = "") {
  const key = labelSortKey(label);
  return !!key && key < 19910901;
}

export function isHoliday(label = "") {
  const key = labelSortKey(label);
  if (!key) return false;
  if (key >= 19911224 && key <= 19920105) return true;
  if (key >= 19920411 && key <= 19920426) return true;
  if (key >= 19920621) return true;
  return false;
}

function lesson(course) {
  const meta = COURSE_META[course] || {};
  return {
    course,
    teacher: meta.teacher || "",
    location: meta.location || "",
    locationId: meta.locationId || "",
  };
}

export function lessonsFor({ currentTimeLabel = "", periodId = "morning" } = {}) {
  if (isBeforeTerm(currentTimeLabel) || isHoliday(currentTimeLabel)) return [];
  const weekday = weekdayForLabel(currentTimeLabel);
  if (!weekday || weekday === 0 || weekday === 6) return [];
  const day = FIRST_YEAR_TIMETABLE[weekday] || {};
  if (periodId === "morning") return (day.morning || []).map(lesson);
  if (periodId === "afternoon") return (day.afternoon || []).map(lesson);
  return [];
}

export function eveningPlanFor(currentTimeLabel = "") {
  if (isBeforeTerm(currentTimeLabel)) return "";
  const weekday = weekdayForLabel(currentTimeLabel);
  if (!weekday || weekday === 0 || weekday === 6) return "";
  return FIRST_YEAR_TIMETABLE[weekday]?.evening || "";
}

export function timetableContext({ currentTimeLabel = "", periodId = "morning" } = {}) {
  const weekday = weekdayForLabel(currentTimeLabel);
  const lessons = lessonsFor({ currentTimeLabel, periodId });
  const eveningPlan = eveningPlanFor(currentTimeLabel);
  const label = weekday == null ? "" : WEEKDAY_LABELS[weekday];
  return {
    weekday,
    weekdayLabel: label,
    lessons,
    eveningPlan,
    hasClass: lessons.length > 0,
    holiday: isHoliday(currentTimeLabel),
    beforeTerm: isBeforeTerm(currentTimeLabel),
  };
}

export function formatLesson(lessonItem) {
  if (!lessonItem) return "";
  return `${lessonItem.course}${lessonItem.location ? `（${lessonItem.location}` : ""}${lessonItem.teacher ? ` · ${lessonItem.teacher}` : ""}${lessonItem.location ? "）" : ""}`;
}

export function formatTimetableBlock(ctx) {
  if (!ctx || ctx.beforeTerm) return "";
  const lines = ["【今日课表】"];
  if (ctx.weekdayLabel) lines.push(`今天是${ctx.weekdayLabel}。`);
  if (ctx.holiday) {
    lines.push("当前处于假期或离校阶段，没有常规课堂；日常应偏向假期安排、留校生活、通信或返校准备。");
  } else if (ctx.lessons?.length) {
    lines.push(`当前时间段课程：${ctx.lessons.map(formatLesson).join("；")}。`);
    lines.push("课堂是生活场景，不是固定收益按钮；可自然发生点名、示范、同桌互动、教授关注、误会、作业、材料事故或平静上课。");
  } else if (ctx.eveningPlan) {
    lines.push(`晚间倾向：${ctx.eveningPlan}。`);
  } else {
    lines.push("当前不是常规上课时段；除非玩家主动前往课堂或校历事件要求，不要把场景硬切成课堂。");
  }
  return lines.join("\n");
}

export function classChoiceFromTimetable(ctx) {
  const first = ctx?.lessons?.[0];
  if (!first) return null;
  const short = first.course
    .replace("魔咒学", "魔咒")
    .replace("魔药学", "魔药")
    .replace("黑魔法防御术", "防御术")
    .replace("飞行 / 魁地奇", "飞行");
  return {
    label: `上${short}课`,
    intent: `我想按课表上课：${formatLesson(first)}，看看课堂上自然发生什么。`,
    lesson: first,
    mechanic: "课堂",
  };
}
