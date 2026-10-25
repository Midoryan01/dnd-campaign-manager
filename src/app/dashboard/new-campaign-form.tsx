"use client";

import { useState } from "react";
import { Button } from "../../components/ui/button";

export function NewCampaignForm() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: new FormData(form).get("name") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Kampanye tidak dapat dibuat.");
      window.location.assign(`/campaigns/${result.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kampanye tidak dapat dibuat. Coba lagi.");
      setSaving(false);
    }
  }

  return <form className="dashboard-create-form [display:grid] [gap:9px] [margin-top:17px] [&_label]:[color:#d0c4af] [&_label]:[font-size:11px] [&_input]:[min-height:39px] [&_input]:[width:100%] [&_input]:[padding:9px_10px] [&_input]:[border:1px_solid_#494950] [&_input]:[border-radius:5px] [&_input]:[background:#15171c] [&_input]:[color:#eee4d2] [&_input]:[font-size:12px] [&_input::placeholder]:[color:#756f66] [&_[role='alert']]:[margin:0] [&_[role='alert']]:[color:#efa9a3] [&_[role='alert']]:[font-size:11px] [&_button]:[width:100%] [&_button]:[margin-top:3px]" onSubmit={createCampaign}>
    <label htmlFor="campaign-name">Nama kampanye</label>
    <input id="campaign-name" name="name" placeholder="Contoh: Rahasia di Neverwinter" required maxLength={120} />
    {error && <p role="alert">{error}</p>}
    <Button disabled={saving}>{saving ? "Menyiapkan…" : "＋  Buat kampanye"}</Button>
  </form>;
}
