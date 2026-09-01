/* ============================================================================
   Semester 7 Academic OS — data.js
   ----------------------------------------------------------------------------
   Sumber data tunggal untuk seluruh aplikasi.
   Semua tampilan (dashboard, jadwal, aktivitas, bimbingan, pencarian, ringkasan
   SKS) membaca dari file ini. Tidak ada data akademik yang ditulis ulang di
   HTML maupun di script.js.

   Cara mengubah data ada di README.md.
   ========================================================================== */

/* ----------------------------------------------------------------------------
   1. Profil pengguna
   -------------------------------------------------------------------------- */
const profileData = {
  name: 'Restu Mandiri',
  initials: 'RM',
  nim: '1237010016',
  program: 'Matematika',
  semester: 7,
  academicYear: '2026/2027',
};

/* ----------------------------------------------------------------------------
   2. Konfigurasi semester
   ----------------------------------------------------------------------------
   startDate / endDate memakai format 'YYYY-MM-DD'.
   Biarkan null selama tanggal resmi dari kampus belum diketahui — progress
   semester akan otomatis aktif begitu keduanya diisi.
   -------------------------------------------------------------------------- */
const semesterConfig = {
  semester: 7,
  academicYear: '2026/2027',
  startDate: '2026-08-31', // Awal kuliah, Kalender Akademik Ganjil 2026/2027
  endDate: '2026-12-31',   // Hari terakhir UAS
};

/* ----------------------------------------------------------------------------
   2b. Agenda kalender akademik Ganjil 2026/2027
   -------------------------------------------------------------------------- */
const academicCalendar = [
  { id: 'ukt', name: 'UKT & Pengajuan Cuti', start: '2026-07-06', end: '2026-08-28' },
  { id: 'krs', name: 'Pengisian KRS', start: '2026-08-03', end: '2026-08-28' },
  { id: 'awal-kuliah', name: 'Awal Perkuliahan', start: '2026-08-31', end: '2026-08-31' },
  { id: 'pkrs', name: 'PKRS (Perubahan KRS)', start: '2026-09-10', end: '2026-09-12' },
  { id: 'uts', name: 'UTS', start: '2026-10-19', end: '2026-10-23' },
  { id: 'uas', name: 'UAS', start: '2026-12-21', end: '2026-12-31' },
];

/* ----------------------------------------------------------------------------
   3. Jadwal perkuliahan
   ----------------------------------------------------------------------------
   day : 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat
   start / end : format 24 jam 'HH:MM'
   -------------------------------------------------------------------------- */
const scheduleData = [
  {
    id: 'statistika-non-parametrik',
    name: 'Statistika Non Parametrik',
    day: 1,
    start: '09:30',
    end: '12:00',
    sks: 3,
    room: '302',
    lecturer: 'Ibu Asti',
    kind: 'Perkuliahan Reguler',
    category: 'perkuliahan',
  },
  {
    id: 'metode-survei-sampling',
    name: 'Metode Survei Sampling',
    day: 2,
    start: '07:00',
    end: '09:30',
    sks: 3,
    room: 'Lab Stat',
    lecturer: 'Ibu Asti',
    kind: 'Perkuliahan Reguler',
    category: 'perkuliahan',
  },
  {
    id: 'analisis-real',
    name: 'Analisis Real',
    day: 4,
    start: '12:40',
    end: '15:10',
    sks: 3,
    room: 'Lab Kom',
    lecturer: 'Ibu Essy',
    kind: 'Perkuliahan Reguler',
    category: 'perkuliahan',
  },
  {
    id: 'obligasi-dan-sukuk',
    name: 'Obligasi dan Sukuk',
    day: 4,
    start: '15:30',
    end: '18:00',
    sks: 3,
    room: '301',
    lecturer: 'Pak Rudi',
    kind: 'Perkuliahan Reguler',
    category: 'perkuliahan',
  },
  {
    id: 'tk-kombinatorika-2',
    name: 'TK Kombinatorika 2',
    day: 5,
    start: '07:00',
    end: '09:30',
    sks: 3,
    room: '302',
    lecturer: 'Bu Risma',
    kind: 'Perkuliahan Reguler',
    category: 'perkuliahan',
  },
];

/* ----------------------------------------------------------------------------
   4. Aktivitas akademik di luar jadwal kuliah
   ----------------------------------------------------------------------------
   group   : 'non-perkuliahan' | 'formalitas'
   tone    : 'success' | 'warning' | 'neutral' | 'muted'  (mewarnai badge status)
   session : slot mingguan tetap, atau null bila belum dijadwalkan. Aktivitas
             yang punya session ikut muncul di jadwal mingguan, jadwal hari ini,
             dan hitung mundur kelas berikutnya — tetapi SKS-nya tetap dihitung
             sebagai beban tambahan, bukan perkuliahan reguler.
   Field yang belum diketahui ditulis null → tampil sebagai "Belum ditentukan".
   -------------------------------------------------------------------------- */
const academicActivities = [
  {
    id: 'studi-literatur',
    name: 'Studi Literatur',
    code: '70101024',
    sks: 2,
    category: 'studi-literatur',
    group: 'non-perkuliahan',
    status: 'Berjalan',
    tone: 'success',
    topic: 'Studi Literatur Keuangan',
    supervisor: 'Fahrudin Muhtarulloh, S.Si., M.Sc.',
    classGroup: 'J',
    session: {
      day: 6,            // Sabtu
      start: '10:20',
      end: '12:00',
      room: 'Lab MIK',
      lecturer: 'Fahrudin Muhtarulloh, S.Si., M.Sc.',
    },
    progress: null,
    deadline: null,
    note: null,
  },
  {
    id: 'seminar-studi-literatur',
    name: 'Seminar Studi Literatur',
    code: '70101025',
    sks: 1,
    category: 'seminar',
    group: 'non-perkuliahan',
    status: 'Belum dijadwalkan',
    tone: 'warning',
    topic: null,
    supervisor: null,
    classGroup: null,
    session: null,       // hari/jam masih kosong di sistem akademik
    progress: null,
    deadline: null,
    note: null,
  },
  {
    id: 'skripsi-1',
    name: 'Skripsi 1',
    code: null,
    sks: 2,
    category: 'skripsi',
    group: 'non-perkuliahan',
    status: 'Aktivitas Skripsi',
    tone: 'neutral',
    topic: null,
    supervisor: null,
    classGroup: null,
    session: null,
    progress: null,
    deadline: null,
    note: null,
  },
  {
    id: 'kkn',
    name: 'KKN',
    code: null,
    sks: 2,
    category: 'kkn',
    group: 'formalitas',
    status: 'Administratif',
    tone: 'muted',
    topic: null,
    supervisor: null,
    classGroup: null,
    session: null,
    progress: null,
    deadline: null,
    note: 'Kegiatan telah dilaksanakan pada Semester 6. Semester 7 berkaitan dengan formalitas/penginputan nilai.',
  },
];

/* ----------------------------------------------------------------------------
   5. Bimbingan akademik
   -------------------------------------------------------------------------- */
const guidanceData = [
  {
    id: 'bimbingan-studi-literatur',
    type: 'Studi Literatur',
    topic: 'Studi Literatur Keuangan',
    supervisor: 'Fahrudin Muhtarulloh, S.Si., M.Sc.',
    status: 'Tentatif',
    tone: 'warning',
    time: null,
    place: null,
    category: 'bimbingan',
    note: 'Jadwal konsultasi di luar sesi kelas Studi Literatur (Sabtu, 10.20–12.00) belum disepakati.',
  },
];

/* ----------------------------------------------------------------------------
   6. Label kategori (dipakai filter, badge, dan hasil pencarian)
   -------------------------------------------------------------------------- */
const categoryLabels = {
  perkuliahan: 'Perkuliahan',
  'studi-literatur': 'Studi Literatur',
  seminar: 'Seminar',
  kkn: 'KKN',
  skripsi: 'Skripsi',
  bimbingan: 'Bimbingan',
};
