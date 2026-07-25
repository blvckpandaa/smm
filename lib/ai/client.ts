const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export function getDeepSeekApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY?.trim() || undefined;
}

export function getDeepSeekModel(): string {
  // deepseek-chat retired 2026-07-24 → use explicit V4 ids
  const raw = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
  if (raw === "deepseek-chat") return "deepseek-v4-flash";
  if (raw === "deepseek-reasoner") return "deepseek-v4-flash";
  return raw;
}

export function isDeepSeekConfigured(): boolean {
  return Boolean(getDeepSeekApiKey());
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  return JSON.parse(raw);
}

export async function deepseekChat(options: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не задан");
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getDeepSeekModel(),
      temperature: options.temperature ?? 0.7,
      // V4: без этого thinking-режим может оставить content пустым
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`DeepSeek error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek вернул пустой ответ");
  return content;
}
