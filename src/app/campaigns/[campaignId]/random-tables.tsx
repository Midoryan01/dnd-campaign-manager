"use client";
import { PanelCopy } from "@/components/ui/panel-copy";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { FieldLabel } from "../../../components/ui/field-label";
import { Panel } from "../../../components/ui/panel";




const tables = {
  "Nama NPC": ["Mira Vell", "Tomas Greybrook", "Sella Thorn", "Bram Underhill", "Ilyra Dawnmere", "Kestrel Vale"],
  Rumor: ["Penjaga malam mendengar lonceng dari menara kosong.", "Pedagang tua membeli semua garam di pasar.", "Cahaya biru terlihat di rawa setelah tengah malam.", "Kucing hitam selalu muncul sebelum seseorang menghilang.", "Jembatan utara meminta bayaran yang tidak biasa.", "Ada pintu baru di ruang bawah tanah penginapan."],
  Tavern: ["Rusa Perunggu", "Lentera Miring", "Naga yang Kenyang", "Palu dan Piala", "Bintang Terakhir", "Kuda Tiga Kaki"],
  Cuaca: ["Hujan tipis dan kabut rendah.", "Angin dingin membawa aroma laut.", "Langit cerah, tetapi guruh terdengar dari kejauhan.", "Gerimis hangat turun bersama abu halus.", "Matahari tertutup awan kelabu.", "Salju mulai turun sebelum musimnya."],
} as const;
type Table = keyof typeof tables;

export function RandomTables() {
  const [table, setTable] = useState<Table>("Nama NPC");
  const [result, setResult] = useState("");
  function roll() { const entries = tables[table]; setResult(entries[Math.floor(Math.random() * entries.length)]); }
  return <Panel as="section" className="random-tables [max-width:620px] [&_h2]:[margin:7px_0] [&_>_.field-label]:[margin:18px_0]"><Eyebrow>IMPROVISASI CEPAT</Eyebrow><h2>Tabel acak</h2><PanelCopy>Ambil satu ide untuk adegan yang sedang berkembang.</PanelCopy><FieldLabel className="">Pilih tabel<select value={table} onChange={event => { setTable(event.target.value as Table); setResult(""); }}>{Object.keys(tables).map(name => <option key={name}>{name}</option>)}</select></FieldLabel><Button type="button" variant="primary" onClick={roll}>🎲 Ambil hasil</Button>{result && <div className="random-result [display:grid] [gap:9px] [margin-top:18px] [padding:18px] [border:1px_solid_#66543a] [border-radius:6px] [background:linear-gradient(140deg,_#2b271f,_#1d1e22)] [&_strong]:[color:#f0dfbf] [&_strong]:[font-family:var(--serif)] [&_strong]:[font-size:20px] [&_strong]:[font-weight:500] [&_strong]:[line-height:1.45]" aria-live="polite"><Eyebrow>{table.toUpperCase()}</Eyebrow><strong>{result}</strong><Button type="button" variant="quiet" onClick={roll}>Coba lagi</Button></div>}</Panel>;
}
