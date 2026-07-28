---
title: "Embeddings & RAG"
date: "2026-09-24"
category: "IA"
level: "Intermédiaire"
summary: "Comment brancher un LLM sur des données qu'il ne connaît pas : embeddings, bases vectorielles et pipeline RAG — LA question IA qui tombe en entretien de stage en 2026."
---

## L'essentiel

Un **embedding** est la représentation d'un texte (mot, phrase, document) sous forme de **vecteur de nombres flottants** — typiquement 384 à 3072 dimensions — produit par un modèle entraîné pour que deux textes **proches en sens** donnent des vecteurs **proches dans l'espace**. « Comment réinitialiser mon mot de passe » et « j'ai perdu mes identifiants » ne partagent presque aucun mot, mais leurs vecteurs sont voisins : c'est la **proximité sémantique**, et c'est ce qui rend la recherche par embeddings supérieure au matching de mots-clés.

On mesure cette proximité avec la **similarité cosinus** : le cosinus de l'angle entre deux vecteurs (1 = même direction, 0 = orthogonaux, sans rapport). Avec des vecteurs normalisés, c'est un simple produit scalaire — rapide, même sur des millions de vecteurs grâce aux index approximatifs (HNSW).

Le **RAG** (Retrieval-Augmented Generation) exploite ça pour donner à un LLM des connaissances qu'il n'a pas : plutôt que de réentraîner le modèle, on **retrouve** les passages pertinents au moment de la question et on les **injecte dans le prompt**. Le modèle n'a rien appris de nouveau — il a juste la bonne page sous les yeux.

## Comment ça marche

Deux phases : l'**indexation** (offline, une fois puis à chaque mise à jour) et la **requête** (online, à chaque question).

```text
INDEXATION (offline)
docs ──▶ chunking ──▶ embedding ──▶ base vectorielle
        (morceaux)   (vecteurs)   (pgvector, Qdrant…)

REQUÊTE (online)
question ──▶ embedding ──▶ recherche top-k
                            (sim. cosinus)
                                 │
             LLM ◀── prompt ◀────┘
              │    (contexte + question)
              ▼
         réponse sourcée
```

**Indexation** : on découpe les documents en **chunks** (200 à 1000 tokens, avec un chevauchement de 10-20 % pour ne pas couper une idée en deux), on calcule l'embedding de chaque chunk, et on stocke vecteur + texte + métadonnées (source, titre, date) dans une base vectorielle.

**Côté bases vectorielles** : **pgvector** (extension PostgreSQL) est le choix pragmatique — vos vecteurs vivent dans la base que vous avez déjà, avec du SQL, des jointures et un index HNSW pour la recherche approximative. Les bases dédiées (Qdrant, Weaviate, Milvus, Pinecone en managé) apportent filtrage avancé et scalabilité — utiles au-delà de quelques millions de vecteurs, overkill avant.

**Requête** : on embed la question **avec le même modèle**, on récupère les k chunks les plus proches (kNN), et on construit le prompt : instructions (« réponds uniquement à partir du contexte, cite tes sources »), chunks, puis question. Le LLM génère une réponse ancrée dans les documents.

> 💡 **Règle d'or** — le même modèle d'embedding à l'indexation ET à la requête. Deux modèles différents produisent des espaces vectoriels incompatibles : les similarités n'ont plus aucun sens. Corollaire : changer de modèle d'embedding = tout réindexer.

> 🎤 **En entretien** — la question type : « comment brancherais-tu un chatbot sur la doc interne ? ». Déroulez le pipeline dans l'ordre (chunking → embeddings → pgvector → retrieval → prompt), justifiez RAG plutôt que fine-tuning (fraîcheur, coût, citations), et finissez par l'évaluation du retrieval. Vous venez de couvrir 90 % des attentes.

## Concepts clés à maîtriser

- **Chunking** : le paramètre le plus sous-estimé. Un découpage naïf (tous les 500 caractères) coupe des phrases et des tableaux en deux → chunks incompréhensibles. Mieux : découper selon la structure (titres, paragraphes), garder un overlap, attacher les métadonnées (titre de section dans le chunk).
- **RAG vs fine-tuning** : deux outils pour deux problèmes différents.

| | RAG | Fine-tuning |
|---|---|---|
| Ajouter de la connaissance | ✅ le cas d'usage | ❌ mémorisation floue, hallucinations |
| Fraîcheur des données | Réindexer un doc = à jour | Réentraîner à chaque mise à jour |
| Coût | Embeddings + stockage (marginal) | GPU, dataset, itérations |
| Citations / traçabilité | Sources exactes citables | Aucune traçabilité |
| Bon pour | Docs internes, FAQ, support | Style, format, comportement |

- **Les vrais problèmes en production** : le **retrieval qui rate** (vocabulaire métier absent du modèle d'embedding, question trop vague), le **contexte pollué** (chunks hors sujet qui noient l'info utile — les LLM lisent mal le milieu d'un long contexte, le fameux *lost in the middle*), et le chunking naïf ci-dessus. La plupart des « le LLM répond mal » sont en réalité des « le retrieval a remonté les mauvais chunks ».
- **Recherche hybride** (survol) : combiner la recherche lexicale (BM25 — exacte sur les mots) et vectorielle (sémantique), fusionnées par RRF. Indispensable pour les identifiants exacts (codes d'erreur, références produit) que les embeddings ratent.
- **Reranking** (survol) : un cross-encoder re-classe les ~50 premiers résultats en un top-5 bien plus précis. Plus lent, donc appliqué *après* le retrieval rapide, sur peu de candidats.
- **Évaluation : le retrieval d'abord.** Si les bons chunks ne remontent pas, aucun prompt ne sauvera la réponse. On mesure le retrieval (recall@k sur un jeu de questions annotées « quel chunk contient la réponse ? »), puis seulement la génération (fidélité au contexte, taux de citation).

Le pipeline complet en pseudo-code :

```python
# --- Indexation (offline) ---
for doc in documents:
    chunks = split(doc, size=500, overlap=50)  # par structure si possible
    for c in chunks:
        vec = embed(c.text)                    # même modèle partout !
        db.insert(vec, c.text, c.metadata)     # pgvector, Qdrant…

# --- Requête (online) ---
q_vec = embed(question)                        # le MÊME modèle
hits = db.search(q_vec, top_k=5)               # kNN, similarité cosinus
context = "\n\n".join(h.text for h in hits)

prompt = f"""Réponds uniquement à partir du contexte.
Cite tes sources. Si l'info n'y est pas, dis-le.

Contexte :
{context}

Question : {question}"""

answer = llm(prompt)                           # génération "augmentée"
```

## En entretien

**« C'est quoi un embedding ? »** — Un vecteur dense de nombres flottants produit par un modèle de langage, qui capture le *sens* d'un texte : deux textes sémantiquement proches donnent des vecteurs proches. On compare les vecteurs par similarité cosinus. C'est la brique de la recherche sémantique, du clustering et du RAG.

**« Pourquoi RAG plutôt que fine-tuning pour la doc d'entreprise ? »** — Trois raisons : **fraîcheur** (réindexer un document suffit, pas de réentraînement), **coût** (des embeddings contre des heures de GPU), **citations** (on sait de quel document vient la réponse — critique pour la confiance et le débogage). Le fine-tuning sert à changer le *comportement* (ton, format), pas à injecter de la connaissance factuelle.

**« Ton RAG répond mal : tu débogues comment ? »** — D'abord le retrieval, pas le prompt : je loggue les chunks récupérés et je vérifie s'ils contiennent la réponse. S'ils ne la contiennent pas → problème de chunking, de modèle d'embedding ou besoin d'hybride/reranking. S'ils la contiennent → problème de prompt ou de contexte pollué (réduire k, reranker).

**« Similarité cosinus vs distance euclidienne ? »** — Le cosinus compare la *direction* des vecteurs en ignorant leur norme ; l'euclidienne mesure la distance absolue. Avec des vecteurs normalisés (le cas standard des modèles d'embedding), les deux donnent le même classement — le cosinus est la convention.

**« Comment gères-tu les mises à jour de la doc ? »** — Réindexation incrémentale : un hash par chunk, on ne ré-embed que ce qui a changé, on supprime les chunks orphelins. Jamais de réindexation complète à chaque commit.

## Pièges & idées reçues

> ⚠️ **Piège classique** — comparer des embeddings issus de **modèles différents** (ou de versions différentes du même modèle) : les similarités sont du bruit. Symptôme typique : un retrieval qui devient absurde après une « simple mise à jour » du modèle d'embedding sans réindexation.

- **« Plus de chunks dans le contexte = meilleure réponse »** — non : au-delà d'un certain k, on ajoute du bruit, du coût, et l'info utile se perd au milieu (*lost in the middle*). Mieux vaut 5 chunks reclassés que 20 bruts.
- **« Le RAG élimine les hallucinations »** — il les réduit. Le modèle peut ignorer le contexte ou broder autour. D'où les instructions strictes (« si l'info n'y est pas, dis-le ») et les citations vérifiables.
- **Similarité ≠ pertinence** : « comment supprimer mon compte » et « comment créer mon compte » sont très proches en cosinus… et opposés en intention. C'est exactement ce que le reranking corrige.
- **Base vectorielle dédiée d'office** — réflexe de sur-ingénierie : pgvector tient très bien jusqu'à plusieurs millions de vecteurs, dans la base que vous administrez déjà.

## Pour aller plus loin

- [pgvector](https://github.com/pgvector/pgvector) — l'extension PostgreSQL, lisez le README en entier (index HNSW/IVFFlat)
- [Lewis et al., 2020](https://arxiv.org/abs/2005.11401) — le papier fondateur du RAG
- [SBERT / sentence-transformers](https://www.sbert.net/) — manipuler des embeddings localement en 5 lignes de Python
- [Pinecone — Retrieval-Augmented Generation](https://www.pinecone.io/learn/retrieval-augmented-generation/) — guide illustré du pipeline
