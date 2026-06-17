import { createProject, migrateAll, SCHEMA_VERSION } from "../src/lib/projects.js";
import {
  applyLifeLogUpdate,
  createLifeLogEntry,
  detectCharacterRefs,
  detectLifeLocation,
  formatLifeLogBlock,
} from "../src/lib/lifeLog.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.error("FAIL:", msg);
  }
};

const cast = [
  { id: "harry", name: "哈利・波特" },
  { id: "hagrid", name: "鲁伯・海格" },
  { id: "albus", name: "阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多" },
  { id: "bellatrix", name: "贝拉特里克斯・莱斯特兰奇" },
  { id: "ron", name: "罗恩・韦斯莱" },
];

{
  ok(detectLifeLocation("我推开古灵阁沉重的青铜大门。", "") === "古灵阁", "detects Diagon Alley bank location");
  ok(detectLifeLocation("我在图书馆查资料。", "") === "图书馆", "detects Hogwarts location");
}

{
  const scene =
    "海格正侧身给后面的人让路。哈利·波特初次进入古灵阁，绿色眼睛微微睁大。伊芙琳只是擦肩而过，听见海格压低声音对柜台后的妖精说：邓布利多教授让我来取713号金库里的那个小东西。";
  const present = detectCharacterRefs(scene, cast, [], { mode: "present" }).map((x) => x.id);
  ok(present.includes("harry"), "background Harry can be recorded as physically present");
  ok(present.includes("hagrid"), "Hagrid can be recorded as physically present");
  ok(!present.includes("albus"), "mentioned Dumbledore is not recorded as present");

  const project = createProject({
    currentTimeLabel: "1991年8月16日 · 对角巷采购",
    dayPeriod: "morning",
    currentState: { location: "对角巷", scene: "开学前采购", arc: "入学准备" },
    characters: cast,
  });
  ok(Array.isArray(project.lifeLog) && project.lifeLog.length === 0, "project starts with empty lifeLog");

  const entry = createLifeLogEntry({
    project,
    periodId: "morning",
    periodLabel: "上午",
    userText: "我从古灵阁金库取完钱，准备离开。",
    aiText: scene,
    characters: cast,
    relationshipApplied: [],
    dailyGrowth: [{ key: "academic", delta: 1 }],
    clueEntries: [{ id: "clue-713", title: "713号金库", type: "canon", status: "suspected" }],
    inventoryChanges: [{ id: "wizard_money", label: "巫师货币", source: "古灵阁" }],
    rollLine: "获得物品：巫师货币",
    sourceChatId: "chat-1",
  });
  ok(entry.location === "古灵阁", "life log stores detected location");
  ok(entry.presentCharacterIds.includes("harry") && entry.presentCharacterIds.includes("hagrid"), "life log stores present people");
  ok(!entry.presentCharacterIds.includes("albus"), "life log excludes mentioned-only people from present list");
  ok(entry.interactionCharacterIds.length === 0, "life log does not invent direct interactions");
  ok(entry.dailyGrowth.length === 1 && entry.clues.length === 1 && entry.inventoryChanges.length === 1, "life log stores applied system consequences");

  const updated = applyLifeLogUpdate(project, entry);
  ok(updated.lifeLog.length === 1 && updated.lifeLog[0].id === entry.id, "life log is prepended to project");
  ok(updated.currentState.location === "古灵阁", "current state location follows latest life log");
  ok(updated.currentState.presentCharacters.some((x) => x.ref === "harry"), "current state present characters follow latest life log");

  const block = formatLifeLogBlock(updated.lifeLog, { nameMap: Object.fromEntries(cast.map((c) => [c.id, c])) });
  ok(block.includes("近期生活日志") && block.includes("古灵阁") && block.includes("在场：哈利"), "life log prompt block renders continuity");
}

{
  const familyScene = "拉环说：那是莱斯特兰奇家的金库守卫龙，年纪大了，但喷火还很准。";
  const present = detectCharacterRefs(familyScene, cast, [], { mode: "present" }).map((x) => x.id);
  ok(!present.includes("bellatrix"), "family surname context does not mark Bellatrix present");
}

{
  const oldProject = createProject({ id: "p-old", characters: cast, currentTimeLabel: "1991年9月2日" });
  const { lifeLog, schemaVersion, ...legacyShape } = oldProject;
  const migrated = migrateAll({ "p-old": { ...legacyShape, schemaVersion: SCHEMA_VERSION - 1 } }, {}).projects["p-old"];
  ok(Array.isArray(migrated.lifeLog) && migrated.lifeLog.length === 0, "migration adds empty lifeLog to old projects");
  ok(migrated.schemaVersion === SCHEMA_VERSION, "migration bumps schema with lifeLog field");
}

console.log(`\nLife log tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
