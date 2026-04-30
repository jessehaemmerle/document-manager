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

Die App hat jetzt einen einfachen Login. Seed-Benutzer verwenden im lokalen MVP das Passwort `demo123`.

Nutzergruppen:

- `Admin`: sieht und verwaltet alle Dokumente, Audits, Benutzer und Abteilungen
- `Führungskraft`: sieht alle fälligen und historischen Audits der eigenen Audit-Abteilung
- `Mitarbeiter`: sieht nur Audits, die ihm persönlich zugewiesen sind

Demo-Logins:

- Admin: `miriam.keller@example.com`
- Führungskraft: `anna.leitner@example.com`
- Mitarbeiter: `sophie.audit@example.com`

## Benutzerverwaltung

Die App enthält eine einfache Benutzerverwaltung unter `Benutzer`:

- Benutzer mit Vorname, Nachname, E-Mail, Funktion und Aktivstatus
- App-Rollen: `Admin`, `Führungskraft`, `Mitarbeiter`
- Mitarbeiter-Rollen: `Vorgesetzter`, `Mitarbeiter`
- Zuordnung zu einer Abteilung
- Optionaler Vorgesetzter pro Benutzer
- Optionaler Vorgesetzter pro Abteilung
- Benutzer werden beim Löschen deaktiviert, nicht physisch entfernt

Dokumente besitzen zusätzlich eine `Audit-Abteilung` und optional einen persönlich zugewiesenen Benutzer. Diese Felder steuern die Sichtbarkeit für Führungskräfte und Mitarbeiter.

Neue Dokumentfelder:

- `audit_department_id`: Abteilung, der das Audit fachlich zugeordnet ist
- `assigned_user_id`: Benutzer, der das Audit persönlich sehen und bearbeiten darf

Zusätzliche API-Endpunkte:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/departments/:id/users`
- `GET /api/export/users`
