import { useState, useRef } from "react";
import { Toggle, Btn, Field, Input } from "./UI.jsx";
import { I } from "./Icons.jsx";
import { createProjectFile, formatProjectFiles } from "../lib/projects.js";
import { fileToText } from "../lib/utils.js";

const A = {
  paper: "#FDF7E4",
  paperAlt: "#FFFBF2",
  paperDim: "#F1EDE1",
  ink: "#636A81",
  inkSoft: "#7680A3",
  inkFaint: "#9AA6BE",
  line: "#B0C7DA",
  lineSoft: "#D6DEEA",
  rose: "#A31214",
  roseSoft: "#BA9493",
  gold: "#B8923E",
};

const SERIF = "Georgia, 'Noto Serif SC', 'Songti SC', serif";
const SUITS = ["♠", "♥", "♦", "♣"];
const IMPORT_ACCEPT = ".txt,.md,.json,.csv";

// "时间线.md" → "时间线"；无扩展名时原样返回。仅去掉最后一段扩展名。
function stripExtension(name) {
  const base = String(name || "").replace(/^.*[\\/]/, "");
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

function formatDate(value) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fileTime(file, key) {
  const time = Number(file?.[key]);
  return Number.isFinite(time) ? time : 0;
}

function fileContent(file) {
  return typeof file?.content === "string" ? file.content : String(file?.content || "");
}

function charCount(text) {
  return String(text || "").trim().length;
}

function iconButtonStyle(color) {
  return {
    width: 24,
    height: 24,
    border: "none",
    borderRadius: 6,
    background: "rgba(255,255,255,0.35)",
    color,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
}

function FileEditor({ file, onSave, onCancel }) {
  const [title, setTitle] = useState(file.title || "");
  const [content, setContent] = useState(file.content || "");
  const [enabled, setEnabled] = useState(file.enabled !== false);

  return (
    <div style={{ color: A.ink }}>
      <button
        onClick={onCancel}
        style={{ border: "none", background: "transparent", color: A.inkSoft, cursor: "pointer", padding: 0, marginBottom: 10, fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}
      >
        ← 返回档案馆
      </button>

      <div style={{ border: `1px solid ${A.line}`, borderRadius: 8, background: A.paperAlt, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ color: A.rose, fontSize: 14 }}>♦</span>
          <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: A.ink }}>
            {file.id ? "编辑档案页" : "新建档案页"}
          </div>
        </div>

        <Field label="标题 / Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="模拟器规则 / 写作风格 / 时间线" />
        </Field>

        <Field label="内容 / Content">
          <Input value={content} onChange={(e) => setContent(e.target.value)} rows={12} placeholder="写下规则、设定、时间线、大纲、NPC 资料..." />
        </Field>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Toggle value={enabled} onChange={() => setEnabled((value) => !value)} />
          <span style={{ fontSize: 12, fontWeight: 700, color: enabled ? A.ink : A.inkFaint }}>
            {enabled ? "启用此档案" : "停用此档案"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => onSave({ title, content, enabled })} style={{ flex: 1, justifyContent: "center" }}>
            <I.Check />保存
          </Btn>
          <Btn variant="ghost" onClick={onCancel}>取消</Btn>
        </div>
      </div>
    </div>
  );
}

export default function ProjectFilesPanel({ files = [], setFiles }) {
  const [editingId, setEditingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [copiedId, setCopiedId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const fileInputRef = useRef(null);
  const total = files.length;
  const enabledCount = files.filter((file) => file.enabled).length;
  const promptFileBlocks = formatProjectFiles(files);
  const promptPreviewText = promptFileBlocks.length ? `【项目文件】\n${promptFileBlocks.join("\n\n")}` : "";
  const totalChars = files.reduce((sum, file) => sum + charCount(fileContent(file)), 0);
  const injectableChars = files.reduce((sum, file) => (
    file.enabled !== false ? sum + charCount(fileContent(file)) : sum
  ), 0);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleFiles = files.filter((file) => {
    const enabled = file.enabled !== false;
    if (filter === "enabled" && !enabled) return false;
    if (filter === "disabled" && enabled) return false;
    if (!normalizedQuery) return true;
    return `${file.title || ""}\n${file.content || ""}`.toLowerCase().includes(normalizedQuery);
  }).sort((a, b) => {
    if (sortBy === "title") {
      return String(a.title || "").localeCompare(String(b.title || ""), "zh-CN");
    }
    if (sortBy === "created") {
      return fileTime(b, "createdAt") - fileTime(a, "createdAt");
    }
    return fileTime(b, "updatedAt") - fileTime(a, "updatedAt");
  });

  // Phase 7A-5: import plain-text files as project files. No PDF, no AI parsing.
  const importFiles = async (fileList) => {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    setImporting(true);
    try {
      const drafts = [];
      for (const file of picked) {
        let content = "";
        try {
          content = await fileToText(file);
        } catch {
          content = "";
        }
        drafts.push(createProjectFile({
          title: stripExtension(file.name),
          content: typeof content === "string" ? content : "",
          enabled: true,
        }));
      }
      // Append to existing files; never overwrite.
      setFiles((prev) => [...prev, ...drafts]);
    } finally {
      setImporting(false);
    }
  };

  const onPickFiles = (e) => {
    importFiles(e.target.files);
    e.target.value = ""; // allow re-importing the same file(s)
  };

  const saveFile = ({ title, content, enabled }) => {
    setFiles((prev) => {
      const index = prev.findIndex((file) => file.id === editingId);
      if (editingId === "new" || index < 0) {
        return [...prev, createProjectFile({ title, content, enabled })];
      }

      const next = [...prev];
      next[index] = { ...next[index], title, content, enabled, updatedAt: Date.now() };
      return next;
    });
    setEditingId(null);
  };

  const toggleFile = (id) => {
    setFiles((prev) => prev.map((file) => (
      file.id === id ? { ...file, enabled: !file.enabled, updatedAt: Date.now() } : file
    )));
  };

  const deleteFile = (id) => {
    if (!window.confirm("删除这页档案？")) return;
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const copyFileContent = async (file) => {
    const text = typeof file.content === "string" ? file.content : String(file.content || "");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId((id) => (id === file.id ? null : id)), 1400);
    } catch {
      window.prompt("复制失败，请手动复制：", text);
    }
  };

  const setVisibleEnabled = (enabled) => {
    const visibleIds = new Set(visibleFiles.map((file) => file.id));
    if (!visibleIds.size) return;
    setFiles((prev) => prev.map((file) => {
      if (!visibleIds.has(file.id) || (file.enabled !== false) === enabled) return file;
      return { ...file, enabled, updatedAt: Date.now() };
    }));
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (editingId !== null) {
    const file = editingId === "new"
      ? { title: "", content: "", enabled: true }
      : files.find((item) => item.id === editingId) || { title: "", content: "", enabled: true };

    return <FileEditor file={file} onSave={saveFile} onCancel={() => setEditingId(null)} />;
  }

  return (
    <div style={{ color: A.ink }}>
      <div style={{ border: `1px solid ${A.line}`, borderRadius: 8, background: A.paperAlt, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: A.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              故事档案馆
            </div>
            <div style={{ fontSize: 11, color: A.inkFaint, fontStyle: "italic" }}>Story Archive</div>
          </div>
          <div style={{ color: A.rose, fontSize: 13, flexShrink: 0 }}>♠ ♥ ♦ ♣</div>
        </div>
        <div style={{ height: 1, background: A.lineSoft, margin: "10px 0" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, color: A.inkSoft }}>{enabledCount} / {total} 启用</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={IMPORT_ACCEPT}
              style={{ display: "none" }}
              onChange={onPickFiles}
            />
            <Btn small variant="ghost" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              <I.Upload />{importing ? "导入中…" : "导入文件"}
            </Btn>
            <Btn small onClick={() => setEditingId("new")}><I.Plus />新建</Btn>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: A.inkFaint, marginTop: 6 }}>
          支持 TXT / MD / JSON / CSV，可多选。
        </div>
      </div>

      {total > 0 && (
        <div style={{ border: `1px solid ${A.lineSoft}`, borderRadius: 8, background: A.paperAlt, padding: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, color: A.ink, fontSize: 13, fontWeight: 700 }}>当前注入预览</div>
              <div style={{ color: A.inkFaint, fontSize: 10.5, marginTop: 2 }}>
                {promptFileBlocks.length} 个启用档案会进入 prompt · 约 {injectableChars.toLocaleString("zh-CN")} 字符
              </div>
            </div>
            <button
              onClick={() => setShowPromptPreview((value) => !value)}
              style={{ border: `1px solid ${A.lineSoft}`, borderRadius: 7, background: showPromptPreview ? A.paper : "transparent", color: A.inkSoft, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, padding: "5px 8px", flexShrink: 0 }}
            >
              {showPromptPreview ? "收起" : "查看"}
            </button>
          </div>
          {showPromptPreview && (
            <pre style={{ margin: "9px 0 0", maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", border: `1px dashed ${A.lineSoft}`, borderRadius: 7, background: A.paper, color: A.inkSoft, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, lineHeight: 1.55, padding: 9 }}>
              {promptPreviewText || "没有启用且有内容的项目文件。"}
            </pre>
          )}
        </div>
      )}

      {total > 0 && (
        <div style={{ border: `1px solid ${A.lineSoft}`, borderRadius: 8, background: A.paperAlt, padding: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, border: `1px solid ${A.lineSoft}`, borderRadius: 7, background: A.paper, padding: "7px 8px" }}>
              <div style={{ fontSize: 10.5, color: A.inkFaint, fontWeight: 700 }}>全部字符</div>
              <div style={{ marginTop: 2, fontFamily: SERIF, color: A.ink, fontSize: 14, fontWeight: 700 }}>{totalChars.toLocaleString("zh-CN")}</div>
            </div>
            <div style={{ flex: 1, border: `1px solid ${A.lineSoft}`, borderRadius: 7, background: A.paper, padding: "7px 8px" }}>
              <div style={{ fontSize: 10.5, color: A.inkFaint, fontWeight: 700 }}>注入字符</div>
              <div style={{ marginTop: 2, fontFamily: SERIF, color: A.rose, fontSize: 14, fontWeight: 700 }}>{injectableChars.toLocaleString("zh-CN")}</div>
            </div>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题或内容..."
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${A.line}`, borderRadius: 7, background: A.paper, color: A.ink, fontSize: 12.5, fontFamily: "inherit", padding: "7px 9px", outline: "none" }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[
              ["all", `全部 ${total}`],
              ["enabled", `启用 ${enabledCount}`],
              ["disabled", `停用 ${total - enabledCount}`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  flex: 1,
                  border: `1px solid ${filter === key ? A.roseSoft : A.lineSoft}`,
                  borderRadius: 7,
                  background: filter === key ? A.paper : "transparent",
                  color: filter === key ? A.rose : A.inkSoft,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "5px 6px",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ color: A.inkFaint, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>排序</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: "100%", border: `1px solid ${A.lineSoft}`, borderRadius: 7, background: A.paper, color: A.inkSoft, fontSize: 11, fontFamily: "inherit", padding: "5px 7px", outline: "none" }}
            >
              <option value="updated">最近更新优先</option>
              <option value="created">最近创建优先</option>
              <option value="title">标题 A-Z</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => setVisibleEnabled(true)}
              disabled={visibleFiles.length === 0}
              style={{ flex: 1, border: `1px solid ${A.lineSoft}`, borderRadius: 7, background: A.paper, color: visibleFiles.length ? A.inkSoft : A.inkFaint, cursor: visibleFiles.length ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 11, fontWeight: 700, padding: "5px 6px", opacity: visibleFiles.length ? 1 : 0.55 }}
            >
              启用当前结果
            </button>
            <button
              onClick={() => setVisibleEnabled(false)}
              disabled={visibleFiles.length === 0}
              style={{ flex: 1, border: `1px solid ${A.lineSoft}`, borderRadius: 7, background: "transparent", color: visibleFiles.length ? A.rose : A.inkFaint, cursor: visibleFiles.length ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 11, fontWeight: 700, padding: "5px 6px", opacity: visibleFiles.length ? 1 : 0.55 }}
            >
              停用当前结果
            </button>
          </div>
          {(normalizedQuery || filter !== "all") && (
            <div style={{ fontSize: 10.5, color: A.inkFaint, marginTop: 7 }}>
              显示 {visibleFiles.length} / {total} 个档案
            </div>
          )}
        </div>
      )}

      {total === 0 && (
        <div style={{ textAlign: "center", border: `1px dashed ${A.line}`, borderRadius: 8, background: A.paper, padding: "24px 14px", color: A.inkSoft, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ color: A.roseSoft, letterSpacing: 6, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
          档案馆空空如也。<br />
          把模拟器规则、写作风格、时间线和大纲收进来吧。
        </div>
      )}

      {total > 0 && visibleFiles.length === 0 && (
        <div style={{ textAlign: "center", border: `1px dashed ${A.line}`, borderRadius: 8, background: A.paper, padding: "20px 14px", color: A.inkSoft, fontSize: 12, lineHeight: 1.7, marginBottom: 8 }}>
          没有匹配的档案。
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleFiles.map((file, index) => {
          const enabled = file.enabled !== false;
          const expanded = expandedIds.has(file.id);
          const contentText = fileContent(file).trim() || "（空白档案页）";
          const count = charCount(contentText === "（空白档案页）" ? "" : contentText);
          return (
            <div
              key={file.id}
              style={{
                position: "relative",
                border: `1px solid ${enabled ? A.line : A.lineSoft}`,
                borderLeft: `3px solid ${enabled ? A.rose : A.lineSoft}`,
                borderRadius: 8,
                background: enabled ? A.paper : A.paperDim,
                opacity: enabled ? 1 : 0.72,
                padding: "10px 11px",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", right: 10, top: 7, color: index % 2 ? A.roseSoft : A.inkFaint, fontSize: 12 }}>
                {SUITS[index % SUITS.length]}
              </div>

              <div style={{ paddingRight: 20, fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: enabled ? A.ink : A.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.title?.trim() || "未命名文件"}
              </div>

              <div style={{ marginTop: 5, fontSize: 12, color: enabled ? A.inkSoft : A.inkFaint, lineHeight: 1.5, maxHeight: expanded ? "none" : 36, overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                {contentText}
              </div>

              <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px dashed ${A.lineSoft}`, display: "flex", alignItems: "center", gap: 8 }}>
                <Toggle value={enabled} onChange={() => toggleFile(file.id)} />
                <span style={{ fontSize: 10.5, color: enabled ? A.ink : A.inkFaint, fontWeight: 700 }}>{enabled ? "启用" : "停用"}</span>
                <button onClick={() => toggleExpanded(file.id)} style={{ border: "none", background: "transparent", color: A.inkSoft, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                  {expanded ? "收起" : "展开"}
                </button>
                <span style={{ flex: 1, minWidth: 0, color: A.inkFaint, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {count.toLocaleString("zh-CN")} 字符 · 更新于 {formatDate(file.updatedAt)}
                </span>
                <button title="复制内容" onClick={() => copyFileContent(file)} style={iconButtonStyle(copiedId === file.id ? A.gold : A.inkSoft)}>
                  {copiedId === file.id ? <I.Check /> : <I.Copy />}
                </button>
                <button title="编辑" onClick={() => setEditingId(file.id)} style={iconButtonStyle(A.inkSoft)}><I.Edit /></button>
                <button title="删除" onClick={() => deleteFile(file.id)} style={iconButtonStyle(A.rose)}><I.Trash /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
