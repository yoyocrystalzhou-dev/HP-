import { useState } from "react";
import { GOLD, GOLD_DIM, INK, MUTED, FONT_HUA, FONT_LATIN, NIGHT_BG, Starfield, Flourish } from "./hpAtmosphere.jsx";
import { HOUSE_BONUSES, WAND_WOODS, WAND_CORES, formatBonuses } from "../lib/stats.js";

/**
 * 角色创建向导（主控人设）—— 暗黑沉浸风 · 移动优先。
 * 字段：姓名/性别 · 学院 · 血统 · 家世背景 · 相貌 · 魔杖 · 擅长 · 性格。
 * 产出 player = { name, persona, meta }。
 */

const GENDERS = ["女", "男", "其他"];
const HOUSES = [
  { key: "格兰芬多", blurb: "勇气 · 正义 · 冒险" },
  { key: "斯莱特林", blurb: "野心 · 精明 · 谋略" },
  { key: "赫奇帕奇", blurb: "善良 · 忠诚 · 勤奋" },
  { key: "拉文克劳", blurb: "智慧 · 好奇 · 创造" },
];
const BLOODS = [
  { key: "纯血", blurb: "父母皆为巫师；斯莱特林初始好感更高" },
  { key: "混血", blurb: "一方巫师一方麻瓜；两个世界的中介" },
  { key: "麻瓜出身", blurb: "麻瓜家庭的天赋巫师；初入魔法世界" },
];
const FAMILIES = [
  { key: "二十八圣族", blurb: "显赫纯血世家，名望与财富" },
  { key: "没落纯血", blurb: "曾经显赫，如今家道中落" },
  { key: "富裕混血", blurb: "家境优渥的混血之家" },
  { key: "普通巫师家庭", blurb: "温饱小康的巫师之家" },
  { key: "麻瓜家庭", blurb: "麻瓜父母，初入魔法世界" },
  { key: "孤儿 / 寄养", blurb: "无父母，寄人篱下" },
];
const SUBJECTS = ["魔咒学", "魔药学", "变形术", "草药学", "黑魔法防御术", "魔法史", "天文学", "飞行 / 魁地奇"];
const TRAITS = ["勇敢", "胆小", "毒舌", "温柔", "高傲", "好奇", "沉稳", "冲动", "腹黑", "天真", "冷淡", "热情"];
const HOUSE_KEYS = HOUSES.map((h) => h.key);

export default function CharacterCreator({ generation, onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [house, setHouse] = useState("");
  const [blood, setBlood] = useState("");
  const [family, setFamily] = useState("");
  const [familyDetail, setFamilyDetail] = useState("");
  const [appearance, setAppearance] = useState("");
  const [wood, setWood] = useState("");
  const [core, setCore] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [traits, setTraits] = useState([]);
  const [intro, setIntro] = useState("");

  const toggle = (setter, max) => (v) =>
    setter((p) => (p.includes(v) ? p.filter((x) => x !== v) : p.length < max ? [...p, v] : p));
  const toggleSubject = toggle(setSubjects, 2);
  const toggleTrait = toggle(setTraits, 3);
  const sortingHat = () => setHouse(HOUSE_KEYS[Math.floor(Math.random() * HOUSE_KEYS.length)]);

  const steps = [
    { title: "你叫什么名字", sub: "1991 学年的霍格沃茨新生", valid: () => name.trim().length > 0 },
    { title: "你属于哪个学院", sub: "可自选，或让分院帽决定", valid: () => !!house },
    { title: "你的血统", sub: "影响初始人际与剧情线索", valid: () => !!blood },
    { title: "你的家世背景", sub: "出身门第，可补一句家庭细节", valid: () => !!family },
    { title: "你的相貌", sub: "发色 / 瞳色 / 身形 / 气质 / 特征", valid: () => true },
    { title: "选择你的魔杖", sub: "魔杖选择巫师", valid: () => !!wood && !!core },
    { title: "你擅长什么", sub: "最多选 2 门，给判定加成", valid: () => subjects.length > 0 },
    { title: "你的性格", sub: "选标签 + 自由描述（性格、为人、口头禅…）", valid: () => true },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;
  const selectedWood = WAND_WOODS.find((w) => w.key === wood);
  const selectedCore = WAND_CORES.find((c) => c.key === core);

  const finish = () => {
    const persona = [
      `姓名：${name.trim()}${gender ? `（${gender}）` : ""}`,
      `身份：1991 学年新生（与哈利·波特同届入学）`,
      `学院：${house}`,
      `血统：${blood}`,
      family ? `家世：${family}${familyDetail.trim() ? `；${familyDetail.trim()}` : ""}` : null,
      appearance.trim() ? `相貌：${appearance.trim()}` : null,
      `魔杖：${wood} + ${core}`,
      subjects.length ? `擅长：${subjects.join("、")}` : null,
      traits.length || intro.trim() ? `性格：${[traits.join("、"), intro.trim()].filter(Boolean).join("；")}` : null,
    ].filter(Boolean).join("\n");
    onComplete({
      name: name.trim(),
      persona,
      meta: { gender, house, blood, family, familyDetail: familyDetail.trim(), appearance: appearance.trim(), wand: { wood, core }, subjects, traits },
    });
  };

  const card = (active) => ({
    padding: "13px 15px", borderRadius: 13,
    border: `1px solid ${active ? "rgba(232,199,102,0.6)" : "rgba(255,255,255,0.08)"}`,
    background: active ? "linear-gradient(160deg, rgba(42,35,20,0.95), rgba(20,18,12,0.95))" : "rgba(255,255,255,0.025)",
    color: INK, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.14s",
    boxShadow: active ? "0 0 18px rgba(232,199,102,0.12)" : "none", WebkitTapHighlightColor: "transparent",
  });
  const chip = (active) => ({
    padding: "8px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${active ? "rgba(232,199,102,0.6)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(232,199,102,0.12)" : "rgba(255,255,255,0.03)", color: INK,
  });
  const field = {
    width: "100%", padding: "11px 13px", borderRadius: 11, border: "1px solid rgba(232,199,102,0.32)",
    background: "rgba(255,255,255,0.04)", color: INK, fontSize: 14.5, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };
  const label = { fontSize: 11.5, color: MUTED, marginBottom: 7, letterSpacing: 1 };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", width: "100%", boxSizing: "border-box", overflow: "auto",
      background: NIGHT_BG, color: INK, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "30px 20px", fontFamily: "inherit" }}>
      <Starfield count={70} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? GOLD : "rgba(255,255,255,0.12)", boxShadow: i <= step ? "0 0 6px rgba(232,199,102,0.5)" : "none", transition: "all 0.25s" }} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: FONT_LATIN, fontSize: 12, letterSpacing: 3, color: MUTED, marginBottom: 12 }}>{generation?.subtitle || "子世代"} · 角色创建</div>
          <h2 style={{ margin: "0 0 13px", fontFamily: FONT_HUA, fontSize: 32, fontWeight: 400, color: INK, letterSpacing: 3, textShadow: "0 2px 24px rgba(232,199,102,0.3)" }}>{cur.title}</h2>
          <Flourish width={170} />
          <p style={{ margin: "11px 0 0", fontSize: 12.5, color: MUTED }}>{cur.sub}</p>
        </div>

        <div style={{ minHeight: 176 }}>
          {step === 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={label}>名字</div>
                <input style={field} placeholder="例如：林晓" value={name} maxLength={14} autoFocus onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <div style={label}>性别</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {GENDERS.map((g) => <button key={g} style={chip(gender === g)} onClick={() => setGender(g)}>{g}</button>)}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {HOUSES.map((h) => (
                <button key={h.key} style={card(house === h.key)} onClick={() => setHouse(h.key)}>
                  <div style={{ fontFamily: FONT_HUA, fontSize: 19, color: INK }}>{h.key}</div>
                  <div style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>{h.blurb}</div>
                  <div style={{ fontSize: 10.5, color: GOLD, marginTop: 5 }}>{formatBonuses(HOUSE_BONUSES[h.key])}</div>
                </button>
              ))}
              <button onClick={sortingHat} style={{ ...card(false), gridColumn: "1 / -1", textAlign: "center", color: INK, fontWeight: 600 }}>🎩 让分院帽决定</button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "grid", gap: 10 }}>
              {BLOODS.map((b) => (
                <button key={b.key} style={card(blood === b.key)} onClick={() => setBlood(b.key)}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: INK }}>{b.key}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{b.blurb}</div>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                {FAMILIES.map((f) => (
                  <button key={f.key} style={card(family === f.key)} onClick={() => setFamily(f.key)}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: INK }}>{f.key}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{f.blurb}</div>
                  </button>
                ))}
              </div>
              <input style={field} placeholder="家庭细节（可选）：父母职业、家境、家族往事…" value={familyDetail} maxLength={60} onChange={(e) => setFamilyDetail(e.target.value)} />
            </div>
          )}

          {step === 4 && (
            <textarea style={{ ...field, minHeight: 130, resize: "none" }} placeholder="描述你的相貌：发色、瞳色、身形、气质、特征…（可留空）" value={appearance} maxLength={140} onChange={(e) => setAppearance(e.target.value)} />
          )}

          {step === 5 && (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={label}>木材</div>
                <select style={{ ...field, cursor: "pointer" }} value={wood} onChange={(e) => setWood(e.target.value)}>
                  <option value="" style={{ color: "#000" }}>选择木材…</option>
                  {WAND_WOODS.map((w) => <option key={w.key} value={w.key} style={{ color: "#000" }}>{w.key}</option>)}
                </select>
                {selectedWood && (
                  <div style={{ marginTop: 7, padding: "8px 10px", borderRadius: 10, background: "rgba(232,199,102,0.07)", border: "1px solid rgba(232,199,102,0.18)" }}>
                    <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.5 }}>{selectedWood.blurb}</div>
                    <div style={{ fontSize: 11, color: GOLD, marginTop: 4 }}>{formatBonuses(selectedWood.bonuses)}</div>
                  </div>
                )}
              </div>
              <div>
                <div style={label}>杖芯</div>
                <select style={{ ...field, cursor: "pointer" }} value={core} onChange={(e) => setCore(e.target.value)}>
                  <option value="" style={{ color: "#000" }}>选择杖芯…</option>
                  {WAND_CORES.map((c) => <option key={c.key} value={c.key} style={{ color: "#000" }}>{c.key}</option>)}
                </select>
                {selectedCore && (
                  <div style={{ marginTop: 7, padding: "8px 10px", borderRadius: 10, background: "rgba(232,199,102,0.07)", border: "1px solid rgba(232,199,102,0.18)" }}>
                    <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.5 }}>{selectedCore.blurb}</div>
                    <div style={{ fontSize: 11, color: GOLD, marginTop: 4 }}>{formatBonuses(selectedCore.bonuses)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SUBJECTS.map((s) => {
                const on = subjects.includes(s);
                return (
                  <button key={s} style={{ ...card(on), textAlign: "center", opacity: !on && subjects.length >= 2 ? 0.4 : 1 }} onClick={() => toggleSubject(s)}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>{s}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 7 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={label}>性格标签（最多 3）</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TRAITS.map((t) => {
                    const on = traits.includes(t);
                    return <button key={t} style={{ ...chip(on), padding: "6px 12px", fontSize: 12.5, opacity: !on && traits.length >= 3 ? 0.4 : 1 }} onClick={() => toggleTrait(t)}>{t}</button>;
                  })}
                </div>
              </div>
              <div>
                <div style={label}>性格 / 自我设定</div>
                <textarea style={{ ...field, minHeight: 96, resize: "none" }} placeholder="描述你的性格、为人、口头禅、立场…（可留空）" value={intro} maxLength={160} onChange={(e) => setIntro(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
          <button onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
            style={{ padding: "11px 20px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {step === 0 ? "返回" : "上一步"}
          </button>
          <button disabled={!cur.valid()} onClick={() => (last ? finish() : setStep((s) => s + 1))}
            style={{ padding: "11px 24px", borderRadius: 999, border: "none",
              background: cur.valid() ? "linear-gradient(180deg, #f0d98a, #d4b257)" : "rgba(255,255,255,0.08)",
              color: cur.valid() ? "#23190a" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700,
              cursor: cur.valid() ? "pointer" : "not-allowed", fontFamily: "inherit", boxShadow: cur.valid() ? "0 0 18px rgba(232,199,102,0.4)" : "none" }}>
            {last ? "进入霍格沃茨 →" : "下一步"}
          </button>
        </div>
      </div>
    </div>
  );
}
