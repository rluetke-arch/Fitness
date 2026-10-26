# Rauchfrei – Hinweise für Claude Code

Persönliche Web-App (PWA) eines deutschsprachigen Nutzers, der mit dem Vapen (1,5 Vapes/Tag à 12,50 €) und mit Bier aufhört.
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
- Bottom-Tab-Leiste: Heute, Körper (Vitalwerte/Training/Ernährung), Welt, Erfolge, Mehr.

## Daten
- Alles in `localStorage`, Schlüssel mit Präfix `rf:` (Liste in `DATA_KEYS` in `js/core.js`). Daten sind an die Adresse gebunden.
- Datenformate niemals brechen; bei Änderungen eine Migration in der jeweiligen `load…()`-Funktion schreiben.
  Neue Schlüssel in `DATA_KEYS` aufnehmen, damit sie im Backup landen (`js/backup.js`, Format `{app:"rauchfrei", version:1, data:{…}}`).
- `rf:apikey` (Anthropic-Schlüssel für die Foto-Erkennung) gehört nie ins Backup und nie in den Code.
- Datumsschlüssel immer in Ortszeit über `dateKey()`/`todayKey()` aus `js/core.js`, nie `toISOString()`.

## Gamification (in `js/game.js`)
- XP mit Tagesgrenzen gegen Mehrfacheinträge, Level (100 + 50·(n−1) XP), jedes Level +100 Baupunkte.
- Tagesquests (3 pro Tag, deterministisch aus dem Datum), Bonus bei 3/3, Aktivitäts-Serie, Tagesbonus nach Kalendertag, Truhen alle 30 Min.
- Trophäen in `badgeCats` (Schwellenwerte, neue werden automatisch erkannt und mit XP belohnt).
- Welt (`js/city.js`): Baupunkte-Währung, 3 Bezirke à 12 Grundstücke, neuer Bezirk nach vollem Vorgänger. Die Stadt wird nie zerstört.

## Inhaltliche Leitplanken
- Gesundheitsangaben immer als Orientierung kennzeichnen, keine Diagnosen. Blutdruck-Einstufung nach ESC/ESH, Grenzwert Selbstmessung 135/85.
- Alkohol: Hinweis auf ärztliche Begleitung bei starkem täglichem Konsum beibehalten.
- Kalorien- und Lebenszeit-Werte sind Schätzungen und so beschriftet.

## Offene Ideen
- Rückfall-Funktion mit fairem Neustart (Zähler zurück, Stadt/Level/Trophäen bleiben).
- Schritte-Kurzbefehl auf dem echten iPhone verifizieren (Aktionsnamen).
