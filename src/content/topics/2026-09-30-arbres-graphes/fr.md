---
title: "Structures & parcours : listes, arbres, graphes"
date: "2026-09-30"
category: "CS"
level: "Intermédiaire"
summary: "Complexités des structures de base, BST et ses parcours, BFS/DFS et représentations de graphes : le cœur des questions d'algo en entretien — avec les réflexes pour choisir la bonne structure au bon moment."
---

## L'essentiel

Quasiment toute question d'algo en entretien commence par un choix de structure de données. Rappel express des briques de base :

- **Tableau** — mémoire contiguë : accès par index en O(1) et très cache-friendly ; mais insérer ou supprimer au milieu décale tout, O(n).
- **Liste chaînée** — des nœuds reliés par pointeurs : insertion/suppression O(1) *si on tient déjà le nœud*, mais accès et recherche O(n) (on suit les pointeurs un à un).
- **Pile (stack, LIFO)** — push/pop au sommet en O(1) : call stack, undo, DFS, parsing d'expressions.
- **File (queue, FIFO)** — enqueue/dequeue en O(1) : files de tâches, buffers, BFS.
- **Hash map** — recherche/insertion en O(1) *moyen* : l'outil par défaut dès qu'on associe des clés à des valeurs.

| Structure | Accès | Recherche | Insertion | Suppression |
|---|---|---|---|---|
| Tableau | O(1) | O(n) | O(n) | O(n) |
| Liste chaînée | O(n) | O(n) | O(1)* | O(1)* |
| Pile / File | — | — | O(1) | O(1) |
| Hash map | — | O(1) moy. | O(1) moy. | O(1) moy. |
| BST équilibré | — | O(log n) | O(log n) | O(log n) |
| Heap | O(1) min/max | — | O(log n) | O(log n) |

\* une fois le nœud en main — le trouver reste O(n).

## Comment ça marche

### Arbres : BST et heap

Un arbre est une hiérarchie sans cycle : une racine, des nœuds, des feuilles. Le **BST** (binary search tree) y ajoute un invariant : pour chaque nœud, *tout* le sous-arbre gauche est plus petit, *tout* le sous-arbre droit plus grand. Chercher, insérer, supprimer : on élimine la moitié de l'arbre à chaque étape → O(log n)… **si l'arbre est équilibré**. Insérez des valeurs déjà triées et il dégénère en liste chaînée à O(n) — d'où les arbres auto-équilibrés (AVL, rouge-noir) qui se rééquilibrent par rotations pour garantir O(log n), une phrase qui suffit en entretien.

Le **heap** (tas binaire) relâche l'invariant : chaque parent est simplement ≤ ses enfants (min-heap). Le minimum est à la racine en O(1), insertion et extraction en O(log n) : c'est l'implémentation standard de la **priority queue** (ordonnanceurs, Dijkstra, « top k éléments »).

### Les parcours

```text
              8
            /   \
           3     10
          / \      \
         1   6      14
            / \    /
           4   7  13

In-ordre   (G,N,D) : 1 3 4 6 7 8 10 13 14  ← trié !
Pré-ordre  (N,G,D) : 8 3 1 6 4 7 10 14 13
Post-ordre (G,D,N) : 1 4 7 6 3 13 14 10 8
BFS (par niveaux)  : 8 3 10 1 6 14 4 7 13
```

**DFS** (depth-first) plonge au fond avant de revenir — il s'écrit naturellement en récursif, la call stack servant de pile. **BFS** (breadth-first) explore par niveaux et exige une vraie file. Les trois ordres de DFS sur un arbre binaire : pré-ordre (copier/sérialiser), in-ordre, post-ordre (libérer les enfants avant le parent, calculer les tailles de dossiers).

> 💡 **La propriété star** — le parcours in-ordre d'un BST produit les valeurs **dans l'ordre trié**. Les entretiens l'adorent : « valide ce BST » (in-ordre strictement croissant ?), « k-ième plus petit élément » (le k-ième visité en in-ordre).

## Concepts clés à maîtriser

- **Graphe** — des sommets et des arêtes, orientées ou non, pondérées ou non. Un arbre n'est qu'un graphe connexe sans cycle.
- **Liste vs matrice d'adjacence** — liste (`{sommet: [voisins]}`) : O(V+E) en mémoire, parfaite pour les graphes creux, c'est-à-dire presque tous les cas réels. Matrice V×V : test « A→B ? » en O(1) mais O(V²) en mémoire — réservée aux graphes denses ou minuscules.
- **BFS = plus court chemin non pondéré** — en explorant par niveaux, on atteint chaque sommet *la première fois* par un chemin au nombre d'arêtes minimal. C'est LA justification à donner en entretien.
- **Dijkstra en survol** — dès que les arêtes ont des poids (positifs), BFS ne suffit plus : Dijkstra le généralise en remplaçant la file par une priority queue qui sort toujours le sommet à distance minimale.
- **Cycles** — détecter un cycle : DFS avec trois états (non visité / en cours / terminé) — retomber sur un sommet « en cours » = cycle. Sans cycle, un graphe orienté admet un **tri topologique** : l'ordre de traitement des dépendances.
- **Cas réels partout** — `npm install` : graphe de dépendances, tri topologique pour l'ordre d'installation, détection de cycles ; GPS et routage réseau : Dijkstra/A* ; le DOM : un arbre, `querySelector` le parcourt en profondeur ; réseaux sociaux : BFS pour les degrés de séparation ; garbage collector : parcours d'atteignabilité depuis les racines.

BFS canonique, avec une vraie file :

```python
from collections import deque

def bfs(graph, start):
    """Distances (en arêtes) depuis start — graphe non pondéré."""
    dist = {start: 0}               # visité ⇔ présent dans dist
    queue = deque([start])          # une FILE : c'est ça, BFS
    while queue:
        node = queue.popleft()      # FIFO : le plus ancien d'abord
        for neighbor in graph[node]:
            if neighbor not in dist:      # jamais vu ?
                dist[neighbor] = dist[node] + 1
                queue.append(neighbor)    # niveau suivant
    return dist   # dist[x] = plus court chemin start → x
```

> 🎤 **En entretien** — « BFS ou DFS, quand ? » BFS quand la *distance* compte : plus court chemin non pondéré, exploration par niveaux, cible probablement proche — coût mémoire proportionnel à la largeur. DFS quand il faut *tout* explorer ou analyser la structure : détection de cycles, tri topologique, backtracking, îlots dans une grille — mémoire proportionnelle à la profondeur, et trois lignes en récursif. Si les deux marchent (compter des composantes connexes), prendre le plus simple à écrire : DFS.

## En entretien

**« Tableau ou liste chaînée : quand choisir quoi ? »** — Tableau par défaut : accès O(1), cache-friendly. Liste chaînée seulement si on insère/supprime *en tenant déjà la position* (LRU cache, file d'attente chaînée) sans jamais avoir besoin d'accès par index. En pratique, les tableaux dynamiques gagnent presque toujours grâce au cache CPU.

**« Vérifie qu'un arbre binaire est un BST. »** — Le piège : comparer chaque nœud à son seul parent ne suffit pas — un nœud du sous-arbre gauche peut violer un ancêtre lointain. Correct : propager des bornes (min, max) en descendant, ou vérifier que l'in-ordre est strictement croissant.

**« Comment détecter un cycle dans un graphe de dépendances ? »** — DFS à trois états : blanc (jamais vu), gris (en cours de visite), noir (terminé). Une arête vers un sommet gris = cycle. Alternative : tri topologique de Kahn — s'il n'épuise pas tous les sommets, il y a un cycle. C'est ce que fait un bundler face à des imports circulaires.

**« Pourquoi BFS donne-t-il le plus court chemin ? »** — Parce qu'il explore par niveaux : tous les sommets à distance k sont visités avant ceux à distance k+1, donc la première visite d'un sommet emprunte un chemin minimal en arêtes. Dès que les arêtes sont pondérées, ça tombe : Dijkstra prend le relais.

**« C'est quoi une priority queue, et un usage concret ? »** — Une file où l'on extrait toujours l'élément de priorité minimale (ou maximale), implémentée par un heap : extraction O(log n), minimum en O(1). Usages : Dijkstra, ordonnanceur de tâches, « top k », fusion de k listes triées.

## Pièges & idées reçues

> ⚠️ **Le `visited` oublié** — sur un graphe (contrairement à un arbre), oublier de marquer les sommets visités transforme BFS/DFS en boucle infinie au premier cycle — et en explosion exponentielle même sans cycle (chemins en losange revisités). Marquer *au moment d'empiler/enfiler*, pas à la visite, sinon un même sommet entre deux fois dans la file.

- **« Un BST est équilibré par nature »** — non : insérer 1, 2, 3, … le dégénère en liste O(n). Les structures de production (std::map, TreeMap) sont auto-équilibrées, un BST naïf ne l'est pas.
- **Valider un BST en ne regardant que le parent** — le classique des entretiens : l'invariant porte sur *tout* le sous-arbre, pas sur l'enfant direct.
- **BFS avec une pile** — remplacez la file par une pile et vous obtenez un DFS : c'est la structure de stockage qui *fait* l'algorithme.
- **DFS récursif sur un graphe profond** — 10⁵ nœuds en ligne = stack overflow ; version itérative avec pile explicite.
- **« Hash map O(1), donc toujours mieux »** — pas d'ordre, pas de « plus proche voisin », pas de parcours trié : un BST ou un heap fait ce qu'un hash map ne sait pas faire.
- **Dijkstra avec des poids négatifs** — résultats silencieusement faux ; il faut Bellman-Ford dans ce cas.

## Pour aller plus loin

- [VisuAlgo](https://visualgo.net/) : BST, heap, parcours de graphes animés pas à pas — le meilleur outil pour « voir » les algos
- [Red Blob Games — Introduction to A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html) : BFS → Dijkstra → A*, interactif et progressif
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) : toutes les complexités sur une page
- [NeetCode Roadmap](https://neetcode.io/roadmap) : la progression trees → graphs avec les problèmes classiques d'entretien
- S'exercer : implémenter BFS et DFS sur un petit graphe en dict Python, puis ajouter la détection de cycle — 30 lignes qui couvrent la moitié des questions d'algo
