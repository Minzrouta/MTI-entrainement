#!/usr/bin/env bash
# Redéploie l'app Coolify (utile depuis le VPS tant que le webhook GitHub n'est pas configuré).
set -euo pipefail
curl -sf -H "Authorization: Bearer $(cat ~/.claude/coolify_token)" \
  "https://coolify.bantou.me/api/v1/deploy?uuid=xq8pqpea6l4ugd6r5sbhb5o9"
echo
