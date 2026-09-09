/* Catalogue des entreprises de l'empire.
 *
 * coût  : prix du 1er niveau ; chaque niveau coûte cost * growth^niveau
 * rev   : revenu par cycle et par niveau
 * cycle : durée d'un cycle en secondes (à vide il faut encaisser à la main,
 *         avec un directeur l'encaissement devient automatique)
 * sector: relie l'entreprise à un secteur boursier (synergie avec la Bourse)
 */
window.G = window.G || {};

G.DATA = G.DATA || {};

G.DATA.businesses = [
  {
    id: 'kiosque', name: 'Kiosque à journaux', icon: '🗞️', sector: 'media',
    cost: 40, rev: 4, cycle: 1.2, growth: 1.09, managerCost: 900,
    desc: "Le tout premier commerce. Rentable, minuscule, mais c'est un début."
  },
  {
    id: 'foodtruck', name: 'Food truck', icon: '🚚', sector: 'conso',
    cost: 550, rev: 26, cycle: 2.5, growth: 1.10, managerCost: 6500,
    desc: "Des burgers gourmets sur les places de marché."
  },
  {
    id: 'laverie', name: 'Laverie automatique', icon: '🧺', sector: 'conso',
    cost: 4200, rev: 130, cycle: 5, growth: 1.10, managerCost: 42000,
    desc: "Machine à cash discrète, tourne toute la nuit."
  },
  {
    id: 'salle', name: 'Salle de sport', icon: '🏋️', sector: 'sport',
    cost: 28000, rev: 620, cycle: 8, growth: 1.11, managerCost: 260000,
    desc: "Abonnements annuels signés en janvier, jamais utilisés."
  },
  {
    id: 'agence', name: 'Agence immobilière', icon: '🏠', sector: 'immo',
    cost: 190000, rev: 3400, cycle: 12, growth: 1.11, managerCost: 1.6e6,
    desc: "Commissions confortables sur chaque transaction."
  },
  {
    id: 'startup', name: 'Startup logicielle', icon: '💻', sector: 'tech',
    cost: 1.2e6, rev: 19000, cycle: 15, growth: 1.12, managerCost: 9.5e6,
    desc: "Abonnement mensuel, marge brute indécente."
  },
  {
    id: 'usine', name: 'Usine robotisée', icon: '🏭', sector: 'indus',
    cost: 8.5e6, rev: 118000, cycle: 20, growth: 1.12, managerCost: 6.4e7,
    desc: "Production continue, zéro pause déjeuner."
  },
  {
    id: 'clinique', name: 'Clinique privée', icon: '🏥', sector: 'sante',
    cost: 6.0e7, rev: 760000, cycle: 25, growth: 1.12, managerCost: 4.4e8,
    desc: "Dépassements d'honoraires et chambres particulières."
  },
  {
    id: 'compagnie', name: 'Compagnie aérienne', icon: '✈️', sector: 'transport',
    cost: 4.2e8, rev: 4.9e6, cycle: 30, growth: 1.13, managerCost: 3.1e9,
    desc: "Long-courriers pleins, bagages en supplément."
  },
  {
    id: 'banque', name: 'Banque d\'affaires', icon: '🏦', sector: 'finance',
    cost: 3.0e9, rev: 3.2e7, cycle: 35, growth: 1.13, managerCost: 2.2e10,
    desc: "Les frais de dossier financent la moitié du bilan."
  },
  {
    id: 'energie', name: 'Parc énergétique', icon: '⚡', sector: 'energie',
    cost: 2.2e10, rev: 2.1e8, cycle: 40, growth: 1.13, managerCost: 1.6e11,
    desc: "Éolien, solaire et un petit nucléaire pour la base."
  },
  {
    id: 'spatial', name: 'Groupe spatial', icon: '🚀', sector: 'tech',
    cost: 1.6e11, rev: 1.4e9, cycle: 48, growth: 1.14, managerCost: 1.2e12,
    desc: "Lanceurs réutilisables et constellations privées."
  }
];

/* Paliers de niveau qui doublent le rendement de l'entreprise. */
G.DATA.businessMilestones = [10, 25, 50, 100, 200, 300, 400, 500];

G.DATA.sectors = {
  media: { name: 'Médias', icon: '📺' },
  conso: { name: 'Consommation', icon: '🛒' },
  sport: { name: 'Sport & Loisirs', icon: '🏟️' },
  immo: { name: 'Immobilier', icon: '🏢' },
  tech: { name: 'Technologie', icon: '💾' },
  indus: { name: 'Industrie', icon: '⚙️' },
  sante: { name: 'Santé', icon: '💊' },
  transport: { name: 'Transport', icon: '🛫' },
  finance: { name: 'Finance', icon: '💰' },
  energie: { name: 'Énergie', icon: '🔋' }
};
