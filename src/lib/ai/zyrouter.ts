import "server-only";
import OpenAI from "openai";

export async function askZyRouter(prompt: string) {
  const apiKey = process.env.ZYROUTER_API_KEY?.trim();
  const model = process.env.ZYROUTER_MODEL?.trim();
  if (!apiKey || !model) throw new Error("ZyRouter is not configured");
  const client = new OpenAI({ apiKey, baseURL: process.env.ZYROUTER_BASE_URL });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    stream: false,
  });
  return response.choices[0]?.message?.content ?? "";
}
