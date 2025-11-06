// frontend/src/services/ingestEventsService.js
const BASE = "/api/ingest-events";

const getToken = (maybeToken) => {
  if (maybeToken) return maybeToken;
  try {
    return JSON.parse(localStorage.getItem("userInfo"))?.token || null;
  } catch {
    return null;
  }
};

const authedFetch = async (url, { token, headers, ...rest } = {}) => {
  const jwt = getToken(token);
  const res = await fetch(url, {
    headers: { ...(headers || {}), ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    ...rest,
  });
  if (!res.ok) throw new Error(await res.text());
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
};

export const listIngestEvents = (params = {}, token) => {
  const qs = new URLSearchParams(params).toString();
  return authedFetch(`${BASE}${qs ? `?${qs}` : ""}`, { token });
};

export const getIngestEvent = (id, token) =>
  authedFetch(`${BASE}/${id}`, { token });

export default { listIngestEvents, getIngestEvent };
