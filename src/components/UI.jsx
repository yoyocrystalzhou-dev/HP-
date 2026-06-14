/** Shared primitive UI components used across panels. */

import { T } from "../theme.js";

export function Toggle({ value, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 34, height: 19, borderRadius: 999, cursor: "pointer",
        background: value ? T.seal : T.softControl,
        border: `1px solid ${value ? T.line : T.lineSoft}`,
        position: "relative", flexShrink: 0, transition: "background 0.2s",
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: value ? 17 : 3,
        width: 11, height: 11, borderRadius: "50%",
        background: value ? T.gold : T.faint, transition: "left 0.2s",
      }} />
    </div>
  );
}

export function Btn({ onClick, children, variant = "primary", small, disabled, style: extra = {} }) {
  const variants = {
    primary: { background: T.seal, color: T.gold, borderRadius: 999, border: `1px solid ${T.line}` },
    ghost:   { background: T.softControl, color: T.muted, borderRadius: 999, border: `1px solid ${T.lineSoft}` },
    danger:  { background: T.dangerBg, color: T.danger, borderRadius: 999, border: `1px solid ${T.lineSoft}` },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", fontWeight: 600,
        transition: "all 0.15s", opacity: disabled ? 0.5 : 1,
        padding: small ? "5px 11px" : "8px 14px",
        fontSize: small ? 11 : 13,
        boxShadow: variant === "primary" ? "inset 0 2px 8px rgba(255,255,255,0.12)" : "none",
        ...variants[variant],
        ...extra,
      }}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700,
        color: T.goldDim, marginBottom: 6,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, type = "text", placeholder = "", rows }) {
  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    border: `1px solid ${T.lineSoft}`, borderRadius: 14,
    fontSize: 13, fontFamily: "inherit",
    background: T.inputField, color: T.ink,
    outline: "none", lineHeight: 1.5,
  };
  const onFocus = (e) => (e.target.style.borderColor = T.line);
  const onBlur  = (e) => (e.target.style.borderColor = T.lineSoft);
  if (rows) {
    return (
      <textarea
        value={value} onChange={onChange} rows={rows}
        style={{ ...inputStyle, resize: "vertical" }}
        placeholder={placeholder} onFocus={onFocus} onBlur={onBlur}
      />
    );
  }
  return (
    <input
      type={type} value={value} onChange={onChange}
      style={inputStyle} placeholder={placeholder}
      onFocus={onFocus} onBlur={onBlur}
    />
  );
}
