"use client";

import { useEffect, useState } from "react";

export type SearchResult = { type: string; id: string; title: string; status?: string; context?: string; visibility: string };

export function CommandPalette({ campaignId, onSelect }: { campaignId: string; onSelect: (result: SearchResult) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<SearchResult[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return <button className="secondary palette-trigger" onClick={() => setOpen(true)}>⌘ Search (Ctrl+K)</button>;

  async function search(value: string) {
    setQ(value);
    if (!value.trim()) { setRows([]); return; }
    const response = await fetch(`/api/campaigns/${campaignId}/search?q=${encodeURIComponent(value)}`);
    const result = await response.json();
    setRows(response.ok ? result.results ?? [] : []);
  }

  return <div className="overlay" onClick={() => setOpen(false)}><section className="palette card" onClick={event => event.stopPropagation()}>
    <input autoFocus value={q} onChange={event => void search(event.target.value)} placeholder="Search campaign" aria-label="Search campaign" />
    <div className="palette-results [display:grid] [gap:8px] [&_article]:[padding:10px_12px] [&_article]:[border:1px_solid_#37383b] [&_article]:[border-radius:6px] [&_article]:[background:#1b1d22] [&_article]:[display:flex] [&_article]:[align-items:baseline] [&_article]:[gap:9px] [&_article]:[flex-wrap:wrap] [&_article_strong]:[color:#e0d0b2] [&_article_strong]:[font-size:12px] [&_article_span]:[color:#a88b5e] [&_article_span]:[font-size:10px] [&_article_small]:[flex-basis:100%] [&_article_small]:[margin:4px_0_0] [&_article_small]:[color:#aaa292] [&_article_small]:[font-size:11px] [&_article_small]:[line-height:1.5] [&_>_p]:[color:#aaa292] [&_>_p]:[font-size:12px] [&_>_button]:[display:flex] [&_>_button]:[width:100%] [&_>_button]:[padding:10px_12px] [&_>_button]:[text-align:left] [&_>_button]:[flex-wrap:wrap] [&_>_button]:[border:1px_solid_#37383b] [&_>_button]:[border-radius:6px] [&_>_button]:[background:#1b1d22] [&_>_button]:[color:inherit] [&_>_button]:[cursor:pointer] [&_>_button:hover]:[border-color:#a88b5e] [&_>_button:hover]:[background:#24231f] [&_>_button:focus-visible]:[border-color:#a88b5e] [&_>_button:focus-visible]:[background:#24231f]">{rows.length ? rows.map(row => <button type="button" key={`${row.type}-${row.id}`} onClick={() => { onSelect(row); setOpen(false); }}><strong>{row.title}</strong><span>{row.type}{row.status ? ` · ${row.status}` : ""}</span>{row.context && <small>{row.context}</small>}</button>) : q ? <p>Tidak ada hasil yang cocok.</p> : null}</div>
    <small>Results respect visibility</small><button onClick={() => setOpen(false)}>Close</button>
  </section></div>;
}
