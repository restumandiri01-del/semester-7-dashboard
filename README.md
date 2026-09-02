# Semester 7 Academic OS

Dashboard akademik pribadi untuk Restu Mandiri (1237010016 · Matematika · Semester 7 · 2026/2027).

HTML + CSS + JavaScript murni. Tanpa build step, tanpa bundler, tanpa framework.

Audit per area, matriks QA, dan changelog ada di **[AUDIT.md](AUDIT.md)** —
termasuk daftar jujur hal apa saja yang belum diuji.

Satu-satunya sumber daya eksternal adalah font Plus Jakarta Sans dari Google
Fonts. Tanpa koneksi internet aplikasi tetap berjalan penuh — font otomatis
turun ke stack sistem yang sudah disiapkan di `style.css`.

## Menjalankan

Klik dua kali `index.html`. Selesai.

Semua file dimuat sebagai `<script src>` dan `<link>` biasa (bukan ES module), jadi
aplikasi berjalan penuh lewat `file://` tanpa perlu server.

Satu catatan kecil: pilihan tema disimpan di `localStorage`. Chrome dan Firefox
mengizinkannya untuk file lokal, Safari tidak. Kalau browsermu memblokirnya,
aplikasi tetap berjalan normal — temanya hanya kembali mengikuti tema sistem
setiap kali dibuka.

## Struktur

```
index.html          kerangka halaman (header, navigasi, kontainer tampilan)
style.css           design token + seluruh style
data.js             data cadangan — lapisan terakhir kalau semua sumber lain gagal
sheets.js           ambil + urai CSV dari Google Sheets, validasi, dan cache
script.js           logika: turunan data, render, mesin realtime, filter, pencarian, tema
manifest.json       metadata PWA supaya bisa dipasang di layar utama
service-worker.js   cache kerangka aplikasi agar tetap terbuka tanpa jaringan
favicon.svg         ikon tab peramban
icon-192.png        ikon PWA
icon-512.png        ikon PWA (termasuk maskable)
apple-touch-icon.png ikon layar utama iOS

AUDIT.md            tabel audit per area, matriks QA, dan changelog
tools/              skrip bantu, tidak ikut dimuat situs
sheets-template/    enam CSV siap impor ke Google Sheets
```

Yang benar-benar dikirim ke peramban hanya berkas di akar. `tools/` dan
`sheets-template/` ada untuk menyiapkan spreadsheet, bukan untuk dijalankan
situsnya.

## Dari mana datanya?

Ada tiga lapis sumber, dicoba berurutan:

| Urutan | Sumber | Kapan dipakai |
| --- | --- | --- |
| 1 | Google Sheets (CSV) | Selalu dicoba lebih dulu kalau tautannya sudah diisi |
| 2 | Cache di perangkat | Kalau jaringan gagal — berisi hasil pengambilan terakhir yang berhasil |
| 3 | `data.js` | Kalau tautan belum diisi, atau belum pernah ada pengambilan yang berhasil |

Lapisan kedua ini yang membuat dashboard tetap berguna di kampus tanpa sinyal:
yang tampil adalah jadwal yang kemarin kamu ubah dari ponsel, bukan `data.js`
yang bisa jadi sudah usang berbulan-bulan.

Kegagalan ditangani **per bagian**, jadi kalau hanya tab `jadwal` yang rusak,
bagian lain tetap memakai data terbaru. Baris yang salah isi dibuang satu per
satu, bukan setabnya — satu salah ketik tidak pernah mengosongkan jadwal.

Status di footer menyebut keadaan sebenarnya, bukan yang paling enak dibaca:

| Status | Artinya |
| --- | --- |
| `Tersinkron 14.32` | Semua tab baru saja diambil dari Sheets |
| `Sebagian tersinkron 14.32` | Sebagian tab berhasil, sisanya memakai lapisan di bawahnya |
| `Gagal menyambung · data tersimpan 2 jam lalu` | Jaringan gagal, yang tampil adalah salinan |
| `Offline · data tersimpan kemarin` | Perangkat offline, yang tampil adalah salinan |
| `Data akademik dikelola di data.js` | Tautan Sheets belum diisi |

Klik status itu untuk menyinkronkan ulang tanpa memuat ulang halaman. Rincian
teknis setiap kegagalan dan setiap baris yang dibuang dicetak ke konsol
peramban, lengkap dengan nomor barisnya di spreadsheet.

### Menyiapkan Google Sheets

**Jalan cepat.** Berkas di `sheets-template/` sudah berisi data yang sama persis
dengan `data.js`, dalam format yang siap diimpor. Tidak perlu mengetik ulang 56
baris timeline Mathfest.

1. Buat spreadsheet baru
2. Untuk tiap berkas di `sheets-template/`: **File → Import → Upload**, pilih
   **Insert new sheet(s)**, lalu ganti nama tabnya sesuai nama berkas
   (`pengaturan`, `jadwal`, `aktivitas`, `bimbingan`, `kalender`, `mathfest`)
3. **File → Share → Publish to web** → pilih satu tab → **Comma-separated values
   (.csv)** → salin tautannya
4. Ulangi untuk keenam tab, tempel keenam tautan ke `SHEET_CSV_URLS` di
   `sheets.js`

Kalau `data.js` berubah dan CSV-nya ingin disegarkan:

```
node tools/export-sheets-csv.js
```

Skrip itu membaca `data.js` langsung, jadi isinya tidak mungkin melenceng. Tanpa
dependensi apa pun — hanya modul bawaan Node.

**Jalan manual.** Kalau ingin menyusun sendiri, buat spreadsheet dengan **6 tab**.
Baris pertama tiap tab wajib berisi nama kolom persis seperti berikut:

| Tab | Kolom |
| --- | --- |
| `pengaturan` | `kunci`, `nilai` |
| `jadwal` | `id`, `name`, `day`, `start`, `end`, `sks`, `room`, `lecturer`, `kind`, `category` |
| `aktivitas` | `id`, `name`, `code`, `sks`, `category`, `group`, `status`, `tone`, `topic`, `supervisor`, `classgroup`, `progress`, `deadline`, `note`, `session_day`, `session_start`, `session_end`, `session_room`, `session_lecturer`, `session_formality` |
| `bimbingan` | `id`, `type`, `topic`, `supervisor`, `status`, `tone`, `time`, `place`, `category`, `note` |
| `kalender` | `id`, `name`, `start`, `end`, `critical` |
| `mathfest` | `id`, `phase`, `agenda`, `sub`, `start`, `end`, `when`, `place`, `needs`, `pj`, `relevance` |

Tab `pengaturan` memakai pasangan kunci/nilai, misalnya:

```
profil.name          Restu Mandiri
profil.nim           1237010016
semester.startDate   2026-08-31
mathfest.role        Divisi Kompetisi
kategori.perkuliahan Perkuliahan
fase.september       September 2026
```

Lalu **File → Share → Publish to web**, pilih tiap tab, format **CSV**, dan
salin tautannya ke `SHEET_CSV_URLS` di `sheets.js`.

Selama tautannya masih `YOUR_GOOGLE_SHEETS_CSV_LINK_HERE`, aplikasi memakai
`data.js` seperti biasa — jadi aman ditinggal dalam keadaan belum dikonfigurasi.

### Yang perlu diketahui sebelum memakai Sheets

- **Spreadsheet yang di-publish dapat dibaca siapa pun yang punya tautannya.**
  Jangan memasukkan data yang tidak boleh dilihat orang lain.
- **Membuka `index.html` dengan klik dua kali tetap bisa**, tetapi selalu
  memakai `data.js`. Browser memblokir `fetch()` ke domain luar dari `file://`.
  Data dari Sheets hanya terbaca lewat http/https, misalnya di Vercel.
- **Tab yang kosong atau salah nama kolom diabaikan**, bukan menghapus data.
  Ini mencegah dashboard mendadak kosong karena salah ketik satu nama kolom.
- Perubahan di spreadsheet butuh beberapa menit untuk muncul, karena Google
  menyimpan sementara hasil publikasinya.

Ringkasan SKS, jadwal hari ini, kelas berikutnya, status, pencarian, dan filter
semuanya dihitung dari `data.js`. Tidak ada angka akademik yang ditulis ulang di
`index.html` maupun `script.js`.

## Mengubah data

Semua di `data.js`.

### Data pribadi — `profileData`

```js
const profileData = {
  name: 'Restu Mandiri',
  initials: 'RM',        // dipakai untuk avatar
  nim: '1237010016',
  program: 'Matematika',
  semester: 7,
  academicYear: '2026/2027',
};
```

### Jadwal kuliah — `scheduleData`

Tambah atau ubah objek di dalam array:

```js
{
  id: 'nama-unik',            // bebas, asal tidak kembar
  name: 'Nama Mata Kuliah',
  day: 1,                     // 1=Senin 2=Selasa 3=Rabu 4=Kamis 5=Jumat 6=Sabtu
  start: '09:30',             // format 24 jam, WAJIB 'HH:MM'
  end: '12:00',
  sks: 3,
  room: '302',
  lecturer: 'Ibu Asti',
  kind: 'Perkuliahan Reguler',
  category: 'perkuliahan',
}
```

Total SKS kuliah, jumlah kelas per hari, status, dan countdown ikut menyesuaikan sendiri.

### Aktivitas akademik — `academicActivities`

```js
{
  id: 'studi-literatur',
  name: 'Studi Literatur',
  code: '70101024',
  sks: 2,
  category: 'studi-literatur',   // kunci dari categoryLabels
  group: 'non-perkuliahan',      // atau 'formalitas'
  status: 'Berjalan',
  tone: 'success',               // success | warning | neutral | muted
  topic: 'Studi Literatur Keuangan',
  supervisor: 'Fahrudin Muhtarulloh, S.Si., M.Sc.',
  classGroup: 'J',
  session: {                     // null bila belum punya hari/jam tetap
    day: 6, start: '10:20', end: '12:00',
    room: 'Lab MIK',
    lecturer: 'Fahrudin Muhtarulloh, S.Si., M.Sc.',
    formality: true,             // slot KRS yang tidak benar-benar berjalan
  },
  progress: null,
  deadline: null,
  note: null,
}
```

**`session` adalah kuncinya.** Aktivitas yang punya `session` ikut muncul di
jadwal mingguan, jadwal hari ini, dan hitung mundur kelas berikutnya — persis
seperti mata kuliah. Yang `session`-nya `null` masuk ke bagian "Tanpa Jadwal
Tetap". Begitu Seminar Studi Literatur dapat jadwal, cukup isi `session`-nya dan
seminar otomatis muncul di semua tampilan.

SKS aktivitas tetap dihitung sebagai **beban tambahan**, bukan perkuliahan
reguler — jadi pemisahan 15 / 7 / 22 SKS tidak berubah walau aktivitasnya
terjadwal.

`formality: true` di dalam `session` menandai slot yang hanya muncul sebagai
formalitas KRS di SALAM padahal tidak ada kelas atau bimbingan yang benar-benar
berjalan. Slot seperti ini tetap tampil di jadwal mingguan (supaya cocok dengan
SALAM), tetapi **tidak pernah dihitung sebagai bentrok** oleh deteksi bentrok
di tampilan Mathfest.

Isi `null` pada field yang belum diketahui — aplikasi menampilkannya sebagai
**Belum ditentukan**, bukan mengarang isi.

### Bimbingan — `guidanceData`

Tambahkan entri baru setiap kali ada jadwal bimbingan yang disepakati:

```js
{
  id: 'bimbingan-2',
  type: 'Studi Literatur',
  topic: 'Studi Literatur Keuangan',
  supervisor: 'Pak Rudi',
  status: 'Terjadwal',
  tone: 'success',
  time: 'Rabu, 10.00',
  place: 'Ruang Dosen',
  category: 'bimbingan',
  note: null,
}
```

### Progress semester — `semesterConfig`

Sudah terisi dari Kalender Akademik Ganjil 2026/2027:

```js
const semesterConfig = {
  semester: 7,
  academicYear: '2026/2027',
  startDate: '2026-08-31',   // awal kuliah
  endDate: '2026-12-31',     // hari terakhir UAS
};
```

Kalau keduanya dikosongkan (`null`), kartu Progress Semester otomatis kembali
menampilkan pesan "belum dikonfigurasi" — tidak error.

### Agenda akademik — `academicCalendar`

Daftar tanggal penting yang tampil di kartu Progress Semester. Tanda
"N hari lagi" otomatis menempel pada agenda terdekat yang belum lewat, dan
agenda yang sedang berjalan ditandai "Berlangsung".

```js
{ id: 'uts', name: 'UTS', start: '2026-10-19', end: '2026-10-23' }
```

Untuk agenda satu hari, isi `start` dan `end` dengan tanggal yang sama.

Tandai `critical: true` pada agenda yang tidak boleh ditabrak kegiatan lain
(UTS dan UAS). Hanya agenda bertanda ini yang dipakai deteksi bentrok Mathfest.

### Kepanitiaan Mathfest — `mathfestConfig`, `mathfestPhases`, `mathfestTimeline`

Tab **Mathfest** menampilkan seluruh timeline kepanitiaan, difilter secara
default ke agenda divisi sendiri.

Disesuaikan dengan *Pengumuman Divisi Panitia Mathfest 2026*.

```js
const mathfestConfig = {
  name: 'Mathfest 2026',
  organization: 'HIMATIKA',
  role: 'Divisi Kompetisi',              // dipakai sebagai label filter — jaga tetap pendek
  division: 'kompetisi',
  position: 'Anggota',                   // jabatan sebenarnya
  divisionHead: 'Risa Namira Sundari',   // PJ Divisi Kompetisi
  chair: 'Fitri Fhaturrahma Malik',      // Ketua Pelaksana
  steeringCommittee: 'Bayu Wiji Santoso',
  generalHead: 'Regana Fikri Adiba',     // Penanggung Jawab Umum
};
```

`role` sengaja dibiarkan pendek karena dipakai sebagai label chip filter
"Lingkup"; jabatan lengkap disimpan terpisah di `position` dan ditampilkan
sebagai "Anggota Divisi Kompetisi".

Menambah kunci baru berawalan `mathfest.` di tab `pengaturan` otomatis terbawa
tanpa perlu mengubah kode.

**Catatan sumber:** timeline kepanitiaan menulis divisi media kreatif sebagai
"Medkraft", sedangkan pengumuman resmi menulis "Medkraf". Data mengikuti
pengumuman resmi.

### Susunan kepanitiaan — `mathfestTeam`, `mathfestDivisionHeads`

```js
const mathfestTeam = [
  { name: 'Risa Namira Sundari', batch: '2023', role: 'Penanggung Jawab' },
  { name: 'Restu Mandiri', batch: '2023', role: 'Anggota' },
];

const mathfestDivisionHeads = [
  { id: 'acara', name: 'Divisi Acara', head: 'Muhamad Dafo Saprudin', batch: '2023' },
];
```

Ruang lingkupnya sengaja dibatasi: **anggota divisi sendiri dicatat lengkap,
divisi lain hanya penanggung jawabnya.** Nama anggota divisi lain tidak
disimpan karena repositori dan situs ini bersifat publik, sedangkan poster
pengumuman hanya beredar di lingkup himpunan.

Baris yang namanya sama dengan `profileData.name` otomatis ditandai "kamu" —
tidak perlu penanda khusus di data.

Kedua daftar ini **tidak diambil dari Google Sheets**, karena susunan panitia
tidak berubah sepanjang acara. Ubah langsung di `data.js` bila perlu.

Nama panitia juga masuk indeks pencarian, jadi menekan `/` lalu mengetik nama
akan menemukan orangnya beserta divisi dan angkatannya.

Tiap agenda:

```js
{
  id: 'okt-tm-komet',
  phase: 'oktober',              // id dari mathfestPhases
  agenda: 'Technical Meeting',
  sub: 'Komet',                  // boleh null
  start: '2026-10-31',
  end: '2026-10-31',
  when: null,                    // dipakai bila start/end null, mis. 'Setiap H-2 minggu'
  place: 'Lab/Kelas',
  needs: null,                   // kolom "What's We Need"
  pj: 'Panitia Kegiatan, Kompetisi',
  relevance: 'utama',
}
```

`relevance` menentukan apa yang tampil pada filter **Lingkup**:

| Nilai | Arti |
| --- | --- |
| `'utama'` | penanggung jawab menyebut divisi sendiri secara eksplisit |
| `'terkait'` | pekerjaan seputar lomba, dikoordinasi divisi lain |
| `null` | agenda divisi lain — hanya muncul pada filter "Semua Divisi" |

**Deteksi bentrok** berjalan otomatis. Sebuah agenda ditandai bila:

- rentang tanggalnya beririsan dengan agenda akademik bertanda `critical`
  (bertabrakan — merah), atau agenda `critical` menyusul dalam 3 hari
  (berdekatan — kuning);
- agenda satu hari jatuh pada hari yang ada jadwal kuliahnya. Sesi bertanda
  `formality: true` dilewati, sehingga slot Sabtu Studi Literatur tidak pernah
  memunculkan peringatan palsu.

## Pintasan

| Tombol | Fungsi |
| --- | --- |
| `Ctrl`/`Cmd` + `K` | Buka perintah cepat |
| `/` | Fokus ke kolom pencarian |
| `Esc` | Tutup perintah cepat, atau bersihkan pencarian dan kembali ke tampilan sebelumnya |
| `↑` `↓` | Pilih di perintah cepat |
| `Enter` | Jalankan perintah yang terpilih |
| `Tab` | Navigasi keyboard penuh dengan focus ring yang terlihat |

Di layar sentuh, perintah cepat punya tombolnya sendiri di header — pintasan
papan ketik tidak pernah menjadi satu-satunya jalan ke sebuah fitur. Daftar
pintasan ini juga tersedia di dalam aplikasi: klik nomor versi di footer, atau
cari "Tentang" di perintah cepat.

Setiap tampilan punya alamatnya sendiri, jadi memuat ulang tetap mendarat di
tempat yang sama dan tombol back peramban bekerja seperti biasa:

```
#dashboard   #jadwal   #aktivitas   #bimbingan   #mathfest   #cari=analisis
```

## Design system — "Kertas & Tinta"

Seluruh tampilan memakai satu sistem yang didefinisikan sebagai design token di
bagian atas `style.css`. Untuk mengganti nuansa aplikasi, ubah token-nya saja —
jangan warna per komponen.

| Aspek | Pilihan | Alasan |
| --- | --- | --- |
| Gaya | Flat + elevasi seperlunya | Ringan dan cepat, tetapi kartu tetap terbaca sebagai lapisan |
| Latar | Kertas hangat `#F7F6F3` | Menghindari kesan sistem kampus yang dingin dan birokratis |
| Aksi | Tinta teal `#0F766E` | Tenang dan fokus, cocok untuk alat belajar |
| Sorotan | Stabilo oranye `#C2410C` | Dipakai hemat, hanya untuk hal mendesak dan penanda hari ini |
| Judul | Playfair Display | Serif display memberi kesan editorial — ini pembeda terbesar dari tampilan admin biasa |
| Teks & UI | Plus Jakarta Sans | Ramah tapi profesional |
| Angka & jam | Plus Jakarta Sans + `tabular-nums` | Dulu monospace, tapi itu membuat dashboard terasa seperti editor kode. `tabular-nums` menjaga digit tetap lurus tanpa kesan itu. Monospace kini hanya untuk `<code>` dan tuts `/` |
| Hero band | Gradien radial + grain diagonal | Kesan "mahal" tanpa file gambar, jadi halaman tetap ringan |
| Tekstur halaman | Grain fractalNoise di belakang konten | Menghapus kesan vektor datar. Sengaja di belakang, bukan di atas teks — lihat catatan kontras di bawah |
| Kartu fokus | Baki + inti (permukaan bertingkat dua) | Radius dalam = radius luar − lebar baki, jadi lengkungnya konsentris. Hanya untuk kartu terpenting; kalau semua bertingkat, tidak ada yang menonjol |
| Kartu biasa | Kilau tepi 1px + bayangan hangat | Membuat kartu terbaca sebagai permukaan yang ditimpa cahaya, bukan kotak putih bergaris abu |
| Sorotan kursor | Cincin 1px yang menyala mengikuti kursor | Hanya di penunjuk presisi, mati saat reduced-motion |
| Avatar | Squircle 13px | Avatar bundar adalah bawaan semua orang |
| Chevron aksi cepat | Tombol di dalam tombol | Chevron duduk di sumur bundarnya sendiri, bukan menggantung di ujung kanan |
| Gerak | Layar pembuka, reveal blur-ke-tajam saat scroll, angka menghitung naik, cincin progress | Terasa hidup tanpa memperlambat |
| Easing | `--ease`, `--ease-out`, `--ease-spring` | Pegas hanya untuk hal yang harus terasa punya massa (tombol ditekan, ikon bergeser), bukan untuk perpindahan tampilan |
| Lapisan | `--z-sticky` … `--z-modal` | Skala tetap, bukan angka yang dipilih ad hoc |
| Spasi | Kelipatan 4 (`--space-1` … `--space-12`) | Ritme vertikal konsisten di semua tampilan |
| Motion | 140–220ms | Cukup terasa, tidak memperlambat |

Mode terang dan gelap didefinisikan terpisah — bukan sekadar warna dibalik.
Bayangan, warna aksen, dan warna status masing-masing disetel ulang di
`[data-theme="dark"]`.

## Catatan teknis

- **Panel Tentang** (nomor versi di footer) menampilkan versi, dari mana data
  yang sedang tampil berasal, umur salinan tersimpan, referensi pintasan, dan
  tombol menghapus salinan lokal. Memakai `<dialog>` bawaan peramban, sehingga
  penguncian fokus dan tombol Escape datang dari peramban — bukan ditiru ulang
  dengan JavaScript yang bisa salah.
- **Versi** memakai semantic versioning, disimpan sebagai `APP_VERSION` di
  `script.js`. Naikkan MINOR untuk fitur baru yang tidak merusak apa pun, PATCH
  untuk perbaikan.
- Hanya dua hal yang disimpan peramban: pilihan tema, dan salinan terakhir data
  akademik. Tidak ada yang dikirim ke mana pun.
- Tema mengikuti preferensi sistem sampai kamu memilih sendiri; pilihan disimpan di `localStorage`.
- Satu `setInterval` untuk seluruh aplikasi, otomatis berhenti saat tab tidak terlihat.
- Render ulang hanya terjadi saat status jadwal berubah, bukan tiap detik.
- Seluruh pasangan warna teks diverifikasi >= 4.5:1 (WCAG AA) dan batas kontrol
  form >= 3:1 (WCAG 1.4.11), pada mode terang maupun gelap.
- Tidak ada scroll horizontal sampai lebar 320px; `.tabs` dan `.chip-group`
  memang dapat digeser ke samping, dan itu disengaja.
- **Layar pembuka** hanya muncul kalau `<html>` diberi kelas `is-booting` oleh
  skrip inline di `index.html`. Tanpa JavaScript kelas itu tidak pernah
  terpasang. Ada empat jaring pengaman untuk menutupnya: klik atau tombol apa
  pun, event `load`, batas paksa 2,6 detik dari JavaScript, dan — yang paling
  penting — animasi CSS `intro-failsafe` yang membuka halaman setelah 3,2 detik
  **tanpa melibatkan JavaScript sama sekali**. Jaring keempat ini menutup satu
  jalur kegagalan nyata: kalau `script.js` gagal dimuat (salah nama berkas,
  jaringan putus di tengah, kesalahan sintaks), dulu halaman tertutup selamanya
  di balik layar pembuka.
- **Slot formalitas.** Sesi dengan `formality: true` — saat ini hanya Studi
  Literatur Sabtu — tertulis di KRS tetapi tidak benar-benar berjalan. Slot
  seperti ini tetap tampil di tab Jadwal, ditandai garis putus-putus, lencana
  "Formalitas KRS", dan catatan teksnya. Tetapi slot ini **tidak pernah** masuk
  mesin realtime: bukan "kelas berikutnya", tidak dihitung mundur, tidak muncul
  di Jadwal Hari Ini, dan tidak pernah dianggap bentrok. Tanpa pemisahan ini,
  setiap Jumat malam dashboard akan menghitung mundur ke kelas yang tidak ada.
- **Validasi data dari Sheets.** Spreadsheet diisi dari ponsel, jadi salah ketik
  itu normal. `day` harus 0–6, jam harus `HH:MM` dan tidak terbalik, tanggal
  harus benar-benar ada (`2026-02-31` ditolak, bukan digeser). Baris yang gagal
  dibuang sendirian dengan alasan dan nomor barisnya di konsol.
- **Batas kesalahan per bagian.** Setiap bagian besar dibungkus `guard()`. Kalau
  satu bagian gagal dirender, bagian itu diganti pesan singkat dan sisa halaman
  tetap bisa dipakai — bukan seluruh tampilan yang kosong.
- **PWA.** `service-worker.js` menyimpan kerangka aplikasi (HTML, CSS, JS, ikon,
  font) sehingga dashboard tetap terbuka tanpa jaringan. Service worker sengaja
  **tidak** menyimpan CSV Google Sheets: kalau ikut disimpan, kamu bisa melihat
  jadwal lama sambil footer menulis "Tersinkron". Umur data adalah urusan cache
  di `sheets.js`, yang tahu cara menjelaskannya kepada pengguna.
- Service worker hanya didaftarkan di `https` atau `localhost`. Membuka lewat
  `file://` melewatinya begitu saja.
- **Reveal saat scroll** memakai `IntersectionObserver`. Kelas `.reveal` hanya
  dipasang dari JavaScript — tanpa JS atau tanpa `IntersectionObserver`, tidak
  ada elemen yang pernah disembunyikan.
- `prefers-reduced-motion` dihormati: layar pembuka dilewati sepenuhnya, reveal
  dimatikan, hitung-naik angka dilewati, dan seluruh transform dimatikan. Nilai akhir sudah ada di HTML sejak awal, jadi angka
  tetap benar tanpa JS sekalipun.
- Animasi masuk hanya dijalankan dari `setView`, bukan dari `tick` — kalau ikut
  tiap render ulang, angka SKS akan berkedip tiap kali status jadwal berubah.
- `--text-subtle` tidak boleh dipakai langsung di atas hero band: di sana
  kontrasnya hanya ~3,7–4,5:1. Pakai `--text-muted`, atau beri elemen itu latar
  opaque sendiri.
- **Opasitas grain bukan pilihan selera.** Lapisan grain menggelapkan latar
  tempat teks berdiri. Pada opasitas efektif 0.085, piksel grain tergelap
  menjatuhkan `--text-subtle` ke **4,16:1** — di bawah ambang AA. Nilainya
  ditahan di sekitar **0.035** untuk mode terang; diukur dari piksel yang
  benar-benar dirender, latar tergelap menjadi `#f3f2ef` dan rasionya
  **4,85:1**. Jangan naikkan tanpa mengukur ulang.
- Grain dipasang pada `body::before` dengan `z-index: -1`, sehingga latar
  halaman pindah ke `<html>` dan `<body>` menjadi transparan. Konsekuensinya:
  siapa pun yang menaruh `background` pada `body` akan menutupi grain-nya.
- **Sorotan kursor** membaca posisi lewat `requestAnimationFrame`, maksimal satu
  kali per frame. `getBoundingClientRect` di dalam handler `pointermove` tanpa
  pembatas itu akan memicu layout tiap gerakan tetikus.
- **Manifest dipasang dari skrip inline**, bukan sebagai `<link>` statis. Di
  `file://` peramban menolak mengambilnya karena CORS dan menulis peringatan
  merah di konsol, padahal manifest memang tidak berlaku di luar http/https.
- Animasi hover **tidak boleh** menyentuh `padding`, `width`, atau `height`.
  `.quick-item` dulu menganimasikan `padding-left` dan itu memicu layout tiap
  frame; sekarang isinya yang digeser dengan `transform`.
- Elemen yang disembunyikan dengan atribut `hidden` **tidak boleh** punya
  `display` dari selektor kelas — `display: flex` pada `.palette-backdrop`
  mengalahkan `[hidden] { display: none }` bawaan peramban, dan dialognya jadi
  selalu terlihat. Karena itu ada `.palette-backdrop[hidden] { display: none; }`
  dan `.search-clear[hidden] { display: none; }`. Berlaku untuk setiap elemen
  baru yang memakai pola yang sama.
