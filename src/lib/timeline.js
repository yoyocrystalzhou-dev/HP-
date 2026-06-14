/**
 * 时间线引擎（通用，作用于任意 canonTimeline 节点表）。
 *
 * 职责：把项目的「当前时间」(currentTimeLabel) 映射到原著节点，并产出注入 prompt
 * 的「原著剧情锚点」——这是防跑偏的核心：让 AI 在当前时间点上，依据原著正在发生的
 * 事件叙事，而不是自由漂移。
 *
 * 时间「推进」由 App 控制（见 P5-2）；本模块只做无副作用的查询与文本生成。
 */

/** 把「1991年9月1日 · 开学」这类标签转成可比较的 sortKey（缺省 month/day 记 0）。 */
export function labelSortKey(label) {
  const m = String(label || "").match(/(\d{4})\s*年(?:\s*(\d{1,2})\s*月)?(?:\s*(\d{1,2})\s*日)?/);
  if (!m) return 0;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 0;
  const d = m[3] ? Number(m[3]) : 0;
  return y * 10000 + mo * 100 + d;
}

/** 当前时间所处的原著节点：sortKey ≤ 当前时间 的最后一个节点（节点表已按 sortKey 升序）。 */
export function currentBeat(label, nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  const k = labelSortKey(label);
  let beat = nodes[0];
  for (const n of nodes) {
    if (n.sortKey <= k) beat = n;
    else break;
  }
  return beat;
}

/** 紧随当前节点之后的下一个原著节点（用于推进）。 */
export function nextBeat(label, nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  const k = labelSortKey(label);
  for (const n of nodes) if (n.sortKey > k) return n;
  return null;
}

/** 从「第一部 · 魔法石（1991–1992）」提取紧凑学年名（如「魔法石」）。 */
export function phaseName(node) {
  if (!node?.part) return "";
  const m = node.part.match(/·\s*([^（(]+)/);
  return (m ? m[1] : node.part).trim();
}

/**
 * 混合节奏的自动推进（每完成一轮对话调用一次）。
 *   - 日常节点（routine）：停留约 ROUTINE_DWELL 轮后推进到下一节点；
 *   - 原著大事件（major）：停留约 MAJOR_DWELL 轮，让事件有足够篇幅自然发生；
 *   - 已到时间线末尾则不再推进。
 * 纯函数：返回新的 { label, beatProgress, advanced, passed }，由调用方写回项目。
 */
export const ROUTINE_DWELL = 2;
export const MAJOR_DWELL = 5;

export function advanceTime(currentLabel, nodes, beatProgress) {
  const beat = currentBeat(currentLabel, nodes);
  const nb = nextBeat(currentLabel, nodes);
  if (!nb) return { label: currentLabel, beatProgress: beatProgress || 0, advanced: false, passed: null };
  const dwell = beat?.weight === "major" ? MAJOR_DWELL : ROUTINE_DWELL;
  const count = (beatProgress || 0) + 1;
  if (count >= dwell) return { label: nb.raw, beatProgress: 0, advanced: true, passed: beat };
  return { label: currentLabel, beatProgress: count, advanced: false, passed: null };
}

/** 生成注入 prompt 的「原著剧情锚点」文本块。 */
export function canonAnchor(node) {
  if (!node) return "";
  const lines = [
    `【当前阶段 · 原著剧情锚点（${node.part}｜${node.raw}）】`,
    `此刻原著正在发生：${node.event}`,
  ];
  if (node.people) lines.push(`相关人物：${node.people}`);
  lines.push(
    "要求：在玩家自由行动的同时，让这一原著事件在其周围自然发生、与原著保持一致；" +
      "不得提前剧透更后面的剧情，也不得让这一既定事件不发生。"
  );
  return lines.join("\n");
}
