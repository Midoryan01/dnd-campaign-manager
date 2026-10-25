"use client";

import { useState } from "react";
import { Sparkles, UserRound } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { EmptyEmblem } from "@/components/ui/empty-emblem";
import { EmptyState } from "../../../components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FieldLabel } from "../../../components/ui/field-label";
import { FieldRow } from "../../../components/ui/field-row";
import { Panel } from "../../../components/ui/panel";
import { SectionHeading } from "../../../components/ui/section-heading";
import { StatusMessage } from "../../../components/ui/status-message";
import { StepMark } from "@/components/ui/step-mark";
import { StoryCardLayout } from "@/components/ui/story-card-layout";
import { StoryModal } from "@/components/ui/story-modal";

type Npc = { id: string; name: string; role: string | null; status?: string; description?: string | null; personality?: string | null; motivation?: string | null; voice?: string | null; visibility?: string; locationId?: string | null; factionId?: string | null };
type Draft = { name: string; role: string; description: string; personality: string; motivation: string; voice: string; visibility: string; locationId: string; factionId: string; status: string };
const emptyDraft: Draft = { name: "", role: "", description: "", personality: "", motivation: "", voice: "", visibility: "DM_ONLY", locationId: "", factionId: "", status: "ACTIVE" };

export function NpcWorkshop({ campaignId, npcs, locations, factions, locale }: { campaignId: string; npcs: Npc[]; locations: { id: string; name: string }[]; factions: { id: string; name: string }[]; locale: "id" | "en" }) {
  const [concept, setConcept] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<"create" | "detail" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Npc | null>(null);

  async function generate() {
    setMessage(""); setGenerating(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/npc/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concept, locale }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "NPC belum dapat dibuat.");
      setDraft(current => ({ ...current, ...result.draft, motivation: "", voice: "" }));
      setMessage("Draft siap. Periksa dan ubah detailnya sebelum menyimpan.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "NPC belum dapat dibuat."); }
    finally { setGenerating(false); }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "npc", ...(modal === "edit" && selected ? { id: selected.id } : {}), data: draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "NPC tidak dapat disimpan.");
      window.location.reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "NPC tidak dapat disimpan."); }
    finally { setSaving(false); }
  }

  async function removeNpc() {
    if (!selected || saving) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/records`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "npc", id: selected.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "NPC tidak dapat dihapus.");
      window.location.reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "NPC tidak dapat dihapus."); }
    finally { setSaving(false); }
  }

  function openEdit(npc: Npc) {
    setSelected(npc);
    setDraft({ name: npc.name, role: npc.role ?? "", description: npc.description ?? "", personality: npc.personality ?? "", motivation: npc.motivation ?? "", voice: npc.voice ?? "", visibility: npc.visibility ?? "DM_ONLY", locationId: npc.locationId ?? "", factionId: npc.factionId ?? "", status: npc.status ?? "ACTIVE" });
    setMessage(""); setModal("edit");
  }

  function openCreate() { setDraft(emptyDraft); setSelected(null); setMessage(""); setConcept(""); setModal("create"); }
  function update(field: keyof Draft, value: string) { setDraft(current => ({ ...current, [field]: value })); }

  function renderFields() {
    return <>
      {modal === "create" && <div className="[margin-bottom:14px] [padding:12px] [border:1px_solid_#414146] [border-radius:6px] [background:#191b20]"><FieldLabel className="">Ide singkat<input value={concept} onChange={event => setConcept(event.target.value)} maxLength={500} placeholder="Contoh: penjaga penginapan yang tahu rahasia tambang" /></FieldLabel><Button type="button" variant="secondary" disabled={generating} onClick={generate}><Sparkles size={13} /> {generating ? "Merangkai tokoh..." : "Buat draft dengan AI"}</Button></div>}
      <FieldRow><FieldLabel className="">Nama<input value={draft.name} onChange={event => update("name", event.target.value)} required maxLength={160} /></FieldLabel><FieldLabel className="">Peran<input value={draft.role} onChange={event => update("role", event.target.value)} maxLength={120} /></FieldLabel></FieldRow>
      <FieldLabel className="">Deskripsi<textarea value={draft.description} onChange={event => update("description", event.target.value)} rows={3} maxLength={10000} /></FieldLabel>
      <FieldLabel className="">Kepribadian<textarea value={draft.personality} onChange={event => update("personality", event.target.value)} rows={2} maxLength={10000} /></FieldLabel>
      <FieldRow><FieldLabel className="">Motivasi<textarea value={draft.motivation} onChange={event => update("motivation", event.target.value)} rows={2} maxLength={10000} /></FieldLabel><FieldLabel className="">Suara / gaya bicara<textarea value={draft.voice} onChange={event => update("voice", event.target.value)} rows={2} maxLength={10000} /></FieldLabel></FieldRow>
      <FieldRow><FieldLabel className="">Lokasi<select value={draft.locationId} onChange={event => update("locationId", event.target.value)}><option value="">Tanpa lokasi</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel><FieldLabel className="">Faksi<select value={draft.factionId} onChange={event => update("factionId", event.target.value)}><option value="">Tanpa faksi</option>{factions.map(faction => <option key={faction.id} value={faction.id}>{faction.name}</option>)}</select></FieldLabel></FieldRow>
      <FieldRow><FieldLabel className="">Status<select value={draft.status} onChange={event => update("status", event.target.value)}><option value="ACTIVE">Aktif</option><option value="INACTIVE">Tidak aktif</option><option value="DECEASED">Meninggal</option></select></FieldLabel><FieldLabel className="">Visibilitas<select value={draft.visibility} onChange={event => update("visibility", event.target.value)}><option value="DM_ONLY">Hanya DM</option><option value="PLAYER_VISIBLE">Terlihat pemain</option><option value="PUBLIC">Publik</option><option value="SELECTED_USERS">Pemain terpilih</option></select></FieldLabel></FieldRow>
    </>;
  }

  return <div className="npc-layout [display:grid] [grid-template-columns:1fr] [gap:15px]">
    <Panel as="section" className="npc-roster [&_.empty-card]:[margin-top:8px]"><SectionHeading className=""><div><Eyebrow>TOKOH KAMPANYE</Eyebrow><h2>Roster NPC <span className="count-pill">{npcs.length}</span></h2><p>NPC tersimpan dapat dipilih dalam encounter.</p></div><Button type="button" variant="primary" onClick={openCreate}>＋ Tambah NPC</Button></SectionHeading>{npcs.length ? <StoryCardLayout className=" [margin-top:12px]">{npcs.map(npc => <article className="[display:grid] [gap:10px] [padding:13px] [border:1px_solid_#414146] [border-radius:7px] [background:#191b20]" key={npc.id}><div><h3 className="[margin:0] [color:#eee0c7] [font-family:var(--serif)] [font-size:16px]">{npc.name}</h3><p className="[margin:5px_0] [color:#b9ae9b] [font-size:11px]">{npc.role || "Peran belum ditambahkan"} · {npc.status || "ACTIVE"}</p><small className="[color:#a99f8c]">{npc.visibility === "DM_ONLY" ? "Hanya DM" : "Pemain"}{npc.locationId ? ` · ${locations.find(location => location.id === npc.locationId)?.name ?? "Lokasi"}` : ""}</small></div><div className="[display:flex] [flex-wrap:wrap] [gap:6px]"><Button type="button" variant="secondary" onClick={() => { setSelected(npc); setModal("detail"); setMessage(""); }}>Detail</Button><Button type="button" variant="secondary" onClick={() => openEdit(npc)}>Edit</Button><Button type="button" variant="danger" onClick={() => { setSelected(npc); setModal("delete"); setMessage(""); }}>Hapus</Button></div></article>)}</StoryCardLayout> : <EmptyState as="div"><EmptyEmblem><UserRound size={25} /></EmptyEmblem><h3>Belum ada NPC</h3><p>Tambah NPC untuk mulai mengisi roster kampanye.</p></EmptyState>}</Panel>
    {modal === "create" || modal === "edit" ? <StoryModal id="npc-form-title" eyebrow={modal === "create" ? "TOKOH BARU" : "UBAH TOKOH"} title={modal === "create" ? "Tambah NPC" : `Edit ${selected?.name ?? "NPC"}`} onClose={() => setModal(null)}><form onSubmit={save}>{renderFields()}{message && <StatusMessage variant="form" role="status">{message}</StatusMessage>}<div className="[display:flex] [justify-content:flex-end] [gap:8px]"><Button type="button" variant="secondary" onClick={() => setModal(null)}>Batal</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan NPC"}</Button></div></form></StoryModal> : null}
    {modal === "detail" && selected && <StoryModal id="npc-detail-title" eyebrow="TOKOH KAMPANYE" title={selected.name} onClose={() => setModal(null)}><div className="[color:#c4bba9] [font-size:12px] [line-height:1.7] [&_p]:[white-space:pre-wrap]"><p><b>Peran:</b> {selected.role || "Belum ditambahkan"}</p><p><b>Status:</b> {selected.status || "ACTIVE"}</p><p><b>Deskripsi:</b><br />{selected.description || "Belum ada deskripsi."}</p>{selected.personality && <p><b>Kepribadian:</b><br />{selected.personality}</p>}{selected.motivation && <p><b>Motivasi:</b><br />{selected.motivation}</p>}{selected.voice && <p><b>Suara / gaya bicara:</b><br />{selected.voice}</p>}<p><b>Lokasi:</b> {locations.find(location => location.id === selected.locationId)?.name ?? "Tanpa lokasi"}</p><p><b>Faksi:</b> {factions.find(faction => faction.id === selected.factionId)?.name ?? "Tanpa faksi"}</p><p><b>Visibilitas:</b> {selected.visibility ?? "DM_ONLY"}</p></div><div className="[display:flex] [justify-content:flex-end] [gap:8px]"><Button type="button" variant="secondary" onClick={() => openEdit(selected)}>Edit</Button><Button type="button" variant="quiet" onClick={() => setModal(null)}>Tutup</Button></div></StoryModal>}
    {modal === "delete" && selected && <StoryModal id="npc-delete-title" eyebrow="HAPUS NPC" title={`Hapus ${selected.name}?`} onClose={() => setModal(null)}><p>NPC ini akan dihapus dari roster kampanye. Encounter dan cerita terkait tidak ikut dihapus.</p>{message && <StatusMessage variant="form" role="status">{message}</StatusMessage>}<div className="[display:flex] [justify-content:flex-end] [gap:8px]"><Button type="button" variant="secondary" onClick={() => setModal(null)}>Batal</Button><Button type="button" variant="danger" disabled={saving} onClick={removeNpc}>{saving ? "Menghapus..." : "Hapus NPC"}</Button></div></StoryModal>}
  </div>;
}
