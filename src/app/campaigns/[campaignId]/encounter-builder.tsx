"use client";
import { EmptyEmblem } from "@/components/ui/empty-emblem";
import { StepMark } from "@/components/ui/step-mark";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MonsterCombatActions } from "./monster-combat-actions";
import { EncounterDice } from "./encounter-dice";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { FieldRow } from "../../../components/ui/field-row";
import { Panel } from "../../../components/ui/panel";








type Monster = { id: string; name: string; data: unknown; source: { name: string; version: string | null } };
type PartyMember = { id: string; name: string; playerName: string | null; species: string | null; className: string | null; level: number; currentHp: number; maxHp: number; tempHp: number; ac: number; initiativeBonus: number };
type Npc = { id: string; name: string; role: string | null; description: string | null };
type Options = { monsters: Monster[]; party: PartyMember[]; npcs: Npc[] };
type Selected = { key: string; type: "MONSTER" | "PLAYER" | "NPC" | "CUSTOM"; referenceId?: string; name: string; level?: number; maxHp: number | null; currentHp: number | null; tempHp: number; ac: number | null; initiativeBonus: number; initiative: number | null; quantity: number; xp: number; rollData?: unknown };

const xpBudget: Record<number, [number, number, number]> = {
  1: [50, 75, 100], 2: [100, 150, 200], 3: [150, 225, 400], 4: [250, 375, 500], 5: [500, 750, 1100],
  6: [600, 1000, 1400], 7: [750, 1300, 1700], 8: [1000, 1700, 2100], 9: [1300, 2000, 2600], 10: [1600, 2300, 3100],
  11: [1900, 2900, 4100], 12: [2200, 3700, 4700], 13: [2600, 4200, 5400], 14: [2900, 4900, 6200], 15: [3300, 5400, 7800],
  16: [3800, 6100, 9800], 17: [4500, 7200, 11700], 18: [5000, 8700, 14200], 19: [5500, 10700, 17200], 20: [6400, 13200, 22000],
};

function numberAt(value: unknown, keys: string[]): number | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const item = record[key];
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item === "string") {
      const match = item.match(/^\s*(\d+)/);
      if (match) return Number(match[1]);
    }
  }
  for (const key of ["stats", "statBlock", "stat_block"]) {
    const nested = numberAt(record[key], keys);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

export function EncounterBuilder({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [options, setOptions] = useState<Options>({ monsters: [], party: [], npcs: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"MONSTER" | "PLAYER" | "NPC" | "CUSTOM">("MONSTER");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("Pertemuan baru");
  const [selected, setSelected] = useState<Selected[]>([]);
  const [custom, setCustom] = useState({ name: "", maxHp: "", ac: "", initiativeBonus: "0" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/campaigns/${campaignId}/encounter/options?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(async response => {
          if (!response.ok) throw new Error("Tidak dapat memuat daftar peserta.");
          setOptions(await response.json());
        })
        .catch(cause => { if (cause instanceof Error && cause.name !== "AbortError") setError("Daftar peserta gagal dimuat. Muat ulang halaman untuk mencoba lagi."); })
        .finally(() => setLoading(false));
    }, query ? 220 : 0);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [campaignId, query]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const rows = tab === "MONSTER" ? options.monsters : tab === "PLAYER" ? options.party : tab === "NPC" ? options.npcs : [];
    return rows.filter(row => row.name.toLocaleLowerCase().includes(needle));
  }, [options, query, tab]);
  const totalXp = selected.reduce((sum, row) => sum + row.xp * row.quantity, 0);
  const participantCount = selected.reduce((sum, row) => sum + row.quantity, 0);
  const party = selected.filter(row => row.type === "PLAYER");
  const thresholds = party.reduce<[number, number, number]>((sum, member) => {
    const budget = member.level ? xpBudget[member.level] : undefined;
    return budget ? [sum[0] + budget[0], sum[1] + budget[1], sum[2] + budget[2]] : sum;
  }, [0, 0, 0]);
  const difficulty = !party.length ? "Tambahkan party" : !totalXp ? "XP monster belum tersedia" : totalXp <= thresholds[0] ? "Rendah · mudah" : totalXp <= thresholds[1] ? "Sedang" : totalXp <= thresholds[2] ? "Tinggi · sulit" : "Melebihi tinggi";
  const difficultyProgress = thresholds[2] ? Math.min(100, totalXp / thresholds[2] * 100) : 0;

  function addMonster(monster: Monster) {
    const maxHp = numberAt(monster.data, ["hit_points", "hitPoints", "hp", "average_hit_points"]);
    const ac = numberAt(monster.data, ["armor_class", "armorClass", "ac"]);
    const xp = numberAt(monster.data, ["xp", "experience_points", "experiencePoints"]) ?? 0;
    setSelected(rows => [...rows, { key: crypto.randomUUID(), type: "MONSTER", referenceId: monster.id, name: monster.name, maxHp: maxHp ?? null, currentHp: maxHp ?? null, tempHp: 0, ac: ac ?? null, initiativeBonus: numberAt(monster.data, ["initiative_bonus", "initiativeBonus"]) ?? 0, initiative: null, quantity: 1, xp, rollData: monster.data }]);
  }

  function addParty(member: PartyMember) {
    if (selected.some(row => row.type === "PLAYER" && row.referenceId === member.id)) return;
    setSelected(rows => [...rows, { key: crypto.randomUUID(), type: "PLAYER", referenceId: member.id, name: member.name, level: member.level, maxHp: member.maxHp, currentHp: member.currentHp, tempHp: member.tempHp, ac: member.ac, initiativeBonus: member.initiativeBonus, initiative: null, quantity: 1, xp: 0 }]);
  }

  function addNpc(npc: Npc) {
    setSelected(rows => [...rows, { key: crypto.randomUUID(), type: "NPC", referenceId: npc.id, name: npc.name, maxHp: null, currentHp: null, tempHp: 0, ac: null, initiativeBonus: 0, initiative: null, quantity: 1, xp: 0 }]);
  }

  function update(key: string, patch: Partial<Selected>) {
    setSelected(rows => rows.map(row => row.key === key ? { ...row, ...patch } : row));
  }

  function addCustom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const maxHp = Number(custom.maxHp);
    const ac = Number(custom.ac);
    if (!custom.name.trim() || !maxHp || !ac) return;
    setSelected(rows => [...rows, { key: crypto.randomUUID(), type: "CUSTOM", name: custom.name.trim(), maxHp, currentHp: maxHp, tempHp: 0, ac, initiativeBonus: Number(custom.initiativeBonus) || 0, initiative: null, quantity: 1, xp: 0 }]);
    setCustom({ name: "", maxHp: "", ac: "", initiativeBonus: "0" });
  }

  async function startEncounter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selected.length) return setError("Tambahkan setidaknya satu peserta.");
    if (selected.some(row => !row.maxHp || !row.ac)) return setError("Lengkapi HP maksimum dan AC peserta yang belum memiliki stat.");
    if (selected.some(row => row.type === "PLAYER" && row.initiative === null)) return setError("Masukkan hasil roll initiative setiap pemain sebelum memulai encounter.");
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/combat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, combatants: selected.map(row => ({ type: row.type, referenceId: row.referenceId, name: row.name, quantity: row.quantity, maxHp: row.maxHp, currentHp: row.currentHp ?? row.maxHp, tempHp: row.tempHp, ac: row.ac, initiativeBonus: row.initiativeBonus, initiative: row.initiative })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Encounter tidak dapat dimulai.");
      router.refresh();
      setSelected([]);
      setError(`Encounter dimulai dengan ${result.combat.combatants.length} peserta. Total XP monster: ${result.totalXp}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Encounter tidak dapat dimulai.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="encounter-builder [display:grid] [grid-template-columns:minmax(0,_1.12fr)_minmax(330px,_0.88fr)] [align-items:start] [gap:14px] max-[1100px]:[grid-template-columns:minmax(0,_1fr)_minmax(300px,_0.85fr)] max-[650px]:[grid-template-columns:1fr]">
      <Panel as="section" className="encounter-pickers">
        <SectionHeading className=""><div><Eyebrow>PERSIAPAN PERTARUNGAN</Eyebrow><h2>Pilih peserta</h2><p>Tambahkan monster, karakter party, NPC, atau combatant custom.</p></div><StepMark>I</StepMark></SectionHeading>
        <div className="picker-tabs [display:flex] [gap:5px] [margin-bottom:13px] [padding:4px] [border:1px_solid_#3a3a3e] [border-radius:6px] [background:#15161a]" role="tablist" aria-label="Jenis peserta">
          {(["MONSTER", "PLAYER", "NPC", "CUSTOM"] as const).map(type => <button type="button" role="tab" aria-selected={tab === type} className={tab === type ? "picker-tab selected [flex:1] [min-height:33px] [border:1px_solid_transparent] [border-radius:4px] [background:transparent] [color:#a7a092] [font-size:10px] [&:hover]:[background:#ffffff08] [&:hover]:[color:#e9dcc7] [&.selected]:[border-color:#6a573a] [&.selected]:[background:#453825] [&.selected]:[color:#f1d39e]" : "picker-tab [flex:1] [min-height:33px] [border:1px_solid_transparent] [border-radius:4px] [background:transparent] [color:#a7a092] [font-size:10px] [&:hover]:[background:#ffffff08] [&:hover]:[color:#e9dcc7] [&.selected]:[border-color:#6a573a] [&.selected]:[background:#453825] [&.selected]:[color:#f1d39e]"} key={type} onClick={() => setTab(type)}>{({ MONSTER: "Monster", PLAYER: "Party", NPC: "NPC", CUSTOM: "Custom" })[type]}</button>)}
        </div>
        {tab !== "CUSTOM" && <FieldLabel className="">Cari peserta<input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Cari ${tab === "MONSTER" ? "monster" : tab === "PLAYER" ? "karakter party" : "NPC"}…`} /></FieldLabel>}
        {loading ? <EmptyState as="div">Memuat peserta…</EmptyState> : tab === "CUSTOM" ? (
          <form className="custom-entry [padding:14px] [border:1px_solid_#424045] [border-radius:6px] [background:#191b20] [&_>_p]:[margin:0_0_12px] [&_>_p]:[color:#aaa293] [&_>_p]:[font-size:11px] [&_>_p]:[line-height:1.5]" onSubmit={addCustom}>
            <p>Tambahkan makhluk atau hazard dengan statistik yang Anda tentukan.</p>
            <FieldLabel className="">Nama<input value={custom.name} onChange={event => setCustom({ ...custom, name: event.target.value })} maxLength={100} required /></FieldLabel>
            <FieldRow ><FieldLabel className="">HP maksimum<input type="number" min="1" max="10000" value={custom.maxHp} onChange={event => setCustom({ ...custom, maxHp: event.target.value })} required /></FieldLabel><FieldLabel className="">AC<input type="number" min="1" max="50" value={custom.ac} onChange={event => setCustom({ ...custom, ac: event.target.value })} required /></FieldLabel><FieldLabel className="">Initiative bonus<input type="number" min="-10" max="20" value={custom.initiativeBonus} onChange={event => setCustom({ ...custom, initiativeBonus: event.target.value })} /></FieldLabel></FieldRow>
            <Button variant="secondary" type="submit">＋ Tambahkan custom</Button>
          </form>
        ) : visible.length ? (
          <div className="picker-list [display:grid] [gap:7px] [max-height:510px] [overflow:auto] [padding-right:3px]">
            {tab === "MONSTER" && (visible as Monster[]).map(monster => {
              const hp = numberAt(monster.data, ["hit_points", "hitPoints", "hp", "average_hit_points"]);
              const ac = numberAt(monster.data, ["armor_class", "armorClass", "ac"]);
              const xp = numberAt(monster.data, ["xp", "experience_points", "experiencePoints"]);
              const data = monster.data && typeof monster.data === "object" ? monster.data as Record<string, unknown> : {};
              const cr = data.challenge_rating;
              return <article className="picker-card [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:11px] [border:1px_solid_#3d3e43] [border-radius:6px] [background:#191b20] [&:hover]:[border-color:#62533b] [&:hover]:[background:#202126] [&_h3]:[margin:0] [&_h3]:[color:#e8ddc9] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-size:14px] [&_h3]:[font-weight:500] [&_p]:[margin:4px_0] [&_p]:[color:#a29b8e] [&_p]:[font-size:10px] [&_small]:[color:#c0a875] [&_small]:[font-size:9px] [&_>_div]:[min-width:0] max-[650px]:[padding:9px]" key={monster.id}><div><h3>{monster.name}</h3><p>{monster.source.name} {monster.source.version ?? ""}</p><small>{cr !== undefined ? `CR ${String(cr)} \u00b7 ` : ""}{hp ? `${hp} HP` : "HP belum ada"} \u00b7 {ac ? `AC ${ac}` : "AC belum ada"}{xp ? ` \u00b7 ${xp} XP` : ""}</small><MonsterCombatActions campaignId={campaignId} name={monster.name} data={monster.data} /></div><button type="button" className="icon-button [width:30px] [height:30px] [flex:none] [border:1px_solid_#715e40] [border-radius:50%] [background:#332a1f] [color:#edcc94] [font-size:19px] [line-height:1] [&:hover]:[background:#58442b] [&:disabled]:[opacity:0.35]" aria-label={`Tambahkan ${monster.name}`} onClick={() => addMonster(monster)}>{"\uff0b"}</button></article>;
            })}
            {tab === "PLAYER" && (visible as PartyMember[]).map(member => <article className="picker-card [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:11px] [border:1px_solid_#3d3e43] [border-radius:6px] [background:#191b20] [&:hover]:[border-color:#62533b] [&:hover]:[background:#202126] [&_h3]:[margin:0] [&_h3]:[color:#e8ddc9] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-size:14px] [&_h3]:[font-weight:500] [&_p]:[margin:4px_0] [&_p]:[color:#a29b8e] [&_p]:[font-size:10px] [&_small]:[color:#c0a875] [&_small]:[font-size:9px] [&_>_div]:[min-width:0] max-[650px]:[padding:9px]" key={member.id}><div><h3>{member.name}</h3><p>{member.playerName || "Karakter pemain"} · {member.species || "Species belum diisi"}{member.className ? ` · ${member.className}` : ""} · Level ${member.level}</p><small>{member.currentHp}/{member.maxHp} HP · AC {member.ac}</small></div><button type="button" className="icon-button [width:30px] [height:30px] [flex:none] [border:1px_solid_#715e40] [border-radius:50%] [background:#332a1f] [color:#edcc94] [font-size:19px] [line-height:1] [&:hover]:[background:#58442b] [&:disabled]:[opacity:0.35]" aria-label={`Tambahkan ${member.name}`} disabled={selected.some(row => row.type === "PLAYER" && row.referenceId === member.id)} onClick={() => addParty(member)}>＋</button></article>)}
            {tab === "NPC" && (visible as Npc[]).map(npc => <article className="picker-card [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [padding:11px] [border:1px_solid_#3d3e43] [border-radius:6px] [background:#191b20] [&:hover]:[border-color:#62533b] [&:hover]:[background:#202126] [&_h3]:[margin:0] [&_h3]:[color:#e8ddc9] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-size:14px] [&_h3]:[font-weight:500] [&_p]:[margin:4px_0] [&_p]:[color:#a29b8e] [&_p]:[font-size:10px] [&_small]:[color:#c0a875] [&_small]:[font-size:9px] [&_>_div]:[min-width:0] max-[650px]:[padding:9px]" key={npc.id}><div><h3>{npc.name}</h3><p>{npc.role || npc.description || "NPC kampanye"}</p><small>HP dan AC dapat diisi setelah ditambahkan.</small></div><button type="button" className="icon-button [width:30px] [height:30px] [flex:none] [border:1px_solid_#715e40] [border-radius:50%] [background:#332a1f] [color:#edcc94] [font-size:19px] [line-height:1] [&:hover]:[background:#58442b] [&:disabled]:[opacity:0.35]" aria-label={`Tambahkan ${npc.name}`} onClick={() => addNpc(npc)}>＋</button></article>)}
          </div>
        ) : <EmptyState as="div"><EmptyEmblem>✧</EmptyEmblem><h3>{tab === "MONSTER" ? "Belum ada monster di kompendium" : tab === "PLAYER" ? "Party masih kosong" : "Belum ada NPC"}</h3><p>{tab === "MONSTER" ? "Monster akan muncul di sini setelah data monster terstruktur diimpor. Untuk sekarang, tambahkan versi custom." : tab === "PLAYER" ? "Tambahkan karakter pemain ke roster kampanye agar bisa dipilih di sini." : "Buat NPC di tab World → NPC terlebih dahulu."}</p>{tab === "MONSTER" && <Button type="button" variant="secondary" onClick={() => setTab("CUSTOM")}>＋ Buat combatant custom</Button>}{tab === "PLAYER" && <Button type="button" variant="secondary" onClick={() => document.getElementById("party-nav")?.click()}>Buka roster party</Button>}</EmptyState>}
      </Panel>

      <Panel as="section" className="encounter-preview [position:sticky] [top:80px] [&_.field-label]:[margin-bottom:13px] max-[850px]:[position:static] max-[650px]:[order:-1]">
        <SectionHeading className=""><div><Eyebrow>RINGKASAN</Eyebrow><h2>Encounter</h2><p>Inisiatif digulirkan otomatis saat dimulai.</p></div><StepMark>II</StepMark></SectionHeading>
        <EncounterDice campaignId={campaignId} />
        <form onSubmit={startEncounter}>
          <FieldLabel className="">Nama encounter<input value={name} onChange={event => setName(event.target.value)} maxLength={120} required /></FieldLabel>
          {selected.length ? <div className="selected-list [display:grid] [gap:8px] [max-height:420px] [overflow:auto]">{selected.map((row, index) => <article className="selected-card [padding:10px] [border:1px_solid_#46423a] [border-radius:6px] [background:linear-gradient(135deg,_#27251f,_#1a1b20)]" key={row.key}><div className="selected-title [display:flex] [align-items:center] [gap:8px] [margin-bottom:9px] [&_>_div]:[flex:1] [&_>_div]:[min-width:0] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[overflow:hidden] [&_strong]:[color:#ebdec8] [&_strong]:[font-family:var(--serif)] [&_strong]:[font-size:13px] [&_strong]:[font-weight:500] [&_strong]:[text-overflow:ellipsis] [&_strong]:[white-space:nowrap] [&_small]:[margin-top:3px] [&_small]:[color:#a89a7d] [&_small]:[font-size:9px]"><span className="participant-index [color:#b59763] [font-family:var(--serif)] [font-size:11px]">{String(index + 1).padStart(2, "0")}</span><div><strong>{row.name}</strong><small>{({ MONSTER: "Monster", PLAYER: "Karakter party", NPC: "NPC", CUSTOM: "Custom" })[row.type]}{row.type === "PLAYER" && ` · Level ${row.level ?? "?"}`}</small></div><button type="button" className="remove-button [width:25px] [height:25px] [border:1px_solid_#554043] [border-radius:4px] [background:#322529] [color:#d6a8a2] [font-size:17px]" aria-label={`Hapus ${row.name}`} onClick={() => setSelected(items => items.filter(item => item.key !== row.key))}>×</button></div><div className="stat-fields [display:grid] [grid-template-columns:repeat(4,_minmax(0,_1fr))] [gap:6px] [&_label]:[display:grid] [&_label]:[gap:4px] [&_label]:[color:#9b9386] [&_label]:[font-size:9px] [&_input]:[width:100%] [&_input]:[min-width:0] [&_input]:[height:30px] [&_input]:[padding:5px_6px] [&_input]:[border:1px_solid_#47474b] [&_input]:[border-radius:4px] [&_input]:[background:#13151a] [&_input]:[color:#efe3ce] [&_input]:[font-size:11px] max-[650px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]"><label>HP<input type="number" min="0" max={row.maxHp ?? 10000} value={row.currentHp ?? ""} onChange={event => update(row.key, { currentHp: event.target.value === "" ? null : Number(event.target.value) })} placeholder="Saat ini" /></label><label>Max HP<input type="number" min="1" max="10000" value={row.maxHp ?? ""} onChange={event => update(row.key, { maxHp: event.target.value === "" ? null : Number(event.target.value) })} placeholder="Wajib" /></label><label>AC<input type="number" min="1" max="50" value={row.ac ?? ""} onChange={event => update(row.key, { ac: event.target.value === "" ? null : Number(event.target.value) })} placeholder="Wajib" /></label><label>Jumlah<input type="number" min="1" max="20" value={row.quantity} disabled={row.type === "PLAYER"} onChange={event => update(row.key, { quantity: Number(event.target.value) })} /></label><label>Initiative{row.type === "PLAYER" && <small>Hasil roll pemain</small>}<input type="number" min="0" max="1000" value={row.initiative ?? ""} onChange={event => update(row.key, { initiative: event.target.value === "" ? null : Number(event.target.value) })} placeholder={row.type === "PLAYER" ? "Wajib" : "Otomatis"} /></label></div>{row.type === "MONSTER" && <MonsterCombatActions campaignId={campaignId} name={row.name} data={row.rollData} />}</article>)}</div> : <div className="empty-selection"><span>⚔</span><p>Encounter masih kosong</p><small>Pilih peserta dari panel kiri untuk mulai menyusun.</small></div>}
          <div className="encounter-totals [display:flex] [justify-content:space-between] [gap:12px] [margin:14px_0_7px] [padding:12px_0] [border-top:1px_solid_#46413a] [border-bottom:1px_solid_#46413a] [&_small]:[display:block] [&_strong]:[display:block] [&_small]:[color:#a18a65] [&_small]:[font-size:8px] [&_small]:[letter-spacing:0.13em] [&_strong]:[margin-top:5px] [&_strong]:[color:#f0d49e] [&_strong]:[font-family:var(--serif)] [&_strong]:[font-size:19px] [&_strong]:[font-weight:500]"><div><small>PESERTA</small><strong>{participantCount}</strong></div><div><small>TOTAL XP MONSTER</small><strong>{totalXp.toLocaleString()}</strong></div></div>
          <div className="encounter-difficulty [display:grid] [gap:7px] [margin:12px_0] [&_>_div:first-child]:[display:flex] [&_>_div:first-child]:[justify-content:space-between] [&_>_div:first-child]:[gap:8px] [&_>_div:first-child_small]:[color:#a18a65] [&_>_div:first-child_small]:[font-size:8px] [&_>_div:first-child_small]:[letter-spacing:0.13em] [&_>_div:first-child_strong]:[color:#f0d49e] [&_>_div:first-child_strong]:[font-size:12px] [&_>_small]:[color:#a99f8c] [&_>_small]:[font-size:9px]"><div><small>REKOMENDASI KESULITAN</small><strong>{difficulty}</strong></div>{party.length > 0 && totalXp > 0 && thresholds[2] > 0 && <><div className="difficulty-track [height:8px] [overflow:hidden] [border-radius:6px] [background:#38383b]" role="meter" aria-label={`Kesulitan encounter: ${difficulty}`} aria-valuemin={0} aria-valuemax={thresholds[2]} aria-valuenow={Math.min(totalXp, thresholds[2])}><span className={`difficulty-fill [display:block] [height:100%] [border-radius:6px] [background:linear-gradient(90deg,_#7b9a6d,_#d0ac65)] [&.over]:[background:#c86c65]${totalXp > thresholds[2] ? " over" : ""}`} style={{ width: `${difficultyProgress}%` }} /></div><small>Rendah {thresholds[0].toLocaleString()} · Sedang {thresholds[1].toLocaleString()} · Tinggi {thresholds[2].toLocaleString()} XP</small></>}</div>
          <p className="helper-copy [display:block] [margin:8px_0] [color:#928c80] [font-size:9px] [line-height:1.5] [&_code]:[color:#e6ca94]">Mengikuti anggaran encounter D&amp;D 2024 berdasarkan karakter party yang dipilih. NPC, custom, dan monster tanpa XP tidak dihitung.</p>
          {error && <StatusMessage variant="form" role="status">{error}</StatusMessage>}
          <Button variant="primary" className="start-encounter [width:100%] [margin-top:8px]" disabled={saving || !selected.length}>{saving ? "Menyiapkan…" : "⚔  Mulai encounter"}</Button>
        </form>
      </Panel>
    </div>
  );
}
