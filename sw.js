/* Service worker : met tout le jeu en cache pour un usage 100 % hors ligne. */
var CACHE = 'empire-total-v1';

var ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icon.svg',
  'css/style.css',
  'js/core/util.js',
  'js/data/businesses.js',
  'js/data/stocks.js',
  'js/data/collections.js',
  'js/data/names.js',
  'js/data/sports.js',
  'js/data/country.js',
  'js/core/state.js',
  'js/core/economy.js',
  'js/core/save.js',
  'js/game/business.js',
  'js/game/market.js',
  'js/game/collections.js',
  'js/game/manager.js',
  'js/game/match.js',
  'js/game/race.js',
  'js/game/casino.js',
  'js/game/country.js',
  'js/core/loop.js',
  'js/ui/ui.js',
  'js/ui/view_empire.js',
  'js/ui/view_manager.js',
  'js/ui/view_casino.js',
  'js/ui/view_country.js',
  'js/ui/view_profile.js',
  'js/main.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Cache d'abord : le jeu doit démarrer sans réseau. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match('index.html'); });
    })
  );
});
