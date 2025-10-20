// MongoDB service for visitor logs
import { storageService } from './storageService'

const MONGO_API_URL = (import.meta?.env?.VITE_MONGO_API_URL && import.meta.env.VITE_MONGO_API_URL.trim()) || 'http://localhost:3002' // MongoDB API server

export const mongoService = {
  /**
   * Test MongoDB connection
   */
  testConnection: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/health`)
      if (response.ok) {
        const result = await response.json()
        console.log('✅ MongoDB connection test successful:', result)
        return { success: true, data: result }
      } else {
        throw new Error(`Health check failed: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ MongoDB connection test failed:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Service Requests - Create
   */
  createServiceRequest: async (requestData) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Failed to create service request: ${response.status} ${text}`)
      }
      const result = await response.json()
      return { success: true, data: result.data || result }
    } catch (error) {
      console.error('❌ Error creating service request:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Service Requests - List (with optional filters)
   */
  listServiceRequests: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v)
      })
      const qs = params.toString()
      const url = `${MONGO_API_URL}/api/service-requests${qs ? `?${qs}` : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch service requests: ${response.status} ${response.statusText}`)
      }
      const result = await response.json()
      const data = result.data || result.requests || []
      return { success: true, data }
    } catch (error) {
      console.error('❌ Error listing service requests:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Service Requests - Update (generic)
   */
  updateServiceRequest: async (id, updateData) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/service-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Failed to update service request: ${response.status} ${text}`)
      }
      const result = await response.json()
      return { success: true, data: result.data || result }
    } catch (error) {
      console.error('❌ Error updating service request:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Service Requests - Update status convenience
   */
  setServiceRequestStatus: async (id, status) => {
    return mongoService.updateServiceRequest(id, { status })
  },

  // Admin: list resident entries created via Admin panel (building/flat-based)
  getAdminResidentEntries: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/admin/resident-entries`)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch resident entries: ${response.status} ${errorText}`)
      }
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error fetching admin resident entries:', error)
      return { success: false, error: error.message }
    }
  },

  // Admin: update a resident entry created via Admin panel
  updateAdminResidentEntry: async (id, updateData) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/admin/resident-entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update resident entry: ${response.status} ${errorText}`)
      }
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error updating admin resident entry:', error)
      return { success: false, error: error.message }
    }
  },

  // Admin: delete a resident entry created via Admin panel
  deleteAdminResidentEntry: async (id) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/admin/resident-entries/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete resident entry: ${response.status} ${errorText}`)
      }
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error deleting admin resident entry:', error)
      return { success: false, error: error.message }
    }
  },

  // Admin: set restriction flag on resident entry
  setAdminResidentEntryRestriction: async (id, isRestricted) => {
    return mongoService.updateAdminResidentEntry(id, { isRestricted })
  },

  // Danger: delete all admin-managed ResidentEntry docs
  deleteAllResidentEntries: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/residents`, { method: 'DELETE' })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete resident entries: ${response.status} ${errorText}`)
      }
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error deleting resident entries:', error)
      return { success: false, error: error.message }
    }
  },

  // Danger: delete all self-registered Resident profiles
  deleteAllResidentProfiles: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/resident-profiles`, { method: 'DELETE' })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete resident profiles: ${response.status} ${errorText}`)
      }
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error deleting resident profiles:', error)
      return { success: false, error: error.message }
    }
  },

  // One-shot purge: profiles + admin entries
  purgeResidents: async () => {
    const out = { profiles: null, entries: null }
    out.profiles = await mongoService.deleteAllResidentProfiles()
    out.entries = await mongoService.deleteAllResidentEntries()
    return out
  },

  /**
   * Delete all resident users (admin action)
   */
  deleteAllResidents: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/residents`, { method: 'DELETE' })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Failed to delete residents: ${response.status} ${text}`)
      }
      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error deleting all residents:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Create a new visitor log entry
   */
  createVisitorLog: async (visitorData) => {
    try {
      console.log('📤 Creating visitor with data:', JSON.stringify(visitorData, null, 2))

      const response = await fetch(`${MONGO_API_URL}/api/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitorData)
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create visitor log: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('📥 MongoDB API response:', JSON.stringify(result, null, 2))
      console.log('📥 Extracted data:', JSON.stringify(result.data, null, 2))

      if (!result.data || !result.data._id) {
        console.error('❌ Invalid response structure:', result)
        throw new Error('Invalid response: missing visitor data or ID')
      }

      return { success: true, data: result.data } // Extract the actual visitor data
    } catch (error) {
      console.error('❌ Error creating visitor log:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get all visitor logs with filtering
   */
  getVisitorLogs: async (filters = {}) => {
    try {
      // Check if MongoDB server is running
      const healthCheck = await fetch(`${MONGO_API_URL}/api/health`).catch(() => null)
      if (!healthCheck || !healthCheck.ok) {
        throw new Error('MongoDB server is not running. Please start the server with: node mongo-server.js')
      }

      const queryParams = new URLSearchParams()

      if (filters.date) queryParams.append('date', filters.date)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.limit) queryParams.append('limit', filters.limit)
      if (filters.page) queryParams.append('page', filters.page)

      const response = await fetch(`${MONGO_API_URL}/api/visitors?${queryParams}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch visitor logs: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      console.error('Error fetching visitor logs:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Update visitor log (check-out, etc.)
   */
  updateVisitorLog: async (id, updateData) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/visitors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Failed to update visitor log')
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      console.error('Error updating visitor log:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Upload visitor document/photo (simplified version)
   */
  uploadDocument: async (file, visitorId, documentType = 'id_proof') => {
    try {
      // Validate file first
      const validation = storageService.validateFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      console.log('📤 Uploading document for visitor:', visitorId)

      // Try Supabase Storage first
      const uploadResult = await storageService.uploadDocument(file, visitorId, documentType)

      if (uploadResult.success) {
        console.log('✅ Supabase upload successful:', uploadResult.data.publicUrl)

        // Update visitor log in MongoDB with document URL
        const updateResult = await mongoService.updateVisitorLog(visitorId, {
          documentPhoto: uploadResult.data.publicUrl,
          documentPath: uploadResult.data.path
        })

        if (updateResult.success) {
          console.log('✅ Visitor log updated with document URL')
          return {
            success: true,
            data: {
              ...uploadResult.data,
              visitorUpdated: true,
              storage: 'supabase'
            }
          }
        } else {
          console.warn('⚠️ Document uploaded but failed to update visitor log:', updateResult.error)
          return {
            success: true,
            data: {
              ...uploadResult.data,
              visitorUpdated: false,
              storage: 'supabase',
              warning: 'Document uploaded but visitor log not updated'
            }
          }
        }
      } else {
        throw new Error(uploadResult.error || 'Supabase upload failed')
      }

    } catch (error) {
      console.error('❌ Upload failed:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Upload multiple documents for a visitor
   */
  uploadMultipleDocuments: async (files, visitorId) => {
    try {
      const results = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const documentType = `document_${i + 1}`

        const result = await this.uploadDocument(file, visitorId, documentType)
        results.push(result)
      }

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      return {
        success: failed.length === 0,
        data: {
          successful: successful.map(r => r.data),
          failed: failed.map(r => r.error),
          totalUploaded: successful.length,
          totalFailed: failed.length
        }
      }
    } catch (error) {
      console.error('Error uploading multiple documents:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Delete visitor log and associated documents
   */
  deleteVisitorLog: async (id) => {
    try {
      console.log('🗑️ Deleting visitor log:', id)

      // Check if MongoDB server is running
      const healthCheck = await fetch(`${MONGO_API_URL}/api/health`).catch(() => null)
      if (!healthCheck || !healthCheck.ok) {
        throw new Error('MongoDB server is not running. Please start the server with: node mongo-server.js')
      }

      // First, try to get the visitor log to find associated documents
      try {
        const getResponse = await fetch(`${MONGO_API_URL}/api/visitors/${id}`)
        if (getResponse.ok) {
          const visitorLog = await getResponse.json()

          // Delete associated documents from storage
          if (visitorLog.data && visitorLog.data.documentPath) {
            console.log('🗑️ Deleting associated document:', visitorLog.data.documentPath)

            // Try to delete from Supabase Storage first
            try {
              await storageService.deleteDocument(visitorLog.data.documentPath)
              console.log('✅ Document deleted from Supabase Storage')
            } catch (storageError) {
              console.warn('⚠️ Failed to delete from Supabase Storage:', storageError.message)
            }
          }
        }
      } catch (getError) {
        console.warn('⚠️ Could not retrieve visitor log for document cleanup:', getError.message)
      }

      // Delete the visitor log from MongoDB
      const response = await fetch(`${MONGO_API_URL}/api/visitors/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete visitor log: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Visitor log deleted successfully')

      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error deleting visitor log:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get visitor statistics
   */
  getVisitorStats: async (period = 'today') => {
    try {
      // Check if MongoDB server is running
      const healthCheck = await fetch(`${MONGO_API_URL}/api/health`).catch(() => null)
      if (!healthCheck || !healthCheck.ok) {
        console.warn('MongoDB server is not running')
        return { success: true, data: { totalVisitors: 0, checkedIn: 0, checkedOut: 0 } }
      }

      const response = await fetch(`${MONGO_API_URL}/api/visitors/stats?period=${period}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch visitor stats: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return { success: true, data: result.data || { totalVisitors: 0, checkedIn: 0, checkedOut: 0 } }
    } catch (error) {
      console.error('Error fetching visitor stats:', error)
      return { success: true, data: { totalVisitors: 0, checkedIn: 0, checkedOut: 0 } }
    }
  }
}
