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
import { inventoryIssueForCommand } from "../src/lib/lifeMechanics.js";

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

console.log(`\nPhase 4B tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
