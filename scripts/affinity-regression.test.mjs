import {
  filterRelationshipDeltasByEvidence,
  inferFavorDeltas,
  parseRelationshipDeltas,
} from "../src/lib/affinity.js";

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
  { id: "harry", name: "哈利·波特" },
  { id: "ron", name: "罗恩·韦斯莱" },
  { id: "hermione", name: "赫敏·格兰杰" },
  { id: "draco", name: "德拉科·马尔福" },
  { id: "albus", name: "阿不思·珀西瓦尔·伍尔弗里克·布赖恩·邓布利多" },
  { id: "hagrid", name: "鲁伯·海格" },
  { id: "bellatrix", name: "贝拉特里克斯·莱斯特兰奇" },
  { id: "snape", name: "西弗勒斯·斯内普" },
];
const ocs = [{ id: "oc-emily", name: "艾米丽", kind: "oc" }];

const rejects = [
  {
    name: "古灵阁背景路过",
    user: "我从古灵阁金库取完钱，准备离开。",
    ai: "海格正侧身给后面的人让路。哈利·波特初次进入古灵阁，绿色眼睛微微睁大。伊芙琳只是擦肩而过，听见海格压低声音对柜台后的妖精说：邓布利多教授让我来取713号金库里的那个小东西。",
    tag: "哈利+1；鲁伯·海格+1；阿不思·珀西瓦尔·伍尔弗里克·布赖恩·邓布利多+1",
  },
  {
    name: "家族姓氏不是人物",
    user: "我跟着拉环离开金库。",
    ai: "拉环头也不回地说：那是莱斯特兰奇家的金库守卫龙。",
    tag: "贝拉特里克斯·莱斯特兰奇+1",
  },
  {
    name: "NPC 自己说话但没有对玩家",
    user: "我站在人群外继续观察。",
    ai: "德拉科·马尔福对旁边的男孩说：父亲会知道这件事的。你没有靠近。",
    tag: "德拉科+1",
  },
  {
    name: "只听见名字",
    user: "我低头整理钱袋，听见旁边有人提到哈利。",
    ai: "人群里有人说起哈利·波特的名字，但声音很快被柜台的嘈杂盖过去。",
    tag: "哈利+1",
  },
  {
    name: "询问 A 关于 B 只允许 A",
    user: "我问罗恩哈利在哪里。",
    ai: "罗恩摇摇头：哈利不在，他大概还在古灵阁。",
    tag: "哈利+1",
  },
  {
    name: "同场吃饭没有互动",
    user: "我坐在长桌末端，安静吃早餐。",
    ai: "哈利、罗恩和赫敏在长桌另一端低声讨论课程，没有注意到你。",
    tag: "哈利+1；罗恩+1；赫敏+1",
  },
  {
    name: "课堂提到教授不等于好感",
    user: "我翻开魔药课本，记下重点。",
    ai: "斯内普教授的名字印在课程表上，旁边还有一行细小的教室编号。",
    tag: "西弗勒斯·斯内普+1",
  },
  {
    name: "看到 OC 但不靠近",
    user: "我远远看见艾米丽在窗边，没有过去。",
    ai: "艾米丽把书页翻过去，没有和你交谈。",
    tag: "艾米丽+1",
  },
  {
    name: "NPC 看向你但玩家没有社交意图",
    user: "我继续沿着走廊往前走。",
    ai: "哈利·波特似乎看向你这边，但很快又低头跟海格说话。",
    tag: "哈利+1",
  },
  {
    name: "按钮式继续不应触发",
    user: "继续逛逛",
    ai: "罗恩·韦斯莱在糖果架旁笑出声，哈利也跟着回头看了一眼货架。",
    tag: "罗恩+1；哈利+1",
  },
  {
    name: "背景邀请别人不等于邀请玩家",
    user: "我在店门口停了一下。",
    ai: "德拉科邀请另一个斯莱特林新生去看扫帚，声音从你身后传来。",
    tag: "德拉科+1",
  },
  {
    name: "提到邓布利多命令不等于邓布利多在场",
    user: "我注意到海格压低了声音。",
    ai: "海格对柜台说，邓布利多教授让他来取一样东西。",
    tag: "阿不思·珀西瓦尔·伍尔弗里克·布赖恩·邓布利多+1；鲁伯·海格+1",
  },
];

for (const item of rejects) {
  const inferred = inferFavorDeltas(item.user, cast, ocs, {
    aiText: item.ai,
    playerName: "伊芙琳·塞尔温",
    maxEntries: 6,
  });
  ok(inferred.length === 0 || (item.name === "询问 A 关于 B 只允许 A" && inferred.every((x) => x.id === "ron")), `${item.name}: infer rejects absent/background`);

  const parsed = parseRelationshipDeltas(`${item.ai}\n【关系变化：${item.tag}】`, cast, ocs);
  const filtered = filterRelationshipDeltasByEvidence(parsed.entries, item.user, cast, ocs, {
    aiText: item.ai,
    playerName: "伊芙琳·塞尔温",
  });
  if (item.name === "询问 A 关于 B 只允许 A") {
    ok(filtered.every((x) => x.id !== "harry"), `${item.name}: filters absent B`);
  } else {
    ok(filtered.length === 0, `${item.name}: filters wrong relationship tag`);
  }
}

const allows = [
  {
    name: "点名打招呼",
    user: "我向哈利打招呼，问他能不能一起坐。",
    ai: "哈利·波特抬起头，对你露出一个有些紧张的笑：当然可以。",
    expect: ["harry"],
  },
  {
    name: "开放式提问由在场人物回应",
    user: "我问能不能坐在这里。",
    ai: "罗恩·韦斯莱把书包挪开，让你坐下。",
    expect: ["ron"],
  },
  {
    name: "群体社交中具名回应者",
    user: "我向他们打招呼，问能不能一起坐。",
    ai: "哈利：当然可以。罗恩笑着挪开书包，赫敏抬头回应你的问题。",
    expect: ["harry", "ron", "hermione"],
  },
  {
    name: "OC 直接回应玩家",
    user: "我向艾米丽道谢。",
    ai: "艾米丽轻轻点头，对你笑了笑。",
    expect: ["oc-emily"],
  },
];

for (const item of allows) {
  const inferred = inferFavorDeltas(item.user, cast, ocs, {
    aiText: item.ai,
    playerName: "伊芙琳·塞尔温",
    maxEntries: 6,
  });
  for (const id of item.expect) {
    ok(inferred.some((x) => x.id === id), `${item.name}: allows ${id}`);
  }
}

console.log(`\nAffinity regression tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
