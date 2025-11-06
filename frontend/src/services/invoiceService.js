const API_URL = "/api/invoices";

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const getInvoiceForRequest = (requestId, token) =>
  apiFetch(`${API_URL}/test-request/${requestId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export default { getInvoiceForRequest };
