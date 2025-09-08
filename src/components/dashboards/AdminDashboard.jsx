import { useState, useEffect } from 'react'
import { LogOut, Users, Shield, Plus, Eye, EyeOff, Search, Edit, Trash2, ArrowLeft, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { USER_ROLES, STAFF_DEPARTMENTS } from '../../services/authService'
import { mongoService } from '../../services/mongoService'
import AdminUserManagementSimple from '../AdminUserManagementSimple'
import { complaintService } from '../../services/complaintService'

const AdminDashboard = ({ user, onLogout, currentPage = 'dashboard' }) => {
  const { authService } = useAuth()
  const [staffList, setStaffList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingStaff, setIsCreatingStaff] = useState(false)

  // Staff form state
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: USER_ROLES.STAFF,
    staffDepartment: '',
    password: '',
    generatePassword: true
  })

  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [staffView, setStaffView] = useState('list') // 'list', 'add', 'edit'
  const [editingStaff, setEditingStaff] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [complaints, setComplaints] = useState([])
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [visitorLogs, setVisitorLogs] = useState([])
  const [visitorLoading, setVisitorLoading] = useState(false)

  // Safety check for user object
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading user data...</p>
        </div>
      </div>
    )
  }

  // Load staff list
  const loadStaffList = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 Loading staff list...')

      const result = await authService.getStaffUsers()
      console.log('📋 Staff list result:', result)

      if (result.success) {
        console.log('✅ Staff users loaded:', result.users.length, 'users')
        setStaffList(result.users || [])
      } else {
        console.error('❌ Failed to load staff users:', result.error)
        setStaffList([])
      }
    } catch (error) {
      console.error('❌ Error loading staff list:', error)
      setStaffList([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (currentPage === 'staff-security') {
      loadStaffList()
    }
    if (currentPage === 'complaints') {
      ;(async () => {
        try {
          setComplaintsLoading(true)
          const { complaints } = await complaintService.listComplaints()
          setComplaints(complaints || [])
        } catch (e) {
          console.error(e)
          setComplaints([])
        } finally {
          setComplaintsLoading(false)
        }
      })()
    }
    if (currentPage === 'visitors') {
      ;(async () => {
        try {
          setVisitorLoading(true)
          const result = await mongoService.getVisitorLogs({})
          if (result.success) {
            const logs = result.data?.data || []
            setVisitorLogs(logs)
          } else {
            setVisitorLogs([])
          }
        } catch (e) {
          console.error(e)
          setVisitorLogs([])
        } finally {
          setVisitorLoading(false)
        }
      })()
    }
  }, [currentPage])

  // Password validation function
  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return ''
  }

  // Handle form changes
  const handleStaffFormChange = (field, value) => {
    setStaffForm(prev => ({
      ...prev,
      [field]: value
    }))

    // Validate password if it's being changed
    if (field === 'password' && !staffForm.generatePassword) {
      const error = validatePassword(value)
      setPasswordError(error)
    }

    // Clear password error when switching to auto-generate
    if (field === 'generatePassword' && value === true) {
      setPasswordError('')
    }
  }

  // Handle staff creation
  const handleCreateStaff = async (e) => {
    e.preventDefault()

    // Validate custom password if not auto-generating
    if (!staffForm.generatePassword) {
      const passwordValidationError = validatePassword(staffForm.password)
      if (passwordValidationError) {
        setPasswordError(passwordValidationError)
        return
      }
    }

    try {
      setIsCreatingStaff(true)
      setPasswordError('')

      const staffData = {
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        staffDepartment: staffForm.role === USER_ROLES.STAFF ? staffForm.staffDepartment : null,
        customPassword: staffForm.generatePassword ? null : staffForm.password
      }

      const result = await authService.createStaffUser(staffData, user.id)
      
      if (result.success) {
        const finalPassword = staffForm.generatePassword ? result.tempPassword : staffForm.password

        const emailStatus = result.emailSent ?
          '\n\n✅ Credentials have been sent to the user\'s email address.' :
          '\n\n⚠️ Email sending failed. Please share the credentials manually.'

        alert(`${staffForm.role.charAt(0).toUpperCase() + staffForm.role.slice(1)} created successfully!\n\nLogin Credentials:\nEmail: ${staffForm.email}\nPassword: ${finalPassword}\n\nPlease save these credentials securely.${emailStatus}`)
        
        // Reset form
        setStaffForm({
          name: '',
          email: '',
          role: USER_ROLES.STAFF,
          staffDepartment: '',
          password: '',
          generatePassword: true
        })
        setPasswordError('')
        
        // Reload staff list and switch to list view
        loadStaffList()
        setStaffView('list')
      } else {
        console.error('Staff creation failed:', result.error)
        alert('❌ Error creating user: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating staff:', error)
      alert('❌ Error creating user: ' + error.message)
    } finally {
      setIsCreatingStaff(false)
    }
  }

  // Handle staff deletion
  const handleDeleteStaff = async (staffId, staffName) => {
    if (!confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return
    }

    try {
      const result = await authService.deleteStaffUser(staffId)
      if (result.success) {
        alert('Staff member deleted successfully')
        loadStaffList()
      } else {
        alert('Error deleting staff: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert('Error deleting staff: ' + error.message)
    }
  }

  // Handle staff editing
  const handleEditStaff = (staff) => {
    setEditingStaff(staff)
    setStaffForm({
      name: staff.name || '',
      email: staff.email || '',
      role: staff.role || USER_ROLES.STAFF,
      staffDepartment: staff.staffDepartment || '',
      password: '',
      generatePassword: true
    })
    setStaffView('edit')
  }

  // Handle staff update
  const handleUpdateStaff = async (e) => {
    e.preventDefault()

    if (!staffForm.name || !staffForm.email || !staffForm.role) {
      alert('Please fill in all required fields')
      return
    }

    if (staffForm.role === USER_ROLES.STAFF && !staffForm.staffDepartment) {
      alert('Please select a department for staff members')
      return
    }

    setIsCreatingStaff(true)

    try {
      const result = await authService.updateStaffUser(editingStaff.id, {
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        staffDepartment: staffForm.staffDepartment
      })

      if (result.success) {
        alert(`✅ ${staffForm.role} user updated successfully!`)

        // Reset form and editing state
        setStaffForm({
          name: '',
          email: '',
          role: USER_ROLES.STAFF,
          staffDepartment: '',
          password: '',
          generatePassword: true
        })
        setEditingStaff(null)

        // Refresh staff list and go back to list view
        await loadStaffList()
        setStaffView('list')
      } else {
        alert('❌ Failed to update user: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating staff:', error)
      alert('❌ Error updating staff: ' + error.message)
    } finally {
      setIsCreatingStaff(false)
    }
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingStaff(null)
    setStaffForm({
      name: '',
      email: '',
      role: USER_ROLES.STAFF,
      staffDepartment: '',
      password: '',
      generatePassword: true
    })
    setStaffView('list')
  }

  // Filter staff list
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || staff.role === filterRole
    return matchesSearch && matchesRole
  })







  const renderContent = () => {
    // Show residents management when admin-users page is active
    if (currentPage === 'admin-users') {
      return <AdminUserManagementSimple />
    }
    // Show staff management when staff-security page is active
    if (currentPage === 'staff-security') {
      return (
        <div className="space-y-6">
          {/* Header with navigation */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {staffView !== 'list' && (
                  <button
                    onClick={() => {
                      setStaffView('list')
                      setEditingStaff(null)
                      setStaffForm({
                        name: '',
                        email: '',
                        role: USER_ROLES.STAFF,
                        staffDepartment: '',
                        password: '',
                        generatePassword: true
                      })
                      setPasswordError('')
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to List
                  </button>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {staffView === 'list' ? 'Staff & Security Management' :
                   staffView === 'add' ? 'Add New Staff/Security Member' :
                   'Edit Staff/Security Member'}
                </h3>
              </div>
              {staffView === 'list' && (
                <div className="flex gap-3">
                  <button
                    onClick={loadStaffList}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isLoading}
                  >
                    🔄 {isLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setStaffView('add')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Member
                  </button>
                </div>
              )}
            </div>

            {/* Staff List View */}
            {staffView === 'list' && (
              <div className="space-y-6">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Roles</option>
                      <option value={USER_ROLES.STAFF}>Staff</option>
                      <option value={USER_ROLES.SECURITY}>Security</option>
                    </select>
                  </div>
                </div>

                {/* Staff List */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading staff members...</p>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {searchTerm || filterRole !== 'all' ? 'No staff members match your search criteria' : 'No staff members found'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredStaff.map((staff) => (
                      <div key={staff.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                {staff.role === USER_ROLES.SECURITY ? (
                                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{staff.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{staff.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                                {staff.role}
                              </span>
                              {staff.staffDepartment && (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
                                  {staff.staffDepartment}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditStaff(staff)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff.id, staff.name)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add/Edit Form */}
            {(staffView === 'add' || staffView === 'edit') && (
              <form onSubmit={staffView === 'edit' ? handleUpdateStaff : handleCreateStaff} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => handleStaffFormChange('name', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => handleStaffFormChange('email', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => handleStaffFormChange('role', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={USER_ROLES.STAFF}>Staff</option>
                    <option value={USER_ROLES.SECURITY}>Security</option>
                  </select>
                </div>

                {/* Staff Role Selection - Only show if role is 'staff' */}
                {staffForm.role === USER_ROLES.STAFF && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Staff Department *
                    </label>
                    <select
                      value={staffForm.staffDepartment}
                      onChange={(e) => handleStaffFormChange('staffDepartment', e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Department</option>
                      {STAFF_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Password Configuration - Only show when creating new users */}
              {staffView === 'add' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generatePassword"
                    checked={staffForm.generatePassword}
                    onChange={(e) => handleStaffFormChange('generatePassword', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="generatePassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-generate secure password
                  </label>
                </div>

                {!staffForm.generatePassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={staffForm.password}
                        onChange={(e) => handleStaffFormChange('password', e.target.value)}
                        className={`w-full p-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          passwordError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Enter password (min 6 chars, 1 uppercase, 1 number)"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Password must be at least 6 characters with 1 uppercase letter and 1 number
                    </p>
                  </div>
                )}

                {staffForm.generatePassword && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> A secure password will be automatically generated and sent via email.
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                {staffView === 'edit' && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isCreatingStaff}
                    className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingStaff ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {staffView === 'edit' ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {staffView === 'edit' ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {staffView === 'edit' ? 'Update' : 'Create'} {staffForm.role.charAt(0).toUpperCase() + staffForm.role.slice(1)}
                    </>
                  )}
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      )
    }

    // Route other admin sidebar pages to simple views for now
    if (currentPage === 'payments') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Payments</h3>
            <p className="text-gray-600 dark:text-gray-400">Admin payments view (coming soon).</p>
          </div>
        </div>
      )
    }

    if (currentPage === 'announcements') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Announcements</h3>
            <p className="text-gray-600 dark:text-gray-400">Manage community announcements (coming soon).</p>
          </div>
        </div>
      )
    }

    if (currentPage === 'maintenance') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Maintenance</h3>
            <p className="text-gray-600 dark:text-gray-400">Track maintenance tasks (coming soon).</p>
          </div>
        </div>
      )
    }

    if (currentPage === 'visitors') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">All Visitor Logs</h3>
              <button
                onClick={async ()=>{
                  try {
                    setVisitorLoading(true)
                    const result = await mongoService.getVisitorLogs({})
                    if (result.success) {
                      const logs = result.data?.data || []
                      setVisitorLogs(logs)
                    } else {
                      setVisitorLogs([])
                    }
                  } finally { setVisitorLoading(false) }
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg"
              >Refresh</button>
            </div>
            {visitorLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            ) : visitorLogs.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No visitor logs found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Visitor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Host</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Purpose</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Entry Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorLogs.map((log) => (
                      <tr key={log._id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{log.visitorName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{log.visitorPhone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{log.hostName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{log.hostFlat}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900 dark:text-white">{log.purpose}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-gray-900 dark:text-white">{new Date(log.entryTime).toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.status === 'checked_in'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {log.status === 'checked_in' ? 'Inside' : 'Checked Out'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'complaints') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Resident Complaints</h3>
              <button
                onClick={async ()=>{
                  try {
                    setComplaintsLoading(true)
                    const { complaints } = await complaintService.listComplaints()
                    setComplaints(complaints || [])
                  } finally { setComplaintsLoading(false) }
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg"
              >Refresh</button>
            </div>
            {complaintsLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            ) : complaints.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No complaints found.</p>
            ) : (
              <div className="space-y-3">
                {complaints.map((c)=> (
                  <div key={c._id} className="p-4 border dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{c.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{c.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{c.residentName} • {c.building}-{c.flatNumber} • {new Date(c.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${c.status==='resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.status}</span>
                        {c.status !== 'resolved' && (
                          <button
                            onClick={async ()=>{
                              try {
                                await complaintService.updateComplaint(c._id, { status: 'resolved' })
                                setComplaints(complaints.map(x => x._id===c._id ? { ...x, status: 'resolved' } : x))
                              } catch (e) { console.error(e) }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded"
                          >Mark Resolved</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'reports') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Reports</h3>
            <p className="text-gray-600 dark:text-gray-400">Analytics and reports (coming soon).</p>
          </div>
        </div>
      )
    }

    if (currentPage === 'settings') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h3>
            <p className="text-gray-600 dark:text-gray-400">Platform settings (coming soon).</p>
          </div>
        </div>
      )
    }

    // Default dashboard content
    return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Welcome to the Community Service Platform administration panel. Use the sidebar navigation to manage different aspects of the platform.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <span className="text-gray-900 dark:text-white">Total Residents</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">156</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900 dark:text-white">Staff & Security Members</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{staffList.length}</span>
                </div>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Use the sidebar navigation to manage different aspects of the community platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user.name || 'Admin'}!</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  )
}

export default AdminDashboard
