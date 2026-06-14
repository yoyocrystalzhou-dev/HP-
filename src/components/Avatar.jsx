import { isImageValue } from "../lib/utils.js";

export default function Avatar({ value, fallback = "👤", size = 32, radius = 12, style }) {
  const base = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius,
    lineHeight: 1,
    ...style,
  };

  if (isImageValue(value)) {
    return (
      <span style={base}>
        <img
          src={value}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </span>
    );
  }

  return <span style={{ ...base, fontSize: Math.max(13, Math.round(size * 0.58)) }}>{value || fallback}</span>;
}
