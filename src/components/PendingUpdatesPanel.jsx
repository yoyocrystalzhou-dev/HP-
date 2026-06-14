import { useState } from "react";
import { Btn } from "./UI.jsx";
import { I } from "./Icons.jsx";
import { T } from "../theme.js";

const TYPE_LABEL = {
  projectTime: "当前时间",
  currentState: "剧情状态",
  story: "主线事件",
  world: "世界事实",
  characterHistory: "角色经历",
  characterState: "角色状态",
  playerHistory: "玩家经历",
  playerState: "玩家状态",
};

const CURRENT_STATE_FIELD_LABEL = {
  location: "地点",
  scene: "场景",
  arc: "篇章",
  presentCharacters: "在场角色",
  recentEvents: "近期事件",
  unresolvedThreads: "未解决伏线",
  knownFacts: "已知事实",
  forbiddenAssumptions: "禁止假设",
};

function relText(o) {
  if (!o || typeof o !== "object") return o ? String(o) : "（空）";
  const b = [];
  if (o.status) b.push(`关系：${o.status}`);
  if (o.feeling) b.push(`感受：${o.feeling}`);
  if (o.note) b.push(o.note);
  return b.join("；") || "（空）";
}

function contentString(v) {
  if (v == null) return "";
  return typeof v === "object" ? (v.content ?? "") : String(v);
}

function targetLabel(pu, nameMap) {
  if (pu.type.startsWith("player")) return "玩家";
  if (pu.targetCharId) return nameMap[pu.targetCharId] || pu.targetCharId;
  return "项目（世界）";
}

function PendingCard({ pu, nameMap, chatName, onAccept, onReject }) {
  const isRel = pu.stateField === "relationship";
  const isStatus = (pu.type === "characterState" || pu.type === "playerState") && pu.stateField === "status";
  const isProjectTime = pu.type === "projectTime";
  const isCurrentState = pu.type === "currentState";
  const usesDate = pu.type === "story" || pu.type === "characterHistory" || pu.type === "playerHistory";

  const [text, setText] = useState(contentString(pu.newValue));
  const [date, setDate] = useState(pu.date || "");
  const nv = (typeof pu.newValue === "object" && pu.newValue) || {};
  const [rstatus, setRstatus] = useState(nv.status || "");
  const [rfeeling, setRfeeling] = useState(nv.feeling || "");
  const [rnote, setRnote] = useState(nv.note || "");

  const accept = () => {
    if (isRel) onAccept(pu.id, { status: rstatus, feeling: rfeeling, note: rnote }, usesDate ? date : undefined);
    else onAccept(pu.id, text, usesDate ? date : undefined);
  };

  const typeLabel = TYPE_LABEL[pu.type] + (isRel ? " · 关系" : isCurrentState ? ` · ${CURRENT_STATE_FIELD_LABEL[pu.stateField] || pu.stateField}` : "");
  const showsOldValue = isRel || isStatus || isProjectTime || (isCurrentState && pu.op === "update");
  const oldText = isRel ? relText(pu.oldValue) : showsOldValue ? (pu.oldValue || "（空）") : "（新增）";

  const field = {
    width: "100%", boxSizing: "border-box", padding: "6px 9px",
    border: `1.5px solid ${T.border}`, borderRadius: 6, fontSize: 12.5,
    fontFamily: "inherit", background: T.surface, color: T.text, outline: "none",
  };

  return (
    <div style={{ border: `1.5px solid ${pu.inferred ? T.warnBorder : T.border}`, borderRadius: 10, padding: 11, background: T.surface2 }}>
      {/* head */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.accentText, background: T.accent, borderRadius: 5, padding: "2px 7px" }}>{typeLabel}</span>
        <span style={{ fontSize: 12, color: T.textDim }}>→ {targetLabel(pu, nameMap)}{isRel && pu.relTarget ? `／对 ${nameMap[pu.relTarget] || pu.relTarget}` : ""}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.textFaint }}>置信 {Math.round((pu.confidence || 0) * 100)}%</span>
        {pu.inferred && <span style={{ fontSize: 10, fontWeight: 700, color: T.warnText, background: T.warnBg, border: `1px solid ${T.warnBorder}`, borderRadius: 5, padding: "1px 6px" }}>⚠ 推断</span>}
      </div>

      {/* old → new */}
      {showsOldValue && (
        <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 6 }}>旧值：{oldText}</div>
      )}

      {/* editable date (event types) */}
      {usesDate && (
        <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="时间（如 1992年12月）" style={{ ...field, marginBottom: 6 }} />
      )}

      {/* editable new value */}
      {isRel ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          <input value={rstatus} onChange={(e) => setRstatus(e.target.value)} placeholder="关系（如 恋人/结盟/决裂）" style={field} />
          <input value={rfeeling} onChange={(e) => setRfeeling(e.target.value)} placeholder="感受（如 信任/戒备）" style={field} />
          <input value={rnote} onChange={(e) => setRnote(e.target.value)} placeholder="补充（可选）" style={field} />
        </div>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} style={{ ...field, resize: "vertical", marginBottom: 8 }} />
      )}

      {/* evidence + source */}
      <div style={{ fontSize: 11, color: T.textDim, background: T.bg, borderRadius: 6, padding: "6px 8px", marginBottom: 8, lineHeight: 1.5 }}>
        <span style={{ color: T.textFaint }}>依据：</span>「{pu.evidence}」
        <div style={{ color: T.textFaint, marginTop: 3 }}>来源：{chatName || "—"}（{pu.sourceKind === "world" ? "世界聊天" : "角色聊天"}）</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn small onClick={accept} style={{ flex: 1, justifyContent: "center" }}><I.Check />接受</Btn>
        <Btn small variant="ghost" onClick={() => onReject(pu.id)}>拒绝</Btn>
      </div>
    </div>
  );
}

/**
 * Pending Updates inbox — model-suggested memory changes awaiting the user.
 * Nothing here has been written; accept (after optional edit) is the only write.
 * props: updates[], nameMap{id:name}, chatNameMap{id:name},
 *        onAccept(id, editedValue), onReject(id), onRejectAll(), onAcceptHigh()
 */
export default function PendingUpdatesPanel({ updates, nameMap, chatNameMap, onAccept, onReject, onRejectAll, onAcceptHigh }) {
  if (!updates || updates.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0", color: T.textFaint, fontSize: 13 }}>
        暂无待确认建议<br />
        <span style={{ fontSize: 12 }}>在聊天中点击「✨ 提炼记忆建议」生成</span>
      </div>
    );
  }

  const highCount = updates.filter((u) => !u.inferred && (u.confidence || 0) >= 0.8).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: T.textDim, flex: 1 }}>{updates.length} 条待确认</span>
        {highCount > 0 && <Btn small variant="ghost" onClick={onAcceptHigh}>接受高置信 · {highCount}</Btn>}
        <Btn small variant="danger" onClick={onRejectAll}><I.Trash />全部拒绝</Btn>
      </div>
      <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 10, lineHeight: 1.5 }}>
        以下均为模型建议，尚未写入。可直接编辑内容后再接受；标记「⚠ 推断」的不计入"接受高置信"。
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {updates.map((pu) => (
          <PendingCard
            key={pu.id}
            pu={pu}
            nameMap={nameMap}
            chatName={chatNameMap[pu.sourceChatId]}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}
