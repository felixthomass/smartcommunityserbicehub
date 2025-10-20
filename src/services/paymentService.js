import { API_BASE_URL } from '../config/environment.js'

const API_BASE = API_BASE_URL

export const paymentService = {
  async createVerificationOrder({ supabaseUserId, amountPaise = 500000 }) {
    const res = await fetch(`${API_BASE}/api/payments/razorpay/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabaseUserId, amount: amountPaise })
    })
    if (!res.ok) throw new Error(`Failed to create order: ${res.status}`)
    return res.json()
  },

  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, supabaseUserId, month, type }) {
    const res = await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature, supabaseUserId, month, type })
    })
    if (!res.ok) throw new Error(`Failed to verify payment: ${res.status}`)
    return res.json()
  }
}


