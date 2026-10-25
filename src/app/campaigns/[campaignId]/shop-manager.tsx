"use client";
import { EmptyEmblem } from "@/components/ui/empty-emblem";
import { Eyebrow } from "@/components/ui/eyebrow";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { FieldLabel } from "../../../components/ui/field-label";
import { EmptyState } from "../../../components/ui/empty-state";
import { StatusMessage } from "../../../components/ui/status-message";
import { Panel } from "../../../components/ui/panel";







type ShopItem = { id: string; name: string; description: string | null; priceCopper: number; stock: number | null };
type ShopTransaction = { id: string; itemName: string; quantity: number; unitPriceCopper: number; buyer: string | null; note: string | null; createdAt: string };
type Shop = { id: string; name: string; description: string | null; isOpen: boolean; location: { id: string; name: string } | null; proprietor: { id: string; name: string } | null; items: ShopItem[]; transactions: ShopTransaction[] };
type Option = { id: string; name: string };
type CompendiumItem = { id: string; name: string; category: string | null; type: "equipment" | "magicItem"; data: Record<string, unknown> };

function formatCopper(amount: number) {
  if (amount === 0) return "Gratis";
  const units = [[100, "gp"], [50, "ep"], [10, "sp"], [1, "cp"]] as const;
  const [unit, label] = units.find(([value]) => amount % value === 0) ?? units[3];
  return `${(amount / unit).toLocaleString("id-ID")} ${label}`;
}

function itemPayload(fields: FormData) {
  const price = Number(fields.get("priceGp"));
  const stockText = String(fields.get("stock") ?? "");
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) throw new Error("Harga harus antara 0 dan 1.000.000 gp.");
  const stock = stockText === "" ? null : Number(stockText);
  if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 100_000)) throw new Error("Stok harus bilangan bulat antara 0 dan 100.000.");
  return { name: String(fields.get("name") ?? ""), description: String(fields.get("description") ?? "") || null, priceCopper: Math.round(price * 100), stock };
}

function compendiumPrice(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(cp|sp|ep|gp|pp)\b/i);
  if (!match) return "";
  const amount = Number(match[1]);
  const copper = amount * ({ cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 } as const)[match[2].toLowerCase() as "cp" | "sp" | "ep" | "gp" | "pp"];
  return Number.isFinite(copper) ? (copper / 100).toFixed(2) : "";
}

function ShopItemForm({ saving, onSubmit }: { saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"all" | "equipment" | "magicItem">("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompendiumItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setLookupError("");
      try {
        const types = type === "all" ? ["equipment", "magicItem"] : [type];
        const pages = await Promise.all(types.map(async itemType => {
          const params = new URLSearchParams({ type: itemType, page: "1" });
          if (query.trim()) params.set("q", query.trim());
          const response = await fetch(`/api/compendium?${params}`, { signal: controller.signal });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? "Kompendium tidak dapat dimuat.");
          return result.results as CompendiumItem[];
        }));
        setResults(pages.flat());
      } catch (cause) {
        if (!controller.signal.aborted) setLookupError(cause instanceof Error ? cause.message : "Kompendium tidak dapat dimuat.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [type, query]);

  function selectItem(item: CompendiumItem) {
    const form = formRef.current;
    if (!form) return;
    const description = typeof item.data.description === "string" ? item.data.description : typeof item.data.body === "string" ? item.data.body : ["damage", "properties", "mastery", "weight", "armorClass", "strength", "stealth", "rarity"].flatMap(key => typeof item.data[key] === "string" || typeof item.data[key] === "number" ? [`${key}: ${item.data[key]}`] : []).join(", ");
    (form.elements.namedItem("name") as HTMLInputElement).value = item.name;
    (form.elements.namedItem("description") as HTMLTextAreaElement).value = [item.category, description].filter(Boolean).join(" — ").slice(0, 2000);
    const price = compendiumPrice(item.data.cost);
    if (price) (form.elements.namedItem("priceGp") as HTMLInputElement).value = price;
    setQuery("");
    setResults([]);
  }

  return <form ref={formRef} onSubmit={onSubmit} onReset={() => { setQuery(""); setResults([]); }}>
    <div className="shop-compendium-picker [display:grid] [gap:6px] [padding:10px] [border:1px_solid_#3d3f44] [border-radius:6px] [background:#17191d] [&_>_small]:[color:#aaa292] [&_>_small]:[font-size:10px]"><span className="my-[11px] grid gap-1.5 text-[11px] text-[#d0c4af]">Ambil dari kompendium</span><div className="shop-compendium-search [display:grid] [grid-template-columns:auto_minmax(0,_1fr)] [gap:6px]"><select aria-label="Jenis item kompendium" value={type} onChange={event => setType(event.target.value as "all" | "equipment" | "magicItem")}><option value="all">Semua item</option><option value="equipment">Equipment</option><option value="magicItem">Magic item</option></select><input type="search" value={query} maxLength={120} onChange={event => setQuery(event.target.value)} placeholder="Cari nama item…" /></div>
      {lookupError ? <StatusMessage variant="form" as="small" role="alert">{lookupError}</StatusMessage> : loading ? <small role="status">Mencari item…</small> : results.length > 0 ? <ul className="shop-compendium-results [display:grid] [gap:3px] [max-height:220px] [overflow:auto] [margin:0] [padding:0] [list-style:none] [&_button]:[display:grid] [&_button]:[width:100%] [&_button]:[gap:2px] [&_button]:[padding:7px_8px] [&_button]:[border:1px_solid_#34363b] [&_button]:[border-radius:4px] [&_button]:[background:#202126] [&_button]:[color:#e8dcc7] [&_button]:[text-align:left] [&_button]:[cursor:pointer] [&_button:hover]:[border-color:#92784b] [&_button:hover]:[outline:none] [&_button:focus-visible]:[border-color:#92784b] [&_button:focus-visible]:[outline:none] [&_small]:[color:#aaa292] [&_small]:[font-size:10px]">{results.slice(0, 8).map(item => <li key={item.id}><button type="button" onClick={() => selectItem(item)}><strong>{item.name}</strong><small>{[item.type === "magicItem" ? "Magic Item" : item.category, typeof item.data.cost === "string" ? item.data.cost : ""].filter(Boolean).join(" · ")}</small></button></li>)}</ul> : query.trim() ? <small>Tidak ada hasil.</small> : <small>Cari nama untuk melihat item, atau isi barang custom di bawah.</small>}
    </div>
    <FieldLabel className="">Nama barang<input name="name" required maxLength={160} /></FieldLabel><FieldLabel className="">Harga (gp)<input name="priceGp" type="number" min="0" max="1000000" step="0.01" required defaultValue="1" /></FieldLabel><FieldLabel className="">Stok<input name="stock" type="number" min="0" max="100000" step="1" placeholder="Kosong = tak terbatas" /></FieldLabel><FieldLabel className="">Catatan barang<textarea name="description" rows={2} maxLength={2000} /></FieldLabel><Button variant="primary" disabled={saving}>Simpan barang</Button>
  </form>;
}

export function ShopManager({ campaignId, locations, npcs }: { campaignId: string; locations: Option[]; npcs: Option[] }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/shops`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Toko tidak dapat dimuat.");
    setShops(result.shops);
  }, [campaignId]);

  useEffect(() => { void load().catch(cause => setError(cause instanceof Error ? cause.message : "Toko tidak dapat dimuat.")).finally(() => setLoading(false)); }, [load]);

  async function request(url: string, method: string, data?: unknown) {
    const response = await fetch(url, { method, ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Perubahan toko tidak dapat disimpan.");
    await load();
  }

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      await request(`/api/campaigns/${campaignId}/shops`, "POST", { name: fields.get("name"), locationId: fields.get("locationId"), proprietorId: fields.get("proprietorId") || null, description: fields.get("description") || null });
      form.reset(); setMessage("Toko dibuat.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Toko tidak dapat dibuat."); }
    finally { setSaving(false); }
  }

  async function updateShop(event: FormEvent<HTMLFormElement>, shopId: string) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const fields = new FormData(event.currentTarget);
    try {
      await request(`/api/campaigns/${campaignId}/shops/${shopId}`, "PATCH", { name: fields.get("name"), locationId: fields.get("locationId") || null, proprietorId: fields.get("proprietorId") || null, description: fields.get("description") || null });
      setMessage("Detail toko tersimpan.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Detail toko tidak dapat disimpan."); }
    finally { setSaving(false); }
  }

  async function createItem(event: FormEvent<HTMLFormElement>, shopId: string) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const form = event.currentTarget;
    try {
      await request(`/api/campaigns/${campaignId}/shops/${shopId}/items`, "POST", itemPayload(new FormData(form)));
      form.reset(); setMessage("Barang ditambahkan ke stok.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Barang tidak dapat ditambahkan."); }
    finally { setSaving(false); }
  }

  async function updateItem(event: FormEvent<HTMLFormElement>, shopId: string, itemId: string) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      await request(`/api/campaigns/${campaignId}/shops/${shopId}/items/${itemId}`, "PATCH", itemPayload(new FormData(event.currentTarget)));
      setMessage("Barang diperbarui.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Barang tidak dapat diperbarui."); }
    finally { setSaving(false); }
  }

  async function sellItem(event: FormEvent<HTMLFormElement>, shopId: string, itemId: string) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      await request(`/api/campaigns/${campaignId}/shops/${shopId}/transactions`, "POST", { itemId, quantity: Number(fields.get("quantity")), buyer: fields.get("buyer") || null, note: fields.get("note") || null });
      form.reset(); setMessage("Penjualan dicatat; stok diperbarui.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Penjualan tidak dapat dicatat."); }
    finally { setSaving(false); }
  }

  async function deleteItem(shopId: string, item: ShopItem) {
    if (!window.confirm(`Hapus ${item.name} dari daftar barang toko? Riwayat penjualannya tetap tersimpan.`)) return;
    setSaving(true); setError(""); setMessage("");
    try { await request(`/api/campaigns/${campaignId}/shops/${shopId}/items/${item.id}`, "DELETE"); setMessage("Barang dihapus dari daftar toko."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Barang tidak dapat dihapus."); }
    finally { setSaving(false); }
  }

  return <div className="shop-workspace [display:grid] [gap:14px] [min-width:0]">
    <Panel as="section" className="shop-create-panel [max-width:980px]">
      <SectionHeading variant="shop"><div><Eyebrow>MANAJEMEN BARANG</Eyebrow><h2>Toko baru</h2><p>Hubungkan toko ke lokasi dan NPC pemilik. Isi stok setelah toko dibuat.</p></div></SectionHeading>
      <form className="shop-create-form [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [align-items:end] [gap:10px] [&_.field-label]:[min-width:0] [&_.field-label]:[margin:0] max-[650px]:[grid-template-columns:minmax(0,_1fr)]" onSubmit={createShop}>
        <FieldLabel className="">Nama toko<input name="name" required maxLength={160} placeholder="Contoh: The Broken Antler" /></FieldLabel>
        <FieldLabel className="">Lokasi<select name="locationId" required defaultValue=""><option value="">Pilih lokasi</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel>
        <FieldLabel className="">Pemilik / penjaga<select name="proprietorId" defaultValue=""><option value="">Belum ditentukan</option>{npcs.map(npc => <option key={npc.id} value={npc.id}>{npc.name}</option>)}</select></FieldLabel>
        <FieldLabel className="shop-description-field [grid-column:1_/_-1] max-[650px]:[grid-column:auto]">Deskripsi<textarea name="description" rows={2} maxLength={5000} placeholder="Suasana toko, jam buka, atau aturan dagang." /></FieldLabel>
        <Button variant="primary" disabled={saving || !locations.length}>{saving ? "Menyimpan..." : "+ Buat toko"}</Button>
        {!locations.length && <small className="shop-form-hint [color:#aaa292] [font-size:11px]">Buat lokasi dulu di Data Dunia.</small>}
      </form>
    </Panel>

    {error && <StatusMessage variant="form" role="alert">{error}</StatusMessage>}
    {message && <StatusMessage variant="toast" role="status">{message}</StatusMessage>}
    {loading ? <Panel as="div" className="tracker-empty p-[14px_16px] border-dashed border-[#49443b] rounded-[6px] [padding:14px_16px] [border:1px_dashed_#49443b] [border-radius:6px] [color:#b5ab99] [font-size:13px] [line-height:1.55]" role="status" mobilePadding={14}>Memuat toko...</Panel> : shops.length ? <section className="shop-list [display:grid] [gap:14px] [min-width:0]" aria-label="Daftar toko">{shops.map(shop => <Panel as="article" className="shop-card p-[17px] [min-width:0] [padding:17px]" key={shop.id} mobilePadding={17}>
      <header className="shop-card-heading [&_h2]:[margin:4px_0] [&_p]:[margin:4px_0_0] [&_p]:[color:#a59e91] [&_p]:[font-size:11px] [&_p]:[line-height:1.5] [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [min-width:0] [&_>_div]:[min-width:0] max-[650px]:[align-items:flex-start] max-[650px]:[flex-direction:column]"><div><Eyebrow tone="shop">{shop.isOpen ? "BUKA" : "TUTUP"}</Eyebrow><h2>{shop.name}</h2><p>{shop.location?.name ?? "Lokasi belum ditautkan"}{shop.proprietor ? ` · ${shop.proprietor.name}` : ""}</p></div><Button type="button" variant={shop.isOpen ? "secondary" : "primary"} disabled={saving} onClick={() => { setSaving(true); setError(""); setMessage(""); void request(`/api/campaigns/${campaignId}/shops/${shop.id}`, "PATCH", { isOpen: !shop.isOpen }).then(() => setMessage(shop.isOpen ? "Toko ditutup." : "Toko dibuka.")).catch(cause => setError(cause instanceof Error ? cause.message : "Status toko tidak dapat diubah.")).finally(() => setSaving(false)); }}>{shop.isOpen ? "Tutup toko" : "Buka toko"}</Button></header>
      {shop.description && <p className="shop-description [margin:12px_0] [color:#b6ad9e] [font-size:12px] [line-height:1.6] [white-space:pre-wrap] [overflow-wrap:anywhere]">{shop.description}</p>}
      <details className="shop-edit-details [&_.field-label]:[min-width:0] [&_.field-label]:[margin:0] [min-width:0] [&_>_summary]:[width:fit-content] [&_>_summary]:[padding:6px_0] [&_>_summary]:[color:#d6bb89] [&_>_summary]:[font-size:11px] [&_>_summary]:[cursor:pointer] [margin-top:10px] [padding:0_12px_8px] [border:1px_solid_#3c3e44] [border-radius:6px] [background:#1a1c21] [&_form]:[display:grid] [&_form]:[gap:9px] [&_form]:[padding:8px_0]"><summary>Ubah detail toko</summary><form onSubmit={event => void updateShop(event, shop.id)}><FieldLabel className="">Nama toko<input name="name" required maxLength={160} defaultValue={shop.name} /></FieldLabel><FieldLabel className="">Lokasi<select name="locationId" defaultValue={shop.location?.id ?? ""}><option value="">Tanpa lokasi</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></FieldLabel><FieldLabel className="">Pemilik / penjaga<select name="proprietorId" defaultValue={shop.proprietor?.id ?? ""}><option value="">Belum ditentukan</option>{npcs.map(npc => <option key={npc.id} value={npc.id}>{npc.name}</option>)}</select></FieldLabel><FieldLabel className="">Deskripsi<textarea name="description" rows={2} maxLength={5000} defaultValue={shop.description ?? ""} /></FieldLabel><Button variant="secondary" disabled={saving}>Simpan detail toko</Button></form></details>
      <div className="shop-inventory-heading [&_>_div]:[min-width:0] [&_h3]:[margin:3px_0_0] [&_h3]:[color:#e8dcc7] [&_h3]:[font:500_18px_var(--serif)] [&_h3_small]:[margin-left:5px] [&_h3_small]:[color:#999081] [&_h3_small]:[font:10px_var(--sans)] max-[650px]:[align-items:flex-start]"><div><Eyebrow>DAFTAR BARANG</Eyebrow><h3>Stok toko <small>{shop.items.length}</small></h3></div><details className="shop-add-item [&_.field-label]:[min-width:0] [&_.field-label]:[margin:0] [min-width:0] [&_form]:[display:grid] [&_form]:[gap:9px] [&_form]:[padding:8px_0] [position:relative]"><summary>+ Tambah barang</summary><ShopItemForm saving={saving} onSubmit={event => void createItem(event, shop.id)} /></details></div>
      {shop.items.length ? <div className="shop-item-list [display:grid] [gap:8px] [min-width:0] [margin-top:10px]">{shop.items.map(item => <article className="shop-item-card [min-width:0] [padding:12px] [border:1px_solid_#3b3d43] [border-radius:6px] [background:#1a1c21]" key={item.id}><div className="shop-item-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px] [min-width:0] [&_>_div:first-child]:[min-width:0] [&_h4]:[margin:0_0_5px] [&_h4]:[color:#e8dcc7] [&_h4]:[font:500_16px_var(--serif)] [&_h4]:[overflow-wrap:anywhere] [&_strong]:[display:block] [&_strong]:[margin-top:3px] [&_strong]:[color:#d4bd91] [&_strong]:[font-size:11px] max-[650px]:[align-items:flex-start]"><div><h4>{item.name}</h4><strong>{formatCopper(item.priceCopper)}</strong><small>{item.stock === null ? "Stok tak terbatas" : item.stock > 0 ? `Stok: ${item.stock}` : "Habis"}</small></div><div className="shop-item-actions [&_.field-label]:[min-width:0] [&_.field-label]:[margin:0] [&_details]:[min-width:0] [&_form]:[display:grid] [&_form]:[gap:9px] [&_form]:[padding:8px_0] [display:flex] [align-items:flex-start] [gap:9px] [flex:none] [&_>_button]:[min-height:32px] [&_>_button]:[padding:7px_9px] [&_>_button]:[border:1px_solid_#46433c] [&_>_button]:[border-radius:5px] [&_>_button]:[background:#212227] [&_>_button]:[color:#d4c4a6] [&_>_button]:[font-size:10px] [&_details[open]]:[position:relative] [&_details[open]]:[z-index:2] [&_details_form]:[position:absolute] [&_details_form]:[top:39px] [&_details_form]:[right:0] [&_details_form]:[width:min(320px,_calc(100vw_-_48px))] [&_details_form]:[padding:13px] [&_details_form]:[border:1px_solid_#4c4942] [&_details_form]:[border-radius:6px] [&_details_form]:[background:#202126] [&_details_form]:[box-shadow:0_10px_30px_#0008]"><details><summary>Ubah</summary><form onSubmit={event => void updateItem(event, shop.id, item.id)}><FieldLabel className="">Nama barang<input name="name" required maxLength={160} defaultValue={item.name} /></FieldLabel><FieldLabel className="">Harga (gp)<input name="priceGp" type="number" min="0" max="1000000" step="0.01" required defaultValue={(item.priceCopper / 100).toFixed(2)} /></FieldLabel><FieldLabel className="">Stok<input name="stock" type="number" min="0" max="100000" step="1" defaultValue={item.stock ?? ""} placeholder="Kosong = tak terbatas" /></FieldLabel><FieldLabel className="">Catatan barang<textarea name="description" rows={2} maxLength={2000} defaultValue={item.description ?? ""} /></FieldLabel><Button variant="secondary" disabled={saving}>Simpan perubahan</Button></form></details><Button type="button" variant="quiet" disabled={saving} onClick={() => void deleteItem(shop.id, item)}>Hapus</Button></div></div>{item.description && <p className="shop-item-description [margin:12px_0] [color:#b6ad9e] [font-size:12px] [line-height:1.6] [white-space:pre-wrap] [overflow-wrap:anywhere]">{item.description}</p>}{shop.isOpen && item.stock !== 0 && <details className="shop-sale-details [&_.field-label]:[min-width:0] [&_.field-label]:[margin:0] [min-width:0] [margin-top:10px] [&_form]:[display:grid] [&_form]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [&_form]:[align-items:end] [&_form]:[gap:9px] [&_form]:[padding:10px] [&_form]:[border:1px_solid_#3d3f44] [&_form]:[border-radius:6px] [&_form]:[background:#17191d] [&_form_>_p]:[grid-column:1_/_-1] [&_form_>_p]:[margin:0] [&_form_>_button]:[grid-column:1_/_-1] [&_form_>_button]:[margin:0] [&_form_>_p]:[color:#b7ad9d] [&_form_>_p]:[font-size:11px] max-[650px]:[&_form]:[grid-template-columns:minmax(0,_1fr)] max-[650px]:[&_form_>_p]:[grid-column:auto] max-[650px]:[&_form_>_button]:[grid-column:auto]"><summary>Catat penjualan</summary><form onSubmit={event => void sellItem(event, shop.id, item.id)}><FieldLabel className="">Jumlah<input name="quantity" type="number" min="1" max={item.stock ?? 10000} step="1" defaultValue="1" required /></FieldLabel><FieldLabel className="">Pembeli<input name="buyer" maxLength={160} placeholder="Nama karakter / party" /></FieldLabel><FieldLabel className="">Catatan transaksi<input name="note" maxLength={1000} placeholder="Opsional" /></FieldLabel><p>Total: {formatCopper(item.priceCopper)} per barang.</p><Button variant="primary" disabled={saving}>Simpan penjualan</Button></form></details>}</article>)}</div> : <div className="shop-empty-items [margin-top:10px] [padding:12px] [border:1px_dashed_#46433c] [border-radius:5px] [color:#a59e91] [font-size:11px]">Belum ada barang. Tambahkan stok pertama ke toko ini.</div>}
      {shop.transactions.length > 0 && <details className="shop-history [min-width:0] [&_>_summary]:[width:fit-content] [&_>_summary]:[padding:6px_0] [&_>_summary]:[color:#d6bb89] [&_>_summary]:[font-size:11px] [&_>_summary]:[cursor:pointer] [&_summary_span]:[margin-left:5px] [&_summary_span]:[color:#999081] [&_summary_span]:[font:10px_var(--sans)] [margin-top:14px] [border-top:1px_solid_#3b3c41] [&_ul]:[display:grid] [&_ul]:[gap:8px] [&_ul]:[margin:0] [&_ul]:[padding:8px_0_0] [&_ul]:[list-style:none] [&_li]:[display:flex] [&_li]:[justify-content:space-between] [&_li]:[gap:12px] [&_li]:[padding:9px_10px] [&_li]:[border:1px_solid_#37393e] [&_li]:[border-radius:5px] [&_li]:[background:#191b20] [&_li]:[font-size:11px] [&_li_>_div]:[display:grid] [&_li_>_div]:[gap:4px] [&_li_>_div]:[min-width:0] [&_li_strong]:[overflow-wrap:anywhere] [&_li_small]:[color:#9d978b] [&_li_small]:[line-height:1.45] [&_li_small]:[overflow-wrap:anywhere] [&_li_>_strong]:[flex:none] [&_li_>_strong]:[color:#d9c292]"><summary>Riwayat penjualan <span>{shop.transactions.length} terbaru</span></summary><ul>{shop.transactions.map(transaction => <li key={transaction.id}><div><strong>{transaction.quantity} × {transaction.itemName}</strong><small>{new Date(transaction.createdAt).toLocaleString("id-ID")}{transaction.buyer ? ` · ${transaction.buyer}` : ""}{transaction.note ? ` · ${transaction.note}` : ""}</small></div><strong>{formatCopper(transaction.unitPriceCopper * transaction.quantity)}</strong></li>)}</ul></details>}
    </Panel>)}</section> : <EmptyState as="div"><EmptyEmblem>🏪</EmptyEmblem><h2>Belum ada toko</h2><p>Buat toko, tautkan ke lokasi dan penjaga, lalu isi barangnya.</p></EmptyState>}
  </div>;
}
