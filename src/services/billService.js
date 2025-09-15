// Bill Management Service
class BillService {
  constructor() {
    this.baseUrl = 'http://localhost:3002/api'
  }

  // Admin Functions - Bill Management
  
  /**
   * Create a new bill
   * @param {Object} billData - Bill information
   * @param {string} billData.title - Bill title (e.g., "December 2024 Electricity")
   * @param {string} billData.description - Bill description
   * @param {string} billData.category - Bill category (electricity, water, maintenance, gas, internet, etc.)
   * @param {number} billData.totalAmount - Total bill amount
   * @param {string} billData.dueDate - Due date (ISO string)
   * @param {string} billData.splitType - How to split: 'equal', 'custom', 'size_based'
   * @param {Array} billData.assignments - Array of resident assignments
   * @param {string} billData.createdBy - Admin user ID
   * @param {Array} billData.attachments - Array of attachment URLs
   * @returns {Promise<Object>} Created bill
   */
  async createBill(billData) {
    try {
      console.log('🔄 Creating bill:', billData)
      
      const response = await fetch(`${this.baseUrl}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...billData,
          createdAt: new Date().toISOString(),
          status: 'active'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Bill created:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error creating bill:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all bills (admin view)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Bills list
   */
  async getAllBills(filters = {}) {
    try {
      const params = new URLSearchParams()
      
      if (filters.category) params.append('category', filters.category)
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      
      const url = `${this.baseUrl}/bills${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Bills loaded:', (result.data?.bills || []).length, 'bills')
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error loading bills:', error)
      return { success: false, error: error.message, data: { bills: [] } }
    }
  }

  /**
   * Update a bill
   * @param {string} billId - Bill ID
   * @param {Object} updateData - Updated bill data
   * @returns {Promise<Object>} Updated bill
   */
  async updateBill(billId, updateData) {
    try {
      const response = await fetch(`${this.baseUrl}/bills/id/${billId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Bill updated:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error updating bill:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a bill
   * @param {string} billId - Bill ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBill(billId) {
    try {
      const response = await fetch(`${this.baseUrl}/bills/id/${billId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Bill deleted:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error deleting bill:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get bill statistics for admin dashboard
   * @returns {Promise<Object>} Bill statistics
   */
  async getBillStats() {
    try {
      const response = await fetch(`${this.baseUrl}/bills/stats`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error loading bill stats:', error)
      return { 
        success: false, 
        error: error.message,
        data: {
          totalBills: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueCount: 0
        }
      }
    }
  }

  // Resident Functions - Bill Viewing & Payment

  /**
   * Get bills for a specific resident
   * @param {string} residentId - Resident auth user ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Resident's bills
   */
  async getResidentBills(residentId, filters = {}) {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      // category/date filters not supported on this endpoint server-side currently
      const url = `${this.baseUrl}/bills/resident/${residentId}${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Resident bills loaded:', (result.data?.bills || []).length, 'bills')
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error loading resident bills:', error)
      return { success: false, error: error.message, data: { bills: [] } }
    }
  }

  // Server does not expose a separate details endpoint; use /bills/:id if needed
  async getBillById(billId) {
    try {
      const response = await fetch(`${this.baseUrl}/bills/id/${billId}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error loading bill by id:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Process payment for a bill
   * @param {Object} paymentData - Payment information
   * @param {string} paymentData.billId - Bill ID
   * @param {string} paymentData.residentId - Resident auth user ID
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.paymentMethod - Payment method (card, upi, netbanking, cash)
   * @param {Object} paymentData.paymentDetails - Payment gateway response
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentData) {
    try {
      console.log('🔄 Processing payment:', paymentData)
      
      // Mock payment gateway integration
      const mockPaymentResponse = await this.mockPaymentGateway(paymentData)
      
      if (!mockPaymentResponse.success) {
        throw new Error('Payment failed: ' + mockPaymentResponse.error)
      }

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...paymentData,
          transactionId: mockPaymentResponse.transactionId,
          paymentStatus: 'completed',
          paidAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Payment processed:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error processing payment:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get payment history for a resident
   * @param {string} residentId - Resident auth user ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Payment history
   */
  async getPaymentHistory(residentId, filters = {}) {
    try {
      const params = new URLSearchParams()
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      const url = `${this.baseUrl}/payments/resident/${residentId}${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error loading payment history:', error)
      return { success: false, error: error.message, data: { payments: [] } }
    }
  }

  /**
   * Get resident bill summary/dashboard data
   * @param {string} residentId - Resident auth user ID
   * @returns {Promise<Object>} Bill summary
   */
  async getResidentBillSummary(residentId) {
    try {
      const response = await fetch(`${this.baseUrl}/bills/resident/${residentId}/summary`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error loading resident bill summary:', error)
      return { 
        success: false, 
        error: error.message,
        data: {
          totalPending: 0,
          totalOverdue: 0,
          totalPaid: 0,
          recentBills: [],
          recentPayments: []
        }
      }
    }
  }

  // Utility Functions

  /**
   * Mock payment gateway for demonstration
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Mock payment response
   */
  async mockPaymentGateway(paymentData) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock 95% success rate
    const success = Math.random() > 0.05
    
    if (success) {
      return {
        success: true,
        transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase(),
        status: 'completed',
        amount: paymentData.amount,
        fees: Math.round(paymentData.amount * 0.02) // 2% processing fee
      }
    } else {
      return {
        success: false,
        error: 'Payment declined by bank'
      }
    }
  }

  /**
   * Upload bill attachment
   * @param {File} file - File to upload
   * @param {string} billId - Bill ID
   * @returns {Promise<Object>} Upload result
   */
  async uploadBillAttachment(file, billId) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('billId', billId)
      formData.append('uploadType', 'bill_attachment')

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Bill attachment uploaded:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error uploading bill attachment:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calculate bill split based on type and parameters
   * @param {Object} splitConfig - Split configuration
   * @param {string} splitConfig.type - Split type (equal, custom, size_based)
   * @param {number} splitConfig.totalAmount - Total amount to split
   * @param {Array} splitConfig.residents - Array of residents
   * @param {Object} splitConfig.customSplits - Custom split ratios (for custom type)
   * @param {Object} splitConfig.apartmentSizes - Apartment sizes (for size_based type)
   * @returns {Array} Array of resident assignments with amounts
   */
  calculateBillSplit(splitConfig) {
    const { type, totalAmount, residents, customSplits, apartmentSizes } = splitConfig
    
    switch (type) {
      case 'equal':
        const equalAmount = Math.round((totalAmount / residents.length) * 100) / 100
        return residents.map(resident => ({
          residentId: resident.authUserId,
          residentName: resident.name,
          residentEmail: resident.email,
          flatNumber: resident.flatNumber,
          building: resident.building,
          amount: equalAmount,
          status: 'pending'
        }))
      
      case 'custom':
        return residents.map(resident => ({
          residentId: resident.authUserId,
          residentName: resident.name,
          residentEmail: resident.email,
          flatNumber: resident.flatNumber,
          building: resident.building,
          amount: customSplits[resident.authUserId] || 0,
          status: 'pending'
        }))
      
      case 'size_based':
        const totalSize = residents.reduce((sum, r) => sum + (apartmentSizes[r.authUserId] || 1), 0)
        return residents.map(resident => {
          const size = apartmentSizes[resident.authUserId] || 1
          const amount = Math.round((totalAmount * size / totalSize) * 100) / 100
          return {
            residentId: resident.authUserId,
            residentName: resident.name,
            residentEmail: resident.email,
            flatNumber: resident.flatNumber,
            building: resident.building,
            amount,
            status: 'pending'
          }
        })
      
      default:
        throw new Error('Invalid split type')
    }
  }

  /**
   * Test connection to bill service
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      
      if (response.ok) {
        return { success: true, message: 'Bill service connection successful' }
      } else {
        return { success: false, error: 'Bill service unavailable' }
      }
    } catch (error) {
      return { success: false, error: 'Failed to connect to bill service: ' + error.message }
    }
  }
}

// Create and export singleton instance
export const billService = new BillService()
