// Verification for restricted HP clues and recoverable side mysteries.
// Run with: node scripts/clue-system.test.mjs

import { activeClues, createClue, formatCluesBlock, mergeClues, parseClueTags } from "../src/lib/clues.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.error("  x " + msg);
  }
};

// 1. Daily clues must remain small and recoverable.
{
  const small = parseClueTags("正文\n【线索：类型=日常小支线；标题=丢失的羽毛笔；阶段=初见；人物=室友；进展=室友怀疑有人误拿；期限=2】");
  ok(small.cleaned === "正文" && small.entries.length === 1, "small daily clue is hidden and accepted");
  ok(small.entries[0].turnsLeft === 2 && small.entries[0].scale === "小", "small daily clue keeps short deadline and small scale");

  const medium = parseClueTags("【线索：类型=角色关系；标题=德拉科没有回话；规模=中；阶段=怀疑；人物=德拉科；进展=他听见姓氏后停顿了一下；期限=3】");
  ok(medium.entries.length === 1 && medium.entries[0].type === "relationship", "medium relationship clue is accepted");
}

// 2. Large or invented world mysteries cannot be smuggled through daily/relationship clues.
{
  ok(createClue({ type: "daily", title: "大谜团", scale: "大" }).scale === "大", "large scale is preserved instead of downgraded");

  const large = parseClueTags("【线索：类型=日常小支线；标题=寝室暗号；规模=大；阶段=初见；人物=室友；进展=暗号似乎牵连整个魔法界；期限=3】");
  ok(large.entries.length === 0, "large daily clue is rejected");

  const worldLine = parseClueTags("【线索：类型=日常小支线；标题=世界线裂缝；阶段=初见；进展=一个未知组织似乎要改写原著；期限=3】");
  ok(worldLine.entries.length === 0, "invented world-line mystery is rejected");

  const bloodline = parseClueTags("【线索：类型=角色关系；标题=血脉钥匙；阶段=初见；人物=室友；进展=传闻她的血脉是打开创始人遗物的钥匙；期限=3】");
  ok(bloodline.entries.length === 0, "bloodline/key/founder-style mystery is rejected");
}

// 3. Canon clues require real HP anchors, including later-year anchors.
{
  const stone = parseClueTags("【线索：类型=原著回声；标题=禁书区借阅记录；原著关联=尼可·勒梅/魔法石；阶段=怀疑；人物=赫敏；进展=有人最近查过尼可·勒梅；期限=3】");
  ok(stone.entries.length === 1 && stone.entries[0].type === "canon", "first-year canon clue is accepted");

  const chamber = parseClueTags("【线索：类型=原著回声；标题=墙上的血字；原著关联=密室/蛇怪；阶段=怀疑；人物=金妮；进展=走廊墙上的血字引发恐慌；期限=3】");
  ok(chamber.entries.length === 1 && chamber.entries[0].canon.includes("密室"), "second-year canon clue is accepted");

  const horcrux = parseClueTags("【线索：类型=原著回声；标题=旧记忆里的空白；原著关联=魂器/斯拉格霍恩；阶段=怀疑；人物=邓布利多；进展=记忆被刻意处理过；期限=3】");
  ok(horcrux.entries.length === 1 && horcrux.entries[0].canon.includes("魂器"), "later-year canon clue is accepted when anchored");

  const fakeCanon = parseClueTags("【线索：类型=原著回声；标题=塞尔温家族徽章；原著关联=家族密令；阶段=怀疑；进展=徽章背后似乎藏着秘密；期限=3】");
  ok(fakeCanon.entries.length === 0, "canon clue without HP anchor is rejected");

  const contaminated = parseClueTags("【线索：类型=原著回声；标题=魔法石背后的新组织；原著关联=魔法石/未知组织；阶段=怀疑；进展=一个未知组织声称控制魔法石；期限=3】");
  ok(contaminated.entries.length === 0, "canon clue contaminated by invented world mystery is rejected");
}

// 4. Merging updates advances or resolves a clue without keeping stale deadlines.
{
  const first = parseClueTags("【线索：类型=日常小支线；标题=丢失的羽毛笔；阶段=初见；人物=室友；进展=室友怀疑有人误拿；期限=2】");
  const merged = mergeClues([], first.entries);
  ok(activeClues(merged.clues).length === 1, "new accepted clue becomes active");

  const resolved = parseClueTags("【线索：类型=日常小支线；标题=丢失的羽毛笔；阶段=已收束；人物=室友；进展=羽毛笔在书包夹层里找到了；期限=0】");
  const closed = mergeClues(merged.clues, resolved.entries);
  ok(closed.clues[0].status === "resolved" && closed.clues[0].turnsLeft === 0, "resolved update can set deadline to zero");
  ok(activeClues(closed.clues).length === 0, "resolved clue is no longer active");
}

// 5. Prompt block reminds the model to keep active clues bounded.
{
  const clue = parseClueTags("【线索：类型=日常小支线；标题=门口的纸条；阶段=怀疑；人物=级长；进展=纸条只写了半句警告；期限=1】");
  const block = formatCluesBlock(mergeClues([], clue.entries).clues);
  ok(block.includes("不可扩成新世界观谜团") && block.includes("剩余收束期：1"), "active clue prompt carries bounded-mystery guard");
}

// 6. Legacy invalid clues are filtered from active prompts and future merges.
{
  const legacyBad = createClue({
    type: "daily",
    title: "未知组织",
    scale: "大",
    progress: "一个未知组织影响魔法界命运",
    turnsLeft: 3,
  });
  ok(activeClues([legacyBad]).length === 0, "legacy invalid clue is not active");

  const nextSmall = parseClueTags("【线索：类型=日常小支线；标题=门口的纸条；阶段=初见；人物=级长；进展=纸条只写了半句警告；期限=1】");
  const merged = mergeClues([legacyBad], nextSmall.entries);
  ok(merged.clues.length === 1 && merged.clues[0].title === "门口的纸条", "merge purges legacy invalid clue while keeping valid incoming clue");
}

console.log(`\nClue system tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
