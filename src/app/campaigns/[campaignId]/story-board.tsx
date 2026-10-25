"use client";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { SceneTracker } from "./scene-tracker";
import { Button } from "../../../components/ui/button";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { Panel, PanelForm } from "../../../components/ui/panel";
import { StoryModal } from "../../../components/ui/story-modal";
import { StoryCardLayout } from "../../../components/ui/story-card-layout";






type Scene = { id: string; title: string; objective: string | null; notes: string | null; visibility: string; act: { id: string; name: string } | null; location: { id: string; name: string; description: string | null; readAloud: string | null } | null; npcs: Array<{ id: string; name: string; role: string | null; description: string | null; personality: string | null; motivation: string | null; voice: string | null }>; quests: Array<{ id: string; title: string; status: string }>; linkedNotes: Array<{ id: string; title: string; body: string; visibility: string; locationId: string | null; questId: string | null }>; encounters: Array<{ id: string; name: string; status: string; _count: { combatants: number } }>; status: "TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED"; sortOrder: number };
type Location = { id: string; name: string };
type Npc = { id: string; name: string; role: string | null; description: string | null };
type Quest = { id: string; title: string; status: string };
type Threat = { id: string; kind: "ACT" | "THREAT" | "THREAD"; name: string; note: string | null; status: Scene["status"]; progress: number; clockSize: number };
const columns: Array<{ status: Scene["status"]; title: string }> = [{ status: "TODO", title: "Belum" }, { status: "IN_PROGRESS", title: "Sedang jalan" }, { status: "DONE", title: "Selesai" }, { status: "SKIPPED", title: "Dilewati" }];
async function responseData(response: Response) {
  try { return await response.json() as { error?: string; scenes?: Scene[]; encounters?: Array<{ id: string; name: string }>; notes?: Threat[] }; }
  catch { return { error: `Server mengirim respons tidak valid (${response.status}).` }; }
}

export function StoryBoard({ campaignId, locations, npcs, quests, onActiveSceneChange }: { campaignId: string; locations: Location[]; npcs: Npc[]; quests: Quest[]; onActiveSceneChange: (scene: { id: string; title: string; objective: string | null } | null) => void }) {
  const [tab, setTab] = useState<"story" | "threats" | "threads">("story");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [encounters, setEncounters] = useState<Array<{ id: string; name: string }>>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [threatTitle, setThreatTitle] = useState("");
  const [threatNote, setThreatNote] = useState("");
  const [threatStatus, setThreatStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED">("TODO");
  const [clockSize, setClockSize] = useState<4 | 6 | 8>(6);
  const [saving, setSaving] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actOutline, setActOutline] = useState("");
  const [editingAct, setEditingAct] = useState<Threat | null>(null);
  const [storySubtab, setStorySubtab] = useState<"outline" | "flow">("outline");
  const [selectedActId, setSelectedActId] = useState<string | null>(null);
  const [detailAct, setDetailAct] = useState<Threat | null>(null);
  const endpoint = `/api/campaigns/${campaignId}/story`;

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [sceneResponse, notesResponse] = await Promise.all([fetch(endpoint), fetch(`/api/campaigns/${campaignId}/story/notes`)]);
      const sceneData = await responseData(sceneResponse);
      const noteData = await responseData(notesResponse);
      if (!sceneResponse.ok) throw new Error(sceneData.error ?? "Scene tidak dapat dimuat.");
      if (!notesResponse.ok) throw new Error(noteData.error ?? "Catatan Cerita tidak dapat dimuat.");
      if (!sceneData.scenes || !noteData.notes) throw new Error("Data Cerita belum lengkap. Coba muat ulang.");
      setScenes(sceneData.scenes); setEncounters(sceneData.encounters ?? []); setThreats(noteData.notes);
      const activeScene = sceneData.scenes.find(scene => scene.status === "IN_PROGRESS");
      onActiveSceneChange(activeScene ? { id: activeScene.id, title: activeScene.title, objective: activeScene.objective } : null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Data Cerita tidak dapat dimuat."); }
    finally { setBusy(false); }
  }, [endpoint, campaignId, onActiveSceneChange]);
  useEffect(() => { void load(); }, [load]);

  async function addStoryNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const isAct = tab === "story" && storySubtab === "outline";
    const response = await fetch(`/api/campaigns/${campaignId}/story/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isAct ? { kind: "ACT", name: actTitle, note: actOutline } : { kind: tab === "threats" ? "THREAT" : "THREAD", name: threatTitle, note: threatNote, status: threatStatus, clockSize }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Catatan tidak dapat disimpan."); else { setActTitle(""); setActOutline(""); setThreatTitle(""); setThreatNote(""); setThreatStatus("TODO"); setClockSize(6); await load(); }
    setSaving(false);
  }

  async function saveAct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingAct) return;
    setSaving(true); setError("");
    const response = await fetch(`/api/campaigns/${campaignId}/story/notes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingAct.id, action: "update", name: actTitle, note: actOutline }) });
    const result = await response.json();
    if (!response.ok || !result.ok) setError(result.error ?? "Act tidak dapat diperbarui.");
    else { setEditingAct(null); setActTitle(""); setActOutline(""); await load(); }
    setSaving(false);
  }

  async function updateNote(id: string, status: Scene["status"]) {
    const response = await fetch(`/api/campaigns/${campaignId}/story/notes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Catatan tidak dapat diperbarui."); else await load();
  }

  async function changeNoteProgress(id: string, progress: number) {
    const response = await fetch(`/api/campaigns/${campaignId}/story/notes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, progress }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Clock tidak dapat diperbarui."); else await load();
  }

  async function deleteNote(id: string) {
    const response = await fetch(`/api/campaigns/${campaignId}/story/notes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "delete" }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Catatan tidak dapat dihapus."); else await load();
  }

  const visibleNotes = threats.filter(note => tab === "threats" ? note.kind === "THREAT" : note.kind === "THREAD");
  const acts = threats.filter(note => note.kind === "ACT");
  return <section className="story-board">
    <div className="story-tabs [display:flex] [gap:8px] [margin-bottom:15px] [border-bottom:1px_solid_#3b3b3e] [&_button]:[padding:10px_14px] [&_button]:[border:0] [&_button]:[border-bottom:2px_solid_transparent] [&_button]:[background:transparent] [&_button]:[color:#aaa08e] [&_button]:[font-size:12px] [&_button.selected]:[border-color:#c5a16b] [&_button.selected]:[color:#f1dfbd] max-[650px]:[overflow-x:auto] max-[650px]:[&_button]:[white-space:nowrap]" role="tablist" aria-label="Bagian Cerita">{[["story", "Cerita"], ["threats", "Ancaman"], ["threads", "Benang Merah"]].map(([value, title]) => <button type="button" key={value} role="tab" aria-selected={tab === value} className={tab === value ? "selected" : ""} onClick={() => setTab(value as typeof tab)}>{title}</button>)}</div>
    {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
    {tab === "story" ? <>
      <div className="story-tabs story-subtabs [display:flex] [gap:8px] [margin-bottom:15px] [border-bottom:1px_solid_#3b3b3e] [&_button]:[padding:10px_14px] [&_button]:[border:0] [&_button]:[border-bottom:2px_solid_transparent] [&_button]:[background:transparent] [&_button]:[color:#aaa08e] [&_button]:[font-size:12px] [&_button.selected]:[border-color:#c5a16b] [&_button.selected]:[color:#f1dfbd] max-[650px]:[overflow-x:auto] max-[650px]:[&_button]:[white-space:nowrap]" role="tablist" aria-label="Tampilan Cerita"><button type="button" role="tab" aria-selected={storySubtab === "outline"} className={storySubtab === "outline" ? "selected" : ""} onClick={() => setStorySubtab("outline")}>Act & kerangka</button><button type="button" role="tab" aria-selected={storySubtab === "flow"} className={storySubtab === "flow" ? "selected" : ""} onClick={() => setStorySubtab("flow")}>Alur scene</button></div>
      {storySubtab === "flow" && selectedActId ? <SceneTracker campaignId={campaignId} scenes={scenes.filter(scene => scene.act?.id === selectedActId)} acts={acts.filter(act => act.id === selectedActId).map(act => ({ id: act.id, name: act.name }))} locations={locations} npcs={npcs} quests={quests} encounters={encounters} loading={busy} onReload={load} hasActs={acts.length > 0} onBack={() => { setSelectedActId(null); setStorySubtab("outline"); }} /> : storySubtab === "flow" ? <SceneTracker campaignId={campaignId} scenes={scenes} acts={acts.map(act => ({ id: act.id, name: act.name }))} locations={locations} npcs={npcs} quests={quests} encounters={encounters} loading={busy} onReload={load} hasActs={acts.length > 0} /> : <>
      <PanelForm className="story-create story-note-form p-[22px] max-[650px]:p-4 [display:grid] [grid-template-columns:minmax(0,_1.6fr)_minmax(220px,_0.8fr)] [align-items:start] [gap:14px_22px] [margin-bottom:16px] [padding:22px] [&_h2]:[margin:5px_0] [&_h2]:[font-size:23px] [&_p]:[margin:0] [&_p]:[color:#aaa394] [&_p]:[font-size:12px] [&_p]:[line-height:1.55] [&_.field-label]:[margin:0] [&_.field-label_>_span]:[color:#938a7d] [&_.field-label_>_span]:[font-size:10px] [&_.field-label_textarea]:[min-height:92px] [&_.story-title-field_input]:[min-height:42px] [&_.story-title-field_input]:[font-size:13px] max-[1000px]:[grid-template-columns:minmax(0,_1.35fr)_minmax(210px,_0.8fr)] max-[650px]:[grid-template-columns:1fr] max-[650px]:[padding:16px] [&_select[multiple]]:[min-height:76px] [grid-template-columns:minmax(220px,_1fr)_minmax(180px,_0.8fr)_minmax(_230px,_1.2fr_)_auto] max-[1000px]:[grid-template-columns:1fr_1fr] max-[1000px]:[&_>_div:first-child]:[grid-column:1/-1] max-[650px]:[&_>_div:first-child]:[grid-column:auto]" onSubmit={editingAct ? saveAct : addStoryNote}>
        <div><Eyebrow>KERANGKA CERITA</Eyebrow><h2>{editingAct ? "Ubah Act" : "Susun Act sebelum scene"}</h2><p>Tulis tujuan, konflik utama, titik balik, dan akhir Act. Pecah jadi scene hanya saat siap dimainkan.</p></div>
        <FieldLabel className=" [&_textarea]:min-h-[92px]">Judul Act<input required maxLength={160} value={actTitle} onChange={event => setActTitle(event.target.value)} placeholder="Contoh: Act 1 - Cahaya di Balik Pepohonan" /></FieldLabel>
        <FieldLabel className=" [&_textarea]:min-h-[92px]">Ringkasan Act<textarea rows={5} maxLength={5000} value={actOutline} onChange={event => setActOutline(event.target.value)} placeholder="Tujuan party, konflik, kejadian penting, dan cliffhanger..." /></FieldLabel>
        <div className="story-form-actions [grid-column:1/-1] [display:flex] [justify-content:flex-end] [gap:8px] [padding-top:12px] [border-top:1px_solid_#393a3e] [&_.field-label]:[min-width:125px] max-[650px]:[grid-column:auto] max-[650px]:[justify-content:stretch] max-[650px]:[&_>_*]:[flex:1]"><Button variant="primary" disabled={saving}>{saving ? "Menyimpan..." : editingAct ? "Simpan perubahan" : "+ Simpan Act"}</Button>{editingAct && <Button type="button" variant="secondary" onClick={() => { setEditingAct(null); setActTitle(""); setActOutline(""); }}>Batal</Button>}</div>
      </PanelForm>
      {busy ? <EmptyState as="div">Memuat Act...</EmptyState> : acts.length ? <Panel as="section" className="story-note-list [display:block] [&_.story-scene]:[margin:0]"><StoryCardLayout>{acts.map(act => <article className="story-scene [margin:0_0_9px] [padding:12px] [border:1px_solid_#46423b] [border-radius:6px] [background:linear-gradient(140deg,_#25252a,_#201f20)] [&_h3]:[margin:0_0_6px] [&_h3]:[color:#ebdcc1] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-size:15px] [&_h3]:[font-weight:500] [&_p]:[margin:0] [&_p]:[color:#aaa394] [&_p]:[font-size:11px] [&_p]:[line-height:1.55] [&_p]:[white-space:pre-wrap] [&:not(.expanded)_>_p]:[display:-webkit-box] [&:not(.expanded)_>_p]:[overflow:hidden] [&:not(.expanded)_>_p]:[-webkit-box-orient:vertical] [&:not(.expanded)_>_p]:[-webkit-line-clamp:4] [&.expanded_>_p]:[-webkit-line-clamp:unset]" key={act.id}><button type="button" className="story-act-open [display:block] [width:100%] [padding:0] [border:0] [background:transparent] [color:inherit] [text-align:left] [cursor:pointer] [&_h3]:[margin:0_0_8px] [&_h3]:[color:#eee0c7] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-size:18px]" onClick={() => { setSelectedActId(act.id); setStorySubtab("flow"); }}><h3>{act.name}</h3><span className="story-act-summary [display:-webkit-box] [overflow:hidden] [color:#c4bba9] [font-size:13px] [line-height:1.5] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">{act.note || "Belum ada ringkasan Act."}</span><span className="story-act-open-label [display:inline-block] [margin-top:10px] [color:#d5b77f] [font-size:12px]">Buka alur ›</span></button><div className="story-scene-actions [display:flex] [align-items:center] [flex-wrap:wrap] [gap:4px] [margin-top:10px] [&_button]:[min-height:27px] [&_button]:[padding:4px_7px] [&_button]:[font-size:10px]"><Button type="button" variant="secondary" onClick={() => { setEditingAct(act); setActTitle(act.name); setActOutline(act.note ?? ""); }}>Ubah</Button><Button type="button" variant="secondary" onClick={() => setDetailAct(act)}>Detail</Button><Button type="button" variant="quiet" onClick={() => void deleteNote(act.id)}>Hapus</Button></div></article>)}</StoryCardLayout></Panel> : <EmptyState as="div"><h3>Mulai dari kerangka Act</h3><p>Scene baru terbuka setelah Act pertama disimpan.</p></EmptyState>}
      {detailAct && <StoryModal id="act-detail-title" eyebrow="DETAIL ACT" title={detailAct.name} onClose={() => setDetailAct(null)}><p className="story-act-modal-note [margin:0] [color:#c4bba9] [white-space:pre-wrap]">{detailAct.note || "Belum ada ringkasan Act."}</p></StoryModal>}
    </>}</> : <>
      <PanelForm className="story-create story-note-form p-[22px] max-[650px]:p-4 [display:grid] [grid-template-columns:minmax(0,_1.6fr)_minmax(220px,_0.8fr)] [align-items:start] [gap:14px_22px] [margin-bottom:16px] [padding:22px] [&_h2]:[margin:5px_0] [&_h2]:[font-size:23px] [&_p]:[margin:0] [&_p]:[color:#aaa394] [&_p]:[font-size:12px] [&_p]:[line-height:1.55] [&_.field-label]:[margin:0] [&_.field-label_>_span]:[color:#938a7d] [&_.field-label_>_span]:[font-size:10px] [&_.field-label_textarea]:[min-height:92px] [&_.story-title-field_input]:[min-height:42px] [&_.story-title-field_input]:[font-size:13px] max-[1000px]:[grid-template-columns:minmax(0,_1.35fr)_minmax(210px,_0.8fr)] max-[650px]:[grid-template-columns:1fr] max-[650px]:[padding:16px] [&_select[multiple]]:[min-height:76px] [grid-template-columns:minmax(220px,_1fr)_minmax(180px,_0.8fr)_minmax(_230px,_1.2fr_)_auto] max-[1000px]:[grid-template-columns:1fr_1fr] max-[1000px]:[&_>_div:first-child]:[grid-column:1/-1] max-[650px]:[&_>_div:first-child]:[grid-column:auto]" onSubmit={addStoryNote}><div><Eyebrow>{tab === "threats" ? "CLOCK & ANTAGONIS" : "JANJI & PETUNJUK"}</Eyebrow><h2>{tab === "threats" ? "Catat ancaman" : "Catat benang merah"}</h2><p>{tab === "threats" ? "Tulis ancaman dan akibatnya jika party tidak bertindak." : "Simpan janji, rahasia, atau pertanyaan yang masih menggantung."}</p></div><FieldLabel className=" [&_textarea]:min-h-[92px]">Judul<input required maxLength={160} value={threatTitle} onChange={event => setThreatTitle(event.target.value)} placeholder={tab === "threats" ? "Contoh: Ritual kultus selesai" : "Contoh: Mira berutang budi"} /></FieldLabel><FieldLabel className=" [&_textarea]:min-h-[92px]">Catatan<textarea rows={3} maxLength={5000} value={threatNote} onChange={event => setThreatNote(event.target.value)} placeholder={tab === "threats" ? "Apa yang terjadi jika pemain tidak bertindak?" : "Apa yang perlu diingat DM?"} /></FieldLabel><div className="story-form-actions [grid-column:1/-1] [display:flex] [justify-content:flex-end] [gap:8px] [padding-top:12px] [border-top:1px_solid_#393a3e] [&_.field-label]:[min-width:125px] max-[650px]:[grid-column:auto] max-[650px]:[justify-content:stretch] max-[650px]:[&_>_*]:[flex:1]">{tab === "threats" && <FieldLabel className=" [&_textarea]:min-h-[92px]">Ukuran clock<select value={clockSize} onChange={event => setClockSize(Number(event.target.value) as 4 | 6 | 8)}><option value={4}>4 langkah</option><option value={6}>6 langkah</option><option value={8}>8 langkah</option></select></FieldLabel>}<FieldLabel className=" [&_textarea]:min-h-[92px]">Status<select value={threatStatus} onChange={event => setThreatStatus(event.target.value as typeof threatStatus)}>{columns.map(option => <option key={option.status} value={option.status}>{option.title}</option>)}</select></FieldLabel><Button variant="primary" disabled={saving}>+ Simpan</Button></div></PanelForm>
      {busy ? <EmptyState as="div">Memuat catatan...</EmptyState> : visibleNotes.length ? <Panel as="section" className="story-note-list [display:block] [&_.story-scene]:[margin:0]"><StoryCardLayout>{visibleNotes.map(note => <article className="story-scene [margin:0_0_9px] [padding:12px] [border:1px_solid_#46423b] [border-radius:6px] [background:linear-gradient(140deg,_#25252a,_#201f20)] [&_h3]:[margin:0_0_6px] [&_h3]:[color:#ebdcc1] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-size:15px] [&_h3]:[font-weight:500] [&_p]:[margin:0] [&_p]:[color:#aaa394] [&_p]:[font-size:11px] [&_p]:[line-height:1.55] [&_p]:[white-space:pre-wrap] [&:not(.expanded)_>_p]:[display:-webkit-box] [&:not(.expanded)_>_p]:[overflow:hidden] [&:not(.expanded)_>_p]:[-webkit-box-orient:vertical] [&:not(.expanded)_>_p]:[-webkit-line-clamp:4] [&.expanded_>_p]:[-webkit-line-clamp:unset]" key={note.id}><h3>{note.name}</h3><p>{note.note || (tab === "threats" ? "Belum ada pemicu atau akibat yang dicatat." : "Belum ada detail tambahan.")}</p>{tab === "threats" && <div className="story-clock [display:flex] [align-items:center] [gap:5px] [margin:11px_0_2px] [&_>_span]:[width:17px] [&_>_span]:[height:17px] [&_>_span]:[border:1px_solid_#807054] [&_>_span]:[border-radius:50%] [&_>_span]:[background:#191a1f] [&_>_span.filled]:[background:#bd9250] [&_>_span.filled]:[box-shadow:inset_0_0_0_3px_#29251f] [&_small]:[margin:0_3px] [&_small]:[color:#cbb58e] [&_small]:[font-size:10px] [&_button]:[width:28px] [&_button]:[height:28px] [&_button]:[border:1px_solid_#46413a] [&_button]:[border-radius:4px] [&_button]:[background:#292721] [&_button]:[color:#ead6ad] [&_button:disabled]:[opacity:0.4]" aria-label={`Clock ${note.progress} dari ${note.clockSize}`}>{Array.from({ length: note.clockSize }, (_, index) => <span key={index} className={index < note.progress ? "filled" : ""} />)}<small>{note.progress}/{note.clockSize}</small><button type="button" aria-label={`Kurangi progress ${note.name}`} disabled={note.progress === 0} onClick={() => void changeNoteProgress(note.id, note.progress - 1)}>-</button><button type="button" aria-label={`Tambah progress ${note.name}`} disabled={note.progress >= note.clockSize} onClick={() => void changeNoteProgress(note.id, note.progress + 1)}>+</button></div>}<div className="story-scene-actions [display:flex] [align-items:center] [flex-wrap:wrap] [gap:4px] [margin-top:10px] [&_button]:[min-height:27px] [&_button]:[padding:4px_7px] [&_button]:[font-size:10px]"><label className="sr-only" htmlFor={`note-status-${note.id}`}>Status {note.name}</label><select id={`note-status-${note.id}`} value={note.status} onChange={event => void updateNote(note.id, event.target.value as "TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED")}>{columns.map(option => <option key={option.status} value={option.status}>{option.title}</option>)}</select><Button type="button" variant="quiet" onClick={() => void deleteNote(note.id)}>Hapus</Button></div></article>)}</StoryCardLayout></Panel> : <EmptyState as="div"><h3>{tab === "threats" ? "Belum ada ancaman" : "Benang merah masih kosong"}</h3><p>{tab === "threats" ? "Catat tekanan yang berkembang bila party menunda." : "Simpan janji, rahasia, atau pertanyaan supaya tidak terlupa."}</p></EmptyState>}
    </>}
  </section>;
}
