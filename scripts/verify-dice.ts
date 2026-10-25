import assert from "node:assert/strict";
import { parseDiceNotation, rollDice } from "../src/lib/dice/notation";

assert.equal(parseDiceNotation("2d6 + 3").terms.length, 2);
assert.deepEqual(rollDice("4d6kh3", (() => {
  const values = [1, 6, 4, 2];
  return () => values.shift()!;
})()).groups[0].kept, [6, 4, 2]);
assert.equal(rollDice("d20+5 adv", (() => {
  const values = [1, 20];
  return () => values.shift()!;
})()).total, 25);
assert.equal(rollDice("d20 dis", (() => {
  const values = [18, 4];
  return () => values.shift()!;
})()).total, 4);
assert.throws(() => parseDiceNotation("1000d1000"));
assert.throws(() => parseDiceNotation("4d6kh5"));
assert.throws(() => parseDiceNotation("d20 adv dis"));
console.log("Dice notation self-check passed.");
