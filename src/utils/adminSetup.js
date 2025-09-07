import { supabase } from '../lib/supabase'

/**
 * Create an admin user - Run this once to set up your admin account
 * You can call this function from the browser console or create a temporary button
 */
export const createAdminUser = async (email, password, username = 'admin') => {
  try {
    console.log('Creating admin user...')
    
    // Sign up the admin user
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: username,
          username: username,
          role: 'admin'
        }
      }
    })

    if (error) {
      console.error('Error creating admin user:', error.message)
      return { success: false, error: error.message }
    }

    if (data?.user) {
      console.log('Admin user created successfully!')
      console.log('User ID:', data.user.id)
      console.log('Email:', data.user.email)
      console.log('Please check your email and confirm the account.')
      
      return { 
        success: true, 
        user: data.user,
        message: 'Admin user created! Please check email for confirmation.'
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update existing user to admin role
 * Use this if you want to promote an existing user to admin
 */
export const promoteUserToAdmin = async (userId) => {
  try {
    // This would require a server-side function or direct database access
    // For now, we'll just log instructions
    console.log(`To promote user ${userId} to admin:`)
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to Authentication > Users')
    console.log('3. Find the user and click on them')
    console.log('4. In the "Raw User Meta Data" section, add or update:')
    console.log('   {"role": "admin", "name": "Admin Name", "username": "admin"}')
    console.log('5. Save the changes')
    
    return { 
      success: true, 
      message: 'Check console for manual promotion instructions' 
    }
  } catch (error) {
    console.error('Error:', error)
    return { success: false, error: error.message }
  }
}

// Helper function to check current user role
export const checkUserRole = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      console.log('Current user:', user.email)
      console.log('Role:', user.user_metadata?.role || 'resident')
      console.log('Full metadata:', user.user_metadata)
      return user.user_metadata?.role || 'resident'
    } else {
      console.log('No user logged in')
      return null
    }
  } catch (error) {
    console.error('Error checking user role:', error)
    return null
  }
}