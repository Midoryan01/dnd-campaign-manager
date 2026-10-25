"use client";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { Panel } from "../../../components/ui/panel";



type Action = { name?: string; text?: string; description?: string; attackBonus?: number; damageFormula?: string; damageFormulas?: string[]; damage?: unknown; [key: string]: unknown };
type RecordData = Record<string, unknown>;

function asRecord(value: unknown): RecordData | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordData : null;
}

function actionList(value: unknown): Action[] {
  return Array.isArray(value) ? value.filter((item): item is Action => Boolean(asRecord(item)) && typeof (item as Action).name === "string") : [];
}

function signed(value: number) { return `${value >= 0 ? "+" : ""}${value}`; }
function display(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
const featureSections = [["traits", "Traits"], ["actions", "Actions"], ["bonusActions", "Bonus Actions"], ["reactions", "Reactions"], ["legendaryActions", "Legendary Actions"], ["lairActions", "Lair Actions"], ["spellcasting", "Spellcasting"]] as const;
function spellSummary(action: Action) {
  const perDay = asRecord(action.perDay) ?? {};
  return [
    ...Object.entries(perDay).map(([uses, spells]) => `${uses}: ${Array.isArray(spells) ? spells.join(", ") : String(spells)}`),
    Array.isArray(action.atWill) && action.atWill.length ? `At will: ${action.atWill.join(", ")}` : "",
    typeof action.ability === "string" ? `Ability ${action.ability.toUpperCase()}` : "",
    typeof action.saveDC === "number" ? `Save DC ${action.saveDC}` : "",
    typeof action.attackBonus === "number" ? `Spell attack ${signed(action.attackBonus)}` : "",
  ].filter(Boolean).join(" Â· ");
}
function usesSummary(value: unknown) {
  const uses = asRecord(value);
  return uses && typeof uses.max === "number" && typeof uses.per === "string" ? `${uses.max}/${uses.per}` : "";
}

export function MonsterCombatActions({ campaignId, name, data }: { campaignId: string; name: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const root = asRecord(data);
  if (!root) return null;
  const stats = asRecord(root.stats) ?? asRecord(root.statBlock) ?? asRecord(root.stat_block) ?? root;
  const sections = asRecord(stats.sections) ?? {};
  const actions = actionList(stats.actions).length ? actionList(stats.actions) : actionList(sections.actions);
  const bonusActions = actionList(stats.bonusActions ?? stats.bonus_actions).length ? actionList(stats.bonusActions ?? stats.bonus_actions) : actionList(sections.bonusActions ?? sections.bonus_actions);
  const spellcasting = actionList(sections.spellcasting).length ? actionList(sections.spellcasting) : actionList(stats.spellcasting);
  const allSections: Record<string, unknown> = { ...sections, actions, bonusActions, spellcasting, lairActions: stats.lairActions };
  const abilities = asRecord(stats.abilities) ?? {};
  const immunity = asRecord(stats.immunities) ?? {};
  const readBonus = (action: Action) => Number.isInteger(action.attackBonus) ? action.attackBonus : (() => { const match = action.text?.match(/Attack Roll:\s*([+âˆ’-]?\s*\d+)/i); return match ? Number(match[1].replace(/\s/g, "").replace("âˆ’", "-")) : null; })();
  const modifierText = (action: Action) => readBonus(action) === null ? "" : ` Â· To hit ${signed(readBonus(action)!)}`;

  async function roll(label: string, notation: string) {
    setBusy(true); setResult("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notation, label: `${name} Â· ${label}` }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Roll gagal.");
      setResult(`${label}: ${body.result.total}`);
    } catch (error) { setResult(error instanceof Error ? error.message : "Roll gagal."); }
    finally { setBusy(false); }
  }

  const damageRolls = (action: Action) => action.damageFormulas?.length ? action.damageFormulas : action.damageFormula ? [action.damageFormula] : [];
  const renderAction = (action: Action, key: string) => {
    const damage = Array.isArray(action.damage) ? action.damage.map(item => asRecord(item)).filter((item): item is RecordData => Boolean(item)) : [];
    const details = Object.entries(action).filter(([field, value]) => !["name", "text", "description", "damage", "damageFormulas", "damageFormula"].includes(field) && value !== null && value !== undefined).map(([field, value]) => {
      const label = field.replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase());
      if (field === "attackBonus" && typeof value === "number") return `${label}: ${signed(value)}`;
      if (["reach", "range"].includes(field) && typeof value === "number") return `${label}: ${value} ft.`;
      if (field === "uses" && asRecord(value)) { const uses = asRecord(value)!; return `${label}: ${String(uses.max ?? "")} / ${String(uses.per ?? "")}`; }
      if (field === "save" && asRecord(value)) { const save = asRecord(value)!; return `${label}: ${String(save.type ?? "").toUpperCase()} DC ${String(save.dc ?? "")}`; }
      if (Array.isArray(value)) return `${label}: ${value.map(String).join(", ")}`;
      if (typeof value === "object") return `${label}: ${JSON.stringify(value)}`;
      return `${label}: ${String(value)}`;
    });
    return <article className="monster-feature-card [min-width:0] [padding:12px] [border:1px_solid_#383a40] [border-radius:6px] [background:#1b1d22] [&_>_strong]:[margin:0_0_8px] [&_>_p]:[margin-top:10px]" key={key}><strong>{action.name}{modifierText(action)}</strong>{details.length > 0 && <div className="monster-feature-badges [display:flex] [flex-wrap:wrap] [gap:5px] [&_>_span]:[padding:4px_7px] [&_>_span]:[border:1px_solid_#403d37] [&_>_span]:[border-radius:999px] [&_>_span]:[background:#181a1f] [&_>_span]:[color:#d8c39e] [&_>_span]:[font-size:10px]">{details.map((detail, index) => <span key={`${key}-detail-${index}`}>{detail}</span>)}</div>}{damage.length > 0 && <div className="monster-damage-details [margin-top:12px] [padding-top:10px] [border-top:1px_solid_#34353a] [&_h5]:[margin:0_0_8px] [&_h5]:[color:#cfb27c] [&_h5]:[font-size:10px] [&_h5]:[letter-spacing:0.1em] [&_h5]:[text-transform:uppercase] [&_>_div]:[display:grid] [&_>_div]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [&_>_div]:[gap:7px] [&_section]:[display:grid] [&_section]:[gap:4px] [&_section]:[padding:9px] [&_section]:[border:1px_solid_#403d37] [&_section]:[border-radius:5px] [&_section]:[background:#181a1f] [&_small]:[color:#bda77f] [&_small]:[font-size:9px] [&_small]:[text-transform:uppercase] [&_strong]:[color:#eee0c7] [&_strong]:[font-size:12px] [&_span]:[color:#aaa293] [&_span]:[font-size:10px] max-[700px]:[&_>_div]:[grid-template-columns:minmax(0,_1fr)]"><h5>Damage</h5><div>{damage.map((entry, index) => <section key={`${key}-damage-${index}`}><small>{String(entry.type ?? "Damage")}</small><strong>{String(entry.dice ?? entry.formula ?? "")}</strong>{entry.average != null && <span>{String(entry.average)} average</span>}</section>)}</div></div>}{(action.text ?? action.description) && <p>{String(action.text ?? action.description)}</p>}</article>;
  };
  const renderQuickRolls = (action: Action, key: string) => <div className="monster-action-quick-rolls [display:flex] [flex-wrap:wrap] [gap:6px] [&_strong]:[flex:0_0_100%] [&_strong]:[color:#d7bd8e] [&_strong]:[font-size:11px] [&_button]:[min-height:34px] [&_button]:[padding:6px_9px] [&_button]:[font-size:11px]" key={key}><strong>{action.name}</strong>{readBonus(action) !== null && <Button type="button" variant="secondary" disabled={busy} onClick={() => void roll(`${action.name} ${signed(readBonus(action)!)} to hit`, `d20${readBonus(action)! >= 0 ? "+" : ""}${readBonus(action)}`)}>To hit {signed(readBonus(action)!)}</Button>}{damageRolls(action).map((formula, index) => <Button type="button" variant="secondary" key={`${key}-${formula}-${index}`} disabled={busy} onClick={() => void roll(`${action.name} damage`, formula)}>Damage {formula}</Button>)}</div>;

  return <div className="monster-combat-actions [display:grid] [justify-items:start] [gap:6px] [margin-top:8px]">
    {(actions.length > 0 || bonusActions.length > 0 || spellcasting.length > 0) && <div className="monster-action-summary [display:grid] [gap:3px] [color:#c4bba9] [font-size:11px] [line-height:1.45] [&_span]:[overflow-wrap:anywhere] [&_b]:[color:#d7bd8e]">{actions.length > 0 && <span><b>Action:</b> {actions.map(action => `${action.name}${modifierText(action)}`).join(" Â· ")}</span>}{bonusActions.length > 0 && <span><b>Bonus action:</b> {bonusActions.map(action => `${action.name}${modifierText(action)}${usesSummary(action.uses) ? ` ${usesSummary(action.uses)}` : ""}`).join(" Â· ")}</span>}{spellcasting.length > 0 && <span><b>Spellcasting:</b> {spellcasting.map(action => `${action.name}: ${spellSummary(action)}`).join(" Â· ")}</span>}</div>}
    {actions.filter(action => readBonus(action) !== null || damageRolls(action).length > 0).map((action, index) => renderQuickRolls(action, `action-${index}-${action.name}`))}
    {bonusActions.filter(action => readBonus(action) !== null || damageRolls(action).length > 0).map((action, index) => renderQuickRolls(action, `bonus-${index}-${action.name}`))}
    <Button type="button" variant="secondary" className="monster-detail-trigger [min-height:30px] [padding:5px_9px] [font-size:11px]" onClick={() => { setResult(""); setOpen(true); }}>Detail</Button>
    {result && <output className="monster-roll-result [display:block] [margin-top:12px] [color:#f0d49e]" aria-live="polite">{result}</output>}
    {open && createPortal(<div className="quick-note-backdrop monster-detail-backdrop [position:fixed] [inset:0] [z-index:50] [display:grid] [place-items:center] [width:100vw] [height:100dvh] [padding:20px] [background:#08090bd9] [color:inherit] [overscroll-behavior:contain] [box-sizing:border-box] [overflow-y:auto]" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape" && !busy) setOpen(false); }}><Panel as="section" className="monster-detail-dialog [box-sizing:border-box] [width:min(100%,_760px)] [max-height:calc(100dvh_-_40px)] [min-height:0] [overflow:auto] [overscroll-behavior:contain] [margin:auto] [&_>_section]:[margin-top:16px] [&_>_section_h3]:[margin:0_0_8px] [&_>_section_h3]:[color:#e8d3ab] [&_>_section_h3]:[font-family:var(--serif)]" role="dialog" aria-modal="true" aria-labelledby="monster-detail-title"><SectionHeading as="header"><div><Eyebrow>DETAIL MONSTER</Eyebrow><h2 id="monster-detail-title">{name}</h2></div><Button type="button" variant="quiet" disabled={busy} onClick={() => setOpen(false)}>Tutup</Button></SectionHeading><div className="monster-primary-stats [display:grid] [grid-template-columns:repeat(4,_minmax(0,_1fr))] [gap:8px] [&_>_div]:[display:grid] [&_>_div]:[gap:4px] [&_>_div]:[padding:11px_12px] [&_>_div]:[border:1px_solid_#403d37] [&_>_div]:[border-radius:6px] [&_>_div]:[background:#181a1f] [&_small]:[color:#bda77f] [&_small]:[font-size:9px] [&_small]:[font-weight:700] [&_small]:[letter-spacing:0.12em] [&_small]:[text-transform:uppercase] [&_strong]:[color:#eee0c7] [&_strong]:[font-size:13px] [&_strong]:[font-weight:600] [&_strong]:[overflow-wrap:anywhere] max-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">{[["Initiative", stats.initiative_bonus], ["HP", `${display(stats.hit_points)}${stats.hit_dice ? ` (${display(stats.hit_dice)})` : ""}`], ["Speed", stats.speed], ["CR", stats.challenge_rating]].filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => <div key={String(label)}><small>{String(label)}</small><strong>{String(value)}</strong></div>)}</div>
{!!Object.keys(abilities).length && <div className="monster-abilities [&_>_div]:[display:grid] [&_>_div]:[gap:4px] [&_>_div]:[padding:11px_12px] [&_>_div]:[border:1px_solid_#403d37] [&_>_div]:[border-radius:6px] [&_>_div]:[background:#181a1f] [&_small]:[color:#bda77f] [&_small]:[font-size:9px] [&_small]:[font-weight:700] [&_small]:[letter-spacing:0.12em] [&_small]:[text-transform:uppercase] [display:grid] [grid-template-columns:repeat(6,_minmax(0,_1fr))] [gap:7px] [&_>_div]:[text-align:center] [&_strong]:[font:500_20px_var(--serif)] [&_strong]:[color:#f1d29a] [&_span]:[color:#aaa293] [&_span]:[font-size:11px] max-[700px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))]">{Object.entries(abilities).map(([key, raw]) => { const ability = asRecord(raw) ?? {}; return <div key={key}><small>{key.toUpperCase()}</small><strong>{display(ability.score) || "—"}</strong><span>{typeof ability.modifier === "number" ? signed(ability.modifier) : "—"}</span></div>; })}</div>}
<div className="monster-info-grid [display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:8px] [&_>_section]:[min-width:0] [&_>_section]:[padding:11px_12px] [&_>_section]:[border:1px_solid_#383a40] [&_>_section]:[border-radius:6px] [&_>_section]:[background:#1b1d22] [&_h4]:[margin:0_0_6px] [&_h4]:[color:#cfb27c] [&_h4]:[font-size:10px] [&_h4]:[letter-spacing:0.1em] [&_h4]:[text-transform:uppercase] [&_p]:[margin:0] [&_p]:[color:#ddd2bf] [&_p]:[font-size:12px] [&_p]:[line-height:1.65] [&_p]:[white-space:pre-wrap] [&_p]:[overflow-wrap:anywhere] max-[700px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]">{[["Alignment", stats.alignment], ["Tags", Array.isArray(stats.tags) ? stats.tags.join(", ") : stats.tags], ["AC Source", stats.armor_class_source], ["Average Initiative", stats.initiative_average], ["XP", stats.xp], ["XP in Lair", stats.xp_in_lair], ["Saving Throws", Object.entries(abilities).filter(([, raw]) => { const ability = asRecord(raw) ?? {}; return typeof ability.save === "number" && ability.save !== ability.modifier; }).map(([key, raw]) => { const save = asRecord(raw)!.save as number; return `${key.toUpperCase()} ${signed(save)}`; }).join(", ")], ["Skills", Array.isArray(stats.skills) ? stats.skills.map(raw => { const skill = asRecord(raw) ?? {}; return `${display(skill.name)} ${typeof skill.bonus === "number" ? signed(skill.bonus) : ""}`; }).join(", ") : ""], ["Resistances", stats.resistances], ["Immunities", [display(immunity.damage), display(immunity.conditions)].filter(Boolean).join("; ")], ["Vulnerabilities", stats.vulnerabilities], ["Senses", stats.senses], ["Languages", Array.isArray(stats.languages) ? stats.languages.join(", ") : stats.languages], ["Telepathy", [display(stats.telepathy), display(stats.telepathy_note)].filter(Boolean).join(" · ")], ["Gear", Array.isArray(stats.gear) ? stats.gear.join(", ") : stats.gear], ["Proficiency Bonus", typeof stats.proficiency_bonus === "number" ? signed(stats.proficiency_bonus) : ""], ["Legendary Actions per Turn", stats.legendary_actions_per_turn], ["Legendary Actions per Turn in Lair", stats.legendary_actions_per_turn_in_lair], ["Edition", stats.edition], ["Source", stats.sourceLabel]].filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value]) => <section key={String(label)}><h4>{String(label)}</h4><p>{Array.isArray(value) ? value.join(", ") : String(value)}</p></section>)}</div>
{featureSections.map(([key, label]) => { const features = actionList(allSections[key]); return features.length ? <section className="monster-feature-section [padding:14px_15px] [border:1px_solid_#3d3a35] [border-radius:6px] [background:#191b20] [&_article_+_article]:[margin-top:11px] [&_article_+_article]:[padding-top:11px] [&_article_+_article]:[border-top:1px_solid_#34353a] [&_article_strong]:[display:block] [&_article_strong]:[margin-bottom:4px] [&_article_strong]:[color:#f0dfc2] [&_article_strong]:[font:500_15px_var(--serif)]" key={key}><header className="monster-feature-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [margin-bottom:12px] [&_>_span]:[padding:3px_7px] [&_>_span]:[border:1px_solid_#403d37] [&_>_span]:[border-radius:999px] [&_>_span]:[color:#bda77f] [&_>_span]:[font-size:9px]"><h4>{label}</h4><span>{features.length} {key === "spellcasting" ? "entries" : "abilities"}</span></header><div className="monster-feature-grid [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:8px] max-[700px]:[grid-template-columns:minmax(0,_1fr)]">{features.map((action, index) => renderAction(action, `${key}-${index}`))}</div></section> : null; })}
{!!display(stats.body) && <details className="monster-source [margin-top:2px] [padding-top:10px] [border-top:1px_solid_#34353a] [&_>_summary]:[color:#a99b82] [&_>_summary]:[font-size:10px] [&_pre]:[max-height:none] [&_pre]:[overflow:visible]"><summary>Teks sumber asli</summary><pre>{display(stats.body)}</pre></details>}</Panel></div>, document.body)}
  </div>;
}
