/* Données du jeu de stratégie politique : ressources, bâtiments, armée,
 * technologies, ministères, merveilles, diplomatie et Nations unies. */
window.G = window.G || {};
G.DATA = G.DATA || {};

/* ========================================================== RESSOURCES ==== */

G.DATA.resources = [
  { id: 'food', name: 'Nourriture', icon: '🌾', price: 260 },
  { id: 'energy', name: 'Énergie', icon: '⚡', price: 420 },
  { id: 'metal', name: 'Métal', icon: '⛏️', price: 640 },
  { id: 'oil', name: 'Pétrole', icon: '🛢️', price: 880 },
  { id: 'goods', name: 'Biens manufacturés', icon: '📦', price: 1500 },
  { id: 'tech', name: 'Points de recherche', icon: '🔬', price: 0 }
];

/* ========================================================== BÂTIMENTS ===== */

/* prod / cons : quantités mensuelles. cost en millions d'unités monétaires
 * du jeu (multipliées par la taille du pays au moment de la construction). */
G.DATA.buildings = [
  { id: 'ferme', name: 'Ferme moderne', icon: '🚜', cost: 90, upkeep: 4,
    prod: { food: 120 }, cons: { energy: 12 }, jobs: 2.5,
    desc: 'Nourrit la population et dégage un surplus exportable.' },
  { id: 'peche', name: 'Port de pêche', icon: '🎣', cost: 110, upkeep: 5,
    prod: { food: 95 }, cons: { oil: 10 }, jobs: 1.8, sea: true,
    desc: 'Nécessite un accès à la mer. Complète l\'agriculture.' },
  { id: 'scierie', name: 'Scierie', icon: '🪵', cost: 80, upkeep: 4,
    prod: { goods: 18 }, cons: { energy: 8 }, jobs: 1.4,
    desc: 'Transforme la forêt en matériaux de construction.' },
  { id: 'mine', name: 'Mine', icon: '⛏️', cost: 190, upkeep: 9,
    prod: { metal: 70 }, cons: { energy: 25 }, jobs: 3.2,
    desc: 'Extraction de minerais : la base de l\'industrie lourde.' },
  { id: 'puits', name: 'Plateforme pétrolière', icon: '🛢️', cost: 340, upkeep: 16,
    prod: { oil: 60 }, cons: { energy: 18 }, jobs: 2.0,
    desc: 'Le pétrole finance les États… et les guerres.' },
  { id: 'centrale', name: 'Centrale thermique', icon: '🏭', cost: 210, upkeep: 10,
    prod: { energy: 140 }, cons: { oil: 30 }, jobs: 1.6, pollution: 3,
    desc: 'Électricité abondante, air moins respirable.' },
  { id: 'nucleaire', name: 'Centrale nucléaire', icon: '☢️', cost: 900, upkeep: 34,
    prod: { energy: 420 }, cons: { metal: 10 }, jobs: 3.0, tech: 'nucleaire',
    desc: 'Énergie massive et propre, investissement lourd.' },
  { id: 'solaire', name: 'Parc solaire et éolien', icon: '🌱', cost: 420, upkeep: 12,
    prod: { energy: 150 }, cons: {}, jobs: 1.2, tech: 'renouvelable',
    desc: 'Aucune émission, aucun combustible à importer.' },
  { id: 'usine', name: 'Usine', icon: '🏗️', cost: 260, upkeep: 12,
    prod: { goods: 55 }, cons: { metal: 30, energy: 40 }, jobs: 4.5, pollution: 2,
    desc: 'Cœur de l\'économie manufacturière et des exportations.' },
  { id: 'labo', name: 'Centre de recherche', icon: '🔬', cost: 300, upkeep: 15,
    prod: { tech: 12 }, cons: { energy: 20 }, jobs: 2.2,
    desc: 'Produit les points nécessaires aux technologies.' },
  { id: 'hopital', name: 'Hôpital', icon: '🏥', cost: 240, upkeep: 18,
    prod: {}, cons: { energy: 15, goods: 6 }, jobs: 5.0, health: 6,
    desc: 'Espérance de vie, résistance aux épidémies, popularité.' },
  { id: 'universite', name: 'Université', icon: '🎓', cost: 280, upkeep: 16,
    prod: { tech: 6 }, cons: { energy: 14 }, jobs: 4.0, edu: 6,
    desc: 'Forme la main-d\'œuvre qualifiée de demain.' },
  { id: 'caserne', name: 'Base militaire', icon: '🎖️', cost: 320, upkeep: 20,
    prod: {}, cons: { goods: 10, oil: 12 }, jobs: 3.0, army: 8,
    desc: 'Augmente la capacité d\'entretien et le moral des troupes.' },
  { id: 'port', name: 'Port de commerce', icon: '⚓', cost: 380, upkeep: 14,
    prod: {}, cons: { energy: 12 }, jobs: 3.5, trade: 0.12, sea: true,
    desc: 'Réduit les coûts d\'importation et dope les exportations.' }
];

/* ============================================================== ARMÉE ===== */

G.DATA.units = [
  { id: 'inf', name: 'Infanterie', icon: '🪖', cost: 12, upkeep: 0.5,
    atk: 4, def: 6, dom: 'terre', desc: 'Tient le terrain, indispensable pour occuper.' },
  { id: 'char', name: 'Chars de combat', icon: '🛡️', cost: 55, upkeep: 2.2,
    atk: 14, def: 11, dom: 'terre', tech: 'blindage',
    desc: 'Perce les lignes ennemies. Vorace en carburant.' },
  { id: 'artil', name: 'Artillerie', icon: '💥', cost: 40, upkeep: 1.6,
    atk: 12, def: 4, dom: 'terre', desc: 'Frappe à distance, fragile au contact.' },
  { id: 'heli', name: 'Hélicoptères', icon: '🚁', cost: 95, upkeep: 4.0,
    atk: 16, def: 8, dom: 'air', tech: 'aviation',
    desc: 'Appui rapproché et mobilité extrême.' },
  { id: 'jet', name: 'Chasseurs', icon: '✈️', cost: 180, upkeep: 7.5,
    atk: 26, def: 14, dom: 'air', tech: 'aviation',
    desc: 'Maîtrise du ciel : sans elle, rien ne tient au sol.' },
  { id: 'navire', name: 'Navires de combat', icon: '🚢', cost: 260, upkeep: 10,
    atk: 24, def: 20, dom: 'mer', tech: 'marine', sea: true,
    desc: 'Projette la puissance loin des frontières.' },
  { id: 'sousmarin', name: 'Sous-marins', icon: '🛥️', cost: 340, upkeep: 13,
    atk: 30, def: 12, dom: 'mer', tech: 'marine', sea: true,
    desc: 'Invisible, dissuasif, redoutable.' },
  { id: 'nuke', name: 'Têtes nucléaires', icon: '☢️', cost: 1400, upkeep: 40,
    atk: 400, def: 0, dom: 'strat', tech: 'atomique',
    desc: 'Ne se lance pas à la légère : le monde entier réagira.' }
];

/* ======================================================= TECHNOLOGIES ===== */

G.DATA.techs = [
  { id: 'agronomie', name: 'Agronomie', icon: '🌾', cost: 120, req: [],
    desc: 'Rendements agricoles +25 %.' },
  { id: 'industrie', name: 'Industrie lourde', icon: '⚙️', cost: 200, req: [],
    desc: 'Production des usines +20 %.' },
  { id: 'renouvelable', name: 'Énergies renouvelables', icon: '🌱', cost: 280, req: [],
    desc: 'Débloque les parcs solaires et éoliens.' },
  { id: 'medecine', name: 'Médecine moderne', icon: '💉', cost: 240, req: [],
    desc: 'Santé publique +10, épidémies moins meurtrières.' },
  { id: 'education', name: 'Réforme éducative', icon: '📚', cost: 260, req: [],
    desc: 'Recherche +20 %, chômage en baisse.' },
  { id: 'blindage', name: 'Blindage composite', icon: '🛡️', cost: 320, req: ['industrie'],
    desc: 'Débloque les chars de combat.' },
  { id: 'aviation', name: 'Aviation militaire', icon: '✈️', cost: 480, req: ['industrie'],
    desc: 'Débloque hélicoptères et chasseurs.' },
  { id: 'marine', name: 'Génie naval', icon: '⚓', cost: 520, req: ['industrie'],
    desc: 'Débloque navires et sous-marins.' },
  { id: 'informatique', name: 'Informatique', icon: '💻', cost: 600, req: ['education'],
    desc: 'Croissance +0,4 point, renseignement amélioré.' },
  { id: 'nucleaire', name: 'Énergie nucléaire', icon: '☢️', cost: 900, req: ['industrie'],
    desc: 'Débloque les centrales nucléaires.' },
  { id: 'spatial', name: 'Programme spatial', icon: '🚀', cost: 1400, req: ['informatique'],
    desc: 'Prestige international, satellites d\'observation.' },
  { id: 'atomique', name: 'Arme atomique', icon: '💣', cost: 2200, req: ['nucleaire'],
    desc: 'Débloque les têtes nucléaires. Le monde vous surveille.' },
  { id: 'ia', name: 'Intelligence artificielle', icon: '🧠', cost: 3000, req: ['informatique'],
    desc: 'Productivité générale +15 %.' },
  { id: 'fusion', name: 'Fusion nucléaire', icon: '⚛️', cost: 5000, req: ['nucleaire', 'ia'],
    desc: 'Énergie quasi illimitée : centrales ×3.' }
];

/* ========================================================= MINISTÈRES ===== */

G.DATA.ministers = [
  { id: 'economie', name: 'Ministre de l\'Économie', icon: '💼', effect: 'Recettes fiscales +' },
  { id: 'defense', name: 'Ministre de la Défense', icon: '🎖️', effect: 'Puissance militaire +' },
  { id: 'interieur', name: 'Ministre de l\'Intérieur', icon: '🚓', effect: 'Ordre public et lutte anti-terroriste +' },
  { id: 'sante', name: 'Ministre de la Santé', icon: '🩺', effect: 'Santé publique +' },
  { id: 'affaires', name: 'Ministre des Affaires étrangères', icon: '🕊️', effect: 'Diplomatie et votes ONU +' },
  { id: 'recherche', name: 'Ministre de la Recherche', icon: '🔭', effect: 'Points de recherche +' }
];

G.DATA.ministerTraits = ['Technocrate', 'Populaire', 'Corrompu', 'Idéologue', 'Militaire',
  'Diplomate', 'Réformateur', 'Conservateur', 'Visionnaire', 'Prudent'];

/* =========================================================== MERVEILLES === */

G.DATA.wonders = [
  { id: 'tour', name: 'Tour de fer', icon: '🗼', cost: 2500, tourism: 9, pop: 6 },
  { id: 'colisee', name: 'Grand amphithéâtre', icon: '🏛️', cost: 3200, tourism: 11, pop: 7 },
  { id: 'statue', name: 'Statue de la Liberté nationale', icon: '🗽', cost: 4200, tourism: 13, pop: 9 },
  { id: 'horloge', name: 'Grande horloge', icon: '🕰️', cost: 2800, tourism: 8, pop: 5 },
  { id: 'opera', name: 'Opéra national', icon: '🎭', cost: 3600, tourism: 10, pop: 8 },
  { id: 'stade', name: 'Stade olympique', icon: '🏟️', cost: 5000, tourism: 14, pop: 12 },
  { id: 'temple', name: 'Grand temple', icon: '🛕', cost: 4400, tourism: 12, pop: 10 },
  { id: 'spatioport', name: 'Spatioport national', icon: '🛰️', cost: 12000, tourism: 18, pop: 14, tech: 'spatial' }
];

/* ======================================================== IDÉOLOGIES ====== */

G.DATA.ideologies = [
  { id: 'democratie', name: 'Démocratie libérale', icon: '🗳️',
    pros: 'Popularité stable, diplomatie facilitée', bonus: { diplo: 12, pop: 4, army: -5 } },
  { id: 'social', name: 'Social-démocratie', icon: '🤝',
    pros: 'Santé et éducation renforcées', bonus: { social: 12, growth: -0.2, pop: 6 } },
  { id: 'liberal', name: 'Capitalisme dérégulé', icon: '📈',
    pros: 'Croissance et marchés dopés', bonus: { growth: 0.8, pop: -6, market: 0.05 } },
  { id: 'autoritaire', name: 'Régime autoritaire', icon: '🪖',
    pros: 'Armée puissante, opposition muselée', bonus: { army: 18, diplo: -14, stab: 10 } },
  { id: 'communiste', name: 'État socialiste', icon: '☭',
    pros: 'Industrie planifiée, inégalités faibles', bonus: { prod: 0.15, market: -0.05, pop: 3 } },
  { id: 'theocratie', name: 'Théocratie', icon: '🕌',
    pros: 'Cohésion religieuse maximale', bonus: { faith: 25, stab: 8, diplo: -8 } }
];

/* ======================================================== RELIGIONS ======= */

G.DATA.religions = ['Christianisme', 'Islam', 'Hindouisme', 'Bouddhisme', 'Judaïsme',
  'Religions traditionnelles', 'Sans religion'];

/* ============================================================== ONU ======= */

G.DATA.resolutions = [
  { id: 'sanctions', name: 'Sanctions économiques', icon: '⛔',
    desc: 'Frappe l\'économie du pays visé pendant douze mois.', target: true, cost: 400 },
  { id: 'embargo', name: 'Embargo sur les armes', icon: '🚫',
    desc: 'Bloque le réarmement de la cible.', target: true, cost: 500 },
  { id: 'paix', name: 'Résolution de paix', icon: '🕊️',
    desc: 'Met fin à toutes les guerres impliquant la cible.', target: true, cost: 700 },
  { id: 'aide', name: 'Programme d\'aide humanitaire', icon: '🥫',
    desc: 'Améliore votre image partout dans le monde.', target: false, cost: 900 },
  { id: 'climat', name: 'Accord climatique mondial', icon: '🌍',
    desc: 'Réduit la pollution globale, coûte à l\'industrie.', target: false, cost: 1200 },
  { id: 'libre', name: 'Traité de libre-échange', icon: '🤝',
    desc: 'Augmente vos revenus commerciaux de 25 %.', target: false, cost: 1000 }
];

G.DATA.organisations = [
  { id: 'interpol', name: 'Interpol', icon: '🕵️', cost: 1500,
    desc: 'Criminalité et terrorisme fortement réduits.' },
  { id: 'fmi', name: 'Fonds monétaire international', icon: '🏦', cost: 3000,
    desc: 'Taux d\'emprunt divisé par deux, dette mieux tolérée.' },
  { id: 'omc', name: 'Organisation mondiale du commerce', icon: '🚢', cost: 2500,
    desc: 'Revenus d\'exportation +30 %.' },
  { id: 'oms', name: 'Organisation mondiale de la santé', icon: '🩺', cost: 2000,
    desc: 'Épidémies étouffées dès leur apparition.' },
  { id: 'agence', name: 'Agence spatiale internationale', icon: '🛰️', cost: 4000,
    desc: 'Recherche +25 % et prestige mondial.' }
];

/* ======================================================== ÉVÈNEMENTS ====== */

G.DATA.nationEvents = [
  { id: 'greve', txt: 'Grève générale dans les transports', pop: -3, growth: -0.4, w: 6 },
  { id: 'boom', txt: 'Boom des exportations industrielles', pop: 2, growth: 0.6, w: 6 },
  { id: 'inond', txt: 'Inondations majeures dans le sud', pop: -2, cost: 0.012, w: 4 },
  { id: 'gisement', txt: 'Découverte d\'un gisement de terres rares', pop: 4, res: { metal: 400 }, w: 3 },
  { id: 'scandale', txt: 'Scandale de corruption au sommet de l\'État', pop: -8, stab: -12, w: 3 },
  { id: 'jo', txt: 'Le pays décroche l\'organisation des Jeux', pop: 9, cost: 0.02, tourism: 6, w: 2 },
  { id: 'krach', txt: 'Krach boursier international', pop: -3, market: -0.14, w: 3 },
  { id: 'tourisme', txt: 'Saison touristique record', pop: 3, growth: 0.5, w: 5 },
  { id: 'epidemie', txt: 'Épidémie : les hôpitaux sont saturés', pop: -5, epidemic: true, w: 4 },
  { id: 'accord', txt: 'Accord commercial signé avec un grand voisin', pop: 3, growth: 0.45, diplo: 6, w: 5 },
  { id: 'energie', txt: 'Flambée des prix de l\'énergie', pop: -5, infl: 1.1, w: 5 },
  { id: 'attentat', txt: 'Attentat déjoué de justesse', pop: -2, stab: -5, w: 3 },
  { id: 'espion', txt: 'Un réseau d\'espions étrangers est démantelé', pop: 4, diplo: -5, w: 3 },
  { id: 'manif', txt: 'Manifestations massives contre le gouvernement', pop: -6, stab: -8, w: 4 },
  { id: 'nobel', txt: 'Un chercheur national reçoit un prix mondial', pop: 5, tech: 150, w: 2 },
  { id: 'calme', txt: 'Mois calme sur le plan intérieur', pop: 0, w: 12 }
];
