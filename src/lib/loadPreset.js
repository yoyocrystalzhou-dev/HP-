/**
 * 把「世代预设包」（内置只读世界数据）实例化成引擎可消费的 Project。
 *
 * 预设包本身不落盘、不可编辑；这里用现有的 createProject 工厂把它转成一个标准
 * Project（带稳定 id，便于复用同一存档）。世界聊天会由 App 的 useEffect 自动创建，
 * 所以这里不需要手动建会话。
 */

import { createProject } from "./projects.js";

/** 预设包对应的稳定 Project id（同一世代复用同一存档，避免重复创建）。 */
export const presetProjectId = (presetId) => `hp-${presetId}`;

/**
 * @param {object} preset  childGen 这类预设包
 * @param {object} [opts]  { id, player }  player = 角色创建向导产出的玩家角色
 */
export function instantiatePreset(preset, opts = {}) {
  return createProject({
    id: opts.id || presetProjectId(preset.presetId),
    name: preset.name,
    icon: "⚡",
    description: preset.era ? `${preset.era.start} · ${preset.era.tone}` : "",
    instructions: preset.instructions || "",
    currentTimeLabel: preset.currentTimeLabel || "",
    worldBook: preset.worldBook || [],
    worldMemory: preset.worldMemory || [],
    storyMemory: preset.storyMemory || [],
    characters: preset.characters || [],
    files: preset.files || [],
    currentState: preset.currentState || undefined,
    playerCharacter: opts.player || { name: "我", persona: "" },
    // P2：暂不弹「记忆建议」确认，保持沉浸；后续做成静默后台
    autoExtractUpdates: false,
    autoSummarizeChats: true,
    autoNameChats: false,
  });
}
