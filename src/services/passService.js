const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

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
  async getPassByCode(code) {
    const res = await fetch(`${API_BASE}/api/passes/${encodeURIComponent(code)}`)
    if (!res.ok) throw new Error('Pass not found')
    return res.json()
  },
  async listPasses(hostAuthUserId) {
    const url = hostAuthUserId ? `${API_BASE}/api/passes?host=${encodeURIComponent(hostAuthUserId)}` : `${API_BASE}/api/passes`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch passes')
    return res.json()
  }
}


