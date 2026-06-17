import {
  buildCalendarLifeContext,
  buildHogwartsLifeContext,
  buildLifeEventCandidates,
  formatEventCandidate,
} from "../src/lib/hogwartsLifeEngine.js";
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
  { id: "harry", name: "哈利・波特" },
  { id: "hermione", name: "赫敏・格兰杰" },
  { id: "draco", name: "德拉科・马尔福" },
  { id: "ron", name: "罗恩・韦斯莱" },
];

const lifeLog = [
  {
    id: "log-1",
    location: "图书馆",
    scene: "玩家在图书馆查到713号金库的一条旧报纸线索，但平斯夫人打断了继续翻阅。",
    presentCharacterIds: ["hermione"],
    interactionCharacterIds: [],
    clues: [{ title: "713号金库" }],
    rollLine: "线索更新：713号金库",
  },
];

{
  const candidates = buildLifeEventCandidates({
    userText: "我去图书馆查713号金库资料。",
    period: dayPeriod("night"),
    currentState: { location: "图书馆" },
    lifeLog,
    characters: cast,
    player: { favor: { hermione: 24 } },
  });
  const rendered = candidates.map(formatEventCandidate).join("\n");
  ok(candidates.length > 0 && candidates.length <= 5, "event pool returns bounded candidates");
  ok(candidates.some((c) => c.placeLabel === "图书馆"), "event pool prioritizes matched location");
  ok(candidates.some((c) => ["research_clue", "secret_clue"].includes(c.familyId)), "investigation at library suggests clue/research family");
  ok(rendered.includes("连续性") && rendered.includes("不能复读"), "repeated place/family receives progression guard");
  ok(rendered.includes("赫敏"), "likely people can include relevant favor/recent character");
}

{
  const context = buildHogwartsLifeContext({
    userText: "我在礼堂吃晚饭，随便看看周围。",
    period: dayPeriod("dinner"),
    currentTimeLabel: "1991年9月2日",
    currentState: { location: "礼堂" },
    lifeLog: [],
    characters: cast,
    player: { favor: {} },
  });
  ok(context.includes("动态事件候选"), "prompt context includes dynamic event candidates");
  ok(context.includes("礼堂"), "prompt context keeps location in candidates");
  ok(context.includes("不是按钮") && context.includes("不是固定剧情"), "event pool is framed as backend material, not fixed choices");
}

{
  const candidates = buildLifeEventCandidates({
    userText: "我深夜去禁书区翻找资料。",
    period: dayPeriod("late"),
    currentState: { location: "公共休息室" },
    lifeLog: [],
    characters: cast,
    player: { favor: {} },
  });
  ok(candidates.some((c) => c.placeLabel === "禁书区" && c.familyId === "rule_risk"), "late restricted location includes rule-risk candidate");
  ok(candidates.some((c) => c.access === "restricted" && c.risk === "high"), "restricted candidate carries access and risk metadata");
}

{
  const first = buildLifeEventCandidates({
    userText: "我在黑湖边坐一会。",
    period: dayPeriod("dinner"),
    currentState: { location: "黑湖边" },
    lifeLog: [],
    characters: cast,
    player: { favor: {} },
  })[0];
  const second = buildLifeEventCandidates({
    userText: "我在黑湖边坐一会。",
    period: dayPeriod("dinner"),
    currentState: { location: "黑湖边" },
    lifeLog: [{ id: "log-lake", location: "黑湖边", scene: "黄昏时在黑湖边坐了一会，雨后空气很湿。" }],
    characters: cast,
    player: { favor: {} },
  })[0];
  ok(first?.id && second?.id, "quiet location produces candidates with or without history");
  ok(second.continuity.includes("最近已到过黑湖边"), "same location requires visible progression/variation");
}

{
  const context = buildCalendarLifeContext(
    { label: "列车上闲逛", intent: "我想在霍格沃茨特快上走走，看看车厢里有什么人。" },
    dayPeriod("afternoon"),
    "1991年9月1日",
    { location: "霍格沃茨特快" },
    [],
    [],
    { lifeLog: [], characters: cast, player: { favor: { ron: 21 } } },
  );
  ok(context.includes("动态事件候选") && context.includes("霍格沃茨特快"), "calendar choices also receive dynamic event candidates");
}

console.log(`\nEvent pool tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
