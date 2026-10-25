"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/button";


export function CombatD20({ campaignId, name }: { campaignId: string; name: string }) {
  const [modifier, setModifier] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function roll() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notation: `1d20${modifier ? `${modifier > 0 ? "+" : ""}${modifier}` : ""}`, label: `${name} · d20` }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Roll d20 gagal.");
      setTotal(result.result.total);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Roll d20 gagal."); }
    finally { setBusy(false); }
  }
  return <div className="combat-d20 [display:flex] [align-items:flex-end] [gap:6px] [margin:8px_0] [&_label]:[display:grid] [&_label]:[gap:3px] [&_label]:[color:#a69a83] [&_label]:[font-size:9px] [&_input]:[width:62px] [&_input]:[min-height:30px] [&_input]:[padding:4px_6px] [&_button]:[min-height:30px] [&_button]:[padding:5px_9px] [&_button]:[font-size:10px] [&_strong]:[color:#f0d6a6] [&_strong]:[font-family:var(--serif)] [&_strong]:[font-size:14px] [&_[role='alert']]:[color:#e3a29a]"><label>Mod d20<input type="number" min="-100" max="100" value={modifier} onChange={event => setModifier(Math.max(-100, Math.min(100, Number(event.target.value) || 0)))} aria-label={`Modifier d20 ${name}`} /></label><Button type="button" variant="secondary" disabled={busy} onClick={roll}>{busy ? "Roll…" : "🎲 d20"}</Button>{total !== null && <strong aria-live="polite">Hasil {total}</strong>}{error && <small role="alert">{error}</small>}</div>;
}
