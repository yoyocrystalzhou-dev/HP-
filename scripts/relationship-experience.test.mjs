import {
  RELATIONSHIP_EVENT_LIMIT,
  applyRelationshipDeltas,
  favorStage,
  findCharacter,
  formatFavorBlock,
  parseRelationshipDeltas,
  relationshipGate,
} from "../src/lib/affinity.js";
import { createOC, formatOcs } from "../src/lib/oc.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.error("FAIL:", msg);
  }
};

const player = {
  id: "player",
  name: "伊芙琳",
  favor: {},
  state: { status: "", relationships: {} },
};

const cast = [
  { id: "harry", name: "哈利・詹姆斯・波特", kind: "canon" },
  { id: "draco", name: "德拉科・马尔福", kind: "canon" },
  { id: "albus", name: "阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多", kind: "canon" },
];

{
  const result = applyRelationshipDeltas(player, [
    { id: "draco", name: "德拉科・马尔福", kind: "canon", delta: 2, note: "递还课本" },
  ], {
    date: "1991年9月2日",
    periodLabel: "下午",
    location: "图书馆",
    scene: "德拉科把被夹住的课本递回来，手指短暂碰到书脊。",
    source: "daily",
    createdAt: 100,
  });
  const rel = result.player.state.relationships.draco;
  ok(result.player.favor.draco === 2, "relationship delta still changes favor");
  ok(rel.events.length === 1 && rel.events[0].location === "图书馆", "relationship event stores location and scene");
  ok(rel.interactionCount === 1 && rel.lastInteraction.includes("课本"), "relationship stores interaction count and last interaction");
  ok(result.applied[0].event.scene.includes("课本"), "applied preview exposes relationship event");
}

{
  let current = player;
  for (let i = 0; i < RELATIONSHIP_EVENT_LIMIT + 3; i += 1) {
    current = applyRelationshipDeltas(current, [
      { id: "hermione", name: "赫敏・格兰杰", kind: "canon", delta: 1, note: `第${i}次互动` },
    ], {
      date: `1991年9月${i + 1}日`,
      location: "图书馆",
      scene: `一起查资料 ${i}`,
      createdAt: i,
    }).player;
  }
  const rel = current.state.relationships.hermione;
  ok(rel.events.length === RELATIONSHIP_EVENT_LIMIT, "relationship event history is capped");
  ok(rel.events[0].scene.includes("10") && !rel.events.some((event) => event.scene.endsWith(" 0")), "newest events are kept, oldest are dropped");
}

{
  const lover = {
    ...player,
    favor: { harry: 58 },
    state: { relationships: { harry: { status: "恋人", feeling: "已确认关系", events: [] } } },
  };
  const result = applyRelationshipDeltas(lover, [
    { id: "harry", name: "哈利・波特", kind: "canon", delta: -2, note: "争执" },
  ], { scene: "两人在走廊短暂争执。" });
  ok(favorStage(result.player.favor.harry, result.player.state.relationships.harry) === "恋人", "lover status is preserved across later deltas");
}

{
  const gateLow = relationshipGate(12);
  const gateHigh = relationshipGate(63);
  ok(gateLow.next === "朋友" && !gateLow.canConfess, "low favor gate points to friendship");
  ok(gateHigh.canConfess && gateHigh.next.includes("告白"), "high favor gate allows confession but not automatic lover status");
}

{
  const base = applyRelationshipDeltas(player, [
    { id: "oc-emily", name: "艾米丽", kind: "oc", delta: 3, note: "共同整理车厢" },
  ], {
    date: "1991年9月1日",
    location: "霍格沃茨特快",
    scene: "她把糖果盒往你这边推了推。",
  }).player;
  const block = formatFavorBlock(base.favor, { "oc-emily": "艾米丽" }, base.state.relationships);
  ok(block.includes("下一门槛") && block.includes("最近互动") && block.includes("霍格沃茨特快"), "favor prompt block includes gates and recent interaction");
}

{
  const checked = applyRelationshipDeltas(player, [
    { id: "ron", name: "罗恩・韦斯莱", kind: "canon", delta: 0, note: "失败" },
  ], {
    scene: "社交互动：失败",
    source: "check",
  }).player;
  ok(checked.state.relationships.ron.events.length === 1, "zero-delta social checks still leave an interaction record");
  ok(!checked.state.relationships.ron.feeling, "check tier text does not overwrite relationship feeling");
}

{
  const parsed = parseRelationshipDeltas("【关系变化：阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多+1】", cast, []);
  ok(parsed.entries.length === 1 && parsed.entries[0].id === "albus", "long canonical full names parse in relationship tags");
}

{
  ok(findCharacter("德拉科马尔福", cast, [])?.id === "draco", "dotless Draco full name resolves");
  ok(findCharacter("马尔福", cast, [])?.id === "draco", "Draco surname resolves when used as a social target");
  const parsed = parseRelationshipDeltas("【关系变化：德拉科马尔福+1；马尔福+1】", cast, []);
  ok(parsed.entries.length === 1 && parsed.entries[0].id === "draco" && parsed.entries[0].delta === 2, "dotless and surname Draco tags parse and merge");
}

{
  const parsed = parseRelationshipDeltas("【关系变化：哈利+2；哈利+2：共同冒险】", cast, []);
  ok(parsed.entries.length === 1 && parsed.entries[0].id === "harry" && parsed.entries[0].delta === 3, "duplicate relationship tags are merged and clamped");
  const result = applyRelationshipDeltas(player, [
    { id: "harry", name: "哈利・詹姆斯・波特", kind: "canon", delta: 2, note: "一次互动" },
    { id: "harry", name: "哈利・詹姆斯・波特", kind: "canon", delta: 2, note: "重复标签" },
  ], { scene: "同一轮共同冒险。" });
  ok(result.player.favor.harry === 3 && result.player.state.relationships.harry.events.length === 1, "applyRelationshipDeltas also merges duplicate entries defensively");
}

{
  const oc = createOC({ id: "oc-mira", name: "米拉", romanceable: false, persona: "安静的新生" });
  const found = findCharacter("米拉", [], [oc]);
  const block = formatOcs([oc]);
  ok(found?.kind === "oc" && found.romanceable === false, "findCharacter preserves non-romanceable OC metadata");
  ok(block.includes("可积累好感") && !block.includes("可攻略/可进入结局素材"), "non-romanceable OC prompt does not advertise romance route");
}

console.log(`\nRelationship experience tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
