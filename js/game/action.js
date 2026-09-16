/* Mode action : anime la rencontre en vue de dessus, entièrement pilotée par
 * l'IA des deux côtés — le joueur n'est que spectateur, depuis le mode
 * « Diriger depuis le banc ». Caméra qui suit le ballon, coéquipiers qui se
 * démarquent, adversaires qui pressent, gardien qui sort : ce n'est pas un
 * moteur 3D, mais une simulation d'arcade lisible qui alimente ensuite le
 * championnat et les finances du club.
 */
window.G = window.G || {};

G.action = (function () {
  'use strict';
  var u = G.util;

  /* Terrain et rythme propres à chaque discipline. */
  var FIELDS = {
    football: { w: 68, h: 105, goalW: 7.3, surface: '#2e7d32', line: '#ffffff',
      goal: 'shot', speed: 1.0, ballSpeed: 30, clock: 90, realSeconds: 200,
      aiShoot: 0.45, aiRange: 0.19, tackle: 1.0, view: 50,
      texture: 'grass', ball: '#f5f5f0', ballLine: '#111111' },
    rugby: { w: 70, h: 110, goalW: 5.6, surface: '#2f7a34', line: '#ffffff',
      goal: 'tryline', tryPts: 5, tryBonus: 2, tryLabel: 'Essai',
      speed: 0.95, ballSpeed: 24, clock: 80, realSeconds: 190,
      aiShoot: 0, aiRange: 0, tackle: 4.2, view: 55,
      texture: 'grass', ball: '#8a4b23', ballLine: '#e8eef7', ballShape: 'oval' },
    waterpolo: { w: 20, h: 30, goalW: 3, surface: '#1565c0', line: '#e3f2fd',
      goal: 'shot', speed: 0.45, ballSpeed: 15, clock: 32, realSeconds: 150,
      aiShoot: 2.4, aiRange: 0.60, tackle: 0.8, view: 32,
      texture: 'water', ball: '#ffd43b', ballLine: '#8a6d00' },
    basket: { w: 15, h: 28, goalW: 1.8, surface: '#a1622f', line: '#ffe0b2',
      goal: 'basket', speed: 0.8, ballSpeed: 18, clock: 40, realSeconds: 160,
      aiShoot: 1.5, aiRange: 0.45, tackle: 2.0, view: 28,
      texture: 'wood', ball: '#e8720c', ballLine: '#3a2000' },
    handball: { w: 20, h: 40, goalW: 3, surface: '#1b5e20', line: '#c8e6c9',
      goal: 'shot', speed: 0.85, ballSpeed: 22, clock: 60, realSeconds: 170,
      aiShoot: 2.8, aiRange: 0.55, tackle: 0.8, view: 35,
      texture: 'indoor', ball: '#c0392b', ballLine: '#3a0d08' },
    hockey: { w: 26, h: 61, goalW: 1.83, surface: '#dff1fb', line: '#1565c0',
      goal: 'shot', speed: 0.9, ballSpeed: 30, clock: 60, realSeconds: 180,
      aiShoot: 2.0, aiRange: 0.50, tackle: 1.5, view: 30,
      texture: 'ice', ball: '#111111', ballLine: '#000000', ballScale: 0.55 },
    fieldhockey: { w: 55, h: 91.4, goalW: 3.66, surface: '#2e8b3d', line: '#ffffff',
      goal: 'shot', speed: 0.85, ballSpeed: 24, clock: 60, realSeconds: 180,
      aiShoot: 1.8, aiRange: 0.45, tackle: 1.2, view: 42,
      texture: 'grass', ball: '#ffffff', ballLine: '#c0392b', ballScale: 0.5 },
    lacrosse: { w: 55, h: 100, goalW: 1.83, surface: '#3a9349', line: '#ffffff',
      goal: 'shot', speed: 0.95, ballSpeed: 28, clock: 60, realSeconds: 180,
      aiShoot: 2.2, aiRange: 0.5, tackle: 2.2, view: 42,
      texture: 'grass', ball: '#e8720c', ballLine: '#5a2d00', ballScale: 0.5 },
    floorball: { w: 20, h: 40, goalW: 1.6, surface: '#dcdfe3', line: '#1565c0',
      goal: 'shot', speed: 1.0, ballSpeed: 26, clock: 60, realSeconds: 180,
      aiShoot: 2.4, aiRange: 0.5, tackle: 1.0, view: 32,
      texture: 'wood', ball: '#ffffff', ballLine: '#c0392b', ballScale: 0.4 },
    polo: { w: 146, h: 274, goalW: 7.32, surface: '#4b9c4f', line: '#ffffff',
      goal: 'shot', speed: 1.4, ballSpeed: 40, clock: 56, realSeconds: 190,
      aiShoot: 1.6, aiRange: 0.4, tackle: 1.5, view: 90,
      texture: 'grass', ball: '#ffffff', ballLine: '#8a6d00', ballScale: 0.35 },

    /* Ultimate : pas de but, mais deux zones d'en-but à chaque extrémité —
       on marque en y réceptionnant le disque, comme un essai au rugby
       (voir F.goal === 'tryline', généralisé avec F.tryPts/F.tryLabel). */
    ultimate: { w: 37, h: 100, surface: '#3a9349', line: '#ffffff',
      goal: 'tryline', tryPts: 1, tryBonus: 0, tryLabel: 'Point marqué en zone d\'en-but',
      speed: 1.0, ballSpeed: 22, clock: 50, realSeconds: 170,
      aiShoot: 0, aiRange: 0, tackle: 0.4, view: 42,
      texture: 'grass', ball: '#f4e04d', ballLine: '#8a6d00', ballShape: 'oval' },

    /* Volleyball : une équipe complète de chaque côté, mais un échange se
       joue comme au filet (voir F.netTeam) plutôt qu'un ballon disputé au
       contact — on ne « tacle » pas au volley. */
    volleyball: { w: 9, h: 18, surface: '#d9a96c', line: '#ffffff',
      netTeam: true, net: true, speed: 1.0, ballSpeed: 20, clock: 60, realSeconds: 170, view: 9,
      texture: 'wood', ball: '#f7e017', ballLine: '#8a6d00' },

    /* Sports de raquette : un joueur de chaque côté, terrain adapté à
       chaque discipline (dimensions réelles), échange simulé point par
       point plutôt que ballon disputé au contact. */
    tennis: { w: 8.23, h: 23.77, surface: '#2f8f4e', line: '#ffffff',
      racket: true, net: true, speed: 1.0, ballSpeed: 30, clock: 90, realSeconds: 210, view: 8.23,
      scoring: { style: 'tennis', setsToWin: 2, gamesToWinSet: 6 } },
    badminton: { w: 5.18, h: 13.4, surface: '#1a6e3c', line: '#ffffff',
      racket: true, net: true, speed: 1.3, ballSpeed: 34, clock: 60, realSeconds: 170, view: 5.18,
      scoring: { style: 'points', setsToWin: 2, pointsToWinSet: 21, capAt: 30 } },
    squash: { w: 6.4, h: 9.75, surface: '#2c4f70', line: '#ffe9a8',
      racket: true, net: false, speed: 1.15, ballSpeed: 26, clock: 45, realSeconds: 150, view: 6.4,
      scoring: { style: 'points', setsToWin: 3, pointsToWinSet: 11, capAt: 15 } },
    tennisdetable: { w: 1.525, h: 2.74, surface: '#0d4f8b', line: '#ffffff',
      racket: true, net: true, speed: 2.4, ballSpeed: 10, clock: 30, realSeconds: 140, view: 1.525,
      scoring: { style: 'points', setsToWin: 3, pointsToWinSet: 11, capAt: 21 } },
    padel: { w: 10, h: 20, surface: '#2373a6', line: '#ffffff',
      racket: true, net: true, speed: 1.0, ballSpeed: 26, clock: 90, realSeconds: 200, view: 10,
      scoring: { style: 'tennis', setsToWin: 2, gamesToWinSet: 6 } },

    /* Baseball et softball : pas de ballon disputé en continu, mais une
       succession de face-à-face lanceur/frappeur sur un losange (voir
       F.diamond) — le softball reprend le même moteur sur un terrain plus
       petit, comme dans la réalité. */
    baseball: { w: 90, h: 90, surface: '#5a8f3c', line: '#ffffff',
      diamond: true, clock: 9, view: 95,
      ball: '#ffffff', ballLine: '#c0392b', ballScale: 0.5 },
    softball: { w: 60, h: 60, surface: '#5a8f3c', line: '#ffffff',
      diamond: true, clock: 7, view: 64,
      ball: '#f4e04d', ballLine: '#8a6d00', ballScale: 0.55 },

    /* Cricket : ni ballon disputé en continu, ni losange, mais des
       face-à-face lanceur/batteur sur un terrain ovale avec un pitch
       central (voir F.cricket). */
    cricket: { w: 140, h: 140, cricket: true, surface: '#4b9c4f', line: '#ffffff',
      clock: 2, view: 145, ball: '#c0392b', ballLine: '#8a0000', ballScale: 0.4 },

    /* Tir à l'arc par équipes : chaque archer tire sur une cible fixe, tour
       par tour, plutôt qu'un ballon ou un adversaire direct (voir
       F.archery). */
    archery: { w: 40, h: 70, archery: true, surface: '#7a9e5c', line: '#ffffff',
      clock: 4, view: 40, ball: '#ffd166', ballLine: '#8a6d00', ballScale: 0.3 }
  };

  function fieldOf(sportId) { return FIELDS[sportId] || FIELDS.football; }
  function supports(sportId) { return !!FIELDS[sportId]; }

  /* ====================================================== CONSTRUCTION ==== */

  /**
   * Prépare une rencontre jouable.
   * @param {object} club  club du joueur
   * @returns {object|null} état de match, ou null si le calendrier est fini
   */
  function create(club) {
    var sport = G.manager.sportDef(club.sport);
    var fx = G.manager.nextFixture(club);
    if (!fx) return null;
    var F = fieldOf(club.sport);

    var mine = G.manager.teamRatings(club);
    var oppStr = fx.opp.str;

    var M = {
      club: club, sport: sport, F: F,
      oppName: fx.opp.name, youHome: fx.youHome,
      score: { you: 0, opp: 0 },
      clock: 0,                      // minutes de jeu écoulées
      running: false, done: false, paused: false,
      players: [], ball: null,
      cam: { x: F.w / 2, y: F.h / 2 },
      user: null,                    // joueur le plus proche du ballon, pour la caméra
      feed: [],
      stats: { youShots: 0, oppShots: 0, poss: 50, possYou: 0, possTot: 0 },
      lastTouch: null,
      restart: 0,                    // secondes de gel après un but
      result: null,
      halfDone: false,
      cards: {},                     // cartons par joueur {playerId: {type, time}}
      subs: { you: [], opp: [] },    // remplacements effectués
      coach: { att: 0, def: 0 },     // effet temporaire des consignes du banc
      tactics: club.tactics,         // référence live : suit les consignes données en cours de match
      tacticalMod: { att: 0, def: 0 },
      checkpointsSeen: [], checkpoint: null,
      commentsDone: {},
      sinceIncident: 0,
      /* Sports de raquette en conditions réelles : points d'un jeu (style
         tennis), jeux/points du set en cours, et historique des sets joués
         (voir F.scoring et setWonBy). */
      points: { you: 0, opp: 0 },
      games: { you: 0, opp: 0 },
      setsHistory: []
    };
    setMentality(M, club.tactics.mentality);

    if (F.racket) {
      buildRacketMatch(M, club, sport, mine, oppStr, fx.opp.name);
      push(M, 'Début de la rencontre — ' + club.name + ' contre ' + fx.opp.name, 'info');
      startRally(M, u.chance(0.5) ? 0 : 1);
    } else if (F.netTeam) {
      buildTeams(M, club, sport, mine, oppStr);
      push(M, 'Début du set — ' + club.name + ' contre ' + fx.opp.name, 'info');
      startNetRally(M, u.chance(0.5) ? 0 : 1);
    } else if (F.diamond) {
      buildDiamondMatch(M, club, sport, mine, oppStr);
      push(M, 'Début de partie — ' + club.name + ' contre ' + fx.opp.name, 'info');
    } else if (F.cricket) {
      buildCricketMatch(M, club, sport, mine, oppStr);
      push(M, 'Début de la rencontre — ' + club.name + ' contre ' + fx.opp.name, 'info');
    } else if (F.archery) {
      buildArcheryMatch(M, club, sport, mine, oppStr);
      push(M, 'Début de la rencontre — ' + club.name + ' contre ' + fx.opp.name, 'info');
    } else {
      buildTeams(M, club, sport, mine, oppStr);
      kickoff(M, 1);
      push(M, 'Coup d\'envoi — ' + club.name + ' contre ' + fx.opp.name, 'info');
    }
    return M;
  }

  /** Place l'unique joueur de chaque côté, sur un terrain adapté à la
   * discipline (sports de raquette, à effectif individuel). */
  function buildRacketMatch(M, club, sport, mine, oppStr, oppName) {
    var F = M.F;
    var line = G.manager.starters(club);
    var me = line[0];
    var ovrMe = me ? G.manager.effOvr(me, sport) : u.clamp(mine.att, 20, 95);
    var ovrOpp = u.clamp(oppStr + u.gauss(0, 5), 20, 95);

    M.players = [
      {
        id: (me && me.id) || u.uid('me'), name: (me && me.name) || club.name,
        num: 1, team: 0, role: 'att', side: 1,
        home: { x: F.w / 2, y: F.h * 0.9 }, x: F.w / 2, y: F.h * 0.9, vx: 0, vy: 0,
        ovr: ovrMe, speed: (2.2 + ovrMe / 26) * F.speed, ref: me || null
      },
      {
        id: 'o0', name: oppName, num: 2, team: 1, role: 'att', side: -1,
        home: { x: F.w / 2, y: F.h * 0.1 }, x: F.w / 2, y: F.h * 0.1, vx: 0, vy: 0,
        ovr: ovrOpp, speed: (2.2 + ovrOpp / 26) * F.speed, ref: null
      }
    ];
    M.ball = { x: F.w / 2, y: F.h / 2, vx: 0, vy: 0, owner: null };
    M.rally = null;
  }

  /** Place les deux équipes sur le terrain selon leurs postes. */
  function buildTeams(M, club, sport, mine, oppStr) {
    var F = M.F;
    var line = G.manager.starters(club);
    var n = Math.min(line.length, sport.lineupSize);

    /* Formation : le gardien devant sa cage, les autres répartis par rôle. */
    function slot(role, idx, count, side) {
      var rows = { gk: 0.06, def: 0.26, mid: 0.5, att: 0.74 };
      var y = rows[role] === undefined ? 0.5 : rows[role];
      var x = count === 1 ? 0.5 : 0.18 + (idx / (count - 1)) * 0.64;
      return {
        x: x * F.w,
        y: side > 0 ? y * F.h : (1 - y) * F.h
      };
    }

    function addTeam(players, side, teamId, strength) {
      var byRole = { gk: [], def: [], mid: [], att: [] };
      var i;
      for (i = 0; i < players.length; i++) {
        var pd = G.manager.posDef(sport, players[i].pos);
        var role = pd ? pd.role : 'mid';
        byRole[role].push(players[i]);
      }
      for (var role in byRole) {
        var group = byRole[role];
        for (i = 0; i < group.length; i++) {
          var pos = slot(role, i, group.length, side);
          var ovr = teamId === 0
            ? G.manager.effOvr(group[i], sport)
            : u.clamp(strength + u.gauss(0, 5), 20, 95);
          M.players.push({
            id: group[i].id || u.uid('ai'),
            name: group[i].name,
            num: M.players.length + 1,
            team: teamId, role: role, side: side,
            home: { x: pos.x, y: pos.y },
            x: pos.x, y: pos.y, vx: 0, vy: 0,
            ovr: ovr,
            speed: (3.2 + ovr / 22) * M.F.speed,
            ref: teamId === 0 ? group[i] : null
          });
        }
      }
    }

    addTeam(line.slice(0, n), 1, 0, 0);

    /* Équipe adverse : miroir de la vôtre, au niveau du championnat. */
    var oppPlayers = [];
    for (var i = 0; i < n; i++) {
      var src = line[i % line.length];
      oppPlayers.push({ id: 'o' + i, name: 'Adv. ' + (i + 1), pos: src.pos });
    }
    addTeam(oppPlayers, -1, 1, oppStr);

    M.ball = { x: F.w / 2, y: F.h / 2, vx: 0, vy: 0, owner: null, height: 0 };
  }

  function push(M, txt, type) {
    M.feed.unshift({ min: Math.floor(M.clock), txt: txt, type: type || 'info' });
    if (M.feed.length > 40) M.feed.length = 40;
  }

  function kickoff(M, side) {
    var F = M.F;
    M.ball.x = F.w / 2; M.ball.y = F.h / 2;
    M.ball.vx = 0; M.ball.vy = 0; M.ball.owner = null;
    for (var i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      p.x = p.home.x; p.y = p.home.y; p.vx = 0; p.vy = 0;
    }
    /* Le camp qui engage récupère le ballon. */
    var team = side > 0 ? 0 : 1;
    var closest = nearestPlayer(M, F.w / 2, F.h / 2, team);
    if (closest) {
      closest.x = F.w / 2; closest.y = F.h / 2 + (team === 0 ? 1 : -1);
      M.ball.owner = closest;
    }
    M.restart = 0.8;
  }

  /* ========================================================= UTILITAIRES == */

  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function nearestPlayer(M, x, y, team, exclude) {
    var best = null, bd = 1e9;
    for (var i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      if (team !== undefined && p.team !== team) continue;
      if (exclude && p === exclude) continue;
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /** But visé par une équipe (l'équipe 0 attaque vers le haut du terrain). */
  function goalOf(M, team) {
    return { x: M.F.w / 2, y: team === 0 ? M.F.h : 0 };
  }

  function ownGoal(M, team) {
    return { x: M.F.w / 2, y: team === 0 ? 0 : M.F.h };
  }

  /* ============================================================ LOGIQUE === */

  /** Avance la simulation de `dt` secondes réelles. */
  var CHECKPOINT_FRACS = [0.25, 0.5, 0.75];

  /** Vérifie si la rencontre vient de franchir un quart, la mi-match ou les
   * trois-quarts : elle se met alors en pause et le joueur peut intervenir
   * comme un coach (consignes, changements) avant de relancer jusqu'à
   * l'étape suivante — jamais plus d'une fois pour la même étape. */
  function checkMatchCheckpoint(M) {
    if (M.done || M.checkpoint) return;
    var frac = M.F.clock > 0 ? M.clock / M.F.clock : 0;
    M.checkpointsSeen = M.checkpointsSeen || [];
    for (var i = 0; i < CHECKPOINT_FRACS.length; i++) {
      var cp = CHECKPOINT_FRACS[i];
      if (frac >= cp && M.checkpointsSeen.indexOf(cp) < 0) {
        M.checkpointsSeen.push(cp);
        M.paused = true;
        M.checkpoint = cp;
        return;
      }
    }
  }

  function update(M, dt) {
    if (M.done || M.paused) return;
    var F = M.F;

    /* Le base-ball/softball, le cricket et le tir à l'arc ne se découpent
       pas en un temps continu, mais en manches, balles ou volées : leur
       propre logique gère l'horloge (M.clock) et la fin de partie. */
    if (F.diamond) {
      pickUserPlayer(M);
      updateDiamond(M, dt);
      updateCamera(M, dt);
      checkMatchCheckpoint(M);
      return;
    }
    if (F.cricket) {
      pickUserPlayer(M);
      updateCricket(M, dt);
      updateCamera(M, dt);
      checkMatchCheckpoint(M);
      return;
    }
    if (F.archery) {
      pickUserPlayer(M);
      updateArchery(M, dt);
      updateCamera(M, dt);
      checkMatchCheckpoint(M);
      return;
    }

    /* Appliquer les tactiques si changement (style de jeu : 0 = prudent,
       1 = équilibré, 2 = offensif — voir sport.tactics.style). */
    if (M.tactics && M.tactics.style !== undefined) {
      var style = M.tactics.style;
      M.F.aiShootMult = style === 2 ? 1.4 : style === 0 ? 0.6 : 1.0;
      M.F.tackleMult = style === 0 ? 1.3 : style === 2 ? 0.8 : 1.0;
    }

    /* Horloge : le match complet tient en quelques minutes réelles. */
    var minutesPerSecond = F.clock / F.realSeconds;
    if (M.restart > 0) {
      M.restart -= dt;
    } else {
      M.clock += minutesPerSecond * dt;
    }

    /* Les sports de raquette se jouent en conditions réelles (points, jeux,
       sets) : la rencontre se termine dès qu'un camp a gagné le nombre de
       sets requis (voir setWonBy), jamais par une horloge qui s'écoule —
       seul un filet de sécurité empêche une partie trop indécise de durer
       indéfiniment. */
    if (F.racket) {
      if (M.clock >= F.clock * 2) { finishRacketNow(M); return; }
    } else {
      /* Mi-temps (pause entre les manches pour les sports de filet). */
      if (!M.halfDone && M.clock >= F.clock / 2) {
        M.halfDone = true;
        push(M, 'Mi-temps — ' + M.score.you + ' - ' + M.score.opp, 'info');
        if (F.netTeam) startNetRally(M, u.chance(0.5) ? 0 : 1);
        else kickoff(M, -1);
      }
      if (M.clock >= F.clock) { finish(M); return; }
    }

    /* Consignes du banc : les mêmes causeries qu'en mode texte, qui restent
       possibles à la mi-temps ou lors d'un temps mort même si le joueur ne
       fait plus que regarder. */
    if (M.coach) {
      var decay = Math.pow(0.9, dt);
      M.coach.att *= decay; M.coach.def *= decay;
    }
    maybeCoach(M, dt);

    pickUserPlayer(M);
    for (var i = 0; i < M.players.length; i++) updatePlayer(M, M.players[i], dt);
    if (F.racket) updateRally(M, dt);
    else if (F.netTeam) updateNetRally(M, dt);
    else updateBall(M, dt);
    separatePlayers(M);
    updateCamera(M, dt);

    /* Statistiques de possession (part des points gagnés, pour les sports de
       raquette et de filet qui n'ont pas de porteur de balle disputé au
       contact). */
    if (F.racket || F.netTeam) {
      var tot = M.score.you + M.score.opp;
      M.stats.poss = tot ? Math.round(M.score.you / tot * 100) : 50;
    } else {
      M.stats.possTot += dt;
      if (M.ball.owner && M.ball.owner.team === 0) M.stats.possYou += dt;
      M.stats.poss = Math.round(M.stats.possYou / Math.max(0.1, M.stats.possTot) * 100);
    }
    checkMatchCheckpoint(M);
  }

  /** Choisit un commentaire dans une banque de M.club, sans le répéter avant
   * qu'elle soit épuisée (voir G.match.pickComment). */
  function coachSay(M, bank, pool) {
    var text = G.match.pickComment(M.club, bank, pool).replace(/\{u\}/g, G.match.unitWord(M.sport, false));
    push(M, '🗣️ ' + text, 'info');
  }

  function applyCoachEffect(M, e) {
    M.coach.att = u.clamp(M.coach.att + e.att, -12, 12);
    M.coach.def = u.clamp(M.coach.def + e.def, -12, 12);
  }

  /** Consigne de mentalité (0 = ultra défensif … 4 = tout va, 2 = équilibré) :
   * contrairement au petit coup de fouet passager de applyCoachEffect(),
   * cet effet ne se dissipe pas — c'est un vrai choix tactique, pas une
   * simple causerie, tant qu'on ne le change pas. */
  function setMentality(M, idx) {
    M.club.tactics.mentality = idx;
    var delta = idx - 2;
    M.tacticalMod.att = delta * 2;
    M.tacticalMod.def = -delta * 2;
  }

  /** Reprend les mêmes prises de parole du banc qu'en mode texte (en tout
   * début de match, à la mi-temps, dans le dernier quart d'heure, ou lors
   * d'un temps mort / incident propre au sport) : le joueur ne fait que
   * regarder, mais l'entraîneur continue de parler et d'influer un peu sur
   * le rythme de son équipe. */
  function maybeCoach(M, dt) {
    var frac = M.clock / M.F.clock;
    var diff = M.score.you - M.score.opp;
    var sit = G.match.situationBank(diff);

    if (!M.commentsDone.early && frac >= 0.22) {
      M.commentsDone.early = true;
      var poolsE = { ahead: G.match.pools.EARLY_AHEAD, behind: G.match.pools.EARLY_BEHIND, level: G.match.pools.EARLY_LEVEL };
      coachSay(M, 'early:' + sit, poolsE[sit]);
      applyCoachEffect(M, sit === 'ahead' ? { def: 2, att: -0.8 } :
        sit === 'behind' ? { att: 2, def: -0.8 } : { att: 0.6, def: 0.6 });
    }
    if (!M.commentsDone.half && M.halfDone) {
      M.commentsDone.half = true;
      var poolsH = { ahead: G.match.pools.HALF_WINNING, behind: G.match.pools.HALF_LOSING, level: G.match.pools.HALF_LEVEL };
      coachSay(M, 'half:' + sit, poolsH[sit]);
      applyCoachEffect(M, sit === 'ahead' ? { def: 3.5, att: -2 } :
        sit === 'behind' ? { att: 3.5, def: -2.5 } : { att: 1, def: 1 });
    }
    if (!M.commentsDone.late && frac >= 0.78) {
      M.commentsDone.late = true;
      var poolsL = { ahead: G.match.pools.LATE_AHEAD, behind: G.match.pools.LATE_BEHIND, level: G.match.pools.LATE_LEVEL };
      coachSay(M, 'late:' + sit, poolsL[sit]);
      applyCoachEffect(M, sit === 'ahead' ? { def: 3, att: -2 } :
        sit === 'behind' ? { att: 4.5, def: -3.5 } : { att: 0.8, def: 0.8 });
    }

    /* Temps mort / incident propre au sport (pénalité, exclusion, temps mort
       basket…) : purement oral ici, l'action à l'écran fait déjà foi pour le
       score. */
    M.sinceIncident += dt;
    if (M.sinceIncident > 15 && frac > 0.08 && frac < 0.92 && u.chance(dt * 0.015)) {
      M.sinceIncident = 0;
      var bank = G.match.pools.INCIDENT_BANKS[M.sport.id];
      if (bank) coachSay(M, 'incident:' + M.sport.id, bank.map(function (e) { return e.text; }));
    }
  }

  /** Le joueur contrôle le porteur, ou le plus proche du ballon. */
  function pickUserPlayer(M) {
    if (M.F.racket) { M.user = M.players[0]; return; }
    if (M.F.netTeam) {
      var r = M.rally;
      M.user = (r && r.hitter && r.hitter.team === 0) ? r.hitter : nearestPlayer(M, M.ball.x, M.ball.y, 0);
      return;
    }
    if (M.F.diamond || M.F.cricket) {
      var battingTeam = M.F.diamond ? M.diamond.battingTeam : M.cricket.battingTeam;
      M.user = battingTeam === 0 ? M.players[M.players.length - 1] : M.players[0];
      return;
    }
    if (M.F.archery) {
      var shooter = archeryShooter(M);
      M.user = shooter.team === 0 ? shooter : M.players[0];
      return;
    }
    var b = M.ball;
    if (b.owner && b.owner.team === 0) {
      M.user = b.owner;
      return;
    }
    var target = b.owner ? b.owner : b;
    var cand = nearestPlayer(M, target.x, target.y, 0);
    /* Le gardien ne se fait contrôler que dans sa surface. */
    if (cand && cand.role === 'gk' && Math.abs(cand.y - ownGoal(M, 0).y) > 18) {
      cand = nearestPlayer(M, target.x, target.y, 0, cand);
    }
    M.user = cand;
  }

  function updatePlayer(M, p, dt) {
    var F = M.F, b = M.ball;
    var speed = p.speed;

    /* Effet des consignes du banc (voir maybeCoach) : un léger coup de
       fouet offensif ou défensif côté club du joueur, comme en mode texte. */
    if (p.team === 0 && M.coach) {
      if (p.role === 'att' || p.role === 'mid') speed *= u.clamp(1 + M.coach.att * 0.02, 0.6, 1.5);
      if (p.role === 'def' || p.role === 'mid') speed *= u.clamp(1 + M.coach.def * 0.02, 0.6, 1.5);
    }

    /* Mentalité choisie par le joueur-coach à une étape de la rencontre (voir
       setMentality) : contrairement à M.coach, ne se dissipe pas tant que la
       consigne n'est pas changée. */
    if (p.team === 0 && M.tacticalMod) {
      if (p.role === 'att' || p.role === 'mid') speed *= u.clamp(1 + M.tacticalMod.att * 0.02, 0.6, 1.5);
      if (p.role === 'def' || p.role === 'mid') speed *= u.clamp(1 + M.tacticalMod.def * 0.02, 0.6, 1.5);
    }

    /* Simple spectateur : les deux équipes sont pilotées par l'IA, y compris
       le joueur le plus proche du ballon côté club du joueur. */
    var t = aiTarget(M, p);
    var dx = t.x - p.x, dy = t.y - p.y;
    var d = Math.hypot(dx, dy) || 1;
    var ax = dx / d, ay = dy / d;
    if (d < 0.6) { ax = 0; ay = 0; }
    if (t.sprint) speed *= 1.2;

    p.vx = u.lerp(p.vx, ax * speed, Math.min(1, dt * 7));
    p.vy = u.lerp(p.vy, ay * speed, Math.min(1, dt * 7));
    p.x = u.clamp(p.x + p.vx * dt, 0.4, F.w - 0.4);
    p.y = u.clamp(p.y + p.vy * dt, 0.4, F.h - 0.4);

    /* Les sports de raquette et de filet n'ont pas de ballon disputé au
       contact : chaque échange se résout dans updateRally/updateNetRally,
       pas ici. */
    if (F.racket || F.netTeam) return;

    /* Duel : récupérer le ballon à l'adversaire. */
    /* Les distances de contact suivent la taille du terrain : sur un bassin
       de water-polo, 1,5 mètre représente bien plus qu'au football. */
    var scale = M.F.w / 68;
    var tackle = M.F.tackle === undefined ? 1 : M.F.tackle;
    var tackleMult = M.F.tackleMult || 1.0;
    if (b.owner && b.owner.team !== p.team &&
      dist(p, b.owner) < (1.2 + tackle * 0.25) * scale) {
      var chance = 0.9 * dt * tackle * tackleMult * (0.5 + (p.ovr - b.owner.ovr + 20) / 60);
      if (u.chance(u.clamp(chance, 0.02, 0.9))) {
        var victim = b.owner;
        b.owner = p;
        if (p.team === 0) push(M, p.name + ' récupère le ballon', 'good');
        else if (victim === M.user) push(M, 'Ballon perdu !', 'warn');
        /* Carton pour tackle violent. */
        if (u.chance(0.08) && chance > 0.3) {
          giveCard(M, p.id, 'yellow');
        }
      }
    }
    /* Ballon libre à portée : on le prend. */
    if (!b.owner && Math.hypot(b.x - p.x, b.y - p.y) < 1.0 * scale && b.free > 0.25) {
      b.owner = p;
      b.vx = 0; b.vy = 0;
    }
  }

  /** Écarte les joueurs qui se retrouvent au même endroit (typiquement deux
   * poursuivants d'un ballon libre convergeant vers le même point) : sans
   * ça, leurs pastilles se superposent parfaitement et on ne distingue plus
   * qui est qui. Le porteur du ballon garde sa trajectoire ; c'est l'autre
   * qui s'écarte. */
  function separatePlayers(M) {
    var F = M.F;
    /* L'écart minimal doit être assez grand en unités de terrain pour rester
       visible à l'écran une fois converti en pixels (le rayon d'une pastille
       ne descend jamais sous 7 px, quel que soit le zoom) : sinon deux
       joueurs peuvent être « séparés » sur le papier tout en restant
       parfaitement superposés à l'affichage. Le duel au contact garde en
       revanche une portée resserrée, sur la distance de tacle elle-même,
       pour ne pas empêcher les défenseurs d'approcher le porteur. */
    var scale = F.w / 68;
    var tackle = F.tackle === undefined ? 1 : F.tackle;
    var closeSep = (1.3 + tackle * 0.25) * scale;
    var minSep = Math.max(closeSep, (F.view || F.w * 0.5) * 0.08);
    var owner = M.ball.owner;
    var list = M.players;
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        var sep = (a === owner || b === owner) ? closeSep : minSep;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.hypot(dx, dy);
        if (d >= sep) continue;
        var nx, ny;
        if (d > 1e-4) { nx = dx / d; ny = dy / d; } else {
          var ang = (i * 2.4 + j * 5.1) % (Math.PI * 2);
          nx = Math.cos(ang); ny = Math.sin(ang);
        }
        var push = (sep - d);
        if (a === owner) { b.x += nx * push; b.y += ny * push; }
        else if (b === owner) { a.x -= nx * push; a.y -= ny * push; }
        else {
          a.x -= nx * push / 2; a.y -= ny * push / 2;
          b.x += nx * push / 2; b.y += ny * push / 2;
        }
        a.x = u.clamp(a.x, 0.4, F.w - 0.4); a.y = u.clamp(a.y, 0.4, F.h - 0.4);
        b.x = u.clamp(b.x, 0.4, F.w - 0.4); b.y = u.clamp(b.y, 0.4, F.h - 0.4);
      }
    }
  }

  /** Objectif de déplacement d'un joueur géré par l'ordinateur. */
  function aiTarget(M, p) {
    var b = M.ball;
    var F = M.F;

    if (F.racket) {
      /* On se replace au centre entre deux échanges, et on couvre le point
         de chute quand c'est à nous de renvoyer. */
      var r = M.rally;
      if (r && r.receiver === p) {
        return { x: u.clamp(r.toX, 0.5, F.w - 0.5), y: p.home.y };
      }
      return { x: p.home.x, y: p.home.y };
    }

    if (F.netTeam) {
      /* L'équipe qui reçoit se resserre un peu vers le point de chute
         attendu, celle qui vient de frapper regagne sa position. */
      var rn = M.rally;
      if (rn && p.team === rn.receivingTeam) {
        var pull = p === rn.receiver ? 0.85 : 0.30;
        return { x: u.clamp(p.home.x * (1 - pull) + rn.toX * pull, 1, F.w - 1), y: p.home.y };
      }
      return { x: p.home.x, y: p.home.y };
    }

    var attacking = b.owner && b.owner.team === p.team;
    var goal = goalOf(M, p.team);
    var own = ownGoal(M, p.team);

    if (p.role === 'gk') {
      /* Le gardien reste sur sa ligne, décalé vers le ballon. */
      var gx = u.clamp(b.x, F.w / 2 - F.goalW, F.w / 2 + F.goalW);
      var gy = own.y + (p.team === 0 ? 2.2 : -2.2);
      /* Sortie si le ballon approche dangereusement. */
      if (Math.abs(b.y - own.y) < F.h * 0.13) {
        gy = own.y + (p.team === 0 ? 4.5 : -4.5);
      }
      return { x: gx, y: gy };
    }

    if (b.owner === p) {
      /* Porteur géré par l'IA : avancer vers le but en évitant les défenseurs. */
      var opp = nearestPlayer(M, p.x, p.y, 1 - p.team);
      var tx = goal.x, ty = goal.y;
      if (opp && dist(p, opp) < 4) {
        tx += (p.x - opp.x) * 1.5;
      }
      return { x: u.clamp(tx, 1, F.w - 1), y: ty, sprint: true };
    }

    if (attacking) {
      /* Se démarquer devant le porteur. */
      var carrier = b.owner;
      var ahead = p.team === 0 ? 8 : -8;
      return {
        x: u.clamp(p.home.x * 0.45 + carrier.x * 0.55 + Math.sin(p.num + M.clock) * 3, 1, F.w - 1),
        y: u.clamp(carrier.y + ahead + (p.home.y - F.h / 2) * 0.25, 1, F.h - 1)
      };
    }

    /* Phase défensive : le plus proche presse, les autres tiennent le bloc. */
    var chaser = nearestPlayer(M, b.x, b.y, p.team);
    if (chaser === p) {
      var t = b.owner || b;
      return { x: t.x, y: t.y, sprint: true };
    }
    return {
      x: u.clamp(p.home.x * 0.6 + b.x * 0.4, 1, F.w - 1),
      y: u.clamp(p.home.y * 0.55 + b.y * 0.45, 1, F.h - 1)
    };
  }

  function updateBall(M, dt) {
    var b = M.ball, F = M.F;
    b.free = (b.free || 0) + dt;

    if (b.owner) {
      b.free = 0;
      /* Le ballon colle au porteur, légèrement devant lui. */
      var sp = Math.hypot(b.owner.vx, b.owner.vy) || 1;
      b.x = b.owner.x + b.owner.vx / sp * 0.7;
      b.y = b.owner.y + b.owner.vy / sp * 0.7;
      b.vx = 0; b.vy = 0;
      /* L'IA tire ou passe quand elle est en position, dans les deux équipes. */
      aiDecision(M, b.owner, dt);
      /* Indispensable au rugby : l'essai se marque ballon en main. */
      checkGoal(M);
      return;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    var damp = Math.pow(0.45, dt);
    b.vx *= damp; b.vy *= damp;

    /* Rebonds sur les touches. */
    if (b.x < 0.3) { b.x = 0.3; b.vx = Math.abs(b.vx) * 0.6; }
    if (b.x > F.w - 0.3) { b.x = F.w - 0.3; b.vx = -Math.abs(b.vx) * 0.6; }

    /* Sortie derrière la ligne de but : remise en jeu. */
    if (b.y < -0.5 || b.y > F.h + 0.5) {
      var team = b.y > F.h / 2 ? 1 : 0;   // l'équipe qui défend ce côté relance
      b.y = u.clamp(b.y, 1.5, F.h - 1.5);
      b.vx = 0; b.vy = 0;
      var gk = null;
      for (var i = 0; i < M.players.length; i++) {
        if (M.players[i].team === team && M.players[i].role === 'gk') gk = M.players[i];
      }
      b.owner = gk || nearestPlayer(M, b.x, b.y, team);
    }

    checkGoal(M);
  }

  /** Tir ou passe automatique pour l'équipe adverse. */
  function aiDecision(M, p, dt) {
    var goal = goalOf(M, p.team);
    var d = Math.hypot(p.x - goal.x, p.y - goal.y);
    var F = M.F;
    var range = F.aiRange === undefined ? 0.19 : F.aiRange;
    var freq = F.aiShoot === undefined ? 0.45 : F.aiShoot;
    var shootMult = F.aiShootMult || 1.0;
    if (freq > 0 && d < F.h * range && u.chance(dt * freq * shootMult)) {
      shoot(M, p);
      return;
    }
    if (u.chance(dt * 0.5)) {
      var mate = nearestPlayer(M, goal.x, goal.y, p.team, p);
      if (mate) passTo(M, p, mate);
    }
  }

  /* ========================================================== ACTIONS ===== */

  function shoot(M, p, power) {
    var b = M.ball;
    if (b.owner !== p) return;
    var F = M.F;
    var goal = goalOf(M, p.team);
    var d = Math.hypot(p.x - goal.x, p.y - goal.y);

    /* Précision : dépend du niveau du tireur et de la distance. */
    var acc = u.clamp((p.ovr - 40) / 60, 0.05, 0.95);
    /* La dispersion est proportionnelle au terrain : un but de water-polo est
       petit, mais on tire de beaucoup plus près qu'au football. */
    var spread = ((1 - acc) * 0.10 + d / F.h * 0.16) * F.w;
    var tx = goal.x + u.gauss(0, spread);
    var ty = goal.y + (p.team === 0 ? 1 : -1);

    var dx = tx - p.x, dy = ty - p.y;
    var len = Math.hypot(dx, dy) || 1;
    var sp = F.ballSpeed * (0.75 + (power === undefined ? 0.6 : power) * 0.6);
    b.owner = null;
    b.free = 0;
    b.vx = dx / len * sp;
    b.vy = dy / len * sp;
    b.shooter = p;

    if (p.team === 0) {
      M.stats.youShots++;
      push(M, p.name + ' tente sa chance', 'info');
    } else {
      M.stats.oppShots++;
    }
  }

  function passTo(M, p, mate) {
    var b = M.ball;
    if (b.owner !== p || !mate) return;
    var dx = mate.x - p.x, dy = mate.y - p.y;
    var len = Math.hypot(dx, dy) || 1;
    var sp = Math.min(M.F.ballSpeed * 0.75, len * 2.4 + 4);
    b.owner = null;
    b.free = 0;
    b.vx = dx / len * sp;
    b.vy = dy / len * sp;
    b.passTarget = mate;
    /* Une passe ratée part de travers. */
    if (u.chance(u.clamp(0.35 - p.ovr / 250, 0.03, 0.3))) {
      var ang = u.rfloat(-0.35, 0.35);
      var cos = Math.cos(ang), sin = Math.sin(ang);
      var nvx = b.vx * cos - b.vy * sin;
      b.vy = b.vx * sin + b.vy * cos;
      b.vx = nvx;
    }
  }

  /* ============================================================= BUTS ===== */

  function checkGoal(M) {
    var b = M.ball, F = M.F;
    if (M.restart > 0) return;

    if (F.goal === 'tryline') {
      /* Rugby (et Ultimate, en zone d'en-but) : il faut porter/réceptionner
         le ballon derrière la ligne plutôt que le tirer dans un but. */
      if (b.owner) {
        var team = b.owner.team;
        if ((team === 0 && b.y >= F.h - 0.6) || (team === 1 && b.y <= 0.6)) {
          var basePts = F.tryPts === undefined ? 5 : F.tryPts;
          var bonusPts = F.tryBonus && u.chance(0.74) ? F.tryBonus : 0;
          scoreGoal(M, team, basePts + bonusPts, F.tryLabel || 'Essai');
        }
      }
      return;
    }

    /* Le ballon doit franchir la ligne entre les poteaux. */
    var inX = Math.abs(b.x - F.w / 2) < F.goalW / 2 + 0.6;
    if (!inX) return;

    var scorerTeam = null;
    if (b.y >= F.h - 0.4) scorerTeam = 0;
    else if (b.y <= 0.4) scorerTeam = 1;
    if (scorerTeam === null) return;

    /* Arrêt du gardien : il faut qu'il soit proche de la trajectoire. */
    var gk = null;
    for (var i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      if (p.team !== scorerTeam && p.role === 'gk') gk = p;
    }
    if (gk && Math.abs(gk.x - b.x) < (2.2 + gk.ovr / 70) * (F.w / 68)) {
      var saveChance = u.clamp(0.42 + gk.ovr / 130, 0.3, 0.88);
      if (u.chance(saveChance)) {
        b.vx = u.rfloat(-6, 6); b.vy = (scorerTeam === 0 ? -1 : 1) * 12;
        b.y = gk.y;
        b.owner = null;
        if (scorerTeam === 0) push(M, 'Arrêt du gardien !', 'warn');
        return;
      }
    }

    var pts = 1;
    if (F.goal === 'basket') {
      var goal = goalOf(M, scorerTeam);
      var d = Math.hypot((b.shooter ? b.shooter.x : b.x) - goal.x,
        (b.shooter ? b.shooter.y : b.y) - goal.y);
      pts = d > 7 ? 3 : 2;
    }
    scoreGoal(M, scorerTeam, pts, F.goal === 'basket' ? 'Panier' : 'But');
  }

  function scoreGoal(M, team, pts, label) {
    if (team === 0) {
      M.score.you += pts;
      var who = M.ball.shooter || M.ball.owner || M.user;
      push(M, '⚽ ' + label + ' ! ' + (who ? who.name : '') + ' — ' +
        M.score.you + '-' + M.score.opp, 'good');
      if (who && who.ref) {
        who.ref.seasonScored = (who.ref.seasonScored || 0) + 1;
        who.ref.scored = (who.ref.scored || 0) + 1;
      }
    } else {
      M.score.opp += pts;
      push(M, '🔴 ' + label + ' adverse — ' + M.score.you + '-' + M.score.opp, 'bad');
    }
    M.ball.shooter = null;
    kickoff(M, team === 0 ? -1 : 1);
  }

  /* ============================================== SPORTS DE RAQUETTE ===== */

  /** Lance un nouvel échange : `hitterTeam` sert (ou relance après la pause). */
  function startRally(M, hitterTeam) {
    var hitter = M.players[hitterTeam === 0 ? 0 : 1];
    var receiver = M.players[hitterTeam === 0 ? 1 : 0];
    M.ball.x = M.F.w / 2; M.ball.y = M.F.h / 2;
    aimShot(M, hitter, receiver, true);
    M.restart = 0.5;
  }

  /** Le frappeur envoie la balle vers le camp du relanceur ; le point visé
   * est d'autant plus excentré que le frappeur est fort. */
  function aimShot(M, hitter, receiver, isServe) {
    var F = M.F;
    var acc = u.clamp((hitter.ovr - 35) / 65, 0.08, 0.95);
    var spread = (1 - acc) * F.w * 0.18 + F.w * 0.06;
    var tx = u.clamp(F.w / 2 + u.gauss(0, spread), F.w * 0.08, F.w * 0.92);
    M.rally = {
      hitter: hitter, receiver: receiver,
      fromX: M.ball.x, fromY: M.ball.y,
      toX: tx, toY: receiver.home.y,
      t: 0, dur: Math.max(0.4, F.h / F.ballSpeed)
    };
    if (!isServe) {
      push(M, (hitter.team === 0 ? hitter.name : M.oppName) + ' renvoie', 'info');
    }
  }

  /** Fait voler la balle d'un camp à l'autre pendant un échange. */
  function updateRally(M, dt) {
    if (!M.rally) { startRally(M, u.chance(0.5) ? 0 : 1); return; }
    if (M.restart > 0) return;
    var r = M.rally;
    r.t += dt;
    var frac = u.clamp(r.t / r.dur, 0, 1);
    M.ball.x = u.lerp(r.fromX, r.toX, frac);
    M.ball.y = u.lerp(r.fromY, r.toY, frac);
    if (frac >= 1) resolveRallyShot(M);
  }

  /** À l'arrivée de la balle : le relanceur réussit ou manque son renvoi,
   * selon l'écart de niveau et la difficulté du point visé. */
  function resolveRallyShot(M) {
    var r = M.rally, F = M.F;
    var hitter = r.hitter, receiver = r.receiver;
    var placementDiff = Math.abs(r.toX - receiver.home.x) / (F.w * 0.5);
    var skillGap = (hitter.ovr - receiver.ovr) / 100;
    var failChance = u.clamp(0.14 + placementDiff * 0.30 + skillGap * 0.35, 0.04, 0.85);
    if (u.chance(failChance)) {
      scoreRally(M, hitter.team, hitter);
    } else {
      aimShot(M, receiver, hitter, false);
    }
  }

  var RACKET_MISS = ['ne parvient pas à revenir sur le point', 'sort la balle',
    'touche le filet', 'ne trouve pas la balle à temps'];

  function scoreRally(M, team, winner) {
    var sport = M.sport;
    var verb = (G.match.pools.SCORE_VERBS[sport.id] && u.pick(G.match.pools.SCORE_VERBS[sport.id])) || 'marque le point';
    var name = team === 0 ? winner.name : M.oppName;
    if (team === 0 && winner.ref) {
      winner.ref.seasonScored = (winner.ref.seasonScored || 0) + 1;
      winner.ref.scored = (winner.ref.scored || 0) + 1;
    }
    if (team === 0) M.stats.youShots++; else M.stats.oppShots++;

    racketPointWon(M, team);

    push(M, (team === 0 ? '🟢 ' : '🔴 ') + name + ' ' + verb + ' — ' + pointScoreText(M),
      team === 0 ? 'good' : 'bad');

    if (!M.done && u.chance(0.25)) {
      var loser = team === 0 ? M.players[1] : M.players[0];
      push(M, loser.name + ' ' + u.pick(RACKET_MISS), 'info');
    }
    M.rally = null;
    if (!M.done) startRally(M, team);
  }

  /** Sports de raquette en conditions réelles : chaque point remonte la
   * hiérarchie point → jeu (tennis/padel, avec avantages) ou point → manche
   * (badminton/squash/tennis de table, à 21/11 points) → set du match,
   * jusqu'à la victoire finale (voir F.scoring dans FIELDS). */
  function racketPointWon(M, team) {
    var sc = M.F.scoring;
    if (sc.style === 'tennis') tennisPointWon(M, team);
    else pointsStyleWon(M, team);
  }

  var TENNIS_POINT_LABELS = ['0', '15', '30', '40'];

  function pointScoreText(M) {
    var sc = M.F.scoring;
    if (sc.style === 'tennis') {
      var you = M.points.you, opp = M.points.opp;
      if (you >= 3 && opp >= 3) {
        if (you === opp) return '40-40';
        return you > opp ? 'Av.-40' : '40-Av.';
      }
      return TENNIS_POINT_LABELS[Math.min(you, 3)] + '-' + TENNIS_POINT_LABELS[Math.min(opp, 3)];
    }
    return M.games.you + '-' + M.games.opp;
  }

  function tennisPointWon(M, team) {
    var key = team === 0 ? 'you' : 'opp';
    M.points[key]++;
    var you = M.points.you, opp = M.points.opp, gameWinner = null;
    if (you >= 4 && you - opp >= 2) gameWinner = 'you';
    else if (opp >= 4 && opp - you >= 2) gameWinner = 'opp';
    if (gameWinner) {
      M.points.you = 0; M.points.opp = 0;
      gameWon(M, gameWinner);
    }
  }

  function gameWon(M, who) {
    M.games[who]++;
    push(M, '🎾 Jeu ' + (who === 'you' ? M.club.name : M.oppName) +
      ' — ' + M.games.you + '-' + M.games.opp, who === 'you' ? 'good' : 'bad');

    var you = M.games.you, opp = M.games.opp, sc = M.F.scoring, setWinner = null;
    if (you >= sc.gamesToWinSet && you - opp >= 2) setWinner = 'you';
    else if (opp >= sc.gamesToWinSet && opp - you >= 2) setWinner = 'opp';
    /* Jeu décisif simplifié à 6 partout : le prochain jeu gagné tranche le
       set (7-6), plutôt qu'un tie-break détaillé point par point. */
    else if (you >= sc.gamesToWinSet && opp >= sc.gamesToWinSet && you !== opp) {
      setWinner = you > opp ? 'you' : 'opp';
    }
    if (setWinner) setWonBy(M, setWinner);
  }

  function pointsStyleWon(M, team) {
    var key = team === 0 ? 'you' : 'opp';
    M.games[key]++;
    var you = M.games.you, opp = M.games.opp, sc = M.F.scoring, setWinner = null;
    if (you >= sc.pointsToWinSet && you - opp >= 2) setWinner = 'you';
    else if (opp >= sc.pointsToWinSet && opp - you >= 2) setWinner = 'opp';
    else if (you >= sc.capAt) setWinner = 'you';
    else if (opp >= sc.capAt) setWinner = 'opp';
    if (setWinner) setWonBy(M, setWinner);
  }

  /** Un set (ou une manche) vient d'être décidé : on l'archive, le score du
   * match (M.score = sets gagnés) avance d'un cran, puis on vérifie la
   * victoire finale du match. */
  function setWonBy(M, who) {
    M.setsHistory.push({ you: M.games.you, opp: M.games.opp });
    M.games.you = 0; M.games.opp = 0;
    M.points.you = 0; M.points.opp = 0;
    M.score[who]++;
    var setLabel = M.F.scoring.style === 'tennis' ? 'le set' : 'la manche';
    push(M, '🏆 ' + (who === 'you' ? M.club.name : M.oppName) + ' remporte ' + setLabel +
      ' — ' + M.score.you + '-' + M.score.opp, who === 'you' ? 'good' : 'bad');
    if (M.score[who] >= M.F.scoring.setsToWin) finish(M);
  }

  /** Filet de sécurité si un match de raquette ne se conclut pas assez vite
   * (adversaires très proches en niveau) : on tranche en faveur du camp en
   * tête dans la manche en cours, puis on referme la rencontre normalement. */
  function finishRacketNow(M) {
    var who = M.games.you === M.games.opp
      ? (u.chance(0.5) ? 'you' : 'opp')
      : (M.games.you > M.games.opp ? 'you' : 'opp');
    while (!M.done && M.score.you < M.F.scoring.setsToWin && M.score.opp < M.F.scoring.setsToWin) {
      setWonBy(M, who);
    }
  }

  /** Score à afficher dans l'interface : les sports de raquette montrent les
   * sets gagnés comme score principal, avec le détail du jeu/manche en cours
   * en sous-titre — les autres disciplines n'ont rien à ajouter ici. */
  function formatScore(M) {
    if (!M.F.racket) return { you: M.score.you, opp: M.score.opp, detail: '' };
    var sc = M.F.scoring;
    var detail = sc.style === 'tennis'
      ? ('Jeu ' + pointScoreText(M) + ' · Set ' + M.games.you + '-' + M.games.opp)
      : ('Manche ' + M.games.you + '-' + M.games.opp);
    return { you: M.score.you, opp: M.score.opp, detail: detail };
  }

  /* ======================================= SPORTS COLLECTIFS AU FILET ===== */

  /** Volleyball : une équipe complète de chaque côté (formation posée par
   * buildTeams), mais l'échange se joue comme au filet plutôt que comme un
   * ballon disputé au contact — pas de tacle, pas de dribble. */
  function startNetRally(M, servingTeam) {
    var F = M.F;
    var serverY = servingTeam === 0 ? F.h * 0.95 : F.h * 0.05;
    var hitter = nearestPlayer(M, F.w / 2, serverY, servingTeam);
    var receiver = nearestPlayer(M, F.w / 2, servingTeam === 0 ? F.h * 0.25 : F.h * 0.75, 1 - servingTeam);
    if (!hitter || !receiver) return;
    M.ball.x = hitter.x; M.ball.y = hitter.y;
    aimNetShot(M, hitter, receiver, true);
    M.restart = 0.5;
  }

  function aimNetShot(M, hitter, receiver, isServe) {
    var F = M.F;
    var acc = u.clamp((hitter.ovr - 35) / 65, 0.08, 0.95);
    var spread = (1 - acc) * F.w * 0.22 + F.w * 0.08;
    var tx = u.clamp(F.w / 2 + u.gauss(0, spread), F.w * 0.06, F.w * 0.94);
    var receivingTeam = receiver.team;
    var ty = receivingTeam === 0 ? F.h * u.rfloat(0.58, 0.9) : F.h * u.rfloat(0.1, 0.42);
    M.rally = {
      hitter: hitter, receiver: receiver, receivingTeam: receivingTeam,
      fromX: M.ball.x, fromY: M.ball.y, toX: tx, toY: ty,
      t: 0, dur: Math.max(0.5, F.h / F.ballSpeed)
    };
    if (!isServe) push(M, hitter.name + ' renvoie', 'info');
  }

  function updateNetRally(M, dt) {
    if (!M.rally) { startNetRally(M, u.chance(0.5) ? 0 : 1); return; }
    if (M.restart > 0) return;
    var r = M.rally;
    r.t += dt;
    var frac = u.clamp(r.t / r.dur, 0, 1);
    M.ball.x = u.lerp(r.fromX, r.toX, frac);
    M.ball.y = u.lerp(r.fromY, r.toY, frac);
    if (frac >= 1) resolveNetRallyShot(M);
  }

  function resolveNetRallyShot(M) {
    var r = M.rally, F = M.F;
    var placementDiff = Math.abs(r.toX - r.receiver.home.x) / (F.w * 0.5);
    var skillGap = (r.hitter.ovr - r.receiver.ovr) / 100;
    var failChance = u.clamp(0.16 + placementDiff * 0.26 + skillGap * 0.30, 0.05, 0.80);
    if (u.chance(failChance)) {
      scoreNetRally(M, r.hitter.team);
    } else {
      /* Le relanceur devient le frappeur ; il vise un adversaire proche de
         sa position d'origine pour la suite de l'échange. */
      var mate = nearestPlayer(M, r.toX + u.rfloat(-2, 2), r.receiver.home.y, r.receiver.team) || r.receiver;
      var target = nearestPlayer(M, F.w / 2, r.hitter.home.y, r.hitter.team) || r.hitter;
      aimNetShot(M, mate, target, false);
    }
  }

  var NET_MISS = ['la balle tombe au sol', 'sort du terrain', 'touche le filet',
    'n\'est pas rattrapée à temps'];

  function scoreNetRally(M, losingTeam) {
    var team = 1 - losingTeam;
    var sport = M.sport;
    var verb = (G.match.pools.SCORE_VERBS[sport.id] && u.pick(G.match.pools.SCORE_VERBS[sport.id])) || 'marque le point';
    var scorer = nearestPlayer(M, M.F.w / 2, team === 0 ? M.F.h * 0.75 : M.F.h * 0.25, team);
    if (team === 0) {
      M.score.you += 1;
      M.stats.youShots++;
      push(M, '🟢 ' + (scorer ? scorer.name + ' ' : '') + verb + ' — ' + M.score.you + '-' + M.score.opp, 'good');
      if (scorer && scorer.ref) {
        scorer.ref.seasonScored = (scorer.ref.seasonScored || 0) + 1;
        scorer.ref.scored = (scorer.ref.scored || 0) + 1;
      }
    } else {
      M.score.opp += 1;
      M.stats.oppShots++;
      push(M, '🔴 ' + M.oppName + ' ' + verb + ' — ' + M.score.you + '-' + M.score.opp, 'bad');
    }
    if (u.chance(0.3)) push(M, u.pick(NET_MISS), 'info');
    M.rally = null;
    startNetRally(M, team);   // au volley, l'équipe qui vient de marquer sert
  }

  /* ================================================== BASEBALL (LOSANGE) == */

  /* Positions relatives au terrain (fractions de F.w/F.h), pour le losange,
     les bases et les postes défensifs — partagées par la logique de jeu et
     le rendu, afin que les coureurs et les joueurs restent cohérents. */
  var DIAMOND = {
    home: { x: 0.5, y: 0.70 },
    first: { x: 0.68, y: 0.50 },
    second: { x: 0.5, y: 0.30 },
    third: { x: 0.32, y: 0.50 },
    mound: { x: 0.5, y: 0.50 },
    fielders: [
      { x: 0.5, y: 0.50 },    // 0 lanceur
      { x: 0.5, y: 0.80 },    // 1 receveur
      { x: 0.64, y: 0.46 },   // 2 1ère base
      { x: 0.58, y: 0.28 },   // 3 2e base
      { x: 0.42, y: 0.28 },   // 4 arrêt-court
      { x: 0.36, y: 0.46 },   // 5 3e base
      { x: 0.24, y: 0.14 },   // 6 champ gauche
      { x: 0.5, y: 0.06 },    // 7 champ centre
      { x: 0.76, y: 0.14 }    // 8 champ droit
    ]
  };

  function buildDiamondMatch(M, club, sport, mine, oppStr) {
    var F = M.F;
    var line = G.manager.starters(club);
    var n = Math.max(1, Math.min(line.length, sport.lineupSize));
    var myLineup = [], i;
    for (i = 0; i < 9; i++) {
      var src = line[i % n];
      myLineup.push({
        id: (src && src.id) || u.uid('you'), name: (src && src.name) || ('Joueur ' + (i + 1)),
        ovr: src ? G.manager.effOvr(src, sport) : u.clamp(mine.att, 20, 95), ref: src || null
      });
    }
    var oppLineup = [];
    for (i = 0; i < 9; i++) {
      oppLineup.push({
        id: 'o' + i, name: u.pick(G.DATA.firstNames)[0] + '. ' + u.pick(G.DATA.lastNames),
        ovr: u.clamp(oppStr + u.gauss(0, 6), 20, 95), ref: null
      });
    }
    M.lineups = [myLineup, oppLineup];
    M.diamond = {
      inning: 1, battingTeam: M.youHome ? 1 : 0,
      outs: 0, bases: [false, false, false], lineupIdx: [0, 0], half: 0
    };
    M.ball = { x: F.w * DIAMOND.mound.x, y: F.h * DIAMOND.mound.y, vx: 0, vy: 0, owner: null };
    refreshDiamondPlayers(M);
  }

  /** Replace les 9 défenseurs de l'équipe au champ, plus le frappeur du
   * moment au marbre — appelé à chaque nouveau frappeur ou changement de
   * demi-manche. */
  function refreshDiamondPlayers(M) {
    var F = M.F, d = M.diamond;
    var fieldingTeam = 1 - d.battingTeam;
    var fielders = M.lineups[fieldingTeam];
    M.players = [];
    for (var i = 0; i < 9 && i < fielders.length; i++) {
      var s = DIAMOND.fielders[i];
      var pos = { x: s.x * F.w, y: s.y * F.h };
      M.players.push({
        id: fielders[i].id, name: fielders[i].name, num: i + 1,
        team: fieldingTeam, role: i === 0 ? 'gk' : 'def',
        home: pos, x: pos.x, y: pos.y, vx: 0, vy: 0,
        ovr: fielders[i].ovr, speed: 0, ref: fielders[i].ref
      });
    }
    var batter = M.lineups[d.battingTeam][d.lineupIdx[d.battingTeam] % 9];
    var bpos = { x: F.w * DIAMOND.home.x, y: F.h * DIAMOND.home.y };
    M.players.push({
      id: batter.id, name: batter.name, num: 0, team: d.battingTeam, role: 'att',
      home: bpos, x: bpos.x, y: bpos.y, vx: 0, vy: 0, ovr: batter.ovr, speed: 0, ref: batter.ref
    });
    M.currentBatter = batter;
    M.currentPitcher = fielders[0];
  }

  function startAtBat(M) {
    var F = M.F;
    M.rally = {
      t: 0, dur: 1.1,
      fromX: F.w * DIAMOND.mound.x, fromY: F.h * DIAMOND.mound.y,
      toX: F.w * DIAMOND.home.x, toY: F.h * DIAMOND.home.y
    };
    M.ball.x = M.rally.fromX; M.ball.y = M.rally.fromY;
  }

  function updateDiamond(M, dt) {
    if (M.restart > 0) { M.restart -= dt; return; }
    if (!M.rally) { startAtBat(M); return; }
    var r = M.rally;
    r.t += dt;
    var frac = u.clamp(r.t / r.dur, 0, 1);
    M.ball.x = u.lerp(r.fromX, r.toX, frac);
    M.ball.y = u.lerp(r.fromY, r.toY, frac);
    if (frac >= 1) { M.rally = null; M.restart = 0.7; resolveAtBat(M); }
  }

  /** Répartit les coureurs déjà sur les bases (et le frappeur) selon le
   * nombre de bases gagnées ; renvoie les points marqués. */
  function advanceRunners(M, adv, batterRuns) {
    var d = M.diamond;
    var runs = 0;
    if (adv >= 4) {
      runs = d.bases.filter(Boolean).length + (batterRuns ? 1 : 0);
      d.bases = [false, false, false];
    } else {
      var newBases = [false, false, false];
      for (var b = 2; b >= 0; b--) {
        if (d.bases[b]) {
          var pos = b + adv;
          if (pos >= 3) runs++; else newBases[pos] = true;
        }
      }
      if (batterRuns) {
        var bp = adv - 1;
        if (bp >= 3) runs++; else newBases[bp] = true;
      }
      d.bases = newBases;
    }
    if (runs > 0) {
      if (d.battingTeam === 0) M.score.you += runs; else M.score.opp += runs;
      push(M, '🏃 ' + runs + ' point' + (runs > 1 ? 's' : '') + ' inscrit' + (runs > 1 ? 's' : '') +
        ' — ' + M.score.you + '-' + M.score.opp, 'good');
    }
  }

  function nextBatter(M) {
    var d = M.diamond;
    d.lineupIdx[d.battingTeam] = (d.lineupIdx[d.battingTeam] + 1) % 9;
    refreshDiamondPlayers(M);
  }

  function endHalfInning(M) {
    var d = M.diamond;
    d.outs = 0;
    d.bases = [false, false, false];
    d.battingTeam = 1 - d.battingTeam;
    d.half++;
    if (d.half % 2 === 0) {
      push(M, '⚾ Fin de la ' + d.inning + 'e manche — ' + M.score.you + '-' + M.score.opp, 'info');
      d.inning++;
    }
    M.clock = d.half / 2;
    if (d.inning > 12 || (d.inning > 9 && M.score.you !== M.score.opp)) {
      finish(M);
      return;
    }
    refreshDiamondPlayers(M);
  }

  function endAtBatCheck(M) {
    if (M.diamond.outs >= 3) endHalfInning(M); else nextBatter(M);
  }

  var GROUNDOUT_TXT = ['est retiré au sol', 'est retiré au champ extérieur',
    'voit sa frappe captée', 'est retiré sur un double jeu'];

  /** Résout un face-à-face lanceur/frappeur : retrait, but sur balles ou
   * coup sûr, avec avancée des coureurs le cas échéant. */
  function resolveAtBat(M) {
    if (M.done) return;
    var d = M.diamond;
    var batter = M.currentBatter, pitcher = M.currentPitcher;
    var gap = (batter.ovr - pitcher.ovr) / 100;

    var pK = u.clamp(0.22 - gap * 0.14, 0.08, 0.40);
    var pBB = u.clamp(0.09 + gap * 0.05, 0.03, 0.18);
    var pOut = u.clamp((1 - pK - pBB) * (0.60 - gap * 0.18), 0.08, 0.80);
    var pHit = Math.max(0.02, 1 - pK - pBB - pOut);
    var tot = pK + pBB + pOut + pHit;
    pK /= tot; pBB /= tot; pOut /= tot;

    var roll = u.rnd();
    if (roll < pK) {
      d.outs++;
      push(M, '🔴 ' + batter.name + ' retiré sur trois prises', 'bad');
      endAtBatCheck(M);
    } else if (roll < pK + pBB) {
      push(M, '🟢 ' + batter.name + ' au premier but sur balles', 'good');
      advanceRunners(M, 1, true);
      nextBatter(M);
    } else if (roll < pK + pBB + pOut) {
      d.outs++;
      push(M, '🔴 ' + batter.name + ' ' + u.pick(GROUNDOUT_TXT), 'bad');
      endAtBatCheck(M);
    } else {
      var single = 0.62 - gap * 0.12, double = 0.20, triple = 0.05, hr = 0.13 + gap * 0.12;
      var s = single + double + triple + hr;
      single /= s; double /= s; triple /= s;
      var hitRoll = u.rnd();
      var bases = hitRoll < single ? 1 : hitRoll < single + double ? 2 :
        hitRoll < single + double + triple ? 3 : 4;
      var label = bases === 1 ? 'simple' : bases === 2 ? 'double' : bases === 3 ? 'triple' : 'coup de circuit';
      push(M, '🟢 ' + batter.name + ' claque un ' + label + ' !', 'good');
      if (batter.ref) {
        batter.ref.seasonScored = (batter.ref.seasonScored || 0) + 1;
        batter.ref.scored = (batter.ref.scored || 0) + 1;
      }
      M.stats[d.battingTeam === 0 ? 'youShots' : 'oppShots']++;
      advanceRunners(M, bases, true);
      nextBatter(M);
    }
  }

  /* ==================================================== CRICKET (OVALE) === */

  /* Positions relatives au terrain : un pitch central entre deux guichets,
     plutôt qu'un losange ou un rectangle à deux buts. */
  var CRICKET = {
    striker: { x: 0.5, y: 0.68 },
    nonStriker: { x: 0.5, y: 0.32 },
    bowlerMark: { x: 0.5, y: 0.32 },
    keeper: { x: 0.5, y: 0.82 },
    fielders: [
      { x: 0.18, y: 0.58 }, { x: 0.14, y: 0.38 }, { x: 0.28, y: 0.16 },
      { x: 0.5, y: 0.06 }, { x: 0.72, y: 0.16 }, { x: 0.86, y: 0.38 },
      { x: 0.82, y: 0.58 }, { x: 0.64, y: 0.72 }
    ]
  };

  function buildCricketMatch(M, club, sport, mine, oppStr) {
    var F = M.F;
    var line = G.manager.starters(club);
    var n = Math.max(1, Math.min(line.length, sport.lineupSize));
    var myLineup = [], i;
    for (i = 0; i < 11; i++) {
      var src = line[i % n];
      myLineup.push({
        id: (src && src.id) || u.uid('you'), name: (src && src.name) || ('Joueur ' + (i + 1)),
        ovr: src ? G.manager.effOvr(src, sport) : u.clamp(mine.att, 20, 95), ref: src || null
      });
    }
    var oppLineup = [];
    for (i = 0; i < 11; i++) {
      oppLineup.push({
        id: 'o' + i, name: u.pick(G.DATA.firstNames)[0] + '. ' + u.pick(G.DATA.lastNames),
        ovr: u.clamp(oppStr + u.gauss(0, 6), 20, 95), ref: null
      });
    }
    M.lineups = [myLineup, oppLineup];
    M.cricket = {
      oversTotal: 8, inning: 1, battingTeam: M.youHome ? 1 : 0,
      ballsBowled: 0, wickets: 0, batterIdx: 0, target: null
    };
    M.ball = { x: F.w * CRICKET.bowlerMark.x, y: F.h * CRICKET.bowlerMark.y, vx: 0, vy: 0, owner: null };
    refreshCricketPlayers(M);
  }

  /** Replace les défenseurs au champ (lanceur, gardien de guichet, 8
   * fielders) plus le batteur du moment. */
  function refreshCricketPlayers(M) {
    var F = M.F, c = M.cricket;
    var fieldingTeam = 1 - c.battingTeam;
    var fielders = M.lineups[fieldingTeam];
    var slots = [CRICKET.bowlerMark, CRICKET.keeper].concat(CRICKET.fielders);
    M.players = [];
    for (var i = 0; i < slots.length && i < fielders.length; i++) {
      var s = slots[i];
      var pos = { x: s.x * F.w, y: s.y * F.h };
      M.players.push({
        id: fielders[i].id, name: fielders[i].name, num: i + 1,
        team: fieldingTeam, role: i === 0 ? 'gk' : 'def',
        home: pos, x: pos.x, y: pos.y, vx: 0, vy: 0,
        ovr: fielders[i].ovr, speed: 0, ref: fielders[i].ref
      });
    }
    var batter = M.lineups[c.battingTeam][c.batterIdx % 11];
    var bpos = { x: F.w * CRICKET.striker.x, y: F.h * CRICKET.striker.y };
    M.players.push({
      id: batter.id, name: batter.name, num: 0, team: c.battingTeam, role: 'att',
      home: bpos, x: bpos.x, y: bpos.y, vx: 0, vy: 0, ovr: batter.ovr, speed: 0, ref: batter.ref
    });
    M.currentBatter = batter;
    M.currentBowler = fielders[0];
  }

  function startDelivery(M) {
    var F = M.F;
    M.rally = {
      t: 0, dur: 0.9,
      fromX: F.w * CRICKET.bowlerMark.x, fromY: F.h * CRICKET.bowlerMark.y,
      toX: F.w * CRICKET.striker.x, toY: F.h * CRICKET.striker.y
    };
    M.ball.x = M.rally.fromX; M.ball.y = M.rally.fromY;
  }

  function updateCricket(M, dt) {
    if (M.restart > 0) { M.restart -= dt; return; }
    if (!M.rally) { startDelivery(M); return; }
    var r = M.rally;
    r.t += dt;
    var frac = u.clamp(r.t / r.dur, 0, 1);
    M.ball.x = u.lerp(r.fromX, r.toX, frac);
    M.ball.y = u.lerp(r.fromY, r.toY, frac);
    if (frac >= 1) { M.rally = null; M.restart = 0.6; resolveDelivery(M); }
  }

  function endCricketInnings(M) {
    var c = M.cricket;
    if (c.inning === 1) {
      c.inning = 2;
      c.target = c.battingTeam === 0 ? M.score.you : M.score.opp;
      c.battingTeam = 1 - c.battingTeam;
      c.ballsBowled = 0; c.wickets = 0; c.batterIdx = 0;
      M.clock = 1;
      push(M, '🏏 Fin de la 1ère manche — ' + M.score.you + '-' + M.score.opp +
        ' · objectif ' + (c.target + 1), 'info');
      refreshCricketPlayers(M);
    } else {
      finish(M);
    }
  }

  var WICKET_TXT = ['est éliminé lbw', 'voit son guichet tomber', 'est pris au vol',
    'est éliminé au bâton'];

  /** Résout une balle : guichet, balle bloquée sans point, ou course
   * marquée (1 à 6 points), selon l'écart de niveau batteur/lanceur. */
  function resolveDelivery(M) {
    if (M.done) return;
    var c = M.cricket;
    var batter = M.currentBatter, bowler = M.currentBowler;
    var gap = (batter.ovr - bowler.ovr) / 100;
    c.ballsBowled++;

    var pWicket = u.clamp(0.045 - gap * 0.025, 0.015, 0.09);
    var pDot = u.clamp(0.42 - gap * 0.10, 0.22, 0.58);
    var roll = u.rnd();
    var wicket = false;

    if (roll < pWicket) {
      wicket = true;
      c.wickets++;
      push(M, '🔴 ' + batter.name + ' ' + u.pick(WICKET_TXT) + ' !', 'bad');
    } else if (roll < pWicket + pDot) {
      push(M, batter.name + ' bloque, aucune course', 'info');
    } else {
      var rest = 1 - pWicket - pDot;
      var rr = (roll - pWicket - pDot) / rest;
      var one = 0.42 - gap * 0.05, two = 0.16, three = 0.04, four = 0.28 + gap * 0.10, six = 0.10 + gap * 0.10;
      var s = one + two + three + four + six;
      one /= s; two /= s; three /= s; four /= s;
      var runs = rr < one ? 1 : rr < one + two ? 2 : rr < one + two + three ? 3 :
        rr < one + two + three + four ? 4 : 6;
      if (c.battingTeam === 0) M.score.you += runs; else M.score.opp += runs;
      if (runs >= 4) {
        push(M, '🟢 ' + batter.name + ' ' +
          (runs === 6 ? 'envoie la balle en tribunes pour un SIX' : 'trouve la limite pour un QUATRE') +
          ' — ' + M.score.you + '-' + M.score.opp, 'good');
      } else {
        push(M, batter.name + ' prend ' + runs + (runs > 1 ? ' points' : ' point'), 'info');
      }
      if (batter.ref) {
        batter.ref.seasonScored = (batter.ref.seasonScored || 0) + runs;
        batter.ref.scored = (batter.ref.scored || 0) + runs;
      }
      M.stats[c.battingTeam === 0 ? 'youShots' : 'oppShots']++;
    }

    if (wicket) {
      c.batterIdx++;
      if (c.wickets >= 10) { endCricketInnings(M); return; }
    }
    if (c.ballsBowled >= c.oversTotal * 6) { endCricketInnings(M); return; }
    if (c.target !== null) {
      var chasing = c.battingTeam === 0 ? M.score.you : M.score.opp;
      if (chasing > c.target) { finish(M); return; }
    }
    refreshCricketPlayers(M);
  }

  /* ============================================== TIR À L'ARC PAR ÉQUIPES */

  var ARCHERY = {
    targets: [{ x: 0.25, y: 0.1 }, { x: 0.75, y: 0.1 }],
    lineSpots: [
      [{ x: 0.15, y: 0.85 }, { x: 0.25, y: 0.85 }, { x: 0.35, y: 0.85 }],
      [{ x: 0.65, y: 0.85 }, { x: 0.75, y: 0.85 }, { x: 0.85, y: 0.85 }]
    ]
  };

  function buildArcheryMatch(M, club, sport, mine, oppStr) {
    var F = M.F;
    var line = G.manager.starters(club);
    var n = Math.max(1, Math.min(line.length, sport.lineupSize));
    var myTeam = [], i;
    for (i = 0; i < 3; i++) {
      var src = line[i % n];
      myTeam.push({
        id: (src && src.id) || u.uid('you'), name: (src && src.name) || ('Archer ' + (i + 1)),
        ovr: src ? G.manager.effOvr(src, sport) : u.clamp(mine.att, 20, 95), ref: src || null
      });
    }
    var oppTeam = [];
    for (i = 0; i < 3; i++) {
      oppTeam.push({
        id: 'o' + i, name: u.pick(G.DATA.firstNames)[0] + '. ' + u.pick(G.DATA.lastNames),
        ovr: u.clamp(oppStr + u.gauss(0, 6), 20, 95), ref: null
      });
    }
    M.teams = [myTeam, oppTeam];
    M.archery = { endsTotal: 10, end: 0, shotIdx: 0 };
    M.ball = {
      x: F.w * ARCHERY.lineSpots[0][0].x, y: F.h * ARCHERY.lineSpots[0][0].y,
      vx: 0, vy: 0, owner: null
    };
    refreshArcheryPlayers(M);
  }

  function refreshArcheryPlayers(M) {
    var F = M.F;
    M.players = [];
    for (var t = 0; t < 2; t++) {
      for (var i = 0; i < 3; i++) {
        var s = ARCHERY.lineSpots[t][i];
        var a = M.teams[t][i];
        var pos = { x: s.x * F.w, y: s.y * F.h };
        M.players.push({
          id: a.id, name: a.name, num: i + 1, team: t, role: 'att',
          home: pos, x: pos.x, y: pos.y, vx: 0, vy: 0, ovr: a.ovr, speed: 0, ref: a.ref
        });
      }
    }
  }

  /** L'archer désigné pour le tir courant : les deux équipes tirent en
   * alternance, trois archers chacune par volée. */
  function archeryShooter(M) {
    var idx = M.archery.shotIdx % 6;
    var team = idx % 2;
    var archerNum = Math.floor(idx / 2);
    return M.players[team === 0 ? archerNum : 3 + archerNum];
  }

  function startShot(M) {
    var shooter = archeryShooter(M);
    var target = ARCHERY.targets[shooter.team];
    M.rally = {
      t: 0, dur: 0.8,
      fromX: shooter.x, fromY: shooter.y,
      toX: M.F.w * target.x, toY: M.F.h * target.y
    };
    M.ball.x = shooter.x; M.ball.y = shooter.y;
  }

  function updateArchery(M, dt) {
    if (M.restart > 0) { M.restart -= dt; return; }
    if (!M.rally) { startShot(M); return; }
    var r = M.rally;
    r.t += dt;
    var frac = u.clamp(r.t / r.dur, 0, 1);
    M.ball.x = u.lerp(r.fromX, r.toX, frac);
    M.ball.y = u.lerp(r.fromY, r.toY, frac);
    if (frac >= 1) { M.rally = null; M.restart = 0.4; resolveShot(M); }
  }

  /** Résout un tir : la note de l'archer détermine la moyenne des points
   * marqués (0 à 10), avec une dispersion réaliste autour de cette moyenne. */
  function resolveShot(M) {
    if (M.done) return;
    var a = M.archery;
    var shooter = archeryShooter(M);
    var mean = u.clamp(3.5 + (shooter.ovr - 50) / 7, 1.5, 9.6);
    var score = Math.round(u.clamp(u.gauss(mean, 1.6), 0, 10));
    if (shooter.team === 0) M.score.you += score; else M.score.opp += score;

    var label = score >= 10 ? 'en plein centre !' : score >= 8 ? 'près du centre' :
      score >= 6 ? 'dans le jaune' : score >= 4 ? 'dans le rouge' :
        score >= 1 ? 'en périphérie de la cible' : 'hors cible';
    push(M, (score >= 8 ? '🎯 ' : score <= 2 ? '😖 ' : '') + shooter.name + ' tire ' + label +
      ' (' + score + ' pts) — ' + M.score.you + '-' + M.score.opp,
      score >= 8 ? 'good' : score <= 2 ? 'bad' : 'info');

    a.shotIdx++;
    if (a.shotIdx >= 6) {
      a.shotIdx = 0;
      a.end++;
      push(M, '🏹 Fin de la volée ' + a.end + ' — ' + M.score.you + '-' + M.score.opp, 'info');
      M.clock = a.end / a.endsTotal * M.F.clock;
      if (a.end >= a.endsTotal) { finish(M); return; }
    }
  }

  /* ============================================================== FIN ===== */

  function finish(M) {
    if (M.done) return M;
    M.done = true;
    M.running = false;
    push(M, ((M.F.diamond || M.F.cricket || M.F.archery) ? 'Fin de partie' : 'Coup de sifflet final') +
      ' — ' + M.score.you + '-' + M.score.opp,
      M.score.you > M.score.opp ? 'good' : M.score.you === M.score.opp ? 'info' : 'bad');
    M.result = G.manager.finishMatch(M.club, {
      you: M.score.you, opp: M.score.opp, oppName: M.oppName
    });
    return M;
  }

  /** Termine la rencontre en simulant le temps restant. */
  function skipToEnd(M) {
    if (M.done) return M;
    var F = M.F;
    if (F.racket) {
      /* Les sets restants se jouent au prorata du niveau des deux joueurs,
         plutôt que d'ajouter des points bruts qui n'auraient pas de sens
         une fois le score exprimé en sets. */
      var me = M.players[0], opp = M.players[1];
      var pYou = u.clamp(0.5 + (me.ovr - opp.ovr) / 100, 0.1, 0.9);
      while (!M.done) setWonBy(M, u.chance(pYou) ? 'you' : 'opp');
      M.clock = F.clock;
      return finish(M);
    }
    var remaining = Math.max(0, F.clock - M.clock);
    var sport = M.sport;
    /* Le temps restant est joué par l'ordinateur, au prorata. */
    var share = remaining / F.clock;
    var mine = G.manager.teamRatings(M.club);
    var extraYou = G.manager.simScore(mine.att, 55, sport) * share;
    var extraOpp = G.manager.simScore(55, mine.def, sport) * share;
    M.score.you += Math.round(extraYou);
    M.score.opp += Math.round(extraOpp);
    M.clock = F.clock;
    return finish(M);
  }

  /* ============================================================ CAMÉRA ==== */

  function updateCamera(M, dt) {
    var b = M.ball;
    var tx = b.x, ty = b.y;
    M.cam.x = u.lerp(M.cam.x, tx, Math.min(1, dt * 3.5));
    M.cam.y = u.lerp(M.cam.y, ty, Math.min(1, dt * 3.5));
  }

  /* ============================================================= RENDU ==== */

  /**
   * Dessine la scène.
   * @param {object} M
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cw largeur du canvas en pixels
   * @param {number} ch hauteur
   */
  function draw(M, ctx, cw, ch) {
    var F = M.F;
    if (F.diamond) { drawDiamond(M, ctx, cw, ch); return; }
    if (F.cricket) { drawCricket(M, ctx, cw, ch); return; }
    if (F.archery) { drawArchery(M, ctx, cw, ch); return; }
    /* Caméra rapprochée : on suit l'action de près, comme dans un jeu de
       sport mobile, plutôt que de regarder tout le terrain de loin. */
    var visibleW = Math.min(F.w, F.view || F.w * 0.5);
    var scale = cw / visibleW;
    var visibleH = ch / scale;

    var camX = u.clamp(M.cam.x, visibleW / 2, F.w - visibleW / 2);
    var camY = u.clamp(M.cam.y, visibleH / 2, F.h - visibleH / 2);
    if (visibleH >= F.h) camY = F.h / 2;

    function sx(x) { return (x - camX) * scale + cw / 2; }
    function sy(y) { return ch / 2 - (y - camY) * scale; }   // y croît vers le haut

    ctx.clearRect(0, 0, cw, ch);

    /* --- surface --- */
    ctx.fillStyle = F.surface;
    ctx.fillRect(0, 0, cw, ch);
    drawSurfaceTexture(F, ctx, sx, sy, cw, ch);

    /* --- lignes --- */
    ctx.strokeStyle = F.line;
    ctx.lineWidth = Math.max(1.5, scale * 0.12);
    ctx.strokeRect(sx(0), sy(F.h), F.w * scale, F.h * scale);

    if (F.racket || F.netTeam) {
      drawRacketCourt(F, ctx, sx, sy, scale);
    } else {
      drawFieldMarkings(M.sport.id, F, ctx, sx, sy, scale);
    }

    /* --- joueurs --- */
    /* Les petits terrains ne doivent pas produire des joueurs géants. */
    var r = u.clamp(scale * 0.72, 7, 15);
    for (var i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      var px = sx(p.x), py = sy(p.y);
      if (px < -40 || px > cw + 40 || py < -40 || py > ch + 40) continue;

      /* Ombre. */
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.ellipse(px + r * 0.25, py + r * 0.35, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      /* Halo et repère de direction du joueur contrôlé. */
      if (p === M.user) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, r * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        var sp2 = Math.hypot(p.vx, p.vy);
        if (sp2 > 0.4) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + p.vx / sp2 * r * 2.6, py - p.vy / sp2 * r * 2.6);
          ctx.stroke();
        }
      }

      ctx.fillStyle = p.team === 0 ? '#f0b429' : '#e8eef7';
      if (p.role === 'gk') ctx.fillStyle = p.team === 0 ? '#3ddc97' : '#b197fc';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.team === 0 ? '#5a3d00' : '#39465c';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = p.team === 0 ? '#3a2a00' : '#1b2433';
      ctx.font = 'bold ' + Math.round(r * 0.9) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(p.num), px, py);

      /* Afficher les cartons. */
      var card = M.cards[p.id];
      if (card) {
        var cardColor = card.type === 'yellow' ? '#FFD700' : '#FF4444';
        var cardW = r * 0.6, cardH = r * 0.8;
        ctx.fillStyle = cardColor;
        ctx.fillRect(px + r * 0.8 - cardW / 2, py - r * 0.6 - cardH / 2, cardW, cardH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + r * 0.8 - cardW / 2, py - r * 0.6 - cardH / 2, cardW, cardH);
      }
    }

    /* --- ballon (couleur et forme propres à chaque sport) --- */
    var b = M.ball;
    var bx = sx(b.x), by = sy(b.y);
    var ballColor = F.ball || '#ffffff';
    var ballLine = F.ballLine || '#333333';
    var oval = F.ballShape === 'oval';
    var bScale = (F.ballScale || 1) * r;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(bx + 2, by + 3, bScale * (oval ? 0.5 : 0.42), bScale * (oval ? 0.24 : 0.28), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.ellipse(bx, by, bScale * (oval ? 0.5 : 0.42), bScale * (oval ? 0.28 : 0.42), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ballLine;
    ctx.lineWidth = 1;
    ctx.stroke();

    /* --- flèche vers le but adverse (sans objet pour les sports de raquette
       et de filet, qui n'ont pas de but) --- */
    if (!F.racket && !F.netTeam) {
      var goal = goalOf(M, 0);
      var gy = sy(goal.y);
      if (gy < 0) {
        ctx.fillStyle = 'rgba(255,209,102,.85)';
        ctx.beginPath();
        ctx.moveTo(cw / 2, 8);
        ctx.lineTo(cw / 2 - 9, 22);
        ctx.lineTo(cw / 2 + 9, 22);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /** Texture de la surface : pelouse tondue, parquet, ou eau — jamais la
   * même pour un terrain de basket, une piscine et une pelouse. */
  function drawSurfaceTexture(F, ctx, sx, sy, cw, ch) {
    if (F.texture === 'grass') {
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#ffffff';
      var stripe = F.h / 14;
      for (var s = 0; s < 15; s++) {
        if (s % 2) continue;
        var y0 = sy(s * stripe), y1 = sy((s + 1) * stripe);
        ctx.fillRect(0, y1, cw, y0 - y1);
      }
      ctx.globalAlpha = 1;
    } else if (F.texture === 'wood') {
      ctx.globalAlpha = 0.10;
      ctx.strokeStyle = '#5a3410';
      ctx.lineWidth = 1;
      var plank = F.w / 8;
      for (var p = 1; p < 8; p++) {
        var x = sx(p * plank);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (F.texture === 'water') {
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      var lane = F.h / 12;
      for (var l = 1; l < 12; l++) {
        var y = sy(l * lane);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    /* 'indoor' (handball) : sol uni, pas de texture supplémentaire. */
  }

  /** Petit but rectangulaire avec filet, pour le water-polo et le handball
   * (à la différence du grand but à poteaux du football). */
  function drawNetGoal(F, ctx, sx, sy, scale, y, dir, depth) {
    var gw = F.goalW;
    var x0 = sx(F.w / 2 - gw / 2), x1 = sx(F.w / 2 + gw / 2);
    var yLine = sy(y), yBack = sy(y + dir * depth);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, scale * 0.16);
    ctx.beginPath();
    ctx.moveTo(x0, yLine); ctx.lineTo(x0, yBack);
    ctx.lineTo(x1, yBack); ctx.lineTo(x1, yLine);
    ctx.stroke();
    ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
    var steps = 4;
    for (var i = 1; i < steps; i++) {
      var xx = x0 + (x1 - x0) * i / steps;
      ctx.beginPath(); ctx.moveTo(xx, yLine); ctx.lineTo(xx, yBack); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Marquages au sol, propres à chaque sport collectif (aucun terrain de
   * basket ne ressemble à une pelouse de rugby). */
  function drawFieldMarkings(sportId, F, ctx, sx, sy, scale) {
    ctx.strokeStyle = F.line;
    ctx.lineWidth = Math.max(1.2, scale * 0.09);

    function hLine(y, dashed) {
      ctx.save();
      if (dashed) ctx.setLineDash([scale * 0.6, scale * 0.5]);
      ctx.beginPath();
      ctx.moveTo(sx(0), sy(y));
      ctx.lineTo(sx(F.w), sy(y));
      ctx.stroke();
      ctx.restore();
    }

    function arcFromEnd(y, dir, radius, dashed) {
      ctx.save();
      if (dashed) ctx.setLineDash([scale * 0.6, scale * 0.5]);
      ctx.beginPath();
      ctx.arc(sx(F.w / 2), sy(y), radius * scale,
        dir > 0 ? Math.PI : 0, dir > 0 ? Math.PI * 2 : Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    if (sportId === 'football') {
      hLine(F.h / 2);
      ctx.beginPath();
      ctx.arc(sx(F.w / 2), sy(F.h / 2), 9.15 * scale, 0, Math.PI * 2);
      ctx.stroke();
      var boxW = 40.3, boxH = 16.5;
      [0, 1].forEach(function (side) {
        var y = side ? F.h - boxH : 0;
        ctx.strokeRect(sx(F.w / 2 - boxW / 2), sy(y + boxH), boxW * scale, boxH * scale);
      });
      ctx.lineWidth = Math.max(2, scale * 0.22);
      [0, F.h].forEach(function (gy) {
        ctx.beginPath();
        ctx.moveTo(sx(F.w / 2 - F.goalW / 2), sy(gy));
        ctx.lineTo(sx(F.w / 2 + F.goalW / 2), sy(gy));
        ctx.stroke();
      });
    } else if (sportId === 'rugby') {
      hLine(F.h / 2);
      hLine(F.h / 2 - 10); hLine(F.h / 2 + 10);
      hLine(22); hLine(F.h - 22);
      hLine(5, true); hLine(F.h - 5, true);
      [0, F.h].forEach(function (gy) {
        [-1, 1].forEach(function (side) {
          ctx.beginPath();
          ctx.arc(sx(F.w / 2 + side * F.goalW / 2), sy(gy), Math.max(2, scale * 0.28), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      });
    } else if (sportId === 'waterpolo') {
      [2, F.h - 2].forEach(function (y) { ctx.strokeStyle = '#e53935'; hLine(y); });
      [5, F.h - 5].forEach(function (y) { ctx.strokeStyle = '#fdd835'; hLine(y); });
      ctx.strokeStyle = F.line;
      drawNetGoal(F, ctx, sx, sy, scale, 0, -1, 0.5);
      drawNetGoal(F, ctx, sx, sy, scale, F.h, 1, 0.5);
    } else if (sportId === 'basket') {
      ctx.beginPath();
      ctx.arc(sx(F.w / 2), sy(F.h / 2), 1.8 * scale, 0, Math.PI * 2);
      ctx.stroke();
      var keyW = 4.9, keyH = 5.8;
      [0, 1].forEach(function (side) {
        var y = side ? F.h - keyH : 0;
        ctx.strokeRect(sx(F.w / 2 - keyW / 2), sy(y + keyH), keyW * scale, keyH * scale);
        arcFromEnd(y + keyH, side ? -1 : 1, 1.8);
      });
      [0, F.h].forEach(function (gy, side) {
        var dir = side ? -1 : 1;
        arcFromEnd(gy + dir * 1.2, dir, 6.75);
        var ringY = sy(gy + dir * 1.2);
        ctx.beginPath();
        ctx.arc(sx(F.w / 2), ringY, Math.max(2, scale * 0.28), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = Math.max(2, scale * 0.2);
        ctx.beginPath();
        ctx.moveTo(sx(F.w / 2 - 0.9), sy(gy));
        ctx.lineTo(sx(F.w / 2 + 0.9), sy(gy));
        ctx.stroke();
      });
    } else if (sportId === 'handball') {
      [0, F.h].forEach(function (gy, side) {
        var dir = side ? -1 : 1;
        arcFromEnd(gy, dir, 6);
        arcFromEnd(gy, dir, 9, true);
      });
      drawNetGoal(F, ctx, sx, sy, scale, 0, -1, 0.8);
      drawNetGoal(F, ctx, sx, sy, scale, F.h, 1, 0.8);
    } else if (sportId === 'hockey') {
      ctx.strokeStyle = '#e53935';
      hLine(F.h / 2);
      ctx.beginPath();
      ctx.arc(sx(F.w / 2), sy(F.h / 2), 4.5 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#1565c0';
      hLine(F.h * 0.28); hLine(F.h * 0.72);
      ctx.strokeStyle = F.line;
      [0, F.h].forEach(function (gy, side) {
        arcFromEnd(gy, side ? -1 : 1, 1.8);
      });
      drawNetGoal(F, ctx, sx, sy, scale, 0, -1, 1.2);
      drawNetGoal(F, ctx, sx, sy, scale, F.h, 1, 1.2);
    } else if (sportId === 'fieldhockey') {
      hLine(F.h / 2);
      var shootBoxW = 14.63, shootBoxH = 14.63;
      [0, 1].forEach(function (side) {
        var y = side ? F.h - shootBoxH : 0;
        ctx.strokeRect(sx(F.w / 2 - shootBoxW / 2), sy(y + shootBoxH), shootBoxW * scale, shootBoxH * scale);
      });
      [0, F.h].forEach(function (gy, side) { arcFromEnd(gy, side ? -1 : 1, 5); });
      drawNetGoal(F, ctx, sx, sy, scale, 0, -1, 1.0);
      drawNetGoal(F, ctx, sx, sy, scale, F.h, 1, 1.0);
    } else if (sportId === 'lacrosse') {
      hLine(F.h / 2);
      ctx.beginPath();
      ctx.arc(sx(F.w / 2), sy(F.h / 2), 2.7 * scale, 0, Math.PI * 2);
      ctx.stroke();
      [0, F.h].forEach(function (gy, side) {
        var dir = side ? -1 : 1;
        arcFromEnd(gy + dir * 4.5, dir, 4.5, true);
      });
      drawNetGoal(F, ctx, sx, sy, scale, 0, -1, 0.9);
      drawNetGoal(F, ctx, sx, sy, scale, F.h, 1, 0.9);
    } else if (sportId === 'floorball') {
      hLine(F.h / 2);
      ctx.beginPath();
      ctx.arc(sx(F.w / 2), sy(F.h / 2), 3 * scale, 0, Math.PI * 2);
      ctx.stroke();
      [0, F.h].forEach(function (gy, side) {
        arcFromEnd(gy, side ? -1 : 1, 5, true);
      });
      drawNetGoal(F, ctx, sx, sy, scale, 0, -1, 0.6);
      drawNetGoal(F, ctx, sx, sy, scale, F.h, 1, 0.6);
    } else if (sportId === 'polo') {
      hLine(F.h / 2);
      [F.h * 0.25, F.h * 0.75].forEach(function (y) { hLine(y, true); });
      ctx.lineWidth = Math.max(2, scale * 0.22);
      [0, F.h].forEach(function (gy) {
        ctx.beginPath();
        ctx.moveTo(sx(F.w / 2 - F.goalW / 2), sy(gy));
        ctx.lineTo(sx(F.w / 2 + F.goalW / 2), sy(gy));
        ctx.stroke();
      });
    } else if (sportId === 'ultimate') {
      [18, F.h - 18].forEach(function (y) { hLine(y); });
    }
  }

  /** Rendu dédié au base-ball : un losange (terre battue, marbre et 3
   * bases) plutôt qu'un terrain rectangulaire, avec les coureurs affichés
   * sur les bases occupées. */
  function drawDiamond(M, ctx, cw, ch) {
    var F = M.F;
    var scale = Math.min(cw / F.w, ch / F.h) * 0.92;
    var offX = (cw - F.w * scale) / 2, offY = (ch - F.h * scale) / 2;
    function sx(x) { return x * scale + offX; }
    function sy(y) { return y * scale + offY; }
    function fx(p) { return sx(p.x * F.w); }
    function fy(p) { return sy(p.y * F.h); }

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = F.surface;
    ctx.fillRect(0, 0, cw, ch);

    /* Terre battue du losange intérieur. */
    ctx.fillStyle = '#c8955a';
    ctx.beginPath();
    ctx.moveTo(fx(DIAMOND.home), fy(DIAMOND.home));
    ctx.lineTo(fx(DIAMOND.first), fy(DIAMOND.first));
    ctx.lineTo(fx(DIAMOND.second), fy(DIAMOND.second));
    ctx.lineTo(fx(DIAMOND.third), fy(DIAMOND.third));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, scale * F.w * 0.0035);
    ctx.stroke();

    /* Lignes de champ (fausses balles), prolongées depuis le marbre. */
    ctx.beginPath();
    [DIAMOND.first, DIAMOND.third].forEach(function (base) {
      ctx.moveTo(fx(DIAMOND.home), fy(DIAMOND.home));
      ctx.lineTo(
        fx(DIAMOND.home) + (fx(base) - fx(DIAMOND.home)) * 2.6,
        fy(DIAMOND.home) + (fy(base) - fy(DIAMOND.home)) * 2.6
      );
    });
    ctx.stroke();

    /* Monticule. */
    ctx.fillStyle = '#c8955a';
    ctx.beginPath();
    ctx.arc(fx(DIAMOND.mound), fy(DIAMOND.mound), Math.max(6, scale * 2.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

    /* Bases : marbre + 3 sacs, surlignés si occupés par un coureur. */
    var bases = [
      { p: DIAMOND.home, on: false, shape: 'plate' },
      { p: DIAMOND.first, on: M.diamond.bases[0] },
      { p: DIAMOND.second, on: M.diamond.bases[1] },
      { p: DIAMOND.third, on: M.diamond.bases[2] }
    ];
    bases.forEach(function (b) {
      var bx = fx(b.p), by = fy(b.p), s = Math.max(7, scale * 2.2);
      ctx.fillStyle = b.on ? '#ffd166' : '#ffffff';
      ctx.fillRect(bx - s / 2, by - s / 2, s, s);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
      ctx.strokeRect(bx - s / 2, by - s / 2, s, s);
      if (b.on) {
        ctx.beginPath();
        ctx.arc(bx, by - s * 0.9, s * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd166';
        ctx.fill();
      }
    });

    /* --- joueurs (même rendu générique que les autres sports) --- */
    var r = u.clamp(scale * 0.9, 8, 15);
    for (var i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      var px = sx(p.x), py = sy(p.y);

      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(px + r * 0.25, py + r * 0.3, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (p === M.user) {
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(px, py, r * 1.6, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = p.team === 0 ? '#f0b429' : '#e8eef7';
      if (p.role === 'att') ctx.fillStyle = p.team === 0 ? '#ffe08a' : '#c9d6e8';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.team === 0 ? '#5a3d00' : '#39465c';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = p.team === 0 ? '#3a2a00' : '#1b2433';
      ctx.font = 'bold ' + Math.round(r * 0.85) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.role === 'att' ? 'B' : (p.role === 'gk' ? 'P' : String(p.num)), px, py);
    }

    /* --- balle --- */
    var b = M.ball;
    var bx2 = sx(b.x), by2 = sy(b.y);
    var br = r * (F.ballScale || 0.5) * 0.5;
    ctx.fillStyle = F.ball || '#ffffff';
    ctx.beginPath();
    ctx.arc(bx2, by2, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = F.ballLine || '#c0392b';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** Rendu générique d'un joueur (pastille + numéro/lettre), partagé par
   * les rendus dédiés (base-ball, cricket) qui ne passent pas par la
   * caméra suiveuse ordinaire. */
  function drawPawn(ctx, px, py, r, p, isUser, letter) {
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(px + r * 0.25, py + r * 0.3, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (isUser) {
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(px, py, r * 1.6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = p.team === 0 ? '#f0b429' : '#e8eef7';
    if (letter === 'B') ctx.fillStyle = p.team === 0 ? '#ffe08a' : '#c9d6e8';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.team === 0 ? '#5a3d00' : '#39465c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = p.team === 0 ? '#3a2a00' : '#1b2433';
    ctx.font = 'bold ' + Math.round(r * 0.85) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, px, py);
  }

  /** Rendu dédié au cricket : terrain ovale, pitch central entre deux
   * guichets, plutôt qu'un rectangle à deux buts. */
  function drawCricket(M, ctx, cw, ch) {
    var F = M.F;
    var scale = Math.min(cw / F.w, ch / F.h) * 0.92;
    var offX = (cw - F.w * scale) / 2, offY = (ch - F.h * scale) / 2;
    function sx(x) { return x * scale + offX; }
    function sy(y) { return y * scale + offY; }
    function fx(p) { return sx(p.x * F.w); }
    function fy(p) { return sy(p.y * F.h); }

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = F.surface;
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath();
    ctx.ellipse(sx(F.w / 2), sy(F.h / 2), F.w / 2 * scale * 0.96, F.h / 2 * scale * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, scale * F.w * 0.003);
    ctx.stroke();

    var pitchW = 3, pitchTop = F.h * 0.25, pitchH = F.h * 0.5;
    ctx.fillStyle = '#d8c48a';
    ctx.fillRect(sx(F.w / 2 - pitchW / 2), sy(pitchTop), pitchW * scale, pitchH * scale);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.strokeRect(sx(F.w / 2 - pitchW / 2), sy(pitchTop), pitchW * scale, pitchH * scale);

    [CRICKET.striker, CRICKET.nonStriker].forEach(function (p) {
      var wx = fx(p), wy = fy(p);
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(wx - 4, wy - 8, 8, 16);
    });

    var r = u.clamp(scale * 0.9, 8, 15);
    for (var i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      drawPawn(ctx, sx(p.x), sy(p.y), r, p, p === M.user,
        p.role === 'att' ? 'B' : (p.role === 'gk' ? 'L' : String(p.num)));
    }

    var b = M.ball;
    var br = r * (F.ballScale || 0.4) * 0.5;
    ctx.fillStyle = F.ball || '#c0392b';
    ctx.beginPath();
    ctx.arc(sx(b.x), sy(b.y), br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = F.ballLine || '#8a0000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** Rendu dédié au tir à l'arc : deux cibles fixes plutôt qu'un ballon en
   * mouvement disputé, une flèche animée d'un tir à l'autre. */
  function drawArchery(M, ctx, cw, ch) {
    var F = M.F;
    var scale = Math.min(cw / F.w, ch / F.h) * 0.92;
    var offX = (cw - F.w * scale) / 2, offY = (ch - F.h * scale) / 2;
    function sx(x) { return x * scale + offX; }
    function sy(y) { return y * scale + offY; }
    function fx(p) { return sx(p.x * F.w); }
    function fy(p) { return sy(p.y * F.h); }

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = F.surface;
    ctx.fillRect(0, 0, cw, ch);

    var ringColors = ['#f4e04d', '#f4e04d', '#e53935', '#e53935', '#2166ac', '#2166ac',
      '#1b1b1b', '#1b1b1b', '#ffffff', '#ffffff'];
    ARCHERY.targets.forEach(function (t) {
      var cx = fx(t), cy = fy(t);
      var R = Math.max(14, scale * 2.4);
      for (var i = ringColors.length - 1; i >= 0; i--) {
        ctx.fillStyle = ringColors[i];
        ctx.beginPath();
        ctx.arc(cx, cy, R * (i + 1) / ringColors.length, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f4e04d';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, scale * 0.3);
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(F.h * 0.85));
    ctx.lineTo(sx(F.w), sy(F.h * 0.85));
    ctx.stroke();

    var r = u.clamp(scale * 0.85, 8, 15);
    for (var i = 0; i < M.players.length; i++) {
      var p = M.players[i];
      drawPawn(ctx, sx(p.x), sy(p.y), r, p, p === M.user, String(p.num));
    }

    var b = M.ball;
    ctx.strokeStyle = F.ball || '#ffd166';
    ctx.lineWidth = Math.max(2, scale * 0.25);
    ctx.beginPath();
    ctx.moveTo(sx(b.x) - 4, sy(b.y));
    ctx.lineTo(sx(b.x) + 4, sy(b.y));
    ctx.stroke();
  }

  /** Marquage propre aux sports de raquette : filet à mi-terrain (ou mur
   * frontal surligné pour le squash, qui n'a pas de filet), lignes de
   * service. */
  function drawRacketCourt(F, ctx, sx, sy, scale) {
    if (F.net) {
      ctx.save();
      ctx.strokeStyle = '#0b0b0b';
      ctx.lineWidth = Math.max(2.5, scale * 0.28);
      ctx.beginPath();
      ctx.moveTo(sx(0), sy(F.h / 2));
      ctx.lineTo(sx(F.w), sy(F.h / 2));
      ctx.stroke();
      ctx.strokeStyle = '#e8eef7';
      ctx.lineWidth = Math.max(1, scale * 0.06);
      ctx.beginPath();
      ctx.moveTo(sx(0), sy(F.h / 2));
      ctx.lineTo(sx(F.w), sy(F.h / 2));
      ctx.stroke();
      ctx.restore();
    } else {
      /* Squash : pas de filet, mais un mur frontal (en haut) qu'on surligne,
         et la ligne du « T » de service au centre. */
      ctx.fillStyle = 'rgba(255,233,168,.18)';
      ctx.fillRect(sx(0), sy(F.h), F.w * scale, F.h * 0.06 * scale);
      ctx.strokeStyle = F.line;
      ctx.lineWidth = Math.max(1, scale * 0.06);
      ctx.beginPath();
      ctx.moveTo(sx(F.w / 2), sy(F.h * 0.55));
      ctx.lineTo(sx(F.w / 2), sy(0));
      ctx.stroke();
    }

    /* Lignes de service, communes à tous ces terrains. */
    ctx.strokeStyle = F.line;
    ctx.lineWidth = Math.max(1, scale * 0.06);
    [0.22, 0.78].forEach(function (frac) {
      ctx.beginPath();
      ctx.moveTo(sx(F.w * 0.1), sy(F.h * frac));
      ctx.lineTo(sx(F.w * 0.9), sy(F.h * frac));
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(sx(F.w / 2), sy(F.h * 0.22));
    ctx.lineTo(sx(F.w / 2), sy(F.h * 0.78));
    ctx.stroke();
  }

  /** Donner un carton à un joueur. */
  function giveCard(M, playerId, cardType) {
    if (M.cards[playerId] && M.cards[playerId].type === 'red') return;
    var player = null;
    for (var i = 0; i < M.players.length; i++) {
      if (M.players[i].id === playerId) { player = M.players[i]; break; }
    }
    if (!player) return;
    if (cardType === 'red' || (M.cards[playerId] && M.cards[playerId].type === 'yellow')) {
      M.cards[playerId] = { type: 'red', time: Math.floor(M.clock) };
      push(M, '🔴 Carton rouge pour ' + player.name, 'event');
      removePlayer(M, player);
    } else {
      M.cards[playerId] = { type: 'yellow', time: Math.floor(M.clock) };
      push(M, '🟨 Carton jaune pour ' + player.name, 'event');
    }
  }

  /** Remplacement décidé par le joueur-coach à une étape de la rencontre
   * (quart, mi-match, trois-quarts) : contrairement à substitute() (cartons,
   * qui échange deux joueurs déjà sur le terrain), celui-ci fait entrer un
   * remplaçant du banc — qui n'a jamais été placé sur M.players. Le
   * changement de titulaire est aussi enregistré sur le club pour la suite
   * de la saison. */
  function substituteFromBench(M, outId, inId) {
    var club = M.club;
    var onField = null;
    for (var i = 0; i < M.players.length; i++) {
      if (M.players[i].id === outId) { onField = M.players[i]; break; }
    }
    if (!onField) return false;
    var incoming = null;
    for (i = 0; i < club.players.length; i++) {
      if (club.players[i].id === inId) { incoming = club.players[i]; break; }
    }
    if (!incoming || incoming.injury) return false;

    var outgoingRef = onField.ref;
    onField.id = incoming.id;
    onField.name = incoming.name;
    onField.ovr = G.manager.effOvr(incoming, M.sport);
    onField.speed = (3.2 + onField.ovr / 22) * M.F.speed;
    onField.ref = incoming;

    if (outgoingRef) outgoingRef.starter = false;
    incoming.starter = true;

    M.subs.you.push({
      out: outgoingRef ? outgoingRef.name : onField.name, in: incoming.name,
      time: Math.floor(M.clock)
    });
    push(M, '🔄 ' + (outgoingRef ? outgoingRef.name : '') + ' remplacé par ' + incoming.name, 'event');
    return true;
  }

  /** Remplacer un joueur. */
  function substitute(M, playerId, replacementId, team) {
    var player = null, replacement = null;
    for (var i = 0; i < M.players.length; i++) {
      if (M.players[i].id === playerId) player = M.players[i];
      if (M.players[i].id === replacementId) replacement = M.players[i];
    }
    if (!player || !replacement) return;
    removePlayer(M, player);
    replacement.role = player.role;
    replacement.side = player.side;
    replacement.x = player.x;
    replacement.y = player.y;
    replacement.vx = 0;
    replacement.vy = 0;
    var idx = team === 0 ? M.subs.you.length : M.subs.opp.length;
    if (team === 0) M.subs.you.push({ out: player.name, in: replacement.name, time: Math.floor(M.clock) });
    else M.subs.opp.push({ out: player.name, in: replacement.name, time: Math.floor(M.clock) });
    push(M, '🔄 ' + player.name + ' remplacé par ' + replacement.name, 'event');
  }

  /** Retirer un joueur du terrain. */
  function removePlayer(M, player) {
    var idx = M.players.indexOf(player);
    if (idx >= 0) M.players.splice(idx, 1);
    if (M.user === player) M.user = null;
  }

  return {
    FIELDS: FIELDS, fieldOf: fieldOf, supports: supports,
    create: create, update: update, draw: draw,
    shoot: shoot, passTo: passTo,
    finish: finish, skipToEnd: skipToEnd, push: push,
    giveCard: giveCard, substitute: substitute, substituteFromBench: substituteFromBench,
    setMentality: setMentality, formatScore: formatScore
  };
})();
