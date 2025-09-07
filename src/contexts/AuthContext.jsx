import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { authService, USER_ROLES } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await loadUserProfile(session.user)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If Supabase indicates password recovery, ensure we show the reset form route
        if (event === 'PASSWORD_RECOVERY') {
          setLoading(false)
          // Keep any auth hash params intact, just force pathname to /auth/callback
          const hash = window.location.hash || ''
          window.location.replace(`/auth/callback${hash}`)
          return
        }

        if (session?.user) {
          await loadUserProfile(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (authUser) => {
    // Simple user profile without database dependency
    const userRole = authUser.user_metadata?.role || USER_ROLES.RESIDENT

    setUser({
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.user_metadata?.username || authUser.email?.split('@')[0],
      username: authUser.user_metadata?.username || authUser.email?.split('@')[0],
      email: authUser.email,
      role: userRole,
      staffDepartment: authUser.user_metadata?.staff_department || null,
      phone: authUser.user_metadata?.phone || '',
      flatNumber: authUser.user_metadata?.flat_number || '',
      building: authUser.user_metadata?.building || ''
    })

    // Log user role for debugging (only when user changes)
    if (!user || user.email !== authUser.email || user.role !== userRole) {
      console.log('User loaded:', {
        email: authUser.email,
        role: userRole
      })
    }
  }

  const login = (userData) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    user,
    login,
    logout,
    loading,
    // Auth service methods
    authService,
    // Role checking helpers
    isAdmin: () => authService.isAdmin(user),
    isStaff: () => authService.isStaff(user),
    isSecurity: () => authService.isSecurity(user),
    isResident: () => authService.isResident(user)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}