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
    updatedAt: inventory?.updatedAt || now(),
  };
}

export function hasItem(inventory, id) {
  return !!normalizeInventory(inventory).items[id];
}

export function missingRequiredItems(inventory) {
  const inv = normalizeInventory(inventory);
  return REQUIRED_SCHOOL_ITEM_IDS.filter((id) => !inv.items[id]).map((id) => ITEM_CATALOG[id]?.label || id);
}

export function applyInventoryChanges(inventory, changes = []) {
  const inv = normalizeInventory(inventory);
  let changed = false;
  for (const change of changes) {
    if (!change?.id) continue;
    const existing = inv.items[change.id];
    inv.items[change.id] = createInventoryItem(change.id, {
      ...existing,
      ...change,
      qty: Math.max(Number(existing?.qty || 0), Number(change.qty || 1)),
      source: change.source || existing?.source || "",
      notes: [existing?.notes, change.notes].filter(Boolean).join("；"),
      acquiredAt: existing?.acquiredAt || change.acquiredAt || now(),
    });
    changed = true;
  }
  return changed ? { ...inv, updatedAt: now() } : inv;
}

function item(id, source, notes = "") {
  return { id, source, notes };
}

function isShoppingContext(text, currentTimeLabel = "") {
  const key = labelSortKey(currentTimeLabel);
  return (key && key < 19910901) || hasAny(text, [
    "对角巷", "古灵阁", "奥利凡德", "摩金夫人", "丽痕书店", "魔药材料店",
    "魁地奇精品店", "宠物店", "采购", "购买", "买", "挑选",
  ]);
}

export function inferShoppingChanges(text, { currentTimeLabel = "", wandMeta = null } = {}) {
  const raw = compact(text);
  if (!raw || !isShoppingContext(raw, currentTimeLabel)) return [];
  const changes = [];

  if (hasAny(raw, ["古灵阁", "兑换", "取钱", "金币", "加隆", "巫师货币"])) {
    changes.push(item("wizard_money", "古灵阁", "已准备采购用的巫师货币。"));
  }
  if (hasAny(raw, ["奥利凡德", "挑选魔杖", "买魔杖", "魔杖选择"])) {
    const notes = wandMeta?.wood && wandMeta?.core ? `${wandMeta.wood} · ${wandMeta.core}` : "";
    changes.push(item("wand", "奥利凡德魔杖店", notes));
  }
  if (hasAny(raw, ["摩金夫人", "买校袍", "量校袍", "长袍店", "校袍"])) {
    changes.push(item("school_robes", "摩金夫人长袍店"));
  }
  if (hasAny(raw, ["丽痕书店", "买课本", "课本", "教材", "书店"])) {
    changes.push(item("school_books", "丽痕书店"));
  }
  if (hasAny(raw, ["魔药材料店", "坩埚", "药材", "魔药材料", "买课本材料", "买材料"])) {
    changes.push(item("cauldron", "对角巷采购"));
    changes.push(item("potion_kit", "对角巷采购"));
    changes.push(item("scales_phials", "对角巷采购"));
  }
  if (hasAny(raw, ["望远镜", "天文用品"])) changes.push(item("telescope", "对角巷采购"));
  if (hasAny(raw, ["羽毛笔", "羊皮纸", "墨水", "文具"])) changes.push(item("quill_parchment", "对角巷采购"));
  if (hasAny(raw, ["行李箱", "箱子", "收拾行李"])) changes.push(item("trunk", "对角巷采购"));
  if (hasAny(raw, ["猫头鹰"])) changes.push(item("owl", "宠物店"));
  else if (hasAny(raw, ["蟾蜍"])) changes.push(item("toad", "宠物店"));
  else if (hasAny(raw, ["买猫", "猫咪", "宠物猫"])) changes.push(item("cat", "宠物店"));
  if (hasAny(raw, ["魁地奇精品店", "飞天扫帚", "买扫帚", "扫帚"])) changes.push(item("broom", "魁地奇精品店"));
  if (hasAny(raw, ["糖果", "巧克力蛙", "比比多味豆", "蜂蜜公爵"])) changes.push(item("sweets", "对角巷/糖果店"));

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
  const missing = missingRequiredItems(inv);
  return [
    "【玩家物品 / 背包】",
    `已确认拥有：${owned}`,
    missing.length ? `入学用品未确认：${missing.join("、")}` : "入学用品：核心用品已齐。",
  ].join("\n");
}

export const INVENTORY_RULES =
  "【物品与拥有关系规则】\n" +
  "- 只有【玩家物品 / 背包】里明确拥有的物品，才能被当作玩家当前可使用物品。\n" +
  "- 不要因为玩家随口提到斗篷、地图、扫帚、宠物或特殊道具，就默认 TA 已拥有；若背包没有，写成想象、借用意图、需要购买、需要向别人借，或无法直接使用。\n" +
  "- 课堂和公共器材可以由学校提供，但私人物品、礼物、特殊道具和长期装备必须经过剧情获得或采购记录。\n" +
  "- 对角巷采购可以自然补齐入学用品；同一物品再次出现时，请体现为检查、整理、使用或遗失，而不是重复购买刷收益。";
