import { randomInt } from "node:crypto";

const ALLOWED_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);
const MAX_DICE = 100;

export type DiceTerm = {
  kind: "dice" | "modifier";
  sign: 1 | -1;
  count?: number;
  sides?: number;
  keep?: "high" | "low";
  keepCount?: number;
  value?: number;
};

export type ParsedDice = {
  notation: string;
  terms: DiceTerm[];
  mode?: "advantage" | "disadvantage";
};

export type DiceRollResult = {
  notation: string;
  total: number;
  groups: Array<{ sides: number; rolls: number[]; kept: number[]; sign: 1 | -1 }>;
  modifiers: number[];
  mode?: "advantage" | "disadvantage";
  critical: boolean;
  fumble: boolean;
};

export function parseDiceNotation(input: string): ParsedDice {
  const notation = input.trim().toLowerCase();
  if (!notation || notation.length > 80) throw new Error("Notation is empty or too long.");

  const modeMatch = notation.match(/\s+(adv|dis)$/);
  const mode = modeMatch?.[1] === "adv" ? "advantage" : modeMatch ? "disadvantage" : undefined;
  const expression = (modeMatch ? notation.slice(0, modeMatch.index) : notation).replace(/\s+/g, "");
  const terms: DiceTerm[] = [];
  let offset = 0;
  let diceCount = 0;

  while (offset < expression.length) {
    let sign: 1 | -1 = 1;
    if (expression[offset] === "+" || expression[offset] === "-") {
      sign = expression[offset] === "-" ? -1 : 1;
      offset++;
    } else if (offset > 0) {
      throw new Error("Terms must be separated by + or -.");
    }

    const remaining = expression.slice(offset);
    const die = remaining.match(/^(\d*)d(4|6|8|10|12|20|100)(?:k([hl])(\d+))?/);
    if (die) {
      const count = die[1] ? Number(die[1]) : 1;
      const sides = Number(die[2]);
      const keepCount = die[4] ? Number(die[4]) : undefined;
      if (count < 1 || count > MAX_DICE || !ALLOWED_SIDES.has(sides)) throw new Error("Dice count or type is outside the allowed range.");
      if (keepCount !== undefined && (keepCount < 1 || keepCount > count)) throw new Error("Keep count must be between 1 and the dice count.");
      diceCount += count;
      if (diceCount > MAX_DICE) throw new Error(`A roll can contain at most ${MAX_DICE} dice.`);
      terms.push({ kind: "dice", sign, count, sides, keep: die[3] === "h" ? "high" : die[3] ? "low" : undefined, keepCount });
      offset += die[0].length;
      continue;
    }

    const modifier = remaining.match(/^(\d+)/);
    if (!modifier || offset === 0) throw new Error("Use dice such as d20, 2d6+3, or 4d6kh3.");
    const value = Number(modifier[1]);
    if (value > 10000) throw new Error("Modifier must be 10,000 or less.");
    terms.push({ kind: "modifier", sign, value });
    offset += modifier[1].length;
  }

  const diceTerms = terms.filter((term): term is DiceTerm & { count: number; sides: number } => term.kind === "dice");
  if (diceTerms.length === 0) throw new Error("At least one die is required.");
  if (mode && (diceTerms.length !== 1 || diceTerms[0].count !== 1 || diceTerms[0].sides !== 20 || diceTerms[0].keep)) {
    throw new Error("Advantage or disadvantage applies to one d20 roll.");
  }
  return { notation, terms, mode };
}

export function rollDice(input: string, rng: (min: number, max: number) => number = randomInt): DiceRollResult {
  const parsed = parseDiceNotation(input);
  const groups: DiceRollResult["groups"] = [];
  const modifiers: number[] = [];
  let total = 0;

  for (const term of parsed.terms) {
    if (term.kind === "modifier") {
      const value = term.value! * term.sign;
      modifiers.push(value);
      total += value;
      continue;
    }
    const count = parsed.mode ? 2 : term.count!;
    const rolls = Array.from({ length: count }, () => rng(1, term.sides! + 1));
    const keepCount = parsed.mode ? 1 : term.keepCount ?? count;
    const kept = [...rolls].sort((a, b) => term.keep === "low" || parsed.mode === "disadvantage" ? a - b : b - a).slice(0, keepCount);
    const signedTotal = kept.reduce((sum, value) => sum + value, 0) * term.sign;
    total += signedTotal;
    groups.push({ sides: term.sides!, rolls, kept, sign: term.sign });
  }

  const d20 = groups.length === 1 && groups[0].sides === 20 && groups[0].kept.length === 1 ? groups[0].kept[0] : undefined;
  return { notation: parsed.notation, total, groups, modifiers, mode: parsed.mode, critical: d20 === 20, fumble: d20 === 1 };
}
