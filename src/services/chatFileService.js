import { supabase } from '../lib/supabase'

const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

export const chatFileService = {
  /**
   * Upload a file for chat - tries Supabase first, falls back to local storage
   * @param {File} file - The file to upload
   * @returns {Promise<Object>} Result object with success status and file data
   */
  async uploadChatFile(file) {
    // Try Supabase Storage first
    try {
      const supabaseResult = await this.uploadToSupabase(file)
      if (supabaseResult.success) {
        return supabaseResult
      }
      console.log('Supabase upload failed, trying local fallback:', supabaseResult.error)
    } catch (error) {
      console.log('Supabase upload error, trying local fallback:', error.message)
    }

    // Fallback to local storage
    return await this.uploadToLocal(file)
  },

  /**
   * Upload to Supabase Storage
   */
  async uploadToSupabase(file) {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `chat-files/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('community-service-bucket')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase upload error:', error)
        return { success: false, error: error.message }
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('community-service-bucket')
        .getPublicUrl(filePath)

      return { 
        success: true, 
        data: { 
          publicUrl: publicUrlData.publicUrl, 
          path: filePath,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          type: this.getFileType(file.type)
        } 
      }
    } catch (error) {
      console.error('Error in uploadToSupabase:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Upload to local MongoDB server (fallback)
   */
  async uploadToLocal(file) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/api/chat/upload`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Local upload error:', result)
        return { success: false, error: result.error || 'Failed to upload file' }
      }

      return { 
        success: true, 
        data: { 
          ...result.data,
          type: this.getFileType(file.type)
        } 
      }
    } catch (error) {
      console.error('Error in uploadToLocal:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get file type from MIME type
   * @param {string} mimeType - The MIME type of the file
   * @returns {string} The file type category
   */
  getFileType(mimeType) {
    const typeMap = {
      'image/jpeg': 'image',
      'image/png': 'image',
      'image/gif': 'image',
      'image/webp': 'image',
      'video/mp4': 'video',
      'video/webm': 'video',
      'video/quicktime': 'video',
      'application/pdf': 'pdf',
      'application/msword': 'document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
      'text/plain': 'document'
    }
    return typeMap[mimeType] || 'document'
  },

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Check if file type is supported
   * @param {string} mimeType - The MIME type of the file
   * @returns {boolean} Whether the file type is supported
   */
  isSupportedFileType(mimeType) {
    const supportedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    return supportedTypes.includes(mimeType)
  },

  /**
   * Get file icon based on file type
   * @param {string} fileType - The file type (image, video, pdf, document)
   * @returns {string} Icon name or emoji
   */
  getFileIcon(fileType) {
    const icons = {
      image: '🖼️',
      video: '🎥',
      pdf: '📄',
      document: '📝'
    }
    return icons[fileType] || '📄'
  }
}
