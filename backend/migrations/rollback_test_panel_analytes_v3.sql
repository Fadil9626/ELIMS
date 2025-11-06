BEGIN;

-- 🧹 Drop the view (if exists)
DROP VIEW IF EXISTS v_panel_analytes;

-- 🧩 Drop the trigger and function
DROP TRIGGER IF EXISTS trg_fill_analyte_name ON test_panel_analytes;
DROP FUNCTION IF EXISTS fill_analyte_name();

-- 🗑️ Remove added columns (optional, only if reverting completely)
ALTER TABLE test_panel_analytes
  DROP COLUMN IF EXISTS analyte_name,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

-- 🔐 Drop unique constraint (optional)
ALTER TABLE test_panel_analytes
  DROP CONSTRAINT IF EXISTS unique_panel_analyte_pair;

COMMIT;
