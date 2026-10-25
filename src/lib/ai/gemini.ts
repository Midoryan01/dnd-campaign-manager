import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/config/env";

export async function askGemini(prompt: string) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey || /^\[.*\]$/.test(apiKey) || apiKey === "YOUR_API_KEY") throw new Error("GEMINI_API_KEY is missing or still a placeholder");
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
  });
  return response.text ?? "";
}
