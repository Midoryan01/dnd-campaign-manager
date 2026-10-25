import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";
import { monsterDataForUi } from "@/lib/monster-data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });

  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const [monsters, party, npcs] = await Promise.all([
    prisma.monster.findMany({
      where: { name: { contains: query }, source: { OR: [{ campaignId: null }, { campaignId }] } },
      orderBy: { name: "asc" }, take: 100,
      select: { id: true, externalKey: true, name: true, data: true, edition: true, sourceLabel: true, classification: true, combatStats: true, abilities: true, proficiencyBonus: true, skills: true, senses: true, languages: true, telepathy: true, telepathyData: true, defenses: true, gear: true, challenge: true, traits: true, actions: true, bonusActions: true, reactions: true, legendaryActions: true, legendaryActionsPerTurn: true, legendaryActionsPerTurnInLair: true, spellcasting: true, source: { select: { name: true, version: true, attribution: true, type: true } } },
    }),
    prisma.partyMember.findMany({
      where: { campaignId, isActive: true, name: { contains: query } }, orderBy: { name: "asc" },
      select: { id: true, name: true, playerName: true, species: true, className: true, level: true, currentHp: true, maxHp: true, tempHp: true, ac: true, initiativeBonus: true },
    }),
    prisma.nPC.findMany({
      where: { campaignId, name: { contains: query } }, orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, description: true },
    }),
  ]);
  return Response.json({ monsters: monsters.map(monster => ({ id: monster.id, name: monster.name, data: monsterDataForUi(monster), source: monster.source })), party, npcs });
}
