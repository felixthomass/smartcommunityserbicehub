// MongoDB service for visitor logs
import { storageService } from './storageService'

const MONGO_API_URL = 'http://localhost:3002' // We'll create a separate MongoDB API server

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
