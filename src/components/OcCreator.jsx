import { useState } from "react";
import { GOLD, INK, MUTED, FONT_HUA, FONT_LATIN, NIGHT_BG, Starfield, Flourish } from "./hpAtmosphere.jsx";
import { OC_RELATIONS } from "../lib/oc.js";

/**
 * 原创角色（OC）创建表单 —— 暗黑沉浸风 · 移动优先。
 * 产出 oc = { name, gender, house, persona, tieName, tieRelation }。
 *
 * props: { canonNames[], onSave(oc), onCancel }
 */

const GENDERS = ["女", "男", "其他"];
const HOUSES = ["格兰芬多", "斯莱特林", "赫奇帕奇", "拉文克劳", "未定"];
const FAMILIES = ["二十八圣族", "没落纯血", "富裕混血", "普通巫师", "麻瓜家庭", "孤儿"];

export default function OcCreator({ canonNames = [], onSave, onCancel }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [house, setHouse] = useState("");
  const [family, setFamily] = useState("");
  const [familyDetail, setFamilyDetail] = useState("");
  const [appearance, setAppearance] = useState("");
  const [persona, setPersona] = useState("");
  const [tieName, setTieName] = useState("");
  const [tieRelation, setTieRelation] = useState("");

  const valid = name.trim().length > 0 && persona.trim().length > 0;

  const field = {
    width: "100%", padding: "11px 13px", borderRadius: 11, border: "1px solid rgba(232,199,102,0.32)",
    background: "rgba(255,255,255,0.04)", color: INK, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };
  const chip = (active) => ({
    padding: "8px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${active ? "rgba(232,199,102,0.6)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(232,199,102,0.12)" : "rgba(255,255,255,0.03)", color: INK,
  });
  const label = { fontSize: 11.5, color: MUTED, marginBottom: 7, letterSpacing: 1 };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", width: "100%", boxSizing: "border-box", overflow: "auto",
      background: NIGHT_BG, color: INK, fontFamily: "inherit" }}>
      <Starfield count={70} />
      <div style={{ position: "relative", maxWidth: 460, margin: "0 auto", padding: "max(40px,6vh) 22px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: FONT_LATIN, fontSize: 12, letterSpacing: 3, color: MUTED, marginBottom: 10 }}>ORIGINAL CHARACTER</div>
          <h2 style={{ margin: "0 0 13px", fontFamily: FONT_HUA, fontSize: 32, fontWeight: 400, color: INK, letterSpacing: 3, textShadow: "0 2px 24px rgba(232,199,102,0.3)" }}>添加原创角色</h2>
          <Flourish width={170} />
          <p style={{ margin: "12px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>你自己的角色，会与哈利他们共处一个世界</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={label}>名字</div>
            <input style={field} placeholder="例如：艾米丽" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <div style={label}>性别</div>
            <div style={{ display: "flex", gap: 8 }}>
              {GENDERS.map((g) => <button key={g} style={chip(gender === g)} onClick={() => setGender(g)}>{g}</button>)}
            </div>
          </div>

          <div>
            <div style={label}>学院</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {HOUSES.map((h) => <button key={h} style={chip(house === h)} onClick={() => setHouse(h)}>{h}</button>)}
            </div>
          </div>

          <div>
            <div style={label}>家世背景（可选）</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {FAMILIES.map((f) => <button key={f} style={{ ...chip(family === f), padding: "6px 12px", fontSize: 12.5 }} onClick={() => setFamily(family === f ? "" : f)}>{f}</button>)}
            </div>
            <input style={field} placeholder="家庭细节（可选）：父母、家境、家族往事…" value={familyDetail} maxLength={60} onChange={(e) => setFamilyDetail(e.target.value)} />
          </div>

          <div>
            <div style={label}>相貌（可选）</div>
            <textarea style={{ ...field, minHeight: 64, resize: "none" }} placeholder="发色、瞳色、身形、气质、特征…" value={appearance} maxLength={140} onChange={(e) => setAppearance(e.target.value)} />
          </div>

          <div>
            <div style={label}>性格 / 设定</div>
            <textarea style={{ ...field, minHeight: 84, resize: "none" }} placeholder="TA 是个怎样的人？性格、口头禅、立场…" value={persona} maxLength={200} onChange={(e) => setPersona(e.target.value)} />
          </div>

          <div>
            <div style={label}>与原著角色的关系（可选）</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ ...field, flex: 1, cursor: "pointer" }} value={tieName} onChange={(e) => setTieName(e.target.value)}>
                <option value="" style={{ color: "#000" }}>不关联</option>
                {canonNames.map((n) => <option key={n} value={n} style={{ color: "#000" }}>{n}</option>)}
              </select>
              <select style={{ ...field, flex: 1, cursor: "pointer" }} value={tieRelation} onChange={(e) => setTieRelation(e.target.value)} disabled={!tieName}>
                <option value="" style={{ color: "#000" }}>关系…</option>
                {OC_RELATIONS.map((r) => <option key={r} value={r} style={{ color: "#000" }}>{r}</option>)}
              </select>
            </div>
            {tieName && (
              <div style={{ fontSize: 11, color: MUTED, marginTop: 7 }}>
                = <span style={{ color: GOLD }}>{tieName} 的{tieRelation || "熟人"}</span>（仅日常层面，不改原著主线）
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26 }}>
          <button onClick={onCancel} style={{ padding: "11px 20px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>取消</button>
          <button disabled={!valid} onClick={() => valid && onSave({ name: name.trim(), gender, house: house === "未定" ? "" : house, family, familyDetail: familyDetail.trim(), appearance: appearance.trim(), persona: persona.trim(), tieName, tieRelation })}
            style={{ padding: "11px 24px", borderRadius: 999, border: "none",
              background: valid ? "linear-gradient(180deg, #f0d98a, #d4b257)" : "rgba(255,255,255,0.08)",
              color: valid ? "#23190a" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700,
              cursor: valid ? "pointer" : "not-allowed", fontFamily: "inherit", boxShadow: valid ? "0 0 18px rgba(232,199,102,0.4)" : "none" }}>
            加入世界 →
          </button>
        </div>
      </div>
    </div>
  );
}
