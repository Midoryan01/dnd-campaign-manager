import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCampaignRole } from "@/lib/permissions/campaign";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getCampaignRole(campaignId, session.user.id);
  if (role !== "OWNER" && role !== "DM") return Response.json({ error: "Not found" }, { status: 404 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId },
    select: {
      id: true, name: true, description: true, system: true, rulesVersion: true, locale: true, timezone: true, createdAt: true, updatedAt: true,
      partyMembers: true,
      notes: { select: { id: true, title: true, body: true, visibility: true, tags: true, storySceneId: true, locationId: true, questId: true, createdAt: true, updatedAt: true } },
      npcs: true, factions: true, quests: true, lore: true, timeline: true, locations: true, storyNotes: true,
      maps: { include: { tokens: true } },
      storyScenes: { include: { location: true, npcs: true, quests: true, linkedNotes: { select: { id: true, title: true, body: true, visibility: true, locationId: true, questId: true } }, encounters: { include: { combatants: { include: { monster: true } }, logs: true } } } },
      combats: { include: { combatants: { include: { monster: true } }, logs: true } },
    },
  });
  if (!campaign) return Response.json({ error: "Not found" }, { status: 404 });

  const slug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "campaign";
  const payload = { format: "dm-workspace-export", version: 1, exportedAt: new Date().toISOString(), campaign };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-backup.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
