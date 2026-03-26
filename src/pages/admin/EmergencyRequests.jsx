import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, CheckCircle, XCircle, Clock, Shield,
  Users, ChevronDown, RefreshCw, AlertCircle, User
} from 'lucide-react'
import { emergencyRequestService } from '../../services/emergencyRequestService'
import { securityShiftService } from '../../services/securityShiftService'
import { authService, USER_ROLES } from '../../services/authService'
import { securityStaffService } from '../../services/securityStaffService'
import { showSuccess, showError, showConfirm } from '../../utils/sweetAlert'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  approved: {
    label: 'Approved',
    badge: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    icon: <CheckCircle className="w-3.5 h-3.5" />
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    icon: <XCircle className="w-3.5 h-3.5" />
  }
}

const REASON_LABELS = {
  'medical': '🏥 Medical Emergency',
  'family': '👨‍👩‍👧 Family Emergency',
  'accident': '🚨 Accident',
  'personal': '🧑 Personal Emergency',
  'other': '📋 Other'
}

const EmergencyRequests = ({ user }) => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  // Approve modal state
  const [approveModal, setApproveModal] = useState(null) // holds the request being approved
  const [securityStaff, setSecurityStaff] = useState([])
  const [replacementId, setReplacementId] = useState('')
  const [approving, setApproving] = useState(false)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await emergencyRequestService.getAllRequests()
      if (res.success) setRequests(res.requests)
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSecurityStaff = async () => {
    try {
      const authResult = await authService.getStaffUsers()
      if (authResult.success) {
        const guards = authResult.users.filter(u => u.role === USER_ROLES.SECURITY)
        const jobResult = await securityStaffService.getAllStaff()
        const jobMap = {}
        if (jobResult.success) jobResult.staff.forEach(s => { jobMap[s.user_id] = s })
        setSecurityStaff(guards.map(g => ({
          ...g,
          employee_id: jobMap[g.id]?.employee_id || 'N/A'
        })))
      }
    } catch (err) {
      console.error('Failed to load security staff', err)
    }
  }

  useEffect(() => {
    loadRequests()
    loadSecurityStaff()
  }, [])

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus)

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  }

  const handleApprove = (req) => {
    setApproveModal(req)
    setReplacementId('')
  }

  const submitApproval = async () => {
    if (!approveModal) return
    setApproving(true)
    try {
      const replacementGuard = securityStaff.find(g => g.id === replacementId)
      const res = await emergencyRequestService.approveRequest(approveModal._id, {
        approved_by: user?.name || user?.email || 'Admin',
        replacement_security_id: replacementId || '',
        replacement_employee_id: replacementGuard?.employee_id || 'N/A'
      })
      if (res.success) {
        showSuccess(
          'Request Approved',
          replacementId
            ? `Emergency leave approved. A new shift has been assigned to ${replacementGuard?.name}.`
            : 'Emergency leave approved. No replacement assigned.'
        )
        setApproveModal(null)
        loadRequests()
      } else {
        showError('Approval Failed', res.error)
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (req) => {
    const confirm = await showConfirm('Reject Request', `Reject emergency leave request from ${req.guard_name || 'this guard'}?`)
    if (!confirm.isConfirmed) return
    try {
      const res = await emergencyRequestService.rejectRequest(req._id, {
        approved_by: user?.name || user?.email || 'Admin'
      })
      if (res.success) {
        showSuccess('Rejected', 'The emergency request has been rejected.')
        loadRequests()
      } else {
        showError('Rejection Failed', res.error)
      }
    } catch (err) {
      showError('Error', err.message)
    }
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            Emergency Requests
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and act on guard emergency leave requests.
          </p>
        </div>
        <button
          onClick={loadRequests}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'all', label: 'Total', color: 'blue' },
          { key: 'pending', label: 'Pending', color: 'amber' },
          { key: 'approved', label: 'Approved', color: 'green' },
          { key: 'rejected', label: 'Rejected', color: 'red' }
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`p-4 rounded-xl border text-left transition ${
              filterStatus === key
                ? `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-200 dark:border-${color}-800 ring-2 ring-${color}-400/40`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className={`text-2xl font-bold ${
              filterStatus === key ? `text-${color}-700 dark:text-${color}-300` : 'text-gray-900 dark:text-white'
            }`}>{counts[key]}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading requests...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No {filterStatus !== 'all' ? filterStatus : ''} requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
            const isExpanded = expandedId === req._id

            return (
              <div
                key={req._id}
                className={`bg-white dark:bg-gray-800 rounded-xl border transition ${
                  req.status === 'pending'
                    ? 'border-amber-200 dark:border-amber-800 shadow-sm shadow-amber-100 dark:shadow-none'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Card Header */}
                <div
                  className="flex items-start justify-between p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : req._id)}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(req.guard_name || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{req.guard_name || 'Unknown Guard'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{req.employee_id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {req.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
                            Action Required
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium">{REASON_LABELS[req.reason] || req.reason}</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Requested: {fmt(req.requested_at)}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4">
                    {/* Message */}
                    {req.message && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Message</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{req.message}</p>
                      </div>
                    )}

                    {/* Shift info */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p>Shift ID: <span className="font-mono text-gray-700 dark:text-gray-300">{req.shift_id}</span></p>
                      {req.resolved_at && <p>Resolved: {fmt(req.resolved_at)}</p>}
                      {req.approved_by && <p>Action by: <span className="font-medium text-gray-700 dark:text-gray-300">{req.approved_by}</span></p>}
                      {req.replacement_security_id && <p>Replacement Guard ID: <span className="font-mono text-green-600 dark:text-green-400">{req.replacement_security_id}</span></p>}
                    </div>

                    {/* Action buttons for pending */}
                    {req.status === 'pending' && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleApprove(req)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setApproveModal(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6" /> Approve Emergency Leave
              </h3>
              <p className="text-green-100 text-sm mt-1">
                For: <strong>{approveModal.guard_name}</strong> ({approveModal.employee_id})
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Request Summary */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  {REASON_LABELS[approveModal.reason] || approveModal.reason}
                </p>
                {approveModal.message && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">{approveModal.message}</p>
                )}
              </div>

              {/* Replacement Guard Selection */}
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
                    A new shift for the same gate & time will be created for the selected guard.
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
                {approving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirm Approval</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmergencyRequests
