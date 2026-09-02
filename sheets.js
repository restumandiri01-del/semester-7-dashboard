/* ============================================================================
   Semester 7 Academic OS — sheets.js
   ----------------------------------------------------------------------------
   Lapisan sumber data.

   Alur: coba ambil dari Google Sheets (CSV) → kalau gagal, pakai data.js.
   Kegagalan ditangani PER BAGIAN, jadi kalau hanya tab "jadwal" yang rusak,
   bagian lain tetap memakai data terbaru dari Sheets.

   Dashboard tidak pernah kosong: apa pun yang terjadi pada jaringan atau pada
   isi spreadsheet, data.js selalu tersedia sebagai cadangan.

   ----------------------------------------------------------------------------
   CARA MENYIAPKAN SPREADSHEET

   Buat satu spreadsheet dengan 6 tab. Baris pertama tiap tab WAJIB berisi nama
   kolom persis seperti di bawah (huruf kecil, tanpa spasi).

   1. pengaturan          kunci, nilai
      Contoh isi:
        profil.name            Restu Mandiri
        profil.initials        RM
        profil.nim             1237010016
        profil.program         Matematika
        profil.semester        7
        profil.academicYear    2026/2027
        semester.startDate     2026-08-31
        semester.endDate       2026-12-31
        mathfest.name          Mathfest 2026
        mathfest.role          Divisi Kompetisi
        kategori.perkuliahan   Perkuliahan
        fase.september         September 2026

   2. jadwal      id, name, day, start, end, sks, room, lecturer, kind, category
   3. aktivitas   id, name, code, sks, category, group, status, tone, topic,
                  supervisor, classgroup, progress, deadline, note,
                  session_day, session_start, session_end, session_room,
                  session_lecturer, session_formality
   4. bimbingan   id, type, topic, supervisor, status, tone, time, place,
                  category, note
   5. kalender    id, name, start, end, critical
   6. mathfest    id, phase, agenda, sub, start, end, when, place, needs, pj,
                  relevance

   Lalu: File → Share → Publish to web → pilih tab → Comma-separated values
   (.csv) → salin tautannya ke SHEET_CSV_URLS di bawah.

   PERHATIAN: spreadsheet yang di-publish dapat dibaca siapa pun yang memiliki
   tautannya. Jangan memasukkan data yang tidak boleh dilihat orang lain.
   ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------------
     1. KONFIGURASI — satu tautan CSV per tab
     ------------------------------------------------------------------------ */
  var SHEET_CSV_URL = 'YOUR_GOOGLE_SHEETS_CSV_LINK_HERE';

  var SHEET_CSV_URLS = {
    pengaturan: SHEET_CSV_URL,
    jadwal: 'YOUR_GOOGLE_SHEETS_CSV_LINK_HERE',
    aktivitas: 'YOUR_GOOGLE_SHEETS_CSV_LINK_HERE',
    bimbingan: 'YOUR_GOOGLE_SHEETS_CSV_LINK_HERE',
    kalender: 'YOUR_GOOGLE_SHEETS_CSV_LINK_HERE',
    mathfest: 'YOUR_GOOGLE_SHEETS_CSV_LINK_HERE'
  };

  /* Batas tunggu tiap permintaan. Tanpa ini, satu tab yang menggantung membuat
     dashboard berhenti di layar "memuat" selamanya. */
  var FETCH_TIMEOUT_MS = 8000;

  var PLACEHOLDER = /YOUR_GOOGLE_SHEETS_CSV_LINK_HERE/i;

  function isConfigured(url) {
    return typeof url === 'string' && url.trim() !== '' && !PLACEHOLDER.test(url);
  }

  /* --------------------------------------------------------------------------
     2. PENGURAI CSV
     ----------------------------------------------------------------------------
     Ditulis manual mengikuti RFC 4180 supaya tidak perlu memuat PapaParse dari
     CDN. Menangani tanda kutip, koma di dalam sel, baris baru di dalam sel, dan
     kutip ganda sebagai escape ("" -> ").
     ------------------------------------------------------------------------ */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;

    text = String(text == null ? '' : text).replace(/^﻿/, ''); // buang BOM

    while (i < text.length) {
      var ch = text.charAt(i);

      if (inQuotes) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }

      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }

      field += ch; i++;
    }

    if (field !== '' || row.length) { row.push(field); rows.push(row); }

    /* Buang baris yang seluruh selnya kosong — lazim muncul di ekspor Sheets. */
    return rows.filter(function (r) {
      return r.some(function (cell) { return String(cell).trim() !== ''; });
    });
  }

  /** Baris pertama dijadikan nama kolom, sisanya jadi objek. */
  function toObjects(rows) {
    if (!rows.length) return [];
    var headers = rows[0].map(function (h) {
      return String(h).trim().toLowerCase().replace(/\s+/g, '_');
    });
    return rows.slice(1).map(function (r) {
      var obj = {};
      headers.forEach(function (h, idx) {
        if (h) obj[h] = r[idx] === undefined ? '' : r[idx];
      });
      return obj;
    });
  }

  /* --------------------------------------------------------------------------
     3. KONVERSI TIPE
     ----------------------------------------------------------------------------
     CSV selalu berisi teks. Sel kosong menjadi null supaya aplikasi
     menampilkannya sebagai "Belum ditentukan", bukan string kosong.
     ------------------------------------------------------------------------ */
  function txt(value) {
    var s = String(value == null ? '' : value).trim();
    return s === '' ? null : s;
  }

  function num(value) {
    var s = txt(value);
    if (s === null) return null;
    var n = Number(s.replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  function bool(value) {
    var s = txt(value);
    if (s === null) return false;
    return /^(true|ya|yes|y|1|v|x|benar)$/i.test(s);
  }

  /** '2026-8-3' atau '3/8/2026' → '2026-08-03'. Sudah benar → dibiarkan. */
  function isoDate(value) {
    var s = txt(value);
    if (s === null) return null;

    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);

    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    if (m) return m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]);

    return s;
  }

  /** '9:30' → '09:30'; '09.30' → '09:30'. */
  function clockTime(value) {
    var s = txt(value);
    if (s === null) return null;
    var m = /^(\d{1,2})[:.](\d{2})$/.exec(s);
    return m ? pad2(m[1]) + ':' + m[2] : s;
  }

  function pad2(v) {
    var s = String(v);
    return s.length < 2 ? '0' + s : s;
  }

  /* --------------------------------------------------------------------------
     4. PEMBENTUK STRUKTUR — CSV mentah menjadi bentuk yang dipakai aplikasi
     ------------------------------------------------------------------------ */

  /** Tab "pengaturan" berisi pasangan kunci/nilai; diubah jadi peta datar. */
  function settingsMap(rows) {
    var map = {};
    var order = [];
    toObjects(rows).forEach(function (r) {
      var key = txt(r.kunci || r.key);
      if (!key) return;
      map[key.toLowerCase()] = r.nilai === undefined ? r.value : r.nilai;
      order.push(key.toLowerCase());
    });
    map.__order = order;
    return map;
  }

  function prefixed(map, prefix) {
    var out = {};
    (map.__order || []).forEach(function (key) {
      if (key.indexOf(prefix) !== 0) return;
      out[key.slice(prefix.length)] = txt(map[key]);
    });
    return out;
  }

  function buildSettings(rows, local) {
    var map = settingsMap(rows);

    var profile = {
      name: txt(map['profil.name']) || local.profile.name,
      initials: txt(map['profil.initials']) || local.profile.initials,
      nim: txt(map['profil.nim']) || local.profile.nim,
      program: txt(map['profil.program']) || local.profile.program,
      semester: num(map['profil.semester']) || local.profile.semester,
      academicYear: txt(map['profil.academicyear']) || local.profile.academicYear
    };

    var semester = {
      semester: num(map['semester.semester']) || profile.semester,
      academicYear: txt(map['semester.academicyear']) || profile.academicYear,
      startDate: isoDate(map['semester.startdate']) || local.semester.startDate,
      endDate: isoDate(map['semester.enddate']) || local.semester.endDate
    };

    var mathfest = {
      name: txt(map['mathfest.name']) || local.mathfestConfig.name,
      organization: txt(map['mathfest.organization']) || local.mathfestConfig.organization,
      role: txt(map['mathfest.role']) || local.mathfestConfig.role,
      division: txt(map['mathfest.division']) || local.mathfestConfig.division
    };

    var categories = prefixed(map, 'kategori.');
    var phaseMap = prefixed(map, 'fase.');
    var phases = Object.keys(phaseMap).map(function (id) {
      return { id: id, label: phaseMap[id] };
    });

    return {
      profile: profile,
      semester: semester,
      mathfestConfig: mathfest,
      categories: Object.keys(categories).length ? categories : local.categories,
      mathfestPhases: phases.length ? phases : local.mathfestPhases
    };
  }

  function buildSchedule(rows) {
    return toObjects(rows).map(function (r) {
      return {
        id: txt(r.id),
        name: txt(r.name),
        day: num(r.day),
        start: clockTime(r.start),
        end: clockTime(r.end),
        sks: num(r.sks) || 0,
        room: txt(r.room),
        lecturer: txt(r.lecturer),
        kind: txt(r.kind) || 'Perkuliahan Reguler',
        category: txt(r.category) || 'perkuliahan',
        formality: bool(r.formality)
      };
    }).filter(function (c) { return c.id && c.name && c.day; });
  }

  function buildActivities(rows) {
    return toObjects(rows).map(function (r) {
      var hasSession = txt(r.session_day) !== null && txt(r.session_start) !== null;
      return {
        id: txt(r.id),
        name: txt(r.name),
        code: txt(r.code),
        sks: num(r.sks) || 0,
        category: txt(r.category),
        group: txt(r.group) || 'non-perkuliahan',
        status: txt(r.status) || 'Belum ditentukan',
        tone: txt(r.tone) || 'muted',
        topic: txt(r.topic),
        supervisor: txt(r.supervisor),
        classGroup: txt(r.classgroup),
        progress: txt(r.progress),
        deadline: isoDate(r.deadline),
        note: txt(r.note),
        session: hasSession ? {
          day: num(r.session_day),
          start: clockTime(r.session_start),
          end: clockTime(r.session_end),
          room: txt(r.session_room),
          lecturer: txt(r.session_lecturer),
          formality: bool(r.session_formality)
        } : null
      };
    }).filter(function (a) { return a.id && a.name; });
  }

  function buildGuidance(rows) {
    return toObjects(rows).map(function (r) {
      return {
        id: txt(r.id),
        type: txt(r.type),
        topic: txt(r.topic),
        supervisor: txt(r.supervisor),
        status: txt(r.status) || 'Tentatif',
        tone: txt(r.tone) || 'warning',
        time: txt(r.time),
        place: txt(r.place),
        category: txt(r.category) || 'bimbingan',
        note: txt(r.note)
      };
    }).filter(function (g) { return g.id && g.type; });
  }

  function buildCalendar(rows) {
    return toObjects(rows).map(function (r) {
      return {
        id: txt(r.id),
        name: txt(r.name),
        start: isoDate(r.start),
        end: isoDate(r.end),
        critical: bool(r.critical)
      };
    }).filter(function (e) { return e.id && e.name && e.start; });
  }

  function buildMathfest(rows) {
    return toObjects(rows).map(function (r) {
      var relevance = txt(r.relevance);
      return {
        id: txt(r.id),
        phase: txt(r.phase),
        agenda: txt(r.agenda),
        sub: txt(r.sub),
        start: isoDate(r.start),
        end: isoDate(r.end),
        when: txt(r.when),
        place: txt(r.place),
        needs: txt(r.needs),
        pj: txt(r.pj),
        relevance: relevance ? relevance.toLowerCase() : null
      };
    }).filter(function (m) { return m.id && m.agenda; });
  }

  /* --------------------------------------------------------------------------
     5. CADANGAN — dibaca dari data.js yang sudah dimuat lebih dulu
     ------------------------------------------------------------------------ */
  /* PENTING: data.js mendeklarasikan datanya dengan `const`, dan `const` di
     tingkat global TIDAK menjadi properti window. Jadi `window.profileData`
     selalu undefined. Nilainya hanya bisa dibaca lewat nama variabelnya
     langsung, yang tetap terjangkau melalui rantai lingkup. */
  function pick(read, fallback) {
    try {
      var value = read();
      return value === undefined || value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function localDataset() {
    return {
      profile: pick(function () { return profileData; }, {}),
      semester: pick(function () { return semesterConfig; }, {}),
      calendar: pick(function () { return academicCalendar; }, []),
      classes: pick(function () { return scheduleData; }, []),
      activities: pick(function () { return academicActivities; }, []),
      guidance: pick(function () { return guidanceData; }, []),
      categories: pick(function () { return categoryLabels; }, {}),
      mathfestConfig: pick(function () { return mathfestConfig; }, {}),
      mathfestPhases: pick(function () { return mathfestPhases; }, []),
      mathfestTimeline: pick(function () { return mathfestTimeline; }, [])
    };
  }

  /* --------------------------------------------------------------------------
     6. PENGAMBILAN
     ------------------------------------------------------------------------ */
  function fetchCSV(url) {
    return new Promise(function (resolve, reject) {
      var settled = false;

      var timer = global.setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('Waktu tunggu habis setelah ' + FETCH_TIMEOUT_MS + 'ms'));
      }, FETCH_TIMEOUT_MS);

      global.fetch(url, { credentials: 'omit', redirect: 'follow' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (text) {
          if (settled) return;
          settled = true;
          global.clearTimeout(timer);
          resolve(parseCSV(text));
        })
        .catch(function (err) {
          if (settled) return;
          settled = true;
          global.clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Memuat seluruh data.
   * @param {function} callback dipanggil dengan ({ data, source, notes }).
   *   source: 'lokal' | 'sheets' | 'campuran'
   */
  function load(callback) {
    var local = localDataset();

    var fallback = {
      profile: local.profile,
      semester: local.semester,
      calendar: local.calendar,
      classes: local.classes,
      activities: local.activities,
      guidance: local.guidance,
      categories: local.categories,
      mathfestConfig: local.mathfestConfig,
      mathfestPhases: local.mathfestPhases,
      mathfestTimeline: local.mathfestTimeline
    };

    function finishLocal(reason) {
      callback({ data: fallback, source: 'lokal', notes: reason ? [reason] : [] });
    }

    if (typeof global.fetch !== 'function' || typeof global.Promise !== 'function') {
      return finishLocal('Browser ini tidak mendukung fetch — memakai data lokal.');
    }

    /* fetch dari file:// selalu diblokir browser. Daripada menampilkan error,
       langsung pakai data lokal supaya klik dua kali index.html tetap jalan. */
    try {
      if (global.location && global.location.protocol === 'file:') {
        return finishLocal('Dibuka langsung dari berkas — memakai data lokal. ' +
          'Google Sheets hanya terbaca saat dijalankan lewat http/https.');
      }
    } catch (e) { /* abaikan */ }

    var configured = Object.keys(SHEET_CSV_URLS).filter(function (key) {
      return isConfigured(SHEET_CSV_URLS[key]);
    });

    if (!configured.length) {
      return finishLocal('Tautan Google Sheets belum diisi di sheets.js — memakai data lokal.');
    }

    var notes = [];

    var jobs = configured.map(function (key) {
      return fetchCSV(SHEET_CSV_URLS[key])
        .then(function (rows) { return { key: key, rows: rows }; })
        .catch(function (err) {
          notes.push('Tab "' + key + '" gagal dimuat (' + err.message + ') — bagian ini memakai data lokal.');
          return { key: key, rows: null };
        });
    });

    Promise.all(jobs).then(function (results) {
      var data = {
        profile: fallback.profile,
        semester: fallback.semester,
        calendar: fallback.calendar,
        classes: fallback.classes,
        activities: fallback.activities,
        guidance: fallback.guidance,
        categories: fallback.categories,
        mathfestConfig: fallback.mathfestConfig,
        mathfestPhases: fallback.mathfestPhases,
        mathfestTimeline: fallback.mathfestTimeline
      };

      var ok = 0;

      results.forEach(function (result) {
        if (!result.rows) return;

        try {
          if (result.key === 'pengaturan') {
            var s = buildSettings(result.rows, {
              profile: fallback.profile,
              semester: fallback.semester,
              categories: fallback.categories,
              mathfestConfig: fallback.mathfestConfig,
              mathfestPhases: fallback.mathfestPhases
            });
            data.profile = s.profile;
            data.semester = s.semester;
            data.categories = s.categories;
            data.mathfestConfig = s.mathfestConfig;
            data.mathfestPhases = s.mathfestPhases;
            ok++;
            return;
          }

          var built = null;
          if (result.key === 'jadwal') built = buildSchedule(result.rows);
          else if (result.key === 'aktivitas') built = buildActivities(result.rows);
          else if (result.key === 'bimbingan') built = buildGuidance(result.rows);
          else if (result.key === 'kalender') built = buildCalendar(result.rows);
          else if (result.key === 'mathfest') built = buildMathfest(result.rows);

          /* Tab kosong dianggap belum diisi, bukan "hapus semua data". Ini
             mencegah dashboard mendadak kosong karena salah nama kolom. */
          if (!built || !built.length) {
            notes.push('Tab "' + result.key + '" kosong atau nama kolomnya tidak dikenali — bagian ini memakai data lokal.');
            return;
          }

          if (result.key === 'jadwal') data.classes = built;
          else if (result.key === 'aktivitas') data.activities = built;
          else if (result.key === 'bimbingan') data.guidance = built;
          else if (result.key === 'kalender') data.calendar = built;
          else if (result.key === 'mathfest') data.mathfestTimeline = built;
          ok++;
        } catch (err) {
          notes.push('Tab "' + result.key + '" gagal diolah (' + err.message + ') — bagian ini memakai data lokal.');
        }
      });

      var source = ok === 0 ? 'lokal' : (ok === configured.length && !notes.length ? 'sheets' : 'campuran');
      callback({ data: data, source: source, notes: notes });
    });
  }

  global.AcademicDataSource = {
    load: load,
    parseCSV: parseCSV,
    isConfigured: function () {
      return Object.keys(SHEET_CSV_URLS).some(function (k) {
        return isConfigured(SHEET_CSV_URLS[k]);
      });
    }
  };
})(window);
