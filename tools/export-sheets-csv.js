/* ============================================================================
   Semester 7 Academic OS — tools/export-sheets-csv.js
   ----------------------------------------------------------------------------
   Membuat enam berkas CSV di sheets-template/, satu untuk tiap tab spreadsheet,
   berisi data yang persis sama dengan data.js.

   Gunanya: mengisi spreadsheet pertama kali tanpa mengetik ulang 56 baris
   timeline Mathfest. Impor tiap CSV sebagai satu tab, lalu publikasikan
   masing-masing sebagai CSV dan tempel tautannya ke SHEET_CSV_URLS di sheets.js.

   Dibuat lewat skrip, bukan disalin manual, supaya isinya tidak pernah melenceng
   dari data.js. Jalankan ulang kapan pun data.js berubah:

       node tools/export-sheets-csv.js

   Tidak memerlukan dependensi apa pun — hanya modul bawaan Node.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'sheets-template');

/* data.js memakai `const` di tingkat global, yang tidak menjadi properti
   globalThis. Menjalankannya di dalam konteks vm membuat seluruh nilainya bisa
   dibaca lewat nama variabelnya, tanpa perlu mengubah data.js sedikit pun. */
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), ctx);
const read = (name) => vm.runInContext(name, ctx);

/** Satu sel CSV mengikuti RFC 4180. */
function cell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCSV(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => cell(row[h])).join(','));
  /* Diakhiri newline: tanpa ini, baris apa pun yang ditambahkan belakangan akan
     menempel pada baris terakhir dan merusak satu record. */
  return lines.join('\n') + '\n';
}

const files = {};

/* --- pengaturan: pasangan kunci/nilai ------------------------------------ */
const kv = [];
const push = (prefix, obj) => {
  for (const key of Object.keys(obj)) kv.push({ kunci: prefix + key, nilai: obj[key] });
};
push('profil.', read('profileData'));
push('semester.', read('semesterConfig'));
push('mathfest.', read('mathfestConfig'));
push('kategori.', read('categoryLabels'));
for (const phase of read('mathfestPhases')) {
  kv.push({ kunci: 'fase.' + phase.id, nilai: phase.label });
}
files['pengaturan'] = toCSV(['kunci', 'nilai'], kv);

/* --- jadwal --------------------------------------------------------------- */
files['jadwal'] = toCSV(
  ['id', 'name', 'day', 'start', 'end', 'sks', 'room', 'lecturer', 'kind', 'category', 'formality'],
  read('scheduleData').map((c) => ({ ...c, formality: c.formality ? 'ya' : '' }))
);

/* --- aktivitas: session yang bersarang diratakan jadi kolom session_* ------ */
files['aktivitas'] = toCSV(
  ['id', 'name', 'code', 'sks', 'category', 'group', 'status', 'tone', 'topic', 'supervisor',
    'classgroup', 'progress', 'deadline', 'note', 'session_day', 'session_start', 'session_end',
    'session_room', 'session_lecturer', 'session_formality'],
  read('academicActivities').map((a) => ({
    id: a.id, name: a.name, code: a.code, sks: a.sks, category: a.category, group: a.group,
    status: a.status, tone: a.tone, topic: a.topic, supervisor: a.supervisor,
    classgroup: a.classGroup, progress: a.progress, deadline: a.deadline, note: a.note,
    session_day: a.session ? a.session.day : '',
    session_start: a.session ? a.session.start : '',
    session_end: a.session ? a.session.end : '',
    session_room: a.session ? a.session.room : '',
    session_lecturer: a.session ? a.session.lecturer : '',
    session_formality: a.session && a.session.formality ? 'ya' : ''
  }))
);

/* --- bimbingan ------------------------------------------------------------ */
files['bimbingan'] = toCSV(
  ['id', 'type', 'topic', 'supervisor', 'status', 'tone', 'time', 'place', 'category', 'note'],
  read('guidanceData')
);

/* --- kalender ------------------------------------------------------------- */
files['kalender'] = toCSV(
  ['id', 'name', 'start', 'end', 'critical'],
  read('academicCalendar').map((e) => ({ ...e, critical: e.critical ? 'ya' : '' }))
);

/* --- mathfest ------------------------------------------------------------- */
files['mathfest'] = toCSV(
  ['id', 'phase', 'agenda', 'sub', 'start', 'end', 'when', 'place', 'needs', 'pj', 'relevance'],
  read('mathfestTimeline')
);

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, body] of Object.entries(files)) {
  const file = path.join(OUT_DIR, name + '.csv');
  fs.writeFileSync(file, body, 'utf8');
  console.log('  ' + name.padEnd(12) + (body.split('\n').length - 2) + ' baris data');
}
console.log('\nSelesai. Berkas ada di sheets-template/');
