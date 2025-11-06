// controllers/lisController.js
const pool = require("../config/database");

/**
 * Helper to try a query and swallow "undefined column" (42703) for schema flexibility.
 */
async function tryQuery(sql, params) {
  try {
    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (e) {
    if (e.code === "42703") return []; // column doesn't exist in this schema
    throw e;
  }
}

/**
 * GET /api/lis/resolve-sample?sample_id=...
 * Extract numeric requestId from sample_id (e.g., "TR-63" -> 63) and resolve a test_item_id.
 * Tries different schema shapes, finally falls back to "latest item in that request".
 */
async function resolveSample(req, res) {
  try {
    const raw = (req.query.sample_id || "").trim();
    if (!raw) return res.status(400).json({ message: "sample_id is required" });

    const m = raw.match(/(\d+)/);
    if (!m) return res.status(404).json({ message: `Cannot resolve sample_id '${raw}'` });

    const requestId = parseInt(m[1], 10);
    if (!Number.isFinite(requestId)) {
      return res.status(404).json({ message: `Invalid request id from sample_id '${raw}'` });
    }

    // Attempt A: tri.test_id exists
    const rowsA = await tryQuery(
      `
      SELECT tri.id AS test_item_id
      FROM test_request_items tri
      JOIN test_requests tr ON tr.id = tri.test_request_id
      JOIN test_catalog tc ON tc.id = tri.test_id
      WHERE tr.id = $1
        AND (tc.name ILIKE '%CBC%' OR tc.code ILIKE '%CBC%' OR COALESCE(tc.short_name,'') ILIKE '%CBC%')
      ORDER BY tri.id DESC
      LIMIT 1
      `,
      [requestId]
    );
    if (rowsA.length) return res.json({ testItemId: rowsA[0].test_item_id });

    // Attempt B: tri.test_catalog_id exists
    const rowsB = await tryQuery(
      `
      SELECT tri.id AS test_item_id
      FROM test_request_items tri
      JOIN test_requests tr ON tr.id = tri.test_request_id
      JOIN test_catalog tc ON tc.id = tri.test_catalog_id
      WHERE tr.id = $1
        AND (tc.name ILIKE '%CBC%' OR tc.code ILIKE '%CBC%' OR COALESCE(tc.short_name,'') ILIKE '%CBC%')
      ORDER BY tri.id DESC
      LIMIT 1
      `,
      [requestId]
    );
    if (rowsB.length) return res.json({ testItemId: rowsB[0].test_item_id });

    // Fallback: pick latest item for that request
    const { rows: rowsFallback } = await pool.query(
      `
      SELECT tri.id AS test_item_id
      FROM test_request_items tri
      WHERE tri.test_request_id = $1
      ORDER BY tri.id DESC
      LIMIT 1
      `,
      [requestId]
    );
    if (rowsFallback.length) return res.json({ testItemId: rowsFallback[0].test_item_id });

    return res.status(404).json({ message: `No test items found for request ${requestId}` });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Resolver failed" });
  }
}

/**
 * POST /api/lis/cbc/ingest/:testItemId
 * Body { panel, instrument, sample_id, results, analyzer_meta }
 * Upserts into test_item_results and logs in ingest_events.
 */
async function ingestCbc(req, res) {
  const client = await pool.connect();
  try {
    const testItemId = parseInt(req.params.testItemId, 10);
    if (!Number.isFinite(testItemId)) {
      client.release();
      return res.status(400).json({ message: "Invalid testItemId" });
    }

    const {
      panel = "CBC/FBC",
      instrument = "Analyzer",
      sample_id = null,
      results = {},
      analyzer_meta = {},
    } = req.body || {};

    if (!results || Object.keys(results).length === 0) {
      client.release();
      return res.status(400).json({ message: "No results provided" });
    }

    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO public.test_item_results
        (test_item_id, panel, instrument, sample_id, results, analyzer_meta)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
      ON CONFLICT (test_item_id) DO UPDATE SET
        panel = EXCLUDED.panel,
        instrument = EXCLUDED.instrument,
        sample_id = EXCLUDED.sample_id,
        results = EXCLUDED.results,
        analyzer_meta = EXCLUDED.analyzer_meta,
        updated_at = NOW()
      `,
      [testItemId, panel, instrument, sample_id, results, analyzer_meta]
    );

    await client.query(
      `
      INSERT INTO public.ingest_events (instrument, sample_id, status, payload)
      VALUES ($1, $2, 'processed', $3::jsonb)
      `,
      [instrument, sample_id, { testItemId, panel, results, analyzer_meta }]
    );

    await client.query("COMMIT");
    return res.json({ ok: true, testItemId });
  } catch (e) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: e.message || "Ingest failed" });
  } finally {
    client.release();
  }
}

module.exports = { resolveSample, ingestCbc };
