import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const shopSchema = z.object({
  name: z.string().trim().min(1).max(160),
  locationId: z.string().min(1),
  proprietorId: z.string().nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });

  const shops = await prisma.shop.findMany({
    where: { campaignId },
    include: {
      location: { select: { id: true, name: true } },
      proprietor: { select: { id: true, name: true } },
      items: { orderBy: { name: "asc" } },
      transactions: { orderBy: { createdAt: "desc" }, take: 12 },
    },
    orderBy: { name: "asc" },
  });
  return Response.json({ shops });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = shopSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Isi nama toko dan pilih lokasi." }, { status: 400 });
  const data = parsed.data;
  const [location, proprietor] = await Promise.all([
    prisma.location.findFirst({ where: { id: data.locationId, campaignId }, select: { id: true } }),
    data.proprietorId ? prisma.nPC.findFirst({ where: { id: data.proprietorId, campaignId }, select: { id: true } }) : null,
  ]);
  if (!location || (data.proprietorId && !proprietor)) return Response.json({ error: "Lokasi atau pemilik harus berasal dari campaign ini." }, { status: 400 });

  const shop = await prisma.shop.create({ data: { ...data, campaignId } });
  return Response.json({ shop }, { status: 201 });
}
