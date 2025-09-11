const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

export const complaintService = {
  async createComplaint(payload) {
    const res = await fetch(`${API_BASE}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create complaint')
    return res.json()
  },
  async listComplaints(residentAuthUserId) {
    const url = residentAuthUserId
      ? `${API_BASE}/api/complaints?resident=${encodeURIComponent(residentAuthUserId)}`
      : `${API_BASE}/api/complaints`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch complaints')
    return res.json()
  },
  async updateComplaint(id, update) {
    const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    })
    if (!res.ok) throw new Error('Failed to update complaint')
    return res.json()
  },
  async deleteComplaint(id) {
    const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete complaint')
    return res.json()
  }
}


