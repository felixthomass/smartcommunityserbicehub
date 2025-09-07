# Complete Supabase Authentication & Authorization Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `community-service`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
5. Click "Create new project"

## Step 2: Get Project Credentials

1. Go to Settings → API in your Supabase dashboard
2. Copy the following values:
   - Project URL
   - Anon public key

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in your project root
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Set Up Enhanced Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table with enhanced fields
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  phone TEXT,
  flat_number TEXT,
  building TEXT,
  role TEXT DEFAULT 'resident' CHECK (role IN ('resident', 'admin', 'staff', 'security')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maintenance_requests table
CREATE TABLE maintenance_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('plumbing', 'electrical', 'cleaning', 'security', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  location TEXT,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create visitor_passes table
CREATE TABLE visitor_passes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  visitor_email TEXT,
  purpose TEXT,
  qr_code TEXT UNIQUE,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create complaints table
CREATE TABLE complaints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('noise', 'maintenance', 'security', 'parking', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create announcements table
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT true,
  target_roles TEXT[] DEFAULT ARRAY['resident', 'admin', 'staff', 'security'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Maintenance requests policies
CREATE POLICY "Residents can view their own requests" ON maintenance_requests
  FOR SELECT USING (auth.uid() = resident_id);

CREATE POLICY "Residents can create requests" ON maintenance_requests
  FOR INSERT WITH CHECK (auth.uid() = resident_id);

CREATE POLICY "Residents can update their own requests" ON maintenance_requests
  FOR UPDATE USING (auth.uid() = resident_id);

CREATE POLICY "Staff can view assigned requests" ON maintenance_requests
  FOR SELECT USING (
    auth.uid() = assigned_staff_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff can update assigned requests" ON maintenance_requests
  FOR UPDATE USING (
    auth.uid() = assigned_staff_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Visitor passes policies
CREATE POLICY "Residents can manage their visitor passes" ON visitor_passes
  FOR ALL USING (auth.uid() = resident_id);

CREATE POLICY "Security can view all visitor passes" ON visitor_passes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('security', 'admin')
    )
  );

CREATE POLICY "Security can update visitor passes" ON visitor_passes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('security', 'admin')
    )
  );

-- Complaints policies
CREATE POLICY "Residents can manage their complaints" ON complaints
  FOR ALL USING (auth.uid() = resident_id);

CREATE POLICY "Admins can view all complaints" ON complaints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all complaints" ON complaints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Announcements policies
CREATE POLICY "Everyone can view active announcements" ON announcements
  FOR SELECT USING (
    is_active = true AND (
      target_roles IS NULL OR 
      target_roles @> ARRAY[
        (SELECT role FROM profiles WHERE id = auth.uid())
      ]
    )
  );

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'resident'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_maintenance_requests_resident_id ON maintenance_requests(resident_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_visitor_passes_resident_id ON visitor_passes(resident_id);
CREATE INDEX idx_visitor_passes_qr_code ON visitor_passes(qr_code);
CREATE INDEX idx_complaints_resident_id ON complaints(resident_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
```

## Step 5: Configure Google OAuth

### 5.1 Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen:
   - User Type: External
   - App name: Your Community Service App
   - User support email: Your email
   - Developer contact information: Your email
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Community Service Web Client
   - Authorized JavaScript origins: `http://localhost:5173` (for development)
   - Authorized redirect URIs: `http://localhost:5173/auth/callback`

### 5.2 Configure Supabase Google Provider

1. In your Supabase dashboard, go to Authentication → Providers
2. Find Google and click "Enable"
3. Enter your Google OAuth credentials:
   - Client ID: (from Google Cloud Console)
   - Client Secret: (from Google Cloud Console)
4. Set Redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`
5. Save the configuration

### 5.3 Update Google OAuth Redirect URI

1. Go back to Google Cloud Console
2. Add this redirect URI to your OAuth 2.0 Client:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

## Step 6: Configure Authentication Settings

### 6.1 Email Templates

1. Go to Authentication → Email Templates in Supabase
2. Customize the following templates:
   - Confirm signup
   - Magic Link
   - Change email address
   - Reset password

### 6.2 Site URL Configuration

1. Go to Authentication → Settings
2. Set Site URL to: `http://localhost:5173` (for development)
3. Add redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/login`

## Step 7: Test the Complete Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the following features:
   - User registration with email/password
   - Google OAuth sign-in
   - Role-based access control
   - User profile management
   - Admin user management
   - Protected routes

3. Check your Supabase dashboard:
   - Authentication → Users (should show registered users)
   - Table Editor → profiles (should show user profiles)
   - Real-time logs (should show authentication events)

## Step 8: Security Best Practices

### 8.1 Environment Variables
- Never commit `.env.local` to version control
- Use different keys for development and production
- Regularly rotate your API keys

### 8.2 Database Security
- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Admins have appropriate access levels
- Regular backups are automatically created

### 8.3 Authentication Security
- Password requirements are enforced
- Email verification is enabled
- Session management is handled securely
- OAuth providers are properly configured

## Troubleshooting

### Common Issues:

1. **CORS Error**: Add your domain to Supabase allowed origins
2. **Google OAuth Error**: Verify redirect URIs match exactly
3. **Database Error**: Check if all tables and policies are created correctly
4. **RLS Policy Error**: Ensure policies are properly configured for your use case

### Environment Variables Not Working:
1. Make sure `.env.local` is in the project root
2. Restart your development server after adding environment variables
3. Check that variable names start with `VITE_`

### Google Sign-in Not Working:
1. Verify Google OAuth is enabled in Supabase
2. Check that redirect URIs are correct in both Google Console and Supabase
3. Ensure your domain is added to Google OAuth authorized origins

## Production Deployment

When deploying to production:

1. Update Google OAuth redirect URIs to include your production domain
2. Update Supabase allowed origins to include your production domain
3. Use production environment variables
4. Consider setting up custom domains for Supabase
5. Enable additional security features like:
   - Two-factor authentication
   - IP allowlisting
   - Advanced threat protection

## Monitoring and Analytics

1. Set up Supabase Analytics to monitor:
   - User authentication events
   - Database performance
   - API usage
   - Error rates

2. Configure alerts for:
   - Failed authentication attempts
   - High error rates
   - Unusual traffic patterns 