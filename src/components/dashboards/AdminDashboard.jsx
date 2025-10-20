import { useState, useEffect } from 'react'
import { LogOut, Users, Shield, Plus, Eye, EyeOff, Search, Edit, Trash2, ArrowLeft, Filter, CreditCard, Bell, MessageSquare, Calendar, MapPin, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { USER_ROLES, STAFF_DEPARTMENTS } from '../../services/authService'
import { mongoService } from '../../services/mongoService'
import AdminUserManagementSimple from '../AdminUserManagementSimple'
import AdminAddResidents from '../AdminAddResidents'
import { complaintService } from '../../services/complaintService'
// removed legacy billService and monthlyFeeService imports
import AdminMonthlyFee from '../AdminMonthlyFee'
import { residentService } from '../../services/residentService'
import { notificationService } from '../../services/notificationService'
import { emailService } from '../../services/emailService'
import { announcementService } from '../../services/announcementService'
import { chatService } from '../../services/chatService'
import { chatFileService } from '../../services/chatFileService'
import { showSuccess, showError, showConfirm, showCredentials } from '../../utils/sweetAlert'

const AdminDashboard = ({ user, onLogout, currentPage = 'dashboard' }) => {
  const { authService } = useAuth()
  const [staffList, setStaffList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingStaff, setIsCreatingStaff] = useState(false)

  // Staff form state
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: USER_ROLES.STAFF,
    staffDepartment: '',
    password: '',
    generatePassword: true
  })

  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [staffView, setStaffView] = useState('list') // 'list', 'add', 'edit'
  const [editingStaff, setEditingStaff] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [complaints, setComplaints] = useState([])
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  // Service Requests (admin view)
  const [serviceRequests, setServiceRequests] = useState([])
  const [serviceRequestsLoading, setServiceRequestsLoading] = useState(false)
  const [complaintSearch, setComplaintSearch] = useState('')
  const [complaintStatus, setComplaintStatus] = useState('all') // all | open | resolved
  const [visitorLogs, setVisitorLogs] = useState([])
  const [visitorLoading, setVisitorLoading] = useState(false)
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [visitorSearch, setVisitorSearch] = useState('')
  const [visitorStatus, setVisitorStatus] = useState('all') // all | checked_in | checked_out
  const [visitorDate, setVisitorDate] = useState('')
  const [visitorBuilding, setVisitorBuilding] = useState('all')

  // removed legacy Bill Management State

  // Notification Management State
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationView, setNotificationView] = useState('list') // 'list', 'create'
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    targetUsers: [],
    targetRoles: [],
    expiresAt: ''
  })
  const [allUsers, setAllUsers] = useState([])

  // Announcement Management State
  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  const [announcementView, setAnnouncementView] = useState('list') // 'list', 'create', 'edit', 'details'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [announcementStats, setAnnouncementStats] = useState({
    totalAnnouncements: 0,
    activeAnnouncements: 0,
    inactiveAnnouncements: 0,
    typeCounts: {},
    priorityCounts: {}
  })
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'announcement',
    priority: 'normal',
    location: '',
    date: '',
    organizer: '',
    image: '',
    targetRoles: ['resident'],
    isActive: true
  })
  const [imageUploading, setImageUploading] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [announcementFilters, setAnnouncementFilters] = useState({
    type: 'all',
    priority: 'all',
    status: 'all',
    search: ''
  })

  // Chat state
  const [chatRooms, setChatRooms] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [composer, setComposer] = useState('')
  const [hasMoreMsgs, setHasMoreMsgs] = useState(false)
  const [lastSeenByRoom, setLastSeenByRoom] = useState({})
  const [unreadByRoom, setUnreadByRoom] = useState({})
  const [residentsList, setResidentsList] = useState([])
  const [fileUploading, setFileUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

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

  // Load staff list
  const loadStaffList = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 Loading staff list...')

      const result = await authService.getStaffUsers()
      console.log('📋 Staff list result:', result)

      if (result.success) {
        console.log('✅ Staff users loaded:', result.users.length, 'users')
        setStaffList(result.users || [])
      } else {
        console.error('❌ Failed to load staff users:', result.error)
        setStaffList([])
      }
    } catch (error) {
      console.error('❌ Error loading staff list:', error)
      setStaffList([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (currentPage === 'staff-security') {
      loadStaffList()
    }
    if (currentPage === 'complaints') {
      ;(async () => {
        try {
          setComplaintsLoading(true)
          const { complaints } = await complaintService.listComplaints()
          setComplaints(complaints || [])
        } catch (e) {
          console.error(e)
          setComplaints([])
        } finally {
          setComplaintsLoading(false)
        }
      })()
      ;(async () => {
        try {
          setServiceRequestsLoading(true)
          const res = await mongoService.listServiceRequests({ limit: 200 })
          if (res.success) {
            setServiceRequests(res.data || [])
          } else {
            setServiceRequests([])
          }
        } catch (e) {
          console.error('Error loading service requests:', e)
          setServiceRequests([])
        } finally {
          setServiceRequestsLoading(false)
        }
      })()
    }
    if (currentPage === 'visitors') {
      ;(async () => {
        try {
          setVisitorLoading(true)
          const result = await mongoService.getVisitorLogs({})
          if (result.success) {
            const logs = result.data?.data || []
            setVisitorLogs(logs)
          } else {
            setVisitorLogs([])
          }
        } catch (e) {
          console.error(e)
          setVisitorLogs([])
        } finally {
          setVisitorLoading(false)
        }
      })()
    }
    // monthly-fee handled in renderContent; avoid returning JSX here
    // removed legacy maintenance loader
    if (currentPage === 'notifications') {
      ;(async () => {
        try {
          setNotificationsLoading(true)
          // Load notifications and all users
          const [notificationsResult, residentsResult, staffResult] = await Promise.all([
            notificationService.getUserNotifications(user.id, { limit: 100, role: 'admin' }),
            residentService.listResidents(),
            authService.getStaffUsers()
          ])
          
          if (notificationsResult.success) {
            setNotifications(notificationsResult.data?.notifications || [])
          }
          
          // Combine all users for targeting
          const allUsersList = [
            ...(residentsResult.residents || []).map(r => ({ ...r, role: 'resident' })),
            ...(staffResult.users || []).map(s => ({ ...s, role: s.role }))
          ]
          setAllUsers(allUsersList)
        } catch (e) {
          console.error('Error loading notification data:', e)
          setNotifications([])
          setAllUsers([])
        } finally {
          setNotificationsLoading(false)
        }
      })()
    }
    if (currentPage === 'announcements') {
      ;(async () => {
        try {
          setAnnouncementsLoading(true)
          // Load announcements and statistics
          const [announcementsResult, statsResult] = await Promise.all([
            announcementService.getAnnouncements({ limit: 100 }, user.role),
            announcementService.getAnnouncementStats(user.role)
          ])
          
          if (announcementsResult.success) {
            setAnnouncements(announcementsResult.data || [])
          }
          if (statsResult.success) {
            setAnnouncementStats(statsResult.data)
          }
        } catch (e) {
          console.error('Error loading announcement data:', e)
          setAnnouncements([])
        } finally {
          setAnnouncementsLoading(false)
        }
      })()
    }
    if (currentPage === 'chat') {
      ;(async () => {
        try {
          setChatLoading(true)
          // Load residents list (same as resident dashboard)
          const { residents } = await residentService.listResidents()
          setResidentsList(residents || [])
          
          // Create unified community group with residents + admin
          const allResidentIds = (residents || []).map(r => r.authUserId).filter(Boolean)
          console.log('Admin chat: Found residents:', allResidentIds)
          console.log('Admin chat: Admin ID:', user.id)
          
          // Get all admin users to include in the group
          let adminIds = []
          try {
            const adminResult = await authService.getStaffUsers()
            if (adminResult.success) {
              adminIds = (adminResult.users || []).map(admin => admin.id).filter(Boolean)
            }
          } catch (e) {
            console.log('Could not load admin users:', e)
          }
          
          // Create unified community group with ALL members (residents + admins)
          const allIds = [...allResidentIds, ...adminIds, user.id].filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
          console.log('Admin chat: Creating unified community group with all IDs:', allIds)
          if (allIds.length > 0) {
            await chatService.createOrGetGroupRoom('Community Group', allIds)
          }
          
          // Wait a moment for group creation to complete, then load rooms
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Load chat rooms for admin (same as residents)
          const { rooms } = await chatService.listRooms(user.id)
          const rs = rooms || []
          console.log('Admin chat: Loaded rooms:', rs)
          
          // Load unread counts from localStorage
          const savedUnread = JSON.parse(localStorage.getItem('chat_unread_map') || '{}')
          const savedLastSeen = JSON.parse(localStorage.getItem('chat_last_seen') || '{}')
          setUnreadByRoom(savedUnread)
          setLastSeenByRoom(savedLastSeen)
          
          // Compute unread counts
          const nextUnread = { ...savedUnread }
          rs.forEach(r => {
            const seen = savedLastSeen[r._id]
            if (r.lastMessageAt && (!seen || new Date(r.lastMessageAt) > new Date(seen))) {
              nextUnread[r._id] = (nextUnread[r._id] || 0) + 1
            }
          })
          setUnreadByRoom(nextUnread)
          localStorage.setItem('chat_unread_map', JSON.stringify(nextUnread))
          
          setChatRooms(rs)
          if (!selectedRoomId && (rooms || []).length > 0) {
            // Prefer Community Group first, then any other group, then first room
            const communityGroup = rooms.find(r => r.type === 'group' && r.name === 'Community Group')
            const anyGroup = rooms.find(r => r.type === 'group')
            setSelectedRoomId((communityGroup || anyGroup || rooms[0])._id)
          }
        } catch (e) {
          console.error('Error loading chat data:', e)
          setChatRooms([])
        } finally {
          setChatLoading(false)
        }
      })()
    }
  }, [currentPage])

  // Load messages for selected room
  useEffect(() => {
    const loadMessages = async () => {
      if (currentPage !== 'chat' || !selectedRoomId) return
      try {
        setMessagesLoading(true)
        console.log('Admin chat: Loading messages for room:', selectedRoomId)
        const { messages } = await chatService.listMessages(selectedRoomId, undefined, 30)
        console.log('Admin chat: Loaded messages:', messages)
        setMessages(messages || [])
        setHasMoreMsgs((messages || []).length === 30)
      } catch (e) {
        console.error('Error loading messages:', e)
        setMessages([])
      } finally {
        setMessagesLoading(false)
      }
    }
    loadMessages()
  }, [currentPage, selectedRoomId])

  // Periodically check if Community Group exists
  useEffect(() => {
    if (currentPage === 'chat' && user?.id) {
      const checkCommunityGroup = async () => {
        const communityGroup = (chatRooms || []).find(r => r.type === 'group' && r.name === 'Community Group')
        if (!communityGroup) {
          console.log('Admin: Community Group not found, ensuring it exists...')
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
  }, [currentPage, user?.id, chatRooms])

  // Helper functions for chat
  const hashToPalette = (id) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-teal-500 to-teal-600'
    ]
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  const getDisplayForUserId = (uid) => {
    const resident = residentsList.find(r => r.authUserId === uid)
    const userInfo = resident || { name: 'Unknown', email: uid }
    const name = userInfo.name || userInfo.email || uid
    const initials = name.slice(0, 2).toUpperCase()
    const bg = hashToPalette(uid)
    return { name, initials, bg }
  }

  const loadMoreMessages = async () => {
    if (!hasMoreMsgs || messagesLoading || messages.length === 0) return
    try {
      setMessagesLoading(true)
      const oldest = messages[0]
      const { messages: older } = await chatService.listMessages(selectedRoomId, oldest.createdAt, 30)
      setMessages([...(older || []), ...messages])
      setHasMoreMsgs((older || []).length === 30)
    } catch (e) {
      console.error('Error loading more messages:', e)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Ensure Community Group exists
  const ensureCommunityGroup = async () => {
    try {
      const { residents } = await residentService.listResidents()
      const allResidentIds = (residents || []).map(r => r.authUserId).filter(Boolean)
      
      // Get all admin users
      let adminIds = []
      try {
        const adminResult = await authService.getStaffUsers()
        if (adminResult.success) {
          adminIds = (adminResult.users || []).map(admin => admin.id).filter(Boolean)
        }
      } catch (e) {
        console.log('Could not load admin users:', e)
      }
      
      const allIds = [...allResidentIds, ...adminIds, user.id].filter((id, index, arr) => arr.indexOf(id) === index)
      console.log('Admin: Ensuring Community Group exists with IDs:', allIds)
      await chatService.createOrGetGroupRoom('Community Group', allIds)
      return true
    } catch (e) {
      console.error('Error ensuring Community Group:', e)
      return false
    }
  }


  const sendTextMessage = async () => {
    if (!composer.trim()) return
    try {
      const text = composer.trim()
      setComposer('')
      const optimistic = {
        _id: 'tmp_' + Date.now(),
        roomId: selectedRoomId,
        senderAuthUserId: user.id,
        senderName: user.name || 'Admin',
        text,
        createdAt: new Date().toISOString()
      }
      setMessages([...messages, optimistic])
      const { message } = await chatService.sendMessage({ 
        roomId: selectedRoomId, 
        senderAuthUserId: user.id, 
        senderName: user.name || 'Admin', 
        text 
      })
      setMessages(prev => prev.map(m => m._id === optimistic._id ? message : m))
      // refresh rooms order
      const { rooms } = await chatService.listRooms(user.id)
      setChatRooms(rooms || [])
    } catch (e) {
      console.error('Error sending message:', e)
      showError('Failed to send message', 'Please check your connection and try again.')
    }
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
        user.name || user.email || 'Admin',
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

  // Password validation function
  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return ''
  }

  // Handle form changes
  const handleStaffFormChange = (field, value) => {
    setStaffForm(prev => ({
      ...prev,
      [field]: value
    }))

    // Validate password if it's being changed
    if (field === 'password' && !staffForm.generatePassword) {
      const error = validatePassword(value)
      setPasswordError(error)
    }

    // Clear password error when switching to auto-generate
    if (field === 'generatePassword' && value === true) {
      setPasswordError('')
    }
  }

  // Handle staff creation
  const handleCreateStaff = async (e) => {
    e.preventDefault()

    // Validate custom password if not auto-generating
    if (!staffForm.generatePassword) {
      const passwordValidationError = validatePassword(staffForm.password)
      if (passwordValidationError) {
        setPasswordError(passwordValidationError)
        return
      }
    }

    try {
      setIsCreatingStaff(true)
      setPasswordError('')

      const staffData = {
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        staffDepartment: staffForm.role === USER_ROLES.STAFF ? staffForm.staffDepartment : null,
        customPassword: staffForm.generatePassword ? null : staffForm.password
      }

      const result = await authService.createStaffUser(staffData, user.id)
      
      if (result.success) {
        const finalPassword = staffForm.generatePassword ? result.tempPassword : staffForm.password

        const emailStatus = result.emailSent ?
          '\n\n✅ Credentials have been sent to the user\'s email address.' :
          '\n\n⚠️ Email sending failed. Please share the credentials manually.'

        showCredentials(
          `${staffForm.role.charAt(0).toUpperCase() + staffForm.role.slice(1)} Created Successfully!`,
          staffForm.email,
          finalPassword,
          emailStatus
        )
        
        // Reset form
        setStaffForm({
          name: '',
          email: '',
          role: USER_ROLES.STAFF,
          staffDepartment: '',
          password: '',
          generatePassword: true
        })
        setPasswordError('')
        
        // Reload staff list and switch to list view
        loadStaffList()
        setStaffView('list')
      } else {
        console.error('Staff creation failed:', result.error)
        showError('Error Creating User', result.error || 'Unknown error occurred.')
      }
    } catch (error) {
      console.error('Error creating staff:', error)
      showError('Error Creating User', error.message || 'Please try again later.')
    } finally {
      setIsCreatingStaff(false)
    }
  }

  // Handle staff deletion
  const handleDeleteStaff = async (staffId, staffName) => {
    if (!confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return
    }

    try {
      const result = await authService.deleteStaffUser(staffId)
      if (result.success) {
        showSuccess('Staff Member Deleted', 'The staff member has been removed successfully.')
        loadStaffList()
      } else {
        showError('Error Deleting Staff', result.error || 'Unknown error occurred.')
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
      showError('Error Deleting Staff', error.message || 'Please try again later.')
    }
  }

  // Handle staff editing
  const handleEditStaff = (staff) => {
    setEditingStaff(staff)
    setStaffForm({
      name: staff.name || '',
      email: staff.email || '',
      role: staff.role || USER_ROLES.STAFF,
      staffDepartment: staff.staffDepartment || '',
      password: '',
      generatePassword: true
    })
    setStaffView('edit')
  }

  // Handle staff update
  const handleUpdateStaff = async (e) => {
    e.preventDefault()

    if (!staffForm.name || !staffForm.email || !staffForm.role) {
      showError('Missing Required Fields', 'Please fill in all required fields.')
      return
    }

    if (staffForm.role === USER_ROLES.STAFF && !staffForm.staffDepartment) {
      showError('Department Required', 'Please select a department for staff members.')
      return
    }

    setIsCreatingStaff(true)

    try {
      const result = await authService.updateStaffUser(editingStaff.id, {
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        staffDepartment: staffForm.staffDepartment
      })

      if (result.success) {
        showSuccess('User Updated Successfully!', `The ${staffForm.role} user has been updated.`)

        // Reset form and editing state
        setStaffForm({
          name: '',
          email: '',
          role: USER_ROLES.STAFF,
          staffDepartment: '',
          password: '',
          generatePassword: true
        })
        setEditingStaff(null)

        // Refresh staff list and go back to list view
        await loadStaffList()
        setStaffView('list')
      } else {
        showError('Failed to Update User', result.error || 'Please try again later.')
      }
    } catch (error) {
      console.error('Error updating staff:', error)
      showError('Error Updating Staff', error.message || 'Please try again later.')
    } finally {
      setIsCreatingStaff(false)
    }
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingStaff(null)
    setStaffForm({
      name: '',
      email: '',
      role: USER_ROLES.STAFF,
      staffDepartment: '',
      password: '',
      generatePassword: true
    })
    setStaffView('list')
  }

  // Filter staff list
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || staff.role === filterRole
    return matchesSearch && matchesRole
  })

  // removed legacy Bill Management Functions and filters

  // Notification Management Functions
  const handleCreateNotification = async (e) => {
    e.preventDefault()
    
    if (!notificationForm.title || !notificationForm.message || 
        (notificationForm.targetUsers.length === 0 && notificationForm.targetRoles.length === 0)) {
      showError('Missing Required Information', 'Please fill in all required fields and select at least one target.')
      return
    }

    try {
      setNotificationsLoading(true)
      
      const notificationData = {
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type,
        priority: notificationForm.priority,
        targetUsers: notificationForm.targetUsers,
        targetRoles: notificationForm.targetRoles,
        senderId: user.id,
        senderName: user.name || 'Admin',
        expiresAt: notificationForm.expiresAt ? new Date(notificationForm.expiresAt).toISOString() : null
      }

      const result = await notificationService.sendBulkNotification(notificationData)
      
      if (result.success) {
        // Email the selected audience using their emails
        try {
          const recipients = [
            ...(allUsers || [])
              .filter(u => notificationForm.targetUsers.includes(u.authUserId || u.id))
              .map(u => u.email)
              .filter(Boolean)
          ]
          if (recipients.length > 0) {
            await emailService.sendNotificationForNotification(notificationData, recipients)
          }
        } catch (mailErr) {
          console.warn('Email broadcast skipped/failed:', mailErr)
        }
        showSuccess('Notification Sent Successfully!', `Notification sent to ${result.data.sentCount} recipients.`)
        setNotificationForm({
          title: '',
          message: '',
          type: 'info',
          priority: 'medium',
          targetUsers: [],
          targetRoles: [],
          expiresAt: ''
        })
        setNotificationView('list')
        
        // Reload notifications
        const notificationsResult = await notificationService.getUserNotifications(user.id, { limit: 100, role: 'admin' })
        if (notificationsResult.success) {
          setNotifications(notificationsResult.data?.notifications || [])
        }
      } else {
        showError('Failed to Send Notification', result.error || 'Please try again later.')
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      showError('Error Creating Notification', error.message || 'Please check your connection and try again.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return
    }

    try {
      setNotificationsLoading(true)
      const result = await notificationService.deleteNotification(notificationId)
      
      if (result.success) {
        showSuccess('Notification Deleted Successfully!', 'The notification has been removed.')
        
        // Reload notifications
        const notificationsResult = await notificationService.getUserNotifications(user.id, { limit: 100, role: 'admin' })
        if (notificationsResult.success) {
          setNotifications(notificationsResult.data?.notifications || [])
        }
      } else {
        showError('Failed to Delete Notification', result.error || 'Please try again later.')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      showError('Error Deleting Notification', error.message || 'Please try again later.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  // Image Upload Handler
  const handleImageUpload = async (file) => {
    try {
      setImageUploading(true)
      const result = await announcementService.uploadAnnouncementImage(file)
      
      if (result.success) {
        setAnnouncementForm({...announcementForm, image: result.data.publicUrl})
        setSelectedImageFile(file)
        showSuccess('Image Uploaded Successfully!', 'The image has been uploaded and is ready to use.')
      } else {
        showError('Image Upload Failed', result.error || 'Please try again with a different image.')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showError('Image Upload Error', 'Failed to upload image. Please try again.')
    } finally {
      setImageUploading(false)
    }
  }

  const handleImageFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const removeImage = () => {
    setAnnouncementForm({...announcementForm, image: ''})
    setSelectedImageFile(null)
  }

  const handleAnnouncementClick = (announcement) => {
    setSelectedAnnouncement(announcement)
    setAnnouncementView('details')
  }

  // Announcement Management Functions
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault()
    
    if (!announcementForm.title || !announcementForm.content || announcementForm.targetRoles.length === 0) {
      showError('Missing Required Information', 'Please fill in all required fields and select at least one target role.')
      return
    }

    try {
      setAnnouncementsLoading(true)
      
      const announcementData = {
        title: announcementForm.title,
        content: announcementForm.content,
        type: announcementForm.type,
        priority: announcementForm.priority,
        location: announcementForm.location || null,
        date: announcementForm.date || null,
        organizer: announcementForm.organizer || null,
        image: announcementForm.image || null,
        targetRoles: announcementForm.targetRoles,
        isActive: announcementForm.isActive
      }

      const result = await announcementService.createAnnouncement(announcementData, user.role, user)
      
      if (result.success) {
        showSuccess('Announcement Created Successfully!', 'The announcement has been created and published.')
        setAnnouncementForm({
          title: '',
          content: '',
          type: 'announcement',
          priority: 'normal',
          location: '',
          date: '',
          organizer: '',
          image: '',
          targetRoles: ['resident'],
          isActive: true
        })
        setSelectedImageFile(null)
        setAnnouncementView('list')
        
        // Reload data
        const [announcementsResult, statsResult] = await Promise.all([
          announcementService.getAnnouncements({ limit: 100 }, user.role),
          announcementService.getAnnouncementStats(user.role)
        ])
        
        if (announcementsResult.success) setAnnouncements(announcementsResult.data || [])
        if (statsResult.success) setAnnouncementStats(statsResult.data)
      } else {
        showError('Failed to Create Announcement', result.error || 'Please try again later.')
      }
    } catch (error) {
      console.error('Error creating announcement:', error)
      showError('Error Creating Announcement', error.message || 'Please check your connection and try again.')
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault()
    
    if (!selectedAnnouncement) return

    try {
      setAnnouncementsLoading(true)
      
      const updateData = {
        title: announcementForm.title,
        content: announcementForm.content,
        type: announcementForm.type,
        priority: announcementForm.priority,
        location: announcementForm.location || null,
        date: announcementForm.date || null,
        organizer: announcementForm.organizer || null,
        image: announcementForm.image || null,
        targetRoles: announcementForm.targetRoles,
        isActive: announcementForm.isActive
      }

      const result = await announcementService.updateAnnouncement(selectedAnnouncement._id, updateData, user.role)
      
      if (result.success) {
        showSuccess('Announcement Updated Successfully!', 'The announcement has been updated.')
        setAnnouncementView('list')
        setSelectedAnnouncement(null)
        
        // Reload data
        const [announcementsResult, statsResult] = await Promise.all([
          announcementService.getAnnouncements({ limit: 100 }, user.role),
          announcementService.getAnnouncementStats(user.role)
        ])
        
        if (announcementsResult.success) setAnnouncements(announcementsResult.data || [])
        if (statsResult.success) setAnnouncementStats(statsResult.data)
      } else {
        showError('Failed to Update Announcement', result.error || 'Please try again later.')
      }
    } catch (error) {
      console.error('Error updating announcement:', error)
      showError('Error Updating Announcement', error.message || 'Please try again later.')
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return
    }

    try {
      setAnnouncementsLoading(true)
      const result = await announcementService.deleteAnnouncement(announcementId, user.role)
      
      if (result.success) {
        showSuccess('Announcement Deleted Successfully!', 'The announcement has been removed.')
        
        // Reload data
        const [announcementsResult, statsResult] = await Promise.all([
          announcementService.getAnnouncements({ limit: 100 }, user.role),
          announcementService.getAnnouncementStats(user.role)
        ])
        
        if (announcementsResult.success) setAnnouncements(announcementsResult.data || [])
        if (statsResult.success) setAnnouncementStats(statsResult.data)
      } else {
        showError('Failed to Delete Announcement', result.error || 'Please try again later.')
      }
    } catch (error) {
      console.error('Error deleting announcement:', error)
      showError('Error Deleting Announcement', error.message || 'Please try again later.')
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  const handleEditAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement)
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      location: announcement.location || '',
      date: announcement.date ? announcement.date.split('T')[0] : '',
      organizer: announcement.organizer || '',
      image: announcement.image || '',
      targetRoles: announcement.targetRoles || ['resident'],
      isActive: announcement.isActive !== false
    })
    setAnnouncementView('edit')
  }

  // Filter announcements
  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesType = announcementFilters.type === 'all' || announcement.type === announcementFilters.type
    const matchesPriority = announcementFilters.priority === 'all' || announcement.priority === announcementFilters.priority
    const matchesStatus = announcementFilters.status === 'all' || 
      (announcementFilters.status === 'active' ? announcement.isActive : !announcement.isActive)
    const matchesSearch = !announcementFilters.search || 
      announcement.title.toLowerCase().includes(announcementFilters.search.toLowerCase()) ||
      announcement.content?.toLowerCase().includes(announcementFilters.search.toLowerCase()) ||
      announcement.organizer?.toLowerCase().includes(announcementFilters.search.toLowerCase()) ||
      announcement.location?.toLowerCase().includes(announcementFilters.search.toLowerCase())
    
    return matchesType && matchesPriority && matchesStatus && matchesSearch
  })







  const renderContent = () => {
    if (currentPage === 'monthly-fee') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <AdminMonthlyFee adminId={user.id} />
          </div>
        </div>
      )
    }
    // Show residents management when admin-users page is active
    if (currentPage === 'admin-users') {
      return <AdminUserManagementSimple />
    }
    // Show staff management when staff-security page is active
    if (currentPage === 'staff-security') {
      return (
        <div className="space-y-6">
          {/* Header with navigation */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {staffView !== 'list' && (
                  <button
                    onClick={() => {
                      setStaffView('list')
                      setEditingStaff(null)
                      setStaffForm({
                        name: '',
                        email: '',
                        role: USER_ROLES.STAFF,
                        staffDepartment: '',
                        password: '',
                        generatePassword: true
                      })
                      setPasswordError('')
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to List
                  </button>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {staffView === 'list' ? 'Staff & Security Management' :
                   staffView === 'add' ? 'Add New Staff/Security Member' :
                   'Edit Staff/Security Member'}
                </h3>
              </div>
              {staffView === 'list' && (
                <div className="flex gap-3">
                  <button
                    onClick={loadStaffList}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isLoading}
                  >
                    🔄 {isLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setStaffView('add')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Member
                  </button>
                </div>
              )}
            </div>

            {/* Staff List View */}
            {staffView === 'list' && (
              <div className="space-y-6">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Roles</option>
                      <option value={USER_ROLES.STAFF}>Staff</option>
                      <option value={USER_ROLES.SECURITY}>Security</option>
                    </select>
                  </div>
                </div>

                {/* Staff List */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading staff members...</p>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {searchTerm || filterRole !== 'all' ? 'No staff members match your search criteria' : 'No staff members found'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredStaff.map((staff) => (
                      <div key={staff.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                {staff.role === USER_ROLES.SECURITY ? (
                                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{staff.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{staff.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                                {staff.role}
                              </span>
                              {staff.staffDepartment && (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
                                  {staff.staffDepartment}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditStaff(staff)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff.id, staff.name)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add/Edit Form */}
            {(staffView === 'add' || staffView === 'edit') && (
              <form onSubmit={staffView === 'edit' ? handleUpdateStaff : handleCreateStaff} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => handleStaffFormChange('name', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => handleStaffFormChange('email', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => handleStaffFormChange('role', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={USER_ROLES.STAFF}>Staff</option>
                    <option value={USER_ROLES.SECURITY}>Security</option>
                  </select>
                </div>

                {/* Staff Role Selection - Only show if role is 'staff' */}
                {staffForm.role === USER_ROLES.STAFF && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Staff Department *
                    </label>
                    <select
                      value={staffForm.staffDepartment}
                      onChange={(e) => handleStaffFormChange('staffDepartment', e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Department</option>
                      {STAFF_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Password Configuration - Only show when creating new users */}
              {staffView === 'add' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generatePassword"
                    checked={staffForm.generatePassword}
                    onChange={(e) => handleStaffFormChange('generatePassword', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="generatePassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-generate secure password
                  </label>
                </div>

                {!staffForm.generatePassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={staffForm.password}
                        onChange={(e) => handleStaffFormChange('password', e.target.value)}
                        className={`w-full p-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          passwordError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Enter password (min 6 chars, 1 uppercase, 1 number)"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Password must be at least 6 characters with 1 uppercase letter and 1 number
                    </p>
                  </div>
                )}

                {staffForm.generatePassword && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> A secure password will be automatically generated and sent via email.
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                {staffView === 'edit' && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isCreatingStaff}
                    className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingStaff ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {staffView === 'edit' ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {staffView === 'edit' ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {staffView === 'edit' ? 'Update' : 'Create'} {staffForm.role.charAt(0).toUpperCase() + staffForm.role.slice(1)}
                    </>
                  )}
                </button>
              </div>
              </form>
            )}
          </div>
          {selectedVisitor && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Visitor Details</h3>
                  <button
                    onClick={() => setSelectedVisitor(null)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visitor Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Name:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Phone:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorPhone}</span></div>
                        {selectedVisitor.visitorEmail && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Email:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorEmail}</span></div>)}
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">ID Type:</span><span className="font-medium text-gray-900 dark:text-white capitalize">{(selectedVisitor.idType||'').replace('_',' ')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">ID Number:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.idNumber}</span></div>
                        {selectedVisitor.vehicleNumber && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Vehicle:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.vehicleNumber}</span></div>)}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Host Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Host Name:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Flat/Unit:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostFlat}</span></div>
                        {(selectedVisitor.hostBuilding || selectedVisitor.building) && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Building:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostBuilding || selectedVisitor.building}</span></div>)}
                        {selectedVisitor.hostAuthUserId && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Host ID:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostAuthUserId}</span></div>)}
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Host Phone:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostPhone}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visit Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Purpose:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.purpose}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Entry Time:</span><span className="font-medium text-gray-900 dark:text-white">{new Date(selectedVisitor.entryTime).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Status:</span><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedVisitor.status==='checked_in' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>{selectedVisitor.status==='checked_in' ? 'Inside' : 'Checked Out'}</span></div>
                        {selectedVisitor.exitTime && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Exit Time:</span><span className="font-medium text-gray-900 dark:text-white">{new Date(selectedVisitor.exitTime).toLocaleString()}</span></div>)}
                        {selectedVisitor.notes && (<div><span className="text-gray-600 dark:text-gray-400">Notes:</span><p className="mt-1 text-gray-900 dark:text-white">{selectedVisitor.notes}</p></div>)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">ID Proof Document</h4>
                    {selectedVisitor.documentPhoto ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          <img src={selectedVisitor.documentPhoto} alt="ID Proof Document" className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-700" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block'}} />
                          <div className="hidden p-8 text-center text-gray-500 dark:text-gray-400">
                            <p>Unable to load image</p>
                            <a href={selectedVisitor.documentPhoto} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open in new tab</a>
                          </div>
                        </div>
                        <div>
                          <a href={selectedVisitor.documentPhoto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">View Full Size</a>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No document uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setSelectedVisitor(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (currentPage === 'add-residents') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add Residents</h3>
              <button onClick={async ()=>{
                if (!confirm('Delete ALL resident users from MongoDB? This cannot be undone.')) return
                const res = await mongoService.deleteAllResidents()
                if (res.success) alert('All residents deleted')
                else alert('Delete failed: '+ (res.error||'Unknown'))
              }} className="px-3 py-2 bg-red-600 text-white rounded-lg">Delete All Residents</button>
            </div>
            <AdminAddResidents />
          </div>
        </div>
      )
    }

    // Route other admin sidebar pages to simple views for now
    if (currentPage === 'payments') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Payments</h3>
            <p className="text-gray-600 dark:text-gray-400">Admin payments view (coming soon).</p>
          </div>
        </div>
      )
    }

    if (currentPage === 'announcements') {
      return (
        <div className="space-y-6">
          {/* Announcement Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{announcementStats.totalAnnouncements}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Announcements</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{announcementStats.activeAnnouncements}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-orange-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{announcementStats.typeCounts.announcement || 0}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Announcements</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-purple-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{announcementStats.typeCounts.event || 0}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Events</p>
                </div>
              </div>
            </div>
          </div>

          {/* Announcement Management Interface */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {announcementView !== 'list' && (
                  <button
                    onClick={() => {
                      setAnnouncementView('list')
                      setSelectedAnnouncement(null)
                      setAnnouncementForm({
                        title: '',
                        content: '',
                        type: 'announcement',
                        priority: 'normal',
                        location: '',
                        date: '',
                        organizer: '',
                        image: '',
                        targetRoles: ['resident'],
                        isActive: true
                      })
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Announcements
                  </button>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {announcementView === 'list' ? 'Announcement Management' :
                   announcementView === 'create' ? 'Create New Announcement' :
                   announcementView === 'edit' ? 'Edit Announcement' : 'Announcement Details'}
                </h3>
              </div>
              {announcementView === 'list' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAnnouncementsLoading(true)
                      Promise.all([
                        announcementService.getAnnouncements({ limit: 100 }, user.role),
                        announcementService.getAnnouncementStats(user.role)
                      ]).then(([announcementsResult, statsResult]) => {
                        if (announcementsResult.success) setAnnouncements(announcementsResult.data || [])
                        if (statsResult.success) setAnnouncementStats(statsResult.data)
                      }).finally(() => setAnnouncementsLoading(false))
                    }}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={announcementsLoading}
                  >
                    🔄 {announcementsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setAnnouncementView('create')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create Announcement
                  </button>
                </div>
              )}
            </div>

            {/* Announcement List View */}
            {announcementView === 'list' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search announcements..."
                      value={announcementFilters.search}
                      onChange={(e) => setAnnouncementFilters({...announcementFilters, search: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <select
                    value={announcementFilters.type}
                    onChange={(e) => setAnnouncementFilters({...announcementFilters, type: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="announcement">Announcements</option>
                    <option value="event">Events</option>
                    <option value="festival">Festivals</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <select
                    value={announcementFilters.priority}
                    onChange={(e) => setAnnouncementFilters({...announcementFilters, priority: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <select
                    value={announcementFilters.status}
                    onChange={(e) => setAnnouncementFilters({...announcementFilters, status: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Announcements List */}
                {announcementsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading announcements...</p>
                  </div>
                ) : filteredAnnouncements.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No announcements found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAnnouncements.map((announcement) => (
                      <div key={announcement._id} className="border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleAnnouncementClick(announcement)}>
                        <div className="flex">
                          {/* Left side - Details */}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {announcement.title}
                                  </h4>
                                </div>
                                
                                <div className="flex items-center gap-3 mb-3">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    announcement.type === 'announcement' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                                    announcement.type === 'event' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                                    announcement.type === 'festival' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                  }`}>
                                    {announcement.type}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    announcement.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                                    announcement.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' :
                                    announcement.priority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {announcement.priority}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    announcement.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {announcement.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleEditAnnouncement(announcement)}
                                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnouncement(announcement._id)}
                                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                              {announcement.content}
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {announcement.date ? new Date(announcement.date).toLocaleDateString() : 'No date set'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">{announcement.location || 'No location'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">{announcement.organizer || 'No organizer'}</span>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                              Created: {new Date(announcement.createdAt).toLocaleString()} | 
                              Target: {announcement.targetRoles?.join(', ') || 'All roles'}
                            </div>
                          </div>
                          
                          {/* Right side - Image */}
                          {announcement.image && (
                            <div className="w-48 h-48 flex-shrink-0 p-4">
                              <img
                                src={announcement.image}
                                alt={announcement.title}
                                className="w-full h-full object-cover rounded-lg shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create/Edit Announcement Form */}
            {(announcementView === 'create' || announcementView === 'edit') && (
              <form onSubmit={announcementView === 'create' ? handleCreateAnnouncement : handleUpdateAnnouncement} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter announcement title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type *
                    </label>
                    <select
                      required
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="event">Event</option>
                      <option value="festival">Festival</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority *
                    </label>
                    <select
                      required
                      value={announcementForm.priority}
                      onChange={(e) => setAnnouncementForm({...announcementForm, priority: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={announcementForm.location}
                      onChange={(e) => setAnnouncementForm({...announcementForm, location: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter location (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={announcementForm.date}
                      onChange={(e) => setAnnouncementForm({...announcementForm, date: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Organizer
                    </label>
                    <input
                      type="text"
                      value={announcementForm.organizer}
                      onChange={(e) => setAnnouncementForm({...announcementForm, organizer: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter organizer name (optional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content *
                  </label>
                  <textarea
                    required
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                    rows={6}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter announcement content"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image Upload
                  </label>
                  
                  {/* Image Preview */}
                  {announcementForm.image && (
                    <div className="mb-4">
                      <img
                        src={announcementForm.image}
                        alt="Announcement preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="mt-2 px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove Image
                      </button>
                    </div>
                  )}

                  {/* File Upload Input */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                      id="image-upload"
                      disabled={imageUploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer ${imageUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {imageUploading ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Uploading image...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload an image
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Target Roles */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Target Audience</h4>
                  <div className="flex flex-wrap gap-2">
                    {['resident', 'staff', 'security'].map((role) => (
                      <label key={role} className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="checkbox"
                          checked={announcementForm.targetRoles.includes(role)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...announcementForm.targetRoles, role]
                              : announcementForm.targetRoles.filter(r => r !== role)
                            setAnnouncementForm({...announcementForm, targetRoles: newRoles})
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-white capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={announcementForm.isActive}
                    onChange={(e) => setAnnouncementForm({...announcementForm, isActive: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Publish announcement (make it visible to residents)
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementView('list')
                      setSelectedAnnouncement(null)
                    }}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={announcementsLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {announcementsLoading ? 'Processing...' : announcementView === 'create' ? 'Create Announcement' : 'Update Announcement'}
                  </button>
                </div>
              </form>
            )}

            {/* Announcement Details View */}
            {announcementView === 'details' && selectedAnnouncement && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Announcement Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Announcement Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Title:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedAnnouncement.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedAnnouncement.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedAnnouncement.priority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`font-medium capitalize ${selectedAnnouncement.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                          {selectedAnnouncement.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {selectedAnnouncement.organizer && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Organizer:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedAnnouncement.organizer}</span>
                        </div>
                      )}
                      {selectedAnnouncement.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Location:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedAnnouncement.location}</span>
                        </div>
                      )}
                      {selectedAnnouncement.date && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Date:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{new Date(selectedAnnouncement.date).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{new Date(selectedAnnouncement.createdAt).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Content:</span>
                        <p className="mt-1 text-gray-900 dark:text-white">{selectedAnnouncement.content}</p>
                      </div>
                      {selectedAnnouncement.targetRoles && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Target Audience:</span>
                          <p className="mt-1 text-gray-900 dark:text-white">{selectedAnnouncement.targetRoles.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Preview */}
                  {selectedAnnouncement.image && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Image Preview</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <img 
                          src={selectedAnnouncement.image} 
                          alt="Announcement" 
                          className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-700"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'block'
                          }}
                        />
                        <div className="hidden p-8 text-center text-gray-500 dark:text-gray-400">
                          <p>Unable to load image</p>
                          <a href={selectedAnnouncement.image} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open in new tab</a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEditAnnouncement(selectedAnnouncement)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Announcement
                  </button>
                  <button
                    onClick={() => handleDeleteAnnouncement(selectedAnnouncement._id)}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Announcement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'chat') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Chat</h3>
              <div className="flex gap-2">
                <button onClick={async () => {
                  try {
                    setChatLoading(true)
                    const { rooms } = await chatService.listRooms(user.id)
                    console.log('Manual refresh - Loaded rooms:', rooms)
                    setChatRooms(rooms || [])
                  } catch (e) {
                    console.error('Manual refresh error:', e)
                  } finally {
                    setChatLoading(false)
                  }
                }} className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
                  Refresh
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Residents / Rooms */}
              <div className="lg:col-span-1 border dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">Community Members</span>
                  <div className="flex items-center gap-2">
                    {chatLoading && <span className="text-xs text-gray-500">Loading…</span>}
                    <button onClick={async () => {
                      try {
                        setChatLoading(true)
                        // Force create Community Group
                        const { residents } = await residentService.listResidents()
                        const allResidentIds = (residents || []).map(r => r.authUserId).filter(Boolean)
                        
                        // Get all admin users
                        let adminIds = []
                        try {
                          const adminResult = await authService.getStaffUsers()
                          if (adminResult.success) {
                            adminIds = (adminResult.users || []).map(admin => admin.id).filter(Boolean)
                          }
                        } catch (e) {
                          console.log('Could not load admin users:', e)
                        }
                        
                        const allIds = [...allResidentIds, ...adminIds, user.id].filter((id, index, arr) => arr.indexOf(id) === index)
                        console.log('Admin manual refresh: Creating Community Group with IDs:', allIds)
                        await chatService.createOrGetGroupRoom('Community Group', allIds)
                        
                        // Reload rooms
                        const { rooms } = await chatService.listRooms(user.id)
                        console.log('Admin manual refresh - Loaded rooms:', rooms)
                        setChatRooms(rooms || [])
                        
                        // Auto-select Community Group if available
                        const communityGroup = rooms?.find(r => r.type === 'group' && r.name === 'Community Group')
                        if (communityGroup) {
                          setSelectedRoomId(communityGroup._id)
                        }
                      } catch (e) {
                        console.error('Admin manual refresh error:', e)
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
                    const group = (chatRooms || []).find(r => r.type === 'group' && r.name === 'Community Group')
                    if (!group) {
                      console.log('Admin chat: No Community Group found in chatRooms')
                      return (
                        <div className="p-3 border-b dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
                          <div className="text-xs text-yellow-800 dark:text-yellow-200">
                            Community Group not found. Click Refresh to create it.
                          </div>
                        </div>
                      )
                    }
                    return (
                      <button key={group._id} onClick={() => setSelectedRoomId(group._id)} className={`w-full text-left p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedRoomId === group._id ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                        <div className="text-sm text-gray-900 dark:text-white truncate">{group.name || 'Community Group'}</div>
                        <div className="text-xs text-gray-500">{new Date(group.lastMessageAt).toLocaleString?.() || ''}</div>
                      </button>
                    )
                  })()}
                  {/* Residents list for DM */}
                  {(residentsList || []).filter(r => r.authUserId !== user.id).map(r => (
                    <button key={r.authUserId} onClick={async () => {
                      try {
                        const { room } = await chatService.createOrGetDmRoom([user.id, r.authUserId])
                        setSelectedRoomId(room._id)
                        const { rooms } = await chatService.listRooms(user.id)
                        setChatRooms(rooms || [])
                      } catch (e) { 
                        console.error(e); 
                        showError('Failed to Open Chat', 'Please try again later.') 
                      }
                    }} className={`w-full text-left p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedRoomId && (chatRooms.find(rr => rr._id === selectedRoomId)?.memberAuthUserIds || []).includes(r.authUserId) ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
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
                    const room = (chatRooms || []).find(r => r._id === selectedRoomId)
                    console.log('Admin chat: Selected room:', room)
                    let label = 'Select a chat'
                    if (room) {
                      if (room.type === 'group') {
                        label = room.name || 'Community Group'
                        console.log('Admin chat: Group room members:', room.memberAuthUserIds)
                      } else {
                        const otherId = (room.memberAuthUserIds || []).find(x => x !== user.id)
                        const other = getDisplayForUserId(otherId)
                        label = other?.name || other?.email || otherId || 'Resident'
                      }
                    }
                    const initials = (label || 'R').slice(0, 2).toUpperCase()
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
                
                <div 
                  className="flex-1 overflow-auto p-4 space-y-2 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'><rect fill=\'%23f8fafc\' width=\'20\' height=\'20\'/><circle cx=\'10\' cy=\'10\' r=\'1\' fill=\'%23e5e7eb\'/></svg>')] dark:bg-gray-900" 
                  onScroll={() => markRoomSeen(selectedRoomId)}
                >
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
                          <div className={`text-[10px] text-gray-500 mt-1 ${mine ? '' : ''}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {mine && (
                          <div className={`w-7 h-7 rounded-full ${hashToPalette(user.id)} text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0`}>
                            {(user.name || 'Admin').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {messagesLoading && (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
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
                      onChange={(e) => setComposer(e.target.value)} 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                          e.preventDefault(); 
                          if (selectedFile) {
                            sendFileMessage()
                          } else {
                            sendTextMessage()
                          }
                        } 
                      }} 
                      className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" 
                      placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."} 
                      disabled={!selectedRoomId}
                    />
                    
                    <button 
                      onClick={selectedFile ? sendFileMessage : sendTextMessage}
                      className="px-4 py-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2" 
                      disabled={!selectedRoomId || (!composer.trim() && !selectedFile) || fileUploading}
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
    }

    if (currentPage === 'maintenance') {
      return (
        <div className="space-y-6">
          {/* Bill Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{billStats.totalBills}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Bills</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹{billStats.paidAmount?.toLocaleString() || 0}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Collected</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-orange-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹{billStats.pendingAmount?.toLocaleString() || 0}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-red-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{billStats.overdueCount || 0}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Management Interface */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {billView !== 'list' && (
                  <button
                    onClick={() => {
                      setBillView('list')
                      setSelectedBill(null)
                      setBillForm({
                        title: '',
                        description: '',
                        category: 'electricity',
                        totalAmount: '',
                        dueDate: '',
                        splitType: 'equal',
                        selectedResidents: [],
                        customSplits: {},
                        apartmentSizes: {},
                        attachments: []
                      })
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Bills
                  </button>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {billView === 'list' ? 'Bill Management' :
                   billView === 'create' ? 'Create New Bill' :
                   billView === 'edit' ? 'Edit Bill' : 'Bill Details'}
                </h3>
              </div>
              {billView === 'list' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setBillsLoading(true)
                      Promise.all([
                        billService.getAllBills(),
                        billService.getBillStats()
                      ]).then(([billsResult, statsResult]) => {
                        if (billsResult.success) setBills(billsResult.data?.bills || [])
                        if (statsResult.success) setBillStats(statsResult.data)
                      }).finally(() => setBillsLoading(false))
                    }}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={billsLoading}
                  >
                    🔄 {billsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setBillView('create')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create Bill
                  </button>
                </div>
              )}
            </div>

            {/* Bill List View */}
            {billView === 'list' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search bills..."
                      value={billFilters.search}
                      onChange={(e) => setBillFilters({...billFilters, search: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <select
                    value={billFilters.category}
                    onChange={(e) => setBillFilters({...billFilters, category: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="electricity">Electricity</option>
                    <option value="water">Water</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="gas">Gas</option>
                    <option value="internet">Internet</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                  <select
                    value={billFilters.status}
                    onChange={(e) => setBillFilters({...billFilters, status: e.target.value})}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Bills List */}
                {billsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading bills...</p>
                  </div>
                ) : filteredBills.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No bills found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Bill</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Category</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Due Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBills.map((bill) => (
                          <tr
                            key={bill._id}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{bill.title}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{bill.description}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded capitalize">
                                {bill.category}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900 dark:text-white">₹{bill.totalAmount?.toLocaleString()}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{bill.assignments?.length || 0} residents</p>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-gray-900 dark:text-white">
                                  {new Date(bill.dueDate).toLocaleDateString()}
                                </p>
                                <p className={`text-sm ${new Date(bill.dueDate) < new Date() ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {new Date(bill.dueDate) < new Date() ? 'Overdue' : 'Active'}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                bill.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : bill.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {bill.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedBill(bill)
                                    setBillView('details')
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditBill(bill)}
                                  className="p-1 text-green-600 hover:text-green-800 dark:text-green-400"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBill(bill._id)}
                                  className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Create/Edit Bill Form */}
            {(billView === 'create' || billView === 'edit') && (
              <form onSubmit={billView === 'create' ? handleCreateBill : handleUpdateBill} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bill Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={billForm.title}
                      onChange={(e) => setBillForm({...billForm, title: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., December 2024 Electricity Bill"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={billForm.category}
                      onChange={(e) => setBillForm({...billForm, category: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="electricity">Electricity</option>
                      <option value="water">Water</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="gas">Gas</option>
                      <option value="internet">Internet</option>
                      <option value="security">Security</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={billForm.totalAmount}
                      onChange={(e) => setBillForm({...billForm, totalAmount: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter total bill amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={billForm.dueDate}
                      onChange={(e) => setBillForm({...billForm, dueDate: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={billForm.description}
                    onChange={(e) => setBillForm({...billForm, description: e.target.value})}
                    rows={3}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter bill description"
                  />
                </div>

                {/* Split Configuration */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Bill Split Configuration</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Split Type *
                    </label>
                    <select
                      value={billForm.splitType}
                      onChange={(e) => setBillForm({...billForm, splitType: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="equal">Equal Split</option>
                      <option value="custom">Custom Amounts</option>
                      <option value="size_based">Size Based</option>
                    </select>
                  </div>

                  {/* Resident Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Residents *
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                      {residents.map((resident) => (
                        <label key={resident.authUserId} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            checked={billForm.selectedResidents.includes(resident.authUserId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBillForm({
                                  ...billForm,
                                  selectedResidents: [...billForm.selectedResidents, resident.authUserId]
                                })
                              } else {
                                setBillForm({
                                  ...billForm,
                                  selectedResidents: billForm.selectedResidents.filter(id => id !== resident.authUserId)
                                })
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{resident.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{resident.building}-{resident.flatNumber}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Custom Split Amounts */}
                  {billForm.splitType === 'custom' && billForm.selectedResidents.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Custom Amounts
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {billForm.selectedResidents.map((residentId) => {
                          const resident = residents.find(r => r.authUserId === residentId)
                          return (
                            <div key={residentId} className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{resident?.name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{resident?.building}-{resident?.flatNumber}</p>
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={billForm.customSplits[residentId] || ''}
                                onChange={(e) => setBillForm({
                                  ...billForm,
                                  customSplits: {
                                    ...billForm.customSplits,
                                    [residentId]: parseFloat(e.target.value) || 0
                                  }
                                })}
                                className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="₹"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setBillView('list')
                      setSelectedBill(null)
                    }}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={billsLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {billsLoading ? 'Processing...' : billView === 'create' ? 'Create Bill' : 'Update Bill'}
                  </button>
                </div>
              </form>
            )}

            {/* Bill Details View */}
            {billView === 'details' && selectedBill && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Bill Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Bill Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Title:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedBill.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Category:</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedBill.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                        <span className="font-medium text-gray-900 dark:text-white">₹{selectedBill.totalAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{new Date(selectedBill.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`font-medium capitalize ${selectedBill.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{selectedBill.status}</span>
                      </div>
                      {selectedBill.description && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Description:</span>
                          <p className="mt-1 text-gray-900 dark:text-white">{selectedBill.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resident Assignments */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resident Assignments</h4>
                    <div className="space-y-2">
                      {selectedBill.assignments?.map((assignment) => (
                        <div key={assignment.residentId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{assignment.residentName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{assignment.building}-{assignment.flatNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">₹{assignment.amount}</p>
                            <span className={`text-xs px-2 py-1 rounded ${
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
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEditBill(selectedBill)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Bill
                  </button>
                  <button
                    onClick={() => handleDeleteBill(selectedBill._id)}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Bill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'visitors') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">All Visitor Logs</h3>
              <button
                onClick={async ()=>{
                  try {
                    setVisitorLoading(true)
                    const result = await mongoService.getVisitorLogs({})
                    if (result.success) {
                      const logs = result.data?.data || []
                      setVisitorLogs(logs)
                    } else {
                      setVisitorLogs([])
                    }
                  } finally { setVisitorLoading(false) }
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg"
              >Refresh</button>
            </div>
            {visitorLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            ) : visitorLogs.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No visitor logs found.</p>
            ) : (
              <div className="overflow-x-auto">
                {/* Filters */}
                <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between mb-3">
                  <div className="flex-1 relative">
                    <input
                      value={visitorSearch}
                      onChange={(e)=>setVisitorSearch(e.target.value)}
                      placeholder="Search by visitor, phone, host, flat, purpose..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={visitorStatus}
                      onChange={(e)=>setVisitorStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Status</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                    </select>
                    <input
                      type="date"
                      value={visitorDate}
                      onChange={(e)=>setVisitorDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <select
                      value={visitorBuilding}
                      onChange={(e)=>setVisitorBuilding(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Buildings</option>
                      <option value="A">Building A</option>
                      <option value="B">Building B</option>
                      <option value="C">Building C</option>
                    </select>
                    <button
                      onClick={()=>{ setVisitorSearch(''); setVisitorStatus('all'); setVisitorDate(''); setVisitorBuilding('all') }}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >Clear</button>
                  </div>
                </div>
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Visitor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Resident (Host)</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Purpose</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Entry Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorLogs
                      .filter(log => visitorStatus==='all' ? true : log.status === visitorStatus)
                      .filter(log => visitorBuilding==='all' ? true : (log.hostBuilding || log.building) === visitorBuilding)
                      .filter(log => {
                        if (!visitorDate) return true
                        const d = new Date(log.entryTime)
                        return d.toISOString().slice(0,10) === visitorDate
                      })
                      .filter(log => {
                        const q = visitorSearch.trim().toLowerCase()
                        if (!q) return true
                        const hay = [
                          log.visitorName, log.visitorPhone, log.hostName, log.hostFlat, log.purpose
                        ].map(x => (x||'').toString().toLowerCase()).join(' ')
                        return hay.includes(q)
                      })
                      .map((log) => (
                      <tr key={log._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setSelectedVisitor(log)}>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{log.visitorName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{log.visitorPhone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{log.hostName || log.residentName || 'Unknown'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {[
                                (log.building || log.hostBuilding),
                                (log.hostFlat || log.flatNumber)
                              ].filter(Boolean).join('-') || '—'}
                            </p>
                            {log.hostAuthUserId && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">ID: {log.hostAuthUserId}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900 dark:text-white">{log.purpose}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-gray-900 dark:text-white">{new Date(log.entryTime).toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.status === 'checked_in'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {log.status === 'checked_in' ? 'Inside' : 'Checked Out'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedVisitor(log) }}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {selectedVisitor && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Visitor Details</h3>
                  <button
                    onClick={() => setSelectedVisitor(null)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visitor Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Name:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Phone:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorPhone}</span></div>
                        {selectedVisitor.visitorEmail && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Email:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorEmail}</span></div>)}
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">ID Type:</span><span className="font-medium text-gray-900 dark:text-white capitalize">{(selectedVisitor.idType||'').replace('_',' ')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">ID Number:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.idNumber}</span></div>
                        {selectedVisitor.vehicleNumber && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Vehicle:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.vehicleNumber}</span></div>)}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Host Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Host Name:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostName}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Flat/Unit:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostFlat}</span></div>
                        {(selectedVisitor.hostBuilding || selectedVisitor.building) && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Building:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostBuilding || selectedVisitor.building}</span></div>)}
                        {selectedVisitor.hostAuthUserId && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Host ID:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostAuthUserId}</span></div>)}
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Host Phone:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostPhone}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visit Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Purpose:</span><span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.purpose}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Entry Time:</span><span className="font-medium text-gray-900 dark:text-white">{new Date(selectedVisitor.entryTime).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Status:</span><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedVisitor.status==='checked_in' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>{selectedVisitor.status==='checked_in' ? 'Inside' : 'Checked Out'}</span></div>
                        {selectedVisitor.exitTime && (<div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Exit Time:</span><span className="font-medium text-gray-900 dark:text-white">{new Date(selectedVisitor.exitTime).toLocaleString()}</span></div>)}
                        {selectedVisitor.notes && (<div><span className="text-gray-600 dark:text-gray-400">Notes:</span><p className="mt-1 text-gray-900 dark:text-white">{selectedVisitor.notes}</p></div>)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">ID Proof Document</h4>
                    {selectedVisitor.documentPhoto ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          <img src={selectedVisitor.documentPhoto} alt="ID Proof Document" className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-700" onError={(e)=>{e.target.style.display='none'; e.target.nextSibling.style.display='block'}} />
                          <div className="hidden p-8 text-center text-gray-500 dark:text-gray-400">
                            <p>Unable to load image</p>
                            <a href={selectedVisitor.documentPhoto} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open in new tab</a>
                          </div>
                        </div>
                        <div>
                          <a href={selectedVisitor.documentPhoto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">View Full Size</a>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No document uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setSelectedVisitor(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (currentPage === 'complaints') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Resident Complaints</h3>
              <button
                onClick={async ()=>{
                  try {
                    setComplaintsLoading(true)
                    const { complaints } = await complaintService.listComplaints()
                    setComplaints(complaints || [])
                  } finally { setComplaintsLoading(false) }
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg"
              >Refresh</button>
            </div>
            {complaintsLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            ) : complaints.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No complaints found.</p>
            ) : (
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-2 border-b dark:border-gray-700">
                  <div className="flex-1 relative">
                    <input
                      value={complaintSearch}
                      onChange={(e)=>setComplaintSearch(e.target.value)}
                      placeholder="Search by title, description, resident, email, flat..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <select
                      value={complaintStatus}
                      onChange={(e)=>setComplaintStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All</option>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {(complaints
                  .filter(c => complaintStatus==='all' ? true : c.status===complaintStatus)
                  .filter(c => {
                    const q = complaintSearch.trim().toLowerCase()
                    if (!q) return true
                    const hay = [
                      c.title, c.description, c.residentName, c.residentEmail, c.flatNumber, c.building
                    ].map(x => (x||'').toString().toLowerCase()).join(' ')
                    return hay.includes(q)
                  })
                ).map((c)=> (
                  <div key={c._id} className="p-4 border dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{c.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{c.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{c.residentName} • {c.building}-{c.flatNumber} • {new Date(c.createdAt).toLocaleString()}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {c.residentEmail && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-500">Email: {c.residentEmail}</span>
                          )}
                          {c.residentPhone && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-500">Phone: {c.residentPhone}</span>
                          )}
                        </div>
                        {c.residentAuthUserId && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">ID: {c.residentAuthUserId}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${c.status==='resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.status}</span>
                        {c.status !== 'resolved' ? (
                          <button
                            onClick={async ()=>{
                              try {
                                await complaintService.updateComplaint(c._id, { status: 'resolved' })
                                setComplaints(complaints.map(x => x._id===c._id ? { ...x, status: 'resolved', updatedAt: new Date().toISOString() } : x))
                              } catch (e) { console.error(e) }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded"
                          >Mark Resolved</button>
                        ) : (
                          <span className="text-xs text-gray-500">Resolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resident Service Requests */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Resident Service Requests</h3>
              <button
                onClick={async ()=>{
                  try {
                    setServiceRequestsLoading(true)
                    const res = await mongoService.listServiceRequests({ limit: 200 })
                    if (res.success) setServiceRequests(res.data || [])
                    else setServiceRequests([])
                  } finally { setServiceRequestsLoading(false) }
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg"
              >Refresh</button>
            </div>
            {serviceRequestsLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            ) : serviceRequests.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No service requests found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Resident</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Priority</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRequests.map(sr => (
                      <tr key={sr._id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3 px-4 font-mono text-xs text-gray-700 dark:text-gray-300">{sr.requestId || sr._id}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{sr.residentName || sr.residentAuthUserId}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{sr.building}-{sr.flatNumber}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">{sr.category}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sr.priority==='urgent'?'bg-red-100 text-red-800':
                            sr.priority==='high'?'bg-orange-100 text-orange-800':
                            sr.priority==='medium'?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-800'
                          }`}>{sr.priority}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sr.status==='created'?'bg-gray-100 text-gray-800':
                            sr.status==='assigned'?'bg-amber-100 text-amber-800':
                            sr.status==='in_progress'?'bg-blue-100 text-blue-800':
                            sr.status==='completed'?'bg-purple-100 text-purple-800':'bg-green-100 text-green-800'
                          }`}>
                            {String(sr.status||'').replace('_',' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">{new Date(sr.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'reports') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Reports</h3>
            <p className="text-gray-600 dark:text-gray-400">Analytics and reports (coming soon).</p>
          </div>
        </div>
      )
    }

    if (currentPage === 'notifications') {
      return (
        <div className="space-y-6">
          {/* Notification Management Interface */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {notificationView !== 'list' && (
                  <button
                    onClick={() => {
                      setNotificationView('list')
                      setNotificationForm({
                        title: '',
                        message: '',
                        type: 'info',
                        priority: 'medium',
                        targetUsers: [],
                        targetRoles: [],
                        expiresAt: ''
                      })
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Notifications
                  </button>
                )}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {notificationView === 'list' ? 'Notification Management' : 'Create New Notification'}
                </h3>
              </div>
              {notificationView === 'list' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setNotificationsLoading(true)
                      notificationService.getUserNotifications(user.id, { limit: 100, role: 'admin' }).then(result => {
                        if (result.success) {
                          setNotifications(result.data?.notifications || [])
                        }
                      }).finally(() => setNotificationsLoading(false))
                    }}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={notificationsLoading}
                  >
                    🔄 {notificationsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setNotificationView('create')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create Notification
                  </button>
                </div>
              )}
            </div>

            {/* Notification List View */}
            {notificationView === 'list' && (
              <div className="space-y-6">
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
                      <div key={notification._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">{notification.title}</h4>
                              <span className={`px-2 py-1 text-xs rounded ${
                                notification.type === 'bill' ? 'bg-blue-100 text-blue-800' :
                                notification.type === 'complaint' ? 'bg-red-100 text-red-800' :
                                notification.type === 'info' ? 'bg-gray-100 text-gray-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {notification.type}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${
                                notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                notification.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {notification.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notification.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                              <span>From: {notification.senderName}</span>
                              <span>Created: {new Date(notification.createdAt).toLocaleString()}</span>
                              {notification.targetRoles.length > 0 && (
                                <span>Target: {notification.targetRoles.join(', ')}</span>
                              )}
                              {notification.targetUsers.length > 0 && (
                                <span>Users: {notification.targetUsers.length}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteNotification(notification._id)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Notification Form */}
            {notificationView === 'create' && (
              <form onSubmit={handleCreateNotification} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter notification title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type *
                    </label>
                    <select
                      required
                      value={notificationForm.type}
                      onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Warning</option>
                      <option value="success">Success</option>
                      <option value="error">Error</option>
                      <option value="bill">Bill Related</option>
                      <option value="complaint">Complaint Related</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority *
                    </label>
                    <select
                      required
                      value={notificationForm.priority}
                      onChange={(e) => setNotificationForm({...notificationForm, priority: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expires At
                    </label>
                    <input
                      type="datetime-local"
                      value={notificationForm.expiresAt}
                      onChange={(e) => setNotificationForm({...notificationForm, expiresAt: e.target.value})}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                    rows={4}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter notification message"
                  />
                </div>

                {/* Target Selection */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Target Recipients</h4>
                  
                  {/* Role-based targeting */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Roles
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['resident', 'staff', 'security'].map((role) => (
                        <label key={role} className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={notificationForm.targetRoles.includes(role)}
                            onChange={(e) => {
                              const newRoles = e.target.checked
                                ? [...notificationForm.targetRoles, role]
                                : notificationForm.targetRoles.filter(r => r !== role)

                              // Auto-select specific users matching selected roles
                              const roleSet = new Set(newRoles)
                              const selectedUserIds = (allUsers || [])
                                .filter(u => roleSet.has(u.role))
                                .map(u => u.authUserId || u.id)

                              setNotificationForm({
                                ...notificationForm,
                                targetRoles: newRoles,
                                targetUsers: selectedUserIds
                              })
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-white capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* User-based targeting */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Specific Users
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                      {allUsers.map((userItem) => (
                        <label key={userItem.authUserId || userItem.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            checked={notificationForm.targetUsers.includes(userItem.authUserId || userItem.id)}
                            onChange={(e) => {
                              const userId = userItem.authUserId || userItem.id
                              if (e.target.checked) {
                                setNotificationForm({
                                  ...notificationForm,
                                  targetUsers: [...notificationForm.targetUsers, userId]
                                })
                              } else {
                                setNotificationForm({
                                  ...notificationForm,
                                  targetUsers: notificationForm.targetUsers.filter(id => id !== userId)
                                })
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{userItem.name || userItem.email}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{userItem.role}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationView('list')
                      setNotificationForm({
                        title: '',
                        message: '',
                        type: 'info',
                        priority: 'medium',
                        targetUsers: [],
                        targetRoles: [],
                        expiresAt: ''
                      })
                    }}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={notificationsLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {notificationsLoading ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )
    }

    if (currentPage === 'settings') {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h3>
            <p className="text-gray-600 dark:text-gray-400">Platform settings (coming soon).</p>
          </div>
        </div>
      )
    }

    // Default dashboard content
    return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Welcome to the Community Service Platform administration panel. Use the sidebar navigation to manage different aspects of the platform.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <span className="text-gray-900 dark:text-white">Total Residents</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">156</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-green-600" />
                    <span className="text-gray-900 dark:text-white">Staff & Security Members</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{staffList.length}</span>
                </div>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Use the sidebar navigation to manage different aspects of the community platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user.name || 'Admin'}!</p>
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
        {renderContent()}
      </div>
    </div>
  )
}

export default AdminDashboard
