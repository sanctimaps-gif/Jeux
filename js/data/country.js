/* Données de l'onglet Gouvernement (simulation de pays).
 *
 * Le pays tourne au mois : on règle les impôts et les budgets, on vote des
 * lois, puis on valide le mois. Les indicateurs évoluent, la popularité suit,
 * et l'économie nationale se répercute sur la Bourse et sur les entreprises.
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

/* Ministères : part du budget, effets sur les indicateurs.
 * `need` = part de PIB considérée comme « normale » pour ce poste.  */
G.DATA.ministries = [
  {
    id: 'sante', name: 'Santé', icon: '🏥', need: 0.085,
    effects: { sante: 1.0, popularite: 0.5 },
    desc: 'Hôpitaux, remboursements, prévention.'
  },
  {
    id: 'education', name: 'Éducation', icon: '🎓', need: 0.055,
    effects: { education: 1.0, croissanceLT: 0.6 },
    desc: 'Écoles, universités, formation professionnelle.'
  },
  {
    id: 'securite', name: 'Sécurité', icon: '🚓', need: 0.030,
    effects: { securite: 1.0, popularite: 0.3 },
    desc: 'Police, justice, protection civile.'
  },
  {
    id: 'infra', name: 'Infrastructures', icon: '🛣️', need: 0.045,
    effects: { infra: 1.0, croissance: 0.7 },
    desc: 'Routes, rail, réseaux, énergie.'
  },
  {
    id: 'recherche', name: 'Recherche', icon: '🔬', need: 0.025,
    effects: { innovation: 1.0, croissanceLT: 0.9 },
    desc: 'Laboratoires publics, crédit d\'impôt innovation.'
  },
  {
    id: 'social', name: 'Affaires sociales', icon: '🤝', need: 0.075,
    effects: { social: 1.0, popularite: 0.8, croissance: -0.1 },
    desc: 'Retraites, allocations, lutte contre la pauvreté.'
  },
  {
    id: 'defense', name: 'Défense', icon: '🎖️', need: 0.020,
    effects: { defense: 1.0, stabilite: 0.4 },
    desc: 'Armée, industrie de défense, renseignement.'
  },
  {
    id: 'culture', name: 'Culture & Sport', icon: '🎭', need: 0.015,
    effects: { culture: 1.0, popularite: 0.4 },
    desc: 'Patrimoine, spectacle vivant, sport pour tous.'
  }
];

/* Lois votables. Chaque loi a un coût politique (popularité) et des effets
 * permanents tant qu'elle est active. `once` = décision non réversible. */
G.DATA.laws = [
  {
    id: 'flat_tax', name: 'Impôt à taux unique', icon: '📉', cost: 0,
    pop: -4, desc: 'Simplifie la fiscalité : attire les capitaux, fâche les syndicats.',
    effects: { marche: 0.03, popularite: -0.4, croissance: 0.25 }
  },
  {
    id: 'smic', name: 'Hausse du salaire minimum', icon: '💶', cost: 0,
    pop: +7, desc: 'Pouvoir d\'achat en hausse, marges des entreprises en baisse.',
    effects: { popularite: 0.9, croissance: -0.15, chomage: 0.2, bizCost: 0.05 }
  },
  {
    id: 'zone_franche', name: 'Zones franches industrielles', icon: '🏭', cost: 0.012,
    pop: +2, desc: 'Exonérations ciblées : vos usines respirent, le fisc moins.',
    effects: { croissance: 0.35, chomage: -0.35, bizBonus: 0.08 }
  },
  {
    id: 'grands_travaux', name: 'Plan de grands travaux', icon: '🏗️', cost: 0.025,
    pop: +5, desc: 'Chantiers partout : emploi immédiat, dette immédiate aussi.',
    effects: { croissance: 0.5, chomage: -0.6, infra: 1.5, popularite: 0.5 }
  },
  {
    id: 'derégulation', name: 'Dérégulation financière', icon: '🏦', cost: 0,
    pop: -6, desc: 'La Bourse s\'envole, le risque systémique aussi.',
    effects: { marche: 0.07, volatilite: 0.35, popularite: -0.6 }
  },
  {
    id: 'stade_national', name: 'Stades et équipements sportifs', icon: '🏟️', cost: 0.010,
    pop: +6, desc: 'Le pays construit : vos clubs remplissent leurs tribunes.',
    effects: { popularite: 0.6, sponsor: 0.15, culture: 1.2 }
  },
  {
    id: 'casino_licence', name: 'Licences de jeux élargies', icon: '🎰', cost: -0.006,
    pop: -3, desc: 'Recettes fiscales nouvelles, opposition morale garantie.',
    effects: { popularite: -0.35, casino: 0.10, recettes: 0.006 }
  },
  {
    id: 'transition', name: 'Transition énergétique', icon: '🌱', cost: 0.018,
    pop: +3, desc: 'Investissement lourd aujourd\'hui, croissance propre demain.',
    effects: { croissanceLT: 0.8, popularite: 0.3, energie: 1.0 }
  },
  {
    id: 'immigration', name: 'Ouverture aux talents étrangers', icon: '🛂', cost: 0,
    pop: -2, desc: 'Main-d\'œuvre qualifiée, débat public électrique.',
    effects: { croissance: 0.3, chomage: 0.1, popularite: -0.25, innovation: 0.8 }
  },
  {
    id: 'retraite', name: 'Réforme des retraites', icon: '👴', cost: -0.020,
    pop: -14, desc: 'Les comptes publics respirent, la rue s\'enflamme.',
    effects: { popularite: -1.4, stabilite: -1.0, recettes: 0.02 }
  },
  {
    id: 'sante_pub', name: 'Couverture santé universelle', icon: '🩺', cost: 0.022,
    pop: +11, desc: 'Populaire, coûteux, difficilement réversible.',
    effects: { popularite: 1.2, sante: 1.5 }
  },
  {
    id: 'tech_hub', name: 'Cité de l\'innovation', icon: '🚀', cost: 0.014,
    pop: +1, desc: 'Un écosystème tech national qui dope vos participations.',
    effects: { innovation: 1.6, marche: 0.04, croissanceLT: 0.7 }
  }
];

/* Évènements aléatoires mensuels. */
G.DATA.countryEvents = [
  { id: 'greve', txt: 'Grève générale dans les transports', pop: -3, croissance: -0.4, w: 6 },
  { id: 'boom', txt: 'Boom des exportations industrielles', pop: +2, croissance: 0.6, w: 6 },
  { id: 'catastrophe', txt: 'Inondations majeures dans le sud', pop: -2, cout: 0.012, w: 4 },
  { id: 'decouverte', txt: 'Découverte d\'un gisement de terres rares', pop: +4, croissance: 0.8, w: 3 },
  { id: 'scandale', txt: 'Scandale de corruption au sein du gouvernement', pop: -8, stabilite: -1.2, w: 3 },
  { id: 'jo', txt: 'Le pays décroche l\'organisation des Jeux', pop: +9, cout: 0.02, sponsor: 0.2, w: 2 },
  { id: 'krach', txt: 'Krach boursier international', pop: -3, marche: -0.14, w: 3 },
  { id: 'tourisme', txt: 'Saison touristique record', pop: +3, croissance: 0.5, w: 5 },
  { id: 'epidemie', txt: 'Épidémie saisonnière : hôpitaux sous tension', pop: -4, cout: 0.008, w: 4 },
  { id: 'paix', txt: 'Accord commercial signé avec un grand voisin', pop: +3, croissance: 0.45, w: 5 },
  { id: 'inflation', txt: 'Flambée des prix de l\'énergie', pop: -5, inflation: 1.1, w: 5 },
  { id: 'calme', txt: 'Mois calme sur le plan politique', pop: 0, w: 12 }
];
