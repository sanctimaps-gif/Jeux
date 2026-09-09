/* Actions cotées.
 *
 * p0    : cours d'introduction
 * drift : tendance journalière moyenne
 * vol   : volatilité journalière (écart-type)
 * beta  : sensibilité au marché global (et donc à l'économie du pays)
 * div   : rendement du dividende annuel (versé chaque trimestre = 90 jours)
 */
window.G = window.G || {};
G.DATA = G.DATA || {};

G.DATA.stocks = [
  { id: 'NVX', name: 'Novatek Systems', sector: 'tech', p0: 42, drift: 0.0016, vol: 0.031, beta: 1.35, div: 0.005 },
  { id: 'ORB', name: 'Orbitum Space', sector: 'tech', p0: 88, drift: 0.0020, vol: 0.045, beta: 1.60, div: 0.000 },
  { id: 'GLD', name: 'Goldbrand Finance', sector: 'finance', p0: 130, drift: 0.0009, vol: 0.019, beta: 1.10, div: 0.038 },
  { id: 'HEL', name: 'Helvia Assurances', sector: 'finance', p0: 61, drift: 0.0007, vol: 0.014, beta: 0.80, div: 0.045 },
  { id: 'VLT', name: 'Voltera Énergie', sector: 'energie', p0: 27, drift: 0.0012, vol: 0.026, beta: 1.05, div: 0.022 },
  { id: 'PTR', name: 'Petrolia Group', sector: 'energie', p0: 74, drift: 0.0005, vol: 0.030, beta: 0.95, div: 0.052 },
  { id: 'MDS', name: 'Medisan Pharma', sector: 'sante', p0: 155, drift: 0.0011, vol: 0.021, beta: 0.75, div: 0.018 },
  { id: 'AGR', name: 'Agrivista Foods', sector: 'conso', p0: 19, drift: 0.0006, vol: 0.016, beta: 0.60, div: 0.030 },
  { id: 'LXR', name: 'Luxora Maison', sector: 'conso', p0: 240, drift: 0.0013, vol: 0.024, beta: 1.20, div: 0.014 },
  { id: 'FRT', name: 'Ferrotech Industries', sector: 'indus', p0: 53, drift: 0.0008, vol: 0.023, beta: 1.15, div: 0.026 },
  { id: 'TRV', name: 'Transvia Logistique', sector: 'transport', p0: 36, drift: 0.0009, vol: 0.025, beta: 1.25, div: 0.020 },
  { id: 'IMB', name: 'Immobrix Foncière', sector: 'immo', p0: 96, drift: 0.0007, vol: 0.017, beta: 0.90, div: 0.041 },
  { id: 'MDA', name: 'Mediarc Broadcast', sector: 'media', p0: 31, drift: 0.0010, vol: 0.028, beta: 1.30, div: 0.012 },
  { id: 'SPT', name: 'Sportiva Équipement', sector: 'sport', p0: 47, drift: 0.0014, vol: 0.029, beta: 1.40, div: 0.010 },
  { id: 'ARN', name: 'Arena Holding', sector: 'sport', p0: 112, drift: 0.0011, vol: 0.027, beta: 1.25, div: 0.016 },
  { id: 'CSN', name: 'Casinova Resorts', sector: 'loisir', p0: 68, drift: 0.0010, vol: 0.034, beta: 1.45, div: 0.024 }
];

/* Secteurs supplémentaires propres à la cote. */
G.DATA.stockSectors = {
  loisir: { name: 'Jeux & Loisirs', icon: '🎰' }
};

/* Titres dont le cours réagit aux résultats sportifs du joueur. */
G.DATA.sportStocks = ['SPT', 'ARN', 'MDA'];

/* Titres dont le cours réagit à l'activité casino. */
G.DATA.casinoStocks = ['CSN'];

/* Modèles d'évènements de marché (actualités). */
G.DATA.marketNews = [
  { txt: '{n} dévoile des résultats trimestriels au-dessus du consensus', impact: 0.09 },
  { txt: '{n} décroche un contrat cadre à neuf chiffres', impact: 0.12 },
  { txt: 'Rumeur d\'OPA hostile sur {n}', impact: 0.16 },
  { txt: '{n} annonce un plan de rachat d\'actions', impact: 0.07 },
  { txt: 'Le PDG de {n} démissionne sans préavis', impact: -0.11 },
  { txt: '{n} rappelle un produit défectueux', impact: -0.09 },
  { txt: 'Enquête réglementaire ouverte contre {n}', impact: -0.14 },
  { txt: '{n} publie un avertissement sur résultats', impact: -0.17 },
  { txt: '{n} rate ses objectifs de production', impact: -0.06 },
  { txt: 'Un analyste vedette passe {n} à « achat fort »', impact: 0.06 }
];

G.DATA.macroNews = [
  { txt: 'La banque centrale abaisse ses taux directeurs', impact: 0.05 },
  { txt: 'La banque centrale relève brutalement ses taux', impact: -0.06 },
  { txt: 'Tensions géopolitiques : les marchés décrochent', impact: -0.08 },
  { txt: 'Croissance mondiale révisée à la hausse', impact: 0.05 },
  { txt: 'Vague d\'optimisme sur les valeurs de croissance', impact: 0.04 },
  { txt: 'Correction technique après un excès d\'euphorie', impact: -0.05 }
];
