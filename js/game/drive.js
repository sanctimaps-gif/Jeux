/* Mode pilotage : on conduit soi-même la voiture du Grand Prix.
 *
 * Vue rapprochée qui tourne avec la voiture, accélération automatique,
 * joystick pour diriger, frein et DRS au pouce. Sortir de piste coûte cher,
 * les pneus s'usent, et le classement final alimente le championnat.
 */
window.G = window.G || {};

G.drive = (function () {
  'use strict';
  var u = G.util;

  var TRACK_W = 14;              // largeur de piste (unités)
  var TEAM_COLORS = ['#e05263', '#4dabf7', '#3ddc97', '#b197fc', '#ff9f43',
    '#7fdbda', '#cfd8e3'];
  var LAPS_DEFAULT = 3;

  /* ======================================================== CIRCUIT ======= */

  /** Petit générateur pseudo-aléatoire déterministe (mulberry32), pour tirer
   * un tracé qui dépend du nom du circuit plutôt que de rien : deux Grands
   * Prix de la même saison ont forcément des noms différents (voir
   * G.race.pickFixtures), donc jamais le même circuit deux fois dans
   * l'année — et un circuit déjà couru garde le même tracé si son nom
   * revient une saison suivante, comme un vrai circuit. */
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seedStr) {
    var s = hashSeed(String(seedStr));
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Génère un circuit fermé propre au nom donné : nombre de virages,
   * sinuosité, épingles et forme générale varient d'un circuit à l'autre,
   * mais un même nom reproduit toujours le même tracé.
   */
  function makeTrack(seed) {
    var rng = makeRng(seed || Math.random());
    function rf(min, max) { return min + rng() * (max - min); }
    function ri(min, max) { return Math.floor(min + rng() * (max - min + 1)); }

    var n = ri(9, 16);                  // plus de sommets = circuit plus sinueux
    var rBase = rf(300, 420);
    var aspect = rf(0.60, 0.95);        // boucle plus ou moins allongée
    var roughness = rf(0.5, 1.3);       // amplitude des écarts de rayon (vitesse générale)
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      var r = rBase * rf(1 - 0.30 * roughness, 1 + 0.20 * roughness);
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * aspect });
    }

    /* Une ou deux épingles marquées : un sommet resserré brusquement pour
       simuler un virage lent et serré, bien distinct du reste du tracé. */
    var hairpins = ri(0, 2);
    for (var h = 0; h < hairpins; h++) {
      var idx = ri(0, n - 1);
      pts[idx] = { x: pts[idx].x * rf(0.42, 0.62), y: pts[idx].y * rf(0.42, 0.62) };
    }

    /* Lissage : moins de passes sur un tracé qu'on veut plus technique. */
    var passes = roughness > 0.95 ? 2 : 3;
    for (var pass = 0; pass < passes; pass++) {
      var out = [];
      for (i = 0; i < pts.length; i++) {
        var p0 = pts[(i - 1 + pts.length) % pts.length];
        var p1 = pts[i];
        var p2 = pts[(i + 1) % pts.length];
        out.push({ x: (p0.x + p1.x * 2 + p2.x) / 4, y: (p0.y + p1.y * 2 + p2.y) / 4 });
      }
      pts = out;
    }
    /* Rééchantillonnage régulier pour des virages réguliers. */
    var dense = [];
    for (i = 0; i < pts.length; i++) {
      var a1 = pts[i], b1 = pts[(i + 1) % pts.length];
      for (var t = 0; t < 6; t++) {
        dense.push({
          x: u.lerp(a1.x, b1.x, t / 6),
          y: u.lerp(a1.y, b1.y, t / 6)
        });
      }
    }
    return dense;
  }

  /** Courbure locale en chaque point du tracé (angle de virage, en radians,
   * mesuré sur une petite fenêtre) : sert à placer les vibreurs et l'échappatoire
   * de gravier davantage dans les virages que sur les lignes droites. */
  function trackCurvature(track) {
    var n = track.length, win = 3, curv = new Array(n);
    for (var i = 0; i < n; i++) {
      var p0 = track[(i - win + n) % n], p1 = track[i], p2 = track[(i + win) % n];
      var a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      var a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      curv[i] = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
    }
    return curv;
  }

  /** Normale unitaire au tracé en chaque point (perpendiculaire à la
   * tangente), pour dessiner vibreurs, gravier et stands de part et d'autre
   * de la piste. */
  function trackNormals(track) {
    var n = track.length, norm = new Array(n);
    for (var i = 0; i < n; i++) {
      var p0 = track[(i - 1 + n) % n], p2 = track[(i + 1) % n];
      var dx = p2.x - p0.x, dy = p2.y - p0.y;
      var len = Math.hypot(dx, dy) || 1;
      norm[i] = { x: -dy / len, y: dx / len };
    }
    return norm;
  }

  function trackLength(track) {
    var L = 0;
    for (var i = 0; i < track.length; i++) {
      var a = track[i], b = track[(i + 1) % track.length];
      L += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return L;
  }

  /** Point du circuit le plus proche + distance latérale. */
  function nearestOnTrack(track, x, y) {
    var best = { i: 0, d: 1e9, t: 0 };
    for (var i = 0; i < track.length; i++) {
      var a = track[i], b = track[(i + 1) % track.length];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len2 = dx * dx + dy * dy || 1;
      var t = u.clamp(((x - a.x) * dx + (y - a.y) * dy) / len2, 0, 1);
      var px = a.x + dx * t, py = a.y + dy * t;
      var d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { i: i, d: d, t: t, px: px, py: py };
    }
    return best;
  }

  /* ========================================================== COURSE ====== */

  function create(club, laps) {
    var sport = G.manager.sportDef(club.sport);
    var evt = G.race.nextRace(club);
    if (!evt) return null;

    var track = makeTrack(club.sport + '|' + evt.circuit);
    /* Un pilote (ou coureur) unique : sport individuel, pas de coéquipier
       en seconde voiture. */
    var drivers = u.sortBy(club.players, function (p) {
      return G.manager.effOvr(p, sport);
    }, true).slice(0, 1);
    while (drivers.length < 1) drivers.push(G.manager.makePlayer(sport, 50, { pos: sport.positions[0].code }));
    var mainDriver = drivers[0];

    var teams = club.league.teams;
    var cars = [], i;
    for (i = 0; i < teams.length; i++) {
      var isYou = !!teams[i].you;
      var pace;
      if (isYou) {
        var mech = (club.car.moteur * 0.38 + club.car.aero * 0.36 + club.car.chassis * 0.26);
        pace = mech * 0.55 + G.manager.effOvr(mainDriver, sport) * 0.45;
      } else {
        pace = u.clamp(teams[i].str + u.gauss(0, 2.5), 20, 99);
      }
      cars.push({
        id: teams[i].name,
        driver: isYou ? mainDriver.name
          : (u.pick(G.DATA.firstNames)[0] + '. ' + u.pick(G.DATA.lastNames)),
        team: teams[i].name, teamIdx: i,
        isYou: isYou,
        user: isYou,                     // la voiture que vous pilotez
        player: isYou ? mainDriver : null,
        pace: pace,
        x: 0, y: 0, angle: 0, v: 0,
        seg: 0, lap: 0, prog: 0,
        wear: 0, tyre: 'medium', stops: 0,
        out: false, offTrack: 0, pit: 0
      });
    }

    /* Grille de départ le long de la ligne. */
    cars = u.sortBy(cars, function (c) { return c.pace + u.gauss(0, 2); }, true);
    var start = track[0], next = track[1];
    var ang = Math.atan2(next.y - start.y, next.x - start.x);
    for (i = 0; i < cars.length; i++) {
      var back = i * 9;
      var side = (i % 2 === 0 ? 1 : -1) * 3.2;
      cars[i].x = start.x - Math.cos(ang) * back - Math.sin(ang) * side;
      cars[i].y = start.y - Math.sin(ang) * back + Math.cos(ang) * side;
      cars[i].angle = ang;
      cars[i].grid = i + 1;
      cars[i].pos = i + 1;
    }

    var centroid = { x: 0, y: 0 };
    for (i = 0; i < track.length; i++) { centroid.x += track[i].x; centroid.y += track[i].y; }
    centroid.x /= track.length; centroid.y /= track.length;

    var R = {
      club: club, sport: sport, circuit: evt.circuit,
      round: evt.round, total: evt.total,
      track: track, trackLen: trackLength(track),
      curv: trackCurvature(track), norms: trackNormals(track), centroid: centroid,
      laps: laps || LAPS_DEFAULT,
      cars: cars,
      user: cars.filter(function (c) { return c.user; })[0],
      input: { steer: 0, brake: false, boost: false },
      time: 0, done: false, paused: false, running: false,
      rain: u.chance(0.15),
      feed: [], result: null, countdown: 3
    };
    push(R, 'Grille de départ · ' + evt.circuit, 'info');
    return R;
  }

  function push(R, txt, type) {
    R.feed.unshift({ min: Math.floor(R.time), txt: txt, type: type || 'info' });
    if (R.feed.length > 30) R.feed.length = 30;
  }

  /* ========================================================= PHYSIQUE ===== */

  function maxSpeed(R, c) {
    var base = 34 + c.pace * 0.45;
    if (c.offTrack > 0) base *= 0.55;
    if (R.rain) base *= 0.86;
    base *= 1 - Math.max(0, c.wear - 55) / 200;
    return base;
  }

  function update(R, dt) {
    if (R.done || R.paused) return;
    if (R.countdown > 0) {
      R.countdown -= dt;
      if (R.countdown <= 0) push(R, 'Feux verts, c\'est parti !', 'good');
      return;
    }
    R.time += dt;

    for (var i = 0; i < R.cars.length; i++) {
      var c = R.cars[i];
      if (c.out) continue;
      if (c.user) driveUser(R, c, dt);
      else driveAI(R, c, dt);
      advance(R, c, dt);
    }
    rank(R);

    var user = R.user;
    if (user && user.lap >= R.laps) finish(R);
  }

  function driveUser(R, c, dt) {
    var vmax = maxSpeed(R, c) * (R.input.boost ? 1.12 : 1);
    if (R.input.brake) {
      c.v = Math.max(0, c.v - 42 * dt);
    } else {
      c.v = u.lerp(c.v, vmax, Math.min(1, dt * 0.9));
    }
    /* Le volant mord moins à haute vitesse. */
    var grip = 1 - Math.min(0.45, c.v / 140);
    c.angle += R.input.steer * dt * 2.6 * grip * Math.min(1, c.v / 12);
    c.wear += dt * (0.6 + Math.abs(R.input.steer) * 1.4) * (R.input.boost ? 1.5 : 1);
  }

  function driveAI(R, c, dt) {
    /* Vise un point d'avance sur le tracé. */
    var look = R.track[(c.seg + 3) % R.track.length];
    var want = Math.atan2(look.y - c.y, look.x - c.x);
    var diff = normAngle(want - c.angle);
    c.angle += u.clamp(diff, -1, 1) * dt * 2.4;

    var corner = Math.abs(diff);
    var target = maxSpeed(R, c) * (1 - Math.min(0.5, corner * 0.7));
    c.v = u.lerp(c.v, target, Math.min(1, dt * 0.8));
    c.wear += dt * 0.7;

    /* Arrêt aux stands quand les gommes sont mortes. */
    if (c.wear > 85 && c.lap < R.laps - 1 && u.chance(dt * 0.6)) {
      c.wear = 0; c.stops++; c.v *= 0.35;
    }
  }

  function normAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function advance(R, c, dt) {
    c.x += Math.cos(c.angle) * c.v * dt;
    c.y += Math.sin(c.angle) * c.v * dt;

    var near = nearestOnTrack(R.track, c.x, c.y);
    c.offTrack = near.d > TRACK_W / 2 ? 1 : 0;
    if (near.d > TRACK_W * 1.6) {
      /* Trop loin : la voiture est doucement remise dans le bon sens sur le
         bas-côté. On perd du temps, mais on ne reste jamais bloqué. */
      c.x = u.lerp(c.x, near.px, 0.15);
      c.y = u.lerp(c.y, near.py, 0.15);
      c.v *= 0.94;
      var back = R.track[(near.i + 2) % R.track.length];
      c.angle += normAngle(Math.atan2(back.y - c.y, back.x - c.x) - c.angle) * 0.08;
    }

    /* Progression et comptage des tours. */
    var prevSeg = c.seg;
    c.seg = near.i;
    if (prevSeg > R.track.length - 6 && c.seg < 6) {
      c.lap++;
      if (c.user) {
        push(R, 'Tour ' + Math.min(c.lap + 1, R.laps) + '/' + R.laps +
          ' — P' + c.pos, 'info');
      }
    } else if (prevSeg < 6 && c.seg > R.track.length - 6) {
      c.lap = Math.max(0, c.lap - 1);
    }
    c.prog = c.lap * R.track.length + c.seg + near.t;

    /* Abandon mécanique. */
    var reliab = c.isYou ? R.club.car.fiabilite : 62;
    if (u.chance(dt * (1 - reliab / 130) * 0.004)) {
      c.out = true;
      push(R, c.driver + ' abandonne', c.user ? 'bad' : 'info');
    }
  }

  function rank(R) {
    var running = R.cars.filter(function (c) { return !c.out; });
    running = u.sortBy(running, function (c) { return c.prog; }, true);
    for (var i = 0; i < running.length; i++) running[i].pos = i + 1;
    var outCars = R.cars.filter(function (c) { return c.out; });
    for (i = 0; i < outCars.length; i++) outCars[i].pos = running.length + 1 + i;
  }

  function pit(R) {
    var c = R.user;
    if (!c || c.out) return;
    c.wear = 0;
    c.stops++;
    c.v *= 0.25;
    push(R, 'Arrêt aux stands — gommes neuves', 'good');
  }

  /* ============================================================== FIN ===== */

  function finish(R) {
    if (R.done) return R;
    R.done = true;
    R.running = false;
    rank(R);

    var pts = R.sport.race.points;
    var teamPoints = 0, best = 99;
    for (var i = 0; i < R.cars.length; i++) {
      var c = R.cars[i];
      var got = (!c.out && c.pos <= pts.length) ? pts[c.pos - 1] : 0;
      R.club.league.teams[c.teamIdx].pts += got;
      if (c.isYou) {
        teamPoints += got;
        if (!c.out && c.pos < best) best = c.pos;
        if (c.player) {
          c.player.apps++;
          c.player.scored = (c.player.scored || 0) + got;
        }
      }
    }
    push(R, 'Arrivée — P' + (R.user ? R.user.pos : '-') + ' · ' + teamPoints + ' points',
      teamPoints > 0 ? 'good' : 'bad');
    R.result = G.race.finishRace(R.club, {
      points: teamPoints, best: best,
      cars: R.cars.filter(function (c) { return c.isYou; })
    });
    return R;
  }

  function skipToEnd(R) {
    if (R.done) return R;
    /* Le reste de la course est simulé au rythme actuel de chacun. */
    var guard = 0;
    while (!R.done && guard++ < 6000) {
      var user = R.user;
      if (user) user.v = maxSpeed(R, user) * 0.92;
      for (var i = 0; i < R.cars.length; i++) {
        var c = R.cars[i];
        if (c.out) continue;
        if (!c.user) driveAI(R, c, 0.1);
        advance(R, c, 0.1);
      }
      rank(R);
      if (user && user.lap >= R.laps) break;
    }
    return finish(R);
  }

  /* ============================================================= RENDU ==== */

  /** Échappatoires de gravier sablonneux : une bande de largeur variable de
   * part et d'autre du ruban de piste, plus large dans les virages serrés
   * que sur les lignes droites, comme sur un vrai circuit. */
  function drawGravelRunoff(ctx, track, curv, norms, rain) {
    var n = track.length;
    ctx.fillStyle = rain ? '#8d7c58' : '#d9c48f';
    ctx.beginPath();
    var i, idx, w, px, py;
    for (i = 0; i <= n; i++) {
      idx = i % n;
      w = TRACK_W / 2 + TRACK_W * (0.55 + 2.1 * u.clamp(curv[idx] / 0.3, 0, 1));
      px = track[idx].x + norms[idx].x * w;
      py = track[idx].y + norms[idx].y * w;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    for (i = n; i >= 0; i--) {
      idx = i % n;
      w = TRACK_W / 2 + TRACK_W * (0.55 + 2.1 * u.clamp(curv[idx] / 0.3, 0, 1));
      px = track[idx].x - norms[idx].x * w;
      py = track[idx].y - norms[idx].y * w;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** Vibreurs à damier rouge et blanc : posés des deux côtés de la piste
   * dans les portions les plus courbes (les virages), jamais sur les
   * lignes droites. */
  function drawKerbs(ctx, track, curv, norms) {
    var n = track.length, threshold = 0.1;
    for (var i = 0; i < n; i++) {
      if (curv[i] < threshold) continue;
      var p0 = track[(i - 1 + n) % n], p2 = track[(i + 1) % n];
      var tangAngle = Math.atan2(p2.y - p0.y, p2.x - p0.x);
      var color = (i % 2 === 0) ? '#d9362b' : '#f4f4f4';
      for (var side = -1; side <= 1; side += 2) {
        var kx = track[i].x + norms[i].x * (TRACK_W / 2 + 0.5) * side;
        var ky = track[i].y + norms[i].y * (TRACK_W / 2 + 0.5) * side;
        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate(tangAngle);
        ctx.fillStyle = color;
        ctx.fillRect(-0.9, -1.15, 1.8, 2.3);
        ctx.restore();
      }
    }
  }

  var PIT_TRUCK_COLORS = ['#e8622c', '#3d7fd6', '#3ddc97', '#e0c02c', '#c94fd6'];
  var PARK_CAR_COLORS = ['#e05263', '#4dabf7', '#3ddc97', '#ffd166', '#b197fc', '#ff9f43'];

  /** Voie des stands et parking des transporteurs, décor statique placé le
   * long de la ligne droite de départ/arrivée (toujours du même côté que la
   * tribune principale), avec camions garés et quelques voitures colorées
   * sur le parking attenant. */
  function drawPitLane(ctx, track, norms, startAngle, centroid) {
    var n = track.length, span = Math.min(9, n - 1);
    /* Toujours du côté extérieur de la boucle, quel que soit son sens de
       parcours (horaire ou antihoraire selon le tracé généré). */
    var out = { x: track[0].x - centroid.x, y: track[0].y - centroid.y };
    var side = (norms[0].x * out.x + norms[0].y * out.y) >= 0 ? 1 : -1;
    var laneOff = TRACK_W * 1.55, parkOff = TRACK_W * 2.25;

    /* Voie des stands : bande claire parallèle à la piste. */
    ctx.fillStyle = '#8b8f96';
    ctx.beginPath();
    for (var i = 0; i <= span; i++) {
      var p = track[i], nr = norms[i];
      var px = p.x + nr.x * (laneOff - TRACK_W * 0.5) * side;
      var py = p.y + nr.y * (laneOff - TRACK_W * 0.5) * side;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    for (i = span; i >= 0; i--) {
      var p2 = track[i], nr2 = norms[i];
      var px2 = p2.x + nr2.x * (laneOff + TRACK_W * 0.5) * side;
      var py2 = p2.y + nr2.y * (laneOff + TRACK_W * 0.5) * side;
      ctx.lineTo(px2, py2);
    }
    ctx.closePath();
    ctx.fill();

    /* Camions et remorques garés le long des stands. */
    for (i = 1; i < span; i += 2) {
      var pc = track[i], nc = norms[i];
      var tx = pc.x + nc.x * laneOff * side;
      var ty = pc.y + nc.y * laneOff * side;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(startAngle);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(-3.2, -1.6, 6.6, 3.4);
      ctx.fillStyle = PIT_TRUCK_COLORS[(i >> 1) % PIT_TRUCK_COLORS.length];
      ctx.fillRect(-3.4, -1.8, 6.6, 3.4);
      ctx.fillStyle = '#eef2f6';
      ctx.fillRect(-3.4, -1.8, 1.6, 3.4);
      ctx.restore();
    }

    /* Parking coloré, un cran plus loin. */
    for (i = 1; i < span; i++) {
      var pp = track[i], np = norms[i];
      var cx = pp.x + np.x * parkOff * side;
      var cy = pp.y + np.y * parkOff * side;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + Math.PI / 2);
      ctx.fillStyle = PARK_CAR_COLORS[i % PARK_CAR_COLORS.length];
      ctx.fillRect(-1.1, -2.0, 2.2, 4.0);
      ctx.restore();
    }
  }

  function draw(R, ctx, cw, ch) {
    var user = R.user;
    /* Vue rapprochée : on doit sentir la vitesse et voir les virages arriver. */
    var scale = 5.0;
    var camX = user ? user.x : 0;
    var camY = user ? user.y : 0;
    var rot = user ? -user.angle - Math.PI / 2 : 0;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = R.rain ? '#25402c' : '#2f6b34';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(cw / 2, ch * 0.68);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);

    /* --- ruban de piste --- */
    var track = R.track, curv = R.curv, norms = R.norms, n = track.length, i;

    drawGravelRunoff(ctx, track, curv, norms, R.rain);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3b3f46';
    ctx.lineWidth = TRACK_W;
    ctx.beginPath();
    ctx.moveTo(track[0].x, track[0].y);
    for (i = 1; i < track.length; i++) ctx.lineTo(track[i].x, track[i].y);
    ctx.closePath();
    ctx.stroke();

    /* Bordures. */
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    drawKerbs(ctx, track, curv, norms);

    /* Ligne de départ. */
    var a = track[0], b = track[1];
    var ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffffff';
    for (var k = -3; k < 3; k++) {
      ctx.fillRect(-1, k * 2.2, 2, 1.1);
    }
    ctx.restore();

    drawPitLane(ctx, track, norms, ang, R.centroid);

    /* --- voitures --- */
    for (i = 0; i < R.cars.length; i++) {
      var c = R.cars[i];
      if (c.out) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(-2.2, -1.5, 5.4, 3.2);
      ctx.fillStyle = c.user ? '#f0b429'
        : (c.isYou ? '#ffd166' : TEAM_COLORS[c.teamIdx % TEAM_COLORS.length]);
      ctx.fillRect(-2.6, -1.7, 5.4, 3.2);
      ctx.fillStyle = '#1b2433';
      ctx.fillRect(-0.4, -1.1, 1.8, 2.2);
      ctx.restore();

      if (c.user) {
        ctx.strokeStyle = 'rgba(255,209,102,.9)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    /* --- pluie --- */
    if (R.rain) {
      ctx.strokeStyle = 'rgba(200,225,255,.35)';
      ctx.lineWidth = 1;
      for (i = 0; i < 40; i++) {
        var rx = (i * 97 + (R.time * 220) % cw) % cw;
        var ry = (i * 53 + (R.time * 460) % ch) % ch;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 10);
        ctx.stroke();
      }
    }

    /* --- compte à rebours --- */
    if (R.countdown > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(Math.ceil(R.countdown)), cw / 2, ch / 2);
    }
  }

  return {
    TRACK_W: TRACK_W, makeTrack: makeTrack, create: create, update: update,
    draw: draw, finish: finish, skipToEnd: skipToEnd, pit: pit,
    maxSpeed: maxSpeed, push: push
  };
})();
