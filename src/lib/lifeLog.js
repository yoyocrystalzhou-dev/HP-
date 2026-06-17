import { HOGWARTS_LOCATIONS } from "./hogwartsLifeEngine.js";
import { uid } from "./utils.js";

export const LIFE_LOG_LIMIT = 80;

const EXTRA_LOCATIONS = [
  { id: "diagon_alley", label: "对角巷", aliases: ["对角巷", "破釜酒吧后院"] },
  { id: "gringotts", label: "古灵阁", aliases: ["古灵阁", "巫师银行", "金库", "矿车"] },
  { id: "ollivanders", label: "奥利凡德魔杖店", aliases: ["奥利凡德", "魔杖店"] },
  { id: "madam_malkins", label: "摩金夫人长袍店", aliases: ["摩金夫人", "长袍店", "校袍店"] },
  { id: "flourish_blotts", label: "丽痕书店", aliases: ["丽痕书店", "书店", "课本"] },
  { id: "potion_supply_shop", label: "魔药材料店", aliases: ["魔药材料店", "药材店", "坩埚店"] },
  { id: "kings_cross", label: "国王十字车站", aliases: ["国王十字", "九又四分之三", "站台"] },
  { id: "hogwarts_express", label: "霍格沃茨特快", aliases: ["霍格沃茨特快", "列车", "包厢", "车厢"] },
];

const allLocations = () => [
  ...EXTRA_LOCATIONS,
  ...HOGWARTS_LOCATIONS.map((place) => ({ id: place.id, label: place.label, aliases: [place.label, place.id, ...(place.aliases || [])] })),
];

function normalizeText(text) {
  return String(text || "").replace(/·/g, "・").replace(/\s+/g, "");
}

function cleanText(text, max = 120) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function aliasesFor(name) {
  const normalized = String(name || "").replace(/·/g, "・");
  const parts = normalized.split(/[・]/).filter(Boolean);
  return [...new Set([normalized, parts[0], parts.at(-1)].filter((x) => x && x.length >= 2))];
}

function characterPool(characters = [], ocs = []) {
  return [
    ...(characters || []).map((c) => ({ id: c.id, name: c.name, kind: "canon" })),
    ...(ocs || []).map((o) => ({ id: o.id, name: o.name, kind: "oc" })),
  ].filter((c) => c.id && c.name);
}

function hasRefOnlyContext(window, alias) {
  const name = String(alias || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const short = "[^。！？；，、：:]{0,12}";
  return new RegExp(
    `(提到|说起|聊起|听说|关于|想到|想起|打听|问起)${short}${name}|` +
    `${name}${short}(这个|的)?名字|` +
    `${name}${short}(只)?出现在${short}(封面|书脊|名单|清单|报纸|传闻)|` +
    `(封面|书脊|名单|清单|报纸|传闻)${short}${name}|` +
    `${name}${short}(教授)?(让|派|命令)${short}(来|去|取|送)|` +
    `${name}(家|家的|家族|金库|产业|父亲|母亲|消息|下落|传闻)|` +
    `${name}${short}(不在|没来|没有出现|不见|已经离开|并未出现|只是被提到)`
  ).test(window);
}

export function detectLifeLocation(text, fallback = "") {
  const raw = normalizeText(text).toLowerCase();
  if (!raw) return fallback || "";
  const scored = [];
  for (const place of allLocations()) {
    let score = 0;
    for (const alias of place.aliases || []) {
      const a = normalizeText(alias).toLowerCase();
      if (!a) continue;
      if (raw.includes(a)) score += Math.max(1, Math.min(8, a.length));
    }
    if (score) scored.push({ place, score });
  }
  scored.sort((a, b) => b.score - a.score || a.place.label.localeCompare(b.place.label, "zh-Hans-CN"));
  return scored[0]?.place?.label || fallback || "";
}

export function detectCharacterRefs(text, characters = [], ocs = [], { mode = "mentioned" } = {}) {
  const source = normalizeText(text);
  if (!source) return [];
  const refs = [];
  for (const c of characterPool(characters, ocs)) {
    let matched = false;
    for (const alias of aliasesFor(c.name)) {
      const normalizedAlias = normalizeText(alias);
      const index = source.indexOf(normalizedAlias);
      if (index < 0) continue;
      const window = source.slice(Math.max(0, index - 24), index + normalizedAlias.length + 42);
      const dialogue = new RegExp(`${normalizedAlias}[：:]`).test(source);
      const directAction = new RegExp(`${normalizedAlias}.{0,16}(站|坐|走|进|进入|出来|离开|停|抬头|低头|看|望|笑|说|问|回答|回应|点头|摇头|递|接|让路|出现|陪|跟|转身|靠近|伸手)`).test(window);
      const playerAction = new RegExp(`(向|对|跟|和|找|邀请|安慰|帮助|帮|给|递给|问|请求|拜托|告诉|打招呼|道谢|道歉|说服)${normalizedAlias}`).test(window);
      if (mode === "mentioned") {
        matched = true;
        break;
      }
      if (!hasRefOnlyContext(window, normalizedAlias) && (dialogue || directAction || playerAction)) {
        matched = true;
        break;
      }
    }
    if (matched) refs.push({ id: c.id, name: c.name, kind: c.kind });
  }
  return refs;
}

function uniqRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const ref of refs) {
    const id = typeof ref === "string" ? ref : ref?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function summarizeScene(userText, aiText) {
  const user = cleanText(userText, 80);
  const ai = cleanText(aiText, 140);
  if (user && ai) return `玩家行动：${user}｜场景回应：${ai}`;
  return user || ai || "生活片段继续推进。";
}

export function createLifeLogEntry({
  project = {},
  periodId = "morning",
  periodLabel = "",
  userText = "",
  aiText = "",
  characters = [],
  ocs = [],
  relationshipApplied = [],
  dailyGrowth = [],
  clueEntries = [],
  inventoryChanges = [],
  rollLine = "",
  sourceChatId = null,
} = {}) {
  const combined = [userText, aiText].filter(Boolean).join("\n");
  const location = detectLifeLocation(combined, project.currentState?.location || "");
  const mentioned = detectCharacterRefs(combined, characters, ocs, { mode: "mentioned" });
  const present = detectCharacterRefs(aiText || combined, characters, ocs, { mode: "present" });
  const interacted = uniqRefs([
    ...detectCharacterRefs(userText, characters, ocs, { mode: "present" }),
    ...(relationshipApplied || []).map((entry) => entry.id),
  ]);
  return {
    id: uid(),
    date: project.currentTimeLabel || "",
    periodId,
    periodLabel,
    location,
    scene: summarizeScene(userText, aiText),
    userText: cleanText(userText, 180),
    assistantText: cleanText(aiText, 260),
    presentCharacterIds: uniqRefs(present),
    mentionedCharacterIds: uniqRefs(mentioned),
    interactionCharacterIds: interacted,
    relationshipDeltas: (relationshipApplied || []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      delta: entry.delta,
      value: entry.value,
      stage: entry.stage,
    })),
    dailyGrowth: (dailyGrowth || []).map(({ key, delta }) => ({ key, delta })),
    clues: (clueEntries || []).map((entry) => ({ id: entry.id, title: entry.title, type: entry.type, status: entry.status })),
    inventoryChanges: (inventoryChanges || []).map((entry) => ({ id: entry.id, label: entry.label, source: entry.source })),
    rollLine: cleanText(rollLine, 220),
    sourceChatId,
    createdAt: Date.now(),
  };
}

export function normalizeLifeLog(log = []) {
  return Array.isArray(log)
    ? log.filter((entry) => entry && entry.id && (entry.scene || entry.userText || entry.assistantText)).slice(0, LIFE_LOG_LIMIT)
    : [];
}

export function applyLifeLogUpdate(project, entry) {
  if (!entry) return project;
  const previous = normalizeLifeLog(project.lifeLog);
  const recentEvents = [
    { content: entry.scene },
    ...(project.currentState?.recentEvents || []),
  ].filter((item, index, arr) => item.content && arr.findIndex((x) => x.content === item.content) === index).slice(0, 6);
  return {
    ...project,
    lifeLog: [entry, ...previous].slice(0, LIFE_LOG_LIMIT),
    currentState: {
      ...(project.currentState || {}),
      location: entry.location || project.currentState?.location || "",
      scene: entry.scene || project.currentState?.scene || "",
      presentCharacters: (entry.presentCharacterIds || []).map((ref) => ({ ref })),
      recentEvents,
      updatedAt: Date.now(),
    },
  };
}

export function formatLifeLogBlock(lifeLog = [], { nameMap = {}, limit = 8 } = {}) {
  const entries = normalizeLifeLog(lifeLog).slice(0, Math.max(1, limit));
  if (!entries.length) return "";
  const nameOf = (id) => nameMap[id]?.name || nameMap[id] || id;
  const lines = entries.map((entry) => {
    const present = (entry.presentCharacterIds || []).map(nameOf).filter(Boolean);
    const interacted = (entry.interactionCharacterIds || []).map(nameOf).filter(Boolean);
    const bits = [
      `${entry.date || "未标日期"}${entry.periodLabel ? ` · ${entry.periodLabel}` : ""}${entry.location ? ` · ${entry.location}` : ""}`,
      entry.scene,
      present.length ? `在场：${present.join("、")}` : "",
      interacted.length ? `直接互动：${interacted.join("、")}` : "",
    ].filter(Boolean);
    return `- ${bits.join("；")}`;
  });
  return "【近期生活日志（程序记录，按此保持连续性；不得把未互动人物当作已互动）】\n" + lines.join("\n");
}
