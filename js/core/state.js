/* État global de la partie et valeurs par défaut.
 *
 * Tout ce qui doit survivre à une fermeture du jeu vit ici : l'objet est
 * sérialisé tel quel en JSON dans le localStorage.
 */
window.G = window.G || {};

G.SAVE_VERSION = 2;

G.newState = function () {
  var s = {
    version: G.SAVE_VERSION,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    playTime: 0,

    /* ------------------------------------------------------- portefeuille */
    money: 500,
    stats: {
      earned: 0,
      spent: 0,
      bySource: {},        // { 'manager:rugby': {in: x, out: y}, ... }
      clicks: 0,
      matchesPlayed: 0,
      casinoHands: 0,
      peakWorth: 0
    },
    log: [],
    pending: {},           // gains encaissés, pas encore réinvestis
    reinvested: {},        // capitaux placés en Bourse, par origine

    /* --------------------------------------------------------- entreprises */
    biz: {
      companies: [],       // { uid, type, name, lvl, invested, merged }
      slots: 4,
      accrued: 0,
      timer: 0,
      totalPaid: 0,
      lastPayout: 0
    },

    /* -------------------------------------------------------------- bourse */
    market: {
      day: 0,
      dayProgress: 0,
      mood: 0,
      stocks: {},
      news: [],
      lastDividend: 0,
      realized: 0,
      boosts: {}
    },

    /* ---------------------------------------------------------- immobilier */
    realestate: {
      props: [],
      index: {},
      hist: {},
      news: [],
      accrued: 0,
      timer: 0,
      totalRent: 0
    },

    /* --------------------------------------------------------------- crypto */
    crypto: {
      coins: {},
      news: [],
      mood: 0,
      realized: 0
    },

    /* --------------------------------------------------------- collections */
    coll: { owned: {}, sets: {} },

    /* ------------------------------------------------------------- manager */
    manager: {
      clubs: [],           // plusieurs clubs, éventuellement du même sport
      active: null,        // uid du club affiché
      trophies: []
    },

    /* -------------------------------------------------------------- casino */
    casino: { net: 0, byGame: {}, biggestWin: 0, streak: 0 },

    /* ---------------------------------------------------------------- pays */
    nation: null,

    /* --------------------------------------------------------------- impôts */
    tax: G.tax.defaults(),

    /* ------------------------------------------------------------ réglages */
    settings: {
      tab: 'empire',
      sub: 'entreprises',
      matchSpeed: 700,
      controls: 'action',  // 'action' = on joue le match, 'coach' = décisions
      sound: false
    },

    unlocks: {},
    tips: {}
  };

  /* Cote initiale. */
  var i, st;
  for (i = 0; i < G.DATA.stocks.length; i++) {
    st = G.DATA.stocks[i];
    s.market.stocks[st.id] = {
      p: st.p0, open: st.p0, hist: [st.p0], qty: 0, cost: 0
    };
  }
  /* Cryptos. */
  for (i = 0; i < G.DATA.cryptos.length; i++) {
    st = G.DATA.cryptos[i];
    s.crypto.coins[st.id] = {
      p: st.p0, open: st.p0, hist: [st.p0], qty: 0, cost: 0, staked: 0, rewards: 0
    };
  }
  /* Indices immobiliers. */
  for (i = 0; i < G.DATA.cities.length; i++) {
    s.realestate.index[G.DATA.cities[i].id] = 1;
  }

  /* Première entreprise offerte, pour ne pas rester bloqué à zéro. */
  s.biz.companies.push({
    uid: G.util.uid('c'), type: 'kiosque', name: 'Mon premier kiosque',
    lvl: 1, invested: 250, merged: 1, founded: 0
  });

  return s;
};

/** Complète (et convertit) une sauvegarde ancienne. */
G.migrate = function (s) {
  var def = G.newState();
  var u = G.util;
  var i, st;

  /* ---- Conversion de la version 1 (avant la refonte) ------------------- */
  if (!s.version || s.version < 2) {
    /* Entreprises : l'ancien format indexait par type, sans nom ni emplacement. */
    var companies = [];
    if (s.biz && s.biz.owned) {
      var OLD_MAP = {
        kiosque: 'kiosque', foodtruck: 'foodtruck', laverie: 'laverie',
        salle: 'salle', agence: 'agence', startup: 'saas', usine: 'usine',
        clinique: 'clinique', compagnie: 'aerien', banque: 'banque',
        energie: 'energie', spatial: 'spatial'
      };
      for (var id in s.biz.owned) {
        var o = s.biz.owned[id];
        var newType = OLD_MAP[id] || 'kiosque';
        var t = G.DATA.companyById[newType];
        if (!t || !o || !o.lvl) continue;
        companies.push({
          uid: u.uid('c'), type: newType,
          name: t.name,
          lvl: Math.min(o.lvl, t.maxLvl),
          invested: t.cost * Math.max(1, o.lvl) * 0.5,
          merged: o.mgr ? 1.25 : 1,
          founded: 0
        });
      }
    }
    s.biz = {
      companies: companies,
      slots: Math.max(G.DATA.slotBase, companies.length),
      accrued: 0, timer: 0, totalPaid: (s.biz && s.biz.totalCollected) || 0,
      lastPayout: 0
    };

    /* Clubs : l'objet indexé par sport devient une liste. */
    if (s.manager && s.manager.clubs && !Array.isArray(s.manager.clubs)) {
      var arr = [];
      for (var sid in s.manager.clubs) {
        var club = s.manager.clubs[sid];
        club.uid = u.uid('cl');
        club.country = club.country || 'FRA';
        club.division = club.division || 1;
        arr.push(club);
      }
      s.manager.clubs = arr;
      s.manager.active = arr.length ? arr[0].uid : null;
    }

    /* L'ancien onglet Pays est remplacé par le module de stratégie. */
    if (s.country) { s.nation = null; delete s.country; }
    s.version = 2;
  }

  s = u.defaults(s, def);
  s.version = G.SAVE_VERSION;

  /* Nouveaux actifs ajoutés après la sauvegarde. */
  for (i = 0; i < G.DATA.stocks.length; i++) {
    st = G.DATA.stocks[i];
    if (!s.market.stocks[st.id]) {
      s.market.stocks[st.id] = { p: st.p0, open: st.p0, hist: [st.p0], qty: 0, cost: 0 };
    }
  }
  for (i = 0; i < G.DATA.cryptos.length; i++) {
    st = G.DATA.cryptos[i];
    if (!s.crypto.coins[st.id]) {
      s.crypto.coins[st.id] = {
        p: st.p0, open: st.p0, hist: [st.p0], qty: 0, cost: 0, staked: 0, rewards: 0
      };
    }
  }
  for (i = 0; i < G.DATA.cities.length; i++) {
    if (s.realestate.index[G.DATA.cities[i].id] === undefined) {
      s.realestate.index[G.DATA.cities[i].id] = 1;
    }
  }
  if (!Array.isArray(s.manager.clubs)) s.manager.clubs = [];
  if (!Array.isArray(s.biz.companies)) s.biz.companies = [];

  return s;
};
