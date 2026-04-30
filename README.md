# Document Audit Manager

Simple lokale Web-App zur Verwaltung und Auditierung externer Dokumentenlinks. Dokumente werden nicht gespeichert, sondern als externe Links gepflegt und periodisch zur Prüfung vorgemerkt.

## Start

```bash
npm install
npm run dev
```

Danach läuft die App standardmäßig unter:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

Beim ersten Backend-Start wird die SQLite-Datenbank automatisch angelegt und mit Beispieldaten befüllt.

## Umgebungsvariablen

Kopiere bei Bedarf `.env.example` nach `.env` und passe Werte an:

```bash
PORT=4000
DATABASE_PATH=./data/document-audits.sqlite
CLIENT_ORIGIN=http://localhost:5173
```

Mail-Variablen sind bereits vorbereitet, echter Mailversand ist im MVP noch nicht aktiv.

## Struktur

```text
backend/   Node.js + Express + SQLite REST API
frontend/  React + Vite Web-App
data/      lokale SQLite-Datenbank, wird automatisch erstellt
```

## Optional mit Docker

```bash
docker compose up --build
```

Dann ist das Frontend unter http://localhost:8080 erreichbar.

## Rollen im MVP

Oben rechts im Frontend kann zwischen `Admin`, `Auditor`, `Viewer` und `Mitarbeiter` gewechselt werden. Das ist bewusst ohne Login umgesetzt, aber der API-Client sendet die Rolle bereits per Header, sodass später echte Authentifizierung ergänzt werden kann.

## Benutzerverwaltung

Die App enthält eine einfache Benutzerverwaltung unter `Benutzer`:

- Benutzer mit Vorname, Nachname, E-Mail, Funktion und Aktivstatus
- App-Rollen: `Admin`, `Auditor`, `Viewer`, `Mitarbeiter`
- Mitarbeiter-Rollen: `Vorgesetzter`, `Mitarbeiter`
- Zuordnung zu einer Abteilung
- Optionaler Vorgesetzter pro Benutzer
- Optionaler Vorgesetzter pro Abteilung
- Benutzer werden beim Löschen deaktiviert, nicht physisch entfernt

Zusätzliche API-Endpunkte:

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/departments/:id/users`
- `GET /api/export/users`
