const API_BASE = "/api/visits";

export default {
  async listByPatient(patientId, token) {
    const res = await fetch(`${API_BASE}/patient/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  async createVisit(data, token) {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
