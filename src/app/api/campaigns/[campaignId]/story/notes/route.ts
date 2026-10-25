import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";

const noteSchema = z.object({ kind: z.enum(["ACT", "THREAT", "THREAD"]), name: z.string().trim().min(1).max(160), note: z.string().trim().max(5000).optional(), status: z.enum(["TODO", "IN_PROGRESS", "DONE", "SKIPPED"]).default("TODO"), clockSize: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(6) });
const patchSchema = z.union([z.object({ id: z.string().min(1), action: z.literal("update"), name: z.string().trim().min(1).max(160), note: z.string().trim().max(5000).optional() }), z.object({ id: z.string().min(1), status: z.enum(["TODO", "IN_PROGRESS", "DONE", "SKIPPED"]) }), z.object({ id: z.string().min(1), progress: z.number().int().min(0).max(8) }), z.object({ id: z.string().min(1), action: z.literal("delete") })]);

async function getCampaign(request: Request, params: Promise<{ campaignId: string }>) {
  const session = await auth();
  if (!session?.user?.id) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const { campaignId } = await params;
  if (!campaignId || !await canManageCampaign(campaignId, session.user.id)) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  return { campaignId };
}

export async function GET(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await getCampaign(request, params);
  if (access.error) return access.error;
  return Response.json({ notes: await prisma.storyNote.findMany({ where: { campaignId: access.campaignId }, orderBy: { createdAt: "asc" } }) });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await getCampaign(request, params);
  if (access.error) return access.error;
  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Isi judul dan status dengan benar." }, { status: 400 });
  return Response.json(await prisma.storyNote.create({ data: { ...parsed.data, campaignId: access.campaignId } }), { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await getCampaign(request, params);
  if (access.error) return access.error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Perubahan catatan tidak valid." }, { status: 400 });
  if ("progress" in parsed.data) {
    const note = await prisma.storyNote.findFirst({ where: { id: parsed.data.id, campaignId: access.campaignId }, select: { clockSize: true, kind: true } });
    if (!note || note.kind !== "THREAT" || parsed.data.progress > note.clockSize) return Response.json({ error: "Progress harus berada dalam ukuran clock." }, { status: 400 });
  }
  const result = "action" in parsed.data
    ? parsed.data.action === "delete"
      ? await prisma.storyNote.deleteMany({ where: { id: parsed.data.id, campaignId: access.campaignId } })
      : await prisma.storyNote.updateMany({ where: { id: parsed.data.id, campaignId: access.campaignId, kind: "ACT" }, data: { name: parsed.data.name, note: parsed.data.note } })
    : await prisma.storyNote.updateMany({ where: { id: parsed.data.id, campaignId: access.campaignId }, data: "progress" in parsed.data ? { progress: parsed.data.progress } : { status: parsed.data.status } });
  return Response.json({ ok: result.count === 1 });
}
