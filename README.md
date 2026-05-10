# AKP Architekten Landingpage

Statische Landingpage für AKP Architekten Kauschke + Partner. Das Projekt ist für ein Railway-Deployment vorbereitet und wird über einen kleinen Node.js-Static-Server ausgeliefert.

## Lokal starten

```bash
npm install
npm start
```

Die Website läuft standardmäßig unter <http://localhost:3000>. Railway setzt `PORT` automatisch; lokal kann der Port z. B. mit `PORT=4173 npm start` überschrieben werden.

## Tests

```bash
npm test
```

Die Tests prüfen:

- Railway-Entrypoints, Healthcheck und sichere statische Auslieferung.
- Produktionsreife HTML-Metadaten, Anker, Assets und Kontaktformular-Verhalten.
- Frontend-Integrität für Projektfilter, Accessibility-States und Darstellungsvoraussetzungen.

## Deployment auf Railway

1. Repository in Railway verbinden.
2. Als Start Command `npm start` verwenden (wird aus `package.json` erkannt).
3. Optional Healthcheck auf `/healthz` setzen.
4. Vor Deployment `npm test` ausführen oder die GitHub-Actions-CI abwarten.
