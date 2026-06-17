// Broad smoke verification for the HP simulator rules layer.
// Run with: node scripts/full-system.test.mjs

import {
  createPlayerCharacter,
  createProject,
  createPendingUpdate,
  applyUpdateToProject,
  normalizeSuggestions,
  migrateAll,
} from "../src/lib/projects.js";
import { applyInventoryChanges, createInitialInventory, inferShoppingChanges, hasItem, missingRequiredItems } from "../src/lib/inventory.js";
import { parseActionCommand, runAction, ACTIONS, checkEffects } from "../src/lib/checks.js";
import { parseDailyGrowth, applyDailyGrowth, formatDailyGrowth } from "../src/lib/dailyGrowth.js";
import { applyRelationshipDeltas, filterRelationshipDeltasByEvidence, findCharacter, inferFavorDeltas, parseRelationshipDeltas } from "../src/lib/affinity.js";
import { createOC, formatOcs } from "../src/lib/oc.js";
import { calendarMoment, advanceCalendarClock, buildCalendarChoiceInput } from "../src/lib/schoolCalendar.js";
import { inferNaturalCommand, adjustedActionCost, inventoryIssueForCommand, settleExam, applyLocationGateToCommand } from "../src/lib/lifeMechanics.js";
import { lessonsFor, timetableContext, weekdayForLabel } from "../src/lib/timetable.js";
import { mergeClues, parseClueTags, activeClues } from "../src/lib/clues.js";
import { houseCupBoard, settleHouseCup } from "../src/lib/houseCup.js";
import { initialStats, STAMINA_MAX } from "../src/lib/stats.js";
import { initialCourses } from "../src/lib/courses.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.error("  ✗ " + msg);
  }
};

const player = createPlayerCharacter({
  name: "测试生",
  meta: { house: "斯莱特林", blood: "麻瓜出身", subjects: ["魔咒学"] },
  stats: { ...initialStats({ house: "斯莱特林" }), academic: 28, magic: 30, courage: 22, affinity: 20, agility: 16, stamina: 40, housePoints: 12 },
  courses: initialCourses({ subjects: ["魔咒学"] }),
});

// 1. Project model and migration keep HP opening safe.
{
  const project = {
    id: "hp-child_gen",
    name: "HP",
    currentTimeLabel: "1991年9月1日",
    playerCharacter: player,
    worldChatIds: ["w1"],
    characters: [{ id: "harry", name: "哈利·波特" }],
    schemaVersion: 9,
  };
  const migrated = migrateAll({ [project.id]: project }, { w1: { id: "w1", messages: [] } }).projects[project.id];
  ok(migrated.currentTimeLabel.includes("1991年8月16日"), "empty old HP save migrates back to Diagon Alley");

  const projectWithDialogue = { ...project };
  const kept = migrateAll({ [project.id]: projectWithDialogue }, { w1: { id: "w1", messages: [{ role: "user", content: "已经上车" }] } }).projects[project.id];
  ok(kept.currentTimeLabel === "1991年9月1日", "migration does not reset active saves with dialogue");
}

// 2. Calendar and time never stick on late Sep 1.
{
  ok(calendarMoment({ currentTimeLabel: "1991年8月16日 · 对角巷采购", periodId: "morning" }).title === "对角巷采购", "Diagon Alley opening moment is available");
  ok(calendarMoment({ currentTimeLabel: "1991年8月20日", periodId: "afternoon" }).title === "开学前的日子", "pre-term growth moment is available before Sep 1");
  ok(calendarMoment({ currentTimeLabel: "1991年9月1日", periodId: "afternoon" }).choices.some((x) => x.label === "列车上闲逛"), "Sep 1 afternoon is train time");
  const next = advanceCalendarClock({ currentTimeLabel: "1991年9月1日", periodId: "late" });
  ok(next.currentTimeLabel === "1991年9月2日" && next.periodId === "morning", "late Sep 1 advances to Sep 2 morning");
  const prompt = buildCalendarChoiceInput({ label: "结束开学日", intent: "我想休息。", nextTimeLabel: "1991年9月2日", nextPeriodId: "morning" }, { id: "night", label: "夜晚", instruction: "休息室" }, "1991年9月1日");
  ok(prompt.includes("当前日期：1991年9月1日") && prompt.includes("当前生活时段应为：上午"), "calendar choice prompt carries next date and period");
}

// 3. Timetable drives normal school days.
{
  ok(weekdayForLabel("1991年9月2日") === 1, "Sep 2 1991 is Monday");
  ok(lessonsFor({ currentTimeLabel: "1991年9月2日", periodId: "morning" }).length === 2, "Monday morning has two lessons");
  ok(timetableContext({ currentTimeLabel: "1991年12月25日", periodId: "morning" }).holiday, "Christmas is treated as holiday");
}

// 4. Inventory acquisition, de-duplication, and missing item gates.
{
  const inv = createInitialInventory();
  ok(missingRequiredItems(inv).includes("魔杖"), "initial inventory lacks wand");
  const changes = inferShoppingChanges("我去奥利凡德挑选魔杖，又到摩金夫人买校袍和丽痕书店买课本。", { currentTimeLabel: "1991年8月16日", wandMeta: { wood: "橡木", core: "凤凰羽毛" } });
  const updated = applyInventoryChanges(inv, changes);
  ok(hasItem(updated, "wand") && hasItem(updated, "school_robes") && hasItem(updated, "school_books"), "shopping adds core school items");
  ok(applyInventoryChanges(updated, changes).items.wand.qty === 1, "repeated shopping does not duplicate wand quantity");
}

// 5. Natural checks trigger only when time/place make sense.
{
  const flightBlocked = inferNaturalCommand("我在礼堂骑上扫帚飞起来。", { periodId: "afternoon", currentTimeLabel: "1991年9月2日" });
  ok(flightBlocked?.command === "飞行" && flightBlocked.blockedReason.includes("城堡室内"), "flying is blocked in indoor castle spaces");

  const flightOk = inferNaturalCommand("我在魁地奇球场骑上扫帚参加训练。", { periodId: "afternoon", currentTimeLabel: "1991年9月2日" });
  ok(flightOk?.command === "飞行" && !flightOk.blockedReason, "flying is allowed on the pitch");

  const currentHallFlight = inferNaturalCommand("我骑上扫帚飞起来。", { periodId: "afternoon", currentTimeLabel: "1991年9月2日", currentLocation: "礼堂" });
  ok(currentHallFlight?.blockedReason.includes("城堡室内"), "current location blocks flying even when user omits location text");

  const currentPitchFlight = inferNaturalCommand("我骑上扫帚飞起来。", { periodId: "afternoon", currentTimeLabel: "1991年9月2日", currentLocation: "魁地奇球场" });
  ok(currentPitchFlight?.command === "飞行" && !currentPitchFlight.blockedReason, "current outdoor training location allows flying");

  const observe = inferNaturalCommand("我远远看着德拉科为什么还没回寝室。", { periodId: "late", currentTimeLabel: "1991年9月2日" });
  ok(!observe, "pure observation does not trigger a check");

  const nightRisk = inferNaturalCommand("我深夜走出公共休息室前往走廊。", { periodId: "late", currentTimeLabel: "1991年9月2日" });
  ok(nightRisk?.command === "夜游", "late movement into corridor triggers night-wandering risk");
}

// 6. Action commands, stamina, and inventory gates.
{
  const cmd = parseActionCommand("/练咒 漂浮咒");
  ok(cmd?.command === "练咒", "slash command parses spell practice");
  const explicitFlight = applyLocationGateToCommand(parseActionCommand("/飞行"), "/飞行", { currentLocation: "礼堂" });
  ok(explicitFlight?.blockedReason.includes("城堡室内"), "explicit slash action also respects current-location gate");
  const check = runAction(ACTIONS.练咒, player, { roll: 12 });
  const effects = checkEffects(ACTIONS.练咒, check);
  ok(check.success && effects.delta >= 1, "successful spell check grants progress");
  ok(adjustedActionCost(ACTIONS.夜游, "late") > adjustedActionCost(ACTIONS.夜游, "morning"), "late risky actions cost more stamina");
  ok(inventoryIssueForCommand(cmd, createInitialInventory()).includes("魔杖"), "spell practice requires a confirmed wand");
}

// 7. Daily growth parses hidden tags, clamps deltas, and applies bounds.
{
  const parsed = parseDailyGrowth("正文\n【日常成长：学术+9；学院分-99；体力+99】");
  ok(parsed.cleaned === "正文" && parsed.entries.find((x) => x.key === "academic")?.delta === 3, "daily growth hides tag and clamps academic");
  const grown = applyDailyGrowth({ academic: 99, housePoints: 5, stamina: STAMINA_MAX - 1 }, parsed.entries);
  ok(grown.academic === 100 && grown.housePoints === 5 && grown.stamina === STAMINA_MAX, "daily growth respects stat bounds and rejects unsupported house points");
  ok(!parsed.entries.some((x) => x.key === "housePoints"), "daily growth rejects house points without explicit reason");
  const withReason = parseDailyGrowth("正文\n【日常成长：学院分+12：麦格教授因课堂回答加分；魔法+2】");
  const hp = withReason.entries.find((x) => x.key === "housePoints");
  ok(hp?.delta === 10 && hp.reason.includes("麦格教授"), "house points require a concrete reason and remain clamped");
  ok(formatDailyGrowth(withReason.entries).includes("麦格教授因课堂回答加分"), "growth summary preserves house-point reason");
}

// 8. Affinity supports canon + OC and avoids distant observation.
{
  const cast = [
    { id: "harry", name: "哈利·波特" },
    { id: "ron", name: "罗恩·韦斯莱" },
    { id: "bellatrix", name: "贝拉特里克斯·莱斯特兰奇" },
    { id: "albus", name: "阿不思·珀西瓦尔·伍尔弗里克·布赖恩·邓布利多" },
    { id: "hagrid", name: "鲁伯·海格" },
  ];
  const oc = createOC({ id: "oc-emily", name: "艾米丽", persona: "温和的新生", tieName: "德拉科", tieRelation: "发小" });
  ok(findCharacter("艾米丽", cast, [oc])?.kind === "oc", "findCharacter resolves OC");
  ok(formatOcs([oc]).includes("可积累好感"), "OC prompt block declares affinity support");

  const parsed = parseRelationshipDeltas("【关系变化：哈利+2；艾米丽+1】", cast, [oc]);
  const applied = applyRelationshipDeltas(player, parsed.entries);
  ok(applied.player.favor.harry === 2 && applied.player.favor["oc-emily"] === 1, "relationship deltas apply to canon and OC");

  const inferred = inferFavorDeltas("我向他们打招呼。", cast, [oc], { aiText: "哈利：你好。艾米丽笑着点头，罗恩也回应。", maxEntries: 4 });
  ok(inferred.length === 3 && inferred.some((x) => x.kind === "oc"), "multi-character fallback includes OC");

  const distant = inferFavorDeltas("我远远看见艾米丽在窗边，没有过去。", cast, [oc], { aiText: "艾米丽没有和你交谈。" });
  ok(distant.length === 0, "distant OC observation does not increase favor");

  const absent = inferFavorDeltas("我问罗恩哈利在哪里。", cast, [oc], { aiText: "罗恩回答：哈利不在这里。", maxEntries: 4 });
  ok(absent.some((x) => x.id === "ron") && !absent.some((x) => x.id === "harry"), "asking about absent canon character does not increase absent favor");

  const wrongTag = parseRelationshipDeltas("罗恩提起哈利不在。\n【关系变化：哈利+1；罗恩+1】", cast, [oc]);
  const filtered = filterRelationshipDeltasByEvidence(wrongTag.entries, "我问罗恩哈利在哪里。", cast, [oc], { aiText: "罗恩提起哈利不在。" });
  ok(filtered.length === 1 && filtered[0].id === "ron", "relationship tags are filtered by direct interaction evidence");

  const hiddenOnly = parseRelationshipDeltas("罗恩把书包挪开，让你坐下。\n【关系变化：赫敏+1；罗恩+1】", cast, [oc]);
  const hiddenFiltered = filterRelationshipDeltasByEvidence(hiddenOnly.entries, "我问能不能坐在这里。", cast, [oc], { aiText: "罗恩把书包挪开，让你坐下。" });
  ok(hiddenFiltered.length === 1 && hiddenFiltered[0].id === "ron", "hidden-only tag cannot create favor for an unmentioned character");

  const familyOnly = inferFavorDeltas("我跟着拉环离开金库。", cast, [oc], {
    aiText: "拉环说：那是莱斯特兰奇家的金库守卫龙。",
    maxEntries: 4,
  });
  ok(!familyOnly.some((x) => x.id === "bellatrix"), "family surname context does not create absent character favor");

  const familyTag = parseRelationshipDeltas("拉环说那是莱斯特兰奇家的金库守卫龙。\n【关系变化：贝拉特里克斯·莱斯特兰奇+1】", cast, [oc]);
  const familyFiltered = filterRelationshipDeltasByEvidence(familyTag.entries, "我跟着拉环离开金库。", cast, [oc], { aiText: "拉环说那是莱斯特兰奇家的金库守卫龙。" });
  ok(familyFiltered.length === 0, "family surname relationship tag is rejected without direct character evidence");

  const gringottsScene = "海格给哈利让路。哈利·波特仰头看着古灵阁大厅。伊芙琳只是擦肩而过，听见海格对妖精说：邓布利多教授让我来取713号金库里的东西。";
  const gringottsTags = parseRelationshipDeltas(`${gringottsScene}\n【关系变化：哈利+1；鲁伯·海格+1；阿不思·珀西瓦尔·伍尔弗里克·布赖恩·邓布利多+1】`, cast, [oc]);
  const gringottsFiltered = filterRelationshipDeltasByEvidence(gringottsTags.entries, "我取完钱离开古灵阁。", cast, [oc], {
    aiText: gringottsScene,
    playerName: "伊芙琳·塞尔温",
  });
  ok(gringottsFiltered.length === 0, "background Gringotts appearances and mentions do not affect favor");
}

// 9. Clue tracker rejects oversized invented mysteries but keeps small/canon clues.
{
  const parsed = parseClueTags("正文\n【线索：类型=日常小支线；标题=丢失的羽毛笔；阶段=初见；人物=室友；进展=有人误拿；期限=2】");
  ok(parsed.cleaned === "正文" && parsed.entries.length === 1, "daily clue tag parses and is hidden");
  const merged = mergeClues([], parsed.entries);
  ok(activeClues(merged.clues).length === 1, "daily clue becomes active");
  const bad = parseClueTags("【线索：类型=日常小支线；标题=远古预言；阶段=初见；进展=一个未知组织影响魔法界命运；期限=3】");
  ok(bad.entries.length === 0, "world-scale invented mystery is rejected");
  const bigScale = parseClueTags("【线索：类型=日常小支线；标题=寝室暗号；规模=大；阶段=初见；人物=室友；进展=暗号似乎牵连整个魔法界；期限=3】");
  ok(bigScale.entries.length === 0, "large-scale side mystery is rejected instead of downgraded");
  const canon = parseClueTags("【线索：类型=原著回声；标题=墙上的血字；原著关联=密室/蛇怪；阶段=怀疑；人物=金妮；进展=走廊墙上的血字引发恐慌；期限=3】");
  ok(canon.entries.length === 1 && canon.entries[0].type === "canon", "later-year canon anchor can be accepted");
  const contaminated = parseClueTags("【线索：类型=原著回声；标题=魔法石背后的新组织；原著关联=魔法石/未知组织；阶段=怀疑；进展=一个未知组织声称控制魔法石；期限=3】");
  ok(contaminated.entries.length === 0, "canon clue cannot mix in invented world mystery");
}

// 10. Exams and House Cup are idempotent and canon-locked where needed.
{
  const exam = settleExam(player, "1992年6月1日");
  ok(exam.key === "1992-final" && exam.results.length > 0, "exam settlement produces year key and grades");
  const board = houseCupBoard(player, "1992年5月23日");
  ok(board.playerContribution === 12, "house cup board includes player contribution before final");
  const final = settleHouseCup({ player, currentTimeLabel: "1992年6月20日", houseCupResults: {} });
  ok(final?.result?.winner === "格兰芬多" && final.result.canonLocked, "first-year House Cup final is canon-locked");
  const again = settleHouseCup({ player, currentTimeLabel: "1992年6月21日", houseCupResults: { [final.result.key]: final.result } });
  ok(again?.isNew === false, "House Cup settlement is idempotent");
}

// 11. Pending updates write the correct world/player memory fields.
{
  const project = createProject({ name: "T", currentTimeLabel: "1991年9月2日", playerCharacter: player, characters: [{ id: "harry", name: "哈利·波特" }] });
  const pend = normalizeSuggestions([
    { type: "story", newValue: "第一节课开始", confidence: 0.9, scopeLevel: "world" },
    { type: "playerHistory", newValue: "在列车上认识罗恩", confidence: 0.9 },
  ], { project, currentTimeLabel: project.currentTimeLabel });
  ok(pend.every((x) => x.date === "1991年9月2日"), "pending suggestions inherit current project time");
  let next = applyUpdateToProject(project, createPendingUpdate({ type: "story", newValue: "事件", date: "D1" }), "事件");
  next = applyUpdateToProject(next, createPendingUpdate({ type: "playerHistory", newValue: "经历", date: "D2" }), "经历");
  ok(next.storyMemory.at(-1).date === "D1" && next.playerCharacter.history.at(-1).date === "D2", "accepted pending updates write story and player history");
}

console.log(`\nFull system smoke tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
