import { useState, useRef, useEffect, Fragment } from "react";

import { usePersist }  from "./hooks/usePersist.js";
import { callAPI, callAPIOnce } from "./lib/api.js";
import { fileToBase64, matchWorld, uid } from "./lib/utils.js";
import { store } from "./lib/storage.js";
import {
  createProject, createCharacter, createPlayerCharacter, createWorldChat, createCharacterChat,
  createFact, createStoryEvent, PLAYER_ID,
  worldChatsOf, characterChatsOf, projectsList,
  formatFacts, formatStory, formatProjectFiles, formatHistory, formatState, migrateRelationshipTarget,
  createCurrentState, visibleCurrentState, formatCurrentState,
  buildMigration, loadLegacy, migrateAll,
  buildSuggestionPrompt, parseSuggestions, normalizeSuggestions, mergePendingUpdatesWithMeta, applyUpdateToProject, inferProjectTimeSuggestion, inferPresentCharacterSuggestions,
} from "./lib/projects.js";

import { I }              from "./components/Icons.jsx";
import Avatar             from "./components/Avatar.jsx";
import SettingsPanel      from "./components/SettingsPanel.jsx";
import CharacterPanel     from "./components/CharacterPanel.jsx";
import MemoryPanel        from "./components/MemoryPanel.jsx";
import WorldBookPanel     from "./components/WorldBookPanel.jsx";
import SessionPanel       from "./components/SessionPanel.jsx";
import ProjectListView    from "./components/ProjectListView.jsx";
import ProjectSettingsPanel from "./components/ProjectSettingsPanel.jsx";
import PendingUpdatesPanel from "./components/PendingUpdatesPanel.jsx";
import CurrentStatePanel  from "./components/CurrentStatePanel.jsx";
import ProjectFilesPanel   from "./components/ProjectFilesPanel.jsx";
import { T, applyTheme }  from "./theme.js";

// ── HP 专项：三世代首页 + 内置预设包 ──
import GenerationSelect    from "./components/GenerationSelect.jsx";
import CharacterCreator    from "./components/CharacterCreator.jsx";
import { PRESETS, GENERATIONS } from "./presets/index.js";
import { instantiatePreset, presetProjectId } from "./lib/loadPreset.js";
import { currentBeat, canonAnchor, phaseName } from "./lib/timeline.js";
import { initialStats, formatStatsLine, GATING_RULES, STAMINA_MAX } from "./lib/stats.js";
import { initialCourses, formatCoursesBlock } from "./lib/courses.js";
import { parseActionCommand, runAction, formatRoll, checkAnchor, checkEffects } from "./lib/checks.js";
import { createOC, formatOcs, OC_GUARD } from "./lib/oc.js";
import {
  favorStage, favorDelta, findCharacter, formatFavorBlock, socialAnchor,
  parseRelationshipDeltas, applyRelationshipDeltas, formatRelationshipDeltaLine, relationshipRulesBlock, inferFavorDeltas, filterRelationshipDeltasByEvidence, RELATIONSHIP_EVENT_LIMIT,
} from "./lib/affinity.js";
import { LIFE_SCENE_RULES } from "./lib/lifeScenes.js";
import { LIFE_SCENE_ENGINE_RULES, buildHogwartsLifeContext, buildCalendarLifeContext } from "./lib/hogwartsLifeEngine.js";
import { buildPresenceContext } from "./lib/presence.js";
import { dayPeriod, advanceCalendarClock, calendarMoment, buildCalendarChoiceInput, scheduleContext, formatScheduleContextBlock } from "./lib/schoolCalendar.js";
import { timetableContext } from "./lib/timetable.js";
import { DAILY_GROWTH_RULES, parseDailyGrowth, applyDailyGrowth, formatDailyGrowth } from "./lib/dailyGrowth.js";
import { inferNaturalCommand, adjustedActionCost, shouldAdvancePeriod, settleExam, formatExamLine, examAnchor, inventoryIssueForCommand } from "./lib/lifeMechanics.js";
import { INVENTORY_RULES, applyInventoryChanges, formatInventoryBlock, inferShoppingChanges, formatInventoryChangeLine } from "./lib/inventory.js";
import { CLUE_RULES, clueSummary, formatClueLine, formatCluesBlock, mergeClues, parseClueTags } from "./lib/clues.js";
import { formatHouseCupBlock, formatHouseCupLine, houseCupAnchor, houseCupSummary, settleHouseCup } from "./lib/houseCup.js";
import { AMBIGUOUS_ATMOSPHERE_STYLE } from "./lib/writingStyle.js";
import { applyLifeLogUpdate, createLifeLogEntry, detectCharacterRefs, detectLifeLocation, formatLifeLogBlock } from "./lib/lifeLog.js";
import StatusBar        from "./components/StatusBar.jsx";
import OcCreator        from "./components/OcCreator.jsx";
import { DAY_BG, FoilTitle, NIGHT_BG, Starfield } from "./components/hpAtmosphere.jsx";
import dayFrameUrl from "./assets/day-frame.png";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  apiType: "deepseek",
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
  maxTokens: 2048,
};

const DEFAULT_CHAR = { id: "default", name: "默认助手", avatar: "🤖", persona: "", greeting: "", state: { status: "", relationships: {} }, history: [] };
const DEFAULT_PLAYER = { id: PLAYER_ID, name: "我", avatar: "🧑", persona: "", state: { status: "", relationships: {} }, history: [] };
const SUMMARY_KEEP_MESSAGES = 10;
const SUMMARY_TRIGGER_MESSAGES = 20;
const SUMMARY_BATCH_MESSAGES = 20;
const AUTO_EXTRACT_INTERVAL_MESSAGES = 10;
const AUTO_EXTRACT_WINDOW_MESSAGES = 10;
const V = T;

// HP 专项：玩家成品模式。世界数据（角色/世界书/记忆/文件/剧情状态）全部内置存储、不暴露
// 成可视化管理面板；玩家界面只保留对话 + （后续）养成数值。仅留「配置」用于填 API Key。
const HP_KIOSK = true;

/** Format one relationship entry as a compact line. */
function formatRel(rel) {
  if (!rel) return "";
  const bits = [];
  if (rel.status) bits.push(`关系：${rel.status}`);
  if (rel.feeling) bits.push(`感受：${rel.feeling}`);
  if (rel.note) bits.push(rel.note);
  return bits.join("；");
}

/** Look up a relationship toward `entity`, by id first then by name (free-text). */
function findRel(relationships, entity) {
  if (!relationships || !entity) return null;
  return relationships[entity.id] ?? relationships[entity.name] ?? null;
}


// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Persisted ──
  const [config,          setConfig,          cfgReady]  = usePersist("config",          DEFAULT_CONFIG);
  const [projects,        setProjects,        projReady] = usePersist("projects",        {});
  const [sessions,        setSessions,        sessReady] = usePersist("sessions",        {});
  const [activeProjectId, setActiveProjectId, apidReady] = usePersist("activeProjectId", null);
  const [themeMode,       setThemeMode,       themeReady] = usePersist("themeMode",       "dark");
  const [hpUiMode,        setHpUiMode,        hpUiReady] = usePersist("hpUiMode",        "day");

  const ready = cfgReady && projReady && sessReady && apidReady && themeReady && hpUiReady;

  // Apply the active palette in place, then bump a nonce to re-render the tree
  // so every inline style re-reads the mutated `T`. (See theme.js.)
  const [themeNonce, setThemeNonce] = useState(0);
  useEffect(() => {
    applyTheme(HP_KIOSK ? (hpUiMode === "night" ? "hp-night" : "hp-day") : themeMode);
    setThemeNonce((n) => n + 1);
  }, [themeMode, hpUiMode]);
  const toggleTheme = () => setThemeMode((m) => (m === "dark" ? "light" : "dark"));

  // ── Ephemeral ──
  const [hpHome,      setHpHome]      = useState(true); // HP 专项：是否停在三世代首页
  const [creatingPresetId, setCreatingPresetId] = useState(null); // 正在为哪个世代创建角色
  const [hpSheet,     setHpSheet]     = useState(null); // HP 顶部徽章面板
  const [ocCreatorOpen, setOcCreatorOpen] = useState(false); // 原创角色创建
  const [view,        setView]        = useState("workspace"); // "workspace" | "projects"
  const [panel,       setPanel]       = useState(null);
  const [input,       setInput]       = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [extracting,   setExtracting]  = useState(false);
  const [status,      setStatus]      = useState("");
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editDraft,   setEditDraft]   = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const endRef  = useRef(null);
  const fileRef = useRef(null);
  const taRef   = useRef(null);
  const extractingRef = useRef(false);

  // ── Responsive ──
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const inputMaxHeight = isMobile ? 118 : 220;

  // ── Derived: project / mode / character / active chat window ──
  const activeProject = (activeProjectId && projects[activeProjectId]) || null;

  // HP 专项：当前项目对应的内置预设（世界数据不落盘，按 id 反查）+ 原著时间线节点
  const activePreset = activeProjectId?.startsWith("hp-")
    ? PRESETS[activeProjectId.slice(3)] || null
    : null;
  const canonTimeline = activePreset?.canonTimeline || [];
  const currentCanonBeat = currentBeat(activeProject?.currentTimeLabel, canonTimeline);

  const projectChars  = activeProject?.characters || [];
  const charsById     = Object.fromEntries(projectChars.map((c) => [c.id, c]));
  const player        = activeProject?.playerCharacter || DEFAULT_PLAYER;
  const nameMap       = { ...charsById, [player.id]: player };
  // HP 专项：好感度列表（canon + OC，好感度>0）
  const charNameById  = Object.fromEntries([
    ...projectChars.map((c) => [c.id, c.name]),
    ...((activeProject?.ocs || []).map((o) => [o.id, o.name])),
  ]);
  const ocById        = Object.fromEntries((activeProject?.ocs || []).map((o) => [o.id, o]));
  // HP 专项：给好感条目附带头像 + 副标题，供「好感」页展示
  const favorEnrich = (id, kind) => {
    if (kind === "oc") {
      const o = ocById[id] || {};
      const sub = [o.gender, o.house].filter(Boolean).join(" · ")
        || (o.tieName ? `${o.tieName} 的${o.tieRelation || "熟人"}` : "原创角色");
      return { avatar: o.gender === "女" ? "🧙‍♀️" : o.gender === "男" ? "🧙‍♂️" : "🧙", sub };
    }
    const c = charsById[id] || {};
    return { avatar: c.avatar || "🧙", sub: "原著角色" };
  };
  const favorList     = [
    ...Object.entries(player.favor || {})
      .filter(([, v]) => Number(v) > 0)
      .map(([id, v]) => {
        const kind = (activeProject?.ocs || []).some((o) => o.id === id) ? "oc" : "canon";
        return {
          id,
          name: charNameById[id] || id,
          value: v,
          relationship: player.state?.relationships?.[id] || null,
          kind,
          ...favorEnrich(id, kind),
        };
      }),
    ...((activeProject?.ocs || [])
      .filter((o) => !(player.favor || {})[o.id])
      .map((o) => ({ id: o.id, name: o.name, value: 0, relationship: player.state?.relationships?.[o.id] || null, kind: "oc", ...favorEnrich(o.id, "oc") }))),
  ].sort((a, b) => b.value - a.value || (a.kind === "oc" ? -1 : 1));
  const activeMode    = HP_KIOSK ? "world" : (activeProject?.activeMode || "world");
  const activeCharId  = activeProject?.activeCharId || null;
  const activeChar    = projectChars.find((c) => c.id === activeCharId) || projectChars[0] || DEFAULT_CHAR;
  const scopeChar     = activeMode === "character" ? activeChar : null;

  const activeSessionId  = activeMode === "world"
    ? (activeProject?.activeWorldChatId || null)
    : (scopeChar?.activeChatId || null);
  const activeSessionObj = activeSessionId ? sessions[activeSessionId] : null;
  const messages    = activeSessionObj?.messages || [];

  const worldBook   = activeProject?.worldBook   || [];
  const projectFiles = activeProject?.files || [];
  const worldMemory = activeProject?.worldMemory || [];
  const storyMemory = activeProject?.storyMemory || [];
  const clues = activeProject?.clues || [];
  const houseCup = HP_KIOSK ? houseCupSummary(player, activeProject?.currentTimeLabel, activeProject?.houseCupResults) : null;
  const scenePeriodId = activeProject?.dayPeriod || "morning";
  const currentScheduleContext = HP_KIOSK && activeMode === "world"
    ? scheduleContext({ currentTimeLabel: activeProject?.currentTimeLabel, periodId: scenePeriodId })
    : null;
  const scenePeriod = currentScheduleContext?.period || dayPeriod(scenePeriodId);
  const currentTimetableContext = currentScheduleContext?.timetable || timetableContext({ currentTimeLabel: activeProject?.currentTimeLabel, periodId: scenePeriodId });
  const currentCalendarMoment = currentScheduleContext?.moment || (HP_KIOSK && activeMode === "world"
    ? calendarMoment({ currentTimeLabel: activeProject?.currentTimeLabel, periodId: scenePeriodId })
    : null);
  const nextClock = currentScheduleContext?.nextClock || (HP_KIOSK && activeProject
    ? advanceCalendarClock({ currentTimeLabel: activeProject.currentTimeLabel, periodId: scenePeriodId })
    : null);
  const nextPeriodButtonText = scenePeriodId === "late" ? "睡到明早" : "下一时段";
  const nextPeriodButtonTitle = nextClock
    ? `${activeProject?.currentTimeLabel || ""} · ${scenePeriod.label} → ${nextClock.currentTimeLabel || ""} · ${dayPeriod(nextClock.periodId).label}`
    : "进入下一时段";
  const hpTone = hpUiMode === "night" ? "night" : "day";
  const hpIsNight = hpTone === "night";
  const hpUi = hpIsNight
    ? {
        bg: NIGHT_BG,
        chromeBg: "rgba(10,11,18,0.55)",
        stageBg: "radial-gradient(70% 80% at 50% 18%, rgba(217,195,139,0.045), transparent 72%)",
        chromeText: V.ink,
        chromeMuted: V.muted,
        line: V.lineSoft,
        controlBg: V.softControl,
        emptyText: "rgba(243,233,210,0.55)",
        calendarBg: "rgba(255,250,226,0.055)",
        calendarChoiceBg: "rgba(255,250,226,0.065)",
        calendarText: V.ink,
        calendarMuted: V.muted,
        calendarGold: V.gold,
        inputBar: "rgba(9,12,18,0.74)",
        inputPaper: "linear-gradient(180deg, rgba(20,23,32,0.96), rgba(9,11,17,0.97))",
        inputInk: "#f2dfaa",
        inputBorder: "rgba(217,195,139,0.42)",
        flourishInk: "rgba(217,195,139,0.62)",
        cardBg: "linear-gradient(180deg, rgba(25,28,38,0.96), rgba(12,14,22,0.97)), repeating-linear-gradient(0deg, rgba(217,195,139,0.035) 0 1px, transparent 1px 24px)",
        cardText: "#f1e7ce",
        cardInkUser: "rgba(217,195,139,0.78)",
        cardInkNarrator: "rgba(190,82,76,0.78)",
        cardShadow: "0 18px 46px rgba(0,0,0,0.52), inset 0 0 0 5px rgba(217,195,139,0.035)",
        actionBg: "rgba(217,195,139,0.10)",
        actionText: "rgba(241,231,206,0.76)",
        noteBg: "rgba(232,199,102,0.08)",
        noteBorder: "rgba(232,199,102,0.28)",
        noteText: "#d8c79a",
        seal: V.seal,
      }
    : {
        bg: DAY_BG,
        chromeBg: "linear-gradient(180deg, rgba(248,246,235,0.96), rgba(230,223,205,0.88))",
        stageBg: `url(${dayFrameUrl}) center / 100% 100% no-repeat`,
        chromeText: "#827866",
        chromeMuted: "rgba(118,105,85,0.62)",
        line: "rgba(142,128,100,0.34)",
        controlBg: "rgba(246,242,228,0.72)",
        emptyText: "rgba(118,105,85,0.58)",
        calendarBg: "linear-gradient(180deg, rgba(250,248,239,0.94), rgba(225,218,201,0.78))",
        calendarChoiceBg: "linear-gradient(180deg, rgba(250,248,239,0.94), rgba(221,213,195,0.82))",
        calendarText: "#746956",
        calendarMuted: "rgba(118,105,85,0.62)",
        calendarGold: "#9b8d73",
        inputBar: "linear-gradient(180deg, rgba(230,223,205,0.42), rgba(206,194,170,0.30))",
        inputPaper: "linear-gradient(180deg, rgba(252,250,242,0.98), rgba(232,226,210,0.96))",
        inputInk: "#6b604f",
        inputBorder: "rgba(142,128,100,0.58)",
        flourishInk: "rgba(132,119,94,0.72)",
        cardBg: "linear-gradient(180deg, rgba(250,248,239,0.84), rgba(235,229,212,0.82)), repeating-linear-gradient(0deg, rgba(132,119,94,0.035) 0 1px, transparent 1px 24px)",
        cardText: "#746956",
        cardInkUser: "rgba(132,119,94,0.82)",
        cardInkNarrator: "rgba(132,119,94,0.82)",
        cardShadow: "0 16px 36px rgba(93,76,54,0.16), inset 0 0 0 4px rgba(255,255,250,0.36), inset 0 0 0 1px rgba(132,119,94,0.20)",
        actionBg: "rgba(250,248,239,0.68)",
        actionText: "rgba(118,105,85,0.70)",
        noteBg: "rgba(250,248,239,0.74)",
        noteBorder: "rgba(142,128,100,0.34)",
        noteText: "#746956",
        seal: "radial-gradient(circle at 35% 30%, #bba98a, #8f7652 52%, #5e4a34 100%)",
      };
  const hpBadges = [
    { key: "inventory", label: "背包", mark: "背", glyph: "M18 13h8l2 13H16l2-13Zm1-3h6l1 3h-8l1-3Z" },
    { key: "contribution", label: "贡献", mark: "贡", glyph: "M16 13h12v4q0 4-6 6q-6-2-6-6v-4Zm3 12h6M20 28h4" },
    { key: "status", label: "状态", mark: "状", glyph: "M22 12v17M15 20h14M17 14l5-4 5 4M17 26l5 4 5-4" },
    { key: "favor", label: "好感", mark: "好", glyph: "M22 29s-8-5-8-11q0-4 4-4 3 0 4 3 1-3 4-3 4 0 4 4 0 6-8 11Z" },
    { key: "courses", label: "课程", mark: "课", glyph: "M15 13h8q4 0 4 4v11h-8q-4 0-4-4V13Zm8 0h6v15h-6" },
    { key: "people", label: "人物", mark: "人", glyph: "M22 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 11q2-7 8-7t8 7" },
    { key: "settings", label: "设置", mark: "设", glyph: "M22 15l2 2 3-1 2 4-3 2v3l3 2-2 4-3-1-2 2-2-2-3 1-2-4 3-2v-3l-3-2 2-4 3 1 2-2Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" },
  ];
  const hpSheetTitle = hpBadges.find((badge) => badge.key === hpSheet)?.label || "";

  const worldChatList = worldChatsOf(sessions, activeProject);
  const charChatList  = characterChatsOf(sessions, scopeChar);
  const currentChatList = activeMode === "world" ? worldChatList : charChatList;

  const pendingUpdates = activeProject?.pendingUpdates || [];
  const idNameMap = Object.fromEntries([...projectChars, player].map((c) => [c.id, c.name]));
  const chatNameMap = Object.fromEntries(Object.values(sessions).map((s) => [s.id, s.name]));

  // ── Scroll to bottom ──
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeProjectId, activeSessionId]);

  // ── Writers ──
  const patchProject = (fn) => {
    if (!activeProjectId) return;
    setProjects((prev) => {
      const p = prev[activeProjectId];
      if (!p) return prev;
      const patched = typeof fn === "function" ? fn(p) : { ...p, ...fn };
      return { ...prev, [activeProjectId]: { ...patched, updatedAt: Date.now() } };
    });
  };

  const patchSession = (fn) => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const s = prev[activeSessionId] || {};
      const patched = typeof fn === "function" ? fn(s) : { ...s, ...fn };
      return { ...prev, [activeSessionId]: { ...patched, updatedAt: Date.now() } };
    });
  };

  const setMessages = (fn) =>
    patchSession((s) => ({ ...s, messages: typeof fn === "function" ? fn(s.messages || []) : fn }));

  // Memory writers (project-level; manual only this round — no auto extraction)
  const setStoryMemory = (fn) =>
    patchProject((p) => ({ ...p, storyMemory: typeof fn === "function" ? fn(p.storyMemory || []) : fn }));
  const setWorldMemory = (fn) =>
    patchProject((p) => ({ ...p, worldMemory: typeof fn === "function" ? fn(p.worldMemory || []) : fn }));
  const setWorldBook = (fn) =>
    patchProject((p) => ({ ...p, worldBook: typeof fn === "function" ? fn(p.worldBook || []) : fn }));
  const setProjectFiles = (fn) =>
    patchProject((p) => ({ ...p, files: typeof fn === "function" ? fn(p.files || []) : fn }));

  const chooseCalendarOption = async (option) => {
    if (loading) return;
    if (!activeSessionId) return;
    if (!config.apiKey) {
      setStatus("⚠ 请先填写 API Key");
      setTimeout(() => setStatus(""), 3000);
      return;
    }
    const text = [
      buildCalendarChoiceInput(option, scenePeriod, activeProject?.currentTimeLabel),
      buildCalendarLifeContext(option, scenePeriod, activeProject?.currentTimeLabel, activeProject?.currentState, storyMemory, worldMemory, {
        lifeLog: activeProject?.lifeLog,
        characters: projectChars,
        ocs: activeProject?.ocs,
        player,
      }),
    ].filter(Boolean).join("\n\n");
    if (option.nextTimeLabel || option.nextPeriodId) {
      patchProject((p) => ({
        ...p,
        currentTimeLabel: option.nextTimeLabel || p.currentTimeLabel,
        dayPeriod: option.nextPeriodId || p.dayPeriod,
        beatProgress: option.nextTimeLabel ? 0 : p.beatProgress,
      }));
    }
    await send({
      text: option.label,
      display: option.label,
      hiddenText: text,
      kind: "calendarChoice",
      growth: option.growth || null,
      disableActions: !(option.mechanic === "课堂" || ["参加考试", "直接休息", "夜游试探", "被发现风险"].includes(option.label)),
      // 日常活动选项不再自动消耗时段；时段推进交给「下一时段」按钮。带时间跳转的选项（快进/休息/换学年）在上面已直接改写时间。
      advancePeriod: option.advancePeriod ?? false,
    });
  };

  const advanceToNextPeriod = () => {
    if (!activeProject) return;
    const current = dayPeriod(activeProject.dayPeriod || "morning");
    const next = advanceCalendarClock({
      currentTimeLabel: activeProject.currentTimeLabel,
      periodId: current.id,
    });
    patchProject((p) => ({
      ...p,
      currentTimeLabel: next.currentTimeLabel,
      dayPeriod: next.periodId,
      beatProgress: next.dayRollover ? 0 : p.beatProgress,
    }));
    const nextPeriodLabel = dayPeriod(next.periodId).label;
    setStatus(next.dayRollover ? `已进入 ${next.currentTimeLabel} · ${nextPeriodLabel}` : `已进入${nextPeriodLabel}`);
    setTimeout(() => setStatus(""), 1800);
  };

  const restClockForProject = (p) => {
    const startPeriod = p.dayPeriod || "morning";
    let next = advanceCalendarClock({ currentTimeLabel: p.currentTimeLabel, periodId: startPeriod });
    if (startPeriod === "night" && next.periodId !== "morning") {
      next = advanceCalendarClock({ currentTimeLabel: next.currentTimeLabel, periodId: next.periodId });
    }
    return next;
  };

  // ── One-time migration: v0 (pre-Project) and v1 → v2 ──
  const migrationRan = useRef(false);
  useEffect(() => {
    if (!ready || migrationRan.current) return;
    migrationRan.current = true;
    (async () => {
      if (Object.keys(projects).length === 0) {
        // HP 专项：不创建通用默认项目。世界由「世代预设包」按需载入（见 enterGeneration）。
        // 仅在存在 v0/v1 旧数据时才迁移导入。
        const legacy = await loadLegacy();
        const r = buildMigration(legacy);
        if (r) {
          await store.set("migrationBackup", legacy);
          const up = migrateAll({ [r.project.id]: r.project }, { ...sessions, ...r.sessionsMap });
          setSessions(up.sessions);
          setProjects(up.projects);
          setActiveProjectId(Object.keys(up.projects)[0]);
          setStatus("已导入历史数据 ✓");
          setTimeout(() => setStatus(""), 3000);
        }
      } else {
        const up = migrateAll(projects, sessions);
        if (up.changed) {
          // Preserve the earliest pre-upgrade snapshot; also keep a rolling latest.
          const hadBackup = await store.get("backup_v1");
          if (!hadBackup) await store.set("backup_v1", { projects, sessions });
          await store.set("backup_latest", { projects, sessions });
          setSessions(up.sessions);
          setProjects(up.projects);
          setStatus("数据已升级 ✓");
          setTimeout(() => setStatus(""), 3000);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── Project CRUD ──
  const projectArr = projectsList(projects);

  const createNewProject = () => {
    const p = createProject({ name: `项目 ${Object.keys(projects).length + 1}` });
    setProjects((prev) => ({ ...prev, [p.id]: p }));
    setActiveProjectId(p.id);
    setView("workspace");
    setPanel("project");
  };

  // HP 专项：从首页进入某个世代。已有存档 → 直接续玩；否则 → 进入角色创建。
  const enterGeneration = (presetId) => {
    const preset = PRESETS[presetId];
    if (!preset) return;
    const id = presetProjectId(presetId);
    if (projects[id]) {
      setActiveProjectId(id);
      setView("workspace");
      setPanel(null);
      setHpHome(false);
    } else {
      setCreatingPresetId(presetId);
    }
  };

  // 原创角色：加入 / 移除（存玩家层 project.ocs）
  const addOc = (oc) => {
    patchProject((p) => ({ ...p, ocs: [...(p.ocs || []), createOC(oc)] }));
    setOcCreatorOpen(false);
  };
  const removeOc = (id) => patchProject((p) => {
    const pc = p.playerCharacter || {};
    const { [id]: _favor, ...favor } = pc.favor || {};
    const relationships = { ...(pc.state?.relationships || {}) };
    delete relationships[id];
    return {
      ...p,
      ocs: (p.ocs || []).filter((o) => o.id !== id),
      playerCharacter: {
        ...pc,
        favor,
        state: { ...(pc.state || {}), relationships },
      },
    };
  });

  // P-G：重新开始（清除当前世代存档 → 重新创建角色）
  const restartGame = () => {
    if (typeof window !== "undefined" && !window.confirm("确定重新开始？当前存档（角色、进度、关系、原创角色）将被清除。")) return;
    const id = activeProjectId;
    const presetId = id?.startsWith("hp-") ? id.slice(3) : null;
    const proj = projects[id];
    const victimIds = [...(proj?.worldChatIds || []), ...((proj?.characters || []).flatMap((c) => c.chatIds || []))];
    setSessions((prev) => { const n = { ...prev }; victimIds.forEach((s) => delete n[s]); return n; });
    setProjects((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setActiveProjectId(null);
    setHpSheet(null);
    setPanel(null);
    if (presetId) setCreatingPresetId(presetId);
    else setHpHome(true);
  };

  // 角色创建完成 → 用玩家角色实例化预设，进入世界。
  const finishCreation = (player) => {
    const presetId = creatingPresetId;
    const preset = PRESETS[presetId];
    if (!preset) return;
    const id = presetProjectId(presetId);
    const playerWithStats = { ...player, stats: initialStats(player.meta), courses: initialCourses(player.meta) }; // 出身生成初始数值 + 课程
    const proj = instantiatePreset(preset, { id, player: playerWithStats });
    setProjects((prev) => ({ ...prev, [id]: proj }));
    setActiveProjectId(id);
    setView("workspace");
    setPanel(null);
    setCreatingPresetId(null);
    setHpHome(false);
  };

  const openProject = (id) => {
    setActiveProjectId(id);
    setView("workspace");
    setPanel(null);
  };

  const saveProjectSettings = (patch) => {
    patchProject((p) => ({ ...p, ...patch }));
    setStatus("项目已保存 ✓");
    setTimeout(() => setStatus(""), 2000);
    setPanel(null);
  };

  // Phase 5-2A: save the three editable current-state fields, preserving any
  // list fields (recentEvents etc.) that this minimal panel doesn't touch.
  const saveCurrentState = (patch) => {
    patchProject((p) => ({ ...p, currentState: createCurrentState({ ...p.currentState, ...patch }) }));
    setStatus("剧情状态已保存 ✓");
    setTimeout(() => setStatus(""), 2000);
    setPanel(null);
  };

  const deleteProject = (id) => {
    if (Object.keys(projects).length <= 1) return;
    const proj = projects[id];
    const victimIds = [
      ...(proj?.worldChatIds || []),
      ...(proj?.characters || []).flatMap((c) => c.chatIds || []),
    ];
    setSessions((prev) => { const n = { ...prev }; victimIds.forEach((sid) => delete n[sid]); return n; });
    setProjects((prev) => { const n = { ...prev }; delete n[id]; return n; });
    if (activeProjectId === id) {
      const remaining = Object.keys(projects).filter((k) => k !== id);
      setActiveProjectId(remaining[0] || null);
    }
    setView("projects");
    setPanel(null);
  };

  // ── Ensure the active scope always has a chat window ──
  useEffect(() => {
    if (!ready || !activeProject) return;
    if (activeMode === "world") {
      const ids = activeProject.worldChatIds || [];
      if (ids.length === 0) {
        const wc = createWorldChat(activeProject.id, "世界聊天 1");
        setSessions((p) => ({ ...p, [wc.id]: wc }));
        patchProject((p) => ({ ...p, worldChatIds: [wc.id], activeWorldChatId: wc.id }));
      } else if (!activeProject.activeWorldChatId || !sessions[activeProject.activeWorldChatId]) {
        patchProject((p) => ({ ...p, activeWorldChatId: ids[0] }));
      }
    } else {
      const ch = projectChars.find((c) => c.id === activeProject.activeCharId) || projectChars[0];
      if (!ch) return;
      const ids = ch.chatIds || [];
      if (ids.length === 0) {
        const cc = createCharacterChat(activeProject.id, ch.id, "对话 1", ch.greeting);
        setSessions((p) => ({ ...p, [cc.id]: cc }));
        patchProject((p) => ({ ...p, characters: p.characters.map((c) => c.id === ch.id ? { ...c, chatIds: [cc.id], activeChatId: cc.id } : c) }));
      } else if (!ch.activeChatId || !sessions[ch.activeChatId]) {
        patchProject((p) => ({ ...p, characters: p.characters.map((c) => c.id === ch.id ? { ...c, activeChatId: ids[0] } : c) }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeProjectId, activeMode, activeProject?.activeCharId, activeProject?.worldChatIds?.length, scopeChar?.chatIds?.length]);

  // HP 专项：内置原著名册会随版本扩充；已有存档只追加缺失角色，不覆盖已有状态/聊天。
  useEffect(() => {
    if (!ready || !activeProject || !activePreset?.characters?.length) return;
    const canonByName = new Map(activePreset.characters.map((c) => [c.name, c]));
    const existingNames = new Set((activeProject.characters || []).map((c) => c.name));
    const missing = activePreset.characters.filter((c) => !existingNames.has(c.name));
    const needsMetaPatch = (activeProject.characters || []).some((c) => {
      const canon = canonByName.get(c.name);
      return canon && ((!c.house && canon.house) || (!c.role && canon.role));
    });
    if (!missing.length && !needsMetaPatch) return;
    patchProject((p) => {
      const nextChars = (p.characters || []).map((c) => {
        const canon = canonByName.get(c.name);
        if (!canon) return c;
        return {
          ...c,
          house: c.house || canon.house || "",
          role: c.role || canon.role || "",
        };
      });
      return {
        ...p,
        characters: [
          ...nextChars,
          ...missing.map((c) => createCharacter(c)),
        ],
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeProjectId, activePreset?.characters?.length, activeProject?.characters?.length]);

  // ── Mode / scope switching ──
  const switchToWorld = () => { patchProject((p) => ({ ...p, activeMode: "world" })); setPanel(null); };
  const handleCharSelect = (id) => {
    if (HP_KIOSK) return;
    patchProject((p) => ({ ...p, activeMode: "character", activeCharId: id }));
    setPanel(null);
  };

  // ── Chat-window CRUD (scope-aware) ──
  const newChat = () => {
    if (!activeProject) return;
    if (activeMode === "world") {
      const n = (activeProject.worldChatIds || []).length + 1;
      const wc = createWorldChat(activeProject.id, `世界聊天 ${n}`);
      setSessions((p) => ({ ...p, [wc.id]: wc }));
      patchProject((p) => ({ ...p, worldChatIds: [wc.id, ...(p.worldChatIds || [])], activeWorldChatId: wc.id }));
    } else {
      const ch = scopeChar;
      if (!ch) return;
      const n = (ch.chatIds || []).length + 1;
      const cc = createCharacterChat(activeProject.id, ch.id, `对话 ${n}`, ch.greeting);
      setSessions((p) => ({ ...p, [cc.id]: cc }));
      patchProject((p) => ({ ...p, characters: p.characters.map((c) => c.id === ch.id ? { ...c, chatIds: [cc.id, ...(c.chatIds || [])], activeChatId: cc.id } : c) }));
    }
    setPanel(null);
  };

  const selectChat = (id) => {
    if (activeMode === "world") patchProject((p) => ({ ...p, activeWorldChatId: id }));
    else patchProject((p) => ({ ...p, characters: p.characters.map((c) => c.id === scopeChar.id ? { ...c, activeChatId: id } : c) }));
    setPanel(null);
  };

  const renameChat = (id, name) => {
    setSessions((p) => (p[id] ? { ...p, [id]: { ...p[id], name } } : p));
  };

  const saveChatSummary = (id, summary) => {
    setSessions((p) => (p[id] ? { ...p, [id]: { ...p[id], summary, summaryUntil: summary ? (p[id].summaryUntil || 0) : 0, updatedAt: Date.now() } } : p));
  };

  const clearChatSummary = (id) => {
    setSessions((p) => (p[id] ? { ...p, [id]: { ...p[id], summary: "", summaryUntil: 0, updatedAt: Date.now() } } : p));
  };

  const summarizeChatNow = async (id) => {
    if (loading) return;
    const session = sessions[id];
    if (!session) return;
    if (!config.apiKey) {
      setStatus("⚠ 请先填写 API Key");
      setTimeout(() => setStatus(""), 3000);
      return;
    }
    setLoading(true);
    try {
      const updated = await updateChatSummary(id, session.messages || [], { force: true });
      if (!updated) {
        setStatus("没有足够旧消息可总结");
        setTimeout(() => setStatus(""), 2200);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDefaultChatName = (name = "") =>
    /^(世界聊天|对话)\s*\d+$/.test(name.trim()) || name.trim() === "新对话";

  const titleFromText = (text) => {
    const cleaned = String(text || "")
      .replace(/\s+/g, " ")
      .replace(/[。！？!?，,；;：:]+$/g, "")
      .trim();
    if (!cleaned) return "";
    return cleaned.length > 18 ? `${cleaned.slice(0, 18)}…` : cleaned;
  };

  const maybeAutoNameChat = (sid, text) => {
    if (!activeProject?.autoNameChats || !sid) return;
    const title = titleFromText(text);
    if (!title) return;
    setSessions((prev) => {
      const s = prev[sid];
      if (!s || !isDefaultChatName(s.name)) return prev;
      return { ...prev, [sid]: { ...s, name: title, updatedAt: Date.now() } };
    });
  };

  const deleteChat = (id) => {
    if (!activeProject) return;
    if (activeMode === "world") {
      const ids = activeProject.worldChatIds || [];
      if (ids.length <= 1) return;
      const newIds = ids.filter((x) => x !== id);
      setSessions((p) => { const n = { ...p }; delete n[id]; return n; });
      patchProject((p) => ({ ...p, worldChatIds: newIds, activeWorldChatId: p.activeWorldChatId === id ? newIds[0] : p.activeWorldChatId }));
    } else {
      const ch = scopeChar;
      const ids = ch.chatIds || [];
      if (ids.length <= 1) return;
      const newIds = ids.filter((x) => x !== id);
      setSessions((p) => { const n = { ...p }; delete n[id]; return n; });
      patchProject((p) => ({ ...p, characters: p.characters.map((c) => c.id === ch.id ? { ...c, chatIds: newIds, activeChatId: c.activeChatId === id ? newIds[0] : c.activeChatId } : c) }));
    }
  };

  // ── Character management ──
  const handleCharEdit = (ch) => {
    patchProject((p) => {
      const i = p.characters.findIndex((c) => c.id === ch.id);
      if (i >= 0) {
        const cur = p.characters[i];
        const merged = {
          ...cur, ...ch,
          state: ch.state ?? cur.state,
          history: ch.history ?? cur.history,
          chatIds: cur.chatIds,
          activeChatId: cur.activeChatId,
        };
        const arr = [...p.characters];
        arr[i] = merged;
        return { ...p, characters: arr };
      }
      return { ...p, characters: [...p.characters, createCharacter(ch)] };
    });
  };

  const handlePlayerEdit = (pc) => {
    patchProject((p) => ({ ...p, playerCharacter: createPlayerCharacter({ ...(p.playerCharacter || {}), ...pc }) }));
  };

  // 6A-2C: batch-create characters from TXT drafts in a single patchProject.
  const handleImportChars = (drafts) => {
    const valid = (drafts || []).filter((d) => d && d.name);
    if (valid.length === 0) return;
    patchProject((p) => ({
      ...p,
      characters: [...p.characters, ...valid.map((d) => createCharacter({ name: d.name, persona: d.persona, avatar: d.avatar }))],
    }));
    setStatus(`已导入 ${valid.length} 个角色 ✓`);
    setTimeout(() => setStatus(""), 2000);
  };

  const handleCharDelete = (id) => {
    if (!activeProject || projectChars.length <= 1) return;
    const victim = projectChars.find((c) => c.id === id);
    if (!victim) return;
    const victimName = victim.name || id;
    const victimChatIds = victim.chatIds || [];
    setSessions((p) => { const n = { ...p }; victimChatIds.forEach((sid) => delete n[sid]); return n; });
    patchProject((p) => {
      // Drop the character, and downgrade any relationship that targeted it by
      // id to a free-text NPC keyed by its name (preserve the relationship).
      const chars = p.characters
        .filter((c) => c.id !== id)
        .map((c) => ({ ...c, state: { ...c.state, relationships: migrateRelationshipTarget(c.state?.relationships, id, victimName) } }));
      const playerCharacter = p.playerCharacter
        ? { ...p.playerCharacter, state: { ...p.playerCharacter.state, relationships: migrateRelationshipTarget(p.playerCharacter.state?.relationships, id, victimName) } }
        : p.playerCharacter;
      const nextCharId = p.activeCharId === id ? chars[0]?.id : p.activeCharId;
      const nextMode = p.activeMode === "character" && p.activeCharId === id ? "world" : p.activeMode;
      return { ...p, characters: chars, playerCharacter, activeCharId: nextCharId, activeMode: nextMode };
    });
  };

  // ── Build system prompt (mode-aware; shared-state block + this-window block) ──
  const buildSystem = (userText) => {
    const parts = [];
    // HP 专项预设项目：硬规则以「内置预设」为单一可信源（实时读取），这样规则更新能
    // 立刻作用于已有存档，而不是停留在建档时烘焙进项目的旧副本。其余项目用自身 instructions。
    const liveInstructions = activePreset?.instructions || activeProject?.instructions;
    if (liveInstructions?.trim()) parts.push(liveInstructions.trim());
    parts.push(AMBIGUOUS_ATMOSPHERE_STYLE);

    const projectFileBlocks = formatProjectFiles(projectFiles);
    if (projectFileBlocks.length) parts.push(`【项目文件】\n${projectFileBlocks.join("\n\n")}`);

    const triggered = matchWorld(worldBook, userText);
    if (triggered.length)
      parts.push(`【世界书】\n${triggered.map((e) => `[${e.title}]\n${e.content}`).join("\n\n")}`);

    // Phase 5: current-state snapshot. CharacterChat sees only the visible subset.
    const csVisible = visibleCurrentState(activeProject?.currentState, {
      mode: activeMode,
      charId: activeMode === "character" ? activeChar?.id : null,
    });
    const csFmt = formatCurrentState(csVisible, { nameMap });
    if (activeProject?.currentTimeLabel?.trim()) parts.push(`【当前时间】\n${activeProject.currentTimeLabel.trim()}`);
    if (HP_KIOSK && activeMode === "world") {
      const scheduleBlock = formatScheduleContextBlock(currentScheduleContext);
      if (scheduleBlock) parts.push(scheduleBlock);
      parts.push(buildHogwartsLifeContext({
        userText,
        period: scenePeriod,
        currentTimeLabel: activeProject?.currentTimeLabel,
        currentState: activeProject?.currentState,
        storyMemory,
        worldMemory,
        lifeLog: activeProject?.lifeLog,
        characters: projectChars,
        ocs: activeProject?.ocs,
        player,
      }));
      const presenceBlock = buildPresenceContext({
        userText,
        period: scenePeriod,
        currentState: activeProject?.currentState,
        lifeLog: activeProject?.lifeLog,
        characters: projectChars,
        ocs: activeProject?.ocs,
        player,
      });
      if (presenceBlock) parts.push(presenceBlock);
    }
    // HP 专项：注入当前时间对应的原著剧情锚点（防跑偏）。位于硬规则之下、当前状态之上。
    if (currentCanonBeat) parts.push(canonAnchor(currentCanonBeat));
    if (csFmt.stateLines.length) parts.push(`【当前剧情状态】\n${csFmt.stateLines.join("\n")}`);
    if (csFmt.forbidden.length)
      parts.push(`【严格约束（不得违反）】\n- 只能基于上述【当前剧情状态】推进，不得编造状态之外的剧情进展。\n- 禁止假设：\n  - ${csFmt.forbidden.join("\n  - ")}`);
    const lifeLogNameMap = {
      ...nameMap,
      ...Object.fromEntries((activeProject?.ocs || []).map((o) => [o.id, o])),
    };
    const lifeLogBlock = formatLifeLogBlock(activeProject?.lifeLog, { nameMap: lifeLogNameMap, limit: 8 });
    if (lifeLogBlock) parts.push(lifeLogBlock);

    const facts = formatFacts(worldMemory);
    if (facts.length) parts.push(`【世界客观事实】\n- ${facts.join("\n- ")}`);

    const story = formatStory(storyMemory);
    if (story.length) parts.push(`【主线剧情进度】\n- ${story.join("\n- ")}`);

    if (activeMode === "world") {
      // Cast: all characters' persona + current State (compact). No full histories.
      const cast = projectChars.map((c) => {
        const seg = [`【角色：${c.name}】`];
        if (c.persona?.trim()) seg.push(c.persona.trim());
        const st = formatState(c.state, nameMap);
        if (st.length) seg.push(`(状态) ${st.join("；")}`);
        return seg.join("\n");
      });
      if (cast.length) parts.push(cast.join("\n\n"));
      // HP 专项：玩家原创角色（OC）+ 规则
      const ocBlock = formatOcs(activeProject?.ocs);
      if (ocBlock) { parts.push(ocBlock); parts.push(OC_GUARD); }
      // HP 专项：好感度（玩家与角色的关系）
      const favorNameById = Object.fromEntries([
        ...projectChars.map((c) => [c.id, c.name]),
        ...(activeProject?.ocs || []).map((o) => [o.id, o.name]),
      ]);
      const favorBlock = formatFavorBlock(player.favor, favorNameById, player.state?.relationships || {});
      if (favorBlock) parts.push(favorBlock);
      parts.push(relationshipRulesBlock(projectChars, activeProject?.ocs));
      const clueBlock = formatCluesBlock(clues);
      if (clueBlock) parts.push(clueBlock);
      // HP 专项：注入玩家数值 + 数值/好感度门槛裁决规则（防止自由叙述空口越过数值门槛）
      if (player.stats) {
        parts.push(formatStatsLine(player.stats));
        parts.push(formatHouseCupBlock(player, activeProject?.currentTimeLabel, activeProject?.houseCupResults));
        parts.push(formatCoursesBlock(player.courses));
        parts.push(formatInventoryBlock(player.inventory));
        parts.push(GATING_RULES);
        parts.push(INVENTORY_RULES);
      }
      parts.push(LIFE_SCENE_RULES);
      parts.push(LIFE_SCENE_ENGINE_RULES);
      parts.push(DAILY_GROWTH_RULES);
      parts.push(CLUE_RULES);
      // Player character — the user's own role in the world.
      const pseg = [`【玩家角色（用户扮演）：${player.name}】`];
      if (player.persona?.trim()) pseg.push(player.persona.trim());
      const pst = formatState(player.state, nameMap);
      if (pst.length) pseg.push(`(状态) ${pst.join("；")}`);
      parts.push(pseg.join("\n"));
      parts.push(`你是这个世界的旁白。用户扮演「${player.name}」。请进行场景描写、推进剧情，并在需要时扮演任意出场角色（用「角色名：」标明发言），但不要替「${player.name}」作主。保持与上述世界状态一致。`);
    } else {
      // Single character POV. Never inject OTHER AI characters' state/history.
      if (activeChar?.persona?.trim()) parts.push(`【你的角色：${activeChar.name}】\n${activeChar.persona.trim()}`);
      const st = formatState(activeChar.state, nameMap);
      if (st.length) parts.push(`【你的当前状态】\n- ${st.join("\n- ")}`);
      const hist = formatHistory(activeChar.history);
      if (hist.length) parts.push(`【你的经历】\n- ${hist.join("\n- ")}`);
      // Player identity — Character POV. Hard, structured anti-fabrication rule.
      // Only publicly-knowable player fields; never the player's own
      // relationships / feelings / notes / history.
      parts.push(
        `【玩家资料】\n` +
        `姓名：${player.name}\n` +
        `身份资料：${player.persona?.trim() || "未提供"}\n` +
        `当前状态：${player.state?.status?.trim() || "未提供"}`
      );

      // Does THIS character actually know the player? Deterministic checks only:
      // own relationship toward the player, or the player's name literally
      // appearing in this character's history / StoryMemory / WorldMemory.
      const c2p = findRel(activeChar.state?.relationships, player);
      const nameHit = (txt) => !!player.name && (txt || "").includes(player.name);
      const inHistory = (activeChar.history || []).some((h) => nameHit(h.content));
      const inPublic = storyMemory.some((e) => nameHit(e.content)) || worldMemory.some((f) => nameHit(f.content));
      const acquainted = !!c2p || inHistory || inPublic;

      const relLines = ["【你与玩家的已知关系】"];
      if (c2p) relLines.push(`你对「${player.name}」的既有关系：${formatRel(c2p)}`);
      if (inHistory || inPublic) relLines.push(`你与「${player.name}」相关的已知信息见上方"你的经历" / 主线剧情 / 世界客观事实，可据此回答。`);
      if (!acquainted) {
        relLines.push(`未建立 / 未知。你没有关于该玩家的既有记忆。`);
        relLines.push(`你必须表现为初次见到对方、或不确定其身份。`);
        relLines.push(`禁止编造上次见面、共同经历、玩家性格、穿着、习惯或你与对方的关系。`);
      }
      parts.push(relLines.join("\n"));

      parts.push(
        `【严格限制】\n` +
        `如果用户询问玩家的身份、背景、关系、阵营、家族、职业、亲属、经历，而资料中没有明确写出：\n` +
        `你必须回答"不清楚"或"我不知道"。\n` +
        `禁止猜测。\n` +
        `禁止补全。\n` +
        `禁止基于世界观常识推断。\n` +
        `禁止把可能性说成事实。`
      );
      parts.push(
        `【回答规则】\n` +
        `- 已写入玩家资料的信息：可以确定回答。\n` +
        `- 只存在于当前角色 State/History 的信息：可以按当前角色视角回答。\n` +
        `- 只存在于 StoryMemory/WorldMemory 的公开信息：可以回答。\n` +
        `- 其他全部视为未知。`
      );
      parts.push(`请以「${activeChar.name}」的身份，第一人称与「${player.name}」一对一对话。只基于你自己的认知与世界共享信息，不要替其他角色或「${player.name}」作主。`);
    }

    // This-window local recap (cross-window continuity comes from shared state above).
    if (activeSessionObj?.summary?.trim()) parts.push(`【本对话前情提要】\n${activeSessionObj.summary.trim()}`);

    return parts.join("\n\n").trim();
  };

  const extractUpdateSuggestions = async ({ userText, aiText, dialogueText = "", auto = false, openPanel = false, blocking = true }) => {
    if (!userText && !aiText && !dialogueText) { setStatus("没有可提炼的内容"); setTimeout(() => setStatus(""), 2500); return false; }
    if (!blocking && extractingRef.current) return false;

    if (blocking) setLoading(true);
    else { extractingRef.current = true; setExtracting(true); }
    setStatus(auto ? "自动提炼建议中…" : "提炼建议中…");
    try {
      const prompt = buildSuggestionPrompt({ mode: activeMode, userText, aiText, dialogueText, activeChar: scopeChar || activeChar, player, characters: projectChars, currentTimeLabel: activeProject.currentTimeLabel, currentState: activeProject.currentState });
      const raw = await callAPIOnce(config, prompt);
      const scanText = dialogueText || userText;
      const inferredTime = inferProjectTimeSuggestion({ userText: scanText, aiText, currentTimeLabel: activeProject.currentTimeLabel });
      const inferredPresent = inferPresentCharacterSuggestions({ userText: scanText, aiText, characters: projectChars, player, currentState: activeProject.currentState });
      const parsed = [...parseSuggestions(raw), ...(inferredTime ? [inferredTime] : []), ...inferredPresent];
      const pend = normalizeSuggestions(parsed, {
        project: activeProject, sourceChatId: activeSessionId, sourceKind: activeMode,
        mode: activeMode, activeChar: scopeChar || activeChar, player,
        currentTimeLabel: activeProject.currentTimeLabel,
      });
      if (pend.length === 0) {
        if (!auto) {
          setStatus("没有新的建议");
          setTimeout(() => setStatus(""), 2500);
        } else {
          setStatus("");
        }
        return true;
      } else {
        const merged = mergePendingUpdatesWithMeta(pend, pendingUpdates);
        patchProject((p) => ({ ...p, pendingUpdates: mergePendingUpdatesWithMeta(pend, p.pendingUpdates || []).updates }));
        setStatus(`${auto ? "自动生成" : "生成"} ${pend.length} 条建议${merged.mergedCount ? `，合并 ${merged.mergedCount} 条重复` : ""}`);
        setTimeout(() => setStatus(""), 2500);
        if (openPanel) setPanel("pending");
        return true;
      }
    } catch {
      if (!auto) {
        setStatus("提炼失败");
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("");
      }
      return false;
    } finally {
      if (blocking) setLoading(false);
      else { extractingRef.current = false; setExtracting(false); }
    }
  };

  // ── Phase 4A: suggestion generation (manual; never auto-writes) ──
  const generateSuggestions = async () => {
    if (loading || extractingRef.current) return;
    if (!config.apiKey) { setStatus("⚠ 请先填写 API Key"); setTimeout(() => setStatus(""), 3000); return; }
    if (!activeSessionObj) return;
    const msgs = activeSessionObj.messages || [];
    const recentMessages = msgs.filter((m) => !m.streaming).slice(-AUTO_EXTRACT_WINDOW_MESSAGES);
    const dialogueText = transcriptLines(recentMessages);
    const quickRaw = [
      inferProjectTimeSuggestion({ userText: dialogueText, currentTimeLabel: activeProject.currentTimeLabel }),
      ...inferPresentCharacterSuggestions({ userText: dialogueText, characters: projectChars, player, currentState: activeProject.currentState }),
    ].filter(Boolean);
    const quickPend = normalizeSuggestions(quickRaw, {
      project: activeProject, sourceChatId: activeSessionId, sourceKind: activeMode,
      mode: activeMode, activeChar: scopeChar || activeChar, player,
      currentTimeLabel: activeProject.currentTimeLabel,
    });
    if (quickPend.length) {
      patchProject((p) => ({ ...p, pendingUpdates: mergePendingUpdatesWithMeta(quickPend, p.pendingUpdates || []).updates }));
      setPanel("pending");
      setStatus(`先生成 ${quickPend.length} 条快速建议，继续后台提炼…`);
    }
    await extractUpdateSuggestions({ dialogueText, openPanel: true, blocking: false });
  };

  // Accept (only write path) / reject — all user-driven.
  const acceptUpdate = (id, editedValue, editedDate) => {
    patchProject((p) => {
      const pu0 = (p.pendingUpdates || []).find((x) => x.id === id);
      if (!pu0) return p;
      const pu = editedDate !== undefined ? { ...pu0, date: editedDate } : pu0;
      const np = applyUpdateToProject(p, pu, editedValue);
      return { ...np, pendingUpdates: (p.pendingUpdates || []).filter((x) => x.id !== id) };
    });
  };
  const rejectUpdate = (id) =>
    patchProject((p) => ({ ...p, pendingUpdates: (p.pendingUpdates || []).filter((x) => x.id !== id) }));
  const rejectAllUpdates = () =>
    patchProject((p) => ({ ...p, pendingUpdates: [] }));
  const acceptHighConfidence = () => {
    patchProject((p) => {
      let np = { ...p };
      const remain = [];
      for (const pu of p.pendingUpdates || []) {
        if (!pu.inferred && (pu.confidence || 0) >= 0.8) np = applyUpdateToProject(np, pu);
        else remain.push(pu);
      }
      return { ...np, pendingUpdates: remain };
    });
  };

  // ── File attachment handler ──
  const handleFiles = async (files) => {
    const atts = [];
    for (const f of files) {
      if (f.type.startsWith("image/") || f.type === "application/pdf") {
        const b64 = await fileToBase64(f);
        atts.push({ name: f.name, type: f.type, data: b64, mediaType: f.type });
      }
    }
    setAttachments((p) => [...p, ...atts]);
  };

  const messageText = (message) => {
    if (!message) return "";
    if (typeof message.display === "string") return message.display;
    if (typeof message.content === "string") return message.content;
    const textPart = Array.isArray(message.content) ? message.content.find((part) => part.type === "text") : null;
    return textPart?.text || "";
  };

  const updateUserMessageContent = (message, text) => {
    if (Array.isArray(message.content)) {
      const mediaParts = message.content.filter((part) => part.type !== "text");
      return text ? [...mediaParts, { type: "text", text }] : mediaParts;
    }
    return text;
  };

  const transcriptLines = (list) => (list || [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "用户" : "AI"}：${messageText(m) || "（非文本内容）"}`)
    .join("\n\n");

  const compactMessagesForAPI = (list) => {
    if (!activeProject?.autoSummarizeChats) return list;
    if (!activeSessionObj?.summary?.trim()) return list;
    if ((list || []).length <= SUMMARY_KEEP_MESSAGES) return list;
    const compacted = list.slice(-SUMMARY_KEEP_MESSAGES);
    const firstUserIndex = compacted.findIndex((m) => m.role === "user");
    return firstUserIndex > 0 ? compacted.slice(firstUserIndex) : compacted;
  };

  const updateChatSummary = async (sid, completedMessages, { force = false } = {}) => {
    if ((!force && !activeProject?.autoSummarizeChats) || !sid || !config.apiKey) return false;
    if (!force && (completedMessages || []).length < SUMMARY_KEEP_MESSAGES + SUMMARY_TRIGGER_MESSAGES) return false;

    const currentSession = sessions[sid] || activeSessionObj || {};
    const priorSummary = currentSession.summary || "";
    const rawUntil = Number(currentSession.summaryUntil || 0);
    const summaryUntil = Math.min(Math.max(0, rawUntil), completedMessages.length);
    const summarizeEnd = force ? completedMessages.length : Math.max(0, completedMessages.length - SUMMARY_KEEP_MESSAGES);
    if (!force && summarizeEnd - summaryUntil < SUMMARY_TRIGGER_MESSAGES) return false;
    const summarizeStart = force ? 0 : Math.max(summaryUntil, summarizeEnd - SUMMARY_BATCH_MESSAGES);
    if (summarizeEnd <= summarizeStart) return false;

    const chunk = completedMessages.slice(summarizeStart, summarizeEnd);
    if (!force && chunk.length < 4) return false;

    setStatus(force ? "总结对话中…" : "自动总结对话中…");
    const prompt = `你是长期 RP 对话压缩器。请更新【本对话前情提要】，用于之后继续同一段聊天。

要求：
- 只总结明确发生过的内容，不要编造。
- 保留剧情进展、角色意图、关系变化、未解决伏线、重要物品/地点/时间。
- 保留用户扮演角色的明确行动与选择。
- 不要写成小说正文，不要加入新剧情。
- 控制在 350 字以内，优先保留最新变化。

【已有提要】
${priorSummary || "（无）"}

【新增对话片段】
${transcriptLines(chunk)}`;

    try {
      const nextSummary = (await callAPIOnce(config, prompt)).trim();
      if (!nextSummary) return false;
      setSessions((prev) => {
        const s = prev[sid];
        if (!s) return prev;
        return {
          ...prev,
          [sid]: { ...s, summary: nextSummary, summaryUntil: summarizeEnd, updatedAt: Date.now() },
        };
      });
      setStatus("对话提要已更新 ✓");
      setTimeout(() => setStatus(""), 1800);
      return true;
    } catch {
      setStatus("");
      return false;
    }
  };

  const generateAssistantReply = async (baseMessages, promptText, sid = activeSessionId) => {
    if (!sid) return;
    if (!config.apiKey) {
      setStatus("⚠ 请先填写 API Key");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    setLoading(true);
    setStatus("思考中…");

    const aid = uid();
    setSessions((prev) => {
      const s = prev[sid];
      if (!s) return prev;
      return {
        ...prev,
        [sid]: {
          ...s,
          updatedAt: Date.now(),
          messages: [...baseMessages, { role: "assistant", content: "", id: aid, streaming: true }],
        },
      };
    });

    try {
      const apiMsgs = compactMessagesForAPI(baseMessages).map((m) => ({ role: m.role, content: m.content }));
      const sys = buildSystem(promptText);

      const finalText = await callAPI(config, apiMsgs, sys, (chunk) => {
        setSessions((prev) => {
          const s = prev[sid];
          if (!s) return prev;
          return {
            ...prev,
            [sid]: {
              ...s,
              updatedAt: Date.now(),
              messages: s.messages.map((m) => m.id === aid ? { ...m, content: chunk } : m),
            },
          };
        });
      });

      const lastUserForMechanics = baseMessages[baseMessages.length - 1] || {};
      const cmdForReply = lastUserForMechanics.mechanicCommand || parseActionCommand(promptText);
      const allowDailyGrowth = HP_KIOSK && activeMode === "world" && player?.stats && !cmdForReply;
      const allowRelationshipDeltas = HP_KIOSK && activeMode === "world" && !cmdForReply;
      const daily = allowDailyGrowth ? parseDailyGrowth(finalText) : { cleaned: finalText, entries: [] };
      const relationship = allowRelationshipDeltas
        ? parseRelationshipDeltas(daily.cleaned || finalText, projectChars, activeProject?.ocs || [])
        : { cleaned: daily.cleaned || finalText, entries: [] };
      const clueParse = HP_KIOSK && activeMode === "world"
        ? parseClueTags(relationship.cleaned || daily.cleaned || finalText)
        : { cleaned: relationship.cleaned || daily.cleaned || finalText, entries: [] };
      const visibleText = clueParse.cleaned || relationship.cleaned || daily.cleaned || finalText;
      const dailyGrowthLine = formatDailyGrowth(daily.entries);
      let relationshipLine = "";
      let clueLine = "";
      let appliedRelationship = [];
      const presentCharacterIds = HP_KIOSK && activeMode === "world"
        ? detectCharacterRefs(`${lastUserForMechanics.display || ""}\n${visibleText}`, projectChars, activeProject?.ocs || [], { mode: "present" }).map((entry) => entry.id)
        : [];
      const presentCharacterSet = new Set(presentCharacterIds);

      if (daily.entries.length) {
        patchProject((p) => {
          const pc = p.playerCharacter || {};
          return { ...p, playerCharacter: { ...pc, stats: applyDailyGrowth(pc.stats, daily.entries) } };
        });
      }
      let relEntries = filterRelationshipDeltasByEvidence(
        relationship.entries,
        lastUserForMechanics.display || "",
        projectChars,
        activeProject?.ocs || [],
        { aiText: visibleText, playerName: player.name, presentCharacterIds }
      );
      if (allowRelationshipDeltas) {
        // 兜底/补全：从玩家这轮可见输入里识别直接互动到的角色，对 AI 没有给出变化的角色
        // （尤其是原创角色 OC，AI 常常只给原著角色加分）补一个小幅 +1，保证互动后好感会动。
        const inferred = inferFavorDeltas(lastUserForMechanics.display || "", projectChars, activeProject?.ocs || [], {
          aiText: visibleText,
          playerName: player.name,
          maxEntries: 4,
        });
        if (inferred.length) {
          const have = new Set(relEntries.map((e) => e.id));
          relEntries = [
            ...relEntries,
            ...inferred.filter((e) => !have.has(e.id) && presentCharacterSet.has(e.id)),
          ];
        }
      }
      if (relEntries.length) {
        const relationshipLocation = detectLifeLocation(`${lastUserForMechanics.display || ""}\n${visibleText}`, activeProject?.currentState?.location || "");
        const relationshipContext = {
          date: activeProject?.currentTimeLabel || "",
          periodLabel: scenePeriod.label,
          location: relationshipLocation,
          scene: visibleText,
          userText: lastUserForMechanics.display || "",
          source: "daily",
        };
        const appliedPreview = applyRelationshipDeltas(player, relEntries, relationshipContext).applied;
        appliedRelationship = appliedPreview;
        patchProject((p) => {
          const pc = p.playerCharacter || {};
          const result = applyRelationshipDeltas(pc, relEntries, relationshipContext);
          return { ...p, playerCharacter: result.player };
        });
        relationshipLine = formatRelationshipDeltaLine(appliedPreview);
      }
      if (clueParse.entries.length) {
        const preview = mergeClues(activeProject?.clues || [], clueParse.entries);
        patchProject((p) => ({ ...p, clues: mergeClues(p.clues || [], clueParse.entries).clues }));
        clueLine = formatClueLine(preview.applied);
      }
      const rollLine = [dailyGrowthLine, relationshipLine, clueLine].filter(Boolean).join("   ");
      if (HP_KIOSK && activeMode === "world") {
        const lifeMeta = lastUserForMechanics.lifeMeta || {};
        const lifeEntry = createLifeLogEntry({
          project: activeProject,
          periodId: scenePeriodId,
          periodLabel: scenePeriod.label,
          userText: lastUserForMechanics.display || "",
          aiText: visibleText,
          characters: projectChars,
          ocs: activeProject?.ocs || [],
          relationshipApplied: appliedRelationship,
          dailyGrowth: [...(lifeMeta.growthEntries || []), ...daily.entries],
          clueEntries: clueParse.entries,
          inventoryChanges: lifeMeta.inventoryChanges || [],
          rollLine: [lastUserForMechanics.roll, rollLine].filter(Boolean).join("   "),
          sourceChatId: sid,
        });
        patchProject((p) => applyLifeLogUpdate(p, lifeEntry));
      }

      setSessions((prev) => {
        const s = prev[sid];
        if (!s) return prev;
        return {
          ...prev,
          [sid]: { ...s, messages: s.messages.map((m) => m.id === aid ? { ...m, content: visibleText, roll: rollLine || null, streaming: false } : m) },
        };
      });
      const completedMessages = [...baseMessages, { role: "assistant", content: visibleText, id: aid, roll: rollLine || null, streaming: false }];

      // HP 专项：时间按「时段」推进——一回合推进一个时段（上午→下午→晚饭后→夜晚→深夜），
      // 走到深夜之后回到次日上午并把日期 +1。日期不再跳到下一个原著节点；原著锚点改由
      // 当前日期落在哪个节点自然决定（见 buildSystem 的 currentCanonBeat）。玩家可在日常入口
      // 选「快进到下一个重要日子」一次性跨过空白日子。这样玩家完全掌控节奏：可只玩一天，也可玩很多天。
      if (HP_KIOSK && activeMode === "world" && lastUserForMechanics.advancePeriod) {
        patchProject((p) => {
          const next = advanceCalendarClock({
            currentTimeLabel: p.currentTimeLabel,
            periodId: p.dayPeriod || "morning",
          });
          return {
            ...p,
            dayPeriod: next.periodId,
            currentTimeLabel: next.currentTimeLabel,
            beatProgress: next.dayRollover ? 0 : p.beatProgress,
          };
        });
      }

      const summaryUpdated = await updateChatSummary(sid, completedMessages);
      const sessionForAuto = sessions[sid] || activeSessionObj || {};
      const autoExtractUntil = Number(sessionForAuto.autoExtractUntil || 0);
      const shouldAutoExtract = activeProject?.autoExtractUpdates && visibleText?.trim() && completedMessages.length - autoExtractUntil >= AUTO_EXTRACT_INTERVAL_MESSAGES;
      if (shouldAutoExtract) {
        const recentMessages = completedMessages.slice(-AUTO_EXTRACT_WINDOW_MESSAGES);
        extractUpdateSuggestions({ dialogueText: transcriptLines(recentMessages), auto: true, blocking: false }).then((extracted) => {
          if (!extracted) return;
          setSessions((prev) => {
            const s = prev[sid];
            return s ? { ...prev, [sid]: { ...s, autoExtractUntil: completedMessages.length, updatedAt: Date.now() } } : prev;
          });
        });
      }
      if (!shouldAutoExtract && !summaryUpdated) setStatus("");
    } catch (err) {
      setSessions((prev) => {
        const s = prev[sid];
        if (!s) return prev;
        return {
          ...prev,
          [sid]: { ...s, messages: s.messages.map((m) => m.id === aid ? { ...m, content: `⚠️ ${err.message}`, streaming: false } : m) },
        };
      });
      setStatus("发送失败");
    } finally {
      setLoading(false);
    }
  };

  // ── Send ──
  const send = async (draft = null) => {
    if (loading) return;
    const text = (draft?.text ?? input).trim();
    const hiddenText = (draft?.hiddenText ?? text).trim();
    const displayText = draft?.display ?? text;
    const messageKind = draft?.kind || null;
    const disableActions = !!draft?.disableActions;
    const curAtts = draft ? [] : [...attachments];
    if (!hiddenText && !curAtts.length) return;
    if (!activeSessionId) return;
    if (!config.apiKey) {
      setStatus("⚠ 请先填写 API Key");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    // HP 专项：采购 / 获得物品。后台写入背包，显示为对话流里的轻量状态条。
    // 只扫描「玩家自己这轮的输入/选项」，不扫描隐藏的世界上下文（其中可能顺带提到
    // 猫头鹰商店、魁地奇精品店等，会导致玩家明明没买却凭空获得猫头鹰、扫帚）。
    const shoppingChanges = HP_KIOSK && activeMode === "world"
      ? inferShoppingChanges(text, { currentTimeLabel: activeProject?.currentTimeLabel, wandMeta: player.meta?.wand })
      : [];
    const nextInventory = shoppingChanges.length ? applyInventoryChanges(player.inventory, shoppingChanges) : player.inventory;
    let inventoryAnchor = null;
    if (shoppingChanges.length) {
      const shoppingLine = formatInventoryChangeLine(shoppingChanges);
      inventoryAnchor = `【本回合物品变化】${shoppingLine.replace(/^🎒\s*/, "")}。这些物品已写入玩家背包；请在叙事中自然承认获得或整理它们。`;
      patchProject((p) => {
        const pc = p.playerCharacter || {};
        return { ...p, playerCharacter: { ...pc, inventory: applyInventoryChanges(pc.inventory, shoppingChanges) } };
      });
    }

    // HP 专项：行动指令（/练咒 …）→ 透明检定。普通对话不触发。
    let actionAnchor = null, rollLine = shoppingChanges.length ? formatInventoryChangeLine(shoppingChanges) : null;
    let cupAnchor = null;
    if (HP_KIOSK && activeMode === "world") {
      const settlement = settleHouseCup({ player, currentTimeLabel: activeProject?.currentTimeLabel, houseCupResults: activeProject?.houseCupResults });
      if (settlement) {
        rollLine = [rollLine, formatHouseCupLine(settlement)].filter(Boolean).join("  ·  ");
        cupAnchor = houseCupAnchor(settlement);
        if (settlement.isNew) {
          patchProject((p) => ({
            ...p,
            houseCupResults: { ...(p.houseCupResults || {}), [settlement.result.key]: settlement.result },
          }));
        }
      }
    }
    // HP 专项：养成型校历选项（开学前预习 / 练习等）→ 确定性数值成长，写回养成数值。
    let growthAnchor = null;
    const growthEntries = draft?.growth
      ? Object.entries(draft.growth).map(([key, delta]) => ({ key, delta }))
      : [];
    if (growthEntries.length) {
      rollLine = [rollLine, formatDailyGrowth(growthEntries)].filter(Boolean).join("  ·  ");
      growthAnchor = `【本回合养成成长】${formatDailyGrowth(growthEntries).replace(/^✨\s*/, "")}。请把这次开学前的准备 / 练习自然地叙述出来，体现相应的小小进步；不要再额外加减任何数值。`;
      patchProject((p) => {
        const pc = p.playerCharacter || {};
        return { ...p, playerCharacter: { ...pc, stats: applyDailyGrowth(pc.stats, growthEntries) } };
      });
    }
    const explicitCmd = !disableActions && HP_KIOSK && activeMode === "world" ? parseActionCommand(text) : null;
    const naturalCmd = !explicitCmd && !disableActions && HP_KIOSK && activeMode === "world"
      ? inferNaturalCommand(text, { periodId: scenePeriodId, currentTimeLabel: activeProject?.currentTimeLabel })
      : null;
    const baseCmd = explicitCmd || naturalCmd;
    const itemIssue = baseCmd ? inventoryIssueForCommand(baseCmd, nextInventory) : "";
    const cmd = itemIssue ? { ...baseCmd, blockedReason: baseCmd.blockedReason || itemIssue } : baseCmd;
    let advancePeriodAfterReply = draft?.advancePeriod ?? shouldAdvancePeriod({ messageKind, command: cmd?.command });
    if (cmd && player?.stats) {
      const stamina = Number(player.stats.stamina ?? STAMINA_MAX);
      const cost = adjustedActionCost(cmd.action, scenePeriodId);

      if (cmd.action.rest) {
        // 休息：体力全恢复（时间会随回合自然推进）
        rollLine = [rollLine, `😴 休息 → 体力 ${stamina} → ${STAMINA_MAX}`].filter(Boolean).join("  ·  ");
        actionAnchor = "【行动】玩家休息 / 睡眠，体力完全恢复。请叙述一段休息或入睡的过渡，并自然推进到下一时段。";
        patchProject((p) => {
          const pc = p.playerCharacter || {};
          const next = restClockForProject(p);
          return {
            ...p,
            dayPeriod: next.periodId,
            currentTimeLabel: next.currentTimeLabel,
            beatProgress: next.dayRollover ? 0 : p.beatProgress,
            playerCharacter: { ...pc, stats: { ...(pc.stats || {}), stamina: STAMINA_MAX } },
          };
        });
      } else if (cmd.action.confess) {
        // 告白：好感度 ≥60 才成（恋人门槛）
        const tgt = findCharacter(cmd.target, activeProject?.characters, activeProject?.ocs);
        if (tgt) {
          const fav = player.favor?.[tgt.id] || 0;
          const romanceBlocked = tgt.kind === "oc" && tgt.romanceable === false;
          const ok = !romanceBlocked && fav >= 60;
          rollLine = [rollLine, `💗 向 ${tgt.name} 告白 —— 好感度 ${fav}（${favorStage(fav)}）→ ${ok ? "接受 ❤" : romanceBlocked ? "不进入恋爱线" : "被婉拒"}`].filter(Boolean).join("  ·  ");
          actionAnchor = `【告白结果（旁白必须据此叙事，不得改判）】玩家向 ${tgt.name} 告白，当前好感度 ${fav}。` +
            (romanceBlocked
              ? "该原创角色被设定为不可攻略 / 不进入恋爱线；对方应温和或明确地把关系停留在非恋爱层面。"
              : ok
              ? "已达恋人阈值（≥60），对方接受，二人正式成为恋人。"
              : "未达恋人阈值（<60），对方婉拒或回避，但不必撕破脸。") +
            "请自然演绎这一刻。";
          if (ok) {
            patchProject((p) => {
              const pc = p.playerCharacter || {};
              const state = { ...(pc.state || {}), relationships: { ...(pc.state?.relationships || {}) } };
              const previous = state.relationships[tgt.id] || {};
              const event = {
                date: p.currentTimeLabel || "",
                period: dayPeriod(p.dayPeriod || "morning").label,
                location: p.currentState?.location || "",
                scene: `告白成功，关系正式确认。`,
                note: "告白成功，关系正式确认。",
                delta: 0,
                value: fav,
                stage: "恋人",
                source: "confession",
                createdAt: Date.now(),
              };
              state.relationships[tgt.id] = {
                ...previous,
                status: "恋人",
                feeling: "告白成功，关系正式确认。",
                events: [event, ...(Array.isArray(previous.events) ? previous.events : [])].slice(0, RELATIONSHIP_EVENT_LIMIT),
                interactionCount: Number(previous.interactionCount || 0) + 1,
                lastInteraction: event.scene,
                lastInteractionAt: event.createdAt,
                updatedAt: Date.now(),
              };
              return { ...p, playerCharacter: { ...pc, state } };
            });
          }
        } else {
          rollLine = [rollLine, `💗 告白 —— 未指定对象`].filter(Boolean).join("  ·  ");
          actionAnchor = "【告白】玩家发起告白但未指明对象，请让其先明确心意所向。";
        }
      } else if (cmd.action.exam) {
        // 期末考试：各科课程值 → 等级 O/E/A/P/D/T
        const settlement = settleExam(player, activeProject?.currentTimeLabel);
        const existing = activeProject?.examResults?.[settlement.key] || null;
        const results = existing?.results || settlement.results;
        const hp = Number(existing?.hp ?? settlement.hp);
        rollLine = [rollLine, formatExamLine(results, hp) + (existing ? " · 已结算" : "")].filter(Boolean).join("  ·  ");
        actionAnchor = examAnchor(results, hp, { repeated: !!existing });
        if (!existing) {
          patchProject((p) => {
            const pc = p.playerCharacter || {};
            const stats = { ...(pc.stats || {}) };
            stats.housePoints = Math.max(0, (stats.housePoints || 0) + hp);
            return {
              ...p,
              examResults: { ...(p.examResults || {}), [settlement.key]: { results, hp, settledAt: Date.now() } },
              playerCharacter: { ...pc, stats },
            };
          });
        }
      } else if (cmd.action.ending) {
        // 结局：AI 依终值多元生成，不写死
        rollLine = [rollLine, `🌅 命运的纺线开始编织……`].filter(Boolean).join("  ·  ");
        actionAnchor = "【结局生成（开放 · 多元，禁止套用固定模板）】请依据玩家七年的全部数据——养成数值、各科课程、好感度与关系、学院分、原创角色——" +
          "为 TA 生成一段专属的「十九年后」尾声：职业去向、与重要角色（含 OC）的情感归宿、生活图景。要个性化、贴合其数值与选择，可圆满可有遗憾，不必皆大欢喜。";
      } else if (cmd.blockedReason) {
        rollLine = [rollLine, `⚠️ 条件不合适：${cmd.action.label}`].filter(Boolean).join("  ·  ");
        actionAnchor = `【行动条件不足（旁白必须据此叙事，不得掷骰判成败）】\n` +
          `玩家想尝试：${cmd.action.label}${cmd.target ? `（${cmd.target}）` : ""}\n` +
          `当前地点/时间不适合：${cmd.blockedReason}\n` +
          `请自然叙述 TA 为什么暂时不能这样做，并给出世界内合理的替代方向（例如换到合适地点、等待课程、准备器材、找教授许可），不要扣体力、不要产生数值收益或失败惩罚。`;
        advancePeriodAfterReply = false;
      } else if (stamina < cost) {
        // 体力不足：行动受阻，不掷骰、不结算
        rollLine = [rollLine, `⚠️ 体力不足 ${stamina}/${cost} —— 先休息恢复`].filter(Boolean).join("  ·  ");
        actionAnchor = `【行动受阻】玩家体力不足（当前 ${stamina}，需 ${cost}），无法完成「${cmd.action.label}」。请叙述其疲惫、力不从心、需要休息；本次不成功，不产生任何数值或好感度变化。`;
        advancePeriodAfterReply = false;
      } else {
        const check = runAction(cmd.action, player);
        rollLine = [rollLine, `${cmd.inferred ? "🎲 自动判定 · " : ""}${formatRoll(cmd.action, check)}  ·  体力 -${cost}`].filter(Boolean).join("  ·  ");
        const deduct = (stats) => { stats.stamina = Math.max(0, (stats.stamina ?? STAMINA_MAX) - cost); };

        if (cmd.action.social) {
          const tgt = findCharacter(cmd.target, activeProject?.characters, activeProject?.ocs);
          if (tgt) {
            const dF = favorDelta(check.tier);
            const newFavor = Math.max(0, Math.min(100, (player.favor?.[tgt.id] || 0) + dF));
            rollLine += `  ·  ${tgt.name} 好感度 ${dF >= 0 ? "+" : ""}${dF} → ${newFavor}（${favorStage(newFavor)}）`;
            actionAnchor = checkAnchor(cmd.action, check, tgt.name) + "\n" + socialAnchor(tgt.name, newFavor);
            patchProject((p) => {
              const pc = p.playerCharacter || {};
              const stats = { ...(pc.stats || {}) }; deduct(stats);
              const result = applyRelationshipDeltas(pc, [{
                id: tgt.id,
                name: tgt.name,
                kind: tgt.kind,
                delta: dF,
                note: check.tier,
              }], {
                date: p.currentTimeLabel || "",
                periodLabel: dayPeriod(p.dayPeriod || "morning").label,
                location: p.currentState?.location || "",
                scene: `${cmd.action.label || "社交互动"}：${check.tier}`,
                source: "check",
              });
              return { ...p, playerCharacter: { ...result.player, stats } };
            });
          } else {
            actionAnchor = checkAnchor(cmd.action, check, cmd.target || "（未指定对象）");
            patchProject((p) => { const pc = p.playerCharacter || {}; const stats = { ...(pc.stats || {}) }; deduct(stats); return { ...p, playerCharacter: { ...pc, stats } }; });
          }
        } else {
          actionAnchor = checkAnchor(cmd.action, check, cmd.target);
          const eff = checkEffects(cmd.action, check);
          patchProject((p) => {
            const pc = p.playerCharacter || {};
            const stats = { ...(pc.stats || {}) };
            deduct(stats);
            if (eff.delta) stats[eff.stat] = Math.max(0, Math.min(100, (stats[eff.stat] || 0) + eff.delta));
            if (eff.housePoints) stats.housePoints = Math.max(0, (stats.housePoints || 0) + eff.housePoints);
            // 对应科目的课程值也提升
            let courses = pc.courses;
            if (cmd.action.subject && eff.delta > 0) {
              courses = { ...(pc.courses || {}) };
              courses[cmd.action.subject] = Math.max(0, Math.min(100, (courses[cmd.action.subject] || 8) + eff.delta));
            }
            return { ...p, playerCharacter: { ...pc, stats, courses } };
          });
        }
      }
    }

    const supplementalAnchor = [inventoryAnchor, cupAnchor, growthAnchor, actionAnchor].filter(Boolean).join("\n\n");
    let content;
    if (curAtts.length > 0 && config.apiType === "anthropic") {
      const parts = [];
      for (const a of curAtts) {
        if (a.type === "application/pdf")
          parts.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data } });
        else if (a.type.startsWith("image/"))
          parts.push({ type: "image", source: { type: "base64", media_type: a.mediaType, data: a.data } });
      }
      if (hiddenText) parts.push({ type: "text", text: supplementalAnchor ? `${hiddenText}\n\n${supplementalAnchor}` : hiddenText });
      content = parts;
    } else {
      content = supplementalAnchor ? `${hiddenText}\n\n${supplementalAnchor}` : hiddenText;
    }

    const userMsg = {
      id: uid(),
      role: "user", content,
      display: displayText,
      kind: messageKind,
      mechanicCommand: cmd ? { command: cmd.command, inferred: !!cmd.inferred } : null,
      advancePeriod: advancePeriodAfterReply,
      lifeMeta: {
        inventoryChanges: shoppingChanges,
        growthEntries,
        command: cmd?.command || "",
      },
      roll: rollLine || null, // 检定/状态变化，渲染为独立居中状态条（不进气泡、不发给 AI）
      attachments: curAtts.map((a) => ({ name: a.name })),
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    if (!draft) {
      setInput("");
      setAttachments([]);
      if (taRef.current) taRef.current.style.height = "auto";
    }
    maybeAutoNameChat(activeSessionId, displayText || text);

    await generateAssistantReply(newMsgs, hiddenText || text, activeSessionId);
  };

  const copyMessage = async (message) => {
    const text = messageText(message);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("已复制 ✓");
    } catch {
      setStatus("复制失败");
    }
    setTimeout(() => setStatus(""), 1800);
  };

  const clearSummaryIfAffected = (messageIndex) => {
    const until = Number(activeSessionObj?.summaryUntil || 0);
    if (!activeSessionId || !until || messageIndex >= until) return;
    patchSession((s) => ({ ...s, summary: "", summaryUntil: 0 }));
  };

  const deleteMessage = (messageId) => {
    const index = messages.findIndex((message, i) => (message.id || `idx-${i}`) === messageId);
    if (index >= 0) clearSummaryIfAffected(index);
    setMessages((prev) => prev.filter((message, index) => (message.id || `idx-${index}`) !== messageId));
    if (editingMsgId === messageId) {
      setEditingMsgId(null);
      setEditDraft("");
    }
  };

  const regenerateFrom = async (messageId) => {
    if (loading || !activeSessionId) return;
    if (!config.apiKey) {
      setStatus("⚠ 请先填写 API Key");
      setTimeout(() => setStatus(""), 3000);
      return;
    }
    const index = messages.findIndex((message, i) => (message.id || `idx-${i}`) === messageId);
    if (index < 0) return;

    const target = messages[index];
    const userIndex = target.role === "user"
      ? index
      : messages.slice(0, index).map((message, i) => ({ message, i })).reverse().find(({ message }) => message.role === "user")?.i;

    if (userIndex === undefined || userIndex < 0) {
      setStatus("没有可重新生成的用户消息");
      setTimeout(() => setStatus(""), 2200);
      return;
    }

    if (index < messages.length - 1 && !window.confirm("重新生成会删除这条消息之后的后续对话，继续吗？")) return;

    clearSummaryIfAffected(userIndex);
    const baseMessages = messages.slice(0, userIndex + 1).map((message) => ({ ...message, streaming: false }));
    setMessages(baseMessages);
    const regenPrompt = typeof baseMessages[userIndex].content === "string"
      ? baseMessages[userIndex].content
      : messageText(baseMessages[userIndex]);
    await generateAssistantReply(baseMessages, regenPrompt, activeSessionId);
  };

  const startEditMessage = (message, messageId) => {
    if (message.role !== "user" || message.streaming) return;
    setEditingMsgId(messageId);
    setEditDraft(messageText(message));
  };

  const saveEditedMessage = async (messageId) => {
    if (loading || !activeSessionId) return;
    if (!config.apiKey) {
      setStatus("⚠ 请先填写 API Key");
      setTimeout(() => setStatus(""), 3000);
      return;
    }
    const index = messages.findIndex((message, i) => (message.id || `idx-${i}`) === messageId);
    if (index < 0) return;

    const text = editDraft.trim();
    if (!text && !messages[index].attachments?.length) return;
    clearSummaryIfAffected(index);

    const edited = {
      ...messages[index],
      id: messages[index].id || messageId,
      display: text,
      content: updateUserMessageContent(messages[index], text),
      editedAt: Date.now(),
      streaming: false,
    };
    const baseMessages = [...messages.slice(0, index), edited];
    setEditingMsgId(null);
    setEditDraft("");
    setMessages(baseMessages);
    await generateAssistantReply(baseMessages, text, activeSessionId);
  };

  // ── Sidebar tabs ──
  const scopeLabel = activeMode === "world" ? "世界聊天" : activeChar.name;
  const allTabs = [
    { key: "project",  icon: <I.Folder />,   label: "项目" },
    { key: "settings", icon: <I.Settings />, label: "配置" },
    { key: "sessions", icon: <I.Chat />,     label: `对话${currentChatList.length > 0 ? ` · ${currentChatList.length}` : ""}` },
    { key: "chars",    icon: <I.User />,      label: `角色${projectChars.length > 0 ? ` · ${projectChars.length}` : ""}` },
    { key: "state",    icon: <span style={{ fontSize: 13 }}>📍</span>, label: "剧情状态" },
    { key: "files",    icon: <I.Folder />,    label: `文件${projectFiles.length > 0 ? ` · ${projectFiles.filter((f) => f.enabled).length}/${projectFiles.length}` : ""}` },
    { key: "world",    icon: <I.Book />,      label: `世界书${worldBook.filter((e) => e.enabled).length > 0 ? ` · ${worldBook.filter((e) => e.enabled).length}` : ""}` },
    { key: "memory",   icon: <I.Brain />,     label: `记忆${worldMemory.length + storyMemory.length > 0 ? ` · ${worldMemory.length + storyMemory.length}` : ""}` },
    { key: "pending",  icon: <I.Inbox />,     label: `建议${pendingUpdates.length > 0 ? ` · ${pendingUpdates.length}` : ""}` },
  ];
  // 成品模式：只保留「配置」（API Key）。其余世界数据面板全部隐藏（内置存储，不可视化）。
  const tabs = HP_KIOSK ? allTabs.filter((t) => t.key === "settings") : allTabs;
  const headerTabs = HP_KIOSK ? [] : tabs.filter((t) => ["sessions", "chars", "state"].includes(t.key));

  const triggered = matchWorld(worldBook, input);

  // ── Loading / migration screen ──
  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", color: T.textDim, background: T.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
          <div>加载中…</div>
        </div>
      </div>
    );
  }

  // ── HP 专项：角色创建向导（优先于首页/工作区）──
  if (creatingPresetId) {
    return (
      <CharacterCreator
        generation={GENERATIONS.find((g) => g.presetId === creatingPresetId)}
        onComplete={finishCreation}
        onCancel={() => setCreatingPresetId(null)}
      />
    );
  }

  // ── HP 专项：三世代首页（在任何工作区之前）──
  if (hpHome) {
    return <GenerationSelect generations={GENERATIONS} onPick={enterGeneration} />;
  }

  if (!activeProject) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", color: T.textDim, background: T.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
          <div>加载中…</div>
        </div>
      </div>
    );
  }

  // ── HP 专项：不暴露通用「项目列表」。任何「返回」都回到三世代首页。 ──
  if (view === "projects") {
    return <GenerationSelect generations={GENERATIONS} onPick={enterGeneration} />;
  }

  // ── Render: workspace ──
  const sidebarStyle = isMobile
    ? {
        position: "fixed", top: 10, left: 10, bottom: 10, zIndex: 50,
        width: "86vw", maxWidth: 330, height: "auto",
        transform: panel ? "translateX(0)" : "translateX(calc(-100% - 28px))",
        transition: "transform 0.25s ease",
        border: `1px solid ${V.line}`, borderRadius: 18, background: V.frame,
        boxShadow: panel ? "0 24px 70px rgba(0,0,0,0.58), inset 0 0 0 1px rgba(255,250,226,0.05)" : "none",
        display: "flex", flexDirection: "column",
        pointerEvents: panel ? "auto" : "none",
      }
    : {
        width: panel ? 330 : 0, minWidth: panel ? 330 : 0,
        overflow: "hidden", border: panel ? `1px solid ${V.line}` : "none", borderRadius: panel ? 20 : 0, background: V.frame,
        transition: "width 0.22s ease, min-width 0.22s ease",
        display: "flex", flexDirection: "column",
        boxShadow: panel ? "0 30px 90px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,250,226,0.05)" : "none",
      };
  const hpSheetChrome = {
    width: "min(92vw, 560px)",
    maxHeight: "78vh",
    overflow: "auto",
    border: `1px solid ${hpUi.inputBorder}`,
    borderRadius: hpIsNight ? 18 : 12,
    background: hpIsNight
      ? "linear-gradient(180deg, rgba(20,20,28,0.98), rgba(10,11,16,0.99))"
      : "linear-gradient(180deg, rgba(255,255,250,0.97), rgba(231,219,199,0.96))",
    boxShadow: hpIsNight
      ? "0 28px 80px rgba(0,0,0,0.58), inset 0 0 0 4px rgba(217,195,139,0.035)"
      : "0 28px 80px rgba(93,76,54,0.24), inset 0 0 0 4px rgba(255,255,250,0.42)",
    color: hpUi.cardText,
  };
  const renderHpSheetContent = () => {
    if (!hpSheet) return null;
    if (hpSheet === "settings") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SettingsPanel config={config} onSave={(c) => { setConfig(c); setStatus("配置已保存 ✓"); setTimeout(() => setStatus(""), 2000); setHpSheet(null); }} />
        <div style={{ padding: "4px 20px 22px", borderTop: `1px solid ${hpUi.line}` }}>
          <div style={{ fontSize: 11.5, color: hpUi.chromeMuted, margin: "12px 0 8px" }}>危险操作</div>
          <button
            onClick={restartGame}
            style={{ width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${V.danger}`, background: V.dangerBg, color: V.danger, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            ↻ 重新开始游戏
          </button>
          <div style={{ fontSize: 10.5, color: hpUi.chromeMuted, marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
            将清除当前世代存档（角色、进度、关系、原创角色），回到角色创建。
          </div>
        </div>
      </div>
    );
    if (hpSheet === "people") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CharacterPanel
            characters={projectChars} activeId={activeCharId} activeMode={activeMode}
            player={player} onEditPlayer={handlePlayerEdit}
            onSelect={handleCharSelect} onEdit={handleCharEdit} onDelete={handleCharDelete}
            onImportChars={handleImportChars}
            profileOnly={HP_KIOSK}
          />
          <StatusBar player={player} variant="sheet" section="people" uiMode={hpTone} favorList={favorList} houseCup={houseCup}
            ocs={activeProject?.ocs || []} clues={clues} onAddOc={() => { setHpSheet(null); setOcCreatorOpen(true); }} onRemoveOc={removeOc} />
        </div>
      );
    }
    return (
      <StatusBar player={player} variant="sheet" section={hpSheet} uiMode={hpTone} favorList={favorList} houseCup={houseCup}
        ocs={activeProject?.ocs || []} clues={clues} onAddOc={() => { setHpSheet(null); setOcCreatorOpen(true); }} onRemoveOc={removeOc} />
    );
  };

  return (
    <div style={{ display: "flex", justifyContent: HP_KIOSK ? "center" : undefined, gap: isMobile ? 0 : 14, height: "100dvh", width: "100%", overflow: "hidden", background: HP_KIOSK ? hpUi.bg : V.bg, color: HP_KIOSK ? hpUi.chromeText : V.ink, position: "relative", padding: HP_KIOSK ? (isMobile ? 0 : 10) : (isMobile ? 0 : 16) }}>

      {/* HP 专项：夜间星尘 / 日间纸纹花饰 */}
      {HP_KIOSK && hpIsNight && <Starfield count={70} tone={hpTone} />}

      {/* Mobile drawer backdrop */}
      {isMobile && panel && (
        <div onClick={() => setPanel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40 }} />
      )}

      {/* ════ Sidebar ════ */}
      <div style={sidebarStyle}>
        {/* Back to project list（成品模式隐藏：玩家从聊天头部的返回按钮回到世代选择）*/}
        {!HP_KIOSK && (
        <div style={{ padding: "12px 14px 0", flexShrink: 0 }}>
          <button
            onClick={() => { setHpHome(true); setPanel(null); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1px solid ${V.lineSoft}`, borderRadius: 999, background: V.softControl, color: V.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%", boxShadow: "inset 0 0 18px rgba(255,250,226,0.04)" }}
          >
            <I.Back /><Avatar value={activeProject.icon} fallback="📁" size={20} radius={7} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: V.ink }}>{activeProject.name}</span>
          </button>
        </div>
        )}
        {/* Tab bar */}
        <div style={{ padding: "10px 14px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 5, background: V.softControl, border: `1px solid ${V.lineSoft}`, borderRadius: 16, padding: 4, flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setPanel(t.key)} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 999, border: "1px solid", borderColor: panel === t.key ? V.line : "transparent", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                background: panel === t.key ? V.accentSoft : "transparent",
                color: panel === t.key ? V.ink : V.muted,
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          <button onClick={() => setPanel(null)} style={{ width: 30, height: 30, display: "grid", placeItems: "center", background: V.softControl, border: `1px solid ${V.lineSoft}`, borderRadius: 12, cursor: "pointer", color: V.faint, padding: 0, marginLeft: 8 }}>
            <I.Close />
          </button>
        </div>

        {/* Sidebar body */}
        <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
          {panel === "project" && (
            <ProjectSettingsPanel
              project={activeProject}
              onSave={saveProjectSettings}
              onDelete={() => deleteProject(activeProjectId)}
              canDelete={projectArr.length > 1}
            />
          )}
          {panel === "settings" && (
            <SettingsPanel config={config} onSave={(c) => {
              setConfig(c);
              setStatus("配置已保存 ✓");
              setTimeout(() => setStatus(""), 2000);
              setPanel(null);
            }} />
          )}
          {panel === "sessions" && (
            <SessionPanel
              mode={activeMode}
              scopeLabel={scopeLabel}
              sessions={currentChatList}
              activeId={activeSessionId}
              onSelect={selectChat}
              onNew={newChat}
              onRename={renameChat}
              onDelete={deleteChat}
              onSwitchWorld={switchToWorld}
              onSaveSummary={saveChatSummary}
              onClearSummary={clearChatSummary}
              onSummarizeNow={summarizeChatNow}
              summaryBusy={loading}
            />
          )}
          {panel === "chars" && (
            <CharacterPanel
              characters={projectChars} activeId={activeCharId} activeMode={activeMode}
              player={player} onEditPlayer={handlePlayerEdit}
              onSelect={handleCharSelect} onEdit={handleCharEdit} onDelete={handleCharDelete}
              onImportChars={handleImportChars}
              profileOnly={HP_KIOSK}
            />
          )}
          {panel === "state" && (
            <CurrentStatePanel currentState={activeProject.currentState} onSave={saveCurrentState} />
          )}
          {panel === "files" && (
            <ProjectFilesPanel files={projectFiles} setFiles={setProjectFiles} />
          )}
          {panel === "world" && (
            <WorldBookPanel entries={worldBook} setEntries={setWorldBook} config={config} />
          )}
          {panel === "memory" && (
            <MemoryPanel
              worldMemory={worldMemory}
              storyMemory={storyMemory}
              onAdd={(layer, text) => {
                if (layer === "world") setWorldMemory((p) => [...p, createFact(text)]);
                else setStoryMemory((p) => [...p, createStoryEvent({ content: text })]);
              }}
              onDelete={(layer, i) => {
                const setter = layer === "world" ? setWorldMemory : setStoryMemory;
                setter((p) => p.filter((_, j) => j !== i));
              }}
              onClear={(layer) => (layer === "world" ? setWorldMemory([]) : setStoryMemory([]))}
            />
          )}
          {panel === "pending" && (
            <PendingUpdatesPanel
              updates={pendingUpdates}
              nameMap={idNameMap}
              chatNameMap={chatNameMap}
              onAccept={acceptUpdate}
              onReject={rejectUpdate}
              onRejectAll={rejectAllUpdates}
              onAcceptHigh={acceptHighConfidence}
            />
          )}
        </div>
      </div>

      {/* HP 专项：顶部徽章打开的纸质面板 */}
      {HP_KIOSK && hpSheet && player?.stats && (
        <div onClick={() => setHpSheet(null)} style={{ position: "fixed", inset: 0, zIndex: 70, background: hpIsNight ? "rgba(0,0,0,0.62)" : "rgba(75,60,42,0.22)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? "18px 10px" : 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={hpSheetChrome}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${hpUi.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${hpUi.line}`, display: "grid", placeItems: "center", color: hpUi.calendarGold, fontFamily: V.serif, fontWeight: 900, background: hpUi.controlBg }}>
                  {hpBadges.find((badge) => badge.key === hpSheet)?.mark || "H"}
                </span>
                <span style={{ fontFamily: V.serif, color: hpUi.chromeText, fontSize: 15, fontWeight: 900 }}>{hpSheetTitle}</span>
              </div>
              <button onClick={() => setHpSheet(null)} aria-label="关闭" style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${hpUi.line}`, background: "transparent", color: hpUi.chromeMuted, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: hpSheet === "settings" || hpSheet === "people" ? 16 : 0 }}>
              {renderHpSheetContent()}
            </div>
          </div>
        </div>
      )}

      {/* 原创角色创建（全屏覆盖）*/}
      {HP_KIOSK && ocCreatorOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, overflow: "auto" }}>
          <OcCreator
            canonNames={(activePreset?.characters || []).map((c) => c.name)}
            onSave={addOc}
            onCancel={() => setOcCreatorOpen(false)}
          />
        </div>
      )}

      {/* ════ Chat area ════ */}
      <div style={{
        flex: HP_KIOSK ? "0 1 674px" : 1,
        width: HP_KIOSK ? "100%" : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0,
        position: "relative",
        zIndex: 1,
        border: HP_KIOSK ? (hpIsNight ? `1.4px solid ${hpUi.inputBorder}` : "none") : (isMobile ? "none" : `1px solid ${V.line}`),
        borderRadius: HP_KIOSK ? (isMobile ? 0 : 12) : (isMobile ? 0 : 20),
        background: HP_KIOSK
          ? (hpIsNight ? "rgba(8,9,14,0.50)" : "linear-gradient(180deg, #efe8d8, #e7decb)")
          : V.frame,
        boxShadow: HP_KIOSK
          ? (hpIsNight ? "0 28px 90px rgba(0,0,0,0.50), inset 0 0 0 3px rgba(217,195,139,0.04)" : "0 18px 48px rgba(93,76,54,0.18)")
          : (isMobile ? "none" : "0 30px 90px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,250,226,0.05)"),
      }}>
        {/* Header */}
        {HP_KIOSK ? (
          <div style={{
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
            borderBottom: hpIsNight ? `1px solid ${hpUi.line}` : "none",
            background: hpIsNight ? hpUi.chromeBg : "linear-gradient(180deg, rgba(247,244,232,0.42), rgba(236,228,208,0.06))",
            backdropFilter: hpIsNight ? "blur(8px)" : "blur(2px)",
            boxShadow: hpIsNight ? "0 10px 30px rgba(0,0,0,0.24)" : "none",
            padding: isMobile ? "5px 8px 10px" : "7px 18px 14px",
          }}>
            <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 5 : 8 }}>
              <div style={{ width: "100%", display: "grid", gridTemplateColumns: "30px 1fr 30px", alignItems: "center", gap: 8, padding: isMobile ? "0 2px" : "0 4px" }}>
                <button
                  onClick={() => { setHpHome(true); setPanel(null); setHpSheet(null); }}
                  title="返回"
                  style={{ width: 28, height: 28, border: "none", borderRadius: 0, background: "transparent", color: hpUi.calendarGold, cursor: "pointer", display: "grid", placeItems: "center", opacity: 0.72 }}
                >
                  <I.Back />
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: isMobile ? 3 : 8, minWidth: 0 }}>
                  {hpBadges.map((badge) => {
                    const active = hpSheet === badge.key;
                    return (
                      <button
                        key={badge.key}
                        onClick={() => setHpSheet((cur) => (cur === badge.key ? null : badge.key))}
                        title={badge.label}
                        aria-label={badge.label}
                        style={{
                          width: isMobile ? 30 : 40,
                          height: isMobile ? 30 : 40,
                          borderRadius: 0,
                          border: "none",
                          background: "transparent",
                          color: active ? hpUi.chromeText : hpUi.calendarGold,
                          filter: active ? "drop-shadow(0 3px 5px rgba(95,76,54,0.22))" : "none",
                          cursor: "pointer",
                          padding: 0,
                          fontFamily: V.serif,
                          fontWeight: 900,
                          fontSize: isMobile ? 11 : 13,
                        }}
                      >
                        <svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true">
                          <path d="M8 6h28l3 5-2 22-15 7L7 33 5 11 8 6Z" fill={active ? (hpIsNight ? "rgba(217,195,139,0.16)" : "rgba(232,226,210,0.92)") : (hpIsNight ? "rgba(217,195,139,0.08)" : "rgba(247,244,232,0.86)")} stroke="currentColor" strokeWidth="1.35" />
                          <path d="M12 11h20l2 4-1.6 15.5L22 35.5 11.6 30.5 10 15l2-4Z" fill="none" stroke="currentColor" strokeWidth="0.65" opacity="0.55" />
                          <path d={badge.glyph} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.78" />
                          <circle cx="22" cy="9.5" r="1.2" fill="currentColor" opacity="0.5" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setHpUiMode((mode) => (mode === "night" ? "day" : "night"))}
                  title="切换日夜界面"
                  style={{ width: 28, height: 28, border: "none", borderRadius: 0, background: "transparent", color: hpUi.chromeMuted, cursor: "pointer", fontFamily: V.serif, fontWeight: 900, opacity: 0.72 }}
                >
                  {hpIsNight ? "夜" : "日"}
                </button>
              </div>

              {/* 徽章与标题之间的阴影分隔线（对应背景图顶部的横线） */}
              {!hpIsNight && (
                <div aria-hidden="true" style={{ width: "100%", height: 0, borderTop: "1px solid rgba(120,107,86,0.42)", boxShadow: "0 1px 0 rgba(255,255,255,0.55)", margin: isMobile ? "1px 0 2px" : "2px 0 3px" }} />
              )}

              <FoilTitle tone={hpTone} mobile={isMobile}>Harry Potter</FoilTitle>

              <div title={currentCanonBeat ? `${currentCanonBeat.part}｜原著：${currentCanonBeat.event}` : "当前时间"} style={{ display: "grid", gridTemplateColumns: "minmax(24px, 1fr) auto minmax(24px, 1fr)", alignItems: "center", gap: isMobile ? 7 : 12, width: "min(100%, 520px)", color: hpUi.chromeText }}>
                <span style={{ height: 1, background: `linear-gradient(90deg, transparent, ${hpUi.line})` }} />
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ color: hpUi.calendarGold, display: "flex", opacity: 0.8 }}><I.Calendar /></span>
                  <span style={{ fontFamily: V.serif, fontSize: isMobile ? 13 : 15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeProject.currentTimeLabel || "未设定时间"}</span>
                  {currentCanonBeat && phaseName(currentCanonBeat) && <span style={{ color: hpUi.chromeMuted, fontSize: isMobile ? 10 : 11, fontWeight: 700, whiteSpace: "nowrap" }}>{phaseName(currentCanonBeat)}</span>}
                </span>
                <span style={{ height: 1, background: `linear-gradient(90deg, ${hpUi.line}, transparent)` }} />
              </div>

            </div>
          </div>
        ) : (
        <div style={{ height: isMobile ? 56 : 60, borderBottom: `1px solid ${V.lineSoft}`, background: V.headerBar, display: "flex", alignItems: "center", padding: "0 14px", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
            <button
              onClick={() => { setHpHome(true); setPanel(null); }}
              title="项目列表"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, border: `1px solid ${V.lineSoft}`, borderRadius: 13, background: V.softControl, color: V.gold, cursor: "pointer", flexShrink: 0 }}
            >
              <I.Back />
            </button>
            {isMobile ? (
              <button
                onClick={() => setPanel((p) => (p ? null : "sessions"))}
                title="菜单"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, border: `1px solid ${V.lineSoft}`, borderRadius: 13, background: V.softControl, color: V.gold, cursor: "pointer", flexShrink: 0 }}
              >
                <I.Menu />
              </button>
            ) : (
              headerTabs.map((t) => (
                <button key={t.key} onClick={() => setPanel((p) => (p === t.key ? null : t.key))} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
                  border: "1px solid", borderColor: panel === t.key ? V.line : V.lineSoft,
                  borderRadius: 999,
                  background: panel === t.key ? V.accentSoft : V.softControl,
                  color: panel === t.key ? V.ink : V.muted,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {t.icon}{t.label}
                </button>
              ))
            )}
          </div>
          <div style={{ flex: "0 1 auto", display: "flex", alignItems: "center", gap: 6, justifyContent: "center", minWidth: isMobile ? 0 : 220, maxWidth: isMobile ? "none" : 420, overflow: "hidden", padding: "0 8px" }}>
              {!isMobile && (
                <>
                  <Avatar value={activeProject.icon} fallback="📁" size={22} radius={7} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: V.ink, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{activeProject.name}</span>
                  <span style={{ color: V.faint, fontSize: 13 }}>·</span>
                </>
              )}
              {activeMode === "world" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ color: V.gold, fontSize: 15 }}>✦</span><span style={{ fontFamily: V.serif, fontSize: isMobile ? 17 : 21, fontWeight: 800, fontStyle: "italic", color: V.gold }}>World</span>
                </span>
              ) : (
                <>
                  <Avatar value={activeChar.avatar} fallback="🧙" size={24} radius={8} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: V.serif, fontSize: isMobile ? 16 : 20, fontWeight: 800, fontStyle: "italic", color: V.gold, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 110 : "none" }}>{activeChar.name}</span>
                </>
              )}
            </div>

          <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, overflow: "hidden" }}>
              <>
                {!isMobile && (
                  <span title={currentCanonBeat ? `${currentCanonBeat.part}｜原著：${currentCanonBeat.event}` : "当前时间"}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", border: `1px solid ${V.lineSoft}`, borderRadius: 999, background: V.softControl, color: V.muted, fontSize: 11, fontWeight: 600, flexShrink: 0, maxWidth: 240 }}>
                    📅 <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeProject.currentTimeLabel || "未设定时间"}</span>
                  </span>
                )}
                {status && !isMobile && <span style={{ fontSize: 11, color: V.muted, flexShrink: 0 }}>{status}</span>}
                <button onClick={toggleTheme} title="切换主题"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: isMobile ? 34 : "auto", height: isMobile ? 34 : "auto", padding: isMobile ? 0 : "5px 10px", border: isMobile ? "none" : `1px solid ${V.lineSoft}`, borderRadius: isMobile ? 12 : 999, background: isMobile ? "transparent" : V.softControl, color: isMobile ? V.ink : V.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  {themeMode === "dark" ? "☀️" : "🌙"}
                </button>
                <button onClick={newChat} title="新建对话"
                  style={{ display: "flex", alignItems: "center", gap: 3, padding: isMobile ? 0 : "5px 10px", width: isMobile ? 34 : "auto", height: isMobile ? 34 : "auto", justifyContent: "center", border: isMobile ? "none" : `1px solid ${V.lineSoft}`, borderRadius: isMobile ? 12 : 999, background: isMobile ? "transparent" : V.softControl, color: isMobile ? V.ink : V.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  <I.Plus />{!isMobile && "对话"}
                </button>
              </>
          </div>
        </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", position: "relative", zIndex: 1, background: HP_KIOSK ? hpUi.stageBg : V.chatBackdrop }}>
          <div style={{ maxWidth: HP_KIOSK ? 650 : 900, width: "100%", margin: "0 auto", padding: HP_KIOSK ? (isMobile ? "18px 14px 22px" : "26px 20px 32px") : (isMobile ? "20px 10px 24px" : "34px 26px 38px") }}>
          {messages.length === 0 && HP_KIOSK && (
            <div style={{ textAlign: "center", margin: "30vh auto 0", maxWidth: 300, color: hpUi.emptyText, fontSize: 14, lineHeight: 1.7 }}>
              {config.apiKey ? "在下方描述你的行动，开启 1991 学年。" : "先在右上角配置 API Key。"}
            </div>
          )}
          {messages.length === 0 && !HP_KIOSK && (
            <div style={{ textAlign: "center", margin: "16vh auto 0", color: V.muted, maxWidth: 360, padding: "24px 18px", border: `1px solid ${V.lineSoft}`, borderRadius: 24, background: V.emptyPanel }}>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {config.apiKey ? (activeMode === "world" ? "以旁白视角推进这个世界" : `与 ${activeChar.name} 单独对话`) : "先在「配置」中填写 API Key"}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const msgId = m.id || `idx-${i}`;
            const displayText = m.display || m.content;
            const isEditing = editingMsgId === msgId;
            if (m.kind === "calendarChoice") {
              return (
                <Fragment key={msgId}>
                  <div style={{ display: "flex", justifyContent: "center", margin: isMobile ? "0 0 18px" : "0 0 22px", animation: "fadeUp 0.18s ease" }}>
                    <div style={{
                      maxWidth: "86%",
                      padding: "6px 13px",
                      borderRadius: 999,
                      background: hpUi.noteBg,
                      border: `1px solid ${hpUi.noteBorder}`,
                      color: hpUi.noteText,
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "center",
                      letterSpacing: 0.2,
                    }}>
                      校历安排 · {typeof displayText === "string" ? displayText : "继续日常"}
                    </div>
                  </div>
                  {m.roll && (
                    <div style={{ display: "flex", justifyContent: "center", margin: isMobile ? "0 0 22px" : "0 0 28px" }}>
                      <div style={{ maxWidth: "86%", padding: "7px 16px", borderRadius: 999, background: hpUi.noteBg, border: `1px solid ${hpUi.noteBorder}`, color: hpUi.noteText, fontSize: 12, fontWeight: 600, textAlign: "center", letterSpacing: 0.3 }}>
                        {m.roll}
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            }
            const actionButton = (disabled = false) => ({
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${HP_KIOSK ? hpUi.line : "rgba(92,73,42,0.18)"}`,
              borderRadius: "50%",
              background: HP_KIOSK ? hpUi.actionBg : "rgba(255,250,226,0.16)",
              color: disabled ? (HP_KIOSK ? hpUi.chromeMuted : "rgba(97,75,47,0.3)") : (HP_KIOSK ? hpUi.actionText : "rgba(97,75,47,0.72)"),
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: "inherit",
              padding: 0,
            });
            const editButton = (disabled = false) => ({
              border: `1px solid ${V.lineSoft}`,
              borderRadius: 999,
              background: V.softControl,
              color: disabled ? V.faint : V.muted,
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
              padding: "4px 9px",
            });
            if (HP_KIOSK) {
              const frameInk = isUser ? hpUi.cardInkUser : hpUi.cardInkNarrator;
              const label = isUser ? "你" : "旁白";
              return (
                <Fragment key={msgId}>
                  <article
                    style={{
                      width: "100%",
                      maxWidth: isUser ? 590 : 620,
                      margin: isMobile ? "0 auto 18px" : "0 auto 24px",
                      animation: "fadeUp 0.18s ease",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        boxSizing: "border-box",
                        padding: isMobile ? "34px 26px 28px" : "42px 34px 34px",
                        border: hpIsNight ? `1.2px solid ${frameInk}` : `1px solid ${hpUi.inputBorder}`,
                        borderRadius: hpIsNight ? (isMobile ? 12 : 14) : 8,
                        background: hpUi.cardBg,
                        color: hpUi.cardText,
                        boxShadow: hpUi.cardShadow,
                        overflow: "hidden",
                      }}
                    >
                      {!hpIsNight && (
                        <>
                          <span style={{ position: "absolute", inset: 8, border: `1px solid ${hpUi.line}`, borderRadius: 5, pointerEvents: "none" }} />
                          <span style={{ position: "absolute", inset: "15px 18px", border: `1px solid rgba(142,128,100,0.18)`, borderRadius: 3, pointerEvents: "none" }} />
                          <span style={{ position: "absolute", top: 24, left: 46, right: 46, height: 1, background: `linear-gradient(90deg, transparent, ${frameInk}, transparent)`, opacity: 0.22 }} />
                          <span style={{ position: "absolute", bottom: 24, left: 46, right: 46, height: 1, background: `linear-gradient(90deg, transparent, ${frameInk}, transparent)`, opacity: 0.18 }} />
                        </>
                      )}
                      <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginBottom: isMobile ? 24 : 30 }}>
                          <span style={{ height: 1, background: `linear-gradient(90deg, transparent, ${frameInk})`, opacity: hpIsNight ? 0.62 : 0.42 }} />
                          <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: V.serif, color: frameInk, fontSize: isMobile ? 16 : 18, fontWeight: 700, letterSpacing: 6 }}>
                            <span style={{ fontSize: 10, letterSpacing: 0 }}>◆</span>{label}<span style={{ fontSize: 10, letterSpacing: 0 }}>◆</span>
                          </span>
                          <span style={{ height: 1, background: `linear-gradient(90deg, ${frameInk}, transparent)`, opacity: hpIsNight ? 0.28 : 0.42 }} />
                        </div>
                        {m.attachments?.length > 0 && (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                            {m.attachments.map((a, j) => (
                              <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: `1px solid ${hpUi.line}`, borderRadius: 999, padding: "1px 7px", fontSize: 11, color: hpUi.cardText, background: hpUi.actionBg }}>
                                附件：{a.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {isEditing ? (
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={Math.min(8, Math.max(3, editDraft.split("\n").length))}
                            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${hpUi.line}`, borderRadius: 10, background: hpUi.inputPaper, color: hpUi.inputInk, fontSize: 14, fontFamily: "inherit", lineHeight: 1.65, padding: "9px 11px", resize: "vertical", outline: "none" }}
                          />
                        ) : (
                          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: isMobile ? 17 : 18, lineHeight: isMobile ? 1.95 : 2.05, fontFamily: V.serif, fontWeight: 500 }}>
                            {typeof displayText === "string" ? displayText : typeof m.content === "string" ? m.content : "[多模态消息]"}
                            {m.streaming && <span style={{ opacity: 0.55, animation: "blink 1s infinite" }}>▋</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "center" }}>
                        <button onClick={() => saveEditedMessage(msgId)} disabled={loading} style={editButton(loading)}>保存并重生成</button>
                        <button onClick={() => { setEditingMsgId(null); setEditDraft(""); }} style={editButton()}>取消</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 5, marginTop: 7, justifyContent: "center", opacity: hpIsNight ? 0.62 : 0.46 }}>
                        <button title="Regenerate" onClick={() => regenerateFrom(msgId)} disabled={loading || m.streaming} style={actionButton(loading || m.streaming)}>↻</button>
                        <button title="Copy" onClick={() => copyMessage(m)} disabled={m.streaming} style={actionButton(m.streaming)}>⧉</button>
                        <button title="Edit" onClick={() => startEditMessage(m, msgId)} disabled={loading || m.streaming || !isUser} style={actionButton(loading || m.streaming || !isUser)}>✎</button>
                        <button title="Delete" onClick={() => deleteMessage(msgId)} disabled={m.streaming} style={actionButton(m.streaming)}>⌫</button>
                      </div>
                    )}
                  </article>
                  {m.roll && (
                    <div style={{ display: "flex", justifyContent: "center", margin: isMobile ? "0 0 22px" : "0 0 28px" }}>
                      <div style={{ maxWidth: "86%", padding: "7px 16px", borderRadius: 999, background: hpUi.noteBg, border: `1px solid ${hpUi.noteBorder}`, color: hpUi.noteText, fontSize: 12, fontWeight: 600, textAlign: "center", letterSpacing: 0.3 }}>
                        {m.roll}
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            }
            return (
              <Fragment key={msgId}>
              <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-start", gap: isMobile ? 8 : 12, marginBottom: m.roll ? 10 : (isMobile ? 22 : 28), animation: "fadeUp 0.18s ease" }}>
                {!isUser && (
                  <div style={{ width: isMobile ? 34 : 44, height: isMobile ? 34 : 44, borderRadius: 14, border: `1px solid ${V.line}`, background: V.softControl, color: V.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, marginTop: 2, fontFamily: V.serif, fontWeight: 900, boxShadow: "inset 0 0 18px rgba(0,0,0,0.3)" }}>
                    {activeMode === "world" ? "✦" : (
                      <Avatar value={activeChar.avatar} fallback="🧙" size={isMobile ? 32 : 42} radius={14} />
                    )}
                  </div>
                )}
                <div style={{ maxWidth: isMobile ? "82%" : isUser ? "min(640px, 76%)" : "76%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{
                    width: "100%",
                    boxSizing: "border-box",
                    position: "relative",
                    background: HP_KIOSK
                      ? (isUser ? "linear-gradient(160deg, rgba(48,40,23,0.92), rgba(26,22,14,0.94))" : "rgba(17,19,27,0.85)")
                      : (isUser ? V.userPaper : V.paper),
                    color: HP_KIOSK ? "#ece2c8" : V.paperText,
                    borderRadius: isUser ? "18px 18px 8px 18px" : "18px 18px 18px 8px",
                    padding: "14px 15px", fontSize: 14, lineHeight: 1.75,
                    border: HP_KIOSK ? "1px solid rgba(232,199,102,0.16)" : `1px solid ${V.line}`,
                    borderLeft: HP_KIOSK
                      ? (isUser ? "3px solid rgba(232,199,102,0.5)" : "3px solid rgba(163,30,34,0.75)")
                      : `4px solid ${isUser ? V.goldDim : V.red}`,
                    boxShadow: HP_KIOSK ? "0 10px 26px rgba(0,0,0,0.4)" : "0 12px 28px rgba(0,0,0,0.24)",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {m.attachments?.map((a, j) => (
                      <div key={j} style={{ display: "inline-block", background: "rgba(255,250,226,0.42)", borderRadius: 999, padding: "1px 7px", fontSize: 11, marginBottom: 5, marginRight: 3 }}>
                        📎 {a.name}
                      </div>
                    ))}
                    {isEditing ? (
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={Math.min(8, Math.max(3, editDraft.split("\n").length))}
                        style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(92,73,42,0.28)", borderRadius: 14, background: "rgba(255,250,226,0.38)", color: V.paperText, fontSize: 14, fontFamily: "inherit", lineHeight: 1.55, padding: "9px 11px", resize: "vertical", outline: "none" }}
                      />
                    ) : (
                      <>
                        {typeof displayText === "string" ? displayText : typeof m.content === "string" ? m.content : "[多模态消息]"}
                        {m.streaming && <span style={{ opacity: 0.5, animation: "blink 1s infinite" }}>▋</span>}
                      </>
                    )}
                  </div>

                  {isEditing ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                      <button onClick={() => saveEditedMessage(msgId)} disabled={loading} style={editButton(loading)}>保存并重生成</button>
                      <button onClick={() => { setEditingMsgId(null); setEditDraft(""); }} style={editButton()}>取消</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 5, marginTop: 7, padding: "0 8px", flexWrap: "wrap", justifyContent: isUser ? "flex-end" : "flex-start", opacity: 0.56 }}>
                      <button title="Regenerate" onClick={() => regenerateFrom(msgId)} disabled={loading || m.streaming} style={actionButton(loading || m.streaming)}>↻</button>
                      <button title="Copy" onClick={() => copyMessage(m)} disabled={m.streaming} style={actionButton(m.streaming)}>⧉</button>
                      <button title="Edit" onClick={() => startEditMessage(m, msgId)} disabled={loading || m.streaming || !isUser} style={actionButton(loading || m.streaming || !isUser)}>✎</button>
                      <button title="Delete" onClick={() => deleteMessage(msgId)} disabled={m.streaming} style={actionButton(m.streaming)}>⌫</button>
                    </div>
                  )}
                </div>
                {isUser && (
                  <div style={{ width: isMobile ? 34 : 44, height: isMobile ? 34 : 44, borderRadius: 14, border: `1px solid ${V.line}`, background: V.softControl, color: V.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, marginTop: 2, fontFamily: V.serif, fontWeight: 900, boxShadow: "inset 0 0 18px rgba(0,0,0,0.3)" }}>
                    <Avatar value={player.avatar} fallback="我" size={isMobile ? 32 : 42} radius={14} />
                  </div>
                )}
              </div>
              {/* HP 专项：检定/状态变化 —— 对话流中间的独立居中状态条 */}
              {m.roll && (
                <div style={{ display: "flex", justifyContent: "center", margin: isMobile ? "0 0 22px" : "0 0 28px" }}>
                  <div style={{ maxWidth: "86%", padding: "7px 16px", borderRadius: 999, background: "rgba(232,199,102,0.08)", border: "1px solid rgba(232,199,102,0.28)", color: "#d8c79a", fontSize: 12, fontWeight: 600, textAlign: "center", letterSpacing: 0.3 }}>
                    {m.roll}
                  </div>
                </div>
              )}
              </Fragment>
            );
          })}
          <div ref={endRef} />
          </div>
        </div>

        {/* World book hint */}
        {triggered.length > 0 && input && (
          <div style={{ maxWidth: HP_KIOSK ? 650 : 900, width: "100%", margin: "0 auto", padding: "0 14px 6px" }}>
            <div style={{ padding: "5px 10px", background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 7, fontSize: 11, color: T.greenText }}>
              🌍 世界书触发：{triggered.map((e) => e.title).join("、")}
            </div>
          </div>
        )}

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div style={{ maxWidth: HP_KIOSK ? 650 : 900, width: "100%", margin: "0 auto", display: "flex", gap: 6, padding: "0 14px 6px", flexWrap: "wrap" }}>
            {attachments.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", background: T.surface, borderRadius: 20, fontSize: 11, color: T.textDim }}>
                📎 {a.name}
                <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, padding: 0, display: "flex" }}>
                  <I.Close />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{ borderTop: `1px solid ${HP_KIOSK ? hpUi.line : V.lineSoft}`, background: HP_KIOSK ? hpUi.inputBar : V.inputBar, padding: isMobile ? "8px 10px calc(10px + env(safe-area-inset-bottom))" : "12px 14px calc(14px + env(safe-area-inset-bottom))", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: HP_KIOSK ? 650 : 900, width: "100%", margin: "0 auto" }}>
          {HP_KIOSK && activeMode === "world" && currentCalendarMoment && !input.trim() && (
            <div
              style={{
                marginBottom: calendarOpen ? 8 : 6,
                border: `1px solid ${hpUi.line}`,
                borderRadius: 13,
                background: hpUi.calendarBg,
                padding: calendarOpen ? "9px 10px" : "7px 9px",
                boxShadow: hpIsNight ? "0 10px 22px rgba(0,0,0,0.12)" : "0 10px 22px rgba(89,54,32,0.10)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: calendarOpen ? 6 : 0 }}>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((v) => !v)}
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    color: hpUi.calendarText,
                    fontFamily: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color: hpUi.calendarGold, fontSize: 13, transform: calendarOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>
                    {currentCalendarMoment.title}
                  </span>
                </button>
                <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={advanceToNextPeriod}
                    disabled={loading}
                    title={nextPeriodButtonTitle}
                    style={{
                      minHeight: 24,
                      padding: "0 9px",
                      borderRadius: 999,
                      border: `1px solid ${hpUi.line}`,
                      background: hpUi.calendarChoiceBg,
                      color: loading ? V.faint : hpUi.calendarText,
                      fontSize: 10.5,
                      fontWeight: 800,
                      fontFamily: "inherit",
                      cursor: loading ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nextPeriodButtonText}
                  </button>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: hpUi.calendarGold, opacity: 0.9, whiteSpace: "nowrap" }}>
                    {currentCalendarMoment.periodLabel || scenePeriod.label}
                  </div>
                </div>
              </div>
              {calendarOpen && (
                <>
                  <div style={{ marginBottom: 7, fontSize: 11, lineHeight: 1.45, color: hpUi.calendarMuted }}>
                    {currentCalendarMoment.note}
                  </div>
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 1, scrollbarWidth: "none" }}>
                    {currentCalendarMoment.choices.map((choice) => (
                      <button
                        key={choice.label}
                        type="button"
                        onClick={() => chooseCalendarOption(choice)}
                        disabled={loading}
                        title={choice.intent}
                        style={{
                          flex: "0 0 auto",
                          minHeight: 28,
                          padding: "0 10px",
                          borderRadius: 999,
                          border: `1px solid ${hpUi.line}`,
                          background: hpUi.calendarChoiceBg,
                          color: loading ? V.faint : hpUi.calendarText,
                          fontSize: 11.5,
                          fontWeight: 700,
                          fontFamily: "inherit",
                          cursor: loading ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            border: HP_KIOSK ? `1px solid ${hpUi.inputBorder}` : `1px solid ${V.lineSoft}`,
            borderRadius: HP_KIOSK ? 12 : 16,
            padding: isMobile ? "8px 9px 8px 11px" : "9px 10px 9px 13px",
            background: HP_KIOSK
              ? hpUi.inputPaper
              : V.inputField,
            boxShadow: HP_KIOSK ? (hpIsNight ? "0 14px 34px rgba(0,0,0,0.28), inset 0 0 0 4px rgba(255,246,219,0.18)" : "0 12px 28px rgba(89,54,32,0.18), inset 0 0 0 4px rgba(255,246,219,0.24)") : undefined,
            overflow: "hidden",
          }}>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => handleFiles(Array.from(e.target.files))} />
            <button onClick={() => fileRef.current?.click()} style={{ position: "relative", zIndex: 1, background: "none", border: "none", cursor: "pointer", color: HP_KIOSK ? hpUi.flourishInk : V.gold, padding: "3px", display: "flex", flexShrink: 0, marginBottom: 4, opacity: 0.7 }} title="上传图片/PDF">
              <I.Attach />
            </button>
            <textarea
              ref={taRef} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, inputMaxHeight) + "px"; }}
              placeholder={activeMode === "world" ? "描述你的行动 / 推进剧情…" : `和 ${activeChar.name} 说话…`}
              rows={1}
              style={{ position: "relative", zIndex: 1, flex: 1, border: "none", outline: "none", fontSize: 16, fontFamily: HP_KIOSK ? V.serif : "inherit", color: HP_KIOSK ? hpUi.inputInk : V.ink, background: "transparent", lineHeight: 1.35, minHeight: isMobile ? 30 : 34, maxHeight: inputMaxHeight, overflowY: "auto", resize: "none", padding: "3px 0" }}
            />
            <button
              onClick={() => send()}
              disabled={loading || (!input.trim() && !attachments.length)}
              style={{
                width: isMobile ? 34 : 38, height: isMobile ? 34 : 38, borderRadius: isMobile ? 14 : 16, border: `1px solid ${V.line}`,
                background: loading || (!input.trim() && !attachments.length) ? hpUi.controlBg : hpUi.seal,
                color:      loading || (!input.trim() && !attachments.length) ? V.faint : "#f6e4ad",
                cursor:     loading || (!input.trim() && !attachments.length) ? "not-allowed" : "pointer",
                position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s", boxShadow: "inset 0 2px 10px rgba(255,255,255,0.12)",
              }}
            >
              {loading
                ? <div style={{ width: 13, height: 13, border: `2px solid ${V.faint}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                : <I.Send />
              }
            </button>
          </div>
          {!isMobile && (
            <div style={{ fontSize: 11, color: HP_KIOSK ? hpUi.chromeMuted : V.faint, marginTop: 6, textAlign: "center" }}>
              {activeMode === "world" ? "世界聊天 · 旁白推进，可扮演所有角色" : `角色聊天 · 与 ${activeChar.name} 一对一`} · 共享世界状态，不共享聊天记录
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
