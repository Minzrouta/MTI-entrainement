---
title: "LLM en production : coûts, latence, evals & limites"
date: "2026-10-28"
category: "IA"
level: "Avancé"
summary: "Facturer au token change tout : cache, fallback, evals, observabilité — ce qui sépare une démo LLM d'un produit, et ce que les équipes IA attendent d'un stagiaire en entretien."
---

## L'essentiel

Une démo LLM se monte en une après-midi : un prompt, un appel d'API, une interface. La production révèle quatre murs que la démo cachait : le **coût** (chaque appel se facture au token), la **latence** (plusieurs secondes par réponse), la **fiabilité** (le modèle renvoie du texte libre, pas un contrat d'API) et l'**évaluation** (comment savoir que la qualité ne se dégrade pas ?). En entretien, ce sujet sépare ceux qui ont fait des notebooks de ceux qui ont fait tourner un produit.

La facture d'abord. Un appel se paie en **tokens d'entrée** (prompt système, contexte, historique) et en **tokens de sortie** (la réponse), la sortie coûtant en général 3 à 5 fois plus cher. Le coût caché est ailleurs : l'API est **sans état**, donc un chat renvoie tout l'historique à chaque tour. Au tour 50, vous re-payez les 49 tours précédents en entrée — le coût cumulé d'une conversation croît quasi quadratiquement avec sa longueur.

| Levier | Effet coût | Effet latence | Contrepartie |
|---|---|---|---|
| Cache de prompts | jusqu'à −90 % sur le préfixe répété | TTFT réduit (prefill évité) | préfixe identique octet pour octet |
| Modèle plus petit | −80 à −95 % | tokens/s plus rapides | qualité à prouver par des evals |
| Batch API | −50 % typique | résultats en minutes/heures | réservé à l'asynchrone |
| `max_tokens` + prompts concis | proportionnel | réponses plus courtes | peut tronquer une sortie utile |
| Streaming | nul | latence perçue ÷ 10 | complexité UI (SSE, parsing partiel) |
| Tronquer/résumer l'historique | casse la croissance quadratique | entrée plus courte | perte de mémoire conversationnelle |

## Comment ça marche

La latence se mesure avec deux métriques distinctes : le **time-to-first-token** (TTFT, le délai avant le premier mot) et le **débit** (tokens/seconde ensuite). Le **streaming** ne change rien à la durée totale mais transforme l'expérience : l'utilisateur lit pendant que le modèle écrit, la latence perçue tombe au TTFT. Un chatbot sans streaming paraît cassé au-delà de deux secondes ; avec, dix secondes de génération passent inaperçues.

La fiabilité repose sur un principe : **la sortie d'un LLM est une entrée non fiable**. Un modèle peut renvoyer du JSON invalide, un champ manquant, un format inattendu — même à température 0. Le pipeline robuste combine sortie structurée (tool calling ou mode JSON côté API), **validation stricte par schéma** (zod, pydantic), retry avec backoff, et **fallback** vers un second modèle si le principal échoue ou dépasse le timeout.

```text
Requête ──▶ garde-fous d'entrée (PII, injection)
   │
   ▼
Modèle principal ──erreur/timeout──▶ retry (backoff)
   │                                    │ échec
   ▼                                    ▼
Validation schéma ──invalide──▶ modèle de fallback
   │ ok                                 │
   ▼                                    ▼
Réponse (stream)                 validation, puis réponse
   │
   ▼
Traces : latence, tokens, coût par feature
```

Le même contrat en code :

```typescript
import { z } from "zod";

// Le schéma EST le contrat d'API : tout ce qui sort du
// modèle est validé avant d'entrer dans le système.
const Facture = z.object({
  fournisseur: z.string().min(1),
  total_centimes: z.number().int().nonnegative(),
  devise: z.enum(["EUR", "USD"]),
  echeance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const MODELES = ["grand-modele", "petit-modele-fallback"];

async function extraireFacture(texte: string, essai = 0) {
  const res = await llm.complete({
    model: MODELES[Math.min(essai, 1)], // fallback au 2e essai
    max_tokens: 300,         // borne dure sur le coût de sortie
    prompt: promptExtraction(texte),
  });
  const parsed = Facture.safeParse(JSON.parse(res.text));
  if (!parsed.success) {
    if (essai < 2) return extraireFacture(texte, essai + 1);
    // → file de revue humaine, jamais de données corrompues
    throw new Error("Extraction invalide après 3 essais");
  }
  return parsed.data; // typé, garanti conforme au schéma
}
```

> 🎤 **En entretien** — « Comment mettrais-tu un LLM en prod sans exploser le budget ? » Réponse qui marque : « Je mesure d'abord — traces avec tokens et coût par appel. Ensuite, dans l'ordre : cache de prompts sur le préfixe stable, modèle plus petit partout où les evals prouvent qu'il suffit, batch pour tout l'asynchrone, plafond `max_tokens`. Le tout piloté par un dashboard de coût par feature, pas au feeling. »

## Concepts clés à maîtriser

- **Cache de prompts** : le fournisseur facture ~10 % du prix normal pour un préfixe déjà vu. Condition : préfixe identique octet pour octet. D'où la règle d'architecture : instructions système et documents stables en tête du prompt, contenu variable en queue.
- **Cascade de modèles** : router les requêtes simples vers un petit modèle, réserver le gros aux cas difficiles. La décision se fonde sur des evals, jamais sur l'intuition.
- **Evals automatisées** : un jeu de test métier (50 à 200 cas réels annotés) rejoué à chaque changement de prompt ou de modèle, comme des tests de non-régression. Sans evals, modifier un prompt en prod revient à déployer sans tests.
- **LLM-as-judge** : faire noter les sorties par un autre LLM. Ça passe à l'échelle, avec des biais documentés : préférence pour les réponses longues (verbosity bias), pour la première position dans une comparaison (position bias), pour ses propres sorties (self-preference). À calibrer contre un échantillon annoté par des humains.
- **Observabilité LLM** : chaque appel tracé — prompt, réponse, latence, tokens, coût, version du prompt — et agrégé **par feature**. « Le résumé automatique coûte 40 % de la facture pour 5 % de l'usage » est une phrase qui déclenche des décisions.
- **Hallucinations** : le modèle prédit le texte le plus plausible, pas le plus vrai. C'est structurel — ça se **mitige** (RAG pour ancrer les réponses sur des sources, citations vérifiables, humain dans la boucle sur les actions critiques), ça ne se « corrige » pas.
- **Sécurité** : la **prompt injection** — des instructions hostiles cachées dans le contenu traité (« ignore tes instructions et… ») — n'a pas de correctif garanti, car le modèle ne sépare pas instructions et données. Défense en profondeur : moindre privilège pour les outils, validation des sorties, confirmation humaine des actions sensibles.

> ⚠️ **Données sensibles** — chaque prompt part sur les serveurs du fournisseur. Avant d'y envoyer des données clients : contrat de traitement (DPA), politique de rétention, opt-out d'entraînement, anonymisation quand c'est possible. « On enverra ça à l'API » est une décision juridique autant que technique.

## En entretien

**« Comment réduire la latence d'un chatbot LLM ? »** — Distinguer latence réelle et perçue. Perçue : streaming — la réponse commence au TTFT, quelques centaines de millisecondes. Réelle : modèle plus petit, prompt plus court, cache de prompts (le préfixe en cache accélère le prefill), limiter la longueur de sortie. Bonus : pré-calculer hors ligne tout ce qui peut l'être.

**« Comment garantir du JSON valide en sortie ? »** — On ne « garantit » rien par le prompt seul : mode JSON ou tool calling côté API, puis validation systématique par schéma (zod/pydantic) côté client, retry en cas d'échec, fallback ensuite. La sortie du LLM se traite comme une entrée utilisateur non fiable.

**« Comment évalues-tu la qualité d'une feature LLM ? »** — Jeu de test métier construit sur des cas réels, rejoué en CI à chaque changement de prompt ou de modèle. Métriques automatisables quand la tâche le permet (exactitude d'extraction, respect du format) ; LLM-as-judge calibré sur un échantillon humain pour le reste ; en prod, échantillonnage des réponses et feedback utilisateur.

**« Peut-on éliminer les hallucinations ? »** — Non : elles sont structurelles, le modèle optimise la plausibilité, pas la vérité. On réduit leur fréquence et leur impact : RAG avec citations, domaine de réponse contraint, autoriser « je ne sais pas », humain dans la boucle pour les actions à conséquences. Un candidat qui promet « zéro hallucination » se disqualifie.

**« C'est quoi la prompt injection ? »** — L'équivalent LLM de l'injection SQL, sans l'équivalent des requêtes préparées : le modèle ne distingue pas instructions et données dans son contexte, donc un document ou une page web traités peuvent contenir des ordres hostiles. Mitigations : moindre privilège pour les outils de l'agent, validation des sorties, confirmation humaine des actions sensibles.

## Pièges & idées reçues

- **« On a 200k tokens de contexte, mettons tout dedans »** — le contexte long se paie à chaque appel, allonge le prefill, et les modèles retrouvent mal l'information noyée au milieu (« lost in the middle »). Un RAG sélectif reste souvent plus précis et moins cher.
- **« Température 0 = déterminisme »** — non garanti : le calcul flottant et le batching côté serveur introduisent des variations. La validation reste obligatoire même à température 0.
- **« Le petit modèle est forcément moins bon »** — sur une tâche cadrée (classification, extraction), un petit modèle bien prompté fait souvent jeu égal. Seules les evals tranchent, dans les deux sens.
- **Retry naïf** — re-tenter sans backoff aggrave un rate limit ; re-tenter une action non idempotente (envoi d'email) la duplique. Backoff exponentiel + idempotence, comme pour n'importe quelle API.
- **LLM-as-judge pris pour argent comptant** — sans calibration humaine, vous optimisez les biais du juge (longueur, position), pas la qualité réelle.

> 💡 **Réflexe budget** — le coût d'une feature LLM se calcule avant de la coder : (tokens d'entrée moyens × prix d'entrée + tokens de sortie moyens × prix de sortie) × appels par jour. Trois minutes de calcul évitent la surprise en fin de mois.

## Pour aller plus loin

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) — la prompt injection en tête de liste
- [Judging LLM-as-a-Judge (Zheng et al., 2023)](https://arxiv.org/abs/2306.05685) — le papier de référence sur les biais du juge
- [Prompt caching — doc Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) et [Batch API — doc OpenAI](https://platform.openai.com/docs/guides/batch)
- [Langfuse](https://langfuse.com/) et les [conventions OpenTelemetry GenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/) pour tracer coûts et latences par feature
