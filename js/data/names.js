/* Banques de noms pour la génération procédurale (joueurs, clubs, pays). */
window.G = window.G || {};
G.DATA = G.DATA || {};

G.DATA.firstNames = [
  'Lucas', 'Enzo', 'Mathis', 'Théo', 'Nathan', 'Hugo', 'Léo', 'Gabriel', 'Raphaël',
  'Adam', 'Noah', 'Yanis', 'Ilyes', 'Malik', 'Karim', 'Youssef', 'Amine', 'Sofiane',
  'Diego', 'Pablo', 'Rodrigo', 'Matías', 'Sergio', 'Iker', 'Álvaro', 'Xabi',
  'Marco', 'Luca', 'Matteo', 'Alessandro', 'Gianluca', 'Federico', 'Andrea',
  'Kevin', 'Ryan', 'Liam', 'Owen', 'Callum', 'Finn', 'Jack', 'Harry', 'George',
  'Lars', 'Sven', 'Jonas', 'Niklas', 'Kasper', 'Mikkel', 'Emil', 'Viktor',
  'Kwame', 'Sadio', 'Moussa', 'Ibrahima', 'Cheikh', 'Bakary', 'Ousmane', 'Seydou',
  'Tane', 'Manu', 'Sione', 'Ioane', 'Rieko', 'Ardie', 'Beauden', 'Hoani',
  'Piotr', 'Tomasz', 'Marek', 'Dario', 'Luka', 'Nikola', 'Stefan', 'Mateo',
  'Takumi', 'Hiroshi', 'Kenji', 'Daichi', 'Sung-min', 'Ji-ho', 'Wei', 'Ravi'
];

G.DATA.lastNames = [
  'Dubois', 'Moreau', 'Lefèvre', 'Girard', 'Bonnet', 'Fontaine', 'Rousseau',
  'Marchand', 'Perrin', 'Chevalier', 'Renaud', 'Barbier', 'Dumont', 'Leroy',
  'García', 'Fernández', 'Morales', 'Iglesias', 'Navarro', 'Cabrera', 'Ortega',
  'Rossi', 'Bianchi', 'Esposito', 'Ferrari', 'Romano', 'Greco', 'Marino',
  'Smith', 'Walker', 'Wright', 'Hughes', 'Baker', 'Foster', 'Reid', 'Hayes',
  'Andersen', 'Nielsen', 'Larsen', 'Berg', 'Lindqvist', 'Håkansson', 'Vos',
  'Diallo', 'Traoré', 'Koné', 'Camara', 'Ndiaye', 'Sylla', 'Mensah', 'Owusu',
  'Tuilagi', 'Faletau', 'Savea', 'Barrett', 'Kolisi', 'Mapimpi', 'Etzebeth',
  'Kowalski', 'Nowak', 'Novák', 'Horvat', 'Petrović', 'Marković', 'Vuković',
  'Tanaka', 'Yamamoto', 'Nakamura', 'Kim', 'Park', 'Chen', 'Sharma', 'Patel',
  'Da Silva', 'Oliveira', 'Ribeiro', 'Almeida', 'Carvalho', 'Teixeira'
];

/* Fragments pour composer des noms de clubs adverses. */
G.DATA.cityNames = [
  'Valmont', 'Rochebrune', 'Saint-Elme', 'Bellecourt', 'Auverne', 'Montclair',
  'Port-Lambert', 'Vieux-Chêne', 'Grandval', 'Cassagne', 'Nordvik', 'Alcázar',
  'Ravenna', 'Kolstad', 'Brienne', 'Torrelles', 'Hafenstadt', 'Marbella-Nord',
  'Estoril', 'Kirkwall', 'Lindenau', 'Sablons', 'Aurillon', 'Vertsable'
];

G.DATA.clubSuffixes = {
  football: ['FC', 'Sporting', 'Olympique', 'Racing', 'United', 'Athletic'],
  rugby: ['RC', 'Rugby Club', 'XV', 'Stade', 'Union'],
  waterpolo: ['Nautique', 'Water-Polo', 'Cercle des Nageurs', 'Aquatic'],
  basket: ['Basket', 'BC', 'Panthers', 'Kings', 'Dragons'],
  handball: ['Handball', 'HBC', 'Vikings', 'Ours'],
  motorsport: ['Racing', 'Motorsport', 'GP Team', 'Competizione']
};

/* Pays jouables pour l'onglet gouvernement. */
G.DATA.countries = [
  { id: 'valdoria', name: 'Valdorie', icon: '🏔️', pop: 18.4, gdpPerCap: 34000, style: 'Économie alpine, tourisme et horlogerie.' },
  { id: 'costamar', name: 'Costamar', icon: '🏖️', pop: 42.1, gdpPerCap: 21000, style: 'Littoral, tourisme de masse, agriculture.' },
  { id: 'norlande', name: 'Norlande', icon: '❄️', pop: 9.7, gdpPerCap: 52000, style: 'Pétrole, fonds souverain, État providence.' },
  { id: 'sahelia', name: 'Sahélia', icon: '🌍', pop: 66.3, gdpPerCap: 4200, style: 'Jeune population, mines, fort potentiel.' },
  { id: 'industria', name: 'Industria', icon: '🏭', pop: 84.9, gdpPerCap: 41000, style: 'Puissance manufacturière et exportatrice.' }
];
