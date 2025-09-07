// Supabase Storage service for visitor documents
import { supabase } from '../lib/supabase'

const BUCKET_NAME = 'visitor-documents'

export const storageService = {
  /**
   * Upload visitor document/photo to Supabase Storage
   */
  uploadDocument: async (file, visitorId, documentType = 'id_proof') => {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${visitorId}_${documentType}_${Date.now()}.${fileExt}`
      const filePath = `visitors/${fileName}`

      console.log('📤 Uploading document:', fileName)

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Allow overwrite to avoid conflicts
        })

      if (error) {
        console.error('❌ Upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      console.log('✅ Document uploaded successfully:', fileName)

      return {
        success: true,
        data: {
          path: filePath,
          publicUrl: urlData.publicUrl,
          fileName: fileName,
          size: file.size,
          type: file.type
        }
      }
    } catch (error) {
      console.error('❌ Storage upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Delete document from Supabase Storage
   */
  deleteDocument: async (filePath) => {
    try {
      console.log('🗑️ Deleting document:', filePath)

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])

      if (error) {
        console.error('❌ Delete error:', error)
        throw new Error(`Delete failed: ${error.message}`)
      }

      console.log('✅ Document deleted successfully')
      return { success: true }
    } catch (error) {
      console.error('❌ Storage delete error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Get public URL for a document
   */
  getPublicUrl: (filePath) => {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)
    
    return data.publicUrl
  },

  /**
   * List all documents for a visitor
   */
  listVisitorDocuments: async (visitorId) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`visitors`, {
          limit: 100,
          offset: 0,
          search: visitorId
        })

      if (error) {
        throw new Error(`List failed: ${error.message}`)
      }

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('❌ Storage list error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Upload multiple documents
   */
  uploadMultipleDocuments: async (files, visitorId) => {
    try {
      const uploadPromises = files.map((file, index) => 
        this.uploadDocument(file, visitorId, `document_${index + 1}`)
      )

      const results = await Promise.all(uploadPromises)
      
      const successful = results.filter(result => result.success)
      const failed = results.filter(result => !result.success)

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
      console.error('❌ Multiple upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Compress image before upload (optional)
   */
  compressImage: (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }

      img.src = URL.createObjectURL(file)
    })
  },

  /**
   * Validate file before upload
   */
  validateFile: (file, maxSizeMB = 10) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    const maxSize = maxSizeMB * 1024 * 1024 // Convert to bytes

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'
      }
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum size is ${maxSizeMB}MB.`
      }
    }

    return { valid: true }
  }
}
