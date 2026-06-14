/**
 * 课程数值（HP 专项）。按科目分别记录水平（不同于 6 个综合养成数值）。
 * 上课/练习对应科目会提升该课程值；期末成绩按课程值评等级。
 * 存玩家层：player.courses = { [科目]: 0-100 }。
 */

export const COURSES = ["魔咒学", "魔药学", "变形术", "草药学", "黑魔法防御术", "魔法史", "天文学", "飞行 / 魁地奇"];

const C_BASE = 8;
const FAVORED_BONUS = 12; // 擅长科目起点更高

export function initialCourses(meta = {}) {
  const c = {};
  COURSES.forEach((s) => (c[s] = C_BASE));
  (meta.subjects || []).forEach((s) => { if (s in c) c[s] = C_BASE + FAVORED_BONUS; });
  return c;
}

export function normalizeCourses(courses) {
  const c = {};
  COURSES.forEach((s) => (c[s] = courses && typeof courses[s] === "number" ? courses[s] : C_BASE));
  return c;
}

/** 注入 prompt：各科课程水平（给旁白课堂/考试场景参考）。 */
export function formatCoursesBlock(courses) {
  const c = normalizeCourses(courses);
  return `【玩家各科课程水平（满 100，据此体现课堂表现与考试，水平低的科目别写成轻松出色）】\n${COURSES.map((s) => `${s} ${c[s]}`).join(" · ")}`;
}
