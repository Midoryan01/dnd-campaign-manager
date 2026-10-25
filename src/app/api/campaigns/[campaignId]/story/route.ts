import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";
import { writeCampaignAudit } from "@/lib/campaign-audit";

const paramsSchema = z.object({ campaignId: z.string().min(1) });
const createSchema = z.object({ title: z.string().trim().min(1).max(160), objective: z.string().trim().max(2000).optional(), notes: z.string().max(5000).optional(), actId: z.string().nullable().optional(), locationId: z.string().optional(), npcIds: z.array(z.string()).max(100).optional(), encounterIds: z.array(z.string()).max(100).optional(), questIds: z.array(z.string()).max(100).optional(), visibility: z.enum(["DM_ONLY", "PUBLIC", "PLAYER_VISIBLE"]).default("DM_ONLY") });
const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), id: z.string().min(1), title: z.string().trim().min(1).max(160), objective: z.string().trim().max(2000).optional(), notes: z.string().max(5000).optional(), actId: z.string().nullable().optional(), locationId: z.string().optional(), npcIds: z.array(z.string()).max(100).optional(), encounterIds: z.array(z.string()).max(100).optional(), questIds: z.array(z.string()).max(100).optional(), visibility: z.enum(["DM_ONLY", "PUBLIC", "PLAYER_VISIBLE"]).optional() }),
  z.object({ action: z.literal("status"), id: z.string().min(1), status: z.enum(["TODO", "IN_PROGRESS", "DONE", "SKIPPED"]), activeSceneAction: z.enum(["complete", "queue"]).optional() }),
  z.object({ action: z.literal("reorder"), ids: z.array(z.string().min(1)).min(1).max(200) }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

async function authorize(request: Request, routeParams: Promise<{ campaignId: string }>) {
  const session = await auth();
  if (!session?.user?.id) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const params = paramsSchema.safeParse(await routeParams);
  if (!params.success) return { error: Response.json({ error: "Invalid campaign" }, { status: 400 }) };
  if (!await canManageCampaign(params.data.campaignId, session.user.id)) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  return { campaignId: params.data.campaignId, actorId: session.user.id };
}

export async function GET(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await authorize(request, params);
  if (access.error) return access.error;
  try {
    const [scenes, encounters] = await Promise.all([
      prisma.storyScene.findMany({ where: { campaignId: access.campaignId }, include: { act: { select: { id: true, name: true } }, location: true, npcs: true, quests: { select: { id: true, title: true, status: true } }, linkedNotes: { select: { id: true, title: true, body: true, visibility: true, locationId: true, questId: true } }, encounters: { select: { id: true, name: true, status: true, _count: { select: { combatants: true } } } } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.combat.findMany({ where: { campaignId: access.campaignId }, select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    ]);
    return Response.json({ scenes, encounters });
  } catch (error) {
    console.error("Story scenes failed to load", error);
    return Response.json({ error: "Cerita gagal dimuat. Periksa koneksi database dan migration." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await authorize(request, params);
  if (access.error) return access.error;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Isi judul scene dengan benar." }, { status: 400 });
  try {
    const { locationId, actId, npcIds = [], encounterIds = [], questIds = [], ...data } = parsed.data;
    if (actId && !await prisma.storyNote.findFirst({ where: { id: actId, campaignId: access.campaignId, kind: "ACT" } })) return Response.json({ error: "Act tidak cocok dengan campaign." }, { status: 400 });
    if (new Set(npcIds).size !== npcIds.length || new Set(encounterIds).size !== encounterIds.length || new Set(questIds).size !== questIds.length || (locationId && !await prisma.location.findFirst({ where: { id: locationId, campaignId: access.campaignId } }) ) || await prisma.nPC.count({ where: { id: { in: npcIds }, campaignId: access.campaignId } }) !== npcIds.length || await prisma.combat.count({ where: { id: { in: encounterIds }, campaignId: access.campaignId } }) !== encounterIds.length || await prisma.quest.count({ where: { id: { in: questIds }, campaignId: access.campaignId } }) !== questIds.length) return Response.json({ error: "Lokasi, NPC, quest, atau encounter tidak cocok dengan campaign." }, { status: 400 });
    const sortOrder = await prisma.storyScene.count({ where: { campaignId: access.campaignId } });
    const scene = await prisma.storyScene.create({ data: { ...data, campaign: { connect: { id: access.campaignId } }, act: actId ? { connect: { id: actId } } : undefined, sortOrder, location: locationId ? { connect: { id: locationId } } : undefined, npcs: { connect: npcIds.map(id => ({ id })) }, encounters: { connect: encounterIds.map(id => ({ id })) }, quests: { connect: questIds.map(id => ({ id })) } } });
    await writeCampaignAudit({ campaignId: access.campaignId, actorId: access.actorId, action: "CREATE", entityType: "SCENE", entityId: scene.id, summary: `Scene dibuat: ${scene.title}` });
    return Response.json(scene, { status: 201 });
  } catch (error) {
    console.error("Story scene failed to save", error);
    return Response.json({ error: "Scene gagal disimpan. Periksa koneksi database dan migration." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await authorize(request, params);
  if (access.error) return access.error;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Perubahan scene tidak valid." }, { status: 400 });
  const input = parsed.data;
  if (input.action === "update") {
    const { action: _action, id: _id, locationId, actId, npcIds = [], encounterIds = [], questIds, ...data } = input;
    if (actId && !await prisma.storyNote.findFirst({ where: { id: actId, campaignId: access.campaignId, kind: "ACT" } })) return Response.json({ error: "Act tidak cocok dengan campaign." }, { status: 400 });
    if (new Set(npcIds).size !== npcIds.length || new Set(encounterIds).size !== encounterIds.length || (questIds && new Set(questIds).size !== questIds.length) || (locationId && !await prisma.location.findFirst({ where: { id: locationId, campaignId: access.campaignId } })) || await prisma.nPC.count({ where: { id: { in: npcIds }, campaignId: access.campaignId } }) !== npcIds.length || await prisma.combat.count({ where: { id: { in: encounterIds }, campaignId: access.campaignId } }) !== encounterIds.length || (questIds && await prisma.quest.count({ where: { id: { in: questIds }, campaignId: access.campaignId } }) !== questIds.length)) return Response.json({ error: "Lokasi, NPC, quest, atau encounter tidak cocok dengan campaign." }, { status: 400 });
    const scene = await prisma.storyScene.findFirst({ where: { id: input.id, campaignId: access.campaignId } });
    if (!scene) return Response.json({ ok: false });
    await prisma.storyScene.update({ where: { id: scene.id }, data: { ...data, act: actId === undefined ? undefined : actId ? { connect: { id: actId } } : { disconnect: true }, location: locationId ? { connect: { id: locationId } } : { disconnect: true }, npcs: { set: npcIds.map(id => ({ id })) }, encounters: { set: encounterIds.map(id => ({ id })) }, quests: questIds ? { set: questIds.map(id => ({ id })) } : undefined } });
    await writeCampaignAudit({ campaignId: access.campaignId, actorId: access.actorId, action: "UPDATE", entityType: "SCENE", entityId: scene.id, summary: `Scene diperbarui: ${data.title}` });
    return Response.json({ ok: true });
  }
  if (input.action === "reorder") {
    const current = await prisma.storyScene.findMany({ where: { campaignId: access.campaignId }, select: { id: true } });
    if (current.length !== input.ids.length || new Set(input.ids).size !== input.ids.length || input.ids.some(id => !current.some(scene => scene.id === id))) return Response.json({ error: "Urutan scene tidak cocok dengan campaign." }, { status: 400 });
    await prisma.$transaction(input.ids.map((id, sortOrder) => prisma.storyScene.updateMany({ where: { id, campaignId: access.campaignId }, data: { sortOrder } })));
    await writeCampaignAudit({ campaignId: access.campaignId, actorId: access.actorId, action: "REORDER", entityType: "SCENE", entityId: input.ids[0], summary: "Urutan scene diubah" });
    return Response.json({ ok: true });
  }
  if (input.action === "delete") {
    const deleted = await prisma.storyScene.deleteMany({ where: { id: input.id, campaignId: access.campaignId } });
    if (deleted.count) await writeCampaignAudit({ campaignId: access.campaignId, actorId: access.actorId, action: "DELETE", entityType: "SCENE", entityId: input.id, summary: "Scene dihapus" });
    return Response.json({ ok: deleted.count === 1 });
  }
  if (input.action === "status") {
    const updated = await prisma.$transaction(async transaction => {
      const scene = await transaction.storyScene.findFirst({ where: { id: input.id, campaignId: access.campaignId } });
      if (!scene) return false;
      if (input.status === "IN_PROGRESS") {
        const active = await transaction.storyScene.findMany({ where: { campaignId: access.campaignId, status: "IN_PROGRESS", id: { not: scene.id } } });
        if (active.length && !input.activeSceneAction) return { conflict: active[0].title };
        for (const other of active) {
          if (input.activeSceneAction === "complete" && !other.timelineEventId) {
            const event = await transaction.timelineEvent.create({ data: { campaignId: access.campaignId, title: other.title, description: other.objective, visibility: "DM_ONLY" } });
            await transaction.storyScene.update({ where: { id: other.id }, data: { status: "DONE", timelineEventId: event.id } });
          } else await transaction.storyScene.update({ where: { id: other.id }, data: { status: input.activeSceneAction === "complete" ? "DONE" : "TODO" } });
        }
      }
      if (input.status === "DONE" && !scene.timelineEventId) {
        const event = await transaction.timelineEvent.create({ data: { campaignId: access.campaignId, title: scene.title, description: scene.objective, visibility: "DM_ONLY" } });
        await transaction.storyScene.update({ where: { id: scene.id }, data: { status: input.status, timelineEventId: event.id } });
      } else {
        await transaction.storyScene.update({ where: { id: scene.id }, data: { status: input.status } });
      }
      return true;
    }, { isolationLevel: "Serializable" });
    if (typeof updated === "object") return Response.json({ conflict: updated.conflict }, { status: 409 });
    if (updated) await writeCampaignAudit({ campaignId: access.campaignId, actorId: access.actorId, action: "STATUS", entityType: "SCENE", entityId: input.id, summary: `Status scene diubah menjadi ${input.status}` });
    return Response.json({ ok: updated });
  }
  return Response.json({ error: "Aksi tidak valid." }, { status: 400 });
}
