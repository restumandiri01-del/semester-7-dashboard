# Audit & Hasil Uji — Semester 7 Academic OS

Dokumen ini menjawab tiga hal yang diminta di master prompt tetapi sebelumnya
saya sajikan dalam format yang berbeda: tabel audit per area, matriks QA, dan
changelog. Disimpan di repositori, bukan hanya di percakapan, supaya ikut
terversi bersama kodenya.

Versi aplikasi saat dokumen ini ditulis: **1.0.0**

---

## 1. Cara pengujian — baca ini dulu

Supaya tidak ada klaim yang lebih besar daripada kenyataannya.

**Yang benar-benar dijalankan**

- Microsoft Edge (Chromium) headless, mode `--headless=new`
- Render dan pemeriksaan DOM di lima tampilan, pada protokol `http://` dan `file://`
- Penangkapan `window.onerror`, `unhandledrejection`, dan `console.error`
- Pengukuran `scrollWidth` vs `clientWidth` pada 320 / 375 / 430 px lewat harness
  iframe. Edge headless memaksa viewport minimum 481 px, jadi screenshot lebar
  sempit tidak bisa dipercaya untuk memeriksa overflow
- Simulasi waktu dengan menimpa `Date`, untuk menguji perilaku Jumat malam dan Sabtu
- Empat skenario sumber data ujung ke ujung: Sheets berhasil, sebagian gagal,
  semua gagal dengan cache tersedia, dan tanpa tautan sama sekali
- Baris CSV sengaja dirusak untuk memastikan validasi menolaknya satu per satu
- `script.js` sengaja dibuat 404 untuk menguji jaring pengaman layar pembuka
- Kontras dihitung dari nilai token, lalu **diukur ulang dari piksel PNG yang
  benar-benar dirender** untuk lapisan grain
- Round-trip `sheets-template/*.csv` kembali masuk lewat `sheets.js`, dan
  hasilnya identik dengan `data.js`

**Yang TIDAK dijalankan — jangan dianggap sudah terverifikasi**

| Hal | Status |
| --- | --- |
| Pembaca layar sungguhan (NVDA, JAWS, VoiceOver) | **Belum.** Yang diperiksa hanya semantik dan atribut ARIA di DOM |
| Firefox, Safari, Chrome | **Belum.** Hanya Edge Chromium |
| Perangkat sentuh sungguhan | **Belum.** Hanya emulasi lebar viewport |
| Lighthouse / Core Web Vitals | **Belum diukur.** Tidak ada klaim angka LCP, CLS, atau INP |
| Zoom 200% dan 400% | **Belum diuji** |
| Google Sheets sungguhan | **Belum.** Diuji dengan CSV lokal yang isinya identik |
| Pemasangan PWA di ponsel | **Belum.** Yang terverifikasi hanya `beforeinstallprompt` terpicu |

---

## 2. Tabel audit per area

Tingkat: **Kritis** · **Tinggi** · **Sedang** · **Rendah**

| Area | Kondisi awal | Masalah | Tingkat | Tindakan |
| --- | --- | --- | --- | --- |
| Arsitektur HTML | Satu halaman, satu kontainer per tampilan | Tidak ada masalah struktural | Rendah | Ditambah `noscript` dan manifest bersyarat |
| HTML semantik | `header`/`nav`/`main`/`footer`/`search` sudah benar | `div.view` memakai `aria-label` tanpa `role`, sehingga diabaikan pembaca layar | Sedang | Ditambahkan `role="region"` |
| Arsitektur CSS | Token di `:root`, satu berkas | `z-index` ad hoc (40/100/200/300), urutannya tidak bisa diketahui tanpa membaca seluruh berkas | Rendah | Jadi token `--z-sticky` … `--z-modal` |
| Arsitektur JavaScript | Satu IIFE, fungsi-fungsi kecil | Tidak ada batas kesalahan; satu error mengosongkan seluruh tampilan | Tinggi | `guard()` per bagian |
| Manajemen state | Variabel modul dan objek `filters` | Tercampur, tetapi masih terkendali untuk ukuran ini | Rendah | Dibiarkan. Memecahnya jadi store hanya menambah lapisan tanpa manfaat |
| Arsitektur render | `innerHTML` per tampilan, dipicu perubahan signature | Render ulang penuh tiap kali status berubah | Sedang | Dibiarkan. Murah pada volume data ini; mengoptimalkannya sekarang prematur |
| Arsitektur data | `data.js` → `sheets.js` → `hydrate()` | Hanya dua lapis. Kegagalan jaringan langsung mundur ke data yang bisa usang berbulan-bulan | Tinggi | Tiga lapis, dengan cache di perangkat sebagai lapisan tengah |
| Penanganan event | Delegasi pada `main` dan `tabs` | Tidak ditemukan masalah | Rendah | — |
| Aksesibilitas | Skip link, aria-label, live region, focus ring | Perpindahan tampilan dan jumlah hasil pencarian tidak pernah diumumkan | Sedang | Diumumkan lewat live region, dengan jeda 700 ms supaya tidak jadi spam |
| Responsivitas | Breakpoint 1080/860/640/480/400 | Tidak ditemukan scroll horizontal | Rendah | Diverifikasi ulang setelah tiap perubahan |
| Performa | Satu `setInterval`, berhenti saat tab tersembunyi | `.quick-item:hover` menganimasikan `padding-left`, memicu layout tiap frame | Sedang | Diganti `transform` |
| UX | Lima tampilan, semuanya berfungsi | Kolom kiri dashboard kosong memanjang pada hari tanpa kelas | Sedang | Kartu "Menyusul" berisi jadwal nyata |
| Arsitektur informasi | Lima tampilan | Sudah sesuai kebutuhan. Menambah tab hanya akan jadi pengisi | Rendah | Tidak ditambah |
| Penanganan error | `try/catch` di render, fallback data | Satu baris spreadsheet yang rusak bisa membuang satu tab penuh | Tinggi | Validasi per baris, lengkap dengan nomor barisnya |
| Loading state | Teks "Menyiapkan dashboard" | Tidak informatif dan tidak mencegah pergeseran tata letak | Sedang | Skeleton yang mengikuti bentuk dashboard |
| Empty state | Ada di semua modul | Sabtu ditulis "kosong", padahal KRS menampilkan slot di sana | Sedang | Dijelaskan sebagai formalitas KRS |
| Navigasi keyboard | `/`, Escape, Tab | Tidak ada pintasan tingkat aplikasi | Sedang | Ctrl/⌘+K, ↑↓, Enter, dengan referensi di panel Tentang |
| Manajemen fokus | Focus ring konsisten | Belum ada dialog saat itu | — | Palette mengunci fokus dan mengembalikannya; Tentang memakai `<dialog>` bawaan |
| Persistensi | Tema di `localStorage` | Tampilan aktif tidak bertahan setelah muat ulang; tombol back tidak berfungsi | Tinggi | Routing fragmen |
| Maintainability | Komentar jelas, fungsi kecil | 13 gaya sebaris statis di `script.js` | Rendah | Tersisa 3, dan ketiganya memang nilai dinamis |
| Skalabilitas | Data puluhan entri | Pencarian linear tanpa peringkat | Sedang | Peringkat deterministik. Indexing belum diperlukan pada volume ini |
| Keamanan | `esc()` di semua titik, `textContent` untuk profil | Tidak ditemukan jalur XSS | Rendah | Highlight pencarian diperiksa ulang dan aman |
| Metadata SEO | `title` dan `description` | Tidak ada favicon, menghasilkan 404 di konsol | Rendah | Favicon plus `robots: noindex`. Open Graph sengaja tidak ditambahkan |
| Kesiapan PWA | Tidak ada | Tidak bisa dipasang, tidak ada ikon | Sedang | Manifest, service worker, ikon PNG dan SVG |
| Perilaku offline | Tidak ada | Halaman gagal terbuka tanpa jaringan | Tinggi | Service worker untuk kerangka, cache terpisah untuk data |
| Kompatibilitas peramban | Sintaks ES5, `color-mix`, `:is()` | `mask-composite` belum universal | Rendah | Dibungkus `@supports`; efeknya murni hiasan |

### Temuan paling serius

Tiga hal ini bukan soal selera, melainkan cacat yang benar-benar merugikan.

**1. Kritis — halaman blank permanen.**
Kelas `is-booting` dipasang skrip inline dan hanya dilepas oleh `script.js`.
Kalau `script.js` gagal dimuat — salah nama berkas, jaringan putus di tengah,
kesalahan sintaks — layar pembuka menutupi halaman selamanya dan `main` tetap
`opacity: 0`. Diperbaiki dengan animasi CSS `intro-failsafe` yang membuka
halaman setelah 3,2 detik tanpa melibatkan JavaScript sama sekali.

**2. Tinggi — hitung mundur ke kelas yang tidak pernah ada.**
Slot Sabtu Studi Literatur hanyalah formalitas KRS, tetapi ikut dihitung mesin
realtime. Akibatnya setiap Jumat malam dashboard menghitung mundur ke kelas yang
tidak pernah diadakan. Diperbaiki dengan memisahkan `realSessions()` dari
`SESSIONS`.

**3. Tinggi — jadwal hari Minggu terbuang diam-diam.**
`buildSchedule` menyaring dengan `c.day` yang truthy, sehingga `day = 0` selalu
ditolak tanpa pesan apa pun. Diperbaiki dengan validasi rentang 0–6.

Satu lagi ditemukan lewat screenshot, bukan lewat pembacaan kode: `display: flex`
pada `.palette-backdrop` mengalahkan `[hidden] { display: none }` bawaan
peramban, sehingga dialog perintah cepat **selalu terlihat**. Uji DOM sempat
lolos karena memeriksa properti `hidden`, bukan hasil render sesungguhnya.

---

## 3. Matriks QA

Legenda: ✅ diuji dan lulus · ⚠️ diperiksa di DOM, belum diuji dengan alat bantu sungguhan · ⬜ belum diuji

| Fitur | Desktop | Mobile | Keyboard | Pembaca layar | Offline | Error |
| --- | --- | --- | --- | --- | --- | --- |
| Navigasi & routing | ✅ Lima tampilan, hash, tombol back | ✅ 320/375/430 px | ✅ Tab, Enter | ⚠️ `aria-current`, `role="region"`, pengumuman live region | ✅ Service worker menyajikan `index.html` | ✅ Fragmen tak dikenal jatuh ke dashboard |
| Pencarian | ✅ Peringkat benar | ✅ Kolom selebar layar | ✅ `/`, Escape | ⚠️ Jumlah hasil diumumkan, berjeda 700 ms | ✅ Indeks dibangun dari data lokal | ✅ Nol hasil menampilkan empty state |
| Perintah cepat | ✅ Delapan perintah | ✅ Tombol header; panel muat di 320 px | ✅ Ctrl+K, ↑↓, Enter, Esc, fokus kembali ke pemicu | ⚠️ `role="dialog"`, `aria-modal`, `aria-activedescendant` | ✅ Tidak butuh jaringan | ✅ Perintah gagal ditangkap `try/catch` |
| Tema | ✅ Terang dan gelap | ✅ `theme-color` ikut berubah | ✅ Tombol fokusabel | ⚠️ `aria-label` berubah sesuai keadaan | ✅ Dibaca dari `localStorage` | ✅ `localStorage` diblokir, jatuh ke preferensi sistem |
| Jadwal & status realtime | ✅ Live, akan datang, selesai | ✅ Baris pecah jadi dua baris | ✅ — | ⚠️ Perubahan kelas berjalan diumumkan | ✅ Dihitung sepenuhnya di peramban | ✅ Jam salah bentuk ditolak validasi |
| Timeline Mathfest | ✅ 29 agenda, 5 peringatan | ✅ Kartu menumpuk vertikal | ✅ Chip fokusabel, `aria-pressed` | ⚠️ Peringatan memakai teks dan ikon, bukan warna saja | ✅ Data lokal | ✅ Fase tak dikenal masuk "Agenda Lain" |
| Panel Tentang | ✅ Terbuka dari tombol versi dan palette | ✅ Baris jadi vertikal | ✅ Esc menutup, fokus terkunci | ⚠️ `<dialog>` bawaan peramban | ✅ Tidak butuh jaringan | ✅ Tombol hapus hanya muncul bila ada cache |
| Sumber data & sinkronisasi | ✅ Empat skenario | ✅ Status muat di footer | ✅ Tombol perbarui fokusabel | ⚠️ Status diumumkan setelah sinkronisasi | ✅ Cache dipakai, umurnya ditulis apa adanya | ✅ Baris rusak dibuang satu per satu |
| Layar pembuka | ✅ Muncul lalu memudar | ✅ — | ✅ Tombol apa pun melewatinya | ✅ `aria-hidden`, tidak ikut dibaca | ✅ — | ✅ `script.js` 404, CSS membuka setelah 3,2 detik |
| Zoom 200% / 400% | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Firefox / Safari | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## 4. Changelog

### Ditambahkan

- Routing fragmen: `#dashboard`, `#jadwal`, `#aktivitas`, `#bimbingan`,
  `#mathfest`, dan `#cari=<kata>`. Muat ulang, tombol back, serta tautan langsung
- Judul dokumen mengikuti tampilan yang sedang aktif
- Perintah cepat `Ctrl`/`⌘`+`K`, dengan penguncian fokus dan tombol tersendiri
  untuk layar sentuh
- Panel Tentang: versi, sumber data, umur salinan, referensi pintasan papan
  ketik, dan penghapusan salinan lokal
- Konstanta versi `APP_VERSION`, tampil sebagai tombol kecil di footer
- Cache data di perangkat sebagai lapisan kedua sumber data
- Status sinkronisasi di footer, bisa diklik untuk menyegarkan
- PWA: `manifest.json`, `service-worker.js`, ikon PNG 192/512/180 dan SVG
- Skeleton loading yang mengikuti bentuk dashboard
- Pesan `noscript`
- Validasi skema per baris untuk keenam tab spreadsheet
- `guard()` sebagai batas kesalahan per bagian
- Kartu "Menyusul" untuk hari yang lengang
- Sorotan tepi mengikuti kursor, grain halaman, dan permukaan bertingkat dua
- `tools/export-sheets-csv.js` beserta `sheets-template/` berisi enam CSV siap impor
- Dokumen ini

### Diubah

- Slot formalitas KRS dikeluarkan dari mesin realtime, tetapi tetap tampil di
  tab Jadwal dengan penanda eksplisit
- Hasil pencarian diberi peringkat: judul persis, diawali, mengandung, lalu metadata
- Angka SKS diperbesar dengan tracking yang pantas untuk data
- Avatar jadi squircle
- Reveal saat scroll jadi blur-ke-tajam
- Chevron aksi cepat pindah ke sumur bundarnya sendiri
- `theme-color` mengikuti tema yang dipilih manual
- Manifest dipasang bersyarat dari skrip inline
- `z-index` jadi skala token
- Kontainer tampilan diberi `role="region"`

### Diperbaiki

- Halaman blank permanen bila `script.js` gagal dimuat
- Hitung mundur ke slot Sabtu yang tidak pernah diadakan
- Baris jadwal `day = 0` (Minggu) yang terbuang diam-diam
- `.palette-backdrop` selalu terlihat karena `display: flex` mengalahkan `[hidden]`
- Animasi keluar layar pembuka tidak pernah terlihat karena `display: none`
  kembali berlaku lebih dulu
- Fokus tidak kembali ke pemicu setelah perintah cepat ditutup
- Escape tidak menutup panel Tentang pada jalur cadangan tanpa `<dialog>`
- `padding-left` yang ikut dianimasikan pada `.quick-item`
- Peringatan CORS manifest saat dibuka lewat `file://`
- Opasitas grain yang menjatuhkan `--text-subtle` ke 4,16:1

### Dihapus

- Pasangan `<meta name="theme-color">` berbasis `prefers-color-scheme`
- Sepuluh gaya sebaris statis di `script.js`
- Animasi `padding-left` pada hover aksi cepat

---

## 5. Yang sengaja tidak dikerjakan

Alasannya sama untuk semuanya, dan master prompt sendiri melarang mengisi
antarmuka dengan data yang tidak nyata.

**Butuh data buatan pengguna yang belum ada tempatnya:** sistem tugas dan
deadline, catatan, tagging, analitik dan grafik, kalender bulanan, weekly
review, notification center, toast, ekspor/impor/backup, halaman detail mata
kuliah, dashboard yang bisa dikustomisasi, serta mode fokus.

Semuanya menuntut penyimpanan lokal yang bisa ditulis pengguna. Itu keputusan
arsitektur besar yang belum pernah diminta.

**Ditolak karena bertabrakan dengan batasan proyek:** migrasi framework, GSAP,
whitespace ala landing page, glassmorphism menyeluruh, foto stok, dan bottom
navigation. Lima tab sudah muat dan teruji tanpa overflow di 320 px.

---

## 6. Prioritas berikutnya

| Prioritas | Item | Alasan |
| --- | --- | --- |
| P0 | Isi enam tautan Google Sheets | Tanpa ini, cache dan status sinkronisasi belum pernah terpakai sungguhan |
| P1 | Uji dengan pembaca layar sungguhan | Semantiknya sudah benar di DOM, tetapi belum pernah benar-benar didengar |
| P1 | Uji di Firefox dan Safari | `mask-composite`, `color-mix`, dan `<dialog>` perlu konfirmasi |
| P2 | Zoom 200% dan 400% | Persyaratan WCAG yang belum diperiksa sama sekali |
| P2 | Ukur dengan Lighthouse | Supaya klaim performa punya angka, bukan perkiraan |
| P3 | Penyimpanan lokal untuk tugas dan catatan | Pintu masuk ke separuh fitur yang belum dikerjakan |
