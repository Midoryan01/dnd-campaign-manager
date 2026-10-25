import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign, requireCampaignMember } from "@/lib/permissions/campaign";
import { filterVisibleLocations } from "@/lib/location-visibility";

const locationTypes = ["WORLD", "REGION", "CITY", "VILLAGE", "DISTRICT", "BUILDING", "FOREST", "MOUNTAIN", "CAVE", "DUNGEON", "ROOM", "OTHER"] as const;
const visibility = z.enum(["PUBLIC", "DM_ONLY", "PLAYER_VISIBLE", "SELECTED_USERS"]);
const optionalText = (max: number) => z.preprocess(value => value === "" ? null : value, z.string().trim().max(max).nullable().optional());
const createSchema = z.object({
  name: z.string().trim().min(1).max(160), type: z.enum(locationTypes).default("OTHER"),
  parentId: z.preprocess(value => value === "" ? null : value, z.string().nullable().optional()),
  description: optionalText(10000), readAloud: optionalText(10000), dmNotes: optionalText(10000),
  imageUrl: z.preprocess(value => value === "" ? null : value, z.string().trim().url().max(2048).refine(value => /^https?:\/\//i.test(value)).nullable().optional()),
  visibility: visibility.default("DM_ONLY"),
});

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = await requireCampaignMember(campaignId, session.user.id).catch(() => null);
  if (!role) return Response.json({ error: "Not found" }, { status: 404 });
  const isDm = role === "OWNER" || role === "DM";
  const locations = await prisma.location.findMany({ where: { campaignId }, orderBy: [{ name: "asc" }], select: { id: true, parentId: true, name: true, type: true, description: true, readAloud: true, dmNotes: isDm, imageUrl: true, visibility: true, createdAt: true, updatedAt: true, maps: { select: { id: true, name: true } } } });
  return Response.json({ locations: filterVisibleLocations(locations, isDm) });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Periksa nama dan detail lokasi." }, { status: 400 });
  const { parentId, ...data } = parsed.data;
  if (parentId && !await prisma.location.findFirst({ where: { id: parentId, campaignId }, select: { id: true } })) return Response.json({ error: "Lokasi induk tidak ditemukan di campaign ini." }, { status: 400 });
  const location = await prisma.location.create({ data: { ...data, parentId, campaignId } });
  return Response.json({ location }, { status: 201 });
}
