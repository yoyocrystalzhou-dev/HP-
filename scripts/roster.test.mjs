import { createCharacter } from "../src/lib/projects.js";
import { ROSTER } from "../src/presets/childGen/roster.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.error("FAIL:", msg);
  }
};

const names = new Set(ROSTER.map((c) => c.name));
[
  "西奥多・诺特",
  "布雷斯・扎比尼",
  "达芙妮・格林格拉斯",
  "文森特・克拉布",
  "格雷戈里・高尔",
  "米莉森・伯斯德",
  "苏珊・博恩斯",
  "厄尼・麦克米兰",
  "贾斯廷・芬列里",
  "帕德玛・佩蒂尔",
  "泰瑞・布特",
  "菲利乌斯・弗立维",
  "波莫娜・斯普劳特",
  "阿格斯・费尔奇",
].forEach((name) => ok(names.has(name), `roster contains ${name}`));

const duplicateNames = ROSTER.map((c) => c.name).filter((name, index, all) => all.indexOf(name) !== index);
ok(duplicateNames.length === 0, "roster has no duplicate names");

const theo = ROSTER.find((c) => c.name === "西奥多・诺特");
const character = createCharacter(theo);
ok(character.house === "斯莱特林", "createCharacter preserves house");
ok(character.role === "student", "createCharacter preserves role");
ok(character.persona.includes("慢热社交"), "fallback persona is preserved");

console.log(`\nRoster tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
