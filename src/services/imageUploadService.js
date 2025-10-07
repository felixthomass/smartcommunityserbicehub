import { supabase } from '../lib/supabase'

class ImageUploadService {
  /**
   * Upload an image file to Supabase Storage
   * @param {File} file - The image file to upload
   * @param {string} folder - The folder to upload to (e.g., 'announcements', 'visitors')
   * @returns {Promise<Object>} Result object with success status and image data
   */
  async uploadImage(file, folder = 'announcements') {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Please select a valid image file' }
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return { success: false, error: 'Image size must be less than 5MB' }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading image:', error)
        return { success: false, error: error.message }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return {
        success: true,
        data: {
          fileName: fileName,
          filePath: filePath,
          publicUrl: urlData.publicUrl,
          size: file.size,
          type: file.type
        }
      }
    } catch (error) {
      console.error('Error in uploadImage:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete an image from Supabase Storage
   * @param {string} filePath - The file path to delete
   * @returns {Promise<Object>} Result object with success status
   */
  async deleteImage(filePath) {
    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath])

      if (error) {
        console.error('Error deleting image:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteImage:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Upload image using local MongoDB server as fallback
   * @param {File} file - The image file to upload
   * @param {string} type - The type of upload (announcements, visitors)
   * @returns {Promise<Object>} Result object with success status and image data
   */
  async uploadImageLocal(file, type = 'announcements') {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Please select a valid image file' }
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return { success: false, error: 'Image size must be less than 5MB' }
      }

      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`http://localhost:3002/api/${type}/upload-image`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error uploading image locally:', result)
        return { success: false, error: result.error || 'Failed to upload image' }
      }

      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error in uploadImageLocal:', error)
      return { success: false, error: error.message }
    }
  }
}

export const imageUploadService = new ImageUploadService()
