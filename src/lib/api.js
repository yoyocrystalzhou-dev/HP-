/**
 * Unified streaming API helper.
 * Supports: Anthropic, DeepSeek, and any OpenAI-compatible endpoint.
 *
 * @param {object}   config   - { apiType, apiKey, baseUrl, model, maxTokens }
 * @param {object[]} messages - OpenAI-style { role, content } array
 * @param {string}   system   - System prompt (injected differently per provider)
 * @param {function} onChunk  - Called with the accumulated text on every chunk
 * @returns {Promise<string>} Full response text
 */
export async function callAPI(config, messages, system, onChunk) {
  const isAnth = config.apiType === "anthropic";
  const isDeep = config.apiType === "deepseek";

  const baseUrl =
    config.baseUrl ||
    (isAnth
      ? "https://api.anthropic.com"
      : isDeep
      ? "https://api.deepseek.com"
      : "https://api.openai.com");

  if (isAnth) {
    return _streamAnthropic(config, messages, system, baseUrl, onChunk);
  } else {
    return _streamOpenAI(config, messages, system, baseUrl, isDeep, onChunk);
  }
}

async function _streamAnthropic(config, messages, system, baseUrl, onChunk) {
  const body = {
    model: config.model || "claude-sonnet-4-20250514",
    max_tokens: config.maxTokens || 2048,
    stream: true,
    messages,
  };
  if (system) body.system = system;

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const d = JSON.parse(line.slice(6));
        if (d.type === "content_block_delta" && d.delta?.text) {
          full += d.delta.text;
          onChunk && onChunk(full);
        }
      } catch {}
    }
  }
  return full;
}

async function _streamOpenAI(config, messages, system, baseUrl, isDeep, onChunk) {
  const msgs = system ? [{ role: "system", content: system }, ...messages] : messages;
  const model = config.model || (isDeep ? "deepseek-chat" : "gpt-4o-mini");

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: config.maxTokens || 2048,
      stream: true,
      messages: msgs,
    }),
  });

  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk && onChunk(full);
        }
      } catch {}
    }
  }
  return full;
}

/** Single-turn, non-streaming call — used for memory extraction and world-book parsing. */
export async function callAPIOnce(config, prompt) {
  return callAPI(config, [{ role: "user", content: prompt }], null, null);
}
