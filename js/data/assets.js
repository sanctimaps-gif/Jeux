/* Actifs d'investissement hors actions : immobilier et cryptomonnaies. */
window.G = window.G || {};
G.DATA = G.DATA || {};

/* ============================================================ IMMOBILIER == */

/* rent : loyer horaire au niveau 1, exprimé en fraction du prix d'achat.
 * Un rendement de 0.00012/h ≈ 1 % du prix par jour de jeu. */
G.DATA.propertyTypes = [
  { id: 'studio', name: 'Studio étudiant', icon: '🛏️', price: 90000, yield: 0.00060, maxLvl: 5,
    desc: 'Petite surface, forte demande, rotation rapide des locataires.' },
  { id: 'appart', name: 'Appartement familial', icon: '🏠', price: 320000, yield: 0.00055, maxLvl: 6,
    desc: 'Trois pièces bien situées, locataires stables.' },
  { id: 'maison', name: 'Maison avec jardin', icon: '🏡', price: 850000, yield: 0.00050, maxLvl: 6,
    desc: 'Périphérie recherchée, plus-value à long terme.' },
  { id: 'immeuble', name: 'Petit immeuble de rapport', icon: '🏘️', price: 4.5e6, yield: 0.00058, maxLvl: 8,
    desc: 'Huit lots, un seul acte notarié.' },
  { id: 'commerce', name: 'Local commercial', icon: '🏪', price: 1.6e7, yield: 0.00065, maxLvl: 8,
    desc: 'Bail commercial ferme de neuf ans.' },
  { id: 'bureaux', name: 'Plateau de bureaux', icon: '🏢', price: 8.0e7, yield: 0.00062, maxLvl: 10,
    desc: 'Quartier d\'affaires, locataires solvables.' },
  { id: 'hotelp', name: 'Hôtel de luxe', icon: '🏨', price: 4.0e8, yield: 0.00070, maxLvl: 10,
    desc: 'Palace saisonnier : rendement élevé, entretien coûteux.' },
  { id: 'mall', name: 'Centre commercial', icon: '🛍️', price: 1.8e9, yield: 0.00066, maxLvl: 12,
    desc: 'Deux cents enseignes et un parking de six mille places.' },
  { id: 'tour', name: 'Tour signature', icon: '🌆', price: 9.0e9, yield: 0.00060, maxLvl: 12,
    desc: 'Soixante étages qui redessinent la ligne d\'horizon.' },
  { id: 'quartier', name: 'Quartier entier', icon: '🌇', price: 6.0e10, yield: 0.00058, maxLvl: 14,
    desc: 'Un morceau de ville : logements, bureaux, commerces.' }
];

/* Villes : chacune a sa prime de prix et son propre cycle de marché. */
G.DATA.cities = [
  { id: 'paris', name: 'Paris', flag: '🇫🇷', mult: 1.55, vol: 0.011 },
  { id: 'london', name: 'Londres', flag: '🇬🇧', mult: 1.65, vol: 0.013 },
  { id: 'newyork', name: 'New York', flag: '🇺🇸', mult: 1.90, vol: 0.014 },
  { id: 'tokyo', name: 'Tokyo', flag: '🇯🇵', mult: 1.35, vol: 0.010 },
  { id: 'dubai', name: 'Dubaï', flag: '🇦🇪', mult: 1.45, vol: 0.021 },
  { id: 'berlin', name: 'Berlin', flag: '🇩🇪', mult: 1.10, vol: 0.012 },
  { id: 'madrid', name: 'Madrid', flag: '🇪🇸', mult: 0.90, vol: 0.013 },
  { id: 'lisbonne', name: 'Lisbonne', flag: '🇵🇹', mult: 0.80, vol: 0.015 },
  { id: 'singapour', name: 'Singapour', flag: '🇸🇬', mult: 1.75, vol: 0.012 },
  { id: 'saopaulo', name: 'São Paulo', flag: '🇧🇷', mult: 0.65, vol: 0.019 },
  { id: 'lemans', name: 'Le Mans', flag: '🇫🇷', mult: 0.55, vol: 0.009 },
  { id: 'miami', name: 'Miami', flag: '🇺🇸', mult: 1.30, vol: 0.017 }
];

G.DATA.propertyNews = [
  { txt: 'Nouvelle ligne de métro annoncée à {v}', impact: 0.06 },
  { txt: 'Encadrement des loyers voté à {v}', impact: -0.05 },
  { txt: 'Afflux d\'expatriés à {v} : tension sur le marché', impact: 0.07 },
  { txt: 'Grand chantier de rénovation urbaine à {v}', impact: 0.05 },
  { txt: 'Hausse de la taxe foncière à {v}', impact: -0.04 },
  { txt: 'Départ d\'un siège social majeur de {v}', impact: -0.07 }
];

/* ========================================================= CRYPTOMONNAIES = */

/* Volatilité quotidienne bien supérieure aux actions, et pas de dividende :
 * on gagne (ou on perd) uniquement sur le cours, sauf en staking. */
G.DATA.cryptos = [
  { id: 'BTC', name: 'Bitcorn', icon: '₿', p0: 64000, drift: 0.0022, vol: 0.045, stake: 0 },
  { id: 'ETR', name: 'Etheria', icon: '◈', p0: 3200, drift: 0.0025, vol: 0.055, stake: 0.04 },
  { id: 'SLN', name: 'Solunar', icon: '◎', p0: 145, drift: 0.0030, vol: 0.075, stake: 0.06 },
  { id: 'CRD', name: 'Cardova', icon: '₳', p0: 0.62, drift: 0.0018, vol: 0.070, stake: 0.05 },
  { id: 'XRN', name: 'Xerion', icon: '✕', p0: 0.58, drift: 0.0015, vol: 0.068, stake: 0.03 },
  { id: 'DGC', name: 'Dogecorn', icon: '🐕', p0: 0.14, drift: 0.0010, vol: 0.110, stake: 0 },
  { id: 'AVL', name: 'Avalon', icon: '▲', p0: 38, drift: 0.0026, vol: 0.080, stake: 0.07 },
  { id: 'PLK', name: 'Polkanet', icon: '●', p0: 7.4, drift: 0.0016, vol: 0.072, stake: 0.09 },
  { id: 'MNC', name: 'Moonchain', icon: '🌙', p0: 0.0009, drift: 0.0065, vol: 0.130, stake: 0 },
  { id: 'STB', name: 'Stabilis', icon: '⬢', p0: 1.00, drift: 0.0000, vol: 0.002, stake: 0.08 }
];

G.DATA.cryptoNews = [
  { txt: '{n} adopté comme moyen de paiement par un grand distributeur', impact: 0.16 },
  { txt: 'Un fonds souverain entre au capital de {n}', impact: 0.22 },
  { txt: 'Mise à jour majeure du protocole {n}', impact: 0.13 },
  { txt: 'Le régulateur ouvre une enquête sur {n}', impact: -0.24 },
  { txt: 'Piratage d\'une plateforme : {n} décroche', impact: -0.30 },
  { txt: 'Un influenceur relance la spéculation sur {n}', impact: 0.19 },
  { txt: 'Liquidations en cascade sur {n}', impact: -0.21 },
  { txt: 'Un pays interdit le minage de {n}', impact: -0.17 }
];

/* ============================================== FORTUNES DE RÉFÉRENCE ===== */

/* Ordres de grandeur publics (milliards de dollars, milieu des années 2020),
 * utilisés uniquement comme échelle de comparaison dans le jeu. */
G.DATA.richList = [
  { name: 'Elon Musk', src: 'Tesla, SpaceX', w: 240e9 },
  { name: 'Bernard Arnault', src: 'LVMH', w: 190e9 },
  { name: 'Jeff Bezos', src: 'Amazon', w: 180e9 },
  { name: 'Mark Zuckerberg', src: 'Meta', w: 170e9 },
  { name: 'Larry Ellison', src: 'Oracle', w: 150e9 },
  { name: 'Warren Buffett', src: 'Berkshire Hathaway', w: 135e9 },
  { name: 'Larry Page', src: 'Google', w: 130e9 },
  { name: 'Sergey Brin', src: 'Google', w: 125e9 },
  { name: 'Bill Gates', src: 'Microsoft', w: 115e9 },
  { name: 'Steve Ballmer', src: 'Microsoft', w: 110e9 },
  { name: 'Mukesh Ambani', src: 'Reliance', w: 100e9 },
  { name: 'Michael Dell', src: 'Dell', w: 95e9 },
  { name: 'Gautam Adani', src: 'Adani Group', w: 85e9 },
  { name: 'Françoise Bettencourt Meyers', src: 'L\'Oréal', w: 80e9 },
  { name: 'Carlos Slim', src: 'América Móvil', w: 80e9 },
  { name: 'Amancio Ortega', src: 'Zara', w: 75e9 },
  { name: 'Jensen Huang', src: 'NVIDIA', w: 70e9 },
  { name: 'Michael Bloomberg', src: 'Bloomberg LP', w: 60e9 },
  { name: 'Jim Walton', src: 'Walmart', w: 60e9 },
  { name: 'Zhong Shanshan', src: 'Nongfu Spring', w: 55e9 }
];

/* Repères non individuels, pour situer les très grandes fortunes du jeu. */
G.DATA.wealthMarks = [
  { name: 'Salaire médian annuel (France)', w: 24000 },
  { name: 'Prix moyen d\'une maison', w: 280000 },
  { name: 'Millionnaire', w: 1e6 },
  { name: 'Cent millions', w: 1e8 },
  { name: 'Milliardaire', w: 1e9 },
  { name: 'Valeur d\'un grand club de football', w: 5e9 },
  { name: 'Budget annuel d\'une ville comme Paris', w: 1.1e10 },
  { name: 'Fortune combinée du top 20 mondial', w: 2.2e12 },
  { name: 'PIB de la France', w: 3.1e12 },
  { name: 'Capitalisation de la plus grosse entreprise cotée', w: 3.5e12 },
  { name: 'PIB des États-Unis', w: 2.7e13 },
  { name: 'PIB mondial', w: 1.05e14 }
];
