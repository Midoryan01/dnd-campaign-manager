# DM Command Center

DM Command Center adalah aplikasi web untuk membantu Dungeon Master (DM) menyiapkan kampanye dan mengelola aktivitas permainan Dungeons & Dragons dalam satu workspace. Aplikasi mencakup pengelolaan party, sesi, cerita dan dunia, encounter/combat, dadu, peta, Compendium SRD, pencarian, serta bantuan AI untuk menyusun draf NPC.

> Antarmuka dan workspace ditujukan terutama untuk DM. Beberapa alur pemain dan layanan produksi, seperti email, belum tersedia; lihat [Batasan yang diketahui](#batasan-yang-diketahui).

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Persyaratan](#persyaratan)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Konfigurasi lingkungan](#konfigurasi-lingkungan)
- [Perintah proyek](#perintah-proyek)
- [Pemeriksaan dan build](#pemeriksaan-dan-build)
- [Data SRD](#data-srd)
- [Struktur folder](#struktur-folder)
- [Gambaran arsitektur](#gambaran-arsitektur)
- [Catatan deployment](#catatan-deployment)
- [Batasan yang diketahui](#batasan-yang-diketahui)

## Fitur

- **Workspace kampanye:** kelola kampanye, party, sesi, catatan, quest, NPC, lokasi, faksi, lore, dan linimasa.
- **Encounter dan combat:** susun encounter, pilih combatant, kelola inisiatif dan giliran, serta gunakan kontrol roll untuk monster.
- **Dadu:** roll server-side dengan notasi dadu dan modifier.
- **Peta:** kelola peta kampanye; berkas unggahan saat ini disimpan di filesystem lokal.
- **Compendium dan pencarian:** akses data referensi SRD yang telah dimuat ke database dan cari konten kampanye.
- **Asisten AI:** buat draf NPC dan gunakan bantuan AI kampanye melalui Gemini API. Hasil draf perlu ditinjau DM.
- **Akun:** registrasi, login, dan alur permintaan reset kata sandi. Pengiriman email reset belum dikonfigurasi.

## Teknologi

- Next.js 15 dengan App Router, React 19, dan TypeScript
- MySQL dengan Prisma ORM
- NextAuth Credentials untuk autentikasi
- Zod untuk validasi konfigurasi
- Gemini API melalui paket `@google/genai`
- Python 3 dan `pypdf` untuk ekstraksi teks PDF SRD

## Persyaratan

- Node.js 20 atau lebih baru dan npm
- MySQL 8 yang dapat diakses aplikasi
- Python 3.10 atau lebih baru — hanya diperlukan untuk mengekstrak PDF SRD
- Kunci Gemini — hanya diperlukan untuk fitur AI

## Menjalankan secara lokal

1. **Pasang dependensi JavaScript** dari direktori proyek:

   ```sh
   npm install
   ```

2. **Siapkan variabel lingkungan.** Salin `.env.example` menjadi `.env`, kemudian isi nilai yang sesuai. Jangan commit `.env` atau membagikan secret.

   URL koneksi mengikuti format Prisma untuk MySQL. Contoh:

   ```env
   DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/dm_command_center"
   AUTH_SECRET="isi-dengan-secret-acak-yang-kuat"
   ```

   `DATABASE_URL` harus menunjuk ke database MySQL yang sudah dibuat dan dapat diakses.

3. **Buat Prisma Client dan terapkan migrasi pengembangan:**

   ```sh
   npm run db:generate
   npm run db:migrate
   ```

   `db:migrate` menjalankan `prisma migrate dev`; pada perubahan skema baru, Prisma dapat meminta nama migrasi. Untuk menerapkan migrasi yang telah tersedia pada deployment, gunakan `npx prisma migrate deploy`.

4. **Jalankan server pengembangan:**

   ```sh
   npm run dev
   ```

5. **Buka aplikasi** di [http://localhost:3000](http://localhost:3000). Buat akun melalui `/register`, kemudian masuk melalui `/login`.

Untuk menghentikan server pengembangan, tekan `Ctrl+C` pada terminal tempat server berjalan.

## Konfigurasi lingkungan

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | URL koneksi MySQL yang digunakan Prisma. |
| `AUTH_SECRET` | Ya untuk autentikasi | Secret NextAuth. Gunakan nilai acak yang kuat dan simpan hanya di lingkungan lokal/deployment. |
| `GEMINI_API_KEY` | Tidak | Kunci API Gemini server-side; diperlukan untuk fitur AI. |
| `GEMINI_MODEL` | Tidak | Nama model Gemini. Default aplikasi: `gemini-3.8-flash`. |
| `NODE_ENV` | Tidak | Mode Node.js; default konfigurasi aplikasi: `development`. |

`.env.example` menyediakan template variabel. Untuk deployment, atur variabel tersebut melalui pengelola secret platform, bukan dengan memasukkan kredensial ke source code.

## Perintah proyek

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan Next.js. |
| `npm run build` | Membuat build produksi. |
| `npm run start` | Menjalankan build produksi yang sudah dibuat. |
| `npm run lint` | Memeriksa source dengan ESLint. |
| `npm run db:generate` | Membuat Prisma Client dari skema Prisma. |
| `npm run db:migrate` | Membuat dan menerapkan migrasi database untuk pengembangan. |
| `npx prisma migrate deploy` | Menerapkan migrasi yang telah ada pada lingkungan deployment. |
| `npm run db:seed:srd` | Menyinkronkan data SRD ternormalisasi ke database. Periksa dan cadangkan database sebelum menjalankan karena sinkronisasi dapat menghapus entri SRD yang tidak lagi ada di sumber. |
| `npm run db:seed:srd:monsters` | Mengimpor monster SRD dari sumber normalisasi monster. |
| `npm run srd:extract` | Mengekstrak teks PDF SRD ke `data/srd/5.2.1/raw/pages.json`. |
| `npm run srd:validate` | Memvalidasi bentuk dan jumlah halaman pada `raw/pages.json`. |
| `npx tsc --noEmit` | Memeriksa tipe TypeScript tanpa menghasilkan file output. |
| `npx prisma validate` | Memvalidasi skema Prisma. |
| `npx tsx scripts/verify-dice.ts` | Menjalankan pemeriksaan mandiri notasi dadu. |
| `python scripts/srd/validate.py` | Menjalankan validator SRD secara langsung dengan Python. |

## Pemeriksaan dan build

Jalankan pemeriksaan berikut dari root proyek:

```sh
npx tsc --noEmit
npm run lint
npx prisma validate
npx tsx scripts/verify-dice.ts
npm run srd:validate
npm run build
```

`npm run srd:validate` memerlukan Python yang tersedia di `PATH`. Perintah ini memeriksa data hasil ekstraksi SRD, bukan koneksi database.

## Data SRD

Data lokal berada di `data/srd/5.2.1/`. Data ini memiliki lisensi **CC-BY-4.0**; informasi atribusi dan sumber resmi tersedia di [`data/srd/5.2.1/README.md`](data/srd/5.2.1/README.md).

- `normalized/srd_equipment.json` adalah file sumber ternormalisasi yang digunakan oleh seeder utama untuk menyinkronkan konten Compendium ke database.
- `raw/pages.json` berisi teks hasil ekstraksi dokumen SRD sebanyak 364 halaman.
- PDF sumber resmi tidak disertakan. Untuk membuat ulang hasil ekstraksi:

  ```sh
  python -m pip install -r requirements.txt
  ```

  Tempatkan PDF SRD berlisensi pada `data/srd/5.2.1/raw/SRD_CC_v5.2.1.pdf`, lalu jalankan:

  ```sh
  npm run srd:extract
  npm run srd:validate
  ```

Seeder melakukan sinkronisasi isi sumber ke database. Tinjau sumber dan cadangkan database sebelum menjalankannya, khususnya pada database yang sudah digunakan.

## Struktur folder

```text
.
├── data/
│   └── srd/
│       └── 5.2.1/
│           ├── normalized/
│           │   └── srd_equipment.json
│           ├── raw/
│           │   └── pages.json
│           ├── metadata.json
│           └── README.md
├── docs/
│   └── PROGRESS.md
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── scripts/
│   ├── srd/
│   │   ├── extract.py
│   │   ├── seed-all.ts
│   │   ├── seed-monsters.ts
│   │   └── validate.py
│   └── verify-dice.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── password-reset/
│   │   │   │       ├── confirm/route.ts
│   │   │   │       └── route.ts
│   │   │   ├── campaigns/
│   │   │   │   ├── [campaignId]/
│   │   │   │   │   ├── assistant/route.ts
│   │   │   │   │   ├── combat/
│   │   │   │   │   │   ├── [combatId]/route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── dice/route.ts
│   │   │   │   │   ├── encounter/options/route.ts
│   │   │   │   │   ├── maps/
│   │   │   │   │   │   ├── [mapId]/route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── npc/generate/route.ts
│   │   │   │   │   ├── party/route.ts
│   │   │   │   │   ├── records/route.ts
│   │   │   │   │   ├── search/route.ts
│   │   │   │   │   ├── sessions/
│   │   │   │   │   │   ├── [sessionId]/route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── story/
│   │   │   │   │   │   ├── notes/route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── compendium/route.ts
│   │   │   └── register/route.ts
│   │   ├── campaigns/
│   │   │   └── [campaignId]/
│   │   │       ├── autosave-note.tsx
│   │   │       ├── combat-d20.tsx
│   │   │       ├── command-palette.tsx
│   │   │       ├── compendium-browser.tsx
│   │   │       ├── dice-roller.tsx
│   │   │       ├── encounter-builder.tsx
│   │   │       ├── encounter-dice.tsx
│   │   │       ├── monster-roll-controls.tsx
│   │   │       ├── npc-workshop.tsx
│   │   │       ├── party-manager.tsx
│   │   │       ├── random-tables.tsx
│   │   │       ├── story-board.tsx
│   │   │       ├── workspace.tsx
│   │   │       └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── new-campaign-form.tsx
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── sign-out-button.tsx
│   └── lib/
│       ├── ai/gemini.ts
│       ├── auth/auth.ts
│       ├── config/env.ts
│       ├── db/prisma.ts
│       ├── dice/notation.ts
│       └── permissions/campaign.ts
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── package-lock.json
├── README.md
├── requirements.txt
└── tsconfig.json
```

Folder endpoint dinamis digambarkan dengan nama parameter dalam tanda kurung siku, sebagaimana konvensi Next.js:

- `src/app/api/` berisi route handler untuk autentikasi, reset kata sandi, registrasi, Compendium, serta fitur kampanye.
- `src/lib/ai/`, `auth/`, `config/`, `db/`, `dice/`, dan `permissions/` masing-masing memuat integrasi AI, autentikasi, konfigurasi, Prisma Client, logika notasi dadu, serta pemeriksaan akses kampanye.
- `prisma/schema.prisma` mendefinisikan model dan relasi database; setiap folder di `prisma/migrations/` menyimpan migrasi skema.
- `scripts/srd/` berisi ekstraktor, validator, dan seeder SRD. `scripts/verify-dice.ts` adalah pemeriksaan mandiri untuk logika dadu.
- `docs/PROGRESS.md` mencatat status implementasi dan verifikasi yang telah dilakukan.

## Gambaran arsitektur

1. Halaman dan komponen UI berada di `src/app/` menggunakan Next.js App Router.
2. Route handler di `src/app/api/` menerima permintaan aplikasi dan menerapkan autentikasi serta pemeriksaan izin sesuai fitur.
3. Akses database terpusat melalui Prisma Client di `src/lib/db/`, dengan skema dan migrasi dikelola pada `prisma/`.
4. Integrasi eksternal Gemini dan pemrosesan SRD berada di modul/skrip masing-masing; kunci API Gemini digunakan di server, bukan sebagai konfigurasi klien.

## Catatan deployment

- Siapkan database MySQL yang dapat diakses dari instance aplikasi, lalu atur `DATABASE_URL` dan `AUTH_SECRET` melalui konfigurasi secret deployment.
- Buat build dengan `npm run build`, terapkan migrasi yang telah ada dengan `npx prisma migrate deploy`, kemudian jalankan aplikasi dengan `npm run start`.
- Konfigurasikan `GEMINI_API_KEY` hanya jika fitur AI akan digunakan.
- Peta yang diunggah disimpan pada filesystem lokal (`storage/maps`). Deployment multi-instance atau filesystem sementara memerlukan penyimpanan bersama/persisten agar berkas dapat diakses dan tidak hilang.
- Jangan jalankan seeder sinkronisasi pada database produksi tanpa meninjau perilaku penghapusan dan membuat cadangan terlebih dahulu.

## Batasan yang diketahui

- Workspace yang tersedia terutama berorientasi pada DM; pengalaman pemain belum dikonfigurasi.
- Pengiriman email belum tersedia. Tautan reset kata sandi hanya dicatat di log saat pengembangan, sehingga alur reset belum siap untuk produksi.
- Fitur AI membutuhkan `GEMINI_API_KEY` yang valid.
- Peta menggunakan penyimpanan filesystem lokal secara default; penyimpanan terdistribusi belum disiapkan.
