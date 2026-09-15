/* Impôts personnels — un prélèvement récurrent sur tout ce que gagne le
 * joueur, à régler tous les 3 à 4 jours. Non payé dans le délai de grâce, les
 * revenus passifs (entreprises et loyers) s'arrêtent jusqu'au paiement.
 */
window.G = window.G || {};

G.tax = (function () {
  'use strict';
  var u = G.util;

  var RATE = 0.15;                     // 15 % des revenus du cycle
  var MIN_PERIOD = 3 * 86400;          // 3 jours
  var MAX_PERIOD = 4 * 86400;          // 4 jours
  var GRACE_SECONDS = 24 * 3600;       // 24 h de sursis avant blocage des revenus

  function newPeriod() { return MIN_PERIOD + u.rnd() * (MAX_PERIOD - MIN_PERIOD); }

  /** Structure par défaut (fusionnée dans l'état de sauvegarde par u.defaults). */
  function defaults() {
    return {
      cycleIncome: 0,      // revenus imposables accumulés depuis la dernière échéance
      dueIn: newPeriod(),  // secondes avant la prochaine échéance
      due: 0,              // montant à payer (0 = rien en attente)
      graceLeft: 0,         // secondes de sursis restantes une fois l'échéance tombée
      overdue: false,      // sursis écoulé, revenus bloqués
      totalPaid: 0,
      lastAmount: 0
    };
  }

  function state() { return G.state.tax; }

  /** Comptabilise un revenu comme imposable pour le cycle en cours. */
  function recordIncome(amount) {
    var t = state();
    if (!t || !(amount > 0)) return;
    t.cycleIncome += amount;
  }

  function isBlocked() {
    var t = state();
    return !!(t && t.overdue);
  }

  function isDue() {
    var t = state();
    return !!(t && t.due > 0);
  }

  /** Avance le compte à rebours de l'impôt ; encaisse l'échéance si besoin. */
  function tick(dt, silent) {
    var t = state();
    if (!t) return;

    if (t.due > 0) {
      if (t.overdue) return;
      t.graceLeft -= dt;
      if (t.graceLeft <= 0) {
        t.overdue = true;
        if (!silent && G.ui) {
          G.ui.toast('🚨 Impôts impayés', 'Entreprises et loyers sont à l\'arrêt jusqu\'au paiement', 'bad');
        }
      }
      return;
    }

    t.dueIn -= dt;
    if (t.dueIn <= 0) issueBill(silent);
  }

  function issueBill(silent) {
    var t = state();
    var amount = Math.round(t.cycleIncome * RATE);
    t.cycleIncome = 0;
    t.dueIn = 0;
    if (amount <= 0) {
      /* Rien gagné sur la période : pas d'impôt, cycle suivant directement. */
      t.dueIn = newPeriod();
      return;
    }
    t.due = amount;
    t.graceLeft = GRACE_SECONDS;
    t.overdue = false;
    if (!silent && G.ui) {
      G.ui.toast('🧾 Impôts à payer', u.fmtMoney(amount) + ' sous ' +
        u.fmtDuration(GRACE_SECONDS * 1000), 'bad');
    }
  }

  /** Montant à régler si l'on paie maintenant : l'échéance en attente, ou à
   * défaut une anticipation sur les revenus déjà accumulés dans le cycle en
   * cours (jamais de paiement automatique : uniquement à la demande du joueur). */
  function payableNow() {
    var t = state();
    if (!t) return 0;
    if (t.due > 0) return t.due;
    return Math.round(t.cycleIncome * RATE);
  }

  /** Règle l'impôt avec l'argent personnel du joueur : l'échéance en attente
   * si elle existe, sinon une anticipation volontaire sur le cycle en cours. */
  function pay() {
    var t = state();
    if (!t) return true;

    if (t.due > 0) {
      if (!G.eco.spend(t.due, 'impots', 'Paiement des impôts')) return false;
      t.totalPaid += t.due;
      t.lastAmount = t.due;
      t.due = 0;
      t.graceLeft = 0;
      var wasOverdue = t.overdue;
      t.overdue = false;
      t.dueIn = newPeriod();
      if (G.ui) {
        G.ui.toast('✅ Impôts payés', wasOverdue
          ? 'Vos revenus reprennent normalement' : 'Merci, citoyen modèle', 'good');
      }
      return true;
    }

    var amount = Math.round(t.cycleIncome * RATE);
    if (amount <= 0) return true;
    if (!G.eco.spend(amount, 'impots', 'Paiement anticipé des impôts')) return false;
    t.totalPaid += amount;
    t.lastAmount = amount;
    t.cycleIncome = 0;
    t.dueIn = newPeriod();
    if (G.ui) {
      G.ui.toast('✅ Impôts payés par anticipation', 'Nouveau cycle de ' +
        u.fmtDuration(t.dueIn * 1000), 'good');
    }
    return true;
  }

  return {
    RATE: RATE, GRACE_SECONDS: GRACE_SECONDS,
    defaults: defaults, recordIncome: recordIncome,
    isBlocked: isBlocked, isDue: isDue, tick: tick, pay: pay, payableNow: payableNow
  };
})();
