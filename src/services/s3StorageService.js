// S3-compatible storage service for Supabase Storage
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const BUCKET_NAME = 'visitor-documents'
const SUPABASE_PROJECT_ID = 'fgzsrgoxgoserdmbctvl'
const SUPABASE_S3_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/s3`
const SUPABASE_REGION = 'ap-south-1'

// You'll need to get these from Supabase Dashboard -> Settings -> API
// For now, we'll use the anon key as access key (this might not work for S3)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnenNyZ294Z29zZXJkbWJjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODI3NDEsImV4cCI6MjA2OTg1ODc0MX0.PlAisOeMbUr4x9xVkUUMbJBqO-53rFMv51GxTiq8QE0'

// Create S3 client
const s3Client = new S3Client({
  endpoint: SUPABASE_S3_ENDPOINT,
  region: SUPABASE_REGION,
  credentials: {
    accessKeyId: SUPABASE_ANON_KEY,
    secretAccessKey: SUPABASE_ANON_KEY, // This might need to be different
  },
  forcePathStyle: true, // Required for Supabase
})

export const s3StorageService = {
  /**
   * Upload document using S3 protocol
   */
  uploadDocument: async (file, visitorId, documentType = 'id_proof') => {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${visitorId}_${documentType}_${Date.now()}.${fileExt}`
      const filePath = `visitors/${fileName}`

      console.log('📤 Uploading via S3 protocol:', fileName)

      // Convert file to buffer
      const buffer = await file.arrayBuffer()

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: new Uint8Array(buffer),
        ContentType: file.type,
        CacheControl: 'max-age=3600',
      })

      const result = await s3Client.send(command)
      
      // Generate public URL
      const publicUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${filePath}`

      console.log('✅ S3 upload successful:', fileName)

      return {
        success: true,
        data: {
          path: filePath,
          publicUrl: publicUrl,
          fileName: fileName,
          size: file.size,
          type: file.type,
          etag: result.ETag
        }
      }
    } catch (error) {
      console.error('❌ S3 upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Delete document using S3 protocol
   */
  deleteDocument: async (filePath) => {
    try {
      console.log('🗑️ Deleting via S3 protocol:', filePath)

      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
      })

      await s3Client.send(command)

      console.log('✅ S3 delete successful')
      return { success: true }
    } catch (error) {
      console.error('❌ S3 delete error:', error)
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
    return `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${filePath}`
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
