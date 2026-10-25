import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const optionalInt = (min: number, max: number, fallback?: number) => {
  return z.preprocess(value => value === "" || value == null ? fallback : value, z.coerce.number().int().min(min).max(max).optional());
};

const partyMemberSchema = z.object({
  name: z.string().trim().min(1).max(100),
  playerName: z.string().trim().max(100).optional(),
  species: z.string().trim().max(80).optional(),
  className: z.string().trim().max(80).optional(),
  level: z.coerce.number().int().min(1).max(20).default(1),
  background: z.string().trim().max(100).optional(),
  currentHp: optionalInt(0, 10000, 10),
  maxHp: optionalInt(1, 10000, 10),
  tempHp: optionalInt(0, 10000, 0),
  ac: z.coerce.number().int().min(1).max(50),
  initiativeBonus: optionalInt(-10, 20, 0),
  passivePerception: optionalInt(0, 50),
  speed: optionalInt(0, 1000, 30),
  spellSaveDC: optionalInt(1, 50),
}).refine(value => (value.currentHp ?? 10) <= (value.maxHp ?? 10), { path: ["currentHp"], message: "HP saat ini tidak boleh melebihi Max HP." });

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const members = await prisma.partyMember.findMany({ where: { campaignId }, orderBy: [{ isActive: "desc" }, { name: "asc" }], select: { id: true, name: true, playerName: true, species: true, className: true, level: true, background: true, currentHp: true, maxHp: true, tempHp: true, ac: true, initiativeBonus: true, passivePerception: true, speed: true, spellSaveDC: true, isActive: true } });
  return Response.json({ members });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = partyMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Periksa nama, level, AC, dan statistik karakter. HP saat ini tidak boleh melebihi Max HP." }, { status: 400 });
  const member = await prisma.partyMember.create({ data: { campaignId, ...parsed.data } });
  return Response.json({ member }, { status: 201 });
}
