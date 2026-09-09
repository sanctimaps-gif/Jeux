/* État global de la partie et valeurs par défaut.
 *
 * Tout ce qui doit survivre à une fermeture du jeu vit ici : l'objet est
 * sérialisé tel quel en JSON dans le localStorage.
 */
window.G = window.G || {};

G.SAVE_VERSION = 1;

G.newState = function () {
  var s = {
    version: G.SAVE_VERSION,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    playTime: 0,

    /* ------------------------------------------------------- portefeuille */
    money: 250,
    stats: {
      earned: 0,
      spent: 0,
      bySource: {},        // { 'manager:rugby': {in: x, out: y}, ... }
      clicks: 0,
      matchesPlayed: 0,
      casinoHands: 0
    },
    /* Journal des mouvements les plus récents (200 max). */
    log: [],
    /* Gains encaissés et pas encore réinvestis, par origine. */
    pending: {},
    /* Capitaux placés en Bourse, ventilés par origine (la « particularité »). */
    reinvested: {},

    /* --------------------------------------------------------- entreprises */
    biz: {
      owned: {},           // id -> { lvl, mgr, prog, ready }
      totalCollected: 0
    },

    /* -------------------------------------------------------------- bourse */
    market: {
      day: 0,
      dayProgress: 0,
      mood: 0,             // humeur de marché, -1 .. +1
      stocks: {},          // id -> { p, open, hist:[], qty, cost, susp }
      news: [],
      lastDividend: 0,
      realized: 0          // plus-values réalisées cumulées
    },

    /* --------------------------------------------------------- collections */
    coll: {
      owned: {},           // id -> { buy, value }
      sets: {}             // id -> true quand la série est complète
    },

    /* ------------------------------------------------------------- manager */
    manager: {
      clubs: {},           // sportId -> club
      active: null,        // sport actuellement sélectionné
      trophies: []
    },

    /* -------------------------------------------------------------- casino */
    casino: {
      net: 0,
      byGame: {},          // gameId -> { hands, net, best }
      biggestWin: 0,
      streak: 0
    },

    /* ---------------------------------------------------------------- pays */
    country: null,         // rempli à la prise de pouvoir

    /* ------------------------------------------------------------ réglages */
    settings: {
      tab: 'empire',
      sub: 'entreprises',
      matchSpeed: 700,
      confirmBig: true,
      sound: false
    },

    /* ------------------------------------------------------- notifications */
    unlocks: {},
    tips: {}
  };

  /* Entreprise de départ offerte pour ne pas rester bloqué à zéro. */
  s.biz.owned.kiosque = { lvl: 1, mgr: false, prog: 0, ready: 0 };

  /* Initialisation de la cote. */
  for (var i = 0; i < G.DATA.stocks.length; i++) {
    var st = G.DATA.stocks[i];
    s.market.stocks[st.id] = {
      p: st.p0, open: st.p0, hist: [st.p0], qty: 0, cost: 0, drift: st.drift
    };
  }

  return s;
};

/** Complète une sauvegarde ancienne avec les nouveautés du jeu. */
G.migrate = function (s) {
  var def = G.newState();
  var u = G.util;

  s = u.defaults(s, def);
  s.version = G.SAVE_VERSION;

  /* Nouvelles valeurs cotées ajoutées après la sauvegarde. */
  for (var i = 0; i < G.DATA.stocks.length; i++) {
    var st = G.DATA.stocks[i];
    if (!s.market.stocks[st.id]) {
      s.market.stocks[st.id] = {
        p: st.p0, open: st.p0, hist: [st.p0], qty: 0, cost: 0, drift: st.drift
      };
    }
  }
  return s;
};
