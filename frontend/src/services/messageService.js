import apiFetch from "./apiFetch";

const BASE = "/api/messages";

export default {
  getUnreadCount: () => apiFetch(`${BASE}/unread/count`),
  getMessageHistory: (userId) => apiFetch(`${BASE}/history?user=${userId}`),
  sendMessage: (payload) => apiFetch(`${BASE}/send`, "POST", payload),
  markAsRead: (sender_id) => apiFetch(`${BASE}/mark-read`, "PUT", { sender_id }),
};
