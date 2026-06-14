/**
 * 把「哈利波特编年时间线.txt」解析成有序的原著节点表 canonTimeline。
 *
 * 源格式高度规整，三行一组：
 *   1991年10月31日
 *   人物：哈利、罗恩、赫敏、奇洛、麦格
 *   事件：万圣节前夜……三人合力在女生厕所制服巨怪，从此结为好友。
 * 并以「第X部 · 名称（起讫年）」分部。
 *
 * 产出每个节点：{ id, raw, part, year, month, day, sortKey, people, event, weight }
 *   - sortKey 用于排序与「当前时间落在哪个节点」的判定（day 缺省按当月初处理）。
 *   - weight: "major"（原著大事件，需强锚定）/ "routine"（日常/过渡）。
 * 纯函数，无副作用。
 */

const DATE_RE = /^(\d{4})\s*年/;
const PART_RE = /^(第[一二三四五六七八九十]+部|尾声)/;

// 原著「必发生」的大事件关键词 → 标记 weight=major
const MAJOR_KW = [
  "巨怪", "山怪", "魔法石", "密室", "蛇怪", "日记", "魂器", "摄魂怪", "小天狼星",
  "三强", "火焰杯", "伏地魔", "复活", "邓布利多军", "神秘事务司", "混血王子",
  "邓布利多", "决战", "霍格沃茨战役", "纳吉尼", "分院",
];

function parseDate(raw) {
  const m = raw.match(/(\d{4})\s*年(?:\s*(\d{1,2})\s*[–\-~]?\s*\d{0,2}\s*月)?(?:\s*(\d{1,2})\s*日)?/);
  const year = m ? Number(m[1]) : 0;
  const month = m && m[2] ? Number(m[2]) : 0;
  const day = m && m[3] ? Number(m[3]) : 0;
  return { year, month, day, sortKey: year * 10000 + month * 100 + day };
}

export function parseCanonTimeline(raw) {
  const lines = String(raw || "").split(/\r?\n/).map((l) => l.trim());
  const nodes = [];
  let part = "";
  let cur = null;
  let seq = 0;

  const flush = () => {
    if (cur && (cur.event || cur.people)) {
      const event = cur.event || "";
      cur.weight = MAJOR_KW.some((k) => event.includes(k)) ? "major" : "routine";
      nodes.push(cur);
    }
    cur = null;
  };

  for (const line of lines) {
    if (!line) continue;
    if (PART_RE.test(line)) { flush(); part = line; continue; }
    if (DATE_RE.test(line)) {
      flush();
      const d = parseDate(line);
      cur = { id: `canon-${++seq}`, raw: line, part, ...d, people: "", event: "" };
      continue;
    }
    if (!cur) continue;
    if (line.startsWith("人物：")) cur.people = line.slice(3).trim();
    else if (line.startsWith("事件：")) cur.event = line.slice(3).trim();
  }
  flush();

  nodes.sort((a, b) => a.sortKey - b.sortKey);
  return nodes;
}
