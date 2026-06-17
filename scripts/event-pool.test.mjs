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
  ok(rendered.includes("推进方式") && candidates.some((c) => c.progression), "repeated event candidates carry concrete progression mode");
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
  ok(!context.includes("当前是晚饭后，通常不适合直接展开"), "natural dinner location is not marked as timing mismatch");
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
  const context = buildHogwartsLifeContext({
    userText: "我上午去禁书区翻找资料。",
    period: dayPeriod("morning"),
    currentTimeLabel: "1991年9月3日",
    currentState: { location: "图书馆" },
    lifeLog: [],
    characters: cast,
    player: { favor: {} },
  });
  ok(context.includes("地点/时间约束"), "context includes location/time constraints for unnatural location");
  ok(context.includes("禁书区") && context.includes("当前是上午") && context.includes("更自然的时段是夜晚、深夜"), "restricted section mismatch names current and natural periods");
  ok(context.includes("限制区域") && context.includes("巡查"), "restricted access warning requires risk framing");
}

{
  const context = buildHogwartsLifeContext({
    userText: "我回图书馆继续查713号金库。",
    period: dayPeriod("night"),
    currentTimeLabel: "1991年9月4日",
    currentState: { location: "图书馆" },
    lifeLog,
    characters: cast,
    player: { favor: { hermione: 24 } },
  });
  ok(context.includes("具体前情回收"), "context includes concrete scene continuity block");
  ok(context.includes("旧报纸线索") && context.includes("平斯夫人"), "continuity block preserves exact prior scene details");
  ok(context.includes("不要重写同一幕"), "continuity block forbids replaying the same scene");
}

{
  const context = buildHogwartsLifeContext({
    userText: "我走进文具店挑羽毛笔，刚才在魔药材料店闻到的月长石粉末味道还留在袖口。",
    period: dayPeriod("afternoon"),
    currentTimeLabel: "1991年8月16日 · 对角巷采购",
    currentState: { location: "斯克里布鲁斯文具店" },
    lifeLog: [{
      id: "log-potion",
      location: "魔药材料店",
      scene: "玩家在魔药材料店听店员提到月长石粉末短缺。",
      assistantText: "月长石粉末被装进玻璃瓶里，店员压低声音说最近货不多。",
      presentCharacterIds: [],
      interactionCharacterIds: [],
    }, {
      id: "log-malkin",
      location: "摩金夫人长袍店",
      scene: "德拉科在摩金夫人长袍店和玩家交谈后一起离开。",
      presentCharacterIds: ["draco"],
      interactionCharacterIds: ["draco"],
    }],
    characters: cast,
    player: { favor: { draco: 1 } },
  });
  ok(context.includes("斯克里布鲁斯文具店"), "stationery shop is recognized as the current location");
  ok(context.includes("场景记忆隔离") && context.includes("不得把上一家店的商品/材料"), "context explicitly blocks old shop item leakage");
  ok(context.includes("魔药材料店前情") && context.includes("这是已发生的过去"), "previous potion shop memory is marked as past");
  ok(context.includes("摩金夫人长袍店前情") && context.includes("已离开"), "prior Draco departure remains a past continuity hint");
  ok(!context.includes("- 魔药材料店 ×"), "previous potion shop does not become a current dynamic event candidate");
  ok(!context.includes("斯克里布鲁斯文具店 × 魔法小事故：魔药气味不对"), "stationery shop mishaps do not reuse potion-shop variants");
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
