import OpenAI from "openai";
import { NextResponse } from "next/server";

type UsageState = { startedAt: number; requests: number; lastRequestAt: number; active: boolean };

const usage = new Map<string, UsageState>();
const WINDOW_MS = 60_000;
const COOLDOWN_MS = 3_000;
const MAX_REQUESTS = 10;

const client = new OpenAI({
  apiKey: process.env.ZYROUTER_API_KEY,
  baseURL: process.env.ZYROUTER_BASE_URL,
});

const SYSTEM_PROMPT = `
Kamu adalah asisten aturan Dungeons & Dragons 2024 (5.5e).

Aturan menjawab:
1. Jawab dalam bahasa Indonesia.
2. Jelaskan aturan dengan ringkas dan mudah dipahami.
3. Bedakan aturan resmi, interpretasi, dan house rules.
4. Jangan mengarang kutipan atau nomor halaman.
5. Jika tidak yakin, katakan bahwa kamu tidak yakin.
6. Jika pertanyaan menyangkut combat, jelaskan urutan
   aksi dan konsekuensi mekaniknya.
7. Jangan menganggap aturan D&D edisi lama sama dengan
   aturan D&D 2024.
`;

export async function POST(request: Request) {
  let usageState: UsageState | undefined;
  try {
    const body = await request.json();
    const { message, history } = body ?? {};

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Pesan maksimal 1000 karakter." },
        { status: 400 }
      );
    }

    if (history !== undefined && (!Array.isArray(history) || history.length > 6 || history.some((item: unknown) => {
      if (!item || typeof item !== "object") return true;
      const candidate = item as Record<string, unknown>;
      return !["user", "assistant"].includes(String(candidate.role)) || typeof candidate.content !== "string" || candidate.content.length > 1000;
    }))) {
      return NextResponse.json({ error: "Riwayat harus berisi maksimal 6 pesan valid." }, { status: 400 });
    }

    const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    usageState = usage.get(key);
    if (!usageState || now - usageState.startedAt >= WINDOW_MS) {
      usageState = { startedAt: now, requests: 0, lastRequestAt: 0, active: false };
      usage.set(key, usageState);
    }
    if (usageState.active) return NextResponse.json({ error: "Permintaan sedang diproses." }, { status: 429 });
    if (usageState.requests >= MAX_REQUESTS) return NextResponse.json({ error: "Batas 10 permintaan per menit tercapai." }, { status: 429 });
    if (now - usageState.lastRequestAt < COOLDOWN_MS) return NextResponse.json({ error: "Tunggu 3 detik sebelum meminta lagi." }, { status: 429 });
    usageState.active = true;
    usageState.lastRequestAt = now;
    usageState.requests += 1;

    const response = await client.chat.completions.create({
      model: process.env.ZYROUTER_MODEL!,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(history ?? []),
        { role: "user", content: message },
      ],
      max_tokens: 300,
      stream: false,
    });

    return NextResponse.json({
      answer: response.choices[0]?.message?.content ?? "",
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    return NextResponse.json(
      { error: "AI gagal menjawab. Coba lagi nanti." },
      { status: 500 }
    );
  } finally {
    if (usageState) usageState.active = false;
  }
}
