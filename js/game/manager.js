/* Manager multisports : clubs, effectifs, transferts, championnats, finances.
 *
 * On peut posséder plusieurs clubs, y compris dans le même sport. Chaque club
 * appartient à un pays et démarre dans la division choisie (1 = Élite, en
 * passant par National et Régional, jusqu'à 10 = Départementale 3, le point
 * d'entrée le plus abordable). Plus la division visée est proche de l'élite,
 * plus le prix d'achat explose. On peut aussi racheter la fédération d'un
 * pays (division 0) : l'équipe nationale ne joue alors que des compétitions
 * internationales, sans montée ni descente.
 */
window.G = window.G || {};

G.manager = (function () {
  'use strict';
  var u = G.util;

  function sportDef(id) { return G.DATA.sportById[id]; }

  /* ==================================================== CLUBS POSSÉDÉS ==== */

  function clubs() { return G.state.manager.clubs; }

  function byUid(uid) {
    var l = clubs();
    for (var i = 0; i < l.length; i++) if (l[i].uid === uid) return l[i];
    return null;
  }

  function activeClub() {
    var a = G.state.manager.active;
    var c = a ? byUid(a) : null;
    if (!c && clubs().length) {
      c = clubs()[0];
      G.state.manager.active = c.uid;
    }
    return c;
  }

  function clubsOfSport(sportId) {
    return clubs().filter(function (c) { return c.sport === sportId; });
  }

  /* ==================================================== PAYS & DIVISIONS == */

  /** Coefficient sportif d'un pays pour une discipline (rang dans la liste). */
  function countryCoef(sport, code) {
    var list = sport.countries || [];
    var rank = list.indexOf(code);
    if (rank < 0) rank = list.length;
    var base = u.clamp(1.7 - rank * 0.075, 0.45, 1.7);
    var nation = G.DATA.worldById[code];
    if (nation) {
      var wealth = Math.pow(nation.gdppc / 25000, 0.35);
      base *= u.clamp(wealth, 0.55, 1.45);
    }
    return u.clamp(base, 0.30, 2.2);
  }

  /** Version normalisée (0-1) de countryCoef, pour ne jamais dépasser le
   * prix de référence du club le plus cher/plus fort au monde de la
   * discipline (flagshipPrice), qui représente déjà le sommet absolu. */
  function priceCountryFactor(sport, code) {
    return u.clamp(countryCoef(sport, code) / COUNTRY_COEF_MAX, 0.05, 1);
  }

  /* Pyramide à 10 paliers, de l'Élite (1) à la Départementale 3 (10). Une
     équipe nationale est marquée division 0 : au-dessus de tout, pas de
     montée/descente, elle joue des compétitions internationales. */
  var DIVISION_NAMES = ['Élite', 'National 1', 'National 2', 'National 3',
    'Régional 1', 'Régional 2', 'Régional 3',
    'Départementale 1', 'Départementale 2', 'Départementale 3'];
  var DIVISION_SHORT = ['Élite', 'N1', 'N2', 'N3', 'R1', 'R2', 'R3', 'D1', 'D2', 'D3'];
  var MIN_DIVISION = 1;
  var MAX_DIVISION = DIVISION_NAMES.length;
  var PRICE_TIER_RATIO = 3;       // chaque division en dessous divise le prix par 3
  var COUNTRY_COEF_MAX = 2.2;     // plafond de countryCoef() ci-dessous, pour normaliser à 1

  /** Coefficient économique de la division (revenus, salaires, valeur). */
  function divisionCoef(div) {
    if (div === 0) return 2.2;                     // équipe nationale
    return Math.pow(0.62, u.clamp(div, MIN_DIVISION, MAX_DIVISION) - 1);
  }

  /** Niveau moyen des équipes du championnat (0-99). */
  function divisionLevel(div) {
    if (div === 0) return 90;                      // équipe nationale
    return u.clamp(85 - (u.clamp(div, MIN_DIVISION, MAX_DIVISION) - 1) * 5, 30, 85);
  }

  /** Certains sports (raquette notamment) ont leurs propres noms de paliers,
   * calqués sur leurs circuits professionnels réels (Grand Chelem, Masters
   * 1000...) plutôt que sur la pyramide générique des clubs amateurs. */
  function divisionName(sport, div) {
    if (div === 0) return (sport && sport.internationalLabel) || 'Équipe nationale';
    if (sport && sport.divisionNames) return sport.divisionNames[div - 1] || ('Division ' + div);
    return DIVISION_NAMES[div - 1] || ('Division ' + div);
  }

  function divisionShort(sport, div) {
    if (div === 0) return 'Nat.';
    if (sport && sport.divisionTags) return sport.divisionTags[div - 1] || ('D' + div);
    return DIVISION_SHORT[div - 1] || ('D' + div);
  }

  function leagueTitle(club) {
    var nation = G.DATA.worldById[club.country];
    var sport = sportDef(club.sport);
    if (club.division === 0) {
      return (nation ? nation.n : '') + ' · ' + (sport.internationalLabel || 'Compétition internationale');
    }
    return (nation ? nation.n : '') + ' · ' + divisionName(sport, club.division);
  }

  /** Multiplicateur de prix : on part du club réel le plus cher/plus fort du
   * monde dans la discipline (division 1, Élite) et on divise le prix par 3
   * à chaque division qu'on descend, jusqu'à D3 (division 10). */
  function divisionPriceMult(div) {
    div = u.clamp(div, MIN_DIVISION, MAX_DIVISION);
    return 1 / Math.pow(PRICE_TIER_RATIO, div - 1);
  }

  /** Prix d'achat d'un club dans un pays donné, à la division choisie :
   * calé sur la valeur du club réel le plus cher/plus fort de la discipline
   * (sport.economy.flagshipPrice), pondéré par le niveau du pays et divisé
   * par 3 à chaque division en dessous de l'Élite. */
  function clubPrice(sportId, code, division) {
    division = division === undefined ? MAX_DIVISION : division;
    var sport = sportDef(sportId);
    return sport.economy.flagshipPrice * priceCountryFactor(sport, code) *
      divisionPriceMult(division);
  }

  /** Prix de rachat de la fédération (équipe nationale) d'un pays. */
  function nationalTeamPrice(sportId, code) {
    var sport = sportDef(sportId);
    return sport.economy.flagshipPrice * priceCountryFactor(sport, code) *
      divisionPriceMult(MIN_DIVISION) * 3;
  }

  /* ====================================================== JOUEURS ======== */

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

  function makePlayer(sport, quality, opts) {
    opts = opts || {};
    var pos = opts.pos || u.pick(sport.positions).code;
    var pd = posDef(sport, pos);
    var age = opts.age || u.rint(18, 34);
    var spread = opts.spread === undefined ? 7 : opts.spread;

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
    p.pot = Math.round(u.clamp(o + (age < 23 ? u.rint(3, 18) : u.rint(0, 5)), o, 99));
    p.value = value(p, sport);
    p.wage = wage(p, sport);
    return p;
  }

  /**
   * Valeur marchande. Courbe très raide (exposant 12) : un joueur moyen
   * reste peu cher, mais un très bon joueur coûte une fortune, comme dans
   * la vraie vie (les superstars valent 100-200 M€, pas 15-20 M€).
   */
  function value(p, sport) {
    var o = ovr(p, sport);
    var base = Math.pow(o / 50, 12) * 50000 * sport.economy.valueMul;
    var ageF;
    if (p.age <= 21) ageF = 1.15 + (p.pot - o) * 0.02;
    else if (p.age <= 25) ageF = 1.10 + (p.pot - o) * 0.012;
    else if (p.age <= 29) ageF = 1.0;
    else ageF = Math.max(0.18, 1 - (p.age - 29) * 0.14);
    return Math.round(base * u.clamp(ageF, 0.15, 1.9));
  }

  function wage(p, sport, club) {
    var o = ovr(p, sport);
    var w = sport.economy.wageBase * Math.pow(o / 70, 3.5);
    if (club) w *= 0.35 + divisionCoef(club.division) * 0.8;
    return Math.round(w * (1 - G.eco.bonus('wage')));
  }

  function refreshPlayerEconomics(club) {
    var sport = sportDef(club.sport);
    for (var i = 0; i < club.players.length; i++) {
      club.players[i].value = value(club.players[i], sport);
      club.players[i].wage = wage(club.players[i], sport, club);
    }
  }

  /* ====================================================== EFFECTIF ======= */

  function makeSquad(sport, quality) {
    var players = [], i, j;
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
    var att = 0, dfn = 0, role;
    for (role in sport.attW) att += roleAvg(role) * sport.attW[role];
    for (role in sport.defW) dfn += roleAvg(role) * sport.defW[role];

    var t = club.tactics;
    var mentality = (t.mentality - 2) * 3.2;
    att += mentality;
    dfn -= mentality * 0.85;

    var coach = (club.staff.coach - 1) * 1.4;
    att += coach; dfn += coach;
    var training = (club.facilities.entrainement - 1) * 0.5;
    att += training; dfn += training;

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
    return squad + infra +
      sport.economy.clubCost * countryCoef(sport, club.country) *
      divisionCoef(club.division) * 0.9;
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
    return sport.economy.clubCost * countryCoef(sport, club.country) *
      0.04 * fd.baseCost * Math.pow(1.55, lvl - 1);
  }

  function upgradeFacility(club, id) {
    var lvl = club.facilities[id] || 1;
    if (lvl >= 10) return false;
    var cost = facilityCost(club, id);
    if (!G.eco.spend(cost, 'manager:' + club.sport, 'Travaux · ' + club.name)) return false;
    club.facilities[id] = lvl + 1;
    club.rep = u.clamp(club.rep + 0.6, 1, 100);
    return true;
  }

  function staffCost(club, id) {
    var sport = sportDef(club.sport);
    var lvl = club.staff[id] || 1;
    return sport.economy.clubCost * countryCoef(sport, club.country) *
      0.025 * Math.pow(1.6, lvl - 1);
  }

  function upgradeStaff(club, id) {
    var lvl = club.staff[id] || 1;
    if (lvl >= 10) return false;
    var cost = staffCost(club, id);
    if (!G.eco.spend(cost, 'manager:' + club.sport, 'Encadrement · ' + club.name)) return false;
    club.staff[id] = lvl + 1;
    return true;
  }

  function carPartCost(club, part) {
    var sport = sportDef(club.sport);
    var lvl = club.car[part];
    return sport.economy.clubCost * countryCoef(sport, club.country) *
      0.012 * Math.pow(1.11, Math.max(0, lvl - 40));
  }

  function upgradeCar(club, part) {
    if (club.car[part] >= 99) return false;
    var cost = carPartCost(club, part);
    if (!G.eco.spend(cost, 'manager:' + club.sport, 'Développement · ' + part)) return false;
    club.car[part] = Math.min(99, club.car[part] + u.rint(1, 3));
    return true;
  }

  /* ==================================================== CHAMPIONNAT ====== */

  function clubNameFor(sportId, countryCode) {
    var sfx = G.DATA.clubSuffixes[sportId] || ['Club'];
    var nation = G.DATA.worldById[countryCode];
    var cities = (nation && G.DATA.cityNamesByCountry[countryCode]) || G.DATA.cityNames;
    return u.pick(cities) + ' ' + u.pick(sfx);
  }

  function makeFixtures(n) {
    var teams = [], i, r;
    for (i = 0; i < n; i++) teams.push(i);
    if (n % 2 === 1) teams.push(-1);
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
      teams.splice(1, 0, teams.pop());
    }
    var back = rounds.map(function (rd) {
      return rd.map(function (m2) { return [m2[1], m2[0]]; });
    });
    return rounds.concat(back);
  }

  /** Compétition internationale : adversaires tirés parmi les autres nations. */
  function makeInternational(club, sport) {
    var level = divisionLevel(0);
    var n = Math.min(sport.leagueSize, sport.countries.length);
    var teams = [{ name: club.name, str: teamRatings(club).ovr, you: true }];
    var pool = sport.countries.filter(function (c) { return c !== club.country; });
    for (var i = 1; i < n && pool.length; i++) {
      var idx = u.rint(0, pool.length - 1);
      var code = pool.splice(idx, 1)[0];
      var nation = G.DATA.worldById[code];
      var str = level * countryCoef(sport, code) * 0.75 + 14;
      teams.push({
        name: nation ? nation.n : code, code: code,
        str: Math.round(u.clamp(str, 25, 97)), you: false
      });
    }
    for (i = 0; i < teams.length; i++) {
      teams[i].pts = 0; teams[i].w = 0; teams[i].d = 0; teams[i].l = 0;
      teams[i].sf = 0; teams[i].sa = 0; teams[i].played = 0;
    }
    return { teams: teams, fixtures: makeFixtures(teams.length), round: 0, international: true };
  }

  /**
   * Deux clubs possédés dans le même sport, pays et division sont de vrais
   * rivaux : ils se retrouvent l'un l'autre dans leur calendrier (à l'indice
   * 1) plutôt que de jouer chacun contre des adversaires fictifs distincts.
   * On ne lie que des paires (le premier arrivé garde son jumeau).
   */
  function findOrLinkTwin(club) {
    if (club.twinUid) {
      var existing = byUid(club.twinUid);
      if (existing && existing.sport === club.sport && existing.country === club.country &&
          existing.division === club.division) {
        return existing;
      }
      /* Promotion/relégation les a séparés : plus jumeaux. */
      unlinkTwin(club);
    }
    if (!club.division) return null;
    var list = clubs();
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.uid === club.uid || o.twinUid) continue;
      if (o.sport === club.sport && o.country === club.country && o.division === club.division) {
        club.twinUid = o.uid;
        o.twinUid = club.uid;
        return o;
      }
    }
    return null;
  }

  function makeLeague(club, sport) {
    if (sport.type === 'race') return G.race.makeSeason(club, sport);
    if (club.division === 0) return makeInternational(club, sport);

    var n = sport.leagueSize;
    var level = divisionLevel(club.division) * countryCoef(sport, club.country) * 0.75 + 14;
    var teams = [{ name: club.name, str: teamRatings(club).ovr, you: true }];
    var used = {};
    for (var i = 1; i < n; i++) {
      var name, guard = 0;
      do { name = clubNameFor(sport.id, club.country); guard++; } while (used[name] && guard < 40);
      used[name] = true;
      teams.push({ name: name, str: Math.round(u.clamp(level + u.gauss(0, 7), 25, 95)), you: false });
    }
    for (i = 0; i < teams.length; i++) {
      teams[i].pts = 0; teams[i].w = 0; teams[i].d = 0; teams[i].l = 0;
      teams[i].sf = 0; teams[i].sa = 0; teams[i].played = 0;
    }

    var twin = findOrLinkTwin(club);
    if (twin && n > 1) {
      teams[1].name = twin.name;
      teams[1].str = Math.round(teamRatings(twin).ovr);
      teams[1].twinUid = twin.uid;
      if (twin.league && twin.league.teams && twin.league.teams[1]) {
        twin.league.teams[1].name = club.name;
        twin.league.teams[1].str = Math.round(teamRatings(club).ovr);
        twin.league.teams[1].twinUid = club.uid;
      }
    }

    return { teams: teams, fixtures: makeFixtures(n), round: 0 };
  }

  function nextFixture(club) {
    var lg = club.league;
    if (!lg || lg.round >= lg.fixtures.length) return null;
    if (lg.isRace) return null;
    var round = lg.fixtures[lg.round];
    for (var i = 0; i < round.length; i++) {
      if (round[i][0] === 0 || round[i][1] === 0) {
        var opp = lg.teams[round[i][0] === 0 ? round[i][1] : round[i][0]];
        return {
          home: round[i][0], away: round[i][1],
          youHome: round[i][0] === 0,
          opp: opp,
          twin: !!(opp && opp.twinUid)
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

  function pointsFor(sportId, scored, conceded) {
    if (scored > conceded) return sportId === 'rugby' ? 4 : (sportId === 'basket' ? 2 : 3);
    if (scored === conceded) return sportId === 'basket' ? 0 : (sportId === 'rugby' ? 2 : 1);
    return sportId === 'basket' ? 1 : 0;
  }

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

  function matchIncome(club, isHome, won, drew) {
    var sport = sportDef(club.sport);
    var e = sport.economy;
    var repF = 0.35 + club.rep / 70;
    var mult = countryCoef(sport, club.country) * divisionCoef(club.division);
    var sponsorBonus = 1 + G.eco.bonus('sponsor');

    var gate = 0;
    if (sport.type !== 'race') {
      gate = e.gateBase * repF * mult * (1 + (club.facilities.stade - 1) * 0.12);
      if (!isHome) gate *= 0.18;
      gate *= u.rfloat(0.85, 1.15);
    }
    var sponsor = e.sponsorBase * repF * mult *
      (1 + (club.facilities.marketing - 1) * 0.15) * sponsorBonus * sponsorMult(club);

    var prize = won ? e.prizeWin : (drew ? e.prizeDraw : e.prizeLoss);
    prize *= (0.6 + club.rep / 160) * mult;

    return { gate: gate, sponsor: sponsor, prize: prize, total: gate + sponsor + prize };
  }

  /* ===================================================== APRÈS-MATCH ===== */

  function finishMatch(club, res, skipTwin, homeOverride) {
    var sport = sportDef(club.sport);
    var s = G.state;
    var won = res.you > res.opp, drew = res.you === res.opp;

    var fx = nextFixture(club);
    if (fx) {
      var oppIdx = fx.youHome ? fx.away : fx.home;
      applyResult(club, 0, res.you, res.opp);
      applyResult(club, oppIdx, res.opp, res.you);
      simOtherMatches(club, club.league.round);
      club.league.round++;
    }

    /* Un derby entre deux de vos clubs impose son propre domicile/extérieur
     * (les deux calendriers, symétriques, se déclareraient sinon chacun
     * « à domicile »). */
    var isHome = homeOverride !== undefined ? homeOverride : (fx ? fx.youHome : true);
    var inc = matchIncome(club, isHome, won, drew);
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

      var o = ovr(p, sport);
      if (p.age < 27 && o < p.pot && u.chance(0.16 + trainingLvl * 0.025)) {
        bumpAttr(p, sport, 1);
      } else if (p.age > 31 && u.chance(0.10)) {
        bumpAttr(p, sport, -1);
      }
    }
    refreshPlayerEconomics(club);

    club.rep = u.clamp(club.rep + (won ? 0.7 : drew ? 0.1 : -0.35), 1, 100);
    club.league.teams[0].str = Math.round(teamRatings(club).ovr);

    if (won) {
      var boost = 0.006 + club.rep / 4000;
      G.market.addBoost(u.pick(G.DATA.sportStocks), boost * divisionCoef(club.division));
    } else if (!drew) {
      G.market.addBoost(u.pick(G.DATA.sportStocks), -0.004);
    }

    club.results.unshift({
      season: club.season, round: club.league.round,
      you: res.you, opp: res.opp, oppName: res.oppName,
      home: isHome, net: net
    });
    if (club.results.length > 40) club.results.length = 40;

    s.stats.matchesPlayed++;

    if (club.league.round >= club.league.fixtures.length) endSeason(club);

    /* Le club jumeau (même sport/pays/division) doit progresser du même
     * nombre de matchs : on l'avance automatiquement d'un tour, le joueur
     * n'étant coach d'aucun des deux pendant ce tour-ci. */
    if (!skipTwin && club.twinUid) {
      var twin = byUid(club.twinUid);
      if (twin && twin.league && !twin.league.isRace) {
        var twinFx = nextFixture(twin);
        if (twinFx && !twinFx.twin) {
          var tSport = sportDef(twin.sport);
          var tStr = teamRatings(twin).ovr, oStr = twinFx.opp.str;
          var tAtt = tStr + (twinFx.youHome ? 3 : 0), oAtt = oStr + (twinFx.youHome ? 0 : 3);
          var tGoals = simScore(tAtt, oStr, tSport), oGoals = simScore(oAtt, tStr, tSport);
          finishMatch(twin, { you: tGoals, opp: oGoals, oppName: twinFx.opp.name }, true);
        }
      }
    }

    return { income: inc, wages: bill, net: net };
  }

  /**
   * Résout le derby entre deux clubs jumeaux : un seul résultat, calculé une
   * fois, appliqué aux deux championnats. Le joueur n'est coach d'aucun des
   * deux camps, il ne fait qu'observer.
   */
  function resolveDerby(club) {
    var fx = nextFixture(club);
    if (!fx || !fx.twin) return null;
    var twin = byUid(fx.opp.twinUid);
    if (!twin) return null;
    var sport = sportDef(club.sport);
    var strA = teamRatings(club).ovr, strB = teamRatings(twin).ovr;
    var homeIsA = fx.youHome;
    var attA = strA + (homeIsA ? 3 : 0), attB = strB + (homeIsA ? 0 : 3);
    var sA = simScore(attA, strB, sport);
    var sB = simScore(attB, strA, sport);
    finishMatch(club, { you: sA, opp: sB, oppName: twin.name }, true, homeIsA);
    finishMatch(twin, { you: sB, opp: sA, oppName: club.name }, true, !homeIsA);
    return { a: club, b: twin, sa: sA, sb: sB, homeIsA: homeIsA };
  }

  function bumpAttr(p, sport, delta) {
    var pd = posDef(sport, p.pos);
    var keys = Object.keys(pd.w).sort(function (a, b) { return pd.w[b] - pd.w[a]; });
    var k = u.chance(0.6) ? keys[0] : u.pick(keys);
    p.attrs[k] = u.clamp(p.attrs[k] + delta, 10, 99);
  }

  /* ===================================================== FIN DE SAISON === */

  function endSeason(club) {
    var sport = sportDef(club.sport);
    var rank = rankOf(club);
    var s = G.state;
    var nTeams = club.league.teams.length;
    var international = club.division === 0;
    var mult = countryCoef(sport, club.country) * divisionCoef(club.division);

    var tv = sport.economy.tvSeason * mult *
      (0.4 + (nTeams - rank + 1) / nTeams * 0.9) * (0.5 + club.rep / 100) *
      (international ? 4 : 1);
    G.eco.earn(tv, 'manager:' + club.sport,
      (international ? 'Prime de compétition internationale (' : 'Droits TV & prime de classement (') +
      rank + 'e) · ' + club.name);

    var promoted = false, relegated = false;

    if (rank === 1) {
      s.manager.trophies.push({
        sport: club.sport, season: club.season, club: club.name,
        name: international ? 'Compétition internationale · ' + G.DATA.worldById[club.country].n
          : leagueTitle(club),
        country: club.country, division: club.division
      });
      club.rep = u.clamp(club.rep + 8, 1, 100);
      G.market.addBoost(u.pick(G.DATA.sportStocks), 0.05 * divisionCoef(club.division),
        club.name + ' champion : les équipementiers s\'envolent');
    }

    /* Montée : les deux premiers. Descente : les deux derniers (sauf en D3).
       Les équipes nationales (division 0) ne montent ni ne descendent. */
    if (international) {
      club.rep = u.clamp(club.rep + (rank <= 3 ? 3 : -1), 1, 100);
    } else if (rank <= 2 && club.division > MIN_DIVISION) {
      club.division--;
      promoted = true;
      club.rep = u.clamp(club.rep + 6, 1, 100);
    } else if (rank >= nTeams - 1 && club.division < MAX_DIVISION) {
      club.division++;
      relegated = true;
      club.rep = u.clamp(club.rep - 6, 1, 100);
    } else if (rank <= 3) {
      club.rep = u.clamp(club.rep + 2, 1, 100);
    }

    club.history.push({
      season: club.season, rank: rank, division: club.division,
      pts: club.league.teams[0].pts,
      in: Math.round(club.finances.seasonIn), out: Math.round(club.finances.seasonOut),
      promoted: promoted, relegated: relegated
    });

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
      club.players.push(makePlayer(sport, q, { age: u.rint(17, 19), spread: 6 }));
    }
    var minSquad = sport.type === 'race' ? sport.lineupSize : sport.squadSize - 1;
    while (club.players.length < minSquad) {
      club.players.push(makePlayer(sport, 42 + club.rep * 0.22 + u.rfloat(-4, 6),
        { age: u.rint(19, 29) }));
    }

    refreshPlayerEconomics(club);
    club.season++;
    club.finances.seasonIn = 0;
    club.finances.seasonOut = 0;
    club.league = makeLeague(club, sport);
    club.transferList = null;
    autoLineup(club);

    if (G.ui) {
      if (rank === 1) {
        G.ui.toast('🏆 TITRE !', club.name + ' champion · ' + leagueTitle(club), 'good');
      }
      if (promoted) {
        G.ui.toast('⬆️ Montée !', club.name + ' accède en ' +
          divisionName(sport, club.division), 'good');
      } else if (relegated) {
        G.ui.toast('⬇️ Relégation', club.name + ' descend en ' +
          divisionName(sport, club.division), 'bad');
      } else {
        G.ui.toast('📅 Nouvelle saison', club.name + ' — ' + rank + 'e la saison passée');
      }
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
    var ceiling = divisionLevel(club.division) + 18;
    for (var i = 0; i < n; i++) {
      var q = 38 + club.rep * 0.30 + scout * 2.6 + u.rfloat(-9, 11) +
        (3 - club.division) * 5;
      var p = makePlayer(sport, u.clamp(q, 28, ceiling), {});
      p.wage = wage(p, sport, club);
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

  /* ======================================================= SPONSORING ==== */

  var SPONSOR_TIERS = [
    { name: 'Sponsor local' }, { name: 'Sponsor régional' },
    { name: 'Sponsor national' }, { name: 'Sponsor multinational' },
    { name: 'Sponsor de prestige' }, { name: 'Partenaire mondial' }
  ];

  function sponsorMult(club) {
    var lvl = u.clamp(club.sponsorTier || 1, 1, SPONSOR_TIERS.length);
    return 1 + (lvl - 1) * 0.5;
  }

  function sponsorTierDef(club) {
    return SPONSOR_TIERS[u.clamp((club.sponsorTier || 1) - 1, 0, SPONSOR_TIERS.length - 1)];
  }

  function sponsorMaxed(club) { return (club.sponsorTier || 1) >= SPONSOR_TIERS.length; }

  function sponsorCost(club) {
    var sport = sportDef(club.sport);
    var lvl = club.sponsorTier || 1;
    if (lvl >= SPONSOR_TIERS.length) return Infinity;
    return sport.economy.clubCost * countryCoef(sport, club.country) *
      divisionCoef(club.division) * 0.6 * Math.pow(2.1, lvl - 1);
  }

  function upgradeSponsor(club) {
    if (sponsorMaxed(club)) return false;
    var cost = sponsorCost(club);
    if (!G.eco.spend(cost, 'manager:' + club.sport, 'Nouveau sponsor · ' + club.name)) return false;
    club.sponsorTier = (club.sponsorTier || 1) + 1;
    club.rep = u.clamp(club.rep + 1.5, 1, 100);
    return true;
  }

  /* =================================================== CRÉATION CLUB ===== */

  /**
   * Rachète un club dans le pays choisi, à la division voulue (D3 par
   * défaut). Plus la division est proche de l'élite, plus le prix explose.
   * @param {string} sportId
   * @param {string} code      code ISO du pays
   * @param {string} name      nom voulu (facultatif)
   * @param {number} division  1 (élite) à 10 (D3) ; défaut 10
   */
  function buyClub(sportId, code, name, division) {
    var sport = sportDef(sportId);
    if (!sport) return null;
    division = u.clamp(division === undefined ? MAX_DIVISION : division, MIN_DIVISION, MAX_DIVISION);
    var s = G.state;
    var cost = clubPrice(sportId, code, division);
    var finalName = (name || clubNameFor(sportId, code)).slice(0, 30);

    if (!G.eco.spend(cost, 'manager:' + sportId, 'Rachat · ' + finalName)) return null;

    var quality = divisionLevel(division) * countryCoef(sport, code) * 0.7 + 15;
    var club = {
      uid: u.uid('cl'),
      sport: sportId,
      name: finalName,
      country: code,
      division: division,
      national: false,
      rep: 22 + countryCoef(sport, code) * 8 + (MAX_DIVISION - division) * 1.2,
      season: 1,
      players: makeSquad(sport, quality),
      tactics: { mentality: 2, pressing: 1, style: 1 },
      facilities: { stade: 1, entrainement: 1, formation: 1, medical: 1, marketing: 1 },
      staff: { coach: 1, adjoint: 1, scout: 1, medecin: 1 },
      sponsorTier: 1,
      finances: { seasonIn: 0, seasonOut: 0, last: null },
      results: [], history: [], transferList: null,
      boughtDay: s.market.day
    };
    if (sport.type === 'race') {
      club.car = { moteur: 42, aero: 40, chassis: 41, fiabilite: 52 };
    }
    autoLineup(club);
    refreshPlayerEconomics(club);
    club.league = makeLeague(club, sport);

    clubs().push(club);
    s.manager.active = club.uid;
    G.market.addBoost(u.pick(G.DATA.sportStocks), 0.015,
      'Un investisseur rachète un club de ' + sport.name.toLowerCase());
    return club;
  }

  /**
   * Rachète la fédération d'un pays : l'équipe nationale, qui joue des
   * compétitions internationales plutôt qu'un championnat domestique.
   */
  function buyNationalTeam(sportId, code, name) {
    var sport = sportDef(sportId);
    if (!sport || sport.type === 'race') return null;
    var s = G.state;
    var cost = nationalTeamPrice(sportId, code);
    var nation = G.DATA.worldById[code];
    var finalName = (name || (nation ? 'Équipe de ' + nation.n : clubNameFor(sportId, code))).slice(0, 30);

    if (!G.eco.spend(cost, 'manager:' + sportId, 'Rachat de la fédération · ' + finalName)) return null;

    var quality = divisionLevel(0) * countryCoef(sport, code) * 0.75 + 20;
    var club = {
      uid: u.uid('cl'),
      sport: sportId,
      name: finalName,
      country: code,
      division: 0,
      national: true,
      rep: 40 + countryCoef(sport, code) * 12,
      season: 1,
      players: makeSquad(sport, quality),
      tactics: { mentality: 2, pressing: 1, style: 1 },
      facilities: { stade: 1, entrainement: 1, formation: 1, medical: 1, marketing: 1 },
      staff: { coach: 1, adjoint: 1, scout: 1, medecin: 1 },
      sponsorTier: 1,
      finances: { seasonIn: 0, seasonOut: 0, last: null },
      results: [], history: [], transferList: null,
      boughtDay: s.market.day
    };
    autoLineup(club);
    refreshPlayerEconomics(club);
    club.league = makeLeague(club, sport);

    clubs().push(club);
    s.manager.active = club.uid;
    G.market.addBoost(u.pick(G.DATA.sportStocks), 0.03,
      'Un magnat rachète la fédération de ' + sport.name.toLowerCase() +
      (nation ? ' de ' + nation.n : ''));
    return club;
  }

  function renameClub(uid, name) {
    var c = byUid(uid);
    if (!c || !name) return false;
    c.name = String(name).slice(0, 30);
    if (c.league && c.league.teams && c.league.teams[0]) c.league.teams[0].name = c.name;
    return true;
  }

  /** Détache un club de son jumeau (revente, fusion) : l'autre récupère un
   * adversaire fictif ordinaire à la place. */
  function unlinkTwin(club) {
    if (!club.twinUid) return;
    var twin = byUid(club.twinUid);
    club.twinUid = null;
    if (twin) {
      twin.twinUid = null;
      if (twin.league && twin.league.teams && twin.league.teams[1] &&
          twin.league.teams[1].twinUid === club.uid) {
        var sport = sportDef(twin.sport);
        twin.league.teams[1].name = clubNameFor(sport.id, twin.country);
        delete twin.league.teams[1].twinUid;
      }
    }
  }

  function sellClub(uid) {
    var club = byUid(uid);
    if (!club) return false;
    unlinkTwin(club);
    var v = clubValue(club) * 0.85;
    var l = clubs();
    l.splice(l.indexOf(club), 1);
    if (G.state.manager.active === uid) {
      G.state.manager.active = l.length ? l[0].uid : null;
    }
    G.eco.earn(v, 'manager:' + club.sport, 'Cession du club · ' + club.name);
    return true;
  }

  /* ========================================================== FUSIONS ==== */

  /** Deux équipes nationales, ou une nationale + un club, ne se fusionnent pas. */
  function canMergeClubs(a, b) {
    return !!a && !!b && a.uid !== b.uid && !a.national && !b.national;
  }

  /**
   * Fusionne deux clubs en un seul, plus gros. Même sport : les effectifs
   * sont combinés (on garde les meilleurs) et la meilleure division est
   * conservée. Sports différents : la valeur du club absorbé se transforme
   * en capital et en réputation pour le club qui survit.
   */
  function mergeClub(uidA, uidB) {
    var a = byUid(uidA), b = byUid(uidB);
    if (!canMergeClubs(a, b)) return false;
    var sameSport = a.sport === b.sport;
    var sport = sportDef(a.sport);

    if (sameSport) {
      var combined = a.players.concat(b.players);
      combined = u.sortBy(combined, function (p) { return ovr(p, sport); }, true);
      a.players = combined.slice(0, sport.squadSize + 6);
      a.division = Math.min(a.division, b.division);
    }

    var absorbed = clubValue(b) * (sameSport ? 0.55 : 0.75);
    G.eco.earn(absorbed, 'manager:' + a.sport, 'Fusion · ' + b.name + ' → ' + a.name, true);
    a.rep = u.clamp(a.rep + (sameSport ? 10 : 5), 1, 100);

    unlinkTwin(b);
    var list = clubs();
    list.splice(list.indexOf(b), 1);
    if (G.state.manager.active === b.uid) G.state.manager.active = a.uid;

    autoLineup(a);
    refreshPlayerEconomics(a);
    a.league = makeLeague(a, sport);

    if (G.ui) {
      G.ui.toast('🤝 Fusion réalisée', b.name + ' rejoint ' + a.name +
        ' · ' + u.fmtMoney(absorbed) + ' absorbés', 'good');
    }
    return true;
  }

  function restDay(club) {
    var lvl = club.facilities.entrainement || 1;
    for (var i = 0; i < club.players.length; i++) {
      var p = club.players[i];
      p.energy = u.clamp(p.energy + 4 + lvl, 0, 100);
    }
  }

  return {
    sportDef: sportDef, posDef: posDef, ovr: ovr, effOvr: effOvr,
    clubs: clubs, byUid: byUid, activeClub: activeClub, clubsOfSport: clubsOfSport,
    countryCoef: countryCoef, divisionCoef: divisionCoef, divisionLevel: divisionLevel,
    divisionName: divisionName, divisionShort: divisionShort,
    MIN_DIVISION: MIN_DIVISION, MAX_DIVISION: MAX_DIVISION,
    leagueTitle: leagueTitle, clubPrice: clubPrice, nationalTeamPrice: nationalTeamPrice,
    makePlayer: makePlayer, makeSquad: makeSquad, value: value, wage: wage,
    autoLineup: autoLineup, starters: starters, bench: bench,
    teamRatings: teamRatings, squadAvg: squadAvg, wageBill: wageBill,
    clubValue: clubValue,
    facilityCost: facilityCost, upgradeFacility: upgradeFacility,
    staffCost: staffCost, upgradeStaff: upgradeStaff,
    carPartCost: carPartCost, upgradeCar: upgradeCar,
    sponsorCost: sponsorCost, upgradeSponsor: upgradeSponsor,
    sponsorTierDef: sponsorTierDef, sponsorMaxed: sponsorMaxed,
    makeLeague: makeLeague, nextFixture: nextFixture, standings: standings,
    rankOf: rankOf, pointsFor: pointsFor, simScore: simScore,
    pickScoreValue: pickScoreValue, matchIncome: matchIncome,
    finishMatch: finishMatch, endSeason: endSeason, resolveDerby: resolveDerby,
    refreshTransfers: refreshTransfers, signPlayer: signPlayer,
    sellPlayer: sellPlayer, buyClub: buyClub, buyNationalTeam: buyNationalTeam,
    renameClub: renameClub, sellClub: sellClub,
    canMergeClubs: canMergeClubs, mergeClub: mergeClub,
    restDay: restDay, clubNameFor: clubNameFor,
    refreshPlayerEconomics: refreshPlayerEconomics
  };
})();
