# Dokumentenmanagement

Self-hosted Web-App für internes Dokumentenmanagement mit Prüfintervallen, mehrstufigen Freigaben, Audit-Log, Benachrichtigungen und externer Dokumentverlinkung.

## Projektüberblick

Die Anwendung verwaltet keine physischen Dokumentdateien, sondern Referenzen auf externe Quellen wie SharePoint, Wiki, Dateiserver oder beliebige Weblinks. Für jedes Dokument können Prüfintervalle, Verantwortlichkeiten, Eskalationsregeln und mehrstufige Freigaben gepflegt werden. Alle fachlich relevanten Aktionen werden revisionsnah im Audit-Log protokolliert.

## Technologien

- Frontend: React, TypeScript, Vite
- Backend: Node.js, TypeScript, NestJS, REST API
- Datenbank: PostgreSQL
- Authentifizierung: JWT-basierte lokale Benutzerverwaltung
- Benachrichtigungen: In-App und SMTP-fähige E-Mail-Versendung
- Deployment: Docker Compose

## Architekturüberblick

- `frontend/`: Browser-UI mit Sidebar, Dashboard, Dokumentenliste, Detailansicht, Aufgaben, Benachrichtigungen und Admin-Bereich.
- `backend/`: NestJS API mit Auth, Rollenprüfung, Audit-Log, Scheduler, Exporten und Seed-Skript.
- `docker-compose.yml`: lokale Self-Hosted-Inbetriebnahme mit PostgreSQL, API, Seed und Frontend.

Wichtige Backend-Module:

- `auth`: Login und JWT-Ausgabe
- `users`, `departments`, `document-types`: Stammdatenverwaltung
- `documents`: Dokumentmetadaten, Filter, Suche, Soft-Deaktivierung
- `reviews`: Prüfzyklen, Assignments, Aktionen, Kommentare, Workflow-Fortschritt
- `notifications`: In-App und E-Mail-Benachrichtigungen
- `audit`: unveränderbares Audit-Log und CSV-Export
- `scheduler`: automatische Fälligkeit, Erinnerungen und Eskalationen

## Voraussetzungen

- Docker und Docker Compose
- alternativ lokal:
  - Node.js 20+
  - PostgreSQL 16+
  - npm

## Umgebungsvariablen

1. `.env.example` nach `.env` kopieren.
2. Werte an Ihre Umgebung anpassen.

Wichtige Variablen:

- `POSTGRES_*`: Datenbankzugang
- `JWT_SECRET`: Signatur-Secret für Tokens
- `SMTP_*`: SMTP-Konfiguration
- `SCHEDULER_ENABLED`: Scheduler aktivieren oder deaktivieren
- `VITE_API_URL`: URL der REST-API für das Frontend

## Docker-Start

1. `.env.example` nach `.env` kopieren.
2. Container bauen und starten:

```bash
docker compose up --build
```

3. Seed-Daten ausführen:

```bash
docker compose run --rm seed
```

4. Anwendung öffnen:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4000/api`

## Lokale Entwicklung

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Datenbank

Eine lokale PostgreSQL-Instanz wird benötigt. Die API liest die Verbindung aus `.env`.

## Datenbankschema und Migrationen

Die App verwendet TypeORM-Entitäten als Schema-Quelle. Für lokale Erststarts ist `DB_SYNC=true` vorbereitet, damit das Schema direkt angelegt wird. Das TypeORM-Migrations-Setup ist im Backend bereits vorbereitet (`npm run migration:run`) und kann für produktive Umgebungen auf explizite Migrationen erweitert bzw. festgezogen werden.

## Seed-Daten

Enthalten sind:

- 1 Admin
- 2 Abteilungen
- 2 Führungskräfte
- 2 Mitarbeiter
- 6 Dokumenttypen
- mehrere Dokumente mit unterschiedlichen Intervallen
- offene und abgeschlossene Prüfbeispiele

Seed ausführen:

```bash
cd backend
npm install
npm run seed
```

## Seed-Logins

- Admin: `admin` / `Passwort123!`
- Führungskraft QM: `qm.leitung` / `Passwort123!`
- Führungskraft IT: `it.leitung` / `Passwort123!`
- Mitarbeiter QM: `qm.mitarbeiter` / `Passwort123!`
- Mitarbeiter IT: `it.mitarbeiter` / `Passwort123!`

## Fachliche Funktionen

- Rollen: Admin, Führungskraft, Mitarbeiter
- serverseitige Rollen- und Abteilungsprüfung
- Dokumentverwaltung mit externen Links
- Prüfintervalle pro Dokument
- mehrstufige Freigabe pro Dokument
- Aufgabenansicht mit Statuswechseln und Kommentaren
- digitale Abzeichnung mit Zeitstempel
- Scheduler für fällige Prüfungen, Erinnerungen und Eskalationen
- In-App-Benachrichtigungen
- SMTP-fähige E-Mail-Benachrichtigungen
- Audit-Log mit CSV-Export
- Suche und Filter in der Dokumentenübersicht

## SMTP-Konfiguration

Beispiel:

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.example.internal
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailer
SMTP_PASSWORD=supersecret
SMTP_FROM=dokumente@example.internal
```

Wenn `SMTP_ENABLED=false` gesetzt ist, werden E-Mails technisch verarbeitet, aber nicht verschickt.

## Produktionshinweise

- `DB_SYNC` in Produktion deaktivieren und ein festes Migrationsverfahren verwenden.
- `JWT_SECRET` durch ein starkes Secret ersetzen.
- Reverse Proxy, TLS und internes Netzwerksegment für den Betrieb vorsehen.
- SMTP-Credentials nur über sichere Secret-Mechanismen bereitstellen.
- Regelmäßige Backups der PostgreSQL-Datenbank einplanen.

## Hinweise zur Erweiterbarkeit

- Rollenmodell und `approvalStages` sind so angelegt, dass zusätzliche Freigabestufen ergänzt werden können.
- Die Auth-Architektur ist für spätere LDAP-/AD-/Entra-Integration vorbereitet.
- Dokumente bleiben als Metadaten plus externer Link modelliert und können später um Datei-Storage ergänzt werden.
