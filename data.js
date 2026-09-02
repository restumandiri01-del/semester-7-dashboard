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
  { id: 'uts', name: 'UTS', start: '2026-10-19', end: '2026-10-23', critical: true },
  { id: 'uas', name: 'UAS', start: '2026-12-21', end: '2026-12-31', critical: true },
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
      // Slot ini hanya formalitas KRS di SALAM — pada praktiknya tidak ada
      // kelas maupun bimbingan hari Sabtu; waktunya menyesuaikan dosen.
      // Karena itu slot ini tidak pernah dihitung sebagai bentrok jadwal.
      formality: true,
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

/* ----------------------------------------------------------------------------
   7. Kepanitiaan Mathfest 2026
   ----------------------------------------------------------------------------
   Sumber: "Timeline Kepanitiaan Mathfest 2026".

   relevance : 'utama'   → penanggung jawab menyebut divisi sendiri secara eksplisit
               'terkait' → pekerjaan seputar lomba, dikoordinasi divisi lain
               null      → agenda divisi lain, tampil hanya pada filter "Semua"
   start/end : 'YYYY-MM-DD'. Boleh null bila timeline tidak menyebut tanggal —
               isi `when` sebagai gantinya supaya tetap terbaca.
   -------------------------------------------------------------------------- */
/* Disesuaikan dengan "Pengumuman Divisi Panitia Mathfest 2026".
   role dipakai sebagai label lingkup filter, jadi sengaja dibiarkan pendek;
   position menyimpan jabatan sebenarnya. */
const mathfestConfig = {
  name: 'Mathfest 2026',
  organization: 'HIMATIKA',
  role: 'Divisi Kompetisi',
  division: 'kompetisi',
  position: 'Anggota',
  divisionHead: 'Risa Namira Sundari',
  chair: 'Fitri Fhaturrahma Malik',        // Ketua Pelaksana
  steeringCommittee: 'Bayu Wiji Santoso',  // "SC" pada kolom penanggung jawab
  generalHead: 'Regana Fikri Adiba',       // Penanggung Jawab Umum
};

const mathfestPhases = [
  { id: 'juni', label: 'Juni 2026' },
  { id: 'juli-agustus', label: 'Juli – Agustus 2026' },
  { id: 'september', label: 'September 2026' },
  { id: 'oktober', label: 'Oktober 2026' },
  { id: 'november-desember', label: 'November – Desember 2026' },
];

const mathfestTimeline = [
  /* ---- Juni 2026 ---- */
  {
    id: 'juni-tema', phase: 'juni',
    agenda: 'Fiksasi Tema dan Design', sub: null,
    start: '2026-06-06', end: '2026-06-30', when: null, place: null,
    needs: 'Color palette dll', pj: 'SC, OC, & Medkraf', relevance: null,
  },
  {
    id: 'juni-recruitment-pengurus', phase: 'juni',
    agenda: 'Recruitment Pengurus', sub: 'Pendaftaran Pengurus Himatika',
    start: '2026-06-22', end: '2026-06-30', when: null, place: null,
    needs: 'Gform', pj: 'Sekretaris', relevance: null,
  },
  {
    id: 'juni-rab-internal', phase: 'juni',
    agenda: 'RAB', sub: 'Internal',
    start: '2026-06-22', end: '2026-06-30', when: null, place: null,
    needs: 'Spreadsheet RAB', pj: 'OC & Bendahara', relevance: null,
  },
  {
    id: 'juni-rab-eksternal', phase: 'juni',
    agenda: 'RAB', sub: 'Eksternal (Proposal Sponsorship)',
    start: '2026-06-22', end: '2026-06-30', when: null, place: null,
    needs: 'Penyesuaian RAB', pj: 'OC & Bendahara', relevance: null,
  },
  {
    id: 'juni-proposal-sponsor', phase: 'juni',
    agenda: 'Proposal Sponsorship', sub: 'Pembuatan Proposal',
    start: '2026-06-22', end: '2026-06-30', when: null, place: null,
    needs: 'Proposal', pj: 'Sekretaris', relevance: null,
  },
  {
    id: 'juni-proposal-ttd', phase: 'juni',
    agenda: 'Proposal Sponsorship', sub: 'TTD',
    start: '2026-06-30', end: '2026-07-19', when: null, place: null,
    needs: 'TTD sampai Warek', pj: 'Sekretaris', relevance: null,
  },

  /* ---- Juli – Agustus 2026 ---- */
  {
    id: 'ja-fiksasi-tempat', phase: 'juli-agustus',
    agenda: 'Fiksasi Tempat', sub: 'Opening, Closing dan Komet',
    start: '2026-07-01', end: '2026-08-31', when: null, place: 'Anwar dan Abjan',
    needs: 'Kepastian tempat untuk Opening, Closing dan Komet',
    pj: 'SC, Sekre, PR, Fahmi', relevance: 'terkait',
  },
  {
    id: 'ja-oprec-pendaftaran', phase: 'juli-agustus',
    agenda: 'Open Recruitment', sub: 'Pendaftaran Non Pengurus',
    start: '2026-07-20', end: '2026-07-24', when: null, place: null,
    needs: 'Guide Book, Konten, Design Pamflet, Gform, Surat Kesediaan, Surat Komitmen',
    pj: 'Sekretaris & Medkraf', relevance: null,
  },
  {
    id: 'ja-oprec-penambahan', phase: 'juli-agustus',
    agenda: 'Open Recruitment', sub: 'Penambahan Waktu',
    start: '2026-07-25', end: '2026-07-26', when: null, place: null,
    needs: null, pj: 'Sekretaris & Medkraf', relevance: null,
  },
  {
    id: 'ja-oprec-verifikasi', phase: 'juli-agustus',
    agenda: 'Open Recruitment', sub: 'Verifikasi Berkas + Jadwal Interview',
    start: '2026-07-27', end: '2026-07-27', when: null, place: null,
    needs: null, pj: 'Sekretaris & Medkraf', relevance: null,
  },
  {
    id: 'ja-oprec-interview-exoff', phase: 'juli-agustus',
    agenda: 'Open Recruitment', sub: 'Interview Ex-Officio',
    start: '2026-07-27', end: '2026-07-29', when: null, place: null,
    needs: null, pj: 'Sekretaris & Medkraf', relevance: null,
  },
  {
    id: 'ja-oprec-interview-kadiv', phase: 'juli-agustus',
    agenda: 'Open Recruitment', sub: 'Interview Kadiv',
    start: '2026-07-27', end: '2026-07-31', when: null, place: null,
    needs: null, pj: 'Sekretaris & Medkraf', relevance: null,
  },
  {
    id: 'ja-oprec-plotingan', phase: 'juli-agustus',
    agenda: 'Open Recruitment', sub: 'Plotingan',
    start: '2026-08-01', end: '2026-08-02', when: null, place: null,
    needs: null, pj: 'Sekretaris & Medkraf', relevance: null,
  },
  {
    id: 'ja-oprec-pengumuman', phase: 'juli-agustus',
    agenda: 'Open Recruitment', sub: 'Pengumuman',
    start: '2026-08-03', end: '2026-08-04', when: null, place: null,
    needs: null, pj: 'Sekretaris & Medkraf', relevance: null,
  },

  /* ---- September 2026 ---- */
  {
    id: 'sep-guidebook-lomba', phase: 'september',
    agenda: 'Guidebook', sub: 'Pendaftaran & Peraturan Lomba (Himchamp & Komet)',
    start: '2026-09-01', end: '2026-09-05', when: null, place: null,
    needs: 'Guidebook Pendaftaran & Lomba',
    pj: 'Sekretaris, Bendum, Kompetisi', relevance: 'utama',
  },
  {
    id: 'sep-pendaftaran-lomba', phase: 'september',
    agenda: 'Pendaftaran Lomba', sub: 'Komet & Himchamp',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Link G-Form Pendaftaran & Publikasi Pendaftaran',
    pj: 'Sekretaris dan Panitia', relevance: 'utama',
  },
  {
    id: 'sep-sponsor-list', phase: 'september',
    agenda: 'Proposal Sponsorship', sub: 'Menyusun List Sponsor',
    start: '2026-09-01', end: '2026-09-06', when: null, place: null,
    needs: 'List Sponsor', pj: 'Daspro & Humas', relevance: null,
  },
  {
    id: 'sep-sponsor-online', phase: 'september',
    agenda: 'Proposal Sponsorship', sub: 'Penyebaran Proposal Online',
    start: '2026-09-06', end: '2026-09-30', when: null, place: null,
    needs: 'File Proposal Final', pj: 'Daspro & Humas', relevance: null,
  },
  {
    id: 'sep-sponsor-offline', phase: 'september',
    agenda: 'Proposal Sponsorship', sub: 'Penyebaran Offline',
    start: '2026-09-15', end: '2026-09-30', when: null, place: null,
    needs: 'Print-out proposal sponsorship & surat pengantar sponsor',
    pj: 'Humas', relevance: null,
  },
  {
    id: 'sep-proposal-kegiatan', phase: 'september',
    agenda: 'Proposal Kegiatan', sub: 'Pembuatan Proposal Himchamp & Komet',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Proposal Kegiatan & RAB', pj: 'Sekretaris', relevance: 'terkait',
  },
  {
    id: 'sep-gform-pendaftaran', phase: 'september',
    agenda: 'Gform Pendaftaran', sub: 'Eksternal (Komet, Himchamp & Dordar), Internal (PPMTK & Bazar)',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Header Gform, dst', pj: 'Sekretaris', relevance: 'terkait',
  },
  {
    id: 'sep-gform-presensi', phase: 'september',
    agenda: 'Gform Presensi', sub: 'Milad, Komet, Himchamp, Dordar, MathTalk',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Header Gform, dst', pj: 'Sekretaris', relevance: null,
  },
  {
    id: 'sep-presensi-panitia', phase: 'september',
    agenda: 'Presensi Panitia', sub: 'Semua Kegiatan Offline',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Format Presensi', pj: 'Sekretaris', relevance: null,
  },
  {
    id: 'sep-konsep-dekorasi', phase: 'september',
    agenda: 'Konsep Dekorasi', sub: null,
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Draft konsep/sketsa dekorasi', pj: 'Delog', relevance: null,
  },
  {
    id: 'sep-sistem-delog', phase: 'september',
    agenda: 'Konsep Sistem Kerja Delog', sub: null,
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Sistem peminjaman alat dan barang inventaris', pj: 'Delog', relevance: null,
  },
  {
    id: 'sep-list-sekolah', phase: 'september',
    agenda: 'List Sekolah Komet', sub: 'Penyebaran Online & Offline',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Database/list tujuan undangan (sekolah & universitas)',
    pj: 'Humas', relevance: 'terkait',
  },
  {
    id: 'sep-list-universitas', phase: 'september',
    agenda: 'List Universitas (S1) Himchamp', sub: 'Penyebaran Online & Offline',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Database/list tujuan undangan (sekolah & universitas)',
    pj: 'Humas', relevance: 'terkait',
  },
  {
    id: 'sep-undangan-online', phase: 'september',
    agenda: 'Penyebaran Undangan Online', sub: 'Komet & Himchamp',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Surat Undangan & Guide Book', pj: 'Humas', relevance: 'terkait',
  },
  {
    id: 'sep-list-medpar', phase: 'september',
    agenda: 'List Media Partner', sub: null,
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'Database/list target media partner', pj: 'Humas', relevance: null,
  },
  {
    id: 'sep-fiksasi-medpar', phase: 'september',
    agenda: 'Fiksasi Media Partner', sub: null,
    start: null, end: null, when: 'Setiap H-2 minggu sebelum kegiatan', place: null,
    needs: null, pj: 'Humas', relevance: null,
  },
  {
    id: 'sep-fiksasi-juri', phase: 'september',
    agenda: 'Fiksasi Daftar Juri, Pemateri, Caster', sub: 'Komet, PPMTK, Dordar & Himchamp',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: 'List pemateri, juri & caster beserta harga',
    pj: 'SC Kegiatan', relevance: 'terkait',
  },
  {
    id: 'sep-rd-fix', phase: 'september',
    agenda: 'RD Kegiatan Fix', sub: 'Semua Kegiatan',
    start: '2026-09-01', end: '2026-09-30', when: null, place: null,
    needs: null, pj: 'Acara', relevance: 'terkait',
  },
  {
    id: 'sep-dekorasi-mulai', phase: 'september',
    agenda: 'Dekorasi', sub: 'Mulai Delog',
    start: '2026-09-15', end: '2026-09-30', when: null, place: null,
    needs: 'Alat & bahan dekorasi, form/buku peminjaman alat dan barang inventaris',
    pj: 'Delog', relevance: null,
  },
  {
    id: 'sep-fiksasi-inventaris', phase: 'september',
    agenda: 'Fiksasi Sistem Inventaris', sub: null,
    start: '2026-09-15', end: '2026-09-30', when: null, place: null,
    needs: null, pj: 'Delog', relevance: null,
  },

  /* ---- Oktober 2026 ---- */
  {
    id: 'okt-guidebook-rakor', phase: 'oktober',
    agenda: 'Guidebook Kegiatan', sub: 'Rakor dengan SC Kegiatan',
    start: '2026-10-01', end: '2026-10-07', when: null, place: null,
    needs: 'Guidebook Kegiatan',
    pj: 'Kompetisi, SC Kegiatan, Ex-Officio', relevance: 'utama',
  },
  {
    id: 'okt-guidebook-revisi', phase: 'oktober',
    agenda: 'Guidebook Kegiatan', sub: 'Revisi',
    start: '2026-10-07', end: '2026-10-14', when: null, place: null,
    needs: 'Guidebook Kegiatan',
    pj: 'Kompetisi, SC Kegiatan, Ex-Officio', relevance: 'utama',
  },
  {
    id: 'okt-rd-rakor', phase: 'oktober',
    agenda: 'RD Kegiatan', sub: 'Rakor dengan SC Kegiatan',
    start: '2026-10-01', end: '2026-10-07', when: null, place: null,
    needs: 'Dokumen RD seluruh kegiatan',
    pj: 'Acara, SC Kegiatan, Ex-Officio', relevance: 'terkait',
  },
  {
    id: 'okt-rd-revisi', phase: 'oktober',
    agenda: 'RD Kegiatan', sub: 'Revisi',
    start: '2026-10-07', end: '2026-10-14', when: null, place: null,
    needs: 'Dokumen RD seluruh kegiatan',
    pj: 'Acara, SC Kegiatan, Ex-Officio', relevance: 'terkait',
  },
  {
    id: 'okt-soal-komet', phase: 'oktober',
    agenda: 'Soal Lomba Komet', sub: 'Komet',
    start: '2026-10-12', end: '2026-10-27', when: null, place: null,
    needs: 'Draft soal Komet yang sudah rampung', pj: 'SC Komet', relevance: 'terkait',
  },
  {
    id: 'okt-proposal-gubernur', phase: 'oktober',
    agenda: 'Pengajuan Proposal Piala Gubernur', sub: 'Himchamp & Komet',
    start: '2026-10-12', end: '2026-10-16', when: null, place: null,
    needs: 'Proposal Kegiatan',
    pj: 'Humas, SC Kegiatan, SC Umum, Ketuplak', relevance: 'terkait',
  },
  {
    id: 'okt-undangan-offline', phase: 'oktober',
    agenda: 'Undangan Offline', sub: 'Komet',
    start: '2026-10-12', end: '2026-10-23', when: null, place: null,
    needs: 'Amplop dan surat undangan', pj: 'Humas', relevance: 'terkait',
  },
  {
    id: 'okt-sosialisasi-internal', phase: 'oktober',
    agenda: 'Sosialisasi Internal', sub: 'PPMTK, Bazar, dan Penampilan Angkatan',
    start: '2026-10-17', end: '2026-10-17', when: null, place: 'Lab/Kelas',
    needs: null, pj: 'Ketuplak', relevance: null,
  },
  {
    id: 'okt-pendaftaran-internal', phase: 'oktober',
    agenda: 'Pendaftaran Internal', sub: 'PPMTK dan Bazar',
    start: '2026-10-18', end: '2026-10-23', when: null, place: null,
    needs: 'Gform, dst', pj: 'Sekretaris', relevance: null,
  },
  {
    id: 'okt-tm-internal', phase: 'oktober',
    agenda: 'Technical Meeting', sub: 'Internal',
    start: '2026-10-24', end: '2026-10-24', when: null, place: 'Lab/Kelas',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'okt-tm-komet', phase: 'oktober',
    agenda: 'Technical Meeting', sub: 'Komet',
    start: '2026-10-31', end: '2026-10-31', when: null, place: 'Lab/Kelas',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },

  /* ---- November – Desember 2026 ---- */
  {
    id: 'nov-tm-himchamp', phase: 'november-desember',
    agenda: 'Technical Meeting', sub: 'Himchamp',
    start: '2026-11-01', end: '2026-11-01', when: null, place: 'Masjid lt.3',
    needs: null, pj: 'Panitia Kegiatan', relevance: 'utama',
  },
  {
    id: 'nov-opening', phase: 'november-desember',
    agenda: 'Opening', sub: 'PPMTK, MathTalk',
    start: '2026-11-04', end: '2026-11-04', when: null, place: 'Anwar',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'nov-penyisihan-komet', phase: 'november-desember',
    agenda: 'Penyisihan', sub: 'Komet (Online)',
    start: '2026-11-14', end: '2026-11-14', when: null, place: 'Lab/Kelas',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'nov-ppmtk-tes-tulis', phase: 'november-desember',
    agenda: 'Penyisihan', sub: 'Pembekalan dan Tes Tulis PPMTK (Offline)',
    start: '2026-11-14', end: '2026-11-14', when: null, place: 'R.305',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'nov-penyisihan-himchamp', phase: 'november-desember',
    agenda: 'Penyisihan', sub: 'Himchamp',
    start: '2026-11-15', end: '2026-11-15', when: null, place: 'Masjid lt.3',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'nov-take-konten', phase: 'november-desember',
    agenda: 'Take Konten', sub: 'PPMTK',
    start: '2026-11-18', end: '2026-11-18', when: null, place: 'Tugu Kujang',
    needs: null, pj: 'Panitia Kegiatan, Medkraf, Kompetisi', relevance: 'utama',
  },
  {
    id: 'nov-komet', phase: 'november-desember',
    agenda: 'Pelaksanaan Komet', sub: 'Komet',
    start: '2026-11-21', end: '2026-11-21', when: null, place: 'Abjan',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'nov-dordar', phase: 'november-desember',
    agenda: 'Pelaksanaan Dordar', sub: 'Dordar',
    start: '2026-11-25', end: '2026-11-25', when: null, place: 'Aula FST',
    needs: null, pj: null, relevance: null,
  },
  {
    id: 'nov-himchamp', phase: 'november-desember',
    agenda: 'Pelaksanaan Himchamp', sub: 'Himchamp',
    start: '2026-11-28', end: '2026-11-28', when: null, place: 'R.305',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'nov-ppmtk', phase: 'november-desember',
    agenda: 'Pelaksanaan PPMTK', sub: 'Unjuk Bakat & Tes Lisan',
    start: '2026-11-28', end: '2026-11-28', when: null, place: 'Aula FST',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
  {
    id: 'des-closing', phase: 'november-desember',
    agenda: 'Closing', sub: 'PPMTK, Bazar, dan Penampilan Angkatan',
    start: '2026-12-02', end: '2026-12-02', when: null, place: 'Anwar',
    needs: null, pj: 'Panitia Kegiatan, Kompetisi', relevance: 'utama',
  },
];
