/* Moteur de match jouable.
 *
 * Une rencontre est découpée en séquences. À chaque séquence on tire les
 * actions décisives des deux équipes ; à certains moments clés, la main est
 * rendue au joueur (consignes, remplacements, choix tactiques) et ses
 * décisions modifient réellement la suite du match.
 *
 * L'objet match est volontairement temporaire : il ne va pas dans la
 * sauvegarde, seul le résultat final est enregistré.
 */
window.G = window.G || {};

G.match = (function () {
  'use strict';
  var u = G.util;

  /* --------------------------------------------------------- création --- */

  function create(club) {
    var sport = G.manager.sportDef(club.sport);
    var fx = G.manager.nextFixture(club);
    if (!fx) return null;

    var mine = G.manager.teamRatings(club);
    var oppStr = fx.opp.str;
    var homeBonus = fx.youHome ? 2.5 : -2.5;

    var M = {
      club: club,
      sport: sport,
      youHome: fx.youHome,
      oppName: fx.opp.name,
      you: { att: mine.att + homeBonus, def: mine.def + homeBonus * 0.6 },
      opp: { att: oppStr - homeBonus * 0.6, def: oppStr - homeBonus * 0.4 },
      score: { you: 0, opp: 0 },
      seg: 0,
      segments: sport.segments,
      minute: 0,
      mom: 0,
      feed: [],
      stats: { youShots: 0, oppShots: 0, poss: 50 },
      subsLeft: sport.type === 'race' ? 0 : (sport.id === 'basket' || sport.id === 'handball' ? 6 : 3),
      mods: { att: 0, def: 0, energy: 0, risk: 0 },
      scorers: {},
      decision: null,
      decisionsDone: {},
      done: false,
      result: null
    };

    push(M, 0, 'ℹ️ Coup d\'envoi — ' + (fx.youHome ? club.name + ' reçoit ' + fx.opp.name
      : club.name + ' se déplace à ' + fx.opp.name), 'info');
    return M;
  }

  function push(M, min, txt, type) {
    M.feed.unshift({ min: min, txt: txt, type: type || 'info' });
    if (M.feed.length > 60) M.feed.length = 60;
  }

  /* --------------------------------------------------------- mécanique -- */

  function expectedEvents(att, def, sport) {
    /* Un écart de niveau se traduit par un écart de rendement offensif, mais
       la sensibilité dépend du sport : 20 points d'écart bouleversent un match
       de football, beaucoup moins un match de basket où l'on marque 80 fois. */
    var spread = sport.spread === undefined ? 1.5 : sport.spread;
    var factor = Math.exp((att - def) / 100 * spread);
    return sport.avgEvents * u.clamp(factor, 0.45, 2.2);
  }

  function pickScorer(M) {
    var club = M.club, sport = M.sport;
    var line = G.manager.starters(club);
    if (!line.length) return null;
    var entries = line.map(function (p) {
      var pd = G.manager.posDef(sport, p.pos);
      var role = pd ? pd.role : 'mid';
      var w = role === 'att' ? 6 : role === 'mid' ? 3 : role === 'def' ? 1 : 0.15;
      return [p, w * (0.5 + G.manager.effOvr(p, sport) / 100)];
    });
    return u.weighted(entries);
  }

  var SCORE_VERBS = {
    football: ['ouvre le score d\'une frappe croisée', 'reprend le centre au second poteau',
      'trompe le gardien d\'une frappe enroulée', 'conclut un contre éclair',
      'marque de la tête sur corner'],
    rugby: ['aplatit dans l\'en-but après une percée', 'conclut un mouvement de trois-quarts',
      'passe en force sur la ligne', 'intercepte et file marquer'],
    waterpolo: ['ajuste le gardien à bout portant', 'trouve la lucarne en supériorité',
      'transforme le penalty', 'marque en contre-attaque'],
    basket: ['plante un tir à mi-distance', 'enchaîne un and-one', 'dunke sur la tête de la défense',
      'sanctionne à trois points'],
    handball: ['arme une roucoulette imparable', 'marque sur l\'aile', 'transforme le jet de sept mètres',
      'conclut en pivot']
  };

  var MISS_TXT = ['manque de peu', 'trouve le montant', 'voit sa tentative repoussée',
    'butte sur une défense héroïque', 'perd le ballon au pire moment'];

  function segmentMinutes(M) {
    return M.sport.duration / M.sport.segments;
  }

  /** Fait avancer le match d'une séquence. */
  function step(M) {
    if (M.done || M.decision) return M;

    var sport = M.sport;
    var minPerSeg = segmentMinutes(M);
    M.seg++;
    M.minute = Math.round(M.seg * minPerSeg);

    var youAtt = M.you.att + M.mods.att;
    var youDef = M.you.def + M.mods.def;

    var lamYou = expectedEvents(youAtt, M.opp.def, sport) / M.segments;
    var lamOpp = expectedEvents(M.opp.att, youDef, sport) / M.segments;

    lamYou *= (1 + M.mom * 0.30);
    lamOpp *= (1 - M.mom * 0.30);

    var nYou = u.poisson(Math.max(0.001, lamYou));
    var nOpp = u.poisson(Math.max(0.001, lamOpp));

    var i;
    for (i = 0; i < nYou; i++) scoreFor(M, true);
    for (i = 0; i < nOpp; i++) scoreFor(M, false);

    /* Occasions manquées, pour l'ambiance. */
    if (nYou === 0 && u.chance(0.30)) {
      var p = pickScorer(M);
      if (p) push(M, M.minute, '😖 ' + p.name + ' ' + u.pick(MISS_TXT), 'warn');
    }
    if (u.chance(0.12)) push(M, M.minute, flavor(M), 'info');

    /* Possession indicative. */
    var pw = youAtt / (youAtt + M.opp.att);
    M.stats.poss = Math.round(u.clamp(M.stats.poss * 0.7 + pw * 100 * 0.3, 20, 80));
    M.stats.youShots += nYou + (u.chance(0.5) ? 1 : 0);
    M.stats.oppShots += nOpp + (u.chance(0.5) ? 1 : 0);

    /* Amortissement de la dynamique et de la fatigue. */
    M.mom *= 0.80;
    M.mods.att *= 0.94;
    M.mods.def *= 0.94;
    if (M.seg > M.segments * 0.6) {
      M.mods.att -= 0.35;    // la fatigue pèse en fin de match
      M.mods.def -= 0.25;
    }

    /* Mi-temps et autres pauses. */
    var half = Math.floor(M.segments / 2);
    if (M.seg === half) {
      push(M, M.minute, '⏸️ Mi-temps — ' + scoreLine(M), 'info');
    }

    maybeDecision(M);

    if (M.seg >= M.segments && !M.decision) finish(M);
    return M;
  }

  function scoreFor(M, isYou) {
    var sport = M.sport;
    var ev = u.weighted(sport.scoreEvents.map(function (e) { return [e, e.w]; }));
    var pts = ev.pts;
    var extra = '';

    if (ev.convert) {
      var kickerBonus = isYou ? (M.you.att - 55) * 0.002 : 0;
      if (u.chance(u.clamp(ev.convert.p + kickerBonus, 0.4, 0.95))) {
        pts += ev.convert.pts;
        extra = ' + ' + ev.convert.label.toLowerCase();
      } else {
        extra = ' (' + ev.convert.label.toLowerCase() + ' manquée)';
      }
    }

    if (isYou) {
      M.score.you += pts;
      M.mom = u.clamp(M.mom + 0.35, -1, 1);
      var p = pickScorer(M);
      var verb = (SCORE_VERBS[sport.id] && u.pick(SCORE_VERBS[sport.id])) || 'marque';
      if (p) {
        p.seasonScored = (p.seasonScored || 0) + 1;
        p.scored = (p.scored || 0) + 1;
        M.scorers[p.id] = (M.scorers[p.id] || 0) + 1;
        push(M, M.minute, '🟢 ' + ev.label + ' ! ' + p.name + ' ' + verb + extra +
          ' — ' + scoreLine(M), 'good');
      } else {
        push(M, M.minute, '🟢 ' + ev.label + extra + ' — ' + scoreLine(M), 'good');
      }
    } else {
      M.score.opp += pts;
      M.mom = u.clamp(M.mom - 0.35, -1, 1);
      push(M, M.minute, '🔴 ' + ev.label + ' adverse' + extra + ' — ' + scoreLine(M), 'bad');
    }
  }

  function scoreLine(M) {
    return M.club.name + ' ' + M.score.you + ' - ' + M.score.opp + ' ' + M.oppName;
  }

  var FLAVOR = [
    'Le rythme s\'emballe au milieu du terrain.',
    'L\'arbitre calme les esprits après un accrochage.',
    'Le public pousse son équipe.',
    'Grosse séquence de possession, sans danger réel.',
    'L\'entraîneur adverse hurle ses consignes.',
    'Temps faible : les deux équipes reprennent leur souffle.'
  ];
  function flavor(M) {
    if (M.sport.type === 'race') return 'Les écarts se stabilisent en piste.';
    return u.pick(FLAVOR);
  }

  /* --------------------------------------------------------- décisions -- */

  function maybeDecision(M) {
    if (M.decision) return;
    var seg = M.seg, total = M.segments;
    var half = Math.floor(total / 2);

    if (seg === Math.floor(total * 0.28) && !M.decisionsDone.early) {
      M.decisionsDone.early = true;
      M.decision = earlyDecision(M);
      return;
    }
    if (seg === half && !M.decisionsDone.half) {
      M.decisionsDone.half = true;
      M.decision = halfTimeDecision(M);
      return;
    }
    if (seg === Math.floor(total * 0.78) && !M.decisionsDone.late) {
      M.decisionsDone.late = true;
      M.decision = lateDecision(M);
      return;
    }
    /* Incident aléatoire propre au sport. */
    if (seg > 2 && seg < total - 1 && !M.decisionsDone['inc' + seg] && u.chance(0.10)) {
      M.decisionsDone['inc' + seg] = true;
      M.decision = incidentDecision(M);
    }
  }

  function opt(label, hint, apply) {
    return { label: label, hint: hint, apply: apply };
  }

  function earlyDecision(M) {
    var diff = M.score.you - M.score.opp;
    return {
      title: 'Consigne depuis le banc',
      text: 'Premier quart d\'heure d\'observation. ' +
        (diff >= 0 ? 'Vos joueurs tiennent le choc.' : 'L\'entame est compliquée.') +
        ' Quel message passez-vous ?',
      options: [
        opt('Monter d\'un cran', 'Attaque +3, défense -1,5',
          function (m) { m.mods.att += 3; m.mods.def -= 1.5; }),
        opt('Verrouiller derrière', 'Défense +3, attaque -1,5',
          function (m) { m.mods.def += 3; m.mods.att -= 1.5; }),
        opt('Garder le plan de jeu', 'Fraîcheur préservée : +1 partout en fin de match',
          function (m) { m.mods.energy += 1; m.mods.att += 1; m.mods.def += 1; })
      ]
    };
  }

  function halfTimeDecision(M) {
    var diff = M.score.you - M.score.opp;
    var losing = diff < 0;
    return {
      title: 'Causerie de mi-temps',
      text: scoreLine(M) + '. ' + (losing
        ? 'Le vestiaire est tendu, il faut réagir.'
        : diff === 0 ? 'Tout reste à faire dans cette seconde période.'
          : 'Vous menez : il faut maintenant gérer.'),
      options: [
        opt('Coup de gueule', 'Dynamique +0,45 mais moral fragilisé',
          function (m) {
            m.mom = u.clamp(m.mom + 0.45, -1, 1);
            m.mods.att += 2;
            m.postMoraleRisk = true;
          }),
        opt('Rassurer le groupe', 'Moral +, régularité sur la 2e période',
          function (m) { m.mods.att += 1.2; m.mods.def += 1.2; m.postMoraleBoost = true; }),
        opt(losing ? 'Tout changer tactiquement' : 'Fermer le match',
          losing ? 'Attaque +5, défense -4' : 'Défense +5, attaque -3',
          function (m) {
            if (losing) { m.mods.att += 5; m.mods.def -= 4; }
            else { m.mods.def += 5; m.mods.att -= 3; }
          })
      ]
    };
  }

  function lateDecision(M) {
    var diff = M.score.you - M.score.opp;
    var options = [];
    var benchList = G.manager.bench(M.club);
    var sport = M.sport;

    if (M.subsLeft > 0 && benchList.length) {
      var best = u.sortBy(benchList, function (p) {
        return G.manager.effOvr(p, sport);
      }, true)[0];
      var tired = u.sortBy(G.manager.starters(M.club), function (p) {
        return p.energy;
      })[0];
      if (best && tired) {
        options.push(opt('Faire entrer ' + best.name,
          'Remplace ' + tired.name + ' (énergie ' + Math.round(tired.energy) + ')',
          function (m) {
            m.subsLeft--;
            tired.starter = false;
            best.starter = true;
            tired.energy = u.clamp(tired.energy + 12, 0, 100);
            var delta = (G.manager.effOvr(best, sport) - G.manager.effOvr(tired, sport)) * 0.10;
            m.mods.att += delta;
            m.mods.def += delta * 0.8;
            push(m, m.minute, '🔁 Changement : ' + best.name + ' remplace ' + tired.name, 'info');
          }));
      }
    }

    options.push(opt(diff >= 0 ? 'Faire tourner le ballon' : 'Jeter toutes les forces',
      diff >= 0 ? 'Défense +4, attaque -3' : 'Attaque +6, défense -5',
      function (m) {
        if (diff >= 0) { m.mods.def += 4; m.mods.att -= 3; }
        else { m.mods.att += 6; m.mods.def -= 5; }
      }));

    options.push(opt('Ne rien toucher', 'Aucun risque pris', function () { }));

    return {
      title: 'Dernier quart d\'heure',
      text: scoreLine(M) + '. C\'est le moment des choix.',
      options: options
    };
  }

  function incidentDecision(M) {
    var sport = M.sport;
    var id = sport.id;

    if (id === 'rugby') {
      return {
        title: 'Pénalité obtenue à 35 mètres',
        text: 'Vous avez le choix entre assurer trois points ou tenter la touche pour aller chercher l\'essai.',
        options: [
          opt('Tenter les perches', '~72 % de réussite pour 3 points', function (m) {
            if (u.chance(0.72)) {
              m.score.you += 3;
              push(m, m.minute, '🟢 Pénalité passée — ' + scoreLine(m), 'good');
            } else {
              push(m, m.minute, '😖 Pénalité manquée', 'warn');
              m.mom -= 0.15;
            }
          }),
          opt('Touche à cinq mètres', '~42 % pour 5 à 7 points', function (m) {
            if (u.chance(0.42)) {
              var pts = 5 + (u.chance(0.75) ? 2 : 0);
              m.score.you += pts;
              m.mom = u.clamp(m.mom + 0.4, -1, 1);
              push(m, m.minute, '🟢 Essai sur maul pénétrant ! — ' + scoreLine(m), 'good');
            } else {
              push(m, m.minute, '😖 Le ballon est gratté dans l\'en-but', 'warn');
              m.mom -= 0.25;
            }
          }),
          opt('Jouer la pénaltouche rapidement', 'Dynamique +0,3, aucun point immédiat',
            function (m) { m.mom = u.clamp(m.mom + 0.3, -1, 1); m.mods.att += 1.5; })
        ]
      };
    }

    if (id === 'football') {
      return {
        title: 'Penalty accordé !',
        text: 'Qui se charge de la sentence ?',
        options: [
          opt('Le buteur en titre', '~80 % de réussite', function (m) {
            convertPenalty(m, 0.80, 1);
          }),
          opt('Le tireur spécialiste', '~86 %, mais moral du buteur en baisse',
            function (m) { convertPenalty(m, 0.86, 1); }),
          opt('Le jeune de 19 ans', '~68 %, énorme si ça rentre', function (m) {
            var ok = convertPenalty(m, 0.68, 1);
            if (ok) { m.mom = u.clamp(m.mom + 0.25, -1, 1); m.mods.att += 2; }
          })
        ]
      };
    }

    if (id === 'waterpolo' || id === 'handball') {
      return {
        title: 'Supériorité numérique',
        text: 'Exclusion temporaire adverse : trente secondes pour en profiter.',
        options: [
          opt('Jeu rapide', '~55 % de marquer immédiatement', function (m) {
            if (u.chance(0.55)) { m.score.you += 1; push(m, m.minute, '🟢 But en supériorité — ' + scoreLine(m), 'good'); }
            else push(m, m.minute, '😖 Tir contré en supériorité', 'warn');
          }),
          opt('Faire tourner et user', '~44 % de marquer, +défense ensuite', function (m) {
            if (u.chance(0.44)) { m.score.you += 1; push(m, m.minute, '🟢 But après une longue possession — ' + scoreLine(m), 'good'); }
            m.mods.def += 2;
          }),
          opt('Temps mort tactique', 'Dynamique +0,35', function (m) {
            m.mom = u.clamp(m.mom + 0.35, -1, 1);
          })
        ]
      };
    }

    if (id === 'basket') {
      return {
        title: 'Temps mort',
        text: scoreLine(M) + '. Le coach adverse vient de relancer son cinq majeur.',
        options: [
          opt('Presser tout terrain', 'Attaque +4, défense -2, fatigue accrue',
            function (m) { m.mods.att += 4; m.mods.def -= 2; m.mods.energy -= 2; }),
          opt('Zone 2-3', 'Défense +4, attaque -2',
            function (m) { m.mods.def += 4; m.mods.att -= 2; }),
          opt('Systèmes pour le franchise player', 'Dynamique +0,4',
            function (m) { m.mom = u.clamp(m.mom + 0.4, -1, 1); })
        ]
      };
    }

    return earlyDecision(M);
  }

  function convertPenalty(m, p, pts) {
    if (u.chance(p)) {
      m.score.you += pts;
      push(m, m.minute, '🟢 Penalty transformé — ' + scoreLine(m), 'good');
      return true;
    }
    push(m, m.minute, '😖 Penalty manqué !', 'warn');
    m.mom = u.clamp(m.mom - 0.2, -1, 1);
    return false;
  }

  /** Applique le choix du joueur et relance le match. */
  function decide(M, index) {
    if (!M.decision) return M;
    var o = M.decision.options[index];
    M.decision = null;
    if (o && o.apply) o.apply(M);
    if (M.seg >= M.segments) finish(M);
    return M;
  }

  /* ------------------------------------------------------------- fin ---- */

  function finish(M) {
    if (M.done) return M;
    M.done = true;
    var won = M.score.you > M.score.opp;
    var drew = M.score.you === M.score.opp;

    push(M, M.sport.duration, '🏁 Coup de sifflet final — ' + scoreLine(M),
      won ? 'good' : drew ? 'info' : 'bad');

    /* Effets de la causerie sur le moral. */
    var line = G.manager.starters(M.club), i;
    if (M.postMoraleRisk) {
      for (i = 0; i < line.length; i++) {
        line[i].morale = u.clamp(line[i].morale + (won ? 6 : -7), 5, 100);
      }
    } else if (M.postMoraleBoost) {
      for (i = 0; i < line.length; i++) line[i].morale = u.clamp(line[i].morale + 3, 5, 100);
    }

    M.result = G.manager.finishMatch(M.club, {
      you: M.score.you, opp: M.score.opp, oppName: M.oppName
    });
    return M;
  }

  /** Simulation instantanée, sans interaction. */
  function quickSim(club) {
    var M = create(club);
    if (!M) return null;
    var guard = 0;
    while (!M.done && guard < 500) {
      if (M.decision) {
        /* L'adjoint tranche à votre place : option médiane. */
        decide(M, Math.min(1, M.decision.options.length - 1));
      } else {
        step(M);
      }
      guard++;
    }
    if (!M.done) finish(M);
    return M;
  }

  return {
    create: create, step: step, decide: decide, finish: finish,
    quickSim: quickSim, scoreLine: scoreLine, segmentMinutes: segmentMinutes
  };
})();
