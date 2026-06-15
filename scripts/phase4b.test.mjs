// Phase 4B verification — run with: node scripts/phase4b.test.mjs
// Covers project timeline labels (currentTimeLabel) + per-update date plumbing,
// and confirms Phase 4A pending/accept/reject flow is intact.
import {
  SCHEMA_VERSION,
  createProject,
  createPlayerCharacter,
  createPendingUpdate,
  migrateAll,
  buildSuggestionPrompt,
  normalizeSuggestions,
  applyUpdateToProject,
  formatStory,
  formatHistory,
  PLAYER_ID,
} from "../src/lib/projects.js";
import { applyInventoryChanges, inferShoppingChanges, hasItem, missingRequiredItems } from "../src/lib/inventory.js";
import { ACTIONS } from "../src/lib/checks.js";
import { inferNaturalCommand, inventoryIssueForCommand } from "../src/lib/lifeMechanics.js";
import { calendarMoment } from "../src/lib/schoolCalendar.js";
import { lessonsFor, timetableContext, weekdayForLabel } from "../src/lib/timetable.js";
import { activeClues, formatClueLine, formatCluesBlock, mergeClues, parseClueTags } from "../src/lib/clues.js";
import { formatHouseCupBlock, houseCupBoard, houseCupSummary, settleHouseCup } from "../src/lib/houseCup.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error("  ✗ " + msg); } };

// 1. migration v4→v5 is idempotent + adds currentTimeLabel
{
  const v4 = {
    p1: {
      id: "p1", name: "P", worldChatIds: ["w1"], playerCharacter: { id: PLAYER_ID, name: "我" },
      pendingUpdates: [], characters: [], schemaVersion: 4,
    },
  };
  const r1 = migrateAll(v4, {});
  ok(r1.changed === true, "v4 project should be migrated (changed=true)");
  ok(r1.projects.p1.currentTimeLabel === "", "migration adds empty currentTimeLabel");
  ok(r1.projects.p1.schemaVersion === SCHEMA_VERSION, "schemaVersion bumped to current");

  // second pass over already-migrated output → no change (idempotent)
  const r2 = migrateAll(r1.projects, r1.sessions);
  ok(r2.changed === false, "re-migrating v5 output is a no-op (idempotent)");
  ok(r2.projects.p1 === r1.projects.p1, "idempotent migration preserves object identity");

  // preserves an existing label across a re-migrate
  const labeled = { p1: { ...r1.projects.p1, currentTimeLabel: "1992年12月" } };
  const r3 = migrateAll(labeled, {});
  ok(r3.changed === false && r3.projects.p1.currentTimeLabel === "1992年12月", "existing currentTimeLabel preserved");
}

// 2. createProject defaults currentTimeLabel
{
  ok(createProject().currentTimeLabel === "", "createProject defaults currentTimeLabel to ''");
  ok(createProject({ currentTimeLabel: "T0" }).currentTimeLabel === "T0", "createProject keeps passed currentTimeLabel");
}

// 3. createPendingUpdate carries date
{
  ok(createPendingUpdate().date === "", "createPendingUpdate defaults date to ''");
  ok(createPendingUpdate({ date: "1992年12月" }).date === "1992年12月", "createPendingUpdate keeps date");
}

// 4. normalizeSuggestions defaults to currentTimeLabel, but per-suggestion date wins
{
  const project = createProject({ name: "W", characters: [{ id: "c1", name: "爱丽丝" }] });
  const raw = [
    { type: "story", newValue: "世界大战爆发", scopeLevel: "world", confidence: 0.9, evidence: "原文证据" },           // no date → inherits label
    { type: "story", newValue: "停战协议签署", scopeLevel: "world", confidence: 0.9, date: "1995年", evidence: "原文证据" }, // explicit date wins
  ];
  const ctx = { project, sourceChatId: null, sourceKind: "world", mode: "world", activeChar: null, player: project.playerCharacter, currentTimeLabel: "1992年12月" };
  const out = normalizeSuggestions(raw, ctx);
  ok(out.length === 2, "two story suggestions normalised");
  ok(out[0].date === "1992年12月", "suggestion without date inherits currentTimeLabel");
  ok(out[1].date === "1995年", "explicit suggestion date overrides currentTimeLabel");

  // no label set → empty stays empty
  const out2 = normalizeSuggestions([{ type: "story", newValue: "X", scopeLevel: "world", confidence: 0.9, evidence: "原文证据" }],
    { ...ctx, currentTimeLabel: "" });
  ok(out2[0].date === "", "no label + no suggestion date → empty date");
}

// 5. applyUpdateToProject writes date into StoryEvent / HistoryEvent / PlayerHistory
{
  const project = createProject({ name: "W", characters: [{ id: "c1", name: "爱丽丝" }] });

  const story = applyUpdateToProject(project, createPendingUpdate({ type: "story", newValue: "事件A", date: "D1", scopeLevel: "world" }), "事件A");
  ok(story.storyMemory.at(-1).date === "D1", "story event gets date");

  const chHist = applyUpdateToProject(project, createPendingUpdate({ type: "characterHistory", targetCharId: "c1", newValue: "经历B", date: "D2" }), "经历B");
  ok(chHist.characters[0].history.at(-1).date === "D2", "character history event gets date");

  const plHist = applyUpdateToProject(project, createPendingUpdate({ type: "playerHistory", newValue: "经历C", date: "D3" }), "经历C");
  ok(plHist.playerCharacter.history.at(-1).date === "D3", "player history event gets date");

  // date surfaces in the RP-prompt formatters
  ok(formatStory(story.storyMemory).at(-1) === "D1：事件A", "formatStory prepends date");
  ok(formatHistory(chHist.characters[0].history).at(-1) === "D2：经历B", "formatHistory prepends date");
}

// 11. Phase 4A accept/reject flow intact (mirrors App.acceptUpdate)
{
  let project = createProject({ name: "W", characters: [{ id: "c1", name: "爱丽丝" }] });
  const pu = createPendingUpdate({ type: "world", newValue: "天空是紫色的" });
  project = { ...project, pendingUpdates: [pu] };

  // accept: apply + remove from pending (with edited date, as App does)
  const found = project.pendingUpdates.find((x) => x.id === pu.id);
  const withDate = { ...found, date: "D9" };
  const np = applyUpdateToProject(project, withDate, "天空是紫色的");
  const afterAccept = { ...np, pendingUpdates: project.pendingUpdates.filter((x) => x.id !== pu.id) };
  ok(afterAccept.worldMemory.at(-1).content === "天空是紫色的", "accept writes world fact");
  ok(afterAccept.pendingUpdates.length === 0, "accept removes the pending update");

  // reject: just drop from pending, no write
  const afterReject = { ...project, pendingUpdates: project.pendingUpdates.filter((x) => x.id !== pu.id) };
  ok(afterReject.pendingUpdates.length === 0 && (afterReject.worldMemory || []).length === 0, "reject drops pending without writing");
}

// buildSuggestionPrompt injects the current-time directive
{
  const withLabel = buildSuggestionPrompt({ mode: "world", userText: "u", aiText: "a", characters: [], player: { name: "我" }, currentTimeLabel: "1992年12月" });
  ok(withLabel.includes("当前时间：1992年12月"), "prompt injects current time when label set");
  ok(withLabel.includes('"date"'), "prompt schema includes date field");
  const noLabel = buildSuggestionPrompt({ mode: "world", userText: "u", aiText: "a", characters: [], player: { name: "我" }, currentTimeLabel: "" });
  ok(!noLabel.includes("当前时间："), "prompt omits current-time line when no label");
}

// 12. HP inventory defaults + shopping acquisition
{
  const player = createPlayerCharacter({ name: "我" });
  ok(hasItem(player.inventory, "admission_letter"), "player starts with admission letter");
  ok(hasItem(player.inventory, "shopping_list"), "player starts with shopping list");
  ok(missingRequiredItems(player.inventory).includes("魔杖"), "wand is not assumed before purchase");

  const wandChanges = inferShoppingChanges("我想去奥利凡德魔杖店，让魔杖选择我。", {
    currentTimeLabel: "1991年8月16日 · 对角巷采购",
    wandMeta: { wood: "山楂木", core: "独角兽毛" },
  });
  ok(wandChanges.some((x) => x.id === "wand"), "Ollivanders shopping records wand");
  const withWand = applyInventoryChanges(player.inventory, wandChanges);
  ok(hasItem(withWand, "wand"), "applied shopping changes add wand");

  const cloak = inferShoppingChanges("我披上斗篷悄悄看看走廊。", { currentTimeLabel: "1991年9月2日" });
  ok(cloak.length === 0, "mentioning a cloak after term does not grant an item");

  const blocked = inventoryIssueForCommand({ command: "练咒", action: ACTIONS.练咒 }, player.inventory);
  ok(blocked.includes("魔杖"), "spell practice is blocked without wand");
  ok(!inventoryIssueForCommand({ command: "练咒", action: ACTIONS.练咒 }, withWand), "spell practice allowed after wand acquisition");
}

// 13. Timetable drives school-life context without forcing weekends/holidays
{
  ok(weekdayForLabel("1991年9月2日") === 1, "1991-09-02 is Monday");
  const mondayMorning = lessonsFor({ currentTimeLabel: "1991年9月2日", periodId: "morning" });
  ok(mondayMorning.length === 2 && mondayMorning[0].course === "魔咒学", "Monday morning has Charms first");

  const moment = calendarMoment({ currentTimeLabel: "1991年9月2日", periodId: "morning" });
  ok(moment.title === "上午课表", "calendar moment title reflects class timetable");
  ok(moment.choices[0].mechanic === "课堂" && moment.choices[0].label.includes("魔咒"), "first daily choice follows current class");

  const cmd = inferNaturalCommand("我想按课表上课：魔咒学（魔咒课教室 · 弗立维教授）", { periodId: "morning", currentTimeLabel: "1991年9月2日" });
  ok(cmd?.command === "课堂" && !cmd.blockedReason, "scheduled class can naturally trigger class check");

  const weekend = timetableContext({ currentTimeLabel: "1991年9月7日", periodId: "morning" });
  ok(!weekend.hasClass, "Saturday has no regular class");
  const holiday = timetableContext({ currentTimeLabel: "1991年12月25日", periodId: "morning" });
  ok(holiday.holiday && !holiday.hasClass, "Christmas is treated as holiday");
}

// 14. Restricted clue tracker accepts recoverable clues and rejects world-scale mysteries
{
  const canon = parseClueTags("正文。\n【线索：类型=原著回声；标题=禁书区借阅记录；原著关联=尼可·勒梅/魔法石；阶段=怀疑；人物=赫敏；进展=有人最近查过尼可·勒梅；期限=3】");
  ok(canon.cleaned === "正文。", "clue tag is hidden from visible reply");
  ok(canon.entries.length === 1 && canon.entries[0].type === "canon", "canon clue with anchor is accepted");

  const daily = parseClueTags("【线索：类型=日常小支线；标题=丢失的羽毛笔；阶段=初见；人物=室友；进展=室友怀疑有人误拿；期限=2】");
  ok(daily.entries.length === 1 && daily.entries[0].turnsLeft === 2, "small daily clue is accepted with deadline");

  const bad = parseClueTags("【线索：类型=日常小支线；标题=古老神器的预言；阶段=初见；进展=一个未知组织似乎影响魔法界命运；期限=3】");
  ok(bad.entries.length === 0, "large invented mystery is rejected");

  const merged = mergeClues([], [...canon.entries, ...daily.entries]);
  ok(activeClues(merged.clues).length === 2, "merged clues remain active");
  ok(formatCluesBlock(merged.clues).includes("不可扩成新世界观谜团"), "clue prompt includes anti-mystery guard");
  ok(formatClueLine(merged.applied).includes("线索更新"), "clue roll line formats");
}

// 15. House Cup separates player contribution from canon-locked final result
{
  const player = createPlayerCharacter({
    name: "我",
    meta: { house: "斯莱特林" },
    stats: { housePoints: 80 },
  });
  const beforeFinal = houseCupBoard(player, "1992年5月23日");
  ok(beforeFinal.scores["斯莱特林"] >= 446, "pre-final board includes player house contribution");
  ok(beforeFinal.playerContribution === 80, "board exposes personal contribution");

  const settlement = settleHouseCup({ player, currentTimeLabel: "1992年6月20日", houseCupResults: {} });
  ok(settlement?.isNew === true, "final feast creates a new House Cup settlement");
  ok(settlement.result.winner === "格兰芬多", "1991-1992 House Cup winner is canon-locked to Gryffindor");
  ok(settlement.result.playerHouse === "斯莱特林" && settlement.result.honor === "年度突出贡献", "non-winning player house still gets personal honor");

  const again = settleHouseCup({
    player,
    currentTimeLabel: "1992年6月21日",
    houseCupResults: { [settlement.result.key]: settlement.result },
  });
  ok(again?.isNew === false, "settled House Cup is idempotent");

  const summary = houseCupSummary(player, "1992年6月21日", { [settlement.result.key]: settlement.result });
  ok(summary.settled && summary.leader === "格兰芬多", "summary reads settled final board");
  ok(formatHouseCupBlock(player, "1992年6月20日").includes("不得改判冠军"), "prompt block includes canon guard");
}

console.log(`\nPhase 4B tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
