/* Gouvernement : diriger un pays entier.
 *
 * On règle la fiscalité et les budgets, on vote des lois, puis on valide le
 * mois. L'économie nationale se répercute ensuite sur la Bourse et sur vos
 * entreprises — et le Trésor public peut, pour un coût politique, financer
 * vos propres affaires.
 */
window.G = window.G || {};

G.country = (function () {
  'use strict';
  var u = G.util;

  var CAMPAIGN_COST = 3.0e8;
  var TERM_MONTHS = 48;

  function get() { return G.state.country; }

  function defOf(id) {
    for (var i = 0; i < G.DATA.countries.length; i++) {
      if (G.DATA.countries[i].id === id) return G.DATA.countries[i];
    }
    return null;
  }

  function ministryDef(id) {
    for (var i = 0; i < G.DATA.ministries.length; i++) {
      if (G.DATA.ministries[i].id === id) return G.DATA.ministries[i];
    }
    return null;
  }

  function lawDef(id) {
    for (var i = 0; i < G.DATA.laws.length; i++) {
      if (G.DATA.laws[i].id === id) return G.DATA.laws[i];
    }
    return null;
  }

  /* ------------------------------------------------------ prise de pouvoir */

  function campaignCost() { return CAMPAIGN_COST; }

  function canRun() { return G.state.money >= CAMPAIGN_COST; }

  function elect(countryId) {
    var d = defOf(countryId);
    if (!d || G.state.country) return false;
    if (!G.eco.spend(CAMPAIGN_COST, 'pays', 'Campagne électorale · ' + d.name)) return false;

    var gdp = d.pop * 1e6 * d.gdpPerCap;      // PIB annuel en euros
    var budgets = {};
    for (var i = 0; i < G.DATA.ministries.length; i++) {
      budgets[G.DATA.ministries[i].id] = G.DATA.ministries[i].need;
    }

    G.state.country = {
      id: d.id, name: d.name, icon: d.icon,
      pop: d.pop, gdp: gdp,
      month: 0, term: 1, monthsInTerm: 0,
      taxes: { corp: 25, income: 30, vat: 20 },
      budgets: budgets,
      treasury: gdp * 0.01,
      debt: gdp * 0.55,
      ind: {
        croissance: 1.6, chomage: 7.5, inflation: 1.9,
        popularite: 55, stabilite: 65,
        sante: 55, education: 55, securite: 55, infra: 55,
        innovation: 50, social: 55, defense: 50, culture: 50
      },
      laws: {},
      subsidyMonths: 0,
      history: [],
      journal: []
    };
    journal('🗳️ Élection remportée. Vous prenez la tête de ' + d.name + '.');
    return true;
  }

  function journal(txt) {
    var c = get();
    if (!c) return;
    c.journal.unshift({ m: c.month, txt: txt });
    if (c.journal.length > 60) c.journal.length = 60;
  }

  /* ------------------------------------------------------------ finances */

  /** Recettes fiscales mensuelles. */
  function revenue(c) {
    var t = c.taxes;
    var load = (t.corp * 0.30 + t.income * 0.60 + t.vat * 0.65) / 100;
    /* Trop d'impôt tue l'impôt : rendement décroissant. */
    var laffer = 1 - Math.pow(u.clamp((t.corp + t.income + t.vat) / 300, 0, 1), 3) * 0.55;
    var extra = 0;
    for (var id in c.laws) {
      var l = lawDef(id);
      if (l && l.effects.recettes) extra += l.effects.recettes;
    }
    return c.gdp / 12 * (load * laffer + extra / 12);
  }

  /** Dépenses mensuelles (ministères, lois, intérêts de la dette). */
  function spending(c) {
    var total = 0, id;
    for (id in c.budgets) total += c.budgets[id];
    var lawCost = 0;
    for (id in c.laws) {
      var l = lawDef(id);
      if (l && l.cost > 0) lawCost += l.cost;
    }
    var interest = c.debt * 0.032 / 12;
    return c.gdp / 12 * (total + lawCost / 12) + interest;
  }

  function balance(c) { return revenue(c) - spending(c); }

  /* -------------------------------------------------------------- mois -- */

  function endMonth() {
    var c = get();
    if (!c) return null;
    var report = { events: [], month: c.month };

    /* --- comptes publics --- */
    var rev = revenue(c), spend = spending(c);
    var bal = rev - spend;
    c.treasury += bal;
    if (c.treasury < 0) {
      c.debt += -c.treasury;
      c.treasury = 0;
    } else if (c.debt > 0 && c.treasury > c.gdp * 0.02) {
      /* Remboursement automatique du surplus au-delà d'un matelas. */
      var repay = Math.min(c.debt, (c.treasury - c.gdp * 0.02) * 0.5);
      c.debt -= repay;
      c.treasury -= repay;
    }
    report.revenue = rev;
    report.spending = spend;
    report.balance = bal;

    /* --- qualité des services publics --- */
    var i, m, ratio;
    for (i = 0; i < G.DATA.ministries.length; i++) {
      m = G.DATA.ministries[i];
      ratio = (c.budgets[m.id] || 0) / m.need;
      var target = u.clamp(28 + ratio * 34, 5, 98);
      var key = m.id === 'recherche' ? 'innovation' : m.id;
      if (c.ind[key] !== undefined) {
        c.ind[key] = u.lerp(c.ind[key], target, 0.16);
      }
    }

    /* --- croissance --- */
    var taxDrag = -(c.taxes.corp - 22) * 0.020 - (c.taxes.income - 28) * 0.008;
    var invest = ((c.budgets.infra || 0) / 0.045 - 1) * 0.30 +
      ((c.budgets.recherche || 0) / 0.025 - 1) * 0.35 +
      ((c.budgets.education || 0) / 0.055 - 1) * 0.18;
    var debtDrag = -Math.max(0, c.debt / c.gdp - 0.9) * 1.1;
    var lawGrowth = 0, lawPop = 0, lawUnemp = 0, lawInfl = 0;
    for (var id in c.laws) {
      var l = lawDef(id);
      if (!l) continue;
      lawGrowth += (l.effects.croissance || 0) + (l.effects.croissanceLT || 0) * 0.5;
      lawPop += l.effects.popularite || 0;
      lawUnemp += l.effects.chomage || 0;
    }
    var target2 = 1.4 + taxDrag + invest + debtDrag + lawGrowth + u.gauss(0, 0.35);
    c.ind.croissance = u.clamp(u.lerp(c.ind.croissance, target2, 0.35), -6, 9);

    /* --- chômage & inflation --- */
    var unempTarget = u.clamp(8.5 - c.ind.croissance * 1.1 + lawUnemp -
      (c.ind.education - 55) * 0.02, 2.5, 26);
    c.ind.chomage = u.clamp(u.lerp(c.ind.chomage, unempTarget, 0.22), 2, 30);

    var deficitRatio = -bal / (c.gdp / 12);
    var inflTarget = 1.6 + c.ind.croissance * 0.22 + Math.max(0, deficitRatio) * 2.2 + lawInfl;
    c.ind.inflation = u.clamp(u.lerp(c.ind.inflation, inflTarget, 0.25), -2, 22);

    /* --- popularité --- */
    var services = (c.ind.sante + c.ind.education + c.ind.securite + c.ind.social +
      c.ind.infra + c.ind.culture) / 6;
    var popTarget = 20 + services * 0.55
      - (c.ind.chomage - 7) * 1.9
      - Math.max(0, c.ind.inflation - 3) * 2.4
      - (c.taxes.income - 30) * 0.30 - (c.taxes.vat - 20) * 0.35
      + c.ind.croissance * 1.5
      + lawPop * 2.2;
    popTarget *= (1 + G.eco.bonus('pop'));
    c.ind.popularite = u.clamp(u.lerp(c.ind.popularite, u.clamp(popTarget, 2, 96), 0.30),
      1, 99);

    c.ind.stabilite = u.clamp(u.lerp(c.ind.stabilite,
      30 + c.ind.popularite * 0.55 + (c.ind.securite - 50) * 0.25, 0.25), 1, 99);

    /* --- évènement du mois --- */
    var ev = u.weighted(G.DATA.countryEvents.map(function (e) { return [e, e.w]; }));
    if (ev.pop) c.ind.popularite = u.clamp(c.ind.popularite + ev.pop, 1, 99);
    if (ev.croissance) c.ind.croissance = u.clamp(c.ind.croissance + ev.croissance, -6, 9);
    if (ev.stabilite) c.ind.stabilite = u.clamp(c.ind.stabilite + ev.stabilite, 1, 99);
    if (ev.inflation) c.ind.inflation = u.clamp(c.ind.inflation + ev.inflation, -2, 22);
    if (ev.cout) {
      var cost = c.gdp / 12 * ev.cout;
      c.treasury -= cost;
      if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
    }
    if (ev.marche) G.market.addBoost(u.pick(G.DATA.stocks).id, ev.marche);
    report.events.push(ev.txt);
    journal('📰 ' + ev.txt);

    /* --- croissance du PIB --- */
    c.gdp *= (1 + c.ind.croissance / 100 / 12);
    c.pop *= (1 + 0.004 / 12);

    if (c.subsidyMonths > 0) c.subsidyMonths--;

    c.month++;
    c.monthsInTerm++;
    c.history.push({
      m: c.month, pop: Math.round(c.ind.popularite),
      croissance: +c.ind.croissance.toFixed(2),
      chomage: +c.ind.chomage.toFixed(1),
      dette: +(c.debt / c.gdp * 100).toFixed(1)
    });
    if (c.history.length > 120) c.history.shift();

    /* --- élection de fin de mandat --- */
    if (c.monthsInTerm >= TERM_MONTHS) report.election = election();

    /* --- destitution en cas d'effondrement --- */
    if (c.ind.stabilite < 8 && c.ind.popularite < 15) {
      report.ousted = true;
      journal('🚨 Motion de censure votée : vous quittez le pouvoir.');
      loseCountry('Une motion de censure vous a chassé du pouvoir.');
    }
    return report;
  }

  function election() {
    var c = get();
    var score = c.ind.popularite + (c.ind.croissance - 1.5) * 2 - (c.ind.chomage - 7) * 0.8;
    if (score >= 45) {
      c.term++;
      c.monthsInTerm = 0;
      c.ind.popularite = u.clamp(c.ind.popularite + 4, 1, 99);
      journal('🗳️ Réélu pour un nouveau mandat (score ' + Math.round(score) + ').');
      if (G.ui) G.ui.toast('🗳️ Réélu !', c.name + ' vous renouvelle sa confiance', 'good');
      return { won: true, score: score };
    }
    journal('🗳️ Défaite électorale (score ' + Math.round(score) + ').');
    loseCountry('Vous avez perdu les élections.');
    return { won: false, score: score };
  }

  function loseCountry(reason) {
    var c = get();
    if (!c) return;
    /* On récupère une indemnité de fin de fonction. */
    var golden = Math.min(c.treasury * 0.02, c.gdp * 0.0004);
    G.state.country = null;
    if (golden > 0) G.eco.earn(golden, 'pays', 'Indemnité de fin de mandat');
    if (G.ui) G.ui.toast('🏛️ Fin de mandat', reason, 'bad');
  }

  /* -------------------------------------------------------- décisions --- */

  function setTax(kind, value) {
    var c = get();
    if (!c) return;
    c.taxes[kind] = u.clamp(Math.round(value), 0, 70);
  }

  function setBudget(id, value) {
    var c = get();
    if (!c) return;
    c.budgets[id] = u.clamp(value, 0, 0.30);
  }

  function totalBudget(c) {
    var t = 0;
    for (var id in c.budgets) t += c.budgets[id];
    return t;
  }

  function voteLaw(id) {
    var c = get();
    var l = lawDef(id);
    if (!c || !l || c.laws[id]) return false;
    c.laws[id] = { since: c.month };
    c.ind.popularite = u.clamp(c.ind.popularite + l.pop, 1, 99);
    if (l.effects.marche) {
      G.market.addBoost(u.pick(G.DATA.stocks).id, l.effects.marche,
        'Nouvelle loi : ' + l.name);
    }
    journal('⚖️ Loi votée : ' + l.name + ' (' + (l.pop >= 0 ? '+' : '') + l.pop +
      ' pts de popularité).');
    return true;
  }

  function repealLaw(id) {
    var c = get();
    var l = lawDef(id);
    if (!c || !l || !c.laws[id]) return false;
    delete c.laws[id];
    c.ind.popularite = u.clamp(c.ind.popularite - l.pop * 0.6, 1, 99);
    journal('⚖️ Abrogation : ' + l.name + '.');
    return true;
  }

  /* ------------------------------------------- interactions avec l'empire */

  /** Salaire officiel du chef de l'État (modeste, mais légal). */
  function drawSalary() {
    var c = get();
    if (!c) return false;
    var amount = Math.min(c.treasury, c.gdp * 0.0000008 * 12);
    if (amount <= 0) return false;
    c.treasury -= amount;
    G.eco.earn(amount, 'pays', 'Traitement de chef de l\'État');
    return true;
  }

  /** Subvention publique à vos propres entreprises : efficace et impopulaire. */
  function subsidize() {
    var c = get();
    if (!c) return false;
    var cost = c.gdp * 0.004;
    if (c.treasury < cost) {
      if (G.ui) G.ui.toast('🏛️ Trésor insuffisant', 'Il faut ' + u.fmtMoney(cost), 'bad');
      return false;
    }
    c.treasury -= cost;
    c.subsidyMonths = 6;
    c.ind.popularite = u.clamp(c.ind.popularite - 5, 1, 99);
    journal('💰 Plan de soutien à l\'industrie voté (six mois).');
    if (G.ui) {
      G.ui.toast('🏛️ Subvention accordée', 'Vos entreprises produisent +25 % pendant 6 mois', 'good');
    }
    return true;
  }

  /** Injection de fonds personnels dans le Trésor : coûteux mais populaire. */
  function injectFunds(amount) {
    var c = get();
    if (!c || amount <= 0) return false;
    if (!G.eco.spend(amount, 'pays', 'Don au Trésor public')) return false;
    c.treasury += amount;
    var pop = u.clamp(amount / (c.gdp * 0.002) * 3, 0, 9);
    c.ind.popularite = u.clamp(c.ind.popularite + pop, 1, 99);
    journal('🤝 Don personnel de ' + u.fmtMoney(amount) + ' au Trésor (+' +
      pop.toFixed(1) + ' pts).');
    return true;
  }

  /* ----------------------------------------------- effets sur le reste --- */

  /** Effet du pays sur l'humeur des marchés. */
  function marketEffect() {
    var c = get();
    if (!c) return 0;
    return u.clamp((c.ind.croissance - 1.5) * 0.09 +
      (c.ind.stabilite - 55) * 0.004 -
      Math.max(0, c.ind.inflation - 4) * 0.05, -0.6, 0.6);
  }

  /** Effet du pays sur les revenus de vos entreprises. */
  function bizMultiplier() {
    var c = get();
    if (!c) return 1;
    var m = 1 + (c.ind.croissance - 1.5) * 0.02 - (c.taxes.corp - 25) * 0.004;
    if (c.subsidyMonths > 0) m += 0.25;
    return u.clamp(m, 0.55, 2.2);
  }

  function debtRatio(c) { return c.debt / c.gdp * 100; }

  return {
    CAMPAIGN_COST: CAMPAIGN_COST, TERM_MONTHS: TERM_MONTHS,
    get: get, defOf: defOf, ministryDef: ministryDef, lawDef: lawDef,
    campaignCost: campaignCost, canRun: canRun, elect: elect,
    revenue: revenue, spending: spending, balance: balance,
    endMonth: endMonth, election: election, loseCountry: loseCountry,
    setTax: setTax, setBudget: setBudget, totalBudget: totalBudget,
    voteLaw: voteLaw, repealLaw: repealLaw,
    drawSalary: drawSalary, subsidize: subsidize, injectFunds: injectFunds,
    marketEffect: marketEffect, bizMultiplier: bizMultiplier, debtRatio: debtRatio,
    journal: journal
  };
})();
