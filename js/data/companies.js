/* Catalogue des entreprises que l'on peut fonder.
 *
 * On choisit un type dans ce catalogue, on lui donne le nom que l'on veut,
 * puis on investit dedans niveau par niveau. Les revenus sont exprimés par
 * heure et versés automatiquement chaque minute.
 *
 * cost      : capital nécessaire pour fonder l'entreprise
 * rev       : revenu BRUT horaire au niveau 1, calé sur le chiffre d'affaires
 *             mensuel réel d'une entreprise comparable (rev = CA mensuel réel / 24) :
 *             en 24h de jeu, on gagne ce qu'une vraie entreprise de ce type
 *             gagne en un mois.
 * maxLvl    : nombre de paliers d'investissement possibles
 * up        : facteur de coût du 1er palier (× cost)
 * wageShare : part du revenu brut reversée en salaires (charge réaliste par
 *             secteur), déduite avant versement du revenu net au joueur.
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

G.DATA.sectors = {
  commerce: { name: 'Commerce', icon: '🛒', wageShare: 0.14 },
  resto: { name: 'Restauration', icon: '🍽️', wageShare: 0.32 },
  sport: { name: 'Sport & Loisirs', icon: '🏟️', wageShare: 0.25 },
  immo: { name: 'Immobilier', icon: '🏢', wageShare: 0.30 },
  tech: { name: 'Technologie', icon: '💾', wageShare: 0.36 },
  indus: { name: 'Industrie', icon: '⚙️', wageShare: 0.20 },
  sante: { name: 'Santé', icon: '💊', wageShare: 0.38 },
  transport: { name: 'Transport', icon: '🛫', wageShare: 0.28 },
  finance: { name: 'Finance', icon: '💰', wageShare: 0.38 },
  energie: { name: 'Énergie', icon: '🔋', wageShare: 0.10 },
  media: { name: 'Médias', icon: '📺', wageShare: 0.28 },
  agro: { name: 'Agroalimentaire', icon: '🌾', wageShare: 0.20 }
};

G.DATA.companyTypes = [
  /* ------------------------------------------------------- démarrage --- */
  { id: 'kiosque', name: 'Kiosque à journaux', icon: '🗞️', sector: 'media',
    cost: 250, rev: 208, maxLvl: 10, up: 0.35,
    desc: 'Presse, confiseries et tickets de loterie. Le premier pas.' },
  { id: 'foodtruck', name: 'Food truck', icon: '🚚', sector: 'resto',
    cost: 2000, rev: 417, maxLvl: 10, up: 0.35,
    desc: 'Cuisine de rue sur les places de marché et les festivals.' },
  { id: 'coiffeur', name: 'Salon de coiffure', icon: '💈', sector: 'commerce',
    cost: 9000, rev: 625, maxLvl: 12, up: 0.35,
    desc: 'Clientèle fidèle, rendez-vous pris trois semaines à l\'avance.' },
  { id: 'laverie', name: 'Laverie automatique', icon: '🧺', sector: 'commerce',
    cost: 35000, rev: 292, maxLvl: 12, up: 0.34,
    desc: 'Machine à cash discrète qui tourne toute la nuit.' },

  /* --------------------------------------------------------- commerce --- */
  { id: 'mode', name: 'Boutique de mode', icon: '👗', sector: 'commerce',
    cost: 120000, rev: 1250, maxLvl: 15, up: 0.34,
    desc: 'Collections capsules et vitrines très soignées.' },
  { id: 'superette', name: 'Supérette de quartier', icon: '🏪', sector: 'commerce',
    cost: 400000, rev: 4167, maxLvl: 18, up: 0.33,
    desc: 'Ouvert sept jours sur sept, marges faibles mais volume constant.' },
  { id: 'resto', name: 'Restaurant gastronomique', icon: '🍽️', sector: 'resto',
    cost: 1.3e6, rev: 7500, maxLvl: 18, up: 0.33,
    desc: 'Un chef ambitieux, une étoile en ligne de mire.' },
  { id: 'brasserie', name: 'Brasserie artisanale', icon: '🍺', sector: 'agro',
    cost: 3.0e6, rev: 11667, maxLvl: 20, up: 0.33,
    desc: 'Houblon local, canettes design, distribution nationale.' },

  /* ------------------------------------------------- flottes de véhicules */
  { id: 'taxis', name: 'Compagnie de taxis', icon: '🚕', sector: 'transport',
    cost: 8000,
    desc: 'Une flotte de taxis qui roule jour et nuit. On achète les véhicules un par un.',
    fleet: {
      baseCapacity: 5,
      capSteps: [{ n: 5, cost: 15000 }, { n: 10, cost: 40000 }, { n: 20, cost: 100000 }],
      categories: [
        { id: 'standard', name: 'Berline standard', icon: '🚖', baseCost: 15000, rev: 208, costMult: 1.13 },
        { id: 'premium', name: 'Berline premium (VTC)', icon: '🚘', baseCost: 55000, rev: 333, costMult: 1.15 }
      ]
    }
  },
  { id: 'routier', name: 'Transport routier', icon: '🚚', sector: 'transport',
    cost: 20000,
    desc: 'Fourgons urbains et poids lourds longue distance, achetés un par un.',
    fleet: {
      baseCapacity: 5,
      capSteps: [{ n: 5, cost: 30000 }, { n: 10, cost: 80000 }, { n: 20, cost: 200000 }],
      categories: [
        { id: 'ville', name: 'Fourgon urbain', icon: '🚐', baseCost: 30000, rev: 417, costMult: 1.13 },
        { id: 'longue', name: 'Poids lourd', icon: '🚛', baseCost: 110000, rev: 1042, costMult: 1.15 }
      ]
    }
  },
  { id: 'maritime', name: 'Compagnie maritime', icon: '⛴️', sector: 'transport',
    cost: 150000,
    desc: 'Vedettes côtières et cargos : un investissement lourd, mais très rentable.',
    fleet: {
      baseCapacity: 4,
      capSteps: [{ n: 4, cost: 150000 }, { n: 8, cost: 400000 }, { n: 16, cost: 1000000 }],
      categories: [
        { id: 'cotier', name: 'Vedette côtière', icon: '🚤', baseCost: 250000, rev: 1667, costMult: 1.16 },
        { id: 'cargo', name: 'Cargo', icon: '🚢', baseCost: 1400000, rev: 18750, costMult: 1.18 }
      ]
    }
  },
  { id: 'aerienflotte', name: 'Aviation régionale', icon: '🛩️', sector: 'transport',
    cost: 700000,
    desc: 'Court-courriers et long-courriers achetés un par un, avec un tarmac à agrandir.',
    fleet: {
      baseCapacity: 4,
      capSteps: [{ n: 4, cost: 2.5e6 }, { n: 8, cost: 7.0e6 }, { n: 16, cost: 1.8e7 }],
      categories: [
        { id: 'courtcourrier', name: 'Court-courrier', icon: '🛬', baseCost: 1.2e6, rev: 83333, costMult: 1.15 },
        { id: 'longcourrier', name: 'Long-courrier', icon: '🛫', baseCost: 8.0e6, rev: 333333, costMult: 1.17 }
      ]
    }
  },
  { id: 'metro', name: 'Réseau de métro', icon: '🚇', sector: 'transport',
    cost: 1600000,
    desc: 'Concession d\'exploitation d\'un métro urbain : rames achetées une par une.',
    fleet: {
      baseCapacity: 6,
      capSteps: [{ n: 6, cost: 6.0e6 }, { n: 12, cost: 1.6e7 }, { n: 24, cost: 4.0e7 }],
      categories: [
        { id: 'rame', name: 'Rame standard', icon: '🚈', baseCost: 3.0e6, rev: 22917, costMult: 1.14 },
        { id: 'ramegc', name: 'Rame grande capacité', icon: '🚟', baseCost: 9.0e6, rev: 47917, costMult: 1.16 }
      ]
    }
  },

  /* ------------------------------------------------------- services ---- */
  { id: 'salle', name: 'Salle de sport', icon: '🏋️', sector: 'sport',
    cost: 4.0e6, rev: 8333, maxLvl: 20, up: 0.32,
    desc: 'Abonnements annuels signés en janvier, rarement utilisés.' },
  { id: 'agence', name: 'Agence immobilière', icon: '🏠', sector: 'immo', wageShare: 0.42,
    cost: 1.2e7, rev: 5000, maxLvl: 22, up: 0.32,
    desc: 'Commissions confortables sur chaque transaction.' },
  { id: 'avocats', name: 'Cabinet d\'avocats', icon: '⚖️', sector: 'finance', wageShare: 0.50,
    cost: 3.8e7, rev: 20833, maxLvl: 25, up: 0.32,
    desc: 'Facturation à l\'heure, dossiers interminables.' },
  { id: 'hotel', name: 'Chaîne hôtelière', icon: '🏨', sector: 'immo',
    cost: 7.0e7, rev: 62500, maxLvl: 25, up: 0.31,
    desc: 'Quatre étoiles, taux d\'occupation soigneusement optimisé.' },

  /* ---------------------------------------------- fusion d'entreprises -- */
  { id: 'petitcommerce', name: 'Empire du Quartier', icon: '🏘️', sector: 'commerce',
    cost: 45000, rev: 2292, maxLvl: 12, up: 0.34,
    desc: 'Naît de la fusion d\'un kiosque, d\'un food truck et d\'un salon de coiffure.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'kiosque', lvl: 8, label: 'Kiosque à journaux niveau 8' },
      { kind: 'companyLevel', type: 'foodtruck', lvl: 8, label: 'Food truck niveau 8' },
      { kind: 'companyLevel', type: 'coiffeur', lvl: 6, label: 'Salon de coiffure niveau 6' }
    ] },
  { id: 'empiredistrib', name: 'Empire de la Grande Distribution', icon: '🏬', sector: 'commerce',
    cost: 1.6e6, rev: 125000, maxLvl: 18, up: 0.33,
    desc: 'Naît de la fusion d\'une supérette, d\'une laverie et d\'une flotte de taxis pour la livraison.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'superette', lvl: 12, label: 'Supérette de quartier niveau 12' },
      { kind: 'companyLevel', type: 'laverie', lvl: 10, label: 'Laverie automatique niveau 10' },
      { kind: 'fleetVehicles', fleet: 'taxis', category: 'standard', n: 6, label: '6 berlines standard' }
    ] },
  { id: 'conglotextile', name: 'Empire du Textile', icon: '👕', sector: 'commerce',
    cost: 3.5e6, rev: 416667, maxLvl: 20, up: 0.32,
    desc: 'Naît de la fusion d\'une boutique de mode, d\'une supérette et d\'une flotte de transport.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'mode', lvl: 10, label: 'Boutique de mode niveau 10' },
      { kind: 'companyLevel', type: 'superette', lvl: 8, label: 'Supérette de quartier niveau 8' },
      { kind: 'fleetVehicles', fleet: 'routier', category: 'ville', n: 4, label: '4 fourgons urbains' },
      { kind: 'fleetVehicles', fleet: 'routier', category: 'longue', n: 2, label: '2 poids lourds' }
    ] },
  { id: 'grouperesto', name: 'Groupe Hôtelier & Restauration', icon: '🍾', sector: 'resto',
    cost: 1.5e8, rev: 833333, maxLvl: 25, up: 0.31,
    desc: 'Naît de la fusion d\'un restaurant gastronomique, d\'une brasserie artisanale et d\'une chaîne hôtelière.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'resto', lvl: 15, label: 'Restaurant gastronomique niveau 15' },
      { kind: 'companyLevel', type: 'brasserie', lvl: 12, label: 'Brasserie artisanale niveau 12' },
      { kind: 'companyLevel', type: 'hotel', lvl: 12, label: 'Chaîne hôtelière niveau 12' }
    ] },
  { id: 'groupemobilite', name: 'Groupe de Mobilité Urbaine', icon: '🚉', sector: 'transport',
    cost: 2.2e7, rev: 625000, maxLvl: 22, up: 0.32,
    desc: 'Naît de la fusion d\'une flotte de taxis premium, d\'un réseau de métro et de fourgons urbains.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'fleetVehicles', fleet: 'taxis', category: 'premium', n: 5, label: '5 berlines premium (VTC)' },
      { kind: 'fleetVehicles', fleet: 'metro', category: 'rame', n: 4, label: '4 rames de métro' },
      { kind: 'fleetVehicles', fleet: 'routier', category: 'ville', n: 6, label: '6 fourgons urbains' }
    ] },

  /* ------------------------------------------------------------ tech --- */
  { id: 'studio', name: 'Studio de jeux vidéo', icon: '🎮', sector: 'tech',
    cost: 1.1e8, rev: 208333, maxLvl: 28, up: 0.31,
    desc: 'Un succès surprise finance les cinq échecs suivants.' },
  { id: 'saas', name: 'Éditeur de logiciels', icon: '💻', sector: 'tech',
    cost: 2.0e8, rev: 416667, maxLvl: 30, up: 0.31,
    desc: 'Abonnement mensuel, marge brute indécente.' },
  { id: 'clinique', name: 'Clinique privée', icon: '🏥', sector: 'sante',
    cost: 3.2e8, rev: 625000, maxLvl: 30, up: 0.30,
    desc: 'Dépassements d\'honoraires et chambres particulières.' },
  { id: 'labo', name: 'Laboratoire pharmaceutique', icon: '🧪', sector: 'sante',
    cost: 6.0e8, rev: 1666667, maxLvl: 32, up: 0.30,
    desc: 'Un brevet bien placé vaut mieux qu\'une usine.' },
  { id: 'empiremedia', name: 'Empire des Médias', icon: '🎬', sector: 'media',
    cost: 5.5e8, rev: 2291667, maxLvl: 30, up: 0.30,
    desc: 'Naît de la fusion d\'une chaîne de télévision, d\'un éditeur de logiciels et d\'un studio de jeux vidéo.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'tv', lvl: 20, label: 'Chaîne de télévision niveau 20' },
      { kind: 'companyLevel', type: 'saas', lvl: 18, label: 'Éditeur de logiciels niveau 18' },
      { kind: 'companyLevel', type: 'studio', lvl: 18, label: 'Studio de jeux vidéo niveau 18' }
    ] },
  { id: 'groupesante', name: 'Groupe Santé International', icon: '🩺', sector: 'sante',
    cost: 1.1e9, rev: 6250000, maxLvl: 32, up: 0.30,
    desc: 'Naît de la fusion d\'une clinique privée, d\'un laboratoire pharmaceutique et d\'une salle de sport.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'clinique', lvl: 20, label: 'Clinique privée niveau 20' },
      { kind: 'companyLevel', type: 'labo', lvl: 18, label: 'Laboratoire pharmaceutique niveau 18' },
      { kind: 'companyLevel', type: 'salle', lvl: 15, label: 'Salle de sport niveau 15' }
    ] },

  /* -------------------------------------------------------- industrie -- */
  { id: 'usine', name: 'Usine robotisée', icon: '🏭', sector: 'indus',
    cost: 9.0e8, rev: 2500000, maxLvl: 35, up: 0.30,
    desc: 'Production continue, zéro pause déjeuner.' },
  { id: 'tv', name: 'Chaîne de télévision', icon: '📺', sector: 'media',
    cost: 2.6e9, rev: 8333333, maxLvl: 35, up: 0.29,
    desc: 'Audience, publicité et droits sportifs.' },
  { id: 'aerien', name: 'Compagnie aérienne', icon: '✈️', sector: 'transport',
    cost: 7.0e9, rev: 29166667, maxLvl: 38, up: 0.29,
    desc: 'Long-courriers pleins, bagages en supplément.' },
  { id: 'auto', name: 'Constructeur automobile', icon: '🚗', sector: 'indus',
    cost: 2.0e10, rev: 125000000, maxLvl: 40, up: 0.29,
    desc: 'Chaînes de montage sur trois continents.' },
  { id: 'groupeaeroport', name: 'Groupe Aéroportuaire', icon: '🛫', sector: 'transport',
    cost: 1.0e10, rev: 62500000, maxLvl: 38, up: 0.29,
    desc: 'Naît de la fusion d\'une aviation régionale, d\'une compagnie aérienne et d\'une chaîne hôtelière.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'fleetVehicles', fleet: 'aerienflotte', category: 'longcourrier', n: 4, label: '4 long-courriers' },
      { kind: 'companyLevel', type: 'aerien', lvl: 20, label: 'Compagnie aérienne niveau 20' },
      { kind: 'companyLevel', type: 'hotel', lvl: 15, label: 'Chaîne hôtelière niveau 15' }
    ] },
  { id: 'conglauto', name: 'Conglomérat Automobile & Industriel', icon: '🔩', sector: 'indus',
    cost: 4.2e10, rev: 333333333, maxLvl: 40, up: 0.29,
    desc: 'Naît de la fusion d\'un constructeur automobile, d\'une usine robotisée et de poids lourds.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'auto', lvl: 25, label: 'Constructeur automobile niveau 25' },
      { kind: 'companyLevel', type: 'usine', lvl: 22, label: 'Usine robotisée niveau 22' },
      { kind: 'fleetVehicles', fleet: 'routier', category: 'longue', n: 8, label: '8 poids lourds' }
    ] },

  /* ------------------------------------------------------------ géant -- */
  { id: 'banque', name: 'Banque d\'affaires', icon: '🏦', sector: 'finance',
    cost: 5.5e10, rev: 166666667, maxLvl: 45, up: 0.28,
    desc: 'Les frais de dossier financent la moitié du bilan.' },
  { id: 'groupefinance', name: 'Groupe Financier International', icon: '💼', sector: 'finance',
    cost: 9.0e10, rev: 333333333, maxLvl: 45, up: 0.28,
    desc: 'Naît de la fusion d\'une banque d\'affaires, d\'un cabinet d\'avocats et d\'une agence immobilière.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'banque', lvl: 30, label: 'Banque d\'affaires niveau 30' },
      { kind: 'companyLevel', type: 'avocats', lvl: 22, label: 'Cabinet d\'avocats niveau 22' },
      { kind: 'companyLevel', type: 'agence', lvl: 18, label: 'Agence immobilière niveau 18' }
    ] },
  { id: 'petrole', name: 'Groupe pétrolier', icon: '🛢️', sector: 'energie',
    cost: 1.5e11, rev: 833333333, maxLvl: 50, up: 0.28,
    desc: 'Plateformes offshore et raffineries.' },
  { id: 'energie', name: 'Parc énergétique', icon: '⚡', sector: 'energie',
    cost: 4.0e11, rev: 625000000, maxLvl: 55, up: 0.27,
    desc: 'Éolien, solaire et un petit nucléaire pour la base.' },
  { id: 'conglonrj', name: 'Conglomérat Énergétique', icon: '🔥', sector: 'energie',
    cost: 6.5e11, rev: 1875000000, maxLvl: 50, up: 0.27,
    desc: 'Naît de la fusion d\'un groupe pétrolier, d\'un parc énergétique et d\'une usine robotisée.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'petrole', lvl: 30, label: 'Groupe pétrolier niveau 30' },
      { kind: 'companyLevel', type: 'energie', lvl: 22, label: 'Parc énergétique niveau 22' },
      { kind: 'companyLevel', type: 'usine', lvl: 25, label: 'Usine robotisée niveau 25' }
    ] },
  { id: 'geanttech', name: 'Géant de la technologie', icon: '🌐', sector: 'tech',
    cost: 1.1e12, rev: 1041666667, maxLvl: 60, up: 0.27,
    desc: 'Cloud, publicité, appareils : tout à la fois.' },
  { id: 'spatial', name: 'Groupe spatial', icon: '🚀', sector: 'tech',
    cost: 3.0e12, rev: 83333333, maxLvl: 62, up: 0.26,
    desc: 'Lanceurs réutilisables et constellations privées.' },
  { id: 'conglo', name: 'Conglomérat mondial', icon: '🏛️', sector: 'finance',
    cost: 8.0e12, rev: 3333333333, maxLvl: 62, up: 0.26,
    desc: 'Plus une holding qu\'une entreprise : elle possède les autres. Naît de la fusion ' +
      'de plusieurs grands conglomérats.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'conglotextile', lvl: 1, label: 'Posséder l\'Empire du Textile' },
      { kind: 'companyLevel', type: 'groupefinance', lvl: 1, label: 'Posséder le Groupe Financier International' },
      { kind: 'companyLevel', type: 'conglonrj', lvl: 1, label: 'Posséder le Conglomérat Énergétique' },
      { kind: 'companyLevel', type: 'grouperospatial', lvl: 1, label: 'Posséder le Groupe Aérospatial' },
      { kind: 'companyLevel', type: 'spatial', lvl: 1, label: 'Posséder un Groupe spatial' }
    ] },
  { id: 'grouperospatial', name: 'Groupe Aérospatial', icon: '🛰️', sector: 'tech',
    cost: 2.5e12, rev: 500000000, maxLvl: 45, up: 0.27,
    desc: 'Naît de la fusion d\'une usine robotisée, d\'un géant de la tech et ' +
      'd\'une flotte maritime et routière.',
    mergerOnly: true,
    mergerRequires: [
      { kind: 'companyLevel', type: 'usine', lvl: 25, label: 'Usine robotisée niveau 25' },
      { kind: 'companyLevel', type: 'geanttech', lvl: 10, label: 'Géant de la technologie niveau 10' },
      { kind: 'fleetVehicles', fleet: 'maritime', category: 'cargo', n: 3, label: '3 cargos' },
      { kind: 'fleetVehicles', fleet: 'routier', category: 'longue', n: 10, label: '10 poids lourds' }
    ] }
];

G.DATA.companyById = (function () {
  var m = {};
  for (var i = 0; i < G.DATA.companyTypes.length; i++) {
    m[G.DATA.companyTypes[i].id] = G.DATA.companyTypes[i];
  }
  return m;
})();

/* Paliers de niveau qui doublent le rendement. */
G.DATA.companyMilestones = [10, 20, 30, 40, 50, 60];

/* Noms proposés par le générateur quand on fonde une entreprise. */
G.DATA.nameParts = {
  pre: ['Nova', 'Vertex', 'Astra', 'Lumen', 'Orion', 'Zenith', 'Aurea', 'Solaris',
    'Meridian', 'Quantum', 'Atlas', 'Pioneer', 'Élan', 'Horizon', 'Céleste',
    'Granit', 'Boréal', 'Cobalt', 'Sirius', 'Ardent'],
  post: ['Group', 'Industries', 'Partners', 'Holding', 'Corporation', '& Cie',
    'International', 'Global', 'Ventures', 'Enterprises', 'Union', 'Labs']
};

/* Emplacements commerciaux : on démarre avec 4 et on peut en acheter. */
G.DATA.slotBase = 4;
G.DATA.slotMax = 24;
