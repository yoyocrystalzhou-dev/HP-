/**
 * 人物群像卡.txt 专用解析器（子世代）。
 *
 * 为什么不用通用的 importChars：该文件是三遍重复、标题格式不一致的脏数据——
 *   - 同一角色有「初版 / （完整）/ （补完）/ （续）」多个片段；
 *   - 补充小节（双胞胎 / 食死徒）缺少编号标题，通用解析会把它们吞进上一条；
 *   - 还有「（已完整，见前文）」的 0 字存根。
 *
 * 解法：**名册锚定 + 字段级合并**。
 *   1. 只有当一行去掉编号/井号/尾部括号后，等于名册里的规范名，才算「角色标题」。
 *      （章节标题如「（三）赫奇帕奇核心角色」因不在名册中而被忽略。）
 *   2. 角色卡内每行都是「字段名：内容」（基础信息：… / 性格特质：… / 经典台词…：…）。
 *      按字段名归类，同一角色同一字段在多个片段中出现时，**保留最长的版本**，
 *      从而自动合并「完整版/续」等片段、去掉短存根。
 *   3. 按固定字段顺序拼出干净 persona。
 *
 * 输出：[{ name, persona, avatar }]，按名册顺序。纯函数，无副作用。
 */

const FIELD_ORDER = [
  "基础信息",
  "容貌与衣着",
  "性格特质",
  "思想深度与三观",
  "爱好与喜恶",
  "人生经历",
  "深刻回忆",
  "社交圈与态度",
  "社交圈",
  "对社交圈",
  "对陌生人",
  "对敌对势力",
  "后续人生经历",
  "经典台词与口头禅",
];

/** 取一行的字段名：开头到第一个「：」「（」之间的 2–12 个非分隔字符。无则返回 null。 */
function labelOf(line) {
  const m = line.match(/^([^：:（(]{2,12})[：:（(]/);
  return m ? m[1].trim() : null;
}

/** 一行若是角色标题，返回其规范名；否则 null。去掉「N.」「#」与尾部「（…）」后比对名册。 */
function canonicalName(line, rosterNames) {
  let t = line.trim();
  t = t.replace(/^\d+\.\s*/, ""); // 去编号 "1. "
  t = t.replace(/^#{1,6}\s*/, ""); // 去 markdown "#"
  t = t.replace(/（[^）]*）\s*$/u, ""); // 去一层尾部全角括号
  t = t.replace(/（[^）]*）\s*$/u, ""); // 再去一层（防双括号）
  t = t.trim();
  return rosterNames.includes(t) ? t : null;
}

export function parsePersona(raw, rosterNames) {
  const lines = String(raw || "").split(/\r?\n/);

  // name -> Map(label -> 最长内容行)
  const fields = new Map(rosterNames.map((n) => [n, new Map()]));
  let cur = null;

  for (const line of lines) {
    const canon = canonicalName(line, rosterNames);
    if (canon) {
      cur = canon;
      continue;
    }
    if (!cur) continue;
    const lbl = labelOf(line);
    if (!lbl) continue; // 无字段标签的行（章节标题、空行）跳过
    const val = line.trim();
    const bag = fields.get(cur);
    if (val.length > (bag.get(lbl)?.length || 0)) bag.set(lbl, val);
  }

  const out = [];
  for (const name of rosterNames) {
    const bag = fields.get(name);
    if (!bag || bag.size === 0) continue; // 没有任何实质内容 → 跳过

    const ordered = [];
    const used = new Set();
    for (const key of FIELD_ORDER) {
      if (bag.has(key)) {
        ordered.push(bag.get(key));
        used.add(key);
      }
    }
    for (const [k, v] of bag) if (!used.has(k)) ordered.push(v); // 兜底：未预期的字段

    out.push({ name, persona: ordered.join("\n"), avatar: "🪄" });
  }
  return out;
}
