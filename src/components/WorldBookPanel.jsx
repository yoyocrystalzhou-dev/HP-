import { useState, useRef } from "react";
import { Toggle, Btn, Field, Input } from "./UI.jsx";
import { I } from "./Icons.jsx";
import { fileToText, uid } from "../lib/utils.js";
import { callAPIOnce } from "../lib/api.js";
import { T } from "../theme.js";

// ─── Entry editor ─────────────────────────────────────────────────────────────

function WorldEntryEditor({ entry: init, onSave, onCancel }) {
  const [e, setE] = useState({ ...init });
  const u = (k, v) => setE((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: T.textDim, fontSize: 13, padding: 0, fontFamily: "inherit" }}>
          ← 返回
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{init.title ? "编辑条目" : "新建条目"}</span>
      </div>

      <Field label="标题">
        <Input value={e.title} onChange={(ev) => u("title", ev.target.value)} placeholder="条目名称" />
      </Field>

      <Field label="触发关键词">
        <Input value={e.keywords} onChange={(ev) => u("keywords", ev.target.value)} placeholder="魔法, 精灵, 地图（英文逗号分隔）" />
        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>任意关键词被提及即触发注入</div>
      </Field>

      <Field label="注入内容">
        <Input value={e.content} onChange={(ev) => u("content", ev.target.value)} rows={5} placeholder="触发时注入到 System Prompt 的内容..." />
      </Field>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => onSave(e)} style={{ flex: 1, justifyContent: "center" }}>保存</Btn>
        <Btn variant="ghost" onClick={onCancel}>取消</Btn>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function WorldBookPanel({ entries, setEntries, config }) {
  const [editingId, setEditingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  // ── AI file import ──
  const handleFileUpload = async (files) => {
    if (!config.apiKey) {
      alert("请先在「配置」中填写 API Key，才能使用 AI 解析功能");
      return;
    }
    setImporting(true);
    setPreview(null);
    try {
      let allText = "";
      for (const file of files) {
        if (file.type === "application/pdf") {
          allText += `[文件: ${file.name}]\n（PDF 请转成文本格式再上传）\n\n`;
        } else {
          const text = await fileToText(file);
          allText += `[文件: ${file.name}]\n${text}\n\n`;
        }
      }

      const prompt = `你是一个世界书构建助手。请仔细阅读以下文本，自动提取其中的重要设定、人物、地点、事件、概念等，拆分成若干世界书条目。

要求：
- 每个条目包含：title（标题）、keywords（触发关键词，英文逗号分隔，3-6个）、content（详细描述）
- 条目数量由内容复杂度决定，通常 3-10 个
- 关键词要自然，是用户可能在对话中说到的词
- 返回纯 JSON 数组，格式：[{"title":"...","keywords":"...","content":"..."},...]
- 不要返回任何其他内容，只返回 JSON 数组

文本内容：
${allText.slice(0, 6000)}`;

      const raw = await callAPIOnce(config, prompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setPreview(parsed.map((e) => ({ ...e, id: uid(), enabled: true })));
    } catch (err) {
      alert("解析失败：" + err.message);
    } finally {
      setImporting(false);
    }
  };

  // ── Save helpers ──
  const saveEntry = (entry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = entry; return n; }
      return [...prev, entry];
    });
    setEditingId(null);
  };

  const toggleEntry = (id) =>
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)));

  const deleteEntry = (id) =>
    setEntries((p) => p.filter((e) => e.id !== id));

  // ── Editing view ──
  if (editingId !== null) {
    const blank = { id: uid(), title: "", keywords: "", content: "", enabled: true };
    const entry = editingId === "new"
      ? blank
      : entries.find((e) => e.id === editingId) || blank;
    return <WorldEntryEditor entry={entry} onSave={saveEntry} onCancel={() => setEditingId(null)} />;
  }

  // ── List view ──
  return (
    <div>
      {/* Upload zone */}
      <div style={{ border: `1.5px dashed ${T.border}`, borderRadius: 9, padding: 14, marginBottom: 14, background: T.surface2, textAlign: "center" }}>
        <input
          ref={fileRef} type="file" multiple accept=".txt,.md,.json,.csv"
          style={{ display: "none" }}
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        />
        {importing ? (
          <div style={{ color: T.textDim, fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
            AI 解析中…
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: T.textDim, marginBottom: 8 }}>上传文件，AI 自动提取世界书条目</div>
            <Btn small onClick={() => fileRef.current?.click()}><I.Upload />上传文件（TXT / MD / JSON）</Btn>
            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 6 }}>支持世界设定、人物志、剧情大纲等</div>
          </>
        )}
      </div>

      {/* Import preview */}
      {preview && (
        <div style={{ border: `1.5px solid ${T.greenBorder}`, borderRadius: 9, padding: 12, marginBottom: 14, background: T.greenBg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.greenText }}>✦ 解析出 {preview.length} 个条目</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn small variant="ghost" onClick={() => setPreview(null)}>取消</Btn>
              <Btn small onClick={() => { setEntries((p) => [...p, ...preview]); setPreview(null); }}>
                <I.Check />全部导入
              </Btn>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
            {preview.map((e, i) => (
              <div key={i} style={{ background: T.surface2, borderRadius: 7, padding: "8px 10px", border: `1px solid ${T.greenBorder}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{e.title}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>关键词：{e.keywords}</div>
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 4, lineHeight: 1.5 }}>
                  {e.content.slice(0, 80)}{e.content.length > 80 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry list */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: T.textDim }}>{entries.length} 个条目</span>
        <Btn small onClick={() => setEditingId("new")}><I.Plus />手动新建</Btn>
      </div>

      {entries.length === 0 && !preview && (
        <div style={{ textAlign: "center", padding: "20px 0", color: T.textFaint, fontSize: 13 }}>暂无条目</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {entries.map((e) => (
          <div
            key={e.id}
            style={{
              border: "1.5px solid", borderColor: e.enabled ? T.border : T.borderSoft,
              borderRadius: 8, padding: "9px 11px",
              background: e.enabled ? T.surface2 : T.bg, opacity: e.enabled ? 1 : 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Toggle value={e.enabled} onChange={() => toggleEntry(e.id)} />
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: T.text }}>{e.title || "（无标题）"}</span>
              <button onClick={() => setEditingId(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textDim, padding: 2, display: "flex" }}><I.Edit /></button>
              <button onClick={() => deleteEntry(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, padding: 2, display: "flex" }}><I.Trash /></button>
            </div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 5 }}>
              关键词：<span style={{ color: T.text }}>{e.keywords || "（未设置）"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
