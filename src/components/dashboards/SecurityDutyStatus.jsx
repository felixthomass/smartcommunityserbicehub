import React, { useState, useEffect } from 'react'
import { Clock, MapPin, Shield, AlertTriangle, X, ChevronDown, CheckCircle2, Send, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { securityShiftService } from '../../services/securityShiftService'
import { emergencyRequestService } from '../../services/emergencyRequestService'
import { showError, showSuccess } from '../../utils/sweetAlert'

const REASONS = [
  { value: 'medical', label: '🏥 Medical Emergency' },
  { value: 'family', label: '👨‍👩‍👧 Family Emergency' },
  { value: 'accident', label: '🚨 Accident' },
  { value: 'personal', label: '🧑 Personal Emergency' },
  { value: 'other', label: '📋 Other' }
]

const SecurityDutyStatus = ({ user }) => {
  const [currentShift, setCurrentShift] = useState(null)
  const [allShifts, setAllShifts] = useState([])
  const [liveStatus, setLiveStatus] = useState('Checking...')
  const [loading, setLoading] = useState(true)

  // Emergency leave modal state
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ reason: 'medical', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [existingRequest, setExistingRequest] = useState(null)
  
  // Tab and Calendar state
  const [activeTab, setActiveTab] = useState('present') // 'present', 'calendar', 'upcoming', 'history'
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const computeStatus = (shiftDate, startTime, endTime) => {
    const now = new Date()
    const startDateTime = new Date(`${shiftDate}T${startTime}:00`)
    let endDateTime = new Date(`${shiftDate}T${endTime}:00`)
    if (endDateTime < startDateTime) endDateTime.setDate(endDateTime.getDate() + 1)
    if (now < startDateTime) return 'Upcoming'
    if (now >= startDateTime && now <= endDateTime) return 'Present Shift'
    return 'Completed'
  }

  useEffect(() => {
    const loadShift = async () => {
      if (!user?.id) return
      try {
        const res = await securityShiftService.getShiftsForUser(user.id)
          if (res.success && res.shifts.length > 0) {
            const processedShifts = res.shifts.map(s => ({
              ...s,
              computedStatus: computeStatus(s.shift_date, s.start_time, s.end_time)
            }))
            
            // Sort by date/time (newest first for history, but we'll show upcoming separately)
            processedShifts.sort((a, b) => new Date(`${b.shift_date}T${b.start_time}:00`) - new Date(`${a.shift_date}T${a.start_time}:00`))
            setAllShifts(processedShifts)

            const active = processedShifts.find(s => s.computedStatus === 'Present Shift')
            if (active) {
              setCurrentShift(active)
              setLiveStatus('Present Shift')
            } else {
              const upcoming = [...processedShifts]
                .filter(s => s.computedStatus === 'Upcoming')
                .sort((a, b) => new Date(`${a.shift_date}T${a.start_time}:00`) - new Date(`${b.shift_date}T${b.start_time}:00`))
              
              if (upcoming.length > 0) {
                setCurrentShift(upcoming[0])
                setLiveStatus('Upcoming')
              } else {
                setCurrentShift(processedShifts[0])
                setLiveStatus('Completed')
              }
            }
          }
      } catch (err) {
        showError('Error', err.message)
      } finally {
        setLoading(false)
      }
    }
    loadShift()
  }, [user])

  // Load existing emergency request for current shift
  useEffect(() => {
    if (!currentShift || !user?.id) return
    emergencyRequestService.getMyRequests(user.id).then(res => {
      if (res.success) {
        const req = res.requests.find(r => r.shift_id === currentShift._id && r.status !== 'rejected')
        setExistingRequest(req || null)
      }
    }).catch(() => {})
  }, [currentShift, user])

  // Timer to auto-update status
  useEffect(() => {
    if (!currentShift) return
    const timer = setInterval(() => {
      const newStatus = computeStatus(currentShift.shift_date, currentShift.start_time, currentShift.end_time)
      if (newStatus !== liveStatus) {
        setLiveStatus(newStatus)
        if (newStatus === 'Present Shift' || newStatus === 'Completed') {
          securityShiftService.logDutyStatus({
            security_id: user.id,
            shift_id: currentShift._id,
            status: newStatus
          }).catch(console.error)
        }
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [currentShift, liveStatus, user.id])

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    if (!form.reason) return showError('Required', 'Please select a reason.')
    setSubmitting(true)
    try {
      const res = await emergencyRequestService.createRequest({
        security_id: user.id,
        shift_id: currentShift._id,
        employee_id: currentShift.employee_id,
        guard_name: user.name || user.email,
        reason: form.reason,
        message: form.message
      })
      if (res.success) {
        showSuccess('Request Submitted', 'Your emergency leave request has been sent to the admin.')
        setExistingRequest(res.request)
        setShowModal(false)
        setForm({ reason: 'medical', message: '' })
      } else {
        showError('Submission Failed', res.error)
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fmt12 = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  // Calendar Helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }
    // Add days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const shiftsOnDate = (date) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return allShifts.filter(s => s.shift_date === dateStr)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6 flex items-center justify-center min-h-[160px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!currentShift) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6 text-center">
        <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Shifts Assigned</h3>
        <p className="text-gray-500 text-sm mt-1">You currently have no scheduled shifts.</p>
      </div>
    )
  }

  const requestStatusConfig = {
    pending: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: '⏳ Pending Admin Review' },
    approved: { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: '✅ Leave Approved' }
  }
  const reqCfg = existingRequest ? requestStatusConfig[existingRequest.status] : null

  const renderShiftCard = (shift) => {
    const isCurrent = currentShift && shift._id === currentShift._id
    const status = shift.computedStatus
    
    return (
      <div 
        key={shift._id}
        className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition shadow-sm hover:shadow-md ${
          isCurrent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-100 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              status === 'Present Shift' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
              status === 'Upcoming' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
              'bg-gray-100 text-gray-500 dark:bg-gray-700'
            }`}>
              {status === 'Present Shift' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 dark:text-white">{shift.assigned_gate}</span>
                <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                  status === 'Present Shift' ? 'bg-green-500 text-white' :
                  status === 'Upcoming' ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {status}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {shift.shift_date} · {fmt12(shift.start_time)} – {fmt12(shift.end_time)}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{shift.shift_type}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{shift.security_role}</div>
          </div>
        </div>
      </div>
    )
  }

  const renderCalendarView = () => {
    const days = getDaysInMonth(currentMonth)
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-bold text-gray-900 dark:text-white">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>
          <div className="flex gap-2">
            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dateShifts = shiftsOnDate(day)
            const isToday = day && day.toDateString() === new Date().toDateString()
            
            return (
              <div key={i} className={`min-h-[80px] p-1 border border-gray-50 dark:border-gray-700/50 rounded-lg ${day ? 'bg-gray-50/50 dark:bg-gray-900/30' : 'opacity-0'}`}>
                {day && (
                  <>
                    <div className={`text-[10px] font-bold mb-1 ${isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center mx-auto' : 'text-gray-500'}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dateShifts.map(s => (
                        <div key={s._id} className={`text-[8px] p-1 rounded leading-tight truncate ${
                          s.computedStatus === 'Present Shift' ? 'bg-green-100 text-green-700 border border-green-200' :
                          s.computedStatus === 'Upcoming' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-gray-200 text-gray-600 border border-gray-300'
                        }`}>
                          {s.assigned_gate}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderHistoryView = () => {
    const history = allShifts.filter(s => s.computedStatus === 'Completed')
    return (
      <div className="grid grid-cols-1 gap-3">
        {history.length > 0 ? (
          history.map(renderShiftCard)
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 font-medium text-gray-500">
            No completed shifts found in history.
          </div>
        )}
      </div>
    )
  }

  const renderPresentView = () => {
    const present = allShifts.filter(s => s.computedStatus === 'Present Shift')
    return (
      <div className="grid grid-cols-1 gap-3">
        {present.length > 0 ? (
          present.map(renderShiftCard)
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 font-medium text-gray-500">
            You are not currently on duty for any shift.
          </div>
        )}
      </div>
    )
  }

  const renderUpcomingView = () => {
    const upcoming = allShifts.filter(s => s.computedStatus === 'Upcoming')
    return (
      <div className="grid grid-cols-1 gap-3">
        {upcoming.length > 0 ? (
          upcoming.map(renderShiftCard)
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No upcoming shifts scheduled.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl shadow-xl p-6 mb-8 relative overflow-hidden text-white">
        {/* BG Graphic */}
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
          <Shield className="w-48 h-48" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Security Duty Status</h2>
              <p className="text-blue-200 text-sm">
                <span className="opacity-80">Employee ID:</span> {currentShift.employee_id}
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex flex-col items-end gap-2">
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                liveStatus === 'Present Shift' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                liveStatus === 'Upcoming' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {liveStatus === 'Present Shift' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>}
                {liveStatus}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/5">
              <div className="text-blue-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Assigned Gate
              </div>
              <div className="font-semibold text-lg">{currentShift.assigned_gate}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/5">
              <div className="text-blue-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Shift Type
              </div>
              <div className="font-semibold text-lg">{currentShift.shift_type}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/5">
              <div className="text-blue-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Schedule Time
              </div>
              <div className="font-semibold text-lg">{fmt12(currentShift.start_time)} – {fmt12(currentShift.end_time)}</div>
              <div className="text-xs text-blue-300 mt-0.5">{currentShift.shift_date}</div>
            </div>
          </div>

          {/* Emergency Leave Section */}
          {existingRequest && reqCfg ? (
            <div className={`rounded-xl p-3 border flex items-center gap-3 ${reqCfg.color}`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{reqCfg.label}</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Reason: {REASONS.find(r => r.value === existingRequest.reason)?.label || existingRequest.reason}
                </p>
              </div>
            </div>
          ) : (liveStatus === 'Present Shift' || liveStatus === 'Upcoming') && (
            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 hover:text-red-200 rounded-lg text-sm font-medium transition group"
              >
                <AlertTriangle className="w-4 h-4 group-hover:animate-pulse" />
                Request Emergency Leave
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" /> Emergency Leave Request
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-white/10 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-red-100 text-sm mt-1">
                Your shift: <strong>{currentShift.assigned_gate}</strong> · {fmt12(currentShift.start_time)} – {fmt12(currentShift.end_time)}
              </p>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-5 space-y-5">
              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {REASONS.map(r => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        form.reason === r.value
                          ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={form.reason === r.value}
                        onChange={() => setForm(f => ({ ...f, reason: r.value }))}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className={`text-sm font-medium ${form.reason === r.value ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Additional Details <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Describe the situation briefly..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                />
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your request will be reviewed by the admin. Do not leave your post until the request is approved.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition flex items-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Request</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs / Content Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveTab('present')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'present' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Present Shift
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'calendar' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar View
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'upcoming' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Shield className="w-4 h-4" />
              Upcoming Shifts
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'history' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Shift History
            </button>
          </div>
          
          <div className="hidden md:block">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
              Total {allShifts.length} Shifts
            </span>
          </div>
        </div>

        <div className="transition-all duration-300">
          {activeTab === 'present' && renderPresentView()}
          {activeTab === 'calendar' && renderCalendarView()}
          {activeTab === 'upcoming' && renderUpcomingView()}
          {activeTab === 'history' && renderHistoryView()}
        </div>
      </div>
    </>
  )
}

export default SecurityDutyStatus
