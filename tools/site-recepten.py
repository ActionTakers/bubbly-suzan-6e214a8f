#!/usr/bin/env python3
"""Leest de echte receptenlijst van bubblybakery.nl (sitemap.xml) en schrijft fien/site-recepten.json.
Alleen lezen. Fien gebruikt dit bestand om per recept eerlijk te tonen of het online staat."""
import json, re, sys, urllib.request, datetime, pathlib
SITEMAP = 'https://bubblybakery.nl/sitemap.xml'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'fien' / 'site-recepten.json'
req = urllib.request.Request(SITEMAP, headers={'User-Agent': 'fien-sitestatus/1'})
xml = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
slugs = sorted(set(re.findall(r'<loc>https://bubblybakery\.nl/recepten/([a-z0-9-]+)/?</loc>', xml)))
if len(slugs) < 5:
    sys.exit(f'Te weinig recepten gevonden ({len(slugs)}); bestand niet overschreven.')
old = json.loads(OUT.read_text()) if OUT.exists() else {}
now = datetime.datetime.now(datetime.timezone.utc)
try: age = now - datetime.datetime.fromisoformat(old.get('gecheckt', '').replace('Z', '+00:00'))
except ValueError: age = datetime.timedelta(days=999)
# alleen schrijven als de lijst verandert, of als de datum ouder is dan 7 dagen (minder commits)
if old.get('recepten') == slugs and age < datetime.timedelta(days=7) and '--force' not in sys.argv:
    print(f'Ongewijzigd: {len(slugs)} recepten'); sys.exit(0)
data = {'bron': SITEMAP, 'gecheckt': now.strftime('%Y-%m-%dT%H:%M:%SZ'), 'aantal': len(slugs), 'recepten': slugs}
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
print(f'Geschreven: {len(slugs)} recepten')
