import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Phone, Home, Building2, Save, Edit, X, Camera, Briefcase, Calendar, MapPin, Activity, Shield } from 'lucide-react'
import { residentService } from '../services/residentService'
import { mongoService } from '../services/mongoService'
import { imageUploadService } from '../services/imageUploadService'
import { authService } from '../services/authService'
import { useRef } from 'react'
import { securityStaffService } from '../services/securityStaffService'

const UserProfile = () => {
  const { user, login } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ownerName: '',
    flatNumber: '',
    building: '',
    role: '',
    employeeId: '',
    securityRole: '',
    shiftTiming: '',
    assignedGate: '',
    employmentStatus: '',
    joiningDate: '',
    emergencyContact: '',
    address: ''
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
        role: user.role || '',
        employeeId: '',
        securityRole: '',
        shiftTiming: '',
        assignedGate: '',
        employmentStatus: '',
        joiningDate: '',
        emergencyContact: '',
        address: ''
      }
      try {
        if (user.role === 'security') {
          const res = await securityStaffService.getProfile(user.id)
          if (res.success && res.profile) {
            const p = res.profile
            setFormData({
              ...base,
              name: p.name || base.name,
              email: p.email || base.email,
              phone: p.phone || base.phone,
              employeeId: p.employee_id || base.employeeId,
              securityRole: p.security_role || base.securityRole,
              shiftTiming: p.shift_timing || base.shiftTiming,
              assignedGate: p.assigned_gate || base.assignedGate,
              employmentStatus: p.employment_status || base.employmentStatus,
              joiningDate: p.joining_date ? p.joining_date.split('T')[0] : base.joiningDate,
              emergencyContact: p.emergency_contact || base.emergencyContact,
              address: p.address || base.address
            })
            return
          }
        }

        const { resident } = await residentService.getProfile(user.id)
        let initial = {
          name: resident?.name || base.name,
          email: resident?.email || base.email,
          phone: resident?.phone || base.phone,
          ownerName: resident?.ownerName || base.ownerName,
          flatNumber: resident?.flatNumber || base.flatNumber,
          building: resident?.building || base.building,
          role: base.role,
          employeeId: resident?.employeeId || base.employeeId,
          securityRole: resident?.securityRole || base.securityRole,
          shiftTiming: resident?.shiftTiming || base.shiftTiming,
          assignedGate: resident?.assignedGate || base.assignedGate,
          employmentStatus: resident?.employmentStatus || base.employmentStatus,
          joiningDate: resident?.joiningDate || base.joiningDate,
          emergencyContact: resident?.emergencyContact || base.emergencyContact,
          address: resident?.address || base.address
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
      if (user.role === 'security') {
        await securityStaffService.updateProfile({
          user_id: user.id,
          name: formData.name,
          phone_number: formData.phone,
          emergency_contact: formData.emergencyContact,
          address: formData.address
        })
      } else {
        await residentService.saveProfile({
          authUserId: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          ownerName: formData.ownerName,
          flatNumber: formData.flatNumber,
          building: formData.building,
          employeeId: formData.employeeId,
          securityRole: formData.securityRole,
          shiftTiming: formData.shiftTiming,
          assignedGate: formData.assignedGate,
          employmentStatus: formData.employmentStatus,
          joiningDate: formData.joiningDate,
          emergencyContact: formData.emergencyContact,
          address: formData.address
        })
      }

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

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      const result = await imageUploadService.uploadImage(file, 'avatars')
      
      if (result.success) {
        const updateResult = await authService.updateProfile({
          profile_picture: result.data.publicUrl
        })
        
        if (updateResult.success) {
          setMessage({ type: 'success', text: 'Profile picture updated successfully' })
          // Update local user state
          login({ ...user, profilePicture: result.data.publicUrl })
        } else {
          setMessage({ type: 'error', text: 'Failed to update: ' + updateResult.error })
        }
      } else {
        setMessage({ type: 'error', text: 'Upload failed: ' + result.error })
      }
    } catch (err) {
      console.error('Profile picture error:', err)
      setMessage({ type: 'error', text: 'An error occurred during upload' })
    } finally {
      setUploading(false)
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
            <div className="flex gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
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
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center mb-10">
              <div className="relative group">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center relative"
                >
                  {user?.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={user.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <User className="w-16 h-16 text-blue-600/30" />
                    </div>
                  )}
                  
                  {/* Upload Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform" />
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center rounded-full">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  disabled={uploading}
                />
              </div>
              <p className="mt-4 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                {uploading ? 'Processing...' : 'Upload Photo'}
              </p>
            </div>
            {user?.role === 'staff' && (
              <div className="flex flex-col items-center -mt-6 mb-8">
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Housekeeping Staff</p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  On Duty
                </div>
              </div>
            )}

            {/* Profile fields start below */}

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
                  <span className="text-gray-900 dark:text-white">{formData.phone || (user?.role === 'staff' ? 'Not available' : 'Not provided')}</span>
                </div>
              )}
            </div>

            {/* Conditional Details based on role */}
            {user?.role === 'security' ? (
              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Security Job Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee ID</label>
                    {isEditing && user?.role !== 'security' ? (
                      <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter Employee ID" />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.employeeId || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Security Role</label>
                    {isEditing && user?.role !== 'security' ? (
                      <select name="securityRole" value={formData.securityRole} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">Select Role</option>
                        <option value="Gate Security">Gate Security</option>
                        <option value="Patrol">Patrol</option>
                        <option value="Supervisor">Supervisor</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.securityRole || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shift Timing</label>
                    {isEditing && user?.role !== 'security' ? (
                      <select name="shiftTiming" value={formData.shiftTiming} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">Select Shift</option>
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.shiftTiming || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Gate/Area</label>
                    {isEditing && user?.role !== 'security' ? (
                      <input type="text" name="assignedGate" value={formData.assignedGate} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter Assigned Gate" />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.assignedGate || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employment Status</label>
                    {isEditing && user?.role !== 'security' ? (
                      <select name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">Select Status</option>
                        <option value="Active">Active</option>
                        <option value="Off Duty">Off Duty</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Activity className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.employmentStatus || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Joining Date</label>
                    {isEditing && user?.role !== 'security' ? (
                      <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.joiningDate || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Emergency Contact Number</label>
                    {isEditing ? (
                      <input type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter Emergency Contact" />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.emergencyContact || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                    {isEditing ? (
                      <textarea name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter Full Address" rows="3" />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Home className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formData.address || 'Not provided'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {user?.role === 'staff' ? 'Staff ID' : 'Owner Name'}
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
                    {user?.role === 'staff' ? 'Assigned Area' : 'Flat Number'}
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
                      <span className="text-gray-900 dark:text-white">{formData.flatNumber || (user?.role === 'staff' ? 'Not assigned' : 'Not provided')}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {user?.role === 'staff' ? 'Shift' : 'Building'}
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
                      <span className="text-gray-900 dark:text-white">{formData.building || (user?.role === 'staff' ? 'Not assigned' : 'Not provided')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

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

        {/* End of User Information */}
      </div>
    </div>
  )
}

export default UserProfile 