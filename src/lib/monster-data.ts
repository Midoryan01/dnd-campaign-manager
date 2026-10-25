import { Prisma } from "@prisma/client";

type MonsterRecord = {
  externalKey: string;
  data: Prisma.JsonValue;
  edition: string | null;
  sourceLabel: string | null;
  classification: Prisma.JsonValue | null;
  combatStats: Prisma.JsonValue | null;
  abilities: Prisma.JsonValue | null;
  proficiencyBonus: number | null;
  skills: Prisma.JsonValue | null;
  senses: Prisma.JsonValue | null;
  languages: Prisma.JsonValue | null;
  telepathy: number | null;
  telepathyData: Prisma.JsonValue | null;
  defenses: Prisma.JsonValue | null;
  gear: Prisma.JsonValue | null;
  challenge: Prisma.JsonValue | null;
  traits: Prisma.JsonValue | null;
  actions: Prisma.JsonValue | null;
  bonusActions: Prisma.JsonValue | null;
  reactions: Prisma.JsonValue | null;
  legendaryActions: Prisma.JsonValue | null;
  legendaryActionsPerTurn: number | null;
  legendaryActionsPerTurnInLair: number | null;
  spellcasting: Prisma.JsonValue | null;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function textList(value: unknown): string { return list(value).map(String).join(", "); }
function speedText(value: unknown): string {
  return Object.entries(object(value)).filter(([key]) => key !== "hover").map(([key, amount]) => `${key} ${String(amount)} ft.${key === "fly" && object(value).hover ? " (hover)" : ""}`).join(", ");
}

function actionsForUi(value: unknown): Record<string, unknown>[] {
  return list(value).map(item => {
    const action = object(item);
    const damageFormulas = list(action.damage).map(damage => object(damage).dice).filter((dice): dice is string => typeof dice === "string");
    return { ...action, text: action.description ?? action.text, ...(damageFormulas.length ? { damageFormulas } : {}) };
  });
}

function spellcastingForUi(value: unknown): Record<string, unknown>[] {
  const spellcasting = object(value);
  if (!Object.keys(spellcasting).length) return [];
  const details = [
    typeof spellcasting.ability === "string" ? `Ability ${spellcasting.ability.toUpperCase()}` : "",
    typeof spellcasting.saveDC === "number" ? `Save DC ${spellcasting.saveDC}` : "",
    list(spellcasting.atWill).length ? `At will: ${textList(spellcasting.atWill)}` : "",
    ...Object.entries(object(spellcasting.perDay)).map(([uses, spells]) => `${uses}: ${textList(spells)}`),
  ].filter(Boolean);
  return [{ name: "Spellcasting", text: details.join(" · "), ...spellcasting, attackBonus: undefined }];
}

function attachSpellAttack(value: unknown, spellcastingValue: unknown): Record<string, unknown>[] {
  const attackBonus = object(spellcastingValue).attackBonus;
  return actionsForUi(value).map(action => /spiritual weapon/i.test(String(action.name)) && typeof attackBonus === "number" ? { ...action, attackBonus } : action);
}

export function monsterDataForUi(monster: MonsterRecord): Prisma.JsonObject {
  const previous = object(monster.data);
  if (!monster.classification) return previous as Prisma.JsonObject;
  const classification = object(monster.classification);
  const combat = object(monster.combatStats);
  const hp = object(combat.hitPoints);
  const ac = object(combat.armorClass);
  const initiative = object(combat.initiative);
  const challenge = object(monster.challenge);
  const defenses = object(monster.defenses);
  const telepathyData = object(monster.telepathyData);
  const normalizedActions = actionsForUi(monster.actions);
  const spellcasting = spellcastingForUi(monster.spellcasting);
  const normalizedBonusActions = attachSpellAttack(monster.bonusActions, monster.spellcasting);
  const normalizedSections = {
    traits: actionsForUi(monster.traits),
    actions: normalizedActions,
    bonusActions: normalizedBonusActions,
    reactions: actionsForUi(monster.reactions),
    legendaryActions: actionsForUi(monster.legendaryActions),
  };
  return {
    externalKey: monster.externalKey,
    body: previous.body,
    size: textList(classification.size),
    type: classification.creatureType ?? "",
    alignment: classification.alignment ?? "",
    tags: classification.tags ?? [],
    sourceLabel: monster.sourceLabel,
    armor_class: ac.value,
    armor_class_source: ac.source,
    hit_points: hp.average,
    hit_dice: hp.formula,
    speed: speedText(combat.speed),
    initiative_bonus: initiative.bonus,
    initiative_average: initiative.average,
    challenge_rating: challenge.rating,
    xp: challenge.xp,
    xp_in_lair: challenge.xpInLair,
    abilities: monster.abilities,
    proficiency_bonus: monster.proficiencyBonus,
    skills: Object.entries(object(monster.skills)).map(([name, bonus]) => ({ name, bonus })),
    senses: Object.entries(object(monster.senses)).map(([name, range]) => `${name} ${String(range)}${name === "passivePerception" ? "" : typeof range === "number" ? " ft." : ""}`).join(", "),
    languages: textList(monster.languages),
    gear: monster.gear,
    telepathy: telepathyData.range ?? monster.telepathy,
    telepathy_note: telepathyData.note,
    resistances: textList(defenses.damageResistances),
    vulnerabilities: textList(defenses.damageVulnerabilities),
    immunities: { damage: textList(defenses.damageImmunities), conditions: textList(defenses.conditionImmunities) },
    sections: { ...normalizedSections, spellcasting },
    actions: normalizedSections.actions,
    bonusActions: normalizedSections.bonusActions,
    legendaryActions: normalizedSections.legendaryActions,
    spellcasting: monster.spellcasting,
    legendary_actions_per_turn: monster.legendaryActionsPerTurn,
    legendary_actions_per_turn_in_lair: monster.legendaryActionsPerTurnInLair,
    reactions: normalizedSections.reactions,
    lairActions: actionsForUi(object(monster.data).lairActions),
  } as unknown as Prisma.JsonObject;
}
