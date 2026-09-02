/* ============================================================================
   Semester 7 Academic OS — service-worker.js
   ----------------------------------------------------------------------------
   Tujuannya satu dan sempit: membuat dashboard tetap terbuka ketika jaringan
   tidak ada. Bukan menyimpan data akademik — itu sudah ditangani cache
   localStorage di sheets.js, yang tahu bentuk datanya dan bisa menjelaskan
   umurnya kepada pengguna.

   Pembagian tugasnya:

     kerangka aplikasi (HTML/CSS/JS/ikon)  → cache-first, cepat dan tahan offline
     font Google                           → stale-while-revalidate
     CSV Google Sheets                     → tidak pernah disentuh

   CSV sengaja dilewatkan begitu saja. Kalau service worker ikut menyimpannya,
   pengguna bisa melihat jadwal lama sambil footer menulis "Tersinkron" — persis
   kebohongan yang ingin dihindari.
   ========================================================================== */

var VERSION = 'v1';
var SHELL_CACHE = 's7os-shell-' + VERSION;
var FONT_CACHE = 's7os-font-' + VERSION;

var SHELL = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'data.js',
  'sheets.js',
  'manifest.json',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      /* Satu berkas yang gagal tidak boleh menggagalkan seluruh pemasangan —
         itu akan membuat service worker tidak pernah aktif sama sekali. */
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function (err) {
          console.warn('[sw] gagal menyimpan', url, err);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== SHELL_CACHE && key !== FONT_CACHE) return caches.delete(key);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isFontRequest(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

/** Ambil dari jaringan di latar, sajikan salinan lama lebih dulu bila ada. */
function staleWhileRevalidate(cacheName, request) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var network = fetch(request).then(function (response) {
        if (response && (response.ok || response.type === 'opaque')) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function () { return null; });

      return cached || network.then(function (res) {
        if (res) return res;
        throw new Error('tidak tersedia offline');
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  /* Data akademik selalu lewat jaringan langsung. */
  if (url.hostname.indexOf('google.com') !== -1 && !isFontRequest(url)) return;

  if (isFontRequest(url)) {
    event.respondWith(
      staleWhileRevalidate(FONT_CACHE, request).catch(function () {
        /* Tanpa font Google, style.css sudah menyediakan fallback sistem. */
        return Response.error();
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Navigasi: coba jaringan dulu supaya versi baru cepat terpakai, tetapi
     selalu ada index.html tersimpan sebagai jaring pengaman. Ini juga yang
     membuat alamat seperti /#mathfest tetap terbuka saat offline. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(SHELL_CACHE).then(function (c) { c.put('index.html', copy); });
        return response;
      }).catch(function () {
        return caches.match('index.html').then(function (cached) {
          return cached || caches.match('./');
        });
      })
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(SHELL_CACHE, request));
});
