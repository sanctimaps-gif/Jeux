# Empire Total
<div align="center">

<img src="BB9CEE77-F567-4142-A3FD-6BDE5307C01C.jpeg" width="280" alt="Logo de l'application Empire Total">

<h1>Empire Total</h1>

</div>

Jeu de gestion **hors ligne**, en français, qui mélange plusieurs genres dans une
seule partie : un empire d'entreprises, des placements (Bourse, immobilier,
cryptomonnaies), un **manager multisports dont on joue réellement les matchs**,
un casino, et la **direction d'un pays réel** sur une mappemonde interactive.

La particularité tient en une phrase : **il n'y a qu'un seul portefeuille**.
La prime encaissée après une victoire au rugby, le pot raflé au poker ou le
traitement de chef de l'État atterrissent sur le même compte que les loyers de
vos immeubles — et peuvent être replacés immédiatement en Bourse. Le jeu garde
même la trace de l'origine de chaque capital investi.

## Lancer le jeu

Aucune installation, aucun compte, aucun serveur.

* **Le plus simple** : ouvrir `index.html` dans un navigateur.
* **En application mobile (recommandé)** : servir le dossier en HTTP puis
  « Ajouter à l'écran d'accueil ». Le *service worker* met tout en cache, le jeu
  fonctionne ensuite sans réseau.

```bash
npx http-server -p 8080 .    # puis ouvrir http://localhost:8080
```

La partie est enregistrée automatiquement dans le navigateur (`localStorage`),
avec export / import par code texte depuis l'onglet Profil.

## Les six onglets

### 🏢 Entreprise

On **fonde** ses entreprises : on choisit un type dans un catalogue de 26
activités (du kiosque à journaux au conglomérat mondial), puis **on lui donne le
nom que l'on veut**. On ouvre ensuite sa fiche pour **investir palier par
palier** ; chaque palier augmente le revenu horaire, et tous les dix niveaux le
rendement double.

Les revenus ne se ramassent pas au clic : ils s'accumulent et **sont versés
automatiquement toutes les minutes** sur le compte en banque, avec un compte à
rebours visible. Le nombre d'entreprises est limité par les **emplacements
commerciaux**, que l'on peut acheter ; deux entreprises identiques arrivées au
maximum peuvent **fusionner** pour dépasser leur plafond.

### 📈 Investir

* **Actions** — seize valeurs cotées avec dividendes, actualités et humeur de
  marché. Posséder des entreprises dans un secteur soutient ses titres.
* **Immobilier** — dix types de biens dans douze villes, chacune avec son propre
  indice de prix. Les loyers tombent avec les salaires, chaque minute ; on peut
  rénover pour augmenter le rendement, et revendre en plus-value.
* **Cryptomonnaies** — dix jetons très volatils, achat au montant, *staking*
  rémunéré, et un « shitcoin » capable de faire ×10 comme de s'effondrer.
* **Collections** — objets de prestige qui prennent de la valeur et donnent des
  bonus permanents au reste du jeu.

### 🏟️ Manager

Six disciplines : **football, rugby à XV, water-polo, basket-ball, handball,
sport automobile**.

On achète un club **en choisissant son pays** parmi ceux où la discipline
compte, et **on le nomme**. On démarre toujours en **division 3** : les deux
premiers montent, les deux derniers descendent, jusqu'à l'élite. On peut
posséder **plusieurs clubs, y compris dans le même sport**, et les renommer à
tout moment.

Effectif complet (postes, forme, énergie, moral, blessures, contrats),
transferts, tactique, installations, staff, championnat sur saison complète avec
droits TV et primes de classement.

**Trois façons de disputer une rencontre :**

| | |
| --- | --- |
| 🎮 **Jouer le match** | Vous êtes sur le terrain. Vue rapprochée qui suit le ballon, joystick au pouce gauche, boutons Tirer / Passer / Sprint à droite. Vous contrôlez le porteur, vos coéquipiers se démarquent, les adversaires pressent, le gardien sort. En sport automobile, vous **pilotez la voiture** : direction au joystick, frein, DRS et arrêt au stand, avec usure des pneus et pluie. |
| 📋 **Diriger depuis le banc** | Le match se déroule séquence par séquence et vous tranchez aux moments clés : causerie de mi-temps, remplacement, pénalité à tenter, temps mort, choix des pneus. |
| ⏩ **Simuler** | Résultat immédiat. |

### 🎰 Casino

Blackjack complet (double, split, blackjack payé 3:2), Texas hold'em contre
trois adversaires, roulette européenne et machines à sous. Taux de retour
calibrés de façon réaliste (roulette 97,3 %, machines 92 %).

### 🌍 Pays

Une **mappemonde interactive** avec les **194 États membres de l'ONU**, leurs
vraies frontières, population, PIB, capitale et religion dominante. On finance
une campagne électorale dans le pays de son choix, puis on gouverne :

* **Économie** — fiscalité, budgets sociaux, banque centrale (emprunts,
  remboursements), commerce des ressources sur le marché mondial.
* **Production** — fermes, mines, plateformes pétrolières, scieries, usines,
  centrales thermiques, nucléaires et renouvelables, hôpitaux, universités,
  laboratoires, ports. Chaque bâtiment produit, consomme et emploie ; une
  pénurie coûte cher en importations d'urgence.
* **Armée** — infanterie, chars, artillerie, hélicoptères, chasseurs, navires,
  sous-marins et armes nucléaires.
* **Guerre** — déclaration, front qui progresse mois après mois, pertes,
  négociation de paix, **annexion** du pays vaincu (son territoire passe à vos
  couleurs sur la carte, sa population et son économie s'ajoutent aux vôtres).
* **Diplomatie & ONU** — relations pays par pays, cadeaux, pactes de
  non-agression, alliances, résolutions (sanctions, embargo, paix, aide,
  climat, libre-échange) avec achat de voix, et direction des grandes
  organisations internationales.
* **Recherche** — quatorze technologies, merveilles du monde, nomination des
  ministres, choix de l'idéologie et diffusion religieuse.

### 👤 Profil

Patrimoine détaillé, revenus passifs, flux d'argent par activité, origine des
capitaux replacés sur les marchés, journal, réglages — et une page
**« Fortunes mondiales »** qui situe votre fortune dans le classement des plus
grandes fortunes réelles, avec des repères d'échelle (millionnaire, milliardaire,
PIB de la France, PIB mondial…).

## Comment tout communique

| Ce que vous faites | Ce que ça change ailleurs |
| --- | --- |
| Une victoire de votre club | Fait monter les équipementiers cotés, alimente le bandeau « Réinvestir » |
| Un titre de champion | Fait bondir le secteur sport en Bourse |
| Des entreprises dans un secteur | Soutient durablement les valeurs de ce secteur |
| Une collection complétée | Bonus permanent sur les revenus, les sponsors, les dividendes ou le casino |
| Une loi votée au gouvernement | Modifie la croissance, la Bourse, vos coûts, vos sponsors |
| Un plan de soutien public | +25 % de production dans vos usines pendant six mois |
| Une guerre gagnée | Un pays entier rejoint votre territoire |
| N'importe quel gain | Immédiatement replaçable en Bourse, en immobilier ou en crypto, avec traçabilité de son origine |

## Organisation du code

Vanilla JavaScript, sans build, sans dépendance. Tout est exposé sur l'objet
global `G` pour que le jeu tourne aussi bien en PWA qu'en ouvrant simplement le
fichier HTML.

```
index.html            page unique
css/style.css         thème sombre, mobile d'abord
js/core/              util, état, économie partagée, sauvegarde, boucle de jeu
js/data/              catalogues : entreprises, actions, immobilier, crypto,
                      collections, sports, lois, données du monde et carte
js/game/              règles : entreprises, Bourse, immobilier, crypto,
                      collections, manager, moteur de match, courses,
                      mode action (terrain), pilotage, casino, géopolitique
js/ui/                socle d'interface, écran de jeu plein format, une vue
                      par onglet
sw.js                 mise en cache complète pour l'usage hors ligne
```

Le module clé est `js/core/economy.js` : toutes les activités passent par
`G.eco.earn()` et `G.eco.spend()` en déclarant leur origine, ce qui rend possible
le suivi des capitaux d'un univers à l'autre.

### Origine des données du monde

`js/data/world.js` et `js/data/worldmap.js` sont **générés** à partir de jeux de
données open source (`world-countries` et `country-json` pour les pays,
`world-atlas` / Natural Earth pour les frontières simplifiées). Les PIB par
habitant sont des ordres de grandeur destinés à l'équilibrage du jeu, pas des
statistiques officielles.
