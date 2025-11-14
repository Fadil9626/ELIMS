// ===============================================================
// Notification / Messaging Service
// ===============================================================

const STORAGE_KEY = "elims_auth_v1";
const BASE_URL = "/api/messages";

// ---------------- Token Helper ----------------
const getToken = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch {
    return null;
  }
};

// ---------------- Header Builder ----------------
const buildHeaders = (token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

// ---------------- Request Handler ----------------
const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData?.message) message = errorData.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.status === 204 ? null : res.json();
};

// ===============================================================
// API METHODS
// ===============================================================

// 🔔 Unread count badge
export const getUnreadCount = async () => {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  return apiFetch(`${BASE_URL}/unread/count`, {
    headers: buildHeaders(token),
  });
};

// 📜 Get full message history
export const getMessageHistory = async () => {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  return apiFetch(`${BASE_URL}/history`, {
    headers: buildHeaders(token),
  });
};

// ✉️ Send message (private or broadcast)
export const sendMessage = async (payload) => {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  return apiFetch(`${BASE_URL}/send`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
};

// 🟢 Mark a thread as read
export const markThreadAsRead = async (peerId) => {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  if (!peerId) throw new Error("peerId is required for marking a thread read");

  return apiFetch(`${BASE_URL}/mark-thread-read`, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify({ peer_id: peerId }),
  });
};

// 🧹 Optional: Mark all messages read
export const markAllMessagesAsRead = async () => {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  return apiFetch(`${BASE_URL}/mark-read`, {
    method: "PUT",
    headers: buildHeaders(token),
  });
};

// ===============================================================
// Helper - Format message timestamp for UI
// ===============================================================
export const formatTimestamp = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Export grouped service object
const notificationService = {
  getUnreadCount,
  getMessageHistory,
  sendMessage,
  markThreadAsRead,
  markAllMessagesAsRead,
  formatTimestamp,
};

export default notificationService;
