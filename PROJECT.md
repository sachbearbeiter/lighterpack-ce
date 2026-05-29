# LighterPack CE — Projektdokumentation

> Community Edition des originalen [galenmaly/lighterpack](https://github.com/galenmaly/lighterpack)
> 1:1 UI/UX Nachbau als moderner SvelteKit 2 + Svelte 5 Stack

---

## Stack

| Schicht | Technologie |
|---|---|
| Framework | SvelteKit 2 |
| UI | Svelte 5 (Rune-kompatibel — **`onclick={}` nicht `on:click={}`**) |
| Sprache | TypeScript |
| Datenbank | MariaDB 11 |
| ORM | Drizzle ORM |
| Auth | Argon2 (Passwort-Hashing), eigene Session-Tokens (hex, 48 Bytes) |
| Deployment | Hetzner VPS `46.224.134.35`, Docker Compose |

---

## Routing — Entsprechung zum Original

| Route | Original (Vue Router) | Diese App (SvelteKit) | Beschreibung |
|---|---|---|---|
| `/` | `dashboard.vue` | `+page.svelte` | Dashboard (eingeloggt) / Redirect → `/welcome` |
| `/welcome` | `welcome.vue` | `welcome/+page.svelte` | Willkommen, Register + Signin |
| `/signin` | `signin.vue` | `signin/+page.svelte` | Standalone Signin |
| `/forgot-password` | `forgot-password.vue` | `forgot-password/+page.svelte` | Passwort vergessen |
| `/moderation` | `moderation.vue` | `moderation/+page.svelte` | Admin Panel (nur Moderatoren) |
| `/dashboard` | — | `dashboard/+page.server.ts` | 301 Redirect → `/` (Kompatibilität) |

### Flow nach Register / Signin
```
Register (POST /welcome → ?/register)  →  302 /
Signin   (POST /welcome → ?/signin)    →  302 /
Signin   (POST /signin  → default)     →  302 /
Signout  (GET  /api/signout)           →  302 /welcome
```

---

## Datenbankschema

### Tabellen

```
users
  id              varchar(32) PK   — UUIDv7, Bindestriche entfernt
  username        varchar(32)      — lowercase, unique
  email           varchar(254)     — unique
  password_hash   varchar(255)     — Argon2id
  password_status enum             — active | must_reset | imported_no_password
  is_moderator    boolean          — DB-basiert (nicht env var)
  created_at      datetime
  legacy_id       varchar(64)      — für zukünftige MongoDB-Migration

sessions
  id              varchar(32) PK
  user_id         varchar(32) FK → users
  created_at      datetime
  expires_at      datetime

libraries
  id              varchar(32) PK
  user_id         varchar(32) FK → users (unique)
  total_unit      varchar(10)
  item_unit       varchar(10)
  currency_symbol varchar(5)
  optional_fields json
  updated_at      datetime
  legacy_id       varchar(64)

lists
  id              varchar(32) PK
  library_id      varchar(32) FK → libraries
  name            varchar(255)
  description     text
  external_id     varchar(32)     — public share URL slug
  is_public       boolean
  sort_order      int
  updated_at      datetime

categories
  id              varchar(32) PK
  library_id      varchar(32) FK → libraries
  name            varchar(255)
  color           varchar(10)
  sort_order      int

items
  id              varchar(32) PK
  library_id      varchar(32) FK → libraries
  name            varchar(255)
  description     text
  weight          decimal(10,2)
  unit            varchar(10)
  image_url       text
  url             text
  price           decimal(10,2)
  currency        varchar(5)
  sort_order      int

list_categories   (Zuordnung Liste → Kategorien)
  list_id         FK → lists
  category_id     FK → categories
  sort_order      int

category_items    (Zuordnung Kategorie → Items)
  category_id     FK → categories
  item_id         FK → items
  quantity        int
  worn            boolean
  consumable      boolean
  sort_order      int
```

### Migrationen

```
drizzle/0000_peaceful_big_bertha.sql   — initiales Schema
drizzle/0001_add_is_moderator.sql      — ALTER TABLE users ADD COLUMN is_moderator
```

Migrationen werden beim Container-Start automatisch ausgeführt:
`docker/start.sh` → `tsx scripts/migrate.ts` → `node build`

---

## Auth

- **Session-Token**: 48 Bytes zufällig, hex-kodiert → Cookie `session`
- **Passwort-Hashing**: Argon2id (`memoryCost: 65536, timeCost: 3, parallelism: 1`)
- **`locals.isModerator`**: aus DB-Feld `is_moderator`, wird in `src/hooks.server.ts` gesetzt
- **Session-Validierung**: `validateSession(token)` in `src/lib/server/auth.ts`

---

## Deployment

### Lokal entwickeln (kein Deploy nötig!)

```powershell
# Im Verzeichnis d:\KI Agenten Spielplatz\lighterpack-ce
npm run dev
# App läuft auf http://localhost:5173
```

> **Wichtig:** DB-Schema-Änderungen erfordern Drizzle-Migration und ggf. manuellen ALTER TABLE.
> Für reine UI/Logic-Änderungen reicht `npm run dev` vollständig.

### VPS Deploy (nur bei DB-Änderungen oder für Produktion)

```powershell
git -C "d:\KI Agenten Spielplatz\lighterpack-ce" add -A
git -C "d:\KI Agenten Spielplatz\lighterpack-ce" commit -m "..."
git -C "d:\KI Agenten Spielplatz\lighterpack-ce" push
ssh vps1 "cd /opt/lighterpack-ce && git pull && docker-compose build app && docker-compose down && docker-compose up -d && sleep 12 && docker logs lighterpack-ce_app_1 --tail 15"
```

### Infrastruktur

- **VPS**: Hetzner `46.224.134.35`, SSH-Alias `vps1`
- **Port**: 3000
- **Docker Compose**: `db` (mariadb:11) + `app`
- **Env**: `ORIGIN=http://46.224.134.35:3000` (CSRF-Schutz SvelteKit)

---

## Svelte 5 Besonderheiten

```svelte
<!-- ✅ Svelte 5 -->
<button onclick={() => doSomething()}>Click</button>
<form onsubmit={() => reset()}>

<!-- ❌ Svelte 4 (funktioniert NICHT in Svelte 5) -->
<button on:click={() => doSomething()}>Click</button>
<form on:submit={() => reset()}>
```

`use:enhance` aus `$app/forms` ist weiterhin gültig.

---

## Aktueller Implementierungsstand

### ✅ Fertig
- Auth: Register, Signin, Signout, Forgot Password
- Session-Verwaltung (DB-basiert)
- Dashboard-Grundgerüst (`/`) mit Sidebar, Listen-Anzeige, Library-Info
- Moderation Panel (`/moderation`): Suche, Session löschen, Passwort reset, Moderator-Toggle
- DB-basierte Moderatoren (`is_moderator`-Spalte)
- Routing 1:1 zum Original (/ = Dashboard, /welcome = Willkommen)
- Migrations-System (Drizzle, auto-run bei Container-Start)
- CSV Import/Export API-Stubs

### 🔴 Offen / TODO

#### Core Dashboard
- [ ] Liste erstellen / umbenennen / löschen
- [ ] Kategorien CRUD (Inline-Editing wie Original)
- [ ] Items CRUD (Inline-Editing, Gewicht, Einheit, Menge, worn/consumable)
- [ ] Sidebar Toggle (☰ Hamburger) funktional machen
- [ ] Gewichtsberechnung + Anzeige (Gesamt, pro Kategorie)
- [ ] `external_id` generieren (nanoid) → Share-URL
- [ ] Optionale Felder (Preis, Beschreibung, Bild-URL, Link)
- [ ] `saveLibrary` API: Änderungen persistieren

#### Share-Route
- [ ] `/r/:externalId` — öffentliche Listen-Ansicht (read-only)
- [ ] Gewichtsdiagramm (Original: Chart.js Pie Chart)
- [ ] CSV-Export `/api/library/export-csv/:listId`

#### Weitere Features
- [ ] Account-Einstellungen (E-Mail ändern, Passwort ändern)
- [ ] Account löschen
- [ ] "Copy list" Funktion
- [ ] Import CSV
- [ ] Bild-Upload für Items

#### Qualität
- [ ] `/dashboard/+page.svelte` aufräumen (zeigt noch alten Inhalt — ist jetzt nur Redirect)
- [ ] TypeScript-Typen für PageData in Dashboard streng typisieren
- [ ] Error-Boundary / 404-Seite

---

## Datei-Übersicht (wichtigste Dateien)

```
src/
  routes/
    +layout.server.ts          — userId/username/isModerator in locals
    +layout.svelte             — Root-Layout (app.css, global structure)
    +page.server.ts            — Dashboard-Load (guard: → /welcome wenn nicht eingeloggt)
    +page.svelte               — Dashboard UI
    welcome/
      +page.server.ts          — Register + Signin Actions (→ /)
      +page.svelte             — Welcome-Seite (Register + Signin Formulare)
    signin/
      +page.server.ts          — Standalone Signin (→ /)
      +page.svelte             — Signin Modal-Style
    forgot-password/
      +page.server.ts
      +page.svelte
    moderation/
      +page.server.ts          — Moderator-Guard, CRUD Actions
      +page.svelte             — Admin Panel UI
    dashboard/                 — NUR 301 Redirect → /
    api/
      signout/+server.ts       — Cookie löschen → /welcome
  lib/
    server/
      auth.ts                  — register, signin, validateSession, setModeratorStatus
      db/
        client.ts              — Drizzle + MariaDB Verbindung
        schema.ts              — Alle Tabellen-Definitionen
  app.css                      — Globales CSS (1:1 vom Original)
  app.d.ts                     — TypeScript: App.Locals Interface
  hooks.server.ts              — Session → locals (userId, username, isModerator)
drizzle/                       — SQL-Migrationsdateien
scripts/migrate.ts             — Migration Runner (tsx)
docker/
  start.sh                     — Migrations + App start
docker-compose.yml
```

---

## Bekannte Probleme / Hinweise

1. **`/dashboard`-Route**: Existiert noch als Ordner, enthält nur 301-Redirect zu `/`. Die alte `+page.svelte` dort kann entfernt werden.
2. **`listCategories` Query**: Lädt aktuell nur die erste Liste — muss für Multi-Listen-Support ausgebaut werden.
3. **Keine echte Echtzeit-Synchronisation**: Original nutzt `syncToken`-System — für CE erst relevant wenn API vollständig.
