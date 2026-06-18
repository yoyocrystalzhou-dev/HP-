import {
  currentStateForNarration,
  housePublicInStory,
  lifeLogForNarration,
  playerForNarration,
  preSortingHouseGuard,
  sanitizePlayerPersonaForNarration,
} from "../src/lib/playerKnowledge.js";

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
  name: "伊芙琳",
  persona: "姓名：伊芙琳\n身份：1991 学年新生\n学院：斯莱特林\n血统：纯血",
  meta: { house: "斯莱特林", blood: "纯血" },
};

{
  const visible = playerForNarration(player, {
    currentTimeLabel: "1991年8月16日 · 对角巷采购",
    periodId: "morning",
    currentState: { location: "对角巷" },
  });
  ok(visible.meta.house === "", "pre-sorting narration hides player house metadata");
  ok(!visible.persona.includes("学院：斯莱特林"), "pre-sorting persona redacts concrete house");
  ok(visible.persona.includes("尚未正式分院"), "pre-sorting persona keeps uncertainty instead of deleting the field entirely");
}

{
  const guard = preSortingHouseGuard(player, {
    currentTimeLabel: "1991年8月16日 · 对角巷采购",
    periodId: "morning",
    currentState: { location: "对角巷" },
  });
  ok(guard.includes("分院前学院保密") && guard.includes("果然分到") && guard.includes("无效错误记忆"), "pre-sorting guard blocks leaked house claims and stale bad memory");
}

{
  ok(!housePublicInStory({ currentTimeLabel: "1991年9月1日", periodId: "dinner", currentState: { scene: "新生队伍正在等待分院" } }), "waiting for sorting does not make house public");
  ok(!housePublicInStory({ currentTimeLabel: "1991年9月1日", periodId: "late", currentState: { location: "霍格沃茨特快", scene: "列车仍停在夜色里。" } }), "Sep 1 late train state does not imply sorting has happened");
  ok(!housePublicInStory({ currentTimeLabel: "1991年8月16日", periodId: "morning", currentState: { scene: "克里斯说你果然分在斯莱特林。" } }), "impossible pre-term sorting claim does not make house public");
  ok(housePublicInStory({ currentTimeLabel: "1991年9月1日", periodId: "dinner", currentState: { scene: "分院帽把伊芙琳分入斯莱特林。" } }), "explicit sorting scene makes house public");
  ok(housePublicInStory({ currentTimeLabel: "1991年9月2日", periodId: "morning", currentState: {} }), "school day after sorting makes house public");
}

{
  const currentState = currentStateForNarration({
    location: "对角巷",
    scene: "克里斯说你果然分在斯莱特林。",
    recentEvents: [{ content: "克里斯说你已经分到斯莱特林。" }, { content: "买到了羽毛笔。" }],
    unresolvedThreads: [{ content: "有人坚持说伊芙琳已经成了斯莱特林。" }, { content: "还有一张没买的地图。" }],
    knownFacts: [{ content: "玩家属于斯莱特林。" }],
  }, player, { currentTimeLabel: "1991年8月16日", periodId: "morning" });
  ok(!currentState.scene && currentState.recentEvents.length === 1 && currentState.recentEvents[0].content.includes("羽毛笔"), "pre-sorting current state filters stale house claims but keeps safe events");
  ok(currentState.unresolvedThreads.length === 1 && currentState.unresolvedThreads[0].content.includes("地图"), "pre-sorting current state filters stale house threads");

  const log = lifeLogForNarration([
    { id: "bad", scene: "克里斯说你果然分在斯莱特林。", assistantText: "克里斯：你果然分在斯莱特林。" },
    { id: "bad2", scene: "有人说伊芙琳已经是斯莱特林。", assistantText: "她早就是斯莱特林的人。" },
    { id: "safe", scene: "玩家在文具店挑选羽毛笔。" },
  ], player, { currentTimeLabel: "1991年8月16日", periodId: "morning", currentState: {} });
  ok(log.length === 1 && log[0].id === "safe", "pre-sorting life log filters stale house claims");
}

{
  const text = sanitizePlayerPersonaForNarration(player.persona, true);
  ok(text.includes("学院：斯莱特林"), "post-sorting persona can show concrete house");
  const post = playerForNarration(player, {
    currentTimeLabel: "1991年9月2日",
    periodId: "morning",
    currentState: {},
  });
  ok(post.meta.house === "斯莱特林" && post.persona.includes("学院：斯莱特林"), "post-sorting narration preserves house metadata");
}

console.log(`\nPlayer knowledge tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
