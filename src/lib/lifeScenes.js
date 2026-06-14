/**
 * 沉浸式生活场景入口。
 *
 * 地点 / 倾向只表达玩家想去哪里、想要什么氛围，不代表固定收益或固定事件。
 * 具体发生什么由 AI 基于时间、地点、人物、记忆、原著节点自由生成；程序只在必要
 * 成败/门槛处做裁决。
 */

export const LIFE_SCENE_RULES =
  "【生活场景规则（自由度优先）】\n" +
  "1. 玩家选择地点或场景倾向，只代表 TA 想去哪里、想接近哪类氛围；绝不代表固定收益、固定剧情或固定数值变化。\n" +
  "2. 例如“去图书馆”不是自动读书成功或学术增加。你应依据当前时间、原著节点、在场角色、好感度、近期记忆，自由生成可能发生的生活片段：安静阅读、偶遇、误会、线索、被警告、什么也没发生等都可以。\n" +
  "3. 主控倾向只是软方向：平静日常、遇见某人、支线线索、危险靠近、暂缓主线等。你可以自然发挥，但不要把它机械化。\n" +
  "4. 只有当场景内出现明确成败、风险、门槛或关系跨级时，才需要服从系统的数值 / 好感度裁决。除此之外，请优先保持沉浸、自由和生活感。";

export const SCENE_LOCATIONS = [
  { id: "hall", label: "礼堂" },
  { id: "library", label: "图书馆" },
  { id: "classroom", label: "课堂" },
  { id: "corridor", label: "走廊" },
  { id: "courtyard", label: "庭院" },
  { id: "lake", label: "黑湖边" },
  { id: "pitch", label: "魁地奇球场" },
  { id: "common", label: "公共休息室" },
  { id: "owlery", label: "猫头鹰棚" },
  { id: "forest", label: "禁林边缘" },
];

export const SCENE_TONES = [
  { id: "open", label: "自由", instruction: "不指定事件，按当前世界自然发生" },
  { id: "daily", label: "日常", instruction: "偏平静生活，不强推大事件" },
  { id: "meet", label: "遇人", instruction: "可以安排合适角色自然出现" },
  { id: "thread", label: "支线", instruction: "可以露出一点支线线索或小麻烦" },
  { id: "risk", label: "危险", instruction: "可以让风险靠近，但不要越过当前原著阶段" },
  { id: "pauseCanon", label: "缓主线", instruction: "暂不推进原著大事件，保留生活片段" },
];

export const SCENE_PERIODS = [
  { id: "morning", label: "上午", instruction: "课程、早餐后的走廊、教授与同学更容易出现" },
  { id: "afternoon", label: "下午", instruction: "课程后、图书馆、庭院、球场和社团活动更自然" },
  { id: "dinner", label: "晚饭后", instruction: "礼堂、公共休息室、走廊闲聊和小支线更自然" },
  { id: "night", label: "夜晚", instruction: "公共休息室、宿舍、低声谈话和轻微违规更自然" },
  { id: "late", label: "深夜", instruction: "宵禁风险高，夜游、被发现、秘密线索更自然" },
];

export function formatLifePeriodBlock(period) {
  if (!period) return "";
  return `【当前生活时间段】${period.label}：${period.instruction}。这只是生活氛围与事件池参考，不代表固定剧情。`;
}

export function buildLifeSceneInput(location, tone, period) {
  const loc = location?.label || location || "";
  const t = tone || SCENE_TONES[0];
  const p = period || null;
  const periodLine = p ? `当前时间段：${p.label}（${p.instruction}）。` : "";
  const toneLine = t.id === "open" ? "" : `本次倾向：${t.label}（${t.instruction}）。`;
  return [
    `我想去${loc}。`,
    periodLine,
    toneLine,
    "请根据当前时间、地点、人物关系和已有记忆自由生成发生的事，不要把地点当成固定收益。"
  ].filter(Boolean).join("\n");
}
