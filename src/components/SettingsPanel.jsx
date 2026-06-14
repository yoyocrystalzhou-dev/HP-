import { useState } from "react";
import { Field, Input, Btn } from "./UI.jsx";
import { T } from "../theme.js";

const PRESETS = {
  deepseek:  { model: "deepseek-chat",            baseUrl: "https://api.deepseek.com" },
  anthropic: { model: "claude-sonnet-4-20250514", baseUrl: "" },
  openai:    { model: "gpt-4o-mini",              baseUrl: "" },
};

export default function SettingsPanel({ config, onSave }) {
  const [c, setC] = useState(config);
  const u = (k, v) => setC((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <Field label="API 类型">
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.keys(PRESETS).map((t) => (
            <button
              key={t}
              onClick={() => setC((p) => ({ ...p, apiType: t, ...PRESETS[t] }))}
              style={{
                padding: "5px 12px", borderRadius: 7, border: "1.5px solid",
                borderColor: c.apiType === t ? T.accent : T.border,
                background: c.apiType === t ? T.accent : "transparent",
                color: c.apiType === t ? T.accentText : T.textDim,
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {t === "deepseek" ? "DeepSeek" : t === "anthropic" ? "Anthropic" : "OpenAI 兼容"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="API Key">
        <Input type="password" value={c.apiKey} onChange={(e) => u("apiKey", e.target.value)} placeholder="sk-..." />
      </Field>

      <Field label="Base URL（可选）">
        <Input value={c.baseUrl} onChange={(e) => u("baseUrl", e.target.value)} placeholder={PRESETS[c.apiType]?.baseUrl || "https://api.openai.com"} />
      </Field>

      <Field label="模型">
        <Input value={c.model} onChange={(e) => u("model", e.target.value)} placeholder={PRESETS[c.apiType]?.model} />
      </Field>

      <Field label={`最大 Token: ${c.maxTokens}`}>
        <input
          type="range" min={256} max={8192} step={256} value={c.maxTokens}
          onChange={(e) => u("maxTokens", Number(e.target.value))}
          style={{ width: "100%", accentColor: T.accent, marginTop: 4 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textFaint, marginTop: 2 }}>
          <span>256</span><span>8192</span>
        </div>
      </Field>

      <Btn onClick={() => onSave(c)} style={{ width: "100%", justifyContent: "center" }}>
        保存配置
      </Btn>
    </div>
  );
}
