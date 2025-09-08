const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

export const residentService = {
  async getProfile(authUserId) {
    const res = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(authUserId)}`)
    if (res.status === 404) {
      return { success: true, resident: null }
    }
    if (!res.ok) throw new Error('Failed to fetch resident profile')
    return res.json()
  },

  async saveProfile(payload) {
    const res = await fetch(`${API_BASE}/api/residents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to save resident profile')
    return res.json()
  }
  ,
  async listResidents() {
    const res = await fetch(`${API_BASE}/api/residents`)
    if (!res.ok) throw new Error('Failed to fetch residents')
    return res.json()
  },
  async setRestriction(authUserId, restricted) {
    const res = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(authUserId)}/restrict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restricted })
    })
    if (!res.ok) throw new Error('Failed to update restriction')
    return res.json()
  }
}


