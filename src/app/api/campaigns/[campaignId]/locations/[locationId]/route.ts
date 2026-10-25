import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign, requireCampaignMember } from "@/lib/permissions/campaign";
import { filterVisibleLocations } from "@/lib/location-visibility";

const locationTypes = ["WORLD", "REGION", "CITY", "VILLAGE", "DISTRICT", "BUILDING", "FOREST", "MOUNTAIN", "CAVE", "DUNGEON", "ROOM", "OTHER"] as const;
const optionalText = (max: number) => z.preprocess(value => value === "" ? null : value, z.string().trim().max(max).nullable().optional());
const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(), type: z.enum(locationTypes).optional(),
  parentId: z.preprocess(value => value === "" ? null : value, z.string().nullable().optional()),
  description: optionalText(10000), readAloud: optionalText(10000), dmNotes: optionalText(10000),
  imageUrl: z.preprocess(value => value === "" ? null : value, z.string().trim().url().max(2048).refine(value => /^https?:\/\//i.test(value)).nullable().optional()),
  visibility: z.enum(["PUBLIC", "DM_ONLY", "PLAYER_VISIBLE", "SELECTED_USERS"]).optional(),
}).partial();

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string; locationId: string }> }) {
  const { campaignId, locationId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = await requireCampaignMember(campaignId, session.user.id).catch(() => null);
  if (!role) return Response.json({ error: "Not found" }, { status: 404 });
  const isDm = role === "OWNER" || role === "DM";
  const locations = await prisma.location.findMany({ where: { campaignId }, select: { id: true, parentId: true, name: true, type: true, description: true, readAloud: true, dmNotes: isDm, imageUrl: true, visibility: true, createdAt: true, updatedAt: true, maps: { select: { id: true, name: true } } } });
  const location = filterVisibleLocations(locations, isDm).find(item => item.id === locationId);
  return location ? Response.json({ location }) : Response.json({ error: "Lokasi tidak ditemukan." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; locationId: string }> }) {
  const { campaignId, locationId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data ?? {}).length) return Response.json({ error: "Periksa detail lokasi." }, { status: 400 });
  const current = await prisma.location.findFirst({ where: { id: locationId, campaignId }, select: { id: true } });
  if (!current) return Response.json({ error: "Lokasi tidak ditemukan." }, { status: 404 });
  const { parentId, ...data } = parsed.data;
  if (parentId !== undefined && parentId !== null) {
    const hierarchy = await prisma.location.findMany({ where: { campaignId }, select: { id: true, parentId: true } });
    const byId = new Map(hierarchy.map(location => [location.id, location.parentId]));
    let ancestor: string | null | undefined = parentId;
    const seen = new Set<string>();
    while (ancestor) {
      if (ancestor === locationId || seen.has(ancestor)) return Response.json({ error: "Relasi induk akan membuat siklus hierarki." }, { status: 400 });
      seen.add(ancestor);
      ancestor = byId.get(ancestor);
      if (ancestor === undefined) return Response.json({ error: "Lokasi induk tidak ditemukan di campaign ini." }, { status: 400 });
    }
  }
  const location = await prisma.location.update({ where: { id: locationId }, data: { ...data, ...(parentId !== undefined ? { parentId } : {}) } });
  return Response.json({ location });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ campaignId: string; locationId: string }> }) {
  const { campaignId, locationId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const deleted = await prisma.location.deleteMany({ where: { id: locationId, campaignId } });
  return deleted.count ? Response.json({ ok: true }) : Response.json({ error: "Lokasi tidak ditemukan." }, { status: 404 });
}
