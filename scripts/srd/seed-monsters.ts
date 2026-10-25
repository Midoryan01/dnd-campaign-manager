import "dotenv/config";
import { readFile } from "node:fs/promises";
import { ContentSourceType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../src/lib/db/prisma";

export const monsterInputSchema = z.object({
  externalKey: z.string().min(1), name: z.string().min(1), slug: z.string().min(1),
  size: z.string().optional(), type: z.string().optional(), body: z.string().min(1),
});
export type MonsterInput = z.infer<typeof monsterInputSchema>;

const sectionNames = ["Traits", "Actions", "Bonus Actions", "Reactions", "Legendary Actions", "Lair Actions"] as const;
const fieldNames = ["Speed", "Skills", "Resistances", "Immunities", "Vulnerabilities", "Gear", "Senses", "Languages", "CR", "MOD SAVE"];
function signedNumber(value: string) { return Number(value.replaceAll("−", "-")); }

function readSection(body: string, heading: typeof sectionNames[number]) {
  const start = new RegExp(`(?:^|\\n)${heading}\\s*\\n`, "i").exec(body);
  if (!start || start.index === undefined) return "";
  const contentStart = start.index + start[0].length;
  const remainder = body.slice(contentStart);
  const next = new RegExp(`\\n(?:${sectionNames.filter(name => name !== heading).join("|")})\\s*\\n`, "i").exec(remainder);
  return next?.index === undefined ? remainder : remainder.slice(0, next.index);
}

function parseEntries(section: string) {
  const headingPattern = /(?:^|\n)([A-Z][A-Za-z0-9’'(), /\-]{1,80})\.\s+/g;
  const headings = [...section.matchAll(headingPattern)];
  return headings.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? section.length;
    const text = section.slice(start, end).trim();
    const attackBonuses = [...text.matchAll(/Attack Roll:\s*([+−-]\s*\d+)/gi)].map(item => signedNumber(item[1].replaceAll(" ", "")));
    const damageFormulas = [...text.matchAll(/\((\d+d\d+(?:\s*[+−-]\s*\d+)?)\)\s*(?:[A-Za-z][A-Za-z -]*\s+)?damage/gi)].map(item => item[1].replaceAll(" ", "").replaceAll("−", "-"));
    const recharge = text.match(/Recharge\s+([\d–-]+)(?:\s*[-–]\s*\d+)?/i)?.[1];
    return {
      name: match[1].trim(), text,
      ...(attackBonuses.length ? { attackBonus: attackBonuses[0], attackBonuses } : {}),
      ...(damageFormulas.length ? { damageFormula: damageFormulas[0], damageFormulas } : {}),
      ...(recharge ? { recharge } : {}),
    };
  });
}

function readField(body: string, label: string) {
  const match = new RegExp(`\\b${label}\\s+`, "i").exec(body);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const remainder = body.slice(start);
  const next = new RegExp(`\\n(?:${fieldNames.filter(name => name.toLowerCase() !== label.toLowerCase()).join("|")}|${sectionNames.join("|")})\\s*\\n`, "i").exec(remainder);
  return (next?.index === undefined ? remainder : remainder.slice(0, next.index)).replace(/\s+/g, " ").trim();
}

function parseSkills(body: string) {
  const text = readField(body, "Skills");
  return text.split(",").flatMap(value => {
    const match = value.trim().match(/^([\s\S]+?)\s+([+−-]?\s*\d+)$/);
    return match ? [{ name: match[1].replace(/\s+/g, " ").trim(), bonus: signedNumber(match[2].replaceAll(" ", "")) }] : [];
  });
}

export function extractMonsterBlocks(groups: Array<{ name: string; body: string }>) {
  const blockPattern = /(?:^|\n)([^\n]+)\n([^\n]+)\n((?:Tiny|Small|Medium|Large|Huge|Gargantuan)\b[^\n]*)\nAC\s+\d+/gi;
  const monsters: MonsterInput[] = [];
  for (const group of groups) {
    const matches = [...group.body.matchAll(blockPattern)];
    for (const [index, match] of matches.entries()) {
      const blockStart = (match.index ?? 0) + match[0].lastIndexOf(match[2]);
      const end = matches[index + 1]
        ? (matches[index + 1].index ?? 0) + matches[index + 1][0].lastIndexOf(matches[index + 1][2])
        : group.body.length;
      const name = match[2].trim();
      const sizeLine = match[3].trim();
      const size = sizeLine.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)(?:\s+or\s+(Tiny|Small|Medium|Large|Huge|Gargantuan))?/i);
      if (!size) throw new Error(`${name}: creature size missing from stat block.`);
      const sizeText = size[2] ? `${size[1]} or ${size[2]}` : size[1];
      const type = sizeLine.slice(size[0].length).trim();
      const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      monsters.push({ externalKey: `monster-${slug}`, name, slug, size: sizeText, type, body: group.body.slice(blockStart, end).trim() });
    }
  }
  if (!monsters.length || new Set(monsters.map(monster => monster.externalKey)).size !== monsters.length) throw new Error("Monster stat blocks are missing or duplicate names were found.");
  return monsters;
}

export function parseMonster(monster: MonsterInput) {
  const body = monster.body.replaceAll("\u0000", "").trim();
  const ac = body.match(/\bAC\s+(\d+)/i)?.[1];
  const hp = body.match(/\bHP\s+(\d+)\s*\(([^)]+)\)/i);
  const initiative = body.match(/\bInitiative\s+([+−-]?\d+)\s*\((\d+)\)/i);
  const cr = body.match(/\bCR\s+([\d/]+)\s*\((?:XP\s+)?([\d,]+)(?:\s+XP)?/i);
  const abilityNames = { Str: "str", Dex: "dex", Con: "con", Int: "int", Wis: "wis", Cha: "cha" } as const;
  const abilities: Record<string, { score: number; modifier: number; save: number }> = {};
  for (const match of body.matchAll(/\b(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)\s+([+−-]?\d+)\s+([+−-]?\d+)/gi)) {
    const key = abilityNames[match[1] as keyof typeof abilityNames];
    abilities[key] = { score: Number(match[2]), modifier: signedNumber(match[3]), save: signedNumber(match[4]) };
  }
  const rawImmunities = readField(body, "Immunities");
  const [damageImmunities = "", conditionImmunities = ""] = rawImmunities.split(";");
  const sections = Object.fromEntries(sectionNames.map(name => [name.replaceAll(" ", "").replace(/^./, value => value.toLowerCase()), parseEntries(readSection(body, name))]));
  const skills = parseSkills(body);
  const actions = sections.actions ?? [];
  const xp = cr ? Number(cr[2].replaceAll(",", "")) : undefined;
  const lairXp = body.match(/\bor\s+([\d, ]+)\s+in lair/i)?.[1]?.replace(/[\s,]/g, "");
  const proficiencyBonus = body.match(/\bPB\s+([+−-]?\d+)/i)?.[1];
  if (!ac || !hp || !initiative || !cr || Object.keys(abilities).length !== 6) throw new Error(`${monster.name}: required stat parsing incomplete; refusing to seed.`);

  const data = {
    ...monster, body,
    armor_class: Number(ac), hit_points: Number(hp[1]), hit_dice: hp[2].replace(/\s+/g, " ").trim(),
    initiative_bonus: signedNumber(initiative[1]), initiative_score: Number(initiative[2]),
    speed: readField(body, "Speed"), abilities,
    skills,
    resistances: readField(body, "Resistances"), vulnerabilities: readField(body, "Vulnerabilities"),
    immunities: { damage: damageImmunities.trim(), conditions: conditionImmunities.trim() },
    gear: readField(body, "Gear"), senses: readField(body, "Senses"), languages: readField(body, "Languages"),
    challenge_rating: cr[1], xp, ...(lairXp ? { lair_xp: Number(lairXp) } : {}),
    ...(proficiencyBonus ? { proficiency_bonus: signedNumber(proficiencyBonus) } : {}),
    sections, actions,
  } satisfies Prisma.InputJsonObject;

  return { id: monster.externalKey, name: monster.name, slug: monster.slug, data };
}

async function main() {
  const input = JSON.parse(await readFile("data/srd/5.2.1/normalized/srd.json", "utf8")) as { contentSource: { name: string; version: string; license?: string; attribution?: string }; stats: { monstersCount: number }; monsters: Array<{ name: string; body: string }> };
  if (input.monsters.length !== input.stats.monstersCount) throw new Error("SRD monster group count mismatch; refusing to seed.");
  const monsters = z.array(monsterInputSchema).parse(extractMonsterBlocks(input.monsters)).map(parseMonster);
  const source = await prisma.contentSource.upsert({
    where: { type_name_version: { type: ContentSourceType.SRD, name: input.contentSource.name, version: input.contentSource.version } },
    create: { ...input.contentSource, type: ContentSourceType.SRD },
    update: { license: input.contentSource.license, attribution: input.contentSource.attribution },
  });
  await prisma.$transaction(async tx => {
    for (const monster of monsters) await tx.monster.upsert({
      where: { sourceId_externalKey: { sourceId: source.id, externalKey: monster.id } },
      create: { sourceId: source.id, externalKey: monster.id, name: monster.name, slug: monster.slug, data: monster.data },
      update: { name: monster.name, slug: monster.slug, data: monster.data },
    });
  }, { timeout: 120000 });
  const parsedSkills = monsters.filter(monster => monster.data.skills.length).length;
  const parsedAttacks = monsters.reduce((sum, monster) => sum + monster.data.actions.filter(action => action.attackBonus !== undefined).length, 0);
  console.log(`Imported ${monsters.length} individual monsters from ${input.monsters.length} normalized groups; ${parsedSkills} with parsed skills; ${parsedAttacks} actions with attack bonus. Full body and all stat sections retained.`);
}

const aboleth = parseMonster({ externalKey: "monster-aboleth", name: "Aboleth", slug: "aboleth", size: "Large", type: "Aberration", body: "Aboleth\nAC 17 Initiative +7 (17)\nHP 150 (20d10 + 40)\nSpeed 10 ft., Swim 40 ft.\nStr 21 +5 +5 Dex 9 −1 +3 Con 15 +2 +6\nInt 18 +4 +8 Wis 15 +2 +6 Cha 18 +4 +4\nSkills History +12, Perception +10\nSenses Darkvision\nLanguages Deep Speech\nCR 10 (XP 5,900; PB +4)\nTraits\nAmphibious. Can breathe air and water.\nActions\nTentacle. Melee Attack Roll: +9. Hit: 12 (2d6 + 5) Bludgeoning damage.\nBonus Actions\nExample. Recharge 5–6." });
if (aboleth.data.armor_class !== 17 || aboleth.data.hit_points !== 150 || aboleth.data.xp !== 5900 || aboleth.data.skills.length !== 2 || aboleth.data.abilities.str.save !== 5 || aboleth.data.actions[0]?.attackBonus !== 9 || aboleth.data.actions[0]?.damageFormula !== "2d6+5" || aboleth.data.sections.bonusActions.length !== 1) throw new Error("Monster stats/sections/actions parser self-check failed.");

if (process.argv[1]?.endsWith("seed-monsters.ts")) main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
