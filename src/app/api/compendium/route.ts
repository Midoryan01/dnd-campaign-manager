import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { monsterDataForUi } from "@/lib/monster-data";

const querySchema = z.object({
  type: z.enum(["monster", "spell", "equipment", "magicItem", "feat", "rule"]).default("monster"),
  q: z.string().trim().max(120).default(""),
  category: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  level: z.preprocess(value => value === "" || value === undefined ? undefined : value, z.coerce.number().int().min(0).max(9).optional()),
});
const pageSize = 30;
const globalSource = { source: { campaignId: null } };

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid compendium filter." }, { status: 400 });
  const { type, q, category, page, level } = parsed.data;
  const skip = (page - 1) * pageSize;
  const nameFilter = q ? { contains: q } : undefined;

  if (type === "monster") {
    const where = { ...globalSource, ...(nameFilter ? { name: nameFilter } : {}) };
    const [total, records] = await Promise.all([prisma.monster.count({ where }), prisma.monster.findMany({ where, orderBy: { name: "asc" }, skip, take: pageSize, select: { id: true, externalKey: true, name: true, slug: true, data: true, edition: true, sourceLabel: true, classification: true, combatStats: true, abilities: true, proficiencyBonus: true, skills: true, senses: true, languages: true, telepathy: true, telepathyData: true, defenses: true, gear: true, challenge: true, traits: true, actions: true, bonusActions: true, reactions: true, legendaryActions: true, legendaryActionsPerTurn: true, legendaryActionsPerTurnInLair: true, spellcasting: true } })]);
    return Response.json({ results: records.map(record => ({ id: record.id, name: record.name, slug: record.slug, data: monsterDataForUi(record), type })), total, page, pageSize });
  }
  if (type === "spell") {
    const where = { ...globalSource, ...(nameFilter ? { name: nameFilter } : {}), ...(level === undefined ? {} : { level }) };
    try {
      const [total, records] = await Promise.all([prisma.spell.count({ where }), prisma.spell.findMany({ where, orderBy: [{ level: "asc" }, { name: "asc" }], skip, take: pageSize, select: { id: true, name: true, slug: true, level: true, kind: true, school: true, classes: true, castingTime: true, range: true, components: true, duration: true, description: true, higherLevel: true, cantripUpgrade: true, damage: true, sourceData: true } })]);
      return Response.json({ results: records.map(record => ({ ...record, data: { kind: record.kind, classes: record.classes, castingTime: record.castingTime, range: record.range, components: record.components, duration: record.duration, description: record.description, higherLevel: record.higherLevel, cantripUpgrade: record.cantripUpgrade, damage: record.damage, source: record.sourceData }, type })), total, page, pageSize });
    } catch (error) {
      console.error("Compendium spell query failed:", error);
      return Response.json({ error: "Data spell belum siap. Restart server Next.js, generate Prisma Client, lalu jalankan seeder SRD." }, { status: 503 });
    }
  }
  if (type === "equipment" || type === "magicItem") {
    const where = { ...globalSource, ...(type === "magicItem" ? { category: "Magic Item" } : { category: category ?? { not: "Magic Item" } }), ...(nameFilter ? { name: nameFilter } : {}) };
    const [total, records] = await Promise.all([prisma.item.count({ where }), prisma.item.findMany({ where, orderBy: { name: "asc" }, skip, take: pageSize, select: { id: true, name: true, slug: true, category: true, data: true } })]);
    return Response.json({ results: records.map(record => ({ ...record, type })), total, page, pageSize });
  }

  const search = q ? [{ title: { contains: q } }, { searchText: { contains: q } }] : undefined;
  const where = type === "feat"
    ? { ...globalSource, category: { startsWith: "Feat" }, ...(search ? { OR: search } : {}) }
    : { ...globalSource, OR: [{ category: null }, { NOT: { category: { startsWith: "Feat" } } }], ...(search ? { AND: [{ OR: search }] } : {}) };
  const [total, records] = await Promise.all([prisma.rule.count({ where }), prisma.rule.findMany({ where, orderBy: { title: "asc" }, skip, take: pageSize, select: { id: true, title: true, slug: true, category: true, body: true } })]);
  return Response.json({ results: records.map(record => ({ id: record.id, name: record.title, slug: record.slug, category: record.category, data: { body: record.body }, type })), total, page, pageSize });
}
