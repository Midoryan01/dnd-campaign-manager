"use client";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useEffect, useState } from "react";
import { SectionHeading } from "../../../components/ui/section-heading";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { Panel } from "../../../components/ui/panel";





type Change = { id: string; action: string; entityType: string; entityId: string; summary: string; createdAt: string };

export function HistoryPanel({ campaignId }: { campaignId: string }) {
  const [events, setEvents] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/campaigns/${campaignId}/history`).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Riwayat tidak dapat dimuat.");
      if (active) setEvents(result.events ?? []);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Riwayat tidak dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campaignId]);

  return <Panel as="section" className="campaign-history"><SectionHeading className=""><div><Eyebrow>AUDIT KAMPANYE</Eyebrow><h2>Riwayat Perubahan</h2><p>Aktivitas tersimpan terbaru pada campaign.</p></div></SectionHeading>{error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}{loading ? <p role="status">Memuat riwayat…</p> : events.length ? <ol>{events.map(event => <li key={event.id}><span className="history-action">{event.action}</span><div><strong>{event.summary}</strong><small>{event.entityType} · {new Date(event.createdAt).toLocaleString()}</small></div></li>)}</ol> : <EmptyState as="div"><p>Belum ada perubahan yang tercatat.</p></EmptyState>}</Panel>;
}
