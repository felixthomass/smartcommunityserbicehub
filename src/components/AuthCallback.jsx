import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { showSuccess, showError } from '../utils/sweetAlert'

const AuthCallback = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get auth params from hash or query string (support both implicit and pkce flows)
        const hashFragment = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : ''
        const searchQuery = window.location.search.startsWith('?') ? window.location.search.substring(1) : ''
        const params = new URLSearchParams(hashFragment || searchQuery)
        
        // Check if this is an email confirmation or a recovery callback
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type') || (params.get('error_code') ? 'error' : null)
        
        if (type === 'recovery') {
          // During recovery, Supabase SDK usually sets the session automatically on load.
          // Show the password reset form regardless of token presence.
          if (accessToken && refreshToken) {
            // Best-effort: set session if tokens are present
            try {
              const { error: setErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              if (setErr) {
                console.warn('Optional setSession during recovery failed:', setErr)
              }
            } catch {}
          }
          setIsRecovery(true)
          // Detect if session is already set by the SDK
          const { data: { session } } = await supabase.auth.getSession()
          setHasSession(!!session)
        } else if (type === 'signup' && accessToken && refreshToken) {
          // Email confirmation success
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          if (error) throw error
          setSuccess(true)
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else if (type === 'error') {
          const error = params.get('error')
          const errorDesc = params.get('error_description')
          setError(errorDesc || error || 'Invalid or expired link. Please try again.')
        } else {
          // No valid confirmation tokens found
          // Still allow recovery UI to show so user can resend the email
          setIsRecovery(true)
          const { data: { session } } = await supabase.auth.getSession()
          setHasSession(!!session)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setError(error.message || 'An error occurred during authentication callback.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [])

  // Do not auto-redirect on this route; we want to show confirmation/recovery/errors explicitly

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Processing authentication...</p>
        </div>
      </div>
    )
  }

  // Password recovery form
  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setUpdating(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      setUpdateSuccess(true)
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (err) {
      console.error('Password update error:', err)
      setError(err.message || 'Failed to update password.')
    } finally {
      setUpdating(false)
    }
  }

  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset your password</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Enter a new password for your account.</p>
          {!hasSession && (
            <div className="mb-4 text-xs text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 rounded p-3">
              Your session is not active. If this link expired, resend a new reset email below.
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          {updateSuccess && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">Password updated! Redirecting...</div>
          )}
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={updating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Password'}
            </button>
          </form>
          {!hasSession && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your email to resend reset link"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
                      redirectTo: `${window.location.origin}/auth/callback`
                    })
                    if (error) throw error
                    showSuccess('Email Sent', 'A new reset email has been sent.')
                  } catch (e) {
                    showError('Failed to Resend Email', e.message || 'Failed to resend reset email.')
                  }
                }}
                className="mt-3 text-sm text-blue-600 hover:text-blue-500"
              >
                Resend reset email
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Email Confirmed!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your email has been successfully confirmed. You will be redirected to the dashboard shortly.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting in 2 seconds...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Confirmation Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback