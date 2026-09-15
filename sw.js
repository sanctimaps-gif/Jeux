/* Service worker : met tout le jeu en cache pour un usage 100 % hors ligne. */
var CACHE = 'empire-total-v25';

var ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icon.svg',
  'assets/ads/sm-1.jpg',
  'assets/ads/sm-2.jpg',
  'assets/ads/sm-3.jpg',
  'assets/ads/sm-4.jpg',
  'assets/ads/sm-5.jpg',
  'css/style.css',
  'js/core/util.js',
  'js/data/companies.js',
  'js/data/stocks.js',
  'js/data/assets.js',
  'js/data/collections.js',
  'js/data/names.js',
  'js/data/sports.js',
  'js/data/laws.js',
  'js/data/nation.js',
  'js/data/world.js',
  'js/data/worldmap.js',
  'js/core/tax.js',
  'js/core/prayer.js',
  'js/core/state.js',
  'js/core/economy.js',
  'js/core/save.js',
  'js/game/business.js',
  'js/game/market.js',
  'js/game/realestate.js',
  'js/game/crypto.js',
  'js/game/collections.js',
  'js/game/manager.js',
  'js/game/match.js',
  'js/game/race.js',
  'js/game/action.js',
  'js/game/drive.js',
  'js/game/casino.js',
  'js/game/nation.js',
  'js/core/loop.js',
  'js/ui/ui.js',
  'js/ui/play.js',
  'js/ui/view_business.js',
  'js/ui/view_invest.js',
  'js/ui/view_manager.js',
  'js/ui/view_casino.js',
  'js/ui/view_nation.js',
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
