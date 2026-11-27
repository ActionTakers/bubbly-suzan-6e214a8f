# Alleen lokale preview — niet live

Branch: `fien/mijn-taken-pepernoten-lokaal`  
Niet mergen naar main, niet naar GitHub Pages zetten, niet pushen.

## Starten (alleen op dit apparaat)

```
cd /workspace/fien-taken-lokaal/fien
python3 -m http.server 8790 --bind 127.0.0.1
```

Open http://127.0.0.1:8790/ — alleen lokaal. De live app op GitHub Pages blijft ongewijzigd.
