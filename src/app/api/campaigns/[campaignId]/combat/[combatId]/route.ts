import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";
import { writeCampaignAudit } from "@/lib/campaign-audit";

const actionSchema = z.object({
  action: z.enum(["next", "hp", "condition", "initiative", "rename", "finish"]),
  combatantId: z.string().optional(),
  amount: z.number().int().min(-1000).max(1000).optional(),
  name: z.string().trim().max(80).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; combatId: string }> }) {
  const { campaignId, combatId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid combat action." }, { status: 400 });
  const combat = await prisma.combat.findFirst({
    where: { id: combatId, campaignId },
    include: { combatants: { orderBy: [{ initiative: "desc" }, { sortOrder: "asc" }] } },
  });
  if (!combat) return Response.json({ error: "Not found" }, { status: 404 });
  if (combat.status !== "ACTIVE") return Response.json({ error: "Combat ini sudah selesai." }, { status: 409 });

  if (parsed.data.action === "finish") {
    const updated = await prisma.$transaction(async transaction => {
      const result = await transaction.combat.updateMany({ where: { id: combat.id, campaignId, status: "ACTIVE" }, data: { status: "COMPLETED", endedAt: new Date() } });
      if (result.count) await transaction.combatLog.create({ data: { combatId, eventType: "combat_finished", payload: { status: "COMPLETED" } } });
      return result.count;
    });
    if (updated) await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "FINISH", entityType: "COMBAT", entityId: combatId, summary: `Combat diselesaikan: ${combat.name}` });
    return updated ? Response.json({ ok: true }) : Response.json({ error: "Combat sudah berubah. Muat ulang halaman." }, { status: 409 });
  }

  if (parsed.data.action === "next") {
    const activeCombatants = combat.combatants.filter(item => item.isActive);
    if (!activeCombatants.length) return Response.json({ error: "Tidak ada peserta aktif." }, { status: 409 });
    const index = (combat.activeTurnIndex + 1) % activeCombatants.length;
    const updated = await prisma.combat.update({
      where: { id: combat.id },
      data: { activeTurnIndex: index, ...(index === 0 ? { round: { increment: 1 } } : {}) },
      select: { round: true, activeTurnIndex: true },
    });
    await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "TURN", entityType: "COMBAT", entityId: combatId, summary: `Giliran combat berpindah ke ronde ${updated.round}` });
    return Response.json(updated);
  }

  if (!parsed.data.combatantId) return Response.json({ error: "Pilih combatant terlebih dahulu." }, { status: 400 });
  const combatant = combat.combatants.find(item => item.id === parsed.data.combatantId);
  if (!combatant) return Response.json({ error: "Not found" }, { status: 404 });
  let updated;

  if (parsed.data.action === "hp") {
    const amount = parsed.data.amount;
    if (amount === undefined || amount === 0) return Response.json({ error: "Masukkan jumlah damage atau pemulihan HP." }, { status: 400 });
    const tempHpDamage = amount < 0 ? Math.min(combatant.tempHp, -amount) : 0;
    const tempHp = combatant.tempHp - tempHpDamage;
    const currentHp = Math.max(0, Math.min(combatant.maxHp, combatant.currentHp + amount + tempHpDamage));
    updated = await prisma.$transaction(async tx => {
      const activeBefore = combat.combatants.filter(item => item.isActive);
      const currentTurnId = activeBefore[combat.activeTurnIndex]?.id;
      const currentTurnIndex = activeBefore.findIndex(item => item.id === currentTurnId);
      const activeAfter = combat.combatants.filter(item => item.id === combatant.id ? currentHp > 0 : item.isActive);
      const nextTurn = currentTurnId && activeAfter.some(item => item.id === currentTurnId)
        ? currentTurnId
        : currentTurnId
          ? activeBefore.slice(currentTurnIndex + 1).find(item => activeAfter.some(active => active.id === item.id))?.id
            ?? activeBefore.slice(0, currentTurnIndex).find(item => activeAfter.some(active => active.id === item.id))?.id
          : undefined;
      const activeTurnIndex = nextTurn ? activeAfter.findIndex(item => item.id === nextTurn) : 0;
      const advanceRound = currentHp === 0 && currentTurnId === combatant.id && currentTurnIndex === activeBefore.length - 1 && activeAfter.length > 0;
      const row = await tx.combatant.update({ where: { id: combatant.id }, data: { currentHp, tempHp, isActive: currentHp > 0 }, select: { id: true, name: true, currentHp: true, maxHp: true, tempHp: true } });
      if (combatant.partyMemberId) await tx.partyMember.update({ where: { id: combatant.partyMemberId }, data: { currentHp, tempHp } });
      await tx.combatLog.create({ data: { combatId, eventType: "hp", payload: { combatantId: combatant.id, operation: amount < 0 ? "damage" : "heal", amount: Math.abs(amount), from: combatant.currentHp, to: currentHp, tempHpFrom: combatant.tempHp, tempHpTo: tempHp } } });
      await tx.combat.update({ where: { id: combatId }, data: { activeTurnIndex, ...(advanceRound ? { round: { increment: 1 } } : {}) } });
      return row;
    });
    await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "HP", entityType: "COMBAT", entityId: combatId, summary: `${amount < 0 ? "Damage" : "Pemulihan"} ${Math.abs(amount)} HP untuk ${combatant.name}` });
  } else if (parsed.data.action === "initiative") {
    updated = await prisma.combatant.update({ where: { id: combatant.id }, data: { initiative: parsed.data.amount ?? 0 }, select: { id: true, name: true, initiative: true } });
    await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "INITIATIVE", entityType: "COMBAT", entityId: combatId, summary: `Inisiatif ${combatant.name} diubah` });
  } else if (parsed.data.action === "rename") {
    if (!parsed.data.name) return Response.json({ error: "Nama combatant wajib diisi." }, { status: 400 });
    updated = await prisma.combatant.update({ where: { id: combatant.id }, data: { name: parsed.data.name }, select: { id: true, name: true } });
    await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "RENAME", entityType: "COMBAT", entityId: combatId, summary: `Nama ${combatant.name} diubah menjadi ${parsed.data.name}` });
  } else {
    if (!parsed.data.name) return Response.json({ error: "Nama kondisi wajib diisi." }, { status: 400 });
    const conditions = Array.isArray(combatant.conditions) ? combatant.conditions.filter((value): value is string => typeof value === "string") : [];
    const next = conditions.includes(parsed.data.name) ? conditions.filter(value => value !== parsed.data.name) : [...conditions, parsed.data.name];
    updated = await prisma.combatant.update({ where: { id: combatant.id }, data: { conditions: next }, select: { id: true, name: true, conditions: true } });
    await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "CONDITION", entityType: "COMBAT", entityId: combatId, summary: `Kondisi ${parsed.data.name} ${conditions.includes(parsed.data.name) ? "dihapus dari" : "ditambahkan ke"} ${combatant.name}` });
  }
  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ campaignId: string; combatId: string }> }) {
  const { campaignId, combatId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const deleted = await prisma.combat.deleteMany({ where: { id: combatId, campaignId } });
  if (!deleted.count) return Response.json({ error: "Not found" }, { status: 404 });
  await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "DELETE", entityType: "COMBAT", entityId: combatId, summary: `Combat dihapus: ${combatId}` });
  return Response.json({ ok: true });
}
