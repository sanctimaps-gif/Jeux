/* Empire d'entreprises.
 *
 * On fonde une entreprise en choisissant son type dans le catalogue et en lui
 * donnant un nom. On l'ouvre ensuite pour investir dedans, palier par palier.
 * Les revenus s'accumulent en continu et sont **versés automatiquement toutes
 * les minutes** sur le compte en banque.
 */
window.G = window.G || {};

G.business = (function () {
  'use strict';
  var u = G.util;

  var UPGRADE_BASE_SECONDS = 1800;  // 30 min par palier, un seul à la fois
  var UPGRADE_MILESTONE_MULT = 6;   // franchir un cap (rendement ×2) prend bien plus longtemps

  function typeDef(id) { return G.DATA.companyById[id] || null; }

  function all() { return G.state.biz.companies; }

  function byUid(uid) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].uid === uid) return list[i];
    return null;
  }

  function count() { return all().length; }

  /* ------------------------------------------------------ emplacements -- */

  function slots() { return G.state.biz.slots; }

  function slotCost() {
    var n = G.state.biz.slots - G.DATA.slotBase;
    return 25000 * Math.pow(6.2, n);
  }

  function buySlot() {
    if (G.state.biz.slots >= G.DATA.slotMax) return false;
    var cost = slotCost();
    if (!G.eco.spend(cost, 'business', 'Nouvel emplacement commercial')) return false;
    G.state.biz.slots++;
    return true;
  }

  /* ---------------------------------------------------------- revenus --- */

  /** Multiplicateur de palier (×2 tous les 10 niveaux). */
  function milestoneMult(lvl) {
    var m = 1;
    for (var i = 0; i < G.DATA.companyMilestones.length; i++) {
      if (lvl >= G.DATA.companyMilestones[i]) m *= 2;
    }
    return m;
  }

  function nextMilestone(lvl) {
    for (var i = 0; i < G.DATA.companyMilestones.length; i++) {
      if (lvl < G.DATA.companyMilestones[i]) {
        return { at: G.DATA.companyMilestones[i], left: G.DATA.companyMilestones[i] - lvl };
      }
    }
    return null;
  }

  /** Multiplicateur global : collections, lois, conjoncture nationale. */
  function globalMult() {
    var m = 1 + G.eco.bonus('biz');
    if (G.nation && G.nation.bizMultiplier) m *= G.nation.bizMultiplier();
    return Math.max(0.1, m);
  }

  /** Revenu horaire total d'une flotte de véhicules (taxis, transport, maritime). */
  function fleetHourly(c, t) {
    var cats = t.fleet.categories, total = 0;
    for (var i = 0; i < cats.length; i++) {
      total += (c.fleetVehicles[cats[i].id] || 0) * cats[i].rev;
    }
    return total * (c.merged || 1) * globalMult();
  }

  /** Revenu horaire d'une entreprise. */
  function hourly(c) {
    var t = typeDef(c.type);
    if (!t) return 0;
    if (t.fleet) return fleetHourly(c, t);
    return t.rev * c.lvl * milestoneMult(c.lvl) * (c.merged || 1) * globalMult();
  }

  /** Revenu horaire total de l'empire. */
  function totalHourly() {
    var list = all(), total = 0;
    for (var i = 0; i < list.length; i++) total += hourly(list[i]);
    return total;
  }

  function perSecond() { return totalHourly() / 3600; }

  /* --------------------------------------------------- investissement --- */

  /** Coût du prochain palier d'investissement. */
  function upgradeCost(c) {
    var t = typeDef(c.type);
    if (!t) return Infinity;
    return t.cost * t.up * Math.pow(1.11, c.lvl - 1);
  }

  /**
   * Durée (en secondes) du chantier pour passer au palier suivant. Base de
   * 30 minutes ; franchir un cap de rendement (×2 tous les dix niveaux) est
   * un chantier bien plus important et prend six fois plus longtemps.
   * On ne peut investir qu'un seul palier à la fois : pas d'achat groupé.
   */
  function upgradeDuration(c) {
    var lvl = c.lvl + 1;
    var isMilestone = G.DATA.companyMilestones.indexOf(lvl) >= 0;
    return UPGRADE_BASE_SECONDS * (isMilestone ? UPGRADE_MILESTONE_MULT : 1);
  }

  function isUpgrading(c) { return !!(c && c.upgrade); }

  function upgradeRemaining(c) { return c && c.upgrade ? c.upgrade.remain : 0; }

  function upgradeProgress(c) {
    if (!c || !c.upgrade) return 0;
    return u.clamp(1 - c.upgrade.remain / c.upgrade.total, 0, 1);
  }

  /** Lance le chantier d'investissement d'un seul palier dans une entreprise. */
  function invest(uid) {
    var c = byUid(uid);
    if (!c) return false;
    var td = typeDef(c.type);
    if (td && td.fleet) return false;
    if (c.upgrade) {
      if (G.ui) G.ui.toast('🔨 Chantier en cours', 'Attendez la fin des travaux actuels', 'bad');
      return false;
    }
    var t = typeDef(c.type);
    if (c.lvl >= t.maxLvl) return false;

    var cost = upgradeCost(c);
    if (!G.eco.spend(cost, 'business', 'Investissement · ' + c.name, true)) return false;

    var duration = upgradeDuration(c);
    c.invested += cost;
    c.upgrade = { fromLvl: c.lvl, toLvl: c.lvl + 1, total: duration, remain: duration };
    if (G.ui) {
      G.ui.toast('🔨 Chantier lancé', c.name + ' · prêt dans ' +
        u.fmtDuration(duration * 1000), 'good');
    }
    return true;
  }

  /** Fait avancer les chantiers en cours ; applique le palier une fois prêt. */
  function tickUpgrades(dt, silent) {
    var list = all();
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c.upgrade) continue;
      c.upgrade.remain -= dt;
      if (c.upgrade.remain > 0) continue;

      var fromLvl = c.upgrade.fromLvl, toLvl = c.upgrade.toLvl;
      c.lvl = toLvl;
      c.upgrade = null;

      var crossed = null;
      for (var k = 0; k < G.DATA.companyMilestones.length; k++) {
        var ms = G.DATA.companyMilestones[k];
        if (ms > fromLvl && ms <= toLvl) crossed = ms;
      }
      if (!silent && G.ui) {
        if (crossed) {
          G.ui.toast('⭐ Palier atteint', c.name + ' niveau ' + crossed + ' : rendement doublé', 'good');
        } else {
          G.ui.toast('🏗️ Chantier terminé', c.name + ' niveau ' + toLvl, 'good');
        }
      }
    }
  }

  /* -------------------------------------------------------- fondation --- */

  function suggestName(type) {
    var p = G.DATA.nameParts;
    return u.pick(p.pre) + ' ' + u.pick(p.post);
  }

  function canFound(typeId) {
    var t = typeDef(typeId);
    if (!t || t.mergerOnly) return false;
    return count() < slots() && G.state.money >= t.cost;
  }

  /** Création brute d'une entreprise (fondation classique ou déblocage par fusion). */
  function _createCompany(t, name) {
    if (count() >= slots()) {
      if (G.ui) G.ui.toast('🏢 Aucun emplacement libre', 'Achetez un emplacement commercial', 'bad');
      return null;
    }
    if (!G.eco.spend(t.cost, 'business', 'Fondation · ' + (name || t.name))) return null;

    var c = {
      uid: u.uid('c'),
      type: t.id,
      name: (name || suggestName(t.id)).slice(0, 28),
      lvl: 1,
      invested: t.cost,
      merged: 1,
      founded: G.state.market.day
    };
    if (t.fleet) {
      c.fleetCapacity = t.fleet.baseCapacity;
      c.fleetVehicles = {};
      c.fleetCapBuys = 0;
    }
    all().push(c);
    return c;
  }

  /** Fonde une entreprise du type choisi, avec le nom voulu. */
  function found(typeId, name) {
    var t = typeDef(typeId);
    if (!t || t.mergerOnly) return null;
    return _createCompany(t, name);
  }

  function rename(uid, name) {
    var c = byUid(uid);
    if (!c || !name) return false;
    c.name = String(name).slice(0, 28);
    return true;
  }

  /** Valeur de revente d'une entreprise (70 % du capital investi). */
  function saleValue(c) {
    return c.invested * 0.7 * (c.merged || 1);
  }

  function sell(uid) {
    var c = byUid(uid);
    if (!c) return false;
    var v = saleValue(c);
    var list = all();
    list.splice(list.indexOf(c), 1);
    G.eco.earn(v, 'business', 'Cession · ' + c.name);
    return true;
  }

  /* ---------------------------------------------------------- fusions --- */

  /** Entreprises fusionnables avec celle-ci : même type, toutes deux au max. */
  function mergeCandidates(c) {
    var t = typeDef(c.type);
    if (!t || t.fleet) return [];
    return all().filter(function (o) {
      var ot = typeDef(o.type);
      return o.uid !== c.uid && o.type === c.type && !ot.fleet &&
        o.lvl >= ot.maxLvl && c.lvl >= t.maxLvl;
    });
  }

  function canMergeAny() {
    var list = all();
    for (var i = 0; i < list.length; i++) {
      var t = typeDef(list[i].type);
      if (t && !t.fleet && list[i].lvl >= t.maxLvl && mergeCandidates(list[i]).length) {
        return true;
      }
    }
    return false;
  }

  /**
   * Fusionne deux entreprises identiques arrivées au niveau maximum :
   * une seule subsiste, avec un multiplicateur de rendement, et un
   * emplacement se libère.
   */
  function merge(uidA, uidB) {
    var a = byUid(uidA), b = byUid(uidB);
    if (!a || !b || a.uid === b.uid || a.type !== b.type) return false;
    var t = typeDef(a.type);
    if (!t || t.fleet) return false;
    if (a.lvl < t.maxLvl || b.lvl < t.maxLvl) return false;

    a.merged = (a.merged || 1) + (b.merged || 1) * 0.75;
    a.invested += b.invested;
    a.name = a.name;
    var list = all();
    list.splice(list.indexOf(b), 1);
    if (G.ui) {
      G.ui.toast('🤝 Fusion réalisée', a.name + ' — rendement ×' +
        u.dec(a.merged, 2), 'good');
    }
    return true;
  }

  /* ------------------------------------------------------------ paie ---- */

  /**
   * Fait tourner les entreprises. Le revenu horaire est versé en continu,
   * seconde après seconde, plutôt que par lots toutes les minutes.
   * @returns {number} montant versé pendant cet appel
   */
  function tick(dt, silent) {
    var s = G.state;
    tickUpgrades(dt, silent);
    if (G.tax && G.tax.isBlocked()) return 0;
    var amount = totalHourly() / 3600 * dt;
    if (amount > 0) {
      G.eco.earn(amount, 'business', null, true);
      s.biz.totalPaid += amount;
    }
    return amount;
  }

  /** Nombre d'entreprises possédées dans un secteur (synergie boursière). */
  function sectorWeight(sector) {
    var list = all(), w = 0;
    for (var i = 0; i < list.length; i++) {
      var t = typeDef(list[i].type);
      if (!t || t.sector !== sector) continue;
      w += t.fleet ? Math.sqrt(fleetVehicleCount(list[i]) + 1) : Math.sqrt(list[i].lvl);
    }
    return w;
  }

  function totalValue() {
    var list = all(), total = 0;
    for (var i = 0; i < list.length; i++) total += saleValue(list[i]);
    return total;
  }

  /** Types disponibles à la fondation (débloqués par la fortune atteinte). */
  function catalog() {
    var reach = Math.max(G.state.money, G.state.stats.earned * 0.25);
    return G.DATA.companyTypes.filter(function (t, i) {
      if (t.mergerOnly) return false;
      return i < 3 || reach >= t.cost * 0.25;
    });
  }

  /* ------------------------------------------------------------ flottes -- */

  /** Nombre total de véhicules possédés par une entreprise de flotte. */
  function fleetVehicleCount(c) {
    if (!c.fleetVehicles) return 0;
    var total = 0;
    for (var k in c.fleetVehicles) total += c.fleetVehicles[k] || 0;
    return total;
  }

  function fleetCategoryDef(t, categoryId) {
    var cats = t.fleet.categories;
    for (var i = 0; i < cats.length; i++) if (cats[i].id === categoryId) return cats[i];
    return null;
  }

  /** Coût du prochain véhicule d'une catégorie donnée. */
  function fleetVehicleCost(c, categoryId) {
    var t = typeDef(c.type);
    var cat = t && t.fleet ? fleetCategoryDef(t, categoryId) : null;
    if (!cat) return Infinity;
    var owned = (c.fleetVehicles && c.fleetVehicles[categoryId]) || 0;
    return cat.baseCost * Math.pow(cat.costMult, owned);
  }

  function fleetCanBuyVehicle(c, categoryId) {
    return fleetVehicleCount(c) < c.fleetCapacity && G.state.money >= fleetVehicleCost(c, categoryId);
  }

  /** Achète un véhicule de plus dans la catégorie choisie. */
  function fleetBuyVehicle(uid, categoryId) {
    var c = byUid(uid);
    if (!c) return false;
    var t = typeDef(c.type);
    if (!t || !t.fleet) return false;
    if (fleetVehicleCount(c) >= c.fleetCapacity) {
      if (G.ui) G.ui.toast('🚧 Garage plein', 'Augmentez la capacité pour accueillir plus de véhicules', 'bad');
      return false;
    }
    var cat = fleetCategoryDef(t, categoryId);
    if (!cat) return false;
    var cost = fleetVehicleCost(c, categoryId);
    if (!G.eco.spend(cost, 'business', cat.name + ' · ' + c.name)) return false;
    c.fleetVehicles[categoryId] = (c.fleetVehicles[categoryId] || 0) + 1;
    c.invested += cost;
    if (G.ui) G.ui.toast(cat.icon + ' Véhicule acheté', cat.name + ' · ' + c.name, 'good');
    return true;
  }

  /** Coût du prochain agrandissement de capacité d'un montant donné. */
  function fleetCapacityCost(c, amount) {
    var t = typeDef(c.type);
    if (!t || !t.fleet) return Infinity;
    var steps = t.fleet.capSteps;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].n === amount) return steps[i].cost * Math.pow(2.4, c.fleetCapBuys || 0);
    }
    return Infinity;
  }

  function fleetBuyCapacity(uid, amount) {
    var c = byUid(uid);
    if (!c) return false;
    var t = typeDef(c.type);
    if (!t || !t.fleet) return false;
    var cost = fleetCapacityCost(c, amount);
    if (!isFinite(cost) || !G.eco.spend(cost, 'business', 'Agrandissement du garage · ' + c.name)) return false;
    c.fleetCapacity += amount;
    c.fleetCapBuys = (c.fleetCapBuys || 0) + 1;
    c.invested += cost;
    if (G.ui) G.ui.toast('🏗️ Garage agrandi', c.name + ' · capacité ' + c.fleetCapacity, 'good');
    return true;
  }

  /* --------------------------------------------------- fusions d'entreprises --- */

  /** Vérifie si une condition de fusion (niveau requis ou véhicules requis) est remplie. */
  function mergerRequirementMet(req) {
    var list = all();
    if (req.kind === 'companyLevel') {
      for (var i = 0; i < list.length; i++) {
        if (list[i].type === req.type && list[i].lvl >= req.lvl) return true;
      }
      return false;
    }
    if (req.kind === 'fleetVehicles') {
      var total = 0;
      for (var j = 0; j < list.length; j++) {
        if (list[j].type === req.fleet && list[j].fleetVehicles) {
          total += list[j].fleetVehicles[req.category] || 0;
        }
      }
      return total >= req.n;
    }
    return false;
  }

  /** Progression détaillée d'une condition, pour l'affichage. */
  function mergerRequirementProgress(req) {
    var list = all();
    if (req.kind === 'companyLevel') {
      var have = 0;
      for (var i = 0; i < list.length; i++) {
        if (list[i].type === req.type) have = Math.max(have, list[i].lvl);
      }
      return { label: req.label, have: Math.min(have, req.lvl), need: req.lvl, met: have >= req.lvl };
    }
    if (req.kind === 'fleetVehicles') {
      var total = 0;
      for (var j = 0; j < list.length; j++) {
        if (list[j].type === req.fleet && list[j].fleetVehicles) {
          total += list[j].fleetVehicles[req.category] || 0;
        }
      }
      return { label: req.label, have: Math.min(total, req.n), need: req.n, met: total >= req.n };
    }
    return { label: req.label, have: 0, need: 1, met: false };
  }

  function mergerRequirementsMet(typeId) {
    var t = typeDef(typeId);
    if (!t || !t.mergerOnly) return false;
    for (var i = 0; i < t.mergerRequires.length; i++) {
      if (!mergerRequirementMet(t.mergerRequires[i])) return false;
    }
    return true;
  }

  function mergerProgress(typeId) {
    var t = typeDef(typeId);
    if (!t || !t.mergerOnly) return [];
    return t.mergerRequires.map(mergerRequirementProgress);
  }

  function mergerCanOpen(typeId) {
    var t = typeDef(typeId);
    if (!t || !t.mergerOnly) return false;
    return mergerRequirementsMet(typeId) && count() < slots() && G.state.money >= t.cost;
  }

  /** Toutes les fusions de conglomérat disponibles dans le catalogue. */
  function mergerTypes() {
    return G.DATA.companyTypes.filter(function (t) { return t.mergerOnly; });
  }

  /** Débloque et fonde le conglomérat né de la fusion, si les conditions sont réunies. */
  function mergerOpen(typeId, name) {
    var t = typeDef(typeId);
    if (!t || !t.mergerOnly) return null;
    if (!mergerRequirementsMet(typeId)) return null;
    var c = _createCompany(t, name);
    if (c && G.ui) {
      G.ui.toast('🤝 Fusion réalisée !', c.name + ' naît de la fusion de vos entreprises', 'good');
    }
    return c;
  }

  return {
    typeDef: typeDef, all: all, byUid: byUid, count: count,
    slots: slots, slotCost: slotCost, buySlot: buySlot,
    milestoneMult: milestoneMult, nextMilestone: nextMilestone,
    globalMult: globalMult, hourly: hourly, totalHourly: totalHourly,
    perSecond: perSecond,
    upgradeCost: upgradeCost, invest: invest,
    upgradeDuration: upgradeDuration, isUpgrading: isUpgrading,
    upgradeRemaining: upgradeRemaining, upgradeProgress: upgradeProgress,
    suggestName: suggestName, canFound: canFound, found: found, rename: rename,
    saleValue: saleValue, sell: sell,
    mergeCandidates: mergeCandidates, canMergeAny: canMergeAny, merge: merge,
    tick: tick,
    sectorWeight: sectorWeight, totalValue: totalValue, catalog: catalog,
    fleetVehicleCount: fleetVehicleCount, fleetCategoryDef: fleetCategoryDef,
    fleetVehicleCost: fleetVehicleCost, fleetCanBuyVehicle: fleetCanBuyVehicle,
    fleetBuyVehicle: fleetBuyVehicle,
    fleetCapacityCost: fleetCapacityCost, fleetBuyCapacity: fleetBuyCapacity,
    mergerRequirementsMet: mergerRequirementsMet, mergerProgress: mergerProgress,
    mergerCanOpen: mergerCanOpen, mergerTypes: mergerTypes, mergerOpen: mergerOpen
  };
})();
