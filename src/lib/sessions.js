import { uid } from "./utils.js";

/**
 * Session shape:
 * {
 *   id: string,
 *   charId: string,
 *   name: string,
 *   messages: Message[],
 *   memories: Memory[],
 *   createdAt: number,
 *   updatedAt: number,
 * }
 *
 * Top-level persisted keys:
 *   "sessions"        — { [sessionId]: Session }
 *   "charSessions"    — { [charId]: sessionId[] }   ordered list
 *   "activeSession"   — { [charId]: sessionId }
 */

export function createSession(charId, name, greeting) {
  const id = uid();
  const now = Date.now();
  const messages = greeting
    ? [{ role: "assistant", content: greeting, id: uid() }]
    : [];
  return {
    id,
    charId,
    name: name || "新会话",
    messages,
    memories: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Return sessions for a character, sorted newest-first. */
export function sessionsForChar(sessions, charSessions, charId) {
  const ids = charSessions[charId] || [];
  return ids
    .map((id) => sessions[id])
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Touch updatedAt so the session floats to top. */
export function touchSession(sessions, sessionId) {
  const s = sessions[sessionId];
  if (!s) return sessions;
  return { ...sessions, [sessionId]: { ...s, updatedAt: Date.now() } };
}
