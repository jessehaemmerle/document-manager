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
APP_BASE_URL=http://localhost:5173
AUTH_SECRET=change-this-for-production
MAIL_HOST=mail.mohren.net
MAIL_PORT=25
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=DocAudit <docaudit@mohren.net>
MAIL_SECURE=false
MAIL_IGNORE_TLS=false
MAIL_REQUIRE_TLS=false
MAIL_TLS_REJECT_UNAUTHORIZED=true
MAIL_CONNECTION_TIMEOUT_MS=10000
MAIL_DRY_RUN=false
NOTIFICATIONS_ENABLED=true
NOTIFICATION_CHECK_INTERVAL_MINUTES=60
```

Wenn `MAIL_DRY_RUN=true` gesetzt ist oder kein `MAIL_HOST` konfiguriert ist, werden Mailereignisse nur protokolliert und in der Datenbank gespeichert.

Für einen internen SMTP-Relay wie `mail.mohren.net` ist typischerweise Port `25` ohne Benutzer/Passwort korrekt. Falls der Server STARTTLS zwingend verlangt, setze `MAIL_REQUIRE_TLS=true`. Falls ein internes Zertifikat nicht öffentlich vertrauenswürdig ist, kann für interne Netze `MAIL_TLS_REJECT_UNAUTHORIZED=false` gesetzt werden.

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
- `Führungskraft`: sieht alle fälligen und historischen Audits der eigenen Audit-Abteilung und darf Dokumente für die eigene Abteilung anlegen/bearbeiten
- `Mitarbeiter`: sieht nur Audits, die ihm persönlich zugewiesen sind

Demo-Logins:

- Admin: `miriam.keller@example.com`
- Führungskraft: `anna.leitner@example.com`
- Mitarbeiter: `sophie.audit@example.com`

## Benutzerverwaltung

Die App enthält eine einfache Benutzerverwaltung unter `Benutzer`:

- Benutzer mit Vorname, Nachname, E-Mail, Funktion und Aktivstatus
- Rollen: `Admin`, `Führungskraft`, `Mitarbeiter`
- Zuordnung zu einer Abteilung
- Optionaler Vorgesetzter pro Benutzer
- Optionaler Vorgesetzter pro Abteilung
- Benutzer werden beim Löschen deaktiviert, nicht physisch entfernt
- Hat ein Benutzer noch persönlich zugewiesene Dokumente, müssen diese beim Deaktivieren auf einen anderen aktiven Benutzer übertragen werden

Dokumente besitzen zusätzlich eine `Audit-Abteilung` und optional einen persönlich zugewiesenen Benutzer. Diese Felder steuern die Sichtbarkeit für Führungskräfte und Mitarbeiter.

Neue Dokumentfelder:

- `audit_department_id`: Abteilung, der das Audit fachlich zugeordnet ist
- `assigned_user_id`: Benutzer, der das Audit persönlich sehen und bearbeiten darf

## Mailbenachrichtigungen

Der Backend-Job prüft automatisch in regelmäßigen Abständen fällige Dokumente:

- am Prüfdatum: Mail an den persönlich zugewiesenen Benutzer, ersatzweise an die Führungskraft der Audit-Abteilung
- 2 Tage nach Prüfdatum: weitere Mail, wenn der Dokumentstatus seit dem Prüfdatum unverändert ist
- 5 Tage nach Prüfdatum: Eskalation, wenn der Status weiterhin unverändert ist; diese Mail geht zusätzlich an die Führungskraft

Jede Mail enthält einen direkten Link zur Dokumentdetailseite in der Web-Plattform. Setze dafür `APP_BASE_URL` auf die von den Empfängern erreichbare interne URL der App.

Bereits versendete Stufen werden in `notification_events` gespeichert, damit keine doppelten Mails pro Dokument und Prüfdatum verschickt werden. Admins können den Lauf im Bereich `Admin` manuell starten und die letzten Mailereignisse ansehen.

Zusätzliche API-Endpunkte:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/users/:id`
- `GET /api/users/:id/assigned-documents`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id` mit optionalem Body `{ "replacement_user_id": 2 }` zur Übertragung zugewiesener Dokumente
- `GET /api/departments/:id/users`
- `GET /api/export/users`
- `GET /api/notifications/events`
- `POST /api/notifications/run`
- `GET /api/notifications/mail-config`
- `POST /api/notifications/test-mail`
