import React, { useMemo, useRef, useState } from 'react'
import { LogOut, CheckCircle2, Play, ClipboardCheck, Upload, Filter, Clock, AlertTriangle, Plus, Search, Bell } from 'lucide-react'
import { mongoService } from '../../services/mongoService'
import { notificationService } from '../../services/notificationService'

const StaffDashboard = ({ user, onLogout, currentPage }) => {
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

  // Demo in-memory task list (client-side)
  const initialTasks = useMemo(() => ([
    { id: 'T-101', title: 'Fix leaking tap - A203', category: 'Plumbing', priority: 'High', dueAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), status: 'Assigned', files: [] },
    { id: 'T-102', title: 'Lift-2 vibration check', category: 'Electrical', priority: 'Urgent', dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), status: 'Assigned', files: [] },
    { id: 'T-103', title: 'Housekeeping – Lobby B', category: 'Housekeeping', priority: 'Medium', dueAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), status: 'In Progress', files: [] }
  ]), [])

  const [tasks, setTasks] = useState(initialTasks)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchText, setSearchText] = useState('')
  const fileInputRef = useRef(null)
  const [uploadingTaskId, setUploadingTaskId] = useState(null)

  const statusOrder = ['Assigned', 'In Progress', 'Completed', 'Verified']

  const metrics = useMemo(() => {
    const total = tasks.length
    const assigned = tasks.filter(t => t.status === 'Assigned').length
    const inProgress = tasks.filter(t => t.status === 'In Progress').length
    const completed = tasks.filter(t => t.status === 'Completed').length
    const verified = tasks.filter(t => t.status === 'Verified').length
    const overdue = tasks.filter(t => new Date(t.dueAt).getTime() < Date.now() && t.status !== 'Verified').length
    return { total, assigned, inProgress, completed, verified, overdue }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const myDepartment = (user.staffDepartment || user.department || '').trim()
    console.log('🔍 Filtering tasks - My Department:', myDepartment)
    console.log('🔍 Total tasks before filter:', tasks.length)
    
    const filtered = tasks.filter(t => {
      console.log('  🔍 Task:', t.id, '- Category:', t.category, '- My Dept:', myDepartment)
      
      // Department filter - ONLY filter if staff has a department
      if (myDepartment && t.category && t.category !== myDepartment) {
        console.log('    ❌ Filtered out - department mismatch')
        return false
      }
      
      if (filterStatus !== 'all' && t.status !== filterStatus) {
        console.log('    ❌ Filtered out - status mismatch')
        return false
      }
      
      if (filterPriority !== 'all' && t.priority !== filterPriority) {
        console.log('    ❌ Filtered out - priority mismatch')
        return false
      }
      
      if (searchText && !(`${t.id} ${t.title} ${t.category}`.toLowerCase().includes(searchText.toLowerCase()))) {
        console.log('    ❌ Filtered out - search mismatch')
        return false
      }
      
      console.log('    ✅ Task included')
      return true
    })
    
    console.log('✅ Filtered tasks count:', filtered.length)
    return filtered
  }, [tasks, filterStatus, filterPriority, searchText, user.staffDepartment])

  const advanceStatus = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const idx = statusOrder.indexOf(t.status)
      const next = statusOrder[Math.min(idx + 1, statusOrder.length - 1)]
      return { ...t, status: next }
    }))
  }

  const setStatus = (taskId, status) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
  const changePriority = (taskId, priority) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t))
  const changeDue = (taskId, dueAt) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueAt } : t))

  const triggerUpload = (taskId) => {
    setUploadingTaskId(taskId)
    fileInputRef.current?.click()
  }

  const onFilesSelected = (e) => {
    const files = Array.from(e.target.files || [])
    if (!uploadingTaskId || files.length === 0) return
    setTasks(prev => prev.map(t => t.id === uploadingTaskId ? { ...t, files: [...t.files, ...files.map(f => ({ name: f.name, size: f.size }))] } : t))
    setUploadingTaskId(null)
    e.target.value = ''
  }

  const isOverdue = (dueAt) => new Date(dueAt).getTime() < Date.now()

  // Load service requests from MongoDB when tasks page is active
  React.useEffect(() => {
    const loadTasks = async () => {
      if (currentPage !== 'tasks') return
      try {
        console.log('🔄 Loading service requests from MongoDB for staff...')
        console.log('👤 Staff user:', user.name, '- Department:', user.staffDepartment)
        
        const res = await mongoService.listServiceRequests({ limit: 200 })
        if (res.success) {
          console.log('✅ MongoDB returned:', res.data.length, 'service requests')
          
          const mapped = (res.data || []).map(r => {
            // Map MongoDB status to Kanban status
            const statusMap = {
              'created': 'Assigned',
              'assigned': 'Assigned',
              'in_progress': 'In Progress',
              'completed': 'Completed',
              'verified': 'Verified'
            }
            const mappedStatus = statusMap[r.status] || 'Assigned'
            
            const task = {
              id: r._id || r.requestId,
              title: `${r.category} – ${r.building}${r.flatNumber ? '-' + r.flatNumber : ''}`,
              category: r.category,
              priority: (r.priority || 'Medium').replace(/^(.)/, (m)=>m.toUpperCase()),
              dueAt: r.dueAt || new Date(Date.now() + 24*60*60*1000).toISOString(),
              status: mappedStatus,
              files: []
            }
            console.log('  📋 Mapped task:', { id: task.id, category: task.category, originalStatus: r.status, mappedStatus: task.status })
            return task
          })
          
          // Replace all tasks with MongoDB data
          setTasks(mapped)
          console.log('✅ Set tasks to:', mapped.length, 'items')
        } else {
          console.warn('⚠️ MongoDB request failed, falling back to localStorage')
          // fallback local
          const existing = JSON.parse(localStorage.getItem('service_requests') || '[]')
          const mapped = existing.map(r => ({
            id: r.requestId,
            title: `${r.category} – ${r.building}${r.flatNumber ? '-' + r.flatNumber : ''}`,
            category: r.category,
            priority: (r.priority || 'Medium').replace(/^(.)/, (m)=>m.toUpperCase()),
            dueAt: new Date(Date.now() + 24*60*60*1000).toISOString(),
            status: 'Assigned',
            files: []
          }))
          setTasks(mapped)
        }
      } catch (e) {
        console.error('❌ Error loading service requests:', e)
      }
    }
    loadTasks()

    const handler = (e) => {
      const r = e.detail
      if (!r) return
      console.log('🔔 New service request event received:', r)
      
      // Map MongoDB status to Kanban status
      const statusMap = {
        'created': 'Assigned',
        'assigned': 'Assigned',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'verified': 'Verified'
      }
      const mappedStatus = statusMap[r.status] || 'Assigned'
      
      const task = {
        id: r._id || r.requestId,
        title: `${r.category} – ${r.building}${r.flatNumber ? '-' + r.flatNumber : ''}`,
        category: r.category,
        priority: (r.priority || 'Medium').replace(/^(.)/, (m)=>m.toUpperCase()),
        dueAt: r.dueAt || new Date(Date.now() + 24*60*60*1000).toISOString(),
        status: mappedStatus,
        files: []
      }
      setTasks(prev => [task, ...prev.filter(t => t.id !== task.id)])
    }
    window.addEventListener('serviceRequestCreated', handler)
    return () => window.removeEventListener('serviceRequestCreated', handler)
  }, [currentPage, user.staffDepartment])

  const [staffNotifications, setStaffNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)

  React.useEffect(() => {
    const loadNotifs = async () => {
      if (currentPage !== 'notifications' || !user?.id) return
      try {
        setNotifLoading(true)
        // Load admin notifications
        const result = await notificationService.getUserNotifications(user.id, { limit: 50, role: 'staff' })
        const adminNotifs = result.success ? (result.data?.notifications || []) : []
        
        // Load service request notifications from MongoDB
        const myDepartment = (user.staffDepartment || user.department || '').trim()
        let serviceRequestNotifs = []
        if (myDepartment) {
          const srResult = await mongoService.listServiceRequests({ category: myDepartment, limit: 50 })
          if (srResult.success) {
            serviceRequestNotifs = (srResult.data || [])
              .filter(r => r.status === 'created' || r.status === 'assigned')
              .map(r => ({
                _id: r._id,
                title: 'New Service Request',
                message: `${r.category}: ${r.description} @ ${r.building}-${r.flatNumber}`,
                type: 'service_request',
                priority: r.priority || 'medium',
                isRead: false,
                createdAt: r.createdAt,
                metadata: { actionUrl: '/tasks', serviceRequestId: r._id }
              }))
          }
        }
        
        // Combine and sort by date
        const combined = [...adminNotifs, ...serviceRequestNotifs]
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setStaffNotifications(combined)
      } catch (e) {
        console.error('Error loading staff notifications:', e)
        setStaffNotifications([])
      } finally {
        setNotifLoading(false)
      }
    }
    loadNotifs()
  }, [currentPage, user?.id, user?.staffDepartment])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user.name || 'User'}!</p>
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
        {currentPage === 'tasks' ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">My Tasks</h3>
                {user.staffDepartment && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">Department: {user.staffDepartment}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search tasks" className="bg-transparent outline-none text-sm py-1 text-gray-700 dark:text-gray-200" />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-200">
                    <option value="all">All Priority</option>
                    {['Low','Medium','High','Urgent'].map(p => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
              </div>
            </div>

            {/* Debug Info */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
              <p className="text-gray-700 dark:text-gray-300">
                📊 Total tasks: {tasks.length} | Filtered tasks: {filteredTasks.length} | Department: {user.staffDepartment || 'None'}
              </p>
            </div>

            {/* Kanban-like columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Assigned','In Progress','Completed'].map(col => {
                const colTasks = filteredTasks.filter(t=> col==='Completed' ? (t.status==='Completed' || t.status==='Verified') : t.status===col)
                console.log(`🔍 Column "${col}" tasks:`, colTasks.map(t => ({ id: t.id, status: t.status, category: t.category })))
                return (
                <div key={col} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{col}</div>
                    <div className="text-xs text-gray-400">{colTasks.length}</div>
                  </div>
                  <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
                    {colTasks.map(t => (
                      <div key={t.id} className="p-3 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-100 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{t.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t.id} • {t.category}</div>
                          </div>
                          <select value={t.priority} onChange={e => changePriority(t.id, e.target.value)} className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                            {['Low','Medium','High','Urgent'].map(p => (<option key={p}>{p}</option>))}
                          </select>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${isOverdue(t.dueAt) ? 'border-red-300 text-red-600 dark:border-red-700' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}>
                            <Clock className="w-3 h-3" />
                            <input type="datetime-local" value={new Date(t.dueAt).toISOString().slice(0,16)} onChange={e => changeDue(t.id, new Date(e.target.value).toISOString())} className="bg-transparent outline-none" />
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => triggerUpload(t.id)} className="text-blue-600 hover:text-blue-700">Upload</button>
                            <span className="text-gray-400">{t.files.length}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2 justify-end">
                          {t.status !== 'In Progress' && t.status !== 'Verified' && (
                            <button onClick={async () => { setStatus(t.id, 'In Progress'); try { await mongoService.setServiceRequestStatus(t.id, 'in_progress') } catch {} }} className="px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs">Start</button>
                          )}
                          {t.status === 'In Progress' && (
                            <button onClick={async () => { setStatus(t.id, 'Completed'); try { await mongoService.setServiceRequestStatus(t.id, 'completed') } catch {} }} className="px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs">Complete</button>
                          )}
                          {t.status === 'Completed' && (
                            <button onClick={async () => { advanceStatus(t.id); try { await mongoService.setServiceRequestStatus(t.id, 'verified') } catch {} }} className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">Verify</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">No tasks</div>
                    )}
                  </div>
                </div>
              )})}
            </div>

            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesSelected} />
          </div>
        ) : currentPage === 'notifications' ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {user.staffDepartment && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Showing admin notifications and service requests for {user.staffDepartment}
                  </p>
                )}
              </div>
              {staffNotifications.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      await notificationService.markAllAsRead(user.id)
                      setStaffNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                    } catch (e) {
                      console.error('Error marking all as read:', e)
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : staffNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffNotifications.map(n => (
                  <div 
                    key={n._id} 
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      (!n.isRead)?'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800':'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => {
                      if (n.metadata?.actionUrl === '/tasks') {
                        // Navigate to tasks - you can add setCurrentPage if you have it
                        window.location.hash = '#tasks'
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            n.type === 'service_request' ? 'bg-purple-100 text-purple-800' :
                            n.type === 'info' ? 'bg-blue-100 text-blue-800' :
                            n.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {n.type === 'service_request' ? 'Service Request' : n.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            n.priority==='urgent'?'bg-red-100 text-red-800':
                            n.priority==='high'?'bg-orange-100 text-orange-800':
                            n.priority==='medium'?'bg-blue-100 text-blue-800':
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {n.priority}
                          </span>
                          {!n.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{n.message}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                          {new Date(n.createdAt).toLocaleString()}
                          {n.metadata?.serviceRequestId && (
                            <span className="ml-2">• Request ID: {n.metadata.serviceRequestId}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentPage === 'maintenance' ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Maintenance</h3>
            <p className="text-gray-600 dark:text-gray-400">Maintenance tools (coming soon).</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.total}</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-blue-200 dark:border-blue-900/60">
                <div className="text-xs text-blue-600 dark:text-blue-300">In Progress</div>
                <div className="text-2xl font-semibold text-blue-700 dark:text-blue-300">{metrics.inProgress}</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-amber-200 dark:border-amber-900/60">
                <div className="text-xs text-amber-600 dark:text-amber-300">Assigned</div>
                <div className="text-2xl font-semibold text-amber-700 dark:text-amber-300">{metrics.assigned}</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60">
                <div className="text-xs text-emerald-600 dark:text-emerald-300">Verified</div>
                <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{metrics.verified}</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-red-200 dark:border-red-900/60">
                <div className="text-xs text-red-600 dark:text-red-300">Overdue</div>
                <div className="text-2xl font-semibold text-red-700 dark:text-red-300">{metrics.overdue}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Tasks</h3>
              <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
                {tasks.slice(0,5).map(t => (
                  <li key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">{t.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t.category} • {t.priority} • {t.status}</div>
                    </div>
                    <button onClick={() => setStatus(t.id, 'In Progress')} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Open</button>
                  </li>
                ))}
              </ul>
            </div>

            
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffDashboard