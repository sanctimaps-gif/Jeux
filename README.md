# Empire Total
<div align="center">

<img src="BB9CEE77-F567-4142-A3FD-6BDE5307C01C.jpeg" width="280" alt="Logo du jeu Empire Total">

Jeu de gestion **hors ligne**, en français, qui mélange plusieurs genres dans une
seule partie : un empire d'entreprises façon *Business Empire* (entreprises,
actions, collections), un **manager multisports** dont on joue réellement les
matchs, un **casino** et la **gestion d'un pays**.

La particularité tient en une phrase : **il n'y a qu'un seul portefeuille**.
La prime encaissée après une victoire au rugby, le pot raflé au poker ou le
traitement de chef de l'État atterrissent sur le même compte que les revenus de
vos usines — et peuvent être replacés immédiatement en Bourse. Le jeu garde même
la trace de l'origine de chaque capital investi.

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

## Les cinq onglets

### 🏢 Empire

* **Entreprises** — douze paliers, du kiosque à journaux au groupe spatial.
  Chaque niveau augmente le rendement, chaque palier (10, 25, 50, 100…) le
  double, et un directeur rend l'encaissement automatique. La production
  continue hors ligne (rattrapage plafonné à 8 heures).
* **Bourse** — seize valeurs cotées qui évoluent en continu, avec dividendes
  trimestriels, actualités et humeur de marché. Posséder des entreprises dans un
  secteur soutient les titres de ce secteur.
* **Collections** — voitures, montres, art, trophées, immobilier de prestige.
  Les pièces prennent de la valeur et donnent des bonus permanents ; compléter
  une série débloque un bonus majeur.

### 🏟️ Manager

Six disciplines, un même moteur : **football, rugby à XV, water-polo,
basket-ball, handball et sport automobile**.

On rachète un club, puis on gère l'effectif (postes, forme, énergie, moral,
blessures, contrats), les transferts, la tactique, les installations et le staff
— et surtout **on joue les rencontres** : le match se déroule séquence par
séquence, avec des moments où la main revient au joueur (causerie de mi-temps,
remplacement, pénalité à tenter, temps mort, choix des pneus, arrêt au stand
sous voiture de sécurité…). Chaque décision modifie réellement la suite.

Le championnat se déroule sur une saison complète avec classement, droits TV,
primes, promotion des jeunes du centre de formation et vieillissement des
joueurs.

### 🎰 Casino

Blackjack complet (double, split, blackjack payé 3:2), Texas hold'em contre
trois adversaires gérés par l'ordinateur, roulette européenne et machines à
sous. Les taux de retour sont calibrés de façon réaliste (roulette 97,3 %,
machines 92 %) : le casino accélère une trésorerie, il ne la remplace pas.

### 🏛️ Pays

À partir d'une certaine fortune, on finance une campagne électorale et on dirige
un pays : fiscalité, budgets des huit ministères, lois, dette, popularité,
chômage, inflation, évènements et réélection en fin de mandat. La conjoncture
nationale se répercute sur vos entreprises et sur les marchés — et le Trésor
public peut, pour un coût politique, subventionner vos propres affaires.

### 👤 Profil

Patrimoine détaillé, flux d'argent par activité, origine des capitaux replacés
en Bourse, journal des mouvements, réglages et sauvegarde.

## Comment tout communique

| Ce que vous faites | Ce que ça change ailleurs |
| --- | --- |
| Une victoire de votre club | Fait monter les équipementiers cotés, alimente le bandeau « Réinvestir » |
| Un titre de champion | Fait bondir le secteur sport en Bourse |
| Des entreprises dans un secteur | Soutient durablement les valeurs de ce secteur |
| Une collection complétée | Bonus permanent sur les revenus, les sponsors, les dividendes ou le casino |
| Une loi votée au gouvernement | Modifie la croissance, la Bourse, vos coûts, vos sponsors |
| Un plan de soutien public | +25 % de production dans vos usines pendant six mois |
| N'importe quel gain | Immédiatement replaçable en Bourse, avec traçabilité de son origine |

## Organisation du code

Vanilla JavaScript, sans build, sans dépendance. Tout est exposé sur l'objet
global `G` pour que le jeu tourne aussi bien en PWA qu'en ouvrant simplement le
fichier HTML.

```
index.html            page unique
css/style.css         thème sombre, mobile d'abord
js/core/              util, état, économie partagée, sauvegarde, boucle de jeu
js/data/              catalogues : entreprises, actions, collections, sports, pays
js/game/              règles : entreprises, Bourse, collections, manager,
                      moteur de match, courses, casino, gouvernement
js/ui/                socle d'interface et une vue par onglet
sw.js                 mise en cache complète pour l'usage hors ligne
```

Le module clé est `js/core/economy.js` : toutes les activités passent par
`G.eco.earn()` et `G.eco.spend()` en déclarant leur origine, ce qui rend possible
le suivi des capitaux d'un univers à l'autre.
