import React, { useState, useEffect, useMemo } from 'react'
import { 
  Calendar, Clock, MapPin, Shield, Plus, Trash2, CheckCircle, 
  AlertCircle, RefreshCw, AlertTriangle, XCircle, Users, 
  ChevronLeft, ChevronRight 
} from 'lucide-react'
import { authService, USER_ROLES } from '../../services/authService'
import { securityShiftService } from '../../services/securityShiftService'
import { emergencyRequestService } from '../../services/emergencyRequestService'
import { securityStaffService } from '../../services/securityStaffService'
import { showSuccess, showError, showConfirm } from '../../utils/sweetAlert'

// Filter tab config
const TABS = [
  { id: 'all', label: 'All Shifts' },
  { id: 'today', label: 'Today' },
  { id: 'On Duty', label: 'On Duty' },
  { id: 'Upcoming', label: 'Upcoming' },
  { id: 'Completed', label: 'Completed' }
]

const SecurityShiftManagement = () => {
  const [securityStaff, setSecurityStaff] = useState([])
  const [shifts, setShifts] = useState([])
  const [emergencyRequests, setEmergencyRequests] = useState([]) // New state for emergency requests
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' or 'assign'
  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'
  const [activeTab, setActiveTab] = useState('all')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Approve modal state
  const [approveModal, setApproveModal] = useState(null)
  const [replacementId, setReplacementId] = useState('')
  const [approving, setApproving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    security_id: '',
    security_name: '',
    security_role: '',
    shift_type: 'Morning',
    assigned_gate: '',
    selected_dates: [], // Array for multiple date selection
    start_time: '06:00',
    end_time: '14:00'
  })

  // Today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0]

  // Duty calculation helper
  const computeShiftStatus = (shiftDate, startTime, endTime) => {
    const now = new Date()
    const startDateTime = new Date(`${shiftDate}T${startTime}:00`)
    let endDateTime = new Date(`${shiftDate}T${endTime}:00`)
    if (endDateTime < startDateTime) endDateTime.setDate(endDateTime.getDate() + 1)
    if (now < startDateTime) return 'Upcoming'
    if (now >= startDateTime && now <= endDateTime) return 'On Duty'
    return 'Completed'
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Load Security Staff
      const authResult = await authService.getStaffUsers()
      if (authResult.success) {
        const securityUsers = authResult.users.filter(u => u.role === USER_ROLES.SECURITY)

        const jobResult = await securityStaffService.getAllStaff()
        const jobDetailsMap = {}
        if (jobResult.success) {
          jobResult.staff.forEach(s => { jobDetailsMap[s.user_id] = s })
        }

        const merged = securityUsers.map(u => ({
          ...u,
          employee_id: jobDetailsMap[u.id]?.employee_id || 'N/A',
          security_role: jobDetailsMap[u.id]?.security_role || 'Gate Guard',
          default_gate: jobDetailsMap[u.id]?.assigned_gate || ''
        }))
        setSecurityStaff(merged)
      }

      // Load Shifts
      const shiftRes = await securityShiftService.getAllShifts()
      if (shiftRes.success) {
        const shiftsWithStatus = shiftRes.shifts.map(s => ({
          ...s,
          liveStatus: computeShiftStatus(s.shift_date, s.start_time, s.end_time)
        }))
        setShifts(shiftsWithStatus)
      }
      // Load Emergency Requests
      const reqRes = await emergencyRequestService.getAllRequests()
      if (reqRes.success) {
        setEmergencyRequests(reqRes.requests)
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Refresh status every minute
    const interval = setInterval(() => {
      setShifts(prev => prev.map(s => ({
        ...s,
        liveStatus: computeShiftStatus(s.shift_date, s.start_time, s.end_time)
      })))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Filtered shifts based on active tab
  const filteredShifts = useMemo(() => {
    if (activeTab === 'all') return shifts
    if (activeTab === 'today') return shifts.filter(s => s.shift_date === todayStr)
    return shifts.filter(s => s.liveStatus === activeTab)
  }, [shifts, activeTab, todayStr])

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: shifts.length,
    today: shifts.filter(s => s.shift_date === todayStr).length,
    'On Duty': shifts.filter(s => s.liveStatus === 'On Duty').length,
    'Upcoming': shifts.filter(s => s.liveStatus === 'Upcoming').length,
    'Completed': shifts.filter(s => s.liveStatus === 'Completed').length
  }), [shifts, todayStr])

  const handleAssignChange = (e) => {
    const { name, value } = e.target
    const next = { ...formData, [name]: value }

    // Auto-fill gate + name when guard selected
    if (name === 'security_id') {
      const guard = securityStaff.find(g => g.id === value)
      if (guard) {
        next.security_name = guard.name || ''
        next.security_role = guard.security_role || ''
        if (!formData.assigned_gate) next.assigned_gate = guard.default_gate
      }
    }
    setFormData(next)
  }

  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    if (!formData.security_id || !formData.assigned_gate || formData.selected_dates.length === 0 || !formData.start_time || !formData.end_time) {
      return showError('Incomplete', 'Please fill all required fields and select at least one date.')
    }

    const guard = securityStaff.find(g => g.id === formData.security_id)
    setApproving(true) // Reuse state for loading

    try {
      let successCount = 0
      let errors = []

      // Loop through all selected dates
      for (const date of formData.selected_dates) {
        const payload = {
          security_id: formData.security_id,
          employee_id: guard?.employee_id || 'N/A',
          guard_name: guard?.name || 'Security Officer',
          security_role: formData.security_role || 'Security Officer',
          shift_type: formData.shift_type,
          assigned_gate: formData.assigned_gate,
          shift_date: date,
          start_time: formData.start_time,
          end_time: formData.end_time
        }

        const res = await securityShiftService.createShift(payload)
        if (res.success) {
          successCount++
        } else {
          errors.push(`${date}: ${res.error}`)
        }
      }

      if (successCount > 0) {
        showSuccess('Shifts Assigned', `Successfully assigned ${successCount} shift(s).${errors.length > 0 ? `\nFailed: ${errors.length}` : ''}`)
        setFormData({
          security_id: '',
          security_name: '',
          security_role: '',
          shift_type: 'Morning',
          assigned_gate: '',
          selected_dates: [],
          start_time: '06:00',
          end_time: '14:00'
        })
        setView('list')
        loadData()
      } else if (errors.length > 0) {
        showError('Assignment Failed', errors.join('\n'))
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setApproving(false)
    }
  }

  const handleDeleteShift = async (shiftId) => {
    const result = await showConfirm('Delete Shift', 'Are you sure you want to delete this shift? This action cannot be undone.')
    if (!result.isConfirmed) return

    try {
      const res = await securityShiftService.deleteShift(shiftId)
      if (res.success) {
        showSuccess('Shift Deleted', 'The shift has been removed.')
        setShifts(prev => prev.filter(s => s._id !== shiftId))
      } else {
        showError('Delete Failed', res.error)
      }
    } catch (err) {
      showError('Error', err.message)
    }
  }

  // Handle Approve / Reject Emergency Leave
  const handleApproveLeave = (req) => {
    setApproveModal(req)
    setReplacementId('')
  }
  
  const submitApproval = async () => {
    if (!approveModal) return
    setApproving(true)
    try {
      const replacementGuard = securityStaff.find(g => g.id === replacementId)
      const res = await emergencyRequestService.approveRequest(approveModal._id, {
        approved_by: 'Admin', // In real system, pass current user
        replacement_security_id: replacementId || '',
        replacement_employee_id: replacementGuard?.employee_id || 'N/A'
      })
      if (res.success) {
        showSuccess('Request Approved', replacementId ? `Leave approved. Shift reassigned to ${replacementGuard?.name}.` : 'Leave approved without transfer.')
        setApproveModal(null)
        loadData()
      } else {
        showError('Approval Failed', res.error)
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setApproving(false)
    }
  }

  const handleRejectLeave = async (req) => {
    const confirm = await showConfirm('Reject Request', `Reject emergency leave request for this shift?`)
    if (!confirm.isConfirmed) return
    try {
      const res = await emergencyRequestService.rejectRequest(req._id, { approved_by: 'Admin' })
      if (res.success) {
        showSuccess('Rejected', 'The emergency request has been rejected.')
        loadData()
      } else {
        showError('Rejection Failed', res.error)
      }
    } catch (err) {
      showError('Error', err.message)
    }
  }

  // Format time to 12-hour
  const fmt12 = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const statusConfig = {
    'On Duty': {
      badge: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
      dot: 'bg-green-500 animate-pulse',
      icon: <CheckCircle className="w-3.5 h-3.5" />
    },
    'Upcoming': {
      badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
      dot: 'bg-blue-400',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    'Completed': {
      badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600',
      dot: 'bg-gray-400',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    }
  }

  // Calendar Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + direction)
      return next
    })
  }

  const renderCalendar = (isSelectionMode = false) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const monthName = currentDate.toLocaleString('default', { month: 'long' })

    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const toggleDateSelection = (dateStr) => {
      setFormData(prev => {
        const next = [...prev.selected_dates]
        const idx = next.indexOf(dateStr)
        if (idx >= 0) {
          next.splice(idx, 1) // Remove date
        } else {
          next.push(dateStr) // Add date
        }
        return { ...prev, selected_dates: next }
      })
    }

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${isSelectionMode ? 'mt-2' : ''}`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{monthName} {year}</h3>
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border dark:border-gray-700">
              <button 
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500"
              >
                <ChevronLeft className="w-4 h-4" /> 
              </button>
              <button 
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="px-2 py-1 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-600 dark:text-gray-400"
              >
                Today
              </button>
              <button 
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {!isSelectionMode && (
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Shift Assigned</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Emergency</span>
            </div>
          )}
          {isSelectionMode && (
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {formData.selected_dates.length} days selected
            </div>
          )}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
          {weekDays.map(d => (
            <div key={d} className="bg-gray-50 dark:bg-gray-900/40 py-2 text-center text-xs font-bold text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className={`bg-gray-50/30 dark:bg-gray-800/20 ${isSelectionMode ? 'h-16' : 'h-32'}`} />
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayShifts = shifts.filter(s => s.shift_date === dateStr)
            const hasEmergency = !isSelectionMode && emergencyRequests.some(r => r.status === 'pending' && dayShifts.some(s => s._id === r.shift_id))
            const isToday = dateStr === todayStr
            const isSelected = isSelectionMode && formData.selected_dates.includes(dateStr)

            return (
              <div 
                key={day} 
                onClick={() => {
                  if (isSelectionMode) {
                    toggleDateSelection(dateStr)
                  } else {
                    setFormData(prev => ({ ...prev, selected_dates: [dateStr] }))
                    setView('assign')
                  }
                }}
                className={`bg-white dark:bg-gray-800 p-2 ${isSelectionMode ? 'h-16' : 'h-32'} hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer relative group 
                  ${isToday && !isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  ${isSelected ? 'bg-blue-600 dark:bg-blue-600 text-white' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : (isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400')}`}>
                    {day}
                  </span>
                  {hasEmergency && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                </div>

                {!isSelectionMode && (
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-20 scrollbar-hide">
                    {dayShifts.slice(0, 3).map(s => {
                      const firstName = (s.guard_name || 'Officer').split(' ')[0]
                      return (
                        <div key={s._id} className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800/50 truncate">
                          {firstName} • {s.assigned_gate || 'Gate'}
                        </div>
                      )
                    })}
                    {dayShifts.length > 3 && (
                      <div className="text-[9px] font-bold text-gray-400 px-1 text-center">
                        +{dayShifts.length - 3} more
                      </div>
                    )}
                  </div>
                )}
                
                {/* Plus button on hover */}
                {!isSelectionMode && !isToday && (
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 text-blue-500" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-600" />
            Shift Scheduling
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Assign schedules and monitor duty status in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg border dark:border-gray-600">
            <button
              onClick={() => { setViewMode('list'); setView('list'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Table
            </button>
            <button
              onClick={() => { setViewMode('calendar'); setView('list'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Calendar
            </button>
          </div>
          {view === 'list' && (
            <button
              onClick={() => setView('assign')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus className="w-4 h-4" /> Assign New Shift
            </button>
          )}
        </div>
      </div>

      {/* Assign Form */}
      {view === 'assign' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Assign Shift</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Fill in all fields to schedule a guard's duty.</p>
            </div>
            <button
              type="button"
              onClick={() => setView('list')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 transition"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAssignSubmit} className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Security Staff */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Security Staff <span className="text-red-500">*</span>
                </label>
                {securityStaff.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    No security staff found. Add security users from Staff/Security management.
                  </p>
                ) : (
                  <select
                    name="security_id"
                    required
                    value={formData.security_id}
                    onChange={handleAssignChange}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Guard</option>
                    {securityStaff.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.employee_id})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Security Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Security Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    name="security_role"
                    required
                    value={formData.security_role}
                    onChange={handleAssignChange}
                    className="w-full pl-9 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Gate Guard, Patrol, Supervisor..."
                  />
                </div>
              </div>

              {/* Assigned Gate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned Gate / Area <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    name="assigned_gate"
                    required
                    value={formData.assigned_gate}
                    onChange={handleAssignChange}
                    className="w-full pl-9 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Gate A, Gate B, Patrol Area..."
                  />
                </div>
              </div>

              {/* Shift Dates (Multiple) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Shift Dates <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">Click days on the calendar to select multiple dates for this shift assignment.</p>
                {renderCalendar(true)}
              </div>

              {/* Shift Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shift Type
                </label>
                <select
                  name="shift_type"
                  value={formData.shift_type}
                  onChange={handleAssignChange}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Morning">🌅 Morning (6AM–2PM)</option>
                  <option value="Evening">🌇 Evening (2PM–10PM)</option>
                  <option value="Night">🌙 Night (10PM–6AM)</option>
                  <option value="General">📋 General Duty</option>
                </select>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="time"
                    name="start_time"
                    required
                    value={formData.start_time}
                    onChange={handleAssignChange}
                    className="w-full pl-9 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="time"
                    name="end_time"
                    required
                    value={formData.end_time}
                    onChange={handleAssignChange}
                    className="w-full pl-9 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {formData.end_time < formData.start_time && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    🌙 Overnight shift — ends the next day.
                  </p>
                )}
              </div>
            </div>

            {/* Preview */}
            {formData.security_id && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Shift Preview</h4>
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <p>👤 <strong>{securityStaff.find(g => g.id === formData.security_id)?.name || '—'}</strong></p>
                  <p>📍 Gate/Area: <strong>{formData.assigned_gate || '—'}</strong></p>
                  <p>📅 Dates: <strong>{formData.selected_dates.length > 5 
                    ? `${formData.selected_dates.length} days selected` 
                    : (formData.selected_dates.join(', ') || 'None selected')}</strong></p>
                  <p>🕐 Time: <strong>{fmt12(formData.start_time)} – {fmt12(formData.end_time)}</strong></p>
                  <p>🔖 Type: <strong>{formData.shift_type}</strong></p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Assign Shift
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List / Calendar View */}
      {view === 'list' && (
        viewMode === 'calendar' ? renderCalendar() : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-px bg-gray-200 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {tabCounts[tab.id]}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {/* ... (Existing table content) ... */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4 font-semibold">Guard</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Gate / Area</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Time</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 dark:text-gray-400">Loading shift schedule...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredShifts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                          <p className="text-gray-500 dark:text-gray-400">No shifts found for this filter.</p>
                          {activeTab !== 'all' && (
                            <button onClick={() => setActiveTab('all')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                              View all shifts
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredShifts.map(shift => {
                      const guardName = securityStaff.find(g => g.id === shift.security_id)?.name || 'Unknown Guard'
                      const guardInitial = guardName.charAt(0).toUpperCase()
                      const cfg = statusConfig[shift.liveStatus] || statusConfig['Completed']
                      const isToday = shift.shift_date === todayStr

                      return (
                        <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition duration-100">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {guardInitial}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{guardName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{shift.employee_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-medium">{shift.security_role || 'Officer'}</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{shift.shift_type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {shift.assigned_gate}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white">{shift.shift_date}</div>
                            {isToday && (
                              <span className="inline-block mt-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Today
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white font-mono text-xs">
                              {fmt12(shift.start_time)} – {fmt12(shift.end_time)}
                            </div>
                            {shift.end_time < shift.start_time && (
                              <div className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">Overnight</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                              {shift.liveStatus}
                            </span>
                            {(() => {
                              const emReq = emergencyRequests.find(r => r.shift_id === shift._id && r.status === 'pending');
                              if (emReq) return (
                                <div className="mt-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse whitespace-nowrap">
                                    <AlertTriangle className="w-3 h-3" /> EMERGENCY LEAVE
                                  </span>
                                </div>
                              );
                              return null;
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {(() => {
                              const pendingReq = emergencyRequests.find(r => r.shift_id === shift._id && r.status === 'pending');
                              if (pendingReq) {
                                return (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => handleApproveLeave(pendingReq)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition" title="Approve Leave">
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleRejectLeave(pendingReq)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition" title="Reject Leave">
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              }
                              return (
                                <button
                                  onClick={() => handleDeleteShift(shift._id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                  title="Delete shift"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            {!loading && filteredShifts.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>Showing {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {tabCounts['On Duty']} On Duty</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> {tabCounts['Upcoming']} Upcoming</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span> {tabCounts['Completed']} Completed</span>
                </span>
              </div>
            )}
          </div>
        )
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setApproveModal(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6" /> Approve Emergency Leave
              </h3>
              <p className="text-green-100 text-sm mt-1">
                For: <strong>{approveModal.guard_name}</strong> ({approveModal.employee_id})
              </p>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  Reason: {approveModal.reason}
                </p>
                {approveModal.message && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">{approveModal.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Assign Replacement Guard <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={replacementId}
                  onChange={e => setReplacementId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">— No replacement (approve without transfer) —</option>
                  {securityStaff
                    .filter(g => g.id !== approveModal.security_id)
                    .map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.employee_id})</option>
                    ))}
                </select>
                {replacementId && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    A new shift for the same gate & time will be created.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitApproval}
                disabled={approving}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                {approving ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityShiftManagement
