const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

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


