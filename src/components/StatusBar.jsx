import { GOLD, GOLD_DIM, INK, MUTED, FONT_HUA } from "./hpAtmosphere.jsx";
import { STAT_DEFS, STAT_MAX, STAMINA_MAX, normalizeStats } from "../lib/stats.js";
import { COURSES, normalizeCourses } from "../lib/courses.js";
import { normalizeInventory, missingRequiredItems } from "../lib/inventory.js";
import { clueSummary } from "../lib/clues.js";

/**
 * 玩家养成数值面板（只读可视化）—— 暗金风。
 * HP 专项里唯一"放出来"给玩家看的数值层。
 * 桌面端作为左侧栏，移动端作为底部抽屉内容（由 App 决定外层容器）。
 *
 * props: { player, variant: "rail" | "sheet", onClose }
 */
import { favorStage } from "../lib/affinity.js";

export default function StatusBar({ player, variant = "rail", uiMode = "night", onClose, ocs = [], clues = [], houseCup = null, onAddOc, onRemoveOc, favorList = [], onRestart }) {
  if (!player?.stats) return null;
  const s = normalizeStats(player.stats);
  const meta = player.meta || {};
  const cs = normalizeCourses(player.courses);
  const inventory = normalizeInventory(player.inventory);
  const ownedItems = Object.values(inventory.items);
  const missingItems = missingRequiredItems(inventory);
  const cluesInfo = clueSummary(clues);
  const isDay = uiMode === "day";
  const C = isDay
    ? {
        ink: "#3b291d",
        muted: "rgba(74,49,32,0.68)",
        gold: "#7a4c2e",
        goldDim: "#b38a51",
        line: "rgba(105,62,37,0.22)",
        lineStrong: "rgba(105,62,37,0.42)",
        shell: "linear-gradient(180deg, rgba(255,241,207,0.96), rgba(222,197,143,0.95))",
        soft: "rgba(105,62,37,0.10)",
        track: "rgba(105,62,37,0.12)",
      }
    : {
        ink: INK,
        muted: MUTED,
        gold: GOLD,
        goldDim: GOLD_DIM,
        line: "rgba(232,199,102,0.16)",
        lineStrong: "rgba(232,199,102,0.28)",
        shell: "linear-gradient(180deg, rgba(20,20,28,0.92), rgba(10,11,16,0.94))",
        soft: "rgba(232,199,102,0.12)",
        track: "rgba(255,255,255,0.08)",
      };

  const isSheet = variant === "sheet";
  const shell = isSheet
    ? { width: "100%", display: "flex", flexDirection: "column", fontFamily: "inherit", color: C.ink }
    : {
        width: 212, flexShrink: 0, display: "flex", flexDirection: "column",
        border: `1px solid ${C.lineStrong}`, borderRadius: 20,
        background: C.shell,
        boxShadow: isDay ? "0 24px 70px rgba(89,54,32,0.24)" : "0 24px 70px rgba(0,0,0,0.5)", overflow: "hidden", fontFamily: "inherit", color: C.ink,
      };

  return (
    <div style={shell}>
      {isSheet && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: C.lineStrong }} />
        </div>
      )}

      {/* 角色头 */}
      <div style={{ padding: isSheet ? "8px 20px 14px" : "16px 16px 12px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: FONT_HUA, fontSize: 22, color: C.ink }}>{player.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {[meta.house, meta.blood].filter(Boolean).join(" · ") || "霍格沃茨新生"}
          </div>
          {meta.wand?.wood && (
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>🪄 {meta.wand.wood} · {meta.wand.core}</div>
          )}
        </div>
        {isSheet && onClose && (
          <button onClick={onClose} aria-label="关闭" style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${C.lineStrong}`, background: "transparent", color: C.muted, fontSize: 16, cursor: "pointer" }}>✕</button>
        )}
      </div>

      {/* 体力（消耗型资源，显眼）*/}
      <div style={{ padding: isSheet ? "12px 20px 4px" : "12px 16px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: C.ink, fontWeight: 600 }}>⚡ 体力</span>
          <span style={{ color: s.stamina <= 20 ? "#e88" : C.muted, fontWeight: 700 }}>{s.stamina} / {STAMINA_MAX}</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: C.track, overflow: "hidden" }}>
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
                <span style={{ color: C.muted }}>{d.icon} {d.label}</span>
                <span style={{ color: C.ink, fontWeight: 700 }}>{v}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: C.track, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})`, boxShadow: `0 0 6px ${C.lineStrong}`, transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 学院杯 + 个人贡献 */}
      <div style={{ padding: isSheet ? "10px 20px 4px" : "12px 16px", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>🏆 个人贡献</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{s.housePoints ?? 0}</span>
      </div>
      {houseCup?.playerHouse && (
        <div style={{ padding: isSheet ? "2px 20px 8px" : "0 16px 10px", fontSize: 10.5, color: C.muted, lineHeight: 1.4 }}>
          学院杯：{houseCup.playerHouse} 第 {houseCup.playerRank || "-"} 名
          {houseCup.leader ? ` · 领先 ${houseCup.leader}` : ""}
          {houseCup.settled ? " · 已结算" : ""}
        </div>
      )}
      {meta.subjects?.length > 0 && (
        <div style={{ padding: isSheet ? "2px 20px 8px" : "0 16px 10px", fontSize: 10.5, color: C.muted }}>
          擅长：{meta.subjects.join("、")}
        </div>
      )}

      {/* 物品 */}
      <div style={{ padding: isSheet ? "10px 20px" : "10px 16px", borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 11.5, color: C.muted }}>🎒 物品</span>
          {missingItems.length > 0 && <span style={{ fontSize: 10.5, color: C.gold }}>待采购 {missingItems.length}</span>}
        </div>
        <div style={{ fontSize: 10.8, color: C.muted, lineHeight: 1.45 }}>
          {ownedItems.slice(0, isSheet ? 12 : 6).map((i) => i.label).join("、") || "暂无明确物品"}
          {ownedItems.length > (isSheet ? 12 : 6) ? ` 等 ${ownedItems.length} 件` : ""}
        </div>
      </div>

      {/* 课程数值 */}
      <div style={{ padding: isSheet ? "12px 20px" : "10px 16px", borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 9 }}>📚 课程</div>
        <div style={{ display: isSheet ? "grid" : "block", gridTemplateColumns: isSheet ? "1fr 1fr" : undefined, gap: isSheet ? "9px 18px" : 0 }}>
          {COURSES.map((name) => {
            const v = cs[name];
            const fav = (meta.subjects || []).includes(name);
            return (
              <div key={name} style={{ marginBottom: isSheet ? 0 : 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: fav ? C.gold : C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav ? "★ " : ""}{name}</span>
                  <span style={{ color: C.ink, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{v}</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: C.track, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#7a6a3a,#cbb066)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 好感度 */}
      {favorList.length > 0 && (
        <div style={{ padding: isSheet ? "12px 20px" : "10px 16px", borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>💛 好感度</div>
          {favorList.map((f) => (
            <div key={f.name} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                <span style={{ color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}{f.kind === "oc" ? <span style={{ color: C.gold, fontSize: 10, marginLeft: 4 }}>OC</span> : null}</span>
                <span style={{ color: C.muted, flexShrink: 0, marginLeft: 6 }}>{favorStage(f.value, f.relationship)} {Math.round(f.value)}</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: C.track, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(0, Math.min(100, f.value))}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #b5566f, #e88aa3)" }} />
              </div>
              {f.relationship?.feeling && (
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.35 }}>{f.relationship.feeling}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 受限线索 */}
      {cluesInfo.activeCount > 0 && (
        <div style={{ padding: isSheet ? "12px 20px" : "10px 16px", borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 11.5, color: C.muted }}>🧩 未解线索</span>
            <span style={{ fontSize: 10.5, color: C.gold }}>{cluesInfo.activeCount}</span>
          </div>
          <div style={{ fontSize: 10.8, color: C.muted, lineHeight: 1.45 }}>
            {cluesInfo.unresolvedTitles.join("、")}
          </div>
        </div>
      )}

      {/* 原创角色 */}
      <div style={{ padding: isSheet ? "12px 20px 20px" : "10px 16px 16px", borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ocs.length ? 8 : 0 }}>
          <span style={{ fontSize: 11.5, color: C.muted }}>✨ 原创角色</span>
          {onAddOc && (
            <button onClick={onAddOc} style={{ fontSize: 11, fontWeight: 600, color: C.ink, background: C.soft, border: `1px solid ${C.lineStrong}`, borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>＋ 添加</button>
          )}
        </div>
        {ocs.map((o) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.line}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: C.ink }}>{o.name} <span style={{ color: C.muted, fontSize: 10.5 }}>{[o.gender, o.house].filter(Boolean).join("·")}</span></div>
              {o.tieName && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{o.tieName} 的{o.tieRelation || "熟人"}</div>}
            </div>
            {onRemoveOc && (
              <button onClick={() => onRemoveOc(o.id)} aria-label="移除" style={{ flexShrink: 0, marginLeft: 8, width: 22, height: 22, borderRadius: 7, border: `1px solid ${C.lineStrong}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer", lineHeight: 1 }}>✕</button>
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
