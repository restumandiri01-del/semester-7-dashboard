/* ============================================================================
   Semester 7 Academic OS — sheets.js
   ----------------------------------------------------------------------------
   Lapisan sumber data.

   Urutan sumber, dari yang paling diutamakan:

       1. Google Sheets (CSV)      data paling baru
       2. cache di perangkat       hasil pengambilan terakhir yang berhasil
       3. data.js                  cadangan yang ikut dikirim bersama situs

   Kegagalan ditangani PER BAGIAN, jadi kalau hanya tab "jadwal" yang rusak,
   bagian lain tetap memakai data terbaru dari Sheets. Baris yang salah isi
   dibuang satu per satu, bukan setabnya.

   Dashboard tidak pernah kosong: apa pun yang terjadi pada jaringan atau pada
   isi spreadsheet, selalu ada lapisan di bawahnya yang bisa ditampilkan.

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

  /* Kunci cache. Angka versinya dinaikkan kalau bentuk data berubah, supaya
     cache lama dari versi sebelumnya tidak pernah dibaca sebagai data valid. */
  var CACHE_KEY = 's7os.cache.v1';

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
     3b. VALIDASI
     ----------------------------------------------------------------------------
     Spreadsheet diisi manusia dari ponsel, jadi salah ketik adalah hal normal.
     Aturannya: satu baris rusak hanya membuang baris itu, tidak pernah membuang
     seluruh tab dan tidak pernah membuat aplikasi berhenti. Alasannya dicatat
     supaya bisa diperbaiki, bukan ditebak.
     ------------------------------------------------------------------------ */

  /** 0 = Minggu … 6 = Sabtu. Nilai di luar itu berarti salah isi. */
  function validDay(v) {
    return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 6 && v === Math.floor(v);
  }

  function validTime(s) {
    return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  }

  /** Tanggal harus benar-benar ada — '2026-02-31' ditolak, bukan digeser. */
  function validISO(s) {
    if (typeof s !== 'string') return false;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
  }

  function minutesOf(hhmm) {
    var p = String(hhmm).split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  }

  /**
   * Menyaring daftar hasil parsing dengan sebuah pemeriksa.
   * @param {string} tab     nama tab, untuk pesan
   * @param {Array}  list    hasil pemetaan baris
   * @param {function} check mengembalikan null bila sah, atau alasan penolakan
   * @param {Array}  issues  tempat menampung catatan
   */
  function keepValid(tab, list, check, issues) {
    return list.filter(function (item, idx) {
      var why = check(item);
      if (!why) return true;
      /* +2: baris 1 adalah judul kolom, dan indeks mulai dari 0. Angka ini
         menunjuk ke nomor baris yang benar-benar terlihat di spreadsheet. */
      issues.push('Tab "' + tab + '" baris ' + (idx + 2) + ' dilewati — ' + why + '.');
      return false;
    });
  }

  /* --------------------------------------------------------------------------
     4. PEMBENTUK STRUKTUR — CSV mentah menjadi bentuk yang dipakai aplikasi
     ------------------------------------------------------------------------ */

  /** Tab "pengaturan" berisi pasangan kunci/nilai; diubah jadi peta datar. */
  function settingsMap(rows) {
    var map = {};   // kunci huruf kecil → nilai, untuk pencarian yang eksplisit
    var raw = [];   // kunci apa adanya, supaya huruf besar-kecil tidak hilang

    toObjects(rows).forEach(function (r) {
      var key = txt(r.kunci || r.key);
      if (!key) return;
      var value = r.nilai === undefined ? r.value : r.nilai;
      map[key.toLowerCase()] = value;
      raw.push({ key: key, value: value });
    });

    map.__raw = raw;
    return map;
  }

  /* Mengambil semua kunci berawalan `prefix`. Pencocokan awalannya tidak
     membedakan huruf besar-kecil, tetapi sisa kuncinya dikembalikan apa adanya
     supaya nama seperti "divisionHead" tidak berubah jadi "divisionhead". */
  function prefixed(map, prefix) {
    var out = {};
    var lower = prefix.toLowerCase();

    (map.__raw || []).forEach(function (entry) {
      if (entry.key.toLowerCase().indexOf(lower) !== 0) return;
      out[entry.key.slice(prefix.length)] = txt(entry.value);
    });

    return out;
  }

  function buildSettings(rows, local) {
    var map = settingsMap(rows);

    /* Tab pengaturan yang kosong berarti belum diisi. Mengembalikan null di
       sini membuat pemanggilnya memperlakukannya sama seperti tab kosong
       lainnya: pakai nilai sebelumnya, jangan mengaku "data dari Sheets". */
    if (!map.__raw.length) return null;

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

    /* Semua kunci berawalan "mathfest." ikut terbawa, jadi menambah kolom baru
       di spreadsheet (misalnya mathfest.position) tidak perlu mengubah kode. */
    var mathfest = Object.assign({}, local.mathfestConfig);
    var fromSheet = prefixed(map, 'mathfest.');
    Object.keys(fromSheet).forEach(function (key) {
      if (fromSheet[key] !== null) mathfest[key] = fromSheet[key];
    });

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

  function buildSchedule(rows, issues) {
    var list = toObjects(rows).map(function (r) {
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
    });

    return keepValid('jadwal', list, function (c) {
      if (!c.id) return 'kolom id kosong';
      if (!c.name) return 'kolom name kosong';
      if (!validDay(c.day)) return 'kolom day harus angka 0–6 (0 = Minggu), bukan "' + c.day + '"';
      if (!validTime(c.start)) return 'kolom start harus format jam HH:MM';
      if (!validTime(c.end)) return 'kolom end harus format jam HH:MM';
      if (minutesOf(c.end) <= minutesOf(c.start)) return 'jam selesai tidak boleh lebih awal dari jam mulai';
      return null;
    }, issues);
  }

  function buildActivities(rows, issues) {
    var list = toObjects(rows).map(function (r) {
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
    });

    return keepValid('aktivitas', list, function (a) {
      if (!a.id) return 'kolom id kosong';
      if (!a.name) return 'kolom name kosong';
      if (a.deadline && !validISO(a.deadline)) return 'kolom deadline bukan tanggal yang sah';
      if (a.session) {
        if (!validDay(a.session.day)) return 'kolom session_day harus angka 0–6';
        if (!validTime(a.session.start)) return 'kolom session_start harus format jam HH:MM';
        /* session_end boleh kosong; yang dilarang hanya isian yang salah bentuk. */
        if (a.session.end !== null && !validTime(a.session.end)) return 'kolom session_end harus format jam HH:MM';
      }
      return null;
    }, issues);
  }

  function buildGuidance(rows, issues) {
    var list = toObjects(rows).map(function (r) {
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
    });

    return keepValid('bimbingan', list, function (g) {
      if (!g.id) return 'kolom id kosong';
      if (!g.type) return 'kolom type kosong';
      return null;
    }, issues);
  }

  function buildCalendar(rows, issues) {
    var list = toObjects(rows).map(function (r) {
      return {
        id: txt(r.id),
        name: txt(r.name),
        start: isoDate(r.start),
        end: isoDate(r.end),
        critical: bool(r.critical)
      };
    });

    return keepValid('kalender', list, function (e) {
      if (!e.id) return 'kolom id kosong';
      if (!e.name) return 'kolom name kosong';
      if (!validISO(e.start)) return 'kolom start bukan tanggal yang sah (pakai YYYY-MM-DD)';
      if (e.end !== null && !validISO(e.end)) return 'kolom end bukan tanggal yang sah (pakai YYYY-MM-DD)';
      if (e.end && e.end < e.start) return 'tanggal end lebih awal daripada start';
      return null;
    }, issues);
  }

  function buildMathfest(rows, issues) {
    var list = toObjects(rows).map(function (r) {
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
    });

    return keepValid('mathfest', list, function (m) {
      if (!m.id) return 'kolom id kosong';
      if (!m.agenda) return 'kolom agenda kosong';
      /* Agenda boleh tidak bertanggal — kolom `when` yang dipakai. Yang ditolak
         hanya tanggal yang diisi tetapi salah bentuk. */
      if (m.start !== null && !validISO(m.start)) return 'kolom start bukan tanggal yang sah (pakai YYYY-MM-DD)';
      if (m.end !== null && !validISO(m.end)) return 'kolom end bukan tanggal yang sah (pakai YYYY-MM-DD)';
      if (m.start && m.end && m.end < m.start) return 'tanggal end lebih awal daripada start';
      return null;
    }, issues);
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
      mathfestTimeline: pick(function () { return mathfestTimeline; }, []),

      /* Susunan kepanitiaan statis sepanjang acara, jadi tidak punya tab
         sendiri di spreadsheet — selalu dibaca dari data.js. */
      mathfestDivisionHeads: pick(function () { return mathfestDivisionHeads; }, []),
      mathfestTeam: pick(function () { return mathfestTeam; }, [])
    };
  }

  /* --------------------------------------------------------------------------
     5b. CACHE — hasil pengambilan terakhir yang berhasil
     ----------------------------------------------------------------------------
     Urutan sumber data menjadi tiga lapis:

         Google Sheets  →  cache di perangkat  →  data.js

     Gunanya nyata: membuka dashboard di kampus tanpa sinyal tetap menampilkan
     jadwal yang kemarin diubah dari ponsel, bukan mundur ke data.js yang bisa
     jadi sudah usang berbulan-bulan.

     Cache hanya berisi salinan data akademik milik sendiri, disimpan di
     peramban pengguna, dan tidak pernah dikirim ke mana pun.
     ------------------------------------------------------------------------ */
  function readCache() {
    try {
      var raw = global.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.sections) return null;
      return parsed;
    } catch (e) {
      /* Penyimpanan diblokir, penuh, atau isinya rusak — perlakukan sebagai
         "tidak ada cache". Ini bukan kondisi error bagi pengguna. */
      return null;
    }
  }

  function writeCache(sections) {
    if (!sections || !Object.keys(sections).length) return null;
    var payload = { savedAt: Date.now(), sections: sections };
    try {
      global.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      /* Mode privat atau kuota habis. Aplikasi tetap jalan tanpa cache. */
      return null;
    }
    return payload.savedAt;
  }

  function clearCache() {
    try { global.localStorage.removeItem(CACHE_KEY); return true; }
    catch (e) { return false; }
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

  /* Menerapkan satu bagian hasil olahan ke objek data aplikasi. Dipakai baik
     untuk hasil segar dari Sheets maupun untuk isi cache, sehingga keduanya
     tidak mungkin berbeda perlakuan. */
  function applySection(data, key, section) {
    if (key === 'pengaturan') {
      if (section.profile) data.profile = section.profile;
      if (section.semester) data.semester = section.semester;
      if (section.categories) data.categories = section.categories;
      if (section.mathfestConfig) data.mathfestConfig = section.mathfestConfig;
      if (section.mathfestPhases) data.mathfestPhases = section.mathfestPhases;
      return;
    }
    if (key === 'jadwal') data.classes = section;
    else if (key === 'aktivitas') data.activities = section;
    else if (key === 'bimbingan') data.guidance = section;
    else if (key === 'kalender') data.calendar = section;
    else if (key === 'mathfest') data.mathfestTimeline = section;
  }

  /**
   * Memuat seluruh data.
   *
   * @param {function} callback dipanggil dengan:
   *   {
   *     data:    objek data aplikasi,
   *     source:  'lokal' | 'sheets' | 'cache' | 'campuran',
   *     savedAt: waktu data ini diambil dari Sheets (ms), atau null,
   *     fresh:   true bila ada bagian yang baru saja diambil dari jaringan,
   *     notes:   catatan teknis untuk konsol
   *   }
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
      mathfestTimeline: local.mathfestTimeline,
      mathfestDivisionHeads: local.mathfestDivisionHeads,
      mathfestTeam: local.mathfestTeam
    };

    function baseData() {
      var out = {};
      Object.keys(fallback).forEach(function (k) { out[k] = fallback[k]; });
      return out;
    }

    function finishLocal(reason) {
      callback({
        data: baseData(), source: 'lokal', savedAt: null, fresh: false,
        notes: reason ? [reason] : []
      });
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
      /* Tanpa tautan Sheets, data.js memang sumber resminya. Cache lama justru
         akan menyesatkan, jadi tidak dipakai. */
      return finishLocal('Tautan Google Sheets belum diisi di sheets.js — memakai data lokal.');
    }

    var notes = [];
    var cache = readCache();
    var data = baseData();

    /* Pasang isi cache lebih dulu. Apa pun yang berhasil diambil dari jaringan
       akan menimpanya di bawah; yang gagal tetap memakai salinan ini. */
    var usedCache = false;
    if (cache) {
      Object.keys(cache.sections).forEach(function (key) {
        if (configured.indexOf(key) === -1) return;
        try { applySection(data, key, cache.sections[key]); usedCache = true; }
        catch (e) { /* satu bagian cache rusak — abaikan bagian itu saja */ }
      });
    }

    function offlineNow() {
      try { return global.navigator && global.navigator.onLine === false; }
      catch (e) { return false; }
    }

    /* Saat perangkat jelas-jelas offline, tidak ada gunanya menunggu 8 detik
       untuk enam permintaan yang pasti gagal. */
    if (offlineNow()) {
      return callback({
        data: data,
        source: usedCache ? 'cache' : 'lokal',
        savedAt: usedCache && cache ? cache.savedAt : null,
        fresh: false,
        notes: ['Perangkat sedang offline — memakai ' +
          (usedCache ? 'salinan terakhir yang tersimpan.' : 'data lokal.')]
      });
    }

    var jobs = configured.map(function (key) {
      return fetchCSV(SHEET_CSV_URLS[key])
        .then(function (rows) { return { key: key, rows: rows }; })
        .catch(function (err) {
          notes.push('Tab "' + key + '" gagal dimuat (' + err.message + ').');
          return { key: key, rows: null };
        });
    });

    Promise.all(jobs).then(function (results) {
      var freshSections = {};
      var ok = 0;

      results.forEach(function (result) {
        if (!result.rows) return;

        try {
          var built;

          if (result.key === 'pengaturan') {
            built = buildSettings(result.rows, {
              profile: fallback.profile,
              semester: fallback.semester,
              categories: fallback.categories,
              mathfestConfig: fallback.mathfestConfig,
              mathfestPhases: fallback.mathfestPhases
            });
          } else if (result.key === 'jadwal') built = buildSchedule(result.rows, notes);
          else if (result.key === 'aktivitas') built = buildActivities(result.rows, notes);
          else if (result.key === 'bimbingan') built = buildGuidance(result.rows, notes);
          else if (result.key === 'kalender') built = buildCalendar(result.rows, notes);
          else if (result.key === 'mathfest') built = buildMathfest(result.rows, notes);
          else return;

          /* Tab kosong dianggap belum diisi, bukan "hapus semua data". Ini
             mencegah dashboard mendadak kosong karena salah nama kolom. */
          if (!built || (Array.isArray(built) && !built.length)) {
            notes.push('Tab "' + result.key + '" kosong atau nama kolomnya tidak dikenali — bagian ini tidak diperbarui.');
            return;
          }

          applySection(data, result.key, built);
          freshSections[result.key] = built;
          ok++;
        } catch (err) {
          notes.push('Tab "' + result.key + '" gagal diolah (' + err.message + ') — bagian ini tidak diperbarui.');
        }
      });

      /* Cache hanya ditulis kalau ada yang benar-benar baru. Bagian yang gagal
         diambil tetap memakai salinan lamanya, jadi cache tidak pernah
         kehilangan data yang sudah pernah berhasil tersimpan. */
      var savedAt = null;
      if (ok > 0) {
        var merged = {};
        if (cache && cache.sections) {
          Object.keys(cache.sections).forEach(function (k) { merged[k] = cache.sections[k]; });
        }
        Object.keys(freshSections).forEach(function (k) { merged[k] = freshSections[k]; });
        savedAt = writeCache(merged);
      } else if (usedCache && cache) {
        savedAt = cache.savedAt;
      }

      var source;
      if (ok === 0) source = usedCache ? 'cache' : 'lokal';
      else if (ok === configured.length) source = 'sheets';
      else source = 'campuran';

      callback({
        data: data,
        source: source,
        savedAt: savedAt,
        fresh: ok > 0,
        notes: notes
      });
    });
  }

  global.AcademicDataSource = {
    load: load,
    parseCSV: parseCSV,
    clearCache: clearCache,
    hasCache: function () { return !!readCache(); },
    isConfigured: function () {
      return Object.keys(SHEET_CSV_URLS).some(function (k) {
        return isConfigured(SHEET_CSV_URLS[k]);
      });
    }
  };
})(window);
