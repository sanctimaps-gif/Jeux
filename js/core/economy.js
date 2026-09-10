/* Portefeuille unique — le cœur du concept.
 *
 * Toutes les activités du jeu (entreprises, Bourse, clubs sportifs, casino,
 * gouvernement) créditent et débitent LE MÊME compte, en indiquant leur
 * origine. On peut donc encaisser une prime de victoire au rugby le matin et
 * la placer en Bourse l'après-midi — et le jeu garde la trace de cette
 * circulation de capitaux.
 */
window.G = window.G || {};

G.eco = (function () {
  'use strict';
  var u = G.util;

  /* --------------------------------------------------------- libellés --- */

  var SOURCE_META = {
    'business': { label: 'Entreprises', icon: '🏢' },
    'bourse': { label: 'Bourse', icon: '📈' },
    'dividende': { label: 'Dividendes', icon: '💸' },
    'immobilier': { label: 'Immobilier', icon: '🏘️' },
    'crypto': { label: 'Cryptomonnaies', icon: '🪙' },
    'collection': { label: 'Collections', icon: '🖼️' },
    'casino': { label: 'Casino', icon: '🎰' },
    'pays': { label: 'Gouvernement', icon: '🏛️' },
    'guerre': { label: 'Guerre & butin', icon: '⚔️' },
    'divers': { label: 'Divers', icon: '✨' }
  };

  /** Métadonnées lisibles d'une source ('manager:rugby' -> Rugby à XV). */
  function meta(source) {
    if (!source) return SOURCE_META.divers;
    if (source.indexOf('manager:') === 0) {
      var sp = G.DATA.sportById[source.slice(8)];
      if (sp) return { label: sp.name, icon: sp.icon };
      return { label: 'Sport', icon: '🏅' };
    }
    if (source.indexOf('casino:') === 0) {
      return { label: 'Casino · ' + source.slice(7), icon: '🎰' };
    }
    var root = source.split(':')[0];
    return SOURCE_META[root] || SOURCE_META.divers;
  }

  /** Clé de regroupement utilisée pour le suivi des capitaux réinvestis. */
  function group(source) {
    if (!source) return 'divers';
    if (source.indexOf('manager:') === 0) return source;   // un groupe par sport
    return source.split(':')[0];
  }

  /* ------------------------------------------------------ mouvements ---- */

  function pushLog(amount, source, label) {
    var s = G.state;
    s.log.unshift({
      t: Date.now(), d: s.market.day, a: Math.round(amount),
      s: source || 'divers', l: label || ''
    });
    if (s.log.length > 200) s.log.length = 200;
  }

  function track(source, amount) {
    var s = G.state;
    var k = source || 'divers';
    if (!s.stats.bySource[k]) s.stats.bySource[k] = { in: 0, out: 0 };
    if (amount >= 0) s.stats.bySource[k].in += amount;
    else s.stats.bySource[k].out += -amount;
  }

  /**
   * Crédite le portefeuille.
   * @param {number} amount  montant positif
   * @param {string} source  'business', 'manager:rugby', 'casino:blackjack'…
   * @param {string} label   texte affiché dans le journal
   * @param {boolean} silent n'affiche pas de notification
   */
  function earn(amount, source, label, silent) {
    if (!isFinite(amount) || amount <= 0) return 0;
    var s = G.state;
    s.money += amount;
    s.stats.earned += amount;
    track(source, amount);

    var g = group(source);
    s.pending[g] = (s.pending[g] || 0) + amount;

    if (label) pushLog(amount, source, label);
    if (!silent && G.ui && G.ui.toast) {
      var m = meta(source);
      G.ui.toast(m.icon + ' +' + u.fmtMoney(amount), label || m.label, 'good');
    }
    if (G.ui && G.ui.headerDirty) G.ui.headerDirty();
    return amount;
  }

  function can(amount) { return G.state.money >= amount - 0.0001; }

  /**
   * Débite le portefeuille. Renvoie false (sans rien débiter) si les fonds
   * sont insuffisants.
   */
  function spend(amount, source, label, silent) {
    if (!isFinite(amount) || amount < 0) return false;
    var s = G.state;
    if (s.money < amount - 0.0001) {
      if (!silent && G.ui && G.ui.toast) {
        G.ui.toast('💳 Fonds insuffisants', 'Il vous manque ' +
          u.fmtMoney(amount - s.money), 'bad');
      }
      return false;
    }
    s.money -= amount;
    s.stats.spent += amount;
    track(source, -amount);
    if (label) pushLog(-amount, source, label);
    if (!silent && G.ui && G.ui.toast && amount > 0) {
      var m = meta(source);
      G.ui.toast(m.icon + ' -' + u.fmtMoney(amount), label || m.label, 'neutral');
    }
    if (G.ui && G.ui.headerDirty) G.ui.headerDirty();
    return true;
  }

  /**
   * Consomme les gains « frais » d'une origine donnée lors d'un
   * investissement en Bourse, et mémorise d'où vient le capital placé.
   */
  function consumePending(amount) {
    var s = G.state;
    var keys = Object.keys(s.pending);
    var total = 0, i;
    for (i = 0; i < keys.length; i++) total += s.pending[keys[i]];
    if (total <= 0) return;

    var used = Math.min(amount, total);
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      var part = s.pending[k] / total * used;
      s.pending[k] -= part;
      if (s.pending[k] < 0.01) delete s.pending[k];
      s.reinvested[k] = (s.reinvested[k] || 0) + part;
    }
  }

  /** Origine principale des gains encore disponibles. */
  function topPending() {
    var s = G.state, best = null, bestV = 0;
    for (var k in s.pending) {
      if (s.pending[k] > bestV) { bestV = s.pending[k]; best = k; }
    }
    return best ? { key: best, amount: bestV, meta: meta(best) } : null;
  }

  /* ---------------------------------------------------------- bonus ----- */

  /**
   * Bonus cumulés (collections + lois du pays) pour un type d'effet.
   * Renvoie une valeur additive : 0.12 = +12 %.
   */
  function bonus(type) {
    var s = G.state, total = 0, i;

    /* Objets de collection possédés */
    for (i = 0; i < G.DATA.collectibles.length; i++) {
      var it = G.DATA.collectibles[i];
      if (s.coll.owned[it.id] && it.bonus && it.bonus.type === type) {
        total += it.bonus.value;
      }
    }
    /* Séries complètes */
    for (i = 0; i < G.DATA.collectionSets.length; i++) {
      var set = G.DATA.collectionSets[i];
      if (s.coll.sets[set.id] && set.setBonus.type === type) total += set.setBonus.value;
    }
    /* Lois en vigueur dans le pays que l'on dirige */
    if (s.nation && s.nation.laws) {
      for (i = 0; i < G.DATA.laws.length; i++) {
        var law = G.DATA.laws[i];
        if (!s.nation.laws[law.id]) continue;
        var e = law.effects;
        if (type === 'biz' && e.bizBonus) total += e.bizBonus;
        if (type === 'biz' && e.bizCost) total -= e.bizCost;
        if (type === 'sponsor' && e.sponsor) total += e.sponsor;
        if (type === 'luck' && e.casino) total += e.casino;
        if (type === 'rent' && e.rent) total += e.rent;
      }
    }
    return total;
  }

  /* --------------------------------------------------- valeur du patrimoine */

  function bizValue() {
    return G.business ? G.business.totalValue() : 0;
  }

  function portfolioValue() {
    var s = G.state, total = 0;
    for (var id in s.market.stocks) {
      var h = s.market.stocks[id];
      total += h.qty * h.p;
    }
    return total;
  }

  function collectionValue() {
    var s = G.state, total = 0;
    for (var id in s.coll.owned) total += s.coll.owned[id].value || 0;
    return total;
  }

  function clubsValue() {
    var list = G.state.manager.clubs, total = 0;
    if (!list || !list.length) return 0;
    for (var i = 0; i < list.length; i++) total += G.manager.clubValue(list[i]);
    return total;
  }

  function realEstateValue() {
    return G.realestate ? G.realestate.totalValue() : 0;
  }

  function cryptoValue() {
    return G.crypto ? G.crypto.totalValue() : 0;
  }

  function netWorth() {
    var w = G.state.money + bizValue() + portfolioValue() + collectionValue() +
      clubsValue() + realEstateValue() + cryptoValue();
    if (w > G.state.stats.peakWorth) G.state.stats.peakWorth = w;
    return w;
  }

  /* Revenu passif par seconde (entreprises + loyers). */
  function passiveIncome() {
    var v = 0;
    if (G.business) v += G.business.perSecond();
    if (G.realestate) v += G.realestate.totalHourly() / 3600;
    return v;
  }

  return {
    earn: earn, spend: spend, can: can,
    meta: meta, group: group, bonus: bonus,
    consumePending: consumePending, topPending: topPending,
    bizValue: bizValue, portfolioValue: portfolioValue,
    collectionValue: collectionValue, clubsValue: clubsValue,
    realEstateValue: realEstateValue, cryptoValue: cryptoValue,
    netWorth: netWorth, passiveIncome: passiveIncome,
    SOURCE_META: SOURCE_META
  };
})();
