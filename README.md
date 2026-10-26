# Rauchfrei

Persönlicher Begleiter für den Ausstieg aus dem Vapen: Zähler, Live-Ersparnis, Verlangen-Protokoll, Erholung und Blutdruck.
Läuft als Web-App auf GitHub Pages und lässt sich in Safari über **Teilen → Zum Home-Bildschirm** wie eine App installieren.

Live: https://rluetke-arch.github.io/Fitness/

## Bereiche

| Tab | Inhalt |
| --- | --- |
| Heute | Zähler, Live-Ersparnis, vermiedene Vapes und Züge, nächster Meilenstein, Verlangen heute, Wochenleiste, nächster Wunsch |
| Verlangen | Verlangen erfassen und ausreiten (Timer, Atmung), Auswertung nach Tag, Tageszeit und Auslöser, Ausrutscher, Neustart |
| Geld | Ersparnis live, Wunschliste mit Abhaken, Hochrechnung auf 1, 5 und 10 Jahre |
| Erfolge | Rekorde, Kalender der rauchfreien Tage, Meilenstein-Abzeichen |
| Mehr | Erholung (Zeitleiste, Lebenszeit), Blutdruck mit Arztbericht, Einstellungen, Daten sichern |

## Daten

Alle Daten liegen im `localStorage` des Geräts (Schlüssel mit Präfix `rf:`) und sind an die Adresse der Seite gebunden.
Unter **Mehr → Daten sichern** lässt sich ein Backup als JSON-Datei erstellen und wiederherstellen.

## Aufbau

```
index.html              Markup aller Bereiche
css/app.css             Designsystem und Layout
js/icons.js             Icon-Pfade (Lucide, ISC-Lizenz)
js/core.js              Speicher, Datum, Formatierung, UI-Helfer
js/tracker.js           Zähler, Anläufe und Neustart, Ersparnis, Lebenszeit, Wunschliste, Konfiguration
js/craving.js           Verlangen erfassen, Welle ausreiten, Ausrutscher, Auswertung
js/health.js            Blutdruck: Messungen, Bewertung, Verlauf, Auswertung
js/erfolge.js           Rekorde, Kalender, Abzeichen
js/bpreport.js          Blutdruck-Bericht für die Arztpraxis (Druck und Datei)
js/backup.js            Export und Import
js/app.js               Navigation, Takt, Start
sw.js                   Service Worker (Netz zuerst, offline aus dem Cache)
```

Kein Build-Schritt: Änderungen auf `main` sind nach dem Pages-Deploy (etwa eine Minute) live.
Der Service Worker lädt online immer die neueste Version, es muss also nichts neu installiert werden.

Schrift: Manrope (SIL Open Font License, `fonts/OFL-Manrope.txt`). Icons: Lucide (ISC, `js/LICENSE-lucide.txt`).
