/**
 * Project-centric data model for long-running RP / world simulation (schema v2).
 *
 * A Project = one complete world. Chats are disposable context windows; the
 * world state (memory layers) is the single source of truth that carries
 * continuity across windows.
 *
 *   Project
 *     ├─ instructions
 *     ├─ worldBook      WorldEntry[]   (keyword-triggered injection)
 *     ├─ worldMemory    Fact[]         (objective facts, shared by ALL)
 *     ├─ storyMemory    StoryEvent[]   (world timeline, shared)
 *     ├─ characters     Character[]    (each owns State + History)
 *     ├─ worldChatIds   string[]       (WorldChats — narrator / all characters)
 *     └─ (each character) chatIds       (CharacterChats — 1:1 windows)
 *
 * WorldChats and CharacterChats SHARE world/character state but NOT transcripts.
 * Opening a new chat = continue from current world state, not a parallel world.
 *
 * Top-level persisted keys:
 *   "projects"        — { [projectId]: Project }
 *   "activeProjectId" — string
 *   "sessions"        — { [sessionId]: Session }   (own map; per-window writes)
 *
 * Backups (never deleted):
 *   "migrationBackup" — verbatim pre-Project (v0) snapshot
 *   "backup_v1"       — verbatim v1 {projects, sessions} before the v2 upgrade
 *
 * Shapes:
 *   Project        = { id, name, icon, description, instructions,
 *                      worldBook[], worldMemory:Fact[], storyMemory:StoryEvent[],
 *                      characters[], worldChatIds[], activeWorldChatId,
 *                      activeMode:"world"|"character", activeCharId,
 *                      pendingCanon[], schemaVersion, createdAt, updatedAt }
 *   Character      = { id, name, avatar, persona, greeting,
 *                      state:CharacterState, history:HistoryEvent[],
 *                      chatIds[], activeChatId }
 *   CharacterState = { status, relationships:{ [charId]:{status,feeling,note,updatedAt} }, updatedAt }
 *   Fact           = { id, content, createdAt }
 *   StoryEvent     = { id, date, content, category, involved:[charId], sourceChatId, createdAt }
 *   HistoryEvent   = { id, date, content, scope:"character"|"world", storyEventId?, createdAt }
 *   Session        = { id, projectId, kind:"world"|"character", charId|null,
 *                      name, messages[], summary, createdAt, updatedAt }
 */

import { uid } from "./utils.js";
import { store } from "./storage.js";
import { createInitialInventory, normalizeInventory } from "./inventory.js";

export const SCHEMA_VERSION = 12;

/** The player character's fixed id (the user's own avatar in the world). */
export const PLAYER_ID = "player";

// ─── Factories ──────────────────────────────────────────────────────────────

export function createMemory(content) {
  return { id: uid(), content: String(content || "").trim(), createdAt: Date.now() };
}

export function createFact(content) {
  return { id: uid(), content: String(content || "").trim(), createdAt: Date.now() };
}

export function createStoryEvent(partial = {}) {
  return {
    id: partial.id || uid(),
    date: partial.date || "",
    content: String(partial.content || "").trim(),
    category: partial.category || "manual",
    involved: partial.involved || [],
    sourceChatId: partial.sourceChatId || null,
    createdAt: partial.createdAt || Date.now(),
  };
}

export function createHistoryEvent(partial = {}) {
  return {
    id: partial.id || uid(),
    date: partial.date || "",
    content: String(partial.content || "").trim(),
    scope: partial.scope || "character",
    storyEventId: partial.storyEventId || null,
    createdAt: partial.createdAt || Date.now(),
  };
}

export function createCharacterState(partial = {}) {
  return {
    status: partial.status || "",
    relationships: partial.relationships || {},
    updatedAt: partial.updatedAt || Date.now(),
  };
}

/**
 * Phase 5: the live "right now" snapshot of the current scene. Distinct from the
 * permanent memory log (worldMemory/storyMemory) — this is volatile and always
 * overwritten. `currentTime` is NOT stored here; it is read from the project's
 * time system (currentTimeLabel) to keep a single source of truth.
 *
 * List items carry a stable id (for per-item edit/Pending targeting) and a
 * `narratorOnly` flag (narrator-secret → never injected into CharacterChat).
 * forbiddenAssumptions are always injected (guardrails) so they carry no flag.
 */
export function createCurrentState(partial = {}) {
  const item = (x) => ({
    id: x?.id || uid(),
    content: String(x?.content ?? x ?? "").trim(),
    narratorOnly: !!x?.narratorOnly,
  });
  const list = (arr) => (Array.isArray(arr) ? arr.map(item).filter((i) => i.content) : []);
  const guard = (arr) => (Array.isArray(arr)
    ? arr.map((x) => ({ id: x?.id || uid(), content: String(x?.content ?? x ?? "").trim() })).filter((i) => i.content)
    : []);
  const present = (arr) => (Array.isArray(arr)
    ? arr.map((x) => ({ id: x?.id || uid(), ref: String(x?.ref ?? x?.charId ?? (typeof x === "string" ? x : "")).trim() })).filter((p) => p.ref)
    : []);
  return {
    location: partial.location || "",
    scene: partial.scene || "",
    arc: partial.arc || "",
    presentCharacters: present(partial.presentCharacters),
    recentEvents: list(partial.recentEvents),
    unresolvedThreads: list(partial.unresolvedThreads),
    knownFacts: list(partial.knownFacts),
    forbiddenAssumptions: guard(partial.forbiddenAssumptions),
    updatedAt: partial.updatedAt || Date.now(),
  };
}

export const DEFAULT_CHARACTER = {
  id: "default",
  name: "默认助手",
  avatar: "🤖",
  persona: "你是一个聪明、友好的 AI 助手，乐于帮助用户解决各种问题。",
  greeting: "你好！有什么我可以帮你的吗？",
};

export function createCharacter(partial = {}) {
  // Accept legacy `memory[]` and fold it into History.
  const history = Array.isArray(partial.history)
    ? partial.history
    : Array.isArray(partial.memory)
    ? partial.memory.map((m) => createHistoryEvent({ content: typeof m === "string" ? m : m?.content, scope: "character" }))
    : [];
  return {
    id: partial.id || uid(),
    name: partial.name || "新角色",
    avatar: partial.avatar || "🧙",
    persona: partial.persona || "",
    greeting: partial.greeting || "你好！有什么我可以帮助你的？",
    house: partial.house || "",
    role: partial.role || "",
    state: partial.state ? createCharacterState(partial.state) : createCharacterState(),
    history,
    chatIds: partial.chatIds || [],
    activeChatId: partial.activeChatId || null,
  };
}

/**
 * The Player Character = the role the user plays inside the world (e.g. Evelyn).
 * NOT an AI character: no greeting, no chats, never appears in the chat list and
 * is never role-played by the AI. But it IS injected so the AI knows who "I" am,
 * and it participates in relationships (other characters relate to it, it relates
 * back). relationships live in state.relationships, same shape as AI characters.
 */
export function createPlayerCharacter(partial = {}) {
  return {
    id: PLAYER_ID,
    name: partial.name || "我",
    avatar: partial.avatar || "🧑",
    persona: partial.persona || partial.description || "",
    state: partial.state ? createCharacterState(partial.state) : createCharacterState(),
    history: Array.isArray(partial.history) ? partial.history : [],
    // HP 专项：养成数值与角色档案（学院/血统/魔杖/擅长）
    stats: partial.stats || null,
    meta: partial.meta || null,
    favor: partial.favor || {}, // 玩家对各角色的好感度 { [charId]: 0-100 }
    courses: partial.courses || {}, // 各科课程水平 { [科目]: 0-100 }
    inventory: partial.inventory ? normalizeInventory(partial.inventory) : createInitialInventory(),
  };
}

/**
 * A suggested memory update (Phase 4A). Generated by the model from a chat
 * round but NEVER written automatically — it waits in project.pendingUpdates
 * until the user accepts (optionally after editing) or rejects it.
 * `oldValue` is filled by the app from current data, not by the model.
 */
/**
 * Phase 7A-1: a Project File — a free-form document attached to the project
 * (simulator rules, writing style, RP rules, timeline, outline, NPC sheets…).
 * `enabled` gates whether it participates downstream (e.g. prompt injection in a
 * later phase); files are never auto-written. Shape mirrors Claude Project Files.
 */
export function createProjectFile(partial = {}) {
  const now = Date.now();
  return {
    id: partial.id || uid(),
    title: String(partial.title || "").trim(),
    content: typeof partial.content === "string" ? partial.content : String(partial.content || ""),
    enabled: partial.enabled !== false,
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  };
}

/** Safe fallback: coerce any (possibly missing/legacy) value into a files array. */
export function normalizeFiles(files) {
  return Array.isArray(files) ? files.map((f) => createProjectFile(f)) : [];
}

export function createPendingUpdate(partial = {}) {
  return {
    id: partial.id || uid(),
    type: partial.type,                       // story|world|characterHistory|characterState|playerHistory|playerState
    targetCharId: partial.targetCharId ?? null,
    stateField: partial.stateField ?? null,   // "status" | "relationship" | null
    relTarget: partial.relTarget ?? null,     // relationship target (charId or free-text name)
    op: partial.op || "add",                  // "add" | "update"
    oldValue: partial.oldValue ?? null,
    newValue: partial.newValue ?? null,
    date: partial.date || "",                  // timeline label (defaults to project.currentTimeLabel)
    sourceChatId: partial.sourceChatId ?? null,
    sourceKind: partial.sourceKind || "world",
    evidence: partial.evidence || "",
    confidence: typeof partial.confidence === "number" ? partial.confidence : 0.5,
    inferred: !!partial.inferred,
    scopeLevel: partial.scopeLevel || "character",
    status: "pending",
    createdAt: partial.createdAt || Date.now(),
  };
}

export function createProject(partial = {}) {
  const now = Date.now();
  const characters =
    partial.characters && partial.characters.length
      ? partial.characters.map((c) => createCharacter(c))
      : [createCharacter({ ...DEFAULT_CHARACTER })];
  return {
    id: partial.id || uid(),
    name: partial.name || "新项目",
    icon: partial.icon || "📁",
    description: partial.description || "",
    instructions: partial.instructions || "",
    currentTimeLabel: partial.currentTimeLabel || "",
    dayPeriod: partial.dayPeriod || "morning",
    autoExtractUpdates: !!partial.autoExtractUpdates,
    autoSummarizeChats: !!partial.autoSummarizeChats,
    autoNameChats: !!partial.autoNameChats,
    backgroundImage: partial.backgroundImage || "",
    worldBook: partial.worldBook || [],
    worldMemory: partial.worldMemory || [],
    storyMemory: partial.storyMemory || [],
    ocs: partial.ocs || [], // HP 专项：玩家自创原创角色（与锁定的 canon 角色分开）
    clues: partial.clues || [], // HP 专项：受限线索 / 小支线，不等同于世界观事实
    lifeLog: Array.isArray(partial.lifeLog) ? partial.lifeLog : [], // HP 专项：程序记录的生活片段账本
    houseCupResults: partial.houseCupResults || {}, // HP 专项：学年学院杯结算，按 "1991-1992" 存储
    characters,
    playerCharacter: partial.playerCharacter ? createPlayerCharacter(partial.playerCharacter) : createPlayerCharacter(),
    worldChatIds: partial.worldChatIds || [],
    activeWorldChatId: partial.activeWorldChatId || null,
    activeMode: partial.activeMode || "world",
    activeCharId: partial.activeCharId || characters[0]?.id || null,
    pendingUpdates: partial.pendingUpdates || [],
    currentState: createCurrentState(partial.currentState),
    files: normalizeFiles(partial.files),
    schemaVersion: SCHEMA_VERSION,
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  };
}

/** A WorldChat is the world stage: narrator + all characters. No single charId. */
export function createWorldChat(projectId, name) {
  const now = Date.now();
  return {
    id: uid(), projectId, kind: "world", charId: null,
    name: name || "世界聊天", messages: [], summary: "", summaryUntil: 0, autoExtractUntil: 0,
    createdAt: now, updatedAt: now,
  };
}

/** A CharacterChat is a 1:1 window with one character. */
export function createCharacterChat(projectId, charId, name, greeting) {
  const now = Date.now();
  const messages = greeting ? [{ role: "assistant", content: greeting, id: uid() }] : [];
  return {
    id: uid(), projectId, kind: "character", charId,
    name: name || "新对话", messages, summary: "", summaryUntil: 0, autoExtractUntil: 0,
    createdAt: now, updatedAt: now,
  };
}

// ─── Selectors ──────────────────────────────────────────────────────────────

const byUpdated = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);

export function worldChatsOf(sessions, project) {
  if (!project) return [];
  return (project.worldChatIds || []).map((id) => sessions[id]).filter(Boolean).sort(byUpdated);
}

export function characterChatsOf(sessions, character) {
  if (!character) return [];
  return (character.chatIds || []).map((id) => sessions[id]).filter(Boolean).sort(byUpdated);
}

export function projectsList(projects) {
  return Object.values(projects || {}).sort(byUpdated);
}

// ─── Prompt formatters (pure, testable) ────────────────────────────────────────

export function formatFacts(worldMemory) {
  return (worldMemory || []).map((m) => m.content).filter(Boolean);
}

export function formatStory(storyMemory) {
  return (storyMemory || []).map((e) => (e.date ? `${e.date}：${e.content}` : e.content)).filter(Boolean);
}

export function formatProjectFiles(files) {
  return (files || [])
    .filter((file) => file.enabled !== false && file.content?.trim())
    .map((file) => {
      const title = file.title?.trim() || "未命名文件";
      return `[${title}]\n${file.content.trim()}`;
    });
}

export function formatHistory(history) {
  return (history || []).map((h) => (h.date ? `${h.date}：${h.content}` : h.content)).filter(Boolean);
}

/**
 * Phase 5: project the current-state snapshot down to what is injectable for a
 * given chat mode. In CharacterChat, narratorOnly list items (narrator secrets) are
 * stripped and the active character is removed from the present-characters list.
 * forbiddenAssumptions are ALWAYS kept (guardrails apply in every mode). Pure.
 */
export function visibleCurrentState(cs, { mode = "world", charId = null } = {}) {
  const base = cs || createCurrentState();
  const isChar = mode === "character";
  const keep = (arr) => (arr || []).filter((i) => !(isChar && i.narratorOnly));
  return {
    ...base,
    presentCharacters: (base.presentCharacters || []).filter((p) => !(isChar && p.ref === charId)),
    recentEvents: keep(base.recentEvents),
    unresolvedThreads: keep(base.unresolvedThreads),
    knownFacts: keep(base.knownFacts),
  };
}

/**
 * Phase 5: render a (already visibility-filtered) current-state snapshot for the
 * prompt. Returns { stateLines, forbidden } — both string[] — so the caller can
 * assemble the 【当前剧情状态】 and 【严格约束】 blocks. `nameMap` maps a charId to
 * a character object (or name string); unknown refs fall back to the raw ref
 * (free-text NPC). Pure.
 */
export function formatCurrentState(cs, { nameMap = {} } = {}) {
  if (!cs) return { stateLines: [], forbidden: [] };
  const nameOf = (ref) => nameMap[ref]?.name || (typeof nameMap[ref] === "string" ? nameMap[ref] : "") || ref;
  const stateLines = [];
  if (cs.location) stateLines.push(`地点：${cs.location}`);
  if (cs.scene) stateLines.push(`场景：${cs.scene}`);
  if (cs.arc) stateLines.push(`当前篇章：${cs.arc}`);
  const present = (cs.presentCharacters || []).map((p) => nameOf(p.ref)).filter(Boolean);
  if (present.length) stateLines.push(`在场角色：${present.join("、")}`);
  const block = (label, arr) => {
    const items = (arr || []).map((i) => i.content).filter(Boolean);
    if (items.length) stateLines.push(`${label}：\n- ${items.join("\n- ")}`);
  };
  block("近期事件", cs.recentEvents);
  block("未解决伏线", cs.unresolvedThreads);
  block("已知事实", cs.knownFacts);
  const forbidden = (cs.forbiddenAssumptions || []).map((i) => i.content).filter(Boolean);
  return { stateLines, forbidden };
}

/**
 * When a character is deleted, relationships that targeted it by id would
 * otherwise become orphaned ids. Rewrite the key from the deleted id to the
 * character's name (downgrade to a free-text NPC), preserving the value.
 * If a free-text entry under that name already exists, keep it and drop the
 * id entry (don't clobber what the user wrote by hand). Pure.
 */
export function migrateRelationshipTarget(relationships, fromId, toName) {
  if (!relationships || !(fromId in relationships)) return relationships || {};
  const { [fromId]: val, ...rest } = relationships;
  if (toName in rest) return rest; // existing free-text entry wins
  return { ...rest, [toName]: val };
}

/** Render a character's current State (status + relationships) as text lines. */
export function formatState(state, charsById = {}) {
  const lines = [];
  if (state?.status) lines.push(`当前状态：${state.status}`);
  const rels = state?.relationships || {};
  for (const [k, r] of Object.entries(rels)) {
    const name = charsById[k]?.name || k;
    const bits = [];
    if (r.status) bits.push(`关系：${r.status}`);
    if (r.feeling) bits.push(`感受：${r.feeling}`);
    if (r.note) bits.push(r.note);
    if (bits.length) lines.push(`对 ${name} → ${bits.join("；")}`);
  }
  return lines;
}

// ─── Migration ────────────────────────────────────────────────────────────────

const LEGACY_KEYS = ["characters", "worldBook", "sessions", "charSessions", "activeCharId", "activeSession"];

/** Read the legacy pre-Project (v0) top-level keys directly from storage. */
export async function loadLegacy() {
  const [characters, worldBook, sessions, charSessions, activeCharId, activeSession] =
    await Promise.all(LEGACY_KEYS.map((k) => store.get(k, null)));
  return { characters, worldBook, sessions, charSessions, activeCharId, activeSession };
}

function dedupContents(list) {
  const seen = new Set();
  const out = [];
  for (const m of list) {
    const content = (typeof m === "string" ? m : m?.content || "").trim();
    if (!content || seen.has(content)) continue;
    seen.add(content);
    out.push(content);
  }
  return out;
}

/**
 * v0 → v1-shaped project (pre-Project model). The result is later normalised to
 * v2 by migrateAll. Returns { project, sessionsMap, activeProjectId } or null.
 */
export function buildMigration(legacy) {
  const legacySessions = legacy.sessions || {};
  const hasLegacy =
    (legacy.characters && legacy.characters.length) ||
    Object.keys(legacySessions).length > 0 ||
    (legacy.worldBook && legacy.worldBook.length);
  if (!hasLegacy) return null;

  const projectId = uid();

  // Aggregate old per-session memories → story memory (deduped).
  const allMem = [];
  Object.values(legacySessions).forEach((s) => (s?.memories || []).forEach((m) => allMem.push(m)));
  const storyMemory = dedupContents(allMem).map((c) => createStoryEvent({ content: c }));

  const characters = (legacy.characters || []).map((c) => createCharacter(c));

  // Old sessions become character chats (grouped later by migrateAll via charId).
  const sessionsMap = {};
  const ordered = Object.values(legacySessions).sort(byUpdated);
  const sessionIds = [];
  for (const s of ordered) {
    if (!s || !s.id) continue;
    const { memories, ...rest } = s; // eslint-disable-line no-unused-vars
    sessionsMap[s.id] = { ...rest, projectId };
    sessionIds.push(s.id);
  }

  // Plain v1-shaped project (NOT via createProject, which is v2). migrateAll upgrades it.
  const project = {
    id: projectId,
    name: "我的项目",
    icon: "📁",
    description: "",
    instructions: "",
    worldBook: legacy.worldBook || [],
    worldMemory: [],
    storyMemory,
    characters,
    sessionIds,
    activeCharId: legacy.activeCharId || characters[0]?.id || null,
    activeSessionId: sessionIds[0] || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return { project, sessionsMap, activeProjectId: projectId };
}

/**
 * Normalise every project to schema v2 (idempotent). Upgrades v1-shaped projects:
 *   - character.memory[] → character.history[]; add empty State; group old
 *     sessions by charId into character.chatIds (CharacterChats)
 *   - storyMemory/worldMemory → StoryEvent[]/Fact[]
 *   - create one empty default WorldChat per project
 *   - sessions referenced by old sessionIds become kind:"character"
 *
 * Pure: returns { projects, sessions, changed }. Caller persists.
 */
export function migrateAll(projects, sessions) {
  let changed = false;
  const newProjects = {};
  const newSessions = { ...(sessions || {}) };

  const hasWorldDialogue = (proj) => (proj.worldChatIds || []).some((sid) =>
    (newSessions[sid]?.messages || []).some((m) => String(m?.content || "").trim())
  );

  const migrateHpOpening = (proj) => {
    if ((proj.id || "") !== "hp-child_gen") return proj;
    if ((proj.currentTimeLabel || "").trim() !== "1991年9月1日") return proj;
    if (hasWorldDialogue(proj)) return proj;
    return {
      ...proj,
      currentTimeLabel: "1991年8月16日 · 对角巷采购",
      currentState: createCurrentState({
        ...proj.currentState,
        location: "对角巷",
        scene: "开学前采购",
        arc: "入学准备",
        knownFacts: [
          ...(proj.currentState?.knownFacts || []),
          { content: "玩家即将入读霍格沃茨，需要完成开学前采购。" },
        ],
        forbiddenAssumptions: [
          ...(proj.currentState?.forbiddenAssumptions || []),
          { content: "不得跳过开学前采购直接进入长期校园日常，除非玩家明确选择准备出发或类似过渡。" },
        ],
      }),
    };
  };

  for (const [pid, proj] of Object.entries(projects || {})) {
    // Already has the v2 chat structure → only patch newly-added fields (e.g.
    // playerCharacter). Never recreate WorldChats / regroup character chats here.
    if (Array.isArray(proj.worldChatIds)) {
      if (proj.playerCharacter && Array.isArray(proj.pendingUpdates) && typeof proj.currentTimeLabel === "string" && "currentState" in proj && Array.isArray(proj.files) && Array.isArray(proj.lifeLog) && proj.houseCupResults && proj.schemaVersion >= SCHEMA_VERSION) {
        newProjects[pid] = proj;
        continue;
      }
      changed = true;
      const migratedProj = migrateHpOpening(proj);
      newProjects[pid] = {
        ...migratedProj,
        playerCharacter: migratedProj.playerCharacter ? createPlayerCharacter(migratedProj.playerCharacter) : createPlayerCharacter(),
        pendingUpdates: Array.isArray(migratedProj.pendingUpdates) ? migratedProj.pendingUpdates : [],
        currentTimeLabel: typeof migratedProj.currentTimeLabel === "string" ? migratedProj.currentTimeLabel : "",
        currentState: createCurrentState(migratedProj.currentState),
        files: normalizeFiles(migratedProj.files),
        clues: Array.isArray(migratedProj.clues) ? migratedProj.clues : [],
        lifeLog: Array.isArray(migratedProj.lifeLog) ? migratedProj.lifeLog : [],
        houseCupResults: migratedProj.houseCupResults || {},
        schemaVersion: SCHEMA_VERSION,
        updatedAt: Date.now(),
      };
      continue;
    }
    changed = true;
    const oldSessionIds = proj.sessionIds || [];

    // Patch old sessions → character kind.
    for (const sid of oldSessionIds) {
      const s = newSessions[sid];
      if (!s) continue;
      const { memories, ...rest } = s; // eslint-disable-line no-unused-vars
      newSessions[sid] = { ...rest, projectId: pid, kind: "character", summary: s.summary || "" };
    }

    // Characters gain State/History/chatIds.
    const characters = (proj.characters || []).map((c) => {
      const chatIds = oldSessionIds.filter((sid) => newSessions[sid]?.charId === c.id);
      return createCharacter({
        id: c.id, name: c.name, avatar: c.avatar, persona: c.persona, greeting: c.greeting,
        state: c.state, history: c.history, memory: c.memory,
        chatIds, activeChatId: chatIds[0] || null,
      });
    });

    const storyMemory = (proj.storyMemory || []).map((m) =>
      m && m.category ? m : createStoryEvent({ content: typeof m === "string" ? m : m?.content })
    );
    const worldMemory = (proj.worldMemory || []).map((m) =>
      m && m.id && m.createdAt && !("memory" in m) ? m : createFact(typeof m === "string" ? m : m?.content)
    );

    const wc = createWorldChat(pid, "世界聊天 1");
    newSessions[wc.id] = wc;

    newProjects[pid] = {
      id: proj.id,
      name: proj.name || "我的项目",
      icon: proj.icon || "📁",
      description: proj.description || "",
      instructions: proj.instructions || "",
      currentTimeLabel: typeof proj.currentTimeLabel === "string" ? proj.currentTimeLabel : "",
      currentState: createCurrentState(proj.currentState),
      worldBook: proj.worldBook || [],
      worldMemory,
      storyMemory,
      clues: Array.isArray(proj.clues) ? proj.clues : [],
      lifeLog: Array.isArray(proj.lifeLog) ? proj.lifeLog : [],
      houseCupResults: proj.houseCupResults || {},
      characters,
      playerCharacter: proj.playerCharacter ? createPlayerCharacter(proj.playerCharacter) : createPlayerCharacter(),
      worldChatIds: [wc.id],
      activeWorldChatId: wc.id,
      activeMode: "world",
      activeCharId: proj.activeCharId || characters[0]?.id || null,
      pendingUpdates: [],
      files: normalizeFiles(proj.files),
      schemaVersion: SCHEMA_VERSION,
      createdAt: proj.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }

  return { projects: newProjects, sessions: newSessions, changed };
}

// ─── Phase 4A: suggestion generation (human-in-loop, never auto-writes) ─────────

/**
 * Build the prompt for the suggestion generator. Separate from the role-play
 * prompt (buildSystem); a second, single-turn call. Pure (no Date).
 */
export function buildSuggestionPrompt({ mode, userText, aiText, dialogueText, activeChar, player, characters, currentTimeLabel, currentState }) {
  const roster = (characters || []).map((c) => `${c.name}(id:${c.id})`).join("、");
  const cs = currentState || createCurrentState();
  const currentStateLines = [
    cs.location ? `location=${cs.location}` : null,
    cs.scene ? `scene=${cs.scene}` : null,
    cs.arc ? `arc=${cs.arc}` : null,
    (cs.presentCharacters || []).length ? `presentCharacters=${(cs.presentCharacters || []).map((i) => i.ref).join("、")}` : null,
    (cs.recentEvents || []).length ? `recentEvents=${(cs.recentEvents || []).map((i) => i.content).join("；")}` : null,
    (cs.unresolvedThreads || []).length ? `unresolvedThreads=${(cs.unresolvedThreads || []).map((i) => i.content).join("；")}` : null,
    (cs.knownFacts || []).length ? `knownFacts=${(cs.knownFacts || []).map((i) => i.content).join("；")}` : null,
    (cs.forbiddenAssumptions || []).length ? `forbiddenAssumptions=${(cs.forbiddenAssumptions || []).map((i) => i.content).join("；")}` : null,
  ].filter(Boolean);
  const timeLine = currentTimeLabel
    ? `当前时间：${currentTimeLabel}。为每条建议填写 date：默认用当前时间；若本轮文本中出现更明确的时间，则用文本中的时间。若文本明确说明"当前/现在/时间来到/进入/跳到"某个新时间，必须提出 projectTime 建议来更新项目当前时间。`
    : `若本轮文本中出现明确时间，填入建议的 date 字段，否则留空。若文本明确说明"当前/现在/时间来到/进入/跳到"某个时间，必须提出 projectTime 建议来设置项目当前时间。`;
  const pov = mode === "character"
    ? `当前为「角色私聊」，对话角色：${activeChar?.name}(id:${activeChar?.id})。
- 只能针对【当前角色】提出 characterHistory / characterState；不得涉及其他角色的私有 state/history。
- 玩家(${player?.name}) 的 playerState/playerHistory：仅当"用户消息"中明确表达其状态/经历时才提；AI 替玩家描写的内容只能 inferred=true，默认不建议。
- 不要提出 world（世界事实）。
- 仅当发生世界级事件（死亡/恋爱/分手/结盟/决裂/阵营/公开身份/获得重要物品…）时，才可提 story，且 scopeLevel="world"。`
    : `当前为「世界聊天（旁白全知）」。可针对任意出场角色提出 characterHistory/characterState，可提 story/world。
- 玩家(${player?.name}) 的 playerState/playerHistory：仅当"用户消息"明确表达时才提。`;
  return `你是"记忆建议器"。阅读【本轮对话】，仅依据其中【明确出现】的信息提出"记忆更新建议"。绝不编造、绝不扩写未写明的细节（穿着/天气/神情/动作/对话/情绪等未写明信息不得作为依据）。

角色名册：${roster || "（无）"}
现有剧情状态：${currentStateLines.join(" | ") || "（空）"}
${timeLine}
${pov}

每条建议必须：
- 给出 evidence：逐字引用本轮文本中的依据句（缺 evidence 的不要输出）。
- 文本未明确出现的，要么不提；若确有价值则 inferred=true 且 confidence 调低。
- type ∈ projectTime | currentState | story | world | characterHistory | characterState | playerHistory | playerState
- projectTime：仅用于更新项目的当前时间线标签；newValue 填新时间文本（如 "1995年" / "1995年4月"）。不要把"当前时间变更"只写成 world 事实。
- currentState：用于维护【当前剧情状态】快照，不是永久记忆。stateField 只能取：
  - location / scene / arc：newValue 为当前地点、当前场景摘要、当前篇章名；接受后覆盖旧值。
  - presentCharacters：newValue 为当前在场角色名或角色 id；接受后追加到在场角色列表。
  - recentEvents / unresolvedThreads / knownFacts / forbiddenAssumptions：newValue 为单条内容；接受后追加到对应列表。
  你必须逐项检查 currentState 八个字段：地点是否改变、场景是否有新摘要、篇章是否改变、在场人物是否出现、刚发生的短期事件、未解决伏线/悬念、当前已知事实、禁止 AI 假设的约束。
  只要本轮文本明确给出上述信息，就必须提出 currentState 建议；不要只写成 world/story 记忆。currentState 可以和 story/world 同时提出。
  示例：文本"九月一日，Harry 和 Draco 在礼堂争吵，麦格教授尚未发现"应至少提出 presentCharacters=Harry、presentCharacters=Draco、location=礼堂、scene=Harry 和 Draco 在礼堂争吵、recentEvents=Harry 和 Draco 在礼堂发生争吵、unresolvedThreads=麦格教授尚未发现争吵。
- characterState/playerState：stateField 取 "status" 或 "relationship"；relationship 需给 relTarget（角色名或 id）。
- 世界级事件 scopeLevel="world"；仅角色内心/单方变化 scopeLevel="character"。
- 无可记内容则返回空数组。

只返回 JSON（不要解释）：
{"suggestions":[{"type":"","targetCharId":null,"stateField":null,"relTarget":null,"newValue":"","date":"","evidence":"","confidence":0.0,"inferred":false,"scopeLevel":"character"}]}

【本轮对话】
${dialogueText?.trim() ? dialogueText.trim().slice(0, 1800) : `用户：${userText || "（空）"}\nAI：${(aiText || "").slice(0, 1200)}`}`;
}

/** Tolerant JSON parse of the model output → raw suggestion array. */
export function parseSuggestions(raw) {
  if (!raw) return [];
  try {
    const clean = String(raw).replace(/```json|```/g, "").trim();
    const obj = JSON.parse(clean);
    const arr = Array.isArray(obj) ? obj : obj.suggestions;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const SUGGESTION_TYPES = new Set([
  "projectTime", "currentState", "story", "world", "characterHistory", "characterState", "playerHistory", "playerState",
]);
const CURRENT_STATE_FIELDS = new Set([
  "location", "scene", "arc", "presentCharacters", "recentEvents", "unresolvedThreads", "knownFacts", "forbiddenAssumptions",
]);
const CURRENT_STATE_SCALAR_FIELDS = new Set(["location", "scene", "arc"]);

const contentOf = (v) => (typeof v === "object" && v ? (v.content ?? "") : (v ?? "")).toString().trim();

const cnNumberMap = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

function parseSmallNumber(value) {
  const s = String(value || "").trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (s === "十") return 10;
  if (s.startsWith("十")) return 10 + (cnNumberMap[s.slice(1)] || 0);
  if (s.endsWith("十")) return (cnNumberMap[s[0]] || 0) * 10;
  if (s.includes("十")) {
    const [a, b] = s.split("十");
    return (cnNumberMap[a] || 0) * 10 + (cnNumberMap[b] || 0);
  }
  return cnNumberMap[s] || null;
}

function sentenceAround(text, index, fallback) {
  const source = String(text || "");
  const left = Math.max(source.lastIndexOf("。", index), source.lastIndexOf("！", index), source.lastIndexOf("？", index), source.lastIndexOf("\n", index));
  const nextStops = ["。", "！", "？", "\n"].map((ch) => source.indexOf(ch, index)).filter((i) => i >= 0);
  const right = nextStops.length ? Math.min(...nextStops) : source.length;
  return source.slice(left + 1, right + 1).trim() || fallback;
}

/**
 * Local safety net for common RP date prose. The model sometimes stores
 * "九月一日" as an event date but forgets to propose projectTime; this creates a
 * human-reviewed projectTime suggestion without writing anything automatically.
 */
export function inferProjectTimeSuggestion({ userText = "", aiText = "", currentTimeLabel = "" } = {}) {
  const text = `${userText || ""}\n${aiText || ""}`;
  const token = "([一二两三四五六七八九十]{1,3}|\\d{1,2})";
  const full = new RegExp(`(\\d{3,4})\\s*年\\s*${token}\\s*月\\s*${token}\\s*(?:日|号)`);
  const partial = new RegExp(`${token}\\s*月\\s*${token}\\s*(?:日|号)`);
  let match = full.exec(text);
  let year = null;
  let month = null;
  let day = null;

  if (match) {
    year = match[1];
    month = parseSmallNumber(match[2]);
    day = parseSmallNumber(match[3]);
  } else {
    match = partial.exec(text);
    if (!match) return null;
    const yearMatch = String(currentTimeLabel || "").match(/(\d{3,4})\s*年/);
    year = yearMatch?.[1] || null;
    month = parseSmallNumber(match[1]);
    day = parseSmallNumber(match[2]);
  }

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const newValue = year ? `${year}年${month}月${day}日` : `${month}月${day}日`;
  if (contentOf(currentTimeLabel).replace(/\s+/g, "") === newValue) return null;
  return {
    type: "projectTime",
    targetCharId: null,
    stateField: null,
    relTarget: null,
    newValue,
    date: newValue,
    evidence: sentenceAround(text, match.index, match[0]),
    confidence: 0.86,
    inferred: false,
    scopeLevel: "world",
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Local safety net for present-character tracking. If a known character's name
 * explicitly appears in this round, propose adding them to currentState.present.
 * It stays human-reviewed and normalizeSuggestions handles existing duplicates.
 */
export function inferPresentCharacterSuggestions({ userText = "", aiText = "", characters = [], player, currentState } = {}) {
  const text = `${userText || ""}\n${aiText || ""}`;
  const existing = new Set((currentState?.presentCharacters || []).map((i) => String(i.ref || "").trim()).filter(Boolean));
  const candidates = [
    ...(characters || []).map((c) => ({ id: c.id, name: c.name })),
    ...(player?.name && player.name !== "我" ? [{ id: player.id || PLAYER_ID, name: player.name }] : []),
  ];
  const out = [];
  for (const candidate of candidates) {
    const name = String(candidate.name || "").trim();
    if (!name || existing.has(name) || existing.has(candidate.id)) continue;
    const match = new RegExp(escapeRegExp(name)).exec(text);
    if (!match) continue;
    out.push({
      type: "currentState",
      targetCharId: null,
      stateField: "presentCharacters",
      relTarget: null,
      newValue: name,
      date: "",
      evidence: sentenceAround(text, match.index, name),
      confidence: 0.84,
      inferred: false,
      scopeLevel: "world",
    });
  }
  return out;
}

/**
 * Validate + POV-filter + compute oldValue + dedup → PendingUpdate[]. Pure.
 * Drops: invalid type, no-evidence, unknown char, duplicates, POV violations.
 * ctx = { project, sourceChatId, sourceKind, mode, activeChar, player }
 */
export function normalizeSuggestions(rawList, ctx) {
  const { project, sourceChatId, sourceKind, mode, activeChar, player, currentTimeLabel } = ctx;
  const candidates = [
    ...(project.characters || []).map((c) => ({ id: c.id, name: c.name })),
    { id: player?.id || PLAYER_ID, name: player?.name || "我" },
  ];
  const resolveId = (key) => {
    if (key == null) return null;
    const s = String(key).trim();
    const hit = candidates.find((c) => c.id === s || c.name === s);
    return hit ? hit.id : s;
  };
  const charById = Object.fromEntries((project.characters || []).map((c) => [c.id, c]));
  const out = [];
  const MAX = 12;

  for (const s of rawList || []) {
    if (out.length >= MAX) break;
    if (!s || !SUGGESTION_TYPES.has(s.type)) continue;
    const evidence = String(s.evidence || "").trim();
    if (!evidence) continue; // no evidence → drop

    let { type, targetCharId, stateField, relTarget, newValue } = s;
    const inferred = !!s.inferred;
    const scopeLevel = s.scopeLevel === "world" ? "world" : "character";
    const confidence = Math.max(0, Math.min(1, typeof s.confidence === "number" ? s.confidence : 0.5));

    // POV gating (character mode)
    if (mode === "character") {
      if (type === "world") continue;
      if (type === "story" && scopeLevel !== "world") continue;
      if (type === "characterHistory" || type === "characterState") targetCharId = activeChar?.id;
    }

    // resolve / validate target
    if (type === "projectTime" || type === "currentState") {
      targetCharId = null;
    } else if (type === "characterHistory" || type === "characterState") {
      targetCharId = resolveId(targetCharId);
      if (!charById[targetCharId]) continue;
    } else {
      targetCharId = null;
    }
    if (type === "currentState") {
      stateField = CURRENT_STATE_FIELDS.has(stateField) ? stateField : null;
      relTarget = null;
      if (!stateField) continue;
    } else if (type === "characterState" || type === "playerState") {
      stateField = stateField === "relationship" ? "relationship" : "status";
      relTarget = stateField === "relationship" ? resolveId(relTarget) : null;
      if (stateField === "relationship" && !relTarget) continue;
    } else {
      stateField = null; relTarget = null;
    }

    const entity = type.startsWith("player") ? project.playerCharacter : charById[targetCharId];
    let op = "add";
    let oldValue = null;

    if (type === "characterState" || type === "playerState") {
      op = "update";
      oldValue = stateField === "relationship"
        ? (entity?.state?.relationships?.[relTarget] || null)
        : (entity?.state?.status || "");
    } else if (type === "projectTime") {
      op = "update";
      oldValue = project.currentTimeLabel || "";
      if (!contentOf(newValue)) continue;
    } else if (type === "currentState") {
      const content = contentOf(newValue);
      if (!content) continue;
      const cs = project.currentState || createCurrentState();
      if (CURRENT_STATE_SCALAR_FIELDS.has(stateField)) {
        op = "update";
        oldValue = cs[stateField] || "";
        if (oldValue === content) continue;
      } else {
        op = "add";
        oldValue = null;
        const existing = stateField === "presentCharacters"
          ? (cs.presentCharacters || []).some((i) => i.ref === content)
          : (cs[stateField] || []).some((i) => i.content === content);
        if (existing) continue;
      }
    } else {
      const content = contentOf(newValue);
      if (!content) continue;
      if (type === "story" && (project.storyMemory || []).some((e) => e.content === content)) continue;
      if (type === "world" && (project.worldMemory || []).some((f) => f.content === content)) continue;
      if ((type === "characterHistory" || type === "playerHistory") &&
          (entity?.history || []).some((h) => h.content === content)) continue;
    }

    const date = (typeof s.date === "string" && s.date.trim()) ? s.date.trim() : (currentTimeLabel || "");

    out.push(createPendingUpdate({
      type, targetCharId, stateField, relTarget, op,
      oldValue, newValue, date, sourceChatId, sourceKind,
      evidence, confidence, inferred, scopeLevel,
    }));
  }
  return out;
}

export function suggestionKey(pu) {
  const norm = (v) => contentOf(v).toLowerCase().replace(/\s+/g, " ").trim();
  const value = norm(pu?.newValue);
  const relValue = pu?.stateField === "relationship" && typeof pu?.newValue === "object" && pu.newValue
    ? ["status", "feeling", "note"].map((k) => norm(pu.newValue[k])).join("|")
    : value;
  return [
    pu?.type || "",
    pu?.targetCharId || "",
    pu?.stateField || "",
    pu?.relTarget || "",
    relValue,
  ].join("::");
}

function betterPendingUpdate(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ac = typeof a.confidence === "number" ? a.confidence : 0;
  const bc = typeof b.confidence === "number" ? b.confidence : 0;
  if (bc > ac) return b;
  if (bc < ac) return a;
  const ae = contentOf(a.evidence);
  const be = contentOf(b.evidence);
  if (be.length > ae.length) return b;
  if (ae.length > be.length) return a;
  return b.createdAt > a.createdAt ? b : a;
}

export function mergePendingUpdatesWithMeta(incoming, existing) {
  const byKey = new Map();
  const order = [];
  let mergedCount = 0;
  for (const pu of [...(incoming || []), ...(existing || [])]) {
    const key = suggestionKey(pu);
    if (!byKey.has(key)) {
      byKey.set(key, pu);
      order.push(key);
      continue;
    }
    byKey.set(key, betterPendingUpdate(byKey.get(key), pu));
    mergedCount += 1;
  }
  return { updates: order.map((key) => byKey.get(key)), mergedCount };
}

export function mergePendingUpdates(incoming, existing) {
  return mergePendingUpdatesWithMeta(incoming, existing).updates;
}

/**
 * Apply ONE accepted update to the project (the only write path). Pure: returns
 * a new project. Does NOT remove the pending entry (caller does). `value`
 * overrides pu.newValue (edit-before-accept).
 */
export function applyUpdateToProject(project, pu, value) {
  const v = value ?? pu.newValue;
  const updState = (entity) => {
    const e = entity || createPlayerCharacter();
    const st = e.state || { status: "", relationships: {} };
    if (pu.stateField === "relationship") {
      const cur = st.relationships?.[pu.relTarget] || {};
      const patch = (typeof v === "object" && v) ? v : { status: String(v) };
      return { ...e, state: { ...st, relationships: { ...st.relationships, [pu.relTarget]: { ...cur, ...patch, updatedAt: Date.now() } }, updatedAt: Date.now() } };
    }
    return { ...e, state: { ...st, status: contentOf(v), updatedAt: Date.now() } };
  };
  const p = { ...project };
  const evDate = pu.date || (typeof v === "object" && v?.date) || "";
  switch (pu.type) {
    case "projectTime":
      p.currentTimeLabel = contentOf(v);
      break;
    case "currentState": {
      const cs = createCurrentState(project.currentState);
      const content = contentOf(v);
      if (!content) break;
      if (CURRENT_STATE_SCALAR_FIELDS.has(pu.stateField)) {
        p.currentState = createCurrentState({ ...cs, [pu.stateField]: content, updatedAt: Date.now() });
        break;
      }
      if (pu.stateField === "presentCharacters") {
        p.currentState = createCurrentState({
          ...cs,
          presentCharacters: [...(cs.presentCharacters || []), { id: uid(), ref: content }],
          updatedAt: Date.now(),
        });
        break;
      }
      if (CURRENT_STATE_FIELDS.has(pu.stateField)) {
        p.currentState = createCurrentState({
          ...cs,
          [pu.stateField]: [...(cs[pu.stateField] || []), { id: uid(), content }],
          updatedAt: Date.now(),
        });
      }
      break;
    }
    case "story":
      p.storyMemory = [...(project.storyMemory || []), createStoryEvent({ content: contentOf(v), date: evDate, involved: (typeof v === "object" && v?.involved) || [], sourceChatId: pu.sourceChatId })];
      break;
    case "world":
      p.worldMemory = [...(project.worldMemory || []), createFact(contentOf(v))];
      break;
    case "characterHistory":
      p.characters = (project.characters || []).map((c) => c.id === pu.targetCharId ? { ...c, history: [...(c.history || []), createHistoryEvent({ content: contentOf(v), date: evDate, scope: pu.scopeLevel })] } : c);
      break;
    case "characterState":
      p.characters = (project.characters || []).map((c) => c.id === pu.targetCharId ? updState(c) : c);
      break;
    case "playerHistory":
      p.playerCharacter = { ...(project.playerCharacter || createPlayerCharacter()), history: [...(project.playerCharacter?.history || []), createHistoryEvent({ content: contentOf(v), date: evDate, scope: "character" })] };
      break;
    case "playerState":
      p.playerCharacter = updState(project.playerCharacter);
      break;
    default:
      return project;
  }
  return p;
}
