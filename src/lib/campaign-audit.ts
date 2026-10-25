import { prisma } from "@/lib/db/prisma";

export async function writeCampaignAudit(input: { campaignId: string; actorId: string; action: string; entityType: string; entityId: string; summary: string }) {
  try {
    await prisma.campaignAuditLog.create({ data: input });
  } catch (error) {
    console.error("Campaign audit event failed to save", error);
  }
}
