import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3, TrendingUp, Download, Calendar, Users, Shield, Clock,
  Eye, CheckCircle, AlertTriangle, Building, UserCheck, Truck, Filter,
  ArrowUpRight, ArrowDownRight, PieChart, Activity
} from 'lucide-react'
import { mongoService } from '../services/mongoService'
import { deliveryService } from '../services/deliveryService'

const ProgressBar = ({ value, max, color = 'bg-blue-500', label, showPercent = true }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white">{showPercent ? `${pct}%` : value}</span>
        </div>
      )}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const DonutChart = ({ segments = [], size = 120 }) => {
  const total = segments.reduce((s, d) => s + d.value, 0)
  const r = size / 2 - 8
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-100 dark:text-gray-700" />
      {segments.map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0
        const dash = pct * circ
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color} strokeWidth="12"
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
            className="transition-all duration-700" strokeLinecap="round" />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

const SecurityReports = ({ user }) => {
  const [period, setPeriod] = useState('week') // today, week, month
  const [loading, setLoading] = useState(true)
  const [visitorData, setVisitorData] = useState({ logs: [], stats: {} })
  const [deliveryData, setDeliveryData] = useState({ logs: [], stats: {} })
  const [incidentData, setIncidentData] = useState([])

  const loadReportData = useCallback(async () => {
    setLoading(true)
    try {
      // Load visitors
      let vLogs = [], vStats = {}
      try {
        const [logsRes, statsRes] = await Promise.all([
          mongoService.getVisitorLogs({}),
          mongoService.getVisitorStats('today')
        ])
        vLogs = logsRes?.success ? (logsRes.data?.data || []) : []
        vStats = statsRes?.success ? statsRes.data : {}
      } catch {}

      // Load deliveries
      let dLogs = [], dStats = {}
      try {
        const [logsRes, statsRes] = await Promise.all([
          deliveryService.getDeliveryLogs({ limit: 200 }),
          deliveryService.getDeliveryStats({ period: 'day' })
        ])
        dLogs = logsRes?.success ? (logsRes.data || []) : []
        dStats = statsRes?.success ? statsRes.data : {}
      } catch {}

      // Load incidents from localStorage
      let incidents = []
      try {
        incidents = JSON.parse(localStorage.getItem('security_incidents') || '[]')
      } catch {}

      setVisitorData({ logs: vLogs, stats: vStats })
      setDeliveryData({ logs: dLogs, stats: dStats })
      setIncidentData(incidents)
    } catch (e) {
      console.error('Report data load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReportData() }, [loadReportData])

  const filterByPeriod = useCallback((items, dateField = 'createdAt') => {
    const now = new Date()
    const start = new Date()
    if (period === 'today') start.setHours(0, 0, 0, 0)
    else if (period === 'week') start.setDate(now.getDate() - 7)
    else start.setMonth(now.getMonth() - 1)
    return items.filter(i => new Date(i[dateField] || i.entryTime || i.deliveryTime || i.createdAt) >= start)
  }, [period])

  const visitorReport = useMemo(() => {
    const filtered = filterByPeriod(visitorData.logs, 'entryTime')
    const checkedIn = filtered.filter(v => v.status === 'checked_in').length
    const checkedOut = filtered.filter(v => v.status === 'checked_out').length
    const purposes = {}
    filtered.forEach(v => { purposes[v.purpose || 'Other'] = (purposes[v.purpose || 'Other'] || 0) + 1 })
    const buildings = {}
    filtered.forEach(v => {
      const b = v.hostFlat?.charAt(0) || 'Unknown'
      buildings[b] = (buildings[b] || 0) + 1
    })
    const hourly = Array(24).fill(0)
    filtered.forEach(v => {
      const h = new Date(v.entryTime || v.createdAt).getHours()
      hourly[h]++
    })
    return { total: filtered.length, checkedIn, checkedOut, purposes, buildings, hourly }
  }, [visitorData.logs, filterByPeriod])

  const deliveryReport = useMemo(() => {
    const filtered = filterByPeriod(deliveryData.logs, 'deliveryTime')
    const vendors = {}
    filtered.forEach(d => { vendors[d.vendor || 'Unknown'] = (vendors[d.vendor || 'Unknown'] || 0) + 1 })
    const statuses = { delivered: 0, accepted: 0, failed: 0, pending: 0 }
    filtered.forEach(d => { statuses[d.status || 'pending'] = (statuses[d.status || 'pending'] || 0) + 1 })
    return { total: filtered.length, vendors, statuses }
  }, [deliveryData.logs, filterByPeriod])

  const incidentReport = useMemo(() => {
    const filtered = filterByPeriod(incidentData)
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
    const byCategory = {}
    const byStatus = { reported: 0, investigating: 0, resolved: 0, closed: 0 }
    filtered.forEach(i => {
      bySeverity[i.severity || 'medium']++
      byCategory[i.category || 'Other'] = (byCategory[i.category || 'Other'] || 0) + 1
      byStatus[i.status || 'reported']++
    })
    return { total: filtered.length, bySeverity, byCategory, byStatus }
  }, [incidentData, filterByPeriod])

  const handleExport = () => {
    const data = {
      reportPeriod: period,
      generatedAt: new Date().toISOString(),
      generatedBy: user?.name || 'Security',
      visitors: visitorReport,
      deliveries: deliveryReport,
      incidents: incidentReport
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security_report_${period}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const visitorDonut = [
    { value: visitorReport.checkedIn, color: '#22c55e', label: 'Checked In' },
    { value: visitorReport.checkedOut, color: '#3b82f6', label: 'Checked Out' }
  ]

  const deliveryDonut = [
    { value: deliveryReport.statuses.delivered, color: '#3b82f6', label: 'Delivered' },
    { value: deliveryReport.statuses.accepted, color: '#22c55e', label: 'Accepted' },
    { value: deliveryReport.statuses.failed, color: '#ef4444', label: 'Failed' },
    { value: deliveryReport.statuses.pending, color: '#f59e0b', label: 'Pending' }
  ]

  const incidentDonut = [
    { value: incidentReport.bySeverity.critical, color: '#ef4444', label: 'Critical' },
    { value: incidentReport.bySeverity.high, color: '#f97316', label: 'High' },
    { value: incidentReport.bySeverity.medium, color: '#eab308', label: 'Medium' },
    { value: incidentReport.bySeverity.low, color: '#3b82f6', label: 'Low' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Security Reports</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive security analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              {['today', 'week', 'month'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${period === p
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-5 h-5 text-green-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Visitors</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{visitorReport.total}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{visitorReport.checkedIn} in • {visitorReport.checkedOut} out</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Deliveries</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{deliveryReport.total}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{deliveryReport.statuses.delivered} delivered • {deliveryReport.statuses.accepted} accepted</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Incidents</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{incidentReport.total}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{incidentReport.bySeverity.critical} critical • {incidentReport.byStatus.resolved} resolved</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitor Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Visitor Status</h4>
          <div className="flex items-center gap-6">
            <div className="relative">
              <DonutChart segments={visitorDonut} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{visitorReport.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {visitorDonut.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{s.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Delivery Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Delivery Status</h4>
          <div className="flex items-center gap-6">
            <div className="relative">
              <DonutChart segments={deliveryDonut} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{deliveryReport.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {deliveryDonut.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{s.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visitor Purpose Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Visitor Purposes</h4>
          <div className="space-y-3">
            {Object.entries(visitorReport.purposes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([purpose, count]) => (
              <ProgressBar key={purpose} value={count} max={visitorReport.total} color="bg-green-500" label={`${purpose} (${count})`} />
            ))}
            {Object.keys(visitorReport.purposes).length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No visitor data for this period</p>
            )}
          </div>
        </div>

        {/* Incident Severity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Incident Severity</h4>
          <div className="flex items-center gap-6">
            <div className="relative">
              <DonutChart segments={incidentDonut} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{incidentReport.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {incidentDonut.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{s.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Delivery Vendors */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Top Delivery Vendors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(deliveryReport.vendors).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([vendor, count]) => (
            <div key={vendor} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{vendor}</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
            </div>
          ))}
          {Object.keys(deliveryReport.vendors).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 col-span-2">No delivery data for this period</p>
          )}
        </div>
      </div>

      {/* Hourly Traffic */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Visitor Traffic by Hour</h4>
        <div className="flex items-end gap-1 h-32">
          {visitorReport.hourly.map((count, hour) => {
            const max = Math.max(...visitorReport.hourly, 1)
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full bg-indigo-500/80 hover:bg-indigo-600 rounded-t transition-all cursor-pointer"
                  style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? '4px' : '0' }} />
                <span className="text-[9px] text-gray-400">{hour}h</span>
                {/* Tooltip */}
                <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {count} visitors
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SecurityReports
