import { z } from "zod";

export const env = z.object({
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
}).parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  NODE_ENV: process.env.NODE_ENV,
});
