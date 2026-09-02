# Semester 7 Academic OS

Dashboard akademik pribadi untuk Restu Mandiri (1237010016 · Matematika · Semester 7 · 2026/2027).

HTML + CSS + JavaScript murni. Tanpa build step, tanpa bundler, tanpa framework.

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
index.html   kerangka halaman (header, navigasi, kontainer tampilan)
style.css    design token + seluruh style
data.js      data cadangan — dipakai kalau Google Sheets tidak terjangkau
sheets.js    ambil + urai CSV dari Google Sheets, dan logika cadangannya
script.js    logika: turunan data, render, mesin realtime, filter, pencarian, tema
```

## Dari mana datanya?

Aplikasi mencoba Google Sheets lebih dulu, lalu jatuh ke `data.js` bila gagal.
Kegagalan ditangani **per bagian**, jadi kalau hanya tab `jadwal` yang rusak,
bagian lain tetap memakai data terbaru. Dashboard tidak pernah kosong.

Sumber yang sedang dipakai selalu tertulis di footer, dan rincian kegagalannya
dicetak ke konsol browser.

### Menyiapkan Google Sheets

Buat satu spreadsheet dengan **6 tab**. Baris pertama tiap tab wajib berisi nama
kolom persis seperti berikut:

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
| `/` | Fokus ke kolom pencarian |
| `Esc` | Bersihkan pencarian dan kembali ke tampilan sebelumnya |
| `Tab` | Navigasi keyboard penuh dengan focus ring yang terlihat |

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
| Hero band | Gradien + grain diagonal | Kesan "mahal" tanpa file gambar, jadi halaman tetap ringan |
| Gerak | Layar pembuka, reveal saat scroll, angka menghitung naik, cincin progress | Terasa hidup tanpa memperlambat |
| Spasi | Kelipatan 4 (`--space-1` … `--space-12`) | Ritme vertikal konsisten di semua tampilan |
| Motion | 140–220ms | Cukup terasa, tidak memperlambat |

Mode terang dan gelap didefinisikan terpisah — bukan sekadar warna dibalik.
Bayangan, warna aksen, dan warna status masing-masing disetel ulang di
`[data-theme="dark"]`.

## Catatan teknis

- Tema mengikuti preferensi sistem sampai kamu memilih sendiri; pilihan disimpan di `localStorage`.
- Satu `setInterval` untuk seluruh aplikasi, otomatis berhenti saat tab tidak terlihat.
- Render ulang hanya terjadi saat status jadwal berubah, bukan tiap detik.
- Seluruh pasangan warna teks diverifikasi >= 4.5:1 (WCAG AA) dan batas kontrol
  form >= 3:1 (WCAG 1.4.11), pada mode terang maupun gelap.
- Tidak ada scroll horizontal sampai lebar 320px; `.tabs` dan `.chip-group`
  memang dapat digeser ke samping, dan itu disengaja.
- **Layar pembuka** hanya muncul kalau `<html>` diberi kelas `is-booting` oleh
  skrip inline di `index.html`. Tanpa JavaScript kelas itu tidak pernah
  terpasang, sehingga layar pembuka mustahil tersangkut. Ada tiga jaring
  pengaman untuk menutupnya: klik atau tombol apa pun, event `load`, dan
  batas paksa 2,6 detik.
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
