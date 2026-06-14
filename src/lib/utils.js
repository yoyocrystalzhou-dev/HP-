export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function fileToText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}

export function matchWorld(entries, text) {
  const lower = text.toLowerCase();
  return entries.filter((e) => {
    if (!e.enabled) return false;
    return e.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
      .some((k) => lower.includes(k));
  });
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Decode an image File, downscale it so its longest side ≤ maxSize, and return
 * a compressed data URL. Keeps localStorage footprint small for avatars and
 * project backgrounds. Accepts PNG/JPG/WebP; outputs WebP. Browser-only.
 */
export function imageToDataURL(file, maxSize = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/webp", quality));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/** True when an avatar/background value is an uploaded image (vs an emoji). */
export function isImageValue(v) {
  return typeof v === "string" && v.startsWith("data:");
}
