import { filterRelationshipDeltasByEvidence, parseRelationshipDeltas } from "../src/lib/affinity.js";
import { detectCharacterRefs } from "../src/lib/lifeLog.js";

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
  { id: "ron", name: "罗恩・韦斯莱" },
  { id: "hermione", name: "赫敏・格兰杰" },
  { id: "albus", name: "阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多" },
  { id: "hagrid", name: "鲁伯・海格" },
];

{
  const ai = "罗恩・韦斯莱把书包挪开，让你坐下。赫敏这个名字只出现在课本封面上。";
  const present = detectCharacterRefs(`我问能不能坐在这里。\n${ai}`, cast, [], { mode: "present" }).map((x) => x.id);
  ok(present.includes("ron"), "present lock detects real respondent");
  ok(!present.includes("hermione"), "present lock excludes mentioned-only character");

  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：罗恩+1；赫敏+1】`, cast, []);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, "我问能不能坐在这里。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
    presentCharacterIds: present,
  });
  ok(filtered.length === 1 && filtered[0].id === "ron", "relationship deltas are limited to present people");
}

{
  const ai = "人群里有人提到哈利・波特，但很快换了话题。";
  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：哈利+1】`, cast, []);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, "我低头整理钱袋，没有过去。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
    presentCharacterIds: [],
  });
  ok(filtered.length === 0, "empty present list blocks all relationship deltas");
}

{
  const ai = "海格对柜台说：邓布利多教授让我来取713号金库里的东西。";
  const present = detectCharacterRefs(ai, cast, [], { mode: "present" }).map((x) => x.id);
  ok(present.includes("hagrid"), "speaker can be present");
  ok(!present.includes("albus"), "command source is not present");
  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多+1；鲁伯・海格+1】`, cast, []);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, "我注意到海格压低了声音。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
    presentCharacterIds: present,
  });
  ok(filtered.every((entry) => entry.id !== "albus"), "presence lock rejects mentioned authority figure");
}

{
  const ai = [
    "靠近大门处，海格弯腰对哈利・波特说着什么。",
    "哈利手里攥着旧钱袋，仰头望着柜台上的金加隆，绿眼睛里写满了不可置信。",
  ].join("");
  const present = detectCharacterRefs(ai, cast, [], { mode: "present" }).map((x) => x.id);
  ok(present.includes("harry") && present.includes("hagrid"), "visible canon characters can be marked present");
  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：哈利+1；海格+1】`, cast, []);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, "我只是从他们身边走过，没有停下。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
    presentCharacterIds: present,
  });
  ok(filtered.length === 0, "present but non-interacting characters do not gain favor");
}

{
  const ai = "罗恩・韦斯莱把书包挪开，让你坐下。";
  const parsed = parseRelationshipDeltas(`${ai}\n【关系变化：罗恩+1】`, cast, []);
  const compatible = filterRelationshipDeltasByEvidence(parsed.entries, "我问能不能坐在这里。", cast, [], {
    aiText: ai,
    playerName: "伊芙琳・塞尔温",
  });
  ok(compatible.length === 1 && compatible[0].id === "ron", "calls without presence lock remain backward compatible");
}

console.log(`\nPresence lock tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
