"use client";

import { useState } from "react";

export function EncounterDice({ campaignId }: { campaignId: string }) {
  const [sides, setSides] = useState(20);
  const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  async function roll() {
    setBusy(true);
    try {
      const notation = `d${sides}${modifier ? `${modifier > 0 ? "+" : ""}${modifier}` : ""}`;
      const response = await fetch(`/api/campaigns/${campaignId}/dice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notation, label: "Encounter quick roll" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Roll gagal.");
      setResult(`${body.result.total} (${notation})`);
    } catch (error) { setResult(error instanceof Error ? error.message : "Roll gagal."); }
    finally { setBusy(false); }
  }
  return <section className="encounter-dice [display:grid] [gap:9px] [margin:0_0_14px] [padding:11px] [border:1px_solid_#403c35] [border-radius:6px] [background:#191a1f] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[justify-content:space-between] [&_>_div:first-child]:[gap:8px] [&_>_div:first-child]:[color:#d9c9aa] [&_>_div:first-child]:[font-size:10px] [&_output]:[color:#edcd8d]" aria-label="Dadu cepat encounter"><div><strong>🎲 Dadu cepat</strong><output aria-live="polite">{result || "Siap roll"}</output></div><div className="encounter-dice-controls [display:flex] [align-items:center] [gap:7px] [&_select]:[height:29px] [&_select]:[border:1px_solid_#49474a] [&_select]:[border-radius:4px] [&_select]:[background:#121419] [&_select]:[color:#eee0c7] [&_select]:[padding:4px_6px] [&_select]:[font-size:10px] [&_input]:[height:29px] [&_input]:[border:1px_solid_#49474a] [&_input]:[border-radius:4px] [&_input]:[background:#121419] [&_input]:[color:#eee0c7] [&_input]:[padding:4px_6px] [&_input]:[font-size:10px] [&_label]:[display:flex] [&_label]:[align-items:center] [&_label]:[gap:5px] [&_label]:[color:#b6a88f] [&_label]:[font-size:9px] [&_input]:[width:58px] [&_button]:[height:29px] [&_button]:[padding:0_10px] [&_button]:[border:1px_solid_#735b39] [&_button]:[border-radius:4px] [&_button]:[background:#473722] [&_button]:[color:#f3d8a5] [&_button]:[font-size:10px] [&_.reset-die]:[border-color:transparent] [&_.reset-die]:[background:transparent] [&_.reset-die]:[color:#bba987]"><select value={sides} onChange={event => setSides(Number(event.target.value))} aria-label="Jenis dadu">{[4, 6, 8, 10, 12, 20, 100].map(value => <option key={value} value={value}>d{value}</option>)}</select><label>Mod<input type="number" min="-10000" max="10000" value={modifier} onChange={event => setModifier(Number(event.target.value) || 0)} /></label><button type="button" onClick={roll} disabled={busy}>{busy ? "…" : "Roll"}</button><button type="button" className="reset-die" onClick={() => { setSides(20); setModifier(0); setResult(""); }}>Reset</button></div></section>;
}
