/* Empire Total — utilitaires généraux
 * Aucun module ES : tout est exposé sur l'objet global G pour que le jeu
 * fonctionne aussi bien en PWA qu'en ouvrant index.html directement (file://).
 */
window.G = window.G || {};

G.util = (function () {
  'use strict';

  /* ---------------------------------------------------------- aléatoire -- */

  function rnd() { return Math.random(); }

  function rint(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function rfloat(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Tirage pondéré : entries = [[valeur, poids], ...] */
  function weighted(entries) {
    var total = 0, i;
    for (i = 0; i < entries.length; i++) total += entries[i][1];
    var r = Math.random() * total;
    for (i = 0; i < entries.length; i++) {
      r -= entries[i][1];
      if (r <= 0) return entries[i][0];
    }
    return entries[entries.length - 1][0];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** Loi normale (Box-Muller). */
  function gauss(mean, sd) {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    var n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + n * sd;
  }

  /** Loi de Poisson (algorithme de Knuth), suffisant pour nos petits lambda. */
  function poisson(lambda) {
    var L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L && k < 200);
    return k - 1;
  }

  function chance(p) { return Math.random() < p; }

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  function lerp(a, b, t) { return a + (b - a) * t; }

  var _uid = 0;
  function uid(prefix) {
    _uid++;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + _uid.toString(36);
  }

  /* ------------------------------------------------------------ formats -- */

  var UNITS = [
    [1e12, 'T'], [1e9, 'Md'], [1e6, 'M'], [1e3, 'k']
  ];

  /** Format court d'un nombre : 12 450 -> "12 450", 1 250 000 -> "1,25 M" */
  function fmtNum(n, decimals) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    var neg = n < 0;
    var v = Math.abs(n);
    var out;
    if (v < 1000) {
      out = (v < 10 && decimals !== 0 && Math.round(v) !== v)
        ? (Math.round(v * 10) / 10).toString().replace('.', ',')
        : Math.round(v).toString();
    } else if (v < 100000) {
      out = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    } else {
      out = null;
      for (var i = 0; i < UNITS.length; i++) {
        if (v >= UNITS[i][0]) {
          var d = v / UNITS[i][0];
          var dec = d < 10 ? 2 : (d < 100 ? 1 : 0);
          out = d.toFixed(dec).replace('.', ',') + ' ' + UNITS[i][1];
          break;
        }
      }
      if (out === null) out = Math.round(v).toString();
    }
    return (neg ? '-' : '') + out;
  }

  function fmtMoney(n) { return fmtNum(n) + ' €'; }

  /** Montant exact avec séparateurs (pour les écrans de détail). */
  function fmtExact(n) {
    var neg = n < 0;
    var v = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '-' : '') + v + ' €';
  }

  function fmtPct(v, decimals) {
    var d = decimals === undefined ? 1 : decimals;
    return (v >= 0 ? '+' : '') + v.toFixed(d).replace('.', ',') + ' %';
  }

  function fmtSigned(n) {
    return (n >= 0 ? '+' : '') + fmtMoney(n);
  }

  /** Décimales à la française : 1.60 -> « 1,60 ». */
  function dec(v, d) {
    if (v === null || v === undefined || isNaN(v)) return '0';
    return v.toFixed(d === undefined ? 1 : d).replace('.', ',');
  }

  var MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
    'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  /** Convertit un compteur de jours de jeu en date lisible (mois de 30 jours). */
  function fmtDay(day) {
    var y = 2025 + Math.floor(day / 360);
    var rest = ((day % 360) + 360) % 360;
    var m = Math.floor(rest / 30);
    var d = (rest % 30) + 1;
    return d + ' ' + MONTHS[m] + ' ' + y;
  }

  function fmtDuration(ms) {
    var s = Math.floor(ms / 1000);
    if (s < 60) return s + ' s';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' h ' + (m % 60) + ' min';
    return Math.floor(h / 24) + ' j ' + (h % 24) + ' h';
  }

  function fmtClock(minutes) {
    return Math.floor(minutes) + "'";
  }

  /* ------------------------------------------------------------- DOM ----- */

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined && html !== null) e.innerHTML = html;
    return e;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /** Échappe le HTML (noms de joueurs générés, saisies utilisateur…). */
  function esc(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Délégation d'évènements : on(root, 'click', '[data-act]', handler) */
  function on(root, type, sel, handler) {
    root.addEventListener(type, function (ev) {
      var t = ev.target;
      while (t && t !== root) {
        if (t.matches && t.matches(sel)) { handler.call(t, ev, t); return; }
        t = t.parentNode;
      }
    });
  }

  /* ------------------------------------------------------------ divers --- */

  /** Copie profonde simple (état sérialisable uniquement). */
  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /** Complète `target` avec les clés manquantes de `def` (migrations de sauvegarde). */
  function defaults(target, def) {
    if (!target || typeof target !== 'object') return deepClone(def);
    for (var k in def) {
      if (!Object.prototype.hasOwnProperty.call(def, k)) continue;
      if (!(k in target) || target[k] === undefined || target[k] === null) {
        target[k] = deepClone(def[k]);
      } else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) {
        defaults(target[k], def[k]);
      }
    }
    return target;
  }

  function sum(arr, fn) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += fn ? fn(arr[i], i) : arr[i];
    return t;
  }

  function avg(arr, fn) {
    return arr.length ? sum(arr, fn) / arr.length : 0;
  }

  function sortBy(arr, fn, desc) {
    return arr.slice().sort(function (a, b) {
      var va = fn(a), vb = fn(b);
      return desc ? (vb - va) : (va - vb);
    });
  }

  function nowMs() { return Date.now(); }

  return {
    rnd: rnd, rint: rint, rfloat: rfloat, pick: pick, weighted: weighted,
    shuffle: shuffle, gauss: gauss, poisson: poisson, chance: chance,
    clamp: clamp, lerp: lerp, uid: uid,
    fmtNum: fmtNum, fmtMoney: fmtMoney, fmtExact: fmtExact, fmtPct: fmtPct,
    fmtSigned: fmtSigned, fmtDay: fmtDay, fmtDuration: fmtDuration, dec: dec,
    fmtClock: fmtClock, MONTHS: MONTHS,
    el: el, $: $, $$: $$, clear: clear, esc: esc, on: on,
    deepClone: deepClone, defaults: defaults,
    sum: sum, avg: avg, sortBy: sortBy, nowMs: nowMs
  };
})();
