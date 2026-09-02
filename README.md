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
data.js      SATU-SATUNYA sumber data akademik  ← file yang biasanya kamu ubah
script.js    logika: turunan data, render, mesin realtime, filter, pencarian, tema
```

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

```js
const mathfestConfig = {
  name: 'Mathfest 2026',
  organization: 'HIMATIKA',
  role: 'Divisi Kompetisi',
  division: 'kompetisi',
};
```

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
| Font | Plus Jakarta Sans | Ramah tapi profesional; angka memakai mono sistem agar mudah dipindai |
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
- `prefers-reduced-motion` dihormati: seluruh animasi dan transform dimatikan.
