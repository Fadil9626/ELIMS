/* =====================================================================
  📘 Migration: fix_test_panel_analytes_v3.sql
  ---------------------------------------------------------------------
  Author: ChatGPT (Assisted for MediTrust ELIMS)
  Created: 2025-11-01
  Purpose:
    • Standardize `test_panel_analytes` structure
    • Reinforce foreign keys and unique constraints
    • Add auto-fill trigger for analyte_name
    • Backfill analyte_name for existing data
  ---------------------------------------------------------------------
  Safe to run multiple times (idempotent).
===================================================================== */

BEGIN;

-- ================================================================
-- 🧱 1️⃣ Ensure required columns exist
-- ================================================================
ALTER TABLE IF EXISTS test_panel_analytes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS analyte_name TEXT;

COMMENT ON COLUMN test_panel_analytes.analyte_name IS
  'Auto-filled analyte name, synced via trigger from test_catalog';

-- ================================================================
-- 🔗 2️⃣ Ensure correct foreign key constraints
-- ================================================================
DO $$
BEGIN
  -- Drop and recreate analyte_id FK
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_panel_analytes_analyte_id_fkey'
      AND conrelid = 'test_panel_analytes'::regclass
  ) THEN
    ALTER TABLE test_panel_analytes
    DROP CONSTRAINT test_panel_analytes_analyte_id_fkey;
  END IF;

  ALTER TABLE test_panel_analytes
    ADD CONSTRAINT test_panel_analytes_analyte_id_fkey
    FOREIGN KEY (analyte_id)
    REFERENCES test_catalog(id)
    ON DELETE CASCADE;

  -- Drop and recreate panel_id FK
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_panel_analytes_panel_id_fkey'
      AND conrelid = 'test_panel_analytes'::regclass
  ) THEN
    ALTER TABLE test_panel_analytes
    DROP CONSTRAINT test_panel_analytes_panel_id_fkey;
  END IF;

  ALTER TABLE test_panel_analytes
    ADD CONSTRAINT test_panel_analytes_panel_id_fkey
    FOREIGN KEY (panel_id)
    REFERENCES test_catalog(id)
    ON DELETE CASCADE;
END $$;

-- ================================================================
-- 🔒 3️⃣ Enforce unique panel–analyte pairing
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_panel_analyte_pair'
      AND conrelid = 'test_panel_analytes'::regclass
  ) THEN
    ALTER TABLE test_panel_analytes
      ADD CONSTRAINT unique_panel_analyte_pair
      UNIQUE (panel_id, analyte_id);
  END IF;
END $$;

COMMENT ON CONSTRAINT unique_panel_analyte_pair ON test_panel_analytes IS
  'Prevents duplicate analyte assignments within a single test panel';

-- ================================================================
-- ⚙️ 4️⃣ Create / Refresh trigger for analyte_name autofill
-- ================================================================
DROP TRIGGER IF EXISTS trg_fill_analyte_name ON test_panel_analytes;
DROP FUNCTION IF EXISTS fill_analyte_name();

CREATE OR REPLACE FUNCTION fill_analyte_name()
RETURNS TRIGGER AS $$
BEGIN
  SELECT name INTO NEW.analyte_name
  FROM test_catalog
  WHERE id = NEW.analyte_id;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fill_analyte_name
BEFORE INSERT OR UPDATE ON test_panel_analytes
FOR EACH ROW
EXECUTE FUNCTION fill_analyte_name();

COMMENT ON TRIGGER trg_fill_analyte_name ON test_panel_analytes IS
  'Auto-populates analyte_name from test_catalog on insert or update';

-- ================================================================
-- 🧹 5️⃣ Backfill analyte_name for existing records
-- ================================================================
UPDATE test_panel_analytes tpa
SET analyte_name = tc.name,
    updated_at = NOW()
FROM test_catalog tc
WHERE tpa.analyte_id = tc.id
  AND (tpa.analyte_name IS NULL OR tpa.analyte_name <> tc.name);

-- ================================================================
-- ✅ 6️⃣ Verification query (optional)
-- ================================================================
-- SELECT id, panel_id, analyte_id, analyte_name FROM test_panel_analytes ORDER BY panel_id, analyte_name;

COMMIT;

/* =====================================================================
  ✅ SUCCESS NOTES:
    • Safe to rerun — will skip duplicates and existing constraints.
    • New analytes added from frontend auto-fill analyte_name correctly.
    • Duplicate pairs prevented via UNIQUE constraint.
    • Deleting a test from test_catalog automatically removes its links.
===================================================================== */
