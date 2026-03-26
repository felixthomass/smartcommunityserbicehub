import React, { useMemo, useRef, useState } from 'react'
import { 
  Play, Clock, 
  AlertTriangle, Plus, Search, Shield, 
  Sun, Moon, MapPin, Camera, ClipboardList,
  Timer, Package, Layers, CheckCircle, QrCode, Trash2, Calendar, Droplets,
  Bell, User, Settings, LogOut, ChevronDown, Activity, RefreshCw, Sliders
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { housekeepingStaffService } from '../../services/housekeepingStaffService'
import { useEffect } from 'react'

const HousekeepingDashboard = ({ user, onLogout, currentPage, setCurrentPage }) => {
  const { darkMode, setDarkMode } = useTheme()
  const fileInputRef = useRef(null)
  const [selectedShift, setSelectedShift] = useState('Morning')
  const [activeTaskId, setActiveTaskId] = useState(null)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  
  const [tasks, setTasks] = useState([])
  const [activeView, setActiveView] = useState('tasks') // 'tasks', 'shift', or 'admin'
  const [allStaff, setAllStaff] = useState([])
  const isAdmin = user.role === 'admin'

  // Sync internal view with parent navigation
  useEffect(() => {
    if (currentPage === 'shift') {
      setActiveView('shift')
    } else if (currentPage === 'tasks') {
      setActiveView('tasks')
    }
  }, [currentPage])

  // Helper to determine if staff is currently on duty
  const getOnDutyStatus = () => {
    const hour = new Date().getHours()
    const shift = profile?.shift_timing?.toLowerCase()
    if (shift === 'morning') return hour >= 6 && hour < 14
    if (shift === 'afternoon') return hour >= 14 && hour < 22
    if (shift === 'night') return hour >= 22 || hour < 6
    return false
  }

  const onDuty = getOnDutyStatus()

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [profileRes, tasksRes] = await Promise.all([
          housekeepingStaffService.getProfile(user.id),
          housekeepingStaffService.getTasks(user.id)
        ])
        
        if (profileRes.success) setProfile(profileRes.profile)
        
        if (isAdmin) {
          const staffRes = await housekeepingStaffService.getAllStaff()
          if (staffRes.success) setAllStaff(staffRes.staff)
        }

        if (tasksRes.success) {
          // Map ServiceRequests to Dashboard format
          const mappedTasks = tasksRes.tasks.map(t => ({
            id: t._id,
            area: `${t.building}-${t.flatNumber}`,
            type: t.category,
            shift: 'Morning', // Default for now
            status: t.status === 'created' ? 'Dirty' : t.status === 'assigned' ? 'Dirty' : t.status === 'in_progress' ? 'In Progress' : t.status === 'completed' ? 'Cleaned' : 'Dirty',
            timeSpent: '0m',
            lastCleaned: 'New Request',
            checklist: [
              { id: 1, task: 'General Cleaning', done: false },
              { id: 2, task: 'Surface Sanitization', done: false }
            ],
            progress: t.status === 'completed' ? 100 : 0
          }))
          setTasks(mappedTasks)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (user?.id) fetchData()
  }, [user?.id])

  // Inventory State
  const [inventory] = useState([
    { item: 'Cleaner', stock: 12, unit: 'L', status: 'Optimal' },
    { item: 'Sanitizer', stock: 3, unit: 'Btl', status: 'Low' },
    { item: 'Bags', stock: 150, unit: 'Qty', status: 'Optimal' }
  ])

  const stats = useMemo(() => ({
    cleaned: tasks.filter(t => t.status === 'Cleaned').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    dirty: tasks.filter(t => t.status === 'Dirty').length,
    avgTime: '38m'
  }), [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.shift === selectedShift)
  }, [tasks, selectedShift])

  const handleChecklistToggle = (taskId, itemId) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newChecklist = t.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c)
        const newProgress = Math.round((newChecklist.filter(c => c.done).length / newChecklist.length) * 100)
        return { ...t, checklist: newChecklist, progress: newProgress }
      }
      return t
    }))
  }

  const updateStatus = async (taskId, newStatus) => {
    // Map UI status back to API status
    const apiStatus = newStatus === 'Cleaned' ? 'completed' : newStatus === 'In Progress' ? 'in_progress' : 'assigned'
    
    const res = await housekeepingStaffService.updateTaskStatus(taskId, apiStatus)
    if (res.success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, progress: newStatus === 'Cleaned' ? 100 : t.progress } : t))
    }
  }

  const GlassCard = ({ children, className = '' }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all ${className}`}
    >
      {children}
    </motion.div>
  )

  const Badge = ({ children, type = 'blue' }) => {
    const styles = {
      blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
      green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
      amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
      red: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
      indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
    }
    return (
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[type]}`}>
        {children}
      </span>
    )
  }

  // Filter tasks for "My Shift" view
  const shiftTasks = tasks.filter(t => t.shift?.toLowerCase() === profile?.shift_timing?.toLowerCase())
  const shiftStats = {
    total: shiftTasks.length,
    completed: shiftTasks.filter(t => t.status === 'Cleaned').length,
    pending: shiftTasks.filter(t => t.status !== 'Cleaned').length,
    progress: Math.round((shiftTasks.filter(t => t.status === 'Cleaned').length / (shiftTasks.length || 1)) * 100)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-500">
      
      {/* Premium Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm px-6 py-3">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-8">
          
          {/* Left Side: Staff Dashboard & Welcome */}
          <div className="flex flex-col items-start min-w-[200px]">
             <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Staff Dashboard</h2>
             <p className="text-xs font-bold text-gray-500 mt-0.5">Welcome back, <span className="text-emerald-500">{user.name}</span></p>
          </div>

          {/* Center Side: Empty */}
          <div className="flex-1 hidden md:block">
          </div>

          {/* Right Side: Controls */}
          <div className="flex items-center gap-6 justify-end min-w-[300px]">
             
             {/* Search Bar */}
             <div className="hidden xl:flex items-center gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-2 rounded-2xl w-64 group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
               <Search className="w-4 h-4 text-gray-400" />
               <input placeholder="Search everywhere..." className="bg-transparent outline-none text-xs w-full placeholder:text-gray-400" />
             </div>

             <div className="flex items-center gap-4">
                {/* Dark Mode */}
                <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-gray-500">
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-gray-500 relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-gray-950 animate-pulse" />
                  </button>
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-4 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-4 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 px-2">
                          <h4 className="font-black text-xs uppercase tracking-widest">Alert Center</h4>
                          <span className="text-[10px] font-bold text-gray-400 underline cursor-pointer">Clear All</span>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
                           {[
                             { title: 'Lobby Spill Reported', time: '2m ago', color: 'rose' },
                             { title: 'Stock Low: Sanitizer', time: '1h ago', color: 'amber' },
                             { title: 'Shift Handover Ready', time: '3h ago', color: 'blue' }
                           ].map((n, i) => (
                             <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                                <div className={`w-3 h-3 rounded-full mt-1 bg-${n.color}-500 shrink-0 shadow-sm`} />
                                <div>
                                   <p className="text-xs font-bold leading-tight group-hover:text-emerald-500 transition-colors">{n.title}</p>
                                   <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile */}
                <div className="relative">
                   <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="flex items-center gap-3 p-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800">
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center text-white font-black shadow-md border-2 border-white dark:border-gray-800">
                        {user.name?.charAt(0)}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                   </button>
                   <AnimatePresence>
                     {showProfileDropdown && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-4 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-2 overflow-hidden">
                          {[
                            { label: 'My Profile', icon: User, action: () => {} },
                            { label: 'Settings', icon: Settings, action: () => {} },
                            { label: 'Shift Log', icon: ClipboardList, action: () => {} }
                          ].map(item => (
                            <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-bold text-gray-600 dark:text-gray-300">
                               <item.icon className="w-4 h-4" /> {item.label}
                            </button>
                          ))}
                          <div className="h-px bg-gray-50 dark:bg-gray-800 my-1 mx-2" />
                          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors text-xs font-bold text-rose-500">
                             <LogOut className="w-4 h-4" /> Logout
                          </button>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             </div>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-[1200px] mx-auto space-y-10">
        {/* Simple Tab Navigation */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => {
              setActiveView('tasks')
              if (setCurrentPage) setCurrentPage('tasks')
            }}
            className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
              activeView === 'tasks' ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-500'
            }`}
          >
            My Tasks
            {activeView === 'tasks' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
          </button>
          <button 
            onClick={() => {
              setActiveView('shift')
              if (setCurrentPage) setCurrentPage('shift')
            }}
            className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
              activeView === 'shift' ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-500'
            }`}
          >
            My Shift
            {activeView === 'shift' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveView('admin')}
              className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                activeView === 'admin' ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              Shift Management
              {activeView === 'admin' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
            </button>
          )}
        </div>

        {activeView === 'tasks' ? (
          <div className="space-y-10">
            {/* Simple Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'Cleaned', value: stats.cleaned, color: 'emerald', icon: CheckCircle },
            { label: 'Pending', value: stats.dirty, color: 'rose', icon: AlertTriangle },
            { label: 'In Progress', value: stats.inProgress, color: 'blue', icon: Timer }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center font-black`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-2xl font-black">{stat.value}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Simplified Task List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black flex items-center gap-3">
              <ClipboardList className="text-emerald-500" />
              Your Tasks
            </h2>
          </div>

          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 p-12 rounded-3xl text-center">
                <p className="text-gray-400 font-bold">No tasks assigned to you yet.</p>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`bg-white dark:bg-gray-900 border ${activeTaskId === task.id ? 'border-emerald-500' : 'border-gray-100 dark:border-gray-800'} p-6 rounded-3xl shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge type={task.status === 'Cleaned' ? 'green' : task.status === 'Dirty' ? 'red' : 'amber'}>
                          {task.status}
                        </Badge>
                        <Badge type="indigo">Auto-assigned</Badge>
                      </div>
                      <h4 className="text-lg font-black uppercase">{task.area}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type: {task.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {task.status === 'Dirty' && (
                      <button onClick={() => updateStatus(task.id, 'In Progress')} className="px-8 py-3 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                        Start Cleaning
                      </button>
                    )}
                    {task.status === 'In Progress' && (
                      <button onClick={() => updateStatus(task.id, 'Cleaned')} className="px-8 py-3 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                        Mark Done
                      </button>
                    )}
                    {task.status === 'Cleaned' && (
                      <button onClick={() => updateStatus(task.id, 'Dirty')} className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                        Redirty
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Simple Tip Card */}
            <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10 text-center">
              <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest">Efficiency Tip: Complete high-priority areas first for better performance scores.</p>
            </div>
          </div>
        ) : activeView === 'admin' ? (
          <div className="space-y-10">
            {/* Admin Shift Management Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Shift Management</h2>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Assign and coordinate staff schedules</p>
              </div>
              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                <Shield className="w-4 h-4" />
                Admin Mode
              </div>
            </div>

            {/* Staff List Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff Member</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Area</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Shift</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Workload</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {allStaff.map(staff => (
                      <tr key={staff.user_id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center font-black text-sm">
                              {staff.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase">{staff.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{staff.employee_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-black text-gray-500 uppercase">Area {staff.assigned_area}</span>
                        </td>
                        <td className="px-8 py-6">
                          <Badge type={staff.shift_timing === 'Morning' ? 'blue' : staff.shift_timing === 'Afternoon' ? 'amber' : 'indigo'}>
                            {staff.shift_timing}
                          </Badge>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500" style={{ width: `${Math.min(staff.active_tasks_count * 20, 100)}%` }} />
                             </div>
                             <span className="text-sm font-black tabular-nums">{staff.active_tasks_count}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <select 
                             value={staff.shift_timing}
                             onChange={async (e) => {
                               const newShift = e.target.value;
                               const res = await housekeepingStaffService.saveProfile({ ...staff, shift_timing: newShift });
                                if (res.success) {
                                  setAllStaff(prev => prev.map(s => s.user_id === staff.user_id ? { ...s, shift_timing: newShift } : s));
                                }
                             }}
                             className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                           >
                              <option value="Morning">Morning</option>
                              <option value="Afternoon">Afternoon</option>
                              <option value="Night">Night</option>
                           </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Shift Info Header */}
            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl transition-all ${
                  onDuty ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">My Shift</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Your current shift details</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-4">
                 <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                   onDuty 
                   ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                   : 'bg-gray-50 text-gray-400 border-gray-100 dark:bg-gray-800/50 dark:text-gray-500 dark:border-gray-800'
                 }`}>
                   <div className={`w-2 h-2 rounded-full ${onDuty ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                   {onDuty ? 'On Duty' : 'Off Duty'}
                 </div>
              </div>
            </div>

            {/* Shift Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl space-y-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                     <Calendar className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift Name</p>
                     <p className="font-black text-lg uppercase">{profile?.shift_timing || 'Morning'} Shift</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                     <Timer className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift Timing</p>
                      <p className="font-black text-lg">
                        {profile?.shift_timing?.toLowerCase() === 'morning' ? '6:00 AM — 2:00 PM' : 
                         profile?.shift_timing?.toLowerCase() === 'afternoon' ? '2:00 PM — 10:00 PM' : 
                         profile?.shift_timing?.toLowerCase() === 'evening' ? '2:00 PM — 10:00 PM' :
                         profile?.shift_timing?.toLowerCase() === 'night' ? '10:00 PM — 6:00 AM' :
                         '6:00 AM — 2:00 PM'}
                      </p>
                   </div>
                </div>
              </div>

              {/* Shift Summary Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl">
                <div className="grid grid-cols-3 gap-4 h-full">
                  {[
                    { label: 'Total', value: shiftStats.total },
                    { label: 'Completed', value: shiftStats.completed },
                    { label: 'Pending', value: shiftStats.pending }
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col justify-center text-center">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                       <p className="text-2xl font-black">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-3xl space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Shift Completion</h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">Overall progress for this shift</p>
                </div>
                <span className="text-3xl font-black text-emerald-500">{shiftStats.progress}%</span>
              </div>
              <div className="h-3 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }} 
                   animate={{ width: `${shiftStats.progress}%` }} 
                   className="h-full bg-emerald-500 shadow-lg shadow-emerald-500/20" 
                 />
              </div>
            </div>

            {/* Shift Tasks List */}
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-3">
                <ClipboardList className="w-4 h-4" />
                Current Shift Tasks
              </h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden">
                {shiftTasks.length > 0 ? shiftTasks.map((task, i) => (
                  <div key={task.id} className="p-6 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-5">
                      <span className="text-xs font-black text-gray-300 tabular-nums">0{i+1}</span>
                      <div>
                        <h4 className="font-black text-base uppercase tracking-tight">{task.area}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shift Task</p>
                      </div>
                    </div>
                    <Badge type={task.status === 'Cleaned' ? 'green' : task.status === 'Dirty' ? 'red' : 'amber'}>
                      {task.status}
                    </Badge>
                  </div>
                )) : (
                  <div className="p-10 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No tasks assigned for this shift yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern Floating Alert Button */}
      <div className="fixed bottom-10 right-10 z-[100]">
        <button 
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="w-16 h-16 rounded-3xl bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative z-10 border-4 border-white dark:border-gray-950"
        >
          {showQuickActions ? <Trash2 className="w-7 h-7" /> : <Plus className="w-9 h-9" />}
        </button>
        
        <AnimatePresence>
          {showQuickActions && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} className="absolute bottom-20 right-0 space-y-4">
              <button className="flex items-center gap-4 group">
                 <span className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">Urgent Spill</span>
                 <div className="w-14 h-14 bg-rose-500 rounded-2xl shadow-xl flex items-center justify-center text-white border-2 border-white/20"><Droplets className="w-6 h-6" /></div>
              </button>
              <button className="flex items-center gap-4 group">
                 <span className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">Bin Full</span>
                 <div className="w-14 h-14 bg-amber-500 rounded-2xl shadow-xl flex items-center justify-center text-white border-2 border-white/20"><Trash2 className="w-6 h-6" /></div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.1); border-radius: 10px; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}

export default HousekeepingDashboard