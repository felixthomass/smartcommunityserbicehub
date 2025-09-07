# Simple Supabase Authentication Setup with Email Confirmation

## Quick Setup Steps

### 1. Clean Up Database (if you have existing tables)

If you have existing tables that you want to remove:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `fgzsrgoxgoserdmbctvl`
3. Go to **SQL Editor**
4. Copy and paste the contents of `DROP_TABLES.sql` file
5. Click **Run** to execute the script
6. This will remove all custom tables and use only Supabase's built-in auth

### 2. Configure Supabase Authentication Settings

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `fgzsrgoxgoserdmbctvl`
3. Go to **Authentication** → **Settings**
4. Under **User Signups**, make sure:
   - ✅ **Enable email confirmations** is **ENABLED** (keep this ON)
   - ❌ **Enable phone confirmations** is **DISABLED** (turn this OFF)
5. Set **Site URL** to: `http://localhost:5173`
6. Add **Redirect URLs**:
   - `http://localhost:5173`
   - `http://localhost:5173/login`
   - `http://localhost:5173/auth/callback`
7. Click **Save**

### 3. Test the Authentication

1. Start your development server:
   ```bash
   cd community-service
   npm run dev
   ```

2. Open http://localhost:5173 in your browser

3. Try to register a new account:
   - Click on Login/Register
   - Switch to "Register" mode
   - Enter an email and password
   - Click "Register"
   - You'll see a success message asking you to check your email

4. Check your email for the confirmation link:
   - Look for an email from Supabase
   - Click the confirmation link
   - You'll be redirected back to your app
   - Now you can login with your credentials

### 4. Optional: Enable Google OAuth (if needed)

If you want Google sign-in to work:

1. Go to **Authentication** → **Providers** in Supabase
2. Find **Google** and click **Enable**
3. You'll need to set up Google OAuth credentials (see full setup guide if needed)

## Troubleshooting

### If registration still fails:
1. Check the browser console for errors
2. Make sure email confirmation is disabled in Supabase settings
3. Verify your environment variables are correct
4. Try with a different email address

### If you see "Invalid login credentials":
- This usually means the email/password combination doesn't exist
- Try registering first, then logging in

### If Google sign-in doesn't work:
- Google OAuth requires additional setup
- For now, just use email/password authentication

## Current Configuration

Your app is now configured for:
- ✅ Email/password registration with confirmation
- ✅ Email/password login after confirmation
- ✅ No database dependencies
- ✅ Email confirmation required for security
- ✅ Automatic user profile creation
- ⚠️ Google OAuth (requires additional setup)

## How Email Confirmation Works

1. **Registration**: User enters email/password and clicks "Register"
2. **Email Sent**: Supabase sends a confirmation email
3. **User Confirms**: User clicks the link in their email
4. **Account Activated**: User can now login with their credentials
5. **Login**: User can login normally after confirmation

The authentication system works with just Supabase's built-in auth without any custom database tables or triggers.