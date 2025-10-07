import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Phone, Home, Building2, Save, Edit, X } from 'lucide-react'
import { residentService } from '../services/residentService'
import { mongoService } from '../services/mongoService'

const UserProfile = () => {
  const { user, login } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ownerName: '',
    flatNumber: '',
    building: '',
    role: ''
  })

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      const base = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        ownerName: '',
        flatNumber: user.flatNumber || '',
        building: user.building || '',
        role: user.role || ''
      }
      try {
        const { resident } = await residentService.getProfile(user.id)
        let initial = {
          name: resident?.name || base.name,
          email: resident?.email || base.email,
          phone: resident?.phone || base.phone,
          ownerName: resident?.ownerName || base.ownerName,
          flatNumber: resident?.flatNumber || base.flatNumber,
          building: resident?.building || base.building,
          role: base.role
        }
        // Override with admin-assigned details if available
        try {
          const adminRes = await mongoService.getAdminResidentEntries?.()
          if (adminRes?.success) {
            const adminEntries = adminRes.data || []
            const match = adminEntries.find(r => (r.email || '').toLowerCase() === (initial.email || '').toLowerCase())
            if (match) {
              initial = {
                ...initial,
                name: match.name || initial.name,
                email: match.email || initial.email,
                phone: match.phone || initial.phone,
                flatNumber: match.flatNumber || initial.flatNumber,
                building: match.building || initial.building
              }
            }

            // Resolve owner name from admin entries for the selected flat
            const resolvedBuilding = initial.building
            const resolvedFlat = initial.flatNumber
            if (resolvedBuilding && resolvedFlat) {
              const ownerEntry = adminEntries.find(e => e.building === resolvedBuilding && e.flatNumber === resolvedFlat && e.isOwner)
              if (ownerEntry?.name) {
                initial.ownerName = ownerEntry.name
              }
            }
          }
        } catch {}
        setFormData(initial)
      } catch (e) {
        // If 404/no profile yet, stick with base values
        try {
          const adminRes = await mongoService.getAdminResidentEntries?.()
          if (adminRes?.success) {
            const adminEntries = adminRes.data || []
            const match = adminEntries.find(r => (r.email || '').toLowerCase() === (base.email || '').toLowerCase())
            if (match) {
              base.name = match.name || base.name
              base.email = match.email || base.email
              base.phone = match.phone || base.phone
              base.flatNumber = match.flatNumber || base.flatNumber
              base.building = match.building || base.building
            }
            // Resolve owner name
            if (base.building && base.flatNumber) {
              const ownerEntry = adminEntries.find(e => e.building === base.building && e.flatNumber === base.flatNumber && e.isOwner)
              if (ownerEntry?.name) {
                base.ownerName = ownerEntry.name
              }
            }
          }
        } catch {}
        setFormData(base)
      }
    }
    load()
  }, [user])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await residentService.saveProfile({
        authUserId: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        ownerName: formData.ownerName,
        flatNumber: formData.flatNumber,
        building: formData.building
      })

      // Update local user state
      const updatedUser = {
        ...user,
        name: formData.name,
        phone: formData.phone,
        flatNumber: formData.flatNumber,
        building: formData.building
      }
      login(updatedUser)

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      resident: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      staff: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      security: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    }
    return colors[role] || colors.resident
  }

  const getRoleLabel = (role) => {
    const labels = {
      resident: 'Resident',
      admin: 'Admin/Owner',
      staff: 'Staff',
      security: 'Security'
    }
    return labels[role] || 'Resident'
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <p className={`text-sm ${
                message.type === 'success' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-blue-600" />
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(formData.role)}`}>
                {getRoleLabel(formData.role)}
              </span>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{formData.name || 'Not provided'}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">{formData.email}</span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your phone number"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{formData.phone || 'Not provided'}</span>
                </div>
              )}
            </div>

            {/* Flat Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Owner Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter owner name"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{formData.ownerName || 'Not provided'}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Flat Number
                </label>
              {isEditing ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Home className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{formData.flatNumber || 'Not provided'}</span>
                  <span className="ml-auto text-xs text-gray-500">(Assigned by Admin)</span>
                </div>
              ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Home className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{formData.flatNumber || 'Not provided'}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Building
                </label>
              {isEditing ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{formData.building || 'Not provided'}</span>
                  <span className="ml-auto text-xs text-gray-500">(Assigned by Admin)</span>
                </div>
              ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{formData.building || 'Not provided'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            {isEditing && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </div>
                )}
              </button>
            )}
          </form>
        </div>

        {/* Account Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Actions</h2>
          <div className="space-y-4">
            <button
              onClick={() => {/* Add password change functionality */}}
              className="w-full text-left p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Change Password</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
            </button>
            
            <button
              onClick={() => {/* Add delete account functionality */}}
              className="w-full text-left p-4 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <h3 className="font-medium text-red-600 dark:text-red-400">Delete Account</h3>
              <p className="text-sm text-red-500 dark:text-red-400">Permanently delete your account and data</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile 