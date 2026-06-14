import { useState } from "react";
import { I } from "./Icons.jsx";
import { Btn } from "./UI.jsx";
import { T } from "../theme.js";

/** Format a timestamp as a short relative string. */
function relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

export default function SessionPanel({
  sessions,       // Session[]  — current scope's chats, sorted
  activeId,       // string
  mode,           // "world" | "character"
  scopeLabel,     // current scope display label
  onSelect,       // (id) => void
  onNew,          // () => void
  onRename,       // (id, name) => void
  onDelete,       // (id) => void
  onSwitchWorld,  // () => void  — switch back to world chat
  onSaveSummary,
  onClearSummary,
  onSummarizeNow,
  summaryBusy,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal,  setRenameVal]  = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const activeSession = sessions.find((s) => s.id === activeId) || null;
  const cardStyle = {
    border: `1px solid ${T.lineSoft}`,
    borderRadius: 18,
    background: T.softControl,
    boxShadow: "inset 0 0 20px rgba(255,250,226,0.04)",
  };
  const paperCard = {
    border: `1px solid ${T.lineSoft}`,
    borderRadius: 18,
    background: T.emptyPanel,
    boxShadow: "inset 0 0 22px rgba(255,250,226,0.035)",
  };
  const iconButton = {
    width: 26,
    height: 26,
    display: "grid",
    placeItems: "center",
    background: T.softControl,
    border: `1px solid ${T.lineSoft}`,
    borderRadius: 10,
    cursor: "pointer",
    padding: 0,
  };

  const startRename = (e, s) => {
    e.stopPropagation();
    setRenamingId(s.id);
    setRenameVal(s.name);
  };

  const commitRename = (id) => {
    const trimmed = renameVal.trim();
    if (trimmed) onRename(id, trimmed);
    setRenamingId(null);
  };

  return (
    <div>
      {/* Scope row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "10px 12px", ...paperCard }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }}>
          {mode === "world" ? <span style={{ color: T.gold, fontSize: 14 }}>✦</span> : null}
          <span style={{ fontFamily: T.serif, fontSize: 13.5, fontWeight: 800, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scopeLabel}</span>
        </span>
        {mode === "character" && (
          <button onClick={onSwitchWorld} title="切换到世界聊天" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", border: `1px solid ${T.lineSoft}`, borderRadius: 999, background: T.softControl, color: T.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            <span style={{ color: T.gold }}>✦</span>World
          </button>
        )}
      </div>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: T.muted }}>
          {sessions.length} 个对话
        </span>
        <Btn small onClick={onNew}>
          <I.Plus />新建对话
        </Btn>
      </div>

      {sessions.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: T.faint, fontSize: 13, ...cardStyle }}>
          暂无会话<br />
          <span style={{ fontSize: 12 }}>点击「新建会话」开始</span>
        </div>
      )}

      {activeSession && (
        <div style={{ ...paperCard, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 800, color: T.ink, flex: 1 }}>本对话前情提要</span>
            <Btn small variant="ghost" disabled={summaryBusy} onClick={() => onSummarizeNow?.(activeSession.id)}>立即总结</Btn>
          </div>

          {editingSummary ? (
            <>
              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                rows={5}
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.lineSoft}`, borderRadius: 14, background: T.inputField, color: T.ink, fontSize: 12.5, fontFamily: "inherit", lineHeight: 1.5, padding: "9px 11px", resize: "vertical", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                <Btn small onClick={() => { onSaveSummary?.(activeSession.id, summaryDraft.trim()); setEditingSummary(false); }}>保存</Btn>
                <Btn small variant="ghost" onClick={() => setEditingSummary(false)}>取消</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: activeSession.summary ? T.muted : T.faint, lineHeight: 1.6, maxHeight: 104, overflow: "auto", whiteSpace: "pre-wrap" }}>
                {activeSession.summary || "暂无提要。对话变长后可自动生成，也可以手动点击立即总结。"}
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                <Btn small variant="ghost" onClick={() => { setSummaryDraft(activeSession.summary || ""); setEditingSummary(true); }}>编辑</Btn>
                {activeSession.summary && <Btn small variant="ghost" onClick={() => onClearSummary?.(activeSession.id)}>清空</Btn>}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          const isRenaming = renamingId === s.id;

          return (
            <div
              key={s.id}
              onClick={() => !isRenaming && onSelect(s.id)}
              style={{
                border: "1px solid",
                borderColor: isActive ? T.line : T.lineSoft,
                borderRadius: 18,
                padding: "10px 12px",
                cursor: isRenaming ? "default" : "pointer",
                background: isActive ? T.paper : T.softControl,
                boxShadow: isActive ? "0 12px 28px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,250,226,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {/* Name row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(s.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={() => commitRename(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1, border: `1px solid ${T.line}`, borderRadius: 12,
                      padding: "4px 8px", fontSize: 13, fontFamily: "inherit",
                      fontWeight: 600, color: T.ink, background: T.inputField, outline: "none",
                    }}
                  />
                ) : (
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 700, color: isActive ? T.paperText : T.ink,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {s.name}
                  </span>
                )}

                {/* Action buttons — only visible on hover via inline group */}
                {!isRenaming && (
                  <div
                    className="session-actions"
                    style={{ display: "flex", gap: 2, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => startRename(e, s)}
                      title="重命名"
                      style={{ ...iconButton, color: T.faint }}
                    >
                      <I.Edit />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                      title="删除"
                      style={{ ...iconButton, color: T.danger }}
                    >
                      <I.Trash />
                    </button>
                  </div>
                )}
              </div>

              {/* Meta row */}
              <div style={{ display: "flex", gap: 10, marginTop: 5, fontSize: 11, color: isActive ? T.goldDim : T.faint }}>
                <span>{(s.messages || []).filter((m) => m.role === "user").length} 条消息</span>
                <span style={{ marginLeft: "auto" }}>{relTime(s.updatedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
