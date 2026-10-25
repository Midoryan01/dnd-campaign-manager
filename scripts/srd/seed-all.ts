import "dotenv/config";
import { readFile } from "node:fs/promises";
import { ContentSourceType, Prisma } from "@prisma/client";
import { z } from "zod";
import { parseMonster } from "./seed-monsters";
import { prisma } from "../../src/lib/db/prisma";
import type { SpellDataset } from "../../data/srd/5.2.1/normalized/spell/dnd_srd_spell.types";

const entry = z.object({ externalKey: z.string().min(1), name: z.string().min(1), slug: z.string().min(1), body: z.string().min(1) });
const monsterEntry = entry.extend({ size: z.string().min(1), type: z.string().min(1) }).passthrough();
const normalizedMonsterEntry = z.object({ externalKey: z.string().min(1), slug: z.string().min(1), name: z.string().min(1), edition: z.string().optional(), classification: z.record(z.string(), z.unknown()), combat: z.record(z.string(), z.unknown()), abilities: z.record(z.string(), z.unknown()), proficiencyBonus: z.number().int().optional(), skills: z.record(z.string(), z.unknown()), senses: z.record(z.string(), z.unknown()), languages: z.array(z.string()), telepathy: z.unknown().optional(), defenses: z.record(z.string(), z.unknown()), gear: z.array(z.unknown()), challenge: z.record(z.string(), z.unknown()), traits: z.array(z.unknown()).optional(), actions: z.array(z.unknown()), bonusActions: z.array(z.unknown()), reactions: z.array(z.unknown()), legendaryActions: z.array(z.unknown()).optional(), legendaryActionsPerTurn: z.number().int().optional(), legendaryActionsPerTurnInLair: z.number().int().optional(), spellcasting: z.unknown().optional() }).passthrough();
const glossaryEntry = z.object({ externalKey: z.string().min(1), title: z.string().min(1), slug: z.string().min(1), category: z.string().optional(), page: z.number().int().optional(), body: z.string().min(1) });
const equipmentEntry = z.object({ externalKey: z.string().min(1), name: z.string().min(1), slug: z.string().min(1) }).passthrough();
const spellService = z.object({ externalKey: z.string().min(1), spellLevel: z.string().min(1), availability: z.string().min(1), cost: z.string().min(1) }).passthrough();
const spellDamageType = z.enum(["Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"]);
const normalizedSpell = z.object({
  id: z.string().min(1), externalKey: z.string().nullable(), slug: z.string().nullable(), name: z.string().min(1), level: z.number().int().min(0).max(9), kind: z.enum(["cantrip", "leveled"]),
  school: z.enum(["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"]).nullable(), classes: z.array(z.string()),
  castingTime: z.object({ raw: z.string().nullable(), type: z.enum(["action", "bonus_action", "reaction", "time", "other"]), value: z.number().int().nullable(), unit: z.string().nullable(), ritual: z.boolean() }),
  range: z.object({ raw: z.string().nullable(), type: z.enum(["self", "touch", "sight", "unlimited", "special", "distance", "self_area"]), value: z.number().int().nullable(), unit: z.string().nullable(), shape: z.string().optional() }),
  components: z.object({ raw: z.string().nullable(), verbal: z.boolean(), somatic: z.boolean(), material: z.boolean(), materialDescription: z.string().nullable() }),
  duration: z.object({ raw: z.string().nullable(), type: z.enum(["instantaneous", "timed", "concentration", "special"]), value: z.number().int().nullable(), unit: z.string().nullable(), concentration: z.boolean() }),
  description: z.string(), higherLevel: z.string().nullable(), cantripUpgrade: z.string().nullable(),
  source: z.object({ document: z.string().nullable(), version: z.string().nullable(), license: z.string().nullable(), attribution: z.string().nullable() }),
  damage: z.array(z.object({ amount: z.string().min(1), damageType: spellDamageType.nullable(), trigger: z.string().nullable(), notes: z.string().nullable(), sourceSection: z.enum(["description", "higherLevel", "cantripUpgrade"]), sourceText: z.string().min(1) })),
});
const spellDatasetSchema = z.object({ schemaVersion: z.literal("1.0.0"), dataset: z.literal("dnd-srd-spells"), edition: z.literal("2024"), source: z.object({ type: z.string(), name: z.string(), version: z.string(), license: z.string(), attribution: z.string() }), count: z.number().int().nonnegative(), spells: z.array(normalizedSpell) });
const statsSchema = z.object({
  monstersCount: z.number().int().positive(), spellsCount: z.number().int().positive(), featsCount: z.number().int().positive(), magicItemsCount: z.number().int().positive(), rulesGlossaryCount: z.number().int().positive(),
  weaponsCount: z.number().int().nonnegative(), armorCount: z.number().int().nonnegative(), toolsCount: z.number().int().nonnegative(), gearTableCount: z.number().int().nonnegative(), ammoCount: z.number().int().nonnegative(), gearDescriptionsCount: z.number().int().nonnegative(), mountsCount: z.number().int().nonnegative(), tackCount: z.number().int().nonnegative(), vehiclesCount: z.number().int().nonnegative(), lifestylesCount: z.number().int().nonnegative(), foodDrinkLodgingCount: z.number().int().nonnegative(), hirelingsCount: z.number().int().nonnegative(), spellcastingServicesCount: z.number().int().nonnegative(),
});
const inputSchema = z.object({
  contentSource: z.object({ type: z.literal("SRD"), name: z.string().min(1), version: z.string().min(1), license: z.string().min(1), attribution: z.string().min(1) }),
  stats: statsSchema,
  monsters: z.array(monsterEntry), spells: z.array(entry.extend({ level: z.number().int().min(0).max(9), school: z.string().optional(), typeLine: z.string().optional() })),
  feats: z.array(entry.extend({ category: z.string().optional() })), magicItems: z.array(entry.extend({ rarity: z.string().optional(), typeLine: z.string().optional() })), rulesGlossary: z.array(glossaryEntry),
  equipment: z.object({
    weapons: z.array(equipmentEntry), armor: z.array(equipmentEntry), tools: z.array(equipmentEntry), adventuringGearTable: z.array(equipmentEntry), ammunition: z.array(equipmentEntry), adventuringGearDescriptions: z.array(equipmentEntry), mounts: z.array(equipmentEntry), tackAndDrawnVehicles: z.array(equipmentEntry), airbornWaterbornVehicles: z.array(equipmentEntry), lifestyleExpenses: z.array(equipmentEntry), foodDrinkLodging: z.array(equipmentEntry), hirelings: z.array(equipmentEntry), spellcastingServices: z.array(spellService),
  }),
});

const equipmentGroups = [
  ["weapons", "Weapon", "weaponsCount"], ["armor", "Armor", "armorCount"], ["tools", "Tool", "toolsCount"], ["adventuringGearTable", "Adventuring Gear", "gearTableCount"], ["ammunition", "Ammunition", "ammoCount"], ["adventuringGearDescriptions", "Equipment Description", "gearDescriptionsCount"], ["mounts", "Mount", "mountsCount"], ["tackAndDrawnVehicles", "Tack & Drawn Vehicle", "tackCount"], ["airbornWaterbornVehicles", "Vehicle", "vehiclesCount"], ["lifestyleExpenses", "Lifestyle Expense", "lifestylesCount"], ["foodDrinkLodging", "Food, Drink & Lodging", "foodDrinkLodgingCount"], ["hirelings", "Hireling", "hirelingsCount"], ["spellcastingServices", "Spellcasting Service", "spellcastingServicesCount"],
] as const;

function assertUnique(label: string, keys: string[]) {
  if (keys.length !== new Set(keys).size) throw new Error(`${label} contains duplicate externalKey values.`);
}

async function runInBatches<T>(values: T[], work: (value: T) => Promise<unknown>) {
  for (let index = 0; index < values.length; index += 32) await Promise.all(values.slice(index, index + 32).map(work));
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function numeric(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
async function main() {
  const input = inputSchema.parse(JSON.parse(await readFile("data/srd/5.2.1/normalized/srd.json", "utf8")));
  const spellDataset: SpellDataset = spellDatasetSchema.parse(JSON.parse(await readFile("data/srd/5.2.1/normalized/spell/srd_spells_normalized.json", "utf8")));
  if (spellDataset.schemaVersion !== "1.0.0" || spellDataset.dataset !== "dnd-srd-spells" || spellDataset.edition !== "2024" || spellDataset.count !== spellDataset.spells.length || spellDataset.spells.length !== input.stats.spellsCount) throw new Error("Normalized spell dataset metadata/count does not match SRD stats.");
  const normalizedMonsters = z.array(normalizedMonsterEntry).parse(JSON.parse(await readFile("data/srd/5.2.1/normalized/Monster_normalisasi.json", "utf8")));
  const counts = { monsters: input.monsters.length, spells: spellDataset.spells.length, feats: input.feats.length, magicItems: input.magicItems.length, rulesGlossary: input.rulesGlossary.length };
  for (const [key, count] of Object.entries(counts)) if (count !== input.stats[`${key}Count` as keyof typeof input.stats]) throw new Error(`${key} count disagrees with SRD stats.`);
  for (const [key, , statsKey] of equipmentGroups) if (input.equipment[key].length !== input.stats[statsKey]) throw new Error(`${key} count disagrees with SRD stats.`);

  const monsters = input.monsters.map(parseMonster);
  const monsterKeys = monsters.map(monster => monster.id);
  assertUnique("Individual monsters", monsterKeys);
  assertUnique("Normalized monsters", normalizedMonsters.map(monster => monster.externalKey));
  if (normalizedMonsters.some(monster => !monsterKeys.includes(monster.externalKey))) throw new Error("A normalized monster does not match the current SRD monster catalog; refusing to seed.");
  const normalizedMonsterFields = normalizedMonsters.map(monster => {
    const classification = monster.classification;
    const combat = monster.combat;
    const hitPoints = record(combat.hitPoints);
    const armorClass = record(combat.armorClass);
    const challenge = monster.challenge;
    return {
      monster,
      edition: monster.edition ?? null,
      sourceLabel: typeof monster.source === "string" ? monster.source : null,
      creatureType: typeof classification.creatureType === "string" ? classification.creatureType : null,
      size: (Array.isArray(classification.size) ? classification.size : []) as Prisma.InputJsonArray,
      alignment: typeof classification.alignment === "string" ? classification.alignment : null,
      armorClass: numeric(armorClass.value),
      hitPoints: numeric(hitPoints.average),
      hitPointFormula: typeof hitPoints.formula === "string" ? hitPoints.formula : null,
      challengeRating: numeric(challenge.rating),
      experiencePoints: numeric(challenge.xp),
      classification: classification as Prisma.InputJsonObject,
      combatStats: combat as Prisma.InputJsonObject,
      abilities: monster.abilities as Prisma.InputJsonObject,
      proficiencyBonus: monster.proficiencyBonus ?? null,
      skills: monster.skills as Prisma.InputJsonObject,
      senses: monster.senses as Prisma.InputJsonObject,
      languages: monster.languages as Prisma.InputJsonArray,
      telepathy: numeric(typeof monster.telepathy === "number" ? monster.telepathy : record(monster.telepathy).range),
      telepathyData: monster.telepathy === undefined ? Prisma.DbNull : monster.telepathy as Prisma.InputJsonValue,
      defenses: monster.defenses as Prisma.InputJsonObject,
      gear: monster.gear as Prisma.InputJsonArray,
      challenge: challenge as Prisma.InputJsonObject,
      traits: (monster.traits ?? []) as Prisma.InputJsonArray,
      actions: monster.actions as Prisma.InputJsonArray,
      bonusActions: monster.bonusActions as Prisma.InputJsonArray,
      reactions: monster.reactions as Prisma.InputJsonArray,
      legendaryActions: (monster.legendaryActions ?? []) as Prisma.InputJsonArray,
      legendaryActionsPerTurn: monster.legendaryActionsPerTurn ?? null,
      legendaryActionsPerTurnInLair: monster.legendaryActionsPerTurnInLair ?? null,
      spellcasting: monster.spellcasting as Prisma.InputJsonValue ?? Prisma.JsonNull,
    };
  });
  const sections = ["traits", "actions", "bonusActions", "reactions", "legendaryActions", "lairActions"] as const;
  for (const monster of monsters) {
    if (Object.keys(monster.data.abilities).length !== 6) throw new Error(`${monster.name}: missing ability score/save.`);
    const rawRolls = (monster.data.body.match(/Attack Roll:/gi) ?? []).length;
    const parsedRolls = sections.reduce((sum, section) => sum + monster.data.sections[section].reduce((total, action) => total + (action.attackBonuses?.length ?? 0), 0), 0);
    if (rawRolls !== parsedRolls) throw new Error(`${monster.name}: parsed ${parsedRolls}/${rawRolls} attack rolls; refusing to import incomplete stat blocks.`);
  }

  const spells = spellDataset.spells.map(value => ({ ...value, externalKey: value.externalKey ?? `spell-${value.id}` }));
  const items: Array<{ externalKey: string; name: string; slug: string; category: string; data: Prisma.InputJsonObject }> = [];
  for (const [key, category] of equipmentGroups.slice(0, 12)) {
    if (key === "spellcastingServices") continue;
    for (const value of input.equipment[key]) items.push({ externalKey: value.externalKey, name: value.name, slug: value.slug, category, data: { ...value, compendiumCategory: category } as unknown as Prisma.InputJsonObject });
  }
  for (const value of input.equipment.spellcastingServices) {
    const name = `${value.spellLevel} Spellcasting Service`;
    items.push({ externalKey: value.externalKey, name, slug: `spellcasting-service-${value.spellLevel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, category: "Spellcasting Service", data: { ...value, name, compendiumCategory: "Spellcasting Service" } as unknown as Prisma.InputJsonObject });
  }

  const rules = [
    ...input.feats.map(value => ({ externalKey: value.externalKey, title: value.name, slug: value.slug, category: `Feat${value.category ? ` · ${value.category}` : ""}`, body: value.body })),
    ...input.rulesGlossary.map(value => ({ externalKey: value.externalKey, title: value.title, slug: value.slug, category: value.category ?? "Rules Glossary", body: value.body })),
  ];
  assertUnique("Spells", spells.map(value => value.externalKey));
  assertUnique("Equipment and magic items", [...input.magicItems.map(value => value.externalKey), ...items.map(value => value.externalKey)]);
  assertUnique("Feat and glossary entries", rules.map(value => value.externalKey));
  const keys = { monsters: monsterKeys, spells: spells.map(value => value.externalKey), items: [...input.magicItems.map(value => value.externalKey), ...items.map(value => value.externalKey)], rules: rules.map(value => value.externalKey) };

  const source = await prisma.contentSource.upsert({
    where: { type_name_version: { type: ContentSourceType.SRD, name: input.contentSource.name, version: input.contentSource.version } },
    create: input.contentSource,
    update: { license: input.contentSource.license, attribution: input.contentSource.attribution },
  });
  await prisma.$transaction(async tx => {
    const staleCombatantLinks = await tx.combatant.count({ where: { monster: { sourceId: source.id, externalKey: { notIn: keys.monsters } } } });
    if (staleCombatantLinks) throw new Error("Stale SRD monsters are referenced by combats; refusing to remove them.");
    await Promise.all([
      tx.monster.deleteMany({ where: { sourceId: source.id, externalKey: { notIn: keys.monsters } } }), tx.spell.deleteMany({ where: { sourceId: source.id, externalKey: { notIn: keys.spells } } }),
      tx.item.deleteMany({ where: { sourceId: source.id, externalKey: { notIn: keys.items } } }), tx.rule.deleteMany({ where: { sourceId: source.id, externalKey: { notIn: keys.rules } } }),
    ]);
    await runInBatches(monsters, monster => tx.monster.upsert({ where: { sourceId_externalKey: { sourceId: source.id, externalKey: monster.id } }, create: { sourceId: source.id, externalKey: monster.id, name: monster.name, slug: monster.slug, data: monster.data }, update: { name: monster.name, slug: monster.slug, data: monster.data } }));
    await runInBatches(normalizedMonsterFields, row => tx.monster.update({ where: { sourceId_externalKey: { sourceId: source.id, externalKey: row.monster.externalKey } }, data: { edition: row.edition, sourceLabel: row.sourceLabel, creatureType: row.creatureType, size: row.size, alignment: row.alignment, armorClass: row.armorClass, hitPoints: row.hitPoints, hitPointFormula: row.hitPointFormula, challengeRating: row.challengeRating, experiencePoints: row.experiencePoints, classification: row.classification, combatStats: row.combatStats, abilities: row.abilities, proficiencyBonus: row.proficiencyBonus, skills: row.skills, senses: row.senses, languages: row.languages, telepathy: row.telepathy, telepathyData: row.telepathyData, defenses: row.defenses, gear: row.gear, challenge: row.challenge, traits: row.traits, actions: row.actions, bonusActions: row.bonusActions, reactions: row.reactions, legendaryActions: row.legendaryActions, legendaryActionsPerTurn: row.legendaryActionsPerTurn, legendaryActionsPerTurnInLair: row.legendaryActionsPerTurnInLair, spellcasting: row.spellcasting } }));
    await runInBatches(spells, spell => tx.spell.upsert({ where: { sourceId_externalKey: { sourceId: source.id, externalKey: spell.externalKey } }, create: { sourceId: source.id, externalKey: spell.externalKey, name: spell.name, slug: spell.slug ?? spell.id, level: spell.level, kind: spell.kind, school: spell.school, classes: spell.classes as unknown as Prisma.InputJsonValue, castingTime: spell.castingTime as unknown as Prisma.InputJsonValue, range: spell.range as unknown as Prisma.InputJsonValue, components: spell.components as unknown as Prisma.InputJsonValue, duration: spell.duration as unknown as Prisma.InputJsonValue, description: spell.description, higherLevel: spell.higherLevel, cantripUpgrade: spell.cantripUpgrade, damage: spell.damage as unknown as Prisma.InputJsonValue, sourceData: spell.source as unknown as Prisma.InputJsonValue }, update: { name: spell.name, slug: spell.slug ?? spell.id, level: spell.level, kind: spell.kind, school: spell.school, classes: spell.classes as unknown as Prisma.InputJsonValue, castingTime: spell.castingTime as unknown as Prisma.InputJsonValue, range: spell.range as unknown as Prisma.InputJsonValue, components: spell.components as unknown as Prisma.InputJsonValue, duration: spell.duration as unknown as Prisma.InputJsonValue, description: spell.description, higherLevel: spell.higherLevel, cantripUpgrade: spell.cantripUpgrade, damage: spell.damage as unknown as Prisma.InputJsonValue, sourceData: spell.source as unknown as Prisma.InputJsonValue } }));
    await runInBatches([...input.magicItems.map(value => ({ externalKey: value.externalKey, name: value.name, slug: value.slug, category: "Magic Item", data: value as unknown as Prisma.InputJsonObject })), ...items], item => tx.item.upsert({ where: { sourceId_externalKey: { sourceId: source.id, externalKey: item.externalKey } }, create: { ...item, sourceId: source.id }, update: { name: item.name, slug: item.slug, category: item.category, data: item.data } }));
    await runInBatches(rules, rule => {
      const searchText = `${rule.title} ${rule.category ?? ""} ${rule.body}`;
      return tx.rule.upsert({ where: { sourceId_externalKey: { sourceId: source.id, externalKey: rule.externalKey } }, create: { ...rule, sourceId: source.id, searchText }, update: { title: rule.title, slug: rule.slug, category: rule.category, body: rule.body, searchText } });
    });
  }, { maxWait: 15000, timeout: 120000 });

  const attackRolls = monsters.reduce((sum, monster) => sum + sections.reduce((total, section) => total + monster.data.sections[section].reduce((count, action) => count + (action.attackBonuses?.length ?? 0), 0), 0), 0);
  console.log(JSON.stringify({ imported: { monsters: monsters.length, spells: spells.length, magicItems: input.magicItems.length, equipment: items.length, feats: input.feats.length, rulesGlossary: input.rulesGlossary.length }, parsed: { attackRolls, monstersWithSkills: monsters.filter(monster => monster.data.skills.length).length }, notes: { magicItemsWithoutParsedRarity: input.magicItems.filter(item => !item.rarity || item.rarity === "Unknown").length } }, null, 2));
}

if (process.argv[1]?.endsWith("seed-all.ts")) main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
