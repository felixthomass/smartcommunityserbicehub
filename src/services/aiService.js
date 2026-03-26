const API_BASE = '/api'

export const aiService = {
    /**
     * General purpose AI generation
     * @param {string} prompt - The user prompt
     * @param {string} systemPrompt - Optional system instructions
     */
    generate: async (prompt, systemPrompt = '') => {
        try {
            const response = await fetch(`${API_BASE}/ai/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, systemPrompt })
            })
            const data = await response.json()
            if (data.success) return { success: true, text: data.text }
            throw new Error(data.error || 'AI generation failed')
        } catch (error) {
            console.error('aiService.generate error:', error)
            return { success: false, error: error.message }
        }
    },

    /**
     * Specialized endpoint for payment insights
     */
    getPaymentInsights: async (paymentData) => {
        try {
            const response = await fetch(`${API_BASE}/ai/payment-insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentData })
            })
            const data = await response.json()
            if (data.success) return { success: true, data: data.data }
            throw new Error(data.error || 'Payment insights failed')
        } catch (error) {
            console.error('aiService.getPaymentInsights error:', error)
            return { success: false, error: error.message }
        }
    }
}
