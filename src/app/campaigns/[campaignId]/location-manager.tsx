"use client";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { FieldRow } from "../../../components/ui/field-row";
import { Panel, PanelForm } from "../../../components/ui/panel";








type MapLink = { id: string; name: string };
type Location = { id: string; parentId: string | null; name: string; type: string; description: string | null; readAloud: string | null; dmNotes?: string | null; imageUrl: string | null; visibility: string; maps: MapLink[] };
type LocationForm = { name: string; type: string; parentId: string; description: string; readAloud: string; dmNotes: string; imageUrl: string; visibility: string };
const blank: LocationForm = { name: "", type: "OTHER", parentId: "", description: "", readAloud: "", dmNotes: "", imageUrl: "", visibility: "DM_ONLY" };
const types = [["WORLD", "Dunia / benua"], ["REGION", "Region / kerajaan"], ["CITY", "Kota"], ["VILLAGE", "Desa"], ["DISTRICT", "Distrik / permukiman"], ["BUILDING", "Bangunan / usaha"], ["FOREST", "Hutan"], ["MOUNTAIN", "Pegunungan"], ["CAVE", "Gua"], ["DUNGEON", "Dungeon"], ["ROOM", "Ruangan / area"], ["OTHER", "Lainnya"]];
const typeLabel = (type: string) => types.find(([value]) => value === type)?.[1] ?? "Lainnya";
const typeEmoji: Record<string, string> = { WORLD: "🌍", REGION: "🏰", CITY: "🏙️", VILLAGE: "🏡", DISTRICT: "🏘️", BUILDING: "🏛️", FOREST: "🌲", MOUNTAIN: "⛰️", CAVE: "🪨", DUNGEON: "🕯️", ROOM: "🚪", OTHER: "📍" };

export function LocationManager({ campaignId, isDm, focusLocationId, onOpenMap }: { campaignId: string; isDm: boolean; focusLocationId: string | null; onOpenMap: (id: string | null) => void }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<LocationForm>(blank);
  const [editing, setEditing] = useState<Location | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/locations`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Lokasi gagal dimuat.");
    setLocations(result.locations);
  }, [campaignId]);
  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : "Lokasi gagal dimuat.")).finally(() => setLoading(false)); }, [load]);

  const includedIds = useMemo(() => {
    const included = new Set<string>();
    const children = new Map<string | null, Location[]>();
    for (const location of locations) children.set(location.parentId, [...(children.get(location.parentId) ?? []), location]);
    const matches = (location: Location) => location.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (!typeFilter || location.type === typeFilter) && (!visibilityFilter || location.visibility === visibilityFilter);
    const visit = (location: Location): boolean => {
      const descendantMatches = (children.get(location.id) ?? []).map(visit).some(Boolean);
      if (matches(location) || descendantMatches) included.add(location.id);
      return included.has(location.id);
    };
    (children.get(null) ?? []).forEach(visit);
    return { included, children };
  }, [locations, query, typeFilter, visibilityFilter]);

  const focusAncestors = useMemo(() => {
    const open = new Set<string>();
    let current = locations.find(location => location.id === focusLocationId);
    while (current && !open.has(current.id)) { open.add(current.id); current = locations.find(location => location.id === current?.parentId); }
    return open;
  }, [focusLocationId, locations]);

  function edit(location: Location) {
    setEditing(location);
    setFormOpen(true);
    setForm({ name: location.name, type: location.type, parentId: location.parentId ?? "", description: location.description ?? "", readAloud: location.readAloud ?? "", dmNotes: location.dmNotes ?? "", imageUrl: location.imageUrl ?? "", visibility: location.visibility });
    setError("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const updating = Boolean(editing); setSaving(true); setError(""); setStatus("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/locations${editing ? `/${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, parentId: form.parentId || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Lokasi tidak dapat disimpan.");
      setForm(blank); setEditing(null); setFormOpen(false); await load(); setStatus(updating ? "Perubahan lokasi tersimpan." : "Lokasi tersimpan.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lokasi tidak dapat disimpan."); }
    finally { setSaving(false); }
  }

  async function remove(location: Location) {
    if (!window.confirm(`Hapus lokasi “${location.name}”? Lokasi anak akan menjadi lokasi teratas; peta tetap disimpan.`)) return;
    const response = await fetch(`/api/campaigns/${campaignId}/locations/${location.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Lokasi tidak dapat dihapus."); return; }
    if (editing?.id === location.id) { setEditing(null); setForm(blank); setFormOpen(false); }
    await load(); setStatus("Lokasi dihapus. Lokasi anak dan peta tetap tersimpan.");
  }

  function renderLocation(location: Location): React.ReactNode {
    if (!includedIds.included.has(location.id)) return null;
    const children = (includedIds.children.get(location.id) ?? []).filter(item => includedIds.included.has(item.id));
    return <li key={location.id}><details className="location-tree-item [border:1px_solid_#414146] [border-radius:6px] [background:#191b20] [&_>_summary]:[display:flex] [&_>_summary]:[align-items:center] [&_>_summary]:[justify-content:space-between] [&_>_summary]:[gap:10px] [&_>_summary]:[padding:12px] [&_>_summary]:[cursor:pointer] [&_>_summary]:[list-style:none] [&_>_summary_>_span:first-child]:[display:grid] [&_>_summary_>_span:first-child]:[gap:4px] [&_>_summary_strong]:[color:#eee0c7] [&_>_summary_strong]:[font-family:var(--serif)] [&_>_summary_strong]:[font-size:15px] [&_>_summary_small]:[color:#a99f8c] [&_>_summary_small]:[font-size:10px] [&_>_summary_strong]:[display:flex] [&_>_summary_strong]:[align-items:center] [&_>_summary_strong]:[gap:8px]" open={focusAncestors.has(location.id) || undefined}><summary><span><strong><span className="location-type-emoji [display:grid] [place-items:center] [flex:none] [width:28px] [height:28px] [border:1px_solid_#5a4b37] [border-radius:6px] [background:#24211b] [font-size:17px] [line-height:1]" aria-hidden="true">{typeEmoji[location.type] ?? "📍"}</span>{location.name}</strong><small>{typeLabel(location.type)} · {children.length} lokasi di dalam</small></span><span className={`location-visibility  [color:#a99f8c] [font-size:10px] [padding:4px_7px] [border-radius:12px] [background:#322d24] [&.private]:[color:#dfb99a] [&.shared]:[color:#b7cea4]${location.visibility === "DM_ONLY" ? "private" : "shared"}`}>{location.visibility === "DM_ONLY" ? "DM" : "Pemain"}</span></summary><div className="location-detail [padding:0_12px_12px] [color:#c4bba9] [font-size:12px] [line-height:1.6] [&_>_p]:[white-space:pre-wrap] [&_blockquote]:[margin:8px_0] [&_blockquote]:[padding:9px_12px] [&_blockquote]:[border-left:2px_solid_#927344] [&_blockquote]:[background:#141519] [&_blockquote]:[white-space:pre-wrap]"><p>{location.description || "Belum ada deskripsi."}</p>{location.readAloud && <blockquote>{location.readAloud}</blockquote>}{isDm && location.dmNotes && <p className="location-dm-notes [padding:9px_12px] [border-left:2px_solid_#a36a64] [background:#21191a] [color:#e1b8ad] [white-space:pre-wrap]"><b>Catatan DM:</b> {location.dmNotes}</p>}{location.imageUrl && <a href={location.imageUrl} target="_blank" rel="noreferrer">Buka gambar pendukung ↗</a>}{location.maps.length > 0 ? <div className="location-map-links [display:flex] [align-items:center] [flex-wrap:wrap] [gap:6px] [&_>_small]:[color:#a18a65] [&_>_small]:[font-size:8px] [&_>_small]:[letter-spacing:0.12em] [&_button]:[min-height:32px]"><small>PETA TERKAIT</small>{location.maps.map(map => <Button type="button" variant="quiet" key={map.id} onClick={() => onOpenMap(map.id)}>{map.name} ↗</Button>)}</div> : <div className="location-map-links [display:flex] [align-items:center] [flex-wrap:wrap] [gap:6px] [&_>_small]:[color:#a18a65] [&_>_small]:[font-size:8px] [&_>_small]:[letter-spacing:0.12em] [&_button]:[min-height:32px]"><small>Belum ada peta terkait</small><Button type="button" variant="quiet" onClick={() => onOpenMap(null)}>Tambah atau hubungkan peta</Button></div>}{isDm && <div className="story-scene-actions [display:flex] [align-items:center] [flex-wrap:wrap] [gap:4px] [margin-top:10px] [&_button]:[min-height:27px] [&_button]:[padding:4px_7px] [&_button]:[font-size:10px]"><Button type="button" variant="quiet" onClick={() => edit(location)}>Ubah</Button><Button type="button" variant="quiet" onClick={() => void remove(location)}>Hapus</Button></div>}{children.length > 0 && <ul className="location-tree [display:grid] [gap:8px] [margin:0] [padding:0] [list-style:none] [&_.location-tree]:[margin:10px_0_0_12px] [&_.location-tree]:[padding-left:12px] [&_.location-tree]:[border-left:1px_solid_#51483a]">{children.map(renderLocation)}</ul>}</div></details></li>;
  }

  const parentOptions = locations.filter(location => {
    if (!editing) return true;
    let current: Location | undefined = location; const seen = new Set<string>();
    while (current && !seen.has(current.id)) { if (current.id === editing.id) return false; seen.add(current.id); current = locations.find(item => item.id === current?.parentId); }
    return true;
  });

  return <div className={`location-manager [display:grid] [grid-template-columns:minmax(280px,_0.78fr)_minmax(0,_1.22fr)] [align-items:start] [gap:14px] [&:not(.form-open)]:[grid-template-columns:1fr] max-[900px]:[grid-template-columns:1fr] [&.player-view]:[grid-template-columns:1fr]${isDm ? "" : " player-view"}${formOpen ? " form-open" : ""}`}>
    {isDm && formOpen && <PanelForm className="location-form [min-width:0]" onSubmit={save}><SectionHeading className=""><div><Eyebrow>DATA DUNIA</Eyebrow><h2>{editing ? "Ubah lokasi" : "Tempat baru"}</h2><p>Peta dan gambar tidak wajib.</p></div><Button type="button" variant="quiet" onClick={() => { setFormOpen(false); setEditing(null); setForm(blank); }}>Tutup</Button></SectionHeading><FieldLabel className="">Nama lokasi<input required maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></FieldLabel><FieldRow ><FieldLabel className="">Jenis lokasi<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>{types.map(([value, label]) => <option key={value} value={value}>{typeEmoji[value]} {label}</option>)}</select></FieldLabel><FieldLabel className="">Lokasi induk<select value={form.parentId} onChange={event => setForm({ ...form, parentId: event.target.value })}><option value="">Tanpa induk · tingkat teratas</option>{parentOptions.map(location => <option key={location.id} value={location.id}>{typeEmoji[location.type]} {location.name}</option>)}</select></FieldLabel></FieldRow><FieldLabel className="">Deskripsi<textarea rows={3} maxLength={10000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></FieldLabel><FieldLabel className="">Teks read-aloud<textarea rows={3} maxLength={10000} value={form.readAloud} onChange={event => setForm({ ...form, readAloud: event.target.value })} /></FieldLabel><FieldLabel className="">Catatan DM<textarea rows={3} maxLength={10000} value={form.dmNotes} onChange={event => setForm({ ...form, dmNotes: event.target.value })} /></FieldLabel><FieldLabel className="">URL gambar pendukung<input type="url" maxLength={2048} value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Visibilitas<select value={form.visibility} onChange={event => setForm({ ...form, visibility: event.target.value })}><option value="DM_ONLY">Hanya DM</option><option value="PLAYER_VISIBLE">DM dan pemain</option></select></FieldLabel>{error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}{status && <StatusMessage variant="toast" role="status">{status}</StatusMessage>}<div className="story-scene-actions [display:flex] [align-items:center] [flex-wrap:wrap] [gap:4px] [margin-top:10px] [&_button]:[min-height:27px] [&_button]:[padding:4px_7px] [&_button]:[font-size:10px]"><Button variant="primary" disabled={saving}>{saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan lokasi"}</Button>{editing && <Button type="button" variant="secondary" onClick={() => { setEditing(null); setForm(blank); setFormOpen(false); }}>Batal</Button>}</div></PanelForm>}
    <Panel as="section" className="location-list [min-width:0]"><SectionHeading className=""><div><Eyebrow>HIERARKI KAMPANYE</Eyebrow><h2>Lokasi <span className="count-pill">{locations.length}</span></h2></div>{isDm && <Button type="button" variant="primary" onClick={() => { setEditing(null); setForm(blank); setFormOpen(open => !open); }}>{formOpen ? "Tutup form" : "+ Tambah lokasi"}</Button>}</SectionHeading><div className="location-filters [display:grid] [grid-template-columns:1fr_1fr] [gap:8px] [margin-bottom:14px] [&_input]:[width:100%] [&_input]:[min-width:0] [&_input]:[min-height:38px] [&_input]:[padding:9px_10px] [&_input]:[border:1px_solid_#494950] [&_input]:[border-radius:5px] [&_input]:[background:#15171c] [&_input]:[color:#eee4d2] [&_input]:[font-size:12px] [&_select]:[width:100%] [&_select]:[min-width:0] [&_select]:[min-height:38px] [&_select]:[padding:9px_10px] [&_select]:[border:1px_solid_#494950] [&_select]:[border-radius:5px] [&_select]:[background:#15171c] [&_select]:[color:#eee4d2] [&_select]:[font-size:12px] [&_input]:[grid-column:1/-1] [&_input::placeholder]:[color:#756f66] max-[650px]:[grid-template-columns:1fr] max-[650px]:[&_input]:[grid-column:auto]"><label className="sr-only" htmlFor="location-search">Cari lokasi</label><input id="location-search" type="search" placeholder="Cari nama lokasi…" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Filter jenis lokasi" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="">Semua jenis</option>{types.map(([value, label]) => <option key={value} value={value}>{typeEmoji[value]} {label}</option>)}</select>{isDm && <select aria-label="Filter visibilitas lokasi" value={visibilityFilter} onChange={event => setVisibilityFilter(event.target.value)}><option value="">Semua visibilitas</option><option value="DM_ONLY">Hanya DM</option><option value="PLAYER_VISIBLE">DM dan pemain</option></select>}</div>{error && !isDm && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}{loading ? <EmptyState as="div" role="status">Memuat lokasi…</EmptyState> : locations.length && (includedIds.children.get(null) ?? []).some(location => includedIds.included.has(location.id)) ? <ul className="location-tree [display:grid] [gap:8px] [margin:0] [padding:0] [list-style:none] [&_.location-tree]:[margin:10px_0_0_12px] [&_.location-tree]:[padding-left:12px] [&_.location-tree]:[border-left:1px_solid_#51483a]">{(includedIds.children.get(null) ?? []).map(renderLocation)}</ul> : <EmptyState as="div"><h3>{locations.length ? "Tidak ada hasil" : "Belum ada lokasi"}</h3><p>{locations.length ? "Coba ubah kata pencarian atau filter." : "Lokasi dapat disimpan dan dipakai tanpa peta."}</p></EmptyState>}</Panel>
  </div>;
}
