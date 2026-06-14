import { useRef, useState } from "react";
import { Field, Input, Btn, Toggle } from "./UI.jsx";
import { I } from "./Icons.jsx";
import Avatar from "./Avatar.jsx";
import { imageToDataURL, isImageValue } from "../lib/utils.js";
import { T } from "../theme.js";

const ICONS = ["📁","🏰","🧙","🐉","🌆","⚔️","🏫","🌙","🔮","🚀","🏝️","👑"];

/**
 * Edit the active project's meta + rules.
 * props: project, onSave(patch), onDelete, canDelete
 */
export default function ProjectSettingsPanel({ project, onSave, onDelete, canDelete }) {
  const [name, setName] = useState(project.name || "");
  const [icon, setIcon] = useState(project.icon || "📁");
  const [description, setDescription] = useState(project.description || "");
  const [instructions, setInstructions] = useState(project.instructions || "");
  const [currentTimeLabel, setCurrentTimeLabel] = useState(project.currentTimeLabel || "");
  const [autoExtractUpdates, setAutoExtractUpdates] = useState(!!project.autoExtractUpdates);
  const [autoSummarizeChats, setAutoSummarizeChats] = useState(!!project.autoSummarizeChats);
  const [autoNameChats, setAutoNameChats] = useState(!!project.autoNameChats);
  const iconFileRef = useRef(null);

  const save = () => onSave({ name: name.trim() || "未命名项目", icon, description, instructions, currentTimeLabel: currentTimeLabel.trim(), autoExtractUpdates, autoSummarizeChats, autoNameChats });
  const uploadIcon = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    try {
      setIcon(await imageToDataURL(file, 512, 0.86));
    } catch {
      window.alert("项目图标读取失败，请换一张图片再试。");
    }
  };

  return (
    <div>
      <Field label="项目图标">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar
            value={icon}
            fallback="📁"
            size={54}
            radius={17}
            style={{ border: `1px solid ${T.line}`, background: T.softControl, boxShadow: "0 10px 22px rgba(0,0,0,0.14)" }}
          />
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <input ref={iconFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadIcon} />
            <Btn small variant="ghost" onClick={() => iconFileRef.current?.click()}><I.Upload />上传图片</Btn>
            {isImageValue(icon) && <Btn small variant="ghost" onClick={() => setIcon("📁")}>恢复默认</Btn>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ICONS.map((a) => (
            <button key={a} onClick={() => setIcon(a)} style={{ fontSize: 20, padding: "4px 6px", borderRadius: 7, border: "1.5px solid", borderColor: icon === a ? T.accent : T.border, background: icon === a ? T.hover : "transparent", cursor: "pointer" }}>
              {a}
            </button>
          ))}
        </div>
      </Field>

      <Field label="项目名称">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：HP 世界 / 六族世界" />
      </Field>

      <Field label="项目描述">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="一句话描述这个世界…" />
      </Field>

      <Field label="当前时间（时间线）">
        <Input value={currentTimeLabel} onChange={(e) => setCurrentTimeLabel(e.target.value)} placeholder="例如：1992年12月 圣诞节前一周" />
        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>注入到每次对话，并作为新记忆建议的默认时间标签。</div>
      </Field>

      <Field label="项目规则 / Instructions">
        <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} placeholder="贯穿全项目的规则、叙事风格、时间设定等。会注入到每次对话的最前面。" />
        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>注入顺序最高：项目规则 → 世界记忆 → 主线记忆 → 世界书 → 角色人设 → 角色记忆</div>
      </Field>

      <Field label="自动提炼建议">
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.surface }}>
          <Toggle value={autoExtractUpdates} onChange={() => setAutoExtractUpdates((v) => !v)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{autoExtractUpdates ? "已开启" : "已关闭"}</div>
            <div style={{ fontSize: 11, color: T.textFaint, lineHeight: 1.5 }}>每次 AI 回复后自动生成 Pending Updates，仍需你手动接受后才会写入状态/记忆。</div>
          </div>
        </div>
      </Field>

      <Field label="自动总结对话">
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.surface }}>
          <Toggle value={autoSummarizeChats} onChange={() => setAutoSummarizeChats((v) => !v)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{autoSummarizeChats ? "已开启" : "已关闭"}</div>
            <div style={{ fontSize: 11, color: T.textFaint, lineHeight: 1.5 }}>对话变长后自动维护本对话前情提要。聊天原文保留，发给 AI 时用提要压缩旧上下文。</div>
          </div>
        </div>
      </Field>

      <Field label="自动命名对话">
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.surface }}>
          <Toggle value={autoNameChats} onChange={() => setAutoNameChats((v) => !v)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{autoNameChats ? "已开启" : "已关闭"}</div>
            <div style={{ fontSize: 11, color: T.textFaint, lineHeight: 1.5 }}>首次发送后用用户消息生成简短标题。只改系统默认名，不覆盖你手动重命名的对话。</div>
          </div>
        </div>
      </Field>

      <Btn onClick={save} style={{ width: "100%", justifyContent: "center" }}>保存项目设置</Btn>

      {canDelete && (
        <Btn variant="danger" onClick={onDelete} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
          删除整个项目
        </Btn>
      )}
    </div>
  );
}
