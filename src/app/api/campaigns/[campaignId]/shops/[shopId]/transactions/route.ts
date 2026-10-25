import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const transactionSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(10_000),
  buyer: z.string().trim().max(160).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string; shopId: string }> }) {
  const { campaignId, shopId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Periksa barang dan jumlah transaksi." }, { status: 400 });

  const result = await prisma.$transaction(async tx => {
    const shop = await tx.shop.findFirst({ where: { id: shopId, campaignId }, select: { id: true, isOpen: true } });
    if (!shop) return { error: "Toko tidak ditemukan.", status: 404 };
    if (!shop.isOpen) return { error: "Toko sedang tutup.", status: 409 };
    const item = await tx.shopItem.findFirst({ where: { id: parsed.data.itemId, shopId } });
    if (!item) return { error: "Barang tidak ditemukan.", status: 404 };
    if (item.stock !== null) {
      const stockUpdate = await tx.shopItem.updateMany({ where: { id: item.id, shopId, stock: { gte: parsed.data.quantity } }, data: { stock: { decrement: parsed.data.quantity } } });
      if (!stockUpdate.count) return { error: "Stok tidak mencukupi.", status: 409 };
    }
    const transaction = await tx.shopTransaction.create({
      data: {
        shopId,
        itemId: item.id,
        itemName: item.name,
        quantity: parsed.data.quantity,
        unitPriceCopper: item.priceCopper,
        buyer: parsed.data.buyer || null,
        note: parsed.data.note || null,
      },
    });
    return { transaction };
  });
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result, { status: 201 });
}
