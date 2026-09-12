/* Stratégie politique : diriger un pays réel parmi 194.
 *
 * Le jeu se déroule au mois : on construit, on produit, on commerce, on
 * recherche, on négocie, on fait la guerre — puis on valide le mois et le
 * monde réagit. Le pays dirigé influence aussi la Bourse et les entreprises
 * du joueur, comme tout le reste du jeu.
 */
window.G = window.G || {};

G.nation = (function () {
  'use strict';
  var u = G.util;

  var TERM_MONTHS = 48;
  var CAMPAIGN_BASE = 2.0e8;      // budget de campagne minimal

  function get() { return G.state.nation; }

  function countryDef(code) { return G.DATA.worldById[code]; }

  function buildingDef(id) {
    for (var i = 0; i < G.DATA.buildings.length; i++) {
      if (G.DATA.buildings[i].id === id) return G.DATA.buildings[i];
    }
    return null;
  }

  function unitDef(id) {
    for (var i = 0; i < G.DATA.units.length; i++) {
      if (G.DATA.units[i].id === id) return G.DATA.units[i];
    }
    return null;
  }

  function techDef(id) {
    for (var i = 0; i < G.DATA.techs.length; i++) {
      if (G.DATA.techs[i].id === id) return G.DATA.techs[i];
    }
    return null;
  }

  function lawDef(id) {
    for (var i = 0; i < G.DATA.laws.length; i++) {
      if (G.DATA.laws[i].id === id) return G.DATA.laws[i];
    }
    return null;
  }

  /* ==================================================== PRISE DE POUVOIR == */

  /** Coût de la campagne électorale dans un pays donné. */
  function campaignCost(code) {
    var d = countryDef(code);
    if (!d) return Infinity;
    return Math.max(CAMPAIGN_BASE, gdpOf(d) * 0.0009);
  }

  /** PIB annuel d'un pays (la population est stockée en millions). */
  function gdpOf(d) { return d.pop * 1e6 * d.gdppc; }

  function canRun(code) { return G.state.money >= campaignCost(code); }

  /** Puissance militaire estimée d'un pays non joueur. */
  function baseMilitary(code) {
    var d = countryDef(code);
    if (!d) return 10;
    var m = Math.pow(gdpOf(d) / 1e9, 0.58) * 1.4;
    /* Quelques puissances militaires historiquement surdimensionnées. */
    var boost = { USA: 2.6, CHN: 2.1, RUS: 2.4, IND: 1.6, PRK: 2.2, ISR: 1.9,
      FRA: 1.5, GBR: 1.5, PAK: 1.7, TUR: 1.4, IRN: 1.5, EGY: 1.3, SAU: 1.3,
      KOR: 1.4, JPN: 1.2, DEU: 1.1 };
    return m * (boost[code] || 1);
  }

  function hasNukes(code) {
    return ['USA', 'RUS', 'CHN', 'FRA', 'GBR', 'IND', 'PAK', 'ISR', 'PRK'].indexOf(code) >= 0;
  }

  /** Fiche d'un pays étranger dans la partie en cours (créée à la demande). */
  function worldEntry(code) {
    var n = get();
    if (!n.world[code]) {
      var d = countryDef(code);
      n.world[code] = {
        mil: baseMilitary(code),
        rel: u.clamp(u.gauss(10, 22), -60, 70),
        owner: code,
        gdp: d ? gdpOf(d) : 1e9,
        pop: d ? d.pop : 1
      };
    }
    return n.world[code];
  }

  /** Codes des pays que vous contrôlez (le vôtre + les annexés). */
  function owned() {
    var n = get();
    return n ? [n.code].concat(n.annexed) : [];
  }

  function controls(code) { return owned().indexOf(code) >= 0; }

  /** Prend le pouvoir dans le pays choisi. */
  function elect(code) {
    var d = countryDef(code);
    if (!d || get()) return false;
    var cost = campaignCost(code);
    if (!G.eco.spend(cost, 'pays', 'Campagne électorale · ' + d.n)) return false;

    var gdp = gdpOf(d);
    var n = {
      code: code, name: d.n, flag: d.f,
      month: 0, term: 1, monthsInTerm: 0,
      ideology: 'democratie',
      religion: d.rel,
      pop: d.pop,                    // en millions
      gdp: gdp,
      treasury: gdp * 0.012,
      debt: gdp * 0.5,
      taxes: { corp: 25, income: 30, vat: 20 },
      budgets: { sante: 0.085, education: 0.055, securite: 0.030, social: 0.075 },
      res: { food: 0, energy: 0, metal: 0, oil: 0, goods: 0, tech: 0 },
      buildings: {},
      army: {},
      techs: {},
      ministers: {},
      wonders: {},
      orgs: {},
      laws: {},
      ind: {
        popularite: 55, stabilite: 65,
        sante: 55, education: 55, securite: 55, social: 55,
        croissance: 1.6, chomage: 7.5, inflation: 1.9, pollution: 20,
        faith: 45, tourisme: 20, unInfluence: 10
      },
      world: {},
      wars: [],
      allies: {},
      pacts: {},
      annexed: [],
      sanctions: {},
      subsidyMonths: 0,
      journal: [],
      history: [],
      personalFund: false      // true = payer les dépenses politiques uniquement avec la fortune personnelle
    };
    G.state.nation = n;

    /* Parc de bâtiments et armée hérités, proportionnels au pays. */
    seedCountry(n, d);
    journal('🗳️ Élection remportée : vous dirigez ' + d.n + '.');
    return true;
  }

  /** Dote le pays d'infrastructures et d'une armée cohérentes avec sa taille. */
  function seedCountry(n, d) {
    var pop = d.pop;
    var rich = d.gdppc / 25000;
    function set(id, v) { n.buildings[id] = Math.max(0, Math.round(v)); }

    set('ferme', pop * 20 / 120 * 1.15);
    set('scierie', pop * 0.06);
    set('mine', pop * 0.05 * u.clamp(rich, 0.4, 2));
    set('usine', pop * 0.08 * u.clamp(rich, 0.3, 2.2));
    set('hopital', pop * 0.06 * u.clamp(rich, 0.3, 2));
    set('universite', pop * 0.04 * u.clamp(rich, 0.3, 2));
    set('labo', pop * 0.02 * u.clamp(rich, 0.2, 2.5));
    set('caserne', pop * 0.02);
    if (!d.lock) {
      set('peche', pop * 0.03);
      set('port', pop * 0.02);
    }
    if (d.gdppc > 8000) set('puits', pop * 0.035);

    /* Les centrales sont dimensionnées pour couvrir la consommation réelle
       du pays, avec une petite marge : un État ne démarre pas au black-out. */
    var needE = pop * 6;
    for (var bid in n.buildings) {
      var bd = buildingDef(bid);
      if (bd && bd.cons.energy) needE += bd.cons.energy * n.buildings[bid];
    }
    set('centrale', needE * 1.12 / 140);

    var mil = baseMilitary(n.code);
    n.army.inf = Math.round(mil * 1.2);
    n.army.char = Math.round(mil * 0.25);
    n.army.artil = Math.round(mil * 0.2);
    if (d.gdppc > 6000) {
      n.army.heli = Math.round(mil * 0.08);
      n.army.jet = Math.round(mil * 0.06);
    }
    if (!d.lock && d.gdppc > 10000) {
      n.army.navire = Math.round(mil * 0.04);
      n.army.sousmarin = Math.round(mil * 0.02);
    }
    if (hasNukes(n.code)) n.army.nuke = u.rint(20, 120);

    /* Technologies de départ selon le niveau de développement. */
    if (d.gdppc > 6000) n.techs.agronomie = true;
    if (d.gdppc > 12000) n.techs.industrie = true;
    if (d.gdppc > 20000) { n.techs.medecine = true; n.techs.education = true; }
    if (d.gdppc > 30000) n.techs.informatique = true;
    if (hasNukes(n.code)) { n.techs.nucleaire = true; n.techs.atomique = true; }
  }

  function journal(txt) {
    var n = get();
    if (!n) return;
    n.journal.unshift({ m: n.month, txt: txt });
    if (n.journal.length > 80) n.journal.length = 80;
  }

  /* ======================================================== ÉCHELLES ====== */

  /** Unité de coût : un dix-millième du PIB mensuel. */
  function costFactor() {
    var n = get();
    return n ? n.gdp / 12 * 1e-4 : 1;
  }

  function buildCost(b) { return b.cost * costFactor(); }
  function unitCost(un) { return un.cost * costFactor(); }
  function resourcePrice(id) {
    for (var i = 0; i < G.DATA.resources.length; i++) {
      /* Une unité de ressource vaut un millième d'unité de coût : le commerce
         extérieur pèse alors quelques points de PIB, pas la moitié. */
      if (G.DATA.resources[i].id === id) return G.DATA.resources[i].price * costFactor() / 1000;
    }
    return 0;
  }

  /* ======================================================== PRODUCTION ==== */

  /** Production et consommation mensuelles, toutes sources confondues. */
  function balanceSheet() {
    var n = get();
    var out = { food: 0, energy: 0, metal: 0, oil: 0, goods: 0, tech: 0 };
    var need = { food: 0, energy: 0, metal: 0, oil: 0, goods: 0, tech: 0 };
    var jobs = 0, health = 0, edu = 0, army = 0, pollution = 0, trade = 0;
    var id, i;

    var techMul = {
      food: n.techs.agronomie ? 1.25 : 1,
      goods: n.techs.industrie ? 1.2 : 1,
      tech: n.techs.education ? 1.2 : 1,
      energy: 1
    };
    var ia = n.techs.ia ? 1.15 : 1;

    for (id in n.buildings) {
      var b = buildingDef(id);
      var cnt = n.buildings[id];
      if (!b || !cnt) continue;
      var mul = (b.id === 'nucleaire' && n.techs.fusion) ? 3 : 1;
      for (var r in b.prod) {
        out[r] += b.prod[r] * cnt * (techMul[r] || 1) * ia * mul;
      }
      for (var c in b.cons) need[c] += b.cons[c] * cnt;
      jobs += (b.jobs || 0) * cnt;
      health += (b.health || 0) * cnt;
      edu += (b.edu || 0) * cnt;
      army += (b.army || 0) * cnt;
      pollution += (b.pollution || 0) * cnt;
      trade += (b.trade || 0) * cnt;
    }

    /* Besoins de la population. */
    need.food += n.pop * 20;
    need.energy += n.pop * 6;
    need.goods += n.pop * 4;

    /* Entretien de l'armée. */
    for (id in n.army) {
      var un = unitDef(id);
      if (!un) continue;
      need.oil += n.army[id] * (un.dom === 'terre' ? 0.02 : 0.06);
      need.goods += n.army[id] * 0.02;
    }

    var net = {};
    for (id in out) net[id] = out[id] - need[id];

    return {
      prod: out, cons: need, net: net,
      jobs: jobs, health: health, edu: edu, army: army,
      pollution: pollution, trade: trade
    };
  }

  /* ======================================================== FINANCES ====== */

  function revenue() {
    var n = get();
    var t = n.taxes;
    var load = (t.corp * 0.30 + t.income * 0.60 + t.vat * 0.65) / 100;
    var laffer = 1 - Math.pow(u.clamp((t.corp + t.income + t.vat) / 300, 0, 1), 3) * 0.55;
    var extra = 0;
    for (var id in n.laws) {
      var l = lawDef(id);
      if (l && l.effects.recettes) extra += l.effects.recettes;
    }
    var tourism = n.ind.tourisme / 100 * 0.02;
    var orgBonus = n.orgs.omc ? 0.3 : 0;
    return n.gdp / 12 * (load * laffer + extra / 12 + tourism) * (1 + orgBonus * 0.1);
  }

  function spending() {
    var n = get();
    var total = 0, id;
    for (id in n.budgets) total += n.budgets[id];
    var lawCost = 0;
    for (id in n.laws) {
      var l = lawDef(id);
      if (l && l.cost > 0) lawCost += l.cost;
    }
    var rate = n.orgs.fmi ? 0.016 : 0.032;
    var interest = n.debt * rate / 12;

    /* Entretien des bâtiments et de l'armée. Le facteur ramène l'ensemble
       des dépenses publiques autour de 45 % du PIB, comme dans la réalité. */
    var upkeep = 0;
    for (id in n.buildings) {
      var b = buildingDef(id);
      if (b) upkeep += b.upkeep * n.buildings[id] * costFactor() * 0.4;
    }
    for (id in n.army) {
      var un = unitDef(id);
      if (un) upkeep += un.upkeep * n.army[id] * costFactor() * 0.4;
    }
    return n.gdp / 12 * (total + lawCost / 12) + interest + upkeep;
  }

  function balance() { return revenue() - spending(); }

  /**
   * Débite le Trésor public ; si celui-ci ne suffit pas, complète avec la
   * fortune personnelle du joueur (l'argent gagné en affaires finance la
   * politique, comme le Trésor peut à l'inverse renflouer le joueur ailleurs).
   *
   * En mode « fortune personnelle » (n.personalFund), le Trésor n'est jamais
   * touché : tout est payé directement sur le capital du joueur — utile
   * quand le pays est ruiné et qu'on ne veut pas dépendre de ses caisses.
   */
  function payTreasury(cost, label) {
    var n = get();
    if (!n || cost <= 0) return true;
    if (n.personalFund) {
      if (!G.eco.can(cost)) return false;
      G.eco.spend(cost, 'pays', label || 'Financement personnel', true);
      return true;
    }
    if (n.treasury >= cost) {
      n.treasury -= cost;
      return true;
    }
    var shortfall = cost - n.treasury;
    if (!G.eco.can(shortfall)) return false;
    G.eco.spend(shortfall, 'pays', label || 'Financement personnel du Trésor', true);
    n.treasury = 0;
    return true;
  }

  function canAffordTreasury(cost) {
    var n = get();
    if (!n) return false;
    if (n.personalFund) return G.state.money >= cost - 0.0001;
    return (n.treasury + G.state.money) >= cost - 0.0001;
  }

  function togglePersonalFund() {
    var n = get();
    if (!n) return false;
    n.personalFund = !n.personalFund;
    return n.personalFund;
  }

  /** Achat/vente de ressources sur le marché mondial. */
  function trade(resId, qty) {
    var n = get();
    var price = resourcePrice(resId);
    var sheet = balanceSheet();
    var discount = 1 - Math.min(0.25, sheet.trade);
    if (qty > 0) {
      var cost = qty * price * discount * (n.sanctions.self ? 1.35 : 1);
      if (!payTreasury(cost, 'Achat de ressources')) {
        if (G.ui) G.ui.toast('💳 Fonds insuffisants', 'Il faut ' + u.fmtMoney(cost), 'bad');
        return false;
      }
      n.res[resId] += qty;
    } else {
      var have = n.res[resId];
      var sellQty = Math.min(-qty, have);
      if (sellQty <= 0) return false;
      n.treasury += sellQty * price * 0.92;
      n.res[resId] -= sellQty;
    }
    return true;
  }

  /* ======================================================= CONSTRUCTION === */

  function canBuild(b) {
    var n = get();
    if (b.tech && !n.techs[b.tech]) return false;
    if (b.sea && countryDef(n.code).lock) return false;
    return canAffordTreasury(buildCost(b));
  }

  function build(id, qty) {
    var n = get();
    var b = buildingDef(id);
    if (!b) return false;
    qty = Math.max(1, qty || 1);
    var cost = buildCost(b) * qty;
    if (b.tech && !n.techs[b.tech]) return false;
    if (b.sea && countryDef(n.code).lock) {
      if (G.ui) G.ui.toast('🌍 Pays enclavé', 'Aucun accès à la mer', 'bad');
      return false;
    }
    if (!payTreasury(cost, 'Construction · ' + b.name)) {
      if (G.ui) G.ui.toast('💳 Fonds insuffisants', 'Il faut ' + u.fmtMoney(cost), 'bad');
      return false;
    }
    n.buildings[id] = (n.buildings[id] || 0) + qty;
    journal('🏗️ Construction : ' + qty + ' × ' + b.name + '.');
    return true;
  }

  function demolish(id) {
    var n = get();
    if (!n.buildings[id]) return false;
    n.buildings[id]--;
    n.treasury += buildCost(buildingDef(id)) * 0.3;
    return true;
  }

  /* ============================================================ ARMÉE ===== */

  function recruit(id, qty) {
    var n = get();
    var un = unitDef(id);
    if (!un) return false;
    if (un.tech && !n.techs[un.tech]) return false;
    if (un.sea && countryDef(n.code).lock) return false;
    qty = Math.max(1, qty || 1);
    var cost = unitCost(un) * qty;
    if (!payTreasury(cost, 'Recrutement · ' + un.name)) {
      if (G.ui) G.ui.toast('💳 Fonds insuffisants', 'Il faut ' + u.fmtMoney(cost), 'bad');
      return false;
    }
    n.army[id] = (n.army[id] || 0) + qty;
    if (id === 'nuke') {
      journal('☢️ Essai nucléaire réussi : le monde proteste.');
      adjustAllRelations(-8);
    }
    return true;
  }

  function disband(id, qty) {
    var n = get();
    if (!n.army[id]) return false;
    qty = Math.min(qty || 1, n.army[id]);
    n.army[id] -= qty;
    n.treasury += unitCost(unitDef(id)) * qty * 0.25;
    return true;
  }

  /** Puissance militaire du joueur, tous domaines confondus. */
  function militaryPower(includeNukes) {
    var n = get();
    var p = 0;
    for (var id in n.army) {
      var un = unitDef(id);
      if (!un) continue;
      if (un.id === 'nuke' && !includeNukes) continue;
      p += n.army[id] * (un.atk + un.def) / 2;
    }
    var sheet = balanceSheet();
    p *= 1 + sheet.army / 400;
    if (n.ministers.defense) p *= 1 + n.ministers.defense.skill / 100;
    var ideo = ideologyDef(n.ideology);
    if (ideo && ideo.bonus.army) p *= 1 + ideo.bonus.army / 100;
    /* Une armée mal ravitaillée se bat mal. */
    if (n.res.oil < 0) p *= 0.7;
    return p;
  }

  function ideologyDef(id) {
    for (var i = 0; i < G.DATA.ideologies.length; i++) {
      if (G.DATA.ideologies[i].id === id) return G.DATA.ideologies[i];
    }
    return null;
  }

  /* ======================================================== DIPLOMATIE ==== */

  function relation(code) { return worldEntry(code).rel; }

  function adjustRelation(code, delta) {
    var w = worldEntry(code);
    w.rel = u.clamp(w.rel + delta, -100, 100);
  }

  function adjustAllRelations(delta) {
    var n = get();
    for (var i = 0; i < G.DATA.world.length; i++) {
      var code = G.DATA.world[i].id;
      if (controls(code)) continue;
      worldEntry(code);
      n.world[code].rel = u.clamp(n.world[code].rel + delta, -100, 100);
    }
  }

  /** Cadeau diplomatique : améliore durablement la relation. */
  function gift(code, amount) {
    var n = get();
    if (amount <= 0) return false;
    if (!payTreasury(amount, 'Aide financière')) return false;
    var gain = u.clamp(amount / (n.gdp / 12) * 60, 0.5, 25);
    adjustRelation(code, gain);
    journal('🎁 Aide financière à ' + countryDef(code).n + ' (+' + u.dec(gain, 1) + ').');
    return true;
  }

  function signPact(code) {
    var n = get();
    if (relation(code) < 20) {
      if (G.ui) G.ui.toast('🕊️ Refus', 'Relations trop froides (il faut +20)', 'bad');
      return false;
    }
    n.pacts[code] = n.month + 60;
    adjustRelation(code, 8);
    journal('📜 Pacte de non-agression signé avec ' + countryDef(code).n + '.');
    return true;
  }

  function signAlliance(code) {
    var n = get();
    if (relation(code) < 55) {
      if (G.ui) G.ui.toast('🤝 Refus', 'Relations insuffisantes (il faut +55)', 'bad');
      return false;
    }
    n.allies[code] = true;
    adjustRelation(code, 10);
    journal('🤝 Alliance militaire conclue avec ' + countryDef(code).n + '.');
    return true;
  }

  function breakAlliance(code) {
    var n = get();
    delete n.allies[code];
    adjustRelation(code, -30);
    journal('💔 Rupture de l\'alliance avec ' + countryDef(code).n + '.');
    return true;
  }

  /* ============================================================ GUERRE ==== */

  function warWith(code) {
    var n = get();
    for (var i = 0; i < n.wars.length; i++) if (n.wars[i].code === code) return n.wars[i];
    return null;
  }

  function declareWar(code) {
    var n = get();
    if (controls(code) || warWith(code)) return false;
    if (n.pacts[code] && n.pacts[code] > n.month) {
      if (G.ui) G.ui.toast('📜 Pacte en vigueur', 'Rompez d\'abord le pacte de non-agression', 'bad');
      return false;
    }
    var w = worldEntry(code);
    n.wars.push({ code: code, since: n.month, front: 50, losses: 0, enemyLosses: 0 });
    adjustRelation(code, -60);
    adjustAllRelations(-6);
    n.ind.popularite = u.clamp(n.ind.popularite +
      (n.ideology === 'autoritaire' ? 2 : -6), 1, 99);
    journal('⚔️ Déclaration de guerre à ' + countryDef(code).n + '.');
    if (G.ui) G.ui.toast('⚔️ Guerre déclarée', countryDef(code).n, 'bad');
    return true;
  }

  /** Force d'un ennemi, alliés compris. */
  function enemyPower(code) {
    var n = get();
    var w = worldEntry(code);
    var p = w.mil * 10;
    /* Les alliés de l'ennemi ne sont pas modélisés individuellement :
       on applique une prime de coalition si le pays est populaire. */
    if (w.rel < -40) p *= 1.1;
    return p;
  }

  function alliedSupport() {
    var n = get(), sup = 0;
    for (var code in n.allies) sup += worldEntry(code).mil * 3;
    return sup;
  }

  /** Résout un mois de guerre. */
  function resolveWars(report) {
    var n = get();
    for (var i = n.wars.length - 1; i >= 0; i--) {
      var war = n.wars[i];
      var mine = militaryPower(false) + alliedSupport();
      var theirs = enemyPower(war.code);
      var ratio = mine / Math.max(1, mine + theirs);
      var shift = (ratio - 0.5) * 38 + u.gauss(0, 5);
      war.front = u.clamp(war.front + shift, 0, 100);

      /* Pertes des deux côtés. */
      var lossRate = 0.05 + Math.max(0, 0.5 - ratio) * 0.14;
      applyLosses(lossRate);
      war.losses += lossRate;
      war.enemyLosses += 0.06 + Math.max(0, ratio - 0.5) * 0.16;
      worldEntry(war.code).mil *= (1 - (0.06 + Math.max(0, ratio - 0.5) * 0.16));

      /* Coût humain et politique. */
      n.ind.popularite = u.clamp(n.ind.popularite +
        (shift > 6 ? 1.5 : shift < -6 ? -3 : -0.8), 1, 99);
      n.ind.stabilite = u.clamp(n.ind.stabilite - 0.8, 1, 99);

      if (war.front >= 100) {
        report.events.push('Victoire militaire sur ' + countryDef(war.code).n + ' !');
        journal('🏆 Victoire totale contre ' + countryDef(war.code).n + '.');
        winWar(war.code);
        n.wars.splice(i, 1);
      } else if (war.front <= 0) {
        report.events.push('Défaite face à ' + countryDef(war.code).n + '.');
        journal('🏳️ Capitulation devant ' + countryDef(war.code).n + '.');
        loseWar(war.code);
        n.wars.splice(i, 1);
      }
    }
  }

  function applyLosses(rate) {
    var n = get();
    for (var id in n.army) {
      if (id === 'nuke') continue;
      n.army[id] = Math.max(0, Math.round(n.army[id] * (1 - rate * u.rfloat(0.6, 1.4))));
    }
  }

  /** Annexion : le pays vaincu rejoint votre territoire. */
  function winWar(code) {
    var n = get();
    var d = countryDef(code);
    if (!d) return;
    n.annexed.push(code);
    worldEntry(code).owner = n.code;
    n.pop += d.pop;
    n.gdp += gdpOf(d) * 0.75;          // l'économie occupée tourne au ralenti
    n.treasury += gdpOf(d) * 0.02;
    n.ind.stabilite = u.clamp(n.ind.stabilite - 12, 1, 99);
    n.ind.popularite = u.clamp(n.ind.popularite +
      (n.ideology === 'autoritaire' ? 8 : 3), 1, 99);
    adjustAllRelations(-12);
    /* Les infrastructures conquises s'ajoutent aux vôtres. */
    var extra = { ferme: Math.round(d.pop * 0.12), usine: Math.round(d.pop * 0.05),
      mine: Math.round(d.pop * 0.03), centrale: Math.round(d.pop * 0.03) };
    for (var b in extra) n.buildings[b] = (n.buildings[b] || 0) + extra[b];
    if (G.ui) G.ui.toast('🏴 Annexion', d.n + ' rejoint votre territoire', 'good');
  }

  function loseWar(code) {
    var n = get();
    var penalty = n.gdp * 0.03;
    n.treasury = Math.max(0, n.treasury - penalty);
    n.debt += penalty;
    n.ind.popularite = u.clamp(n.ind.popularite - 14, 1, 99);
    n.ind.stabilite = u.clamp(n.ind.stabilite - 14, 1, 99);
    /* Un territoire annexé peut faire sécession. */
    if (n.annexed.length && u.chance(0.5)) {
      var lost = n.annexed.pop();
      var d = countryDef(lost);
      if (d) {
        n.pop -= d.pop;
        n.gdp -= gdpOf(d) * 0.75;
        worldEntry(lost).owner = lost;
        journal('🏴 ' + d.n + ' retrouve son indépendance.');
      }
    }
  }

  function makePeace(code) {
    var n = get();
    var war = warWith(code);
    if (!war) return false;
    var cost = n.gdp * 0.01 * (war.front < 50 ? 1.8 : 0.5);
    if (!payTreasury(cost, 'Indemnités de paix')) {
      if (G.ui) G.ui.toast('💳 Fonds insuffisants', 'Indemnités : ' + u.fmtMoney(cost), 'bad');
      return false;
    }
    n.wars.splice(n.wars.indexOf(war), 1);
    adjustRelation(code, 25);
    n.ind.popularite = u.clamp(n.ind.popularite + 3, 1, 99);
    journal('🕊️ Paix signée avec ' + countryDef(code).n + '.');
    return true;
  }

  /** Frappe nucléaire : efficace, irréversible, universellement condamnée. */
  function nuke(code) {
    var n = get();
    if (!n.army.nuke || n.army.nuke < 1) return false;
    var war = warWith(code);
    n.army.nuke--;
    var w = worldEntry(code);
    w.mil *= 0.35;
    if (war) war.front = u.clamp(war.front + 45, 0, 100);
    adjustAllRelations(-45);
    n.ind.popularite = u.clamp(n.ind.popularite +
      (n.ideology === 'autoritaire' ? -5 : -25), 1, 99);
    n.ind.pollution = u.clamp(n.ind.pollution + 15, 0, 100);
    journal('☢️ Frappe nucléaire sur ' + countryDef(code).n + '. L\'histoire jugera.');
    if (G.ui) G.ui.toast('☢️ Frappe nucléaire', 'Le monde entier condamne', 'bad');

    /* Riposte éventuelle. */
    if (hasNukes(code) && u.chance(0.6)) {
      n.pop *= 0.94;
      n.gdp *= 0.88;
      n.ind.stabilite = u.clamp(n.ind.stabilite - 25, 1, 99);
      journal('💥 Riposte nucléaire subie : pertes considérables.');
    }
    return true;
  }

  /* ============================================================== ONU ===== */

  function resolutionDef(id) {
    for (var i = 0; i < G.DATA.resolutions.length; i++) {
      if (G.DATA.resolutions[i].id === id) return G.DATA.resolutions[i];
    }
    return null;
  }

  /** Estime le nombre de voix favorables (sur 100). */
  function voteEstimate(resId, targetCode, bribe) {
    var n = get();
    var base = 32 + n.ind.unInfluence * 0.6;
    if (n.ministers.affaires) base += n.ministers.affaires.skill * 0.25;
    if (n.orgs.fmi) base += 5;
    var ideo = ideologyDef(n.ideology);
    if (ideo && ideo.bonus.diplo) base += ideo.bonus.diplo * 0.4;
    /* Une cible populaire est plus difficile à sanctionner. */
    if (targetCode) base -= u.clamp(relation(targetCode) * 0.1, -6, 10);
    base += Math.min(30, (bribe || 0) / (n.gdp / 12) * 120);
    return u.clamp(base, 3, 97);
  }

  function proposeResolution(resId, targetCode, bribe) {
    var n = get();
    var r = resolutionDef(resId);
    if (!r) return null;
    var cost = r.cost * costFactor() + (bribe || 0);
    if (!payTreasury(cost, 'Résolution · ' + r.name)) {
      if (G.ui) G.ui.toast('💳 Fonds insuffisants', 'Il faut ' + u.fmtMoney(cost), 'bad');
      return null;
    }
    var votes = voteEstimate(resId, targetCode, bribe);
    var passed = u.rnd() * 100 < votes;

    if (passed) {
      applyResolution(r, targetCode);
      n.ind.unInfluence = u.clamp(n.ind.unInfluence + 4, 0, 100);
      journal('🇺🇳 Résolution adoptée : ' + r.name + '.');
    } else {
      n.ind.unInfluence = u.clamp(n.ind.unInfluence - 2, 0, 100);
      journal('🇺🇳 Résolution rejetée : ' + r.name + '.');
    }
    return { passed: passed, votes: Math.round(votes) };
  }

  function applyResolution(r, targetCode) {
    var n = get();
    if (r.id === 'sanctions' && targetCode) {
      n.sanctions[targetCode] = n.month + 12;
      worldEntry(targetCode).gdp *= 0.9;
      worldEntry(targetCode).mil *= 0.95;
      adjustRelation(targetCode, -20);
    } else if (r.id === 'embargo' && targetCode) {
      worldEntry(targetCode).mil *= 0.85;
      adjustRelation(targetCode, -15);
    } else if (r.id === 'paix' && targetCode) {
      var war = warWith(targetCode);
      if (war) n.wars.splice(n.wars.indexOf(war), 1);
      adjustRelation(targetCode, 15);
    } else if (r.id === 'aide') {
      adjustAllRelations(10);
      n.ind.popularite = u.clamp(n.ind.popularite + 3, 1, 99);
    } else if (r.id === 'climat') {
      n.ind.pollution = u.clamp(n.ind.pollution - 20, 0, 100);
      adjustAllRelations(6);
    } else if (r.id === 'libre') {
      n.tradeBonus = 0.25;
      adjustAllRelations(5);
    }
  }

  function orgDef(id) {
    for (var i = 0; i < G.DATA.organisations.length; i++) {
      if (G.DATA.organisations[i].id === id) return G.DATA.organisations[i];
    }
    return null;
  }

  function joinOrg(id) {
    var n = get();
    var o = orgDef(id);
    if (!o || n.orgs[id]) return false;
    var cost = o.cost * costFactor();
    if (!payTreasury(cost, 'Adhésion · ' + o.name)) {
      if (G.ui) G.ui.toast('💳 Fonds insuffisants', 'Il faut ' + u.fmtMoney(cost), 'bad');
      return false;
    }
    n.orgs[id] = true;
    n.ind.unInfluence = u.clamp(n.ind.unInfluence + 8, 0, 100);
    journal('🌐 Vous prenez la direction de ' + o.name + '.');
    return true;
  }

  /* ====================================================== TECHNOLOGIES ==== */

  function canResearch(t) {
    var n = get();
    if (n.techs[t.id]) return false;
    for (var i = 0; i < t.req.length; i++) if (!n.techs[t.req[i]]) return false;
    return true;
  }

  function research(id) {
    var n = get();
    var t = techDef(id);
    if (!t || !canResearch(t)) return false;
    if (n.res.tech < t.cost) {
      if (G.ui) G.ui.toast('🔬 Recherche insuffisante', 'Il faut ' + Math.round(t.cost) +
        ' points', 'bad');
      return false;
    }
    n.res.tech -= t.cost;
    n.techs[id] = true;
    journal('🔬 Technologie maîtrisée : ' + t.name + '.');
    if (id === 'atomique') adjustAllRelations(-12);
    return true;
  }

  /* ========================================================= MINISTRES ==== */

  function candidates(postId) {
    var list = [];
    for (var i = 0; i < 3; i++) {
      list.push({
        name: u.pick(G.DATA.firstNames) + ' ' + u.pick(G.DATA.lastNames),
        trait: u.pick(G.DATA.ministerTraits),
        skill: u.rint(25, 95),
        salary: 0
      });
    }
    return list;
  }

  function appoint(postId, person) {
    var n = get();
    n.ministers[postId] = {
      name: person.name, trait: person.trait, skill: person.skill, since: n.month
    };
    journal('👤 ' + person.name + ' nommé(e) ' +
      G.DATA.ministers.filter(function (m) { return m.id === postId; })[0].name + '.');
    if (person.trait === 'Populaire') n.ind.popularite = u.clamp(n.ind.popularite + 2, 1, 99);
    if (person.trait === 'Corrompu') n.ind.stabilite = u.clamp(n.ind.stabilite - 3, 1, 99);
    return true;
  }

  /* ======================================================== MERVEILLES ==== */

  function wonderDef(id) {
    for (var i = 0; i < G.DATA.wonders.length; i++) {
      if (G.DATA.wonders[i].id === id) return G.DATA.wonders[i];
    }
    return null;
  }

  function buildWonder(id) {
    var n = get();
    var w = wonderDef(id);
    if (!w || n.wonders[id]) return false;
    if (w.tech && !n.techs[w.tech]) return false;
    var cost = w.cost * costFactor();
    if (!payTreasury(cost, 'Merveille · ' + w.name)) {
      if (G.ui) G.ui.toast('💳 Fonds insuffisants', 'Il faut ' + u.fmtMoney(cost), 'bad');
      return false;
    }
    n.wonders[id] = true;
    n.ind.tourisme = u.clamp(n.ind.tourisme + w.tourism, 0, 100);
    n.ind.popularite = u.clamp(n.ind.popularite + w.pop, 1, 99);
    journal('🏛️ Inauguration : ' + w.name + '.');
    return true;
  }

  /* ====================================================== IDÉOLOGIE ======= */

  function setIdeology(id) {
    var n = get();
    if (n.ideology === id) return false;
    n.ideology = id;
    n.ind.stabilite = u.clamp(n.ind.stabilite - 15, 1, 99);
    n.ind.popularite = u.clamp(n.ind.popularite - 5, 1, 99);
    journal('📜 Changement de régime : ' + ideologyDef(id).name + '.');
    return true;
  }

  /** Diffuse la religion d'État à l'étranger. */
  function spreadFaith(amount) {
    var n = get();
    if (!payTreasury(amount, 'Campagne religieuse')) return false;
    var gain = u.clamp(amount / (n.gdp / 12) * 40, 0.5, 12);
    n.ind.faith = u.clamp(n.ind.faith + gain, 0, 100);
    n.ind.stabilite = u.clamp(n.ind.stabilite + gain * 0.3, 1, 99);
    journal('🕊️ Campagne d\'influence religieuse (+' + u.dec(gain, 1) + ').');
    return true;
  }

  /* ======================================================= TOUR DE JEU ==== */

  function endMonth() {
    var n = get();
    if (!n) return null;
    var report = { events: [], month: n.month };
    var i, id;

    /* --- ressources --- */
    var sheet = balanceSheet();
    for (id in sheet.net) {
      n.res[id] = (n.res[id] || 0) + sheet.net[id];
    }
    /* Les pénuries sont comblées par des importations d'urgence, coûteuses. */
    var emergency = 0;
    for (id in n.res) {
      if (id === 'tech') continue;
      if (n.res[id] < 0) {
        var deficit = -n.res[id];
        emergency += deficit * resourcePrice(id) * 1.5;
        n.res[id] = 0;
        if (id === 'food') {
          n.ind.popularite = u.clamp(n.ind.popularite - Math.min(8, deficit / n.pop), 1, 99);
        }
      }
    }
    report.emergency = emergency;

    /* --- comptes publics --- */
    var rev = revenue(), spend = spending() + emergency;
    var bal = rev - spend;
    n.treasury += bal;
    if (n.treasury < 0) { n.debt += -n.treasury; n.treasury = 0; }
    else if (n.debt > 0 && n.treasury > n.gdp * 0.02) {
      var repay = Math.min(n.debt, (n.treasury - n.gdp * 0.02) * 0.5);
      n.debt -= repay; n.treasury -= repay;
    }
    report.revenue = rev; report.spending = spend; report.balance = bal;

    /* --- services publics --- */
    var m = { sante: 0.085, education: 0.055, securite: 0.030, social: 0.075 };
    for (id in m) {
      var ratio = (n.budgets[id] || 0) / m[id];
      if (typeof n.ind[id] !== 'number' || isNaN(n.ind[id])) n.ind[id] = 50;
      var target = u.clamp(28 + ratio * 34, 5, 98);
      if (id === 'sante') target += sheet.health / n.pop * 30 + (n.techs.medecine ? 10 : 0);
      if (id === 'education') target += sheet.edu / n.pop * 30;
      n.ind[id] = u.lerp(n.ind[id], u.clamp(target, 5, 99), 0.16);
    }

    /* --- croissance --- */
    var ideo = ideologyDef(n.ideology) || { bonus: {} };
    var taxDrag = -(n.taxes.corp - 22) * 0.020 - (n.taxes.income - 28) * 0.008;
    var indus = Math.min(2.5, sheet.prod.goods / Math.max(1, n.pop * 6));
    var debtDrag = -Math.max(0, n.debt / n.gdp - 0.9) * 1.1;
    var lawGrowth = 0, lawPop = 0, lawUnemp = 0;
    for (id in n.laws) {
      var l = lawDef(id);
      if (!l) continue;
      lawGrowth += (l.effects.croissance || 0) + (l.effects.croissanceLT || 0) * 0.5;
      lawPop += l.effects.popularite || 0;
      lawUnemp += l.effects.chomage || 0;
    }
    var techGrowth = (n.techs.informatique ? 0.4 : 0) + (n.techs.ia ? 0.5 : 0) +
      (n.techs.spatial ? 0.2 : 0);
    var warDrag = -n.wars.length * 0.5;
    var target2 = 0.9 + taxDrag + indus * 0.5 + debtDrag + lawGrowth + techGrowth +
      warDrag + (ideo.bonus.growth || 0) + u.gauss(0, 0.3);
    n.ind.croissance = u.clamp(u.lerp(n.ind.croissance, target2, 0.35), -8, 10);

    /* --- emploi, prix, pollution --- */
    /* Un pays très industrialisé emploie mieux, mais le plein emploi ne
       s'atteint jamais complètement. */
    var jobsRatio = sheet.jobs / Math.max(1, n.pop);
    var unempTarget = u.clamp(14 - jobsRatio * 2.2 - n.ind.croissance * 0.9 + lawUnemp,
      2.5, 32);
    n.ind.chomage = u.clamp(u.lerp(n.ind.chomage, unempTarget, 0.22), 1.5, 35);

    var deficitRatio = -bal / (n.gdp / 12);
    var inflTarget = 1.6 + n.ind.croissance * 0.22 + Math.max(0, deficitRatio) * 2.2;
    n.ind.inflation = u.clamp(u.lerp(n.ind.inflation, inflTarget, 0.25), -2, 25);

    n.ind.pollution = u.clamp(u.lerp(n.ind.pollution,
      u.clamp(sheet.pollution / Math.max(1, n.pop) * 18, 0, 100), 0.15), 0, 100);

    /* --- popularité --- */
    var services = (n.ind.sante + n.ind.education + n.ind.securite + n.ind.social) / 4;
    var popTarget = 18 + services * 0.55
      - (n.ind.chomage - 7) * 1.8
      - Math.max(0, n.ind.inflation - 3) * 2.2
      - (n.taxes.income - 30) * 0.30 - (n.taxes.vat - 20) * 0.35
      + n.ind.croissance * 1.4
      + lawPop * 2.2
      + n.ind.tourisme * 0.10
      - n.ind.pollution * 0.10
      + (ideo.bonus.pop || 0);
    popTarget *= (1 + G.eco.bonus('pop'));
    n.ind.popularite = u.clamp(u.lerp(n.ind.popularite, u.clamp(popTarget, 2, 96), 0.28), 1, 99);

    n.ind.stabilite = u.clamp(u.lerp(n.ind.stabilite,
      28 + n.ind.popularite * 0.5 + (n.ind.securite - 50) * 0.25 +
      (ideo.bonus.stab || 0) + n.ind.faith * 0.08 - n.annexed.length * 2, 0.22), 1, 99);

    n.ind.unInfluence = u.clamp(n.ind.unInfluence + 0.4 +
      (n.orgs.fmi ? 0.3 : 0) + (n.ind.popularite > 60 ? 0.2 : 0), 0, 100);

    /* --- guerres --- */
    resolveWars(report);

    /* --- évènement du mois --- */
    var ev = u.weighted(G.DATA.nationEvents.map(function (e) { return [e, e.w]; }));
    applyEvent(ev, report);

    /* --- réactions du monde --- */
    worldTurn();

    /* --- croissance du PIB et de la population --- */
    n.gdp *= (1 + n.ind.croissance / 100 / 12);
    n.pop *= (1 + 0.004 / 12);
    if (n.subsidyMonths > 0) n.subsidyMonths--;

    n.month++;
    n.monthsInTerm++;
    n.history.push({
      m: n.month, pop: Math.round(n.ind.popularite),
      croissance: +n.ind.croissance.toFixed(2),
      dette: +(n.debt / n.gdp * 100).toFixed(1)
    });
    if (n.history.length > 120) n.history.shift();

    /* --- fin de mandat --- */
    if (n.monthsInTerm >= TERM_MONTHS) report.election = election();

    /* --- révolution --- */
    if (get() && n.ind.stabilite < 8 && n.ind.popularite < 15) {
      report.ousted = true;
      journal('🚨 Renversement du gouvernement.');
      loseCountry('Un soulèvement populaire vous a chassé du pouvoir.');
    }
    return report;
  }

  function applyEvent(ev, report) {
    var n = get();
    if (ev.pop) n.ind.popularite = u.clamp(n.ind.popularite + ev.pop, 1, 99);
    if (ev.growth) n.ind.croissance = u.clamp(n.ind.croissance + ev.growth, -8, 10);
    if (ev.stab) n.ind.stabilite = u.clamp(n.ind.stabilite + ev.stab, 1, 99);
    if (ev.infl) n.ind.inflation = u.clamp(n.ind.inflation + ev.infl, -2, 25);
    if (ev.diplo) adjustAllRelations(ev.diplo);
    if (ev.tourism) n.ind.tourisme = u.clamp(n.ind.tourisme + ev.tourism, 0, 100);
    if (ev.tech) n.res.tech += ev.tech;
    if (ev.res) for (var r in ev.res) n.res[r] += ev.res[r];
    if (ev.cost) {
      var c = n.gdp / 12 * ev.cost;
      n.treasury -= c;
      if (n.treasury < 0) { n.debt += -n.treasury; n.treasury = 0; }
    }
    if (ev.market) G.market.addBoost(u.pick(G.DATA.stocks).id, ev.market);
    if (ev.epidemic && !n.orgs.oms) {
      var severity = u.clamp(12 - n.ind.sante * 0.1, 2, 12);
      n.pop *= (1 - severity / 1000);
      n.ind.sante = u.clamp(n.ind.sante - severity, 1, 99);
    }
    report.events.push(ev.txt);
    journal('📰 ' + ev.txt);
  }

  /** Le reste du monde bouge un peu chaque mois. */
  function worldTurn() {
    var n = get();
    var codes = Object.keys(n.world);
    for (var i = 0; i < codes.length; i++) {
      var w = n.world[codes[i]];
      if (w.owner !== codes[i]) continue;
      w.mil *= 1 + u.rfloat(-0.01, 0.022);
      /* Les relations reviennent lentement vers la neutralité. */
      w.rel = u.lerp(w.rel, n.allies[codes[i]] ? 60 : 5, 0.03);
      if (n.sanctions[codes[i]] && n.sanctions[codes[i]] < n.month) {
        delete n.sanctions[codes[i]];
      }
    }
    /* Un pays très hostile et bien plus fort peut vous déclarer la guerre. */
    if (u.chance(0.03)) {
      var hostile = null;
      for (i = 0; i < codes.length; i++) {
        var e = n.world[codes[i]];
        if (e.owner !== codes[i] || controls(codes[i])) continue;
        if (e.rel < -55 && !warWith(codes[i]) && !n.pacts[codes[i]]) hostile = codes[i];
      }
      if (hostile) {
        n.wars.push({ code: hostile, since: n.month, front: 50, losses: 0, enemyLosses: 0 });
        journal('⚔️ ' + countryDef(hostile).n + ' vous déclare la guerre !');
        if (G.ui) G.ui.toast('⚔️ Guerre !', countryDef(hostile).n + ' vous attaque', 'bad');
      }
    }
  }

  function election() {
    var n = get();
    var ideo = ideologyDef(n.ideology);
    /* Les régimes autoritaires n'organisent pas de vraies élections. */
    if (n.ideology === 'autoritaire' || n.ideology === 'theocratie') {
      n.term++;
      n.monthsInTerm = 0;
      journal('🗳️ Plébiscite organisé : 96 % des voix.');
      return { won: true, score: 96, staged: true };
    }
    var score = n.ind.popularite + (n.ind.croissance - 1.5) * 2 - (n.ind.chomage - 7) * 0.8;
    if (score >= 45) {
      n.term++;
      n.monthsInTerm = 0;
      n.ind.popularite = u.clamp(n.ind.popularite + 4, 1, 99);
      journal('🗳️ Réélu pour un nouveau mandat (score ' + Math.round(score) + ').');
      /* Bonus de réélection : récompense pour la victoire électorale. */
      var reelectionBonus = n.gdp * 0.0001 * (Math.max(45, score) - 45) / 55;
      if (reelectionBonus > 0) {
        G.eco.earn(reelectionBonus, 'pays', 'Bonus de réélection');
      }
      if (G.ui) G.ui.toast('🗳️ Réélu !', n.name + ' vous renouvelle sa confiance', 'good');
      return { won: true, score: score };
    }
    journal('🗳️ Défaite électorale (score ' + Math.round(score) + ').');
    loseCountry('Vous avez perdu les élections.');
    return { won: false, score: score };
  }

  function loseCountry(reason) {
    var n = get();
    if (!n) return;
    /* Bonus de fin de mandat basé sur la performance. */
    var performanceScore = (n.ind.popularite - 50) / 100 +
      n.ind.croissance / 20 +
      (50 - n.ind.chomage) / 100;
    performanceScore = u.clamp(performanceScore, -0.5, 1);

    /* Indemnité base : trésor du pays + bonus de performance. */
    var baseIndemnity = n.treasury * 0.02;
    var performanceBonus = n.gdp * 0.0002 * Math.max(0, performanceScore);
    var golden = baseIndemnity + performanceBonus;

    G.state.nation = null;
    if (golden > 0) {
      G.eco.earn(golden, 'pays', 'Bonus de fin de mandat');
    }
    if (G.ui) G.ui.toast('🏛️ Fin de mandat', reason, 'bad');
  }

  /* ================================================ LIENS AVEC L'EMPIRE === */

  function setTax(kind, value) {
    var n = get();
    if (n) n.taxes[kind] = u.clamp(Math.round(value), 0, 70);
  }

  function setBudget(id, value) {
    var n = get();
    if (n) n.budgets[id] = u.clamp(value, 0, 0.30);
  }

  function totalBudget() {
    var n = get(), t = 0;
    for (var id in n.budgets) t += n.budgets[id];
    return t;
  }

  function voteLaw(id) {
    var n = get();
    var l = lawDef(id);
    if (!n || !l || n.laws[id]) return false;
    n.laws[id] = { since: n.month };
    n.ind.popularite = u.clamp(n.ind.popularite + l.pop, 1, 99);
    if (l.effects.marche) {
      G.market.addBoost(u.pick(G.DATA.stocks).id, l.effects.marche, 'Nouvelle loi : ' + l.name);
    }
    journal('⚖️ Loi votée : ' + l.name + '.');
    return true;
  }

  function repealLaw(id) {
    var n = get();
    var l = lawDef(id);
    if (!n || !l || !n.laws[id]) return false;
    delete n.laws[id];
    n.ind.popularite = u.clamp(n.ind.popularite - l.pop * 0.6, 1, 99);
    journal('⚖️ Abrogation : ' + l.name + '.');
    return true;
  }

  function drawSalary() {
    var n = get();
    if (!n) return false;
    var amount = Math.min(n.treasury, n.gdp * 0.0000008 * 12);
    if (amount <= 0) return false;
    n.treasury -= amount;
    G.eco.earn(amount, 'pays', 'Traitement de chef de l\'État');
    return true;
  }

  function subsidize() {
    var n = get();
    if (!n) return false;
    var cost = n.gdp * 0.004;
    if (n.treasury < cost) {
      if (G.ui) G.ui.toast('🏛️ Trésor insuffisant', 'Il faut ' + u.fmtMoney(cost), 'bad');
      return false;
    }
    n.treasury -= cost;
    n.subsidyMonths = 6;
    n.ind.popularite = u.clamp(n.ind.popularite - 5, 1, 99);
    journal('💰 Plan de soutien à l\'industrie nationale.');
    if (G.ui) {
      G.ui.toast('🏛️ Subvention accordée', 'Vos entreprises produisent +25 % pendant 6 mois', 'good');
    }
    return true;
  }

  function injectFunds(amount) {
    var n = get();
    if (!n || amount <= 0) return false;
    if (!G.eco.spend(amount, 'pays', 'Don au Trésor public')) return false;
    n.treasury += amount;
    var pop = u.clamp(amount / (n.gdp * 0.002) * 3, 0, 9);
    n.ind.popularite = u.clamp(n.ind.popularite + pop, 1, 99);
    journal('🤝 Don personnel de ' + u.fmtMoney(amount) + ' au Trésor.');
    return true;
  }

  /** Emprunt auprès de la banque centrale (ou remboursement anticipé). */
  function borrow(amount) {
    var n = get();
    if (!n || amount <= 0) return false;
    var ceiling = n.gdp * 1.6;
    if (n.debt + amount > ceiling) {
      if (G.ui) G.ui.toast('🏦 Plafond atteint', 'La dette ne peut dépasser 160 % du PIB', 'bad');
      return false;
    }
    n.debt += amount;
    n.treasury += amount;
    journal('🏦 Émission obligataire de ' + u.fmtMoney(amount) + '.');
    return true;
  }

  function repay(amount) {
    var n = get();
    if (!n || amount <= 0) return false;
    amount = Math.min(amount, n.treasury, n.debt);
    if (amount <= 0) return false;
    n.treasury -= amount;
    n.debt -= amount;
    return true;
  }

  function marketEffect() {
    var n = get();
    if (!n) return 0;
    return u.clamp((n.ind.croissance - 1.5) * 0.09 +
      (n.ind.stabilite - 55) * 0.004 -
      Math.max(0, n.ind.inflation - 4) * 0.05 -
      n.wars.length * 0.06, -0.8, 0.6);
  }

  function bizMultiplier() {
    var n = get();
    if (!n) return 1;
    var m = 1 + (n.ind.croissance - 1.5) * 0.02 - (n.taxes.corp - 25) * 0.004;
    if (n.subsidyMonths > 0) m += 0.25;
    if (n.techs.ia) m += 0.05;
    return u.clamp(m, 0.55, 2.4);
  }

  function debtRatio() {
    var n = get();
    return n ? n.debt / n.gdp * 100 : 0;
  }

  /** Puissance mondiale : rang du pays parmi tous les autres. */
  function worldRank() {
    var n = get();
    if (!n) return 0;
    var mine = militaryPower(true);
    var better = 0;
    for (var i = 0; i < G.DATA.world.length; i++) {
      var code = G.DATA.world[i].id;
      if (controls(code)) continue;
      if (baseMilitary(code) * 10 > mine) better++;
    }
    return better + 1;
  }

  return {
    TERM_MONTHS: TERM_MONTHS,
    get: get, countryDef: countryDef, gdpOf: gdpOf, buildingDef: buildingDef, unitDef: unitDef,
    techDef: techDef, lawDef: lawDef, ideologyDef: ideologyDef, wonderDef: wonderDef,
    resolutionDef: resolutionDef, orgDef: orgDef,
    campaignCost: campaignCost, canRun: canRun, elect: elect,
    payTreasury: payTreasury, canAffordTreasury: canAffordTreasury,
    togglePersonalFund: togglePersonalFund,
    baseMilitary: baseMilitary, hasNukes: hasNukes, worldEntry: worldEntry,
    owned: owned, controls: controls,
    costFactor: costFactor, buildCost: buildCost, unitCost: unitCost,
    resourcePrice: resourcePrice, balanceSheet: balanceSheet,
    revenue: revenue, spending: spending, balance: balance, trade: trade,
    canBuild: canBuild, build: build, demolish: demolish,
    recruit: recruit, disband: disband, militaryPower: militaryPower,
    relation: relation, adjustRelation: adjustRelation, gift: gift,
    signPact: signPact, signAlliance: signAlliance, breakAlliance: breakAlliance,
    warWith: warWith, declareWar: declareWar, makePeace: makePeace, nuke: nuke,
    enemyPower: enemyPower,
    voteEstimate: voteEstimate, proposeResolution: proposeResolution, joinOrg: joinOrg,
    canResearch: canResearch, research: research,
    candidates: candidates, appoint: appoint,
    buildWonder: buildWonder, setIdeology: setIdeology, spreadFaith: spreadFaith,
    endMonth: endMonth, election: election, loseCountry: loseCountry,
    setTax: setTax, setBudget: setBudget, totalBudget: totalBudget,
    voteLaw: voteLaw, repealLaw: repealLaw,
    drawSalary: drawSalary, subsidize: subsidize, injectFunds: injectFunds,
    borrow: borrow, repay: repay,
    marketEffect: marketEffect, bizMultiplier: bizMultiplier, debtRatio: debtRatio,
    worldRank: worldRank, journal: journal
  };
})();
