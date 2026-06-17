import { filterRelationshipDeltasByEvidence, parseRelationshipDeltas } from "../src/lib/affinity.js";
import { buildLifeEventCandidates, formatEventCandidate } from "../src/lib/hogwartsLifeEngine.js";
import { createLifeLogEntry, detectCharacterRefs } from "../src/lib/lifeLog.js";
import { buildPresenceContext } from "../src/lib/presence.js";
import { dayPeriod } from "../src/lib/schoolCalendar.js";

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
  { id: "harry", name: "哈利・詹姆斯・波特", house: "格兰芬多", role: "student" },
  { id: "ron", name: "罗恩・比利尔斯・韦斯莱", house: "格兰芬多", role: "student" },
  { id: "hermione", name: "赫敏・简・格兰杰", house: "格兰芬多", role: "student" },
  { id: "draco", name: "德拉科・马尔福", house: "斯莱特林", role: "student" },
  { id: "nott", name: "西奥多・诺特", house: "斯莱特林", role: "student" },
  { id: "blaise", name: "布雷斯・扎比尼", house: "斯莱特林", role: "student" },
  { id: "daphne", name: "达芙妮・格林格拉斯", house: "斯莱特林", role: "student" },
  { id: "ginny", name: "金妮・莫丽・韦斯莱", house: "格兰芬多", role: "student" },
  { id: "luna", name: "卢娜・洛夫古德", house: "拉文克劳", role: "student" },
  { id: "colin", name: "科林・克里维", house: "格兰芬多", role: "student" },
  { id: "hagrid", name: "鲁伯・海格", house: "格兰芬多", role: "staff" },
  { id: "albus", name: "阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多", house: "", role: "headmaster" },
  { id: "bellatrix", name: "贝拉特里克斯・莱斯特兰奇", house: "斯莱特林", role: "villain" },
];

const player = { name: "伊芙琳・塞尔温", meta: { house: "斯莱特林" }, favor: { draco: 80 } };

{
  const context = buildPresenceContext({
    userText: "我去图书馆安静看一会书。",
    period: dayPeriod("night"),
    currentState: { location: "图书馆" },
    characters: cast,
    player,
  });
  ok(context.includes("人物在场与互动约束"), "presence context is generated");
  ok(context.includes("赫敏"), "library context can naturally include Hermione");
  ok(!context.includes("德拉科・马尔福（斯莱特林）"), "unrelated high-favor Draco is not auto-included in library presence pool");
}

{
  const context = buildPresenceContext({
    userText: "我想找德拉科聊聊。",
    period: dayPeriod("night"),
    currentState: { location: "图书馆" },
    characters: cast,
    player,
  });
  ok(context.includes("玩家明确关注/寻找") && context.includes("德拉科"), "explicitly sought character is recognized");
  ok(context.includes("错过") && context.includes("不要硬塞成直接互动"), "explicit target can fail to appear naturally");
}

{
  const context = buildPresenceContext({
    userText: "我在公共休息室壁炉边坐下。",
    period: dayPeriod("night"),
    currentState: { location: "公共休息室" },
    characters: cast,
    player,
  });
  ok(context.includes("西奥多") && context.includes("布雷斯") && context.includes("达芙妮"), "same-house Slytherin students are natural in Slytherin-adjacent common room context");
}

{
  const context = buildPresenceContext({
    userText: "我登上霍格沃茨特快，看看有没有同届新生。",
    period: dayPeriod("afternoon"),
    currentState: { location: "霍格沃茨特快" },
    characters: cast,
    player,
  });
  ok(context.includes("哈利") && context.includes("罗恩"), "1991 train can include first-year peers");
  ok(!context.includes("金妮") && !context.includes("卢娜") && !context.includes("科林"), "future-year students are not pulled into 1991 first-year pool");
}

{
  const lifeLog = [{
    id: "log-1",
    location: "走廊",
    scene: "德拉科在走廊里停了一下，但没有继续说下去。",
    presentCharacterIds: ["draco"],
    interactionCharacterIds: [],
  }];
  const context = buildPresenceContext({
    userText: "我去庭院透透气。",
    period: dayPeriod("afternoon"),
    currentState: { location: "庭院" },
    lifeLog,
    characters: cast,
    player,
  });
  ok(context.includes("近期前情可回收人物") && context.includes("德拉科"), "recent presence can be recalled as continuity");
  ok(context.includes("不代表自动在场"), "recent presence is not treated as automatic appearance");
}

{
  const candidates = buildLifeEventCandidates({
    userText: "我去草药课温室照料植物。",
    period: dayPeriod("afternoon"),
    currentState: { location: "草药课温室" },
    characters: cast,
    player,
    lifeLog: [],
    limit: 3,
  });
  const rendered = candidates.map(formatEventCandidate).join("\n");
  ok(!rendered.includes("德拉科"), "event candidates do not inject high-favor characters across unrelated locations");
}

{
  const ai = "罗恩・比利尔斯・韦斯莱摇摇头：哈利不在，他大概还在古灵阁。";
  const entry = createLifeLogEntry({
    project: { currentTimeLabel: "1991年8月16日", currentState: { location: "古灵阁" } },
    periodId: "morning",
    periodLabel: "上午",
    userText: "我问罗恩哈利在哪里。",
    aiText: ai,
    characters: cast,
  });
  ok(entry.presentCharacterIds.includes("ron"), "life log detects present respondent");
  ok(!entry.presentCharacterIds.includes("harry"), "life log excludes absent mentioned target from present list");
  ok(entry.interactionCharacterIds.includes("ron") && !entry.interactionCharacterIds.includes("harry"), "life log direct interaction only includes actual respondent");
}

{
  const ai = "海格对柜台后的妖精说：邓布利多教授让我来取713号金库里的东西。";
  const present = detectCharacterRefs(ai, cast, [], { mode: "present" }).map((x) => x.id);
  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多+1；鲁伯・海格+1】`, cast, []);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, "我只是听见这句话，没有过去。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
    presentCharacterIds: present,
  });
  ok(present.includes("hagrid") && !present.includes("albus"), "command source is not marked present");
  ok(filtered.length === 0, "overheard speech without player interaction gives no favor");
}

{
  const ai = "德拉科・马尔福把落在地上的羽毛笔递给你，指尖在笔杆上停了一下。";
  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：德拉科+1】`, cast, []);
  const present = detectCharacterRefs(ai, cast, [], { mode: "present" }).map((x) => x.id);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, "我低声道谢，接过羽毛笔。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
    presentCharacterIds: present,
  });
  ok(filtered.length === 1 && filtered[0].id === "draco", "direct exchange can pass presence and interaction filters");
}

{
  const ai = "德拉科马尔福把落在地上的羽毛笔递给你，指尖在笔杆上停了一下。";
  const present = detectCharacterRefs(ai, cast, [], { mode: "present" }).map((x) => x.id);
  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：马尔福+1】`, cast, []);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, "我对马尔福道谢，接过羽毛笔。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
    presentCharacterIds: present,
  });
  ok(present.includes("draco") && filtered.length === 1 && filtered[0].id === "draco", "dotless Draco and surname interaction pass presence and evidence filters");
}

console.log(`\nPresence system tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
