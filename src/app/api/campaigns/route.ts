import { z } from "zod";
import { CampaignRole } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await prisma.campaign.findMany({ where: { members: { some: { userId: session.user.id } } }, orderBy: { updatedAt: "desc" } });
  return Response.json(campaigns);
}
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(5000).optional(), locale: z.enum(["id", "en"]).default("id"), timezone: z.string().max(80).default("Asia/Jakarta") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid campaign details." }, { status: 400 });
  const campaign = await prisma.campaign.create({ data: { ...parsed.data, members: { create: { userId: session.user.id, role: CampaignRole.OWNER } } } });
  return Response.json(campaign, { status: 201 });
}
