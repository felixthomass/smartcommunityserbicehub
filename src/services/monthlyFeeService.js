import { API_BASE_URL } from '../config/environment.js'

class MonthlyFeeService {
  constructor() {
    this.baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`
  }

  async getFee() {
    try {
      const res = await fetch(`${this.baseUrl}/monthly-fee`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return { success: true, data: json.data }
    } catch (e) {
      console.error('MonthlyFee getFee error:', e)
      return { success: false, error: e.message }
    }
  }

  async setFee({ amount, currency = 'INR', notes = '', adminId = '' }) {
    try {
      const res = await fetch(`${this.baseUrl}/monthly-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, notes, adminId })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return { success: true, data: json.data }
    } catch (e) {
      console.error('MonthlyFee setFee error:', e)
      return { success: false, error: e.message }
    }
  }

  async pay({ residentId, month, amount }) {
    try {
      const res = await fetch(`${this.baseUrl}/monthly-fee/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentId, month, amount })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return { success: true, data: json.data }
    } catch (e) {
      console.error('MonthlyFee pay error:', e)
      return { success: false, error: e.message }
    }
  }

  async getStatus(residentId) {
    try {
      const res = await fetch(`${this.baseUrl}/monthly-fee/status/${residentId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return { success: true, data: json.data }
    } catch (e) {
      console.error('MonthlyFee getStatus error:', e)
      return { success: false, error: e.message }
    }
  }

  async deleteFee() {
    try {
      const res = await fetch(`${this.baseUrl}/monthly-fee`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return { success: true, data: json.data }
    } catch (e) {
      console.error('MonthlyFee deleteFee error:', e)
      return { success: false, error: e.message }
    }
  }
}

export const monthlyFeeService = new MonthlyFeeService()


