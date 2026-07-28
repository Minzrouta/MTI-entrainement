---
title: "Linux pour développeur"
date: "2026-09-29"
category: "DevOps"
level: "Fondamental"
summary: "Processus et signaux, permissions, pipes, systemd et les commandes qui sauvent : le socle Linux qu'on attend d'un stagiaire dev — et la méthode pour déboguer un serveur qui ne répond plus."
---

## L'essentiel

Vos serveurs tournent sous Linux. Vos conteneurs Docker aussi. Votre CI, votre Raspberry Pi, et 100 % du top 500 des supercalculateurs. Un développeur qui sait se débrouiller dans un shell Linux débogue seul ce que les autres escaladent — c'est exactement ce qu'un recruteur cherche chez un stagiaire.

Deux idées fondatrices structurent tout le système :

- **Tout est fichier** — les disques (`/dev/sda`), les sockets, et même l'état du noyau : `/proc` est un filesystem virtuel où chaque processus a son répertoire (`/proc/1234/`), où `cat /proc/cpuinfo` lit les CPU et `/proc/meminfo` la mémoire. Lire, écrire, rediriger : une seule interface pour tout.
- **Petits outils composables** — la philosophie Unix : chaque programme fait *une* chose bien, le texte est l'interface universelle, et le pipe `|` les assemble en chaînes puissantes. `grep` ne sait pas trier, `sort` ne sait pas filtrer — ensemble, ils font de l'analyse de logs.

## Comment ça marche

### Processus : fork, exec, signaux

Un nouveau processus naît toujours par **`fork()`** (le parent se clone) généralement suivi d'**`exec()`** (le clone se remplace par le nouveau programme) — c'est ainsi que votre shell lance chaque commande. Chaque processus a un **PID** ; le tout premier, **PID 1** (systemd), démarre le système et adopte les orphelins.

On parle aux processus par **signaux** :

| Signal | N° | Effet | Interceptable ? |
|---|---|---|---|
| SIGHUP | 1 | terminal fermé / recharger la config | oui |
| SIGINT | 2 | Ctrl+C | oui |
| SIGTERM | 15 | « termine-toi proprement » (défaut de `kill`) | oui |
| SIGKILL | 9 | mort immédiate, décidée par le noyau | **non** |
| SIGSEGV | 11 | accès mémoire invalide | oui |
| SIGSTOP / SIGCONT | 19 / 18 | pause / reprise | non / oui |

**SIGTERM vs SIGKILL**, la nuance qui compte : SIGTERM est une *demande* — le processus peut fermer ses connexions, flusher ses buffers, sauvegarder, puis sortir. SIGKILL ne lui parvient jamais : le noyau le supprime, sans aucun cleanup. C'est le protocole exact de `docker stop` : SIGTERM au PID 1 du conteneur, 10 secondes de grâce, puis SIGKILL. Une app qui n'écoute pas SIGTERM (ou lancée derrière un shell qui ne relaie pas les signaux) meurt brutalement à chaque déploiement.

### stdin, stdout, stderr et redirections

Chaque processus démarre avec trois flux numérotés : l'entrée standard (0), la sortie standard (1) et la sortie d'erreur (2). Le shell peut les rebrancher où il veut :

```text
        stdin (0)             stdout (1)
clavier ─────────▶ processus ─────────▶ terminal
                       │
                       └─── stderr (2) ─────▶ terminal

cmd > out.log     stdout → fichier (écrase ; >> ajoute)
cmd 2> err.log    stderr → fichier
cmd > f 2>&1      les deux → f (l'ordre compte !)
cmd1 | cmd2       stdout de cmd1 → stdin de cmd2
```

Le pipe est la pièce maîtresse : il branche la sortie d'un programme sur l'entrée du suivant, sans fichier intermédiaire. Un cas réel — trouver les IP qui martèlent votre endpoint de login :

```bash
grep "POST /api/login" access.log \
  | awk '{print $1}'   # extraire la 1re colonne : l'IP
  | sort               # uniq exige des lignes adjacentes
  | uniq -c            # compter les occurrences par IP
  | sort -rn           # tri numérique décroissant
  | head -10           # top 10 des IP les plus insistantes
```

> 💡 **Réflexe à montrer** — le `sort` avant `uniq -c` n'est pas décoratif : `uniq` ne fusionne que les lignes *adjacentes*. L'oublier donne des comptes faux — le genre de détail qui prouve en entretien que vous avez vraiment pratiqué.

## Concepts clés à maîtriser

- **Permissions rwx** — trois triplets : propriétaire, groupe, autres. En octal : r=4, w=2, x=1. `chmod 755` = `rwxr-xr-x` (exécutable par tous, modifiable par le seul propriétaire) ; `600` = `rw-------` (clé SSH privée). `sudo` exécute une commande en root — un privilège à justifier, pas un réflexe.
- **Variables d'environnement & PATH** — un ensemble clé=valeur hérité par les processus enfants (`export API_URL=…`). Le `PATH` liste les répertoires où le shell cherche les commandes, dans l'ordre — c'est pourquoi un script local se lance avec `./script.sh`, et pourquoi `which python` lève les doutes.
- **systemd en survol** — le gestionnaire de services : `systemctl status nginx` (état), `start`/`stop`/`restart`, `enable` (démarrage au boot). Les logs passent par `journalctl -u nginx -f` (le `-f` suit en direct).
- **Les commandes qui sauvent** — `grep -rn "motif" .` (chercher dans le code), `find . -name "*.log"` (trouver des fichiers), `ps aux` (processus en cours), `ss -tlnp` (ports en écoute et par qui), `tail -f app.log` (suivre un log en direct), `df -h` (espace disque), `du -sh *` (qui prend la place), `top`/`htop` (CPU/RAM en temps réel).
- **SSH & clés** — une paire clé publique/privée remplace le mot de passe : la publique va dans `~/.ssh/authorized_keys` du serveur, la privée ne quitte *jamais* votre machine. Plus sûr (rien à deviner par force brute) et scriptable (CI, déploiements).

> 🎤 **En entretien** — « un serveur ne répond plus, tu fais quoi ? » Déroulez une méthode, pas une liste : (1) j'accède — ping, puis SSH ; (2) `top` — CPU saturé ? plus de RAM ? un processus fou ? ; (3) `df -h` — disque plein, la cause la plus bête et la plus fréquente ; (4) `ss -tlnp` — mon service écoute-t-il encore son port ? ; (5) `systemctl status app` puis `journalctl -u app -n 100` ou `tail -f` sur ses logs — l'erreur y est presque toujours. Une démarche structurée vaut dix commandes récitées.

## En entretien

**« SIGTERM vs SIGKILL ? »** — SIGTERM (15) demande un arrêt propre : le processus peut l'intercepter pour fermer connexions et buffers. SIGKILL (9) est ininterceptable : le noyau tue sans cleanup. Bonus : `docker stop` envoie SIGTERM, attend 10 s, puis SIGKILL — d'où l'importance de gérer SIGTERM dans une app conteneurisée.

**« Que signifie `chmod 640` ? »** — Octal : 6 = rw- (propriétaire), 4 = r-- (groupe), 0 = --- (autres). Lecture-écriture pour le propriétaire, lecture seule pour le groupe, rien pour le reste du monde — typique d'un fichier de config avec secrets.

**« Comment un processus est-il créé sous Linux ? »** — Par `fork()` : le parent se clone (même code, mémoire copiée) ; puis en général `exec()` remplace l'image du clone par le nouveau programme. Le shell fait fork + exec pour chaque commande, et `wait()` pour récupérer le code de sortie.

**« À quoi sert le PATH ? »** — C'est la liste ordonnée des répertoires où le shell cherche un exécutable quand on tape une commande sans chemin. Premier trouvé, premier servi — d'où les surprises quand deux versions d'un outil cohabitent (`which` pour trancher).

**« Comment lire les logs d'un service en production ? »** — Service systemd : `journalctl -u nom-du-service -f` (ou `-n 200` pour les 200 dernières lignes). Fichier classique : `tail -f /var/log/app.log`, filtré avec `grep`. Conteneur : `docker logs -f`, puisque l'app logge sur stdout/stderr.

## Pièges & idées reçues

> ⚠️ **Les deux réflexes toxiques** — `kill -9` d'entrée de jeu : le processus meurt sans flusher ni libérer ses ressources (fichiers de lock orphelins, données corrompues) ; toujours SIGTERM d'abord, SIGKILL en dernier recours. Et `chmod 777` « pour que ça marche » : vous venez de donner l'écriture à tous les utilisateurs du système — corrigez le propriétaire (`chown`) ou le groupe, pas les permissions du monde entier.

- **« df dit que le disque est plein, mais du ne trouve rien »** — un processus tient ouvert un fichier supprimé : l'espace n'est libéré qu'à la fermeture. `lsof | grep deleted`, puis redémarrer le service fautif. Classique avec les gros logs supprimés à chaud.
- **Une variable non exportée n'existe pas pour les enfants** — `VAR=x` reste locale au shell ; il faut `export VAR=x` pour qu'un processus lancé ensuite la voie. Source fréquente de « ça marche dans mon terminal, pas dans le service ».
- **`sudo` n'est pas un mot magique** — relancer une commande échouée avec `sudo` sans comprendre *pourquoi* elle échouait crée des fichiers appartenant à root dans votre projet, et le vrai problème reste entier.
- **`netstat` est déprécié** — l'outil moderne est `ss` (même usage : `ss -tlnp`), présent partout où `netstat` a disparu des images minimales.

## Pour aller plus loin

- [MIT — The Missing Semester](https://missingsemester.csail.mit.edu/) : le cours que toutes les écoles devraient donner (shell, outils, debugging)
- [explainshell.com](https://explainshell.com/) : colle une commande, chaque flag est expliqué depuis les man pages
- [man7.org](https://man7.org/linux/man-pages/) : les man pages de référence (signal(7), proc(5)…)
- [Julia Evans — Wizard Zines](https://wizardzines.com/) : les fanzines qui rendent `strace`, les signaux et les pipes limpides
- Pratiquer : ouvrir un shell et explorer `ls /proc/$$/` — le répertoire du processus… de votre propre shell
