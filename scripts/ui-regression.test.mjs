// Lightweight UI contract checks for the HP kiosk shell.
// Run with: node scripts/ui-regression.test.mjs

import { readFileSync } from "node:fs";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.error("  x " + msg);
  }
};

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const status = readFileSync(new URL("../src/components/StatusBar.jsx", import.meta.url), "utf8");
const character = readFileSync(new URL("../src/components/CharacterPanel.jsx", import.meta.url), "utf8");
const atmosphere = readFileSync(new URL("../src/components/hpAtmosphere.jsx", import.meta.url), "utf8");

ok(app.includes("const inputMaxHeight = isMobile ? 76 : 180"), "mobile input max height stays compact");
ok(app.includes("{!isMobile && currentCanonBeat"), "mobile date line does not force canon phase text into the header");
ok(app.includes("<BackgroundOrnaments tone={hpTone} />"), "day theme renders background ornaments outside text cards");
ok(app.includes("width: isMobile ? \"100%\" : \"min(92vw, 560px)\""), "mobile HP sheets use bottom-sheet width");
ok(app.includes("行动手记") && app.includes("页边批注") && app.includes("地点舞台"), "HP world shell presents interaction-book language");
ok(!app.includes("描述你的行动 / 回应场景"), "HP input no longer uses chat-style placeholder text");
ok(atmosphere.includes("const size = mobile ? 34 : 58"), "mobile foil title stays compact");

for (const forbidden of ["⚡", "🏆", "🎒", "📚", "💛", "🧩", "✨ 原创角色", "🪄"]) {
  ok(!status.includes(forbidden), `status panel avoids system emoji marker ${forbidden}`);
}
ok(!status.includes("/休息"), "status panel avoids slash-command instructions");

ok(!character.includes("一对一聊天入口展示"), "profile-only people panel does not expose hidden character-chat explanation");

console.log(`\nUI regression tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
