import { I } from "./Icons.jsx";
import Avatar from "./Avatar.jsx";
import { T } from "../theme.js";

/** Format a timestamp as a short relative string. */
function relTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

/**
 * Level-1 view: the project grid (like Claude Projects home).
 * props: projects (Project[]), activeId, onOpen, onCreate, onEdit, onDelete, canDelete
 */
export default function ProjectListView({ projects, activeId, onOpen, onCreate, onEdit, onDelete, canDelete }) {
  return (
    <div style={{ height: "100dvh", overflow: "auto", background: T.bg, color: T.text }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 18px calc(28px + env(safe-area-inset-bottom))" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text }}>我的项目</h1>
          <button
            onClick={onCreate}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 9, border: "none", background: T.accent, color: T.accentText, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <I.Plus />新建项目
          </button>
        </div>
        <div style={{ fontSize: 13, color: T.textFaint, marginBottom: 20 }}>
          每个项目是一个完整的世界：角色、世界书、世界记忆、主线剧情与会话都归属于它。
        </div>

        {projects.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.textFaint }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
            <div style={{ fontSize: 14 }}>还没有项目，点击右上角「新建项目」开始</div>
          </div>
        )}

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {projects.map((p) => {
            const isActive = p.id === activeId;
            return (
              <div
                key={p.id}
                onClick={() => onOpen(p.id)}
                style={{
                  border: "1.5px solid", borderColor: isActive ? T.accent : T.border,
                  borderRadius: 14, padding: 16, cursor: "pointer",
                  background: T.surface2, transition: "all 0.15s",
                  display: "flex", flexDirection: "column", gap: 10, minHeight: 132,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Avatar value={p.icon} fallback="📁" size={38} radius={12} style={{ flexShrink: 0, background: T.surface, border: `1px solid ${T.borderSoft}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>{relTime(p.updatedAt)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onEdit(p.id)} title="项目设置" style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, padding: 4, display: "flex", borderRadius: 4 }}>
                      <I.Edit />
                    </button>
                    {canDelete && (
                      <button onClick={() => onDelete(p.id)} title="删除项目" style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, padding: 4, display: "flex", borderRadius: 4 }}>
                        <I.Trash />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, fontSize: 12.5, color: T.textDim, lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {p.description || "（无描述）"}
                </div>

                <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.textFaint, borderTop: `1px solid ${T.borderSoft}`, paddingTop: 9 }}>
                  <span>👤 {p.characters?.length || 0} 角色</span>
                  <span>💬 {(p.worldChatIds?.length || 0) + (p.characters || []).reduce((n, c) => n + (c.chatIds?.length || 0), 0)} 对话</span>
                  <span>🧠 {(p.worldMemory?.length || 0) + (p.storyMemory?.length || 0)} 记忆</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
