---
title: "Comment marche un LLM"
date: "2026-09-03"
category: "IA"
level: "Fondamental"
summary: "Prédire le token suivant, encore et encore : c'est tout ce que fait un LLM. Comprendre pourquoi ça suffit — et où ça casse — est devenu une question d'entretien incontournable, même pour un stage de dev classique."
---

## L'essentiel

Un LLM (*Large Language Model*) ne fait qu'une seule chose : **prédire le token suivant**. On lui donne un début de texte, il calcule une probabilité pour chaque token de son vocabulaire (~100 000 entrées), on en choisit un, on l'ajoute au texte, et on recommence. C'est la génération **autorégressive** : ChatGPT, Claude ou Llama ne « répondent » pas, ils complètent token par token un document qui a la forme d'une conversation.

La vraie question est : *pourquoi ça suffit ?* Parce que pour bien prédire la suite d'un texte, le modèle est obligé de capturer tout ce qui rend cette suite prévisible : la grammaire, les faits fréquents, le style, et jusqu'à la structure des raisonnements. Un « raisonnement » de LLM n'est pas un moteur logique caché derrière le texte — c'est la continuation statistiquement plausible d'un texte qui ressemble à un raisonnement. C'est ce qui le rend puissant, et c'est exactement ce qui le fait se tromper avec assurance.

## Comment ça marche

Le pipeline complet, du prompt à la réponse :

```text
        "Le chat" (texte)
             │  tokenizer (BPE)
             ▼
        [1169, 9852]   ← tokens = des entiers
             │  embedding
             ▼
        vecteurs (1 par token)
             │
    ┌────────▼─────────┐
    │   Transformer    │  N blocs : chaque token
    │  attention + MLP │  "regarde" les précédents,
    └────────┬─────────┘  pondérés par pertinence
             ▼
   probabilités sur tout le vocabulaire
   "dort" 31%   "mange" 12%   "est" 9% …
             │  sampling (température, top-p)
             ▼
        token choisi : "dort"
             │
             └──▶ ajouté au texte, et on boucle
```

- **Tokenization** — le texte est découpé en **tokens** : des fragments fréquents (mot entier, morceau de mot, ponctuation) appris par un algorithme type BPE (*Byte Pair Encoding*). Ordre de grandeur : 1 token ≈ 3-4 caractères, ≈ 0,75 mot en anglais. Le modèle ne voit jamais de lettres, seulement des identifiants entiers.
- **Embeddings** — en une phrase : chaque token est converti en un vecteur de nombres tel que la proximité géométrique reflète la proximité de sens (« roi » et « reine » sont voisins dans cet espace).
- **Attention, le cœur du transformer** — à chaque couche, chaque token « regarde » tous les tokens qui le précèdent et pondère leur influence selon leur pertinence *pour lui*. Dans « Le chien de Marie dort parce qu'**il** est fatigué », le token *il* accorde un poids fort à *chien* et faible à *Marie*. Pas besoin des maths en entretien : retenir **« contexte pondéré, calculé dynamiquement, en parallèle sur toute la séquence »**. Ce parallélisme est ce qui a détrôné les RNN (papier *Attention Is All You Need*, 2017).
- **Sortie et boucle** — après N blocs (attention + petit réseau feed-forward), le modèle produit la distribution du token suivant. Le **sampling** en tire un, et tout recommence avec un token de plus.

> 💡 **Le piège « strawberry »** — demandez à un LLM combien de « r » dans *strawberry* : beaucoup répondent 2. Normal : le mot arrive découpé en tokens (`straw` + `berry`), deux entiers sans notion de lettres. Compter des caractères, épeler à l'envers, poser une addition chiffre par chiffre : tout ce qui vit « sous » le niveau du token est structurellement difficile pour le modèle.

## Concepts clés à maîtriser

- **Pré-entraînement** — prédire le token suivant sur des milliers de milliards de tokens (web, livres, code). Résultat : un *base model* qui complète du texte mais ne « répond » pas — donnez-lui une question, il peut générer trois autres questions similaires.
- **Fine-tuning (SFT)** — on ré-entraîne le base model sur des exemples de dialogues instruction → bonne réponse. Le modèle apprend le *format* assistant.
- **RLHF** (*Reinforcement Learning from Human Feedback*) — des humains classent des paires de réponses ; on entraîne un modèle de récompense, puis on optimise le LLM contre lui. C'est ce qui rend le modèle utile, poli, et qui lui apprend à refuser certaines demandes.
- **Température et sampling** — la température aplati ou accentue la distribution avant le tirage ; le top-p coupe la longue traîne :

| Réglage | Effet | Cas d'usage |
|---|---|---|
| `temperature: 0` | quasi déterministe : toujours le token le plus probable | extraction, classification, code |
| `temperature: 0.7` | équilibre variété / cohérence | assistant, rédaction |
| `temperature: 1.5` | très aléatoire, dérive vite vers l'incohérent | brainstorming encadré |
| `top_p: 0.9` | ne tire que parmi le noyau couvrant 90 % de probabilité | couper les tokens absurdes |

- **Fenêtre de contexte** — la « mémoire de travail » : tout (system prompt, historique, documents) doit tenir dedans, et tout est **re-traité à chaque appel**. Limites concrètes : coût proportionnel à la taille, latence, et le phénomène *lost in the middle* (les informations au milieu d'un très long contexte sont moins bien exploitées que le début et la fin).
- **API stateless** — le modèle ne « se souvient » de rien entre deux appels : c'est votre code qui renvoie tout l'historique à chaque requête.

```python
from openai import OpenAI          # même logique chez Anthropic, Mistral…
client = OpenAI()

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        # "system" : cadre le comportement, prioritaire, invisible
        {"role": "system", "content": "Tu réponds en 2 phrases max."},
        # l'historique COMPLET est renvoyé à chaque appel :
        # l'API est stateless, rien n'est mémorisé côté modèle
        {"role": "user", "content": "C'est quoi un token ?"},
    ],
    temperature=0.2,   # bas = factuel et quasi reproductible
    max_tokens=150,    # plafond de génération (coût + latence)
)
print(resp.choices[0].message.content)
```

> 🎤 **En entretien** — « Explique un LLM à un non-technicien » : « C'est un autocomplete surpuissant. Comme le clavier du téléphone qui propose le mot suivant, mais entraîné sur une bibliothèque géante et capable de tenir compte de pages entières de contexte. Il ne sait pas ce qui est vrai — il sait ce qui est plausible. » Trois phrases, exactes, sans jargon : c'est ça qu'on évalue.

## En entretien

**« C'est quoi un LLM, en une phrase ? »** — Un réseau de neurones (architecture transformer) entraîné à prédire le token suivant sur d'immenses corpus, puis affiné (fine-tuning + RLHF) pour suivre des instructions. Tout le reste — dialogue, code, raisonnement apparent — émerge de cet objectif.

**« Pourquoi un LLM rate le nombre de "r" dans strawberry ? »** — À cause de la tokenization : il manipule des identifiants de tokens, pas des lettres. `strawberry` arrive en deux ou trois fragments ; compter des caractères demande une information qu'il n'a jamais vue directement. Bonus : citer le même problème pour l'arithmétique posée et les anagrammes.

**« Pré-entraînement, fine-tuning, RLHF : quelle différence ? »** — Pré-entraînement : apprendre la langue et le monde en prédisant le token suivant (99 % du coût). Fine-tuning : apprendre le format instruction → réponse sur des exemples choisis. RLHF : aligner sur les préférences humaines via un modèle de récompense. Image utile : culture générale → formation au métier → savoir-être.

**« À quoi sert la température ? »** — Elle règle le caractère aléatoire du tirage : 0 = toujours le token le plus probable (extraction, tests reproductibles), plus haut = plus de diversité. Piège à désamorcer soi-même : température 0 ne rend pas le modèle *plus juste*, juste plus déterministe.

**« Pourquoi les hallucinations ? »** — Parce que l'objectif d'entraînement récompense la *plausibilité*, pas la vérité : le modèle n'a ni base de faits ni mécanisme natif pour dire « je ne sais pas ». Une référence inventée est souvent la continuation la plus probable d'une question pointue. Atténuations : RAG (fournir les sources dans le contexte), outils externes, demander des citations — mais pas de correctif définitif.

## Pièges & idées reçues

> ⚠️ **« Température 0 = mode vérité »** — non : déterministe ≠ exact. Le token le plus probable peut être une hallucination très confiante. La reproductibilité n'est pas un gage de justesse, c'est juste moins de variance.

- **« Il comprend ce qu'il dit »** — formulation piégeuse en entretien : préférez « il modélise des régularités statistiques du langage » et laissez la philosophie de côté.
- **« Il va chercher dans une base de données / sur Internet »** — non : les connaissances sont figées dans les poids à l'entraînement (d'où le *knowledge cutoff*). Le browsing ou le RAG sont des outils *externes* branchés autour du modèle.
- **« Plus de contexte = toujours mieux »** — un contexte énorme coûte cher, ralentit, et le modèle exploite mal le milieu (*lost in the middle*). Mieux vaut un contexte court et pertinent.
- **Confondre paramètres et contexte** — les paramètres (7B, 70B…) sont les poids appris, figés ; la fenêtre de contexte est l'entrée temporaire d'un appel. Rien de ce qui passe dans le contexte ne « ré-entraîne » le modèle.

## Pour aller plus loin

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) — Jay Alammar, la référence visuelle
- [But what is a GPT?](https://www.3blue1brown.com/lessons/gpt) — 3Blue1Brown, l'intuition en animation
- [Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g) — Andrej Karpathy, 1 h qui couvre tout ce sujet
- [Le tokenizer d'OpenAI](https://platform.openai.com/tokenizer) — coller du texte et *voir* les tokens
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — le papier fondateur de 2017 (survoler les figures suffit)
