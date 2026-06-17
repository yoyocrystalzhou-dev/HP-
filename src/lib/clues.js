import { uid } from "./utils.js";

const TYPE_LABELS = {
  canon: "原著回声",
  daily: "日常小支线",
  relationship: "角色关系",
};

const TYPE_ALIASES = {
  原著回声: "canon",
  原著: "canon",
  canon: "canon",
  日常小支线: "daily",
  日常: "daily",
  小支线: "daily",
  daily: "daily",
  角色关系: "relationship",
  关系: "relationship",
  relationship: "relationship",
};

const STATUS_LABELS = {
  new: "初见",
  suspected: "怀疑",
  evidence: "有证据",
  tied: "牵连人物",
  paused: "暂搁",
  resolved: "已收束",
};

const STATUS_ALIASES = {
  初见: "new",
  新: "new",
  new: "new",
  怀疑: "suspected",
  推进: "suspected",
  suspected: "suspected",
  证据: "evidence",
  有证据: "evidence",
  evidence: "evidence",
  牵连人物: "tied",
  牵连: "tied",
  tied: "tied",
  暂搁: "paused",
  搁置: "paused",
  paused: "paused",
  已收束: "resolved",
  收束: "resolved",
  完成: "resolved",
  resolved: "resolved",
};

const FORBIDDEN_WORLD_MYSTERY = [
  "未知组织",
  "秘密组织",
  "幕后黑手",
  "新反派",
  "原创反派",
  "世界线",
  "平行世界",
  "穿越",
  "时间裂缝",
  "空间裂缝",
  "神器",
  "古代魔法",
  "古老神器",
  "远古神器",
  "创始人遗物",
  "血脉诅咒",
  "血统诅咒",
  "家族宿命",
  "救世主替代",
  "新密室",
  "改写原著",
  "改变原著",
  "魔法界命运",
  "世界命运",
];

const WORLD_SCALE_COMBOS = [
  ["古老", "预言"],
  ["远古", "预言"],
  ["家族", "预言"],
  ["血脉", "钥匙"],
  ["血统", "钥匙"],
  ["血脉", "命运"],
  ["血统", "命运"],
  ["世界", "崩塌"],
  ["世界", "裂缝"],
  ["世界", "改写"],
  ["魔法界", "阴谋"],
  ["魔法界", "命运"],
  ["创始人", "遗物"],
  ["创始人", "钥匙"],
];

const INVENTED_CANON_CONTAMINATION = [
  "未知组织",
  "秘密组织",
  "幕后黑手",
  "新反派",
  "原创反派",
  "原创神器",
  "新密室",
  "世界线",
  "平行世界",
  "穿越",
  "古代魔法",
  "创始人遗物",
  "血脉诅咒",
  "血统诅咒",
  "救世主替代",
  "改写原著",
  "改变原著",
];

const CANON_KEYWORDS = [
  "魔法石",
  "尼可·勒梅",
  "尼可勒梅",
  "尼古拉斯·勒梅",
  "尼古拉斯勒梅",
  "三头犬",
  "路威",
  "奇洛",
  "斯内普",
  "禁书区",
  "巨怪",
  "厄里斯魔镜",
  "魁地奇异常",
  "飞贼",
  "禁林",
  "独角兽",
  "伏地魔",
  "713",
  "古灵阁",
  "活板门",
  "魔鬼网",
  "飞行钥匙",
  "巫师棋",
  "逻辑谜题",
  "分院帽",
  "格兰芬多宝剑",
  "密室",
  "汤姆·里德尔",
  "汤姆里德尔",
  "里德尔日记",
  "日记魂器",
  "蛇怪",
  "哭泣的桃金娘",
  "桃金娘",
  "洛丽丝夫人",
  "复方汤剂",
  "阿拉戈克",
  "跟着蜘蛛走",
  "曼德拉草",
  "小天狼星",
  "布莱克",
  "摄魂怪",
  "卢平",
  "活点地图",
  "彼得·佩迪鲁",
  "彼得佩迪鲁",
  "斑斑",
  "巴克比克",
  "时间转换器",
  "火焰杯",
  "三强争霸",
  "塞德里克",
  "疯眼汉",
  "克劳奇",
  "墓地",
  "伏地魔复活",
  "凤凰社",
  "邓布利多军",
  "预言球",
  "神秘事务司",
  "乌姆里奇",
  "夜骐",
  "混血王子",
  "魂器",
  "斯拉格霍恩",
  "马沃罗",
  "拉文克劳冠冕",
  "赫奇帕奇金杯",
  "斯莱特林挂坠盒",
  "冈特戒指",
  "死亡圣器",
  "长老魔杖",
  "复活石",
  "格林德沃",
  "七个波特",
  "马尔福庄园",
  "贝拉特里克斯",
  "霍格沃茨之战",
];

function cleanText(value, max = 80) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeType(value) {
  return TYPE_ALIASES[cleanText(value, 24)] || "";
}

function normalizeStatus(value) {
  return STATUS_ALIASES[cleanText(value, 24)] || "new";
}

function hasForbiddenMystery(text) {
  return (
    FORBIDDEN_WORLD_MYSTERY.some((word) => text.includes(word)) ||
    WORLD_SCALE_COMBOS.some((words) => words.every((word) => text.includes(word)))
  );
}

function hasCanonAnchor(text) {
  return CANON_KEYWORDS.some((word) => text.includes(word));
}

function hasInventedCanonContamination(text) {
  return (
    INVENTED_CANON_CONTAMINATION.some((word) => text.includes(word)) ||
    WORLD_SCALE_COMBOS.some((words) => words.every((word) => text.includes(word)))
  );
}

function normalizeScale(value) {
  const raw = cleanText(value, 20).toLowerCase();
  if (!raw) return "小";
  if (raw.includes("大") || raw.includes("large") || raw.includes("世界") || raw.includes("主线")) return "大";
  if (raw.includes("中") || raw.includes("medium")) return "中";
  return "小";
}

function normalizeTurnsLeft(partial, type) {
  const raw = partial.turnsLeft ?? partial.deadline;
  const fallback = type === "canon" ? 3 : 2;
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  return Math.max(0, Math.min(3, Number.isFinite(value) ? value : fallback));
}

function parseFields(body) {
  const out = {};
  for (const part of String(body || "").split(/[；;\n]+/)) {
    const m = part.trim().match(/^([^:=：＝]+)[:=：＝](.+)$/);
    if (!m) continue;
    out[cleanText(m[1], 20)] = cleanText(m[2], 120);
  }
  return out;
}

export function createClue(partial = {}) {
  const type = normalizeType(partial.type) || partial.type || "daily";
  const title = cleanText(partial.title || "未命名线索", 36);
  const progress = cleanText(partial.progress || partial.lastProgress || partial.description, 90);
  const canon = cleanText(partial.canon || partial.canonLink, 60);
  return {
    id: partial.id || uid(),
    type,
    title,
    status: normalizeStatus(partial.status),
    scale: normalizeScale(partial.scale),
    canon,
    people: cleanText(partial.people, 60),
    source: cleanText(partial.source, 60),
    progress,
    turnsLeft: normalizeTurnsLeft(partial, type),
    extendable: type === "canon" ? partial.extendable === true : false,
    updatedAt: partial.updatedAt || Date.now(),
    createdAt: partial.createdAt || Date.now(),
  };
}

export function normalizeClues(clues = []) {
  return Array.isArray(clues) ? clues.map(createClue).filter((c) => c.title) : [];
}

function isAllowedClue(entry) {
  const text = [entry.title, entry.progress, entry.canon, entry.people, entry.source].join(" ");
  if (!entry.type || !TYPE_LABELS[entry.type]) return false;
  if (entry.type === "canon") {
    const canonText = `${text} ${entry.canon}`;
    return !!entry.canon && hasCanonAnchor(canonText) && !hasInventedCanonContamination(canonText);
  }
  if (entry.type === "daily" || entry.type === "relationship") {
    if (entry.scale !== "小" && entry.scale !== "中") return false;
    if (hasForbiddenMystery(text)) return false;
    return !!entry.progress;
  }
  return false;
}

export const CLUE_RULES =
  "【受限线索 / 小支线规则】\n" +
  "你可以建议系统记录可延续线索，但只能写结构化标签，正文不要解释系统规则。\n" +
  "允许三类：\n" +
  "1. 原著回声：必须明确关联当前校历附近的原著线索；一年级可写魔法石、尼可·勒梅、三头犬、奇洛异常、禁书区、巨怪、魁地奇异常、禁林独角兽等，后续学年也只能使用对应原著锚点。\n" +
  "2. 日常小支线：遗失物、课堂事故、家信、教授关注、室友误会、被级长盯上等，必须能在 1-3 次互动内收束。\n" +
  "3. 角色关系：某个具体人物的异常反应、隐瞒、误会、态度变化，必须绑定人物关系。\n" +
  "禁止：新增大反派、古老预言、原创神器、血脉诅咒、未知组织、新密室、世界级阴谋、平行世界/穿越/世界线、OC/玩家成为原著大事件核心钥匙、提前剧透未来原著。\n" +
  "若某个异常不是原著锚点，必须写成私人/课堂/寝室/误会级别的小线索，并设置 1-3 次内可收束的期限；不要把日常异常扩成世界观谜团。\n" +
  "可写标签格式：\n" +
  "【线索：类型=原著回声；标题=禁书区借阅记录；原著关联=尼可·勒梅/魔法石；阶段=怀疑；人物=赫敏；进展=有人最近查过尼可·勒梅；期限=3】\n" +
  "【线索：类型=日常小支线；标题=丢失的羽毛笔；阶段=初见；人物=室友；进展=室友怀疑有人误拿；期限=2】\n" +
  "没有明确可延续内容就不要写线索标签。";

export function parseClueTags(text) {
  const raw = String(text || "");
  const entries = [];
  const cleaned = raw.replace(/【线索[:：]([^】]+)】/g, (_, body) => {
    const fields = parseFields(body);
    const entry = createClue({
      type: normalizeType(fields["类型"]),
      title: fields["标题"],
      canon: fields["原著关联"] || fields["关联"],
      status: fields["阶段"],
      people: fields["人物"],
      source: fields["来源"],
      progress: fields["进展"],
      turnsLeft: fields["期限"],
      scale: fields["规模"],
    });
    if (isAllowedClue(entry)) entries.push(entry);
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();
  return { cleaned, entries };
}

function clueKey(clue) {
  return `${clue.type}:${clue.title}`.toLowerCase();
}

export function mergeClues(existing = [], incoming = []) {
  const byKey = new Map();
  for (const clue of normalizeClues(existing)) {
    if (isAllowedClue(clue)) byKey.set(clueKey(clue), clue);
  }
  const applied = [];
  for (const raw of incoming || []) {
    const next = createClue(raw);
    if (!isAllowedClue(next)) continue;
    const key = clueKey(next);
    const prev = byKey.get(key);
    const merged = prev ? {
      ...prev,
      status: next.status || prev.status,
      canon: next.canon || prev.canon,
      people: next.people || prev.people,
      source: next.source || prev.source,
      progress: next.progress || prev.progress,
      turnsLeft: Number.isFinite(Number(next.turnsLeft)) ? next.turnsLeft : prev.turnsLeft,
      scale: next.scale || prev.scale,
      updatedAt: Date.now(),
    } : next;
    byKey.set(key, merged);
    applied.push(merged);
  }
  return { clues: [...byKey.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)), applied };
}

export function activeClues(clues = []) {
  return normalizeClues(clues).filter((c) => isAllowedClue(c) && c.status !== "resolved" && c.turnsLeft > 0);
}

export function formatCluesBlock(clues = []) {
  const active = activeClues(clues).slice(0, 8);
  if (!active.length) return "";
  return "【受限线索 / 小支线（只能自然回收，不可扩成新世界观谜团）】\n- " + active.map((c) => {
    const bits = [
      `${TYPE_LABELS[c.type] || c.type}｜${c.title}`,
      STATUS_LABELS[c.status] || c.status,
      c.canon ? `原著关联：${c.canon}` : "",
      c.people ? `人物：${c.people}` : "",
      c.progress ? `进展：${c.progress}` : "",
      `剩余收束期：${c.turnsLeft}`,
    ].filter(Boolean);
    return bits.join("；");
  }).join("\n- ");
}

export function formatClueLine(applied = []) {
  if (!applied.length) return "";
  return "🧩 线索更新：" + applied.map((c) => `${TYPE_LABELS[c.type] || c.type} · ${c.title}`).join(" · ");
}

export function clueSummary(clues = []) {
  const active = activeClues(clues);
  return {
    activeCount: active.length,
    unresolvedTitles: active.slice(0, 3).map((c) => c.title),
  };
}
