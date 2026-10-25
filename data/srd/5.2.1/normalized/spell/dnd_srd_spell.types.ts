/**
 * Types for srd_spells_normalized.json
 * Source: D&D System Reference Document 5.2.1 (SRD 2024).
 */
export type SpellSchool =
  | "Abjuration"
  | "Conjuration"
  | "Divination"
  | "Enchantment"
  | "Evocation"
  | "Illusion"
  | "Necromancy"
  | "Transmutation";

export type SpellKind = "cantrip" | "leveled";

export interface SpellCastingTime {
  /** Normalized display value taken from the source. */
  raw: string | null;
  type: "action" | "bonus_action" | "reaction" | "time" | "other";
  value: number | null;
  unit: string | null;
  ritual: boolean;
}

export interface SpellRange {
  raw: string | null;
  type:
    | "self"
    | "touch"
    | "sight"
    | "unlimited"
    | "special"
    | "distance"
    | "self_area";
  value: number | null;
  unit: string | null;
  /** Present only when the source expresses a Self area, if parsed. */
  shape?: string;
}

export interface SpellComponents {
  raw: string | null;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materialDescription: string | null;
}

export interface SpellDuration {
  raw: string | null;
  type: "instantaneous" | "timed" | "concentration" | "special";
  value: number | null;
  unit: string | null;
  concentration: boolean;
}

export interface SpellDamage {
  /** Dice formula or textual formula, e.g. "1d8 + spellcasting ability modifier". */
  amount: string;
  damageType: SpellSchoolDamageType | null;
  /** Trigger such as "On a hit"; null when not confidently extracted. */
  trigger: string | null;
  /** Nearby source text retained for rules context. */
  notes: string | null;
  sourceSection: "description" | "higherLevel" | "cantripUpgrade";
  sourceText: string;
}

export type SpellSchoolDamageType =
  | "Acid"
  | "Bludgeoning"
  | "Cold"
  | "Fire"
  | "Force"
  | "Lightning"
  | "Necrotic"
  | "Piercing"
  | "Poison"
  | "Psychic"
  | "Radiant"
  | "Slashing"
  | "Thunder";

export interface SpellSource {
  document: string | null;
  version: string | null;
  license: string | null;
  attribution: string | null;
}

export interface Spell {
  /** Stable frontend/database key, currently based on the source slug. */
  id: string;
  externalKey: string | null;
  slug: string | null;
  name: string;
  level: number;
  kind: SpellKind;
  school: SpellSchool | null;
  classes: string[];
  castingTime: SpellCastingTime;
  range: SpellRange;
  components: SpellComponents;
  duration: SpellDuration;
  description: string;
  /** Text following "Using a Higher-Level Spell Slot.", when present. */
  higherLevel: string | null;
  /** Text following "Cantrip Upgrade.", when present. */
  cantripUpgrade: string | null;
  damage: SpellDamage[];
  source: SpellSource;
}

export interface SpellDataset {
  schemaVersion: "1.0.0";
  dataset: "dnd-srd-spells";
  edition: "2024";
  source: {
    type: string;
    name: string;
    version: string;
    license: string;
    attribution: string;
  };
  count: number;
  spells: Spell[];
}
