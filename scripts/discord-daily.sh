#!/usr/bin/env bash
# Poste la fiche du jour sur Discord. Sort silencieusement si pas de webhook configuré.
# Config : echo 'https://discord.com/api/webhooks/…' > ~/.config/mti-training/webhook
set -euo pipefail

WEBHOOK_FILE="$HOME/.config/mti-training/webhook"
[ -f "$WEBHOOK_FILE" ] || exit 0
WEBHOOK=$(cat "$WEBHOOK_FILE")

TODAY=$(date +%F)
TOPIC=$(curl -sf https://mti-training.bantou.me/topics.json |
  jq -c --arg d "$TODAY" '[.[] | select(.date == $d)][0] // empty')
[ -n "$TOPIC" ] || exit 0

jq -n --argjson t "$TOPIC" '{
  embeds: [{
    title: ("📘 Fiche du jour : " + $t.title_fr),
    description: ($t.summary_fr + "\n\n[Lire la fiche](" + $t.url + ") · [S'\''entraîner](https://mti-training.bantou.me/entrainement#t-" + $t.slug + ")"),
    url: $t.url,
    color: 2377680,
    footer: { text: ($t.category + " · " + $t.level) }
  }]
}' | curl -sf -H 'Content-Type: application/json' -d @- "$WEBHOOK" > /dev/null
