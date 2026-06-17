import {
  REQUIRED_SCHOOL_ITEM_IDS,
  applyInventoryChanges,
  createInitialInventory,
  formatInventoryBlock,
  inferShoppingChanges,
  missingRequiredItemEntries,
  missingRequiredItems,
  shoppingProgress,
} from "../src/lib/inventory.js";

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
  const inv = createInitialInventory();
  const progress = shoppingProgress(inv);
  ok(progress.requiredTotal === REQUIRED_SCHOOL_ITEM_IDS.length, "checklist tracks all required school items");
  ok(progress.requiredOwnedCount === 0 && progress.percent === 0, "initial required shopping progress starts at zero");
  ok(missingRequiredItems(inv).includes("魔杖"), "legacy missingRequiredItems still returns labels");
  ok(missingRequiredItemEntries(inv).some((entry) => entry.label === "魔杖" && entry.shop.includes("奥利凡德")), "missing entries include shop hints");
}

{
  const inv = createInitialInventory();
  const changes = inferShoppingChanges(
    "我去古灵阁取钱，到奥利凡德买魔杖，去摩金夫人买校袍，丽痕书店买课本，又买坩埚、魔药材料、天平、玻璃小瓶、望远镜、羽毛笔、羊皮纸和墨水。",
    { currentTimeLabel: "1991年8月16日 · 对角巷采购", wandMeta: { wood: "冬青木", core: "凤凰羽毛" } },
  );
  const updated = applyInventoryChanges(inv, changes);
  const progress = shoppingProgress(updated);
  ok(progress.complete && progress.percent === 100, "all required purchases complete the school checklist");
  ok(progress.optionalOwned.some((entry) => entry.id === "wizard_money"), "optional preparation items are tracked separately");
  ok(updated.history.length === changes.length, "new acquisitions are written to inventory history");
}

{
  const inv = createInitialInventory();
  const changes = inferShoppingChanges("我去奥利凡德买魔杖。", { currentTimeLabel: "1991年8月16日", wandMeta: { wood: "冬青木", core: "凤凰羽毛" } });
  const once = applyInventoryChanges(inv, changes);
  const twice = applyInventoryChanges(once, changes);
  ok(twice.items.wand.qty === 1, "repeated purchase keeps quantity at one");
  ok(twice.history.filter((entry) => entry.id === "wand").length === 1, "repeated purchase does not add duplicate acquisition history");
  ok(twice.items.wand.notes === "冬青木 · 凤凰羽毛", "repeated purchase does not duplicate item notes");
}

{
  const inv = applyInventoryChanges(createInitialInventory(), inferShoppingChanges("我去奥利凡德买魔杖。", { currentTimeLabel: "1991年8月16日" }));
  const block = formatInventoryBlock(inv);
  ok(block.includes("入学采购进度") && block.includes("待购") && block.includes("@"), "inventory prompt block includes progress and shop-aware missing list");
  ok(block.includes("最近入手"), "inventory prompt block includes recent acquisition history");
}

{
  const noShop = inferShoppingChanges("我在课堂上把课本翻到第一页。", { currentTimeLabel: "1991年9月3日" });
  ok(noShop.length === 0, "non-shopping school usage does not invent purchases");
}

console.log(`\nInventory checklist tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
