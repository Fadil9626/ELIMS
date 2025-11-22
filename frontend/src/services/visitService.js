const API_BASE = "/api/visits";

export default {
  // 📋 LIST VISITS FOR PATIENT
  async listByPatient(patientId, token) {
    const res = await fetch(`${API_BASE}/patient/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  // 🔎 GET SINGLE VISIT
  async getVisitById(visitId, token) {
    const res = await fetch(`${API_BASE}/${visitId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  // ➕ CREATE VISIT
  async createVisit(data, token) {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ✏️ UPDATE VISIT
  async updateVisit(visitId, data, token) {
    const res = await fetch(`${API_BASE}/${visitId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 🗑️ DELETE VISIT
  async deleteVisit(visitId, token) {
    const res = await fetch(`${API_BASE}/${visitId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  }
};