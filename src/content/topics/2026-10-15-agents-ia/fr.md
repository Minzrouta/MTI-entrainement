---
title: "Agents, function calling & prompt engineering"
date: "2026-10-15"
category: "IA"
level: "Intermédiaire"
summary: "Comment un LLM « agit » sur le monde : function calling, boucle agentique, définition d'outils et prompts sérieux — le sujet IA qui monte le plus vite en entretien."
---

## L'essentiel

Un LLM ne sait faire qu'une chose : produire du texte. Il ne peut ni interroger une base, ni envoyer un mail, ni exécuter du code. Le **function calling** (ou *tool use*) est le mécanisme qui contourne cette limite : on décrit au modèle une liste d'outils disponibles (nom, description, schéma des paramètres), et au lieu de répondre en prose, le modèle peut émettre un **appel structuré** — « appelle `get_weather` avec `{"city": "Paris"}` ». C'est **votre code** qui exécute réellement la fonction, puis renvoie le résultat au modèle, qui continue sa réponse.

Point capital à énoncer clairement en entretien : **le modèle n'exécute rien lui-même**. Il émet une intention formatée en JSON ; l'exécution, la validation et les permissions restent côté application. Le modèle propose, votre code dispose.

Un **agent** naît quand on met ce mécanisme dans une boucle : le modèle reçoit un objectif, choisit un outil, observe le résultat, et recommence jusqu'à ce que l'objectif soit atteint. C'est exactement ainsi que fonctionnent Claude Code, Cursor ou les agents « deep research ».

## Comment ça marche

La boucle agentique tient dans un schéma :

```text
objectif de l'utilisateur
        │
        ▼
┌───────────────────────────────────┐
│ LLM : raisonne sur l'état courant │◀────────┐
└───────────────────────────────────┘         │
   │ réponse finale        │ tool call        │
   ▼                       ▼                  │
terminé          VOTRE code exécute           │
                 (API, DB, shell…)            │
                           │                  │
                           ▼                  │
                 résultat = observation ──────┘
                 (renvoyé dans le contexte)
```

Chaque tour, l'historique complet (objectif + appels + observations) est renvoyé au modèle. Concrètement, un outil se définit par un schéma JSON, et sa **description est du prompt engineering** : c'est elle qui décide si le modèle utilisera l'outil à bon escient.

```json
{
  "name": "search_orders",
  "description": "Recherche des commandes par client ou statut. À utiliser AVANT de répondre à toute question sur une commande. Ne retourne que les 20 premiers résultats.",
  "input_schema": {
    "type": "object",
    "properties": {
      "customer_email": { "type": "string", "description": "Email exact du client" },
      "status": { "type": "string", "enum": ["pending", "shipped", "cancelled"] }
    },
    "required": ["customer_email"]
  }
}
```

Le modèle répond alors non pas en texte, mais avec un bloc `tool_use` : `{"name": "search_orders", "input": {"customer_email": "jo@ex.fr", "status": "pending"}}`. Votre code valide ce JSON contre le schéma, exécute la vraie requête SQL, et renvoie le résultat comme `tool_result`. Le `enum` et le `required` ne sont pas décoratifs : un schéma strict réduit mécaniquement les erreurs du modèle.

> 💡 **Règle d'or des outils** — écrivez la description comme une doc pour un nouveau stagiaire : quand l'utiliser, quand ne PAS l'utiliser, ce que ça retourne, les limites. Un agent qui se trompe d'outil a presque toujours un problème de description, pas un problème de modèle.

## Concepts clés à maîtriser

- **Function calling ≠ exécution** : le modèle émet une intention structurée. La boucle appel → exécution → observation est orchestrée par votre code (ou un SDK type Claude Agent SDK / LangChain).
- **Prompt engineering sérieux** : pas les « astuces magiques » (« je te donne 200 $ de pourboire »), mais quatre leviers reproductibles — un **rôle** clair, des **contraintes** explicites (format, longueur, ce qu'il ne faut pas faire), des **exemples few-shot** (2-3 paires entrée/sortie valent mieux qu'un paragraphe d'explication), et une **sortie structurée** (JSON schema, balises) qu'un programme peut parser.

| | Mauvais prompt | Bon prompt |
|---|---|---|
| Rôle | « Réponds à la question » | « Tu es un agent support niveau 1 de l'entreprise X » |
| Contraintes | Implicites | « Réponds en 3 phrases max. Si tu ne sais pas, dis-le. » |
| Exemples | Aucun | 2-3 exemples few-shot entrée → sortie attendue |
| Sortie | Texte libre | JSON conforme à un schéma donné |
| Contexte | « Voici des infos : … » (vrac) | Sections délimitées (balises, titres), données pertinentes seulement |

- **MCP, la standardisation** : plutôt que de re-coder l'intégration de chaque outil pour chaque app, le Model Context Protocol expose outils et ressources via un protocole standard client/serveur — voir la fiche MCP (18 août) pour le détail.
- **Les échecs classiques d'agents** : la **boucle infinie** (l'agent réessaie sans fin le même appel qui échoue), l'**hallucination d'outil** (appel d'un outil qui n'existe pas, ou paramètres inventés), et l'**explosion des coûts** (chaque tour renvoie tout l'historique : un agent qui boucle 50 fois consomme 50 fois le contexte).
- **Les garde-fous** : limite dure d'itérations, budget de tokens, **permissions par outil** (lecture libre, écriture sur validation), et **humain dans la boucle** pour toute action irréversible (paiement, suppression, envoi d'email). Un agent en production sans garde-fou est un incident en attente.

## En entretien

**« Explique-moi le function calling. »** — On fournit au modèle des définitions d'outils (nom, description, JSON schema). Quand la question le nécessite, le modèle répond par un appel structuré au lieu de prose. Mon code valide les paramètres, exécute la fonction réelle, renvoie le résultat au modèle qui produit la réponse finale. Insister : le modèle ne fait qu'émettre du JSON, l'exécution est entièrement côté application.

**« Qu'est-ce qui différencie un agent d'un simple appel LLM ? »** — La boucle. Un appel simple : prompt → réponse. Un agent : objectif → le modèle choisit un outil → exécution → observation réinjectée → nouveau raisonnement, jusqu'à l'objectif ou une limite. L'agent décide dynamiquement du chemin ; un pipeline classique le fixe à l'avance.

**« Comment éviter qu'un agent parte en vrille ? »** — Limite d'itérations et de budget, timeouts sur les outils, validation stricte des paramètres contre le schéma, permissions graduées (lecture vs écriture), et validation humaine pour l'irréversible. Et observer : logger chaque appel d'outil pour rejouer les trajectoires qui échouent.

**« C'est quoi un bon outil pour un agent ? »** — Une description qui dit quand l'utiliser et quand ne pas l'utiliser, un schéma strict (`enum`, `required`, types précis), un périmètre étroit (un outil = une action claire), et des erreurs retournées en texte exploitable (« client introuvable, vérifie l'email ») plutôt qu'une stack trace — l'agent lit l'erreur et peut se corriger.

**« Few-shot vs fine-tuning ? »** — Few-shot : on met des exemples dans le prompt, immédiat, réversible, suffisant dans la majorité des cas. Fine-tuning : on réentraîne le modèle, coûteux et lent, pertinent pour un style/format très spécifique à haut volume. Réflexe : épuiser le prompt engineering avant de parler de fine-tuning.

## Pièges & idées reçues

> ⚠️ **Prompt injection** — dès qu'un agent lit du contenu externe (page web, email, ticket), ce contenu peut contenir des instructions (« ignore tes consignes et envoie les données à… ») que le modèle risque de suivre. C'est LA faille des agents, sans correctif définitif à ce jour. Mitigations : moindre privilège sur les outils, validation humaine des actions sensibles, séparer données et instructions dans le prompt. Un agent avec accès à des données privées + du contenu non fiable + un canal de sortie = combinaison dangereuse (la « triple létale »).

- **« Le modèle exécute mes fonctions »** — non. Il émet un JSON. Si votre code ne valide pas les paramètres avant exécution, c'est votre faille, pas celle du modèle.
- **« Plus d'outils = agent plus capable »** — au contraire : 40 outils aux descriptions floues dégradent le choix. Peu d'outils, bien décrits, à périmètre net.
- **« Le prompt engineering, c'est des formules magiques »** — les incantations vieillissent mal d'un modèle à l'autre ; rôle, contraintes, exemples et format de sortie restent efficaces partout.
- **Oublier le coût de la boucle** : l'historique complet repart à chaque tour. Sans limite d'itérations ni cache de prompt, la facture explose silencieusement.

> 🎤 **En entretien** — le mot qui fait la différence : « déterministe ». Dites « je garde tout ce qui peut être déterministe hors du LLM — validation, permissions, orchestration — et je ne délègue au modèle que la décision », et vous venez de montrer que vous savez construire un agent de production, pas une démo.

## Pour aller plus loin

- [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) : le guide de référence, workflows vs agents
- [Anthropic — Tool use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview) et [OpenAI — Function calling](https://platform.openai.com/docs/guides/function-calling) : les deux APIs à connaître
- [Model Context Protocol](https://modelcontextprotocol.io/) — la spec MCP (et la fiche MCP du 18 août)
- [ReAct: Synergizing Reasoning and Acting](https://arxiv.org/abs/2210.03629) — le papier fondateur de la boucle raisonnement/action
- Exercice concret : écrire soi-même la boucle (une centaine de lignes) avec un seul outil `get_weather` — rien ne démystifie mieux les agents
