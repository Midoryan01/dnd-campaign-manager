import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { filterVisibleLocations } from "@/lib/location-visibility";
import { canManageCampaign, requireCampaignMember } from "@/lib/permissions/campaign";
import { prisma } from "@/lib/db/prisma";

const extensions = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"]]);
const mapTypes = ["WORLD", "REGION", "CITY", "DUNGEON", "BATTLEMAP", "OTHER"] as const;
const supportedImage = (mime: string, bytes: Uint8Array) => mime === "image/png" ? bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10" : mime === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : mime === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = await requireCampaignMember(campaignId, session.user.id).catch(() => null);
  if (!role) return Response.json({ error: "Not found" }, { status: 404 });
  const isDm = role === "OWNER" || role === "DM";
  const [maps, locations] = await Promise.all([
    prisma.gameMap.findMany({ where: { campaignId }, orderBy: { createdAt: "desc" }, include: { relatedLocation: true, tokens: { include: { location: true }, orderBy: { createdAt: "asc" } } } }),
    prisma.location.findMany({ where: { campaignId }, select: { id: true, parentId: true, name: true, type: true, description: true, readAloud: true, dmNotes: isDm, imageUrl: true, visibility: true } }),
  ]);
  const visibleLocations = filterVisibleLocations(locations, isDm);
  const visibleIds = new Set(visibleLocations.map(location => location.id));
  return Response.json({ maps: maps.map(map => {
    const relatedLocationId = map.relatedLocation && visibleIds.has(map.relatedLocation.id) ? map.relatedLocation.id : null;
    return {
      id: map.id, name: map.name, mimeType: map.mimeType, sizeBytes: map.sizeBytes, mapType: map.mapType,
      relatedLocationId, description: map.description, width: map.width, height: map.height, gridEnabled: map.gridEnabled, gridSize: map.gridSize, createdAt: map.createdAt,
      relatedLocation: relatedLocationId ? visibleLocations.find(location => location.id === relatedLocationId) ?? null : null,
      markers: map.tokens.filter(marker => marker.visible && (isDm || ["PUBLIC", "PLAYER_VISIBLE"].includes(marker.visibility)) && (!marker.locationId || visibleIds.has(marker.locationId))).map(marker => ({ id: marker.id, locationId: marker.locationId, label: marker.label || marker.name, x: marker.x, y: marker.y, visibility: marker.visibility, location: marker.locationId ? visibleLocations.find(location => location.id === marker.locationId) ?? null : null })),
    };
  }) });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const data = await request.formData();
  const parsed = z.object({ name: z.string().trim().min(1).max(120), mapType: z.enum(mapTypes).default("OTHER"), relatedLocationId: z.string().optional(), description: z.string().max(10000).optional() }).safeParse({ name: data.get("name"), mapType: data.get("mapType") || undefined, relatedLocationId: data.get("relatedLocationId") || undefined, description: data.get("description") || undefined });
  const file = data.get("file");
  if (!parsed.success || !(file instanceof File) || !extensions.has(file.type) || file.size < 1 || file.size > 15 * 1024 * 1024) return Response.json({ error: "Isi nama peta dan unggah PNG, JPEG, atau WebP maksimal 15 MB." }, { status: 400 });
  if (parsed.data.relatedLocationId && !await prisma.location.findFirst({ where: { id: parsed.data.relatedLocationId, campaignId }, select: { id: true } })) return Response.json({ error: "Lokasi terkait tidak ditemukan di campaign ini." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!supportedImage(file.type, bytes)) return Response.json({ error: "Isi file tidak cocok dengan format gambar yang dipilih." }, { status: 400 });
  const key = `${randomUUID()}.${extensions.get(file.type)}`;
  const directory = path.join(process.cwd(), "storage", "maps", campaignId);
  const filePath = path.join(directory, key);
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, bytes, { flag: "wx" });
  try {
    const map = await prisma.gameMap.create({ data: { ...parsed.data, campaignId, fileKey: `${campaignId}/${key}`, mimeType: file.type, sizeBytes: file.size } });
    return Response.json({ map }, { status: 201 });
  } catch {
    await unlink(filePath).catch(() => undefined);
    return Response.json({ error: "Peta tidak dapat disimpan." }, { status: 500 });
  }
}
