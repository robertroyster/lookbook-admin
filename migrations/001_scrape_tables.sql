-- Migration: 001_scrape_tables
-- Description: Create tables for DoorDash scraping and menu draft management
-- Created: 2025

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RESTAURANTS
-- Core restaurant records, populated from scrape data
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address1 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurants_name ON restaurants(name);
CREATE INDEX idx_restaurants_city_state ON restaurants(city, state);

-- ============================================================================
-- RESTAURANT_SOURCES
-- Links restaurants to external source URLs (DoorDash, UberEats, etc.)
-- source_url must be unique to prevent duplicates
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurant_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'doordash', 'ubereats', 'manual', etc.
  source_url TEXT NOT NULL UNIQUE,
  external_id TEXT, -- Platform-specific ID if available
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restaurant_sources_restaurant ON restaurant_sources(restaurant_id);
CREATE INDEX idx_restaurant_sources_source ON restaurant_sources(source);
CREATE UNIQUE INDEX idx_restaurant_sources_url ON restaurant_sources(source_url);

-- ============================================================================
-- DRAFT_MENUS
-- Draft menus scraped from external sources
-- Status: 'unclaimed' | 'claimed' | 'published'
-- ============================================================================
CREATE TABLE IF NOT EXISTS draft_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draft_menus_restaurant ON draft_menus(restaurant_id);
CREATE INDEX idx_draft_menus_status ON draft_menus(status);
CREATE INDEX idx_draft_menus_source ON draft_menus(source);

-- ============================================================================
-- DRAFT_SECTIONS
-- Menu sections/categories within a draft menu
-- ============================================================================
CREATE TABLE IF NOT EXISTS draft_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_menu_id UUID NOT NULL REFERENCES draft_menus(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draft_sections_menu ON draft_sections(draft_menu_id);

-- ============================================================================
-- DRAFT_ITEMS
-- Individual menu items within a draft section
-- price_cents stores normalized price (e.g., $12.99 -> 1299)
-- raw stores original data including multiple prices, options, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS draft_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_section_id UUID NOT NULL REFERENCES draft_sections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER, -- Price in cents, NULL if no price or varies
  image_url TEXT,
  raw JSONB, -- Original data from scraper
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draft_items_section ON draft_items(draft_section_id);

-- ============================================================================
-- IMPORTS
-- Track all import runs for idempotency and debugging
-- payload_hash is SHA-256 of the raw JSON for deduplication
-- ============================================================================
CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL, -- 'doordash', etc.
  run_id TEXT NOT NULL, -- Apify run ID
  dataset_id TEXT NOT NULL, -- Apify dataset ID
  payload_hash TEXT NOT NULL, -- SHA-256 of raw payload
  r2_key TEXT NOT NULL, -- R2 storage key for raw payload
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'partial', 'failed')),
  error_message TEXT,
  item_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imports_run ON imports(run_id);
CREATE INDEX idx_imports_hash ON imports(payload_hash);
CREATE INDEX idx_imports_status ON imports(status);
CREATE INDEX idx_imports_source ON imports(source);

-- ============================================================================
-- CLAIMS
-- Restaurant claim codes for owners to claim their draft menus
-- code_hash stores SHA-256 of the claim code (XXXX-XXXX format)
-- expires_at is 14 days from creation by default
-- ============================================================================
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- SHA-256 of claim code
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ, -- NULL until claimed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_restaurant ON claims(restaurant_id);
CREATE INDEX idx_claims_hash ON claims(code_hash);
CREATE INDEX idx_claims_expires ON claims(expires_at) WHERE claimed_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- These tables are accessed via service role key only
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Service role has full access (these policies allow service_role to bypass RLS)
-- In Supabase, service_role key automatically bypasses RLS
-- These are included for documentation purposes

COMMENT ON TABLE restaurants IS 'Core restaurant records populated from scrape data';
COMMENT ON TABLE restaurant_sources IS 'Links restaurants to external source URLs for deduplication';
COMMENT ON TABLE draft_menus IS 'Draft menus scraped from external sources, awaiting claim/review';
COMMENT ON TABLE draft_sections IS 'Menu sections/categories within a draft menu';
COMMENT ON TABLE draft_items IS 'Individual menu items with normalized pricing';
COMMENT ON TABLE imports IS 'Import run tracking for idempotency and debugging';
COMMENT ON TABLE claims IS 'Restaurant claim codes for owner verification';
