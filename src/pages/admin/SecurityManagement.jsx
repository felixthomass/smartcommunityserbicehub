import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Shield, Briefcase, MapPin, Calendar, Clock, Activity, User, Camera, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { securityStaffService } from '../../services/securityStaffService'
import { authService, USER_ROLES } from '../../services/authService'
import { gateService } from '../../services/gateService'
import { showSuccess, showError, showConfirm } from '../../utils/sweetAlert'
import FaceRegistration from '../../components/gate/FaceRegistration'

const SecurityManagement = () => {
  const { user } = useAuth()
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // 'list', 'add', 'edit'
  const [searchTerm, setSearchTerm] = useState('')
  const [editingStaff, setEditingStaff] = useState(null)
  const [enrollmentModal, setEnrollmentModal] = useState({ show: false, staffId: null })

  const initialForm = {
    name: '',
    email: '',
    employee_id: '',
    security_role: '',
    shift_timing: '',
    assigned_gate: '',
    employment_status: 'Active',
    joining_date: '',
    password: '',
    generatePassword: true
  }

  const [formData, setFormData] = useState(initialForm)
  const [passwordError, setPasswordError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Get auth users
      const authResult = await authService.getStaffUsers()
      if (authResult.success) {
        const securityUsers = authResult.users.filter(u => u.role === USER_ROLES.SECURITY)
        
        // 2. Get security job details
        const jobResult = await securityStaffService.getAllStaff()
        const jobDetailsMap = {}
        if (jobResult.success) {
          jobResult.staff.forEach(s => {
            jobDetailsMap[s.user_id] = s
          })
        }

        // 3. Get biometric registration status from gate service
        const biometricResult = await gateService.getAllStaff()
        const biometricRegistry = {}
        if (biometricResult.success) {
          biometricResult.data.forEach(s => {
            biometricRegistry[s._id] = s.hasFace
          })
        }

        // Merge them
        const mergedList = securityUsers.map(u => {
          const job = jobDetailsMap[u.id] || {}
          return {
            ...u,
            jobDetails: job,
            hasFace: biometricRegistry[u.id] || false
          }
        })
        
        setStaffList(mergedList)
      } else {
        showError('Fail to load users', authResult.error)
      }
    } catch (err) {
      console.error(err)
      showError('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const validatePassword = (password) => {
    if (password.length < 6) return 'At least 6 characters'
    if (!/[A-Z]/.test(password)) return 'At least one uppercase'
    if (!/[0-9]/.test(password)) return 'At least one number'
    return ''
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: val }))

    if (name === 'password' && !formData.generatePassword) {
      setPasswordError(validatePassword(val))
    }
    if (name === 'generatePassword' && val === true) {
      setPasswordError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.employee_id || !formData.security_role) {
      return showError('Missing Fields', 'Please fill all required fields')
    }

    if (!formData.generatePassword && view === 'add') {
      const err = validatePassword(formData.password)
      if (err) return setPasswordError(err)
    }

    setIsSubmitting(true)
    try {
      if (view === 'add') {
        const payload = {
          name: formData.name,
          email: formData.email,
          role: USER_ROLES.SECURITY,
          employeeId: formData.employee_id,
          securityRole: formData.security_role,
          shiftTiming: formData.shift_timing,
          assignedGate: formData.assigned_gate,
          employmentStatus: formData.employment_status,
          joiningDate: formData.joining_date,
          customPassword: formData.generatePassword ? null : formData.password
        }
        const res = await authService.createStaffUser(payload, user.id)
        if (res.success) {
          showSuccess('Success', 'Security staff added successfully')
          setView('list')
          loadData()
        } else {
          showError('Error', res.error)
        }
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          role: USER_ROLES.SECURITY,
          employeeId: formData.employee_id,
          securityRole: formData.security_role,
          shiftTiming: formData.shift_timing,
          assignedGate: formData.assigned_gate,
          employmentStatus: formData.employment_status,
          joiningDate: formData.joining_date,
        }
        const res = await authService.updateStaffUser(editingStaff.id, payload)
        if (res.success) {
          showSuccess('Success', 'Security staff updated')
          setView('list')
          loadData()
        } else {
          showError('Error', res.error)
        }
      }
    } catch (err) {
      console.error(err)
      showError('Error', err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (staffId, name) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      const res = await authService.deleteStaffUser(staffId)
      if (res.success) {
        showSuccess('Deleted', 'Staff removed')
        loadData()
      } else {
        showError('Error', res.error)
      }
    } catch (err) {
      showError('Error', err.message)
    }
  }

  const handleEdit = (staff) => {
    setEditingStaff(staff)
    const d = staff.jobDetails || {}
    setFormData({
      name: staff.name,
      email: staff.email,
      employee_id: d.employee_id || '',
      security_role: d.security_role || '',
      shift_timing: d.shift_timing || '',
      assigned_gate: d.assigned_gate || '',
      employment_status: d.employment_status || 'Active',
      joining_date: d.joining_date ? d.joining_date.split('T')[0] : '',
      password: '',
      generatePassword: true
    })
    setView('edit')
  }

  const filteredList = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.jobDetails.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Security Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Manage security staff, roles, and shifts.</p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => { setFormData(initialForm); setView('add'); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Security Staff
          </button>
        )}
      </div>

      {view === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="relative w-72">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-300">
                  <th className="px-6 py-4 font-medium border-b dark:border-gray-700">Staff Member</th>
                  <th className="px-6 py-4 font-medium border-b dark:border-gray-700">Employee ID</th>
                  <th className="px-6 py-4 font-medium border-b dark:border-gray-700">Role</th>
                  <th className="px-6 py-4 font-medium border-b dark:border-gray-700">Shift</th>
                  <th className="px-6 py-4 font-medium border-b dark:border-gray-700">Biometrics</th>
                  <th className="px-6 py-4 font-medium border-b dark:border-gray-700">Status</th>
                  <th className="px-6 py-4 font-medium border-b dark:border-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-6 text-gray-500">Loading...</td></tr>
                ) : filteredList.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-6 text-gray-500">No security staff found</td></tr>
                ) : (
                  filteredList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{staff.name}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">{staff.email}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {staff.jobDetails?.employee_id || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 rounded-md text-xs font-medium">
                          {staff.jobDetails?.security_role || 'Security'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {staff.jobDetails?.shift_timing || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {staff.hasFace ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Face ID
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                              <AlertCircle className="w-3 h-3" /> Missing
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          staff.jobDetails?.employment_status === 'Active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {staff.jobDetails?.employment_status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEnrollmentModal({ show: true, staffId: staff.id })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 rounded-lg transition" 
                            title="Register Face"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(staff)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 rounded-lg transition" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(staff.id, staff.name)} className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 rounded-lg transition" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {view === 'add' ? 'Add New Security Staff' : 'Edit Security Staff'}
            </h3>
            <button type="button" onClick={() => setView('list')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancel</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={view==='edit'} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white disabled:opacity-50" />
            </div>

            {view === 'add' && (
              <>
                <div className="col-span-2 space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="generatePassword" name="generatePassword" checked={formData.generatePassword} onChange={handleChange} className="rounded text-blue-600" />
                    <label htmlFor="generatePassword" className="text-sm text-gray-700 dark:text-gray-300">Auto-generate password & send via email</label>
                  </div>
                  {!formData.generatePassword && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Password</label>
                      <input type="text" name="password" value={formData.password} onChange={handleChange} className={`w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white ${passwordError ? 'border-red-500' : ''}`} />
                      {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee ID *</label>
              <div className="relative">
                <Briefcase className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input type="text" name="employee_id" required value={formData.employee_id} onChange={handleChange} className="w-full pl-10 p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" placeholder="e.g. SEC101" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Security Role *</label>
              <select name="security_role" required value={formData.security_role} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white">
                <option value="">Select Role</option>
                <option value="Gate Security">Gate Security</option>
                <option value="Patrol">Patrol</option>
                <option value="Supervisor">Supervisor</option>
                <option value="CCTV Operator">CCTV Operator</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shift Timing</label>
              <select name="shift_timing" value={formData.shift_timing} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white">
                <option value="">Select Shift</option>
                <option value="Morning">Morning (6 AM - 2 PM)</option>
                <option value="Evening">Evening (2 PM - 10 PM)</option>
                <option value="Night">Night (10 PM - 6 AM)</option>
                <option value="General">General (9 AM - 6 PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Gate / Area</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input type="text" name="assigned_gate" value={formData.assigned_gate} onChange={handleChange} className="w-full pl-10 p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" placeholder="e.g. Main Gate, Tower A" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employment Status</label>
              <select name="employment_status" value={formData.employment_status} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white">
                <option value="Active">Active</option>
                <option value="Off Duty">Off Duty</option>
                <option value="Suspended">Suspended</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Joining Date</label>
              <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>

          </div>
          
          <div className="flex justify-end pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={() => setView('list')} className="px-5 py-2 mr-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-white transition">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (view === 'add' ? 'Add Staff' : 'Save Changes')}
            </button>
          </div>
        </form>
      )}

      {/* Enrollment Modal */}
      {enrollmentModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEnrollmentModal({ show: false, staffId: null })}
              className="absolute top-6 right-6 z-10 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
            <div className="p-4">
              <FaceRegistration 
                staffId={enrollmentModal.staffId} 
                onComplete={(success) => {
                  if (success) loadData();
                  setEnrollmentModal({ show: false, staffId: null });
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityManagement
