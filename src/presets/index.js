/**
 * 世代预设包注册表 + 首页用的三世代元数据。
 * 祖 / 亲世代暂未做内容，available:false（首页灰显「敬请期待」）。
 */

import { childGen } from "./childGen/index.js";

export const PRESETS = {
  child_gen: childGen,
};

export const GENERATIONS = [
  {
    id: "grand_gen",
    title: "祖世代",
    subtitle: "哈利的祖父母辈",
    blurb: "更早的年代",
    available: false,
  },
  {
    id: "parent_gen",
    title: "亲世代",
    subtitle: "劫盗者时代",
    blurb: "詹姆与莉莉的学生岁月",
    available: false,
  },
  {
    id: "child_gen",
    title: "子世代",
    subtitle: "1991 · 哈利那一代",
    blurb: "你与哈利同届入学霍格沃茨，后伏地魔时代的虚假和平。",
    available: true,
    presetId: "child_gen",
  },
];
