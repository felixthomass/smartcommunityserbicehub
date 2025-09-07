import React, { useState } from 'react'
import { Mail, MessageSquare, Send, User, Key, CheckCircle, XCircle } from 'lucide-react'
import notificationService from '../services/notificationService'

const NotificationDemo = () => {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  // Sample staff data for demo
  const sampleStaff = {
    id: 'demo-staff-123',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1234567890',
    role: 'staff',
    building: 'A',
    flat_number: '101',
    created_at: new Date().toISOString()
  }

  const handleTestNotification = async (method) => {
    setLoading(true)
    setResults(null)

    try {
      const tempPassword = notificationService.generateTemporaryPassword()
      let result

      switch (method) {
        case 'email':
          result = await notificationService.sendEmailNotification(sampleStaff, { password: tempPassword })
          break
        case 'whatsapp':
          result = await notificationService.sendWhatsAppNotification(sampleStaff, { password: tempPassword })
          break
        case 'both':
          result = await notificationService.sendBothNotifications(sampleStaff, { password: tempPassword })
          break
        default:
          throw new Error('Invalid method')
      }

      setResults({ method, result, password: tempPassword })
    } catch (error) {
      setResults({ 
        method, 
        result: { success: false, message: error.message }, 
        password: null 
      })
    } finally {
      setLoading(false)
    }
  }

  const config = notificationService.getConfigurationStatus()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Key className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Staff Credentials Notification Demo
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Test the staff credentials notification system
            </p>
          </div>

          {/* Configuration Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Configuration Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${config.email ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Email Notifications</span>
                  {config.email ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className={`text-sm ${config.email ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {config.email ? `Ready (${config.adminEmail})` : 'Not configured - Add VITE_EMAIL_USER and VITE_EMAIL_PASSWORD to .env.local'}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${config.whatsapp ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">WhatsApp Notifications</span>
                  {config.whatsapp ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className={`text-sm ${config.whatsapp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {config.whatsapp ? `Ready (${config.adminPhone})` : 'Not configured - Add WhatsApp API settings to .env.local'}
                </p>
              </div>
            </div>
          </div>

          {/* Sample Staff Info */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sample Staff Member</h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{sampleStaff.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{sampleStaff.role.charAt(0).toUpperCase() + sampleStaff.role.slice(1)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Email:</span> {sampleStaff.email}</div>
                <div><span className="font-medium">Phone:</span> {sampleStaff.phone}</div>
                <div><span className="font-medium">Location:</span> {sampleStaff.building}-{sampleStaff.flat_number}</div>
                <div><span className="font-medium">Joined:</span> {new Date(sampleStaff.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test Notifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleTestNotification('email')}
                disabled={loading || !config.email}
                className="flex items-center justify-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-5 h-5 text-blue-600" />
                <span>Test Email</span>
              </button>
              <button
                onClick={() => handleTestNotification('whatsapp')}
                disabled={loading || !config.whatsapp}
                className="flex items-center justify-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-5 h-5 text-green-600" />
                <span>Test WhatsApp</span>
              </button>
              <button
                onClick={() => handleTestNotification('both')}
                disabled={loading || (!config.email && !config.whatsapp)}
                className="flex items-center justify-center gap-3 p-4 border-2 border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 text-blue-600" />
                <span>Test Both</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Sending notification...</p>
            </div>
          )}

          {/* Results */}
          {results && !loading && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test Results</h2>
              <div className={`p-6 rounded-lg border ${results.result.success ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                <div className="flex items-center gap-2 mb-4">
                  {results.result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <h3 className={`text-lg font-medium ${results.result.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    {results.result.success ? 'Success!' : 'Failed'}
                  </h3>
                </div>
                <p className={`mb-4 ${results.result.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {results.result.message}
                </p>
                
                {results.result.success && results.password && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Generated Credentials:</h4>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Email:</span> {sampleStaff.email}</div>
                      <div><span className="font-medium">Password:</span> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{results.password}</code></div>
                    </div>
                  </div>
                )}

                {results.method === 'both' && results.result.results && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Detailed Results:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-3 rounded border ${results.result.results.email.success ? 'bg-green-100 border-green-300 dark:bg-green-900/30' : 'bg-red-100 border-red-300 dark:bg-red-900/30'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4" />
                          <span className="font-medium">Email</span>
                        </div>
                        <p className="text-sm">{results.result.results.email.message}</p>
                      </div>
                      <div className={`p-3 rounded border ${results.result.results.whatsapp.success ? 'bg-green-100 border-green-300 dark:bg-green-900/30' : 'bg-red-100 border-red-300 dark:bg-red-900/30'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="font-medium">WhatsApp</span>
                        </div>
                        <p className="text-sm">{results.result.results.whatsapp.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-3">How to Configure</h3>
            <div className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
              <p>1. <strong>For Email:</strong> Add your Gmail credentials to .env.local</p>
              <p>2. <strong>For WhatsApp:</strong> Set up WhatsApp Business API or third-party service</p>
              <p>3. <strong>For Production:</strong> Implement backend API endpoints for actual sending</p>
              <p>4. Check the <code>NOTIFICATION_SETUP.md</code> file for detailed instructions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationDemo