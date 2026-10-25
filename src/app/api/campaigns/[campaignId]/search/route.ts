import { Visibility } from "@prisma/client";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { requireCampaignMember } from "@/lib/permissions/campaign";
import { filterVisibleLocations } from "@/lib/location-visibility";

export async function GET(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = await requireCampaignMember(campaignId, session.user.id).catch(() => null);
  if (!role) return Response.json({ error: "Not found" }, { status: 404 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 1 || q.length > 120) return Response.json({ results: [] });
  const dm = role === "OWNER" || role === "DM";
  const visibility = dm ? undefined : { in: [Visibility.PUBLIC, Visibility.PLAYER_VISIBLE] };
  const [npcs, allLocations, lore, quests, notes, factions, scenes] = await Promise.all([
    prisma.nPC.findMany({ where: { campaignId, OR: [{ name: { contains: q } }, { role: { contains: q } }], visibility }, take: 5, select: { id: true, name: true, role: true, status: true, locationId: true, visibility: true } }),
    prisma.location.findMany({ where: { campaignId }, select: { id: true, parentId: true, name: true, visibility: true } }),
    prisma.lore.findMany({ where: { campaignId, OR: [{ title: { contains: q } }, { body: { contains: q } }], visibility }, take: 5, select: { id: true, title: true, category: true, visibility: true } }),
    prisma.quest.findMany({ where: { campaignId, OR: [{ title: { contains: q } }, { description: { contains: q } }], visibility }, take: 5, select: { id: true, title: true, description: true, status: true, visibility: true } }),
    prisma.sessionNote.findMany({ where: { campaignId, OR: [{ title: { contains: q } }, { body: { contains: q } }], visibility }, take: 5, select: { id: true, title: true, body: true, visibility: true } }),
    prisma.faction.findMany({ where: { campaignId, OR: [{ name: { contains: q } }, { description: { contains: q } }], visibility }, take: 5, select: { id: true, name: true, description: true, visibility: true } }),
    prisma.storyScene.findMany({ where: { campaignId, OR: [{ title: { contains: q } }, { objective: { contains: q } }, { notes: { contains: q } }], visibility }, take: 5, select: { id: true, title: true, objective: true, status: true, visibility: true } }),
  ]);
  const locations = filterVisibleLocations(allLocations, dm);
  const locationById = new Map(locations.map(location => [location.id, location]));
  const matchedLocations = locations.filter(location => location.name.toLocaleLowerCase().includes(q.toLocaleLowerCase())).slice(0, 5);
  const excerpt = (value: string | null | undefined) => value?.replace(/\s+/g, " ").slice(0, 140) || undefined;

  const results = [
    ...scenes.map(item => ({ type: "Scene", id: item.id, title: item.title, status: item.status, context: excerpt(item.objective), visibility: item.visibility })),
    ...matchedLocations.map(item => ({ type: "Location", id: item.id, title: item.name, context: item.parentId ? `Di dalam ${locationById.get(item.parentId)?.name ?? "lokasi"}` : "Lokasi kampanye", visibility: item.visibility })),
    ...npcs.map(item => ({ type: "NPC", id: item.id, title: item.name, status: item.status, context: [item.role, item.locationId ? locationById.get(item.locationId)?.name : undefined].filter(Boolean).join(" · ") || undefined, visibility: item.visibility })),
    ...quests.map(item => ({ type: "Quest", id: item.id, title: item.title, status: item.status, context: excerpt(item.description), visibility: item.visibility })),
    ...factions.map(item => ({ type: "Faction", id: item.id, title: item.name, context: excerpt(item.description), visibility: item.visibility })),
    ...lore.map(item => ({ type: "Lore", id: item.id, title: item.title, context: item.category || undefined, visibility: item.visibility })),
    ...notes.map(item => ({ type: "Note", id: item.id, title: item.title, context: excerpt(item.body), visibility: item.visibility })),
  ];
  return Response.json({ results });
}
