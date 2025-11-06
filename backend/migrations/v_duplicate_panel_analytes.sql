-- ============================================================
-- 🔍 VIEW: v_duplicate_panel_analytes
-- Purpose: Identify duplicate analyte assignments per panel.
-- ============================================================

CREATE OR REPLACE VIEW v_duplicate_panel_analytes AS
SELECT
    panel_id,
    a_panel.name AS panel_name,
    analyte_id,
    a_analyte.name AS analyte_name,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(tpa.id ORDER BY tpa.id) AS duplicate_ids
FROM test_panel_analytes tpa
JOIN test_catalog a_panel   ON a_panel.id = tpa.panel_id
JOIN test_catalog a_analyte ON a_analyte.id = tpa.analyte_id
GROUP BY panel_id, a_panel.name, analyte_id, a_analyte.name
HAVING COUNT(*) > 1
ORDER BY panel_name, analyte_name;
