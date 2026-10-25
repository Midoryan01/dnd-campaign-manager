"use client";

import { useState } from "react";

type Skill = { name: string; bonus: number };
type Action = { name: string; attackBonus?: number; damageFormula?: string; damageFormulas?: string[] };
type MonsterRollData = { skills?: Skill[]; actions?: Action[]; bonusActions?: Action[]; reactions?: Action[]; legendaryActions?: Action[]; lairActions?: Action[]; sections?: { bonusActions?: Action[]; reactions?: Action[]; legendaryActions?: Action[]; lairActions?: Action[] } };

export function MonsterRollControls({ campaignId, data }: { campaignId: string; data: unknown }) {
  const [lastRoll, setLastRoll] = useState("");
  const [busy, setBusy] = useState(false);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as MonsterRollData;
  const skills = Array.isArray(record.skills) ? record.skills : [];
  const actions = [
    ...(Array.isArray(record.actions) ? record.actions : []),
    ...(Array.isArray(record.bonusActions) ? record.bonusActions : record.sections?.bonusActions ?? []),
    ...(Array.isArray(record.reactions) ? record.reactions : record.sections?.reactions ?? []),
    ...(Array.isArray(record.legendaryActions) ? record.legendaryActions : record.sections?.legendaryActions ?? []),
    ...(Array.isArray(record.lairActions) ? record.lairActions : record.sections?.lairActions ?? []),
  ];
  const controls = [
    ...skills.filter(skill => skill && typeof skill.name === "string" && Number.isInteger(skill.bonus)).map(skill => ({ label: skill.name, notation: `d20${skill.bonus >= 0 ? "+" : ""}${skill.bonus}`, kind: "Cek" })),
      ...actions.filter(action => action && typeof action.name === "string" && (Number.isInteger(action.attackBonus) || action.damageFormula || action.damageFormulas?.length)).flatMap(action => [
      ...(Number.isInteger(action.attackBonus) ? [{ label: `${action.name} · Serangan`, notation: `d20${(action.attackBonus as number) >= 0 ? "+" : ""}${action.attackBonus}`, kind: "To Hit" }] : []),
      ...((action.damageFormulas?.length ? action.damageFormulas : action.damageFormula ? [action.damageFormula] : []).map((formula, index) => ({ label: `${action.name} · Damage${action.damageFormulas && action.damageFormulas.length > 1 ? ` (formula ${index + 1}: ${formula})` : ` (${formula})`}`, notation: formula, kind: "Damage" }))),
    ]),
  ];
  if (!controls.length) return null;

  async function roll(label: string, notation: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notation, label }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Roll gagal.");
      setLastRoll(`${label}: ${body.result.total}`);
    } catch (error) { setLastRoll(error instanceof Error ? error.message : "Roll gagal."); }
    finally { setBusy(false); }
  }

  return <div className="monster-roll-controls [&_>_small]:[color:#a99570] [&_>_small]:[font-size:8px] [&_>_small]:[letter-spacing:0.1em] [&_button:disabled]:[opacity:0.55] [&_>_strong]:[color:#e8d3ab] [&_>_strong]:[font-size:12px] [&_>_p]:[margin:4px_0_8px] [&_>_p]:[color:#a79d8a] [&_>_p]:[font-size:11px] [&_>_p]:[line-height:1.45]"><strong>Roll skill & aksi</strong><p>Skill: lempar d20 + bonus untuk cek yang sesuai. Serangan: d20 + bonus serang; damage dilempar terpisah.</p><div>{controls.map(control => <button type="button" key={`${control.label}-${control.notation}`} disabled={busy} onClick={() => roll(control.label, control.notation)}>{control.kind} · {control.label}</button>)}</div>{lastRoll && <output aria-live="polite">{lastRoll}</output>}</div>;
}
