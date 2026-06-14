import { useState } from "react";
import { Btn } from "./UI.jsx";
import { I } from "./Icons.jsx";
import { T } from "../theme.js";

const LAYERS = {
  world: {
    label: "世界记忆",
    hint: "世界范围的客观事实，所有角色共享。例如：霍格沃茨位于英国 / 伏地魔已倒台。",
    placeholder: "新增一条世界客观事实…",
    empty: "暂无世界记忆",
  },
  story: {
    label: "主线记忆",
    hint: "记录这个故事已经发生过什么（时间线 / 主线进度），项目内共享。对话后会自动追加。",
    placeholder: "新增一条主线剧情…",
    empty: "暂无主线记忆",
  },
};

/**
 * Project-level memory panel with two sub-tabs (World / Story).
 * Character Memory lives inside the character editor.
 *
 * props: worldMemory, storyMemory, onAdd(layer, text), onDelete(layer, index), onClear(layer)
 */
export default function MemoryPanel({ worldMemory, storyMemory, onAdd, onDelete, onClear }) {
  const [layer, setLayer] = useState("story");
  const [text, setText] = useState("");

  const list = layer === "world" ? worldMemory : storyMemory;
  const meta = LAYERS[layer];

  const add = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(layer, t);
    setText("");
  };

  return (
    <div>
      {/* Sub-tab switch */}
      <div style={{ display: "flex", gap: 4, background: T.surface, borderRadius: 8, padding: 3, marginBottom: 12 }}>
        {Object.keys(LAYERS).map((k) => {
          const count = (k === "world" ? worldMemory : storyMemory).length;
          const active = layer === k;
          return (
            <button
              key={k}
              onClick={() => setLayer(k)}
              style={{
                flex: 1, padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                background: active ? T.accent : "transparent",
                color: active ? T.accentText : T.textDim,
              }}
            >
              {LAYERS[k].label}{count > 0 ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 10, lineHeight: 1.5 }}>{meta.hint}</div>

      {/* Add row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={meta.placeholder}
          style={{ flex: 1, boxSizing: "border-box", padding: "8px 11px", border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text, outline: "none" }}
        />
        <Btn onClick={add} disabled={!text.trim()}><I.Plus />加</Btn>
      </div>

      {list.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: T.textDim }}>{list.length} 条</span>
          <Btn small variant="danger" onClick={() => onClear(layer)}><I.Trash />清空</Btn>
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: T.textFaint, fontSize: 13 }}>{meta.empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map((m, i) => (
            <div key={m.id || i} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 11px", background: T.surface2, display: "flex", gap: 8 }}>
              <div style={{ flex: 1, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>
                {m.date && <span style={{ color: T.textFaint, fontWeight: 600 }}>{m.date}：</span>}
                {m.content}
              </div>
              <button
                onClick={() => onDelete(layer, i)}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, padding: 2, display: "flex", flexShrink: 0, alignSelf: "flex-start" }}
              >
                <I.Trash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
