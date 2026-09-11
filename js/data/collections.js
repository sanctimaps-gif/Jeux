/* Collections : objets de prestige achetés au comptant.
 *
 * Chaque objet prend de la valeur avec le temps (appr = appréciation
 * journalière) et procure un bonus permanent. Compléter une collection
 * entière débloque un bonus de série nettement plus fort.
 *
 * Types de bonus :
 *   biz     : +% de revenus des entreprises
 *   sponsor : +% de revenus sponsors & billetterie des clubs
 *   luck    : +% de gains nets au casino (sur les mains gagnantes)
 *   market  : +% de dividendes encaissés
 *   wage    : -% de masse salariale sportive
 *   pop     : +% de popularité gagnée au gouvernement
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

G.DATA.collectionSets = [
  { id: 'autos', name: 'Garage de collection', icon: '🏎️', setBonus: { type: 'biz', value: 0.10 } },
  { id: 'montres', name: 'Montres rares', icon: '⌚', setBonus: { type: 'market', value: 0.25 } },
  { id: 'art', name: 'Galerie d\'art', icon: '🖼️', setBonus: { type: 'luck', value: 0.08 } },
  { id: 'trophees', name: 'Salle des trophées', icon: '🏆', setBonus: { type: 'sponsor', value: 0.20 } },
  { id: 'immo', name: 'Résidences d\'exception', icon: '🏝️', setBonus: { type: 'pop', value: 0.25 } }
];

G.DATA.collectibles = [
  /* --- Garage ---------------------------------------------------------- */
  { id: 'c_r5', set: 'autos', name: 'Berline populaire de 1972', icon: '🚗', photo: '🚗', cost: 9000, appr: 0.0006, bonus: { type: 'biz', value: 0.005 } },
  { id: 'c_gt', set: 'autos', name: 'Coupé GT italien', icon: '🚙', photo: '🏎️', cost: 180000, appr: 0.0009, bonus: { type: 'biz', value: 0.012 } },
  { id: 'c_f1', set: 'autos', name: 'Monoplace de championnat', icon: '🏎️', photo: '🏁', cost: 4.5e6, appr: 0.0012, bonus: { type: 'sponsor', value: 0.04 } },
  { id: 'c_hyp', set: 'autos', name: 'Hypercar hybride #1/12', icon: '🛞', photo: '⚡', cost: 3.2e7, appr: 0.0014, bonus: { type: 'biz', value: 0.03 } },

  /* --- Montres --------------------------------------------------------- */
  { id: 'w_acier', set: 'montres', name: 'Chronographe acier', icon: '⌚', photo: '⌚', cost: 26000, appr: 0.0007, bonus: { type: 'market', value: 0.02 } },
  { id: 'w_or', set: 'montres', name: 'Montre or perpétuelle', icon: '🕰️', photo: '💎', cost: 620000, appr: 0.0010, bonus: { type: 'market', value: 0.05 } },
  { id: 'w_tour', set: 'montres', name: 'Tourbillon squelette', icon: '⏱️', photo: '✨', cost: 9.5e6, appr: 0.0013, bonus: { type: 'market', value: 0.09 } },

  /* --- Art ------------------------------------------------------------- */
  { id: 'a_lith', set: 'art', name: 'Lithographie signée', icon: '🖼️', photo: '🎭', cost: 45000, appr: 0.0008, bonus: { type: 'luck', value: 0.008 } },
  { id: 'a_impr', set: 'art', name: 'Toile impressionniste', icon: '🎨', photo: '🌸', cost: 2.1e6, appr: 0.0011, bonus: { type: 'luck', value: 0.018 } },
  { id: 'a_sculpt', set: 'art', name: 'Sculpture monumentale', icon: '🗿', photo: '🗿', cost: 4.4e7, appr: 0.0012, bonus: { type: 'biz', value: 0.04 } },
  { id: 'a_maitre', set: 'art', name: 'Maître ancien, huile sur bois', icon: '👑', photo: '👑', cost: 6.0e8, appr: 0.0015, bonus: { type: 'luck', value: 0.03 } },

  /* --- Trophées -------------------------------------------------------- */
  { id: 't_ballon', set: 'trophees', name: 'Ballon du match historique', icon: '⚽', photo: '⚽', cost: 120000, appr: 0.0009, bonus: { type: 'sponsor', value: 0.03 } },
  { id: 't_maillot', set: 'trophees', name: 'Maillot de légende encadré', icon: '👕', photo: '👕', cost: 700000, appr: 0.0010, bonus: { type: 'wage', value: 0.03 } },
  { id: 't_coupe', set: 'trophees', name: 'Réplique officielle de la Coupe', icon: '🏆', photo: '🏆', cost: 1.4e7, appr: 0.0012, bonus: { type: 'sponsor', value: 0.07 } },

  /* --- Immobilier de prestige ------------------------------------------ */
  { id: 'i_chalet', set: 'immo', name: 'Chalet d\'altitude', icon: '🏔️', photo: '❄️', cost: 5.5e6, appr: 0.0010, bonus: { type: 'pop', value: 0.03 } },
  { id: 'i_yacht', set: 'immo', name: 'Yacht de 60 mètres', icon: '🛥️', photo: '⛵', cost: 8.0e7, appr: 0.0007, bonus: { type: 'sponsor', value: 0.06 } },
  { id: 'i_ile', set: 'immo', name: 'Île privée', icon: '🏝️', photo: '🏝️', cost: 1.2e9, appr: 0.0013, bonus: { type: 'pop', value: 0.10 } },
  { id: 'i_tour', set: 'immo', name: 'Tour signature en centre-ville', icon: '🏙️', photo: '🌆', cost: 9.0e9, appr: 0.0014, bonus: { type: 'biz', value: 0.08 } }
];

G.DATA.bonusLabels = {
  biz: 'revenus des entreprises',
  sponsor: 'revenus sponsors & billetterie',
  luck: 'gains nets au casino',
  market: 'dividendes boursiers',
  wage: 'masse salariale sportive',
  pop: 'popularité gagnée'
};
