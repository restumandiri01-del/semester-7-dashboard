/* ============================================================================
   Semester 7 Academic OS — script.js
   ----------------------------------------------------------------------------
   Seluruh data akademik dibaca dari data.js. File ini hanya berisi logika:
   turunan data, render, mesin realtime, navigasi, pencarian, filter, dan tema.
   ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
     1. DATA SOURCE  — dibaca sekali, tidak pernah diduplikasi
     ======================================================================== */

  var PROFILE = { name: '—', initials: '—', nim: '—', program: '—', semester: '—', academicYear: '—' };
  var CONFIG = { startDate: null, endDate: null, semester: '—', academicYear: '—' };
  var CLASSES = [];
  var ACTIVITIES = [];
  var GUIDANCE = [];
  var CATEGORIES = {};
  var CALENDAR = [];
  var MATHFEST = { name: null, organization: null, role: null, division: null };
  var MF_PHASES = [];
  var MF_ITEMS = [];

  /* --------------------------------------------------------------------------
     SESSIONS = semua kegiatan yang punya slot mingguan tetap.
     Perkuliahan reguler + aktivitas akademik yang sudah dijadwalkan.
     Dipakai oleh jadwal hari ini, kelas berikutnya, status, dan jadwal mingguan.
     SKS-nya TIDAK dijumlahkan di sini — beban akademik tetap dihitung terpisah
     supaya pemisahan 15 / 7 / 22 SKS tetap utuh.
     ------------------------------------------------------------------------ */
  var SESSIONS = [];
  var LOAD = { scheduled: 0, extra: 0, total: 0, breakdown: [] };
  var INDEX = [];
  var DATA_SOURCE = 'lokal';
  var DATA_NOTES = [];

  /* --------------------------------------------------------------------------
     hydrate() — satu-satunya pintu masuk data ke aplikasi.
     Dipanggil setelah sumber data selesai dimuat (Google Sheets atau data.js).
     Seluruh turunan dihitung ulang di sini, jadi memanggilnya kembali dengan
     data baru sudah cukup untuk menyegarkan seluruh tampilan.
     ------------------------------------------------------------------------ */
  function hydrate(dataset) {
    var d = dataset || {};

    PROFILE = Object.assign(
      { name: '—', initials: '—', nim: '—', program: '—', semester: '—', academicYear: '—' },
      d.profile || {}
    );
    CONFIG = Object.assign(
      { startDate: null, endDate: null, semester: '—', academicYear: '—' },
      d.semester || {}
    );
    MATHFEST = Object.assign(
      { name: null, organization: null, role: null, division: null },
      d.mathfestConfig || {}
    );

    CLASSES = Array.isArray(d.classes) ? d.classes.slice() : [];
    ACTIVITIES = Array.isArray(d.activities) ? d.activities.slice() : [];
    GUIDANCE = Array.isArray(d.guidance) ? d.guidance.slice() : [];
    CALENDAR = Array.isArray(d.calendar) ? d.calendar.slice() : [];
    MF_PHASES = Array.isArray(d.mathfestPhases) ? d.mathfestPhases.slice() : [];
    MF_ITEMS = Array.isArray(d.mathfestTimeline) ? d.mathfestTimeline.slice() : [];
    CATEGORIES = Object.assign({}, d.categories || {});

    CLASSES.sort(function (a, b) {
      return a.day - b.day || toMinutes(a.start) - toMinutes(b.start);
    });

    SESSIONS = CLASSES.map(function (c) {
      return {
        id: c.id, name: c.name, code: c.code || null, day: c.day,
        start: c.start, end: c.end, sks: c.sks, room: c.room,
        lecturer: c.lecturer, kind: c.kind, category: c.category,
        classGroup: c.classGroup || null, type: 'perkuliahan',
        formality: !!c.formality
      };
    });

    ACTIVITIES.forEach(function (a) {
      if (!a.session) return;
      SESSIONS.push({
        id: 'sesi-' + a.id, name: a.name, code: a.code || null, day: a.session.day,
        start: a.session.start, end: a.session.end, sks: a.sks, room: a.session.room,
        lecturer: a.session.lecturer || a.supervisor, kind: CATEGORIES[a.category] || 'Aktivitas Akademik',
        category: a.category, classGroup: a.classGroup || null, type: 'aktivitas',
        formality: !!a.session.formality
      });
    });

    SESSIONS.sort(function (a, b) {
      return a.day - b.day || toMinutes(a.start) - toMinutes(b.start);
    });

    /* Agenda kepanitiaan diurutkan berdasarkan tanggal mulai; agenda tanpa
       tanggal ditempatkan paling akhir. */
    MF_ITEMS.sort(function (a, b) {
      var da = parseISODate(a.start);
      var db = parseISODate(b.start);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db || (parseISODate(a.end) || da) - (parseISODate(b.end) || db);
    });

    LOAD = buildLoad();
    INDEX = buildIndex();
  }

  /* ==========================================================================
     2. KONSTANTA & UTILITAS
     ======================================================================== */

  var DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var WEEK_DAYS = [1, 2, 3, 4, 5, 6];
  var MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var EMPTY = 'Belum ditentukan';
  var LOAD_ORDER = ['studi-literatur', 'seminar-studi-literatur', 'kkn', 'skripsi-1'];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toMinutes(hhmm) {
    var parts = String(hhmm || '0:0').split(':');
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  /** '09:30' → '09.30' (konvensi waktu Indonesia) */
  function clock(hhmm) { return String(hhmm || '').replace(':', '.'); }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function duration(cls, long) {
    var total = toMinutes(cls.end) - toMinutes(cls.start);
    if (total <= 0) return '—';
    var h = Math.floor(total / 60);
    var m = total % 60;
    if (long) {
      return (h ? h + ' jam' : '') + (h && m ? ' ' : '') + (m ? m + ' menit' : '');
    }
    return (h ? h + 'j' : '') + (h && m ? ' ' : '') + (m ? m + 'm' : '');
  }

  function formatDate(date) {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).format(date);
    } catch (e) {
      return DAY_NAMES[date.getDay()] + ', ' + date.getDate() + ' ' +
        MONTHS[date.getMonth()] + ' ' + date.getFullYear();
    }
  }

  function parseISODate(value) {
    if (!value) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  function shortDate(d) { return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; }

  /** '2026-09-10' + '2026-09-12' → '10–12 Sep 2026' */
  function dateRangeLabel(startISO, endISO) {
    var s = parseISODate(startISO);
    var e = parseISODate(endISO) || s;
    if (!s) return EMPTY;
    if (s.getTime() === e.getTime()) return shortDate(s) + ' ' + s.getFullYear();
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return s.getDate() + '–' + e.getDate() + ' ' + MONTHS_SHORT[e.getMonth()] + ' ' + e.getFullYear();
    }
    return shortDate(s) + ' – ' + shortDate(e) + ' ' + e.getFullYear();
  }

  function calendarStatus(ev, now) {
    var s = parseISODate(ev.start);
    var e = parseISODate(ev.end) || s;
    if (!s) return 'upcoming';
    var endOfDay = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
    if (now < s) return 'upcoming';
    if (now <= endOfDay) return 'live';
    return 'done';
  }

  function daysUntil(iso, now) {
    var target = parseISODate(iso);
    if (!target) return null;
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target - today) / 86400000);
  }

  /** Slot mingguan sebuah aktivitas → 'Sabtu, 10.20–12.00' */
  function sessionLabel(s) {
    return DAY_NAMES[s.day] + ', ' + clock(s.start) + '–' + clock(s.end);
  }

  function greetingFor(hour) {
    if (hour >= 5 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  function greetingBucket(hour) {
    if (hour >= 5 && hour < 11) return 'pagi';
    if (hour >= 11 && hour < 15) return 'siang';
    if (hour >= 15 && hour < 18) return 'sore';
    return 'malam';
  }

  function value(text) {
    return text
      ? '<span class="meta-value">' + esc(text) + '</span>'
      : '<span class="meta-value is-empty">' + EMPTY + '</span>';
  }

  function metaItem(label, text) {
    return '<div class="meta-item"><span class="meta-label">' + esc(label) + '</span>' + value(text) + '</div>';
  }

  /* ==========================================================================
     3. IKON — satu sistem, stroke 1.5, viewBox 24
     ======================================================================== */

  var ICONS = {
    dashboard: '<path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15V14H9v6.5H5.5A1.5 1.5 0 0 1 4 19v-8.6Z"/>',
    calendar: '<rect x="3.5" y="5.2" width="17" height="15.3" rx="2.4"/><path d="M8.2 3v4M15.8 3v4M3.5 10.2h17"/>',
    book: '<path d="M12 6.6S10 4.6 4.2 4.6v12.8c5.8 0 7.8 2 7.8 2s2-2 7.8-2V4.6C14 4.6 12 6.6 12 6.6Z"/><path d="M12 6.6v12.8"/>',
    mentor: '<circle cx="9.4" cy="8.2" r="3.3"/><path d="M3.4 19.8a6 6 0 0 1 12 0"/><path d="M16.4 5.4a3.3 3.3 0 0 1 0 5.6"/><path d="M17.8 14.6a6 6 0 0 1 2.8 5.2"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.1 1.9"/>',
    pin: '<path d="M12 20.8s-6.3-5.2-6.3-9.8a6.3 6.3 0 1 1 12.6 0c0 4.6-6.3 9.8-6.3 9.8Z"/><circle cx="12" cy="10.8" r="2.3"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    layers: '<path d="m12 3.4 8.4 4.4L12 12.2 3.6 7.8 12 3.4Z"/><path d="m3.6 12.2 8.4 4.4 8.4-4.4"/><path d="m3.6 16.4 8.4 4.4 8.4-4.4"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    chevron: '<path d="m9.6 6 6 6-6 6"/>',
    inbox: '<path d="M3.8 13.2h4l1.5 2.3h5.4l1.5-2.3h4"/><path d="M6.6 4.4h10.8l3 8.8v4.4a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2v-4.4l3-8.8Z"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.2v5.2"/><circle cx="12" cy="7.9" r=".95" fill="currentColor" stroke="none"/>',
    check: '<path d="m5.2 12.6 4.4 4.4L18.8 7.6"/>',
    alert: '<path d="M10.7 4.2 2.8 17.6a1.5 1.5 0 0 0 1.3 2.3h15.8a1.5 1.5 0 0 0 1.3-2.3L13.3 4.2a1.5 1.5 0 0 0-2.6 0Z"/><path d="M12 9.4v4"/><circle cx="12" cy="16.6" r=".95" fill="currentColor" stroke="none"/>',
    sparkles: '<path d="M12 3.6 13.7 9l5.4 1.7-5.4 1.7L12 17.8l-1.7-5.4L4.9 10.7 10.3 9 12 3.6Z"/><path d="M18.6 16.4l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7.7-2.2Z"/>'
  };

  function icon(name, extra) {
    var path = ICONS[name] || '';
    return '<svg class="icon' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + path + '</svg>';
  }

  /* ==========================================================================
     4. TURUNAN DATA (selectors)
     ======================================================================== */

  function buildLoad() {
    var scheduled = CLASSES.reduce(function (sum, c) { return sum + (c.sks || 0); }, 0);
    var extra = ACTIVITIES.reduce(function (sum, a) { return sum + (a.sks || 0); }, 0);

    var breakdown = [{ id: 'perkuliahan', name: 'Perkuliahan', sks: scheduled }];
    ACTIVITIES.slice().sort(function (a, b) {
      var ia = LOAD_ORDER.indexOf(a.id); var ib = LOAD_ORDER.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }).forEach(function (a) {
      breakdown.push({ id: a.id, name: a.name, sks: a.sks || 0 });
    });

    return { scheduled: scheduled, extra: extra, total: scheduled + extra, breakdown: breakdown };
  }

  function classesOn(day) {
    return SESSIONS.filter(function (c) { return c.day === day; });
  }

  /** Status kegiatan dalam kerangka pekan berjalan (Senin–Sabtu). */
  function statusOf(cls, now) {
    var today = now.getDay();
    if (today === 0) return 'upcoming';               // Minggu — pekan kuliah belum dimulai
    if (cls.day === today) {
      var mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (mins < toMinutes(cls.start)) return 'upcoming';
      if (mins < toMinutes(cls.end)) return 'live';
      return 'done';
    }
    return cls.day > today ? 'upcoming' : 'done';
  }

  var STATUS_LABEL = { live: 'Sedang Berlangsung', upcoming: 'Akan Datang', done: 'Selesai' };
  var STATUS_TONE = { live: 'success', upcoming: 'neutral', done: 'muted' };

  function statusBadge(state) {
    return '<span class="badge badge-' + STATUS_TONE[state] + (state === 'live' ? ' badge-live' : '') + '">' +
      STATUS_LABEL[state] + '</span>';
  }

  function liveClass(now) {
    var day = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    for (var i = 0; i < SESSIONS.length; i++) {
      var c = SESSIONS[i];
      if (c.day === day && mins >= toMinutes(c.start) && mins < toMinutes(c.end)) return c;
    }
    return null;
  }

  /** Tanggal kemunculan berikutnya untuk sebuah kelas, relatif terhadap `from`. */
  function nextOccurrence(cls, from) {
    var d = new Date(from.getTime());
    d.setDate(d.getDate() + ((cls.day - from.getDay() + 7) % 7));
    d.setHours(toMinutes(cls.start) / 60 | 0, toMinutes(cls.start) % 60, 0, 0);
    if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 7);
    return d;
  }

  function occurrenceEnd(cls, from) {
    var d = new Date(from.getTime());
    d.setHours(toMinutes(cls.end) / 60 | 0, toMinutes(cls.end) % 60, 0, 0);
    return d;
  }

  function occurrenceStart(cls, from) {
    var d = new Date(from.getTime());
    d.setHours(toMinutes(cls.start) / 60 | 0, toMinutes(cls.start) % 60, 0, 0);
    return d;
  }

  function nextClass(now) {
    var best = null;
    SESSIONS.forEach(function (c) {
      var at = nextOccurrence(c, now);
      if (!best || at.getTime() < best.at.getTime()) best = { cls: c, at: at };
    });
    return best;
  }

  function formatCountdown(ms) {
    if (!isFinite(ms) || ms < 0) ms = 0;
    var total = Math.floor(ms / 1000);
    var days = Math.floor(total / 86400);
    var hours = Math.floor((total % 86400) / 3600);
    var mins = Math.floor((total % 3600) / 60);
    var secs = total % 60;
    if (days > 0) {
      return { text: days + ' hari' + (hours > 0 ? ' ' + hours + ' jam' : ''), words: true };
    }
    return { text: pad(hours) + ':' + pad(mins) + ':' + pad(secs), words: false };
  }

  function semesterProgress(now) {
    var start = parseISODate(CONFIG.startDate);
    var end = parseISODate(CONFIG.endDate);
    if (!start || !end || end <= start) return null;
    var span = end - start;
    var done = Math.min(Math.max(now - start, 0), span);
    return {
      start: start,
      end: end,
      percent: Math.round((done / span) * 100),
      weeksLeft: Math.max(0, Math.ceil((end - now) / (7 * 86400000)))
    };
  }

  /* ==========================================================================
     5. INDEKS PENCARIAN
     ======================================================================== */

  function buildIndex() {
    var items = [];

    CLASSES.forEach(function (c) {
      items.push({
        kind: 'class', ref: c, icon: 'calendar',
        title: c.name,
        categoryLabel: CATEGORIES.perkuliahan || 'Perkuliahan',
        category: 'perkuliahan',
        meta: DAY_NAMES[c.day] + ' · ' + clock(c.start) + '–' + clock(c.end) + ' · ' + c.room + ' · ' + c.lecturer + ' · ' + c.sks + ' SKS',
        terms: [c.name, c.lecturer, c.room, c.kind, DAY_NAMES[c.day], 'perkuliahan', 'kuliah', 'mata kuliah', clock(c.start), clock(c.end)]
      });
    });

    ACTIVITIES.forEach(function (a) {
      var when = a.session
        ? sessionLabel(a.session) + ' · ' + a.session.room
        : 'Belum dijadwalkan';
      items.push({
        kind: 'activity', ref: a, icon: 'book',
        title: a.name,
        categoryLabel: CATEGORIES[a.category] || 'Aktivitas',
        category: a.category,
        meta: a.sks + ' SKS · ' + when + (a.supervisor ? ' · ' + a.supervisor : '') + (a.topic ? ' · ' + a.topic : ''),
        terms: [a.name, a.code, a.topic, a.supervisor, a.status, CATEGORIES[a.category], 'aktivitas akademik',
          a.classGroup ? 'kelas ' + a.classGroup : null,
          a.session ? DAY_NAMES[a.session.day] : null,
          a.session ? a.session.room : null,
          a.session ? clock(a.session.start) : null]
      });
    });

    GUIDANCE.forEach(function (g) {
      items.push({
        kind: 'guidance', ref: g, icon: 'mentor',
        title: 'Bimbingan ' + g.type,
        categoryLabel: CATEGORIES.bimbingan || 'Bimbingan',
        category: 'bimbingan',
        meta: (g.topic || EMPTY) + ' · ' + (g.supervisor || EMPTY) + ' · ' + g.status,
        terms: [g.type, g.topic, g.supervisor, g.status, 'bimbingan', 'pembimbing']
      });
    });

    MF_ITEMS.forEach(function (m) {
      items.push({
        kind: 'mathfest', ref: m, icon: 'sparkles',
        title: m.agenda + (m.sub ? ' · ' + m.sub : ''),
        categoryLabel: MATHFEST.name || 'Kepanitiaan',
        category: 'mathfest',
        meta: mfDateLabel(m) + (m.place ? ' · ' + m.place : '') +
          (m.pj ? ' · ' + m.pj : '') + (m.needs ? ' · ' + m.needs : ''),
        terms: [m.agenda, m.sub, m.pj, m.needs, m.place, m.when,
          MATHFEST.name, MATHFEST.organization, 'mathfest', 'kepanitiaan', 'panitia', 'timeline',
          mfIsMine(m) ? MATHFEST.role : null]
      });
    });

    items.forEach(function (i) {
      i.haystack = i.terms.filter(Boolean).join(' ').toLowerCase();
    });
    return items;
  }

  function runSearch(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    var tokens = q.split(/\s+/);
    return INDEX.filter(function (item) {
      return tokens.every(function (t) { return item.haystack.indexOf(t) !== -1; });
    });
  }

  function highlight(text, query) {
    var safe = esc(text);
    var q = String(query || '').trim();
    if (!q) return safe;
    try {
      var needle = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return safe.replace(new RegExp('(' + needle + ')', 'ig'), '<mark>$1</mark>');
    } catch (e) {
      return safe;
    }
  }

  /* ==========================================================================
     6. KOMPONEN
     ======================================================================== */

  function emptyState(title, text, compact) {
    return '<div class="empty-state' + (compact ? ' is-compact' : '') + '">' +
      icon('inbox') +
      '<p class="empty-state-title">' + esc(title) + '</p>' +
      (text ? '<p class="empty-state-text">' + esc(text) + '</p>' : '') +
      '</div>';
  }

  function scheduleRow(cls, now) {
    var state = statusOf(cls, now);
    return '<li class="schedule-row" data-state="' + state + '">' +
      '<span class="row-time"><span class="start">' + clock(cls.start) + '</span>' +
      '<span class="end">' + clock(cls.end) + '</span></span>' +
      '<span class="row-body">' +
      '<span class="row-title">' + esc(cls.name) + '</span>' +
      '<span class="row-meta">' + esc(cls.room) + '<span class="dot-sep">·</span>' +
      esc(cls.lecturer) + '<span class="dot-sep">·</span>' + cls.sks + ' SKS</span>' +
      '</span>' + statusBadge(state) + '</li>';
  }

  function classCard(cls, now) {
    var state = statusOf(cls, now);
    return '<article class="class-card" data-state="' + state + '" data-type="' + cls.type + '">' +
      (cls.type === 'aktivitas'
        ? '<p class="cc-kicker">' + esc(cls.kind) + (cls.classGroup ? ' · Kelas ' + esc(cls.classGroup) : '') + '</p>'
        : '') +
      '<h3 class="cc-title">' + esc(cls.name) + '</h3>' +
      '<p class="cc-time"><span>' + clock(cls.start) + '–' + clock(cls.end) + '</span>' +
      '<span class="cc-duration">' + duration(cls) + '</span></p>' +
      '<div class="cc-facts">' +
      '<span>' + icon('pin') + esc(cls.room) + '</span>' +
      '<span>' + icon('user') + esc(cls.lecturer) + '</span>' +
      '<span>' + icon('layers') + cls.sks + ' SKS</span>' +
      '</div>' +
      '<div class="cc-foot">' + statusBadge(state) + '</div>' +
      '</article>';
  }

  /* --------------------------------------------------------------------------
     Kartu fokus: kelas yang sedang berlangsung, atau kelas berikutnya
     ------------------------------------------------------------------------ */
  function focusCard(now) {
    var live = liveClass(now);
    var next = nextClass(now);

    if (!live && !next) {
      return '<section class="focus-card" data-state="empty" aria-labelledby="focus-heading">' +
        '<p class="section-label" id="focus-heading">Kelas Berikutnya</p>' +
        '<p class="focus-title" style="margin-top:10px">Tidak ada jadwal kuliah</p>' +
        '<p class="focus-sub">Belum ada mata kuliah yang terdaftar di <code>data.js</code>.</p>' +
        '</section>';
    }

    var cls = live || next.cls;
    var state = live ? 'live' : 'upcoming';
    var target = live ? occurrenceEnd(cls, now) : next.at;
    var cd = formatCountdown(target - now);

    var html = '<section class="focus-card" data-state="' + state + '" aria-labelledby="focus-heading">';

    var noun = cls.type === 'aktivitas' ? 'Kegiatan' : 'Kelas';
    html += '<div class="focus-top">' +
      '<p class="section-label" id="focus-heading">' + noun + (live ? ' Sekarang' : ' Berikutnya') + '</p>' +
      (live ? statusBadge('live') : '<span class="focus-day">' + DAY_NAMES[cls.day] +
        (isSameDay(next.at, now) ? ' · hari ini' : '') + '</span>') +
      '</div>';

    html += '<h2 class="focus-title">' + esc(cls.name) + '</h2>' +
      '<p class="focus-sub"><span class="time">' + clock(cls.start) + '–' + clock(cls.end) + '</span>' +
      '<span class="dot-sep">·</span>' + duration(cls, true) + '<span class="dot-sep">·</span>' + cls.sks + ' SKS</p>';

    html += '<div class="countdown-block">' +
      '<p class="countdown-label">' + (live ? 'Berakhir dalam' : 'Dimulai dalam') + '</p>' +
      '<p class="countdown-value' + (cd.words ? ' is-words' : '') + '" id="countdown-value">' + cd.text + '</p>';

    if (live) {
      var s = occurrenceStart(cls, now);
      var e = occurrenceEnd(cls, now);
      var pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
      html += '<div class="progress-track" role="img" aria-label="Kelas berjalan ' + Math.round(pct) + ' persen">' +
        '<span class="progress-fill" id="progress-fill" style="width:' + pct.toFixed(2) + '%"></span></div>' +
        '<p class="progress-caption"><span>' + clock(cls.start) + '</span><span>' + clock(cls.end) + '</span></p>';
    }
    html += '</div>';

    html += '<div class="focus-details"><div class="meta-grid">' +
      metaItem('Ruangan', cls.room) +
      metaItem(cls.type === 'aktivitas' ? 'Pembimbing' : 'Dosen', cls.lecturer) +
      metaItem('SKS', cls.sks + ' SKS') +
      metaItem(cls.classGroup ? 'Kelas' : 'Jenis', cls.classGroup || cls.kind) +
      '</div></div>';

    // Kelas menyusul di hari yang sama
    var following = null;
    if (live) {
      following = classesOn(now.getDay()).filter(function (c) {
        return toMinutes(c.start) >= toMinutes(cls.end);
      })[0] || null;
    }
    if (following) {
      html += '<p class="focus-after">Menyusul hari ini · <strong>' + esc(following.name) + '</strong> ' +
        'pukul ' + clock(following.start) + ' di ' + esc(following.room) + '</p>';
    }

    html += '</section>';
    return html;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  /* ==========================================================================
     7. VIEW: DASHBOARD
     ======================================================================== */

  function renderDashboard(now) {
    var today = now.getDay();
    var todays = classesOn(today);

    var html = '';

    /* Sapaan */
    html += '<header class="greeting">' +
      '<h1>' + greetingFor(now.getHours()) + ', ' + esc(PROFILE.name.split(' ')[0]) + '</h1>' +
      '<p class="greeting-meta"><span>' + esc(formatDate(now)) + '</span>' +
      '<span class="greeting-clock" id="live-clock">' +
      pad(now.getHours()) + '.' + pad(now.getMinutes()) + '.' + pad(now.getSeconds()) + '</span></p>' +
      '</header>';

    html += '<div class="dash-grid">';

    /* ---- Kolom utama ---- */
    html += '<div class="dash-col">';
    html += focusCard(now);

    html += '<section id="today-section" aria-labelledby="today-heading">' +
      '<div class="section-head"><h2 id="today-heading">Jadwal Hari Ini</h2>' +
      '<span class="count">' + (todays.length ? todays.length + ' kegiatan · ' +
        todays.reduce(function (s, c) { return s + c.sks; }, 0) + ' SKS' : 'Kosong') + '</span></div>';

    if (todays.length) {
      html += '<div class="card"><ul class="schedule-list">' +
        todays.map(function (c) { return scheduleRow(c, now); }).join('') +
        '</ul></div>';
    } else if (today === 0) {
      html += emptyState('Hari Minggu',
        'Tidak ada kegiatan akademik terjadwal. Kegiatan berikutnya sudah ditampilkan di atas.');
    } else {
      html += emptyState('Tidak ada kegiatan hari ini',
        DAY_NAMES[today] + ' tidak memiliki jadwal pada Semester 7. Waktu ini tersedia untuk studi literatur atau bimbingan.');
    }
    html += '</section>';
    html += '</div>';

    /* ---- Kolom samping ---- */
    html += '<div class="dash-col">';

    /* Beban akademik */
    html += '<section class="card card-pad" aria-labelledby="load-heading">' +
      '<div class="section-head"><h2 id="load-heading">Beban Akademik</h2></div>' +
      '<div class="load-figures">' +
      loadFigure(LOAD.scheduled, 'Perkuliahan Reguler', false) +
      loadFigure(LOAD.extra, 'Aktivitas Tambahan', false) +
      loadFigure(LOAD.total, 'Total Beban Semester', true) +
      '</div>' +
      '<div class="load-bar" role="img" aria-label="Komposisi beban akademik: ' +
      LOAD.breakdown.map(function (b) { return b.name + ' ' + b.sks + ' SKS'; }).join(', ') + '">' +
      LOAD.breakdown.map(function (b) {
        return '<span style="flex:' + b.sks + '"></span>';
      }).join('') +
      '</div>' +
      '<ul class="load-breakdown">' +
      LOAD.breakdown.map(function (b, i) {
        return '<li><span class="swatch" style="opacity:' + [1, 0.62, 0.44, 0.3, 0.18][i % 5] + '"></span>' +
          '<span class="name">' + esc(b.name) + '</span>' +
          '<span class="sks">' + b.sks + ' SKS</span></li>';
      }).join('') +
      '</ul></section>';

    /* Aksi cepat */
    html += '<section class="card quick-card" aria-labelledby="quick-heading">' +
      '<div class="card-pad" style="padding-bottom:6px"><h2 id="quick-heading">Aksi Cepat</h2></div>' +
      '<div class="quick-list">' +
      quickItem('today', 'clock', 'Hari Ini') +
      quickItem('jadwal', 'calendar', 'Jadwal Mingguan') +
      quickItem('aktivitas', 'book', 'Aktivitas Akademik') +
      quickItem('bimbingan', 'mentor', 'Bimbingan') +
      (MF_ITEMS.length ? quickItem('mathfest', 'sparkles', MATHFEST.name || 'Kepanitiaan') : '') +
      '</div></section>';

    /* Progress semester */
    html += '<section class="card card-pad" aria-labelledby="progress-heading">' +
      '<div class="section-head"><h2 id="progress-heading">Progress Semester</h2></div>' +
      semesterProgressBlock(now) +
      '</section>';

    html += mathfestDashCard(now);

    html += '</div></div>';
    return html;
  }

  /* Ringkasan kepanitiaan di dashboard — hanya agenda divisi sendiri yang
     sedang berjalan atau paling dekat. Kartu ini hilang sendiri kalau
     mathfestTimeline kosong. */
  function mathfestDashCard(now) {
    if (!MF_ITEMS.length) return '';

    var active = MF_ITEMS.filter(function (it) {
      if (!mfIsMine(it)) return false;
      var st = mfStatus(it, now);
      return st === 'live' || st === 'upcoming';
    }).slice(0, 3);

    var html = '<section class="card card-pad" aria-labelledby="mf-dash-heading">' +
      '<div class="section-head"><h2 id="mf-dash-heading">' +
      esc(MATHFEST.name || 'Kepanitiaan') + '</h2>' +
      '<span class="count">' + esc(MATHFEST.role || '') + '</span></div>';

    if (!active.length) {
      html += '<p class="semester-note">' + icon('info') +
        '<span>Tidak ada agenda divisi yang sedang berjalan atau akan datang.</span></p>';
    } else {
      html += '<ul class="mf-dash-list">' + active.map(function (it) {
        var tag = mfDayTag(it, now);
        return '<li class="agenda-row" data-state="' + mfStatus(it, now) + '">' +
          '<span class="agenda-name">' + esc(it.agenda) + '</span>' +
          '<span class="agenda-date">' + esc(mfDateLabel(it)) + '</span>' +
          (tag ? '<span class="agenda-tag">' + tag + '</span>' : '') +
          '</li>';
      }).join('') + '</ul>';

      html += '<button type="button" class="mf-dash-link" data-quick="mathfest">' +
        'Lihat seluruh timeline' + icon('chevron', 'chev') + '</button>';
    }

    return html + '</section>';
  }

  function loadFigure(n, label, isTotal) {
    return '<div class="load-figure' + (isTotal ? ' is-total' : '') + '">' +
      '<span class="value"><span class="counter" data-count="' + n + '">' + n + '</span> ' +
      '<span class="unit">SKS</span></span>' +
      '<span class="label">' + esc(label) + '</span></div>';
  }

  /* Cincin progress semester. Persennya tetap ditulis sebagai teks supaya
     informasinya tidak bergantung pada bentuk atau warna saja. */
  function progressRing(percent) {
    var pct = Math.min(100, Math.max(0, percent));
    var radius = 42;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - pct / 100);

    return '<div class="ring-wrap">' +
      '<svg class="ring" viewBox="0 0 100 100" role="img" ' +
      'aria-label="Semester berjalan ' + pct + ' persen">' +
      '<circle class="ring-bg" cx="50" cy="50" r="' + radius + '"></circle>' +
      '<circle class="ring-fg" cx="50" cy="50" r="' + radius + '" ' +
      'style="stroke-dasharray:' + circumference.toFixed(1) +
      ';stroke-dashoffset:' + offset.toFixed(1) + '"></circle>' +
      '</svg>' +
      '<span class="ring-value" aria-hidden="true">' + pct +
      '<span class="ring-unit">%</span></span>' +
      '</div>';
  }

  function quickItem(target, iconName, label) {
    return '<button type="button" class="quick-item" data-quick="' + target + '">' +
      icon(iconName) + '<span>' + esc(label) + '</span>' + icon('chevron', 'chev') + '</button>';
  }

  function semesterProgressBlock(now) {
    var p = semesterProgress(now);
    var html = '';

    if (!p) {
      html = '<p class="semester-note">' + icon('info') +
        '<span>Progress semester akan aktif setelah tanggal semester dikonfigurasi. ' +
        'Isi <code>startDate</code> dan <code>endDate</code> pada <code>semesterConfig</code> di <code>data.js</code>.</span></p>';
    } else {
      html = '<div class="semester-ring">' + progressRing(p.percent) +
        '<div class="ring-side">' +
        '<p class="semester-note">' + icon('clock') +
        '<span>Semester ' + esc(CONFIG.semester) + ' · ' + esc(CONFIG.academicYear) +
        ' berjalan, tersisa sekitar <strong>' + p.weeksLeft + ' pekan</strong>.</span></p>' +
        '<p class="semester-figures"><span>' + esc(dateRangeLabel(CONFIG.startDate, CONFIG.startDate)) +
        '</span><span>' + esc(dateRangeLabel(CONFIG.endDate, CONFIG.endDate)) + '</span></p>' +
        '</div></div>';
    }

    if (!CALENDAR.length) return html;

    /* Agenda kalender akademik — tanda "Berikutnya" hanya pada satu agenda
       terdekat yang belum lewat. */
    var events = CALENDAR.slice().sort(function (a, b) {
      return (parseISODate(a.start) || 0) - (parseISODate(b.start) || 0);
    });
    var nextMarked = false;

    html += '<div class="agenda"><p class="section-label agenda-label">Agenda Akademik</p><ul>';
    events.forEach(function (ev) {
      var state = calendarStatus(ev, now);
      var tag = '';
      if (state === 'live') {
        tag = '<span class="badge badge-success badge-live">Berlangsung</span>';
      } else if (state === 'upcoming' && !nextMarked) {
        nextMarked = true;
        var d = daysUntil(ev.start, now);
        tag = '<span class="badge badge-neutral">' +
          (d === 0 ? 'Hari ini' : d === 1 ? 'Besok' : d + ' hari lagi') + '</span>';
      }
      html += '<li class="agenda-row" data-state="' + state + '">' +
        '<span class="agenda-name">' + esc(ev.name) + '</span>' +
        '<span class="agenda-date">' + esc(dateRangeLabel(ev.start, ev.end)) + '</span>' +
        (tag ? '<span class="agenda-tag">' + tag + '</span>' : '') +
        '</li>';
    });
    html += '</ul></div>';
    return html;
  }

  /* ==========================================================================
     8. VIEW: JADWAL
     ======================================================================== */

  var filters = { day: 'all', category: 'all', mfScope: 'saya', mfStatus: 'all' };

  function renderJadwal(now) {
    var today = now.getDay();
    var cat = filters.category;
    var picked = parseInt(filters.day, 10);
    var days = (filters.day === 'all' || WEEK_DAYS.indexOf(picked) === -1) ? WEEK_DAYS : [picked];

    var matches = function (s) { return cat === 'all' || s.category === cat; };
    var visibleSessions = SESSIONS.filter(function (s) {
      return days.indexOf(s.day) !== -1 && matches(s);
    });

    /* Saat kategori disaring, hanya hari yang benar-benar berisi yang dirender —
       kolom kosong berderet tidak memberi informasi apa pun. Pada 'Semua',
       seluruh hari tetap tampil supaya hari kosong terlihat sebagai empty state. */
    var shownDays = cat === 'all' ? days : days.filter(function (d) {
      return visibleSessions.some(function (s) { return s.day === d; });
    });

    var unscheduled = [];
    ACTIVITIES.forEach(function (a) {
      if (a.session) return;                       // sudah tampil di jadwal mingguan
      if (cat === 'all' || cat === a.category) unscheduled.push({ kind: 'activity', ref: a });
    });
    GUIDANCE.forEach(function (g) {
      if (cat === 'all' || cat === 'bimbingan') unscheduled.push({ kind: 'guidance', ref: g });
    });

    var extraSessions = SESSIONS.length - CLASSES.length;
    var html = '<header class="greeting"><h1>Jadwal</h1>' +
      '<p class="greeting-meta"><span>' + CLASSES.length + ' mata kuliah · ' +
      LOAD.scheduled + ' SKS perkuliahan reguler' +
      (extraSessions > 0 ? ' · ' + extraSessions + ' kegiatan akademik terjadwal' : '') +
      '</span></p></header>';

    /* Filter */
    html += '<div class="filter-bar" style="margin-bottom:24px">' +
      '<div class="filter-row"><span class="section-label" id="filter-day-label">Hari</span>' +
      '<div class="chip-group" role="group" aria-labelledby="filter-day-label">' +
      chip('day', 'all', 'Semua', false) +
      WEEK_DAYS.map(function (d) {
        return chip('day', String(d), DAY_NAMES[d], d === today);
      }).join('') +
      '</div></div>' +
      '<div class="filter-row"><span class="section-label" id="filter-cat-label">Kategori</span>' +
      '<div class="chip-group" role="group" aria-labelledby="filter-cat-label">' +
      chip('category', 'all', 'Semua', false) +
      Object.keys(CATEGORIES).map(function (key) {
        return chip('category', key, CATEGORIES[key], false);
      }).join('') +
      '</div></div></div>';

    if (!shownDays.length && !unscheduled.length) {
      html += emptyState('Tidak ada yang cocok',
        'Tidak ada kegiatan pada kombinasi filter ini. Ubah pilihan hari atau kategori.');
      return html;
    }

    if (shownDays.length) {
      html += '<section aria-labelledby="week-heading" style="margin-bottom:28px">' +
        '<div class="section-head"><h2 id="week-heading">Jadwal Mingguan</h2>' +
        '<span class="count">' + visibleSessions.length + ' kegiatan</span></div>' +
        '<div class="week-grid">' +
        shownDays.map(function (d) { return dayColumn(d, now, matches); }).join('') +
        '</div></section>';
    }

    if (unscheduled.length) {
      html += '<section aria-labelledby="unscheduled-heading">' +
        '<div class="section-head"><h2 id="unscheduled-heading">Tanpa Jadwal Tetap</h2>' +
        '<span class="count">' + unscheduled.length + ' kegiatan</span></div>' +
        '<p class="section-hint">Kegiatan ini belum terikat hari tertentu, sehingga tidak terpengaruh filter hari.</p>' +
        '<div class="activity-grid">' +
        unscheduled.map(function (u) {
          return u.kind === 'activity' ? activityCard(u.ref) : guidanceCard(u.ref);
        }).join('') +
        '</div></section>';
    }

    return html;
  }

  function chip(group, val, label, isToday) {
    var pressed = filters[group] === val;
    return '<button type="button" class="chip" data-filter="' + group + '" data-value="' + esc(val) + '" ' +
      'aria-pressed="' + pressed + '">' + esc(label) +
      (isToday ? '<span class="chip-today" aria-label="hari ini"></span>' : '') + '</button>';
  }

  function dayColumn(day, now, matches) {
    var list = classesOn(day).filter(matches || function () { return true; });
    var isToday = day === now.getDay();
    var sks = list.reduce(function (s, c) { return s + c.sks; }, 0);

    return '<div class="day-column' + (isToday ? ' is-today' : '') + '">' +
      '<div class="day-head"><span class="day-name">' + DAY_NAMES[day] + '</span>' +
      (isToday ? '<span class="day-today-tag">Hari ini</span>'
        : '<span class="day-sks">' + (sks ? sks + ' SKS' : '—') + '</span>') +
      '</div>' +
      (list.length
        ? list.map(function (c) { return classCard(c, now); }).join('')
        : emptyState('Tidak ada kegiatan', '', true)) +
      '</div>';
  }

  /* ==========================================================================
     9. VIEW: AKTIVITAS
     ======================================================================== */

  function activityCard(a) {
    var html = '<article class="card activity-card">' +
      '<div class="activity-head"><div class="activity-title">' +
      '<span class="name">' + esc(a.name) + '</span>' +
      '<span class="sks">' + a.sks + ' SKS<span class="dot-sep">·</span>' +
      esc(CATEGORIES[a.category] || 'Aktivitas') +
      (a.code ? '<span class="dot-sep">·</span>' + esc(a.code) : '') + '</span>' +
      '</div><span class="badge badge-' + (a.tone || 'muted') + '">' + esc(a.status) + '</span></div>';

    var meta = metaItem('Topik', a.topic) + metaItem('Pembimbing', a.supervisor) +
      metaItem('Jadwal', a.session ? sessionLabel(a.session) : null);
    if (a.session) meta += metaItem('Ruangan', a.session.room);
    if (a.classGroup) meta += metaItem('Kelas', a.classGroup);
    meta += metaItem('Progres', a.progress);

    html += '<div class="meta-grid">' + meta + '</div>';

    if (a.note) html += '<p class="activity-note">' + esc(a.note) + '</p>';
    return html + '</article>';
  }

  function renderAktivitas() {
    var groups = [
      { key: 'non-perkuliahan', title: 'Akademik Non-Perkuliahan', hint: 'Kegiatan akademik berbobot SKS di luar perkuliahan reguler. Sebagian sudah punya slot mingguan tetap, sebagian belum dijadwalkan.' },
      { key: 'formalitas', title: 'Formalitas / Administratif', hint: 'Komponen SKS yang pelaksanaannya sudah selesai atau bersifat administratif.' }
    ];

    var html = '<header class="greeting"><h1>Aktivitas Akademik</h1>' +
      '<p class="greeting-meta"><span>' + LOAD.extra + ' SKS di luar perkuliahan terjadwal · ' +
      ACTIVITIES.length + ' kegiatan</span></p></header>';

    if (!ACTIVITIES.length) {
      return html + emptyState('Belum ada aktivitas', 'Tambahkan entri pada academicActivities di data.js.');
    }

    html += '<div class="stack">';
    groups.forEach(function (g) {
      var list = ACTIVITIES.filter(function (a) { return a.group === g.key; });
      if (!list.length) return;
      html += '<section aria-label="' + esc(g.title) + '">' +
        '<div class="section-head"><h2>' + esc(g.title) + '</h2>' +
        '<span class="count">' + list.reduce(function (s, a) { return s + a.sks; }, 0) + ' SKS</span></div>' +
        '<p class="section-hint">' + esc(g.hint) + '</p>' +
        '<div class="activity-grid">' + list.map(activityCard).join('') + '</div>' +
        '</section>';
    });
    html += '</div>';
    return html;
  }

  /* ==========================================================================
     10. VIEW: BIMBINGAN
     ======================================================================== */

  function guidanceCard(g) {
    return '<article class="guidance-card">' +
      '<div class="guidance-head"><div>' +
      '<p class="guidance-kicker">' + icon('mentor') +
      '<span class="section-label">Bimbingan ' + esc(g.type) + '</span></p>' +
      '<h3 class="guidance-title">' + esc(g.topic || EMPTY) + '</h3>' +
      '</div><span class="badge badge-' + (g.tone || 'warning') + '">' + esc(g.status) + '</span></div>' +
      '<div class="meta-grid">' +
      metaItem('Pembimbing', g.supervisor) +
      metaItem('Waktu', g.time) +
      metaItem('Tempat', g.place) +
      metaItem('Jenis', g.type) +
      '</div>' +
      (g.note ? '<p class="activity-note">' + esc(g.note) + '</p>' : '') +
      '</article>';
  }

  function renderBimbingan() {
    var html = '<header class="greeting"><h1>Bimbingan Akademik</h1>' +
      '<p class="greeting-meta"><span>Bimbingan bukan kelas reguler — waktunya menyesuaikan kesepakatan dengan pembimbing.</span></p></header>';

    html += '<div class="stack">';

    html += '<section aria-label="Daftar bimbingan">' +
      '<div class="section-head"><h2>Bimbingan Berjalan</h2>' +
      '<span class="count">' + GUIDANCE.length + ' entri</span></div>' +
      (GUIDANCE.length
        ? '<div class="guidance-grid">' + GUIDANCE.map(guidanceCard).join('') + '</div>'
        : emptyState('Belum ada jadwal bimbingan',
          'Belum ada bimbingan yang tercatat. Tambahkan entri pada guidanceData di data.js setelah jadwal disepakati.'));
    html += '</section>';

    /* Kegiatan yang masih menunggu penjadwalan — diturunkan dari data aktivitas */
    var waiting = ACTIVITIES.filter(function (a) { return !a.session && a.group === 'non-perkuliahan'; });
    if (waiting.length) {
      html += '<section aria-label="Menunggu penjadwalan">' +
        '<div class="section-head"><h2>Menunggu Penjadwalan</h2>' +
        '<span class="count">' + waiting.length + ' kegiatan</span></div>' +
        '<div class="card"><ul class="schedule-list">' +
        waiting.map(function (a) {
          return '<li class="pending-row">' +
            '<span class="row-body"><span class="row-title">' + esc(a.name) + '</span>' +
            '<span class="row-meta">' + a.sks + ' SKS<span class="dot-sep">·</span>' +
            (a.supervisor ? esc(a.supervisor) : 'Pembimbing ' + EMPTY.toLowerCase()) + '</span></span>' +
            '<span class="badge badge-' + (a.tone || 'muted') + '">' + esc(a.status) + '</span></li>';
        }).join('') +
        '</ul></div></section>';
    }

    html += '</div>';
    return html;
  }

  /* ==========================================================================
     11. VIEW: MATHFEST — timeline kepanitiaan
     ======================================================================== */

  var MF_STATUS_LABEL = { live: 'Berjalan', upcoming: 'Akan Datang', done: 'Selesai', undated: 'Tanpa Tanggal' };
  var MF_STATUS_TONE = { live: 'success', upcoming: 'neutral', done: 'muted', undated: 'muted' };

  /** Agenda yang penanggung jawabnya menyebut divisi sendiri, atau pekerjaan
      seputar lomba yang dikoordinasi divisi lain. */
  function mfIsMine(item) {
    return item.relevance === 'utama' || item.relevance === 'terkait';
  }

  function mfStatus(item, now) {
    if (!item.start) return 'undated';
    return calendarStatus(item, now);
  }

  function mfDateLabel(item) {
    if (item.start) return dateRangeLabel(item.start, item.end);
    return item.when || EMPTY;
  }

  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && bStart <= aEnd;
  }

  /* --------------------------------------------------------------------------
     Bentrok agenda kepanitiaan dengan kehidupan akademik.
     Dua sumber: agenda akademik bertanda `critical` (UTS/UAS) dan jadwal kuliah
     mingguan. Sesi ber-flag `formality` — slot yang hanya muncul di KRS tetapi
     tidak benar-benar berjalan — sengaja tidak pernah dihitung sebagai bentrok.
     ------------------------------------------------------------------------ */
  function mfConflicts(item) {
    var out = [];
    var s = parseISODate(item.start);
    if (!s) return out;
    var e = parseISODate(item.end) || s;

    CALENDAR.forEach(function (ev) {
      if (!ev.critical) return;
      var es = parseISODate(ev.start);
      if (!es) return;
      var ee = parseISODate(ev.end) || es;

      if (rangesOverlap(s, e, es, ee)) {
        out.push({
          level: 'danger',
          label: 'Bertabrakan dengan ' + ev.name,
          detail: dateRangeLabel(ev.start, ev.end)
        });
        return;
      }
      var gap = Math.round((es - e) / 86400000);
      if (gap > 0 && gap <= 3) {
        out.push({
          level: 'warning',
          label: ev.name + ' menyusul ' + gap + ' hari setelahnya',
          detail: dateRangeLabel(ev.start, ev.end)
        });
      }
    });

    /* Bentrok jam kuliah hanya diperiksa untuk agenda satu hari — pada rentang
       panjang, "ada kuliah di salah satu harinya" bukan informasi yang berguna. */
    if (s.getTime() === e.getTime()) {
      SESSIONS.forEach(function (c) {
        if (c.formality || c.day !== s.getDay()) return;
        out.push({
          level: 'danger',
          label: 'Bentrok jam kuliah ' + c.name,
          detail: DAY_NAMES[c.day] + ' ' + clock(c.start) + '–' + clock(c.end) + ' · ' + c.room
        });
      });
    }
    return out;
  }

  function mfWorstLevel(conflicts) {
    for (var i = 0; i < conflicts.length; i++) {
      if (conflicts[i].level === 'danger') return 'danger';
    }
    return 'warning';
  }

  function mfFigure(n, label, isTotal) {
    return '<div class="load-figure' + (isTotal ? ' is-total' : '') + '">' +
      '<span class="value"><span class="counter" data-count="' + n + '">' + n + '</span></span>' +
      '<span class="label">' + esc(label) + '</span></div>';
  }

  function mfDayTag(item, now) {
    var st = mfStatus(item, now);
    if (st === 'live') return '<span class="badge badge-success badge-live">Berjalan</span>';
    if (st === 'undated') return '<span class="badge badge-muted badge-plain">Tanpa tanggal</span>';
    if (st === 'done') return '';
    var d = daysUntil(item.start, now);
    if (d === null) return '';
    return '<span class="badge badge-neutral">' +
      (d === 0 ? 'Hari ini' : d === 1 ? 'Besok' : d + ' hari lagi') + '</span>';
  }

  /* --------------------------------------------------------------------------
     Kartu fokus: agenda divisi yang sedang berjalan, atau yang paling dekat
     ------------------------------------------------------------------------ */
  function mfFocusCard(now) {
    var mine = MF_ITEMS.filter(mfIsMine);
    var live = mine.filter(function (it) { return mfStatus(it, now) === 'live'; });
    var upcoming = mine.filter(function (it) { return mfStatus(it, now) === 'upcoming'; });

    if (!live.length && !upcoming.length) {
      return '<section class="focus-card" data-state="empty" aria-labelledby="mf-focus-heading">' +
        '<p class="section-label" id="mf-focus-heading">Agenda ' + esc(MATHFEST.role || 'Kepanitiaan') + '</p>' +
        '<p class="focus-title" style="margin-top:10px">Tidak ada agenda aktif</p>' +
        '<p class="focus-sub">Semua agenda yang menjadi tanggung jawabmu sudah lewat, ' +
        'atau belum punya tanggal di timeline.</p>' +
        '</section>';
    }

    var item = live.length ? live[0] : upcoming[0];
    var state = live.length ? 'live' : 'upcoming';
    var days = daysUntil(live.length ? (item.end || item.start) : item.start, now);
    var dayText = days === null ? '—'
      : days === 0 ? 'Hari ini'
        : days === 1 ? 'Besok'
          : days + ' hari';

    var html = '<section class="focus-card" data-state="' + state + '" aria-labelledby="mf-focus-heading">' +
      '<div class="focus-top">' +
      '<p class="section-label" id="mf-focus-heading">' +
      (live.length ? 'Sedang Berjalan' : 'Agenda Berikutnya') + '</p>' +
      (live.length ? '<span class="badge badge-success badge-live">Berjalan</span>'
        : '<span class="focus-day">' + esc(mfDateLabel(item)) + '</span>') +
      '</div>' +
      '<h2 class="focus-title">' + esc(item.agenda) + '</h2>' +
      '<p class="focus-sub">' + esc(item.sub || mfDateLabel(item)) + '</p>' +
      '<div class="countdown-block">' +
      '<p class="countdown-label">' + (live.length ? 'Berakhir dalam' : 'Dimulai dalam') + '</p>' +
      '<p class="countdown-value is-words">' + esc(dayText) + '</p>' +
      '</div>' +
      '<div class="focus-details"><div class="meta-grid">' +
      metaItem('Jadwal', mfDateLabel(item)) +
      metaItem('Penanggung Jawab', item.pj) +
      metaItem('Kebutuhan', item.needs) +
      metaItem('Tempat', item.place) +
      '</div></div>';

    var others = live.length + upcoming.length - 1;
    if (others > 0) {
      html += '<p class="focus-after">' + others + ' agenda divisimu lainnya masih menunggu.</p>';
    }
    return html + '</section>';
  }

  /* --------------------------------------------------------------------------
     Peringatan: agenda kepanitiaan yang beririsan dengan agenda akademik
     ------------------------------------------------------------------------ */
  function mfAlertSection(now) {
    var rows = [];
    MF_ITEMS.forEach(function (it) {
      if (mfStatus(it, now) === 'done') return;
      var cf = mfConflicts(it);
      if (cf.length) rows.push({ item: it, conflicts: cf });
    });

    if (!rows.length) {
      return '<section aria-labelledby="mf-alert-heading" class="mf-block">' +
        '<div class="section-head"><h2 id="mf-alert-heading">Peringatan Jadwal</h2>' +
        '<span class="count">Aman</span></div>' +
        '<p class="mf-clear">' + icon('check') +
        '<span>Tidak ada agenda kepanitiaan mendatang yang bertabrakan dengan ' +
        'jam kuliah maupun UTS/UAS.</span></p>' +
        '</section>';
    }

    var html = '<section aria-labelledby="mf-alert-heading" class="mf-block">' +
      '<div class="section-head"><h2 id="mf-alert-heading">Peringatan Jadwal</h2>' +
      '<span class="count">' + rows.length + ' agenda</span></div>' +
      '<p class="section-hint">Agenda kepanitiaan yang beririsan dengan UTS/UAS atau jam kuliah. ' +
      'Slot Sabtu Studi Literatur tidak ikut dihitung karena hanya formalitas KRS.</p>' +
      '<ul class="mf-alert-list">';

    rows.forEach(function (r) {
      html += '<li class="mf-alert-row card" data-level="' + mfWorstLevel(r.conflicts) + '">' +
        '<div class="mf-alert-head">' +
        '<span class="mf-alert-title">' + esc(r.item.agenda) +
        (r.item.sub ? '<span class="dot-sep">·</span>' + esc(r.item.sub) : '') + '</span>' +
        '<span class="mf-alert-date">' + esc(mfDateLabel(r.item)) + '</span>' +
        '</div>' +
        '<ul class="mf-reasons">' +
        r.conflicts.map(function (c) {
          return '<li class="mf-reason" data-level="' + c.level + '">' + icon('alert') +
            '<span>' + esc(c.label) +
            '<span class="mf-reason-detail">' + esc(c.detail) + '</span></span></li>';
        }).join('') +
        '</ul>' +
        (mfIsMine(r.item)
          ? '<p class="mf-alert-note">Agenda ini masuk lingkup ' + esc(MATHFEST.role || 'divisimu') + '.</p>'
          : '') +
        '</li>';
    });

    return html + '</ul></section>';
  }

  /* --------------------------------------------------------------------------
     Baris timeline
     ------------------------------------------------------------------------ */
  function mfItemRow(item, now) {
    var st = mfStatus(item, now);
    var cf = mfConflicts(item);

    var facts = '<span>' + icon('calendar') + esc(mfDateLabel(item)) + '</span>';
    if (item.place) facts += '<span>' + icon('pin') + esc(item.place) + '</span>';
    if (item.pj) facts += '<span>' + icon('user') + esc(item.pj) + '</span>';

    var tags = '<span class="badge badge-' + MF_STATUS_TONE[st] +
      (st === 'live' ? ' badge-live' : '') + '">' + MF_STATUS_LABEL[st] + '</span>';
    if (item.relevance === 'utama') {
      tags += '<span class="badge badge-neutral badge-plain">Divisiku</span>';
    } else if (item.relevance === 'terkait') {
      tags += '<span class="badge badge-muted badge-plain">Terkait</span>';
    }

    return '<li class="mf-item card" data-state="' + st + '"' +
      (mfIsMine(item) ? ' data-mine="true"' : '') + '>' +
      '<div class="mf-item-main">' +
      '<p class="mf-item-title">' + esc(item.agenda) + '</p>' +
      (item.sub ? '<p class="mf-item-sub">' + esc(item.sub) + '</p>' : '') +
      '<p class="mf-item-facts">' + facts + '</p>' +
      (item.needs
        ? '<p class="mf-item-needs">' + icon('inbox') + '<span>' + esc(item.needs) + '</span></p>'
        : '') +
      (cf.length && st !== 'done'
        ? '<p class="mf-item-warn" data-level="' + mfWorstLevel(cf) + '">' + icon('alert') +
        '<span>' + cf.map(function (c) { return esc(c.label); }).join(' · ') + '</span></p>'
        : '') +
      '</div>' +
      '<div class="mf-item-side">' + tags + '</div>' +
      '</li>';
  }

  function renderMathfest(now) {
    var title = MATHFEST.name || 'Kepanitiaan';

    if (!MF_ITEMS.length) {
      return '<header class="greeting"><h1>' + esc(title) + '</h1></header>' +
        emptyState('Belum ada timeline',
          'Tambahkan entri pada mathfestTimeline di data.js.');
    }

    var scope = filters.mfScope;
    var status = filters.mfStatus;

    var mine = MF_ITEMS.filter(mfIsMine);
    var mineLive = mine.filter(function (it) { return mfStatus(it, now) === 'live'; }).length;
    var mineNext = mine.filter(function (it) { return mfStatus(it, now) === 'upcoming'; }).length;

    var jabatan = [MATHFEST.position, MATHFEST.role].filter(Boolean).join(' ');

    var html = '<header class="greeting"><h1>' + esc(title) + '</h1>' +
      '<p class="greeting-meta"><span>' +
      esc([jabatan, MATHFEST.organization].filter(Boolean).join(' · ')) +
      '</span></p></header>';

    html += '<div class="dash-grid"><div class="dash-col">';
    html += mfFocusCard(now);
    html += mfAlertSection(now);
    html += '</div><div class="dash-col">';

    html += '<section class="card card-pad" aria-labelledby="mf-load-heading">' +
      '<div class="section-head"><h2 id="mf-load-heading">Ringkasan Divisi</h2></div>' +
      '<div class="load-figures">' +
      mfFigure(mineLive, 'Sedang Berjalan', false) +
      mfFigure(mineNext, 'Akan Datang', false) +
      mfFigure(mine.length, 'Total Agenda Divisi', true) +
      '</div>' +
      '<p class="section-hint" style="margin:16px 0 0">Dari ' + MF_ITEMS.length +
      ' agenda pada timeline kepanitiaan, ' + mine.length +
      ' di antaranya menjadi tanggung jawab atau berkaitan langsung dengan ' +
      esc(MATHFEST.role || 'divisimu') + '.</p>' +
      (MATHFEST.divisionHead || MATHFEST.chair
        ? '<div class="meta-grid" style="margin-top:16px">' +
          metaItem('Jabatan', jabatan) +
          metaItem('PJ Divisi', MATHFEST.divisionHead) +
          metaItem('Ketua Pelaksana', MATHFEST.chair) +
          metaItem('Steering Committee', MATHFEST.steeringCommittee) +
          '</div>'
        : '') +
      '</section>';
    html += '</div></div>';

    /* Filter */
    html += '<div class="filter-bar" style="margin:28px 0 24px">' +
      '<div class="filter-row"><span class="section-label" id="mf-scope-label">Lingkup</span>' +
      '<div class="chip-group" role="group" aria-labelledby="mf-scope-label">' +
      chip('mfScope', 'saya', (MATHFEST.role || 'Divisi Saya'), false) +
      chip('mfScope', 'semua', 'Semua Divisi', false) +
      '</div></div>' +
      '<div class="filter-row"><span class="section-label" id="mf-status-label">Status</span>' +
      '<div class="chip-group" role="group" aria-labelledby="mf-status-label">' +
      chip('mfStatus', 'all', 'Semua', false) +
      chip('mfStatus', 'live', 'Berjalan', false) +
      chip('mfStatus', 'upcoming', 'Akan Datang', false) +
      chip('mfStatus', 'done', 'Selesai', false) +
      '</div></div></div>';

    var visible = MF_ITEMS.filter(function (it) {
      if (scope === 'saya' && !mfIsMine(it)) return false;
      if (status !== 'all' && mfStatus(it, now) !== status) return false;
      return true;
    });

    if (!visible.length) {
      return html + emptyState('Tidak ada yang cocok',
        'Tidak ada agenda pada kombinasi filter ini. Coba ubah lingkup atau status.');
    }

    /* Kelompokkan per fase; agenda dengan fase tak dikenal dikumpulkan di akhir
       supaya tidak pernah hilang diam-diam dari tampilan. */
    var rendered = {};
    var groups = MF_PHASES.map(function (ph) {
      var list = visible.filter(function (it) { return it.phase === ph.id; });
      list.forEach(function (it) { rendered[it.id] = true; });
      return { label: ph.label, list: list };
    });
    var leftover = visible.filter(function (it) { return !rendered[it.id]; });
    if (leftover.length) groups.push({ label: 'Agenda Lain', list: leftover });

    html += '<div class="stack">';
    groups.forEach(function (g) {
      if (!g.list.length) return;
      html += '<section class="mf-phase" aria-label="' + esc(g.label) + '">' +
        '<div class="section-head"><h2>' + esc(g.label) + '</h2>' +
        '<span class="count">' + g.list.length + ' agenda</span></div>' +
        '<ul class="mf-list">' +
        g.list.map(function (it) { return mfItemRow(it, now); }).join('') +
        '</ul></section>';
    });
    html += '</div>';

    return html;
  }

  /* ==========================================================================
     12. VIEW: PENCARIAN
     ======================================================================== */

  function renderSearch(query) {
    var results = runSearch(query);
    var html = '<header class="search-head"><h1>Hasil Pencarian</h1>' +
      '<p>' + results.length + ' hasil untuk <span class="query">"' + esc(query.trim()) + '"</span></p></header>';

    if (!results.length) {
      return html + emptyState('Tidak ada hasil',
        'Coba kata kunci lain — nama mata kuliah, nama dosen, ruangan, topik, atau jenis kegiatan.');
    }

    html += '<div class="result-list">' + results.map(function (r) {
      return '<article class="card result-item">' +
        '<span style="color:var(--text-subtle);margin-top:2px">' + icon(r.icon) + '</span>' +
        '<div class="result-body">' +
        '<p class="result-title">' + highlight(r.title, query) + '</p>' +
        '<p class="row-meta">' + highlight(r.meta, query) + '</p>' +
        '</div>' +
        '<span class="badge badge-plain badge-muted">' + esc(r.categoryLabel) + '</span>' +
        '</article>';
    }).join('') + '</div>';

    return html;
  }

  /* ==========================================================================
     13. ROUTER & RENDER
     ======================================================================== */

  var VIEWS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'jadwal', label: 'Jadwal', icon: 'calendar' },
    { id: 'aktivitas', label: 'Aktivitas', icon: 'book' },
    { id: 'bimbingan', label: 'Bimbingan', icon: 'mentor' },
    { id: 'mathfest', label: 'Mathfest', icon: 'sparkles' }
  ];

  var dom = {};
  var currentView = 'dashboard';
  var viewBeforeSearch = 'dashboard';
  var searchQuery = '';
  var lastSignature = '';
  var lastLiveId = null;
  var timer = null;
  var pendingReveal = false;

  function renderCurrent() {
    var now = new Date();
    try {
      if (currentView === 'search') {
        dom.views.search.innerHTML = renderSearch(searchQuery);
      } else if (currentView === 'dashboard') {
        dom.views.dashboard.innerHTML = renderDashboard(now);
      } else if (currentView === 'jadwal') {
        dom.views.jadwal.innerHTML = renderJadwal(now);
      } else if (currentView === 'aktivitas') {
        dom.views.aktivitas.innerHTML = renderAktivitas();
      } else if (currentView === 'bimbingan') {
        dom.views.bimbingan.innerHTML = renderBimbingan();
      } else if (currentView === 'mathfest') {
        dom.views.mathfest.innerHTML = renderMathfest(now);
      }
    } catch (err) {
      console.error('Gagal merender tampilan:', err);
      dom.views[currentView].innerHTML = emptyState('Terjadi kesalahan',
        'Tampilan tidak dapat dimuat. Periksa struktur data pada data.js.');
    }

    /* Reveal hanya dianimasikan saat pengguna benar-benar berpindah tampilan.
       Render ulang dari tick (status jadwal berubah) langsung menampilkan
       semuanya — kalau tidak, konten yang sedang dibaca akan berkedip. */
    applyReveal(pendingReveal);
    pendingReveal = false;
  }

  /* --------------------------------------------------------------------------
     REVEAL SAAT SCROLL
     ----------------------------------------------------------------------------
     Elemen yang belum terlihat disembunyikan, lalu naik lembut begitu masuk
     layar. Kelas .reveal hanya dipasang dari sini — tanpa JS atau tanpa
     IntersectionObserver tidak ada yang pernah disembunyikan.
     ------------------------------------------------------------------------ */
  var REVEAL_TARGETS = [
    '.greeting', '.search-head',
    '.dash-col > *', '.week-grid > *', '.activity-grid > *',
    '.guidance-grid > *', '.result-list > *', '.stack > *',
    '.mf-list > *', '.mf-alert-list > *'
  ].join(',');

  var revealObserver = null;

  function clearReveal() {
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }
  }

  function applyReveal(animate) {
    clearReveal();

    var view = dom.views[currentView];
    if (!view) return;

    var nodes = Array.prototype.slice.call(view.querySelectorAll(REVEAL_TARGETS));
    if (!nodes.length) return;

    /* Buang elemen yang sudah tercakup induknya, supaya tidak ada dua lapis
       reveal bersarang (anak tersembunyi di dalam induk yang juga tersembunyi). */
    var targets = nodes.filter(function (el) {
      return !nodes.some(function (other) { return other !== el && other.contains(el); });
    });

    var supported = typeof window.IntersectionObserver === 'function';
    if (!animate || prefersReducedMotion() || !supported) {
      targets.forEach(function (el) { el.classList.remove('reveal', 'is-visible'); });
      return;
    }

    targets.forEach(function (el) {
      el.classList.add('reveal');
      el.classList.remove('is-visible');
      var siblings = el.parentNode ? el.parentNode.children : [el];
      var index = Array.prototype.indexOf.call(siblings, el);
      el.setAttribute('data-reveal-delay', Math.min(index, 5) * 65);
    });

    revealObserver = new window.IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = (el.getAttribute('data-reveal-delay') || 0) + 'ms';
        el.classList.add('is-visible');
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    targets.forEach(function (el) { revealObserver.observe(el); });
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  /* --------------------------------------------------------------------------
     Animasi masuk untuk angka dan cincin progress.
     Sengaja HANYA dipanggil dari setView, tidak dari tick — kalau ikut tiap
     render ulang, angka SKS akan berkedip tiap kali status jadwal berubah.
     Nilai akhir sudah tertulis di HTML sejak awal, jadi tanpa JS atau dengan
     reduced-motion angkanya tetap benar.
     ------------------------------------------------------------------------ */
  function animateEntrance() {
    var view = dom.views[currentView];
    if (!view || prefersReducedMotion()) return;

    Array.prototype.forEach.call(view.querySelectorAll('.counter[data-count]'), function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (!isFinite(target) || target <= 0) return;

      var duration = 700;
      var startedAt = null;
      el.textContent = '0';

      window.requestAnimationFrame(function step(now) {
        if (startedAt === null) startedAt = now;
        var t = Math.min(1, (now - startedAt) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) window.requestAnimationFrame(step);
        else el.textContent = String(target);
      });
    });

    /* Cincin digambar penuh dulu, lalu dilepas ke nilai sebenarnya supaya
       transisi CSS-nya punya titik awal. */
    var ring = view.querySelector('.ring-fg');
    if (ring) {
      var finalOffset = ring.style.strokeDashoffset;
      ring.style.strokeDashoffset = ring.style.strokeDasharray;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          ring.style.strokeDashoffset = finalOffset;
        });
      });
    }
  }

  function setView(name, opts) {
    if (!dom.views[name]) return;
    currentView = name;

    Object.keys(dom.views).forEach(function (key) {
      dom.views[key].hidden = key !== name;
    });

    Array.prototype.forEach.call(dom.tabs.querySelectorAll('.tab'), function (tab) {
      var active = tab.dataset.view === name;
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });

    pendingReveal = true;
    renderCurrent();

    /* Jalankan ulang animasi masuk agar perpindahan tampilan terasa disengaja */
    var el = dom.views[name];
    el.classList.remove('is-entering');
    void el.offsetWidth;
    el.classList.add('is-entering');

    animateEntrance();

    if (opts && opts.focus) {
      dom.main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ==========================================================================
     14. MESIN REALTIME
     ======================================================================== */

  function signature(now) {
    var live = liveClass(now);
    var next = nextClass(now);
    return [
      now.getDay(),
      greetingBucket(now.getHours()),
      live ? live.id : '-',
      next ? next.cls.id : '-',
      SESSIONS.map(function (c) { return statusOf(c, now); }).join(',')
    ].join('|');
  }

  function tick() {
    var now = new Date();

    /* Jam pada sapaan */
    var clockEl = document.getElementById('live-clock');
    if (clockEl) {
      clockEl.textContent = pad(now.getHours()) + '.' + pad(now.getMinutes()) + '.' + pad(now.getSeconds());
    }

    /* Countdown + progress kelas berjalan */
    var cdEl = document.getElementById('countdown-value');
    if (cdEl) {
      var live = liveClass(now);
      var next = nextClass(now);
      if (live || next) {
        var target = live ? occurrenceEnd(live, now) : next.at;
        var cd = formatCountdown(target - now);
        if (cdEl.textContent !== cd.text) cdEl.textContent = cd.text;
        cdEl.classList.toggle('is-words', cd.words);
      }
      var fill = document.getElementById('progress-fill');
      if (fill && live) {
        var s = occurrenceStart(live, now);
        var e = occurrenceEnd(live, now);
        fill.style.width = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100)).toFixed(2) + '%';
      }
    }

    /* Render ulang hanya bila status berubah */
    var sig = signature(now);
    if (sig !== lastSignature) {
      lastSignature = sig;
      if (currentView !== 'search') renderCurrent();

      var live2 = liveClass(now);
      var liveId = live2 ? live2.id : null;
      if (liveId !== lastLiveId) {
        lastLiveId = liveId;
        if (dom.liveRegion) {
          dom.liveRegion.textContent = live2
            ? live2.name + ' sedang berlangsung sampai pukul ' + clock(live2.end) + '.'
            : 'Tidak ada kelas yang sedang berlangsung.';
        }
      }
    }
  }

  function startTimer() {
    if (timer !== null) return;
    timer = window.setInterval(tick, 1000);
  }

  function stopTimer() {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  }

  /* ==========================================================================
     15. TEMA
     ======================================================================== */

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    dom.themeToggle.setAttribute('aria-label',
      theme === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
    if (persist) {
      try { localStorage.setItem('s7os.theme', theme); } catch (e) {}
    }
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem('s7os.theme'); } catch (e) {}
    applyTheme(stored || currentTheme(), false);

    /* Ikuti preferensi sistem selama pengguna belum memilih sendiri */
    if (!stored && window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (ev) {
        var saved = null;
        try { saved = localStorage.getItem('s7os.theme'); } catch (e) {}
        if (!saved) applyTheme(ev.matches ? 'dark' : 'light', false);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ==========================================================================
     16. PENCARIAN — UI
     ======================================================================== */

  function syncSearchAffordances() {
    var hasText = dom.searchInput.value.length > 0;
    dom.searchClear.hidden = !hasText;
    if (dom.searchKbd) dom.searchKbd.style.opacity = hasText ? '0' : '';
  }

  function handleSearchInput() {
    searchQuery = dom.searchInput.value;
    syncSearchAffordances();

    if (searchQuery.trim().length > 0) {
      if (currentView !== 'search') viewBeforeSearch = currentView;
      setView('search');
    } else if (currentView === 'search') {
      setView(viewBeforeSearch);
    }
  }

  /** Bersihkan field tanpa memindahkan tampilan. */
  function resetSearchField() {
    dom.searchInput.value = '';
    searchQuery = '';
    syncSearchAffordances();
  }

  function clearSearch(refocus) {
    var wasSearching = currentView === 'search';
    resetSearchField();
    if (wasSearching) setView(viewBeforeSearch);
    if (refocus) dom.searchInput.focus();
  }

  /* ==========================================================================
     17. INISIALISASI
     ======================================================================== */

  function fillProfile() {
    dom.initials.textContent = PROFILE.initials || '';
    dom.name.textContent = PROFILE.name || '';
    dom.meta.textContent = [
      PROFILE.nim, PROFILE.program, 'Semester ' + PROFILE.semester, PROFILE.academicYear
    ].join(' · ');
    dom.footerIdentity.textContent = PROFILE.name + ' · ' + PROFILE.nim + ' · ' +
      PROFILE.program + ' · Semester ' + PROFILE.semester + ' · ' + PROFILE.academicYear;
    document.title = PROFILE.name + ' · Semester ' + PROFILE.semester;
  }

  function buildTabs() {
    dom.tabs.innerHTML = VIEWS.map(function (v) {
      return '<button type="button" class="tab" data-view="' + v.id + '"' +
        (v.id === 'dashboard' ? ' aria-current="page"' : '') + '>' +
        icon(v.icon) + '<span>' + esc(v.label) + '</span></button>';
    }).join('');
  }

  function bindEvents() {
    dom.tabs.addEventListener('click', function (ev) {
      var tab = ev.target.closest('.tab');
      if (!tab) return;
      resetSearchField();
      viewBeforeSearch = tab.dataset.view;
      setView(tab.dataset.view, { focus: true });
    });

    dom.main.addEventListener('click', function (ev) {
      var quick = ev.target.closest('[data-quick]');
      if (quick) {
        var target = quick.dataset.quick;
        if (target === 'today') {
          var section = document.getElementById('today-section');
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          setView(target, { focus: true });
        }
        return;
      }

      var chipEl = ev.target.closest('[data-filter]');
      if (chipEl) {
        var group = chipEl.dataset.filter;
        var val = chipEl.dataset.value;
        filters[group] = val;
        renderCurrent();
        /* Kembalikan fokus ke chip yang sama setelah render ulang */
        var again = dom.views[currentView].querySelector(
          '[data-filter="' + group + '"][data-value="' + val + '"]');
        if (again) again.focus();
      }
    });

    dom.themeToggle.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });

    dom.searchInput.addEventListener('input', handleSearchInput);
    dom.searchInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); clearSearch(true); }
    });
    dom.searchClear.addEventListener('click', function () { clearSearch(true); });

    document.addEventListener('keydown', function (ev) {
      if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      ev.preventDefault();
      dom.searchInput.focus();
      dom.searchInput.select();
    });

    /* Hemat sumber daya saat tab tidak terlihat — mencegah timer menumpuk */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopTimer();
      } else {
        tick();
        startTimer();
      }
    });

    window.addEventListener('pagehide', stopTimer);
  }

  /* --------------------------------------------------------------------------
     LAYAR PEMBUKA
     ----------------------------------------------------------------------------
     Dibuka oleh skrip inline di index.html (kelas .is-booting pada <html>),
     ditutup di sini. Tiga jaring pengaman supaya halaman tidak mungkin
     tersangkut: bisa dilewati dengan klik atau tombol apa pun, ditutup saat
     window selesai load, dan tetap ditutup paksa setelah 2,6 detik apa pun
     yang terjadi.
     ------------------------------------------------------------------------ */
  function setupIntro() {
    var root = document.documentElement;
    var intro = document.getElementById('intro');

    if (!intro || !root.classList.contains('is-booting')) {
      root.classList.remove('is-booting');
      return;
    }

    var done = false;

    function dismiss() {
      if (done) return;
      done = true;

      intro.classList.add('is-leaving');
      root.classList.remove('is-booting');

      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);

      window.setTimeout(function () {
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }, 650);
    }

    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);

    /* Jalur normal: tunggu aset selesai, lalu beri jeda supaya animasi
       pembukanya sempat terbaca mata. */
    if (document.readyState === 'complete') {
      window.setTimeout(dismiss, 1150);
    } else {
      window.addEventListener('load', function () { window.setTimeout(dismiss, 950); });
    }

    /* Pengaman terakhir — misalnya font gagal dimuat dan event load tertahan. */
    window.setTimeout(dismiss, 2600);
  }

  function init() {
    dom = {
      tabs: document.getElementById('tabs'),
      main: document.getElementById('main'),
      initials: document.getElementById('profile-initials'),
      name: document.getElementById('profile-name'),
      meta: document.getElementById('profile-meta'),
      footerIdentity: document.getElementById('footer-identity'),
      footerSource: document.getElementById('footer-source'),
      themeToggle: document.getElementById('theme-toggle'),
      searchInput: document.getElementById('search-input'),
      searchClear: document.getElementById('search-clear'),
      searchKbd: document.querySelector('.search-kbd'),
      liveRegion: document.getElementById('live-region'),
      views: {
        dashboard: document.getElementById('view-dashboard'),
        jadwal: document.getElementById('view-jadwal'),
        aktivitas: document.getElementById('view-aktivitas'),
        bimbingan: document.getElementById('view-bimbingan'),
        mathfest: document.getElementById('view-mathfest'),
        search: document.getElementById('view-search')
      }
    };

    initTheme();
    setupIntro();
    buildTabs();
    bindEvents();
    showLoadingState();

    loadDataset(function (result) {
      DATA_SOURCE = result.source;
      DATA_NOTES = result.notes || [];

      hydrate(result.data);
      fillProfile();
      renderSourceNote();

      lastSignature = signature(new Date());
      var live = liveClass(new Date());
      lastLiveId = live ? live.id : null;

      setView('dashboard');
      startTimer();
    });
  }

  /* Layar sementara selama data diambil. Tanpa ini, dashboard tampak kosong
     dan pengguna tidak tahu apakah aplikasinya rusak atau sedang memuat. */
  function showLoadingState() {
    var view = dom.views.dashboard;
    if (!view) return;
    view.innerHTML =
      '<header class="greeting"><h1>Menyiapkan dashboard</h1>' +
      '<p class="greeting-meta"><span>Mengambil jadwal dan agenda terbaru…</span></p></header>' +
      '<div class="card card-pad"><p class="semester-note">' + icon('clock') +
      '<span>Kalau data online tidak terjangkau, dashboard otomatis memakai ' +
      'data yang tersimpan di <code>data.js</code>.</span></p></div>';
  }

  /* Pembungkus tipis di atas sheets.js. Kalau berkas itu tidak dimuat sekalipun,
     aplikasi tetap berjalan dengan data.js. */
  function loadDataset(callback) {
    var source = window.AcademicDataSource;

    if (!source || typeof source.load !== 'function') {
      /* data.js memakai `const`, yang tidak menjadi properti window. Nilainya
         hanya terbaca lewat nama variabelnya langsung. */
      var read = function (fn, empty) {
        try {
          var v = fn();
          return v === undefined || v === null ? empty : v;
        } catch (e) {
          return empty;
        }
      };

      callback({
        data: {
          profile: read(function () { return profileData; }, {}),
          semester: read(function () { return semesterConfig; }, {}),
          calendar: read(function () { return academicCalendar; }, []),
          classes: read(function () { return scheduleData; }, []),
          activities: read(function () { return academicActivities; }, []),
          guidance: read(function () { return guidanceData; }, []),
          categories: read(function () { return categoryLabels; }, {}),
          mathfestConfig: read(function () { return mathfestConfig; }, {}),
          mathfestPhases: read(function () { return mathfestPhases; }, []),
          mathfestTimeline: read(function () { return mathfestTimeline; }, [])
        },
        source: 'lokal',
        notes: ['sheets.js tidak dimuat — memakai data lokal.']
      });
      return;
    }

    try {
      source.load(callback);
    } catch (err) {
      console.error('Gagal memuat sumber data:', err);
      callback({ data: {}, source: 'lokal', notes: [String(err && err.message || err)] });
    }
  }

  function renderSourceNote() {
    if (!dom.footerSource) return;

    var labels = {
      sheets: 'Data langsung dari Google Sheets',
      campuran: 'Sebagian data dari Google Sheets, sisanya dari data.js',
      lokal: 'Data akademik dikelola di data.js'
    };
    var text = labels[DATA_SOURCE] || labels.lokal;

    if (DATA_NOTES.length) {
      text += ' · ada catatan, lihat konsol';
      DATA_NOTES.forEach(function (note) { console.warn('[sumber data]', note); });
    }

    dom.footerSource.textContent = text;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
