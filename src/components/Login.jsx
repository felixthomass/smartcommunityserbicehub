import React, { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, User, Lock, Mail, ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailValidationStatus, setEmailValidationStatus] = useState('idle') // 'idle', 'checking', 'available', 'taken'
  const [emailCheckTimeout, setEmailCheckTimeout] = useState(null)
  
  // Helper: check if email exists in staff_user table
  const checkStaffEmailExists = useCallback(async (email) => {
    try {
      const { data, error } = await supabase
        .from('staff_user')
        .select('email')
        .eq('email', email)
        .maybeSingle()
      if (error) return false
      return !!data
    } catch (e) { return false }
  }, [])

  // Real-time email validation function (only checks staff_user to avoid false positives from Auth)
  const checkEmailAvailability = useCallback(async (email) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailValidationStatus('idle')
      return
    }

    setEmailValidationStatus('checking')
    console.log('Checking email availability for:', email)
    
    try {
      // Only check staff table to avoid Auth false positives
      const existsInStaff = await checkStaffEmailExists(email)
      if (existsInStaff) {
        setEmailValidationStatus('taken')
        setErrors(prev => ({ ...prev, email: 'This email is already registered as staff. Please use a different email or try logging in.' }))
        return
      }
      // Otherwise consider available during typing. Auth existence will be checked on submit.
      setEmailValidationStatus('available')
      setErrors(prev => {
        const newErrors = { ...prev }
        if (newErrors.email && newErrors.email.toLowerCase().includes('already')) delete newErrors.email
        return newErrors
      })
    } catch (error) {
      console.error('Error checking email availability:', error)
      setEmailValidationStatus('idle')
    }
  }, [checkStaffEmailExists])

  // Debounced email validation
  useEffect(() => {
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout)
    }

    if (!isLogin && formData.email && /\S+@\S+\.\S+/.test(formData.email)) {
      const timeout = setTimeout(() => {
        checkEmailAvailability(formData.email)
      }, 500) // 500ms delay
      setEmailCheckTimeout(timeout)
    } else {
      setEmailValidationStatus('idle')
    }

    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout)
      }
    }
  }, [formData.email, isLogin, checkEmailAvailability, emailCheckTimeout])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address (not a username).'
    else if (!isLogin && emailValidationStatus === 'taken') newErrors.email = 'This email is already registered. Please use a different email or try logging in.'
    else if (!isLogin && emailValidationStatus === 'checking') newErrors.email = 'Checking email availability...'
    
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
          // Final safety check: ensure not a staff email and not already in auth
          const staffExists = await checkStaffEmailExists(formData.email)
          if (staffExists) {
            setErrors({ email: 'This email is already registered as staff. Please use a different email.' })
            setLoading(false)
            return
          }
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          })

          if (error) {
            const msg = (error.message || '').toLowerCase()
            if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
              setEmailValidationStatus('taken')
              setErrors({ email: 'This email is already registered. Please use a different email or try logging in.' })
              setLoading(false)
              return
            }
            throw error
          }

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
      // Reset email validation status when user starts typing
      if (emailValidationStatus !== 'idle') {
        setEmailValidationStatus('idle')
      }
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
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="flex justify-between items-center mb-2">
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
          
          <div className="flex items-center justify-center gap-3 mb-2">
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4">
          {/* Google Sign-in Button */}
          <div className="mb-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium"
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
          <div className="relative mb-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-2" onSubmit={handleSubmit} noValidate>
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-2">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
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
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-2">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address *
              </label>
              <div className="relative group">
                <Mail className={`absolute left-3 top-3 w-5 h-5 transition-colors duration-300 ${
                  emailValidationStatus === 'available' 
                    ? 'text-green-500' 
                    : emailValidationStatus === 'taken' 
                    ? 'text-gray-400' 
                    : emailValidationStatus === 'checking'
                    ? 'text-blue-500 animate-pulse'
                    : 'text-gray-400 group-focus-within:text-blue-500'
                }`} />
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
                    } else if (!isLogin) {
                      // Trigger email validation on blur for registration
                      checkEmailAvailability(formData.email)
                    }
                  }}
                  className={`w-full pl-10 pr-12 py-2 border-2 rounded-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-opacity-50 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    emailValidationStatus === 'available' 
                      ? 'border-green-400 dark:border-green-500 focus:ring-green-500 shadow-green-100 dark:shadow-green-900/20 shadow-lg' 
                      : emailValidationStatus === 'taken' 
                      ? 'border-orange-400 dark:border-orange-500 focus:ring-orange-500' 
                      : emailValidationStatus === 'checking'
                      ? 'border-blue-400 dark:border-blue-500 focus:ring-blue-500 shadow-blue-100 dark:shadow-blue-900/20 shadow-lg'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  placeholder="Enter your email"
                />
                
                {/* Enhanced Email validation status indicator with animations */}
                {!isLogin && formData.email && /\S+@\S+\.\S+/.test(formData.email) && (
                  <div className="absolute right-3 top-3 transition-all duration-300 ease-in-out">
                    {emailValidationStatus === 'checking' && (
                      <div className="relative">
                        <div className="w-6 h-6 border-3 border-blue-200 dark:border-blue-800 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-6 h-6 border-3 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-1 w-4 h-4 border-2 border-transparent border-t-blue-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                      </div>
                    )}
                    {emailValidationStatus === 'available' && (
                      <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                        <svg className="w-4 h-4 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {emailValidationStatus === 'taken' && (
                      <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Enhanced error and success messages with animations */}
              <div className="mt-1 min-h-[24px] flex items-start">
                {errors.email && (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">{errors.email}</p>
                  </div>
                )}
                {!isLogin && emailValidationStatus === 'available' && !errors.email && (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium" aria-live="polite">
                      ✓ Email is available and ready to use!
                    </p>
                  </div>
                )}
                {!isLogin && emailValidationStatus === 'checking' && !errors.email && (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium" aria-live="polite">
                      🔍 Checking email availability...
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={'Enter your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Standardized error message */}
              <div className="mt-1 min-h-[24px] flex items-start">
                {errors.password && (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">{errors.password}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Standardized error message */}
                <div className="mt-1 min-h-[24px] flex items-start">
                  {errors.confirmPassword && (
                    <div className="flex items-center gap-2 animate-fadeIn">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">{errors.confirmPassword}</p>
                    </div>
                  )}
                </div>
              </div>
            )}



            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!isLogin && (emailValidationStatus === 'checking' || emailValidationStatus === 'taken'))}
              className={`w-full py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 font-medium ${
                loading || (!isLogin && (emailValidationStatus === 'checking' || emailValidationStatus === 'taken'))
                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                  : !isLogin && emailValidationStatus === 'available'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white focus:ring-green-500 shadow-lg hover:shadow-green-200 dark:hover:shadow-green-900/20'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/20'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : !isLogin && emailValidationStatus === 'checking' ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="animate-pulse">Checking email...</span>
                </div>
              ) : !isLogin && emailValidationStatus === 'taken' ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Email already exists
                </div>
              ) : !isLogin && emailValidationStatus === 'available' ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Create Account
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
                  setEmailValidationStatus('idle')
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

      </div>
      </div>
    </>
  )
}

export default Login


