# Apify DoorDash Ingestion

This document describes how to configure and use the DoorDash menu scraping integration powered by Apify.

## Overview

The integration works as follows:

1. Admin calls `POST /api/admin/scrape/dd` with DoorDash store URLs
2. API starts an async Apify Task run and returns immediately
3. Apify scrapes the stores and calls our webhook when complete
4. Webhook fetches results, stores raw data in R2, and normalizes to Supabase
5. Draft menus are created with status `unclaimed`
6. Claim codes are generated for new restaurants (logged to console)

## Environment Variables

Set these secrets via `wrangler secret put`:

```bash
# Apify credentials
wrangler secret put APIFY_TOKEN
wrangler secret put APIFY_TASK_ID
wrangler secret put APIFY_WEBHOOK_SECRET

# Supabase credentials
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Local Development

For local development, create a `.dev.vars` file in `packages/api/`:

```env
APIFY_TOKEN=apify_api_xxxxx
APIFY_TASK_ID=your-task-id
APIFY_WEBHOOK_SECRET=your-secret-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Apify Task Configuration

### 1. Create an Apify Task

1. Go to [Apify Console](https://console.apify.com/)
2. Find a DoorDash scraper actor (e.g., `epctex/doordash-scraper`)
3. Create a Task from the actor
4. Note the Task ID from the URL

### 2. Configure Webhook (Optional)

The API automatically configures webhooks per-run. Alternatively, configure a default webhook in your Apify Task settings:

- **Event types**: `ACTOR.RUN.SUCCEEDED`, `ACTOR.RUN.FAILED`
- **Webhook URL**: `https://api.admin.lookbook.menu/api/integrations/apify/webhook?secret=YOUR_SECRET`

### 3. Task Input Schema

The API sends this input structure:

```json
{
  "startUrls": [
    { "url": "https://www.doordash.com/store/restaurant-name-123/" }
  ]
}
```

## R2 Bucket Setup

Create an R2 bucket named `lookbook-scrapes` (or `lookbook-scrapes-dev` for preview):

```bash
wrangler r2 bucket create lookbook-scrapes
wrangler r2 bucket create lookbook-scrapes-dev
```

## Database Setup

Run the migration in your Supabase SQL editor:

```bash
# From repo root
cat migrations/001_scrape_tables.sql
# Copy and paste into Supabase SQL Editor, or use supabase CLI
```

## API Usage

### Start a Scrape Run

```bash
curl -X POST https://api.admin.lookbook.menu/api/admin/scrape/dd \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeUrls": [
      "https://www.doordash.com/store/example-restaurant-123/",
      "https://www.doordash.com/store/another-place-456/"
    ],
    "eventId": "optional-correlation-id"
  }'
```

**Response (202 Accepted):**
```json
{
  "apifyRunId": "abc123xyz",
  "defaultDatasetId": "dataset789",
  "status": "RUNNING",
  "storeCount": 2,
  "webhookConfigured": true
}
```

### Webhook Payload (from Apify)

The webhook receives this payload on run completion:

```json
{
  "eventType": "ACTOR.RUN.SUCCEEDED",
  "resource": {
    "id": "abc123xyz",
    "defaultDatasetId": "dataset789",
    "status": "SUCCEEDED"
  }
}
```

### Testing Webhook Locally

Use ngrok or cloudflared tunnel to expose your local worker:

```bash
# Terminal 1: Start local worker
cd packages/api && pnpm dev

# Terminal 2: Create tunnel
npx ngrok http 8787
# or
cloudflared tunnel --url http://localhost:8787
```

Then configure the tunnel URL in your Apify Task webhook settings.

### Replay a Webhook

To manually trigger webhook processing:

```bash
curl -X POST "http://localhost:8787/api/integrations/apify/webhook?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "ACTOR.RUN.SUCCEEDED",
    "resource": {
      "id": "existing-run-id",
      "defaultDatasetId": "existing-dataset-id",
      "status": "SUCCEEDED"
    }
  }'
```

## Viewing Data

### Raw Payload in R2

Raw scraped data is stored gzipped at: `raw/dd/{runId}.json.gz`

View via Cloudflare dashboard or:

```bash
wrangler r2 object get lookbook-scrapes raw/dd/abc123xyz.json.gz --file=payload.json.gz
gunzip payload.json.gz
cat payload.json | jq
```

### Querying Supabase

**Find unclaimed drafts:**
```sql
SELECT
  r.name as restaurant_name,
  dm.source_url,
  dm.status,
  dm.created_at,
  c.expires_at as claim_expires
FROM draft_menus dm
JOIN restaurants r ON r.id = dm.restaurant_id
LEFT JOIN claims c ON c.restaurant_id = r.id AND c.claimed_at IS NULL
WHERE dm.status = 'unclaimed'
ORDER BY dm.created_at DESC;
```

**Find restaurants by source:**
```sql
SELECT
  r.*,
  rs.source,
  rs.source_url,
  rs.last_seen_at
FROM restaurants r
JOIN restaurant_sources rs ON rs.restaurant_id = r.id
WHERE rs.source = 'doordash';
```

**View import history:**
```sql
SELECT
  run_id,
  status,
  item_count,
  r2_key,
  created_at,
  error_message
FROM imports
WHERE source = 'doordash'
ORDER BY created_at DESC
LIMIT 20;
```

**Check claim status:**
```sql
SELECT
  r.name,
  c.expires_at,
  c.claimed_at,
  CASE
    WHEN c.claimed_at IS NOT NULL THEN 'claimed'
    WHEN c.expires_at < NOW() THEN 'expired'
    ELSE 'pending'
  END as claim_status
FROM claims c
JOIN restaurants r ON r.id = c.restaurant_id
ORDER BY c.created_at DESC;
```

## Idempotency

The system is designed to be idempotent:

1. **Import deduplication**: If the same payload (by SHA-256 hash) is received again, it's skipped
2. **Restaurant deduplication**: Restaurants are matched by `source_url` in `restaurant_sources`
3. **Source update**: Repeated scrapes update `last_seen_at` but don't duplicate records

## Data Flow

```
POST /api/admin/scrape/dd
         │
         ▼
   Apify Task Run (async)
         │
         ▼
Apify Webhook ─────────────────────────┐
         │                             │
         ▼                             │
Fetch Dataset Items                    │
         │                             │
         ├──► R2: raw/dd/{runId}.json.gz
         │                             │
         ▼                             │
Normalize & Store ─────────────────────┤
         │                             │
         ├──► Supabase: restaurants    │
         ├──► Supabase: restaurant_sources
         ├──► Supabase: draft_menus    │
         ├──► Supabase: draft_sections │
         ├──► Supabase: draft_items    │
         ├──► Supabase: imports        │
         └──► Supabase: claims         │
                                       │
Console Log: claim codes ◄─────────────┘
```

## Limitations

- **Reviews stripped**: Customer reviews are not stored in normalized data (only in raw R2 payload)
- **Draft only**: Scraped data is never auto-published; requires manual review/claim
- **Single webhook**: One webhook URL per run (configured automatically)
- **No retry**: Failed items within a run are logged but not automatically retried

## Troubleshooting

### Webhook not firing

1. Check Apify run logs in console
2. Verify webhook URL is accessible (test with curl)
3. Check `APIFY_WEBHOOK_SECRET` matches

### Import shows as failed

1. Check `imports` table for `error_message`
2. Review worker logs in Cloudflare dashboard
3. Verify Supabase credentials are correct

### Duplicate restaurants

1. Check `restaurant_sources` for duplicate URLs
2. Verify the scraper is returning consistent URLs
3. Run deduplication query if needed
