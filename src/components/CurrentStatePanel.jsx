import { useState } from "react";
import { Field, Input, Btn } from "./UI.jsx";
import { T } from "../theme.js";
import { uid } from "../lib/utils.js";

// Phase 5-2A: minimal current-state editor — only location / scene / arc.
// List fields (recentEvents, threads, knownFacts, forbiddenAssumptions) and
// narratorOnly are intentionally NOT here yet.
export default function CurrentStatePanel({ currentState, onSave }) {
  const cs = currentState || {};
  const [location, setLocation] = useState(cs.location || "");
  const [scene, setScene] = useState(cs.scene || "");
  const [arc, setArc] = useState(cs.arc || "");
  const [present, setPresent] = useState(cs.presentCharacters || []);
  const [recent, setRecent] = useState(cs.recentEvents || []);
  const [threads, setThreads] = useState(cs.unresolvedThreads || []);
  const [facts, setFacts] = useState(cs.knownFacts || []);
  const [forbidden, setForbidden] = useState(cs.forbiddenAssumptions || []);

  const save = () =>
    onSave({ location: location.trim(), scene: scene.trim(), arc: arc.trim(), presentCharacters: present, recentEvents: recent, unresolvedThreads: threads, knownFacts: facts, forbiddenAssumptions: forbidden });

  return (
    <div>
      <Field label="地点 / Location">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例如：霍格沃茨 魔药教室"
        />
      </Field>

      <Field label="场景 / Scene">
        <Input
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          rows={2}
          placeholder="当前正在发生什么…"
        />
      </Field>

      <Field label="篇章 / Arc">
        <Input
          value={arc}
          onChange={(e) => setArc(e.target.value)}
          placeholder="例如：密室事件"
        />
      </Field>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>在场角色 / Present</label>
          <button
            onClick={() => setPresent([...present, { id: uid(), ref: "" }])}
            style={{ padding: "3px 9px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            + 添加
          </button>
        </div>
        {present.length === 0 && <div style={{ fontSize: 11, color: T.textFaint }}>（空）</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {present.map((it, i) => (
            <div key={it.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={it.ref || ""}
                onChange={(e) => setPresent(present.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))}
                placeholder="角色名或 NPC…"
                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "7px 10px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text, outline: "none" }}
              />
              <button
                onClick={() => setPresent(present.filter((_, j) => j !== i))}
                style={{ width: 28, height: 28, flexShrink: 0, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textFaint, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>近期事件 / Recent Events</label>
          <button
            onClick={() => setRecent([...recent, { id: uid(), content: "" }])}
            style={{ padding: "3px 9px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            + 添加
          </button>
        </div>
        {recent.length === 0 && <div style={{ fontSize: 11, color: T.textFaint }}>（空）</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {recent.map((it, i) => (
            <div key={it.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={it.content || ""}
                onChange={(e) => setRecent(recent.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                placeholder="刚刚发生的事…"
                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "7px 10px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text, outline: "none" }}
              />
              <button
                onClick={() => setRecent(recent.filter((_, j) => j !== i))}
                style={{ width: 28, height: 28, flexShrink: 0, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textFaint, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>未解决伏线 / Threads</label>
          <button
            onClick={() => setThreads([...threads, { id: uid(), content: "" }])}
            style={{ padding: "3px 9px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            + 添加
          </button>
        </div>
        {threads.length === 0 && <div style={{ fontSize: 11, color: T.textFaint }}>（空）</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {threads.map((it, i) => (
            <div key={it.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={it.content || ""}
                onChange={(e) => setThreads(threads.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                placeholder="未解决的线索…"
                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "7px 10px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text, outline: "none" }}
              />
              <button
                onClick={() => setThreads(threads.filter((_, j) => j !== i))}
                style={{ width: 28, height: 28, flexShrink: 0, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textFaint, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>已知事实 / Known Facts</label>
          <button
            onClick={() => setFacts([...facts, { id: uid(), content: "" }])}
            style={{ padding: "3px 9px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            + 添加
          </button>
        </div>
        {facts.length === 0 && <div style={{ fontSize: 11, color: T.textFaint }}>（空）</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {facts.map((it, i) => (
            <div key={it.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={it.content || ""}
                onChange={(e) => setFacts(facts.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                placeholder="当前场景相关事实…"
                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "7px 10px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text, outline: "none" }}
              />
              <button
                onClick={() => setFacts(facts.filter((_, j) => j !== i))}
                style={{ width: 28, height: 28, flexShrink: 0, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textFaint, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>禁止假设 / Forbidden</label>
          <button
            onClick={() => setForbidden([...forbidden, { id: uid(), content: "" }])}
            style={{ padding: "3px 9px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            + 添加
          </button>
        </div>
        {forbidden.length === 0 && <div style={{ fontSize: 11, color: T.textFaint }}>（空）</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {forbidden.map((it, i) => (
            <div key={it.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={it.content || ""}
                onChange={(e) => setForbidden(forbidden.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                placeholder="AI 不得假设的内容…"
                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "7px 10px", border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text, outline: "none" }}
              />
              <button
                onClick={() => setForbidden(forbidden.filter((_, j) => j !== i))}
                style={{ width: 28, height: 28, flexShrink: 0, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.textFaint, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
                title="删除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <Btn onClick={save}>保存</Btn>

      <div style={{ fontSize: 11, color: T.textFaint, marginTop: 8, lineHeight: 1.6 }}>
        注入到每次对话（世界聊天 / 角色聊天都注入）。这是「当前场景快照」，与永久记忆分开。
      </div>
    </div>
  );
}
