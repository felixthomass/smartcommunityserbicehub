import { useState } from 'react'
import { supabase } from '../lib/supabase'

const StorageTest = () => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [message, setMessage] = useState('')

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setMessage('')
    }
  }

  const testUpload = async () => {
    if (!file) {
      setMessage('Please select a file first')
      return
    }

    setUploading(true)
    setMessage('Uploading...')

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `test_${Date.now()}.${fileExt}`
      const filePath = `test/${fileName}`

      console.log('Uploading to:', filePath)

      // Upload file
      const { data, error } = await supabase.storage
        .from('visitor-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        setMessage(`Upload failed: ${error.message}`)
        return
      }

      console.log('Upload successful:', data)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('visitor-documents')
        .getPublicUrl(filePath)

      console.log('Public URL:', urlData.publicUrl)
      setUploadedUrl(urlData.publicUrl)
      setMessage('Upload successful! ✅')

    } catch (error) {
      console.error('Error:', error)
      setMessage(`Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const testDelete = async () => {
    if (!uploadedUrl) {
      setMessage('No file to delete')
      return
    }

    try {
      // Extract path from URL
      const urlParts = uploadedUrl.split('/')
      const filePath = `test/${urlParts[urlParts.length - 1]}`

      const { error } = await supabase.storage
        .from('visitor-documents')
        .remove([filePath])

      if (error) {
        setMessage(`Delete failed: ${error.message}`)
      } else {
        setMessage('File deleted successfully! 🗑️')
        setUploadedUrl('')
      }
    } catch (error) {
      setMessage(`Delete error: ${error.message}`)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Supabase Storage Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select a file to test upload:
          </label>
          <input
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={testUpload}
            disabled={!file || uploading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Test Upload'}
          </button>
          
          {uploadedUrl && (
            <button
              onClick={testDelete}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete
            </button>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded ${
            message.includes('successful') || message.includes('✅') 
              ? 'bg-green-100 text-green-800' 
              : message.includes('failed') || message.includes('Error')
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        {uploadedUrl && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Uploaded file:</p>
            <div className="border rounded p-2">
              <a 
                href={uploadedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm break-all"
              >
                {uploadedUrl}
              </a>
            </div>
            
            {file && file.type.startsWith('image/') && (
              <div className="mt-2">
                <img 
                  src={uploadedUrl} 
                  alt="Uploaded file" 
                  className="max-w-full h-32 object-cover rounded"
                />
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Bucket:</strong> visitor-documents</p>
          <p><strong>Project:</strong> fgzsrgoxgoserdmbctvl</p>
        </div>
      </div>
    </div>
  )
}

export default StorageTest
