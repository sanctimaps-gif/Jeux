/* Prière catholique selon l'heure de la journée, dans l'esprit de la
 * Liturgie des Heures diffusée par l'AELF (aelf.org).
 *
 * Le jeu fonctionne hors ligne : un texte traditionnel complet est toujours
 * disponible pour chacune des six heures. Si le joueur est connecté, on
 * tente en plus de récupérer le texte du jour depuis l'API publique AELF
 * pour remplacer ce texte par défaut — silencieusement, sans jamais bloquer
 * l'affichage si la requête échoue ou si le format de réponse diffère.
 */
window.G = window.G || {};

G.prayer = (function () {
  'use strict';

  var HOURS = [
    { from: 5, to: 9, slug: 'laudes', icon: '🌅', name: 'Laudes',
      subtitle: 'Prière du matin',
      text: '<p><i>Dieu, viens à mon aide.<br>Seigneur, à notre secours.</i></p>' +
        '<p><b>Cantique de Zacharie</b> (Lc 1, 68-79)<br>' +
        'Béni soit le Seigneur, le Dieu d\'Israël,<br>' +
        'qui visite et rachète son peuple.<br>' +
        'Il a fait surgir la force qui nous sauve<br>' +
        'dans la maison de David, son serviteur,<br>' +
        'comme il l\'avait dit par la bouche des saints,<br>' +
        'par ses prophètes, depuis les temps anciens.</p>' +
        '<p>Gloire au Père, et au Fils, et au Saint-Esprit,<br>' +
        'pour les siècles des siècles. Amen.</p>' },
    { from: 9, to: 12, slug: 'tierce', icon: '☀️', name: 'Tierce',
      subtitle: 'Prière du milieu de matinée',
      text: '<p><i>Dieu, viens à mon aide.<br>Seigneur, à notre secours.</i></p>' +
        '<p>Heureux les hommes intègres dans leur voie,<br>' +
        'qui marchent selon la loi du Seigneur !<br>' +
        'Heureux les hommes fidèles à ses exigences,<br>' +
        'qui le cherchent de tout cœur ! (Ps 118)</p>' +
        '<p>Seigneur, garde-nous aujourd\'hui sans péché, et que ton Esprit ' +
        'Saint nous conduise en toute chose. Amen.</p>' },
    { from: 12, to: 14, slug: 'sexte', icon: '🕛', name: 'Sexte',
      subtitle: 'Prière de midi',
      text: '<p><i>Dieu, viens à mon aide.<br>Seigneur, à notre secours.</i></p>' +
        '<p>Que ta parole, Seigneur, soit la lumière de mes pas,<br>' +
        'la lampe de ma route. (Ps 118)</p>' +
        '<p>Seigneur Jésus, à cette heure où tu montais vers la croix, ' +
        'donne-nous de porter avec toi le poids du jour. Amen.</p>' },
    { from: 14, to: 18, slug: 'none', icon: '🌇', name: 'None',
      subtitle: 'Prière du milieu d\'après-midi',
      text: '<p><i>Dieu, viens à mon aide.<br>Seigneur, à notre secours.</i></p>' +
        '<p>Du fond de l\'abîme je crie vers toi, Seigneur,<br>' +
        'Seigneur, écoute mon appel !<br>' +
        'Que ton oreille se fasse attentive<br>' +
        'au cri de ma prière. (Ps 129)</p>' +
        '<p>À cette heure où tu as remis ton esprit entre les mains du Père, ' +
        'Seigneur, accueille notre prière. Amen.</p>' },
    { from: 18, to: 21, slug: 'vepres', icon: '🌆', name: 'Vêpres',
      subtitle: 'Prière du soir',
      text: '<p><i>Dieu, viens à mon aide.<br>Seigneur, à notre secours.</i></p>' +
        '<p><b>Cantique de Marie</b> (Lc 1, 46-55)<br>' +
        'Mon âme exalte le Seigneur,<br>' +
        'exulte mon esprit en Dieu, mon Sauveur !<br>' +
        'Il s\'est penché sur son humble servante ;<br>' +
        'désormais, tous les âges me diront bienheureuse.</p>' +
        '<p>Reste avec nous, Seigneur, car le soir tombe et le jour déjà ' +
        'décline. Amen.</p>' },
    { from: 21, to: 29, slug: 'complies', icon: '🌙', name: 'Complies',
      subtitle: 'Prière de la nuit',
      text: '<p><i>Dieu, viens à mon aide.<br>Seigneur, à notre secours.</i></p>' +
        '<p>Que le Seigneur tout-puissant nous accorde une nuit paisible ' +
        'et une fin parfaite.</p>' +
        '<p><b>Cantique de Siméon</b> (Lc 2, 29-32)<br>' +
        'Maintenant, ô Maître souverain, tu peux laisser ton serviteur ' +
        's\'en aller en paix, selon ta parole.<br>' +
        'Car mes yeux ont vu le salut que tu préparais à la face des ' +
        'peuples : lumière qui se révèle aux nations et donne à ton ' +
        'peuple sa gloire.</p>' +
        '<p><b>Salve Regina</b><br>' +
        'Salut, ô Reine, Mère de miséricorde,<br>' +
        'notre vie, notre douceur, notre espérance, salut !<br>' +
        'Enfants d\'Ève, exilés, nous crions vers toi ;<br>' +
        'vers toi nous soupirons, gémissant et pleurant<br>' +
        'dans cette vallée de larmes.</p>' +
        '<p>Que le Seigneur nous accorde une nuit tranquille et une fin ' +
        'sainte. Amen.</p>' }
  ];

  /** Renvoie l'heure canoniale correspondant au moment présent. */
  function currentHour() {
    var h = new Date().getHours();
    var hh = h < 5 ? h + 24 : h;   // 0h-5h se rattache à Complies (21h-29h)
    for (var i = 0; i < HOURS.length; i++) {
      if (hh >= HOURS[i].from && hh < HOURS[i].to) return HOURS[i];
    }
    return HOURS[HOURS.length - 1];
  }

  /**
   * Tente de récupérer le texte du jour depuis l'API publique AELF
   * (api.aelf.org). Purement optionnel : hors ligne ou en cas d'échec,
   * le texte traditionnel reste affiché sans qu'aucune erreur ne soit
   * montrée au joueur.
   */
  function fetchLive(hour, cb) {
    if (typeof fetch !== 'function') { cb(null); return; }
    var day = new Date().toISOString().slice(0, 10);
    var url = 'https://api.aelf.org/v1/' + hour.slug + '/' + day;
    fetch(url, { mode: 'cors' }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (data) {
      cb(data ? extractHtml(data) : null);
    }).catch(function () { cb(null); });
  }

  /** Extraction tolérante : la forme exacte de la réponse AELF n'est pas
   * garantie ici (impossible à vérifier hors ligne) ; on essaie plusieurs
   * formes plausibles et on abandonne proprement si rien ne correspond. */
  function extractHtml(data) {
    try {
      var parts = [];
      var texts = data.texts || data.contenu || data.office || data;
      var list = Array.isArray(texts) ? texts
        : (texts && typeof texts === 'object') ? Object.keys(texts).map(function (k) {
          return texts[k];
        }) : [];
      list.forEach(function (t) {
        var body = t && (t.texte || t.contenu || t.content);
        if (body) {
          var safe = G.util.esc(String(body)).replace(/\n/g, '<br>');
          parts.push('<p>' + (t.titre ? '<b>' + G.util.esc(t.titre) + '</b><br>' : '') +
            safe + '</p>');
        }
      });
      return parts.length ? parts.join('') : null;
    } catch (e) {
      return null;
    }
  }

  return { currentHour: currentHour, fetchLive: fetchLive };
})();
