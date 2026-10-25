import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";
import { rollDice } from "@/lib/dice/notation";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const history = await prisma.diceRoll.findMany({
    where: { campaignId, userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20,
    select: { id: true, notation: true, label: true, result: true, createdAt: true },
  });
  return Response.json({ history });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = z.object({
    notation: z.string().trim().min(1).max(80),
    label: z.string().trim().max(120).optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Masukkan notasi dadu yang valid." }, { status: 400 });

  try {
    const result = rollDice(parsed.data.notation);
    await prisma.diceRoll.create({
      data: {
        userId: session.user.id,
        campaignId,
        notation: result.notation,
        label: parsed.data.label,
        result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonObject,
      },
    });
    return Response.json({ result });
  } catch {
    return Response.json({ error: "Notasi belum didukung. Coba 2d6+3, 4d6kh3, atau d20+5 adv." }, { status: 400 });
  }
}
