import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  locationId: z.string().nullable().optional(),
  proprietorId: z.string().nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  isOpen: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, "Pilih perubahan toko.");

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; shopId: string }> }) {
  const { campaignId, shopId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Perubahan toko tidak valid." }, { status: 400 });

  const data = parsed.data;
  const [shop, location, proprietor] = await Promise.all([
    prisma.shop.findFirst({ where: { id: shopId, campaignId }, select: { id: true } }),
    data.locationId ? prisma.location.findFirst({ where: { id: data.locationId, campaignId }, select: { id: true } }) : null,
    data.proprietorId ? prisma.nPC.findFirst({ where: { id: data.proprietorId, campaignId }, select: { id: true } }) : null,
  ]);
  if (!shop) return Response.json({ error: "Toko tidak ditemukan." }, { status: 404 });
  if ((data.locationId && !location) || (data.proprietorId && !proprietor)) return Response.json({ error: "Lokasi atau pemilik harus berasal dari campaign ini." }, { status: 400 });
  await prisma.shop.update({ where: { id: shop.id }, data });
  return Response.json({ ok: true });
}
