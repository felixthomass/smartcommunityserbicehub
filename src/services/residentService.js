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
  async adminCreateResidents(payload) {
    try {
      const res = await fetch(`${API_BASE}/api/residents/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) {
      // No fallback: enforce storing only through MongoDB API
      return { success: false, error: `API not available. Please start the server (npm run api) and ensure MONGODB_URI is set. Details: ${e.message}` }
    }
  },
  async listResidents() {
    try {
      const res = await fetch(`${API_BASE}/api/residents`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  },
  async deleteAllResidents() {
    try {
      const res = await fetch(`${API_BASE}/api/residents`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  },
  async setRestriction(authUserId, restricted) {
    const res = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(authUserId)}/restrict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restricted })
    })
    if (!res.ok) throw new Error('Failed to update restriction')
    return res.json()
  },

  async verifyResident(payload) {
    try {
      const res = await fetch(`${API_BASE}/api/residents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  },

  async getResidentByUserId(userId) {
    try {
      const res = await fetch(`${API_BASE}/api/residents/by-user/${encodeURIComponent(userId)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  }
  ,
  async listByFlat(building, flatNumber) {
    try {
      const res = await fetch(`${API_BASE}/api/residents/by-flat/${encodeURIComponent(building)}/${encodeURIComponent(flatNumber)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  },
  async updateResident(id, update) {
    try {
      const res = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) { return { success: false, error: e.message } }
  },
  async deleteResident(id) {
    try {
      const res = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (e) { return { success: false, error: e.message } }
  }
}


