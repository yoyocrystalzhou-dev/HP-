/**
 * Visual design tokens. Two palettes — LIGHT (warm paper, the Phase UI-1
 * default) and DARK (the original ChatGPT-style dark) — share an identical key
 * set so every component can keep importing the single mutable `T` object.
 *
 * Switching themes mutates `T` in place via applyTheme(); the App root then
 * forces a re-render so all inline styles read the new values. No component
 * needs to change its `import { T } from "./theme.js"`.
 *
 * Only colors / visual tokens live here — no logic.
 */

// ─── Warm paper (default) ───────────────────────────────────────────────
export const LIGHT = {
  // surfaces
  bg:         "radial-gradient(circle at 50% -12%, rgba(184,146,62,0.16), transparent 32%), radial-gradient(circle at 18% 18%, rgba(163,18,20,0.10), transparent 34%), linear-gradient(135deg, #F8F6F2 0%, #F1E7CF 55%, #E8EEF2 100%)", // main workspace paper
  bgSidebar:  "#F2EFE9", // drawer / sidebar (slightly deeper paper)
  surface:    "#FFFFFF", // input bar, elevated controls
  surface2:   "#FFFFFF", // cards, AI bubble
  hover:      "#EFEAE1",

  // borders
  border:     "#E8E2D8",
  borderSoft: "#EFEAE1",

  // text
  text:       "#2D2A26",
  textDim:    "#7A746B",
  textFaint:  "#A89F92",

  // bubbles
  userBubble: "#EFE7D6", // warm tan, reads like margin notes

  // accents (ink on paper — no tech blue)
  accent:     "#2D2A26", // primary button background (ink)
  accentText: "#F8F6F2", // text on accent
  accentSoft: "#EFE7D6",

  // semantic
  danger:      "#C0594B",
  dangerBg:    "#F7E9E5",
  greenBg:     "#E7EFE3",
  greenBorder: "#CBD9C0",
  greenText:   "#5C7A4E",
  warnText:    "#9A6B1A",
  warnBorder:  "#E0C48A",
  warnBg:      "#FBF3DF",

  // shape / depth (new in UI-1)
  radius:      16,
  radiusSm:    10,
  shadow:      "0 1px 3px rgba(45,42,38,0.06), 0 1px 2px rgba(45,42,38,0.04)",
  shadowSoft:  "0 1px 2px rgba(45,42,38,0.05)",
  overlay:     "rgba(248,246,242,0.88)", // tint over project background image

  // RP shell / chat manuscript theme
  frame:       "linear-gradient(180deg, rgba(255,250,240,0.94), rgba(241,233,215,0.94)), repeating-linear-gradient(135deg, rgba(120,92,48,0.035) 0 1px, transparent 1px 10px)",
  headerBar:   "linear-gradient(90deg, rgba(184,146,62,0.16), rgba(255,250,240,0.58), transparent)",
  chatBackdrop:"radial-gradient(circle at 15% 8%, rgba(184,146,62,0.10), transparent 32%), linear-gradient(180deg, rgba(255,250,240,0.68), rgba(239,224,188,0.48))",
  emptyPanel:  "linear-gradient(180deg, rgba(255,250,240,0.82), rgba(239,224,188,0.46))",
  inputBar:    "rgba(255,250,240,0.78)",
  inputField:  "rgba(255,248,230,0.88)",
  softControl: "rgba(255,248,230,0.52)",
  seal:        "radial-gradient(circle at 35% 30%, #C9574B, #A31214 48%, #5B1113 100%)",
  titleText:   "linear-gradient(92deg, #7C5A21, #B8923E 58%, #A31214)",
  gold:        "#B8923E",
  goldDim:     "#8D6D32",
  red:         "#A31214",
  redLit:      "#B63A36",
  ink:         "#5D6076",
  muted:       "#787B8D",
  faint:       "#A3A0A0",
  line:        "rgba(176,151,83,0.48)",
  lineSoft:    "rgba(176,151,83,0.24)",
  paper:       "linear-gradient(180deg, #FFF8E6, #EFE0BC), repeating-linear-gradient(0deg, rgba(130,98,48,0.10) 0 1px, transparent 1px 28px)",
  userPaper:   "linear-gradient(180deg, #FFF2D5, #E6CB8E), repeating-linear-gradient(0deg, rgba(130,98,48,0.10) 0 1px, transparent 1px 28px)",
  paperText:   "#463521",
  serif:       "Georgia, 'Noto Serif SC', 'Songti SC', serif",
};

// ─── Original dark (ChatGPT-style) ──────────────────────────────────────
export const DARK = {
  bg:         "radial-gradient(circle at 50% -12%, rgba(210,195,139,0.18), transparent 32%), radial-gradient(circle at 18% 18%, rgba(143,30,34,0.26), transparent 34%), radial-gradient(circle at 82% 28%, rgba(55,82,116,0.32), transparent 36%), linear-gradient(135deg, #050609 0%, #101622 42%, #090b10 100%)",
  bgSidebar:  "#171717",
  surface:    "#2f2f2f",
  surface2:   "#1e1e1e",
  hover:      "#3a3a3a",

  border:     "#3a3a3a",
  borderSoft: "#2c2c2c",

  text:       "#ececec",
  textDim:    "#b4b4b4",
  textFaint:  "#8e8e8e",

  userBubble: "#303030",

  accent:     "#ececec",
  accentText: "#171717",
  accentSoft: "#343541",

  danger:      "#f87171",
  dangerBg:    "#3a1f1f",
  greenBg:     "#13301f",
  greenBorder: "#1f5135",
  greenText:   "#4ade80",
  warnText:    "#fbbf24",
  warnBorder:  "#7a5a1a",
  warnBg:      "#2a2410",

  radius:      16,
  radiusSm:    10,
  shadow:      "0 1px 3px rgba(0,0,0,0.4)",
  shadowSoft:  "0 1px 2px rgba(0,0,0,0.3)",
  overlay:     "rgba(33,33,33,0.86)",

  // RP shell / chat manuscript theme
  frame:       "linear-gradient(180deg, rgba(32,41,56,0.9), rgba(9,12,18,0.94)), repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 9px)",
  headerBar:   "linear-gradient(90deg, rgba(143,30,34,0.22), rgba(217,195,139,0.07), transparent)",
  chatBackdrop:"radial-gradient(circle at 15% 8%, rgba(217,195,139,0.09), transparent 32%), linear-gradient(180deg, rgba(10,12,18,0.16), rgba(10,12,18,0.44))",
  emptyPanel:  "linear-gradient(180deg, rgba(239,227,196,0.08), rgba(9,12,18,0.18))",
  inputBar:    "rgba(9,12,18,0.74)",
  inputField:  "rgba(13,17,25,0.92)",
  softControl: "rgba(239,227,196,0.06)",
  seal:        "radial-gradient(circle at 35% 30%, #CF4C45, #8F1E22 48%, #4B0D12 100%)",
  titleText:   "linear-gradient(92deg, #FFF2BD, #D9C38B 58%, #B54842)",
  gold:        "#D9C38B",
  goldDim:     "#8C7446",
  red:         "#8F1E22",
  redLit:      "#C54845",
  ink:         "#F2DFAA",
  muted:       "#AAA18D",
  faint:       "#766F63",
  line:        "rgba(217,195,139,0.5)",
  lineSoft:    "rgba(217,195,139,0.24)",
  paper:       "linear-gradient(180deg, rgba(239,227,196,0.96), rgba(214,194,150,0.94)), repeating-linear-gradient(0deg, rgba(92,73,42,0.12) 0 1px, transparent 1px 28px)",
  userPaper:   "linear-gradient(180deg, #F5E8C7, #D7BD83), repeating-linear-gradient(0deg, rgba(92,73,42,0.12) 0 1px, transparent 1px 28px)",
  paperText:   "#3C3024",
  serif:       "Georgia, 'Noto Serif SC', 'Songti SC', serif",
};

/**
 * Single mutable palette object. Components import this by reference and read
 * its keys at render time, so mutating it (below) + re-rendering re-themes the
 * whole app. Defaults to the warm-paper LIGHT palette.
 */
export const T = { ...LIGHT };

export const THEMES = { light: LIGHT, dark: DARK };

/** Swap the active palette in place. Caller must trigger a re-render. */
export function applyTheme(mode) {
  Object.assign(T, mode === "dark" ? DARK : LIGHT);
  return T;
}
