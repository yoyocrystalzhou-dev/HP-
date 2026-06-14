/**
 * Phase 6A: parse a plain-text (.txt) file into character drafts. Pure, local,
 * no API. A "heading" line starts a new character; the lines until the next
 * heading become that character's persona.
 *
 * Heading rules (v1):
 *   1. Markdown:  "# 哈利·波特" / "## 德拉科·马尔福"  (1–6 '#', then a space)
 *   2. Colon:     "哈利·波特：" / "德拉科·马尔福:"     (whole line is name + colon)
 *   - A line whose colon has content AFTER it (e.g. "年龄：17") is NOT a heading.
 *   - A name longer than NAME_MAX is NOT treated as a heading (avoids matching
 *     a long sentence that happens to end with a colon).
 *
 * Output: [{ name, persona, avatar: "🙂" }]. Names are required; empty persona
 * is allowed. Text before the first heading is ignored.
 */

const NAME_MAX = 40;

// Section titles that are never character names (e.g. "社交圈与态度：").
const SECTION_BLACKLIST = new Set([
  "基础信息",
  "容貌与衣着",
  "性格特质",
  "思想深度与三观",
  "爱好与喜恶",
  "人生经历",
  "深刻回忆",
  "社交圈与态度",
  "后续人生经历",
  "经典台词与口头禅",
]);

/** Validate a candidate heading name: trimmed, length-capped, not blacklisted. */
function validName(raw) {
  const name = (raw || "").trim();
  if (!name || name.length > NAME_MAX) return null;
  if (SECTION_BLACKLIST.has(name)) return null;
  return name;
}

/** Return the character name if `line` is a heading, else null. */
function headingName(line) {
  const t = line.trim();
  if (!t) return null;

  const md = t.match(/^#{1,6}\s+(.+?)\s*$/);
  if (md) return validName(md[1]);

  const num = t.match(/^\d+\.\s*(.+)$/);
  if (num) return validName(num[1]);

  const colon = t.match(/^(.+?)\s*[:：]\s*$/);
  if (colon) return validName(colon[1]);

  return null;
}

function finalize(current) {
  const persona = current.lines.join("\n").replace(/^\s+|\s+$/g, "");
  return { name: current.name, persona, avatar: "🙂" };
}

export function parseCharacterDrafts(text) {
  const lines = String(text || "").split(/\r?\n/);
  const drafts = [];
  let current = null; // { name, lines: [] }

  for (const line of lines) {
    const name = headingName(line);
    if (name) {
      if (current) drafts.push(finalize(current));
      current = { name, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
    // lines before the first heading are ignored
  }
  if (current) drafts.push(finalize(current));

  return drafts.filter((d) => d.name);
}
