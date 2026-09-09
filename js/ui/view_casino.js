/* Onglet Casino : blackjack, Texas hold'em, roulette, machines à sous. */
window.G = window.G || {};

(function () {
  'use strict';
  var u = G.util, ui = G.ui;

  var stake = 100;
  var game = null;         // partie en cours (blackjack ou poker)
  var roulBets = {};
  var lastSpin = null;
  var lastSlot = null;

  var GAMES = [
    { id: 'blackjack', name: 'Blackjack', icon: '🃏', desc: 'Battre le croupier sans dépasser 21. Blackjack payé 3 pour 2.' },
    { id: 'poker', name: 'Texas hold\'em', icon: '♠️', desc: 'Trois adversaires, quatre tours d\'enchères, un pot à rafler.' },
    { id: 'roulette', name: 'Roulette', icon: '🎡', desc: 'Cylindre européen à un seul zéro. Plein payé 35 contre 1.' },
    { id: 'slots', name: 'Machines à sous', icon: '🎰', desc: 'Trois rouleaux, sept symboles, un jackpot à 300 fois la mise.' }
  ];

  function stakeSelector(act) {
    var opts = [10, 100, 1000, 10000, 100000, 1e6];
    var h = '<div class="row wrap" style="gap:5px;margin:8px 0">' +
      '<span class="mute2" style="width:100%">Mise : <b>' + u.fmtMoney(stake) + '</b></span>';
    for (var i = 0; i < opts.length; i++) {
      h += '<button class="btn xs' + (stake === opts[i] ? ' primary' : '') +
        '" data-act="cs.stake" data-v="' + opts[i] + '">' + u.fmtMoney(opts[i]) + '</button>';
    }
    h += '<button class="btn xs" data-act="cs.stake" data-v="half">÷2</button>' +
      '<button class="btn xs" data-act="cs.stake" data-v="double">×2</button>';
    return h + '</div>';
  }

  ui.act('cs.stake', function (d) {
    if (d.v === 'half') stake = Math.max(10, Math.round(stake / 2));
    else if (d.v === 'double') stake = Math.round(stake * 2);
    else stake = parseInt(d.v, 10);
    if (game && game.kind === 'bj') bjModal();
    else if (game && game.kind === 'poker') pokerModal();
    else ui.refresh();
  });

  /* ============================================================ ACCUEIL == */

  function render() {
    var c = G.state.casino;
    var h = '<div class="view-title">Casino</div>';

    h += '<div class="grid3" style="margin-bottom:10px">' +
      ui.stat('Résultat net', u.fmtSigned(c.net), ui.signCls(c.net)) +
      ui.stat('Plus gros gain', u.fmtMoney(c.biggestWin), 'good') +
      ui.stat('Mains jouées', G.state.stats.casinoHands) +
      '</div>';

    var luck = G.eco.bonus('luck');
    if (luck > 0.0001) {
      h += '<div class="card tight small">🍀 Vos collections et vos lois augmentent ' +
        'vos gains de <b class="good">' + u.fmtPct(luck * 100) + '</b>.</div>';
    }

    for (var i = 0; i < GAMES.length; i++) {
      var g = GAMES[i];
      var st = c.byGame[g.id];
      h += '<div class="card"><div class="row">' +
        '<div class="item-icon" style="font-size:30px">' + g.icon + '</div>' +
        '<div class="item-main"><div class="t">' + g.name + '</div>' +
        '<div class="s">' + g.desc + '</div>' +
        (st ? '<div class="mute2">' + st.hands + ' parties · résultat <b class="' +
          ui.signCls(st.net) + '">' + u.fmtSigned(st.net) + '</b></div>' : '') +
        '</div>' +
        '<div class="item-side"><button class="btn sm primary" data-act="cs.open" data-id="' +
        g.id + '">Jouer</button></div></div></div>';
    }

    var pend = G.state.pending['casino'] || 0;
    if (pend > 100) {
      h += '<button class="btn green full" data-act="mk.reinvest" data-src="casino">' +
        '♻️ Replacer ' + u.fmtMoney(pend) + ' de gains en Bourse</button>';
    }

    h += '<div class="card flat small muted" style="margin-top:10px">' +
      'Taux de retour théoriques : roulette 97,3 % · machines 92 % · ' +
      'blackjack ≈ 99 % en jeu optimal. La maison garde toujours un avantage : ' +
      'le casino finance vos projets, il ne les remplace pas.</div>';
    return h;
  }

  ui.act('cs.open', function (d) {
    if (d.id === 'blackjack') { game = null; bjModal(); }
    else if (d.id === 'poker') { game = null; pokerModal(); }
    else if (d.id === 'roulette') { roulBets = {}; lastSpin = null; roulModal(); }
    else { lastSlot = null; slotModal(); }
  });

  /* ========================================================= BLACKJACK === */

  function cardHtml(c, small) {
    if (!c) return '';
    return '<div class="pcard' + (G.casino.isRed(c) ? ' red' : '') + (small ? ' sm' : '') +
      '">' + G.casino.cardLabel(c) + '</div>';
  }
  function backHtml(small) {
    return '<div class="pcard back' + (small ? ' sm' : '') + '">?</div>';
  }

  function bjModal() {
    var B = game && game.kind === 'bj' ? game.B : null;
    var h = '';

    if (!B) {
      h += '<p class="muted">Le croupier tire jusqu\'à 17. Blackjack payé 3 pour 2. ' +
        'Vous pouvez doubler et séparer les paires.</p>';
      h += stakeSelector();
      h += '<button class="btn primary full" data-act="cs.bjdeal">Distribuer · ' +
        u.fmtMoney(stake) + '</button>';
      ui.modal('🃏 Blackjack', h, { onClose: function () { game = null; } });
      return;
    }

    var hideHole = B.state === 'play';
    h += '<div class="card tight"><div class="mute2">Croupier ' +
      (hideHole ? '' : '· ' + G.casino.BJ.handValue(B.dealer)) + '</div>' +
      '<div class="pcards" style="margin-top:6px">' +
      cardHtml(B.dealer[0]) +
      (hideHole ? backHtml() : B.dealer.slice(1).map(function (c) { return cardHtml(c); }).join('')) +
      '</div></div>';

    for (var i = 0; i < B.hands.length; i++) {
      var hd = B.hands[i];
      var v = G.casino.BJ.handValue(hd.cards);
      h += '<div class="card tight" style="' +
        (i === B.active && B.state === 'play' ? 'border-color:var(--gold)' : '') + '">' +
        '<div class="row between"><span class="mute2">Votre main' +
        (B.hands.length > 1 ? ' ' + (i + 1) : '') + ' · <b>' + v + '</b></span>' +
        '<span class="mute2">mise ' + u.fmtMoney(hd.bet) + '</span></div>' +
        '<div class="pcards" style="margin-top:6px">' +
        hd.cards.map(function (c) { return cardHtml(c); }).join('') + '</div>' +
        (hd.result ? '<div class="' + (hd.win > hd.bet ? 'good' : hd.win === hd.bet ? 'warn' : 'bad') +
          '" style="margin-top:6px;font-weight:700">' + hd.result + '</div>' : '') +
        '</div>';
    }

    if (B.state === 'play') {
      h += '<div class="grid2" style="gap:6px">' +
        '<button class="btn green" data-act="cs.bjhit">Carte</button>' +
        '<button class="btn" data-act="cs.bjstand">Rester</button></div>' +
        '<div class="grid2" style="gap:6px;margin-top:6px">' +
        '<button class="btn blue" data-act="cs.bjdouble"' +
        (G.casino.BJ.canDouble(B) ? '' : ' disabled') + '>Doubler</button>' +
        '<button class="btn blue" data-act="cs.bjsplit"' +
        (G.casino.BJ.canSplit(B) ? '' : ' disabled') + '>Séparer</button></div>';
    } else {
      var net = B.payout - B.staked;
      h += '<div class="card" style="border-color:' +
        (net > 0 ? 'rgba(61,220,151,.5)' : 'var(--line)') + '">' +
        '<div class="row between"><b>' + (net > 0 ? 'Gain' : net === 0 ? 'Remise' : 'Perte') +
        '</b><b class="' + ui.signCls(net) + '">' + u.fmtSigned(net) + '</b></div></div>';
      h += stakeSelector();
      h += '<button class="btn primary full" data-act="cs.bjdeal">Rejouer · ' +
        u.fmtMoney(stake) + '</button>';
      h += reinvestButton('casino');
    }
    ui.modal('🃏 Blackjack', h, { onClose: function () { game = null; } });
  }

  function reinvestButton(src) {
    var pend = G.state.pending[src] || 0;
    if (pend < 100) return '';
    return '<button class="btn green full" style="margin-top:6px" data-act="mk.reinvest" ' +
      'data-src="' + src + '">♻️ Replacer ' + u.fmtMoney(pend) + ' en Bourse</button>';
  }

  ui.act('cs.bjdeal', function () {
    var B = G.casino.BJ.start(stake);
    if (!B) return;
    game = { kind: 'bj', B: B };
    bjModal();
  });
  ui.act('cs.bjhit', function () { G.casino.BJ.hit(game.B); bjModal(); });
  ui.act('cs.bjstand', function () { G.casino.BJ.stand(game.B); bjModal(); });
  ui.act('cs.bjdouble', function () { G.casino.BJ.double(game.B); bjModal(); });
  ui.act('cs.bjsplit', function () { G.casino.BJ.split(game.B); bjModal(); });

  /* ============================================================= POKER === */

  function pokerModal() {
    var P = game && game.kind === 'poker' ? game.P : null;
    var h = '';

    if (!P) {
      h += '<p class="muted">Table à quatre joueurs. La grosse blinde vaut votre mise ; ' +
        'les relances valent environ 60 % du pot.</p>';
      h += stakeSelector();
      h += '<button class="btn primary full" data-act="cs.pkdeal">Nouvelle main · blinde ' +
        u.fmtMoney(stake) + '</button>';
      ui.modal('♠️ Texas hold\'em', h, { onClose: function () { game = null; } });
      return;
    }

    var hero = G.casino.POKER.hero(P);
    var stageName = ['Préflop', 'Flop', 'Turn', 'River', 'Abattage'][Math.min(P.stage, 4)];

    h += '<div class="row between" style="margin-bottom:8px">' +
      '<span class="pill gold">Pot ' + u.fmtMoney(P.pot) + '</span>' +
      '<span class="pill">' + stageName + '</span></div>';

    h += '<div class="card tight"><div class="mute2">Tableau</div>' +
      '<div class="pcards" style="margin-top:6px">' +
      (P.board.length ? P.board.map(function (c) { return cardHtml(c); }).join('')
        : '<span class="mute2">rien encore</span>') + '</div></div>';

    /* Adversaires */
    h += '<div class="card tight">';
    for (var i = 1; i < P.players.length; i++) {
      var p = P.players[i];
      h += '<div class="row between" style="padding:4px 0">' +
        '<span class="' + (p.folded ? 'mute2' : '') + '">' + u.esc(p.name) +
        (P.dealer === i ? ' 🔘' : '') + '</span>' +
        '<span class="pcards">' +
        (p.folded ? '<span class="mute2">couché</span>'
          : (P.showdown ? p.cards.map(function (c) { return cardHtml(c, true); }).join('')
            : backHtml(true) + backHtml(true))) +
        '</span>' +
        '<span class="small">' + (p.bet > 0 ? u.fmtMoney(p.bet) : '—') + '</span></div>';
    }
    h += '</div>';

    /* Votre main */
    h += '<div class="card tight" style="border-color:var(--gold)">' +
      '<div class="row between"><span class="mute2">Votre main' +
      (P.dealer === 0 ? ' 🔘' : '') + '</span><span class="small">engagé ' +
      u.fmtMoney(hero.total) + '</span></div>' +
      '<div class="pcards" style="margin-top:6px">' +
      hero.cards.map(function (c) { return cardHtml(c); }).join('') + '</div>';
    if (P.board.length) {
      var ev = G.casino.POKER.evaluate(hero.cards.concat(P.board));
      h += '<div class="mute2" style="margin-top:6px">Votre combinaison : <b>' +
        ev.name + '</b></div>';
    }
    h += '</div>';

    if (!P.done) {
      var toCall = G.casino.POKER.heroToCall(P);
      h += '<div class="grid3" style="gap:6px">' +
        '<button class="btn danger" data-act="cs.pkact" data-a="fold">Se coucher</button>' +
        '<button class="btn green" data-act="cs.pkact" data-a="call">' +
        (toCall > 0 ? 'Suivre ' + u.fmtMoney(toCall) : 'Checker') + '</button>' +
        '<button class="btn blue" data-act="cs.pkact" data-a="raise">Relancer ' +
        u.fmtMoney(G.casino.POKER.raiseSize(P)) + '</button></div>';
    } else {
      var net = (P.payout || 0) - P.staked;
      h += '<div class="card" style="border-color:' +
        (net > 0 ? 'rgba(61,220,151,.5)' : 'var(--line)') + '">' +
        '<div class="row between"><b>' + (net >= 0 ? 'Résultat' : 'Perte') + '</b>' +
        '<b class="' + ui.signCls(net) + '">' + u.fmtSigned(net) + '</b></div></div>';
      h += stakeSelector();
      h += '<button class="btn primary full" data-act="cs.pkdeal">Main suivante</button>';
      h += reinvestButton('casino');
    }

    h += '<div class="card tight"><div class="feed">';
    for (var j = 0; j < Math.min(10, P.log.length); j++) {
      h += '<div class="entry"><span>' + u.esc(P.log[j]) + '</span></div>';
    }
    h += '</div></div>';

    ui.modal('♠️ Texas hold\'em', h, { onClose: function () { game = null; } });
  }

  ui.act('cs.pkdeal', function () {
    var P = G.casino.POKER.start(stake);
    if (!P) return;
    game = { kind: 'poker', P: P };
    pokerModal();
  });
  ui.act('cs.pkact', function (d) {
    G.casino.POKER.act(game.P, d.a);
    pokerModal();
  });

  /* ========================================================== ROULETTE === */

  function roulModal() {
    var R = G.casino.ROULETTE;
    var h = '';

    if (lastSpin) {
      h += '<div class="card" style="text-align:center;border-color:' +
        (lastSpin.won > 0 ? 'rgba(61,220,151,.5)' : 'var(--line)') + '">' +
        '<div style="font-size:34px;font-weight:900">' + lastSpin.n + '</div>' +
        '<div class="mute2">' + lastSpin.color + '</div>' +
        '<div class="' + ui.signCls(lastSpin.won - lastSpin.staked) + '" ' +
        'style="font-weight:700;margin-top:4px">' +
        u.fmtSigned(lastSpin.won - lastSpin.staked) + '</div></div>';
    }

    var total = 0;
    for (var k in roulBets) total += roulBets[k];

    h += '<div class="row between" style="margin-bottom:6px">' +
      '<span class="pill gold">Mises : ' + u.fmtMoney(total) + '</span>' +
      '<button class="btn xs" data-act="cs.rclear">Effacer</button></div>';

    h += stakeSelector();

    h += '<div class="mute2" style="margin:6px 0 4px">Chances simples et multiples</div>';
    h += '<div class="grid3" style="gap:5px">';
    for (var i = 0; i < R.BETS.length; i++) {
      var b = R.BETS[i];
      var on = roulBets[b.id] > 0;
      h += '<button class="btn xs' + (on ? ' primary' : '') + '" data-act="cs.rbet" data-id="' +
        b.id + '">' + b.name + (on ? '<br>' + u.fmtMoney(roulBets[b.id]) : '') + '</button>';
    }
    h += '</div>';

    h += '<div class="mute2" style="margin:10px 0 4px">Numéros pleins (×36)</div>' +
      '<div class="roul-grid">';
    h += '<button class="rnum green' + (roulBets.n0 ? ' on' : '') +
      '" data-act="cs.rbet" data-id="n0">0</button>';
    for (var n = 1; n <= 36; n++) {
      var col = R.color(n);
      h += '<button class="rnum ' + (col === 'rouge' ? 'red' : 'black') +
        (roulBets['n' + n] ? ' on' : '') + '" data-act="cs.rbet" data-id="n' + n + '">' +
        n + '</button>';
    }
    h += '</div>';

    h += '<button class="btn primary full" style="margin-top:12px" data-act="cs.rspin"' +
      (total > 0 ? '' : ' disabled') + '>🎡 Lancer la bille</button>';
    h += reinvestButton('casino');

    ui.modal('🎡 Roulette', h, {});
  }

  ui.act('cs.rbet', function (d) {
    roulBets[d.id] = (roulBets[d.id] || 0) + stake;
    roulModal();
  });
  ui.act('cs.rclear', function () { roulBets = {}; roulModal(); });
  ui.act('cs.rspin', function () {
    var res = G.casino.ROULETTE.spin(roulBets);
    if (res) {
      lastSpin = res;
      if (res.won > 0) ui.toast('🎡 ' + res.n + ' ' + res.color, 'Gain ' + u.fmtMoney(res.won), 'good');
      roulBets = {};
    }
    roulModal();
  });

  /* ============================================================ SLOTS ==== */

  function slotModal() {
    var h = '';
    var r = lastSlot ? lastSlot.reels : ['🍒', '🔔', '💎'];
    h += '<div class="reels">' + r.map(function (s) {
      return '<div class="reel">' + s + '</div>';
    }).join('') + '</div>';

    if (lastSlot) {
      var net = lastSlot.win - lastSlot.stake;
      h += '<div class="center" style="margin-bottom:8px"><b class="' + ui.signCls(net) + '">' +
        (lastSlot.win > 0 ? (lastSlot.label || 'Gagné') + ' · ' + u.fmtSigned(net)
          : 'Perdu · ' + u.fmtMoney(lastSlot.stake)) + '</b></div>';
    }

    h += stakeSelector();
    h += '<button class="btn primary full" data-act="cs.sspin">🎰 Lancer · ' +
      u.fmtMoney(stake) + '</button>';

    h += '<div class="card tight" style="margin-top:10px"><div class="card-head">Table des gains</div>';
    for (var i = G.casino.SLOTS.REEL.length - 1; i >= 0; i--) {
      var sym = G.casino.SLOTS.REEL[i];
      h += '<div class="row between small" style="padding:2px 0"><span>' +
        sym.s + sym.s + sym.s + '</span><b>×' + sym.pay3 + '</b></div>';
    }
    h += '<div class="row between small" style="padding:2px 0"><span>🍒🍒 (deux)</span><b>×1</b></div>';
    h += '</div>';
    h += reinvestButton('casino');

    ui.modal('🎰 Machine à sous', h, {});
  }

  ui.act('cs.sspin', function () {
    var res = G.casino.SLOTS.spin(stake);
    if (res) {
      lastSlot = res;
      if (res.win >= stake * 20) {
        ui.toast('🎰 JACKPOT !', res.label + ' · ' + u.fmtMoney(res.win), 'good');
      }
    }
    slotModal();
  });

  /* ------------------------------------------------------------- vue ---- */

  G.ui.register('casino', { icon: '🎰', label: 'Casino', render: render });
})();
