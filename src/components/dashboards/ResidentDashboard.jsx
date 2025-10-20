import React, { useEffect, useMemo, useState } from 'react'
import { 
  Home, CreditCard, MessageSquare, QrCode, Bell, 
  User, LogOut, Settings, Calendar, Users, 
  Building2, Phone, Mail, MapPin, Share2
} from 'lucide-react'

import { residentService } from '../../services/residentService'
import { chatService } from '../../services/chatService'
import { chatFileService } from '../../services/chatFileService'
import { complaintService } from '../../services/complaintService'
import { passService } from '../../services/passService'
import { billService } from '../../services/billService'
import { notificationService } from '../../services/notificationService'
import { announcementService } from '../../services/announcementService'
import { authService } from '../../services/authService'
import { deliveryService } from '../../services/deliveryService'
import { mongoService } from '../../services/mongoService'
import { monthlyFeeService } from '../../services/monthlyFeeService'
import { paymentService } from '../../services/paymentService'
import { showSuccess, showError, showConfirm, notify } from '../../utils/sweetAlert'
import ResidentNotifications from '../ResidentNotifications'
import CommunityMap from '../CommunityMap'
import ResidentVerification from '../ResidentVerification'
const ResidentDeliveries = ({ building, flatNumber, user }) => {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    const load = async () => {
      if (!building && !flatNumber) return
      setLoading(true)
      try {
        const result = await deliveryService.getResidentDeliveries(building, flatNumber, { limit: 100 })
        if (result.success) setItems(result.data || [])
        else setItems([])
      } finally { setLoading(false) }
    }
    load()
  }, [building, flatNumber])

  const filtered = items.filter(d => {
    const q = search.trim().toLowerCase()
    const matches = !q || [d.vendor, d.agentName, d.agentPhone, d.trackingId, d.packageDescription, d.flatNumber]
      .map(x => (x||'').toString().toLowerCase()).join(' ').includes(q)
    const byStatus = status==='all' ? true : d.status === status
    return matches && byStatus
  })

  const accept = async (id) => {
    const res = await deliveryService.acceptDelivery(id, user.id)
    if (res.success) {
      setItems(prev => prev.map(x => x._id===id ? { ...x, status: 'accepted', updatedAt: new Date().toISOString() } : x))
      showSuccess('Delivery accepted!')
    } else {
      showError('Failed to accept delivery', res.error || 'Try again')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vendor, agent, tracking..." className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        <select value={status} onChange={e=>setStatus(e.target.value)} className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="all">All Status</option>
          <option value="delivered">Delivered</option>
          <option value="accepted">Accepted</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {loading ? (
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      ) : filtered.length===0 ? (
        <div className="text-gray-600 dark:text-gray-400">No deliveries found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3">Vendor</th>
                <th className="text-left py-2 px-3">Package</th>
                <th className="text-left py-2 px-3">Agent</th>
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d._id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{d.vendor}</td>
                  <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300">{d.packageDescription || '-'}<div className="text-xs text-gray-500">{d.trackingId}</div></td>
                  <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300">{d.agentName} <span className="text-xs text-gray-500">{d.agentPhone}</span></td>
                  <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300">{new Date(d.deliveryTime).toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded text-xs ${d.status==='accepted' ? 'bg-green-100 text-green-800' : d.status==='failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{d.status}</span>
                  </td>
                  <td className="py-2 px-3">
                    <button disabled={d.status!=='delivered'} onClick={()=>accept(d._id)} className={`px-3 py-1 rounded-lg text-white text-sm ${d.status==='delivered' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>Accept</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const ResidentDashboard = ({ user, onLogout, currentPage }) => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [needsProfile, setNeedsProfile] = useState(true)
  const [hasSaved, setHasSaved] = useState(false)
  const [residentData, setResidentData] = useState(null)
  const [verificationChecked, setVerificationChecked] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    ownerName: '',
    flatNumber: '',
    building: '',
    photoUrl: ''
  })
  const [errors, setErrors] = useState({})
  const [complaintForm, setComplaintForm] = useState({ title: '', description: '', category: 'general', priority: 'normal' })
  const [complaintSubmitting, setComplaintSubmitting] = useState(false)
  const [myComplaints, setMyComplaints] = useState([])
  const [passForm, setPassForm] = useState({ visitorName: '', visitorPhone: '', visitorEmail: '', validHours: 6 })
  // Service Requests (resident) - light client-side persistence
  const [srForm, setSrForm] = useState({ category: 'Maintenance', priority: 'medium', description: '' })
  const [srSubmitting, setSrSubmitting] = useState(false)
  const [myServiceRequests, setMyServiceRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('service_requests_resident')||'[]') } catch { return [] }
  })
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
  const [fileUploading, setFileUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [assignedLocation, setAssignedLocation] = useState({ building: '', flatNumber: '' })
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [monthlyFee, setMonthlyFee] = useState(null)
  const [monthlyPayments, setMonthlyPayments] = useState([])
  const [monthlyMonth, setMonthlyMonth] = useState(() => {
    const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); return `${y}-${m}`
  })
  const getMonthKey = (d)=>{ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); return `${y}-${m}` }
  const nowForPay = new Date()
  const maxPayMonthKey = getMonthKey(new Date(nowForPay.getFullYear(), nowForPay.getMonth() + 2, 1))
  const minPayMonthKey = getMonthKey(new Date(nowForPay.getFullYear(), nowForPay.getMonth(), 1))
  const shiftMonth = (delta)=>{ const [y,m]=monthlyMonth.split('-').map(Number); const d=new Date(y, m-1, 1); d.setMonth(d.getMonth()+delta); const nextKey = getMonthKey(d); const nextDate = new Date(d); const minDate = new Date(minPayMonthKey+'-01'); const maxDate = new Date(maxPayMonthKey+'-01'); if (nextDate < minDate) { setMonthlyMonth(minPayMonthKey); return } if (nextDate > maxDate) { setMonthlyMonth(maxPayMonthKey); return } setMonthlyMonth(nextKey) }
  const isWithinTwoMonthsAhead = (mk) => {
    try {
      const [y, m] = String(mk).split('-').map(Number)
      if (!y || !m) return false
      const selected = new Date(y, m - 1, 1)
      const now = new Date()
      const max = new Date(now.getFullYear(), now.getMonth() + 2, 1)
      const min = new Date(now.getFullYear(), now.getMonth(), 1)
      return selected >= min && selected <= max
    } catch { return false }
  }

  const getResolvedLocation = () => {
    const b = (assignedLocation.building || form.building || profile?.building || user.building || '').trim()
    const f = (assignedLocation.flatNumber || form.flatNumber || profile?.flatNumber || user.flatNumber || '').trim()
    return { building: b, flatNumber: f }
  }

  useEffect(() => {
    if (activeTab !== 'payments' || !user?.id) return
    ;(async () => {
      try {
        const feeRes = await monthlyFeeService.getFee()
        if (feeRes.success) setMonthlyFee(feeRes.data || null)
        const statusRes = await monthlyFeeService.getStatus(user.id)
        if (statusRes.success) setMonthlyPayments(statusRes.data?.payments || [])
      } catch (e) { console.error('Monthly fee load error:', e); setMonthlyFee(null); setMonthlyPayments([]) }
    })()
  }, [activeTab, user?.id])

  const handlePayMonthlyFee = async () => {
    try {
      if (!monthlyFee?.amount) { showError('No monthly fee configured.'); return }
      if (!isWithinTwoMonthsAhead(monthlyMonth)) { showError('You can only pay current or next 2 months; past or beyond not allowed.'); return }
      // Create order for selected month amount
      const orderResp = await paymentService.createVerificationOrder({ supabaseUserId: user.id, amountPaise: Number(monthlyFee.amount) * 100 })
      if (!orderResp?.success) throw new Error(orderResp?.error || 'Failed to create order')
      const { order, keyId } = orderResp.data
      await new Promise((resolve, reject) => {
        const options = {
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Community Service',
          description: `Monthly Fee ${monthlyMonth}`,
          order_id: order.id,
          prefill: { name: profile?.name || user.name, email: profile?.email || user.email },
          handler: async (response) => {
            try {
              const verify = await paymentService.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                supabaseUserId: user.id,
                month: monthlyMonth,
                type: 'monthly_fee'
              })
              if (verify?.success) {
                showSuccess('Monthly fee paid successfully')
                // refresh status
                const statusRes = await monthlyFeeService.getStatus(user.id)
                if (statusRes.success) setMonthlyPayments(statusRes.data?.payments || [])
                resolve()
              } else {
                showError(verify?.error || 'Payment verification failed'); reject(new Error('verify failed'))
              }
            } catch (err) { reject(err) }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
      })
    } catch (e) {
      console.error('Monthly fee payment error:', e)
      showError(e.message || 'Payment failed')
    }
  }

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
    const resident = (residentsList || []).find(x => x.authUserId === uid)
    const admin = (adminUsers || []).find(a => a.authUserId === uid)
    const user = resident || admin
    const name = user?.name || user?.email || uid || (admin ? 'Admin' : 'Resident')
    const initials = (name || 'R').slice(0,2).toUpperCase()
    const bg = hashToPalette(uid || name)
    return { name, initials, bg }
  }
  const [lastSeenByRoom, setLastSeenByRoom] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('chat_last_seen')||'{}') } catch { return {} }
  })

  // Bill Management State
  const [bills, setBills] = useState([])
  const [billsLoading, setBillsLoading] = useState(false)
  const [billSummary, setBillSummary] = useState({
    totalPending: 0,
    totalOverdue: 0,
    totalPaid: 0,
    recentBills: [],
    recentPayments: []
  })
  const [selectedBill, setSelectedBill] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [billFilters, setBillFilters] = useState({
    status: 'all',
    category: 'all'
  })

  // Notification State
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  // Community Updates State
  const [communityUpdates, setCommunityUpdates] = useState([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [updateFilters, setUpdateFilters] = useState({
    type: 'all', // all, festival, event, announcement, maintenance
    priority: 'all' // all, urgent, high, normal, low
  })
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [showAnnouncementDetail, setShowAnnouncementDetail] = useState(false)

  // Flat and Building Selection State
  const [buildings, setBuildings] = useState([])
  const [availableFlats, setAvailableFlats] = useState([])
  const [flatsLoading, setFlatsLoading] = useState(false)

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
        
        // Check if resident is verified
        const residentResult = await residentService.getResidentByUserId(authUserId)
          if (residentResult.success && residentResult.data) {
          setResidentData(residentResult.data)
          if (residentResult.data.verified) {
            // Load profile for verified residents
            const { resident } = await residentService.getProfile(authUserId)
            const base = {
              name: residentResult.data?.name || user.name || '',
              email: residentResult.data?.email || user.email || '',
              phone: user.phone || '',
              ownerName: '',
              flatNumber: residentResult.data?.flatNumber || user.flatNumber || '',
              building: residentResult.data?.building || user.building || ''
            }
            if (resident) {
              setProfile(resident)
              setForm({
                name: resident.name || base.name,
                email: resident.email || base.email,
                phone: resident.phone || base.phone,
                ownerName: resident.ownerName || base.ownerName,
                flatNumber: resident.flatNumber || base.flatNumber,
                building: resident.building || base.building,
                photoUrl: resident.photoUrl || ''
              })
              setNeedsProfile(!hasRequiredFields(resident))
            } else {
              setForm({ ...base, photoUrl: '' })
              setNeedsProfile(!hasRequiredFields(base))
            }
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setProfileLoading(false)
        setVerificationChecked(true)
      }
    }
    load()
  }, [user])

  // Load admin-assigned location for current user
  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const res = await mongoService.getAdminResidentEntries?.()
        if (res?.success) {
          const match = (res.data || []).find(r => (r.email || '').toLowerCase() === (user?.email || '').toLowerCase())
          if (match) setAssignedLocation({ building: match.building || '', flatNumber: match.flatNumber || '' })
        }
      } catch {}
    }
    if (user?.email) fetchAssigned()
  }, [user?.email])

  // Load buildings when component mounts
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        setFlatsLoading(true)
        const localBuildings = [
          { id: 'A', name: 'Building A', floors: 4, flatsPerFloor: 6, description: 'Premium building with gym and pool' },
          { id: 'B', name: 'Building B', floors: 3, flatsPerFloor: 4, description: 'Standard building with garden' },
          { id: 'C', name: 'Building C', floors: 5, flatsPerFloor: 8, description: 'Luxury building with all amenities' }
        ]
        setBuildings(localBuildings)
        const allFlats = []
        for (const b of localBuildings) {
          allFlats.push(...generateFlats(b.id))
        }
        setAvailableFlats(allFlats)
      } catch (e) {
        console.error('Error loading buildings:', e)
      } finally {
        setFlatsLoading(false)
      }
    }
    const generateFlats = (buildingId) => {
      const configMap = {
        A: { floors: 4, flatsPerFloor: 6 },
        B: { floors: 3, flatsPerFloor: 4 },
        C: { floors: 5, flatsPerFloor: 8 }
      }
      const config = configMap[buildingId] || { floors: 3, flatsPerFloor: 4 }
      const list = []
      for (let floor = 1; floor <= config.floors; floor++) {
        for (let flat = 1; flat <= config.flatsPerFloor; flat++) {
          const flatNumber = `${floor}${String(flat).padStart(2, '0')}`
          list.push({ building: buildingId, flatNumber, floor })
        }
      }
      return list
    }
    loadBuildings()
  }, [])

  const handleBuildingChange = async (buildingId) => {
    try {
      setFlatsLoading(true)
      const all = availableFlats.filter(f => f.building === buildingId)
      const rest = availableFlats.filter(f => f.building !== buildingId)
      // ensure we regenerate quickly if needed
      let current = all
      if (current.length === 0 && buildingId) {
        const regen = []
        const configMap = { A: { floors: 4, flatsPerFloor: 6 }, B: { floors: 3, flatsPerFloor: 4 }, C: { floors: 5, flatsPerFloor: 8 } }
        const cfg = configMap[buildingId] || { floors: 3, flatsPerFloor: 4 }
        for (let floor = 1; floor <= cfg.floors; floor++) {
          for (let flat = 1; flat <= cfg.flatsPerFloor; flat++) {
            const fn = `${floor}${String(flat).padStart(2, '0')}`
            regen.push({ building: buildingId, flatNumber: fn, floor })
          }
        }
        current = regen
        setAvailableFlats([...rest, ...regen])
      }
    } catch (e) {
      console.error('Error loading flats for building:', e)
    } finally {
      setFlatsLoading(false)
    }
  }

  // Sync sidebar route to local tabs
  useEffect(() => {
    if (!currentPage) return
    const map = {
      dashboard: 'dashboard',
      'service-requests': 'service-requests',
      'service_requests': 'service-requests',
      payments: 'payments',
      maintenance: 'payments', // Map maintenance to payments (bill management)
      complaints: 'complaints',
      visitors: 'visitors',
      deliveries: 'deliveries',
      map: 'map',
      announcements: 'announcements',
      notifications: 'notifications',
      profile: 'profile',
      chat: 'chat'
    }
    const next = map[currentPage] || 'dashboard'
    try { console.log('ResidentDashboard route map:', { currentPage, next }) } catch {}
    setActiveTab(next)
  }, [currentPage])

  // Load my service requests when switching to service-requests tab
  useEffect(() => {
    const fetchMyServiceRequests = async () => {
      if (activeTab !== 'service-requests' || !user?.id) return
      try {
        // Try Mongo first
        const result = await mongoService.listServiceRequests({ residentAuthUserId: user.id, limit: 100 })
        if (result.success) {
          setMyServiceRequests(result.data || [])
          try { localStorage.setItem('service_requests_resident', JSON.stringify(result.data || [])) } catch {}
        } else {
          // fallback: keep local
        }
      } catch (e) {
        console.error('Error loading my service requests:', e)
      }
    }
    fetchMyServiceRequests()
  }, [activeTab, user])

  // Load bills when payments tab is active
  useEffect(() => {
    const fetchBills = async () => {
      if (activeTab !== 'payments' || !user?.id) return
      try {
        setBillsLoading(true)
        const [billsResult, summaryResult, historyResult] = await Promise.all([
          billService.getResidentBills(user.id),
          billService.getResidentBillSummary(user.id),
          billService.getPaymentHistory(user.id)
        ])
        
        if (billsResult.success) {
          setBills(billsResult.data?.bills || [])
        }
        if (summaryResult.success) {
          setBillSummary(summaryResult.data)
        }
        if (historyResult.success) {
          setPaymentHistory(historyResult.data?.payments || [])
        }
      } catch (e) {
        console.error('Error loading bill data:', e)
        setBills([])
        setPaymentHistory([])
      } finally {
        setBillsLoading(false)
      }
    }
    fetchBills()
  }, [activeTab, user])

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
        // Load only admin-created residents and admin users to create unified group
        try {
          // Use the same approach as AdminUserManagementSimple - get admin resident entries
          const res = await mongoService.getAdminResidentEntries?.()
          const residents = res?.success ? (res.data || []) : []
          setResidentsList(residents)
          const residentIds = residents.map(r => r.authUserId || r._id).filter(Boolean)
          console.log('Resident chat: Found admin-created residents:', residentIds.length)
          console.log('Resident chat: Current user ID:', user.id)
          
          // Create unified community group with all residents (including current user)
          // Admin will add themselves when they load their dashboard
          const allIds = [...residentIds]
          // Ensure current user is included in the group
          if (!allIds.includes(user.id)) {
            allIds.push(user.id)
          }
          console.log('Resident chat: Creating community group with IDs:', allIds)
          // Always create group, even with just current user
          if (allIds.length > 0) {
            const groupResult = await chatService.createOrGetGroupRoom('Community Group', allIds)
            console.log('Resident chat: Group creation result:', groupResult)
          } else {
            // Fallback: create group with just current user
            console.log('Resident chat: No residents found, creating group with current user only')
            const groupResult = await chatService.createOrGetGroupRoom('Community Group', [user.id])
            console.log('Resident chat: Fallback group creation result:', groupResult)
          }
          
          // Wait a moment for group creation to complete, then load rooms
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (e) {
          console.error('Error creating community group:', e)
        }
        
        // Load rooms after group creation
        const { rooms } = await chatService.listRooms(user.id)
        const rs = rooms || []
        console.log('Resident chat: Loaded rooms:', rs)
        console.log('Resident chat: Room types:', rs.map(r => ({ id: r._id, type: r.type, name: r.name, members: r.memberAuthUserIds?.length })))
        
        // Extract admin users from group rooms
        const groupRoom = rs.find(r => r.type === 'group' && r.name === 'Community Group')
        console.log('Resident chat: Looking for group room:', groupRoom)
        console.log('Resident chat: All group rooms:', rs.filter(r => r.type === 'group'))
        if (groupRoom && groupRoom.memberAuthUserIds) {
          const residentIds = (residentsList || []).map(r => r.authUserId).filter(Boolean)
          const adminIds = groupRoom.memberAuthUserIds.filter(id => !residentIds.includes(id) && id !== user.id)
          console.log('Resident chat: Found admin IDs in group:', adminIds)
          
          // Create admin user objects for display
          const admins = adminIds.map(adminId => ({
            authUserId: adminId,
            name: `Admin ${adminId.slice(-4)}`, // Show last 4 chars of ID
            email: `admin@community.com`,
            role: 'admin',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminId}`
          }))
          setAdminUsers(admins)
        }
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
        if (!selectedRoomId && (rs || []).length > 0) {
          // Prefer Community Group first, then any other group, then first room
          const communityGroup = rs.find(r=>r.type==='group' && r.name === 'Community Group')
          const anyGroup = rs.find(r=>r.type==='group')
          setSelectedRoomId((communityGroup || anyGroup || rs[0])._id)
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
        console.log('Resident chat: Loading messages for room:', selectedRoomId)
        const { messages } = await chatService.listMessages(selectedRoomId, undefined, 30)
        console.log('Resident chat: Loaded messages:', messages)
        setMessages(messages || [])
        setHasMoreMsgs((messages || []).length === 30)
      } catch (e) {
        console.error(e)
        setMessages([])
      } finally { setMessagesLoading(false) }
    }
    loadMessages()
  }, [activeTab, selectedRoomId])

  // Periodically check if Community Group exists
  useEffect(() => {
    if (activeTab === 'chat' && user?.id) {
      const checkCommunityGroup = async () => {
        const communityGroup = (chatRooms || []).find(r => r.type === 'group' && r.name === 'Community Group')
        if (!communityGroup) {
          console.log('Community Group not found, ensuring it exists...')
          await ensureCommunityGroup()
          // Reload rooms after ensuring group exists
          const { rooms } = await chatService.listRooms(user.id)
          setChatRooms(rooms || [])
        }
      }

      // Check every 5 seconds if Community Group is missing
      const interval = setInterval(checkCommunityGroup, 5000)
      return () => clearInterval(interval)
    }
  }, [activeTab, user?.id, chatRooms])

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

  // Ensure Community Group exists
  const ensureCommunityGroup = async () => {
    try {
      // Use the same approach as AdminUserManagementSimple - get admin resident entries
      const res = await mongoService.getAdminResidentEntries?.()
      const residents = res?.success ? (res.data || []) : []
      const residentIds = residents.map(r => r.authUserId || r._id).filter(Boolean)
      const allIds = [...residentIds]
      if (!allIds.includes(user.id)) {
        allIds.push(user.id)
      }
      console.log('Ensuring Community Group exists with admin-created residents:', allIds.length, 'IDs')
      await chatService.createOrGetGroupRoom('Community Group', allIds)
      return true
    } catch (e) {
      console.error('Error ensuring Community Group:', e)
      return false
    }
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
    } catch (e) { console.error(e); showError('Failed to send message', 'Please check your connection and try again.') }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!chatFileService.isSupportedFileType(file.type)) {
      showError('Unsupported file type', 'Please select an image, video, PDF, or document file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showError('File too large', 'Please select a file smaller than 10MB.')
      return
    }

    setSelectedFile(file)
  }

  const sendFileMessage = async () => {
    if (!selectedFile || !selectedRoomId) return
    
    try {
      setFileUploading(true)
      const room = (chatRooms || []).find(r => r._id === selectedRoomId)
      if (!room) return

      // Upload file
      const uploadResult = await chatFileService.uploadChatFile(selectedFile)
      if (!uploadResult.success) {
        showError('Upload failed', uploadResult.error)
        return
      }

      // Send file message
      await chatService.sendFileMessage(
        selectedRoomId,
        user.id,
        user.name || user.email || 'Resident',
        uploadResult.data,
        composer.trim() || ''
      )

      // Clear file and composer
      setSelectedFile(null)
      setComposer('')
      
      // Refresh messages
      const { messages } = await chatService.listMessages(selectedRoomId, undefined, 30)
      setMessages(messages || [])
      
      // Update room list
      const { rooms } = await chatService.listRooms(user.id)
      setChatRooms(rooms || [])
      
      showSuccess('File sent successfully!')
    } catch (e) {
      console.error('Error sending file:', e)
      showError('Failed to send file', 'Please try again.')
    } finally {
      setFileUploading(false)
    }
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
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

  // Load notifications function (can be called from anywhere)
  const loadNotifications = async () => {
    if (!user?.id) return
    try {
      setNotificationsLoading(true)
      
      // Load regular notifications
      const result = await notificationService.getUserNotifications(user.id, { limit: 50, role: 'resident' })
      let regularNotifications = []
      if (result.success) {
        regularNotifications = result.data?.notifications || []
      }
      
      // Load delivery notifications
      // Extract building and flat from user profile or use defaults
      const loc1 = getResolvedLocation()
      const b1 = loc1.building || 'A'
      const f1 = loc1.flatNumber || '101'
      console.log('🔍 Loading delivery notifications for:', b1, f1)
      const dnRes = await deliveryService.getResidentNotifications(b1, f1)
      const deliveryNotifications = Array.isArray(dnRes) ? dnRes : (dnRes?.data || [])
      console.log('📦 Delivery notifications found:', deliveryNotifications)
      
      // Combine and sort notifications by date
      const allNotifications = [...regularNotifications, ...(Array.isArray(deliveryNotifications) ? deliveryNotifications : [])]
      allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      
      setNotifications(allNotifications)
    } catch (e) {
      console.error('Error loading notifications:', e)
      setNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }

  // Load notifications when notifications tab is active or on dashboard
  useEffect(() => {
    if (activeTab === 'notifications' || activeTab === 'dashboard') {
      loadNotifications()
    }
  }, [activeTab, user, profile, form])

  // Auto-refresh notifications every 30 seconds when on notifications tab or dashboard
  // Disabled auto-refresh of notifications on request
  useEffect(() => {
    return () => {}
  }, [activeTab, user, profile, form])

  // Listen for storage changes (when new notifications are added)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('resident_notifications_')) {
        console.log('📢 Storage change detected, refreshing notifications...')
        loadNotifications()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events for same-tab updates
    const handleNotificationUpdate = (event) => {
      console.log('📢 Custom notification event received:', event.detail)
      console.log('📢 Refreshing notifications...')
      loadNotifications()
    }
    
    window.addEventListener('deliveryNotificationCreated', handleNotificationUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('deliveryNotificationCreated', handleNotificationUpdate)
    }
  }, [user, profile, form])

  // Load community updates when announcements tab is active
  useEffect(() => {
    const fetchCommunityUpdates = async () => {
      if (activeTab !== 'announcements' || !user?.id) return
      try {
        setUpdatesLoading(true)
        const result = await announcementService.getAnnouncements({ 
          limit: 50,
          type: updateFilters.type !== 'all' ? updateFilters.type : undefined,
          priority: updateFilters.priority !== 'all' ? updateFilters.priority : undefined
        }, user.role)
        
        if (result.success) {
          setCommunityUpdates(result.data || [])
        } else {
          console.error('Error loading announcements:', result.error)
          setCommunityUpdates([])
        }
      } catch (e) {
        console.error('Error loading community updates:', e)
        setCommunityUpdates([])
      } finally {
        setUpdatesLoading(false)
      }
    }
    fetchCommunityUpdates()
  }, [activeTab, user, updateFilters.type, updateFilters.priority])

  const createPass = async () => {
    if (!user?.id) return
    try {
      setCreatingPass(true)
      if (!passForm.visitorName.trim() || !passForm.visitorPhone.trim()) return
      const { building, flatNumber } = getResolvedLocation()
      const payload = {
        visitorName: passForm.visitorName,
        visitorPhone: passForm.visitorPhone,
        visitorEmail: passForm.visitorEmail,
        hostAuthUserId: user.id,
        hostName: user.name || '',
        hostPhone: form.phone || user.phone || '',
        building: building || '',
        flatNumber: flatNumber || '',
        // validUntil computed below
        validUntil: new Date(Date.now() + Number(passForm.validHours || 6) * 60 * 60 * 1000).toISOString()
      }
      // Optional: include a local directions hint in UI after creation; server also computes
      payload.directions = undefined
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

  // Bill Payment Functions
  const handlePayBill = async (bill, paymentMethod = 'card') => {
    if (!user?.id) return
    
    try {
      setPaymentLoading(true)
      
      // Find user's assignment in the bill
      const assignment = bill.assignments?.find(a => a.residentId === user.id)
      if (!assignment) {
        showError('Bill Assignment Not Found', 'This bill is not assigned to you.')
        return
      }

      const paymentData = {
        billId: bill._id,
        residentId: user.id,
        amount: assignment.amount,
        paymentMethod,
        paymentDetails: {
          billTitle: bill.title,
          category: bill.category,
          dueDate: bill.dueDate
        }
      }

      const result = await billService.processPayment(paymentData)
      
      if (result.success) {
        showSuccess('Payment Successful!', 'Your payment has been processed successfully.')
        setSelectedBill(null)
        
        // Reload bill data
        const [billsResult, summaryResult, historyResult] = await Promise.all([
          billService.getResidentBills(user.id),
          billService.getResidentBillSummary(user.id),
          billService.getPaymentHistory(user.id)
        ])
        
        if (billsResult.success) setBills(billsResult.data?.bills || [])
        if (summaryResult.success) setBillSummary(summaryResult.data)
        if (historyResult.success) setPaymentHistory(historyResult.data?.payments || [])
      } else {
        showError('Payment Failed', result.error || 'Please try again later.')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      showError('Payment Failed', error.message || 'Please check your connection and try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const matchesStatus = billFilters.status === 'all' || 
      (billFilters.status === 'pending' && bill.assignments?.find(a => a.residentId === user.id)?.status === 'pending') ||
      (billFilters.status === 'paid' && bill.assignments?.find(a => a.residentId === user.id)?.status === 'paid')
    
    const matchesCategory = billFilters.category === 'all' || bill.category === billFilters.category
    
    return matchesStatus && matchesCategory
  })

  // Notification handling functions
  const handleNotificationClick = async (notification) => {
    // Mark as read for delivery notifications
    if (notification.type === 'delivery' && notification.status === 'unread') {
      const { building, flatNumber } = getResolvedLocation()
      deliveryService.markNotificationAsRead(notification._id, building || 'A', flatNumber || '101')
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, status: 'read', isRead: true } : n)
      )
    }
    // Mark as read for regular notifications
    else if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification._id)
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        )
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }
    
    // Navigate to relevant page if actionUrl is provided
    if (notification.metadata?.actionUrl) {
      const page = notification.metadata.actionUrl.replace('/', '')
      if (page === 'payments') {
        setActiveTab('payments')
      } else if (page === 'complaints') {
        setActiveTab('complaints')
      }
    }
  }

  const markAllNotificationsAsRead = async () => {
    if (!user?.id) return
    
    try {
      // Mark regular notifications as read
      await notificationService.markAllAsRead(user.id)
      
      // Mark delivery notifications as read
      const { building, flatNumber } = getResolvedLocation()
      const deliveryNotifications = deliveryService.getResidentNotifications(building || 'A', flatNumber || '101')
      deliveryNotifications.forEach(notification => {
        if (notification.status === 'unread') {
          deliveryService.markNotificationAsRead(notification._id, building || 'A', flatNumber || '101')
        }
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, status: 'read' })))
      showSuccess('All Notifications Marked as Read', 'All notifications have been marked as read.')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      showError('Error', 'Failed to mark all notifications as read.')
    }
  }

  const deleteNotification = async (notification) => {
    try {
      console.log('🗑️ Deleting notification:', notification._id, notification.type)
      
      if (notification.type === 'delivery') {
        // Delete delivery notification from localStorage
        const { building, flatNumber } = getResolvedLocation()
        const success = deliveryService.deleteNotification(notification._id, building || 'A', flatNumber || '101')
        
        if (success) {
          // Remove from local state
          setNotifications(prev => prev.filter(n => n._id !== notification._id))
          showSuccess('Notification Deleted', 'Delivery notification has been deleted.')
        } else {
          showError('Delete Failed', 'Failed to delete the notification.')
        }
      } else {
        // Delete regular notification from backend
        const result = await notificationService.deleteNotification(notification._id)
        
        if (result.success) {
          // Remove from local state
          setNotifications(prev => prev.filter(n => n._id !== notification._id))
          showSuccess('Notification Deleted', 'Notification has been deleted.')
        } else {
          showError('Delete Failed', result.error || 'Failed to delete the notification.')
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      showError('Delete Failed', 'Failed to delete the notification.')
    }
  }

  // Share pass functions
  const sharePassViaWhatsApp = (pass) => {
    const link = `${import.meta.env.DEV ? 'http://localhost:5173' : 'https://smartcommunityserbicehub.vercel.app'}/communitymap`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pass.code)}&format=png&bgcolor=ffffff&color=000000&margin=10`
    
    // Calculate time remaining
    const now = new Date()
    const validUntil = new Date(pass.validUntil)
    const timeRemaining = Math.max(0, Math.round((validUntil - now) / (1000 * 60 * 60)))
    const isExpired = validUntil <= now
    const status = isExpired ? '❌ EXPIRED' : timeRemaining <= 1 ? '⚠️ EXPIRES SOON' : '✅ ACTIVE'
    
    const message = `🏠 *VISITOR PASS* 🏠\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 *PASS CODE:* \`${pass.code}\`\n` +
      `📊 *STATUS:* ${status}\n\n` +
      `👤 *VISITOR INFORMATION:*\n` +
      `   • Name: ${pass.visitorName}\n` +
      `   • Phone: ${pass.visitorPhone}\n` +
      `${pass.visitorEmail ? `   • Email: ${pass.visitorEmail}\n` : ''}\n` +
      `🏢 *DESTINATION DETAILS:*\n` +
      `   • Building: ${pass.building}\n` +
      `   • Flat: ${pass.flatNumber}\n` +
      `   • Host: ${pass.hostName || 'Community Resident'}\n` +
      `${pass.hostPhone ? `   • Host Phone: ${pass.hostPhone}\n` : ''}\n\n` +
      `⏰ *VALIDITY INFORMATION:*\n` +
      `   • Valid Until: ${validUntil.toLocaleString()}\n` +
      `   • Time Remaining: ${isExpired ? 'Expired' : timeRemaining + ' hours'}\n` +
      `   • Created: ${new Date(pass.createdAt || Date.now()).toLocaleString()}\n\n` +
      `🗺️ *NAVIGATION & VERIFICATION:*\n` +
      `   • Community Map: ${link}\n` +
      `   • QR Code: Please check the image attached below\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *INSTRUCTIONS FOR VISITOR:*\n\n` +
      `1️⃣ *Arrival:* Present this pass at the main gate\n` +
      `2️⃣ *Verification:* Show the QR code image attached below\n` +
      `3️⃣ *Navigation:* Follow the community map link\n` +
      `4️⃣ *Contact:* Call host if assistance is needed\n` +
      `5️⃣ *Security:* Keep this pass handy throughout visit\n\n` +
      `⚠️ *IMPORTANT NOTES:*\n` +
      `• This pass is valid only for the specified time period\n` +
      `• Please arrive on time to avoid expiration\n` +
      `• Contact your host if you have any questions\n` +
      `• Keep this message accessible during your visit\n` +
      `• QR code image is attached below for verification\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Generated by: ${pass.hostName || 'Community Resident'}\n` +
      `Community Service System\n` +
      `Generated on: ${new Date().toLocaleString()}\n\n` +
      `#VisitorPass #CommunityAccess #${pass.building}${pass.flatNumber}`
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    
    // Show instructions to user about QR code
    showSuccess(
      'WhatsApp Sharing Ready', 
      `The visitor pass message has been prepared for WhatsApp sharing.\n\n📱 Instructions for QR Code:\n• WhatsApp will open with the pass message\n• To include the QR code image:\n  1. Click the attachment icon (📎) in WhatsApp\n  2. Select "Camera" or "Gallery"\n  3. Take a screenshot of the QR code from the pass display above\n  4. Or save this QR code URL: ${qrCodeUrl}\n\n✅ The pass code "${pass.code}" is included in the message for manual verification if needed.`
    )
    
    window.open(whatsappUrl, '_blank')
  }

  // Download QR code as image
  const downloadQRCode = async (pass) => {
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(pass.code)}&format=png&bgcolor=ffffff&color=000000&margin=20`
      
      // Create a temporary link to download the QR code
      const link = document.createElement('a')
      link.href = qrCodeUrl
      link.download = `visitor-pass-qr-${pass.code}.png`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showSuccess('QR Code Downloaded', 'QR code image has been downloaded. You can now attach it to WhatsApp or other messaging apps.')
    } catch (error) {
      console.error('Error downloading QR code:', error)
      showError('Download Failed', 'Unable to download QR code. Please try again.')
    }
  }

  const sharePassViaEmail = async (pass) => {
    const link = `${import.meta.env.DEV ? 'http://localhost:5173' : 'https://smartcommunityserbicehub.vercel.app'}/communitymap`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pass.code)}&format=png&bgcolor=ffffff&color=000000&margin=10`
    
    const subject = `🏠 Visitor Pass - ${pass.visitorName} - ${pass.building}${pass.flatNumber}`
    const body = `Dear ${pass.visitorName},\n\n` +
      `You have been granted a visitor pass for our community. Please find all the details below:\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `VISITOR PASS DETAILS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 PASS CODE: ${pass.code}\n\n` +
      `👤 VISITOR INFORMATION:\n` +
      `   • Name: ${pass.visitorName}\n` +
      `   • Phone: ${pass.visitorPhone}\n` +
      `${pass.visitorEmail ? `   • Email: ${pass.visitorEmail}\n` : ''}\n` +
      `🏢 DESTINATION:\n` +
      `   • Building: ${pass.building}\n` +
      `   • Flat: ${pass.flatNumber}\n` +
      `   • Host: ${pass.hostName || 'Community Resident'}\n` +
      `${pass.hostPhone ? `   • Host Phone: ${pass.hostPhone}\n` : ''}\n\n` +
      `⏰ VALIDITY:\n` +
      `   • Valid Until: ${new Date(pass.validUntil).toLocaleString()}\n` +
      `   • Time Remaining: ${Math.round((new Date(pass.validUntil) - new Date()) / (1000 * 60 * 60))} hours\n\n` +
      `🗺️ NAVIGATION:\n` +
      `   • Community Map: ${link}\n` +
      `   • QR Code: ${qrCodeUrl}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `INSTRUCTIONS:\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `1. Present this pass at the main gate\n` +
      `2. Show the QR code for verification\n` +
      `3. Follow the community map for directions\n` +
      `4. Contact your host if you need assistance\n\n` +
      `⚠️ IMPORTANT: This pass is valid only for the specified time period.\n\n` +
      `Best regards,\n` +
      `${pass.hostName || user.name || 'Community Resident'}\n` +
      `Community Service System\n` +
      `Generated on: ${new Date().toLocaleString()}`

    const mailtoUrl = `mailto:${pass.visitorEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, '_blank')
  }

  const copyPassToClipboard = async (pass) => {
    const link = `${import.meta.env.DEV ? 'http://localhost:5173' : 'https://smartcommunityserbicehub.vercel.app'}/communitymap`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pass.code)}&format=png&bgcolor=ffffff&color=000000&margin=10`
    
    const passText = `🏠 VISITOR PASS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 PASS CODE: ${pass.code}\n\n` +
      `👤 VISITOR INFORMATION:\n` +
      `   • Name: ${pass.visitorName}\n` +
      `   • Phone: ${pass.visitorPhone}\n` +
      `${pass.visitorEmail ? `   • Email: ${pass.visitorEmail}\n` : ''}\n` +
      `🏢 DESTINATION:\n` +
      `   • Building: ${pass.building}\n` +
      `   • Flat: ${pass.flatNumber}\n` +
      `   • Host: ${pass.hostName || 'Community Resident'}\n` +
      `${pass.hostPhone ? `   • Host Phone: ${pass.hostPhone}\n` : ''}\n\n` +
      `⏰ VALIDITY:\n` +
      `   • Valid Until: ${new Date(pass.validUntil).toLocaleString()}\n` +
      `   • Time Remaining: ${Math.round((new Date(pass.validUntil) - new Date()) / (1000 * 60 * 60))} hours\n\n` +
      `🗺️ NAVIGATION:\n` +
      `   • Community Map: ${link}\n` +
      `   • QR Code: ${qrCodeUrl}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `INSTRUCTIONS:\n` +
      `1. Present this pass at the main gate\n` +
      `2. Show the QR code for verification\n` +
      `3. Follow the community map for directions\n` +
      `4. Contact your host if you need assistance\n\n` +
      `Generated by: ${pass.hostName || 'Community Resident'}\n` +
      `Generated on: ${new Date().toLocaleString()}`
    
    try {
      await navigator.clipboard.writeText(passText)
      showSuccess('Copied to Clipboard', 'Complete pass details have been copied to your clipboard.')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      showError('Copy Failed', 'Unable to copy to clipboard. Please try again.')
    }
  }

  // Community Updates Functions
  const markUpdateAsRead = (updateId) => {
    setCommunityUpdates(prev => 
      prev.map(update => 
        update._id === updateId ? { ...update, isRead: true } : update
      )
    )
  }

  const markAllUpdatesAsRead = () => {
    setCommunityUpdates(prev => 
      prev.map(update => ({ ...update, isRead: true }))
    )
    showSuccess('All Updates Marked as Read', 'All community updates have been marked as read.')
  }


  const shareUpdate = (update) => {
    const message = `🏠 *${update.title}*\n\n` +
      `📅 *Date:* ${new Date(update.date).toLocaleDateString()}\n` +
      `📍 *Location:* ${update.location}\n` +
      `👤 *Organizer:* ${update.organizer}\n\n` +
      `${update.content}\n\n` +
      `Shared from Community App`
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleAnnouncementClick = (update) => {
    setSelectedAnnouncement(update)
    setShowAnnouncementDetail(true)
    markUpdateAsRead(update._id)
  }

  const closeAnnouncementDetail = () => {
    setShowAnnouncementDetail(false)
    setSelectedAnnouncement(null)
  }

  // Get flats for selected building
  const getFlatsForBuilding = (buildingId) => {
    if (!buildingId) return []
    const flats = availableFlats
      .filter(flat => flat.building === buildingId && flat.available)
      .sort((a, b) => {
        // Sort by floor first, then by flat number
        if (a.floor !== b.floor) return a.floor - b.floor
        return a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true })
      })
    
    // Debug logging
    console.log(`Getting flats for building ${buildingId}:`, {
      totalAvailableFlats: availableFlats.length,
      buildingFlats: flats.length,
      allFlats: availableFlats.filter(flat => flat.building === buildingId)
    })
    
    return flats
  }

  // Filter community updates
  const filteredUpdates = communityUpdates.filter(update => {
    const matchesType = updateFilters.type === 'all' || update.type === updateFilters.type
    const matchesPriority = updateFilters.priority === 'all' || update.priority === updateFilters.priority
    return matchesType && matchesPriority
  })

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
      else if (form.building && !getFlatsForBuilding(form.building).some(f => f.flatNumber === form.flatNumber)) {
        nextErrors.flatNumber = 'Selected flat is not available'
      }
      if (!form.phone.trim()) nextErrors.phone = 'Phone is required'
      else if (!/^\+?[0-9]{7,15}$/.test(form.phone.trim())) nextErrors.phone = 'Enter a valid phone number'
      if (!form.building.trim()) nextErrors.building = 'Select a building'
      else if (!buildings.some(b => b.id === form.building)) nextErrors.building = 'Invalid building'

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
        building: form.building,
        photoUrl: form.photoUrl || ''
      })
      setHasSaved(true)
      setNeedsProfile(false)
      
      // Update profile state with new data
      setProfile({
        ...profile,
        phone: form.phone,
        ownerName: form.ownerName,
        flatNumber: form.flatNumber,
        building: form.building,
        photoUrl: form.photoUrl || profile?.photoUrl
      })
      
      // Show success message and switch back to profile view
      showSuccess('Profile Updated', 'Your profile has been updated successfully.')
      setActiveTab('profile')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarSelect = async (e) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      setAvatarUploading(true)
      // Reuse chat file uploader for simplicity
      const res = await chatFileService.uploadChatFile(file)
      if (res?.success && res.data) {
        const url = res.data.publicUrl || res.data.url || res.data.path || ''
        if (url) setForm(prev => ({ ...prev, photoUrl: url }))
      } else {
        showError('Upload failed', res?.error || 'Could not upload image.')
      }
    } catch (err) {
      console.error('Avatar upload error:', err)
      showError('Upload failed', 'Please try again.')
    } finally {
      setAvatarUploading(false)
      try { e.target.value = '' } catch {}
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



  const handleVerificationSuccess = (resident) => {
    setResidentData(resident)
    setVerificationChecked(true)
    try { setActiveTab('profile') } catch {}
  }

  const renderContent = () => {
    // Block access until verification status is known
    if (!verificationChecked) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">Checking verification…</div>
        </div>
      )
    }

    // If not verified or no record yet, require verification (full page)
    if (!residentData || !residentData.verified) {
      return (
        <div className="min-h-[70vh]">
          <ResidentVerification user={user} onVerified={handleVerificationSuccess} />
        </div>
      )
    }

    const tabKey = String(activeTab || '').toLowerCase().replace(/_/g, '-').trim()
    try { console.log('ResidentDashboard rendering tab:', tabKey) } catch {}
    switch (tabKey) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <CreditCard className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹{billSummary.totalPending?.toLocaleString() || 0}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Bills</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{myComplaints.filter(c => c.status !== 'resolved').length}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Complaints</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                <QrCode className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{myPasses.length}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Passes</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
                <Bell className="w-8 h-8 text-orange-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.filter(n => !n.isRead && n.status !== 'read').length}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unread Notifications</p>
              </div>
            </div>

            {/* Delivery Notifications Preview */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📦 Recent Deliveries</h3>
                <button
                  onClick={() => setActiveTab('deliveries')}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  View All
                </button>
              </div>
              
              {notifications.filter(n => n.type === 'delivery').length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">No delivery notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.filter(n => n.type === 'delivery').slice(0, 3).map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        (!notification.isRead || notification.status === 'unread') 
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 
                              className="font-medium text-gray-900 dark:text-white text-sm cursor-pointer"
                              onClick={() => setActiveTab('deliveries')}
                            >
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification)
                              }}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors text-xs"
                              title="Delete notification"
                            >
                              🗑️
                            </button>
                          </div>
                          <p 
                            className="text-xs text-gray-600 dark:text-gray-400 mt-1 cursor-pointer"
                            onClick={() => setActiveTab('deliveries')}
                          >
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Bills</h3>
                {bills.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No bills yet.</p>
                ) : (
                  <div className="space-y-3">
                    {bills.slice(0, 3).map((bill) => {
                      const assignment = bill.assignments?.find(a => a.residentId === user.id)
                      if (!assignment) return null
                      return (
                        <div key={bill._id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{bill.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Due: {new Date(bill.dueDate).toLocaleDateString()}</p>
                          </div>
                          <span className={`font-semibold ${assignment.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{assignment.amount?.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Announcements</h3>
                {communityUpdates.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No announcements yet.</p>
                ) : (
                  <div className="space-y-3">
                    {communityUpdates.slice(0, 3).map((update) => (
                      <div key={update._id} className={`p-3 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        update.type === 'festival' ? 'bg-orange-50 dark:bg-orange-900/20' :
                        update.type === 'event' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        update.type === 'announcement' ? 'bg-green-50 dark:bg-green-900/20' :
                        'bg-red-50 dark:bg-red-900/20'
                      }`} onClick={() => setActiveTab('announcements')}>
                        <div className="flex items-center justify-between">
                          <p className={`font-medium text-sm ${
                            update.type === 'festival' ? 'text-orange-900 dark:text-orange-300' :
                            update.type === 'event' ? 'text-blue-900 dark:text-blue-300' :
                            update.type === 'announcement' ? 'text-green-900 dark:text-green-300' :
                            'text-red-900 dark:text-red-300'
                          }`}>
                            {update.title}
                          </p>
                          {!update.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(update.date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Service Requests Summary */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Service Requests</h3>
                <button
                  onClick={() => setActiveTab('service-requests')}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Create New
                </button>
              </div>
              {myServiceRequests.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No service requests yet.</p>
              ) : (
                <div className="space-y-2">
                  {myServiceRequests.slice(0, 5).map(r => (
                    <div key={r._id || r.requestId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.category}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{r.description?.slice(0, 50)}...</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.status==='created'?'bg-gray-100 text-gray-800': 
                        r.status==='assigned'?'bg-amber-100 text-amber-800': 
                        r.status==='in_progress'?'bg-blue-100 text-blue-800': 
                        r.status==='completed'?'bg-purple-100 text-purple-800':
                        'bg-green-100 text-green-800'
                      }`}>
                        {String(r.status||'').replace('_',' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      case 'service-requests':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create Service Request</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={srForm.category} onChange={e=>setSrForm({...srForm, category: e.target.value})}>
                    <option value="Maintenance">Maintenance</option>
                    <option value="IT Support">IT Support</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Administration">Administration</option>
                    <option value="Reception">Reception</option>
                    <option value="Accounts">Accounts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={srForm.priority} onChange={e=>setSrForm({...srForm, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <input readOnly className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={(() => { const { building, flatNumber } = getResolvedLocation(); return `${building || 'A'}-${flatNumber || '101'}` })()} />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea rows={3} className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={srForm.description} onChange={e=>setSrForm({...srForm, description: e.target.value})} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={async () => {
                    if (!srForm.description.trim()) return
                    setSrSubmitting(true)
                    const { building, flatNumber } = getResolvedLocation()
                    const payload = {
                      category: srForm.category,
                      priority: srForm.priority,
                      description: srForm.description.trim(),
                      building: building || 'A',
                      flatNumber: flatNumber || '101',
                      residentAuthUserId: user.id,
                      residentName: user.name || '',
                      status: 'created',
                      createdAt: new Date().toISOString()
                    }
                    try {
                    const res = await mongoService.createServiceRequest(payload)
                      if (res.success) {
                        const created = res.data
                        setMyServiceRequests(prev => [created, ...prev])
                        try { localStorage.setItem('service_requests_resident', JSON.stringify([created, ...myServiceRequests])) } catch {}
                        window.dispatchEvent(new CustomEvent('serviceRequestCreated', { detail: created }))
                      // Notify only staff in the selected department
                      try {
                        const staffResult = await authService.getStaffUsers()
                        if (staffResult?.success) {
                          const department = srForm.category // matches Admin staffDepartment labels
                          const targetUsers = (staffResult.users || [])
                            .filter(u => (u.staffDepartment || '') === department)
                            .map(u => u.id)
                            .filter(Boolean)
                          if (targetUsers.length > 0) {
                            await notificationService.create({
                              title: 'New Service Request',
                              message: `${department}: ${payload.description} @ ${payload.building}-${payload.flatNumber}`,
                              type: 'info',
                              priority: (payload.priority || 'medium'),
                              targetUsers,
                              metadata: { actionUrl: '/tasks' }
                            })
                          }
                        }
                      } catch (notifyErr) { console.warn('Notify staff failed:', notifyErr) }
                        showSuccess('Request submitted', 'Your service request has been created.')
                      } else {
                        // Fallback to local if API failed
                        const localItem = { _id: 'SR-'+Date.now(), requestId: 'SR-'+Date.now(), ...payload }
                        setMyServiceRequests(prev => [localItem, ...prev])
                        try {
                          const next = [localItem, ...myServiceRequests]
                          localStorage.setItem('service_requests_resident', JSON.stringify(next))
                          const existing = JSON.parse(localStorage.getItem('service_requests')||'[]')
                          localStorage.setItem('service_requests', JSON.stringify([localItem, ...existing]))
                          window.dispatchEvent(new CustomEvent('serviceRequestCreated', { detail: localItem }))
                        } catch {}
                        showError('Offline mode', 'Saved locally. Start Mongo server to sync.')
                      }
                    } catch (e) {
                      console.error(e)
                    } finally {
                      setSrForm({ category: 'Maintenance', priority: 'medium', description: '' })
                      setSrSubmitting(false)
                    }
                  }}
                  disabled={srSubmitting || !srForm.description.trim()}
                  className={`px-4 py-2 rounded-lg text-white ${srSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {srSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Requests</h3>
              {myServiceRequests.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No requests yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2">ID</th>
                        <th className="text-left py-2">Category</th>
                        <th className="text-left py-2">Priority</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Created</th>
                        <th className="text-left py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myServiceRequests.map(r => (
                        <tr key={r._id} className="border-b dark:border-gray-700">
                          <td className="py-2 text-gray-900 dark:text-white font-mono">{r.requestId}</td>
                          <td className="py-2 capitalize">{r.category}</td>
                          <td className="py-2 capitalize">
                            <span className={`px-2 py-1 rounded text-xs ${r.priority==='urgent'?'bg-red-100 text-red-800': r.priority==='high'?'bg-orange-100 text-orange-800': r.priority==='medium'?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-800'}`}>{r.priority}</span>
                          </td>
                          <td className="py-2 capitalize">
                            <span className={`px-2 py-1 rounded text-xs ${r.status==='created'?'bg-gray-100 text-gray-800': r.status==='assigned'?'bg-amber-100 text-amber-800': r.status==='in_progress'?'bg-blue-100 text-blue-800': r.status==='completed'?'bg-purple-100 text-purple-800':'bg-green-100 text-green-800'}`}>{r.status.replace('_',' ')}</span>
                          </td>
                          <td className="py-2">{new Date(r.createdAt).toLocaleString()}</td>
                          <td className="py-2 text-gray-700 dark:text-gray-300 max-w-md truncate" title={r.description}>{r.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      case 'deliveries':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">My Deliveries</h3>
              {(() => { const { building, flatNumber } = getResolvedLocation(); return (
                <ResidentDeliveries building={building} flatNumber={flatNumber} user={user} />
              )})()}
            </div>
          </div>
        )
      case 'payments':
        return (
          <div className="space-y-6">
            {/* Monthly Fee Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Maintenance Fee</h3>
                  <div className="mt-1 text-gray-600 dark:text-gray-400 text-sm">Amount: ₹{monthlyFee?.amount ?? '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>shiftMonth(-1)} className="px-2 py-1 border dark:border-gray-600 rounded">◀</button>
                  <input type="month" value={monthlyMonth} min={minPayMonthKey} max={maxPayMonthKey} onChange={e=>setMonthlyMonth(e.target.value)} className="px-3 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <button onClick={()=>shiftMonth(1)} className="px-2 py-1 border dark:border-gray-600 rounded">▶</button>
                </div>
              </div>
              <div className="mt-4 flex gap-3 items-center">
                {monthlyPayments.some(p => p.month === monthlyMonth) ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-green-100 text-green-800 text-sm">Paid</span>
                ) : !isWithinTwoMonthsAhead(monthlyMonth) ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-gray-100 text-gray-600 text-sm">Not available</span>
                ) : (
                  <button onClick={handlePayMonthlyFee} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Pay Now</button>
                )}
              </div>
              {monthlyFee == null && (
                <div className="mt-2 text-sm text-orange-600">Monthly fee is not configured yet. Please contact admin.</div>
              )}
            </div>

            {/* Monthly Payment History */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Payment History</h3>
              </div>
              {monthlyPayments.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No payments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 text-gray-900 dark:text-white">Month</th>
                        <th className="text-left py-2 text-gray-900 dark:text-white">Amount</th>
                        <th className="text-left py-2 text-gray-900 dark:text-white">Paid At</th>
                        <th className="text-left py-2 text-gray-900 dark:text-white">Txn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyPayments.slice().sort((a,b)=>new Date(b.paidAt)-new Date(a.paidAt)).map((p) => (
                        <tr key={(p._id||p.paymentId||p.razorpay_payment_id)+'_'+(p.month||'') } className="border-b dark:border-gray-700">
                          <td className="py-2 text-gray-700 dark:text-gray-300">{p.month || (p.billTitle||'').replace('Monthly Fee ','')}</td>
                          <td className="py-2 text-gray-700 dark:text-gray-300">₹{(p.amount||0)/100}</td>
                          <td className="py-2 text-gray-700 dark:text-gray-300">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '-'}</td>
                          <td className="py-2 text-gray-700 dark:text-gray-300 font-mono text-xs">{p.paymentId || p.razorpay_payment_id || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex gap-2">
                        <button
                          onClick={() => sharePassViaWhatsApp(p)}
                          className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-xs flex items-center gap-1"
                          title="Share via WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => sharePassViaEmail(p)}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs flex items-center gap-1"
                          title="Share via Email"
                        >
                          <Mail className="w-3 h-3" />
                          Email
                        </button>
                        <button
                          onClick={() => copyPassToClipboard(p)}
                          className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 text-xs flex items-center gap-1"
                          title="Copy to Clipboard"
                        >
                          <Share2 className="w-3 h-3" />
                          Copy
                        </button>
                        <button
                          onClick={() => downloadQRCode(p)}
                          className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 text-xs flex items-center gap-1"
                          title="Download QR Code"
                        >
                          <QrCode className="w-3 h-3" />
                          QR
                        </button>
                      </div>
                      <button
                      onClick={async () => {
                      try {
                        const result = await showConfirm('Cancel Pass', 'Are you sure you want to cancel this pass? This cannot be undone.')
                        if (!result.isConfirmed) return
                        // Optimistic UI update
                        setMyPasses(prev => prev.map(x => x._id === p._id ? { ...x, status: 'expired' } : x))
                        // Prefer dedicated expire endpoint; fallback to status if needed
                        try {
                          await passService.expirePass(p.code)
                        } catch {
                          await passService.updatePassStatus(p.code, 'expired')
                        }
                        const { passes } = await passService.listPasses(user.id)
                        setMyPasses((passes || []).filter(x => x.status === 'active'))
                        showSuccess('Pass Cancelled', 'The visitor pass has been cancelled successfully.')
                      } catch (e) {
                        showError('Failed to Cancel Pass', 'Please try again later.')
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
            {/* Header with filters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Community Updates & Announcements</h3>
                {communityUpdates.some(u => !u.isRead) && (
                  <button
                    onClick={markAllUpdatesAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <select
                  value={updateFilters.type}
                  onChange={(e) => setUpdateFilters({...updateFilters, type: e.target.value})}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="announcement">Announcements</option>
                  <option value="event">Events</option>
                  <option value="festival">Festivals</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <select
                  value={updateFilters.priority}
                  onChange={(e) => setUpdateFilters({...updateFilters, priority: e.target.value})}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Updates List */}
            <div className="space-y-4">
              {updatesLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading community updates...</p>
                </div>
              ) : filteredUpdates.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No updates found</p>
                </div>
              ) : (
                filteredUpdates.map((update) => {
                  const isUpcoming = new Date(update.date) > new Date()
                  const isToday = new Date(update.date).toDateString() === new Date().toDateString()
                  
                  return (
                    <div
                      key={update._id}
                      onClick={() => handleAnnouncementClick(update)}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
                        !update.isRead ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
                      }`}
                    >
                      <div className="flex">
                        {/* Left side - Details */}
                        <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {update.title}
                              </h4>
                              {!update.isRead && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-2 py-1 text-xs rounded ${
                                update.type === 'festival' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                                update.type === 'event' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                                update.type === 'announcement' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                              }`}>
                                {update.type}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${
                                update.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                                update.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                                update.priority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {update.priority}
                              </span>
                              {isToday && (
                                <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                                  Today
                                </span>
                              )}
                              {isUpcoming && !isToday && (
                                <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                  Upcoming
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              shareUpdate(update)
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Share via WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                          {update.content}
                        </p>
                        
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {new Date(update.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">{update.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">{update.organizer}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side - Image */}
                        {update.image && (
                          <div className="w-48 h-48 flex-shrink-0 p-4">
                            <img
                              src={update.image}
                              alt={update.title}
                              className="w-full h-full object-cover rounded-lg shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Announcement Detail Modal */}
            {showAnnouncementDetail && selectedAnnouncement && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex">
                    {/* Left side - Full details */}
                    <div className="flex-1 p-8">
                      <div className="flex items-start justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedAnnouncement.title}
                        </h2>
                        <button
                          onClick={closeAnnouncementDetail}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-6">
                        <span className={`px-3 py-1 text-sm rounded ${
                          selectedAnnouncement.type === 'festival' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                          selectedAnnouncement.type === 'event' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                          selectedAnnouncement.type === 'announcement' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                        }`}>
                          {selectedAnnouncement.type}
                        </span>
                        <span className={`px-3 py-1 text-sm rounded ${
                          selectedAnnouncement.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                          selectedAnnouncement.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                          selectedAnnouncement.priority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {selectedAnnouncement.priority}
                        </span>
                        {new Date(selectedAnnouncement.date).toDateString() === new Date().toDateString() && (
                          <span className="px-3 py-1 text-sm rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                            Today
                          </span>
                        )}
                        {new Date(selectedAnnouncement.date) > new Date() && (
                          <span className="px-3 py-1 text-sm rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                            Upcoming
                          </span>
                        )}
                      </div>

                      <div className="prose dark:prose-invert max-w-none mb-8">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                          {selectedAnnouncement.content}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Date & Time</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {new Date(selectedAnnouncement.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {selectedAnnouncement.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                              <p className="text-gray-900 dark:text-white font-medium">{selectedAnnouncement.location}</p>
                            </div>
                          </div>
                        )}

                        {selectedAnnouncement.organizer && (
                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Organizer</p>
                              <p className="text-gray-900 dark:text-white font-medium">{selectedAnnouncement.organizer}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Posted by</p>
                            <p className="text-gray-900 dark:text-white font-medium">{selectedAnnouncement.adminName || 'Admin'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={() => shareUpdate(selectedAnnouncement)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <button
                          onClick={closeAnnouncementDetail}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {/* Right side - Large image */}
                    {selectedAnnouncement.image && (
                      <div className="w-96 flex-shrink-0 p-8">
                        <img
                          src={selectedAnnouncement.image}
                          alt={selectedAnnouncement.title}
                          className="w-full h-full object-cover rounded-lg shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      case 'chat':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Residents / Rooms */}
                <div className="lg:col-span-1 border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">Community Members</span>
                    {chatLoading && <span className="text-xs text-gray-500">Loading…</span>}
                    <button onClick={async () => {
                      try {
                        setChatLoading(true)
                        // Force create Community Group with admin-created residents
                        const res = await mongoService.getAdminResidentEntries?.()
                        const residents = res?.success ? (res.data || []) : []
                        const residentIds = residents.map(r => r.authUserId || r._id).filter(Boolean)
                        const allIds = [...residentIds]
                        if (!allIds.includes(user.id)) {
                          allIds.push(user.id)
                        }
                        console.log('Manual refresh: Creating Community Group with admin-created residents:', allIds.length, 'IDs')
                        await chatService.createOrGetGroupRoom('Community Group', allIds)
                        
                        // Reload rooms
                        const { rooms } = await chatService.listRooms(user.id)
                        console.log('Manual refresh - Loaded rooms:', rooms)
                        setChatRooms(rooms || [])
                        
                        // Auto-select Community Group if available
                        const communityGroup = rooms?.find(r => r.type === 'group' && r.name === 'Community Group')
                        if (communityGroup) {
                          setSelectedRoomId(communityGroup._id)
                        }
                      } catch (e) {
                        console.error('Manual refresh error:', e)
                      } finally {
                        setChatLoading(false)
                      }
                    }} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                      Refresh
                    </button>
                  </div>
                  </div>
                  <div className="max-h-[60vh] overflow-auto">
                    {/* Group item */}
                    {(() => {
                      const group = (chatRooms || []).find(r=>r.type==='group' && r.name === 'Community Group')
                      console.log('Resident chat: Rendering group item:', group)
                      console.log('Resident chat: All chatRooms:', chatRooms)
                      if (!group) {
                        console.log('Resident chat: No Community Group found in chatRooms')
                        return (
                          <div className="p-3 border-b dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
                            <div className="text-xs text-yellow-800 dark:text-yellow-200">
                              Community Group not found. Click Refresh to create it.
                            </div>
                          </div>
                        )
                      }
                      return (
                        <button key={group._id} onClick={()=>setSelectedRoomId(group._id)} className={`w-full text-left p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedRoomId===group._id ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                          <div className="text-sm text-gray-900 dark:text-white truncate">{group.name || 'Community Group'}</div>
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
                        } catch (e) { console.error(e); showError('Failed to Open Chat', 'Please try again later.') }
                      }} className={`w-full text-left p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedRoomId && (chatRooms.find(rr=>rr._id===selectedRoomId)?.memberAuthUserIds||[]).includes(r.authUserId) ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                        <div className="text-sm text-gray-900 dark:text-white truncate">{r.name || r.email || r.authUserId}</div>
                        <div className="text-xs text-gray-500 truncate">{r.authUserId}</div>
                      </button>
                    ))}
                    
                    {/* Admin users list for DM */}
                    {(adminUsers || []).map(admin => (
                      <button key={admin.authUserId} onClick={async ()=>{
                        try {
                          const { room } = await chatService.createOrGetDmRoom([user.id, admin.authUserId])
                          setSelectedRoomId(room._id)
                          const { rooms } = await chatService.listRooms(user.id)
                          setChatRooms(rooms || [])
                        } catch (e) { console.error(e); showError('Failed to Open Chat', 'Please try again later.') }
                      }} className={`w-full text-left p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedRoomId && (chatRooms.find(rr=>rr._id===selectedRoomId)?.memberAuthUserIds||[]).includes(admin.authUserId) ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-900 dark:text-white truncate">{admin.name}</div>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded">Admin</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{admin.authUserId}</div>
                      </button>
                    ))}
                    
                    {(residentsList || []).length === 0 && (adminUsers || []).length === 0 && (
                      <p className="p-3 text-sm text-gray-600 dark:text-gray-400">No users found.</p>
                    )}
                  </div>
                </div>
                {/* Messages */}
                <div className="lg:col-span-2 border dark:border-gray-700 rounded-xl flex flex-col min-h-[70vh] bg-white dark:bg-gray-800">
                  {/* Chat header with avatar and name */}
                  <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center gap-3">
                    {(() => {
                      const room = (chatRooms || []).find(r=>r._id===selectedRoomId)
                      console.log('Resident chat: Selected room:', room)
                      let label = 'Select a chat'
                      if (room) {
                        if (room.type === 'group') {
                          label = room.name || 'Community Group'
                          console.log('Resident chat: Group room members:', room.memberAuthUserIds)
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
                              {m.media && (
                                <div className="mt-2">
                                  {m.media.type === 'image' && (
                                    <img 
                                      src={m.media.publicUrl || m.media.path} 
                                      alt={m.media.originalName || 'Image'} 
                                      className="max-w-full h-auto rounded-lg cursor-pointer"
                                      onClick={() => window.open(m.media.publicUrl || m.media.path, '_blank')}
                                    />
                                  )}
                                  {m.media.type === 'video' && (
                                    <video 
                                      src={m.media.publicUrl || m.media.path} 
                                      controls 
                                      className="max-w-full h-auto rounded-lg"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  )}
                                  {(m.media.type === 'pdf' || m.media.type === 'document') && (
                                    <div className="flex items-center gap-2 p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
                                      <span className="text-lg">{chatFileService.getFileIcon(m.media.type)}</span>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">{m.media.originalName || 'Document'}</div>
                                        <div className="text-xs text-gray-500">{chatFileService.formatFileSize(m.media.size)}</div>
                                      </div>
                                      <a 
                                        href={m.media.publicUrl || m.media.path} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                      >
                                        Open
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
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
                  <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl">
                    {/* Selected file preview */}
                    {selectedFile && (
                      <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-2">
                        <span className="text-lg">{chatFileService.getFileIcon(chatFileService.getFileType(selectedFile.type))}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{selectedFile.name}</div>
                          <div className="text-xs text-gray-500">{chatFileService.formatFileSize(selectedFile.size)}</div>
                        </div>
                        <button 
                          onClick={removeSelectedFile}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {/* File upload button */}
                      <label className="cursor-pointer">
                        <input 
                          type="file" 
                          onChange={handleFileSelect}
                          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                          className="hidden"
                        />
                        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                          📎
                        </div>
                      </label>
                      
                      <input 
                        value={composer} 
                        onChange={(e)=>setComposer(e.target.value)} 
                        onKeyDown={(e)=>{ 
                          if (e.key==='Enter' && !e.shiftKey) { 
                            e.preventDefault(); 
                            if (selectedFile) {
                              sendFileMessage()
                            } else {
                              sendTextMessage()
                            }
                          } 
                        }} 
                        className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                        placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message"} 
                      />
                      
                      <button 
                        onClick={selectedFile ? sendFileMessage : sendTextMessage}
                        className="px-4 py-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 flex items-center gap-2" 
                        disabled={fileUploading}
                      >
                        {fileUploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Uploading...
                          </>
                        ) : (
                          'Send'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    My Notifications 
                    {notifications.length > 0 && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        {notifications.length}
                      </span>
                    )}
                  </h3>
                  {notificationsLoading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Refreshing...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={loadNotifications}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    title="Refresh notifications"
                  >
                    🔄 Refresh
                  </button>
                  {notifications.some(n => !n.isRead || n.status === 'unread') && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      Mark all as read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm(
                          'Delete All Notifications',
                          'Are you sure you want to delete all notifications? This action cannot be undone.',
                          'Delete All',
                          'Cancel'
                        )
                        
                        if (confirmed) {
                          try {
                            // Clear regular notifications
                            await notificationService.markAllAsRead(user.id)
                            
                            // Clear delivery notifications
                            const { building, flatNumber } = getResolvedLocation()
                            const key = `resident_notifications_${building || 'A'}_${flatNumber || '101'}`
                            localStorage.removeItem(key)
                            
                            // Clear the notifications state
                            setNotifications([])
                            
                            showSuccess('All Notifications Deleted', 'All notifications have been successfully deleted.')
                          } catch (error) {
                            console.error('Error deleting notifications:', error)
                            showError('Error', 'Failed to delete some notifications.')
                          }
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      🗑️ Delete All
                    </button>
                  )}
                </div>
              </div>

              {notificationsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No notifications found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        (!notification.isRead || notification.status === 'unread') ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                          notification.priority === 'urgent' ? 'bg-red-500' :
                          notification.priority === 'high' ? 'bg-orange-500' :
                          notification.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h4 
                                className="font-medium text-gray-900 dark:text-white truncate cursor-pointer"
                                onClick={() => handleNotificationClick(notification)}
                              >
                                {notification.title}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded ${
                                notification.type === 'bill' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                                notification.type === 'complaint' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                                notification.type === 'delivery' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                                notification.type === 'info' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                              }`}>
                                {notification.type === 'delivery' ? '📦 Delivery' : notification.type}
                              </span>
                              {(!notification.isRead || notification.status === 'unread') && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification)
                              }}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete notification"
                            >
                              🗑️
                            </button>
                          </div>
                          <p 
                            className="text-sm text-gray-600 dark:text-gray-400 mb-2 cursor-pointer"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            {notification.message}
                          </p>
                          
                          {/* Delivery-specific details */}
                          {notification.type === 'delivery' && notification.details && (
                            <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                              <div className="flex items-center gap-4 text-green-700 dark:text-green-300">
                                <span>🏪 {notification.details.vendor}</span>
                                {notification.details.packageDescription && (
                                  <span>📦 {notification.details.packageDescription}</span>
                                )}
                                {notification.details.trackingId && (
                                  <span>🔍 {notification.details.trackingId}</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                            <span>
                              {notification.type === 'delivery' ? '📦 Delivery Notification' : `From: ${notification.senderName || 'System'}`}
                            </span>
                            <span>{new Date(notification.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      case 'delivery-notifications':
        return <ResidentNotifications user={user} />
      case 'map':
        return <CommunityMap user={user} />
      case 'profile': {
        const view = profile || form
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
                <button
                  onClick={() => setActiveTab('edit-profile')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Edit Profile
                </button>
              </div>
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
      case 'edit-profile': {
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h3>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  Cancel
                </button>
              </div>

              {/* Avatar uploader */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                  {(() => {
                    const url = form.photoUrl || profile?.photoUrl
                    if (url) return <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    const initials = (user.name || user.email || 'U').slice(0,2).toUpperCase()
                    return (
                      <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {initials}
                      </div>
                    )
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm cursor-pointer">
                    {avatarUploading ? 'Uploading...' : 'Change Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} disabled={avatarUploading} />
                  </label>
                  {form.photoUrl && (
                    <button
                      onClick={() => setForm(prev => ({ ...prev, photoUrl: '' }))}
                      className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
                      disabled={avatarUploading}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={user.name || form.name} 
                    readOnly 
                  />
                  <p className="mt-1 text-xs text-gray-500">Name cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={user.email || form.email} 
                    readOnly 
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={form.phone} 
                    onChange={(e)=>setForm({...form, phone: e.target.value})} 
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Name</label>
                  <input 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={form.ownerName} 
                    onChange={(e)=>setForm({...form, ownerName: e.target.value})} 
                  />
                  {errors.ownerName && <p className="mt-1 text-xs text-red-600">{errors.ownerName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building</label>
                  <select
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={form.building}
                    onChange={(e)=>handleBuildingChange(e.target.value)}
                    disabled={flatsLoading}
                  >
                    <option value="">Select Building</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.name} - {building.floors} floors, {building.flatsPerFloor} flats/floor
                      </option>
                    ))}
                  </select>
                  {errors.building && <p className="mt-1 text-xs text-red-600">{errors.building}</p>}
                  {flatsLoading && <p className="mt-1 text-xs text-gray-500">Loading buildings...</p>}
                  {buildings.length > 0 && !flatsLoading && (
                    <p className="mt-1 text-xs text-green-600">{buildings.length} buildings available</p>
                  )}
                  {form.building && (() => {
                    const selectedBuilding = buildings.find(b => b.id === form.building)
                    return selectedBuilding ? (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-xs text-gray-800 dark:text-gray-200 font-medium">Selected Building:</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {selectedBuilding.name} - {selectedBuilding.floors} floors, {selectedBuilding.flatsPerFloor} flats per floor
                        </p>
                        {selectedBuilding.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {selectedBuilding.description}
                          </p>
                        )}
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Flat numbering: {selectedBuilding.flatsPerFloor} flats per floor (e.g., 101, 102, 103...)
                        </p>
                      </div>
                    ) : null
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat Number</label>
                  <select
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={form.flatNumber}
                    onChange={(e)=>setForm({...form, flatNumber: e.target.value})}
                    disabled={!form.building || flatsLoading}
                  >
                    <option value="">
                      {flatsLoading ? 'Loading flats...' : 
                       !form.building ? 'Select a building first' : 
                       'Select Flat'}
                    </option>
                    {getFlatsForBuilding(form.building).map(flat => (
                      <option key={flat.id} value={flat.flatNumber}>
                        {flat.flatNumber} - Floor {flat.floor} • {flat.area} • {flat.bedrooms}BR/{flat.bathrooms}BA
                      </option>
                    ))}
                  </select>
                  {errors.flatNumber && <p className="mt-1 text-xs text-red-600">{errors.flatNumber}</p>}
                  {!form.building && <p className="mt-1 text-xs text-gray-500">Please select a building first</p>}
                  {form.building && getFlatsForBuilding(form.building).length === 0 && !flatsLoading && (
                    <p className="mt-1 text-xs text-orange-600">No available flats found for this building</p>
                  )}
                  {form.building && getFlatsForBuilding(form.building).length > 0 && !flatsLoading && (
                    <p className="mt-1 text-xs text-green-600">{getFlatsForBuilding(form.building).length} flats available in this building</p>
                  )}
                  {form.flatNumber && form.building && (() => {
                    const selectedFlat = getFlatsForBuilding(form.building).find(f => f.flatNumber === form.flatNumber)
                    return selectedFlat ? (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">Selected Flat Details:</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {selectedFlat.flatNumber} - Floor {selectedFlat.floor} • {selectedFlat.area} • {selectedFlat.bedrooms}BR/{selectedFlat.bathrooms}BA
                        </p>
                        {selectedFlat.amenities && selectedFlat.amenities.length > 0 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Amenities: {selectedFlat.amenities.join(', ')}
                          </p>
                        )}
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={!isProfileComplete || saving || Object.keys(errors).length > 0}
                  className={`px-4 py-2 rounded-lg text-white ${(!isProfileComplete||saving) ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )
      }
      default:
        return <div className="p-6 text-sm text-gray-600 dark:text-gray-400">Content not found for tab: {String(tabKey || '')}</div>
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
            <div className="flex items-center gap-3">
              {/* Header avatar */}
              <button
                onClick={() => setActiveTab('edit-profile')}
                className="flex items-center gap-2 group"
                title="View/Edit profile"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                  {(() => {
                    const url = profile?.photoUrl || form.photoUrl
                    if (url) {
                      return (
                        <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                      )
                    }
                    const initials = (user.name || user.email || 'U').slice(0,2).toUpperCase()
                    return (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {initials}
                      </div>
                    )
                  })()}
                </div>
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Profile</span>
              </button>
              {verificationChecked && residentData?.verified && needsProfile && (
                <button
                  onClick={() => setActiveTab('edit-profile')}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                  title="Complete your profile"
                >
                  Add Profile
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
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
      {false && (
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building</label>
                <select
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={form.building}
                  onChange={(e)=>handleBuildingChange(e.target.value)}
                  disabled={flatsLoading}
                >
                  <option value="">Select Building</option>
                  {buildings.map(building => (
                    <option key={building.id} value={building.id}>
                      {building.name} - {building.floors} floors, {building.flatsPerFloor} flats/floor
                    </option>
                  ))}
                </select>
                {errors.building && <p className="mt-1 text-xs text-red-600">{errors.building}</p>}
                {flatsLoading && <p className="mt-1 text-xs text-gray-500">Loading buildings...</p>}
                {buildings.length > 0 && !flatsLoading && (
                  <p className="mt-1 text-xs text-green-600">{buildings.length} buildings available</p>
                )}
                {form.building && (() => {
                  const selectedBuilding = buildings.find(b => b.id === form.building)
                  return selectedBuilding ? (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-800 dark:text-gray-200 font-medium">Selected Building:</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {selectedBuilding.name} - {selectedBuilding.floors} floors, {selectedBuilding.flatsPerFloor} flats per floor
                      </p>
                      {selectedBuilding.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {selectedBuilding.description}
                        </p>
                      )}
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Flat numbering: {selectedBuilding.flatsPerFloor} flats per floor (e.g., 101, 102, 103...)
                      </p>
                    </div>
                  ) : null
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat Number</label>
                <select
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={form.flatNumber}
                  onChange={(e)=>setForm({...form, flatNumber: e.target.value})}
                  disabled={flatsLoading || !form.building}
                >
                  <option value="">Select Flat</option>
                  {availableFlats
                    .filter(f => f.building === form.building)
                    .map((f, i) => (
                      <option key={`${f.building}-${f.flatNumber}-${i}`} value={f.flatNumber}>
                        {f.flatNumber} - Floor {f.flatNumber?.charAt(0)} • 1200 sq ft • 3BR/2BA
                      </option>
                    ))}
                </select>
                {errors.flatNumber && <p className="mt-1 text-xs text-red-600">{errors.flatNumber}</p>}
                {form.building && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">Selected Flat Details:</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {form.flatNumber ? `${form.flatNumber} - Floor ${form.flatNumber?.charAt(0)} • 1200 sq ft • 3BR/2BA` : 'Select a flat to see details'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Amenities: Parking, Balcony, Power Backup, Gym, Swimming Pool
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button onClick={()=>{ setHasSaved(true); setNeedsProfile(false) }} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Skip</button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save and Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Bill Details</h3>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Bill Information */}
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">Bill Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Title:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedBill.title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedBill.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                    <span className="font-medium text-gray-900 dark:text-white">₹{selectedBill.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{new Date(selectedBill.dueDate).toLocaleDateString()}</span>
                  </div>
                  {selectedBill.description && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Description:</span>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedBill.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* My Share */}
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">My Share</h4>
                {(() => {
                  const assignment = selectedBill.assignments?.find(a => a.residentId === user.id)
                  if (!assignment) {
                    return <p className="text-gray-600 dark:text-gray-400">Assignment not found</p>
                  }
                  
                  return (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Your Amount</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Split: {selectedBill.splitType === 'equal' ? 'Equal' : 
                                   selectedBill.splitType === 'custom' ? 'Custom' : 'Size Based'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">₹{assignment.amount?.toLocaleString()}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            assignment.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {assignment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* All Residents Split */}
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">Bill Split</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedBill.assignments?.map((assignment) => (
                    <div key={assignment.residentId} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{assignment.residentName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{assignment.building}-{assignment.flatNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">₹{assignment.amount}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          assignment.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Actions */}
              <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                {(() => {
                  const assignment = selectedBill.assignments?.find(a => a.residentId === user.id)
                  if (assignment?.status === 'pending') {
                    return (
                      <>
                        <button
                          onClick={() => handlePayBill(selectedBill, 'card')}
                          disabled={paymentLoading}
                          className={`flex-1 py-3 rounded-lg text-white ${
                            paymentLoading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {paymentLoading ? 'Processing...' : '💳 Pay with Card'}
                        </button>
                        <button
                          onClick={() => handlePayBill(selectedBill, 'upi')}
                          disabled={paymentLoading}
                          className={`flex-1 py-3 rounded-lg text-white ${
                            paymentLoading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {paymentLoading ? 'Processing...' : '📱 Pay with UPI'}
                        </button>
                      </>
                    )
                  } else {
                    return (
                      <div className="flex-1 text-center py-3">
                        <span className="text-green-600 font-medium">✅ Payment Completed</span>
                      </div>
                    )
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResidentDashboard
