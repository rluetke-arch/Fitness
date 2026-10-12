# Rauchfrei

Persönlicher Tracker für den Rauch- und Alkoholstopp mit Vitalwerten, Training, Ernährung und Gamification.
Läuft als Web-App auf GitHub Pages und lässt sich in Safari über **Teilen → Zum Home-Bildschirm** wie eine App installieren.

Live: https://rluetke-arch.github.io/Fitness/

## Bereiche

| Tab | Inhalt |
| --- | --- |
| Heute | Spielerkarte (Level, Serie, Baupunkte, Trophäen), Tagesquests, Kacheln, Tagesanalyse |
| Körper | Vitalwerte mit Tiefenanalyse, Training (Schritte, Einheiten), Ernährung (Budget, Foto-Erkennung, Gewicht) |
| Welt | Stadtaufbau mit Baupunkten in drei Bezirken (Innenstadt, Hafen, Grünviertel) |
| Erfolge | Level, Truhen, Tagesbonus, Serie, Trophäen |
| Mehr | Rauchfrei, Alkohol, Finanzen, Einstellungen, Daten sichern |

## Daten

Alle Daten liegen im `localStorage` des Geräts (Schlüssel mit Präfix `rf:`) und sind an die Adresse der Seite gebunden.
Unter **Mehr → Daten sichern** lässt sich ein Backup als JSON-Datei erstellen und wiederherstellen.
Der optionale Anthropic-API-Schlüssel für die Foto-Erkennung liegt unter `rf:apikey` und ist nie Teil eines Backups.

## Aufbau

```
index.html              Markup aller Bereiche
css/app.css             Designsystem und Layout
js/icons.js             Icon-Pfade (Lucide, ISC-Lizenz)
js/core.js              Speicher, Datum, Formatierung, UI-Helfer
js/tracker.js           Zähler, Ersparnis, Lebenszeit, Sparziele, Konfiguration
js/health.js            Vitalwerte, Bewertung, Tages- und Tiefenanalyse
js/fitness.js           Schritte und Training
js/nutrition.js         Kalorienbudget, Mahlzeiten, Foto-Erkennung, Gewicht
js/game.js              XP, Level, Serie, Quests, Truhen, Trophäen, Notfall-Knopf
js/city.js              Stadtaufbau
js/report.js            Wochenrückblick
js/bpreport.js          Blutdruck-Bericht für die Arztpraxis (Druck und Datei)
js/backup.js            Export und Import
js/app.js               Navigation, Takt, Start
sw.js                   Service Worker (Netz zuerst, offline aus dem Cache)
```

Kein Build-Schritt: Änderungen auf `main` sind nach dem Pages-Deploy (etwa eine Minute) live.
Der Service Worker lädt online immer die neueste Version, es muss also nichts neu installiert werden.

Schrift: Manrope (SIL Open Font License, `fonts/OFL-Manrope.txt`). Icons: Lucide (ISC, `js/LICENSE-lucide.txt`).

## Schritte aus Apple Health

Home-Bildschirm-Apps haben auf dem iPhone einen eigenen Speicher, getrennt von Safari. Deshalb läuft der Import über die Zwischenablage:
Ein Kurzbefehl („Health-Beispiele suchen“ → „Statistik berechnen: Summe“ → „In Zwischenablage kopieren“) kopiert die Schrittzahl,
in der App fügt **Körper → Training → Aus Health einfügen** sie ein. Akzeptiert wird eine Zahl (heute) oder Zeilen wie `11.10.2026: 9.120`.
In Safari funktioniert zusätzlich `?steps=8412` in der Adresse.
