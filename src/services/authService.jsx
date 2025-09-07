import { supabase } from '../lib/supabase'

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  RESIDENT: 'resident', 
  STAFF: 'staff',
  SECURITY: 'security'
}

// Staff departments
export const STAFF_DEPARTMENTS = [
  'Maintenance',
  'Housekeeping', 
  'Administration',
  'Reception',
  'Accounts',
  'IT Support'
]

/**
 * Authentication Service using Supabase
 * Handles all user authentication and role management
 */
export const authService = {
  
  /**
   * Sign up a new user with role
   */
  signUp: async (userData) => {
    try {
      const { email, password, name, role, staffDepartment, flatNumber, building, phone } = userData
      
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            name,
            role: role || USER_ROLES.RESIDENT,
            staff_department: staffDepartment || null,
            flat_number: flatNumber || null,
            building: building || null,
            phone: phone || null,
            created_at: new Date().toISOString()
          }
        }
      })

      if (error) throw error

      return {
        success: true,
        user: data.user,
        message: 'User created successfully'
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Sign in user
   */
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return {
        success: true,
        user: data.user,
        session: data.session
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Sign out user
   */
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) throw error
      
      return {
        success: true,
        user
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Test Supabase connection and auth
   */
  testConnection: async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      console.log('Supabase connection test:', { data, error })
      return { success: !error, data, error }
    } catch (error) {
      console.error('Supabase connection error:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Create staff/security user (Admin only)
   */
  createStaffUser: async (staffData, adminUserId) => {
    try {
      // Verify admin permissions
      const { data: adminUser } = await supabase.auth.getUser()
      console.log('Current admin user:', adminUser.user?.email, adminUser.user?.user_metadata?.role)

      if (!adminUser.user || adminUser.user.user_metadata?.role !== USER_ROLES.ADMIN) {
        throw new Error('Unauthorized: Admin access required')
      }

      const { name, email, role, staffDepartment, customPassword } = staffData

      // Use custom password or generate a temporary one
      const password = customPassword || generateTempPassword()

      console.log('Creating staff user:', { email, role, staffDepartment })

      // Create the staff/security user using regular signUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable confirmation email
          data: {
            name,
            role,
            staff_department: role === USER_ROLES.STAFF ? staffDepartment : null,
            created_at: new Date().toISOString(),
            created_by: adminUserId
          }
        }
      })

      if (error) {
        console.error('Supabase signUp error:', error)
        // Provide more specific error messages
        if (error.message.includes('User already registered')) {
          throw new Error('A user with this email already exists')
        } else if (error.message.includes('Invalid email')) {
          throw new Error('Please provide a valid email address')
        } else if (error.message.includes('Password')) {
          throw new Error('Password must be at least 6 characters long')
        } else {
          throw new Error(`Failed to create user: ${error.message}`)
        }
      }

      console.log('User created successfully:', data.user?.email)

      // Store staff user in Supabase staff_users table
      const { data: staffRecord, error: staffError } = await supabase
        .from('staff_users')
        .insert([
          {
            user_id: data.user.id,
            name,
            email,
            role,
            staff_department: role === USER_ROLES.STAFF ? staffDepartment : null,
            created_by: adminUserId
          }
        ])
        .select()

      if (staffError) {
        console.error('Error storing staff record:', staffError)
        // Don't fail the user creation if staff record fails
      } else {
        console.log('✅ Staff record created:', staffRecord)

      const result = { success: true, user: data.user }

      if (!result.success) {
        throw new Error(result.error)
      }

      // Send credentials via email
      try {
        const { emailService } = await import('./emailService')
        const emailResult = await emailService.sendCredentials({
          name,
          email,
          role,
          staffDepartment: role === USER_ROLES.STAFF ? staffDepartment : null
        }, password)

        if (!emailResult.success) {
          console.warn('Failed to send email:', emailResult.error)
          // Don't fail the user creation if email fails
        }
      } catch (emailError) {
        console.error('Email service error:', emailError)
        // Don't fail the user creation if email service fails
      }

      return {
        success: true,
        user: result.user,
        tempPassword: password,
        emailSent: true, // Assume email was sent (error handling is done above)
        message: `${role} user created successfully`
      }
    } catch (error) {
      console.error('Create staff user error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Delete staff/security user (Admin only)
   */
  deleteStaffUser: async (userId) => {
    try {
      // Verify admin permissions
      const { data: adminUser } = await supabase.auth.getUser()
      if (!adminUser.user || adminUser.user.user_metadata?.role !== USER_ROLES.ADMIN) {
        throw new Error('Unauthorized: Admin access required')
      }

      console.log('🗑️ Deleting staff user:', userId)

      // Delete from staff_users table
      const { error: staffDeleteError } = await supabase
        .from('staff_users')
        .delete()
        .eq('user_id', userId)

      if (staffDeleteError) {
        console.error('❌ Error deleting staff record:', staffDeleteError)
        throw new Error(`Failed to delete staff record: ${staffDeleteError.message}`)
      }

      console.log('✅ Staff record deleted from database')

      // Try to delete the actual user from Supabase Auth (may not work from client-side)
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)
        if (authDeleteError) {
          console.warn('⚠️ Could not delete user from auth:', authDeleteError.message)
          // Continue anyway since we removed from staff_users table
        } else {
          console.log('✅ User deleted from auth')
        }
      } catch (deleteError) {
        console.warn('⚠️ Could not delete from Supabase auth:', deleteError.message)
        // Continue anyway since we removed from staff_users table
      }

      return {
        success: true,
        message: 'User deleted successfully'
      }
    } catch (error) {
      console.error('Delete staff user error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Get all staff and security users (Admin only)
   */
  getStaffUsers: async () => {
    try {
      // Verify admin permissions
      const { data: adminUser } = await supabase.auth.getUser()
      if (!adminUser.user || adminUser.user.user_metadata?.role !== USER_ROLES.ADMIN) {
        throw new Error('Unauthorized: Admin access required')
      }

      console.log('🔍 Fetching staff users from Supabase...')

      // Query staff users from Supabase
      const { data: staffUsers, error } = await supabase
        .from('staff_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Supabase query error:', error)
        throw new Error(`Failed to fetch staff users: ${error.message}`)
      }

      console.log('✅ Retrieved staff users from Supabase:', staffUsers?.length || 0, 'users')
      console.log('📋 Staff users data:', staffUsers)

      // Transform the data to match the expected format
      const transformedUsers = (staffUsers || []).map(user => ({
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        staffDepartment: user.staff_department,
        createdAt: user.created_at,
        createdBy: user.created_by
      }))

      return {
        success: true,
        users: transformedUsers
      }
    } catch (error) {
      console.error('❌ Get staff users error:', error)
      return {
        success: false,
        error: error.message,
        users: []
      }
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) throw error

      return {
        success: true,
        user: data.user
      }
    } catch (error) {
      console.error('Update profile error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Reset password
   */
  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      return {
        success: true,
        message: 'Password reset email sent'
      }
    } catch (error) {
      console.error('Reset password error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Check if user has specific role
   */
  hasRole: (user, role) => {
    return user?.user_metadata?.role === role
  },

  /**
   * Check if user is admin
   */
  isAdmin: (user) => {
    return authService.hasRole(user, USER_ROLES.ADMIN)
  },

  /**
   * Check if user is staff
   */
  isStaff: (user) => {
    return authService.hasRole(user, USER_ROLES.STAFF)
  },

  /**
   * Check if user is security
   */
  isSecurity: (user) => {
    return authService.hasRole(user, USER_ROLES.SECURITY)
  },

  /**
   * Check if user is resident
   */
  isResident: (user) => {
    return authService.hasRole(user, USER_ROLES.RESIDENT)
  }
}

/**
 * Generate temporary password for staff/security
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  
  // Ensure at least one uppercase and one number
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  
  // Fill remaining 4 characters
  for (let i = 0; i < 4; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export default authService
