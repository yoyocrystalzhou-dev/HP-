import { useState, useRef } from "react";
import { Field, Input, Btn } from "./UI.jsx";
import { I } from "./Icons.jsx";
import Avatar from "./Avatar.jsx";
import { uid, fileToText, imageToDataURL, isImageValue } from "../lib/utils.js";
import { createHistoryEvent, createCharacterState } from "../lib/projects.js";
import { T } from "../theme.js";
import { parseCharacterDrafts } from "../lib/importChars.js";

const AVATARS = ["🧙","🧝","🤖","🐉","👸","🧛","🦸","🧜","👨‍🔬","🧚","🗡️","🌙","🧑","👤"];

/**
 * Editor for an AI character OR the player character.
 *   - isPlayer hides the greeting (the player is never role-played by the AI)
 *   - relationship target: pick a known entity (AI char / player) OR type a free
 *     NPC name; a name that exactly matches a candidate is stored by its id.
 */
function CharacterEditor({ char: init, candidates, isPlayer, onSave, onCancel }) {
  const idToName = Object.fromEntries(candidates.map((c) => [c.id, c.name]));
  const [c, setC] = useState({ ...init });
  const [rels, setRels] = useState(() =>
    Object.entries(init.state?.relationships || {}).map(([key, v]) => ({
      text: idToName[key] || key, status: v.status || "", feeling: v.feeling || "", note: v.note || "",
    }))
  );
  const [histInput, setHistInput] = useState("");
  const avatarFileRef = useRef(null);
  const u = (k, v) => setC((p) => ({ ...p, [k]: v }));
  const smallInput = {
    width: "100%", boxSizing: "border-box", padding: "7px 10px",
    border: `1px solid ${T.lineSoft}`, borderRadius: 12, fontSize: 12,
    fontFamily: "inherit", background: T.inputField, color: T.ink, outline: "none",
  };
  const cardStyle = {
    border: `1px solid ${T.lineSoft}`,
    borderRadius: 18,
    padding: 10,
    background: T.softControl,
    boxShadow: "inset 0 0 20px rgba(255,250,226,0.04)",
  };
  const iconButton = {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    border: `1px solid ${T.lineSoft}`,
    borderRadius: 11,
    background: T.softControl,
    cursor: "pointer",
    padding: 0,
  };

  const addRel = () => setRels((p) => [...p, { text: "", status: "", feeling: "", note: "" }]);
  const updateRel = (i, k, v) => setRels((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const removeRel = (i) => setRels((p) => p.filter((_, j) => j !== i));

  const addHist = () => {
    const text = histInput.trim();
    if (!text) return;
    setC((p) => ({ ...p, history: [...(p.history || []), createHistoryEvent({ content: text, scope: "character" })] }));
    setHistInput("");
  };
  const removeHist = (id, idx) =>
    setC((p) => ({ ...p, history: (p.history || []).filter((h, i) => (h.id ? h.id !== id : i !== idx)) }));

  const resolveTarget = (text) => {
    const t = text.trim();
    if (!t) return null;
    const hit = candidates.find((cand) => cand.name.trim() === t);
    return hit ? hit.id : t; // known → id; else free-text NPC
  };

  const save = () => {
    const relationships = {};
    for (const r of rels) {
      const target = resolveTarget(r.text);
      if (!target) continue;
      relationships[target] = { status: r.status || "", feeling: r.feeling || "", note: r.note || "", updatedAt: Date.now() };
    }
    const state = createCharacterState({ status: c.state?.status || "", relationships });
    onSave({ ...c, state, history: c.history || [] });
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await imageToDataURL(file, 512, 0.86);
      u("avatar", dataUrl);
    } catch {
      window.alert("头像图片读取失败，请换一张图片再试。");
    }
  };

  const listId = "rel-target-list";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onCancel} style={{ background: T.softControl, border: `1px solid ${T.lineSoft}`, borderRadius: 999, cursor: "pointer", color: T.muted, fontSize: 13, padding: "6px 10px", fontFamily: "inherit" }}>
          ← 返回
        </button>
        <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 800, color: T.ink }}>
          {isPlayer ? "编辑玩家角色（你扮演）" : init.name === "新角色" ? "新建角色" : "编辑角色"}
        </span>
      </div>

      <datalist id={listId}>
        {candidates.map((cand) => <option key={cand.id} value={cand.name} />)}
      </datalist>

      <Field label="头像">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar
            value={c.avatar}
            fallback={isPlayer ? "🧑" : "🧙"}
            size={54}
            radius={18}
            style={{ border: `1px solid ${T.line}`, background: T.softControl, boxShadow: "0 10px 22px rgba(0,0,0,0.14)" }}
          />
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadAvatar} />
            <Btn small variant="ghost" onClick={() => avatarFileRef.current?.click()}><I.Upload />上传图片</Btn>
            {isImageValue(c.avatar) && (
              <Btn small variant="ghost" onClick={() => u("avatar", isPlayer ? "🧑" : "🧙")}>恢复默认</Btn>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {AVATARS.map((a) => (
            <button key={a} onClick={() => u("avatar", a)} style={{ fontSize: 20, padding: "5px 7px", borderRadius: 13, border: "1px solid", borderColor: c.avatar === a ? T.line : T.lineSoft, background: c.avatar === a ? T.paper : T.softControl, cursor: "pointer" }}>
              {a}
            </button>
          ))}
        </div>
      </Field>

      <Field label="名称">
        <Input value={c.name} onChange={(e) => u("name", e.target.value)} placeholder={isPlayer ? "你在这个世界的名字（如 Evelyn）" : "角色名称"} />
      </Field>

      <Field label={isPlayer ? "角色描述 / Persona" : "人设 / Persona"}>
        <Input value={c.persona} onChange={(e) => u("persona", e.target.value)} rows={4} placeholder={isPlayer ? "描述你扮演的角色：身份、性格、背景..." : "描述角色性格、背景、说话风格..."} />
      </Field>

      {!isPlayer && (
        <Field label="开场白">
          <Input value={c.greeting} onChange={(e) => u("greeting", e.target.value)} rows={2} placeholder="一对一聊天时角色的第一句话..." />
        </Field>
      )}

      <Field label="当前状态 (State · 现在)">
        <Input value={c.state?.status || ""} onChange={(e) => setC((p) => ({ ...p, state: { ...(p.state || {}), status: e.target.value } }))} rows={2} placeholder="此刻的处境 / 心情 / 目标..." />
      </Field>

      <Field label="关系 (relationships)">
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 7, lineHeight: 1.45 }}>
          对象可选已有角色 / 玩家，或直接输入 NPC 名。status=客观关系；feeling=主观感受；note=补充。
        </div>
        {rels.map((r, i) => (
          <div key={i} style={{ ...cardStyle, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <input list={listId} value={r.text} onChange={(e) => updateRel(i, "text", e.target.value)} placeholder="选择角色/玩家 或 输入 NPC 名" style={{ ...smallInput, flex: 1 }} />
              <button onClick={() => removeRel(i)} style={{ ...iconButton, color: T.danger }}><I.Trash /></button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={r.status} onChange={(e) => updateRel(i, "status", e.target.value)} placeholder="关系：恋人/朋友/决裂/敌对/结盟" style={smallInput} />
              <input value={r.feeling} onChange={(e) => updateRel(i, "feeling", e.target.value)} placeholder="感受：深爱/戒备/愧疚" style={smallInput} />
            </div>
            <input value={r.note} onChange={(e) => updateRel(i, "note", e.target.value)} placeholder="补充说明（可选）" style={smallInput} />
          </div>
        ))}
        <Btn small variant="ghost" onClick={addRel} style={{ width: "100%", justifyContent: "center" }}><I.Plus />添加关系</Btn>
      </Field>

      <Field label={`经历 (History · 过去)${(c.history || []).length > 0 ? ` · ${c.history.length}` : ""}`}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input value={histInput} onChange={(e) => setHistInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHist(); } }} placeholder="新增一条经历…" style={{ ...smallInput, fontSize: 13, padding: "8px 11px" }} />
          <Btn onClick={addHist} disabled={!histInput.trim()}><I.Plus />加</Btn>
        </div>
        {(c.history || []).length === 0 ? (
          <div style={{ fontSize: 12, color: T.faint, padding: "8px 0" }}>暂无经历</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(c.history || []).map((h, i) => (
              <div key={h.id || i} style={{ ...cardStyle, display: "flex", gap: 8 }}>
                <div style={{ flex: 1, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{h.date ? `${h.date}：${h.content}` : h.content}</div>
                <button onClick={() => removeHist(h.id, i)} style={{ ...iconButton, color: T.faint, flexShrink: 0, alignSelf: "flex-start" }}><I.Trash /></button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Btn onClick={save} style={{ flex: 1, justifyContent: "center" }}>保存</Btn>
        <Btn variant="ghost" onClick={onCancel}>取消</Btn>
      </div>
    </div>
  );
}

export default function CharacterPanel({ characters, activeId, activeMode, player, onSelect, onEdit, onEditPlayer, onDelete, onImportChars }) {
  const [editingId, setEditingId] = useState(null);
  const [drafts, setDrafts] = useState(null); // 6A: parsed TXT character drafts, or null
  const fileRef = useRef(null);

  // 6A-2A: read a .txt file locally and parse it into character drafts. No API.
  const onImportFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const text = await fileToText(f);
    setDrafts(parseCharacterDrafts(text).map((d) => ({ ...d, checked: true })));
  };

  const blankChar = () => ({
    id: uid(), name: "新角色", avatar: "🧙", persona: "",
    greeting: "你好！有什么我可以帮助你的？",
    state: { status: "", relationships: {} }, history: [],
  });

  const handleSave = (ch) => { onEdit(ch); setEditingId(null); };
  const cardStyle = {
    border: `1px solid ${T.lineSoft}`,
    borderRadius: 18,
    background: T.softControl,
    boxShadow: "inset 0 0 20px rgba(255,250,226,0.04)",
  };
  const iconButton = {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    border: `1px solid ${T.lineSoft}`,
    borderRadius: 11,
    background: T.softControl,
    cursor: "pointer",
    padding: 0,
  };

  if (editingId !== null) {
    const isPlayer = editingId === "player";
    const char = isPlayer
      ? player
      : editingId === "new"
      ? blankChar()
      : characters.find((c) => c.id === editingId) || blankChar();
    const candidates = isPlayer
      ? characters.map((c) => ({ id: c.id, name: c.name }))
      : [
          ...characters.filter((c) => c.id !== char.id).map((c) => ({ id: c.id, name: c.name })),
          { id: player.id, name: player.name },
        ];
    return (
      <CharacterEditor
        char={char}
        candidates={candidates}
        isPlayer={isPlayer}
        onSave={isPlayer ? (ch) => { onEditPlayer(ch); setEditingId(null); } : handleSave}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  // 6A-2B: TXT draft preview. Select which parsed drafts to create. No creation
  // happens here yet — that is wired in 6A-2C.
  if (drafts !== null) {
    const toggle = (i) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, checked: !d.checked } : d)));
    const selectedCount = drafts.filter((d) => d.checked).length;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 800, color: T.ink }}>导入角色草稿</span>
          <span style={{ fontSize: 11, color: T.faint }}>{drafts.length} 条 · 选中 {selectedCount}</span>
        </div>

        {drafts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: T.faint, fontSize: 13, ...cardStyle }}>解析不到角色条目</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {drafts.map((d, i) => (
              <label key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", cursor: "pointer", ...cardStyle }}>
                <input type="checkbox" checked={d.checked} onChange={() => toggle(i)} style={{ marginTop: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{d.avatar} {d.name}</div>
                  <div style={{ fontSize: 11, color: T.faint, marginTop: 3, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {d.persona || "（无人设文本）"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Btn onClick={() => { onImportChars(drafts.filter((d) => d.checked)); setDrafts(null); }} disabled={selectedCount === 0}>创建选中角色</Btn>
          <Btn variant="ghost" onClick={() => setDrafts(null)}>取消</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Player character — pinned, not an AI chat target */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.goldDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.06em" }}>玩家角色（你扮演）</div>
        <div
          onClick={() => setEditingId("player")}
          style={{ ...cardStyle, padding: "11px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}
        >
          <Avatar value={player?.avatar} fallback="🧑" size={34} radius={12} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{player?.name || "我"}</div>
            <div style={{ fontSize: 11, color: T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {player?.state?.status || player?.persona || "点击设置你在这个世界的身份"}
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setEditingId("player"); }} style={{ ...iconButton, color: T.muted }}><I.Edit /></button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: T.muted }}>AI 角色 · 点击进入一对一聊天</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input ref={fileRef} type="file" accept=".txt,text/plain" style={{ display: "none" }} onChange={onImportFile} />
          <Btn small variant="ghost" onClick={() => fileRef.current?.click()}><I.Upload />从 TXT 导入</Btn>
          <Btn small onClick={() => setEditingId("new")}><I.Plus />新建</Btn>
        </div>
      </div>

      {characters.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: T.faint, fontSize: 13, ...cardStyle }}>
          暂无角色卡<br /><span style={{ fontSize: 12 }}>点击「新建」创建第一个</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {characters.map((ch) => {
          const isActive = activeMode === "character" && activeId === ch.id;
          return (
            <div
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              style={{
                border: "1px solid", borderColor: isActive ? T.line : T.lineSoft,
                borderRadius: 18, padding: "11px 12px", cursor: "pointer",
                background: isActive ? T.paper : T.softControl,
                boxShadow: isActive ? "0 12px 28px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,250,226,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar value={ch.avatar} fallback="🧙" size={34} radius={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? T.paperText : T.ink }}>
                    {ch.name}
                    {(ch.chatIds?.length || 0) > 0 && <span style={{ fontSize: 11, color: isActive ? T.goldDim : T.faint, fontWeight: 500 }}> · {ch.chatIds.length} 对话</span>}
                  </div>
                  <div style={{ fontSize: 11, color: isActive ? T.goldDim : T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ch.state?.status || ch.persona || "无人设"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditingId(ch.id)} style={{ ...iconButton, color: T.muted }}><I.Edit /></button>
                  <button onClick={() => onDelete(ch.id)} style={{ ...iconButton, color: T.danger }}><I.Trash /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
