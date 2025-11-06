// backend/utils/orgSettings.js
const pool = require("../config/database");

let cache = { data: null, ts: 0 };
const TTL_MS = 60_000;

const KEYS = [
  "org.name",
  "org.logo_url",
  "org.address",
  "org.phone",
  "org.email",
  "org.website",
  "org.footer_note",
];

async function getOrgSettings(client = null) {
  const now = Date.now();
  if (cache.data && now - cache.ts < TTL_MS) return cache.data;

  const runner = client || pool;
  let rows = [];
  try {
    // Prefer dedicated org_settings table if present
    rows = (await runner.query(
      `SELECT key, value FROM org_settings WHERE key = ANY($1::text[])`,
      [KEYS]
    )).rows;
  } catch (_) {
    // Fallback to generic settings table
    try {
      rows = (await runner.query(
        `SELECT key, value FROM settings WHERE key = ANY($1::text[])`,
        [KEYS]
      )).rows;
    } catch {
      rows = [];
    }
  }

  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const data = {
    name: map["org.name"] || process.env.ORG_NAME || "Your Laboratory",
    logo_url: map["org.logo_url"] || process.env.ORG_LOGO_URL || null,
    address: map["org.address"] || process.env.ORG_ADDRESS || "",
    phone: map["org.phone"] || process.env.ORG_PHONE || "",
    email: map["org.email"] || process.env.ORG_EMAIL || "",
    website: map["org.website"] || process.env.ORG_WEBSITE || "",
    footer_note: map["org.footer_note"] || "",
  };

  cache = { data, ts: now };
  return data;
}

module.exports = { getOrgSettings };
