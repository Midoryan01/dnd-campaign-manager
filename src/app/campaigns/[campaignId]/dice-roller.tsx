"use client";
import { StepMark } from "@/components/ui/step-mark";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useCallback, useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { Panel } from "../../../components/ui/panel";







type Roll = { notation: string; total: number; groups: Array<{ sides: number; rolls: number[]; kept: number[] }>; modifiers: number[]; mode?: "advantage" | "disadvantage"; critical: boolean; fumble: boolean };
type HistoryItem = { id: string; notation: string; label: string | null; result: Roll; createdAt: string };
const dice = [4, 6, 8, 10, 12, 20, 100];

export function DiceRoller({ campaignId }: { campaignId: string }) {
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<"normal" | "advantage" | "disadvantage">("normal");
  const [result, setResult] = useState<Roll | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [rolling, setRolling] = useState(false);

  const loadHistory = useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/dice`);
    if (response.ok) setHistory((await response.json()).history);
  }, [campaignId]);
  useEffect(() => { loadHistory().catch(() => setError("Riwayat belum tersedia.")); }, [loadHistory]);

  async function roll() {
    const notation = `${count}d${sides}${modifier ? `${modifier > 0 ? "+" : ""}${modifier}` : ""}${mode === "normal" ? "" : ` ${mode === "advantage" ? "adv" : "dis"}`}`;
    setError(""); setRolling(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notation, label: "Roll cepat" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Roll gagal.");
      setResult(body.result);
      await loadHistory();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Roll gagal. Coba lagi."); }
    finally { setRolling(false); }
  }

  function reset() { setSides(20); setCount(1); setModifier(0); setMode("normal"); setResult(null); setError(""); }

  return <div className="dice-layout [display:grid] [grid-template-columns:minmax(0,_1.4fr)_minmax(280px,_0.6fr)] [align-items:start] [gap:15px] max-[650px]:[grid-template-columns:1fr]">
    <Panel as="section" className="dice-stage">
      <SectionHeading className=""><div><Eyebrow>DADU CEPAT</Eyebrow><h2>Roll dadu</h2><p>Pilih dadu, jumlah, dan modifier.</p></div><StepMark size="large">d{sides}</StepMark></SectionHeading>
      <div className="simple-dice-types [display:flex] [flex-wrap:wrap] [gap:7px] [margin:12px_0_16px]" aria-label="Jenis dadu">{dice.map(die => <button type="button" key={die} aria-pressed={sides === die} className={sides === die ? "simple-die selected [min-width:48px] [height:38px] [border:1px_solid_#4d4941] [border-radius:5px] [background:#191a1e] [color:#cfc2ab] [&.selected]:[border-color:#a78652] [&.selected]:[background:#3b3021] [&.selected]:[color:#f2d59e]" : "simple-die [min-width:48px] [height:38px] [border:1px_solid_#4d4941] [border-radius:5px] [background:#191a1e] [color:#cfc2ab] [&.selected]:[border-color:#a78652] [&.selected]:[background:#3b3021] [&.selected]:[color:#f2d59e]"} onClick={() => { setSides(die); if (die !== 20) setMode("normal"); }}>d{die}</button>)}</div>
      <div className="simple-dice-controls [display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:10px] [&_.field-label]:[margin:0] [&_input]:[width:100%] [&_select]:[width:100%]">
        <FieldLabel className="">Jumlah<input type="number" min="1" max="100" value={count} onChange={event => { const next = Math.max(1, Math.min(100, Number(event.target.value) || 1)); setCount(next); if (next !== 1) setMode("normal"); }} /></FieldLabel>
        <FieldLabel className="">Modifier<input type="number" min="-10000" max="10000" value={modifier} onChange={event => setModifier(Math.max(-10000, Math.min(10000, Number(event.target.value) || 0)))} /></FieldLabel>
        <FieldLabel className="">Roll d20<select value={mode} disabled={sides !== 20 || count !== 1} onChange={event => setMode(event.target.value as typeof mode)}><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select></FieldLabel>
      </div>
      <div className="simple-dice-actions [display:flex] [align-items:center] [gap:12px] [margin-top:12px]"><Button variant="primary" disabled={rolling} onClick={roll}>{rolling ? "Mengocok…" : "🎲 Roll"}</Button><Button variant="quiet" onClick={reset}>Reset</Button></div>
      {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
      {result ? <div className={`roll-result  [display:grid] [grid-template-columns:120px_1fr] [gap:15px] [margin-top:15px] [padding:15px] [border:1px_solid_#66543a] [border-radius:7px] [background:radial-gradient(circle_at_16%_40%,_#90704330,_transparent_45%),_linear-gradient(135deg,_#29251f,_#1c1d22)] [&.critical]:[border-color:#8b7445] [&.critical]:[box-shadow:inset_0_0_18px_#c39b4114] [&.fumble]:[border-color:#74484d] [&.fumble]:[background:linear-gradient(135deg,_#322326,_#1c1d22)] max-[650px]:[grid-template-columns:94px_1fr] max-[650px]:[gap:9px] max-[650px]:[padding:10px]${result.critical ? "critical [&_.roll-total_span]:[color:#f1d087]" : result.fumble ? "fumble [&_.roll-total_span]:[color:#e2a2a0]" : ""}`} aria-live="polite"><div className="roll-total [display:flex] [flex-direction:column] [justify-content:center] [align-items:center] [min-height:105px] [border-right:1px_solid_#514332] [&_span]:[color:#c3a675] [&_span]:[font-size:9px] [&_span]:[letter-spacing:0.16em] [&_strong]:[margin-top:4px] [&_strong]:[color:#f3d6a0] [&_strong]:[font-family:var(--serif)] [&_strong]:[font-size:49px] [&_strong]:[font-weight:500] [&_strong]:[line-height:1] max-[650px]:[&_strong]:[font-size:40px]"><span>{result.critical ? "CRITICAL!" : result.fumble ? "FUMBLE" : "TOTAL"}</span><strong>{result.total}</strong></div><div className="roll-breakdown [align-self:center] [&_p]:[margin:5px_0] [&_p]:[color:#b7ad9c] [&_p]:[font-size:10px] [&_>_small]:[color:#ab9b7f] [&_>_small]:[font-size:9px]"><p>{result.notation}</p>{result.groups.map((group, index) => <p key={index}>d{group.sides}: <span className="dice-faces [display:inline-flex] [gap:4px] [margin-left:5px] [vertical-align:middle] [&_b]:[min-width:23px] [&_b]:[padding:4px_5px] [&_b]:[border:1px_solid_#76613e] [&_b]:[border-radius:4px] [&_b]:[background:#332c21] [&_b]:[color:#f0d19a] [&_b]:[text-align:center] [&_b]:[font-size:10px] [&_.dropped-face]:[border-color:#454348] [&_.dropped-face]:[background:#27262a] [&_.dropped-face]:[color:#726f70] [&_.dropped-face]:[text-decoration:line-through]">{group.rolls.map((value, rollIndex) => <b className={group.kept.includes(value) ? "kept-face" : "dropped-face"} key={`${rollIndex}-${value}`}>{value}</b>)}</span></p>)}{result.modifiers.map((value, index) => <p key={index}>Modifier {value > 0 ? "+" : ""}{value}</p>)}{result.mode && <small>{result.mode === "advantage" ? "Nilai tertinggi" : "Nilai terendah"}</small>}</div></div> : <div className="roll-placeholder [display:flex] [align-items:center] [gap:11px] [margin-top:14px] [padding:13px] [border:1px_dashed_#48413a] [border-radius:5px] [color:#9c9280] [&_>_span]:[color:#c2a16b] [&_>_span]:[font-size:19px] [&_p]:[margin:0] [&_p]:[font-size:11px]"><span>✦</span><p>Hasil roll muncul di sini</p></div>}
    </Panel>
    <Panel as="aside" className="roll-history [&_ol]:[display:grid] [&_ol]:[gap:1px] [&_ol]:[margin:0] [&_ol]:[padding:0] [&_ol]:[list-style:none] [&_li]:[display:flex] [&_li]:[align-items:center] [&_li]:[justify-content:space-between] [&_li]:[gap:8px] [&_li]:[padding:11px_1px] [&_li]:[border-top:1px_solid_#37383b] [&_li_strong]:[display:block] [&_li_small]:[display:block] [&_li_strong]:[color:#e2d5bf] [&_li_strong]:[font-family:var(--serif)] [&_li_strong]:[font-size:12px] [&_li_strong]:[font-weight:500] [&_li_small]:[margin-top:4px] [&_li_small]:[color:#948d81] [&_li_small]:[font-size:9px] [&_li_>_b]:[min-width:31px] [&_li_>_b]:[color:#e5c48d] [&_li_>_b]:[font-family:var(--serif)] [&_li_>_b]:[font-size:21px] [&_li_>_b]:[font-weight:500] [&_li_>_b]:[text-align:right]"><SectionHeading className=""><div><Eyebrow>CATATAN MEJA</Eyebrow><h2>Roll terakhir</h2></div></SectionHeading>{history.length ? <ol>{history.map(item => <li key={item.id}><div><strong>{item.label || item.notation}</strong><small>{item.notation} · {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</small></div><b>{item.result.total}</b></li>)}</ol> : <EmptyState as="div"><p>Belum ada roll.</p></EmptyState>}</Panel>
  </div>;
}
