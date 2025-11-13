/**
 * 🌐 Robust API fetch wrapper with clear error handling
 */
export async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data?.message) msg = data.message;
      } catch {
        const text = await res.text().catch(() => "");
        if (text) msg = text;
      }
      throw new Error(msg);
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    console.error("❌ API Error:", err.message);
    throw new Error(err.message || "Network error");
  }
}