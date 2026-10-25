import { randomInt } from "node:crypto";
import { CombatantType, Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";
import { writeCampaignAudit } from "@/lib/campaign-audit";
import { monsterDataForUi } from "@/lib/monster-data";

const entrySchema = z.object({
  type: z.nativeEnum(CombatantType),
  referenceId: z.string().optional(),
  name: z.string().trim().max(100).optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  maxHp: z.number().int().min(1).max(10000).optional(),
  currentHp: z.number().int().min(0).max(10000).optional(),
  tempHp: z.number().int().min(0).max(10000).default(0),
  ac: z.number().int().min(1).max(50).optional(),
  initiativeBonus: z.number().int().min(-10).max(20).default(0),
  initiative: z.number().int().min(0).max(1000).nullable().optional(),
});
const requestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  combatants: z.array(entrySchema).min(1).max(30),
}).superRefine((value, context) => {
  if (value.combatants.reduce((sum, entry) => sum + entry.quantity, 0) > 100) {
    context.addIssue({ code: "custom", message: "Encounter maksimal 100 peserta.", path: ["combatants"] });
  }
  value.combatants.forEach((entry, index) => {
    if (entry.type !== CombatantType.CUSTOM && !entry.referenceId) {
      context.addIssue({ code: "custom", message: "Pilih referensi peserta.", path: ["combatants", index, "referenceId"] });
    }
    if (entry.type === CombatantType.CUSTOM && !entry.name) {
      context.addIssue({ code: "custom", message: "Nama combatant custom wajib diisi.", path: ["combatants", index, "name"] });
    }
    if (entry.type === CombatantType.PLAYER && (entry.initiative === undefined || entry.initiative === null)) {
      context.addIssue({ code: "custom", message: "Masukkan hasil roll initiative pemain.", path: ["combatants", index, "initiative"] });
    }
    if ((entry.type === CombatantType.NPC || entry.type === CombatantType.CUSTOM) && (!entry.maxHp || !entry.ac)) {
      context.addIssue({ code: "custom", message: "Isi HP dan AC untuk peserta ini.", path: ["combatants", index, "maxHp"] });
    }
  });
});

function readNumber(data: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const match = value.match(/^-?\d+/);
      if (match) return Number(match[0]);
    }
  }
  return undefined;
}
export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!await canManageCampaign(campaignId, session.user.id)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Periksa pilihan peserta dan statistiknya.", details: parsed.error.flatten() }, { status: 400 });

  const entries: Prisma.CombatantCreateWithoutCombatInput[] = [];
  let totalXp = 0;
  for (const entry of parsed.data.combatants) {
    let name = entry.name ?? "";
    const type = entry.type;
    let monsterId: string | undefined;
    let partyMemberId: string | undefined;
    let npcId: string | undefined;
    let maxHp = entry.maxHp;
    let currentHp = entry.currentHp;
    let ac = entry.ac;
    let initiativeBonus = entry.initiativeBonus;
    let xp = 0;

    if (type === CombatantType.MONSTER) {
      const monster = await prisma.monster.findFirst({
        where: { id: entry.referenceId, source: { OR: [{ campaignId: null }, { campaignId }] } },
        select: { id: true, externalKey: true, name: true, data: true, edition: true, sourceLabel: true, classification: true, combatStats: true, abilities: true, proficiencyBonus: true, skills: true, senses: true, languages: true, telepathy: true, telepathyData: true, defenses: true, gear: true, challenge: true, traits: true, actions: true, bonusActions: true, reactions: true, legendaryActions: true, legendaryActionsPerTurn: true, legendaryActionsPerTurnInLair: true, spellcasting: true },
      });
      if (!monster) return Response.json({ error: "Monster tidak ditemukan di kompendium kampanye ini." }, { status: 404 });
      const data = monsterDataForUi(monster);
      name = monster.name;
      monsterId = monster.id;
      maxHp ??= readNumber(data, ["hit_points", "hitPoints", "hp", "average_hit_points"]);
      ac ??= readNumber(data, ["armor_class", "armorClass", "ac"]);
      initiativeBonus = readNumber(data, ["initiative_bonus", "initiativeBonus", "dexterity_modifier"]) ?? initiativeBonus;
      xp = readNumber(data, ["xp", "experience_points", "experiencePoints"]) ?? 0;
      if (!maxHp || !ac) return Response.json({ error: `${monster.name}: HP/AC tidak tersedia. Isi nilai custom sebelum memulai encounter.` }, { status: 400 });
    } else if (type === CombatantType.PLAYER) {
      const member = await prisma.partyMember.findFirst({ where: { id: entry.referenceId, campaignId, isActive: true } });
      if (!member) return Response.json({ error: "Karakter party tidak ditemukan." }, { status: 404 });
      name = member.name;
      partyMemberId = member.id;
      maxHp ??= member.maxHp;
      currentHp ??= member.currentHp;
      ac ??= member.ac;
      initiativeBonus = member.initiativeBonus;
    } else if (type === CombatantType.NPC) {
      const npc = await prisma.nPC.findFirst({ where: { id: entry.referenceId, campaignId }, select: { id: true, name: true } });
      if (!npc) return Response.json({ error: "NPC kampanye tidak ditemukan." }, { status: 404 });
      name = npc.name;
      npcId = npc.id;
    }

    if (!maxHp || !ac) return Response.json({ error: `${name}: HP dan AC harus diisi.` }, { status: 400 });
    const initialHp = Math.min(currentHp ?? maxHp, maxHp);
    for (let index = 0; index < entry.quantity; index++) {
      entries.push({
        type,
        name: entry.quantity > 1 ? `${name} ${index + 1}` : name,
        monster: monsterId ? { connect: { id: monsterId } } : undefined,
        partyMember: partyMemberId ? { connect: { id: partyMemberId } } : undefined,
        npc: npcId ? { connect: { id: npcId } } : undefined,
        maxHp,
        currentHp: initialHp,
        tempHp: entry.tempHp,
        ac,
        isActive: initialHp > 0,
        initiative: entry.initiative ?? randomInt(1, 21) + initiativeBonus,
        sortOrder: entries.length,
      });
    }
    totalXp += xp * entry.quantity;
  }

  const combat = await prisma.combat.create({
    data: { campaignId, name: parsed.data.name, status: "ACTIVE", startedAt: new Date(), combatants: { create: entries } },
    include: { combatants: { orderBy: [{ initiative: "desc" }, { sortOrder: "asc" }] } },
  });
  await writeCampaignAudit({ campaignId, actorId: session.user.id, action: "CREATE", entityType: "COMBAT", entityId: combat.id, summary: `Combat dimulai: ${combat.name}` });
  return Response.json({ combat, totalXp }, { status: 201 });
}
