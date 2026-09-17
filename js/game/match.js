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
      'conclut en pivot'],
    tennis: ['claque un ace', 'conclut l\'échange d\'un passing gagnant', 'remporte un jeu décisif',
      'enchaîne un smash imparable'],
    badminton: ['place un smash foudroyant', 'gagne l\'échange au filet', 'trompe l\'adversaire d\'un amorti',
      'remporte un jeu décisif'],
    squash: ['place un coup gagnant en fond de court', 'prend le T et fait l\'échange',
      'gagne l\'échange d\'un lob précis', 'conclut d\'un boast imparable'],
    tennisdetable: ['claque un smash gagnant', 'trompe l\'adversaire d\'un service coupé',
      'remporte un échange rapide au-dessus de la table', 'conclut d\'un top-spin imparable'],
    padel: ['conclut à la vitre', 'place une bandeja gagnante', 'gagne l\'échange d\'une víbora',
      'remporte le point sur une chiquita']
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

    if (M.seg >= M.segments) finish(M);
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

  /* ----------------------------------------- commentaires de l'entraîneur -- */

  /**
   * Choisit un texte dans un lot sans le répéter avant que celui-ci soit
   * épuisé ; la liste des textes déjà vus n'est remise à zéro qu'à chaque
   * nouvelle saison (voir G.manager.endSeason), jamais à chaque match — les
   * commentaires varient donc match après match tout en revenant chaque année.
   */
  function pickComment(club, bank, pool) {
    if (!club.commentsUsed) club.commentsUsed = {};
    var used = club.commentsUsed[bank] || (club.commentsUsed[bank] = []);
    var avail = [];
    for (var i = 0; i < pool.length; i++) if (used.indexOf(i) < 0) avail.push(i);
    if (!avail.length) {
      used.length = 0;
      for (i = 0; i < pool.length; i++) avail.push(i);
    }
    var idx = u.pick(avail);
    used.push(idx);
    return pool[idx];
  }

  function unitWord(sport, plural) {
    return (plural ? sport.unitPlural : sport.unit) || (plural ? 'points' : 'point');
  }

  var EARLY_AHEAD = [
    'Sur le banc, on savoure cette entame idéale sans relâcher la vigilance.',
    'Bon départ salué depuis la touche : « on garde ce rythme, pas de relâchement ».',
    'L\'encadrement technique reste concentré malgré l\'avantage pris d\'entrée.',
    'Léger sourire côté banc : l\'entame est maîtrisée, il faut confirmer.',
    'Consigne depuis le banc : consolider cet avantage sans se précipiter.'
  ];
  var EARLY_BEHIND = [
    'Le ton monte déjà sur le banc : il faut hausser le rythme immédiatement.',
    'Visage fermé côté encadrement, qui réclame plus d\'engagement dans les duels.',
    'On garde son calme malgré cette entame ratée et on recentre le groupe.',
    'Depuis la touche, on demande davantage d\'intensité sans changer le plan.',
    'Premiers ajustements déjà réclamés : il reste largement le temps de réagir.'
  ];
  var EARLY_LEVEL = [
    'Sur le banc, on observe, satisfait de l\'équilibre affiché en ce début de rencontre.',
    'Rien à signaler côté encadrement, qui laisse le plan de jeu se dérouler.',
    'On demande de la patience : le premier {u} pourrait décider de beaucoup de choses.',
    'Ajustements discrets réclamés sur le placement, sans rien bouleverser.',
    'Consignes de départ rappelées depuis le banc, sans le moindre changement pour l\'instant.'
  ];

  var HALF_LOSING = [
    'Vestiaire tendu à la pause : il va falloir réagir, et vite.',
    'Ton plus ferme dans les vestiaires : la seconde période ne pardonnera pas.',
    'On tente de rassurer un groupe visiblement affecté par ce retard au score.',
    'Ajustements tactiques discutés à la pause pour repartir plus fort.',
    'Message clair à la pause : le match reste totalement ouvert.'
  ];
  var HALF_WINNING = [
    'On demande de la rigueur pour gérer cette avance en seconde période.',
    'Satisfaction contenue à la pause : rien n\'est joué, il faut continuer ainsi.',
    'Consignes de gestion données au vestiaire, sans excès de confiance.',
    'On rappelle que ce genre d\'avance s\'est déjà envolé par le passé.',
    'Petits ajustements et grandes félicitations pour cette première période.'
  ];
  var HALF_LEVEL = [
    'Tout reste à faire pour la seconde période, rappelle-t-on au vestiaire.',
    'Analyse à froid à la pause : les débats restent totalement équilibrés.',
    'On recharge les organismes et on peaufine quelques détails tactiques.',
    'Le discours de la pause insiste sur la patience et la discipline collective.',
    'Rien de dramatique à la pause, juste quelques ajustements de détail.'
  ];

  var LATE_AHEAD = [
    'On demande de faire durer les {u} pour ne rien lâcher dans le money-time.',
    'Consigne claire pour le money-time : gérer l\'avance sans prendre de risque inutile.',
    'On sent la nervosité gagner le banc à l\'approche du terme.',
    'Dernières consignes données pour verrouiller ce résultat qui se dessine.',
    'On fait les gros yeux au moindre relâchement en cette fin de rencontre.'
  ];
  var LATE_BEHIND = [
    'Il ne reste plus beaucoup de temps : tout est tenté pour revenir au score.',
    'On pousse le groupe à prendre tous les risques dans ce sprint final.',
    'Dernier quart d\'heure à quitte ou double, réclame-t-on depuis le banc.',
    'On hausse encore le ton : il n\'y a plus rien à perdre désormais.',
    'On sent le groupe se crisper à mesure que le temps s\'écoule.'
  ];
  var LATE_LEVEL = [
    'On sent que ce money-time va faire basculer la rencontre d\'un côté ou de l\'autre.',
    'Dernières consignes tactiques distillées avant ce sprint final décisif.',
    'On appelle à la lucidité collective dans ces derniers instants serrés.',
    'Le banc pousse son équipe à faire la différence dans le temps qu\'il reste.',
    'On rappelle que le moindre détail peut faire basculer cette fin de match.'
  ];

  var INCIDENT_GENERIC = [
    'Petit coup de tension sur le banc après une décision arbitrale contestée.',
    'On profite d\'un temps mort naturel dans le jeu pour glisser quelques consignes.',
    'L\'encadrement technique s\'agite après une occasion manquée de peu.',
    'On salue une belle séquence collective depuis le banc.',
    'Changement de position réclamé pour perturber les habitudes adverses.',
    'On hausse le ton après un relâchement défensif passager.'
  ];

  /** Applique un effet tactique mineur et pousse le commentaire correspondant. */
  function comment(M, bank, pool, effect) {
    var text = pickComment(M.club, bank, pool).replace(/\{u\}/g, unitWord(M.sport, false));
    if (effect) effect(M);
    push(M, M.minute, '🗣️ ' + text, 'info');
  }

  function situationBank(diff) {
    return diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'level';
  }

  /** Raccourci pour construire une option de décision (voir G.race.decide,
   * même forme). */
  function opt(label, hint, apply) { return { label: label, hint: hint, apply: apply }; }

  /** Consignes de début de match : la main revient au joueur-entraîneur, qui
   * choisit vraiment l'approche plutôt que de la voir appliquée d'office. */
  function earlyDecision(M) {
    var diff = M.score.you - M.score.opp;
    var sit = situationBank(diff);
    var pools = { ahead: EARLY_AHEAD, behind: EARLY_BEHIND, level: EARLY_LEVEL };
    var text = u.pick(pools[sit]).replace(/\{u\}/g, unitWord(M.sport, false));
    return {
      title: '🗣️ Consignes de début de match',
      text: text,
      options: [
        opt('Presser plus haut', 'Plus tranchant, moins solide derrière', function (m) {
          m.mods.att += 3; m.mods.def -= 1.5;
          push(m, m.minute, '🗣️ Consigne : presser plus haut', 'info');
        }),
        opt('Resserrer les lignes', 'Plus solide, moins dangereux devant', function (m) {
          m.mods.def += 3; m.mods.att -= 1.5;
          push(m, m.minute, '🗣️ Consigne : resserrer les lignes', 'info');
        }),
        opt('Garder le plan de jeu', 'Petit regain d\'énergie collectif', function (m) {
          m.mods.energy += 1.5; m.mods.att += 0.6; m.mods.def += 0.6;
          push(m, m.minute, '🗣️ Consigne : garder le plan de jeu', 'info');
        })
      ]
    };
  }

  /** Consignes de mi-temps : idem, choix réel du joueur au vestiaire. */
  function halfDecision(M) {
    var diff = M.score.you - M.score.opp;
    var sit = situationBank(diff);
    var pools = { ahead: HALF_WINNING, behind: HALF_LOSING, level: HALF_LEVEL };
    var text = u.pick(pools[sit]);
    return {
      title: '🏟️ Vestiaire — mi-temps',
      text: text,
      options: [
        opt('Tout miser sur l\'attaque', 'Plus de buts, plus de risques derrière', function (m) {
          m.mods.att += 4; m.mods.def -= 2.5; m.mom = u.clamp(m.mom + 0.25, -1, 1);
          if (u.chance(0.4)) m.postMoraleRisk = true; else m.postMoraleBoost = true;
          push(m, m.minute, '🗣️ Consigne de mi-temps : tout miser sur l\'attaque', 'info');
        }),
        opt('Verrouiller la défense', 'Plus solide, moins dangereux devant', function (m) {
          m.mods.def += 4; m.mods.att -= 2;
          m.postMoraleBoost = true;
          push(m, m.minute, '🗣️ Consigne de mi-temps : verrouiller la défense', 'info');
        }),
        opt('Rester sur le plan initial', 'Petits ajustements, sans tout bouleverser', function (m) {
          m.mods.att += 1; m.mods.def += 1;
          m.postMoraleBoost = true;
          push(m, m.minute, '🗣️ Consigne de mi-temps : rester sur le plan initial', 'info');
        })
      ]
    };
  }

  /** Dernières consignes, avec en plus le choix d'un changement si le banc
   * le permet — auparavant décidé automatiquement sans le joueur. */
  function lateDecision(M) {
    var diff = M.score.you - M.score.opp;
    var sit = situationBank(diff);
    var pools = { ahead: LATE_AHEAD, behind: LATE_BEHIND, level: LATE_LEVEL };
    var text = u.pick(pools[sit]).replace(/\{u\}/g, unitWord(M.sport, false));

    var options = [
      opt('Pousser jusqu\'au bout', 'Tous les risques pour aller chercher le résultat', function (m) {
        m.mods.att += 4.5; m.mods.def -= 3.5;
        push(m, m.minute, '🗣️ Dernière consigne : pousser jusqu\'au bout', 'info');
      }),
      opt('Gérer la fin de match', 'On sécurise ce qui peut l\'être', function (m) {
        m.mods.def += 3; m.mods.att -= 2;
        push(m, m.minute, '🗣️ Dernière consigne : gérer la fin de match', 'info');
      })
    ];

    var sport = M.sport;
    var benchList = G.manager.bench(M.club).filter(function (p) { return !p.injury; });
    if (M.subsLeft > 0 && benchList.length) {
      var best = u.sortBy(benchList, function (p) { return G.manager.effOvr(p, sport); }, true)[0];
      var tired = u.sortBy(G.manager.starters(M.club), function (p) { return p.energy; })[0];
      if (best && tired) {
        options.push(opt('Faire entrer ' + best.name,
          best.name + ' remplace ' + tired.name + ' (forme ' + Math.round(tired.energy) + ' %)',
          function (m) {
            m.subsLeft--;
            tired.starter = false; best.starter = true;
            tired.energy = u.clamp(tired.energy + 12, 0, 100);
            var delta = (G.manager.effOvr(best, sport) - G.manager.effOvr(tired, sport)) * 0.10;
            m.mods.att += delta; m.mods.def += delta * 0.8;
            push(m, m.minute, '🔁 ' + best.name + ' remplace ' + tired.name, 'info');
          }));
      }
    }

    return { title: '⏱️ Dernières consignes', text: text, options: options };
  }

  /** Incident propre au sport (penalty, exclusion, pénalité...) : quand la
   * discipline propose plusieurs approches différentes (voir INCIDENT_BANKS),
   * c'est un vrai choix, pas un tirage au sort dans le dos du joueur. */
  function incidentDecision(M) {
    var bank = INCIDENT_BANKS[M.sport.id];
    if (!bank || bank.length < 2) return null;
    return {
      title: '🗣️ Décision à prendre',
      text: 'Un temps fort de la rencontre réclame une consigne immédiate.',
      options: bank.map(function (entry) {
        return opt(entry.text, '', entry.effect || function () {});
      })
    };
  }

  var INCIDENT_BANKS = {
    rugby: [
      { text: 'Pénalité obtenue à 35 mètres : les perches sont visées sans hésiter.',
        effect: function (m) {
          if (u.chance(0.72)) { m.score.you += 3; push(m, m.minute, '🟢 Pénalité passée — ' + scoreLine(m), 'good'); }
          else { push(m, m.minute, '😖 Pénalité manquée', 'warn'); m.mom -= 0.15; }
        } },
      { text: 'Pénalité à cinq mètres : le buteur tente la touche pour chercher l\'essai.',
        effect: function (m) {
          if (u.chance(0.42)) {
            var pts = 5 + (u.chance(0.75) ? 2 : 0);
            m.score.you += pts; m.mom = u.clamp(m.mom + 0.4, -1, 1);
            push(m, m.minute, '🟢 Essai sur maul pénétrant ! — ' + scoreLine(m), 'good');
          } else { push(m, m.minute, '😖 Le ballon est gratté dans l\'en-but', 'warn'); m.mom -= 0.25; }
        } },
      { text: 'Pénaltouche jouée rapidement pour prendre la défense adverse de vitesse.',
        effect: function (m) { m.mom = u.clamp(m.mom + 0.3, -1, 1); m.mods.att += 1.5; } }
    ],
    football: [
      { text: 'Penalty obtenu ! Le buteur en titre s\'avance, sûr de lui.',
        effect: function (m) { convertPenalty(m, 0.80); } },
      { text: 'Penalty obtenu ! Le tireur spécialiste des grandes occasions se présente.',
        effect: function (m) { convertPenalty(m, 0.86); } },
      { text: 'Penalty obtenu ! Un jeune joueur de 19 ans réclame le ballon avec aplomb.',
        effect: function (m) {
          if (convertPenalty(m, 0.68)) { m.mom = u.clamp(m.mom + 0.25, -1, 1); m.mods.att += 2; }
        } }
    ],
    waterpolo: [
      { text: 'Exclusion temporaire adverse : la supériorité numérique est jouée vite et bien.',
        effect: function (m) {
          if (u.chance(0.55)) { m.score.you += 1; push(m, m.minute, '🟢 But en supériorité — ' + scoreLine(m), 'good'); }
          else push(m, m.minute, '😖 Tir contré en supériorité', 'warn');
        } },
      { text: 'Exclusion temporaire adverse : la possession est longuement travaillée.',
        effect: function (m) {
          if (u.chance(0.44)) { m.score.you += 1; push(m, m.minute, '🟢 But après une longue possession — ' + scoreLine(m), 'good'); }
          m.mods.def += 2;
        } }
    ],
    handball: [
      { text: 'Exclusion temporaire adverse : le jeu rapide en supériorité est privilégié.',
        effect: function (m) {
          if (u.chance(0.55)) { m.score.you += 1; push(m, m.minute, '🟢 But en supériorité — ' + scoreLine(m), 'good'); }
          else push(m, m.minute, '😖 Tir contré en supériorité', 'warn');
        } },
      { text: 'Exclusion temporaire adverse : on préfère faire tourner et user la défense.',
        effect: function (m) {
          if (u.chance(0.44)) { m.score.you += 1; push(m, m.minute, '🟢 But après une longue possession — ' + scoreLine(m), 'good'); }
          m.mods.def += 2;
        } }
    ],
    basket: [
      { text: 'Temps mort sifflé : le cinq majeur adverse vient d\'être relancé.',
        effect: function (m) { m.mods.att += 4; m.mods.def -= 2; m.mods.energy -= 2; } },
      { text: 'Temps mort : consignes données pour resserrer la zone 2-3.',
        effect: function (m) { m.mods.def += 4; m.mods.att -= 2; } },
      { text: 'Temps mort : le système est construit pour le meilleur marqueur du soir.',
        effect: function (m) { m.mom = u.clamp(m.mom + 0.4, -1, 1); } }
    ]
  };

  /** Utilisée seulement quand la discipline n'a pas de banque d'incidents à
   * choix multiples (voir incidentDecision) : pure ambiance, sans choix
   * possible puisqu'il n'y a rien de réel à départager. */
  function incidentFlavor(M) {
    comment(M, 'incident:generic', INCIDENT_GENERIC, null);
  }

  function convertPenalty(m, p) {
    if (u.chance(p)) {
      m.score.you += 1;
      push(m, m.minute, '🟢 Penalty transformé — ' + scoreLine(m), 'good');
      return true;
    }
    push(m, m.minute, '😖 Penalty manqué !', 'warn');
    m.mom = u.clamp(m.mom - 0.2, -1, 1);
    return false;
  }

  /**
   * Places clés du match où la main revient vraiment au joueur-entraîneur
   * (consignes, remplacement) : le match se met en pause sur M.decision
   * jusqu'à ce qu'il choisisse une option (voir decide()).
   */
  function maybeDecision(M) {
    var seg = M.seg, total = M.segments;
    var half = Math.floor(total / 2);

    if (seg === Math.floor(total * 0.28) && !M.decisionsDone.early) {
      M.decisionsDone.early = true;
      M.decision = earlyDecision(M);
      return;
    }
    if (seg === half && !M.decisionsDone.half) {
      M.decisionsDone.half = true;
      M.decision = halfDecision(M);
      return;
    }
    if (seg === Math.floor(total * 0.78) && !M.decisionsDone.late) {
      M.decisionsDone.late = true;
      M.decision = lateDecision(M);
      return;
    }
    /* Incident aléatoire propre au sport : un vrai choix si la discipline a
       plusieurs approches possibles, sinon une simple touche d'ambiance. */
    if (seg > 2 && seg < total - 1 && !M.decisionsDone['inc' + seg] && u.chance(0.10)) {
      M.decisionsDone['inc' + seg] = true;
      var dec = incidentDecision(M);
      if (dec) M.decision = dec;
      else incidentFlavor(M);
    }
  }

  /** Applique l'option choisie par le joueur à une étape clé (voir
   * maybeDecision) et relance le déroulement du match. */
  function decide(M, index) {
    if (!M.decision) return M;
    var o = M.decision.options && M.decision.options[index];
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
      /* Personne ne regarde une simulation rapide : on tranche nous-mêmes
         avec une option raisonnable plutôt que de rester bloqué sur la
         décision (voir G.race.quickSim, même logique). */
      if (M.decision) decide(M, Math.min(1, M.decision.options.length - 1));
      else step(M);
      guard++;
    }
    if (!M.done) finish(M);
    return M;
  }

  return {
    create: create, step: step, decide: decide, finish: finish,
    quickSim: quickSim, scoreLine: scoreLine, segmentMinutes: segmentMinutes,
    /* Exposés pour que le mode « Regarder » (moteur canvas, js/game/action.js)
     * réutilise les mêmes banques de commentaires du banc plutôt que d'en
     * dupliquer une variante. */
    pickComment: pickComment, situationBank: situationBank, unitWord: unitWord,
    pools: {
      EARLY_AHEAD: EARLY_AHEAD, EARLY_BEHIND: EARLY_BEHIND, EARLY_LEVEL: EARLY_LEVEL,
      HALF_WINNING: HALF_WINNING, HALF_LOSING: HALF_LOSING, HALF_LEVEL: HALF_LEVEL,
      LATE_AHEAD: LATE_AHEAD, LATE_BEHIND: LATE_BEHIND, LATE_LEVEL: LATE_LEVEL,
      INCIDENT_BANKS: INCIDENT_BANKS, SCORE_VERBS: SCORE_VERBS
    }
  };
})();
