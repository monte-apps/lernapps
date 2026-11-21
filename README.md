# LernApps

Die Startseite `index.html` verlinkt die Fachübersichten unter `os/` und `ps/`. Das gemeinsame Layout liegt in `stil.css`.

## Lokale Live-Vorschau

1. Im Codex-Terminal im Repository `.\vorschau.cmd` ausführen.
2. [LernApps im Browser öffnen](http://127.0.0.1:8000/).
3. HTML, CSS, JavaScript oder andere Website-Dateien bearbeiten und speichern. Die geöffnete Seite lädt innerhalb von etwa einer Sekunde neu.

Das Terminal bleibt während der Vorschau geöffnet. Mit **Strg+C** beendest du den Server. Ist Port 8000 belegt, starte die Vorschau mit `.\vorschau.cmd 8001` und öffne [Port 8001](http://127.0.0.1:8001/).

Der Windows-Startbefehl nutzt die von Codex bereitgestellte Node.js-Laufzeit, wenn sie verfügbar ist. Mit installiertem Node.js lässt sich der Server auch direkt über `node .preview/server.cjs` starten. Die Vorschau braucht keine npm-Pakete und ist nur auf dem eigenen Rechner erreichbar.

## Neue LernApp einbinden

Lege die HTML-Datei im passenden Fachordner ab und verlinke sie in dessen `index.html`. Prüfe den Link in der Vorschau über die Startseite.
