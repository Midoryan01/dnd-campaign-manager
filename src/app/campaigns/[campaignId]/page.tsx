import { notFound, redirect } from "next/navigation";
import { Visibility } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCampaignRole } from "@/lib/permissions/campaign";
import { filterVisibleLocations } from "@/lib/location-visibility";
import { monsterDataForUi } from "@/lib/monster-data";
import { Workspace } from "./workspace";

export default async function CampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = await getCampaignRole(campaignId, session.user.id);
  const dm = role === "OWNER" || role === "DM";
  const visible = dm ? undefined : { in: [Visibility.PUBLIC, Visibility.PLAYER_VISIBLE] };
  const [campaign, navigationCounts] = await Promise.all([
    prisma.campaign.findFirst({
      where: { id: campaignId, members: { some: { userId: session.user.id } } },
      include: {
        notes: { where: dm ? undefined : { visibility: { in: [Visibility.PUBLIC, Visibility.PLAYER_VISIBLE] } }, orderBy: { updatedAt: "desc" }, include: { storyScene: { select: { id: true, title: true } }, location: { select: { id: true, name: true } }, quest: { select: { id: true, title: true } } } },
        npcs: { where: { visibility: visible }, orderBy: { updatedAt: "desc" } },
        locations: { where: { visibility: visible }, select: { id: true, name: true, parentId: true, description: true, readAloud: true, visibility: true, type: true } },
        factions: { where: { visibility: visible }, take: 20 }, lore: { where: { visibility: visible }, take: 20 }, quests: { where: { visibility: visible }, take: 20 },
        storyScenes: { where: { visibility: visible }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 200, select: { id: true, title: true, objective: true, status: true, sortOrder: true } },
        timeline: { where: { visibility: visible }, orderBy: { createdAt: "desc" }, take: 20 },
        combats: { where: dm ? undefined : { id: "__dm_only__" }, orderBy: { createdAt: "desc" }, take: 10, include: { combatants: { orderBy: [{ initiative: "desc" }, { sortOrder: "asc" }], include: { monster: { select: { externalKey: true, data: true, edition: true, sourceLabel: true, classification: true, combatStats: true, abilities: true, proficiencyBonus: true, skills: true, senses: true, languages: true, telepathy: true, telepathyData: true, defenses: true, gear: true, challenge: true, traits: true, actions: true, bonusActions: true, reactions: true, legendaryActions: true, legendaryActionsPerTurn: true, legendaryActionsPerTurnInLair: true, spellcasting: true } }, partyMember: { select: { level: true } } } } } },
        maps: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    Promise.all([
      prisma.partyMember.count({ where: { campaignId, isActive: true } }), prisma.nPC.count({ where: { campaignId } }),
      prisma.quest.count({ where: { campaignId, status: "ACTIVE" } }), dm ? prisma.combat.count({ where: { campaignId, status: "ACTIVE" } }) : Promise.resolve(0),
    ]),
  ]);
  if (!campaign) notFound();
  campaign.locations = filterVisibleLocations(campaign.locations, dm);
  campaign.combats = campaign.combats.map(combat => ({ ...combat, combatants: combat.combatants.map(combatant => ({ ...combatant, monster: combatant.monster ? { ...combatant.monster, data: monsterDataForUi(combatant.monster) } : null })) }));
  return <Workspace campaign={campaign} isDm={dm} isOwner={role === "OWNER"} navigationCounts={{ party: navigationCounts[0], npcs: navigationCounts[1], quests: navigationCounts[2], combats: navigationCounts[3] }} />;
}
