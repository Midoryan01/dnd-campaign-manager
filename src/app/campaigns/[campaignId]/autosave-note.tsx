"use client";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { Panel, PanelForm } from "../../../components/ui/panel";







type Note = { id: string; title: string; body: string; storyScene?: { id: string; title: string } | null; location?: { id: string; name: string } | null; quest?: { id: string; title: string } | null };

export function AutosaveNote({ campaignId, notes, scenes, locations, quests }: { campaignId: string; notes: Note[]; scenes: Array<{ id: string; title: string }>; locations: Array<{ id: string; name: string }>; quests: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Note | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "note", id: editing?.id, data: { title: fields.get("title"), body: fields.get("body"), visibility: "DM_ONLY", storySceneId: fields.get("storySceneId") || null, locationId: fields.get("locationId") || null, questId: fields.get("questId") || null } }) });
      const result = await response.json();
      if (!response.ok || result.updated === false) setError(result.error ?? "Catatan tidak dapat disimpan.");
      else { setEditing(null); setEditorOpen(false); router.refresh(); }
    } catch { setError("Catatan tidak dapat disimpan. Coba lagi."); }
    finally { setSaving(false); }
  }

  async function remove(note: Note) {
    if (!window.confirm(`Hapus catatan “${note.title}”?`)) return;
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/records`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "note", id: note.id }) });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Catatan tidak dapat dihapus."); else router.refresh();
    } catch { setError("Catatan tidak dapat dihapus. Coba lagi."); }
  }

  return <section className="campaign-notes max-[650px]:[grid-template-columns:1fr] [display:grid] [grid-template-columns:minmax(0,_1fr)] [gap:12px] [margin-top:18px] [&_.note-archive]:[width:100%] [&_.note-archive]:[min-width:0] [&_.note-archive]:[grid-column:1_/_-1] [&_.note-editor]:[display:grid] [&_.note-editor]:[gap:10px] [&_.note-editor_.field-label]:[margin:0] [&_.note-editor_textarea]:[min-height:160px] [&_.story-form-actions]:[padding-top:10px] [&_.note-editor]:[width:min(100%,_760px)] [&_.note-editor]:[max-height:calc(100dvh_-_40px)] [&_.note-editor]:[overflow:auto] [&_.note-editor]:[margin:0] max-[650px]:[gap:12px] max-[650px]:[&_.note-editor_textarea]:[min-height:130px]">
    <Panel as="section" className="note-archive"><SectionHeading variant="centered"><div><Eyebrow>ARSIP KAMPANYE</Eyebrow><h2>Catatan tersimpan</h2></div><Button type="button" variant="primary" onClick={() => { setEditing(null); setError(""); setEditorOpen(true); }}>+ Tambah catatan</Button></SectionHeading>{notes.length ? <div className="note-list [display:grid] [gap:10px] [min-width:0]">{notes.map(note => <article className="note-card [min-width:0] [margin:0] [padding:14px] [border:1px_solid_#49443b] [border-radius:7px] [background:linear-gradient(145deg,_#25262b,_#1c1e23)] [&_p]:[margin:0] [&_p]:[color:#aaa292] [&_p]:[font-size:11px] [&_p]:[line-height:1.6] [&_p]:[white-space:pre-wrap] [&_p]:[overflow-wrap:anywhere] [&_p]:[word-break:break-word]" key={note.id}><header className="note-card-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [min-width:0] [&_h3]:[min-width:0] [&_h3]:[margin:0] [&_h3]:[overflow-wrap:anywhere]"><h3>{note.title}</h3><div className="note-card-actions [display:flex] [flex:none] [gap:6px] [&_button]:[min-height:30px] [&_button]:[padding:5px_9px] [&_button]:[border:1px_solid_#514a3e] [&_button]:[border-radius:5px] [&_button]:[background:#202126] [&_button:hover]:[border-color:#a1804e] [&_button:hover]:[background:#302a20]"><Button type="button" variant="quiet" onClick={() => { setEditing(note); setError(""); setEditorOpen(true); }}>Ubah</Button><Button type="button" variant="quiet" onClick={() => void remove(note)}>Hapus</Button></div></header>{(note.storyScene || note.location || note.quest) && <div className="note-links [display:flex] [flex-wrap:wrap] [gap:6px] [margin:8px_0] [&_span]:[max-width:100%] [&_span]:[padding:4px_7px] [&_span]:[border:1px_solid_#514635] [&_span]:[border-radius:4px] [&_span]:[color:#dfc28f] [&_span]:[font-size:10px] [&_span]:[overflow-wrap:anywhere]">{note.storyScene && <span>Scene: {note.storyScene.title}</span>}{note.location && <span>Lokasi: {note.location.name}</span>}{note.quest && <span>Quest: {note.quest.title}</span>}</div>}<details className="note-body-details [min-width:0] [margin-top:10px] [border:1px_solid_#3e4046] [border-radius:6px] [background:#191b20] [overflow:hidden] [&_summary]:[display:grid] [&_summary]:[grid-template-columns:minmax(0,_1fr)_auto] [&_summary]:[align-items:center] [&_summary]:[gap:8px_12px] [&_summary]:[padding:10px_12px] [&_summary]:[color:#c7b28d] [&_summary]:[font-size:11px] [&_summary]:[line-height:1.6] [&_summary]:[cursor:pointer] [&_summary]:[overflow-wrap:anywhere] [&_summary]:[list-style:none] [&_summary::-webkit-details-marker]:[display:none] [&[open]_.note-toggle-closed]:[display:none] [&[open]_.note-toggle-open]:[display:inline]"><summary><span className="note-preview [min-width:0] [color:#aaa292] [white-space:pre-wrap]">{note.body.length > 180 ? `${note.body.slice(0, 180).trimEnd()}?` : note.body}</span><span className="note-toggle [grid-column:2] [grid-row:1] [padding:4px_7px] [border:1px_solid_#514635] [border-radius:4px] [color:#e3c184] [white-space:nowrap]"><span className="note-toggle-closed">Buka isi catatan</span><span className="note-toggle-open [display:none]">Tutup isi catatan</span></span></summary><p>{note.body}</p></details></article>)}</div> : <EmptyState as="div"><p>Belum ada catatan. Tambahkan catatan melalui tombol di atas.</p></EmptyState>}</Panel>
    {error && !editorOpen && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
    {editorOpen && createPortal(<div className="quick-note-backdrop note-editor-backdrop [position:fixed] [inset:0] [z-index:50] [display:grid] [place-items:center] [width:100vw] [height:100dvh] [padding:20px] [background:#08090bd9] [color:inherit] [overscroll-behavior:contain] [box-sizing:border-box] [overflow-y:auto]" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditorOpen(false); }} onKeyDown={event => { if (event.key === "Escape" && !saving) setEditorOpen(false); }}><PanelForm className="note-editor note-editor-dialog [&_textarea]:[min-height:300px] [&_.eyebrow]:[display:block] [&_.eyebrow]:[margin-bottom:8px] [box-sizing:border-box] [width:min(100%,_760px)] [max-height:calc(100dvh_-_40px)] [min-height:0] [overflow-x:hidden] [overflow-y:auto] [overscroll-behavior:contain] [margin:auto] [gap:10px] [&_.field-label]:[margin:0] [&_textarea]:[min-height:140px] [&_textarea]:[max-height:35dvh]" role="dialog" aria-modal="true" aria-labelledby="dm-note-title" onSubmit={save}>
      <SectionHeading variant="compact"><div><Eyebrow>{editing ? "UBAH CATATAN" : "CATATAN DM"}</Eyebrow><h2 id="dm-note-title">{editing ? "Ubah catatan" : "Tambah catatan"}</h2></div><Button type="button" variant="quiet" disabled={saving} onClick={() => setEditorOpen(false)}>Tutup</Button></SectionHeading>
      <FieldLabel className="">Judul<input name="title" required maxLength={160} defaultValue={editing?.title ?? ""} key={editing?.id ?? "new-title"} /></FieldLabel>
      <FieldLabel className="">Catatan<textarea name="body" required rows={5} maxLength={50000} placeholder="Tulis catatan kampanye?" defaultValue={editing?.body ?? ""} key={editing?.id ?? "new-body"} /></FieldLabel>
      <div className="note-editor-links [display:grid] [gap:9px] [padding:12px] [border:1px_solid_#3a3b40] [border-radius:6px] [background:#191b20] [&_.field-label]:[margin:0]">
        <FieldLabel className="">Hubungkan ke scene<select name="storySceneId" defaultValue={editing?.storyScene?.id ?? ""} key={`${editing?.id ?? "new"}-scene`}><option value="">Tanpa scene</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.title}</option>)}</select></FieldLabel>
        <FieldLabel className="">Hubungkan ke lokasi<select name="locationId" defaultValue={editing?.location?.id ?? ""} key={`${editing?.id ?? "new"}-location`}><option value="">Tanpa lokasi</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel>
        <FieldLabel className="">Hubungkan ke quest<select name="questId" defaultValue={editing?.quest?.id ?? ""} key={`${editing?.id ?? "new"}-quest`}><option value="">Tanpa quest</option>{quests.map(quest => <option key={quest.id} value={quest.id}>{quest.title}</option>)}</select></FieldLabel>
      </div>
      {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
      <div className="story-form-actions [grid-column:1/-1] [display:flex] [justify-content:flex-end] [gap:8px] [padding-top:12px] [border-top:1px_solid_#393a3e] [&_.field-label]:[min-width:125px] max-[650px]:[grid-column:auto] max-[650px]:[justify-content:stretch] max-[650px]:[&_>_*]:[flex:1]"><Button type="button" variant="secondary" disabled={saving} onClick={() => setEditorOpen(false)}>Batal</Button><Button variant="primary" disabled={saving}>{saving ? "Menyimpan?" : editing ? "Simpan perubahan" : "+ Tambah catatan"}</Button></div>
    </PanelForm></div>, document.body)}
  </section>;
}

export function QuickNoteCapture({ campaignId, scenes, locations, quests }: { campaignId: string; scenes: Array<{ id: string; title: string }>; locations: Array<{ id: string; name: string }>; quests: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "note", data: { title: fields.get("title"), body: fields.get("body"), visibility: "DM_ONLY", storySceneId: fields.get("storySceneId") || null, locationId: fields.get("locationId") || null, questId: fields.get("questId") || null } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Catatan tidak dapat disimpan.");
      form.reset(); setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Catatan tidak dapat disimpan."); }
    finally { setSaving(false); }
  }

  return <>
    <button type="button" className="quick-note-trigger [min-height:50px] [display:inline-flex] [align-items:center] [justify-content:center] [gap:7px] [padding:0_11px] [border:1px_solid_#806844] [border-radius:6px] [background:linear-gradient(145deg,_#30281e,_#211f1c)] [color:#f0d6a5] [font-size:11px] [font-weight:600] [white-space:nowrap] [box-shadow:inset_0_1px_#ffffff0a] [transition:border-color_0.15s,_background_0.15s,_transform_0.15s] [&:hover]:[border-color:#b49460] [&:hover]:[background:#392f22] [&:active]:[transform:translateY(1px)]" onClick={() => { setError(""); setOpen(true); }}>Catatan cepat</button>
    {open && createPortal(<div role="presentation" className="quick-note-backdrop [position:fixed] [inset:0] [z-index:50] [display:grid] [place-items:center] [width:100vw] [height:100dvh] [padding:20px] [background:#08090bd9] [color:inherit] [overscroll-behavior:contain]" onClick={event => { if (event.target === event.currentTarget && !saving) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape" && !saving) setOpen(false); }}><Panel role="dialog" aria-modal="true" aria-labelledby="quick-note-title" as="section" className="quick-note-dialog shadow-[0_24px_80px_#0009] [width:min(100%,_560px)] [margin:0] [max-height:calc(100dvh_-_40px)] [overflow:auto] [overscroll-behavior:contain] [box-shadow:0_24px_80px_#0009] [&_form]:[display:grid] [&_form]:[gap:10px] [&_.field-label]:[margin:0] [&_form_>_.button-primary]:[justify-self:end] [&_form_>_.button-primary]:[min-width:160px] [&_.form-message]:[margin:0]"><SectionHeading variant="compact"><div><Eyebrow>CATATAN DM</Eyebrow><h2 id="quick-note-title">Catatan cepat</h2></div><Button type="button" variant="quiet" disabled={saving} onClick={() => setOpen(false)}>Tutup</Button></SectionHeading><form onSubmit={save}><FieldLabel className="">Judul<input name="title" required maxLength={160} autoFocus /></FieldLabel><FieldLabel className="">Catatan<textarea name="body" required rows={6} maxLength={50000} /></FieldLabel><div className="quick-note-links [display:grid] [grid-template-columns:repeat(auto-fit,_minmax(150px,_1fr))] [gap:8px]"><FieldLabel className="">Hubungkan ke scene<select name="storySceneId" defaultValue=""><option value="">Tanpa scene</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.title}</option>)}</select></FieldLabel><FieldLabel className="">Hubungkan ke lokasi<select name="locationId" defaultValue=""><option value="">Tanpa lokasi</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel><FieldLabel className="">Hubungkan ke quest<select name="questId" defaultValue=""><option value="">Tanpa quest</option>{quests.map(quest => <option key={quest.id} value={quest.id}>{quest.title}</option>)}</select></FieldLabel></div>{error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}<Button variant="primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan catatan"}</Button></form></Panel></div>, document.body)}
  </>;
}
