import { imageUploadService } from './imageUploadService'

const MONGO_API_URL = 'http://localhost:3002'

class AnnouncementService {
  /**
   * Upload image for announcement
   * @param {File} imageFile - The image file to upload
   * @returns {Promise<Object>} Result object with success status and image data
   */
  async uploadAnnouncementImage(imageFile) {
    try {
      // Try Supabase Storage first, fallback to local storage
      let result = await imageUploadService.uploadImage(imageFile, 'announcements')
      
      if (!result.success) {
        // Fallback to local MongoDB server
        console.log('Supabase upload failed, trying local upload:', result.error)
        result = await imageUploadService.uploadImageLocal(imageFile, 'announcements')
      }

      return result
    } catch (error) {
      console.error('Error in uploadAnnouncementImage:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Create a new announcement
   * @param {Object} announcementData - The announcement data
   * @param {string} announcementData.title - Announcement title
   * @param {string} announcementData.content - Announcement content
   * @param {string} announcementData.type - Type of announcement (announcement, event, festival, maintenance)
   * @param {string} announcementData.priority - Priority level (low, normal, high, urgent)
   * @param {string} announcementData.location - Location (optional)
   * @param {string} announcementData.date - Event date (optional)
   * @param {string} announcementData.organizer - Organizer name (optional)
   * @param {string} announcementData.image - Image URL (optional)
   * @param {Array} announcementData.targetRoles - Target roles (optional, defaults to all)
   * @param {boolean} announcementData.isActive - Whether announcement is active
   * @param {Object} user - User object with id, name, email
   * @returns {Promise<Object>} Result object with success status and data
   */
  async createAnnouncement(announcementData, userRole = 'resident', user = null) {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user is admin
      if (userRole !== 'admin') {
        return { success: false, error: 'Only admins can create announcements' }
      }

      const announcement = {
        adminId: user.id,
        adminName: user.name || user.email || 'Admin',
        adminEmail: user.email || '',
        title: announcementData.title,
        content: announcementData.content,
        type: announcementData.type || 'announcement',
        priority: announcementData.priority || 'normal',
        location: announcementData.location || '',
        eventDate: announcementData.date || null,
        organizer: announcementData.organizer || '',
        image: announcementData.image || '',
        targetRoles: announcementData.targetRoles || ['resident', 'staff', 'security'],
        isActive: announcementData.isActive !== false
      }

      const response = await fetch(`${MONGO_API_URL}/api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(announcement)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error creating announcement:', result)
        return { success: false, error: result.error || 'Failed to create announcement' }
      }

      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error in createAnnouncement:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all announcements with optional filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.type - Filter by type
   * @param {string} filters.priority - Filter by priority
   * @param {boolean} filters.isActive - Filter by active status
   * @param {Array} filters.targetRoles - Filter by target roles
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @param {string} userRole - User's role for filtering
   * @returns {Promise<Object>} Result object with success status and announcements
   */
  async getAnnouncements(filters = {}, userRole = 'resident') {
    try {
      const queryParams = new URLSearchParams()
      
      // Add filters to query params
      if (filters.type && filters.type !== 'all') {
        queryParams.append('type', filters.type)
      }
      
      if (filters.priority && filters.priority !== 'all') {
        queryParams.append('priority', filters.priority)
      }
      
      if (filters.isActive !== undefined) {
        queryParams.append('isActive', filters.isActive)
      } else {
        queryParams.append('isActive', 'true') // Default to active announcements
      }
      
      if (userRole) {
        queryParams.append('targetRole', userRole)
      }
      
      if (filters.limit) {
        queryParams.append('limit', filters.limit)
      }
      
      if (filters.page) {
        queryParams.append('page', filters.page)
      }
      
      if (filters.search) {
        queryParams.append('search', filters.search)
      }

      const response = await fetch(`${MONGO_API_URL}/api/announcements?${queryParams.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error fetching announcements:', result)
        return { success: false, error: result.error || 'Failed to fetch announcements' }
      }

      // Transform data to match expected format
      const announcements = result.data.map(announcement => ({
        _id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        location: announcement.location,
        date: announcement.eventDate,
        organizer: announcement.organizer,
        image: announcement.image,
        isRead: false, // This would need to be tracked separately
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
        adminName: announcement.adminName || 'Admin',
        isActive: announcement.isActive,
        targetRoles: announcement.targetRoles
      }))

      return { 
        success: true, 
        data: announcements,
        pagination: result.pagination
      }
    } catch (error) {
      console.error('Error in getAnnouncements:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get announcement by ID
   * @param {string} announcementId - The announcement ID
   * @returns {Promise<Object>} Result object with success status and announcement
   */
  async getAnnouncementById(announcementId) {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/announcements/${announcementId}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error fetching announcement:', result)
        return { success: false, error: result.error || 'Failed to fetch announcement' }
      }

      const announcement = {
        _id: result.data._id,
        title: result.data.title,
        content: result.data.content,
        type: result.data.type,
        priority: result.data.priority,
        location: result.data.location,
        date: result.data.eventDate,
        organizer: result.data.organizer,
        image: result.data.image,
        isActive: result.data.isActive,
        targetRoles: result.data.targetRoles,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
        adminName: result.data.adminName || 'Admin'
      }

      return { success: true, data: announcement }
    } catch (error) {
      console.error('Error in getAnnouncementById:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update an announcement (admin only)
   * @param {string} announcementId - The announcement ID
   * @param {Object} updateData - The update data
   * @param {string} userRole - User's role
   * @returns {Promise<Object>} Result object with success status and updated announcement
   */
  async updateAnnouncement(announcementId, updateData, userRole = 'resident') {
    try {
      // Check if user is admin
      if (userRole !== 'admin') {
        return { success: false, error: 'Only admins can update announcements' }
      }

      const updateFields = {}

      // Map update data to database fields
      if (updateData.title !== undefined) updateFields.title = updateData.title
      if (updateData.content !== undefined) updateFields.content = updateData.content
      if (updateData.type !== undefined) updateFields.type = updateData.type
      if (updateData.priority !== undefined) updateFields.priority = updateData.priority
      if (updateData.location !== undefined) updateFields.location = updateData.location
      if (updateData.date !== undefined) updateFields.eventDate = updateData.date
      if (updateData.organizer !== undefined) updateFields.organizer = updateData.organizer
      if (updateData.image !== undefined) updateFields.image = updateData.image
      if (updateData.targetRoles !== undefined) updateFields.targetRoles = updateData.targetRoles
      if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive

      const response = await fetch(`${MONGO_API_URL}/api/announcements/${announcementId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateFields)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error updating announcement:', result)
        return { success: false, error: result.error || 'Failed to update announcement' }
      }

      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error in updateAnnouncement:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete an announcement (admin only)
   * @param {string} announcementId - The announcement ID
   * @param {string} userRole - User's role
   * @returns {Promise<Object>} Result object with success status
   */
  async deleteAnnouncement(announcementId, userRole = 'resident') {
    try {
      // Check if user is admin
      if (userRole !== 'admin') {
        return { success: false, error: 'Only admins can delete announcements' }
      }

      const response = await fetch(`${MONGO_API_URL}/api/announcements/${announcementId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error deleting announcement:', result)
        return { success: false, error: result.error || 'Failed to delete announcement' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteAnnouncement:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get announcement statistics (admin only)
   * @param {string} userRole - User's role
   * @returns {Promise<Object>} Result object with success status and statistics
   */
  async getAnnouncementStats(userRole = 'resident') {
    try {
      // Check if user is admin
      if (userRole !== 'admin') {
        return { success: false, error: 'Only admins can view statistics' }
      }

      const response = await fetch(`${MONGO_API_URL}/api/announcements/stats`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error fetching announcement stats:', result)
        return { success: false, error: result.error || 'Failed to fetch announcement statistics' }
      }

      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error in getAnnouncementStats:', error)
      return { success: false, error: error.message }
    }
  }
}

export const announcementService = new AnnouncementService()
