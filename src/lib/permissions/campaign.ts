import { CampaignRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
export async function getCampaignRole(campaignId: string, userId: string) {
  const member = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId } }, select: { role: true } });
  return member?.role ?? null;
}
export async function canManageCampaign(campaignId: string, userId: string) {
  const role = await getCampaignRole(campaignId, userId);
  return role === CampaignRole.OWNER || role === CampaignRole.DM;
}
export async function requireCampaignMember(campaignId: string, userId: string) {
  const role = await getCampaignRole(campaignId, userId);
  if (!role) throw new Error("Campaign access denied");
  return role;
}
