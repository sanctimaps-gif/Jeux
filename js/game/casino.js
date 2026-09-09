/* Casino : blackjack, Texas hold'em, roulette et machines à sous.
 *
 * Les mises sortent du portefeuille commun et les gains y retournent : de
 * quoi financer un transfert, une usine ou une ligne d'actions.
 */
window.G = window.G || {};

G.casino = (function () {
  'use strict';
  var u = G.util;

  var SUITS = ['♠', '♥', '♦', '♣'];
  var RANKS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

  /* ------------------------------------------------------------ cartes -- */

  function newDeck(nDecks) {
    var d = [], n = nDecks || 1;
    for (var k = 0; k < n; k++) {
      for (var s = 0; s < 4; s++) {
        for (var r = 2; r <= 14; r++) d.push({ r: r, s: s });
      }
    }
    return u.shuffle(d);
  }

  function cardLabel(c) {
    return (RANKS[c.r] || c.r) + SUITS[c.s];
  }
  function isRed(c) { return c.s === 1 || c.s === 2; }

  function draw(deck) {
    if (!deck.length) {
      var fresh = newDeck(6);
      for (var i = 0; i < fresh.length; i++) deck.push(fresh[i]);
    }
    return deck.pop();
  }

  /* --------------------------------------------------------- comptabilité */

  function record(game, stake, payout) {
    var s = G.state;
    var c = s.casino;
    if (!c.byGame[game]) c.byGame[game] = { hands: 0, net: 0, best: 0, staked: 0 };
    var g = c.byGame[game];
    g.hands++;
    g.staked += stake;
    var net = payout - stake;
    g.net += net;
    c.net += net;
    if (net > g.best) g.best = net;
    if (net > c.biggestWin) c.biggestWin = net;
    c.streak = net > 0 ? Math.max(1, c.streak + 1) : Math.min(-1, c.streak - 1);
    s.stats.casinoHands++;

    /* La cote du groupe de casinos suit vos exploits. */
    if (Math.abs(net) > 0) {
      G.market.addBoost(G.DATA.casinoStocks[0], u.clamp(net / 5e7, -0.02, 0.02));
    }
  }

  /** Mise : débite le portefeuille. */
  function bet(game, amount) {
    if (amount <= 0) return false;
    return G.eco.spend(amount, 'casino:' + game, null, true);
  }

  /** Gain : crédite le portefeuille, bonus de chance des collections inclus. */
  function pay(game, amount, label) {
    if (amount <= 0) return 0;
    var luck = G.eco.bonus('luck');
    var total = amount * (1 + Math.max(0, luck));
    G.eco.earn(total, 'casino:' + game, label || null, true);
    return total;
  }

  /* ======================================================= BLACKJACK ===== */

  var BJ = (function () {
    function handValue(cards) {
      var total = 0, aces = 0;
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].r;
        if (r === 14) { total += 11; aces++; }
        else if (r >= 10) total += 10;
        else total += r;
      }
      while (total > 21 && aces > 0) { total -= 10; aces--; }
      return total;
    }

    function isSoft(cards) {
      var total = 0, aces = 0;
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].r;
        if (r === 14) { total += 11; aces++; }
        else if (r >= 10) total += 10;
        else total += r;
      }
      return aces > 0 && total <= 21;
    }

    function isBlackjack(cards) {
      return cards.length === 2 && handValue(cards) === 21;
    }

    function start(stake) {
      if (!bet('blackjack', stake)) return null;
      var deck = newDeck(6);
      var B = {
        deck: deck, stake: stake, staked: stake,
        hands: [{ cards: [draw(deck), draw(deck)], bet: stake, done: false, result: null }],
        dealer: [draw(deck), draw(deck)],
        active: 0, state: 'play', payout: 0, log: []
      };
      var h = B.hands[0];
      if (isBlackjack(h.cards)) {
        if (isBlackjack(B.dealer)) settle(B);
        else { h.done = true; settle(B); }
      }
      return B;
    }

    function current(B) { return B.hands[B.active]; }

    function hit(B) {
      var h = current(B);
      if (B.state !== 'play' || h.done) return B;
      h.cards.push(draw(B.deck));
      if (handValue(h.cards) >= 21) stand(B);
      return B;
    }

    function stand(B) {
      var h = current(B);
      h.done = true;
      if (B.active < B.hands.length - 1) B.active++;
      else settle(B);
      return B;
    }

    function canDouble(B) {
      var h = current(B);
      return B.state === 'play' && h.cards.length === 2 && G.eco.can(h.bet);
    }

    function double(B) {
      var h = current(B);
      if (!canDouble(B)) return B;
      if (!bet('blackjack', h.bet)) return B;
      B.staked += h.bet;
      h.bet *= 2;
      h.cards.push(draw(B.deck));
      stand(B);
      return B;
    }

    function canSplit(B) {
      var h = current(B);
      return B.state === 'play' && B.hands.length < 3 && h.cards.length === 2 &&
        h.cards[0].r === h.cards[1].r && G.eco.can(h.bet);
    }

    function split(B) {
      var h = current(B);
      if (!canSplit(B)) return B;
      if (!bet('blackjack', h.bet)) return B;
      B.staked += h.bet;
      var moved = h.cards.pop();
      h.cards.push(draw(B.deck));
      B.hands.splice(B.active + 1, 0, {
        cards: [moved, draw(B.deck)], bet: h.bet, done: false, result: null
      });
      return B;
    }

    function settle(B) {
      B.state = 'dealer';
      var anyAlive = B.hands.some(function (h) { return handValue(h.cards) <= 21; });
      if (anyAlive) {
        while (handValue(B.dealer) < 17 ||
          (handValue(B.dealer) === 17 && isSoft(B.dealer) && false)) {
          B.dealer.push(draw(B.deck));
        }
      }
      var dv = handValue(B.dealer);
      var dealerBJ = isBlackjack(B.dealer);
      var total = 0;

      for (var i = 0; i < B.hands.length; i++) {
        var h = B.hands[i];
        var v = handValue(h.cards);
        var win = 0, label;
        if (v > 21) { label = 'Perdu (dépassement)'; }
        else if (isBlackjack(h.cards) && B.hands.length === 1 && !dealerBJ) {
          win = h.bet * 2.5; label = 'BLACKJACK ! (3:2)';
        } else if (dealerBJ && !isBlackjack(h.cards)) { label = 'Le croupier a blackjack'; }
        else if (dv > 21) { win = h.bet * 2; label = 'Le croupier saute'; }
        else if (v > dv) { win = h.bet * 2; label = 'Gagné'; }
        else if (v === dv) { win = h.bet; label = 'Égalité'; }
        else { label = 'Perdu'; }
        h.result = label;
        h.win = win;
        total += win;
      }

      B.payout = total;
      B.state = 'done';
      if (total > 0) pay('blackjack', total, 'Blackjack');
      record('blackjack', B.staked, total);
      return B;
    }

    return {
      start: start, hit: hit, stand: stand, double: double, split: split,
      canDouble: canDouble, canSplit: canSplit, handValue: handValue,
      isBlackjack: isBlackjack, current: current
    };
  })();

  /* ======================================================== ROULETTE ===== */

  var ROULETTE = (function () {
    var REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

    function color(n) {
      if (n === 0) return 'vert';
      return REDS.indexOf(n) >= 0 ? 'rouge' : 'noir';
    }

    var BETS = [
      { id: 'rouge', name: 'Rouge', pay: 2, test: function (n) { return color(n) === 'rouge'; } },
      { id: 'noir', name: 'Noir', pay: 2, test: function (n) { return color(n) === 'noir'; } },
      { id: 'pair', name: 'Pair', pay: 2, test: function (n) { return n !== 0 && n % 2 === 0; } },
      { id: 'impair', name: 'Impair', pay: 2, test: function (n) { return n % 2 === 1; } },
      { id: 'manque', name: 'Manque (1-18)', pay: 2, test: function (n) { return n >= 1 && n <= 18; } },
      { id: 'passe', name: 'Passe (19-36)', pay: 2, test: function (n) { return n >= 19; } },
      { id: 'd1', name: '1re douzaine', pay: 3, test: function (n) { return n >= 1 && n <= 12; } },
      { id: 'd2', name: '2e douzaine', pay: 3, test: function (n) { return n >= 13 && n <= 24; } },
      { id: 'd3', name: '3e douzaine', pay: 3, test: function (n) { return n >= 25; } },
      { id: 'c1', name: 'Colonne 1', pay: 3, test: function (n) { return n > 0 && n % 3 === 1; } },
      { id: 'c2', name: 'Colonne 2', pay: 3, test: function (n) { return n > 0 && n % 3 === 2; } },
      { id: 'c3', name: 'Colonne 3', pay: 3, test: function (n) { return n > 0 && n % 3 === 0; } }
    ];

    function betDef(id) {
      for (var i = 0; i < BETS.length; i++) if (BETS[i].id === id) return BETS[i];
      if (/^n\d+$/.test(id)) {
        var n = parseInt(id.slice(1), 10);
        return {
          id: id, name: 'Plein ' + n, pay: 36,
          test: function (x) { return x === n; }
        };
      }
      return null;
    }

    /** @param {object} bets  { betId: montant }  */
    function spin(bets) {
      var total = 0, id;
      for (id in bets) total += bets[id];
      if (total <= 0) return null;
      if (!bet('roulette', total)) return null;

      var n = u.rint(0, 36);
      var won = 0, details = [];
      for (id in bets) {
        var d = betDef(id);
        if (!d) continue;
        if (d.test(n)) {
          var g = bets[id] * d.pay;
          won += g;
          details.push({ name: d.name, stake: bets[id], win: g });
        } else {
          details.push({ name: d.name, stake: bets[id], win: 0 });
        }
      }
      if (won > 0) pay('roulette', won, 'Roulette · ' + n);
      record('roulette', total, won);
      return { n: n, color: color(n), staked: total, won: won, details: details };
    }

    return { BETS: BETS, betDef: betDef, color: color, spin: spin, REDS: REDS };
  })();

  /* ==================================================== MACHINE À SOUS === */

  var SLOTS = (function () {
    var REEL = [
      { s: '🍒', w: 26, pay3: 8, pay2: 1 },
      { s: '🍋', w: 22, pay3: 12, pay2: 0 },
      { s: '🔔', w: 17, pay3: 20, pay2: 0 },
      { s: '💎', w: 11, pay3: 45, pay2: 0 },
      { s: '🏆', w: 7, pay3: 110, pay2: 0 },
      { s: '7️⃣', w: 4, pay3: 300, pay2: 0 }
    ];

    function spinReel() {
      return u.weighted(REEL.map(function (r) { return [r, r.w]; }));
    }

    function spin(stake) {
      if (!bet('slots', stake)) return null;
      var r = [spinReel(), spinReel(), spinReel()];
      var win = 0, label = '';
      if (r[0].s === r[1].s && r[1].s === r[2].s) {
        win = stake * r[0].pay3;
        label = 'Trois ' + r[0].s + ' !';
      } else if (r[0].s === r[1].s || r[1].s === r[2].s || r[0].s === r[2].s) {
        var pairSym = r[0].s === r[1].s ? r[0] : (r[1].s === r[2].s ? r[1] : r[0]);
        if (pairSym.pay2 > 0) { win = stake * pairSym.pay2; label = 'Paire de ' + pairSym.s; }
      }
      if (win > 0) pay('slots', win, 'Machine à sous');
      record('slots', stake, win);
      return { reels: r.map(function (x) { return x.s; }), win: win, label: label, stake: stake };
    }

    return { REEL: REEL, spin: spin };
  })();

  /* ========================================================== POKER ====== */

  var POKER = (function () {
    var CAT_NAMES = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte',
      'Couleur', 'Full', 'Carré', 'Quinte flush'];

    /** Évalue la meilleure main de 5 cartes parmi 5 à 7. */
    function evaluate(cards) {
      var byRank = {}, bySuit = [[], [], [], []], i;
      for (i = 0; i < cards.length; i++) {
        var c = cards[i];
        byRank[c.r] = (byRank[c.r] || 0) + 1;
        bySuit[c.s].push(c.r);
      }
      var ranksDesc = Object.keys(byRank).map(Number).sort(function (a, b) { return b - a; });

      /* Couleur / quinte flush */
      var flushSuit = -1;
      for (i = 0; i < 4; i++) if (bySuit[i].length >= 5) flushSuit = i;
      if (flushSuit >= 0) {
        var fr = bySuit[flushSuit].slice().sort(function (a, b) { return b - a; });
        var sf = straightHigh(fr);
        if (sf) return mk(8, [sf]);
        return mk(5, fr.slice(0, 5));
      }

      /* Quinte */
      var sh = straightHigh(ranksDesc);

      /* Groupes */
      var quads = [], trips = [], pairs = [];
      for (i = 0; i < ranksDesc.length; i++) {
        var r = ranksDesc[i], n = byRank[r];
        if (n === 4) quads.push(r);
        else if (n === 3) trips.push(r);
        else if (n === 2) pairs.push(r);
      }

      if (quads.length) {
        return mk(7, [quads[0], kickers(ranksDesc, [quads[0]], 1)[0]]);
      }
      if (trips.length && (pairs.length || trips.length > 1)) {
        var pairRank = pairs.length ? pairs[0] : trips[1];
        return mk(6, [trips[0], pairRank]);
      }
      if (sh) return mk(4, [sh]);
      if (trips.length) return mk(3, [trips[0]].concat(kickers(ranksDesc, [trips[0]], 2)));
      if (pairs.length >= 2) {
        return mk(2, [pairs[0], pairs[1]].concat(kickers(ranksDesc, [pairs[0], pairs[1]], 1)));
      }
      if (pairs.length === 1) {
        return mk(1, [pairs[0]].concat(kickers(ranksDesc, [pairs[0]], 3)));
      }
      return mk(0, ranksDesc.slice(0, 5));
    }

    function kickers(ranksDesc, exclude, n) {
      var out = [];
      for (var i = 0; i < ranksDesc.length && out.length < n; i++) {
        if (exclude.indexOf(ranksDesc[i]) < 0) out.push(ranksDesc[i]);
      }
      while (out.length < n) out.push(0);
      return out;
    }

    /** Renvoie la hauteur de la quinte, ou 0. */
    function straightHigh(ranksDesc) {
      var uniq = [];
      for (var i = 0; i < ranksDesc.length; i++) {
        if (uniq.indexOf(ranksDesc[i]) < 0) uniq.push(ranksDesc[i]);
      }
      if (uniq.indexOf(14) >= 0) uniq.push(1);   // l'as peut être bas
      var run = 1;
      for (i = 1; i < uniq.length; i++) {
        if (uniq[i] === uniq[i - 1] - 1) {
          run++;
          if (run >= 5) return uniq[i] + 4;
        } else run = 1;
      }
      return 0;
    }

    function mk(cat, tb) {
      var score = cat;
      for (var i = 0; i < 5; i++) score = score * 15 + (tb[i] || 0);
      return { cat: cat, name: CAT_NAMES[cat], tb: tb, score: score };
    }

    /* --------------------------------------------------- table de jeu --- */

    var AI_NAMES = ['Sacha', 'Lena', 'Bruno', 'Nadia', 'Otto', 'Wanda'];

    function start(bb) {
      if (!G.eco.can(bb * 2)) {
        if (G.ui) G.ui.toast('💳 Cave insuffisante', 'Réduisez la mise', 'bad');
        return null;
      }
      var names = u.shuffle(AI_NAMES);
      var players = [{ name: 'Vous', hero: true }];
      for (var i = 0; i < 3; i++) players.push({ name: names[i], hero: false });

      var P = {
        bb: bb, deck: newDeck(1), board: [], pot: 0, stage: 0,
        players: players, dealer: u.rint(0, 3), turn: 0, currentBet: 0,
        raises: 0, staked: 0, log: [], done: false, winners: [], showdown: false
      };

      for (i = 0; i < players.length; i++) {
        var p = players[i];
        p.cards = [draw(P.deck), draw(P.deck)];
        p.bet = 0; p.folded = false; p.acted = false; p.total = 0;
        p.stack = bb * 60;
      }

      /* Blindes */
      var sbIdx = (P.dealer + 1) % 4, bbIdx = (P.dealer + 2) % 4;
      postBlind(P, sbIdx, bb / 2);
      postBlind(P, bbIdx, bb);
      P.currentBet = bb;
      P.turn = (bbIdx + 1) % 4;
      log(P, 'Blindes postées — pot ' + u.fmtMoney(P.pot));
      advance(P);
      return P;
    }

    function postBlind(P, idx, amount) {
      var p = P.players[idx];
      if (p.hero) {
        if (!bet('poker', amount)) amount = 0;
        P.staked += amount;
      }
      p.bet = amount; p.total += amount; p.stack -= amount;
      P.pot += amount;
    }

    function log(P, txt) {
      P.log.unshift(txt);
      if (P.log.length > 40) P.log.length = 40;
    }

    function activePlayers(P) {
      return P.players.filter(function (p) { return !p.folded; });
    }

    function needsToAct(P, p) {
      return !p.folded && (!p.acted || p.bet < P.currentBet);
    }

    function roundOver(P) {
      var act = activePlayers(P);
      if (act.length <= 1) return true;
      for (var i = 0; i < act.length; i++) if (needsToAct(P, act[i])) return false;
      return true;
    }

    /** Fait jouer les IA jusqu'au tour du héros (ou jusqu'à la fin). */
    function advance(P) {
      var guard = 0;
      while (!P.done && guard++ < 200) {
        if (activePlayers(P).length <= 1) { showdown(P); return P; }
        if (roundOver(P)) { nextStage(P); if (P.done) return P; continue; }

        var p = P.players[P.turn];
        if (!needsToAct(P, p)) { P.turn = (P.turn + 1) % 4; continue; }
        if (p.hero) return P;             // la main revient au joueur
        aiAct(P, p);
        P.turn = (P.turn + 1) % 4;
      }
      return P;
    }

    function nextStage(P) {
      var i;
      for (i = 0; i < P.players.length; i++) {
        P.players[i].bet = 0;
        P.players[i].acted = false;
      }
      P.currentBet = 0;
      P.raises = 0;
      P.stage++;
      if (P.stage === 1) {
        P.board.push(draw(P.deck), draw(P.deck), draw(P.deck));
        log(P, 'Flop : ' + P.board.map(cardLabel).join(' '));
      } else if (P.stage === 2) {
        P.board.push(draw(P.deck));
        log(P, 'Turn : ' + cardLabel(P.board[3]));
      } else if (P.stage === 3) {
        P.board.push(draw(P.deck));
        log(P, 'River : ' + cardLabel(P.board[4]));
      } else {
        showdown(P);
        return;
      }
      P.turn = (P.dealer + 1) % 4;
    }

    /** Force de la main entre 0 et 1 (approximation suffisante pour l'IA). */
    function strength(p, board) {
      if (!board.length) {
        var a = Math.max(p.cards[0].r, p.cards[1].r);
        var b = Math.min(p.cards[0].r, p.cards[1].r);
        var v = (a - 2) / 12 * 0.55 + (b - 2) / 12 * 0.30;
        if (a === b) v += 0.28;
        if (p.cards[0].s === p.cards[1].s) v += 0.07;
        if (a - b === 1) v += 0.04;
        return u.clamp(v, 0, 1);
      }
      var ev = evaluate(p.cards.concat(board));
      var base = [0.12, 0.34, 0.55, 0.70, 0.80, 0.87, 0.94, 0.98, 1.0][ev.cat];
      return u.clamp(base + (ev.tb[0] || 0) / 200, 0, 1);
    }

    function aiAct(P, p) {
      var toCall = P.currentBet - p.bet;
      var st = strength(p, P.board) * u.rfloat(0.86, 1.14);
      var potOdds = toCall > 0 ? toCall / (P.pot + toCall) : 0;

      p.acted = true;

      if (toCall <= 0) {
        if (st > 0.72 && P.raises < 3) { raiseBy(P, p, raiseSize(P)); return; }
        if (st < 0.30 && u.chance(0.18) && P.raises < 3) { raiseBy(P, p, raiseSize(P)); return; }
        log(P, p.name + ' checke.');
        return;
      }
      if (st < potOdds + 0.10 && !u.chance(0.10)) {
        p.folded = true;
        log(P, p.name + ' se couche.');
        return;
      }
      if (st > 0.78 && P.raises < 3 && u.chance(0.55)) { raiseBy(P, p, raiseSize(P)); return; }
      callFor(P, p);
    }

    function raiseSize(P) {
      return Math.max(P.bb, Math.round(P.pot * 0.6));
    }

    function callFor(P, p) {
      var toCall = Math.min(P.currentBet - p.bet, p.stack);
      /* Un « check » ne coûte rien : on ne débite que s'il y a vraiment à suivre. */
      if (p.hero && toCall > 0) {
        if (!bet('poker', toCall)) {
          p.folded = true;
          log(P, 'Fonds insuffisants : vous êtes couché.');
          return;
        }
        P.staked += toCall;
      }
      p.bet += toCall; p.total += toCall; p.stack -= toCall; P.pot += toCall;
      log(P, p.name + (toCall > 0 ? ' suit ' + u.fmtMoney(toCall) : ' checke') + '.');
    }

    function raiseBy(P, p, amount) {
      var target = P.currentBet + amount;
      var need = Math.min(target - p.bet, p.stack);
      if (need <= 0) { callFor(P, p); return; }
      if (p.hero) {
        if (!bet('poker', need)) { callFor(P, p); return; }
        P.staked += need;
      }
      p.bet += need; p.total += need; p.stack -= need; P.pot += need;
      P.currentBet = Math.max(P.currentBet, p.bet);
      P.raises++;
      p.acted = true;
      log(P, p.name + ' relance à ' + u.fmtMoney(P.currentBet) + '.');
    }

    /* ------------------------------------------------- actions du héros - */

    function hero(P) { return P.players[0]; }

    function heroCanCheck(P) { return P.currentBet - hero(P).bet <= 0; }
    function heroToCall(P) { return Math.max(0, P.currentBet - hero(P).bet); }

    function act(P, what) {
      var p = hero(P);
      if (P.done || !needsToAct(P, p)) return P;
      if (what === 'fold') {
        p.folded = true; p.acted = true;
        log(P, 'Vous vous couchez.');
      } else if (what === 'call') {
        callFor(P, p); p.acted = true;
      } else if (what === 'raise') {
        if (P.raises >= 3) callFor(P, p);
        else raiseBy(P, p, raiseSize(P));
      }
      P.turn = (P.turn + 1) % 4;
      return advance(P);
    }

    function showdown(P) {
      if (P.done) return P;
      P.done = true;
      var act = activePlayers(P);
      var i;

      if (act.length === 1) {
        P.winners = [act[0]];
        log(P, act[0].name + ' emporte le pot (' + u.fmtMoney(P.pot) + ').');
      } else {
        P.showdown = true;
        /* On complète le tableau si la main s'arrête avant la river. */
        while (P.board.length < 5) P.board.push(draw(P.deck));
        var best = -1;
        for (i = 0; i < act.length; i++) {
          act[i].eval = evaluate(act[i].cards.concat(P.board));
          if (act[i].eval.score > best) best = act[i].eval.score;
        }
        P.winners = act.filter(function (p2) { return p2.eval.score === best; });
        log(P, P.winners.map(function (w) { return w.name; }).join(' & ') +
          ' gagne avec ' + P.winners[0].eval.name + '.');
      }

      var heroWon = P.winners.indexOf(hero(P)) >= 0;
      var payout = 0;
      if (heroWon) {
        payout = P.pot / P.winners.length;
        pay('poker', payout, 'Pot de poker');
      }
      P.payout = payout;
      record('poker', P.staked, payout);
      return P;
    }

    return {
      evaluate: evaluate, start: start, act: act, advance: advance,
      heroCanCheck: heroCanCheck, heroToCall: heroToCall, hero: hero,
      strength: strength, CAT_NAMES: CAT_NAMES, showdown: showdown,
      raiseSize: raiseSize
    };
  })();

  /* ---------------------------------------------------------- résumé ---- */

  function stats() {
    var c = G.state.casino;
    var out = [];
    for (var id in c.byGame) {
      out.push({ id: id, hands: c.byGame[id].hands, net: c.byGame[id].net,
        staked: c.byGame[id].staked, best: c.byGame[id].best });
    }
    return u.sortBy(out, function (x) { return x.hands; }, true);
  }

  return {
    newDeck: newDeck, draw: draw, cardLabel: cardLabel, isRed: isRed,
    BJ: BJ, ROULETTE: ROULETTE, SLOTS: SLOTS, POKER: POKER,
    stats: stats, record: record
  };
})();
