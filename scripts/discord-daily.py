#!/usr/bin/env python3
"""Poste la fiche du jour dans un forum Discord : un fil par fiche, contenu complet.

Le webhook (~/.config/mti-training/webhook) doit être attaché à un salon FORUM,
sinon Discord refuse thread_name (code 220001). Sort silencieusement si pas de
webhook ou pas de fiche aujourd'hui.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

WEBHOOK_FILE = Path.home() / '.config/mti-training/webhook'
TOPICS = Path(__file__).resolve().parent.parent / 'src/content/topics'
SITE = 'https://mti-training.bantou.me'
MAX = 1900  # marge sous la limite Discord de 2000

JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
        'août', 'septembre', 'octobre', 'novembre', 'décembre']
EMOJIS = {
    "L'essentiel": '📖',
    'Comment ça marche': '⚙️',
    'Concepts clés à maîtriser': '🧠',
    'En entretien': '🎤',
    'Pièges & idées reçues': '⚠️',
    'Pour aller plus loin': '🔭',
}


def post(url: str, payload: dict) -> dict:
    headers = {'Content-Type': 'application/json', 'User-Agent': 'mti-training (https://mti-training.bantou.me, 1.0)'}
    req = urllib.request.Request(url, json.dumps(payload).encode(), headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or b'{}')


def chunk(body: str) -> list[str]:
    """Découpe aux frontières de paragraphes, avec repli ligne à ligne si un bloc dépasse."""
    parts = []
    for para in body.split('\n\n'):
        if len(para) <= MAX:
            parts.append(para)
        else:  # ponytail: repli naïf par lignes, suffisant pour du markdown de fiche
            cur = ''
            for line in para.splitlines(keepends=True):
                if len(cur) + len(line) > MAX:
                    parts.append(cur)
                    cur = line
                else:
                    cur += line
            parts.append(cur)
    chunks, cur = [], ''
    for p in parts:
        cand = f'{cur}\n\n{p}'.strip()
        if len(cand) > MAX and cur:
            chunks.append(cur)
            cur = p
        else:
            cur = cand
    if cur:
        chunks.append(cur)
    return chunks


def main() -> None:
    if not WEBHOOK_FILE.exists():
        return
    webhook = WEBHOOK_FILE.read_text().strip()

    today = date.today().isoformat()
    dirs = sorted(d.name for d in TOPICS.iterdir() if d.is_dir())
    match = [d for d in dirs if d.startswith(today)]
    if not match:
        return
    dirname = match[0]
    day_no = dirs.index(dirname) + 1
    slug = dirname[11:]

    raw = (TOPICS / dirname / 'fr.md').read_text()
    m = re.match(r'---\n(.*?)\n---\n', raw, re.S)
    fm = dict(re.findall(r'^(\w+):\s*"(.*)"\s*$', m.group(1), re.M))
    body = raw[m.end():].strip()

    body = re.sub(r'^## (.+)$', lambda m: f"## {EMOJIS.get(m.group(1), '▫️')} {m.group(1)}", body, flags=re.M)

    d = date.fromisoformat(dirname[:10])
    date_fr = f'{JOURS[d.weekday()]} {d.day} {MOIS[d.month - 1]} {d.year}'
    name = f"Jour {day_no} · {fm['title']}"[:100]
    intro = f"**📅 Jour {day_no} — {date_fr}**\n🏷️ {fm['category']} · {fm['level']}\n\n_{fm['summary']}_"
    first = post(f'{webhook}?wait=true', {'content': intro, 'thread_name': name})
    thread = first['channel_id']
    for c in chunk(body):
        time.sleep(0.6)
        post(f'{webhook}?wait=true&thread_id={thread}', {'content': c})
    time.sleep(0.6)
    post(f'{webhook}?wait=true&thread_id={thread}', {
        'content': f"—\n🔗 [Lire sur le site]({SITE}/sujet/{slug}) · 🎯 [S'entraîner : flashcards + QCM]({SITE}/entrainement#t-{slug})"
    })


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as e:
        sys.exit(f'Discord {e.code}: {e.read().decode()}')
