import React, { useEffect, useMemo, useState } from 'react'
import { 
  Home, CreditCard, MessageSquare, QrCode, Bell, 
  User, LogOut, Settings, Calendar, Users, 
  Building2, Phone, Mail, MapPin
} from 'lucide-react'

import { residentService } from '../../services/residentService'
import { chatService } from '../../services/chatService'
import { complaintService } from '../../services/complaintService'
import { passService } from '../../services/passService'

const ResidentDashboard = ({ user, onLogout, currentPage }) => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [needsProfile, setNeedsProfile] = useState(true)
  const [hasSaved, setHasSaved] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    ownerName: '',
    flatNumber: '',
    building: ''
  })
  const [errors, setErrors] = useState({})
  const [complaintForm, setComplaintForm] = useState({ title: '', description: '', category: 'general', priority: 'normal' })
  const [complaintSubmitting, setComplaintSubmitting] = useState(false)
  const [myComplaints, setMyComplaints] = useState([])
  const [passForm, setPassForm] = useState({ visitorName: '', visitorPhone: '', visitorEmail: '', validHours: 6 })
  const [creatingPass, setCreatingPass] = useState(false)
  const [myPasses, setMyPasses] = useState([])
  // Chat state
  const [chatRooms, setChatRooms] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [composer, setComposer] = useState('')
  const [hasMoreMsgs, setHasMoreMsgs] = useState(true)
  const [residentsList, setResidentsList] = useState([])
  const [unreadByRoom, setUnreadByRoom] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('chat_unread_map')||'{}') } catch { return {} }
  })

  // Avatar helpers
  const hashToPalette = (id) => {
    let h = 0
    for (let i = 0; i < (id || '').length; i++) h = ((h << 5) - h) + id.charCodeAt(i)
    const palettes = [
      ['from-blue-500','to-indigo-600'],
      ['from-emerald-500','to-green-600'],
      ['from-purple-500','to-fuchsia-600'],
      ['from-orange-500','to-amber-600'],
      ['from-rose-500','to-pink-600'],
      ['from-teal-500','to-cyan-600']
    ]
    const p = palettes[Math.abs(h) % palettes.length]
    return `bg-gradient-to-br ${p[0]} ${p[1]}`
  }

  const getDisplayForUserId = (uid) => {
    const r = (residentsList || []).find(x => x.authUserId === uid)
    const name = r?.name || r?.email || uid || 'Resident'
    const initials = (name || 'R').slice(0,2).toUpperCase()
    const bg = hashToPalette(uid || name)
    return { name, initials, bg }
  }
  const [lastSeenByRoom, setLastSeenByRoom] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('chat_last_seen')||'{}') } catch { return {} }
  })

  const isProfileComplete = useMemo(() => {
    const required = ['email', 'phone', 'ownerName', 'flatNumber']
    return required.every((k) => (form[k] || '').trim().length > 0)
  }, [form])

  const hasRequiredFields = (obj) => {
    if (!obj) return false
    const required = ['email', 'phone', 'ownerName', 'flatNumber']
    return required.every((k) => (obj[k] || '').toString().trim().length > 0)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const authUserId = user?.id
        if (!authUserId) return
        const { resident } = await residentService.getProfile(authUserId)
        const base = {
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          ownerName: '',
          flatNumber: user.flatNumber || '',
          building: user.building || ''
        }
        if (resident) {
          setProfile(resident)
          setForm({
            name: resident.name || base.name,
            email: resident.email || base.email,
            phone: resident.phone || base.phone,
            ownerName: resident.ownerName || base.ownerName,
            flatNumber: resident.flatNumber || base.flatNumber,
            building: resident.building || base.building
          })
          setNeedsProfile(!hasRequiredFields(resident))
        } else {
          setForm(base)
          setNeedsProfile(!hasRequiredFields(base))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setProfileLoading(false)
      }
    }
    load()
  }, [user])

  // Sync sidebar route to local tabs
  useEffect(() => {
    if (!currentPage) return
    const map = {
      dashboard: 'dashboard',
      payments: 'payments',
      complaints: 'complaints',
      visitors: 'visitors',
      announcements: 'announcements',
      profile: 'profile',
      chat: 'chat'
    }
    const next = map[currentPage] || 'dashboard'
    setActiveTab(next)
  }, [currentPage])

  // Load my complaints when switching to complaints tab
  useEffect(() => {
    const fetchMyComplaints = async () => {
      if (activeTab !== 'complaints' || !user?.id) return
      try {
        const { complaints } = await complaintService.listComplaints(user.id)
        setMyComplaints(complaints || [])
      } catch (e) {
        console.error(e)
        setMyComplaints([])
      }
    }
    fetchMyComplaints()
  }, [activeTab, user])

  // Load chat rooms when chat tab is active
  useEffect(() => {
    const loadRooms = async () => {
      if (activeTab !== 'chat' || !user?.id) return
      try {
        setChatLoading(true)
        // Load all residents and ensure a common group includes them
        try {
          const { residents } = await residentService.listResidents()
          setResidentsList(residents || [])
          const allIds = (residents || []).map(r => r.authUserId).filter(Boolean)
          if (allIds.length > 0) {
            await chatService.createOrGetGroupRoom('Residents Group', allIds)
          }
        } catch (_) {}
        const { rooms } = await chatService.listRooms(user.id)
        const rs = rooms || []
        // compute simple unread: lastMessageAt newer than lastSeen timestamp
        const nextUnread = { ...unreadByRoom }
        rs.forEach(r => {
          const seen = lastSeenByRoom[r._id]
          if (r.lastMessageAt && (!seen || new Date(r.lastMessageAt) > new Date(seen))) {
            nextUnread[r._id] = (nextUnread[r._id] || 0) + 1
          }
        })
        setUnreadByRoom(nextUnread)
        localStorage.setItem('chat_unread_map', JSON.stringify(nextUnread))
        setChatRooms(rs)
        if (!selectedRoomId && (rooms || []).length > 0) {
          // Prefer group first
          const group = rooms.find(r=>r.type==='group')
          setSelectedRoomId((group || rooms[0])._id)
        }
      } catch (e) {
        console.error(e)
        setChatRooms([])
      } finally { setChatLoading(false) }
    }
    loadRooms()
  }, [activeTab, user])

  // Load messages for selected room
  useEffect(() => {
    const loadMessages = async () => {
      if (activeTab !== 'chat' || !selectedRoomId) return
      try {
        setMessagesLoading(true)
        const { messages } = await chatService.listMessages(selectedRoomId, undefined, 30)
        setMessages(messages || [])
        setHasMoreMsgs((messages || []).length === 30)
      } catch (e) {
        console.error(e)
        setMessages([])
      } finally { setMessagesLoading(false) }
    }
    loadMessages()
  }, [activeTab, selectedRoomId])

  const loadMoreMessages = async () => {
    if (!hasMoreMsgs || messagesLoading || messages.length === 0) return
    try {
      setMessagesLoading(true)
      const oldest = messages[0]
      const { messages: older } = await chatService.listMessages(selectedRoomId, oldest.createdAt, 30)
      setMessages([...(older || []), ...messages])
      setHasMoreMsgs((older || []).length === 30)
    } catch (e) { console.error(e) } finally { setMessagesLoading(false) }
  }

  const openNewChat = async () => {
    try {
      // Load residents list
      const res = await residentService.getResidents?.() || await residentService.listResidents?.()
      const residents = res?.residents || []
      const others = residents.filter(r=>r.authUserId && r.authUserId!==user.id)
      const picked = window.prompt('Start chat with (enter authUserId):\n' + others.map(r=>`${r.name || r.email || r.authUserId} | ${r.authUserId}`).join('\n'))
      const targetId = (picked || '').trim()
      if (!targetId) return
      const { room } = await chatService.createOrGetDmRoom([user.id, targetId])
      setSelectedRoomId(room._id)
      const { rooms } = await chatService.listRooms(user.id)
      setChatRooms(rooms || [])
    } catch (e) { console.error(e); alert('Failed to start chat') }
  }

  const sendTextMessage = async () => {
    if (!composer.trim() || !selectedRoomId) return
    try {
      const text = composer.trim()
      setComposer('')
      const optimistic = {
        _id: 'tmp_'+Date.now(),
        roomId: selectedRoomId,
        senderAuthUserId: user.id,
        senderName: user.name || 'Me',
        text,
        createdAt: new Date().toISOString()
      }
      setMessages([...messages, optimistic])
      const { message } = await chatService.sendMessage({ roomId: selectedRoomId, senderAuthUserId: user.id, senderName: user.name || '', text })
      setMessages(prev => prev.map(m => m._id===optimistic._id ? message : m))
      // refresh rooms order
      const { rooms } = await chatService.listRooms(user.id)
      setChatRooms(rooms || [])
    } catch (e) { console.error(e); alert('Failed to send message') }
  }

  const markRoomSeen = (roomId) => {
    const nextSeen = { ...lastSeenByRoom, [roomId]: new Date().toISOString() }
    setLastSeenByRoom(nextSeen)
    localStorage.setItem('chat_last_seen', JSON.stringify(nextSeen))
    if (unreadByRoom[roomId]) {
      const nextUnread = { ...unreadByRoom, [roomId]: 0 }
      setUnreadByRoom(nextUnread)
      localStorage.setItem('chat_unread_map', JSON.stringify(nextUnread))
    }
  }

  // Load my passes when in visitors tab
  useEffect(() => {
    const fetchMyPasses = async () => {
      if (activeTab !== 'visitors' || !user?.id) return
      try {
        const { passes } = await passService.listPasses(user.id)
        setMyPasses((passes || []).filter(p => p.status === 'active'))
      } catch (e) {
        console.error(e)
        setMyPasses([])
      }
    }
    fetchMyPasses()
  }, [activeTab, user])

  const createPass = async () => {
    if (!user?.id) return
    try {
      setCreatingPass(true)
      if (!passForm.visitorName.trim() || !passForm.visitorPhone.trim()) return
      const payload = {
        visitorName: passForm.visitorName,
        visitorPhone: passForm.visitorPhone,
        visitorEmail: passForm.visitorEmail,
        hostAuthUserId: user.id,
        hostName: user.name || '',
        hostPhone: form.phone || user.phone || '',
        building: form.building || user.building || '',
        flatNumber: form.flatNumber || user.flatNumber || '',
        validUntil: new Date(Date.now() + Number(passForm.validHours || 6) * 60 * 60 * 1000).toISOString()
      }
      await passService.createPass(payload)
      setPassForm({ visitorName: '', visitorPhone: '', visitorEmail: '', validHours: 6 })
      const { passes } = await passService.listPasses(user.id)
      setMyPasses((passes || []).filter(p => p.status === 'active'))
    } catch (e) {
      console.error(e)
    } finally {
      setCreatingPass(false)
    }
  }

  const submitComplaint = async () => {
    if (!user?.id) return
    try {
      setComplaintSubmitting(true)
      if (!complaintForm.title.trim() || !complaintForm.description.trim()) return
      const payload = {
        ...complaintForm,
        residentAuthUserId: user.id,
        residentName: user.name || '',
        residentEmail: user.email || form.email || '',
        residentPhone: form.phone || '',
        flatNumber: form.flatNumber || user.flatNumber || '',
        building: form.building || user.building || ''
      }
      await complaintService.createComplaint(payload)
      setComplaintForm({ title: '', description: '', category: 'general', priority: 'normal' })
      const { complaints } = await complaintService.listComplaints(user.id)
      const now = Date.now()
      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000
      setMyComplaints((complaints || []).filter(c => !(c.status === 'resolved' && c.resolvedAt && (now - new Date(c.resolvedAt).getTime()) > twoWeeksMs)))
    } catch (e) {
      console.error(e)
    } finally {
      setComplaintSubmitting(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return
    try {
      setSaving(true)
      const nextErrors = {}
      // Name and Email are locked from user; still ensure present
      if (!(user.email || '').trim()) nextErrors.email = 'Email is required'
      if (!(user.name || '').trim()) nextErrors.name = 'Name is required'
      if (!form.ownerName.trim()) nextErrors.ownerName = 'Owner name is required'
      if (!form.flatNumber.trim()) nextErrors.flatNumber = 'Flat number is required'
      if (!form.phone.trim()) nextErrors.phone = 'Phone is required'
      else if (!/^\+?[0-9]{7,15}$/.test(form.phone.trim())) nextErrors.phone = 'Enter a valid phone number'
      if (!form.building.trim()) nextErrors.building = 'Select a building'
      else if (!['A','B','C'].includes(form.building)) nextErrors.building = 'Invalid building'

      setErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        setSaving(false)
        return
      }

      await residentService.saveProfile({
        authUserId: user.id,
        name: user.name || form.name,
        email: user.email || form.email,
        phone: form.phone,
        ownerName: form.ownerName,
        flatNumber: form.flatNumber,
        building: form.building
      })
      setHasSaved(true)
      setNeedsProfile(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

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



  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <CreditCard className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹2,500</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Bills</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">2</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Complaints</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                <QrCode className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">5</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Passes</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
                <Bell className="w-8 h-8 text-orange-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">3</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">New Announcements</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Bills</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Maintenance</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Due: Dec 31, 2024</p>
                    </div>
                    <span className="text-red-600 font-semibold">₹2,000</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Electricity</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Due: Jan 5, 2025</p>
                    </div>
                    <span className="text-red-600 font-semibold">₹500</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Announcements</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="font-medium text-blue-900 dark:text-blue-300">Water Supply Maintenance</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">Tomorrow 10 AM - 2 PM</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="font-medium text-green-900 dark:text-green-300">Community Event</p>
                    <p className="text-sm text-green-700 dark:text-green-400">New Year Celebration - Dec 31</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'payments':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Date</th>
                      <th className="text-left py-2 text-gray-900 dark:text-white">Description</th>
                      <th className="text-left py-2 text-gray-900 dark:text-white">Amount</th>
                      <th className="text-left py-2 text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b dark:border-gray-700">
                      <td className="py-2 text-gray-600 dark:text-gray-400">Dec 1, 2024</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">Maintenance</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">₹2,000</td>
                      <td className="py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Paid</span></td>
                    </tr>
                    <tr className="border-b dark:border-gray-700">
                      <td className="py-2 text-gray-600 dark:text-gray-400">Nov 15, 2024</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">Electricity</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">₹450</td>
                      <td className="py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Paid</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      case 'complaints':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Complaint</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={complaintForm.title}
                    onChange={(e)=>setComplaintForm({...complaintForm, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={complaintForm.category}
                    onChange={(e)=>setComplaintForm({...complaintForm, category: e.target.value})}
                  >
                    <option value="general">General</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="security">Security</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={complaintForm.priority}
                    onChange={(e)=>setComplaintForm({...complaintForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea rows={4} className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={complaintForm.description}
                    onChange={(e)=>setComplaintForm({...complaintForm, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={submitComplaint} disabled={complaintSubmitting || !complaintForm.title || !complaintForm.description}
                  className={`px-4 py-2 rounded-lg text-white ${complaintSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {complaintSubmitting ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Complaints</h3>
              <div className="space-y-3">
                {myComplaints.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No complaints yet.</p>
                ) : myComplaints.map((c) => (
                  <div key={c._id} className="p-4 border dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{c.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${c.status==='resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{c.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{new Date(c.createdAt).toLocaleString()} • {c.category} • {c.priority}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'visitors':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Visitor Pass</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Visitor Name</label>
                  <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={passForm.visitorName}
                    onChange={(e)=>setPassForm({...passForm, visitorName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={passForm.visitorPhone}
                    onChange={(e)=>setPassForm({...passForm, visitorPhone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email (optional)</label>
                  <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={passForm.visitorEmail}
                    onChange={(e)=>setPassForm({...passForm, visitorEmail: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Valid For (hours)</label>
                  <input type="number" min="1" className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={passForm.validHours}
                    onChange={(e)=>setPassForm({...passForm, validHours: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={createPass} disabled={creatingPass || !passForm.visitorName || !passForm.visitorPhone}
                  className={`px-4 py-2 rounded-lg text-white ${creatingPass ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {creatingPass ? 'Creating...' : 'Generate Pass'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Passes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myPasses.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No passes yet.</p>
                ) : myPasses.map((p) => (
                  <div key={p._id} className="p-4 border dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{p.visitorName}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${p.status==='active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Valid until: {new Date(p.validUntil).toLocaleString()}</p>
                    <div className="mt-3 bg-white dark:bg-gray-700 p-3 rounded text-center border dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code</div>
                      <div className="font-mono text-gray-900 dark:text-white">{p.code}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-center">
                      <img
                        alt={`QR ${p.code}`}
                        className="w-32 h-32 border dark:border-gray-600 bg-white"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(p.code)}`}
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={async () => {
                          try {
                            if (!confirm('Cancel this pass? This cannot be undone.')) return
                            await passService.updatePassStatus(p.code, 'expired')
                            const { passes } = await passService.listPasses(user.id)
                            setMyPasses((passes || []).filter(x => x.status === 'active'))
                          } catch (e) {
                            alert('Failed to cancel pass')
                          }
                        }}
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-xs"
                      >Cancel Pass</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'announcements':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Community Announcements</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Water Supply Maintenance</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    Water supply will be interrupted tomorrow from 10 AM to 2 PM for maintenance work.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">Posted: Dec 22, 2024</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">New Year Celebration</h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-2">
                    Join us for the New Year celebration on Dec 31st at the community hall.
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">Posted: Dec 20, 2024</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'chat':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h3>
                <button onClick={openNewChat} className="px-3 py-2 rounded-lg bg-blue-600 text-white">New Chat</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Residents / Rooms */}
                <div className="lg:col-span-1 border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">Residents</span>
                    {chatLoading && <span className="text-xs text-gray-500">Loading…</span>}
                  </div>
                  <div className="max-h-[60vh] overflow-auto">
                    {/* Group item */}
                    {(() => {
                      const group = (chatRooms || []).find(r=>r.type==='group')
                      if (!group) return null
                      return (
                        <button key={group._id} onClick={()=>setSelectedRoomId(group._id)} className={`w-full text-left p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedRoomId===group._id ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                          <div className="text-sm text-gray-900 dark:text-white truncate">{group.name || 'Residents Group'}</div>
                          <div className="text-xs text-gray-500">{new Date(group.lastMessageAt).toLocaleString?.() || ''}</div>
                        </button>
                      )
                    })()}
                    {/* Residents list for DM */}
                    {(residentsList || []).filter(r=>r.authUserId!==user.id).map(r => (
                      <button key={r.authUserId} onClick={async ()=>{
                        try {
                          const { room } = await chatService.createOrGetDmRoom([user.id, r.authUserId])
                          setSelectedRoomId(room._id)
                          const { rooms } = await chatService.listRooms(user.id)
                          setChatRooms(rooms || [])
                        } catch (e) { console.error(e); alert('Failed to open chat') }
                      }} className={`w-full text-left p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedRoomId && (chatRooms.find(rr=>rr._id===selectedRoomId)?.memberAuthUserIds||[]).includes(r.authUserId) ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                        <div className="text-sm text-gray-900 dark:text-white truncate">{r.name || r.email || r.authUserId}</div>
                        <div className="text-xs text-gray-500 truncate">{r.authUserId}</div>
                      </button>
                    ))}
                    {(residentsList || []).length === 0 && (
                      <p className="p-3 text-sm text-gray-600 dark:text-gray-400">No residents found.</p>
                    )}
                  </div>
                </div>
                {/* Messages */}
                <div className="lg:col-span-2 border dark:border-gray-700 rounded-xl flex flex-col min-h-[70vh] bg-white dark:bg-gray-800">
                  {/* Chat header with avatar and name */}
                  <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center gap-3">
                    {(() => {
                      const room = (chatRooms || []).find(r=>r._id===selectedRoomId)
                      let label = 'Select a chat'
                      if (room) {
                        if (room.type === 'group') {
                          label = room.name || 'Residents Group'
                        } else {
                          const otherId = (room.memberAuthUserIds||[]).find(x=>x!==user.id)
                          const other = (residentsList||[]).find(r=>r.authUserId===otherId)
                          label = other?.name || other?.email || otherId || 'Resident'
                        }
                      }
                      const initials = (label||'R').slice(0,2).toUpperCase()
                      return (
                        <>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold">{initials}</div>
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                            <div className="text-[11px] text-gray-500">WhatsApp-like chat</div>
                          </div>
                        </>
                      )
                    })()}
                    <div className="ml-auto">
                      <button onClick={loadMoreMessages} disabled={!hasMoreMsgs || messagesLoading} className="text-xs px-2 py-1 border rounded-lg dark:border-gray-600">Load older</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-2 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'><rect fill=\'%23f8fafc\' width=\'20\' height=\'20\'/><circle cx=\'10\' cy=\'10\' r=\'1\' fill=\'%23e5e7eb\'/></svg>')] dark:bg-gray-900" onScroll={()=>markRoomSeen(selectedRoomId)}>
                    {(messages || []).map(m => {
                      const mine = m.senderAuthUserId === user.id
                      const { name, initials, bg } = getDisplayForUserId(m.senderAuthUserId)
                      return (
                        <div key={m._id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && (
                            <div className={`w-7 h-7 rounded-full ${bg} text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0`}>{initials}</div>
                          )}
                          <div className={`max-w-[75%] ${mine ? 'text-right' : 'text-left'}`}>
                            {!mine && <div className="text-[10px] text-gray-500 mb-0.5">{name}</div>}
                            <div className={`px-3 py-2 rounded-2xl shadow ${mine ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-tr-none ml-auto' : 'bg-gray-100 dark:bg-gray-700 dark:text-white rounded-tl-none'}`}>
                              {m.text && <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.text}</div>}
                            </div>
                            <div className={`text-[10px] text-gray-500 mt-1 ${mine ? '' : ''}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          {mine && (
                            <div className={`w-7 h-7 rounded-full ${hashToPalette(user.id)} text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0`}>{(user.name || 'Me').slice(0,2).toUpperCase()}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="p-3 border-t dark:border-gray-700 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-b-xl">
                    <input value={composer} onChange={(e)=>setComposer(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage() } }} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Type a message" />
                    <button onClick={sendTextMessage} className="px-4 py-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700">Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'profile': {
        const view = profile || form
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{(view?.name || user.name || 'N/A')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{(view?.email || user.email || 'N/A')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{(view?.phone || 'N/A')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Owner Name</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{(view?.ownerName || 'N/A')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Flat Number</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{(view?.flatNumber || user.flatNumber || 'N/A')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Building</p>
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">{(view?.building || user.building || 'N/A')}</p>
                </div>
              </div>
            </div>
          </div>
        )
      }
      default:
        return <div>Content not found</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Restriction gate */}
      {!profileLoading && profile?.isRestricted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your account has been restricted by the admin. Please contact the administration for assistance.
            </p>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Logout
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Resident Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user.name || 'User'}</p>
              </div>
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
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Profile completion modal */}
      {!profileLoading && needsProfile && !hasSaved && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Complete your profile</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide the required details to continue using the app.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={user.name || form.name} readOnly />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={user.email || form.email} readOnly />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Name</label>
                <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={form.ownerName} onChange={(e)=>setForm({...form, ownerName: e.target.value})} />
                {errors.ownerName && <p className="mt-1 text-xs text-red-600">{errors.ownerName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat Number</label>
                <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={form.flatNumber} onChange={(e)=>setForm({...form, flatNumber: e.target.value})} />
                {errors.flatNumber && <p className="mt-1 text-xs text-red-600">{errors.flatNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building</label>
                <select
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={form.building}
                  onChange={(e)=>setForm({...form, building: e.target.value})}
                >
                  <option value="">Select Building</option>
                  <option value="A">Building A</option>
                  <option value="B">Building B</option>
                  <option value="C">Building C</option>
                </select>
                {errors.building && <p className="mt-1 text-xs text-red-600">{errors.building}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button disabled className="px-4 py-2 rounded-lg text-sm text-gray-500 cursor-not-allowed">Skip</button>
              <button
                onClick={handleSaveProfile}
                disabled={!isProfileComplete || saving || Object.keys(errors).length > 0}
                className={`px-4 py-2 rounded-lg text-white ${(!isProfileComplete||saving) ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {saving ? 'Saving...' : 'Save and Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResidentDashboard
