import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const optionalInt = (min: number, max: number) => z.coerce.number().int().min(min).max(max).optional();
const optionalText = (max: number) => z.preprocess(value => value === "" ? null : value, z.string().trim().max(max).nullable().optional());
const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  playerName: optionalText(100),
  species: optionalText(80),
  className: optionalText(80),
  level: optionalInt(1, 20),
  background: optionalText(100),
  currentHp: optionalInt(0, 10000),
  maxHp: optionalInt(1, 10000),
  tempHp: optionalInt(0, 10000),
  ac: optionalInt(1, 50),
  initiativeBonus: optionalInt(-10, 20),
  passivePerception: optionalInt(0, 50),
  speed: optionalInt(0, 1000),
  spellSaveDC: optionalInt(1, 50),
  isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, "Pilih perubahan karakter.");

async function getAccess(campaignId: string) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; memberId: string }> }) {
  const { campaignId, memberId } = await params;
  const denied = await getAccess(campaignId);
  if (denied) return denied;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Perubahan karakter tidak valid." }, { status: 400 });
  const current = await prisma.partyMember.findFirst({ where: { id: memberId, campaignId }, select: { currentHp: true, maxHp: true } });
  if (!current) return Response.json({ error: "Karakter party tidak ditemukan." }, { status: 404 });
  const currentHp = parsed.data.currentHp ?? current.currentHp;
  const maxHp = parsed.data.maxHp ?? current.maxHp;
  if (currentHp > maxHp) return Response.json({ error: "HP saat ini tidak boleh melebihi Max HP." }, { status: 400 });
  await prisma.partyMember.update({ where: { id: memberId }, data: parsed.data });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ campaignId: string; memberId: string }> }) {
  const { campaignId, memberId } = await params;
  const denied = await getAccess(campaignId);
  if (denied) return denied;
  const deleted = await prisma.partyMember.deleteMany({ where: { id: memberId, campaignId } });
  if (!deleted.count) return Response.json({ error: "Karakter party tidak ditemukan." }, { status: 404 });
  return Response.json({ ok: true });
}
