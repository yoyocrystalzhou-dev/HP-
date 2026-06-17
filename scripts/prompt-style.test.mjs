// Verification for hidden writing-style prompt rules and backend tag cleanup.
// Run with: node scripts/prompt-style.test.mjs

import { readFileSync } from "node:fs";
import { stripHiddenSystemResidue, hiddenTagNames } from "../src/lib/hiddenTags.js";
import { AMBIGUOUS_ATMOSPHERE_STYLE, HP_NARRATION_GUARD } from "../src/lib/writingStyle.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.error("  x " + msg);
  }
};

// 1. Global HP prompt guard stays explicit and hidden-oriented.
{
  ok(AMBIGUOUS_ATMOSPHERE_STYLE.includes("隐藏文风指令") && AMBIGUOUS_ATMOSPHERE_STYLE.includes("不要说破"), "ambiguous atmosphere style remains available");
  ok(HP_NARRATION_GUARD.includes("专属于 Harry Potter / Hogwarts") && HP_NARRATION_GUARD.includes("不要提到 prompt"), "HP narration guard keeps project and meta-output boundaries");
  ok(HP_NARRATION_GUARD.includes("标签必须完整闭合"), "HP narration guard requires closed backend tags");
  ok(!HP_NARRATION_GUARD.includes("非 HP"), "HP guard does not frame the simulator as a non-HP fallback");
}

// 2. Dangling backend tags are stripped from visible narrative.
{
  const growth = stripHiddenSystemResidue("烛火轻轻晃了一下。\n\n【日常成长");
  ok(growth === "烛火轻轻晃了一下。", "dangling daily growth tag is removed");

  const rel = stripHiddenSystemResidue("他把书推近了一点。\n【关系变化：德拉科+1");
  ok(rel === "他把书推近了一点。", "dangling relationship tag is removed");

  const clue = stripHiddenSystemResidue("纸条只露出半句警告。\n【线索：类型=日常小支线；标题=门口的纸条");
  ok(clue === "纸条只露出半句警告。", "dangling clue tag is removed");

  const complete = stripHiddenSystemResidue("他没有立刻退开。\n【关系变化：德拉科+1】\n雨声还在窗外。");
  ok(complete === "他没有立刻退开。\n雨声还在窗外。", "complete backend tag is removed from visible stream text");
}

// 3. Non-system Chinese brackets survive cleanup.
{
  const ordinary = "她把《霍格沃茨，一段校史》合上，又看了一眼【校报】边栏。";
  ok(stripHiddenSystemResidue(ordinary) === ordinary, "ordinary bracketed text survives cleanup");
  ok(hiddenTagNames().join("、") === "日常成长、关系变化、线索", "hidden tag list remains narrow");
}

// 4. App wiring injects the guard and applies final visible cleanup.
{
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  ok(app.includes("HP_NARRATION_GUARD") && app.includes("parts.push(HP_NARRATION_GUARD)"), "App injects HP narration guard into system prompt");
  ok(app.includes("stripHiddenSystemResidue("), "App cleans final visible text after parsing backend tags");
  ok(app.includes("const visibleChunk = stripHiddenSystemResidue(chunk)") && app.includes("content: visibleChunk"), "App cleans streaming chunks before display");
}

console.log(`\nPrompt/style tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
