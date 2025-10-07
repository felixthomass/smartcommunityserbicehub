# Supabase Storage Setup for Image Uploads

## Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `images`
   - **Public**: ✅ Check this box (so images can be accessed publicly)
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**: `image/*` (or specific types like `image/jpeg,image/png,image/gif`)

## Step 2: Set Up Row Level Security (RLS) Policies

After creating the bucket, you need to set up RLS policies to control access:

### Policy 1: Allow authenticated users to upload images
```sql
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);
```

### Policy 2: Allow public read access to images
```sql
CREATE POLICY "Allow public read access to images" ON storage.objects
FOR SELECT USING (bucket_id = 'images');
```

### Policy 3: Allow users to delete their own images
```sql
CREATE POLICY "Allow users to delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 3: Update Your Supabase Configuration

Make sure your `src/lib/supabase.js` file has the correct configuration:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## Step 4: Test the Setup

1. Start your MongoDB server: `node mongo-server.js`
2. Start your React app: `npm run dev`
3. Go to the Admin Dashboard
4. Try creating an announcement with an image upload
5. Check the Supabase Storage dashboard to see if the image was uploaded

## Troubleshooting

### Common Issues:

1. **"Bucket not found" error**: Make sure the bucket name is exactly `images`
2. **"Permission denied" error**: Check that RLS policies are set up correctly
3. **"File too large" error**: Check the file size limit in bucket settings
4. **CORS errors**: Make sure your Supabase project allows requests from your domain

### Fallback to Local Storage:

If Supabase Storage fails, the system will automatically fall back to local file storage using the MongoDB server. Images will be stored in the `uploads/` directory and served from `http://localhost:3002/uploads/`.

## File Structure

```
announcements/
├── image1.jpg
├── image2.png
└── ...

visitors/
├── document1.pdf
├── document2.jpg
└── ...
```

## Security Notes

- Images are stored in a public bucket for easy access
- Only authenticated users can upload images
- File size is limited to 5MB
- Only image files are accepted
- Each file gets a unique name to prevent conflicts
