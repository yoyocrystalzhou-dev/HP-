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
  "radial-gradient(80% 42% at 50% -10%, rgba(221,205,174,0.58), transparent 62%)," +
  "radial-gradient(72% 46% at 8% 14%, rgba(171,143,102,0.15), transparent 66%)," +
  "radial-gradient(76% 50% at 92% 20%, rgba(196,184,161,0.18), transparent 66%)," +
  "repeating-linear-gradient(0deg, rgba(116,91,61,0.035) 0 1px, transparent 1px 22px)," +
  "linear-gradient(180deg, #fbfaf5 0%, #f0eadf 52%, #ddd1bd 100%)";

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
            ? (s.gold ? "rgba(152,128,93,0.22)" : "rgba(255,255,250,0.54)")
            : (s.gold ? "rgba(232,199,102,0.9)" : "rgba(226,232,245,0.85)"),
          boxShadow: isDay
            ? (s.gold ? "0 0 5px rgba(152,128,93,0.12)" : "0 0 5px rgba(255,255,250,0.24)")
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

/**
 * 莨苕涡卷花角（填充叶片 + 卷涡 + 缀珠），替代早期单线稿。
 * pos: tl/tr/bl/br；以左上角为基准绘制，其余靠旋转复用。
 */
export function CornerFlourish({ pos, color = GOLD, size = 24 }) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  const place = {
    tl: { top: 6, left: 6 }, tr: { top: 6, right: 6 }, br: { bottom: 6, right: 6 }, bl: { bottom: 6, left: 6 },
  }[pos];
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" aria-hidden="true" style={{ position: "absolute", ...place, transform: `rotate(${rot}deg)`, overflow: "visible" }}>
      {/* 双线转角框 */}
      <path d="M5 48 V15 Q5 5 15 5 H48" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.5 48 V17 Q10.5 10.5 17 10.5 H48" fill="none" stroke={color} strokeWidth="0.7" opacity="0.42" strokeLinecap="round" />
      {/* 主卷涡：渐细螺旋 */}
      <path d="M5 27 C5 14 14 5 27 5 C17.5 7.5 11.5 14 11.5 23 C11.5 29 16 31.5 19.5 28 C22 25.5 21 21 17.5 20.5"
            fill="none" stroke={color} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16.5" cy="24" r="2" fill={color} opacity="0.92" />
      {/* 莨苕叶：向中心展开的两片 */}
      <path d="M18 14 C28 11 35 16 38.5 26 C31 20.5 23.5 19.5 18 14 Z" fill={color} opacity="0.8" />
      <path d="M14 18 C18.5 28 16 35.5 8.5 40 C13 31.5 11 23.5 14 18 Z" fill={color} opacity="0.62" />
      {/* 小叶 + 缀珠 */}
      <path d="M34 8 C40 7 44 10 45 15 C40.5 12.5 36.5 11.5 34 8 Z" fill={color} opacity="0.6" />
      <circle cx="46" cy="9" r="1.5" fill={color} opacity="0.7" />
      <circle cx="9" cy="46" r="1.5" fill={color} opacity="0.7" />
      <circle cx="40" cy="29" r="1.1" fill={color} opacity="0.5" />
      <circle cx="29" cy="40" r="1.1" fill={color} opacity="0.5" />
    </svg>
  );
}

export function FoilTitle({ children, tone = "day", mobile = false }) {
  const isDay = tone === "day";
  const size = mobile ? 40 : 58;
  const solid = isDay ? "#9a8a66" : "#d9c38b";
  const foil = "linear-gradient(180deg, #fff4ba 0%, #c7aa61 20%, #7e704f 39%, #f3dc90 53%, #9c8756 69%, #e4ca77 84%, #fff2ba 100%)";
  return (
    <div style={{ position: "relative", display: "inline-grid", placeItems: "center", lineHeight: 1, marginTop: mobile ? 0 : 2 }}>
      <span
        style={{
          gridArea: "1 / 1",
          fontFamily: "'Luminari', 'Papyrus', 'Georgia', 'Noto Serif SC', serif",
          fontSize: size,
          fontWeight: 800,
          color: solid,
          WebkitTextStroke: isDay ? "0.55px rgba(80,68,49,0.30)" : "0.45px rgba(255,238,179,0.40)",
          textShadow: isDay
            ? "0 1px 0 rgba(255,255,255,0.72), 0 2px 0 rgba(94,78,55,0.10), 0 7px 10px rgba(91,72,46,0.20)"
            : "0 0 14px rgba(232,199,102,0.28), 0 4px 12px rgba(0,0,0,0.45)",
          transform: "scaleX(1.05)",
        }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        style={{
          gridArea: "1 / 1",
          fontFamily: "'Luminari', 'Papyrus', 'Georgia', 'Noto Serif SC', serif",
          fontSize: size,
          fontWeight: 800,
          color: "transparent",
          backgroundImage: foil,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          WebkitTextStroke: "0",
          opacity: isDay ? 0.72 : 0.86,
          filter: isDay ? "sepia(0.22) saturate(0.95)" : "saturate(1.12)",
          transform: "scaleX(1.05)",
        }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        style={{
          gridArea: "1 / 1",
          width: "96%",
          height: "42%",
          alignSelf: "start",
          marginTop: mobile ? 8 : 11,
          borderRadius: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.34), transparent)",
          mixBlendMode: isDay ? "screen" : "plus-lighter",
          opacity: isDay ? 0.42 : 0.3,
          pointerEvents: "none",
          transform: "skewX(-12deg)",
        }}
      />
    </div>
  );
}

export function HeaderFlourishes({ tone = "day" }) {
  const isDay = tone === "day";
  const ink = isDay ? "rgba(116,101,77,0.38)" : "rgba(232,199,102,0.16)";
  const strong = isDay ? "rgba(104,91,70,0.52)" : "rgba(232,199,102,0.24)";
  return (
    <svg viewBox="0 0 760 190" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
      <defs>
        <g id="hp-title-scroll" fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 154 C58 132 78 104 70 76 C64 54 38 58 38 78 C38 96 64 98 70 78" strokeWidth="1" />
          <path d="M68 76 C92 38 132 46 136 78 C140 112 92 118 88 88 C86 70 112 66 116 84" strokeWidth="1" />
          <path d="M30 126 C62 116 96 120 128 150" strokeWidth="0.75" opacity="0.68" />
          <path d="M76 58 q30-28 66-10 q-42 8-66 10Z" strokeWidth="0.75" />
          <path d="M54 108 q32-18 66 2 q-38 2-66-2Z" strokeWidth="0.75" />
          <path d="M100 118 q26 8 42 32 q-32-7-42-32Z" strokeWidth="0.7" />
          <circle cx="70" cy="78" r="2.6" fill={strong} stroke="none" />
          <circle cx="116" cy="84" r="1.8" fill={strong} stroke="none" opacity="0.58" />
        </g>
      </defs>
      <use href="#hp-title-scroll" x="26" y="20" />
      <g transform="translate(734 20) scale(-1 1)"><use href="#hp-title-scroll" /></g>
      <path d="M205 138 h92 q26 0 40-16 q14 16 40 16 h92" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.52" />
      <path d="M291 138 q25 26 46 0 q21 26 46 0" fill="none" stroke={ink} strokeWidth="0.65" opacity="0.45" />
      <circle cx="380" cy="138" r="2.5" fill={strong} opacity="0.55" />
    </svg>
  );
}

export function BackgroundOrnaments({ tone = "day" }) {
  const isDay = tone === "day";
  const ink = isDay ? "rgba(126,112,88,0.42)" : "rgba(232,199,102,0.15)";
  const inkSoft = isDay ? "rgba(126,112,88,0.24)" : "rgba(232,199,102,0.08)";
  const inkStrong = isDay ? "rgba(104,91,72,0.55)" : "rgba(232,199,102,0.22)";
  const paperWash = isDay ? "rgba(255,255,250,0.26)" : "rgba(255,244,210,0.025)";
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <svg viewBox="0 0 1200 900" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <g id="hp-corner-filigree" fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
            <path d="M28 210 V72 q0-42 42-42 h134" strokeWidth="1.35" />
            <path d="M48 210 V86 q0-34 34-34 h122" strokeWidth="0.75" opacity="0.58" />
            <path d="M28 124 q50-2 66-70 q16 60-42 92" strokeWidth="1.05" />
            <path d="M124 30 q-2 50-70 66 q60 16 92-42" strokeWidth="1.05" />
            <path d="M72 70 c44 24 44 66 0 92 c84-30 86-118 0-156 c31 30 30 48 0 64Z" strokeWidth="0.8" opacity="0.58" />
            <path d="M34 184 c42-30 82-20 102 24 c-36-20-72-20-102-24Z" strokeWidth="0.8" opacity="0.52" />
            <path d="M184 34 c-30 42-20 82 24 102 c-20-36-20-72-24-102Z" strokeWidth="0.8" opacity="0.52" />
            <circle cx="74" cy="74" r="3.1" fill={inkStrong} stroke="none" />
            <circle cx="118" cy="54" r="2" fill={inkStrong} stroke="none" opacity="0.58" />
            <circle cx="54" cy="118" r="2" fill={inkStrong} stroke="none" opacity="0.58" />
          </g>
          <g id="hp-side-vine" fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 0 c48 40 48 86 0 126 c-48 40-48 86 0 126 c48 40 48 86 0 126" strokeWidth="1.05" />
            <path d="M0 42 c30-28 66-20 78 14 c-36-8-58 0-78-14Z" strokeWidth="0.8" />
            <path d="M0 112 c-30-28-66-20-78 14 c36-8 58 0 78-14Z" strokeWidth="0.8" />
            <path d="M0 198 c30-28 66-20 78 14 c-36-8-58 0-78-14Z" strokeWidth="0.8" />
            <path d="M0 286 c-30-28-66-20-78 14 c36-8 58 0 78-14Z" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="2.1" fill={inkStrong} stroke="none" />
            <circle cx="0" cy="378" r="2.1" fill={inkStrong} stroke="none" />
          </g>
          <g id="hp-top-scroll" fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 18 h120 q38 0 56-18 q18 18 56 18 h120" strokeWidth="1" />
            <path d="M118 18 q26 30 58 0 q32 30 58 0" strokeWidth="0.75" opacity="0.64" />
            <circle cx="176" cy="18" r="3" fill={inkStrong} stroke="none" />
          </g>
          <g id="hp-feather" fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 96 C76 46 94 18 144 8 C116 54 80 78 8 96Z" strokeWidth="1.2" />
            <path d="M8 96 C48 80 94 46 144 8" strokeWidth="0.8" />
            <path d="M45 77 q-3-18 12-34 M67 63 q-2-16 12-30 M89 47 q-1-13 12-25" strokeWidth="0.65" opacity="0.6" />
          </g>
          <g id="hp-crest-ghost" fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
            <path d="M58 10 q38 22 74 0 v70 q-4 56-74 86 q-70-30-74-86 V10 q36 22 74 0Z" strokeWidth="1" />
            <path d="M58 31 q20 18 42 0 M58 31 q-20 18-42 0 M58 31 v98" strokeWidth="0.7" opacity="0.58" />
            <path d="M28 98 q30 18 60 0" strokeWidth="0.7" opacity="0.5" />
          </g>
        </defs>

        <rect x="14" y="8" width="1172" height="884" rx="12" fill="none" stroke={inkStrong} strokeWidth="1.15" opacity={isDay ? 0.88 : 0.50} />
        <rect x="28" y="22" width="1144" height="856" rx="8" fill="none" stroke={ink} strokeWidth="0.85" opacity={isDay ? 0.74 : 0.38} />
        <rect x="54" y="70" width="1092" height="758" rx="8" fill="none" stroke={inkSoft} strokeWidth="0.85" opacity={isDay ? 0.72 : 0.30} />
        <path d="M42 50 V850 M1158 50 V850" fill="none" stroke={ink} strokeWidth="0.9" opacity={isDay ? 0.56 : 0.26} />
        <path d="M72 92 V808 M1128 92 V808" fill="none" stroke={inkSoft} strokeWidth="0.75" opacity={isDay ? 0.56 : 0.24} />
        <path d="M84 840 H1116" fill="none" stroke={ink} strokeWidth="0.85" opacity={isDay ? 0.52 : 0.25} />
        <path d="M84 58 H1116" fill="none" stroke={ink} strokeWidth="0.85" opacity={isDay ? 0.52 : 0.25} />

        <g transform="translate(4 8) scale(0.76)"><use href="#hp-corner-filigree" /></g>
        <g transform="translate(1196 8) scale(-0.76 0.76)"><use href="#hp-corner-filigree" /></g>
        <g transform="translate(4 892) scale(0.76 -0.76)"><use href="#hp-corner-filigree" /></g>
        <g transform="translate(1196 892) scale(-0.76 -0.76)"><use href="#hp-corner-filigree" /></g>

        <use href="#hp-side-vine" x="80" y="238" opacity={isDay ? 0.95 : 0.62} />
        <g transform="translate(1120 238) scale(-1 1)" opacity={isDay ? 0.95 : 0.62}><use href="#hp-side-vine" /></g>
        <use href="#hp-top-scroll" x="424" y="66" />
        <g transform="translate(424 836) scale(1 -1)"><use href="#hp-top-scroll" /></g>
        <use href="#hp-feather" x="940" y="120" transform="rotate(-10 1012 168)" opacity={isDay ? 0.24 : 0.22} />
        <use href="#hp-feather" x="116" y="704" transform="rotate(170 188 752)" opacity={isDay ? 0.22 : 0.20} />
        <use href="#hp-crest-ghost" x="1018" y="628" opacity={isDay ? 0.20 : 0.18} />
        <use href="#hp-crest-ghost" x="52" y="126" opacity={isDay ? 0.18 : 0.16} />

        <path d="M258 104 q92 42 184 0 M758 104 q92 42 184 0" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.48" />
        <path d="M258 796 q92-42 184 0 M758 796 q92-42 184 0" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.42" />
        <circle cx="600" cy="104" r="3" fill={inkStrong} />
        <circle cx="600" cy="796" r="3" fill={inkStrong} />
      </svg>
      <div style={{
        position: "absolute",
        inset: "12% 7%",
        borderRadius: 18,
        background: `radial-gradient(34% 22% at 10% 10%, ${paperWash}, transparent 72%), radial-gradient(30% 20% at 90% 88%, ${paperWash}, transparent 74%)`,
        opacity: isDay ? 0.75 : 0.9,
      }} />
    </div>
  );
}

/**
 * 旁白卡片背景的霍格沃茨城堡剪影水印（极淡线稿）。
 * 铺在卡片内、文字之下，模拟羊皮纸上印的城堡轮廓。
 */
export function CastleWatermark({ tone = "day" }) {
  const isDay = tone === "day";
  const GROUND = 282;
  const line     = isDay ? "rgba(116,101,77,0.62)" : "rgba(217,195,139,0.46)";
  const lineSoft = isDay ? "rgba(116,101,77,0.34)" : "rgba(217,195,139,0.26)";
  const fill     = isDay ? "rgba(116,101,77,0.10)" : "rgba(217,195,139,0.075)";
  const fillDeep = isDay ? "rgba(116,101,77,0.17)" : "rgba(217,195,139,0.12)";
  const win = isDay ? "rgba(116,101,77,0.5)" : "rgba(217,195,139,0.4)";

  // 一座尖顶塔楼：塔身 + 锥顶 + 风旗 + 拱窗列。
  const tower = (key, x, top, w, { roofH, flag = true, rows = 2, strong = false } = {}) => {
    const cx = x + w / 2;
    const rh = roofH ?? w * 1.45;
    const roofTop = top - rh;
    const sw = strong ? 1.15 : 0.95;
    const els = [
      <rect key="b" x={x} y={top} width={w} height={GROUND - top} fill={fill} stroke={line} strokeWidth={sw} strokeLinejoin="round" />,
      <path key="band" d={`M${x - 0.5} ${top + 6} H${x + w + 0.5}`} stroke={lineSoft} strokeWidth="0.7" />,
      <path key="r" d={`M${x - 2.5} ${top + 2} Q${cx} ${roofTop - rh * 0.12} ${x + w + 2.5} ${top + 2} L${cx} ${roofTop} Z`} fill={fillDeep} stroke={line} strokeWidth={sw} strokeLinejoin="round" />,
    ];
    if (flag) {
      const fy = roofTop - w * 0.95;
      els.push(<path key="pole" d={`M${cx} ${roofTop} V${fy}`} stroke={line} strokeWidth="0.85" strokeLinecap="round" />);
      els.push(<path key="flag" d={`M${cx} ${fy} q${w * 0.42} ${w * 0.1} ${w * 0.42} ${w * 0.22} q0 ${w * 0.12} ${-w * 0.42} ${w * 0.22} Z`} fill={fillDeep} stroke={line} strokeWidth="0.6" strokeLinejoin="round" />);
      els.push(<circle key="ball" cx={cx} cy={roofTop} r={sw * 1.1} fill={line} />);
    }
    for (let i = 0; i < rows; i++) {
      const wy = top + 12 + i * 13;
      if (wy > GROUND - 8) break;
      els.push(<path key={`w${i}`} d={`M${cx - 1.7} ${wy + 6} v-4.3 a1.7 1.7 0 0 1 3.4 0 v4.3 Z`} fill={win} />);
    }
    return <g key={key}>{els}</g>;
  };

  // 城垛墙段（带雉堞）。
  const wall = (x, w, top, merlon = 4) => {
    let d = `M${x} ${GROUND} V${top + merlon} `;
    const n = Math.max(1, Math.round(w / (merlon * 2)));
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const sx = x + i * step;
      d += `H${sx + step * 0.32} V${top} H${sx + step * 0.68} V${top + merlon} `;
    }
    d += `H${x + w} V${GROUND} Z`;
    return d;
  };

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", display: "grid", placeItems: "start center" }}>
      <svg viewBox="0 0 480 320" width="92%" preserveAspectRatio="xMidYMin meet" style={{ marginTop: "9%", opacity: isDay ? 0.85 : 0.78 }}>
        {/* 远景塔（更淡，制造纵深） */}
        <g opacity="0.55">
          {tower("bg1", 96, 150, 18, { rows: 3 })}
          {tower("bg2", 360, 158, 16, { rows: 2 })}
          {tower("bg3", 250, 120, 20, { rows: 3 })}
        </g>

        {/* 连绵城墙 + 拱门桥 */}
        <path d={wall(70, 340, 222, 7)} fill={fill} stroke={line} strokeWidth="1" strokeLinejoin="round" />
        <path d="M150 282 V250 q14 -16 28 0 V282 M214 282 V244 q15 -17 30 0 V282 M286 282 V250 q14 -16 28 0 V282"
              fill="none" stroke={lineSoft} strokeWidth="0.85" />
        <path d="M70 240 H410" stroke={lineSoft} strokeWidth="0.7" />

        {/* 礼堂：陡坡屋顶 + 高拱窗 */}
        <path d="M300 282 V214 H372 V282" fill={fill} stroke={line} strokeWidth="1" strokeLinejoin="round" />
        <path d="M294 214 L336 184 L378 214 Z" fill={fillDeep} stroke={line} strokeWidth="1" strokeLinejoin="round" />
        <path d="M336 184 V172" stroke={line} strokeWidth="0.8" />
        <path d="M312 282 V236 q8 -12 16 0 V282 M344 282 V236 q8 -12 16 0 V282" fill="none" stroke={win} strokeWidth="0.85" />

        {/* 主群塔，高低错落 */}
        {tower("t-left2", 78, 196, 22, { rows: 5, strong: true })}
        {tower("t-left1", 112, 158, 26, { rows: 6, strong: true })}
        {tower("t-mid",   148, 96,  34, { rows: 9, strong: true, roofH: 56 })}
        {tower("t-rmid",  198, 150, 24, { rows: 6, strong: true })}
        {tower("t-keep",  238, 124, 30, { rows: 7, strong: true, roofH: 46 })}
        {tower("t-right1",392, 176, 22, { rows: 4, strong: true })}
        {tower("t-right2",420, 204, 18, { rows: 3 })}

        {/* 山岩地基 */}
        <path d="M40 282 Q120 296 210 286 Q300 278 420 290 Q452 293 470 286"
              fill="none" stroke={line} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M64 290 Q150 300 250 293 Q350 287 432 296" fill="none" stroke={lineSoft} strokeWidth="0.75" />
        <path d="M96 286 l8 8 M168 288 l-7 8 M300 284 l9 9 M372 290 l-8 7" stroke={lineSoft} strokeWidth="0.6" opacity="0.7" />
      </svg>
    </div>
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
