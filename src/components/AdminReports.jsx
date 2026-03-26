import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3, Download, Calendar, Users, CreditCard, MessageSquare,
  TrendingUp, FileText, Bell, CheckCircle, Clock, AlertTriangle,
  Building2, Shield, Truck, Activity, ArrowUpRight, PieChart
} from 'lucide-react'
import { mongoService } from '../services/mongoService'
import { complaintService } from '../services/complaintService'
import { announcementService } from '../services/announcementService'
import { monthlyFeeService } from '../services/monthlyFeeService'

const DonutChart = ({ segments = [], size = 130, strokeWidth = 14 }) => {
  const total = segments.reduce((s, d) => s + d.value, 0)
  const r = size / 2 - strokeWidth / 2 - 4
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-gray-700" />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0
        const dash = pct * circ
        const gap = segments.filter(s => s.value > 0).length > 1 ? 4 : 0
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${Math.max(dash - gap, 0)} ${circ - Math.max(dash - gap, 0)}`} strokeDashoffset={-offset}
            className="transition-all duration-700" strokeLinecap="round" />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

const StatCard = ({ icon: Icon, label, value, subtitle, color, bg }) => (
  <div className={`${bg} rounded-2xl p-5 border border-gray-100 dark:border-gray-700`}>
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </div>
    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">{value}</div>
    {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
  </div>
)

const AdminReports = ({ user, staffList = [] }) => {
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    residents: [],
    visitors: [],
    complaints: [],
    serviceRequests: [],
    announcements: [],
    fee: null
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const results = {}

      try {
        const res = await mongoService.getAdminResidentEntries?.()
        results.residents = res?.success ? (res.data || []) : []
      } catch { results.residents = [] }

      try {
        const res = await mongoService.getVisitorLogs({})
        results.visitors = res?.success ? (res.data?.data || []) : []
      } catch { results.visitors = [] }

      try {
        const res = await complaintService.listComplaints(user?.id)
        results.complaints = res?.complaints || []
      } catch { results.complaints = [] }

      try {
        const res = await mongoService.listServiceRequests({ limit: 200 })
        results.serviceRequests = res?.success ? (res.data || []) : []
      } catch { results.serviceRequests = [] }

      try {
        const res = await announcementService.getAnnouncementStats(user?.role)
        results.announcements = res?.success ? res.data : {}
      } catch { results.announcements = {} }

      try {
        const res = await monthlyFeeService.getFee()
        results.fee = res?.success ? res.data : null
      } catch { results.fee = null }

      setData(results)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const filterByPeriod = useCallback((items, dateField = 'createdAt') => {
    const now = new Date()
    const start = new Date()
    if (period === 'today') start.setHours(0, 0, 0, 0)
    else if (period === 'week') start.setDate(now.getDate() - 7)
    else start.setMonth(now.getMonth() - 1)
    return items.filter(i => {
      const d = new Date(i[dateField] || i.entryTime || i.createdAt)
      return d >= start
    })
  }, [period])

  const report = useMemo(() => {
    const visitors = filterByPeriod(data.visitors, 'entryTime')
    const complaints = filterByPeriod(data.complaints)
    const serviceRequests = filterByPeriod(data.serviceRequests)

    const complaintsByStatus = { open: 0, resolved: 0, in_progress: 0 }
    complaints.forEach(c => { complaintsByStatus[c.status || 'open'] = (complaintsByStatus[c.status || 'open'] || 0) + 1 })

    const srByStatus = { created: 0, assigned: 0, in_progress: 0, completed: 0, verified: 0 }
    serviceRequests.forEach(r => { srByStatus[r.status || 'created'] = (srByStatus[r.status || 'created'] || 0) + 1 })

    const srByCategory = {}
    serviceRequests.forEach(r => { srByCategory[r.category || 'Other'] = (srByCategory[r.category || 'Other'] || 0) + 1 })

    const buildingResidents = {}
    data.residents.forEach(r => { buildingResidents[r.building || '?'] = (buildingResidents[r.building || '?'] || 0) + 1 })

    const complaintsByCategory = {}
    complaints.forEach(c => { complaintsByCategory[c.category || 'general'] = (complaintsByCategory[c.category || 'general'] || 0) + 1 })

    return {
      totalResidents: data.residents.length,
      totalVisitors: visitors.length,
      totalComplaints: complaints.length,
      totalServiceRequests: serviceRequests.length,
      totalStaff: staffList.length,
      totalAnnouncements: data.announcements?.totalAnnouncements || 0,
      complaintsByStatus,
      srByStatus,
      srByCategory,
      buildingResidents,
      complaintsByCategory,
      feeAmount: data.fee?.amount || 0
    }
  }, [data, filterByPeriod, staffList])

  const handleExport = () => {
    const exportData = {
      reportPeriod: period,
      generatedAt: new Date().toISOString(),
      generatedBy: user?.name || 'Admin',
      ...report,
      rawData: { residentCount: data.residents.length, visitorCount: data.visitors.length }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin_report_${period}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const complaintDonut = [
    { value: report.complaintsByStatus.open || 0, color: '#ef4444', label: 'Open' },
    { value: report.complaintsByStatus.in_progress || 0, color: '#f59e0b', label: 'In Progress' },
    { value: report.complaintsByStatus.resolved || 0, color: '#22c55e', label: 'Resolved' }
  ]

  const srDonut = [
    { value: report.srByStatus.created || 0, color: '#6366f1', label: 'Created' },
    { value: report.srByStatus.assigned || 0, color: '#f59e0b', label: 'Assigned' },
    { value: report.srByStatus.in_progress || 0, color: '#3b82f6', label: 'In Progress' },
    { value: report.srByStatus.completed || 0, color: '#22c55e', label: 'Completed' },
    { value: report.srByStatus.verified || 0, color: '#10b981', label: 'Verified' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Reports</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Community analytics & insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              {['today', 'week', 'month'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${period === p
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Residents" value={report.totalResidents} subtitle="Registered" color="text-blue-500" bg="bg-white dark:bg-gray-800" />
        <StatCard icon={Shield} label="Staff" value={report.totalStaff} subtitle="Active" color="text-emerald-500" bg="bg-white dark:bg-gray-800" />
        <StatCard icon={Users} label="Visitors" value={report.totalVisitors} subtitle={`This ${period}`} color="text-violet-500" bg="bg-white dark:bg-gray-800" />
        <StatCard icon={MessageSquare} label="Complaints" value={report.totalComplaints} subtitle={`This ${period}`} color="text-orange-500" bg="bg-white dark:bg-gray-800" />
        <StatCard icon={FileText} label="Service Req." value={report.totalServiceRequests} subtitle={`This ${period}`} color="text-rose-500" bg="bg-white dark:bg-gray-800" />
        <StatCard icon={Bell} label="Announcements" value={report.totalAnnouncements} subtitle="Total" color="text-cyan-500" bg="bg-white dark:bg-gray-800" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complaints */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Complaints by Status</h4>
          <div className="flex items-center gap-6">
            <div className="relative">
              <DonutChart segments={complaintDonut} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{report.totalComplaints}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {complaintDonut.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{s.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Service Requests by Status</h4>
          <div className="flex items-center gap-6">
            <div className="relative">
              <DonutChart segments={srDonut} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{report.totalServiceRequests}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {srDonut.filter(s => s.value > 0).map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{s.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Building Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Residents by Building</h4>
          <div className="space-y-3">
            {Object.entries(report.buildingResidents).sort((a, b) => b[1] - a[1]).map(([building, count]) => {
              const pct = report.totalResidents > 0 ? Math.round((count / report.totalResidents) * 100) : 0
              return (
                <div key={building}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Building2 className="w-3 h-3" /> Building {building}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(report.buildingResidents).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No resident data available</p>
            )}
          </div>
        </div>

        {/* Service Request Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Service Request Categories</h4>
          <div className="space-y-3">
            {Object.entries(report.srByCategory).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, count]) => {
              const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
              const pct = report.totalServiceRequests > 0 ? Math.round((count / report.totalServiceRequests) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[Object.keys(report.srByCategory).indexOf(cat) % colors.length]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(report.srByCategory).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No service request data</p>
            )}
          </div>
        </div>
      </div>

      {/* Complaint Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Complaint Categories</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(report.complaintsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div key={cat} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{cat}</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{count}</span>
            </div>
          ))}
          {Object.keys(report.complaintsByCategory).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4 col-span-4">No complaint data</p>
          )}
        </div>
      </div>

      {/* Monthly Fee Info */}
      {report.feeAmount > 0 && (
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-200 text-sm">Monthly Fee Configured</p>
              <p className="text-3xl font-bold mt-1">₹{report.feeAmount.toLocaleString()}</p>
              <p className="text-violet-200 text-sm mt-1">
                Expected Revenue: ₹{(report.feeAmount * report.totalResidents).toLocaleString()}/month
              </p>
            </div>
            <CreditCard className="w-16 h-16 text-white/20" />
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReports
