/* Catalogue des entreprises que l'on peut fonder.
 *
 * On choisit un type dans ce catalogue, on lui donne le nom que l'on veut,
 * puis on investit dedans niveau par niveau. Les revenus sont exprimés par
 * heure et versés automatiquement chaque minute.
 *
 * cost   : capital nécessaire pour fonder l'entreprise
 * rev    : revenu horaire au niveau 1
 * maxLvl : nombre de paliers d'investissement possibles
 * up     : facteur de coût du 1er palier (× cost)
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

G.DATA.sectors = {
  commerce: { name: 'Commerce', icon: '🛒' },
  resto: { name: 'Restauration', icon: '🍽️' },
  sport: { name: 'Sport & Loisirs', icon: '🏟️' },
  immo: { name: 'Immobilier', icon: '🏢' },
  tech: { name: 'Technologie', icon: '💾' },
  indus: { name: 'Industrie', icon: '⚙️' },
  sante: { name: 'Santé', icon: '💊' },
  transport: { name: 'Transport', icon: '🛫' },
  finance: { name: 'Finance', icon: '💰' },
  energie: { name: 'Énergie', icon: '🔋' },
  media: { name: 'Médias', icon: '📺' },
  agro: { name: 'Agroalimentaire', icon: '🌾' }
};

G.DATA.companyTypes = [
  /* ------------------------------------------------------- démarrage --- */
  { id: 'kiosque', name: 'Kiosque à journaux', icon: '🗞️', sector: 'media',
    cost: 250, rev: 900, maxLvl: 10, up: 0.35,
    desc: 'Presse, confiseries et tickets de loterie. Le premier pas.' },
  { id: 'foodtruck', name: 'Food truck', icon: '🚚', sector: 'resto',
    cost: 2000, rev: 5400, maxLvl: 10, up: 0.35,
    desc: 'Cuisine de rue sur les places de marché et les festivals.' },
  { id: 'coiffeur', name: 'Salon de coiffure', icon: '💈', sector: 'commerce',
    cost: 9000, rev: 21000, maxLvl: 12, up: 0.35,
    desc: 'Clientèle fidèle, rendez-vous pris trois semaines à l\'avance.' },
  { id: 'laverie', name: 'Laverie automatique', icon: '🧺', sector: 'commerce',
    cost: 35000, rev: 75000, maxLvl: 12, up: 0.34,
    desc: 'Machine à cash discrète qui tourne toute la nuit.' },

  /* --------------------------------------------------------- commerce --- */
  { id: 'mode', name: 'Boutique de mode', icon: '👗', sector: 'commerce',
    cost: 120000, rev: 240000, maxLvl: 15, up: 0.34,
    desc: 'Collections capsules et vitrines très soignées.' },
  { id: 'superette', name: 'Supérette de quartier', icon: '🏪', sector: 'commerce',
    cost: 400000, rev: 760000, maxLvl: 18, up: 0.33,
    desc: 'Ouvert sept jours sur sept, marges faibles mais volume constant.' },
  { id: 'resto', name: 'Restaurant gastronomique', icon: '🍽️', sector: 'resto',
    cost: 1.3e6, rev: 2.3e6, maxLvl: 18, up: 0.33,
    desc: 'Un chef ambitieux, une étoile en ligne de mire.' },
  { id: 'brasserie', name: 'Brasserie artisanale', icon: '🍺', sector: 'agro',
    cost: 3.0e6, rev: 5.2e6, maxLvl: 20, up: 0.33,
    desc: 'Houblon local, canettes design, distribution nationale.' },

  /* ------------------------------------------------------- services ---- */
  { id: 'salle', name: 'Salle de sport', icon: '🏋️', sector: 'sport',
    cost: 4.0e6, rev: 6.8e6, maxLvl: 20, up: 0.32,
    desc: 'Abonnements annuels signés en janvier, rarement utilisés.' },
  { id: 'agence', name: 'Agence immobilière', icon: '🏠', sector: 'immo',
    cost: 1.2e7, rev: 1.9e7, maxLvl: 22, up: 0.32,
    desc: 'Commissions confortables sur chaque transaction.' },
  { id: 'avocats', name: 'Cabinet d\'avocats', icon: '⚖️', sector: 'finance',
    cost: 3.8e7, rev: 5.8e7, maxLvl: 25, up: 0.32,
    desc: 'Facturation à l\'heure, dossiers interminables.' },
  { id: 'hotel', name: 'Chaîne hôtelière', icon: '🏨', sector: 'immo',
    cost: 7.0e7, rev: 1.0e8, maxLvl: 25, up: 0.31,
    desc: 'Quatre étoiles, taux d\'occupation soigneusement optimisé.' },

  /* ------------------------------------------------------------ tech --- */
  { id: 'studio', name: 'Studio de jeux vidéo', icon: '🎮', sector: 'tech',
    cost: 1.1e8, rev: 1.6e8, maxLvl: 28, up: 0.31,
    desc: 'Un succès surprise finance les cinq échecs suivants.' },
  { id: 'saas', name: 'Éditeur de logiciels', icon: '💻', sector: 'tech',
    cost: 2.0e8, rev: 2.9e8, maxLvl: 30, up: 0.31,
    desc: 'Abonnement mensuel, marge brute indécente.' },
  { id: 'clinique', name: 'Clinique privée', icon: '🏥', sector: 'sante',
    cost: 3.2e8, rev: 4.5e8, maxLvl: 30, up: 0.30,
    desc: 'Dépassements d\'honoraires et chambres particulières.' },
  { id: 'labo', name: 'Laboratoire pharmaceutique', icon: '🧪', sector: 'sante',
    cost: 6.0e8, rev: 8.2e8, maxLvl: 32, up: 0.30,
    desc: 'Un brevet bien placé vaut mieux qu\'une usine.' },

  /* -------------------------------------------------------- industrie -- */
  { id: 'usine', name: 'Usine robotisée', icon: '🏭', sector: 'indus',
    cost: 9.0e8, rev: 1.25e9, maxLvl: 35, up: 0.30,
    desc: 'Production continue, zéro pause déjeuner.' },
  { id: 'tv', name: 'Chaîne de télévision', icon: '📺', sector: 'media',
    cost: 2.6e9, rev: 3.4e9, maxLvl: 35, up: 0.29,
    desc: 'Audience, publicité et droits sportifs.' },
  { id: 'aerien', name: 'Compagnie aérienne', icon: '✈️', sector: 'transport',
    cost: 7.0e9, rev: 9.0e9, maxLvl: 38, up: 0.29,
    desc: 'Long-courriers pleins, bagages en supplément.' },
  { id: 'auto', name: 'Constructeur automobile', icon: '🚗', sector: 'indus',
    cost: 2.0e10, rev: 2.5e10, maxLvl: 40, up: 0.29,
    desc: 'Chaînes de montage sur trois continents.' },

  /* ------------------------------------------------------------ géant -- */
  { id: 'banque', name: 'Banque d\'affaires', icon: '🏦', sector: 'finance',
    cost: 5.5e10, rev: 6.6e10, maxLvl: 45, up: 0.28,
    desc: 'Les frais de dossier financent la moitié du bilan.' },
  { id: 'petrole', name: 'Groupe pétrolier', icon: '🛢️', sector: 'energie',
    cost: 1.5e11, rev: 1.75e11, maxLvl: 50, up: 0.28,
    desc: 'Plateformes offshore et raffineries.' },
  { id: 'energie', name: 'Parc énergétique', icon: '⚡', sector: 'energie',
    cost: 4.0e11, rev: 4.6e11, maxLvl: 55, up: 0.27,
    desc: 'Éolien, solaire et un petit nucléaire pour la base.' },
  { id: 'geanttech', name: 'Géant de la technologie', icon: '🌐', sector: 'tech',
    cost: 1.1e12, rev: 1.25e12, maxLvl: 60, up: 0.27,
    desc: 'Cloud, publicité, appareils : tout à la fois.' },
  { id: 'spatial', name: 'Groupe spatial', icon: '🚀', sector: 'tech',
    cost: 3.0e12, rev: 3.3e12, maxLvl: 62, up: 0.26,
    desc: 'Lanceurs réutilisables et constellations privées.' },
  { id: 'conglo', name: 'Conglomérat mondial', icon: '🏛️', sector: 'finance',
    cost: 8.0e12, rev: 8.6e12, maxLvl: 62, up: 0.26,
    desc: 'Plus une holding qu\'une entreprise : elle possède les autres.' }
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
