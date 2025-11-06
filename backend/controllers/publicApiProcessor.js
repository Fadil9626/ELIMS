// controllers/publicApiProcessor.js
const pool = require("../config/database");

/**
 * Process a single row from instrument_ingest_events:
 * - Expand payload.result JSON → rows
 * - Map device_code → analyte_id (via instrument_code_map)
 * - Find test_request by external_sample_id
 * - For each mapped analyte, update its test_request_item
 */
async function processIngestEvent(eventRow) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payload = eventRow.payload || {};
    const instrument = String(payload.instrument || "").trim();
    const sampleId = String(payload.sample_id || "").trim();

    if (!instrument || !sampleId || !payload.result || typeof payload.result !== "object") {
      await client.query(
        `UPDATE instrument_ingest_events
           SET status = 'error', error_msg = 'Missing instrument/sample_id/result'
         WHERE id = $1`,
        [eventRow.id]
      );
      await client.query("COMMIT");
      return { ok: false, reason: "invalid_payload" };
    }

    // 1) Find the request
    const { rows: reqRows } = await client.query(
      `SELECT id FROM test_requests WHERE external_sample_id = $1 LIMIT 1`,
      [sampleId]
    );
    if (!reqRows.length) {
      await client.query(
        `UPDATE instrument_ingest_events
           SET status = 'queued', error_msg = 'No matching request yet'
         WHERE id = $1`,
        [eventRow.id]
      );
      await client.query("COMMIT");
      return { ok: true, queued: true };
    }
    const requestId = reqRows[0].id;

    // 2) Fetch mapping for this instrument
    const { rows: mapRows } = await client.query(
      `SELECT device_code, analyte_id, unit_id
         FROM instrument_code_map
        WHERE instrument = $1`,
      [instrument]
    );
    const codeMap = new Map(mapRows.map(r => [String(r.device_code).toUpperCase(), r]));

    // 3) For each result code, update matching test_request_item
    let updated = 0;
    for (const [code, val] of Object.entries(payload.result)) {
      const key = String(code).toUpperCase();
      const map = codeMap.get(key);
      if (!map) continue;

      // find item for this analyte on this request
      const { rows: triRows } = await client.query(
        `SELECT id
           FROM test_request_items
          WHERE test_request_id = $1 AND test_catalog_id = $2
          LIMIT 1`,
        [requestId, map.analyte_id]
      );
      if (!triRows.length) continue;

      const triId = triRows[0].id;

      const resultData = {
        value: typeof val === "number" ? val : String(val),
        source: "instrument",
        instrument,
        device_code: code,
        received_at: new Date().toISOString(),
      };

      await client.query(
        `UPDATE test_request_items
            SET result_data = $1,
                status = 'Completed',
                updated_at = NOW()
          WHERE id = $2`,
        [JSON.stringify(resultData), triId]
      );
      updated++;
    }

    // 4) If nothing updated, mark info on the event and exit
    if (updated === 0) {
      await client.query(
        `UPDATE instrument_ingest_events
            SET status = 'ignored', error_msg = 'No mapped codes found'
          WHERE id = $1`,
        [eventRow.id]
      );
      await client.query("COMMIT");
      return { ok: true, updated: 0 };
    }

    // 5) If all items on the request are complete, close the request
    const { rows: pend } = await client.query(
      `SELECT COUNT(*)::int AS pending
         FROM test_request_items
        WHERE test_request_id = $1 AND result_data IS NULL`,
      [requestId]
    );
    if (pend[0].pending === 0) {
      await client.query(
        `UPDATE test_requests
            SET status = 'Completed', updated_at = NOW()
          WHERE id = $1`,
        [requestId]
      );
    }

    // 6) Mark event as processed
    await client.query(
      `UPDATE instrument_ingest_events
          SET status = 'processed', error_msg = NULL
        WHERE id = $1`,
      [eventRow.id]
    );

    await client.query("COMMIT");
    return { ok: true, updated, requestId };
  } catch (e) {
    await client.query("ROLLBACK");
    // best effort error tagging on the event
    try {
      await client.query(
        `UPDATE instrument_ingest_events
            SET status = 'error', error_msg = $2
          WHERE id = $1`,
        [eventRow.id, e.message]
      );
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { processIngestEvent };
