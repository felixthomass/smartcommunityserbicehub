# Chat File Storage Setup Guide

This guide explains how to set up file storage for the chat system, including images, videos, and PDFs.

## 🎯 Overview

The chat system supports uploading and sharing:
- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, QuickTime
- **Documents**: PDF, Word documents, text files
- **File size limit**: 10MB per file

## 📁 Current Implementation

### Local File Storage (Default)
Files are currently stored locally on the server in the `uploads/chat/` directory.

### File Upload Process
1. User selects a file in the chat interface
2. File is validated (type and size)
3. File is uploaded to `/api/chat/upload` endpoint
4. File is stored locally with a unique filename
5. File URL is returned and stored in the message

## 🚀 Setting Up Supabase Storage (Recommended)

### Step 1: Create Supabase Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `chat-files`
   - **Public**: ✅ (so files can be accessed via URLs)
   - **File size limit**: 10MB
   - **Allowed MIME types**: 
     ```
     image/jpeg,image/png,image/gif,image/webp,
     video/mp4,video/webm,video/quicktime,
     application/pdf,
     application/msword,
     application/vnd.openxmlformats-officedocument.wordprocessingml.document,
     text/plain
     ```

### Step 2: Set Up RLS Policies

Create these policies for the `chat-files` bucket:

#### Policy 1: Allow authenticated users to upload files
```sql
CREATE POLICY "Allow authenticated users to upload chat files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-files' 
  AND auth.role() = 'authenticated'
);
```

#### Policy 2: Allow authenticated users to view files
```sql
CREATE POLICY "Allow authenticated users to view chat files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-files' 
  AND auth.role() = 'authenticated'
);
```

#### Policy 3: Allow authenticated users to delete their own files
```sql
CREATE POLICY "Allow authenticated users to delete their chat files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-files' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 3: Update Environment Variables

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Modify the Chat File Service

Update `src/services/chatFileService.js` to use Supabase Storage:

```javascript
import { supabase } from '../lib/supabase'

export const chatFileService = {
  async uploadChatFile(file) {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `chat-files/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-files')
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
        .from('chat-files')
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
      console.error('Error in uploadChatFile (Supabase):', error)
      return { success: false, error: error.message }
    }
  },
  
  // ... rest of the methods remain the same
}
```

## 🔧 Alternative: Cloud Storage Options

### AWS S3
- Create an S3 bucket for chat files
- Set up CORS configuration
- Update the upload service to use AWS SDK

### Google Cloud Storage
- Create a GCS bucket
- Set up authentication
- Update the upload service to use Google Cloud client library

### Azure Blob Storage
- Create an Azure storage account
- Set up a container for chat files
- Update the upload service to use Azure SDK

## 📋 File Management Features

### Current Features
- ✅ File type validation
- ✅ File size limits (10MB)
- ✅ File preview in chat
- ✅ Click to open/download files
- ✅ File icons based on type
- ✅ File size display

### Future Enhancements
- 🔄 File compression for images
- 🔄 Thumbnail generation for videos
- 🔄 File expiration/cleanup
- 🔄 File sharing permissions
- 🔄 File search functionality

## 🛠️ Troubleshooting

### Common Issues

#### 1. File Upload Fails
- Check file size (must be < 10MB)
- Verify file type is supported
- Check server storage permissions
- Verify network connection

#### 2. Files Not Displaying
- Check file URLs are accessible
- Verify CORS settings for Supabase
- Check browser console for errors
- Verify file paths are correct

#### 3. Permission Errors
- Verify RLS policies are set correctly
- Check user authentication status
- Verify bucket permissions
- Check file ownership

### Debug Mode
Enable debug logging by adding this to your environment:

```env
VITE_DEBUG_CHAT_FILES=true
```

## 📊 Storage Usage Monitoring

### Local Storage
Monitor disk usage in the `uploads/chat/` directory:

```bash
du -sh uploads/chat/
```

### Supabase Storage
Monitor usage in the Supabase dashboard under **Storage** > **Usage**.

## 🔒 Security Considerations

1. **File Validation**: Always validate file types and sizes
2. **Access Control**: Use RLS policies to control file access
3. **Virus Scanning**: Consider adding virus scanning for uploaded files
4. **Content Filtering**: Implement content filtering for inappropriate files
5. **Rate Limiting**: Add rate limiting to prevent abuse

## 📱 Mobile Considerations

- Ensure file upload works on mobile devices
- Test with various file sizes and types
- Consider mobile data usage for large files
- Implement progress indicators for uploads

## 🎨 UI/UX Improvements

- Add drag-and-drop file upload
- Show upload progress bars
- Add file preview thumbnails
- Implement file sharing indicators
- Add file download counters

---

## 🚀 Quick Start

1. **Local Setup** (Default):
   - Files are automatically stored in `uploads/chat/`
   - No additional setup required

2. **Supabase Setup**:
   - Create bucket and policies as shown above
   - Update environment variables
   - Modify `chatFileService.js` to use Supabase

3. **Test the Setup**:
   - Try uploading different file types
   - Verify files are accessible
   - Test file sharing in chat

The chat file upload system is now ready to use! 🎉
