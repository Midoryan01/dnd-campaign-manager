import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { filterVisibleLocations } from "@/lib/location-visibility";
import { canManageCampaign, requireCampaignMember } from "@/lib/permissions/campaign";
import { prisma } from "@/lib/db/prisma";

const labelField = z.preprocess(value => value === "" ? null : value, z.string().trim().max(160).nullable().optional());
const locationField = z.preprocess(value => value === "" ? null : value, z.string().nullable().optional());
const visibility = z.enum(["PUBLIC", "DM_ONLY", "PLAYER_VISIBLE", "SELECTED_USERS"]);

async function mapExists(campaignId: string, mapId: string) {
  return prisma.gameMap.findFirst({ where: { id: mapId, campaignId }, select: { id: true } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string; mapId: string }> }) {
  const { campaignId, mapId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = await requireCampaignMember(campaignId, session.user.id).catch(() => null);
  if (!role || !await mapExists(campaignId, mapId)) return Response.json({ error: "Peta tidak ditemukan." }, { status: 404 });
  const isDm = role === "OWNER" || role === "DM";
  const markers = await prisma.mapToken.findMany({ where: { mapId, visible: true, ...(isDm ? {} : { visibility: { in: ["PUBLIC", "PLAYER_VISIBLE"] } }) }, include: { location: { select: { id: true, parentId: true, name: true, type: true, description: true, readAloud: true, visibility: true, dmNotes: isDm, imageUrl: true } } }, orderBy: { createdAt: "asc" } });
  const locations = await prisma.location.findMany({ where: { campaignId }, select: { id: true, parentId: true, name: true, type: true, description: true, readAloud: true, visibility: true, dmNotes: isDm, imageUrl: true } });
  const safeIds = new Set(filterVisibleLocations(locations, isDm).map(location => location.id));
  return Response.json({ markers: markers.filter(marker => !marker.locationId || safeIds.has(marker.locationId)).map(({ name, location, ...marker }) => ({ ...marker, label: marker.label || name, location: location && safeIds.has(location.id) ? location : null })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string; mapId: string }> }) {
  const { campaignId, mapId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  if (!await mapExists(campaignId, mapId)) return Response.json({ error: "Peta tidak ditemukan." }, { status: 404 });
  const parsed = z.object({ locationId: locationField, label: labelField, x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), visibility: visibility.default("DM_ONLY") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Periksa lokasi, label, dan posisi marker." }, { status: 400 });
  const { locationId, label, ...position } = parsed.data;
  const location = locationId ? await prisma.location.findFirst({ where: { id: locationId, campaignId }, select: { id: true, name: true } }) : null;
  if (locationId && !location) return Response.json({ error: "Lokasi marker tidak ditemukan di campaign ini." }, { status: 400 });
  const marker = await prisma.mapToken.create({ data: { mapId, locationId, label, name: label || location?.name || "Marker", ...position } });
  return Response.json({ marker }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; mapId: string }> }) {
  const { campaignId, mapId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  if (!await mapExists(campaignId, mapId)) return Response.json({ error: "Peta tidak ditemukan." }, { status: 404 });
  const parsed = z.object({ id: z.string().min(1), locationId: locationField, label: labelField, x: z.number().finite().min(0).max(1).optional(), y: z.number().finite().min(0).max(1).optional(), visibility: visibility.optional() }).refine(data => Object.keys(data).some(key => key !== "id"), "Pilih perubahan marker.").safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Periksa perubahan marker." }, { status: 400 });
  const marker = await prisma.mapToken.findFirst({ where: { id: parsed.data.id, mapId }, select: { id: true, locationId: true, name: true, label: true } });
  if (!marker) return Response.json({ error: "Marker tidak ditemukan." }, { status: 404 });
  const locationId = parsed.data.locationId === undefined ? marker.locationId : parsed.data.locationId;
  const location = locationId ? await prisma.location.findFirst({ where: { id: locationId, campaignId }, select: { id: true, name: true } }) : null;
  if (locationId && !location) return Response.json({ error: "Lokasi marker tidak ditemukan di campaign ini." }, { status: 400 });
  const label = parsed.data.label === undefined ? marker.label : parsed.data.label;
  const update = await prisma.mapToken.update({ where: { id: marker.id }, data: { ...(parsed.data.x !== undefined ? { x: parsed.data.x } : {}), ...(parsed.data.y !== undefined ? { y: parsed.data.y } : {}), ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}), ...(parsed.data.locationId !== undefined ? { locationId } : {}), ...(parsed.data.label !== undefined || parsed.data.locationId !== undefined ? { label, name: label || location?.name || "Marker" } : {}) } });
  return Response.json({ marker: update });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ campaignId: string; mapId: string }> }) {
  const { campaignId, mapId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Marker tidak valid." }, { status: 400 });
  const deleted = await prisma.mapToken.deleteMany({ where: { id: parsed.data.id, mapId, map: { campaignId } } });
  return deleted.count ? Response.json({ ok: true }) : Response.json({ error: "Marker tidak ditemukan." }, { status: 404 });
}
