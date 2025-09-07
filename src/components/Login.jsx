import React, { useState } from 'react'
import { Sun, Moon, User, Lock, Mail, ArrowLeft, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { USER_ROLES } from '../services/authService'

const Login = ({ onNavigateToLanding, darkMode, setDarkMode }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address (not a username).'
    
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    
    if (!isLogin) {
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (validateForm()) {
      setLoading(true)
      setErrors({})
      setSuccessMessage('')
      setShowResendConfirmation(false)

      try {
        // Proactively check if the email looks like a username
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
          setErrors({ email: 'Please enter a valid email address (not a username).' })
          setLoading(false)
          return
        }

        if (isLogin) {
          // Use Supabase for all authentication
          const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          })

          if (error) {
            // Check if it's an email not confirmed error
            if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
              setShowResendConfirmation(true)
              throw new Error('Please check your email and click the confirmation link before signing in.')
            }
            // Map common Supabase errors to user-friendly, field-specific messages
            const normalizedMsg = (error.message || '').toLowerCase()
            if (normalizedMsg.includes('identity_not_found') || normalizedMsg.includes('user not found') || normalizedMsg.includes('not exist')) {
              setErrors({ email: 'Account not found. Check the email or register.' })
            } else if (normalizedMsg.includes('invalid login credentials')) {
              // Supabase does not reveal whether email exists; show precise but safe message
              setErrors({ password: 'Incorrect email or password.' })
            } else if (normalizedMsg.includes('invalid email') || normalizedMsg.includes('email')) {
              setErrors({ email: 'Please enter a valid email address (not a username).' })
            } else if (normalizedMsg.includes('password')) {
              setErrors({ password: 'Password is incorrect.' })
            } else {
              setErrors({ general: error.message })
            }
            return
          }

          // Authentication successful - AuthContext will handle user state
          console.log('Login successful for:', data.user.email)

        } else {
          // Registration - only through Supabase
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          })

          if (error) throw error

          // Show success message for registration
          setSuccessMessage(
            'Registration successful! Please check your email and click the confirmation link to activate your account.'
          )

          // Clear the form
          setFormData({
            email: '',
            password: '',
            confirmPassword: ''
          })
        }
      } catch (error) {
        console.error('Auth error:', error)
        setErrors({ general: error.message })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleResendConfirmation = async () => {
    if (!formData.email) {
      setErrors({ general: 'Please enter your email address first.' })
      return
    }

    setLoading(true)
    setErrors({})
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      
      setSuccessMessage('Confirmation email sent! Please check your inbox.')
      setShowResendConfirmation(false)
    } catch (error) {
      console.error('Resend confirmation error:', error)
      setErrors({ general: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      
      if (error) throw error
      
      // The user will be redirected to Google for authentication
      // After successful auth, they'll be redirected back
    } catch (error) {
      console.error('Google sign-in error:', error)
      setErrors({ general: error.message })
      setGoogleLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    // Require a valid email to send reset link
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ general: 'Please enter a valid email to reset your password.' })
      return
    }

    setLoading(true)
    setErrors({})
    setSuccessMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/callback`
      })

      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('invalid email')) {
          setErrors({ email: 'Please enter a valid email address.' })
          return
        }
        throw error
      }

      setSuccessMessage('Password reset link sent! Check your email to continue.')
    } catch (error) {
      console.error('Forgot password error:', error)
      setErrors({ general: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyRecoveryCode = async (e) => {
    e?.preventDefault?.()
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ general: 'Please enter a valid email.' })
      return
    }
    if (!recoveryCode) {
      setErrors({ general: 'Enter the code you received via email.' })
      return
    }
    if (!formData.password || formData.password.length < 6) {
      setErrors({ general: 'Set a new password (min 6 characters).' })
      return
    }
    setLoading(true)
    setErrors({})
    setSuccessMessage('')
    try {
      // Verify the OTP email code (email-based OTP sign-in)
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: recoveryCode,
        type: 'email'
      })
      if (verifyError) throw verifyError

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({ password: formData.password })
      if (updateError) throw updateError

      setSuccessMessage('Password updated successfully. You can now sign in.')
      setShowCodeReset(false)
      setRecoveryCode('')
      setFormData({ ...formData, password: '', confirmPassword: '' })
    } catch (err) {
      console.error('Code recovery error:', err)
      setErrors({ general: err.message || 'Failed to reset password with code.' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendRecoveryCode = async () => {
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ general: 'Please enter a valid email to receive a code.' })
      return
    }
    setLoading(true)
    setErrors({})
    setSuccessMessage('')
    try {
      // Send an email OTP code (no link-based password reset)
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: false
        }
      })
      if (error) throw error
      setShowCodeReset(true)
      setSuccessMessage('Verification code sent! Check your email and paste the code below.')
    } catch (err) {
      console.error('Send recovery code error:', err)
      setErrors({ general: err.message || 'Failed to send verification code.' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Live, field-specific validation as the user types
    let fieldError = ''
    if (name === 'email') {
      if (!value) fieldError = 'Email is required'
      else if (!/\S+@\S+\.\S+/.test(value)) fieldError = 'Please enter a valid email address (not a username).'
    } else if (name === 'password') {
      if (!value) fieldError = 'Password is required'
      else if (value.length < 6) fieldError = 'Password must be at least 6 characters'
    } else if (name === 'confirmPassword' && !isLogin) {
      if (!value) fieldError = 'Please confirm your password'
      else if (value !== formData.password) fieldError = 'Passwords do not match'
    }

    setErrors({ ...errors, [name]: fieldError })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={onNavigateToLanding}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-6">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Smart Community Hub
            </h1>
          </div>
          
          <h2 className="text-xl text-gray-600 dark:text-gray-300">
            {isLogin ? 'Welcome back!' : 'Join our community'}
          </h2>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Google Sign-in Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                {showResendConfirmation && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => {
                    if (!formData.email) {
                      setErrors((prev) => ({ ...prev, email: 'Email is required' }))
                    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
                      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address (not a username).' }))
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600" aria-live="polite">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={'Enter your password'}
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Confirm your password"
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            )}



            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Register'
              )}
            </button>

            {/* Toggle Login/Register */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setErrors({})
                  setSuccessMessage('')
                  setShowResendConfirmation(false)
                }}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                {isLogin ? "Don't have an account? Register here" : "Already have an account? Sign in"}
              </button>
            </div>

            {/* Forgot Password (Login only) */}
            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
                >
                  Forgot your password?
                </button>
              </div>
            )}


          </form>
        </div>

        {/* Community Information */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
            Community Access Includes:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• Pay maintenance bills digitally</li>
            <li>• Raise and track complaints</li>
            <li>• Generate visitor QR passes</li>
            <li>• Community announcements & polls</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Login


