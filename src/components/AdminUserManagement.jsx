import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, Search, Filter, Edit, Trash2, Shield, User, Building2, Phone, Mail, Send, MessageSquare, Key, Settings } from 'lucide-react'
import notificationService from '../services/notificationService'

const AdminUserManagement = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingUser, setEditingUser] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [sendingCredentials, setSendingCredentials] = useState(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [notificationConfig, setNotificationConfig] = useState(null)

  useEffect(() => {
    fetchUsers()
    checkNotificationConfig()
  }, [])

  const checkNotificationConfig = () => {
    const config = notificationService.getConfigurationStatus()
    setNotificationConfig(config)
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))

      setMessage({ type: 'success', text: 'User role updated successfully!' })
      setEditingUser(null)
    } catch (error) {
      console.error('Error updating user role:', error)
      setMessage({ type: 'error', text: 'Failed to update user role' })
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.filter(user => user.id !== userId))
      setMessage({ type: 'success', text: 'User deleted successfully!' })
    } catch (error) {
      console.error('Error deleting user:', error)
      setMessage({ type: 'error', text: 'Failed to delete user' })
    }
  }

  const handleSendCredentials = async (staffUser, method = 'both') => {
    setSendingCredentials(staffUser.id)
    setMessage({ type: '', text: '' })

    try {
      // Generate temporary password for the staff member
      const tempPassword = notificationService.generateTemporaryPassword()
      
      // Update user's password in Supabase Auth (in a real app, you'd do this via admin API)
      // For now, we'll just simulate sending the current credentials
      
      let result
      switch (method) {
        case 'email':
          result = await notificationService.sendEmailNotification(staffUser, { password: tempPassword })
          break
        case 'whatsapp':
          result = await notificationService.sendWhatsAppNotification(staffUser, { password: tempPassword })
          break
        case 'both':
        default:
          result = await notificationService.sendBothNotifications(staffUser, { password: tempPassword })
          break
      }

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Credentials sent successfully via ${method === 'both' ? 'email and WhatsApp' : method}!` 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: result.message || 'Failed to send credentials' 
        })
      }
    } catch (error) {
      console.error('Error sending credentials:', error)
      setMessage({ type: 'error', text: 'Failed to send credentials' })
    } finally {
      setSendingCredentials(null)
    }
  }

  const openCredentialsModal = (staffUser) => {
    setSelectedStaff(staffUser)
    setShowCredentialsModal(true)
  }

  const closeCredentialsModal = () => {
    setSelectedStaff(null)
    setShowCredentialsModal(false)
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm)
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage community members and their roles</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Total Users: {users.length}</span>
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="resident">Residents</option>
                <option value="admin">Admins</option>
                <option value="staff">Staff</option>
                <option value="security">Security</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || 'No name provided'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.flat_number && user.building ? (
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          {user.building}-{user.flat_number}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="resident">Resident</option>
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="security">Security</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {getRoleLabel(user.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                          className="text-blue-600 hover:text-blue-500"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(user.role === 'staff' || user.role === 'security') && (
                          <button
                            onClick={() => openCredentialsModal(user)}
                            className="text-green-600 hover:text-green-500"
                            title="Send credentials"
                            disabled={sendingCredentials === user.id}
                          >
                            {sendingCredentials === user.id ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Key className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {user.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-500"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No users have been registered yet'
                }
              </p>
            </div>
          )}
        </div>

        {/* Notification Configuration Status */}
        {notificationConfig && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${notificationConfig.email ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">Email Notifications</span>
                </div>
                <p className={`text-sm ${notificationConfig.email ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {notificationConfig.email ? `Configured (${notificationConfig.adminEmail})` : 'Not configured'}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${notificationConfig.whatsapp ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">WhatsApp Notifications</span>
                </div>
                <p className={`text-sm ${notificationConfig.whatsapp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {notificationConfig.whatsapp ? `Configured (${notificationConfig.adminPhone})` : 'Not configured'}
                </p>
              </div>
            </div>
            {(!notificationConfig.email && !notificationConfig.whatsapp) && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ Configure email and WhatsApp settings in your environment variables to enable credential notifications.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send Credentials Modal */}
      {showCredentialsModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Send Login Credentials</h3>
              <button
                onClick={closeCredentialsModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{selectedStaff.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedStaff.email}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose how you want to send the login credentials to the admin:
              </p>
            </div>

            <div className="space-y-3">
              {notificationConfig?.email && (
                <button
                  onClick={() => {
                    handleSendCredentials(selectedStaff, 'email')
                    closeCredentialsModal()
                  }}
                  disabled={sendingCredentials === selectedStaff.id}
                  className="w-full flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">Send via Email</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Send to {notificationConfig.adminEmail}</div>
                  </div>
                </button>
              )}

              {notificationConfig?.whatsapp && (
                <button
                  onClick={() => {
                    handleSendCredentials(selectedStaff, 'whatsapp')
                    closeCredentialsModal()
                  }}
                  disabled={sendingCredentials === selectedStaff.id}
                  className="w-full flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">Send via WhatsApp</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Send to {notificationConfig.adminPhone}</div>
                  </div>
                </button>
              )}

              {notificationConfig?.email && notificationConfig?.whatsapp && (
                <button
                  onClick={() => {
                    handleSendCredentials(selectedStaff, 'both')
                    closeCredentialsModal()
                  }}
                  disabled={sendingCredentials === selectedStaff.id}
                  className="w-full flex items-center gap-3 p-4 border-2 border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">Send via Both</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Send to both email and WhatsApp</div>
                  </div>
                </button>
              )}

              {!notificationConfig?.email && !notificationConfig?.whatsapp && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    No notification methods are configured. Please set up email or WhatsApp configuration.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeCredentialsModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserManagement 