"use client";
import { EmptyEmblem } from "@/components/ui/empty-emblem";
import { PanelCopy } from "@/components/ui/panel-copy";
import { Eyebrow } from "@/components/ui/eyebrow";

/* eslint-disable @next/next/no-img-element -- Map images use an authenticated campaign route. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { Panel, PanelForm } from "../../../components/ui/panel";







type Location = { id: string; name: string; parentId: string | null; type: string; description: string | null; readAloud: string | null; dmNotes?: string | null; visibility: string };
type Marker = { id: string; locationId: string | null; label: string | null; x: number; y: number; visibility: string; location: Location | null };
type MapRow = { id: string; name: string; mapType: string; description: string | null; relatedLocationId: string | null; markers: Marker[]; relatedLocation: Location | null };
const mapTypes = [["WORLD", "Dunia"], ["REGION", "Region"], ["CITY", "Kota"], ["DUNGEON", "Dungeon"], ["BATTLEMAP", "Battlemap"], ["OTHER", "Lainnya"]];

export function MapManager({ campaignId, isDm, focusMapId, onOpenLocation }: { campaignId: string; isDm: boolean; focusMapId: string | null; onOpenLocation: (id: string) => void }) {
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [mapType, setMapType] = useState("OTHER");
  const [relatedLocationId, setRelatedLocationId] = useState("");
  const [description, setDescription] = useState("");
  const [addingMarker, setAddingMarker] = useState(false);
  const [movingMarkerId, setMovingMarkerId] = useState("");
  const [markerLocationId, setMarkerLocationId] = useState("");
  const [markerLabel, setMarkerLabel] = useState("");
  const [markerVisibility, setMarkerVisibility] = useState("DM_ONLY");
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState("OTHER");
  const [activeMarkerId, setActiveMarkerId] = useState("");
  const [editingMarkerLabel, setEditingMarkerLabel] = useState("");
  const [editingMarkerLocationId, setEditingMarkerLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [mapResponse, locationResponse] = await Promise.all([fetch(`/api/campaigns/${campaignId}/maps`), fetch(`/api/campaigns/${campaignId}/locations`)]);
    const [mapResult, locationResult] = await Promise.all([mapResponse.json(), locationResponse.json()]);
    if (!mapResponse.ok || !locationResponse.ok) throw new Error("Data peta gagal dimuat.");
    setMaps(mapResult.maps); setLocations(locationResult.locations);
  }, [campaignId]);
  useEffect(() => { load().catch(cause => setError(cause instanceof Error ? cause.message : "Data peta gagal dimuat.")).finally(() => setLoading(false)); }, [load]);
  useEffect(() => { if (focusMapId && maps.some(map => map.id === focusMapId)) setSelectedId(focusMapId); }, [focusMapId, maps]);

  const selected = maps.find(map => map.id === selectedId) ?? null;
  const selectedMapName = selected?.name;
  const selectedMapType = selected?.mapType;
  const selectedRelatedLocationId = selected?.relatedLocationId;
  const selectedMapDescription = selected?.description;
  const activeMarker = selected?.markers.find(marker => marker.id === activeMarkerId) ?? null;
  const parentNames = useMemo(() => new Map(locations.map(location => [location.id, location.name])), [locations]);
  useEffect(() => { if (selectedMapName !== undefined) { setName(selectedMapName); setMapType(selectedMapType ?? "OTHER"); setRelatedLocationId(selectedRelatedLocationId ?? ""); setDescription(selectedMapDescription ?? ""); setActiveMarkerId(""); setAddingMarker(false); setMovingMarkerId(""); } }, [selectedId, selectedMapName, selectedMapType, selectedRelatedLocationId, selectedMapDescription]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setSaving(true); setError(""); setStatus("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/maps`, { method: "POST", body: new FormData(form) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Peta gagal diunggah.");
      await load(); setSelectedId(result.map.id); form.reset(); setStatus("Peta berhasil diunggah.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Peta gagal diunggah."); }
    finally { setSaving(false); }
  }

  async function saveMap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setSaving(true); setError(""); setStatus("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/maps/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mapType, relatedLocationId: relatedLocationId || null, description }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Detail peta gagal disimpan."); await load(); setStatus("Detail peta tersimpan.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Detail peta gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function removeMap(map: MapRow) {
    if (!window.confirm(`Hapus peta “${map.name}”? Lokasi tetap tersimpan.`)) return;
    const response = await fetch(`/api/campaigns/${campaignId}/maps/${map.id}`, { method: "DELETE" });
    if (!response.ok) { setError("Peta gagal dihapus."); return; }
    setSelectedId(""); await load(); setStatus("Peta dihapus. Lokasi tetap tersimpan.");
  }

  async function placeMarker(event: React.MouseEvent<HTMLDivElement>) {
    if (!selected || (!addingMarker && !movingMarkerId)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    const response = await fetch(`/api/campaigns/${campaignId}/maps/${selected.id}/markers`, { method: movingMarkerId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(movingMarkerId ? { id: movingMarkerId, x, y } : { locationId: markerLocationId || null, label: markerLabel || null, visibility: markerVisibility, x, y }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Marker gagal disimpan."); return; }
    setAddingMarker(false); setMovingMarkerId(""); setActiveMarkerId(result.marker.id); setError(""); setStatus(movingMarkerId ? "Marker dipindahkan." : "Marker ditambahkan."); await load();
  }

  async function saveMarker() {
    if (!selected || !activeMarker) return;
    const response = await fetch(`/api/campaigns/${campaignId}/maps/${selected.id}/markers`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeMarker.id, label: editingMarkerLabel, locationId: editingMarkerLocationId || null }) });
    const result = await response.json(); if (!response.ok) { setError(result.error ?? "Marker gagal diubah."); return; }
    setError(""); await load(); setStatus("Label marker tersimpan.");
  }

  async function createMarkerLocation() {
    const response = await fetch(`/api/campaigns/${campaignId}/locations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newLocationName, type: newLocationType, visibility: markerVisibility }) });
    const result = await response.json(); if (!response.ok) { setError(result.error ?? "Lokasi gagal dibuat."); return; }
    await load(); setMarkerLocationId(result.location.id); setNewLocationName(""); setStatus("Lokasi dibuat dan dipilih untuk marker."); setError("");
  }

  async function removeMarker(marker: Marker) {
    if (!selected) return;
    const response = await fetch(`/api/campaigns/${campaignId}/maps/${selected.id}/markers`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: marker.id }) });
    if (!response.ok) { setError("Marker gagal dihapus."); return; }
    setActiveMarkerId(""); await load(); setStatus("Marker dihapus.");
  }

  return <div className={`map-manager max-[900px]:[grid-template-columns:1fr] [&.player-view]:[grid-template-columns:1fr]${isDm ? "" : " player-view"}`}>
    {isDm && <PanelForm className="map-upload [min-width:0]" onSubmit={upload}><Eyebrow>PETA KAMPANYE</Eyebrow><h2>Tambah peta</h2><PanelCopy>PNG, JPEG, atau WebP hingga 15 MB. Lokasi tetap dapat digunakan tanpa peta.</PanelCopy><FieldLabel className="">Nama peta<input name="name" required maxLength={120} /></FieldLabel><FieldLabel className="">File peta<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required /></FieldLabel><FieldLabel className="">Jenis peta<select name="mapType" defaultValue="OTHER">{mapTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FieldLabel><FieldLabel className="">Lokasi terkait<select name="relatedLocationId" defaultValue=""><option value="">Tidak terkait</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel><FieldLabel className="">Deskripsi<textarea name="description" rows={2} maxLength={10000} /></FieldLabel><Button variant="primary" disabled={saving}>{saving ? "Mengunggah…" : "Unggah peta"}</Button></PanelForm>}
    <Panel as="section" className="map-library [min-width:0]"><SectionHeading className=""><div><Eyebrow>PETA KAMPANYE</Eyebrow><h2>Perpustakaan peta <span className="count-pill">{maps.length}</span></h2></div></SectionHeading>{loading ? <EmptyState as="div" role="status">Memuat peta…</EmptyState> : maps.length ? <div className="map-gallery [display:grid] [grid-template-columns:repeat(auto-fill,_minmax(130px,_1fr))] [gap:8px]">{maps.map(map => <button type="button" className={`map-gallery-card [display:grid] [gap:7px] [padding:7px] [border:1px_solid_#414146] [border-radius:6px] [background:#191b20] [text-align:left] [cursor:pointer] [&.selected]:[border-color:#b18b54] [&.selected]:[box-shadow:0_0_0_1px_#b18b5480] [&_img]:[width:100%] [&_img]:[height:92px] [&_img]:[object-fit:cover] [&_img]:[border-radius:4px] [&_strong]:[display:block] [&_strong]:[overflow:hidden] [&_strong]:[text-overflow:ellipsis] [&_strong]:[white-space:nowrap] [&_small]:[display:block] [&_small]:[overflow:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] [&_strong]:[color:#eee0c7] [&_strong]:[font-size:11px] [&_small]:[margin-top:3px] [&_small]:[color:#a99f8c] [&_small]:[font-size:9px]${selectedId === map.id ? " selected" : ""}`} key={map.id} onClick={() => setSelectedId(map.id)}><img src={`/api/campaigns/${campaignId}/maps/${map.id}`} alt="" /><span><strong>{map.name}</strong><small>{mapTypes.find(([value]) => value === map.mapType)?.[1] ?? "Lainnya"}</small></span></button>)}</div> : <EmptyState as="div"><EmptyEmblem>◇</EmptyEmblem><h3>Belum ada peta</h3><p>Lokasi tetap dapat dibuat dan digunakan tanpa peta.</p></EmptyState>}</Panel>
    {selected && <Panel as="section" className="map-detail [min-width:0] [grid-column:1/-1] max-[900px]:[grid-column:auto]"><SectionHeading variant="centered"><div><Eyebrow>PETA INTERAKTIF</Eyebrow><h2>{selected.name}</h2></div>{isDm && <Button type="button" variant="danger" onClick={() => void removeMap(selected)}>Hapus peta</Button>}</SectionHeading><div className={`map-canvas [position:relative] [display:block] [width:100%] [overflow:hidden] [line-height:0] [border:1px_solid_#49443b] [border-radius:6px] [background:#141519] [&_img]:[display:block] [&_img]:[width:100%] [&_img]:[height:auto] [&.placing-marker]:[cursor:crosshair]${addingMarker || movingMarkerId ? " placing-marker" : ""}`} onClick={placeMarker}><img src={`/api/campaigns/${campaignId}/maps/${selected.id}`} alt={`Peta ${selected.name}`} />{selected.markers.map(marker => <button type="button" key={marker.id} className="map-marker [position:absolute] [display:grid] [place-items:center] [width:30px] [height:30px] [transform:translate(-50%,_-50%)] [border:1px_solid_#f0d49e] [border-radius:50%] [background:#35291fe8] [color:#ffe4ad] [font-size:18px] [line-height:1] [cursor:pointer]" style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }} aria-label={`Marker ${marker.label || marker.location?.name || "lokasi"}`} onClick={event => { event.stopPropagation(); setActiveMarkerId(marker.id); setEditingMarkerLabel(marker.label || marker.location?.name || ""); setEditingMarkerLocationId(marker.locationId ?? ""); }}><span>⌖</span></button>)}</div>{selected.relatedLocation && <p className="map-hint [margin:9px_0] [color:#b6a582] [font-size:11px]">Lokasi terkait: <Button type="button" variant="quiet" onClick={() => { if (selected.relatedLocation) onOpenLocation(selected.relatedLocation.id); }}>{selected.relatedLocation.name} ↗</Button></p>}{(addingMarker || movingMarkerId) && <p className="map-hint [margin:9px_0] [color:#b6a582] [font-size:11px]" role="status">{movingMarkerId ? "Klik posisi baru marker pada peta." : "Klik posisi marker pada peta."}</p>}
      {isDm && <><form className="map-metadata [display:grid] [grid-template-columns:1fr_1fr] [gap:0_10px] [margin-top:13px] [padding-top:12px] [border-top:1px_solid_#403d38] [&_.field-label:first-child]:[grid-column:1/-1] [&_.field-label:nth-child(4)]:[grid-column:1/-1] max-[650px]:[grid-template-columns:1fr] max-[650px]:[&_.field-label:first-child]:[grid-column:auto] max-[650px]:[&_.field-label:nth-child(4)]:[grid-column:auto]" onSubmit={saveMap}><FieldLabel className="">Nama peta<input value={name} maxLength={120} onChange={event => setName(event.target.value)} required /></FieldLabel><FieldLabel className="">Jenis peta<select value={mapType} onChange={event => setMapType(event.target.value)}>{mapTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FieldLabel><FieldLabel className="">Lokasi terkait<select value={relatedLocationId} onChange={event => setRelatedLocationId(event.target.value)}><option value="">Tidak terkait</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel><FieldLabel className="">Deskripsi<textarea rows={2} maxLength={10000} value={description} onChange={event => setDescription(event.target.value)} /></FieldLabel><Button variant="secondary" disabled={saving}>Simpan detail peta</Button></form><div className="map-marker-tools [display:flex] [align-items:center] [flex-wrap:wrap] [gap:7px] [margin-top:10px] [&_select]:[min-height:38px] [&_select]:[max-width:220px] [&_input]:[min-height:38px] [&_input]:[max-width:220px]"><Button type="button" variant="secondary" onClick={() => { setAddingMarker(!addingMarker); setMovingMarkerId(""); setError(""); }}>＋ Tambah marker</Button>{addingMarker && <><select aria-label="Lokasi marker" value={markerLocationId} onChange={event => setMarkerLocationId(event.target.value)}><option value="">Marker tanpa lokasi</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select><input aria-label="Label marker" value={markerLabel} onChange={event => setMarkerLabel(event.target.value)} placeholder="Label (opsional)" /><select aria-label="Visibilitas marker" value={markerVisibility} onChange={event => setMarkerVisibility(event.target.value)}><option value="DM_ONLY">Hanya DM</option><option value="PLAYER_VISIBLE">DM dan pemain</option></select><div className="marker-create-location"><input value={newLocationName} maxLength={160} onChange={event => setNewLocationName(event.target.value)} placeholder="Nama lokasi baru" /><select aria-label="Jenis lokasi baru" value={newLocationType} onChange={event => setNewLocationType(event.target.value)}>{[["OTHER", "Lainnya"], ["CITY", "Kota"], ["BUILDING", "Bangunan"], ["FOREST", "Hutan"], ["CAVE", "Gua"], ["DUNGEON", "Dungeon"], ["ROOM", "Ruangan"], ["REGION", "Region"], ["VILLAGE", "Desa"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button type="button" variant="quiet" disabled={!newLocationName.trim()} onClick={() => void createMarkerLocation()}>Buat & pilih lokasi</Button></div></>}</div></>}
      {activeMarker && <article className="map-marker-detail [display:grid] [grid-template-columns:1fr_1fr] [gap:14px] [margin-top:12px] [padding:12px] [border:1px_solid_#44413c] [border-radius:6px] [background:#191b20] [color:#d1c7b5] [font-size:12px] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[color:#eee0c7] [&_small]:[margin-top:4px] [&_small]:[color:#a99f8c] [&_p]:[white-space:pre-wrap] [&_blockquote]:[white-space:pre-wrap] max-[650px]:[grid-template-columns:1fr]"><div><strong>{activeMarker.label || activeMarker.location?.name || "Marker"}</strong>{activeMarker.location && <><small>{typeLabel(activeMarker.location.type)}{parentNames.has(activeMarker.location.parentId ?? "") ? ` · ${parentNames.get(activeMarker.location.parentId!)}` : ""}</small><p>{activeMarker.location.description || "Belum ada deskripsi lokasi."}</p>{activeMarker.location.readAloud && <blockquote>{activeMarker.location.readAloud}</blockquote>}{isDm && activeMarker.location.dmNotes && <p className="location-dm-notes [padding:9px_12px] [border-left:2px_solid_#a36a64] [background:#21191a] [color:#e1b8ad] [white-space:pre-wrap]"><b>Catatan DM:</b> {activeMarker.location.dmNotes}</p>}<Button type="button" variant="quiet" onClick={() => onOpenLocation(activeMarker.location!.id)}>Buka lokasi ↗</Button></>}</div>{isDm && <div className="map-marker-actions [display:grid] [align-content:start] [gap:5px] [&_.field-label]:[margin:0]"><FieldLabel className="">Label<input value={editingMarkerLabel} onChange={event => setEditingMarkerLabel(event.target.value)} /></FieldLabel><FieldLabel className="">Lokasi<select value={editingMarkerLocationId} onChange={event => setEditingMarkerLocationId(event.target.value)}><option value="">Tanpa lokasi</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel><Button type="button" variant="quiet" onClick={() => void saveMarker()}>Simpan marker</Button><Button type="button" variant="quiet" onClick={() => { setMovingMarkerId(activeMarker.id); setActiveMarkerId(""); }}>Pindahkan</Button><Button type="button" variant="quiet" onClick={() => void removeMarker(activeMarker)}>Hapus marker</Button></div>}</article>}
      {isDm && <p className="map-hint [margin:9px_0] [color:#b6a582] [font-size:11px]">{selected.markers.length} marker · koordinat tetap mengikuti gambar saat ukuran berubah.</p>}
    </Panel>}
    {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}{status && <StatusMessage variant="toast" role="status">{status}</StatusMessage>}
  </div>;
}

function typeLabel(type: string) { return [["WORLD", "Dunia"], ["REGION", "Region"], ["CITY", "Kota"], ["VILLAGE", "Desa"], ["DISTRICT", "Distrik"], ["BUILDING", "Bangunan"], ["FOREST", "Hutan"], ["MOUNTAIN", "Pegunungan"], ["CAVE", "Gua"], ["DUNGEON", "Dungeon"], ["ROOM", "Ruangan"]].find(([value]) => value === type)?.[1] ?? "Lainnya"; }
