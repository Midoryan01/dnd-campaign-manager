import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  priceCopper: z.number().int().min(0).max(100_000_000).optional(),
  stock: z.number().int().min(0).max(100_000).nullable().optional(),
}).refine(data => Object.keys(data).length > 0, "Pilih perubahan barang.");

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; shopId: string; itemId: string }> }) {
  const { campaignId, shopId, itemId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Perubahan barang tidak valid." }, { status: 400 });
  const shop = await prisma.shop.findFirst({ where: { id: shopId, campaignId }, select: { id: true } });
  if (!shop) return Response.json({ error: "Toko tidak ditemukan." }, { status: 404 });
  const updated = await prisma.shopItem.updateMany({ where: { id: itemId, shopId }, data: parsed.data });
  if (!updated.count) return Response.json({ error: "Barang tidak ditemukan." }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ campaignId: string; shopId: string; itemId: string }> }) {
  const { campaignId, shopId, itemId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const shop = await prisma.shop.findFirst({ where: { id: shopId, campaignId }, select: { id: true } });
  if (!shop) return Response.json({ error: "Toko tidak ditemukan." }, { status: 404 });
  const deleted = await prisma.shopItem.deleteMany({ where: { id: itemId, shopId } });
  if (!deleted.count) return Response.json({ error: "Barang tidak ditemukan." }, { status: 404 });
  return Response.json({ ok: true });
}
