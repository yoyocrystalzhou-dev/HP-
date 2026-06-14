import { useMemo } from "react";

/**
 * 三世代选择首页 —— 移动优先 · 暗黑沉浸魔法风。
 * 氛围：暗夜渐变 + 细碎星尘（柔光圆点）+ 复古金色花角边框 + 花体标题。
 *
 * props: { generations, onPick(presetId) }
 */

const GOLD = "#E8C766";
const GOLD_DIM = "#9c7b3a";
const INK = "#f3e9d2";
const MUTED = "#9a8f78";
const FONT_HUA = "'Ma Shan Zheng', 'Noto Serif SC', cursive"; // 中文花体
const FONT_LATIN = "'Cinzel', serif"; // 拉丁花体

/** 复古花角（四角金色花饰，组成古典相框感）。 */
function CornerFlourish({ pos, color = GOLD }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  const place = {
    tl: { top: 7, left: 7 }, tr: { top: 7, right: 7 },
    br: { bottom: 7, right: 7 }, bl: { bottom: 7, left: 7 },
  }[pos];
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"
      style={{ position: "absolute", ...place, transform: `rotate(${rot}deg)` }}>
      <path d="M2 25 V8 Q2 2 8 2 H25" fill="none" stroke={color} strokeWidth="1.1" />
      <path d="M7 25 V11 Q7 7 11 7 H25" fill="none" stroke={color} strokeWidth="0.6" opacity="0.45" />
      <circle cx="8" cy="8" r="1.7" fill={color} />
      <path d="M2 2 q5 1 6 6 M2 2 q1 5 6 6" fill="none" stroke={color} strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}

export default function GenerationSelect({ generations = [], onPick }) {
  // 细碎星尘：大量柔光小圆点
  const dust = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.4 + 0.6,
        dur: 2.4 + Math.random() * 4,
        delay: Math.random() * 5,
        gold: Math.random() > 0.6,
      })),
    []
  );
  // 少量更亮的柔光星（圆形、模糊，不带尖角）
  const glints = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        top: Math.random() * 92,
        left: Math.random() * 94,
        size: 2.6 + Math.random() * 3.2,
        dur: 3 + Math.random() * 3,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        background:
          "radial-gradient(120% 60% at 50% -8%, rgba(180,140,60,0.20), transparent 55%)," +
          "radial-gradient(90% 50% at 85% 12%, rgba(60,80,140,0.18), transparent 60%)," +
          "linear-gradient(180deg, #0a0b12 0%, #0d1018 45%, #070709 100%)",
        color: INK,
        display: "flex",
        flexDirection: "column",
        padding: "max(46px, 7vh) 22px 38px",
        fontFamily: "inherit",
      }}
    >
      <style>{`
        @keyframes hpDust { 0%,100%{opacity:.15} 50%{opacity:.9} }
        @keyframes hpGlint { 0%,100%{opacity:.3; transform:scale(.8)} 50%{opacity:1; transform:scale(1)} }
        .hp-card-on:active { transform: scale(0.985); }
      `}</style>

      {/* 星尘层 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
        {dust.map((s) => (
          <span key={s.id} style={{
            position: "absolute", top: `${s.top}%`, left: `${s.left}%`,
            width: s.size, height: s.size, borderRadius: "50%",
            background: s.gold ? "rgba(232,199,102,0.9)" : "rgba(226,232,245,0.85)",
            boxShadow: s.gold ? "0 0 3px rgba(232,199,102,0.7)" : "0 0 3px rgba(220,230,255,0.5)",
            animation: `hpDust ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
        {glints.map((s) => (
          <span key={`g${s.id}`} style={{
            position: "absolute", top: `${s.top}%`, left: `${s.left}%`,
            width: s.size, height: s.size, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,244,214,0.95), rgba(232,199,102,0.35) 55%, transparent 72%)",
            boxShadow: "0 0 8px rgba(232,199,102,0.6)",
            animation: `hpGlint ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
      </div>


      {/* 标题区 */}
      <div style={{ position: "relative", textAlign: "center", marginBottom: 26 }}>
        <div style={{ width: 8, height: 8, margin: "0 auto 16px", borderRadius: "50%", background: "radial-gradient(circle, #fff6da, rgba(232,199,102,0.5) 55%, transparent 72%)", boxShadow: "0 0 14px rgba(232,199,102,0.7)" }} />
        <div style={{ fontFamily: FONT_LATIN, fontSize: 15, letterSpacing: 6, color: MUTED, marginBottom: 14, fontWeight: 600 }}>HARRY · POTTER</div>
        <h1 style={{ margin: 0, fontFamily: FONT_HUA, fontSize: 42, fontWeight: 400, color: INK, letterSpacing: 4, textShadow: "0 2px 30px rgba(232,199,102,0.4)" }}>选择你的世代</h1>
        {/* 花饰分隔线 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, margin: "12px auto 0", maxWidth: 220 }}>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_DIM})` }} />
          <span style={{ color: GOLD, fontSize: 9 }}>❖</span>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_DIM}, transparent)` }} />
        </div>
        <p style={{ margin: "13px auto 0", fontSize: 12.5, lineHeight: 1.7, color: MUTED, maxWidth: 290 }}>
          每个世代都是一个写好的世界。<br />选定后，你将走进霍格沃茨。
        </p>
      </div>

      {/* 世代卡 */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 13, width: "100%", maxWidth: 440, margin: "0 auto", flex: 1, justifyContent: "center", paddingBottom: 20 }}>
        {generations.map((g) => {
          const on = !!g.available;
          return (
            <button
              key={g.id}
              className={on ? "hp-card-on" : ""}
              disabled={!on}
              onClick={() => on && onPick(g.presetId)}
              style={{
                position: "relative",
                width: "100%",
                textAlign: "left",
                padding: "18px 22px 16px",
                borderRadius: 16,
                border: `1px solid ${on ? "rgba(232,199,102,0.5)" : "rgba(255,255,255,0.07)"}`,
                background: on
                  ? "linear-gradient(160deg, rgba(42,35,20,0.94), rgba(18,16,11,0.94))"
                  : "rgba(255,255,255,0.022)",
                color: INK,
                cursor: on ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                boxShadow: on ? "0 0 26px rgba(232,199,102,0.10), 0 18px 50px rgba(0,0,0,0.55)" : "none",
                transition: "transform 0.12s ease",
                WebkitTapHighlightColor: "transparent",
                overflow: "hidden",
              }}
            >
              {["tl", "tr", "bl", "br"].map((p) => (
                <CornerFlourish key={p} pos={p} color={on ? GOLD : "rgba(255,255,255,0.12)"} />
              ))}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2, padding: "0 6px" }}>
                <span style={{ fontSize: 10.5, letterSpacing: 2, color: on ? MUTED : "rgba(255,255,255,0.26)" }}>{g.subtitle}</span>
                {!on && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>🔒</span>}
              </div>
              <div style={{ fontFamily: FONT_HUA, fontSize: 29, fontWeight: 400, color: on ? INK : "rgba(243,233,210,0.4)", marginBottom: 4, letterSpacing: 3, padding: "0 6px" }}>{g.title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: on ? MUTED : "rgba(255,255,255,0.22)", padding: "0 6px" }}>{g.blurb}</div>
              <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: on ? INK : "rgba(255,255,255,0.28)", padding: "0 6px" }}>
                {on ? "进入魔法世界 →" : "敬请期待"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
