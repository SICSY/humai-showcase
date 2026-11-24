# Humai Showcase

Situs showcase satu halaman untuk **Humai** — dari lapangan, di luar lapangan, hingga Yayasan Humai. Dibangun sebagai pengalaman visual interaktif: tipografi editorial, animasi scroll, shader, dan adegan 3D.

## Sekilas

- Halaman utama `/` (alias `/humaini`) berisi hero sinematik, momen, kutipan, karya, kemitraan, dan yayasan.
- Animasi scroll memakai GSAP + ScrollTrigger dan Lenis untuk smooth scrolling.
- Adegan 3D memakai Three.js + React Three Fiber + Drei, dengan post-processing dan shader kustom.
- Dukungan `prefers-reduced-motion` untuk aksesibilitas.
- Siap dideploy ke Vercel tanpa konfigurasi tambahan.

## Teknologi

| Kategori | Library |
| --- | --- |
| Framework | Next.js 16 (Pages Router, Turbopack) |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Animasi | GSAP, ScrollTrigger, Lenis |
| 3D / Shader | Three.js, React Three Fiber, Drei, postprocessing |
| Video | Remotion Player |
| Font | `next/font/google` (Anton, Space Grotesk, Space Mono, Instrument Serif) |
| Package manager | pnpm 10.22.0 |

## Prasyarat

- Node.js **>= 20.9.0** (disarankan 22, lihat `.nvmrc`)
- pnpm 10.22.0 — aktifkan dengan `corepack enable`

```bash
node -v
corepack enable
pnpm -v
```

## Menjalankan secara lokal

```bash
pnpm install
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Script

| Perintah | Keterangan |
| --- | --- |
| `pnpm dev` | Menjalankan development server |
| `pnpm build` | Membuat production build |
| `pnpm start` | Menjalankan production server hasil build |
| `pnpm lint` | Menjalankan ESLint |
| `pnpm typecheck` | Memeriksa tipe TypeScript |

## Struktur proyek

```text
src/
├── pages/
│   ├── index.tsx        # alias ke halaman humaini
│   ├── humaini.tsx      # halaman utama + metadata
│   ├── _app.tsx
│   ├── _document.tsx
│   └── api/hello.ts     # contoh API route
├── components/humaini/  # section & adegan (header, hero, sculpt, dll.)
│   └── sculpt/          # shader, partikel, dan post-processing
├── lib/                 # konfigurasi & data konten
└── styles/globals.css   # Tailwind + style global
public/                  # gambar, video, model .glb, dan tekstur
vercel.json              # konfigurasi deploy Vercel
```

## Deploy ke Vercel

### Opsi 1 — Import dari GitHub (disarankan)

1. Pastikan perubahan sudah di-push ke branch `main` di repository ini.
2. Buka [vercel.com/new](https://vercel.com/new), pilih **Import Git Repository**, lalu pilih repository `humai-showcase`.
3. Vercel akan mendeteksi Next.js dan pnpm secara otomatis. `vercel.json` sudah menetapkan `framework: nextjs`, `pnpm build`, dan `pnpm install --frozen-lockfile`.
4. Klik **Deploy**. Build command: `pnpm build`, output: `.next`.

Setiap push ke `main` akan otomatis membuat deployment produksi; branch dan PR lain mendapat preview deployment.

### Opsi 2 — Vercel CLI

```bash
pnpm dlx vercel login
pnpm dlx vercel          # preview
pnpm dlx vercel --prod   # produksi
```

### Environment variables

Saat ini tidak ada environment variable yang wajib. Jika konten atau analytics ditambahkan kemudian, tambahkan variabelnya di **Project Settings → Environment Variables** di dashboard Vercel.

## Catatan

Aset berat (model `.glb`, video, dan tekstur) disimpan di `public/` sehingga ikut terdeploy bersama aplikasi.
7