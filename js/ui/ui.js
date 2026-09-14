/* Socle de l'interface : navigation, rendu des vues, modales, notifications.
 *
 * Chaque vue s'enregistre avec G.ui.register() et fournit une fonction
 * render() qui renvoie du HTML. Les interactions passent par des attributs
 * data-act délégués, ce qui évite de recâbler des écouteurs à chaque rendu.
 */
window.G = window.G || {};

G.ui = (function () {
  'use strict';
  var u = G.util;

  var views = {};
  var order = [];
  var actions = {};
  var el = {};
  var current = 'empire';
  var modalStack = 0;
  var sinceRefresh = 0;
  var headerNeedsUpdate = true;
  var lastTouch = 0;
  var modalCtx = null;

  /* ------------------------------------------------------ enregistrement */

  function register(id, def) {
    views[id] = def;
    if (order.indexOf(id) < 0) order.push(id);
  }

  function act(name, fn) { actions[name] = fn; }

  /** Récupère une action enregistrée (pour l'appeler depuis un autre module). */
  function actionOf(name) { return actions[name]; }

  /* ------------------------------------------------------------- rendu -- */

  function render() {
    var v = views[current];
    if (!v) return;
    var keepScroll = el.app.scrollTop;
    el.app.innerHTML = v.render();
    if (v.after) v.after(el.app);
    el.app.scrollTop = keepScroll;
    updateNav();
    updateHeader();
  }

  function refresh() {
    sinceRefresh = 0;
    render();
  }

  function setTab(id) {
    if (!views[id]) return;
    current = id;
    G.state.settings.tab = id;
    el.app.scrollTop = 0;
    render();
  }

  function currentTab() { return current; }

  function updateNav() {
    var nodes = u.$$('.tab', el.tabs);
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute('data-tab');
      nodes[i].classList.toggle('active', id === current);
      var dot = u.$('.dot', nodes[i]);
      var alert = views[id] && views[id].alert && views[id].alert();
      if (dot) dot.style.display = alert ? 'block' : 'none';
    }
  }

  /* ------------------------------------------------------------ en-tête - */

  function headerDirty() { headerNeedsUpdate = true; }

  function updateHeader() {
    var s = G.state;
    el.money.textContent = u.fmtMoney(s.money);
    var hourly = G.business.totalHourly() + G.realestate.totalHourly();
    el.rate.textContent = hourly > 0
      ? '+' + u.fmtMoney(hourly) + ' /h · versé en continu'
      : 'aucun revenu passif';

    el.day.textContent = u.fmtDay(s.market.day);

    var invest = G.eco.portfolioValue() + G.eco.cryptoValue() + G.eco.realEstateValue();
    el.pf.textContent = u.fmtMoney(invest);

    /* Bandeau « gains à replacer » : le lien direct sport/casino -> Bourse. */
    var top = G.eco.topPending();
    if (top && top.amount > 50) {
      el.reinvest.style.display = 'flex';
      el.reinvest.innerHTML = '<span>' + top.meta.icon + '</span><span>' +
        '<b>' + u.fmtMoney(top.amount) + '</b> gagnés · ' + u.esc(top.meta.label) +
        '</span><span class="go">Réinvestir →</span>';
      el.reinvest.setAttribute('data-src', top.key);
    } else {
      el.reinvest.style.display = 'none';
    }

    /* Bandeau des impôts : montant dû, sursis restant, ou blocage des revenus. */
    var t = s.tax;
    if (t && t.due > 0) {
      el.taxbar.style.display = 'flex';
      el.taxbar.classList.toggle('overdue', t.overdue);
      el.taxbar.innerHTML = '<span>🧾</span><span>' +
        (t.overdue
          ? '<b>Revenus bloqués</b> · impôts impayés'
          : '<b>' + u.fmtMoney(t.due) + '</b> d\'impôts dus · ' +
            u.fmtDuration(Math.max(0, t.graceLeft) * 1000) + ' restants') +
        '</span><span class="go">Payer →</span>';
    } else if (el.taxbar) {
      el.taxbar.style.display = 'none';
    }
    headerNeedsUpdate = false;
  }

  /* -------------------------------------------------------------- tick -- */

  function onTick(dt) {
    sinceRefresh += dt;
    if (headerNeedsUpdate || sinceRefresh > 0.9) updateHeader();

    /* On ne redessine jamais une vue « vivante » juste après un geste du
       joueur : sinon le bouton disparaît sous le doigt et le tap est perdu. */
    var v = views[current];
    if (v && v.live && modalStack === 0 && sinceRefresh >= (v.liveEvery || 1.2) &&
      Date.now() - lastTouch > 800) {
      sinceRefresh = 0;
      render();
    }
    if (modalCtx && modalCtx.tick) modalCtx.tick(dt);
  }

  /* ------------------------------------------------------------ toasts -- */

  function toast(title, sub, kind) {
    var t = u.el('div', 'toast ' + (kind === 'good' ? 'good' : kind === 'bad' ? 'bad' : ''));
    t.innerHTML = '<div class="t">' + title + '</div>' +
      (sub ? '<div class="s">' + u.esc(sub) + '</div>' : '');
    el.toasts.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, kind === 'bad' ? 2600 : 1900);
    while (el.toasts.children.length > 4) el.toasts.removeChild(el.toasts.firstChild);
  }

  /* ------------------------------------------------------------ modales - */

  /**
   * Ouvre une modale.
   * @param {string} title
   * @param {string} html
   * @param {object} ctx  { tick, onClose, wide }
   */
  function modal(title, html, ctx) {
    modalStack = 1;
    modalCtx = ctx || null;
    el.modalTitle.innerHTML = title;
    el.modalBody.innerHTML = html;
    el.backdrop.classList.remove('hidden');
    el.modalBody.scrollTop = 0;
    if (modalCtx && modalCtx.after) modalCtx.after(el.modalBody);
  }

  /** Remplace le contenu de la modale sans la refermer. */
  function modalUpdate(html, title) {
    if (!modalStack) return;
    if (title) el.modalTitle.innerHTML = title;
    el.modalBody.innerHTML = html;
    if (modalCtx && modalCtx.after) modalCtx.after(el.modalBody);
  }

  function closeModal(skipCallback) {
    if (!modalStack) return;
    var ctx = modalCtx;
    modalStack = 0;
    modalCtx = null;
    el.backdrop.classList.add('hidden');
    el.modalBody.innerHTML = '';
    if (ctx && ctx.onClose && !skipCallback) ctx.onClose();
    render();
  }

  function isModalOpen() { return modalStack > 0; }

  /**
   * Publicité interne, affichée périodiquement (voir G.loop). N'interrompt
   * jamais un écran de jeu ou une modale déjà ouverte : réessayée plus tard.
   */
  function showAd() {
    if (modalStack > 0) return false;
    if (document.body.classList.contains('playing')) return false;
    modal('📢 Publicité',
      '<div style="text-align:center;padding:4px 0 6px">' +
      '<div style="font-size:42px;margin-bottom:8px">🗺️</div>' +
      '<div style="font-weight:800;font-size:18px;margin-bottom:6px">Sanctimaps</div>' +
      '<p class="muted">Un autre projet du créateur de ce jeu.</p>' +
      '<a href="https://sanctimaps.fr/" target="_blank" rel="noopener noreferrer" ' +
      'class="btn primary full" style="text-decoration:none;margin-top:10px">' +
      '🌐 Visiter sanctimaps.fr</a>' +
      '<button class="btn full" style="margin-top:8px" data-act="ui.close">Fermer</button>' +
      '</div>', {});
    return true;
  }

  /** Boîte de confirmation simple. */
  function confirm(title, text, onOk, okLabel) {
    modal(title,
      '<p class="muted">' + text + '</p>' +
      '<div class="grid2" style="margin-top:12px">' +
      '<button class="btn ghost" data-act="ui.cancel">Annuler</button>' +
      '<button class="btn primary" data-act="ui.confirm">' + (okLabel || 'Confirmer') + '</button>' +
      '</div>',
      { onOk: onOk });
  }

  act('ui.cancel', function () { closeModal(true); });
  act('ui.confirm', function () {
    var cb = modalCtx && modalCtx.onOk;
    closeModal(true);
    if (cb) cb();
    render();
  });
  act('ui.close', function () { closeModal(); });

  /* -------------------------------------------------------- délégation -- */

  function bind() {
    /* Tout geste repousse le prochain rafraîchissement automatique. */
    ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (t) {
      document.addEventListener(t, function () { lastTouch = Date.now(); }, true);
    });

    document.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== document.body) {
        var name = t.getAttribute && t.getAttribute('data-act');
        if (name) {
          var fn = actions[name];
          if (fn) {
            ev.preventDefault();
            fn(t.dataset, t, ev);
          }
          return;
        }
        t = t.parentNode;
      }
    });

    /* Curseurs et listes déroulantes : data-change="nom.action". */
    document.addEventListener('input', function (ev) {
      var name = ev.target.getAttribute && ev.target.getAttribute('data-live');
      if (name && actions[name]) actions[name](ev.target.dataset, ev.target, ev);
    });
    document.addEventListener('change', function (ev) {
      var name = ev.target.getAttribute && ev.target.getAttribute('data-change');
      if (name && actions[name]) actions[name](ev.target.dataset, ev.target, ev);
    });

    el.tabs.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== el.tabs) {
        if (t.classList && t.classList.contains('tab')) {
          setTab(t.getAttribute('data-tab'));
          return;
        }
        t = t.parentNode;
      }
    });

    el.backdrop.addEventListener('click', function (ev) {
      if (ev.target === el.backdrop) closeModal();
    });
  }

  /* --------------------------------------------------------- helpers ---- */

  /** Barre de progression. */
  function bar(pct, cls) {
    return '<div class="bar ' + (cls || '') + '"><i style="width:' +
      u.clamp(pct, 0, 100).toFixed(1) + '%"></i></div>';
  }

  /** Bloc statistique. */
  function stat(label, value, cls) {
    return '<div class="stat"><div class="l">' + label + '</div>' +
      '<div class="v ' + (cls || '') + '">' + value + '</div></div>';
  }

  function pill(txt, cls) {
    return '<span class="pill ' + (cls || '') + '">' + txt + '</span>';
  }

  function empty(icon, txt) {
    return '<div class="empty"><div class="big">' + icon + '</div>' + txt + '</div>';
  }

  /** Couleur d'une note de joueur. */
  function ovrClass(v) {
    return v >= 78 ? 'e1' : v >= 66 ? 'e2' : v >= 52 ? 'e3' : 'e4';
  }

  function signCls(v) { return v > 0 ? 'good' : v < 0 ? 'bad' : ''; }

  /* ------------------------------------------------------------- init --- */

  function init() {
    el.app = u.$('#app');
    el.tabs = u.$('#tabs');
    el.toasts = u.$('#toasts');
    el.money = u.$('#hud-money');
    el.rate = u.$('#hud-rate');
    el.day = u.$('#hud-day');
    el.pf = u.$('#hud-pf');
    el.reinvest = u.$('#reinvest');
    el.taxbar = u.$('#taxbar');
    el.backdrop = u.$('#backdrop');
    el.modalTitle = u.$('#modal-title');
    el.modalBody = u.$('#modal-body');

    /* Construction de la barre d'onglets à partir des vues déclarées. */
    var html = '';
    for (var i = 0; i < order.length; i++) {
      var v = views[order[i]];
      html += '<button class="tab" data-tab="' + order[i] + '">' +
        '<span class="i">' + v.icon + '</span><span>' + v.label + '</span>' +
        '<span class="dot" style="display:none"></span></button>';
    }
    el.tabs.innerHTML = html;

    bind();
    current = views[G.state.settings.tab] ? G.state.settings.tab : 'empire';
    render();
  }

  return {
    register: register, act: act, actionOf: actionOf, init: init,
    render: render, refresh: refresh,
    setTab: setTab, currentTab: currentTab, onTick: onTick,
    toast: toast, modal: modal, modalUpdate: modalUpdate, closeModal: closeModal,
    isModalOpen: isModalOpen, confirm: confirm, headerDirty: headerDirty, showAd: showAd,
    bar: bar, stat: stat, pill: pill, empty: empty, ovrClass: ovrClass,
    signCls: signCls, views: views
  };
})();
