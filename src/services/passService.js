const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) || ''

export const passService = {
  async createPass(payload) {
    const res = await fetch(`${API_BASE}/api/passes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create pass')
    return res.json()
  },
  async markPassUsed(code) {
    const res = await fetch(`${API_BASE}/api/passes/${encodeURIComponent(code)}/use`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error('Failed to mark pass used')
    return res.json()
  },
  async getPassByCode(code) {
    const res = await fetch(`${API_BASE}/api/passes/${encodeURIComponent(code)}`)
    if (!res.ok) throw new Error('Pass not found')
    return res.json()
  },
  async getPass(code) {
    const res = await fetch(`${API_BASE}/api/pass/${encodeURIComponent(code)}`)
    if (!res.ok) throw new Error('Pass not found')
    return res.json()
  },
  async verifyPass(payload) {
    const res = await fetch(`${API_BASE}/api/pass/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Verification failed')
    }
    return res.json()
  },
  async expirePass(code) {
    const res = await fetch(`${API_BASE}/api/passes/${encodeURIComponent(code)}/expire`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to expire pass')
    return res.json()
  },
  async updatePassStatus(code, status) {
    const res = await fetch(`${API_BASE}/api/passes/${encodeURIComponent(code)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (!res.ok) throw new Error('Failed to update pass status')
    return res.json()
  },
  async listPasses(options = {}) {
    const { host, search, status, startDate, endDate } = options
    const params = new URLSearchParams()
    if (host) params.append('host', host)
    if (search) params.append('search', search)
    if (status) params.append('status', status)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const url = `${API_BASE}/api/passes?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch passes')
    return res.json()
  },
  async deletePass(code) {
    const res = await fetch(`${API_BASE}/api/passes/${encodeURIComponent(code)}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete pass')
    return res.json()
  },
  async getSecurityActivity() {
    const res = await fetch(`${API_BASE}/api/passes/activity`)
    if (!res.ok) throw new Error('Failed to fetch activity')
    return res.json()
  }
}


