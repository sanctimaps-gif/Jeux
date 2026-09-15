/* Définition des disciplines gérables dans l'onglet Manager.
 *
 * Chaque sport partage le même moteur de match (js/game/match.js) mais avec
 * ses propres postes, durées, façons de marquer et économie.
 *
 * roles utilisés par le moteur : gk (gardien), def, mid, att
 * attW / defW : poids de chaque rôle dans la puissance offensive / défensive
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

G.DATA.attrLabels = {
  att: 'Attaque', def: 'Défense', phy: 'Physique', tec: 'Technique', men: 'Mental'
};

G.DATA.sports = [
  /* ------------------------------------------------------------- FOOT --- */
  {
    id: 'football', name: 'Football', icon: '⚽', type: 'team',
    unit: 'but', unitPlural: 'buts',
    squadSize: 20, lineupSize: 11,
    duration: 90, segments: 18, periods: 2,
    avgEvents: 1.35, spread: 1.9,     // occasions converties par équipe
    scoreEvents: [{ label: 'But', pts: 1, w: 1 }],
    attW: { att: 0.50, mid: 0.33, def: 0.14, gk: 0.03 },
    defW: { def: 0.44, mid: 0.26, gk: 0.26, att: 0.04 },
    positions: [
      { code: 'G', name: 'Gardien', role: 'gk', need: 1, w: { def: .30, phy: .20, tec: .15, men: .30, att: .05 } },
      { code: 'DC', name: 'Défenseur central', role: 'def', need: 2, w: { def: .45, phy: .25, men: .15, tec: .10, att: .05 } },
      { code: 'DL', name: 'Latéral', role: 'def', need: 2, w: { def: .30, phy: .25, tec: .20, att: .15, men: .10 } },
      { code: 'MDF', name: 'Milieu défensif', role: 'mid', need: 1, w: { def: .32, phy: .22, tec: .22, men: .16, att: .08 } },
      { code: 'MC', name: 'Milieu central', role: 'mid', need: 2, w: { tec: .34, men: .22, phy: .16, att: .16, def: .12 } },
      { code: 'MO', name: 'Meneur de jeu', role: 'mid', need: 1, w: { tec: .38, att: .28, men: .20, phy: .08, def: .06 } },
      { code: 'AIL', name: 'Ailier', role: 'att', need: 1, w: { att: .34, tec: .28, phy: .20, men: .12, def: .06 } },
      { code: 'BU', name: 'Buteur', role: 'att', need: 1, w: { att: .48, tec: .20, phy: .18, men: .12, def: .02 } }
    ],
    tactics: {
      mentality: ['Ultra défensif', 'Prudent', 'Équilibré', 'Offensif', 'Tout pour l\'attaque'],
      pressing: ['Bloc bas', 'Bloc médian', 'Pressing haut'],
      style: ['Jeu direct', 'Possession', 'Contre-attaque']
    },
    economy: {
      clubCost: 3.0e7, gateBase: 1.1e6, sponsorBase: 2.2e6,
      prizeWin: 2.4e6, prizeDraw: 1.2e6, prizeLoss: 4.0e5,
      wageBase: 120000, valueMul: 1.0, tvSeason: 4.5e7,
      flagshipPrice: 5.0e9 /* club le plus cher au monde dans la discipline, type PSG/Real Madrid */
    },
    leagueSize: 12,
    countries: ['ESP', 'GBR', 'DEU', 'ITA', 'FRA', 'BRA', 'PRT', 'NLD', 'ARG',
      'BEL', 'TUR', 'MEX', 'USA', 'SAU', 'JPN', 'MAR', 'GRC', 'CHE', 'AUT', 'POL',
      'URY', 'COL', 'HRV', 'DNK', 'SWE', 'NOR', 'RUS', 'UKR', 'SRB', 'CZE',
      'HUN', 'ROU', 'DZA', 'EGY', 'TUN', 'SEN', 'CIV', 'GHA', 'CMR', 'NGA',
      'KOR', 'CHN', 'IDN', 'THA', 'VNM', 'IND', 'AUS', 'CHL', 'PER', 'ECU',
      'PRY', 'CAN', 'IRL', 'SVK', 'SVN', 'BIH', 'ISR', 'IRN', 'IRQ', 'QAT',
      'ARE', 'KWT', 'JOR', 'PAN', 'CRI', 'BOL', 'VEN', 'ZAF', 'FIN', 'ISL']
  },

  /* ------------------------------------------------------------ RUGBY --- */
  {
    id: 'rugby', name: 'Rugby à XV', icon: '🏉', type: 'team',
    unit: 'point', unitPlural: 'points',
    squadSize: 26, lineupSize: 15,
    duration: 80, segments: 16, periods: 2,
    avgEvents: 4.6, spread: 1.5,
    scoreEvents: [
      { label: 'Essai', pts: 5, w: 0.52, convert: { pts: 2, p: 0.74, label: 'Transformation' } },
      { label: 'Pénalité', pts: 3, w: 0.40 },
      { label: 'Drop', pts: 3, w: 0.08 }
    ],
    attW: { att: 0.42, mid: 0.30, def: 0.24, gk: 0.04 },
    defW: { def: 0.46, mid: 0.30, att: 0.20, gk: 0.04 },
    positions: [
      { code: 'PIL', name: 'Pilier', role: 'def', need: 2, w: { phy: .50, def: .28, men: .12, tec: .08, att: .02 } },
      { code: 'TAL', name: 'Talonneur', role: 'def', need: 1, w: { phy: .38, tec: .24, def: .24, men: .12, att: .02 } },
      { code: '2L', name: 'Deuxième ligne', role: 'def', need: 2, w: { phy: .46, def: .30, men: .12, tec: .08, att: .04 } },
      { code: '3L', name: 'Troisième ligne', role: 'mid', need: 3, w: { phy: .34, def: .26, att: .20, men: .12, tec: .08 } },
      { code: 'DM', name: 'Demi de mêlée', role: 'mid', need: 1, w: { tec: .36, men: .26, att: .18, phy: .12, def: .08 } },
      { code: 'DO', name: 'Demi d\'ouverture', role: 'mid', need: 1, w: { tec: .34, men: .30, att: .22, def: .08, phy: .06 } },
      { code: 'CEN', name: 'Centre', role: 'att', need: 2, w: { att: .32, phy: .26, def: .20, tec: .14, men: .08 } },
      { code: 'AIL', name: 'Ailier', role: 'att', need: 2, w: { att: .44, phy: .26, tec: .16, men: .08, def: .06 } },
      { code: 'ARR', name: 'Arrière', role: 'att', need: 1, w: { att: .28, tec: .26, def: .22, men: .16, phy: .08 } }
    ],
    tactics: {
      mentality: ['Jeu au pied', 'Prudent', 'Équilibré', 'Jeu de mouvement', 'Tout terrain'],
      pressing: ['Défense en retrait', 'Défense en ligne', 'Défense montante'],
      style: ['Domination des avants', 'Jeu équilibré', 'Jeu de ligne']
    },
    economy: {
      clubCost: 9.0e6, gateBase: 4.2e5, sponsorBase: 6.5e5,
      prizeWin: 6.2e5, prizeDraw: 3.5e5, prizeLoss: 1.2e5,
      wageBase: 38000, valueMul: 0.04, tvSeason: 1.1e7,
      flagshipPrice: 2.0e8 /* pas de marché comparable au foot ; grand club de rugby pro */
    },
    leagueSize: 12,
    countries: ['NZL', 'ZAF', 'FRA', 'IRL', 'GBR', 'AUS', 'ARG', 'ITA', 'JPN',
      'GEO', 'FJI', 'URY', 'ROU', 'ESP', 'USA', 'CAN', 'CHL', 'PRT', 'RUS',
      'NLD', 'BEL', 'DEU', 'POL', 'KOR', 'CHN', 'BRA', 'MEX', 'WSM', 'TON',
      'NAM', 'KEN', 'ZWE', 'MAR']
  },

  /* ------------------------------------------------------- WATER-POLO --- */
  {
    id: 'waterpolo', name: 'Water-polo', icon: '🤽', type: 'team',
    unit: 'but', unitPlural: 'buts',
    squadSize: 13, lineupSize: 7,
    duration: 32, segments: 16, periods: 4,
    avgEvents: 9.5, spread: 1.0,
    scoreEvents: [{ label: 'But', pts: 1, w: 1 }],
    attW: { att: 0.48, mid: 0.32, def: 0.16, gk: 0.04 },
    defW: { gk: 0.38, def: 0.36, mid: 0.22, att: 0.04 },
    positions: [
      { code: 'G', name: 'Gardien', role: 'gk', need: 1, w: { def: .34, men: .28, phy: .22, tec: .12, att: .04 } },
      { code: 'DEF', name: 'Défenseur', role: 'def', need: 2, w: { def: .42, phy: .30, men: .14, tec: .10, att: .04 } },
      { code: 'AIL', name: 'Ailier', role: 'mid', need: 2, w: { tec: .32, att: .28, phy: .20, men: .12, def: .08 } },
      { code: 'PC', name: 'Pointe centrale', role: 'att', need: 1, w: { att: .38, tec: .26, men: .18, phy: .14, def: .04 } },
      { code: 'CEN', name: 'Centre', role: 'att', need: 1, w: { phy: .40, att: .32, def: .14, tec: .10, men: .04 } }
    ],
    tactics: {
      mentality: ['Béton', 'Prudent', 'Équilibré', 'Offensif', 'Tir à tout va'],
      pressing: ['Zone', 'Mixte', 'Pressing individuel'],
      style: ['Jeu de centre', 'Jeu extérieur', 'Contre rapide']
    },
    economy: {
      clubCost: 1.2e6, gateBase: 4.5e4, sponsorBase: 7.0e4,
      prizeWin: 9.0e4, prizeDraw: 5.0e4, prizeLoss: 1.8e4,
      wageBase: 9000, valueMul: 0.0024, tvSeason: 1.2e6,
      flagshipPrice: 1.2e7 /* sport confidentiel, type Pro Recco */
    },
    leagueSize: 10,
    countries: ['HRV', 'SRB', 'HUN', 'ITA', 'ESP', 'GRC', 'MNE', 'FRA', 'USA',
      'AUS', 'JPN', 'ROU', 'DEU', 'NLD', 'GEO', 'KAZ', 'CHN', 'CAN', 'GBR',
      'BRA', 'ARG', 'ZAF', 'MEX', 'TUR', 'BEL']
  },

  /* ----------------------------------------------------------- BASKET --- */
  {
    id: 'basket', name: 'Basket-ball', icon: '🏀', type: 'team',
    unit: 'point', unitPlural: 'points',
    squadSize: 12, lineupSize: 5,
    duration: 40, segments: 20, periods: 4,
    avgEvents: 35, spread: 0.55,
    scoreEvents: [
      { label: 'Panier à 2 points', pts: 2, w: 0.56 },
      { label: 'Panier à 3 points', pts: 3, w: 0.26 },
      { label: 'Lancers francs', pts: 2, w: 0.18 }
    ],
    attW: { att: 0.44, mid: 0.34, def: 0.20, gk: 0.02 },
    defW: { def: 0.44, mid: 0.34, att: 0.20, gk: 0.02 },
    positions: [
      { code: 'MEN', name: 'Meneur', role: 'mid', need: 1, w: { tec: .38, men: .26, att: .20, phy: .10, def: .06 } },
      { code: 'ARR', name: 'Arrière', role: 'att', need: 1, w: { att: .40, tec: .26, phy: .16, men: .12, def: .06 } },
      { code: 'AIL', name: 'Ailier', role: 'att', need: 1, w: { att: .32, phy: .24, def: .20, tec: .16, men: .08 } },
      { code: 'AF', name: 'Ailier fort', role: 'def', need: 1, w: { phy: .36, def: .30, att: .20, tec: .08, men: .06 } },
      { code: 'PIV', name: 'Pivot', role: 'def', need: 1, w: { phy: .42, def: .32, att: .16, tec: .06, men: .04 } }
    ],
    tactics: {
      mentality: ['Jeu lent', 'Contrôlé', 'Équilibré', 'Rythme élevé', 'Run and gun'],
      pressing: ['Zone 2-3', 'Mixte', 'Individuelle tout terrain'],
      style: ['Jeu intérieur', 'Équilibré', 'Tir extérieur']
    },
    economy: {
      clubCost: 1.4e7, gateBase: 5.2e5, sponsorBase: 9.0e5,
      prizeWin: 9.5e5, prizeDraw: 0, prizeLoss: 2.0e5,
      wageBase: 75000, valueMul: 1.6, tvSeason: 1.8e7,
      flagshipPrice: 8.0e9 /* plus grosse franchise NBA, type Golden State Warriors */
    },
    leagueSize: 12,
    countries: ['USA', 'ESP', 'GRC', 'TUR', 'ITA', 'FRA', 'DEU', 'SRB', 'LTU',
      'ISR', 'AUS', 'CHN', 'ARG', 'BRA', 'PHL', 'CAN', 'SVN', 'LVA', 'GEO',
      'MNE', 'POL', 'CZE', 'DOM', 'PRT', 'NGA', 'AGO', 'MLI', 'SEN', 'JPN',
      'KOR', 'NZL', 'RUS', 'UKR', 'VEN', 'MEX']
  },

  /* -------------------------------------------------------- HANDBALL --- */
  {
    id: 'handball', name: 'Handball', icon: '🤾', type: 'team',
    unit: 'but', unitPlural: 'buts',
    squadSize: 16, lineupSize: 7,
    duration: 60, segments: 15, periods: 2,
    avgEvents: 27, spread: 0.6,
    scoreEvents: [{ label: 'But', pts: 1, w: 1 }],
    attW: { att: 0.46, mid: 0.34, def: 0.16, gk: 0.04 },
    defW: { gk: 0.34, def: 0.36, mid: 0.26, att: 0.04 },
    positions: [
      { code: 'G', name: 'Gardien', role: 'gk', need: 1, w: { def: .36, men: .28, tec: .18, phy: .14, att: .04 } },
      { code: 'ARG', name: 'Arrière gauche', role: 'att', need: 1, w: { att: .38, phy: .26, tec: .20, men: .10, def: .06 } },
      { code: 'DC', name: 'Demi-centre', role: 'mid', need: 1, w: { tec: .34, men: .28, att: .20, phy: .12, def: .06 } },
      { code: 'ARD', name: 'Arrière droit', role: 'att', need: 1, w: { att: .38, phy: .26, tec: .20, men: .10, def: .06 } },
      { code: 'AIG', name: 'Ailier gauche', role: 'mid', need: 1, w: { tec: .30, att: .30, phy: .22, men: .12, def: .06 } },
      { code: 'AID', name: 'Ailier droit', role: 'mid', need: 1, w: { tec: .30, att: .30, phy: .22, men: .12, def: .06 } },
      { code: 'PIV', name: 'Pivot', role: 'def', need: 1, w: { phy: .42, def: .28, att: .20, tec: .06, men: .04 } }
    ],
    tactics: {
      mentality: ['Défense 6-0', 'Prudent', 'Équilibré', 'Offensif', 'Kamikaze'],
      pressing: ['Bloc 6-0', 'Bloc 5-1', 'Bloc 3-2-1'],
      style: ['Jeu de pivot', 'Équilibré', 'Tirs de loin']
    },
    economy: {
      clubCost: 4.0e6, gateBase: 1.4e5, sponsorBase: 2.4e5,
      prizeWin: 2.5e5, prizeDraw: 1.4e5, prizeLoss: 5.0e4,
      wageBase: 20000, valueMul: 0.009, tvSeason: 4.0e6,
      flagshipPrice: 4.5e7 /* grand club européen, type THW Kiel / FC Barcelone handball */
    },
    leagueSize: 12,
    countries: ['FRA', 'DEU', 'ESP', 'DNK', 'HUN', 'POL', 'HRV', 'NOR', 'SWE',
      'SVN', 'PRT', 'QAT', 'EGY', 'ISL', 'SRB', 'MNE', 'ROU', 'RUS', 'UKR',
      'BLR', 'TUN', 'MAR', 'ARG', 'BRA', 'JPN', 'KOR', 'AGO', 'CPV', 'ISR',
      'NLD', 'AUT', 'CHE', 'MKD']
  },

  /* --------------------------------------------------- SPORT AUTOMOBILE - */
  {
    id: 'motorsport', name: 'Sport automobile', icon: '🏎️', type: 'race', individual: true,
    unit: 'point', unitPlural: 'points',
    squadSize: 1, lineupSize: 1,
    /* Un pilote unique porte toute la performance humaine ; la voiture est
       ajoutée par-dessus dans G.manager.teamRatings(). On progresse en
       améliorant le pilote ou la voiture, ou en changeant de voiture
       (G.manager.vehicleOptions/changeVehicle) — jamais en rachetant un
       autre pilote. */
    attW: { att: 1.0 }, defW: { att: 1.0 },
    positions: [
      { code: 'P1', name: 'Pilote', role: 'att', need: 1, w: { tec: .34, men: .26, phy: .18, att: .18, def: .04 } }
    ],
    car: [
      { id: 'moteur', name: 'Moteur', icon: '🔧', desc: 'Vitesse de pointe en ligne droite.' },
      { id: 'aero', name: 'Aérodynamique', icon: '🪽', desc: 'Vitesse dans les courbes rapides.' },
      { id: 'chassis', name: 'Châssis', icon: '🛠️', desc: 'Traction et usure des pneus.' },
      { id: 'fiabilite', name: 'Fiabilité', icon: '🧰', desc: 'Réduit le risque d\'abandon.' }
    ],
    /* Changer de véhicule redistribue le même total de développement selon
       un nouveau profil, plutôt que de racheter un pilote : chaque monture
       est spécialisée pour un type de circuit différent. */
    vehicleModels: [
      { id: 'equilibre', name: 'Châssis équilibré', desc: 'Aucune spécialité : polyvalent sur tous les circuits.',
        profile: { moteur: .25, aero: .25, chassis: .25, fiabilite: .25 } },
      { id: 'veloce', name: 'Châssis véloce', desc: 'Moteur et aéro poussés, taillé pour les circuits rapides.',
        profile: { moteur: .34, aero: .34, chassis: .18, fiabilite: .14 } },
      { id: 'appui', name: 'Châssis à appui', desc: 'Aérodynamique dominante, taillé pour les circuits techniques.',
        profile: { moteur: .18, aero: .42, chassis: .28, fiabilite: .12 } },
      { id: 'robuste', name: 'Châssis robuste', desc: 'Traction et fiabilité, taillé pour les circuits urbains et l\'endurance.',
        profile: { moteur: .16, aero: .16, chassis: .38, fiabilite: .30 } }
    ],
    race: {
      laps: 30, grid: 14, pitLoss: 22,
      points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      tyres: [
        { id: 'tendre', name: 'Tendres', pace: 1.9, wear: 2.35 },
        { id: 'medium', name: 'Mediums', pace: 0.9, wear: 1.55 },
        { id: 'dur', name: 'Durs', pace: 0.0, wear: 1.00 },
        { id: 'pluie', name: 'Pluie', pace: -1.5, wear: 1.20, rain: true }
      ]
    },
    tactics: {
      mentality: ['Économie totale', 'Conservateur', 'Équilibré', 'Agressif', 'Attaque permanente'],
      pressing: ['1 arrêt', '2 arrêts', 'Réactif'],
      style: ['Setup vitesse', 'Setup équilibré', 'Setup appui']
    },
    economy: {
      clubCost: 8.0e7, gateBase: 0, sponsorBase: 5.5e6,
      prizeWin: 0, prizeDraw: 0, prizeLoss: 0,
      prizePerPoint: 4.2e5,
      wageBase: 1.2e6, valueMul: 0.9, tvSeason: 6.0e7,
      flagshipPrice: 4.5e9 /* écurie de F1 la plus valorisée, type Ferrari/Mercedes */
    },
    leagueSize: 7,
    countries: ['GBR', 'ITA', 'DEU', 'FRA', 'AUT', 'CHE', 'USA', 'JPN', 'ESP',
      'NLD', 'ARE', 'BRA', 'MEX', 'CAN', 'AUS', 'BEL', 'FIN', 'MCO', 'SGP',
      'BHR', 'QAT', 'SAU', 'AZE', 'THA', 'IDN', 'KOR']
  },

  /* --------------------------------------------------------- VOLLEYBALL - */
  {
    id: 'volleyball', name: 'Volleyball', icon: '🏐', type: 'team',
    unit: 'point', unitPlural: 'points',
    squadSize: 14, lineupSize: 6,
    duration: 60, segments: 20, periods: 5,
    avgEvents: 25, spread: 0.6,
    scoreEvents: [{ label: 'Point', pts: 1, w: 1 }],
    attW: { att: 0.48, mid: 0.32, def: 0.20 },
    defW: { def: 0.46, mid: 0.32, att: 0.22 },
    positions: [
      { code: 'PAS', name: 'Passeur', role: 'mid', need: 1, w: { tec: .36, men: .28, att: .18, phy: .12, def: .06 } },
      { code: 'CEN', name: 'Central', role: 'def', need: 2, w: { phy: .36, def: .30, att: .18, tec: .10, men: .06 } },
      { code: 'REC', name: 'Réceptionneur-attaquant', role: 'att', need: 2, w: { att: .34, tec: .26, phy: .20, men: .12, def: .08 } },
      { code: 'POI', name: 'Pointu', role: 'att', need: 1, w: { att: .42, phy: .24, tec: .20, men: .10, def: .04 } }
    ],
    tactics: {
      mentality: ['Ultra prudent', 'Prudent', 'Équilibré', 'Offensif', 'Tout en attaque'],
      pressing: ['Bloc simple', 'Bloc double', 'Bloc triple'],
      style: ['Jeu au centre', 'Jeu équilibré', 'Jeu sur les ailes']
    },
    economy: {
      clubCost: 2.5e6, gateBase: 1.0e5, sponsorBase: 1.6e5,
      prizeWin: 1.6e5, prizeDraw: 0, prizeLoss: 4.0e4,
      wageBase: 14000, valueMul: 0.005, tvSeason: 2.5e6,
      flagshipPrice: 2.5e7 /* sport confidentiel, grand club type Sada Cruzeiro */
    },
    leagueSize: 12,
    countries: ['BRA', 'ITA', 'POL', 'USA', 'RUS', 'SRB', 'FRA', 'JPN', 'ARG',
      'TUR', 'DEU', 'NLD', 'BEL', 'CHN', 'IRN', 'BGR', 'CUB', 'KOR', 'CAN',
      'SVN', 'CZE', 'UKR', 'ESP', 'GRC', 'MEX', 'EGY', 'TUN', 'DOM', 'FIN']
  },

  /* --------------------------------------------------- HOCKEY SUR GLACE - */
  {
    id: 'hockey', name: 'Hockey sur glace', icon: '🏒', type: 'team',
    unit: 'but', unitPlural: 'buts',
    squadSize: 22, lineupSize: 6,
    duration: 60, segments: 18, periods: 3,
    avgEvents: 6, spread: 1.3,
    scoreEvents: [{ label: 'But', pts: 1, w: 1 }],
    attW: { att: 0.44, mid: 0.34, def: 0.18, gk: 0.04 },
    defW: { gk: 0.30, def: 0.42, mid: 0.24, att: 0.04 },
    positions: [
      { code: 'G', name: 'Gardien', role: 'gk', need: 1, w: { def: .32, men: .28, phy: .18, tec: .18, att: .04 } },
      { code: 'DEF', name: 'Défenseur', role: 'def', need: 2, w: { def: .40, phy: .28, men: .14, tec: .12, att: .06 } },
      { code: 'AIL', name: 'Ailier', role: 'mid', need: 2, w: { tec: .32, att: .28, phy: .22, men: .12, def: .06 } },
      { code: 'CEN', name: 'Centre', role: 'att', need: 1, w: { att: .36, tec: .26, phy: .20, men: .14, def: .04 } }
    ],
    tactics: {
      mentality: ['Ultra défensif', 'Prudent', 'Équilibré', 'Offensif', 'Tout va'],
      pressing: ['Repli défensif', 'Échec avant mixte', 'Forecheck agressif'],
      style: ['Jeu physique', 'Jeu équilibré', 'Jeu de vitesse']
    },
    economy: {
      clubCost: 6.0e6, gateBase: 2.2e5, sponsorBase: 3.2e5,
      prizeWin: 3.0e5, prizeDraw: 1.0e5, prizeLoss: 6.0e4,
      wageBase: 32000, valueMul: 0.64, tvSeason: 6.0e6,
      flagshipPrice: 3.2e9 /* plus grosse franchise NHL, type Toronto Maple Leafs */
    },
    leagueSize: 12,
    countries: ['CAN', 'USA', 'RUS', 'FIN', 'SWE', 'CZE', 'SVK', 'CHE', 'DEU',
      'LVA', 'BLR', 'NOR', 'DNK', 'FRA', 'AUT', 'SVN', 'KAZ', 'ITA', 'GBR',
      'POL', 'JPN', 'KOR', 'CHN', 'HUN']
  },

  /* ------------------------------------------------------------ BASEBALL - */
  {
    id: 'baseball', name: 'Baseball', icon: '⚾', type: 'team',
    unit: 'point', unitPlural: 'points',
    squadSize: 18, lineupSize: 9,
    duration: 120, segments: 18, periods: 9,
    avgEvents: 8, spread: 1.4,
    scoreEvents: [{ label: 'Point', pts: 1, w: 1 }],
    attW: { att: 0.40, mid: 0.36, def: 0.24 },
    defW: { def: 0.50, mid: 0.30, att: 0.20 },
    positions: [
      { code: 'LAN', name: 'Lanceur', role: 'def', need: 1, w: { tec: .34, men: .26, phy: .22, def: .14, att: .04 } },
      { code: 'REC', name: 'Receveur', role: 'def', need: 1, w: { def: .32, men: .26, tec: .22, phy: .16, att: .04 } },
      { code: 'INT', name: 'Intérieur', role: 'mid', need: 4, w: { tec: .30, phy: .24, att: .22, men: .16, def: .08 } },
      { code: 'EXT', name: 'Extérieur', role: 'att', need: 3, w: { att: .36, phy: .26, tec: .20, men: .14, def: .04 } }
    ],
    tactics: {
      mentality: ['Ultra prudent', 'Prudent', 'Équilibré', 'Agressif', 'Tout en attaque'],
      pressing: ['Défense resserrée', 'Défense standard', 'Défense avancée'],
      style: ['Jeu de contact', 'Jeu équilibré', 'Jeu de puissance']
    },
    economy: {
      clubCost: 1.0e7, gateBase: 3.5e5, sponsorBase: 5.0e5,
      prizeWin: 4.5e5, prizeDraw: 0, prizeLoss: 1.0e5,
      wageBase: 45000, valueMul: 1.4, tvSeason: 1.0e7,
      flagshipPrice: 7.0e9 /* plus grosse franchise MLB, type New York Yankees */
    },
    leagueSize: 12,
    countries: ['USA', 'JPN', 'DOM', 'KOR', 'CUB', 'MEX', 'VEN', 'CAN', 'NIC',
      'PAN', 'COL', 'AUS', 'NLD', 'ITA', 'GBR', 'CHN']
  },

  /* --------------------------------------------------- CYCLISME SUR ROUTE */
  {
    id: 'cyclisme', name: 'Cyclisme sur route', icon: '🚴', type: 'race', individual: true,
    unit: 'point', unitPlural: 'points',
    squadSize: 1, lineupSize: 1,
    attW: { att: 1.0 }, defW: { att: 1.0 },
    positions: [
      { code: 'C1', name: 'Coureur', role: 'att', need: 1, w: { phy: .34, men: .26, tec: .18, att: .18, def: .04 } }
    ],
    car: [
      { id: 'moteur', name: 'Puissance', icon: '💪', desc: 'Vitesse de pointe dans les lignes droites et les sprints.' },
      { id: 'aero', name: 'Aérodynamisme', icon: '🪽', desc: 'Vitesse en peloton et dans les descentes.' },
      { id: 'chassis', name: 'Vélo', icon: '🚲', desc: 'Légèreté en montagne et maniabilité.' },
      { id: 'fiabilite', name: 'Récupération', icon: '🧰', desc: 'Réduit le risque de chute ou de défaillance.' }
    ],
    /* Changer de vélo redistribue le même total de développement selon un
       nouveau profil, plutôt que de racheter un coureur : chaque monture est
       spécialisée pour un type d'étape différent. */
    vehicleModels: [
      { id: 'equilibre', name: 'Vélo équilibré', desc: 'Aucune spécialité : polyvalent sur toutes les étapes.',
        profile: { moteur: .25, aero: .25, chassis: .25, fiabilite: .25 } },
      { id: 'veloce', name: 'Vélo de sprint', desc: 'Puissance et aérodynamisme, taillé pour les étapes de plaine.',
        profile: { moteur: .34, aero: .34, chassis: .18, fiabilite: .14 } },
      { id: 'appui', name: 'Vélo de contre-la-montre', desc: 'Aérodynamisme dominant, taillé pour les chronos.',
        profile: { moteur: .18, aero: .42, chassis: .28, fiabilite: .12 } },
      { id: 'robuste', name: 'Vélo de montagne', desc: 'Légèreté et récupération, taillé pour les étapes de montagne.',
        profile: { moteur: .16, aero: .16, chassis: .38, fiabilite: .30 } }
    ],
    race: {
      laps: 24, grid: 16, pitLoss: 18,
      points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      tyres: [
        { id: 'tendre', name: 'Braquet offensif', pace: 1.9, wear: 2.35 },
        { id: 'medium', name: 'Braquet équilibré', pace: 0.9, wear: 1.55 },
        { id: 'dur', name: 'Braquet économique', pace: 0.0, wear: 1.00 },
        { id: 'pluie', name: 'Pluie', pace: -1.5, wear: 1.20, rain: true }
      ]
    },
    tactics: {
      mentality: ['Économie totale', 'Conservateur', 'Équilibré', 'Agressif', 'Attaque permanente'],
      pressing: ['1 ravitaillement', '2 ravitaillements', 'Réactif'],
      style: ['Setup grimpeur', 'Setup équilibré', 'Setup sprinteur']
    },
    economy: {
      clubCost: 1.8e7, gateBase: 0, sponsorBase: 2.0e6,
      prizeWin: 0, prizeDraw: 0, prizeLoss: 0,
      prizePerPoint: 1.2e5,
      wageBase: 3.5e5, valueMul: 0.02, tvSeason: 1.4e7,
      flagshipPrice: 1.0e8 /* plus grosse équipe World Tour, type UAE Team Emirates/Ineos */
    },
    leagueSize: 10,
    countries: ['FRA', 'BEL', 'ITA', 'ESP', 'NLD', 'GBR', 'SVN', 'DNK', 'COL',
      'AUS', 'DEU', 'POL', 'NOR', 'CHE', 'USA', 'KAZ']
  },

  /* ------------------------------------------------------------ TENNIS --- */
  {
    id: 'tennis', name: 'Tennis', icon: '🎾', type: 'team', individual: true,
    unit: 'manche', unitPlural: 'manches',
    squadSize: 1, lineupSize: 1,
    duration: 120, segments: 18, periods: 3,
    avgEvents: 5, spread: 1.2,
    scoreEvents: [{ label: 'Manche remportée', pts: 1, w: 1 }],
    attW: { att: 0.50, mid: 0.34, def: 0.16 },
    defW: { def: 0.46, mid: 0.34, att: 0.20 },
    positions: [
      { code: 'J', name: 'Joueur', role: 'att', need: 1, w: { tec: .335, men: .255, phy: .205, att: .155, def: .05 } }
    ],
    tactics: {
      mentality: ['Ultra défensif', 'Prudent', 'Équilibré', 'Offensif', 'Tout ou rien'],
      pressing: ['Fond de court', 'Polyvalent', 'Monte au filet'],
      style: ['Jeu de patience', 'Jeu équilibré', 'Jeu d\'attaque']
    },
    economy: {
      clubCost: 5.0e6, gateBase: 1.5e5, sponsorBase: 3.0e5,
      prizeWin: 2.0e5, prizeDraw: 0, prizeLoss: 5.0e4,
      wageBase: 40000, valueMul: 0.06, tvSeason: 6.0e6,
      flagshipPrice: 3.0e8 /* plus grosse académie/écurie mondiale, échelle Grand Chelem */
    },
    leagueSize: 12,
    countries: ['ESP', 'USA', 'SRB', 'ITA', 'FRA', 'GBR', 'DEU', 'AUS', 'RUS',
      'ARG', 'CZE', 'JPN', 'CHE', 'CAN', 'GRC', 'POL', 'NOR', 'HRV', 'AUT',
      'BEL', 'NLD', 'BRA', 'CHN', 'KOR', 'DNK', 'HUN', 'ROU', 'UKR', 'TUN',
      'MAR', 'CHL', 'COL', 'URY', 'IND', 'ZAF', 'SWE', 'FIN', 'PRT', 'BIH', 'SVK'],
    divisionNames: ['Grand Chelem', 'Masters 1000', 'ATP/WTA 500', 'ATP/WTA 250',
      'Challenger 175', 'Challenger 125', 'Challenger 100', 'Challenger 75',
      'ITF World Tour M25', 'ITF World Tour M15'],
    divisionTags: ['GC', 'M1000', '500', '250', 'C175', 'C125', 'C100', 'C75', 'M25', 'M15'],
    internationalLabel: 'Coupe Davis / Billie Jean King Cup'
  },

  /* --------------------------------------------------------- BADMINTON --- */
  {
    id: 'badminton', name: 'Badminton', icon: '🏸', type: 'team', individual: true,
    unit: 'manche', unitPlural: 'manches',
    squadSize: 1, lineupSize: 1,
    duration: 60, segments: 15, periods: 3,
    avgEvents: 8, spread: 0.9,
    scoreEvents: [{ label: 'Manche remportée', pts: 1, w: 1 }],
    attW: { att: 0.48, mid: 0.34, def: 0.18 },
    defW: { def: 0.44, mid: 0.34, att: 0.22 },
    positions: [
      { code: 'J', name: 'Joueur', role: 'att', need: 1, w: { tec: .32, men: .228, phy: .24, att: .156, def: .056 } }
    ],
    tactics: {
      mentality: ['Défensif', 'Prudent', 'Équilibré', 'Offensif', 'Rythme maximal'],
      pressing: ['Repli fond de court', 'Polyvalent', 'Monte au filet'],
      style: ['Jeu long', 'Jeu équilibré', 'Jeu de vitesse']
    },
    economy: {
      clubCost: 1.5e6, gateBase: 5.0e4, sponsorBase: 8.0e4,
      prizeWin: 6.0e4, prizeDraw: 0, prizeLoss: 1.5e4,
      wageBase: 12000, valueMul: 0.003, tvSeason: 1.5e6,
      flagshipPrice: 1.5e7 /* plus grand club/académie du BWF World Tour */
    },
    leagueSize: 10,
    countries: ['CHN', 'IDN', 'JPN', 'DNK', 'KOR', 'MYS', 'IND', 'THA', 'ESP',
      'FRA', 'GBR', 'DEU', 'SGP', 'NLD', 'CAN', 'USA', 'RUS', 'TUR', 'POL',
      'CHE', 'AUT', 'BEL', 'SWE', 'FIN', 'NOR', 'BRA', 'MEX', 'EGY', 'NGA', 'ZAF'],
    divisionNames: ['Super 1000', 'Super 750', 'Super 500', 'Super 300', 'Super 100',
      'Challenge international', 'Série internationale', 'Future Series',
      'Circuit national', 'Circuit régional'],
    divisionTags: ['S1000', 'S750', 'S500', 'S300', 'S100', 'Chall.', 'Série', 'Future', 'National', 'Régional'],
    internationalLabel: 'Coupe Thomas / Coupe Uber'
  },

  /* ------------------------------------------------------------ SQUASH --- */
  {
    id: 'squash', name: 'Squash', icon: '🥍', type: 'team', individual: true,
    unit: 'manche', unitPlural: 'manches',
    squadSize: 1, lineupSize: 1,
    duration: 45, segments: 12, periods: 5,
    avgEvents: 10, spread: 0.8,
    scoreEvents: [{ label: 'Manche remportée', pts: 1, w: 1 }],
    attW: { att: 0.50, mid: 0.32, def: 0.18 },
    defW: { def: 0.48, mid: 0.32, att: 0.20 },
    positions: [
      { code: 'J', name: 'Joueur', role: 'att', need: 1, w: { tec: .3133, men: .24, phy: .26, att: .12, def: .0667 } }
    ],
    tactics: {
      mentality: ['Ultra défensif', 'Prudent', 'Équilibré', 'Offensif', 'Kamikaze'],
      pressing: ['Repli sur le T', 'Polyvalent', 'Prend le T de force'],
      style: ['Jeu long', 'Jeu équilibré', 'Jeu d\'accélération']
    },
    economy: {
      clubCost: 8.0e5, gateBase: 2.5e4, sponsorBase: 4.0e4,
      prizeWin: 3.0e4, prizeDraw: 0, prizeLoss: 1.0e4,
      wageBase: 8000, valueMul: 0.001, tvSeason: 8.0e5,
      flagshipPrice: 5.0e6 /* sport confidentiel, plus grand club du PSA World Tour */
    },
    leagueSize: 8,
    countries: ['EGY', 'GBR', 'MYS', 'FRA', 'NZL', 'PAK', 'DEU', 'USA', 'IND',
      'AUS', 'COL', 'NLD', 'CHE', 'CAN', 'ESP'],
    divisionNames: ['Championnat du monde', 'PSA Platinum', 'PSA Gold', 'PSA Silver',
      'PSA Bronze', 'Challenger 30', 'Challenger 20', 'Challenger 15',
      'Challenger 10', 'Challenger 5'],
    divisionTags: ['Mondial', 'Plat.', 'Gold', 'Silver', 'Bronze', 'C30', 'C20', 'C15', 'C10', 'C5'],
    internationalLabel: 'Championnat du monde par équipes'
  },

  /* -------------------------------------------------- TENNIS DE TABLE --- */
  {
    id: 'tennisdetable', name: 'Tennis de table', icon: '🏓', type: 'team', individual: true,
    unit: 'manche', unitPlural: 'manches',
    squadSize: 1, lineupSize: 1,
    duration: 30, segments: 12, periods: 5,
    avgEvents: 14, spread: 0.7,
    scoreEvents: [{ label: 'Manche remportée', pts: 1, w: 1 }],
    attW: { att: 0.48, mid: 0.34, def: 0.18 },
    defW: { def: 0.46, mid: 0.34, att: 0.20 },
    positions: [
      { code: 'J', name: 'Joueur', role: 'att', need: 1, w: { tec: .345, men: .23, phy: .19, att: .16, def: .075 } }
    ],
    tactics: {
      mentality: ['Défensif', 'Prudent', 'Équilibré', 'Offensif', 'Tout en attaque'],
      pressing: ['Recul de table', 'Mi-distance', 'Collé à la table'],
      style: ['Jeu de défense', 'Jeu équilibré', 'Jeu de vitesse']
    },
    economy: {
      clubCost: 1.0e6, gateBase: 3.0e4, sponsorBase: 5.0e4,
      prizeWin: 4.0e4, prizeDraw: 0, prizeLoss: 1.2e4,
      wageBase: 9000, valueMul: 0.0016, tvSeason: 1.0e6,
      flagshipPrice: 8.0e6 /* sport confidentiel, plus grand club du WTT */
    },
    leagueSize: 10,
    countries: ['CHN', 'JPN', 'KOR', 'DEU', 'SWE', 'FRA', 'PRT', 'BRA', 'SGP',
      'HRV', 'ROU', 'NGA', 'EGY', 'USA', 'IND', 'POL', 'AUT', 'CHE', 'DNK', 'ESP'],
    divisionNames: ['WTT Grand Smash', 'WTT Champions', 'WTT Star Contender', 'WTT Contender',
      'WTT Feeder', 'Open national élite', 'Circuit régional', 'Circuit départemental',
      'Critérium fédéral', 'Circuit amateur'],
    divisionTags: ['Smash', 'Champ.', 'Star', 'Cont.', 'Feeder', 'Élite', 'Région', 'Dépt', 'Crit.', 'Amateur'],
    internationalLabel: 'Coupe Swaythling / Coupe Corbillon'
  },

  /* ------------------------------------------------------------- PADEL --- */
  {
    id: 'padel', name: 'Padel', icon: '🥎', type: 'team', individual: true,
    unit: 'manche', unitPlural: 'manches',
    squadSize: 1, lineupSize: 1,
    duration: 90, segments: 14, periods: 3,
    avgEvents: 6, spread: 1.0,
    scoreEvents: [{ label: 'Manche remportée', pts: 1, w: 1 }],
    attW: { att: 0.46, mid: 0.34, def: 0.20 },
    defW: { def: 0.44, mid: 0.34, att: 0.22 },
    positions: [
      { code: 'J', name: 'Joueur', role: 'att', need: 1, w: { tec: .31, men: .23, phy: .22, att: .16, def: .08 } }
    ],
    tactics: {
      mentality: ['Ultra défensif', 'Prudent', 'Équilibré', 'Offensif', 'Tout au filet'],
      pressing: ['Fond de court', 'Polyvalent', 'Monte au filet'],
      style: ['Jeu de contre', 'Jeu équilibré', 'Jeu de vitres']
    },
    economy: {
      clubCost: 2.0e6, gateBase: 6.0e4, sponsorBase: 1.0e5,
      prizeWin: 7.0e4, prizeDraw: 0, prizeLoss: 2.0e4,
      wageBase: 15000, valueMul: 0.004, tvSeason: 2.0e6,
      flagshipPrice: 2.0e7 /* sport en pleine expansion, plus grand club de Premier Padel */
    },
    leagueSize: 8,
    countries: ['ESP', 'ARG', 'ITA', 'FRA', 'PRT', 'SWE', 'BEL', 'MEX', 'BRA',
      'QAT', 'USA', 'NLD', 'CHL', 'AND'],
    divisionNames: ['Premier Padel Major', 'Premier Padel P1', 'Premier Padel P2',
      'World Padel Tour Open', 'Challenger international', 'Open international',
      'Circuit national élite', 'Circuit national', 'Circuit régional', 'Circuit départemental'],
    divisionTags: ['Major', 'P1', 'P2', 'WPT', 'Chall.', 'Open', 'Nat. élite', 'National', 'Régional', 'Départ.'],
    internationalLabel: 'Championnat du monde par équipes'
  }
];

G.DATA.sportById = (function () {
  var m = {};
  for (var i = 0; i < G.DATA.sports.length; i++) m[G.DATA.sports[i].id] = G.DATA.sports[i];
  return m;
})();

/* Installations améliorables, communes à tous les clubs. */
G.DATA.facilities = [
  {
    id: 'stade', name: 'Enceinte', icon: '🏟️',
    desc: 'Capacité et confort : billetterie et revenus les jours de match.',
    baseCost: 1.0, effect: 'Recettes de match +12 % par niveau'
  },
  {
    id: 'entrainement', name: 'Centre d\'entraînement', icon: '🎯',
    desc: 'Progression des joueurs et récupération entre les matchs.',
    baseCost: 0.8, effect: 'Progression et récupération accélérées'
  },
  {
    id: 'formation', name: 'Centre de formation', icon: '🌱',
    desc: 'Fait éclore de jeunes talents à la fin de chaque saison.',
    baseCost: 0.9, effect: 'Jeunes pousses de meilleur niveau'
  },
  {
    id: 'medical', name: 'Pôle médical', icon: '⚕️',
    desc: 'Réduit la fréquence et la durée des blessures.',
    baseCost: 0.6, effect: 'Risque de blessure -10 % par niveau'
  },
  {
    id: 'marketing', name: 'Direction marketing', icon: '📣',
    desc: 'Négocie les contrats sponsors et le merchandising.',
    baseCost: 0.7, effect: 'Revenus sponsors +15 % par niveau'
  }
];

/* Personnel d'encadrement. */
G.DATA.staffRoles = [
  { id: 'coach', name: 'Entraîneur principal', icon: '📋', effect: 'Bonus tactique en match' },
  { id: 'adjoint', name: 'Préparateur physique', icon: '💪', effect: 'Endurance des joueurs' },
  { id: 'scout', name: 'Recruteur en chef', icon: '🔍', effect: 'Qualité des joueurs proposés' },
  { id: 'medecin', name: 'Médecin de club', icon: '🩺', effect: 'Guérison des blessures' }
];
