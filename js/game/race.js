/* Sport automobile : week-end de Grand Prix jouable.
 *
 * Deux voitures, une stratégie pneumatique, la pluie, la voiture de sécurité
 * et des décisions au muret. Le championnat se joue sur une saison de courses
 * et rapporte des points, donc de l'argent, donc du capital à replacer
 * ailleurs dans l'empire.
 */
window.G = window.G || {};

G.race = (function () {
  'use strict';
  var u = G.util;

  var CIRCUITS = [
    'Grand Prix de Valmont', 'Grand Prix de Nordvik', 'Grand Prix d\'Alcázar',
    'Grand Prix de Ravenna', 'Grand Prix de Port-Lambert', 'Grand Prix de Kirkwall',
    'Grand Prix de Montclair', 'Grand Prix d\'Estoril', 'Grand Prix de Cassagne',
    'Grand Prix de Hafenstadt', 'Grand Prix de Torrelles', 'Grand Prix de Brienne',
    'Grand Prix de Lindenau', 'Grand Prix de Grandval'
  ];

  var TEAM_NAMES = ['Scuderia Aurora', 'Northwind Racing', 'Meridian GP',
    'Kestrel Motorsport', 'Vulcano Corse', 'Aeris Racing', 'Delta Competizione',
    'Ardente Squadra'];

  /* ==================================================== SAISON =========== */

  function makeSeason(club, sport) {
    var n = sport.leagueSize;
    var teams = [{ name: club.name, str: G.manager.teamRatings(club).ovr, you: true, pts: 0 }];
    var names = u.shuffle(TEAM_NAMES);
    for (var i = 1; i < n; i++) {
      teams.push({
        name: names[i - 1] || ('Écurie ' + i),
        str: Math.round(u.clamp(club.rep * 0.5 + 40 + u.gauss(0, 8), 34, 92)),
        you: false, pts: 0
      });
    }
    for (i = 0; i < teams.length; i++) {
      teams[i].pts = 0; teams[i].w = 0; teams[i].d = 0; teams[i].l = 0;
      teams[i].sf = 0; teams[i].sa = 0; teams[i].played = 0; teams[i].podiums = 0;
    }
    return {
      teams: teams,
      fixtures: u.shuffle(CIRCUITS).slice(0, 14),
      round: 0,
      isRace: true
    };
  }

  function nextRace(club) {
    var lg = club.league;
    if (!lg || lg.round >= lg.fixtures.length) return null;
    return { circuit: lg.fixtures[lg.round], round: lg.round + 1, total: lg.fixtures.length };
  }

  /* =================================================== WEEK-END ========== */

  function carPace(driverOvr, car) {
    var mech = (car.moteur * 0.38 + car.aero * 0.36 + car.chassis * 0.26);
    return mech * 0.55 + driverOvr * 0.45;
  }

  function tyreDef(sport, id) {
    var t = sport.race.tyres;
    for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[i];
    return t[1];
  }

  function create(club) {
    var sport = G.manager.sportDef(club.sport);
    var evt = nextRace(club);
    if (!evt) return null;

    var drivers = u.sortBy(club.players, function (p) {
      return G.manager.effOvr(p, sport);
    }, true).slice(0, 2);
    while (drivers.length < 2) {
      drivers.push(G.manager.makePlayer(sport, 50, { pos: 'P2' }));
    }

    var cars = [], i, j;
    var teams = club.league.teams;
    for (i = 0; i < teams.length; i++) {
      var t = teams[i];
      for (j = 0; j < 2; j++) {
        var isYou = !!t.you;
        var pace;
        if (isYou) {
          pace = carPace(G.manager.effOvr(drivers[j], sport), club.car);
        } else {
          pace = u.clamp(t.str + u.gauss(0, 2.5) - j * 1.6, 20, 99);
        }
        cars.push({
          id: t.name + '#' + (j + 1),
          driver: isYou ? drivers[j].name : (u.pick(G.DATA.firstNames)[0] + '. ' +
            u.pick(G.DATA.lastNames)),
          team: t.name,
          teamIdx: i,
          isYou: isYou,
          lead: isYou && j === 0,          // voiture pilotée par vos décisions
          pace: pace,
          player: isYou ? drivers[j] : null,
          tyre: 'medium',
          wear: 0,
          time: 0,
          lapsDone: 0,
          stops: 0,
          out: false,
          aggr: 1.0
        });
      }
    }

    /* Qualifications : l'ordre de départ dépend du rythme, avec une part d'aléa. */
    cars = u.sortBy(cars, function (c) { return c.pace + u.gauss(0, 2.2); }, true);
    for (i = 0; i < cars.length; i++) { cars[i].grid = i + 1; cars[i].pos = i + 1; }

    var R = {
      club: club, sport: sport, circuit: evt.circuit, round: evt.round, total: evt.total,
      laps: sport.race.laps, lap: 0,
      cars: cars,
      feed: [],
      decision: null,
      done: false,
      rain: false,
      safety: 0,
      result: null,
      askedPit: {}
    };

    var mine = cars.filter(function (c) { return c.isYou; });
    push(R, 0, '🏁 ' + evt.circuit + ' — qualifications terminées. ' +
      mine.map(function (c) { return c.driver + ' P' + c.grid; }).join(', ') + '.', 'info');

    R.decision = startDecision(R);
    return R;
  }

  function push(R, lap, txt, type) {
    R.feed.unshift({ min: lap, txt: txt, type: type || 'info' });
    if (R.feed.length > 60) R.feed.length = 60;
  }

  function myLead(R) {
    for (var i = 0; i < R.cars.length; i++) if (R.cars[i].lead) return R.cars[i];
    return null;
  }
  function myCars(R) {
    return R.cars.filter(function (c) { return c.isYou; });
  }

  /* ------------------------------------------------------------ tour ---- */

  function lapTime(R, c) {
    var sport = R.sport;
    var t = tyreDef(sport, c.tyre);
    var base = 90;
    var pacePart = (75 - c.pace) * 0.16;
    var tyrePart = -t.pace;
    var wearPart = Math.max(0, (c.wear - 45) / 55) * 2.8;
    var aggrPart = -(c.aggr - 1) * 1.4;
    var wrongTyre = 0;
    if (R.rain && !t.rain) wrongTyre = 7.5;
    if (!R.rain && t.rain) wrongTyre = 3.2;
    var noise = u.gauss(0, 0.30);
    var sc = R.safety > 0 ? 12 : 0;    // neutralisation
    return base + pacePart + tyrePart + wearPart + aggrPart + wrongTyre + noise + sc;
  }

  function wearPerLap(R, c) {
    var t = tyreDef(R.sport, c.tyre);
    var chassis = c.isYou ? R.club.car.chassis : 55;
    return 3.0 * t.wear * c.aggr * (1 - (chassis - 50) / 300) * (R.rain ? 0.85 : 1);
  }

  function aiStrategy(R, c) {
    if (c.out) return;
    var remaining = R.laps - c.lapsDone;
    /* Passage aux stands quand les gommes sont mortes, ou pluie soudaine. */
    var needWet = R.rain && !tyreDef(R.sport, c.tyre).rain;
    var needDry = !R.rain && tyreDef(R.sport, c.tyre).rain;
    if ((c.wear > u.rint(72, 88) && remaining > 4) || needWet || needDry) {
      pit(R, c, R.rain ? 'pluie' : (remaining <= 14 ? 'tendre' : 'medium'), true);
    }
  }

  function pit(R, c, tyreId, silent) {
    c.time += R.sport.race.pitLoss * (R.safety > 0 ? 0.45 : 1);
    c.tyre = tyreId;
    c.wear = 0;
    c.stops++;
    if (!silent || c.isYou) {
      push(R, R.lap, '🔧 ' + c.driver + ' passe par les stands (' +
        tyreDef(R.sport, tyreId).name.toLowerCase() + ')', c.isYou ? 'good' : 'info');
    }
  }

  /** Avance la course d'un tour. */
  function step(R) {
    if (R.done || R.decision) return R;
    R.lap++;

    /* Météo. */
    if (!R.rain && R.lap > 3 && u.chance(0.035)) {
      R.rain = true;
      push(R, R.lap, '🌧️ La pluie arrive sur le circuit !', 'warn');
      R.decision = rainDecision(R);
    } else if (R.rain && u.chance(0.05)) {
      R.rain = false;
      push(R, R.lap, '☀️ La piste sèche rapidement.', 'info');
    }

    /* Voiture de sécurité. */
    if (R.safety > 0) {
      R.safety--;
      if (R.safety === 0) push(R, R.lap, '🟢 Course relancée !', 'info');
    } else if (u.chance(0.035)) {
      R.safety = u.rint(2, 4);
      push(R, R.lap, '🟡 Voiture de sécurité en piste.', 'warn');
      var lead = myLead(R);
      if (lead && !lead.out && lead.wear > 30) R.decision = safetyDecision(R);
    }

    var i, c;
    for (i = 0; i < R.cars.length; i++) {
      c = R.cars[i];
      if (c.out) continue;

      /* Abandon mécanique / sortie de piste. */
      var reliab = c.isYou ? R.club.car.fiabilite : 62;
      var risk = (1 - reliab / 130) * 0.006 * c.aggr * (R.rain ? 1.7 : 1);
      if (u.chance(risk)) {
        c.out = true;
        push(R, R.lap, (c.isYou ? '💥 ' : '⚠️ ') + c.driver + ' abandonne (' +
          u.pick(['casse moteur', 'sortie de piste', 'problème hydraulique', 'accrochage']) + ')',
          c.isYou ? 'bad' : 'info');
        continue;
      }

      c.time += lapTime(R, c);
      c.wear = Math.min(140, c.wear + wearPerLap(R, c));
      c.lapsDone++;

      if (!c.lead) aiStrategy(R, c);
    }

    /* Classement à l'issue du tour. */
    var running = R.cars.filter(function (x) { return !x.out; });
    running = u.sortBy(running, function (x) { return x.time; });
    for (i = 0; i < running.length; i++) running[i].pos = i + 1;
    var outCars = R.cars.filter(function (x) { return x.out; });
    for (i = 0; i < outCars.length; i++) outCars[i].pos = running.length + 1 + i;

    var lead2 = myLead(R);
    if (lead2 && !lead2.out && R.lap % 5 === 0) {
      push(R, R.lap, '📻 ' + lead2.driver + ' est P' + lead2.pos + ' — gommes à ' +
        Math.round(Math.max(0, 100 - lead2.wear)) + ' %', 'info');
    }

    /* Question au muret quand les pneus s'usent. */
    if (lead2 && !lead2.out && !R.decision && lead2.wear > 68 &&
      R.laps - R.lap > 3 && !R.askedPit[Math.floor(R.lap / 6)]) {
      R.askedPit[Math.floor(R.lap / 6)] = true;
      R.decision = pitDecision(R, lead2);
    }

    if (R.lap >= R.laps && !R.decision) finish(R);
    return R;
  }

  /* -------------------------------------------------------- décisions --- */

  function opt(label, hint, apply) { return { label: label, hint: hint, apply: apply }; }

  function startDecision(R) {
    var lead = myLead(R);
    return {
      title: 'Stratégie de départ',
      text: 'Grille : ' + (lead ? 'P' + lead.grid : '—') + ' sur ' + R.cars.length +
        '. Quel train de pneus et quelle agressivité ?',
      options: [
        opt('Tendres + attaque', 'Rapide, mais un arrêt de plus', function (r) {
          myCars(r).forEach(function (c) { c.tyre = 'tendre'; c.aggr = 1.18; });
        }),
        opt('Mediums + rythme équilibré', 'Le compromis classique', function (r) {
          myCars(r).forEach(function (c) { c.tyre = 'medium'; c.aggr = 1.0; });
        }),
        opt('Durs + gestion', 'Un seul arrêt possible', function (r) {
          myCars(r).forEach(function (c) { c.tyre = 'dur'; c.aggr = 0.92; });
        })
      ]
    };
  }

  function pitDecision(R, c) {
    var remaining = R.laps - R.lap;
    return {
      title: 'Muret des stands — tour ' + R.lap,
      text: c.driver + ' est P' + c.pos + ', gommes à ' +
        Math.round(Math.max(0, 100 - c.wear)) + ' %. ' + remaining + ' tours restants.',
      options: [
        opt('Rentrer en tendres', 'Rythme maximal jusqu\'à l\'arrivée', function (r) {
          pit(r, c, 'tendre'); c.aggr = 1.15;
        }),
        opt('Rentrer en durs', 'Aucun autre arrêt nécessaire', function (r) {
          pit(r, c, 'dur'); c.aggr = 0.98;
        }),
        opt('Rester en piste', 'On gagne la position, on perd du rythme', function (r) {
          c.aggr = 0.90;
          push(r, r.lap, '📻 « On reste dehors, gère les pneus. »', 'warn');
        })
      ]
    };
  }

  function rainDecision(R) {
    return {
      title: 'La pluie tombe',
      text: 'Averse sur la deuxième partie du circuit. Décision immédiate.',
      options: [
        opt('Tout le monde aux stands', 'Pneus pluie pour vos deux voitures', function (r) {
          myCars(r).forEach(function (c) { if (!c.out) pit(r, c, 'pluie'); });
        }),
        opt('Attendre un tour', 'Pari : l\'averse peut passer', function (r) {
          push(r, r.lap, '📻 « On attend, ça peut sécher. »', 'warn');
          myCars(r).forEach(function (c) { c.aggr = 0.88; });
        }),
        opt('Seulement la voiture de tête', 'Stratégie séparée entre les deux pilotes',
          function (r) {
            var lead = myLead(r);
            if (lead && !lead.out) pit(r, lead, 'pluie');
          })
      ]
    };
  }

  function safetyDecision(R) {
    var lead = myLead(R);
    return {
      title: 'Voiture de sécurité !',
      text: 'Un arrêt coûte deux fois moins cher pendant la neutralisation.',
      options: [
        opt('Arrêt gratuit maintenant', 'On profite de la neutralisation', function (r) {
          myCars(r).forEach(function (c) {
            if (!c.out) pit(r, c, r.rain ? 'pluie' : (r.laps - r.lap <= 12 ? 'tendre' : 'medium'));
          });
        }),
        opt('Rester dehors', 'On garde la position en piste', function (r) {
          push(r, r.lap, '📻 « On reste dehors, on garde la position. »', 'info');
        }),
        opt('Uniquement ' + (lead ? lead.driver : 'la voiture de tête'), 'Stratégie décalée',
          function (r) {
            var l = myLead(r);
            if (l && !l.out) pit(r, l, r.rain ? 'pluie' : 'medium');
          })
      ]
    };
  }

  function decide(R, index) {
    if (!R.decision) return R;
    var o = R.decision.options[index];
    R.decision = null;
    if (o && o.apply) o.apply(R);
    if (R.lap >= R.laps) finish(R);
    return R;
  }

  /* ------------------------------------------------------------- fin ---- */

  function finish(R) {
    if (R.done) return R;
    R.done = true;

    var sport = R.sport, club = R.club;
    var pts = sport.race.points;
    var mine = myCars(R);
    var teamPoints = 0, best = 99, i;

    var finishers = u.sortBy(R.cars.filter(function (c) { return !c.out; }),
      function (c) { return c.time; });
    for (i = 0; i < finishers.length; i++) finishers[i].pos = i + 1;

    for (i = 0; i < R.cars.length; i++) {
      var c = R.cars[i];
      var got = (!c.out && c.pos <= pts.length) ? pts[c.pos - 1] : 0;
      club.league.teams[c.teamIdx].pts += got;
      if (c.isYou) {
        teamPoints += got;
        if (!c.out && c.pos < best) best = c.pos;
        if (c.player) {
          c.player.apps++;
          c.player.scored = (c.player.scored || 0) + got;
          c.player.seasonScored = (c.player.seasonScored || 0) + got;
        }
      }
    }

    push(R, R.lap, '🏁 Arrivée — ' + mine.map(function (c) {
      return c.driver + (c.out ? ' ABANDON' : ' P' + c.pos);
    }).join(' · ') + ' → ' + teamPoints + ' points', teamPoints > 0 ? 'good' : 'bad');

    R.result = finishRace(club, { points: teamPoints, best: best, cars: mine });
    return R;
  }

  /** Argent, réputation, usure des voitures et effets de bord. */
  function finishRace(club, res) {
    var sport = G.manager.sportDef(club.sport);
    var e = sport.economy;
    var repF = 0.35 + club.rep / 70;
    var sponsor = e.sponsorBase * repF *
      (1 + (club.facilities.marketing - 1) * 0.15) * (1 + G.eco.bonus('sponsor'));
    var prize = (e.prizePerPoint || 4e5) * res.points * repF;
    var total = sponsor + prize;
    var bill = G.manager.wageBill(club);

    G.eco.earn(total, 'manager:' + club.sport,
      'Grand Prix · ' + res.points + ' pts · ' + club.name, true);
    G.eco.spend(bill, 'manager:' + club.sport, 'Salaires écurie', true);

    club.finances.seasonIn += total;
    club.finances.seasonOut += bill;
    club.finances.last = {
      gate: 0, sponsor: sponsor, prize: prize, wages: bill, net: total - bill
    };

    var podium = res.best <= 3;
    club.rep = u.clamp(club.rep + (res.best === 1 ? 1.6 : podium ? 0.8 :
      res.points > 0 ? 0.25 : -0.35), 1, 100);

    /* Fatigue des pilotes et fiabilité qui s'use. */
    for (var i = 0; i < club.players.length; i++) {
      var p = club.players[i];
      p.energy = u.clamp(p.energy - u.rint(8, 18) + (club.facilities.entrainement - 1) * 2, 10, 100);
      p.form = u.clamp(p.form + (podium ? u.rint(2, 8) : u.rint(-5, 3)), 5, 99);
      p.morale = u.clamp(p.morale + (podium ? 5 : res.points ? 1 : -3), 5, 100);
    }
    club.car.fiabilite = Math.max(30, club.car.fiabilite - u.rfloat(0, 1.2));

    club.league.teams[0].str = Math.round(G.manager.teamRatings(club).ovr);
    club.league.round++;

    club.results.unshift({
      season: club.season, round: club.league.round,
      you: res.points, opp: res.best <= 20 ? res.best : 0,
      oppName: 'meilleure place P' + (res.best <= 20 ? res.best : '-'),
      home: true, net: total - bill, race: true
    });
    if (club.results.length > 40) club.results.length = 40;

    G.state.stats.matchesPlayed++;

    if (podium) {
      G.market.addBoost(u.pick(G.DATA.sportStocks), 0.012 + (res.best === 1 ? 0.015 : 0));
    }

    if (club.league.round >= club.league.fixtures.length) G.manager.endSeason(club);

    return { income: { total: total, sponsor: sponsor, prize: prize, gate: 0 },
      wages: bill, net: total - bill };
  }

  /** Simulation express d'un Grand Prix. */
  function quickSim(club) {
    var R = create(club);
    if (!R) return null;
    var guard = 0;
    while (!R.done && guard < 400) {
      if (R.decision) decide(R, 1);
      else step(R);
      guard++;
    }
    if (!R.done) finish(R);
    return R;
  }

  return {
    CIRCUITS: CIRCUITS, makeSeason: makeSeason, nextRace: nextRace,
    create: create, step: step, decide: decide, finish: finish,
    finishRace: finishRace, quickSim: quickSim, myCars: myCars, myLead: myLead,
    tyreDef: tyreDef
  };
})();
