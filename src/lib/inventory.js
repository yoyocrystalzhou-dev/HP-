import { labelSortKey } from "./timeline.js";

const now = () => Date.now();
const compact = (text) => String(text || "").replace(/\s+/g, "");
const hasAny = (text, words) => words.some((word) => text.includes(word));

export const ITEM_CATALOG = {
  admission_letter: { label: "霍格沃茨录取通知书", category: "证件", aliases: ["录取通知书", "通知书"] },
  shopping_list: { label: "入学用品清单", category: "证件", aliases: ["购物清单", "用品清单", "入学清单"] },
  wizard_money: { label: "巫师货币", category: "货币", aliases: ["加隆", "西可", "纳特", "巫师货币", "金币"] },
  wand: { label: "魔杖", category: "魔法物品", aliases: ["魔杖", "奥利凡德"] },
  school_robes: { label: "校袍", category: "服装", aliases: ["校袍", "长袍", "摩金夫人"] },
  school_books: { label: "一年级课本", category: "书本", aliases: ["课本", "教材", "丽痕书店", "书店"] },
  cauldron: { label: "坩埚", category: "魔药器材", aliases: ["坩埚"] },
  potion_kit: { label: "魔药材料包", category: "魔药器材", aliases: ["药材", "魔药材料", "材料包", "魔药材料店"] },
  scales_phials: { label: "天平与玻璃小瓶", category: "魔药器材", aliases: ["天平", "玻璃小瓶", "小瓶"] },
  telescope: { label: "望远镜", category: "学习用品", aliases: ["望远镜", "天文"] },
  quill_parchment: { label: "羽毛笔与羊皮纸", category: "学习用品", aliases: ["羽毛笔", "羊皮纸", "墨水"] },
  trunk: { label: "学生行李箱", category: "行李", aliases: ["行李箱", "箱子"] },
  owl: { label: "猫头鹰", category: "宠物", aliases: ["猫头鹰", "猫头鹰商店"] },
  cat: { label: "猫", category: "宠物", aliases: ["猫", "猫咪"] },
  toad: { label: "蟾蜍", category: "宠物", aliases: ["蟾蜍"] },
  broom: { label: "飞天扫帚", category: "飞行用品", aliases: ["扫帚", "飞天扫帚", "魁地奇精品店"] },
  sweets: { label: "糖果", category: "礼物", aliases: ["糖果", "巧克力蛙", "比比多味豆", "蜂蜜公爵"] },
};

export const REQUIRED_SCHOOL_ITEM_IDS = [
  "wand",
  "school_robes",
  "school_books",
  "cauldron",
  "potion_kit",
  "scales_phials",
  "telescope",
  "quill_parchment",
];

export const PURCHASE_CHECKLIST = [
  { id: "wand", required: true, shop: "奥利凡德魔杖店", group: "魔法核心" },
  { id: "school_robes", required: true, shop: "摩金夫人长袍店", group: "制服" },
  { id: "school_books", required: true, shop: "丽痕书店", group: "课本" },
  { id: "cauldron", required: true, shop: "坩埚店/魔药材料店", group: "魔药器材" },
  { id: "potion_kit", required: true, shop: "魔药材料店", group: "魔药器材" },
  { id: "scales_phials", required: true, shop: "魔药材料店", group: "魔药器材" },
  { id: "telescope", required: true, shop: "天文用品店", group: "学习用品" },
  { id: "quill_parchment", required: true, shop: "文具店", group: "学习用品" },
  { id: "wizard_money", required: false, shop: "古灵阁", group: "采购准备" },
  { id: "trunk", required: false, shop: "行李店", group: "行李" },
  { id: "owl", required: false, shop: "咿啦猫头鹰商店", group: "宠物" },
  { id: "cat", required: false, shop: "宠物店", group: "宠物" },
  { id: "toad", required: false, shop: "宠物店", group: "宠物" },
  { id: "broom", required: false, shop: "魁地奇精品店", group: "飞行用品" },
  { id: "sweets", required: false, shop: "糖果店", group: "零食/礼物" },
];

export const INVENTORY_HISTORY_LIMIT = 30;

export function createInitialInventory() {
  return normalizeInventory({
    items: {
      admission_letter: createInventoryItem("admission_letter", { source: "开局持有" }),
      shopping_list: createInventoryItem("shopping_list", { source: "开局持有" }),
    },
  });
}

export function createInventoryItem(id, partial = {}) {
  const catalog = ITEM_CATALOG[id] || {};
  return {
    id,
    label: partial.label || catalog.label || id,
    category: partial.category || catalog.category || "物品",
    qty: Math.max(1, Number(partial.qty || 1)),
    source: partial.source || "",
    notes: partial.notes || "",
    acquiredAt: partial.acquiredAt || now(),
  };
}

export function normalizeInventory(inventory) {
  const items = {};
  const rawItems = inventory?.items || {};
  if (Array.isArray(rawItems)) {
    for (const entry of rawItems) if (entry?.id) items[entry.id] = createInventoryItem(entry.id, entry);
  } else {
    for (const [id, entry] of Object.entries(rawItems)) items[id] = createInventoryItem(id, { id, ...entry });
  }
  return {
    items,
    notes: Array.isArray(inventory?.notes) ? inventory.notes : [],
    history: Array.isArray(inventory?.history) ? inventory.history.slice(0, INVENTORY_HISTORY_LIMIT) : [],
    updatedAt: inventory?.updatedAt || now(),
  };
}

export function hasItem(inventory, id) {
  return !!normalizeInventory(inventory).items[id];
}

export function missingRequiredItems(inventory) {
  return missingRequiredItemEntries(inventory).map((entry) => entry.label);
}

export function shoppingProgress(inventory) {
  const inv = normalizeInventory(inventory);
  const entries = PURCHASE_CHECKLIST.map((entry) => {
    const catalog = ITEM_CATALOG[entry.id] || {};
    const owned = !!inv.items[entry.id];
    return {
      ...entry,
      label: catalog.label || entry.id,
      category: catalog.category || entry.group || "物品",
      owned,
      item: inv.items[entry.id] || null,
    };
  });
  const required = entries.filter((entry) => entry.required);
  const requiredOwned = required.filter((entry) => entry.owned);
  const missingRequired = required.filter((entry) => !entry.owned);
  const optionalOwned = entries.filter((entry) => !entry.required && entry.owned);
  return {
    entries,
    required,
    requiredOwned,
    missingRequired,
    optionalOwned,
    requiredTotal: required.length,
    requiredOwnedCount: requiredOwned.length,
    percent: required.length ? Math.round((requiredOwned.length / required.length) * 100) : 100,
    complete: missingRequired.length === 0,
  };
}

export function missingRequiredItemEntries(inventory) {
  return shoppingProgress(inventory).missingRequired;
}

export function applyInventoryChanges(inventory, changes = []) {
  const inv = normalizeInventory(inventory);
  let changed = false;
  const history = [...(inv.history || [])];
  const mergeNotes = (...values) => [...new Set(values
    .flatMap((value) => String(value || "").split("；"))
    .map((value) => value.trim())
    .filter(Boolean))].join("；");
  for (const change of changes) {
    if (!change?.id) continue;
    const existing = inv.items[change.id];
    const catalog = ITEM_CATALOG[change.id] || {};
    const acquiredAt = existing?.acquiredAt || change.acquiredAt || now();
    inv.items[change.id] = createInventoryItem(change.id, {
      ...existing,
      ...change,
      qty: Math.max(Number(existing?.qty || 0), Number(change.qty || 1)),
      source: change.source || existing?.source || "",
      notes: mergeNotes(existing?.notes, change.notes),
      acquiredAt,
    });
    if (!existing) {
      history.unshift({
        id: change.id,
        label: change.label || catalog.label || change.id,
        source: change.source || "",
        notes: change.notes || "",
        acquiredAt,
      });
    }
    changed = true;
  }
  return changed ? { ...inv, history: history.slice(0, INVENTORY_HISTORY_LIMIT), updatedAt: now() } : inv;
}

function item(id, source, notes = "") {
  return { id, source, notes };
}

const PURCHASE_WORDS = ["买", "购买", "采购", "选购", "挑选", "买下", "付款", "结账", "配齐", "补齐", "准备好", "置办", "带走", "订购"];
const LOOK_ONLY_WORDS = ["看看", "看一眼", "橱窗", "路过", "打量", "参观", "问问", "了解", "随便逛", "逛逛"];

function isShoppingContext(text, currentTimeLabel = "") {
  const key = labelSortKey(currentTimeLabel);
  return (key && key < 19910901) || hasAny(text, [
    "对角巷", "古灵阁", "奥利凡德", "摩金夫人", "丽痕书店", "魔药材料店",
    "魁地奇精品店", "宠物店", "采购", "购买", "买", "挑选",
  ]);
}

function hasPurchaseIntent(text) {
  return hasAny(text, PURCHASE_WORDS) || /(?:取|兑换).{0,6}(钱|金币|加隆|巫师货币)/.test(text);
}

function isLookOnly(text) {
  return hasAny(text, LOOK_ONLY_WORDS) && !hasPurchaseIntent(text);
}

function hasNegatedAcquire(text, words = []) {
  const terms = words.map((word) => String(word || "").trim()).filter(Boolean);
  if (!terms.length) return false;
  const pattern = terms.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`(?:不|没|没有|暂不|先不|不打算|不准备).{0,8}(?:${pattern})|(?:${pattern}).{0,8}(?:不买|没买|没有买|暂不买|先不买)`).test(text);
}

function shouldAcquire(text, aliases = [], strongPhrases = []) {
  if (hasNegatedAcquire(text, [...aliases, ...strongPhrases])) return false;
  if (hasAny(text, strongPhrases)) return true;
  if (!hasAny(text, aliases)) return false;
  if (isLookOnly(text)) return false;
  return hasPurchaseIntent(text);
}

export function inferShoppingChanges(text, { currentTimeLabel = "", wandMeta = null } = {}) {
  const raw = compact(text);
  if (!raw || !isShoppingContext(raw, currentTimeLabel)) return [];
  const changes = [];

  if (hasAny(raw, ["兑换", "取钱", "取金币", "换加隆"]) || shouldAcquire(raw, ["巫师货币", "金币", "加隆"], ["兑换巫师货币", "准备巫师货币", "取出加隆"])) {
    changes.push(item("wizard_money", "古灵阁", "已准备采购用的巫师货币。"));
  }
  if (shouldAcquire(raw, ["奥利凡德", "魔杖"], ["挑选魔杖", "买魔杖", "魔杖选择", "让魔杖选择"])) {
    const notes = wandMeta?.wood && wandMeta?.core ? `${wandMeta.wood} · ${wandMeta.core}` : "";
    changes.push(item("wand", "奥利凡德魔杖店", notes));
  }
  if (shouldAcquire(raw, ["摩金夫人", "长袍店", "校袍"], ["买校袍", "量校袍"])) {
    changes.push(item("school_robes", "摩金夫人长袍店"));
  }
  if (shouldAcquire(raw, ["丽痕书店", "课本", "教材", "书店"], ["买课本", "买教材", "买课本材料"])) {
    changes.push(item("school_books", "丽痕书店"));
  }
  if (shouldAcquire(raw, ["魔药材料店", "坩埚", "药材", "魔药材料"], ["买课本材料", "买材料", "买坩埚", "买魔药材料"])) {
    changes.push(item("cauldron", "对角巷采购"));
    changes.push(item("potion_kit", "对角巷采购"));
    changes.push(item("scales_phials", "对角巷采购"));
  }
  if (shouldAcquire(raw, ["望远镜", "天文用品"], ["买望远镜"])) changes.push(item("telescope", "对角巷采购"));
  if (shouldAcquire(raw, ["羽毛笔", "羊皮纸", "墨水", "文具"], ["买文具", "买羽毛笔", "买羊皮纸"])) changes.push(item("quill_parchment", "对角巷采购"));
  if (shouldAcquire(raw, ["行李箱", "箱子"], ["买行李箱", "收拾行李"])) changes.push(item("trunk", "对角巷采购"));
  if (shouldAcquire(raw, ["猫头鹰"], ["买猫头鹰", "买一只猫头鹰", "挑一只猫头鹰", "带走猫头鹰"])) changes.push(item("owl", "宠物店"));
  else if (shouldAcquire(raw, ["蟾蜍"], ["买蟾蜍", "买一只蟾蜍"])) changes.push(item("toad", "宠物店"));
  else if (shouldAcquire(raw, ["猫咪", "宠物猫"], ["买猫", "买一只猫", "挑一只猫"])) changes.push(item("cat", "宠物店"));
  if (shouldAcquire(raw, ["魁地奇精品店", "飞天扫帚", "扫帚"], ["买扫帚", "买飞天扫帚", "买下一把飞天扫帚"])) changes.push(item("broom", "魁地奇精品店"));
  if (shouldAcquire(raw, ["糖果", "巧克力蛙", "比比多味豆", "蜂蜜公爵"], ["买糖果", "买巧克力蛙", "买比比多味豆"])) changes.push(item("sweets", "对角巷/糖果店"));

  const seen = new Set();
  return changes.filter((change) => {
    if (seen.has(change.id)) return false;
    seen.add(change.id);
    return true;
  });
}

export function formatInventoryChangeLine(changes = []) {
  if (!changes.length) return "";
  return `🎒 获得物品：${changes.map((change) => ITEM_CATALOG[change.id]?.label || change.id).join("、")}`;
}

export function formatInventoryBlock(inventory) {
  const inv = normalizeInventory(inventory);
  const items = Object.values(inv.items);
  const owned = items.length ? items.map((i) => `${i.label}${i.notes ? `（${i.notes}）` : ""}`).join("、") : "无明确记录";
  const progress = shoppingProgress(inv);
  const missing = progress.missingRequired;
  const recent = (inv.history || []).slice(0, 5).map((entry) => `${entry.label}${entry.source ? `（${entry.source}）` : ""}`);
  return [
    "【玩家物品 / 背包】",
    `已确认拥有：${owned}`,
    `入学采购进度：${progress.requiredOwnedCount}/${progress.requiredTotal}（${progress.percent}%）`,
    missing.length ? `入学用品待购：${missing.map((entry) => `${entry.label}@${entry.shop}`).join("、")}` : "入学用品：核心用品已齐。",
    recent.length ? `最近入手：${recent.join("、")}` : "",
  ].filter(Boolean).join("\n");
}

export const INVENTORY_RULES =
  "【物品与拥有关系规则】\n" +
  "- 只有【玩家物品 / 背包】里明确拥有的物品，才能被当作玩家当前可使用物品。\n" +
  "- 不要因为玩家随口提到斗篷、地图、扫帚、宠物或特殊道具，就默认 TA 已拥有；若背包没有，写成想象、借用意图、需要购买、需要向别人借，或无法直接使用。\n" +
  "- 课堂和公共器材可以由学校提供，但私人物品、礼物、特殊道具和长期装备必须经过剧情获得或采购记录。\n" +
  "- 对角巷采购可以自然补齐入学用品；若清单仍有待购物品，请通过店铺、整理行李、家人提醒或采购日程自然提示，不要硬塞任务板。\n" +
  "- 同一物品再次出现时，请体现为检查、整理、使用、借出、遗失或被别人注意到，而不是重复购买刷收益。";
