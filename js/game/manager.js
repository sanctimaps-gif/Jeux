/* Manager multisports : clubs, effectifs, transferts, championnats, finances.
 *
 * Le même modèle sert au football, au rugby, au water-polo, au basket, au
 * handball et au sport automobile — seules les données de js/data/sports.js
 * changent d'une discipline à l'autre.
 */
window.G = window.G || {};

G.manager = (function () {
  'use strict';
  var u = G.util;

  function sportDef(id) { return G.DATA.sportById[id]; }

  /* ====================================================== JOUEURS ======== */

  /** Note globale d'un joueur pour son poste. */
  function ovr(p, sport) {
    var pos = posDef(sport, p.pos);
    if (!pos) return 50;
    var t = 0;
    for (var k in pos.w) t += (p.attrs[k] || 50) * pos.w[k];
    return Math.round(t);
  }

  function posDef(sport, code) {
    for (var i = 0; i < sport.positions.length; i++) {
      if (sport.positions[i].code === code) return sport.positions[i];
    }
    return null;
  }

  /** Note effective en match : forme, énergie et moral comptent. */
  function effOvr(p, sport) {
    var base = ovr(p, sport);
    var formMod = (p.form - 50) * 0.12;
    var energyMod = (p.energy - 70) * 0.08;
    var moralMod = (p.morale - 50) * 0.05;
    return u.clamp(base + formMod + energyMod + moralMod, 15, 99);
  }

  function playerName() {
    return u.pick(G.DATA.firstNames) + ' ' + u.pick(G.DATA.lastNames);
  }

  /**
   * Crée un joueur.
   * @param {object} sport définition de la discipline
   * @param {number} quality niveau visé (≈ note globale)
   * @param {object} opts { pos, age, spread }
   */
  function makePlayer(sport, quality, opts) {
    opts = opts || {};
    var pos = opts.pos || u.pick(sport.positions).code;
    var pd = posDef(sport, pos);
    var age = opts.age || u.rint(18, 34);
    var spread = opts.spread === undefined ? 7 : opts.spread;

    /* On tire des attributs cohérents avec le poste : les caractéristiques
       importantes pour le poste sont tirées plus haut que les autres. */
    var attrs = {};
    var keys = ['att', 'def', 'phy', 'tec', 'men'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var w = pd.w[k] || 0;
      var target = quality + (w - 0.2) * 45;
      attrs[k] = Math.round(u.clamp(u.gauss(target, spread), 12, 99));
    }

    var p = {
      id: u.uid('p'),
      name: playerName(),
      pos: pos,
      age: age,
      attrs: attrs,
      pot: 0,
      form: u.rint(42, 68),
      energy: u.rint(78, 100),
      morale: u.rint(50, 80),
      injury: 0,
      apps: 0, scored: 0, seasonScored: 0,
      contract: u.rint(1, 4),
      starter: false
    };
    var o = ovr(p, sport);
    /* Potentiel : les jeunes peuvent encore beaucoup progresser. */
    p.pot = Math.round(u.clamp(o + (age < 23 ? u.rint(3, 18) : u.rint(0, 5)), o, 99));
    p.value = value(p, sport);
    p.wage = wage(p, sport);
    return p;
  }

  function value(p, sport) {
    var o = ovr(p, sport);
    var base = Math.pow(o / 50, 6) * 300000 * sport.economy.valueMul;
    var ageF;
    if (p.age <= 21) ageF = 1.15 + (p.pot - o) * 0.02;
    else if (p.age <= 25) ageF = 1.10 + (p.pot - o) * 0.012;
    else if (p.age <= 29) ageF = 1.0;
    else ageF = Math.max(0.18, 1 - (p.age - 29) * 0.14);
    return Math.round(base * u.clamp(ageF, 0.15, 1.9));
  }

  function wage(p, sport) {
    var o = ovr(p, sport);
    var w = sport.economy.wageBase * Math.pow(o / 70, 3.5);
    return Math.round(w * (1 - G.eco.bonus('wage')));
  }

  function refreshPlayerEconomics(club) {
    var sport = sportDef(club.sport);
    for (var i = 0; i < club.players.length; i++) {
      club.players[i].value = value(club.players[i], sport);
      club.players[i].wage = wage(club.players[i], sport);
    }
  }

  /* ====================================================== EFFECTIF ======= */

  function makeSquad(sport, quality) {
    var players = [], i, j;
    /* Deux joueurs par poste de base, puis on complète au hasard. */
    for (i = 0; i < sport.positions.length; i++) {
      var pos = sport.positions[i];
      var n = Math.max(1, pos.need) + (sport.type === 'race' ? 0 : 1);
      for (j = 0; j < n; j++) {
        players.push(makePlayer(sport, quality + u.rfloat(-6, 6), { pos: pos.code }));
      }
    }
    while (players.length < sport.squadSize) {
      players.push(makePlayer(sport, quality + u.rfloat(-8, 4)));
    }
    if (players.length > sport.squadSize) players.length = sport.squadSize;
    return players;
  }

  /** Compose automatiquement le meilleur onze (ou l'équivalent). */
  function autoLineup(club) {
    var sport = sportDef(club.sport);
    var i, j;
    for (i = 0; i < club.players.length; i++) club.players[i].starter = false;

    var used = {};
    for (i = 0; i < sport.positions.length; i++) {
      var pos = sport.positions[i];
      var candidates = club.players.filter(function (p) {
        return p.pos === pos.code && !p.injury && !used[p.id];
      });
      candidates = u.sortBy(candidates, function (p) { return effOvr(p, sport); }, true);
      for (j = 0; j < pos.need && j < candidates.length; j++) {
        candidates[j].starter = true;
        used[candidates[j].id] = true;
      }
    }
    /* S'il manque du monde (blessures), on prend les meilleurs disponibles. */
    var count = club.players.filter(function (p) { return p.starter; }).length;
    if (count < sport.lineupSize) {
      var rest = u.sortBy(club.players.filter(function (p) {
        return !p.starter && !p.injury;
      }), function (p) { return effOvr(p, sport); }, true);
      for (i = 0; count < sport.lineupSize && i < rest.length; i++) {
        rest[i].starter = true;
        count++;
      }
    }
    return club;
  }

  function starters(club) {
    return club.players.filter(function (p) { return p.starter && !p.injury; });
  }

  function bench(club) {
    return club.players.filter(function (p) { return !p.starter && !p.injury; });
  }

  /** Puissance offensive / défensive de l'équipe alignée. */
  function teamRatings(club) {
    var sport = sportDef(club.sport);
    var line = starters(club);
    if (!line.length) return { att: 30, def: 30, ovr: 30 };

    var byRole = { gk: [], def: [], mid: [], att: [] };
    for (var i = 0; i < line.length; i++) {
      var pd = posDef(sport, line[i].pos);
      var role = pd ? pd.role : 'mid';
      byRole[role].push(effOvr(line[i], sport));
    }
    function roleAvg(r) {
      return byRole[r].length ? u.avg(byRole[r]) : u.avg(line.map(function (p) {
        return effOvr(p, sport);
      })) * 0.85;
    }
    var att = 0, dfn = 0;
    for (var role in sport.attW) att += roleAvg(role) * sport.attW[role];
    for (role in sport.defW) dfn += roleAvg(role) * sport.defW[role];

    /* Tactique, entraîneur et installations. */
    var t = club.tactics;
    var mentality = (t.mentality - 2) * 3.2;       // -6.4 .. +6.4
    att += mentality;
    dfn -= mentality * 0.85;

    var coach = (club.staff.coach - 1) * 1.4;
    att += coach; dfn += coach;
    var training = (club.facilities.entrainement - 1) * 0.5;
    att += training; dfn += training;

    /* Sport automobile : la voiture pèse autant que les pilotes. */
    if (sport.type === 'race' && club.car) {
      var carAvg = (club.car.moteur + club.car.aero + club.car.chassis) / 3;
      att = att * 0.5 + carAvg * 0.5;
      dfn = dfn * 0.5 + carAvg * 0.5;
    }

    return {
      att: u.clamp(att, 10, 99),
      def: u.clamp(dfn, 10, 99),
      ovr: u.clamp((att + dfn) / 2, 10, 99)
    };
  }

  function squadAvg(club) {
    var sport = sportDef(club.sport);
    return u.avg(club.players.map(function (p) { return ovr(p, sport); }));
  }

  function wageBill(club) {
    return u.sum(club.players, function (p) { return p.wage; });
  }

  function clubValue(club) {
    var sport = sportDef(club.sport);
    var squad = u.sum(club.players, function (p) { return p.value; });
    var infra = 0;
    for (var f in club.facilities) {
      infra += facilityCost(club, f) * (club.facilities[f] - 1) * 0.5;
    }
    return squad + infra + sport.economy.clubCost * 0.35;
  }

  /* ================================================== INSTALLATIONS ====== */

  function facilityCost(club, id) {
    var sport = sportDef(club.sport);
    var fd = null;
    for (var i = 0; i < G.DATA.facilities.length; i++) {
      if (G.DATA.facilities[i].id === id) fd = G.DATA.facilities[i];
    }
    if (!fd) return Infinity;
    var lvl = club.facilities[id] || 1;
    return sport.economy.clubCost * 0.05 * fd.baseCost * Math.pow(1.55, lvl - 1);
  }

  function upgradeFacility(club, id) {
    var lvl = club.facilities[id] || 1;
    if (lvl >= 10) return false;
    var cost = facilityCost(club, id);
    if (!G.eco.spend(cost, 'manager:' + club.sport, 'Travaux · ' + id)) return false;
    club.facilities[id] = lvl + 1;
    club.rep = u.clamp(club.rep + 0.6, 1, 100);
    return true;
  }

  function staffCost(club, id) {
    var sport = sportDef(club.sport);
    var lvl = club.staff[id] || 1;
    return sport.economy.clubCost * 0.03 * Math.pow(1.6, lvl - 1);
  }

  function upgradeStaff(club, id) {
    var lvl = club.staff[id] || 1;
    if (lvl >= 10) return false;
    var cost = staffCost(club, id);
    if (!G.eco.spend(cost, 'manager:' + club.sport, 'Recrutement staff · ' + id)) return false;
    club.staff[id] = lvl + 1;
    return true;
  }

  /* ------------------------------------------------- sport automobile ---- */

  function carPartCost(club, part) {
    var sport = sportDef(club.sport);
    var lvl = club.car[part];
    return sport.economy.clubCost * 0.012 * Math.pow(1.11, Math.max(0, lvl - 40));
  }

  function upgradeCar(club, part) {
    if (club.car[part] >= 99) return false;
    var cost = carPartCost(club, part);
    if (!G.eco.spend(cost, 'manager:' + club.sport, 'Développement · ' + part)) return false;
    club.car[part] = Math.min(99, club.car[part] + u.rint(1, 3));
    return true;
  }

  /* ==================================================== CHAMPIONNAT ====== */

  function clubNameFor(sportId) {
    var sfx = G.DATA.clubSuffixes[sportId] || ['Club'];
    return u.pick(G.DATA.cityNames) + ' ' + u.pick(sfx);
  }

  /** Calendrier toutes rondes (méthode du cercle), aller-retour. */
  function makeFixtures(n) {
    var teams = [], i, r;
    for (i = 0; i < n; i++) teams.push(i);
    if (n % 2 === 1) teams.push(-1);          // équipe fictive = journée de repos
    var m = teams.length;
    var rounds = [];
    for (r = 0; r < m - 1; r++) {
      var round = [];
      for (i = 0; i < m / 2; i++) {
        var a = teams[i], b = teams[m - 1 - i];
        if (a === -1 || b === -1) continue;
        round.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
      rounds.push(round);
      teams.splice(1, 0, teams.pop());        // rotation
    }
    /* Match retour : on inverse la réception. */
    var back = rounds.map(function (rd) {
      return rd.map(function (m2) { return [m2[1], m2[0]]; });
    });
    return rounds.concat(back);
  }

  function makeLeague(club, sport) {
    /* Le sport automobile a son propre format de saison (calendrier de GP). */
    if (sport.type === 'race') return G.race.makeSeason(club, sport);

    var n = sport.leagueSize;
    var teams = [{ name: club.name, str: teamRatings(club).ovr, you: true }];
    var used = {};
    for (var i = 1; i < n; i++) {
      var name;
      var guard = 0;
      do { name = clubNameFor(sport.id); guard++; } while (used[name] && guard < 40);
      used[name] = true;
      var target = u.clamp(club.rep * 0.55 + 32 + u.gauss(0, 9), 30, 92);
      teams.push({ name: name, str: Math.round(target), you: false });
    }
    for (i = 0; i < teams.length; i++) {
      teams[i].pts = 0; teams[i].w = 0; teams[i].d = 0; teams[i].l = 0;
      teams[i].sf = 0; teams[i].sa = 0; teams[i].played = 0;
    }
    return { teams: teams, fixtures: makeFixtures(n), round: 0 };
  }

  /** Prochaine affiche du club (ou null en fin de saison). */
  function nextFixture(club) {
    var lg = club.league;
    if (!lg || lg.round >= lg.fixtures.length) return null;
    if (lg.isRace) return null;             // voir G.race.nextRace()
    var round = lg.fixtures[lg.round];
    for (var i = 0; i < round.length; i++) {
      if (round[i][0] === 0 || round[i][1] === 0) {
        return {
          home: round[i][0], away: round[i][1],
          youHome: round[i][0] === 0,
          opp: lg.teams[round[i][0] === 0 ? round[i][1] : round[i][0]]
        };
      }
    }
    return null;
  }

  function standings(club) {
    var lg = club.league;
    return u.sortBy(lg.teams.map(function (t, i) {
      return { i: i, t: t, diff: t.sf - t.sa };
    }), function (x) { return x.t.pts * 1000 + x.diff; }, true);
  }

  function rankOf(club) {
    var st = standings(club);
    for (var i = 0; i < st.length; i++) if (st[i].i === 0) return i + 1;
    return 0;
  }

  /* Points attribués selon le sport (rugby : bonus offensif simplifié). */
  function pointsFor(sportId, scored, conceded) {
    if (scored > conceded) return sportId === 'rugby' ? 4 : (sportId === 'basket' ? 2 : 3);
    if (scored === conceded) return sportId === 'basket' ? 0 : (sportId === 'rugby' ? 2 : 1);
    return sportId === 'basket' ? 1 : 0;
  }

  /** Simule les autres rencontres de la journée. */
  function simOtherMatches(club, roundIdx) {
    var lg = club.league, sport = sportDef(club.sport);
    var round = lg.fixtures[roundIdx] || [];
    for (var i = 0; i < round.length; i++) {
      var h = round[i][0], a = round[i][1];
      if (h === 0 || a === 0) continue;
      var th = lg.teams[h], ta = lg.teams[a];
      var sh = simScore(th.str + 3, ta.str, sport);
      var sa = simScore(ta.str, th.str + 3, sport);
      applyResult(club, h, sh, sa);
      applyResult(club, a, sa, sh);
    }
  }

  function simScore(att, def, sport) {
    var spread = sport.spread === undefined ? 1.5 : sport.spread;
    var factor = u.clamp(Math.exp((att - def) / 100 * spread), 0.45, 2.2);
    var lambda = sport.avgEvents * factor;
    var events = u.poisson(Math.max(0.1, lambda));
    var pts = 0;
    for (var i = 0; i < events; i++) pts += pickScoreValue(sport);
    return pts;
  }

  function pickScoreValue(sport) {
    var ev = u.weighted(sport.scoreEvents.map(function (e) { return [e, e.w]; }));
    var pts = ev.pts;
    if (ev.convert && u.chance(ev.convert.p)) pts += ev.convert.pts;
    return pts;
  }

  function applyResult(club, teamIdx, sf, sa) {
    var t = club.league.teams[teamIdx];
    t.played++; t.sf += sf; t.sa += sa;
    if (sf > sa) t.w++; else if (sf === sa) t.d++; else t.l++;
    t.pts += pointsFor(club.sport, sf, sa);
  }

  /* ====================================================== FINANCES ======= */

  /** Recettes d'un match à domicile / à l'extérieur. */
  function matchIncome(club, isHome, won, drew) {
    var sport = sportDef(club.sport);
    var e = sport.economy;
    var repF = 0.35 + club.rep / 70;
    var sponsorBonus = 1 + G.eco.bonus('sponsor');

    var gate = 0;
    if (sport.type !== 'race') {
      gate = e.gateBase * repF * (1 + (club.facilities.stade - 1) * 0.12);
      if (!isHome) gate *= 0.18;                        // part visiteur
      gate *= u.rfloat(0.85, 1.15);
    }
    var sponsor = e.sponsorBase * repF *
      (1 + (club.facilities.marketing - 1) * 0.15) * sponsorBonus;

    var prize = won ? e.prizeWin : (drew ? e.prizeDraw : e.prizeLoss);
    prize *= 0.6 + club.rep / 160;

    return { gate: gate, sponsor: sponsor, prize: prize, total: gate + sponsor + prize };
  }

  /* ===================================================== APRÈS-MATCH ===== */

  /**
   * Applique le résultat d'une rencontre : championnat, argent, forme,
   * fatigue, blessures, réputation, répercussions boursières.
   */
  function finishMatch(club, res) {
    var sport = sportDef(club.sport);
    var s = G.state;
    var won = res.you > res.opp, drew = res.you === res.opp;

    /* --- classement --- */
    var fx = nextFixture(club);
    if (fx) {
      var oppIdx = fx.youHome ? fx.away : fx.home;
      applyResult(club, 0, res.you, res.opp);
      applyResult(club, oppIdx, res.opp, res.you);
      simOtherMatches(club, club.league.round);
      club.league.round++;
    }

    /* --- argent --- */
    var inc = matchIncome(club, fx ? fx.youHome : true, won, drew);
    var bill = wageBill(club);
    var net = inc.total - bill;

    G.eco.earn(inc.total, 'manager:' + club.sport,
      'Recettes ' + (won ? 'victoire' : drew ? 'nul' : 'défaite') + ' · ' + club.name, true);
    G.eco.spend(bill, 'manager:' + club.sport, 'Salaires · ' + club.name, true);

    club.finances.seasonIn += inc.total;
    club.finances.seasonOut += bill;
    club.finances.last = {
      gate: inc.gate, sponsor: inc.sponsor, prize: inc.prize,
      wages: bill, net: net
    };

    /* --- effectif : fatigue, forme, moral, blessures, progression --- */
    var line = starters(club);
    var medical = club.facilities.medical || 1;
    var trainingLvl = club.facilities.entrainement || 1;
    var i, p;

    for (i = 0; i < club.players.length; i++) {
      p = club.players[i];
      if (p.injury > 0) {
        p.injury = Math.max(0, p.injury - 1 - (club.staff.medecin - 1) * 0.34);
        if (p.injury < 1) p.injury = 0;
        p.energy = u.clamp(p.energy + 8, 0, 100);
        continue;
      }
      if (p.starter) {
        p.apps++;
        p.energy = u.clamp(p.energy - u.rint(16, 30) + (trainingLvl - 1) * 1.5, 5, 100);
        p.form = u.clamp(p.form + (won ? u.rint(1, 9) : drew ? u.rint(-2, 4) : u.rint(-8, 2)), 5, 99);
        /* Blessure éventuelle */
        var risk = 0.05 * (1 - (medical - 1) * 0.10) * (p.energy < 35 ? 1.9 : 1);
        if (u.chance(risk)) {
          p.injury = u.rint(1, 6);
          if (G.ui) G.ui.toast('🚑 Blessure', p.name + ' — ' + p.injury + ' match(s)', 'bad');
        }
      } else {
        p.energy = u.clamp(p.energy + u.rint(10, 22) + (trainingLvl - 1) * 2, 5, 100);
        p.form = u.clamp(p.form + u.rint(-3, 3), 5, 99);
      }
      p.morale = u.clamp(p.morale + (won ? 4 : drew ? 0 : -4), 5, 100);

      /* Progression / déclin */
      var o = ovr(p, sport);
      if (p.age < 27 && o < p.pot && u.chance(0.16 + trainingLvl * 0.025)) {
        bumpAttr(p, sport, 1);
      } else if (p.age > 31 && u.chance(0.10)) {
        bumpAttr(p, sport, -1);
      }
    }
    refreshPlayerEconomics(club);

    /* --- réputation --- */
    club.rep = u.clamp(club.rep + (won ? 0.7 : drew ? 0.1 : -0.35), 1, 100);
    club.league.teams[0].str = Math.round(teamRatings(club).ovr);

    /* --- effet de bord sur la Bourse : le sport nourrit la finance --- */
    if (won) {
      var boost = 0.006 + club.rep / 4000;
      G.market.addBoost(u.pick(G.DATA.sportStocks), boost);
    } else if (!drew) {
      G.market.addBoost(u.pick(G.DATA.sportStocks), -0.004);
    }

    club.results.unshift({
      season: club.season, round: club.league.round,
      you: res.you, opp: res.opp, oppName: res.oppName,
      home: fx ? fx.youHome : true, net: net
    });
    if (club.results.length > 40) club.results.length = 40;

    s.stats.matchesPlayed++;

    /* --- fin de saison --- */
    if (club.league.round >= club.league.fixtures.length) endSeason(club);

    return { income: inc, wages: bill, net: net };
  }

  /** Fait varier d'un point l'attribut le plus utile au poste. */
  function bumpAttr(p, sport, delta) {
    var pd = posDef(sport, p.pos);
    var keys = Object.keys(pd.w).sort(function (a, b) { return pd.w[b] - pd.w[a]; });
    var k = u.chance(0.6) ? keys[0] : u.pick(keys);
    p.attrs[k] = u.clamp(p.attrs[k] + delta, 10, 99);
  }

  function endSeason(club) {
    var sport = sportDef(club.sport);
    var rank = rankOf(club);
    var s = G.state;

    /* Droits TV et primes de classement. */
    var tv = sport.economy.tvSeason * (0.4 + (club.league.teams.length - rank + 1) /
      club.league.teams.length * 0.9) * (0.5 + club.rep / 100);
    G.eco.earn(tv, 'manager:' + club.sport,
      'Droits TV & prime de classement (' + rank + 'e) · ' + club.name);

    if (rank === 1) {
      s.manager.trophies.push({
        sport: club.sport, season: club.season, name: sport.leagueName, club: club.name
      });
      club.rep = u.clamp(club.rep + 8, 1, 100);
      G.market.addBoost(u.pick(G.DATA.sportStocks), 0.05,
        club.name + ' champion : les équipementiers s\'envolent');
      if (G.ui) {
        G.ui.toast('🏆 TITRE !', club.name + ' remporte ' + sport.leagueName, 'good');
      }
    } else if (rank <= 3) {
      club.rep = u.clamp(club.rep + 3, 1, 100);
    } else if (rank >= club.league.teams.length - 1) {
      club.rep = u.clamp(club.rep - 4, 1, 100);
    }

    club.history.push({
      season: club.season, rank: rank, pts: club.league.teams[0].pts,
      in: Math.round(club.finances.seasonIn), out: Math.round(club.finances.seasonOut)
    });

    /* Vieillissement, fins de contrat, jeunes du centre de formation. */
    var i, p, leaving = [];
    for (i = 0; i < club.players.length; i++) {
      p = club.players[i];
      p.age++;
      p.contract--;
      p.seasonScored = 0;
      p.energy = 100; p.injury = 0;
      p.form = u.rint(45, 65);
      if (p.contract <= 0) {
        if (p.age > 34 || u.chance(0.35)) leaving.push(p);
        else p.contract = u.rint(1, 3);
      }
    }
    for (i = 0; i < leaving.length; i++) {
      var idx = club.players.indexOf(leaving[i]);
      if (idx >= 0) club.players.splice(idx, 1);
    }

    var academy = club.facilities.formation || 1;
    var youths = sport.type === 'race' ? 0 : u.rint(1, 2);
    for (i = 0; i < youths; i++) {
      if (club.players.length >= sport.squadSize + 4) break;
      var q = 40 + academy * 3.2 + club.rep * 0.12 + u.rfloat(-5, 8);
      var y = makePlayer(sport, q, { age: u.rint(17, 19), spread: 6 });
      club.players.push(y);
    }
    /* Recrutement de complément pour reconstituer un effectif complet. */
    var minSquad = sport.type === 'race' ? sport.lineupSize : sport.squadSize - 1;
    while (club.players.length < minSquad) {
      var repl = makePlayer(sport, 42 + club.rep * 0.22 + u.rfloat(-4, 6),
        { age: u.rint(19, 29) });
      club.players.push(repl);
    }

    refreshPlayerEconomics(club);
    club.season++;
    club.finances.seasonIn = 0;
    club.finances.seasonOut = 0;
    club.league = makeLeague(club, sport);
    club.transferList = null;
    autoLineup(club);

    if (G.ui) {
      G.ui.toast('📅 Nouvelle saison', club.name + ' — saison ' + club.season +
        ' (classé ' + rank + 'e)', 'neutral');
    }
  }

  /* ==================================================== TRANSFERTS ======= */

  function refreshTransfers(club, force) {
    var sport = sportDef(club.sport);
    var day = G.state.market.day;
    if (!force && club.transferList && day - club.transferList.day < 12) {
      return club.transferList.players;
    }
    var scout = club.staff.scout || 1;
    var list = [];
    var n = sport.type === 'race' ? 4 : 8;
    for (var i = 0; i < n; i++) {
      var q = 42 + club.rep * 0.30 + scout * 2.6 + u.rfloat(-9, 11);
      var p = makePlayer(sport, u.clamp(q, 30, 92), {});
      p.askPrice = Math.round(p.value * u.rfloat(1.05, 1.45));
      list.push(p);
    }
    club.transferList = { day: day, players: list };
    return list;
  }

  function signPlayer(club, playerId) {
    var sport = sportDef(club.sport);
    if (!club.transferList) return false;
    var list = club.transferList.players;
    var p = null, idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === playerId) { p = list[i]; idx = i; }
    }
    if (!p) return false;
    if (club.players.length >= sport.squadSize + 4) {
      if (G.ui) G.ui.toast('👥 Effectif complet', 'Vendez un joueur d\'abord', 'bad');
      return false;
    }
    if (!G.eco.spend(p.askPrice, 'manager:' + club.sport,
      'Transfert · ' + p.name)) return false;

    delete p.askPrice;
    p.contract = u.rint(2, 4);
    p.morale = u.rint(60, 85);
    club.players.push(p);
    list.splice(idx, 1);
    autoLineup(club);
    refreshPlayerEconomics(club);
    club.rep = u.clamp(club.rep + 0.3, 1, 100);
    return true;
  }

  function sellPlayer(club, playerId) {
    var sport = sportDef(club.sport);
    var idx = -1;
    for (var i = 0; i < club.players.length; i++) {
      if (club.players[i].id === playerId) idx = i;
    }
    if (idx < 0) return false;
    if (club.players.length <= sport.lineupSize + 1) {
      if (G.ui) G.ui.toast('👥 Effectif trop court', 'Recrutez avant de vendre', 'bad');
      return false;
    }
    var p = club.players[idx];
    var offer = Math.round(p.value * u.rfloat(0.78, 1.12));
    club.players.splice(idx, 1);
    autoLineup(club);
    G.eco.earn(offer, 'manager:' + club.sport, 'Vente · ' + p.name);
    return true;
  }

  /* =================================================== CRÉATION CLUB ===== */

  function buyClub(sportId, name) {
    var sport = sportDef(sportId);
    if (!sport) return false;
    var s = G.state;
    if (s.manager.clubs[sportId]) return false;

    var cost = sport.economy.clubCost;
    if (!G.eco.spend(cost, 'manager:' + sportId, 'Rachat d\'un club · ' + sport.name)) {
      return false;
    }

    var quality = 52;
    var club = {
      sport: sportId,
      name: name || clubNameFor(sportId),
      rep: 35,
      season: 1,
      players: makeSquad(sport, quality),
      tactics: { mentality: 2, pressing: 1, style: 1 },
      facilities: { stade: 1, entrainement: 1, formation: 1, medical: 1, marketing: 1 },
      staff: { coach: 1, adjoint: 1, scout: 1, medecin: 1 },
      finances: { seasonIn: 0, seasonOut: 0, last: null },
      results: [], history: [], transferList: null,
      boughtDay: s.market.day
    };
    if (sport.type === 'race') {
      club.car = { moteur: 48, aero: 46, chassis: 47, fiabilite: 55 };
      club.raceState = null;
    }
    autoLineup(club);
    refreshPlayerEconomics(club);
    club.league = makeLeague(club, sport);

    s.manager.clubs[sportId] = club;
    if (!s.manager.active) s.manager.active = sportId;
    G.market.addBoost(u.pick(G.DATA.sportStocks), 0.02,
      'Un investisseur rachète un club de ' + sport.name.toLowerCase());
    return true;
  }

  function sellClub(sportId) {
    var club = G.state.manager.clubs[sportId];
    if (!club) return false;
    var v = clubValue(club) * 0.85;
    delete G.state.manager.clubs[sportId];
    if (G.state.manager.active === sportId) {
      var keys = Object.keys(G.state.manager.clubs);
      G.state.manager.active = keys.length ? keys[0] : null;
    }
    G.eco.earn(v, 'manager:' + sportId, 'Cession du club');
    return true;
  }

  /** Repos entre deux journées : récupération d'énergie. */
  function restDay(club) {
    var lvl = club.facilities.entrainement || 1;
    for (var i = 0; i < club.players.length; i++) {
      var p = club.players[i];
      p.energy = u.clamp(p.energy + 4 + lvl, 0, 100);
    }
  }

  return {
    sportDef: sportDef, posDef: posDef, ovr: ovr, effOvr: effOvr,
    makePlayer: makePlayer, makeSquad: makeSquad, value: value, wage: wage,
    autoLineup: autoLineup, starters: starters, bench: bench,
    teamRatings: teamRatings, squadAvg: squadAvg, wageBill: wageBill,
    clubValue: clubValue,
    facilityCost: facilityCost, upgradeFacility: upgradeFacility,
    staffCost: staffCost, upgradeStaff: upgradeStaff,
    carPartCost: carPartCost, upgradeCar: upgradeCar,
    makeLeague: makeLeague, nextFixture: nextFixture, standings: standings,
    rankOf: rankOf, pointsFor: pointsFor, simScore: simScore,
    pickScoreValue: pickScoreValue, matchIncome: matchIncome,
    finishMatch: finishMatch, endSeason: endSeason,
    refreshTransfers: refreshTransfers, signPlayer: signPlayer,
    sellPlayer: sellPlayer, buyClub: buyClub, sellClub: sellClub,
    restDay: restDay, clubNameFor: clubNameFor,
    refreshPlayerEconomics: refreshPlayerEconomics
  };
})();
