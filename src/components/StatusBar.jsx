import { GOLD, GOLD_DIM, INK, MUTED, FONT_HUA } from "./hpAtmosphere.jsx";
import { STAT_DEFS, STAT_MAX, STAMINA_MAX, normalizeStats } from "../lib/stats.js";
import { COURSES, normalizeCourses } from "../lib/courses.js";

/**
 * 玩家养成数值面板（只读可视化）—— 暗金风。
 * HP 专项里唯一"放出来"给玩家看的数值层。
 * 桌面端作为左侧栏，移动端作为底部抽屉内容（由 App 决定外层容器）。
 *
 * props: { player, variant: "rail" | "sheet", onClose }
 */
import { favorStage } from "../lib/affinity.js";

export default function StatusBar({ player, variant = "rail", onClose, ocs = [], onAddOc, onRemoveOc, favorList = [], onRestart }) {
  if (!player?.stats) return null;
  const s = normalizeStats(player.stats);
  const meta = player.meta || {};
  const cs = normalizeCourses(player.courses);

  const isSheet = variant === "sheet";
  const shell = isSheet
    ? { width: "100%", display: "flex", flexDirection: "column", fontFamily: "inherit", color: INK }
    : {
        width: 212, flexShrink: 0, display: "flex", flexDirection: "column",
        border: "1px solid rgba(232,199,102,0.28)", borderRadius: 20,
        background: "linear-gradient(180deg, rgba(20,20,28,0.92), rgba(10,11,16,0.94))",
        boxShadow: "0 24px 70px rgba(0,0,0,0.5)", overflow: "hidden", fontFamily: "inherit", color: INK,
      };

  return (
    <div style={shell}>
      {isSheet && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: "rgba(232,199,102,0.4)" }} />
        </div>
      )}

      {/* 角色头 */}
      <div style={{ padding: isSheet ? "8px 20px 14px" : "16px 16px 12px", borderBottom: "1px solid rgba(232,199,102,0.16)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: FONT_HUA, fontSize: 22, color: INK }}>{player.name}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            {[meta.house, meta.blood].filter(Boolean).join(" · ") || "霍格沃茨新生"}
          </div>
          {meta.wand?.wood && (
            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>🪄 {meta.wand.wood} · {meta.wand.core}</div>
          )}
        </div>
        {isSheet && onClose && (
          <button onClick={onClose} aria-label="关闭" style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: MUTED, fontSize: 16, cursor: "pointer" }}>✕</button>
        )}
      </div>

      {/* 体力（消耗型资源，显眼）*/}
      <div style={{ padding: isSheet ? "12px 20px 4px" : "12px 16px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: INK, fontWeight: 600 }}>⚡ 体力</span>
          <span style={{ color: s.stamina <= 20 ? "#e88" : MUTED, fontWeight: 700 }}>{s.stamina} / {STAMINA_MAX}</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(0, Math.min(100, (s.stamina / STAMINA_MAX) * 100))}%`, height: "100%", borderRadius: 999, background: s.stamina <= 20 ? "linear-gradient(90deg,#9c3b3b,#e06b6b)" : "linear-gradient(90deg,#3a8f6e,#5fd1a5)", transition: "width 0.4s ease" }} />
        </div>
        {s.stamina <= 20 && <div style={{ fontSize: 10.5, color: "#e8a0a0", marginTop: 5 }}>体力偏低，/休息 恢复</div>}
      </div>

      {/* 养成数值条 */}
      <div style={{ padding: isSheet ? "10px 20px" : "10px 16px", display: isSheet ? "grid" : "flex", gridTemplateColumns: isSheet ? "1fr 1fr" : undefined, gap: isSheet ? "12px 18px" : 11, flexDirection: isSheet ? undefined : "column", flex: isSheet ? undefined : 1 }}>
        {STAT_DEFS.map((d) => {
          const v = s[d.key] ?? 0;
          const pct = Math.max(0, Math.min(100, (v / STAT_MAX) * 100));
          return (
            <div key={d.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                <span style={{ color: MUTED }}>{d.icon} {d.label}</span>
                <span style={{ color: INK, fontWeight: 700 }}>{v}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${GOLD_DIM}, ${GOLD})`, boxShadow: "0 0 6px rgba(232,199,102,0.4)", transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 学院分 + 擅长 */}
      <div style={{ padding: isSheet ? "10px 20px 4px" : "12px 16px", borderTop: "1px solid rgba(232,199,102,0.16)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: MUTED }}>🏆 学院分</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: INK }}>{s.housePoints ?? 0}</span>
      </div>
      {meta.subjects?.length > 0 && (
        <div style={{ padding: isSheet ? "2px 20px 8px" : "0 16px 10px", fontSize: 10.5, color: MUTED }}>
          擅长：{meta.subjects.join("、")}
        </div>
      )}

      {/* 课程数值 */}
      <div style={{ padding: isSheet ? "12px 20px" : "10px 16px", borderTop: "1px solid rgba(232,199,102,0.16)" }}>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 9 }}>📚 课程</div>
        <div style={{ display: isSheet ? "grid" : "block", gridTemplateColumns: isSheet ? "1fr 1fr" : undefined, gap: isSheet ? "9px 18px" : 0 }}>
          {COURSES.map((name) => {
            const v = cs[name];
            const fav = (meta.subjects || []).includes(name);
            return (
              <div key={name} style={{ marginBottom: isSheet ? 0 : 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: fav ? GOLD : MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav ? "★ " : ""}{name}</span>
                  <span style={{ color: INK, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{v}</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#7a6a3a,#cbb066)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 好感度 */}
      {favorList.length > 0 && (
        <div style={{ padding: isSheet ? "12px 20px" : "10px 16px", borderTop: "1px solid rgba(232,199,102,0.16)" }}>
          <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 8 }}>💛 好感度</div>
          {favorList.map((f) => (
            <div key={f.name} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                <span style={{ color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <span style={{ color: MUTED, flexShrink: 0, marginLeft: 6 }}>{favorStage(f.value)} {Math.round(f.value)}</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(0, Math.min(100, f.value))}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #b5566f, #e88aa3)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 原创角色 */}
      <div style={{ padding: isSheet ? "12px 20px 20px" : "10px 16px 16px", borderTop: "1px solid rgba(232,199,102,0.16)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ocs.length ? 8 : 0 }}>
          <span style={{ fontSize: 11.5, color: MUTED }}>✨ 原创角色</span>
          {onAddOc && (
            <button onClick={onAddOc} style={{ fontSize: 11, fontWeight: 600, color: INK, background: "rgba(232,199,102,0.12)", border: "1px solid rgba(232,199,102,0.4)", borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>＋ 添加</button>
          )}
        </div>
        {ocs.map((o) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: INK }}>{o.name} <span style={{ color: MUTED, fontSize: 10.5 }}>{[o.gender, o.house].filter(Boolean).join("·")}</span></div>
              {o.tieName && <div style={{ fontSize: 10.5, color: MUTED, marginTop: 1 }}>{o.tieName} 的{o.tieRelation || "熟人"}</div>}
            </div>
            {onRemoveOc && (
              <button onClick={() => onRemoveOc(o.id)} aria-label="移除" style={{ flexShrink: 0, marginLeft: 8, width: 22, height: 22, borderRadius: 7, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: MUTED, fontSize: 12, cursor: "pointer", lineHeight: 1 }}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* 重新开始 */}
      {onRestart && (
        <div style={{ padding: isSheet ? "4px 20px 22px" : "4px 16px 16px" }}>
          <button onClick={onRestart} style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1px solid rgba(180,70,70,0.4)", background: "rgba(180,70,70,0.1)", color: "#e0a0a0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ↻ 重新开始
          </button>
        </div>
      )}
    </div>
  );
}
