/* Lois votables par le chef de l'État.
 *
 * Chaque loi a un coût politique immédiat (popularité) et des effets
 * permanents tant qu'elle reste en vigueur — y compris sur les entreprises,
 * les clubs et le casino du joueur.
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

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
