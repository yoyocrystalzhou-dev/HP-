export function messageText(message = {}) {
  if (typeof message.display === "string") return message.display;
  if (typeof message.content === "string") return message.content;
  const textPart = Array.isArray(message.content)
    ? message.content.find((part) => part.type === "text")
    : null;
  return textPart?.text || "";
}

export function bookEntryFromMessage(message = {}, index = 0) {
  const id = message.id || `idx-${index}`;
  const text = messageText(message);
  const roll = typeof message.roll === "string" ? message.roll.trim() : "";

  if (message.kind === "calendarChoice") {
    return {
      id,
      source: message,
      type: "bookmark",
      label: message.bookmarkLabel || "校历安排",
      text: text || "继续日常",
      roll,
      canRewrite: false,
      canEdit: false,
    };
  }

  if (message.kind === "locationMove") {
    return {
      id,
      source: message,
      type: "bookmark",
      label: "地点移动",
      text: text || "前往新地点",
      roll,
      canRewrite: false,
      canEdit: false,
    };
  }

  if (message.role === "user") {
    return {
      id,
      source: message,
      type: "action",
      label: message.actionLabel || "行动手记",
      text,
      roll,
      canRewrite: false,
      canEdit: true,
    };
  }

  if (message.role === "assistant") {
    return {
      id,
      source: message,
      type: "page",
      label: "正文",
      text,
      roll,
      streaming: !!message.streaming,
      canRewrite: true,
      canEdit: false,
    };
  }

  return {
    id,
    source: message,
    type: "note",
    label: "记录",
    text,
    roll,
    canRewrite: false,
    canEdit: false,
  };
}

export function bookEntriesFromMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).map(bookEntryFromMessage);
}

export function bookInputPlaceholder({ playerName = "", mode = "world", activeCharacterName = "" } = {}) {
  if (mode !== "world" && activeCharacterName) return `写下你想对 ${activeCharacterName} 说的话...`;
  return `写下${playerName ? playerName : "角色"}接下来怎么做...`;
}

export function bookHelperText(mode = "world") {
  return mode === "world"
    ? "行动手记会写入下一页；地点和校历只是舞台入口，不固定剧情。"
    : "角色对话仍使用共享世界状态。";
}
