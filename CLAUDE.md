# CLAUDE.md — Lookbook Admin

## Project Overview

Admin system for managing photo-first restaurant menus. JSON is the source of truth.

**Domains:**
- `admin.lookbook.menu` - Vue 3 SPA (Cloudflare Pages)
- `api.admin.lookbook.menu` - Cloudflare Worker

**Storage:**
- `menumanager` - Public bucket (customer-facing menus)
- `menumanager-internal` - Private bucket (tenants, versions, logs)

## UI Navigation

- `/` - Brands list (home page)
- `/dashboard` - Stats dashboard (future: views, analytics)
- `/brands/:brand` - Brand detail with stores
- `/brands/:brand/:store` - Store detail with menus
- `/brands/:brand/:store/:menu` - Menu editor with item grid
- `/deploy` - Super-admin brand deployment

## Key Features

### Photo Capture (NEW)
- Click any menu item → full-screen detail view
- Tap image area → camera/file picker
- Crop to 600x600 square
- Upload to R2, auto-generates filename: `{category}__{item-slug}.jpg`

### Admin Mode
- Login with `*` as brand → access all brands
- Shows "Admin" badge in nav
- Can browse and edit any brand's menus

## Architecture

```
packages/
  api/          # Cloudflare Worker
  admin-ui/     # Vue 3 SPA
```

## Non-Negotiable Rules

1. **No database** - JSON files on R2 are the source of truth
2. **Tenant isolation** - Brand can only access its own paths
3. **Every write creates**: snapshot, manifest entry, audit log, live update
4. **No rollback UI in v1** - storage supports it for later
5. **No user accounts** - API key auth only

## R2 Layout

**Public (menumanager):**
```
/{brand}/registry_{brand}.json
/{brand}/{store}.json
/{brand}/{store}__{menu}.json
/{brand}/images/*
```

**Private (menumanager-internal):**
```
/_tenants/{brand}/keys.json
/_versions/{brand}/{store}__{menu}/manifest.json
/_logs/{brand}/{store}__{menu}/{date}.jsonl
```

## Auth Model

- Multiple API keys per brand
- Keys stored hashed in `/_tenants/{brand}/keys.json`
- Bearer token: `Authorization: Bearer <API_KEY>`
- Worker validates hash and enforces brand isolation

## Commands

```bash
# Development
pnpm dev:api      # Start Worker locally
pnpm dev:ui       # Start Vue dev server

# Build
pnpm build:api    # Build Worker
pnpm build:ui     # Build Vue app

# Deploy
pnpm deploy:api   # Deploy Worker
pnpm deploy:ui    # Deploy to Pages
```

## DoorDash Scraping Integration

Scrape DoorDash menus via Apify and store as draft menus.

**Endpoints:**
- `POST /api/admin/scrape/dd` - Start scrape (super-admin only)
- `POST /api/integrations/apify/webhook` - Receive Apify callbacks

**Storage:**
- R2: `lookbook-scrapes` bucket for raw payloads
- Supabase: Normalized restaurant/menu data

**See:** `/docs/apify-dd-ingestion.md` for full setup guide.

## v2 Upgrade Path (not implemented)

- Cloudflare D1 for structured data
- User accounts + JWT auth
- Keep R2 layout and publish pipeline unchanged
