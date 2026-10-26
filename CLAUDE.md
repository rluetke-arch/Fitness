# Rauchfrei – Hinweise für Claude Code

Persönliche Web-App (PWA) eines deutschsprachigen Nutzers, der mit dem Vapen aufhört (1,5 Vapes/Tag à 12,50 €). Die App ist rein aufs Rauchfreisein ausgerichtet.
Live auf GitHub Pages: https://rluetke-arch.github.io/Fitness/ – jeder Push auf `main` ist nach etwa einer Minute live.
Der Nutzer nutzt die App als Home-Bildschirm-App auf dem iPhone (Safari).

## Arbeitsweise
- Mit dem Nutzer **auf Deutsch** sprechen, die App-Texte sind ebenfalls Deutsch (Du-Form, Satzanfang groß, keine Emojis).
- Änderungen direkt auf `main` committen und pushen, sobald sie getestet sind; der Nutzer möchte, dass Updates automatisch live gehen.
- Kein Build-Schritt, keine Frameworks, keine externen Laufzeit-Abhängigkeiten (CDNs). Alles liegt im Repo.
- Vor jedem Push: `for f in js/*.js sw.js; do node --check $f; done` und die App lokal testen
  (`python3 -m http.server 8765`, dann mit Playwright/Chromium in 390×844 durchklicken und Screenshots ansehen).
- Bei neuen oder umbenannten JS-Dateien: `<script>` in `index.html` und die `CORE`-Liste in `sw.js` ergänzen, `CACHE`-Version erhöhen.

## Design
- Dunkel: Grund `#0d0b14`, Karten `#181622`, Markenverlauf Violett `#8c6bff` → Türkis `#2de2c2`; Akzente Rose `#ff4f7b`, Amber `#ffb547`, Blau `#58a6ff`, Grün `#3ddc84`.
- Schrift Manrope (lokal in `fonts/`), große leichte Zahlen (font-weight 200–400).
- **Keine Emojis** in der Oberfläche. Icons kommen aus `js/icons.js` (Lucide-Pfade, Aufruf `icon("name")` oder `<i data-ic="name">`).
  Neue Icons: SVG-Pfad aus dem Lucide-Repo (github.com/lucide-icons/lucide, Ordner `icons/`) in das `ICONS`-Objekt übernehmen.
- Bottom-Tab-Leiste: Heute, Verlangen, Geld, Erfolge, Mehr (Erholung, Blutdruck, Einstellungen, Daten sichern).

## Daten
- Alles in `localStorage`, Schlüssel mit Präfix `rf:` (Liste in `DATA_KEYS` in `js/core.js`). Daten sind an die Adresse gebunden.
- Datenformate niemals brechen; bei Änderungen eine Migration in der jeweiligen `load…()`-Funktion schreiben.
  Neue Schlüssel in `DATA_KEYS` aufnehmen, damit sie im Backup landen (`js/backup.js`, Format `{app:"rauchfrei", version:1, data:{…}}`).
- Wichtige Schlüssel: `rf:config` (Start = laufender Anlauf), `rf:attempts` (frühere Anläufe `{start,end}` in ms),
  `rf:cravings` (`{ts, level, triggers, slip}`), `rf:goals` (Wunschliste mit `done`), `rf:sos` (alter Zähler, zählt als überstanden mit).
- Schlüssel entfernter Bereiche stehen in `LEGACY_KEYS` und werden nur beim Zurücksetzen gelöscht.
- Datumsschlüssel immer in Ortszeit über `dateKey()`/`todayKey()` aus `js/core.js`, nie `toISOString()`.

## Bewusst entfernt (Okt. 2026)
- Alkohol, Welt/Stadt, XP/Level/Quests/Truhen, Training, Schritte, Ernährung und Gewicht. Nicht wieder einbauen, ohne zu fragen.
- Schritte aus Apple Health: Eine Web-App kann Health nicht lesen, und Home-Bildschirm-Apps haben auf dem iPhone einen eigenen
  Speicher getrennt von Safari. Manuelles Eintragen wollte der Nutzer nicht.

## Fortschritt (in `js/erfolge.js`)
- Schlichte Abzeichen in `badgeCats` ohne Punkte, freigeschaltet nur aus echten Daten (nie aus `rf:badgeseen`, das enthält
  noch Trophäen der alten Version). Sie bleiben nach einem Neustart, weil sie an längster Strecke und Gesamtwerten hängen.
- Ein Ausrutscher (`slip`) lässt den Zähler weiterlaufen. „Neu starten“ legt den Anlauf in `rf:attempts` ab;
  Ersparnis, Lebenszeit und Gesamtzeit zählen über alle Anläufe, die längste Strecke bleibt.

## Inhaltliche Leitplanken
- Gesundheitsangaben immer als Orientierung kennzeichnen, keine Diagnosen. Blutdruck-Einstufung nach ESC/ESH, Grenzwert Selbstmessung 135/85.
- Lebenszeit-Werte sind Schätzungen und so beschriftet.

## Offene Ideen
- Erinnerungen oder Mitteilungen bei Meilensteinen (iOS-Web-Push bräuchte einen Server).
