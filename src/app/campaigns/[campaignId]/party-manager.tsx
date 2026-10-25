"use client";
import { EmptyEmblem } from "@/components/ui/empty-emblem";
import { StepMark } from "@/components/ui/step-mark";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useCallback, useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { FieldRow } from "../../../components/ui/field-row";
import { Panel } from "../../../components/ui/panel";
import { StoryModal } from "@/components/ui/story-modal";
import { StoryCardLayout } from "@/components/ui/story-card-layout";








type Member = { id: string; name: string; playerName: string | null; species: string | null; className: string | null; level: number; background: string | null; currentHp: number; maxHp: number; tempHp: number; ac: number; initiativeBonus: number; passivePerception: number | null; speed: number; spellSaveDC: number | null; isActive: boolean };

function MemberFields({ member }: { member?: Member }) {
  return <>
    <FieldRow><FieldLabel className="">Nama karakter<input name="name" maxLength={100} required defaultValue={member?.name ?? ""} placeholder="Contoh: Arin" /></FieldLabel><FieldLabel className="">Level<input name="level" type="number" min="1" max="20" defaultValue={member?.level ?? 1} required /></FieldLabel><FieldLabel className="">AC<input name="ac" type="number" min="1" max="50" defaultValue={member?.ac ?? 10} required /></FieldLabel></FieldRow>
    <FieldRow><FieldLabel className="">Nama pemain<input name="playerName" maxLength={100} defaultValue={member?.playerName ?? ""} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Species<input name="species" maxLength={80} defaultValue={member?.species ?? ""} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Class<input name="className" maxLength={80} defaultValue={member?.className ?? ""} placeholder="Opsional" /></FieldLabel></FieldRow>
    <div className="field-row stat-row max-[650px]:[display:grid] max-[650px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[650px]:[gap:0_9px]"><FieldLabel className="">HP saat ini<input name="currentHp" type="number" min="0" max="10000" defaultValue={member?.currentHp ?? ""} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Max HP<input name="maxHp" type="number" min="1" max="10000" defaultValue={member?.maxHp ?? ""} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Temp HP<input name="tempHp" type="number" min="0" max="10000" defaultValue={member?.tempHp ?? ""} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Bonus inisiatif<input name="initiativeBonus" type="number" min="-10" max="20" defaultValue={member?.initiativeBonus ?? ""} placeholder="Opsional" /></FieldLabel></div>
    <div className="field-row stat-row max-[650px]:[display:grid] max-[650px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[650px]:[gap:0_9px]"><FieldLabel className="">Passive Perception<input name="passivePerception" type="number" min="0" max="50" defaultValue={member?.passivePerception ?? ""} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Speed (ft)<input name="speed" type="number" min="0" max="1000" defaultValue={member?.speed ?? ""} placeholder="Opsional" /></FieldLabel><FieldLabel className="">Spell Save DC<input name="spellSaveDC" type="number" min="1" max="50" defaultValue={member?.spellSaveDC ?? ""} placeholder="Opsional" /></FieldLabel></div>
    <FieldLabel className="">Background<input name="background" maxLength={100} defaultValue={member?.background ?? ""} placeholder="Opsional" /></FieldLabel>
  </>;
}

export function PartyManager({ campaignId }: { campaignId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/party`);
    if (!response.ok) throw new Error("Roster party gagal dimuat.");
    setMembers((await response.json()).members);
  }, [campaignId]);
  useEffect(() => { load().catch(() => setError("Roster party gagal dimuat.")); }, [load]);

  async function createMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSaving(true);
    try {
      const form = new FormData(formElement);
      if (Number(form.get("currentHp") || 10) > Number(form.get("maxHp") || 10)) throw new Error("HP saat ini tidak boleh melebihi Max HP.");
      const response = await fetch(`/api/campaigns/${campaignId}/party`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Karakter tidak dapat disimpan.");
      formElement.reset();
      await load();
      setCreateOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Karakter tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(event: React.FormEvent<HTMLFormElement>, memberId: string) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const values = Object.fromEntries([...new FormData(event.currentTarget)].filter(([key, value]) => value !== "" || !["passivePerception", "spellSaveDC"].includes(key)));
      const response = await fetch(`/api/campaigns/${campaignId}/party/${memberId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Karakter tidak dapat diperbarui.");
      await load();
      setEditingMember(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Karakter tidak dapat diperbarui.");
    } finally {
      setSaving(false);
    }
  }

  async function setMemberActive(member: Member) {
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/party/${member.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !member.isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Status karakter tidak dapat diubah.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status karakter tidak dapat diubah.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(member: Member) {
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/party/${member.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Karakter tidak dapat dihapus.");
      await load();
      setDeletingMember(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Karakter tidak dapat dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="party-layout [display:grid] [gap:15px]">
    <Panel as="section" className="party-roster [&_.count-pill]:[display:inline-grid] [&_.count-pill]:[min-width:23px] [&_.count-pill]:[height:23px] [&_.count-pill]:[place-items:center] [&_.count-pill]:[border:1px_solid_#65533a] [&_.count-pill]:[border-radius:12px] [&_.count-pill]:[color:#e1c38e] [&_.count-pill]:[font-family:var(--sans)] [&_.count-pill]:[font-size:10px] [&_.count-pill]:[vertical-align:middle]">
      <SectionHeading className=""><div><Eyebrow>ROSTER KAMPANYE</Eyebrow><h2>Party <span className="count-pill">{members.filter(member => member.isActive).length}</span></h2><p>Karakter nonaktif tetap tersimpan dan tidak muncul di encounter baru.</p></div><Button type="button" disabled={saving} onClick={() => { setError(""); setCreateOpen(true); }}>+ Tambah party</Button></SectionHeading>
      {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
      {members.length ? <StoryCardLayout className="roster-list [gap:10px]">{members.map(member => <article className={`roster-card [display:grid] [grid-template-columns:auto_minmax(0,_1fr)] [align-items:start] [gap:11px] [padding:13px] [border:1px_solid_#3a3b40] [border-radius:7px] [background:linear-gradient(145deg,_#222329,_#191b20)]${member.isActive ? "" : " roster-inactive [opacity:0.65]"}`} key={member.id}>
        <div className="roster-avatar [width:42px] [height:42px] [display:grid] [place-items:center] [border:1px_solid_#715b39] [border-radius:50%] [background:#30281e] [color:#e3c58c] [font-family:var(--serif)] [font-size:18px]">{member.name.slice(0, 1).toUpperCase()}</div>
        <div className="roster-info [min-width:0] [&_h3]:[margin:0] [&_h3]:[color:#ede0ca] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-size:16px] [&_h3]:[font-weight:500] [&_p]:[margin:4px_0] [&_p]:[color:#999286] [&_p]:[font-size:10px] [&_p]:[line-height:1.45] [&_small]:[color:#c5a875] [&_small]:[font-size:9px]">
          <h3>{member.name} {!member.isActive && <small>Nonaktif</small>}</h3>
          <p>{member.playerName || "Pemain belum ditentukan"} · Level {member.level}{member.className ? ` · ${member.className}` : ""}</p>
          <div className="roster-stats [display:flex] [gap:9px_12px] [flex-wrap:wrap] [margin-top:9px] [color:#c9b992] [font-size:9px]"><span>HP {member.currentHp}/{member.maxHp}</span>{member.tempHp > 0 && <span>Temp HP {member.tempHp}</span>}<span>AC {member.ac}</span></div>
        </div>
        <div className="roster-actions [grid-column:1/-1] [display:flex] [flex-wrap:wrap] [gap:6px] [padding-top:9px] [border-top:1px_solid_#39383a]">
          <Button type="button" variant="secondary" disabled={saving} onClick={() => setDetailMember(member)}>Detail</Button>
          <Button type="button" variant="quiet" disabled={saving} onClick={() => { setError(""); setEditingMember(member); }}>Edit</Button>
          <Button type="button" variant="quiet" disabled={saving} onClick={() => void setMemberActive(member)}>{member.isActive ? "Matikan" : "Aktifkan"}</Button>
          <Button type="button" variant="danger" disabled={saving} onClick={() => { setError(""); setDeletingMember(member); }}>Hapus</Button>
        </div>
      </article>)}</StoryCardLayout> : <EmptyState as="div"><EmptyEmblem>♙</EmptyEmblem><h3>Party Anda belum ditambahkan</h3><p>Tambah karakter untuk mulai menyusun roster kampanye.</p></EmptyState>}
    </Panel>

    {createOpen && <StoryModal id="party-create-title" eyebrow="KARAKTER PEMAIN" title="Tambah ke party" onClose={() => { if (!saving) setCreateOpen(false); }}>
      <form className="party-form [display:grid] [gap:8px]" onSubmit={createMember}>
        <p className="[margin:0_0_6px] [color:#aaa293] [font-size:11px]">Masukkan statistik ringkas untuk encounter. Detail lain bisa dilengkapi nanti.</p>
        <MemberFields />
        {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
        <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Tambahkan karakter"}</Button>
      </form>
    </StoryModal>}

    {editingMember && <StoryModal id="party-edit-title" eyebrow="UBAH KARAKTER" title={editingMember.name} onClose={() => { if (!saving) setEditingMember(null); }}>
      <form className="roster-edit-form [display:grid] [gap:8px]" onSubmit={event => void updateMember(event, editingMember.id)}>
        <MemberFields member={editingMember} />
        {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
        <Button type="submit" variant="secondary" disabled={saving}>{saving ? "Menyimpan…" : "Simpan perubahan"}</Button>
      </form>
    </StoryModal>}

    {detailMember && <StoryModal id="party-detail-title" eyebrow="DETAIL KARAKTER" title={detailMember.name} onClose={() => setDetailMember(null)}>
      <dl className="[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:8px] max-[500px]:[grid-template-columns:1fr] [&_div]:[padding:10px] [&_div]:[border:1px_solid_#3d3e43] [&_div]:[border-radius:5px] [&_div]:[background:#191b20] [&_dt]:[color:#a18a65] [&_dt]:[font-size:9px] [&_dd]:[margin:4px_0_0] [&_dd]:[color:#e5d8c2] [&_dd]:[font-size:12px]">
        <div><dt>Nama pemain</dt><dd>{detailMember.playerName || "Belum diisi"}</dd></div><div><dt>Level</dt><dd>{detailMember.level}</dd></div>
        <div><dt>Species</dt><dd>{detailMember.species || "Belum diisi"}</dd></div><div><dt>Class</dt><dd>{detailMember.className || "Belum diisi"}</dd></div>
        <div><dt>Background</dt><dd>{detailMember.background || "Belum diisi"}</dd></div><div><dt>Status</dt><dd>{detailMember.isActive ? "Aktif" : "Nonaktif"}</dd></div>
        <div><dt>HP</dt><dd>{detailMember.currentHp}/{detailMember.maxHp}{detailMember.tempHp > 0 ? ` + ${detailMember.tempHp} temp` : ""}</dd></div><div><dt>AC</dt><dd>{detailMember.ac}</dd></div>
        <div><dt>Bonus inisiatif</dt><dd>{detailMember.initiativeBonus >= 0 ? `+${detailMember.initiativeBonus}` : detailMember.initiativeBonus}</dd></div><div><dt>Passive Perception</dt><dd>{detailMember.passivePerception ?? "—"}</dd></div>
        <div><dt>Speed</dt><dd>{detailMember.speed} ft</dd></div><div><dt>Spell Save DC</dt><dd>{detailMember.spellSaveDC ?? "—"}</dd></div>
      </dl>
    </StoryModal>}

    {deletingMember && <StoryModal id="party-delete-title" eyebrow="KONFIRMASI" title="Hapus karakter?" onClose={() => { if (!saving) setDeletingMember(null); }}>
      <p className="[margin:0_0_16px] [color:#c4bba9] [font-size:12px] [line-height:1.6]">Karakter <strong>{deletingMember.name}</strong> akan dihapus dari roster kampanye.</p>
      {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
      <div className="[display:flex] [justify-content:flex-end] [gap:8px]"><Button type="button" variant="quiet" disabled={saving} onClick={() => setDeletingMember(null)}>Batal</Button><Button type="button" variant="danger" disabled={saving} onClick={() => void deleteMember(deletingMember)}>{saving ? "Menghapus…" : "Ya, hapus"}</Button></div>
    </StoryModal>}
  </div>;
}
