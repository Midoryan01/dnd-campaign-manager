import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign, requireCampaignMember } from "@/lib/permissions/campaign";
export async function GET(_req:Request,{params}:{params:Promise<{campaignId:string;mapId:string}>}){
 const {campaignId,mapId}=await params;const s=await auth();if(!s?.user?.id)return new Response("Unauthorized",{status:401});if(!await requireCampaignMember(campaignId,s.user.id).catch(()=>null))return new Response("Not found",{status:404});
 const map=await prisma.gameMap.findFirst({where:{id:mapId,campaignId}});if(!map)return new Response("Not found",{status:404});const safeName=path.basename(map.fileKey);const bytes=await readFile(path.join(process.cwd(),"storage","maps",campaignId,safeName)).catch(()=>null);if(!bytes)return new Response("Not found",{status:404});return new Response(bytes,{headers:{"Content-Type":map.mimeType,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; mapId: string }> }) {
 const { campaignId, mapId } = await params; const session = await auth();
 if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
 if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
 const parsed = z.object({ name: z.string().trim().min(1).max(120).optional(), mapType: z.enum(["WORLD", "REGION", "CITY", "DUNGEON", "BATTLEMAP", "OTHER"]).optional(), relatedLocationId: z.preprocess(value => value === "" ? null : value, z.string().nullable().optional()), description: z.preprocess(value => value === "" ? null : value, z.string().max(10000).nullable().optional()) }).safeParse(await request.json().catch(() => null));
 if (!parsed.success || !Object.keys(parsed.data ?? {}).length) return Response.json({ error: "Periksa detail peta." }, { status: 400 });
 if (!await prisma.gameMap.findFirst({ where: { id: mapId, campaignId }, select: { id: true } })) return Response.json({ error: "Peta tidak ditemukan." }, { status: 404 });
 if (parsed.data.relatedLocationId && !await prisma.location.findFirst({ where: { id: parsed.data.relatedLocationId, campaignId }, select: { id: true } })) return Response.json({ error: "Lokasi terkait tidak ditemukan di campaign ini." }, { status: 400 });
 const map = await prisma.gameMap.update({ where: { id: mapId }, data: parsed.data });
 return Response.json({ map });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ campaignId: string; mapId: string }> }) {
 const { campaignId, mapId } = await params; const session = await auth();
 if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
 if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
 const map = await prisma.gameMap.findFirst({ where: { id: mapId, campaignId }, select: { fileKey: true } });
 if (!map) return Response.json({ error: "Peta tidak ditemukan." }, { status: 404 });
 await prisma.gameMap.deleteMany({ where: { id: mapId, campaignId } });
 await unlink(path.join(process.cwd(), "storage", "maps", campaignId, path.basename(map.fileKey))).catch(() => undefined);
 return Response.json({ ok: true });
}
