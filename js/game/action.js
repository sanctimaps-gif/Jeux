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
      aiShoot: 0.45, aiRange: 0.19, tackle: 1.0, view: 50 },
    rugby: { w: 70, h: 110, goalW: 5.6, surface: '#2f7a34', line: '#ffffff',
      goal: 'tryline', speed: 0.95, ballSpeed: 24, clock: 80, realSeconds: 190,
      aiShoot: 0, aiRange: 0, tackle: 4.2, view: 55 },
    waterpolo: { w: 20, h: 30, goalW: 3, surface: '#1565c0', line: '#e3f2fd',
      goal: 'shot', speed: 0.45, ballSpeed: 15, clock: 32, realSeconds: 150,
      aiShoot: 2.4, aiRange: 0.60, tackle: 0.8, view: 32 },
    basket: { w: 15, h: 28, goalW: 1.8, surface: '#a1622f', line: '#ffe0b2',
      goal: 'basket', speed: 0.8, ballSpeed: 18, clock: 40, realSeconds: 160,
      aiShoot: 1.5, aiRange: 0.45, tackle: 2.0, view: 28 },
    handball: { w: 20, h: 40, goalW: 3, surface: '#1b5e20', line: '#c8e6c9',
      goal: 'shot', speed: 0.85, ballSpeed: 22, clock: 60, realSeconds: 170,
      aiShoot: 2.8, aiRange: 0.55, tackle: 0.8, view: 35 },

    /* Sports de raquette : un joueur de chaque côté, terrain adapté à
       chaque discipline (dimensions réelles), échange simulé point par
       point plutôt que ballon disputé au contact. */
    tennis: { w: 8.23, h: 23.77, surface: '#2f8f4e', line: '#ffffff',
      racket: true, net: true, speed: 1.0, ballSpeed: 30, clock: 90, realSeconds: 210, view: 8.23 },
    badminton: { w: 5.18, h: 13.4, surface: '#1a6e3c', line: '#ffffff',
      racket: true, net: true, speed: 1.3, ballSpeed: 34, clock: 60, realSeconds: 170, view: 5.18 },
    squash: { w: 6.4, h: 9.75, surface: '#2c4f70', line: '#ffe9a8',
      racket: true, net: false, speed: 1.15, ballSpeed: 26, clock: 45, realSeconds: 150, view: 6.4 },
    tennisdetable: { w: 1.525, h: 2.74, surface: '#0d4f8b', line: '#ffffff',
      racket: true, net: true, speed: 2.4, ballSpeed: 10, clock: 30, realSeconds: 140, view: 1.525 },
    padel: { w: 10, h: 20, surface: '#2373a6', line: '#ffffff',
      racket: true, net: true, speed: 1.0, ballSpeed: 26, clock: 90, realSeconds: 200, view: 10 }
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
      commentsDone: {},
      sinceIncident: 0
    };

    if (F.racket) {
      buildRacketMatch(M, club, sport, mine, oppStr, fx.opp.name);
      push(M, 'Début de la rencontre — ' + club.name + ' contre ' + fx.opp.name, 'info');
      startRally(M, u.chance(0.5) ? 0 : 1);
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
  function update(M, dt) {
    if (M.done || M.paused) return;
    var F = M.F;

    /* Appliquer les tactiques si changement. */
    if (M.tactics && M.tactics.style) {
      var style = M.tactics.style;
      M.F.aiShootMult = style === 'att' ? 1.4 : style === 'def' ? 0.6 : 1.0;
      M.F.tackleMult = style === 'def' ? 1.3 : style === 'att' ? 0.8 : 1.0;
    }

    /* Horloge : le match complet tient en quelques minutes réelles. */
    var minutesPerSecond = F.clock / F.realSeconds;
    if (M.restart > 0) {
      M.restart -= dt;
    } else {
      M.clock += minutesPerSecond * dt;
    }

    /* Mi-temps (pause entre les manches pour les sports de raquette). */
    if (!M.halfDone && M.clock >= F.clock / 2) {
      M.halfDone = true;
      push(M, 'Mi-temps — ' + M.score.you + ' - ' + M.score.opp, 'info');
      if (F.racket) startRally(M, u.chance(0.5) ? 0 : 1); else kickoff(M, -1);
    }
    if (M.clock >= F.clock) { finish(M); return; }

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
    if (F.racket) updateRally(M, dt); else updateBall(M, dt);
    separatePlayers(M);
    updateCamera(M, dt);

    /* Statistiques de possession (part des points gagnés, pour les sports de
       raquette qui n'ont pas de porteur de balle disputé au contact). */
    if (F.racket) {
      var tot = M.score.you + M.score.opp;
      M.stats.poss = tot ? Math.round(M.score.you / tot * 100) : 50;
    } else {
      M.stats.possTot += dt;
      if (M.ball.owner && M.ball.owner.team === 0) M.stats.possYou += dt;
      M.stats.poss = Math.round(M.stats.possYou / Math.max(0.1, M.stats.possTot) * 100);
    }
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

    /* Les sports de raquette n'ont pas de ballon disputé au contact : chaque
       échange se résout dans updateRally, pas ici. */
    if (F.racket) return;

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
    var minSep = 1.0;
    var list = M.players, F = M.F;
    var owner = M.ball.owner;
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.hypot(dx, dy);
        if (d >= minSep) continue;
        var nx, ny;
        if (d > 1e-4) { nx = dx / d; ny = dy / d; } else {
          var ang = (i * 2.4 + j * 5.1) % (Math.PI * 2);
          nx = Math.cos(ang); ny = Math.sin(ang);
        }
        var push = (minSep - d);
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
      /* Rugby : il faut porter le ballon derrière la ligne. */
      if (b.owner) {
        var team = b.owner.team;
        var goal = goalOf(M, team);
        if ((team === 0 && b.y >= F.h - 0.6) || (team === 1 && b.y <= 0.6)) {
          scoreGoal(M, team, 5 + (u.chance(0.74) ? 2 : 0), 'Essai');
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
    if (team === 0) {
      M.score.you += 1;
      M.stats.youShots++;
      push(M, '🟢 ' + winner.name + ' ' + verb + ' — ' + M.score.you + '-' + M.score.opp, 'good');
      if (winner.ref) {
        winner.ref.seasonScored = (winner.ref.seasonScored || 0) + 1;
        winner.ref.scored = (winner.ref.scored || 0) + 1;
      }
    } else {
      M.score.opp += 1;
      M.stats.oppShots++;
      push(M, '🔴 ' + M.oppName + ' ' + verb + ' — ' + M.score.you + '-' + M.score.opp, 'bad');
    }
    if (u.chance(0.35)) {
      var loser = team === 0 ? M.players[1] : M.players[0];
      push(M, loser.name + ' ' + u.pick(RACKET_MISS), 'info');
    }
    M.rally = null;
    startRally(M, team);
  }

  /* ============================================================== FIN ===== */

  function finish(M) {
    if (M.done) return M;
    M.done = true;
    M.running = false;
    push(M, 'Coup de sifflet final — ' + M.score.you + '-' + M.score.opp,
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

    /* --- pelouse --- */
    ctx.fillStyle = F.surface;
    ctx.fillRect(0, 0, cw, ch);

    /* Bandes de tonte. */
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#ffffff';
    var stripe = F.h / 14;
    for (var s = 0; s < 15; s++) {
      if (s % 2) continue;
      var y0 = sy(s * stripe), y1 = sy((s + 1) * stripe);
      ctx.fillRect(0, y1, cw, y0 - y1);
    }
    ctx.globalAlpha = 1;

    /* --- lignes --- */
    ctx.strokeStyle = F.line;
    ctx.lineWidth = Math.max(1.5, scale * 0.12);
    ctx.strokeRect(sx(0), sy(F.h), F.w * scale, F.h * scale);

    if (F.racket) {
      drawRacketCourt(F, ctx, sx, sy, scale);
    } else {
      ctx.beginPath();
      ctx.moveTo(sx(0), sy(F.h / 2));
      ctx.lineTo(sx(F.w), sy(F.h / 2));
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx(F.w / 2), sy(F.h / 2), F.w * 0.13 * scale, 0, Math.PI * 2);
      ctx.stroke();

      /* Surfaces et buts. */
      var boxW = F.w * 0.55, boxH = F.h * 0.15;
      [0, 1].forEach(function (side) {
        var y = side ? F.h - boxH : 0;
        ctx.strokeRect(sx(F.w / 2 - boxW / 2), sy(y + boxH), boxW * scale, boxH * scale);
      });

      ctx.lineWidth = Math.max(2, scale * 0.22);
      ctx.strokeStyle = '#ffffff';
      [0, F.h].forEach(function (gy) {
        ctx.beginPath();
        ctx.moveTo(sx(F.w / 2 - F.goalW / 2), sy(gy));
        ctx.lineTo(sx(F.w / 2 + F.goalW / 2), sy(gy));
        ctx.stroke();
      });
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

    /* --- ballon --- */
    var b = M.ball;
    var bx = sx(b.x), by = sy(b.y);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(bx + 2, by + 3, r * 0.42, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* --- flèche vers le but adverse (sans objet pour les sports de raquette,
       qui n'ont pas de but) --- */
    if (!F.racket) {
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
    giveCard: giveCard, substitute: substitute
  };
})();
