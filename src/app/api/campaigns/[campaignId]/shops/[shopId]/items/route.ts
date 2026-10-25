import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  priceCopper: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(0).max(100_000).nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string; shopId: string }> }) {
  const { campaignId, shopId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Periksa nama, harga, dan stok barang." }, { status: 400 });
  const shop = await prisma.shop.findFirst({ where: { id: shopId, campaignId }, select: { id: true } });
  if (!shop) return Response.json({ error: "Toko tidak ditemukan." }, { status: 404 });
  const item = await prisma.shopItem.create({ data: { ...parsed.data, shopId } });
  return Response.json({ item }, { status: 201 });
}
