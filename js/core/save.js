/* Sauvegarde locale (hors ligne, aucun serveur). */
window.G = window.G || {};

G.save = (function () {
  'use strict';
  var KEY = 'empire_total_save_v1';
  var lastSave = 0;

  function write() {
    try {
      G.state.lastSeen = Date.now();
      localStorage.setItem(KEY, JSON.stringify(G.state));
      lastSave = Date.now();
      return true;
    } catch (e) {
      if (G.ui && G.ui.toast) {
        G.ui.toast('💾 Sauvegarde impossible', 'Stockage local indisponible', 'bad');
      }
      return false;
    }
  }

  function read() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      return G.migrate(data);
    } catch (e) {
      return null;
    }
  }

  function wipe() {
    try { localStorage.removeItem(KEY); } catch (e) { /* rien à faire */ }
  }

  /** Sauvegarde au plus une fois toutes les `ms` millisecondes. */
  function autosave(ms) {
    if (Date.now() - lastSave >= (ms || 8000)) write();
  }

  function exportSave() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(G.state))));
  }

  function importSave(text) {
    try {
      var json = decodeURIComponent(escape(atob(text.trim())));
      var data = G.migrate(JSON.parse(json));
      if (!data || typeof data.money !== 'number') return false;
      G.state = data;
      write();
      return true;
    } catch (e) {
      return false;
    }
  }

  function lastSaveAt() { return lastSave; }

  return {
    write: write, read: read, wipe: wipe, autosave: autosave,
    exportSave: exportSave, importSave: importSave, lastSaveAt: lastSaveAt
  };
})();
