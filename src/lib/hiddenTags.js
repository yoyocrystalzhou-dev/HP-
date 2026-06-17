const HIDDEN_TAG_NAMES = ["日常成长", "关系变化", "线索"];

/**
 * Removes malformed or partially streamed backend tags from the final visible
 * narrative. Complete tags are parsed by their own modules; this is the final
 * safety net for dangling fragments such as "【日常成长".
 */
export function stripHiddenSystemResidue(text) {
  let cleaned = String(text || "");
  for (const name of HIDDEN_TAG_NAMES) {
    cleaned = cleaned.replace(new RegExp(`\\n?\\s*【${name}[:：][^】]*】`, "g"), "");
    cleaned = cleaned.replace(new RegExp(`\\n?\\s*【${name}(?:[:：][\\s\\S]*)?$`), "");
    cleaned = cleaned.replace(new RegExp(`\\n?\\s*【${name}[^】]*$`), "");
  }
  return cleaned.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function hiddenTagNames() {
  return [...HIDDEN_TAG_NAMES];
}
