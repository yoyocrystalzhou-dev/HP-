import {
  bookEntriesFromMessages,
  bookEntryFromMessage,
  bookHelperText,
  bookInputPlaceholder,
  messageText,
} from "../src/lib/bookMode.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.error("FAIL:", msg);
  }
};

{
  ok(messageText({ display: "去古灵阁", content: "hidden prompt" }) === "去古灵阁", "display text wins over hidden prompt");
  ok(messageText({ content: [{ type: "image" }, { type: "text", text: "我走向柜台" }] }) === "我走向柜台", "extracts text from multimodal content");
}

{
  const entry = bookEntryFromMessage({ id: "u1", role: "user", content: "我走进图书馆" });
  ok(entry.type === "action" && entry.label === "行动手记", "user message becomes action note");
  ok(entry.canEdit && !entry.canRewrite, "action notes are editable but not rewrite targets");
}

{
  const entry = bookEntryFromMessage({ id: "a1", role: "assistant", content: "图书馆里很安静。", streaming: true, roll: "关系变化：赫敏 +1" });
  ok(entry.type === "page" && entry.label === "正文", "assistant message becomes narrative page");
  ok(entry.streaming && entry.canRewrite && entry.roll.includes("赫敏"), "narrative pages keep streaming and margin notes");
}

{
  const calendar = bookEntryFromMessage({ id: "c1", role: "user", kind: "calendarChoice", display: "去古灵阁" });
  ok(calendar.type === "bookmark" && calendar.label === "校历安排" && calendar.text === "去古灵阁", "calendar choices become bookmarks");
  const location = bookEntryFromMessage({ id: "l1", role: "user", kind: "locationMove", display: "图书馆" });
  ok(location.type === "bookmark" && location.label === "地点移动", "location moves become stage bookmarks");
}

{
  const entries = bookEntriesFromMessages([
    { role: "user", content: "我坐下" },
    { role: "assistant", content: "烛火暗了一点。" },
  ]);
  ok(entries.length === 2 && entries[0].type === "action" && entries[1].type === "page", "converts message stream into book entries");
}

{
  ok(bookInputPlaceholder({ playerName: "伊芙琳" }).includes("伊芙琳接下来怎么做"), "world placeholder is action-note language");
  ok(!bookHelperText("world").includes("聊天") && bookHelperText("world").includes("舞台入口"), "world helper avoids chat framing");
}

console.log(`\nBook mode tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
