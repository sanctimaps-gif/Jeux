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

/* Grandes villes par pays, pour nommer les clubs de façon crédible.
   Les pays absents de cette table utilisent G.DATA.cityNames (noms fictifs). */
G.DATA.cityNamesByCountry = {
  FRA: ['Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes', 'Nice',
    'Strasbourg', 'Rennes', 'Montpellier', 'Saint-Étienne', 'Le Havre', 'Brest', 'Reims'],
  ESP: ['Séville', 'Valence', 'Bilbao', 'Saragosse', 'Malaga', 'Grenade', 'Vigo',
    'Gijón', 'Valladolid', 'Pampelune', 'Alicante', 'Cadix'],
  GBR: ['Manchester', 'Liverpool', 'Leeds', 'Newcastle', 'Bristol', 'Sheffield',
    'Southampton', 'Nottingham', 'Cardiff', 'Glasgow', 'Édimbourg', 'Brighton'],
  DEU: ['Munich', 'Hambourg', 'Cologne', 'Francfort', 'Stuttgart', 'Dortmund',
    'Leipzig', 'Brême', 'Hanovre', 'Nuremberg', 'Fribourg', 'Mayence'],
  ITA: ['Milan', 'Turin', 'Naples', 'Florence', 'Bologne', 'Gênes', 'Palerme',
    'Vérone', 'Bergame', 'Bari', 'Udine', 'Cagliari'],
  PRT: ['Porto', 'Braga', 'Coimbra', 'Guimarães', 'Faro', 'Setúbal', 'Aveiro', 'Funchal'],
  NLD: ['Amsterdam', 'Rotterdam', 'Eindhoven', 'Utrecht', 'Groningue', 'Arnhem',
    'Alkmaar', 'Tilbourg'],
  BEL: ['Bruges', 'Anvers', 'Gand', 'Liège', 'Charleroi', 'Louvain', 'Genk'],
  BRA: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Salvador',
    'Recife', 'Curitiba', 'Fortaleza', 'Belém', 'Goiânia'],
  ARG: ['Buenos Aires', 'Rosario', 'Córdoba', 'La Plata', 'Mendoza', 'Santa Fe',
    'Tucumán', 'Mar del Plata'],
  USA: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Boston', 'Seattle',
    'Denver', 'Atlanta', 'Dallas', 'Portland', 'Phoenix'],
  MEX: ['Mexico', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Toluca', 'León'],
  TUR: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Trabzon', 'Adana'],
  JPN: ['Tokyo', 'Osaka', 'Nagoya', 'Yokohama', 'Sapporo', 'Kobe', 'Fukuoka', 'Sendai'],
  SAU: ['Riyad', 'Djeddah', 'Dammam', 'La Mecque', 'Médine', 'Taïf'],
  MAR: ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir', 'Oujda'],
  GRC: ['Athènes', 'Thessalonique', 'Le Pirée', 'Patras', 'Héraklion', 'Larissa'],
  CHE: ['Zurich', 'Genève', 'Bâle', 'Berne', 'Lausanne', 'Lucerne', 'Saint-Gall'],
  AUT: ['Vienne', 'Salzbourg', 'Graz', 'Linz', 'Innsbruck', 'Klagenfurt'],
  POL: ['Varsovie', 'Cracovie', 'Gdansk', 'Wroclaw', 'Poznan', 'Lodz', 'Katowice'],
  NZL: ['Auckland', 'Wellington', 'Christchurch', 'Dunedin', 'Hamilton', 'Napier'],
  ZAF: ['Le Cap', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein'],
  IRL: ['Dublin', 'Cork', 'Limerick', 'Galway', 'Belfast', 'Waterford'],
  AUS: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adélaïde', 'Canberra'],
  GEO: ['Tbilissi', 'Koutaïssi', 'Batoumi', 'Roustavi'],
  FJI: ['Suva', 'Lautoka', 'Nadi', 'Labasa'],
  URY: ['Montevideo', 'Salto', 'Paysandú', 'Maldonado'],
  ROU: ['Bucarest', 'Cluj', 'Timisoara', 'Constanta', 'Iasi', 'Brasov'],
  HRV: ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Dubrovnik'],
  SRB: ['Belgrade', 'Novi Sad', 'Nis', 'Kragujevac', 'Subotica'],
  HUN: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Gyor'],
  MNE: ['Podgorica', 'Kotor', 'Budva', 'Niksic'],
  LTU: ['Vilnius', 'Kaunas', 'Klaipeda', 'Siauliai'],
  ISR: ['Tel-Aviv', 'Jérusalem', 'Haïfa', 'Beer-Sheva', 'Netanya'],
  CHN: ['Pékin', 'Shanghai', 'Canton', 'Shenzhen', 'Chengdu', 'Wuhan', 'Tianjin'],
  DNK: ['Copenhague', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg'],
  NOR: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø'],
  SWE: ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Linköping'],
  SVN: ['Ljubljana', 'Maribor', 'Celje', 'Koper'],
  ISL: ['Reykjavik', 'Akureyri', 'Hafnarfjördur', 'Kópavogur'],
  QAT: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Umm Salal'],
  EGY: ['Le Caire', 'Alexandrie', 'Gizeh', 'Port-Saïd', 'Assouan'],
  PHL: ['Manille', 'Cebu', 'Davao', 'Quezon City'],
  ARE: ['Dubaï', 'Abou Dabi', 'Charjah', 'Al-Aïn'],
};
