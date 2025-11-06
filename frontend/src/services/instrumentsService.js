// src/services/instrumentsService.js

function getToken() {
  try {
    return JSON.parse(localStorage.getItem("userInfo"))?.token || "";
  } catch {
    return "";
  }
}

async function handleRes(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore json parse error
  }
  if (!res.ok) {
    throw new Error(data?.message || res.statusText || "Request failed");
  }
  return data;
}

/** LIST */
async function getInstruments({ q = "", active = "", limit = 100, offset = 0 } = {}) {
  const qs = new URLSearchParams({ q, active, limit, offset }).toString();
  const res = await fetch(`/api/instruments?${qs}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return handleRes(res);
}

/** CREATE */
async function createInstrument(payload = {}) {
  const res = await fetch(`/api/instruments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

/** UPDATE */
async function updateInstrument(id, payload = {}) {
  const res = await fetch(`/api/instruments/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

/** DELETE */
async function deleteInstrument(id) {
  const res = await fetch(`/api/instruments/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return handleRes(res);
}

// Named exports
export { getInstruments, createInstrument, updateInstrument, deleteInstrument };

// Default export so you can `import instrumentsService from ...`
export default {
  getInstruments,
  createInstrument,
  updateInstrument,
  deleteInstrument,
};
