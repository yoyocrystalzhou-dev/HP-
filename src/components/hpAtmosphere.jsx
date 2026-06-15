import { useMemo } from "react";

/**
 * HP 专项共享视觉语言：暗黑沉浸魔法风。
 * 颜色 / 花体 / 暗夜底 / 碎星尘 / 复古花角 / 花饰分隔线。各屏复用，保持一致。
 */

export const GOLD = "#E8C766";
export const GOLD_DIM = "#9c7b3a";
export const INK = "#f3e9d2";
export const MUTED = "#9a8f78";
export const FONT_HUA = "'Ma Shan Zheng', 'Noto Serif SC', cursive"; // 中文花体
export const FONT_LATIN = "'Times New Roman', Times, serif"; // 拉丁衬线

export const NIGHT_BG =
  "radial-gradient(120% 60% at 50% -8%, rgba(180,140,60,0.20), transparent 55%)," +
  "radial-gradient(90% 50% at 85% 12%, rgba(60,80,140,0.18), transparent 60%)," +
  "linear-gradient(180deg, #0a0b12 0%, #0d1018 45%, #070709 100%)";

export const DAY_BG =
  "radial-gradient(95% 52% at 50% -8%, rgba(255,231,162,0.56), transparent 58%)," +
  "radial-gradient(72% 46% at 8% 16%, rgba(191,125,62,0.22), transparent 62%)," +
  "radial-gradient(76% 50% at 92% 20%, rgba(121,151,168,0.20), transparent 64%)," +
  "linear-gradient(180deg, #f5ead2 0%, #dfc99c 48%, #b99760 100%)";

/** 碎星尘层（柔光圆点 + 少量亮星），铺在暗底之上、内容之下。 */
export function Starfield({ count = 110, tone = "night" }) {
  const isDay = tone === "day";
  const dust = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i, top: Math.random() * 100, left: Math.random() * 100,
        size: Math.random() * 1.4 + 0.6, dur: 2.4 + Math.random() * 4,
        delay: Math.random() * 5, gold: Math.random() > 0.6,
      })),
    [count]
  );
  const glints = useMemo(
    () =>
      Array.from({ length: Math.round(count / 12) }, (_, i) => ({
        id: i, top: Math.random() * 92, left: Math.random() * 94,
        size: 2.6 + Math.random() * 3, dur: 3 + Math.random() * 3, delay: Math.random() * 5,
      })),
    [count]
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
      <style>{`
        @keyframes hpDust { 0%,100%{opacity:.15} 50%{opacity:.9} }
        @keyframes hpGlint { 0%,100%{opacity:.3; transform:scale(.8)} 50%{opacity:1; transform:scale(1)} }
      `}</style>
      {dust.map((s) => (
        <span key={s.id} style={{
          position: "absolute", top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size,
          borderRadius: "50%",
          background: isDay
            ? (s.gold ? "rgba(124,75,36,0.34)" : "rgba(255,248,222,0.58)")
            : (s.gold ? "rgba(232,199,102,0.9)" : "rgba(226,232,245,0.85)"),
          boxShadow: isDay
            ? (s.gold ? "0 0 5px rgba(124,75,36,0.18)" : "0 0 5px rgba(255,248,222,0.28)")
            : (s.gold ? "0 0 3px rgba(232,199,102,0.7)" : "0 0 3px rgba(220,230,255,0.5)"),
          animation: `hpDust ${s.dur}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
      {!isDay && glints.map((s) => (
        <span key={`g${s.id}`} style={{
          position: "absolute", top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,244,214,0.95), rgba(232,199,102,0.35) 55%, transparent 72%)",
          boxShadow: "0 0 8px rgba(232,199,102,0.6)", animation: `hpGlint ${s.dur}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

/** 复古金色花角。pos: tl/tr/bl/br */
export function CornerFlourish({ pos, color = GOLD, size = 24 }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  const place = {
    tl: { top: 7, left: 7 }, tr: { top: 7, right: 7 }, br: { bottom: 7, right: 7 }, bl: { bottom: 7, left: 7 },
  }[pos];
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" style={{ position: "absolute", ...place, transform: `rotate(${rot}deg)` }}>
      <path d="M2 25 V8 Q2 2 8 2 H25" fill="none" stroke={color} strokeWidth="1.1" />
      <path d="M7 25 V11 Q7 7 11 7 H25" fill="none" stroke={color} strokeWidth="0.6" opacity="0.45" />
      <circle cx="8" cy="8" r="1.7" fill={color} />
      <path d="M2 2 q5 1 6 6 M2 2 q1 5 6 6" fill="none" stroke={color} strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}

/** 花饰分隔线（❖ 居中）。 */
export function Flourish({ width = 220 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, margin: "0 auto", maxWidth: width }}>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_DIM})` }} />
      <span style={{ color: GOLD, fontSize: 9 }}>❖</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_DIM}, transparent)` }} />
    </div>
  );
}
