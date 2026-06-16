/**
 * 好感度系统（HP 专项）。canon 角色与 OC 通用。
 *
 * 原则：好感度只能由程序结算（社交行动 /社交 触发亲和检定），AI 不得自行宣布关系升级。
 * 自由对话仍可发展剧情，但不动好感度数值。
 * 好感度存玩家层：player.favor = { [charId]: 0-100 }。
 */

export const FAVOR_MAX = 100;
export const CONFESSION_THRESHOLD = 60;

/** 好感度 → 阶段。 */
export function favorStage(v, relationship = null) {
  const status = relationship?.status || relationship?.stage || "";
  if (status === "恋人") return "恋人";
  const n = Number(v || 0);
  if (n >= CONFESSION_THRESHOLD) return "心动";
  if (n >= 41) return "亲密朋友";
  if (n >= 21) return "朋友";
  return "陌生";
}

/** 检定等级 → 好感度增减。 */
export function favorDelta(tier) {
  return { 大成功: 6, 成功: 3, 失败: 0, 大失败: -2 }[tier] ?? 0;
}

/** 在 canon 角色 + OC 里按名字宽松匹配。返回 { id, name, kind } 或 null。 */
export function findCharacter(name, characters = [], ocs = []) {
  const q = String(name || "").trim();
  if (!q) return null;
  const all = [
    ...(characters || []).map((c) => ({ id: c.id, name: c.name, kind: "canon" })),
    ...(ocs || []).map((o) => ({ id: o.id, name: o.name, kind: "oc" })),
  ];
  return (
    all.find((c) => c.name === q) ||
    all.find((c) => c.name.includes(q) || q.includes(c.name)) ||
    all.find((c) => c.name.split(/[·・]/)[0] === q) ||
    null
  );
}

/** 注入 prompt：玩家已建立的关系（好感度>0）。让 AI 据此体现亲疏。 */
export function formatFavorBlock(favor = {}, nameById = {}) {
  const lines = Object.entries(favor)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => `${nameById[id] || id}：${favorStage(v)}（好感度 ${Math.round(v)}）`);
  if (!lines.length) return null;
  return (
    "【玩家与角色的好感度（据此体现亲疏；不得自行宣布关系跨级升级；好感度≥60只是心动/可告白，不等于恋人）】\n- " +
    lines.join("\n- ")
  );
}

/** 注入 prompt：本次社交对象的当前关系（给 AI 这一轮的依据）。 */
export function socialAnchor(targetName, newFavor) {
  return (
    `社交对象：${targetName}，当前好感度 ${Math.round(newFavor)}（${favorStage(newFavor)}）。` +
    `请按此亲疏自然演绎这次社交的结果；好感度变化已由系统结算，你不得自行宣布关系跨级升级。若达到心动，也必须等系统告白结果才能成为恋人。`
  );
}

const REL_LIMIT = 3;

/** AI 只能建议日常关系小幅变化，系统解析、限幅并清洗标签。 */
export function parseRelationshipDeltas(text, characters = [], ocs = []) {
  const raw = String(text || "");
  const entries = [];
  const cleaned = raw.replace(/【关系变化[:：]([^】]+)】/g, (_, body) => {
    const parts = String(body || "").split(/[；;、，,\n]+/);
    for (const part of parts) {
      const m = part.trim().match(/^(.{1,18}?)([+-＋－])\s*(\d{1,2})(?:\s*[:：]\s*(.{1,40}))?$/);
      if (!m) continue;
      const target = findCharacter(m[1].trim(), characters, ocs);
      if (!target) continue;
      const sign = m[2] === "-" || m[2] === "－" ? -1 : 1;
      const delta = Math.max(-REL_LIMIT, Math.min(REL_LIMIT, sign * Number(m[3])));
      if (delta) entries.push({ id: target.id, name: target.name, kind: target.kind, delta, note: (m[4] || "").trim() });
    }
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();

  return { cleaned, entries };
}

export function applyRelationshipDeltas(player, entries = []) {
  const next = {
    ...player,
    favor: { ...(player?.favor || {}) },
    state: {
      ...(player?.state || {}),
      relationships: { ...(player?.state?.relationships || {}) },
    },
  };
  const applied = [];

  for (const entry of entries) {
    const oldValue = Number(next.favor[entry.id] || 0);
    const value = Math.max(0, Math.min(FAVOR_MAX, oldValue + entry.delta));
    next.favor[entry.id] = value;

    const rel = next.state.relationships[entry.id] || {};
    next.state.relationships[entry.id] = {
      ...rel,
      status: rel.status === "恋人" ? "恋人" : favorStage(value),
      feeling: entry.note || rel.feeling || "",
      updatedAt: Date.now(),
    };
    applied.push({ ...entry, oldValue, value, stage: favorStage(value, next.state.relationships[entry.id]) });
  }

  return { player: next, applied };
}

export function formatRelationshipDeltaLine(applied = []) {
  if (!applied.length) return "";
  return "💛 关系变化：" + applied
    .map((x) => `${x.name} ${x.delta > 0 ? "+" : ""}${x.delta} → ${Math.round(x.value)}（${x.stage}）`)
    .join(" · ");
}

export function relationshipRulesBlock(characters = [], ocs = []) {
  const names = [
    ...(characters || []).map((c) => c.name).filter(Boolean),
    ...(ocs || []).map((o) => o.name).filter(Boolean),
  ].slice(0, 80);
  return (
    "【关系与好感度规则（重要，务必执行）】\n" +
    "- 好感度只由系统结算；你不得在正文里写出具体数值，也不得自行宣布关系跨级、恋人或婚约。\n" +
    "- 只要本轮玩家与某个可识别角色发生了直接互动（交谈、同行、帮忙、关心、冲突、并肩经历等），就必须在回复的最后另起一行，输出结构化标签：\n" +
    "  【关系变化：角色名+1】\n" +
    "  多个角色用「；」分隔，例如：【关系变化：哈利+1；罗恩-1】。\n" +
    "- 仅擦肩而过、远远看见、单方面回忆或猜测，不写标签。\n" +
    "- 幅度要小：普通友好/尴尬 ±1，明显互助/冲突 ±2，强烈共同经历最多 ±3。\n" +
    "- 好感度≥60 只是心动/可告白，不等于恋人；恋人必须由系统告白结算成功后才成立。\n" +
    "- 标签只在回复最末单独成行，正文里不要出现「好感度」「+N」之类字样。\n" +
    "- 可识别角色名：" + (names.join("、") || "当前暂无") + "。"
  );
}

/**
 * 兜底：当 AI 本轮没有给出【关系变化】标签，或只漏写了部分参与者时，从本轮可见文本里
 * 识别"直接互动到的角色"，给予小幅 +1。只看玩家输入 + AI 可见回复，避免命中隐藏上下文。
 */
export function inferFavorDeltas(userText, characters = [], ocs = [], opts = {}) {
  const playerText = String(userText || "").trim();
  const aiText = String(opts.aiText || "").trim();
  const playerName = String(opts.playerName || "").trim();
  const text = [playerText, aiText].filter(Boolean).join("\n");
  if (!text) return [];
  const maxEntries = Math.max(1, Math.min(6, Number(opts.maxEntries || 4)));
  const all = [
    ...(characters || []).map((c) => ({ id: c.id, name: c.name, kind: "canon" })),
    ...(ocs || []).map((o) => ({ id: o.id, name: o.name, kind: "oc" })),
  ].filter((c) => c.id && c.name);

  const compactPlayer = playerText.replace(/\s+/g, "");
  const compactAi = aiText.replace(/\s+/g, "");
  const groupIntent = /(?:大家|他们|她们|几个人|同学们|三人|两人|一起|都|所有人)/.test(compactPlayer);
  const interactionWords = [
    "说", "问", "答", "回应", "聊天", "交谈", "打招呼", "介绍", "邀请", "同行", "一起", "坐下",
    "递给", "接过", "帮", "帮助", "安慰", "感谢", "道歉", "解释", "劝", "提醒", "看向",
    "笑", "点头", "摇头", "握手", "并肩", "保护", "挡住", "争执", "对峙", "找", "走向", "靠近",
  ];
  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const aliasesFor = (name) => {
    const parts = String(name || "").split(/[·・]/).filter(Boolean);
    return [...new Set([name, parts[0]].filter((x) => x && x.length >= 2))];
  };
  const hasAlias = (source, aliases) => aliases.some((alias) => source.includes(alias));
  const hasDialogue = (source, aliases) => aliases.some((alias) => new RegExp(`${escapeRegExp(alias)}[：:]`).test(source));
  const playerAliases = [...new Set(["你", "玩家", playerName, ...String(playerName || "").split(/[·・]/)].filter((x) => x && x.length >= 1))];
  const mentionsPlayer = (source) => playerAliases.some((alias) => source.includes(alias));
  const isReferenceOnly = (source, aliases) => aliases.some((alias) => {
    const name = escapeRegExp(alias);
    return new RegExp(
      `(打听|问起|提起|谈到|聊起|说起|想到|想起|听说|关于).{0,18}${name}|` +
      `${name}(?:现在|今天|到底|究竟|人|他|她|最近|刚才)?(在哪|在哪里|去哪|去哪里|在不在|是否在|有没有来|有没有到|情况|消息|下落|去向|名字|不在|没来|没有出现|不见)`
    ).test(source);
  });
  const hasPlayerInteractionNear = (source, aliases) => {
    for (const alias of aliases) {
      const i = source.indexOf(alias);
      if (i < 0) continue;
      const window = source.slice(Math.max(0, i - 28), i + alias.length + 36);
      if (/(没有|没|不).{0,8}(过去|靠近|说话|交谈|聊天|回应|打招呼|互动)|远远|只是看|只看|没有过去/.test(window)) continue;
      if (isReferenceOnly(window, [alias])) continue;
      if (new RegExp(`(向|对|跟|和|找|邀请|安慰|帮助|帮|给|递给|问|请求|拜托|告诉|打招呼|道歉|说服)${escapeRegExp(alias)}`).test(window)) return true;
      if (new RegExp(`${escapeRegExp(alias)}(说话|交谈|聊天|同行|一起|坐下|握手|并肩|对峙|争执)`).test(window)) return true;
    }
    return false;
  };
  const hasAiDirectToPlayer = (source, aliases) => {
    for (const alias of aliases) {
      const i = source.indexOf(alias);
      if (i < 0) continue;
      const window = source.slice(Math.max(0, i - 30), i + alias.length + 56);
      if (/(没有|没|不).{0,8}(过去|靠近|说话|交谈|聊天|回应|打招呼|互动)|远远|只是看|只看|没有过去/.test(window)) continue;
      if (isReferenceOnly(window, [alias])) continue;
      const name = escapeRegExp(alias);
      const directToPlayer = playerAliases.some((p) => {
        const actor = escapeRegExp(p);
        return new RegExp(`${name}.{0,18}(对|向|朝|冲|看向|望向|转向|递给|交给|问|回答|回应|点头|微笑|笑|招手|让座|挪开|拍了拍).{0,18}${actor}|${name}[：:].{0,40}${actor}|${actor}.{0,16}(对|向|问|邀请|安慰|帮助|叫住).{0,16}${name}`).test(window);
      });
      if (directToPlayer) return true;
      if (groupIntent && interactionWords.some((word) => window.includes(word))) return true;
    }
    return false;
  };
  const absentInAi = (aliases) => aliases.some((alias) => {
    const name = escapeRegExp(alias);
    return new RegExp(`${name}(?:现在|今天|到底|究竟|人|他|她|最近|刚才)?(不在|没来|没有出现|不见|不在场|已经离开|并未出现|没有和你|没和你)`).test(compactAi);
  });

  const scored = [];
  for (const c of all) {
    const aliases = aliasesFor(c.name);
    const mentionedByPlayer = hasAlias(compactPlayer, aliases);
    const mentionedByAi = hasAlias(compactAi, aliases);
    if (!mentionedByPlayer && !mentionedByAi) continue;
    const speaks = hasDialogue(aiText, aliases);
    const playerInteracted = hasPlayerInteractionNear(compactPlayer, aliases);
    const aiInteracted = hasAiDirectToPlayer(compactAi, aliases);
    const directEvidence = playerInteracted || aiInteracted || (groupIntent && speaks);
    const referenceOnly = isReferenceOnly(compactPlayer, aliases) || isReferenceOnly(compactAi, aliases);
    if ((absentInAi(aliases) || referenceOnly) && !directEvidence) continue;
    let score = 0;
    if (mentionedByPlayer && playerInteracted) score += 4;
    else if (mentionedByPlayer) score += 1;
    if (groupIntent && speaks) score += 4;
    if (aiInteracted) score += 3;
    if (groupIntent && aiInteracted) score += 2;
    if (mentionedByAi && !directEvidence && !mentionedByPlayer) score -= 2;
    if (directEvidence && score >= 3) scored.push({ ...c, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "zh-Hans-CN"))
    .slice(0, maxEntries)
    .map((c) => ({ id: c.id, name: c.name, kind: c.kind, delta: 1, note: "" }));
}

export function filterRelationshipDeltasByEvidence(entries = [], userText, characters = [], ocs = [], opts = {}) {
  if (!entries.length) return [];
  const evidence = inferFavorDeltas(userText, characters, ocs, {
    aiText: opts.aiText || "",
    playerName: opts.playerName || "",
    maxEntries: 6,
  });
  const allowed = new Set(evidence.map((entry) => entry.id));
  return entries.filter((entry) => allowed.has(entry.id));
}
