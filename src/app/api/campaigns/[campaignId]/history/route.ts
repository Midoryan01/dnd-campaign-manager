import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCampaignRole } from "@/lib/permissions/campaign";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getCampaignRole(campaignId, session.user.id);
  if (role !== "OWNER" && role !== "DM") return Response.json({ error: "Not found" }, { status: 404 });

  const [changes, combatLogs] = await Promise.all([
    prisma.campaignAuditLog.findMany({ where: { campaignId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, entityType: true, entityId: true, summary: true, createdAt: true } }),
    prisma.combatLog.findMany({ where: { combat: { campaignId } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, eventType: true, combat: { select: { name: true } }, createdAt: true } }),
  ]);
  const events = [
    ...changes.map(item => ({ id: item.id, action: item.action, entityType: item.entityType, entityId: item.entityId, summary: item.summary, createdAt: item.createdAt })),
    ...combatLogs.map(item => ({ id: `combat-${item.id}`, action: "COMBAT", entityType: "Combat", entityId: "", summary: `${item.combat.name}: ${item.eventType.replace(/[_-]+/g, " ")}`, createdAt: item.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
  return Response.json({ events });
}
