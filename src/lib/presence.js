import { detectCharacterRefs } from "./lifeLog.js";
import { findCharacter } from "./affinity.js";
import { HOGWARTS_LOCATIONS, locationsForPeriod, matchHogwartsLocations } from "./hogwartsLifeEngine.js";

const normalize = (value) => String(value || "").replace(/[·・\s]/g, "");

const nameParts = (name) => {
  const normalized = String(name || "").replace(/·/g, "・");
  const parts = normalized.split(/[・]/).filter(Boolean);
  return [...new Set([normalized, ...parts].filter((x) => x && x.length >= 2))];
};

const allPeople = (characters = [], ocs = []) => [
  ...(characters || []).map((c) => ({ id: c.id, name: c.name, house: c.house || "", role: c.role || "", kind: "canon" })),
  ...(ocs || []).map((o) => ({ id: o.id, name: o.name, house: o.house || "", role: "student", kind: "oc" })),
].filter((c) => c.id && c.name);

function addCandidate(map, person, score, reason) {
  if (!person?.id) return;
  const prev = map.get(person.id) || { ...person, score: 0, reasons: [] };
  prev.score += score;
  if (reason && !prev.reasons.includes(reason)) prev.reasons.push(reason);
  map.set(person.id, prev);
}

function isFirstYearStudent(person) {
  if (person.role !== "student") return false;
  return /哈利|罗恩|赫敏|纳威|西莫|迪安|拉文德|帕瓦蒂|德拉科|西奥多|布雷斯|达芙妮|文森特|克拉布|格雷戈里|高尔|潘西|汉娜|苏珊|厄尼|贾斯廷|帕德玛|泰瑞|安东尼/.test(person.name);
}

function charactersForLikelyToken(token, people, playerHouse = "") {
  const raw = String(token || "");
  const compact = normalize(raw);
  const picked = [];
  const has = (word) => compact.includes(word);

  for (const person of people) {
    const aliases = nameParts(person.name).map(normalize);
    if (aliases.some((alias) => alias && (compact.includes(alias) || normalize(person.name).includes(compact)))) {
      picked.push(person);
      continue;
    }
    if (has("哈利三人组") && /哈利|罗恩|赫敏/.test(person.name)) picked.push(person);
    else if (has("德拉科一行") && /德拉科|克拉布|高尔|潘西/.test(person.name)) picked.push(person);
    else if (has("韦斯莱一家") && /韦斯莱/.test(person.name)) picked.push(person);
    else if (has("斯莱特林") && person.house === "斯莱特林" && person.role === "student") picked.push(person);
    else if (has("格兰芬多") && person.house === "格兰芬多" && person.role === "student") picked.push(person);
    else if (has("拉文克劳") && person.house === "拉文克劳" && person.role === "student") picked.push(person);
    else if (has("赫奇帕奇") && person.house === "赫奇帕奇" && person.role === "student") picked.push(person);
    else if (has("同学院") && playerHouse && person.house === playerHouse && person.role === "student") picked.push(person);
    else if ((has("同班") || has("新生") || has("同届")) && isFirstYearStudent(person)) picked.push(person);
    else if (has("教授") && ["professor", "headmaster"].includes(person.role)) picked.push(person);
    else if ((has("级长") || has("高年级")) && person.role === "student" && /珀西|佩内洛|伍德|弗林特|戴维斯|安吉丽娜|艾丽娅/.test(person.name)) picked.push(person);
    else if ((has("店主") || has("奥利凡德")) && /奥利凡德|摩金夫人/.test(person.name)) picked.push(person);
    else if (has("海格") && /海格/.test(person.name)) picked.push(person);
    else if (has("费尔奇") && /费尔奇/.test(person.name)) picked.push(person);
    else if (has("庞弗雷") && /庞弗雷/.test(person.name)) picked.push(person);
  }

  return picked;
}

function genericLikelyPeople(place) {
  const people = place?.likelyPeople || [];
  return people
    .filter((token) => !/[哈罗赫德纳西布达潘邓海费庞麦斯弗奇奥摩韦]/.test(token))
    .slice(0, 4);
}

function relevantPlacesForPresence({ userText = "", period, currentState } = {}) {
  const matched = matchHogwartsLocations(userText, 3);
  if (matched.length) return matched;
  const current = currentState?.location
    ? (matchHogwartsLocations(currentState.location, 1)[0] || HOGWARTS_LOCATIONS.find((p) => p.label === currentState.location))
    : null;
  if (current) return [current];
  return locationsForPeriod(period?.id, 6);
}

function recentPresenceNames(lifeLog = [], characters = [], ocs = [], limit = 4) {
  const people = allPeople(characters, ocs);
  const byId = new Map(people.map((p) => [p.id, p]));
  const out = [];
  for (const entry of (Array.isArray(lifeLog) ? lifeLog : []).slice(0, 6)) {
    for (const id of [...(entry.interactionCharacterIds || []), ...(entry.presentCharacterIds || [])]) {
      const person = byId.get(id);
      if (person && !out.some((x) => x.id === id)) out.push(person);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function buildPresenceContext({
  userText = "",
  period,
  currentState,
  characters = [],
  ocs = [],
  player = {},
  lifeLog = [],
} = {}) {
  const people = allPeople(characters, ocs);
  if (!people.length) return "";

  const playerHouse = player?.meta?.house || "";
  const places = relevantPlacesForPresence({ userText, period, currentState });
  const candidateMap = new Map();
  const generic = new Set();

  for (const place of places) {
    for (const token of place.likelyPeople || []) {
      const matched = charactersForLikelyToken(token, people, playerHouse);
      matched.slice(0, 8).forEach((person) => addCandidate(candidateMap, person, 2, `${place.label}/${token}`));
    }
    genericLikelyPeople(place).forEach((token) => generic.add(`${place.label}/${token}`));
  }

  const explicitRefs = detectCharacterRefs(userText, characters, ocs, { mode: "mentioned" });
  explicitRefs.forEach((ref) => {
    const person = findCharacter(ref.name, characters, ocs) || people.find((p) => p.id === ref.id);
    if (person) addCandidate(candidateMap, person, 4, "玩家明确关注");
  });

  const recent = recentPresenceNames(lifeLog, characters, ocs, 4);
  recent.forEach((person) => addCandidate(candidateMap, person, 1, "近期前情可回收"));

  const natural = [...candidateMap.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "zh-Hans-CN"))
    .slice(0, 10)
    .map((person) => `${person.name}${person.house ? `（${person.house}）` : ""}`);
  const explicit = explicitRefs.map((ref) => ref.name);
  const recentNames = recent.map((person) => person.name);
  const placeLine = places.map((place) => place.label).join("、");

  return [
    "【人物在场与互动约束】",
    placeLine ? `本轮地点依据：${placeLine}；人物出场必须能被地点、时间、校历或玩家明确寻找解释。` : "",
    natural.length ? `此时此地较自然的人物池：${natural.join("、")}。` : "",
    generic.size ? `也可使用的泛人物：${[...generic].slice(0, 6).join("、")}。` : "",
    explicit.length ? `玩家明确关注/寻找：${explicit.join("、")}；若此时此地不自然，可以写成错过、没找到、听到传闻、约定稍后或只远远看见，不要硬塞成直接互动。` : "",
    recentNames.length ? `近期前情可回收人物：${recentNames.join("、")}；这只代表可回收余波，不代表自动在场。` : "",
    "只有与玩家发生交谈、同行、互助、冲突、共同经历或明确双向回应，才算直接互动；擦肩而过、远远看见、别人说话、名字被提到、家族名/命令来源/报纸名单都不算直接互动。",
    "回复末尾的【关系变化】只能写真实直接互动者；没有直接互动就不要写关系标签。",
  ].filter(Boolean).join("\n");
}
