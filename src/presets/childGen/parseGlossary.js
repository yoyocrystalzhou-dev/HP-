/**
 * 专用名词卡.txt → 世界书条目（关键词触发注入）。
 *
 * 源格式：每条一行「术语（English）：定义…」；章节标题为「一、…」「（一）…」（无冒号，自动跳过）。
 * 产出：{ id, title, keywords, content, enabled }，keywords 为逗号分隔串（含中文术语 + 英文别名）。
 * 纯函数。
 */

import { uid } from "../../lib/utils.js";

// 术语：开头不含标点/空格的 2–16 字；可带（English）；其后必须有冒号 + 定义。
const ENTRY_RE = /^([^：:（(。，、；\s]{2,16})(?:（([^）]*)）)?\s*[:：]\s*(.+)$/;

export function parseGlossary(raw) {
  const lines = String(raw || "").split(/\r?\n/);
  const out = [];
  const seen = new Set();

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(ENTRY_RE);
    if (!m) continue;
    const term = m[1].trim();
    const english = (m[2] || "").trim();
    const def = m[3].trim();
    if (!term || !def || def.length < 4) continue;
    if (seen.has(term)) continue;
    seen.add(term);

    const keywords = [term, english].filter(Boolean).join(",");
    out.push({ id: uid(), title: english ? `${term}（${english}）` : term, keywords, content: def, enabled: true });
  }
  return out;
}
