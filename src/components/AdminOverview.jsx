import { useState, useEffect, useCallback } from 'react'
import {
  Users, Shield, CreditCard, MessageSquare, Bell, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, ArrowUpRight, Activity, Building2,
  UserCheck, FileText, Truck, Eye, BarChart3, Zap, Calendar, Star, Brain, Sparkles, MapPin
} from 'lucide-react'
import { mongoService } from '../services/mongoService'
import { notificationService } from '../services/notificationService'
import { complaintService } from '../services/complaintService'
import { announcementService } from '../services/announcementService'
import { monthlyFeeService } from '../services/monthlyFeeService'
import { aiService } from '../services/aiService'
import { securityShiftService } from '../services/securityShiftService'
import { authService } from '../services/authService'

const AnimatedCounter = ({ value, duration = 1500 }) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!value) return
    let start = 0
    const end = parseInt(value)
    if (start === end) return
    const timer = setInterval(() => {
      start += Math.ceil(end / (duration / 30))
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(start)
    }, 30)
    return () => clearInterval(timer)
  }, [value, duration])
  return <span>{count}</span>
}

const MiniBarChart = ({ data = [], color = '#3b82f6' }) => {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm min-w-[3px] transition-all duration-500"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.5 + (i / data.length) * 0.5 }} />
      ))}
    </div>
  )
}

const AIDailyBriefing = ({ stats, recentActivity }) => {
  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(false)

  const generateBriefing = async () => {
    if (!stats.totalResidents) return
    setLoading(true)
    try {
      const prompt = `Based on the following community data, provide a 3-sentence daily executive briefing for the administrator. Highlight urgent issues and give 1 pro-tip for better community management.
      
      STATS:
      - Residents: ${stats.totalResidents}
      - Visitors Today: ${stats.checkedInToday}
      - Open Complaints: ${stats.activeComplaints}
      - Pending Service Requests: ${stats.serviceRequests}
      
      RECENT ACTIVITY:
      ${recentActivity.map(a => `- ${a.title}: ${a.subtitle}`).join('\n')}
      `
      const result = await aiService.generate(prompt, "You are a professional Community Manager Assistant powered by Gemini 1.5 Flash.")
      if (result.success) setBriefing(result.text)
      else setBriefing("Unable to generate briefing at this time. Please try again later.")
    } catch {
      setBriefing("Error connecting to AI service.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (stats.totalResidents > 0) generateBriefing()
  }, [stats.totalResidents])

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-800 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
        <Sparkles className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white">AI Daily Briefing</h4>
        {loading && <div className="ml-auto w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
        {loading ? "AI is analyzing community data..." : briefing || "No briefing generated yet."}
      </div>
      {!loading && (
        <button onClick={generateBriefing} className="mt-4 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all">
          <Sparkles className="w-3 h-3" /> Regenerate Intelligence
        </button>
      )}
    </div>
  )
}

const AdminOverview = ({ user, staffList = [], setCurrentPage }) => {
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalVisitors: 0,
    activeComplaints: 0,
    pendingPayments: 0,
    checkedInToday: 0,
    serviceRequests: 0,
    totalAnnouncements: 0,
    unreadNotifications: 0,
    deliveriesToday: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [activeShifts, setActiveShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const activities = []

      // Load residents
      let residentCount = 0
      try {
        const res = await mongoService.getAdminResidentEntries?.()
        if (res?.success) residentCount = (res.data || []).length
      } catch {}

      // Load visitors
      let visitorStats = { totalVisitors: 0, checkedIn: 0, checkedOut: 0 }
      try {
        const res = await mongoService.getVisitorStats('today')
        if (res?.success) visitorStats = res.data || visitorStats
      } catch {}

      // Load complaints
      let activeComplaints = 0
      try {
        const res = await complaintService.listComplaints(user?.id)
        const all = res?.complaints || []
        activeComplaints = all.filter(c => c.status !== 'resolved').length
        all.slice(0, 3).forEach(c => {
          activities.push({
            id: `c-${c._id}`,
            type: 'complaint',
            icon: MessageSquare,
            color: 'text-orange-500',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            title: c.title || 'New Complaint',
            subtitle: `Status: ${c.status} • ${c.category}`,
            time: c.createdAt
          })
        })
      } catch {}

      // Load service requests
      let serviceRequests = 0
      try {
        const res = await mongoService.listServiceRequests({ limit: 100 })
        if (res?.success) {
          serviceRequests = (res.data || []).filter(r => r.status !== 'verified' && r.status !== 'completed').length
          res.data?.slice(0, 2).forEach(r => {
            activities.push({
              id: `sr-${r._id}`,
              type: 'service',
              icon: FileText,
              color: 'text-purple-500',
              bg: 'bg-purple-50 dark:bg-purple-900/20',
              title: `${r.category} Request`,
              subtitle: `${r.building}-${r.flatNumber} • ${r.status}`,
              time: r.createdAt
            })
          })
        }
      } catch {}

      // Load announcements
      let totalAnnouncements = 0
      try {
        const res = await announcementService.getAnnouncementStats(user?.role)
        if (res?.success) totalAnnouncements = res.data?.totalAnnouncements || 0
      } catch {}

      // Load notifications
      let unreadNotifications = 0
      try {
        const res = await notificationService.getUserNotifications(user?.id, { limit: 5, role: 'admin' })
        if (res?.success) {
          unreadNotifications = res.data?.unreadCount || 0
          res.data?.notifications?.slice(0, 2).forEach(n => {
            activities.push({
              id: `n-${n._id}`,
              type: 'notification',
              icon: Bell,
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
              title: n.title,
              subtitle: n.message?.slice(0, 60),
              time: n.createdAt
            })
          })
        }
      } catch {}

      // Load visitor logs for recent activity
      try {
        const res = await mongoService.getVisitorLogs({})
        if (res?.success) {
          const logs = res.data?.data || []
          logs.slice(0, 3).forEach(v => {
            activities.push({
              id: `v-${v._id}`,
              type: 'visitor',
              icon: UserCheck,
              color: 'text-green-500',
              bg: 'bg-green-50 dark:bg-green-900/20',
              title: `Visitor: ${v.visitorName}`,
              subtitle: `Visiting ${v.hostName} at ${v.hostFlat} • ${v.status}`,
              time: v.entryTime || v.createdAt
            })
          })
        }
      } catch {}

      // Sort activities by time
      activities.sort((a, b) => new Date(b.time) - new Date(a.time))

      // Load active shifts for monitoring
      try {
        const shiftRes = await securityShiftService.getAllShifts()
        if (shiftRes?.success) {
          const now = new Date()
          const today = now.toISOString().split('T')[0]
          
          const currentShifts = (shiftRes.shifts || []).filter(s => {
            if (s.shift_date !== today) return false
            const startStr = `${s.shift_date}T${s.start_time}:00`
            let endStr = `${s.shift_date}T${s.end_time}:00`
            const start = new Date(startStr)
            let end = new Date(endStr)
            if (end < start) end.setDate(end.getDate() + 1)
            return now >= start && now <= end
          })
          setActiveShifts(currentShifts)
        }
      } catch (err) {
        console.error('Error loading active shifts:', err)
      }

      setStats({
        totalResidents: residentCount,
        totalVisitors: visitorStats.totalVisitors || 0,
        activeComplaints,
        pendingPayments: 0,
        checkedInToday: visitorStats.checkedIn || 0,
        serviceRequests,
        totalAnnouncements,
        unreadNotifications,
        deliveriesToday: 0
      })
      setRecentActivity(activities.slice(0, 8))
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  const greeting = () => {
    const h = currentTime.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const statsCards = [
    { label: 'Total Residents', value: stats.totalResidents, icon: Users, color: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-900/20', trend: '+12%', up: true, chart: [3, 5, 4, 7, 6, 8, 9], page: 'admin-users' },
    { label: 'Staff & Security', value: staffList.length, icon: Shield, color: 'from-emerald-500 to-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', trend: 'Active', up: true, chart: [2, 2, 3, 3, 4, 4, 5], page: 'staff-security' },
    { label: 'Visitors Today', value: stats.checkedInToday, icon: UserCheck, color: 'from-violet-500 to-violet-600', lightBg: 'bg-violet-50 dark:bg-violet-900/20', trend: `${stats.totalVisitors} total`, up: true, chart: [5, 8, 6, 10, 7, 9, 12], page: 'visitors' },
    { label: 'Active Complaints', value: stats.activeComplaints, icon: MessageSquare, color: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-50 dark:bg-amber-900/20', trend: 'Open', up: false, chart: [8, 6, 7, 5, 4, 3, 2], page: 'complaints' },
    { label: 'Service Requests', value: stats.serviceRequests, icon: FileText, color: 'from-rose-500 to-rose-600', lightBg: 'bg-rose-50 dark:bg-rose-900/20', trend: 'Pending', up: false, chart: [4, 6, 5, 8, 7, 6, 5], page: null },
    { label: 'Announcements', value: stats.totalAnnouncements, icon: Bell, color: 'from-cyan-500 to-cyan-600', lightBg: 'bg-cyan-50 dark:bg-cyan-900/20', trend: 'Published', up: true, chart: [1, 2, 1, 3, 2, 4, 3], page: 'announcements' }
  ]

  const quickActions = [
    { label: 'Add Resident', icon: Users, color: 'bg-blue-600 hover:bg-blue-700', page: 'add-residents' },
    { label: 'Add Staff', icon: Shield, color: 'bg-emerald-600 hover:bg-emerald-700', page: 'staff-security' },
    { label: 'Monthly Fee', icon: CreditCard, color: 'bg-violet-600 hover:bg-violet-700', page: 'monthly-fee' },
    { label: 'Send Notification', icon: Bell, color: 'bg-amber-600 hover:bg-amber-700', page: 'notifications' },
    { label: 'Announcements', icon: Star, color: 'bg-rose-600 hover:bg-rose-700', page: 'announcements' },
    { label: 'Community Chat', icon: MessageSquare, color: 'bg-cyan-600 hover:bg-cyan-700', page: 'chat' }
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">{greeting()}</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">{user?.name || 'Admin'} 👋</h2>
            <p className="text-blue-200 mt-2 text-sm">
              <Calendar className="w-4 h-4 inline mr-1" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[90px]">
              <div className="text-2xl font-bold">{stats.checkedInToday}</div>
              <div className="text-xs text-blue-200">Visitors Today</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[90px]">
              <div className="text-2xl font-bold">{stats.activeComplaints}</div>
              <div className="text-xs text-blue-200">Open Issues</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[90px]">
              <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
              <div className="text-xs text-blue-200">Unread</div>
            </div>
          </div>
        </div>
      </div>

      <AIDailyBriefing stats={stats} recentActivity={recentActivity} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={i}
              onClick={() => card.page && setCurrentPage?.(card.page)}
              className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 ${card.page ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {card.page && (
                  <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                <AnimatedCounter value={card.value} />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">{card.label}</div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {card.up ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                  {card.trend}
                </span>
                <MiniBarChart data={card.chart} color={card.up ? '#10b981' : '#f59e0b'} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Grid: Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage?.(action.page)}
                  className={`${action.color} text-white rounded-xl p-3 flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm`}
                >
                  <Icon className="w-4 h-4" />
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <button
              onClick={loadDashboardData}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                      {item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Active Security Monitoring */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Security Staff</h3>
          </div>
          <button 
            onClick={() => setCurrentPage?.('shift-scheduling')}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Manage Shifts
          </button>
        </div>
        
        {activeShifts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
            <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No security staff currently on duty</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3">Guard Name</th>
                  <th className="px-4 py-3">Assigned Gate</th>
                  <th className="px-4 py-3">Shift Time</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {activeShifts.map((shift) => (
                  <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                          {shift.guard_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{shift.guard_name || 'Security Officer'}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-tight">{shift.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {shift.assigned_gate}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {shift.start_time} - {shift.end_time}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        On Duty
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">API Server</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Online</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">MongoDB</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Connected</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Auth Service</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Active</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Activity className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">AI Analytics</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Gemini 1.5</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminOverview
