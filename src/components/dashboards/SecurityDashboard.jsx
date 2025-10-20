import { useState, useEffect } from 'react'
import {
  LogOut,
  Plus,
  Search,
  Filter,
  Camera,
  Upload,
  Eye,
  Edit,
  Trash2,
  Clock,
  User,
  Phone,
  Home,
  Car,
  FileText,
  CheckCircle,
  XCircle,
  X,
  Calendar,
  Download,
  QrCode,
  Bell,
  Users,
  Building,
  Shield,
  AlertTriangle,
  Mic,
  MicOff,
  UserCheck,
  Key,
  Package,
  MapPin,
  Star,
  AlertCircle,
  Mail,
  Truck,
  ShoppingBag,
  Zap,
  History,
  UserX,
  Barcode,
  ClipboardList,
  TrendingUp
} from 'lucide-react'
import { mongoService } from '../../services/mongoService'
import { passService } from '../../services/passService'
import { notificationService } from '../../services/notificationService'
import { enhancedResidentService } from '../../services/enhancedResidentService'
import { residentService } from '../../services/residentService'
import { deliveryService } from '../../services/deliveryService'
import { showSuccess, showError, showConfirm, showWarning, notify } from '../../utils/sweetAlert'

const SecurityDashboard = ({ user, onLogout, currentPage = 'dashboard' }) => {
  // State management
  const [activeView, setActiveView] = useState('list') // 'list', 'add', 'edit', 'scan', 'residents', 'resident-details', 'deliveries', 'delivery-add', 'delivery-bulk'
  const [visitorLogs, setVisitorLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [stats, setStats] = useState({ totalVisitors: 0, checkedIn: 0, checkedOut: 0 })

  // Resident Directory State
  const [residents, setResidents] = useState([])
  const [filteredResidents, setFilteredResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(false)
  const [residentSearchTerm, setResidentSearchTerm] = useState('')
  const [residentFilters, setResidentFilters] = useState({
    building: '',
    ownersOnly: false,
    tenantsOnly: false,
    kycVerified: null,
    restricted: null
  })
  const [selectedResident, setSelectedResident] = useState(null)
  const [residentDetails, setResidentDetails] = useState(null)
  const [flatDetails, setFlatDetails] = useState(null)
  const [guestList, setGuestList] = useState([])
  const [buildingStats, setBuildingStats] = useState(null)

  // Voice Search State
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState(null)

  // QR/Scan State
  const [scanMode, setScanMode] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  // Delivery Log State
  const [deliveryLogs, setDeliveryLogs] = useState([])
  const [filteredDeliveries, setFilteredDeliveries] = useState([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)
  const [deliverySearchTerm, setDeliverySearchTerm] = useState('')
  const [deliveryFilters, setDeliveryFilters] = useState({
    vendor: '',
    date: '',
    status: 'all',
    flatNumber: ''
  })
  const [vendors, setVendors] = useState([])
  const [frequentAgents, setFrequentAgents] = useState([])
  const [deliverySuggestions, setDeliverySuggestions] = useState(null)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [deliveryStats, setDeliveryStats] = useState(null)
  const [blacklistedAgents, setBlacklistedAgents] = useState([])

  // 2-Click Delivery Form State
  const [quickDeliveryForm, setQuickDeliveryForm] = useState({
    selectedVendor: null,
    selectedFlat: null,
    agentName: '',
    agentPhone: '',
    trackingId: '',
    packageDescription: '',
    deliveryNotes: '',
    proofPhoto: null,
    proofUrl: null
  })
  const [bulkDeliveryMode, setBulkDeliveryMode] = useState(false)
  const [bulkDeliveries, setBulkDeliveries] = useState([])

  // Notification State
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  // Form state
  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    visitorPhone: '',
    visitorEmail: '',
    idType: 'aadhar',
    idNumber: '',
    purpose: '',
    hostName: '',
    hostFlat: '',
    hostPhone: '',
    vehicleNumber: '',
    notes: ''
  })

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [editingVisitor, setEditingVisitor] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('checking') // 'checking', 'connected', 'disconnected'
  const [selectedVisitor, setSelectedVisitor] = useState(null) // For detailed view
  const [scanCode, setScanCode] = useState('')
  const [scannedPass, setScannedPass] = useState(null)
  const [showQrScanner, setShowQrScanner] = useState(false)

  // Check connection status
  const checkConnection = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/health')
      if (response.ok) {
        setConnectionStatus('connected')
        return true
      } else {
        setConnectionStatus('disconnected')
        return false
      }
    } catch (error) {
      setConnectionStatus('disconnected')
      return false
    }
  }

  // Load visitor logs on component mount
  useEffect(() => {
    checkConnection().then((connected) => {
      if (connected) {
        // Test MongoDB connection
        mongoService.testConnection().then((result) => {
          console.log('🔗 MongoDB connection test:', result)
        })

        loadVisitorLogs()
        loadStats()
      }
    })
  }, [])

  // Sync sidebar route -> activeView
  useEffect(() => {
    if (currentPage === 'scan-pass') {
      setActiveView('scan')
    } else if (currentPage === 'visitors') {
      setActiveView('list')
    } else if (currentPage === 'residents') {
      setActiveView('residents')
      loadResidents()
      loadBuildingStats()
    } else if (currentPage === 'deliveries') {
      setActiveView('deliveries')
      loadDeliveryLogs()
      loadVendors()
      loadDeliveryStats()
      loadBlacklistedAgents()
      loadResidents() // Load residents for flat selection
    } else if (currentPage === 'notifications') {
      // Notifications page is handled separately
    }
  }, [currentPage])

  // Filter logs when search term or filters change
  useEffect(() => {
    filterLogs()
  }, [visitorLogs, searchTerm, statusFilter, dateFilter])

  // Filter residents when search term or filters change
  useEffect(() => {
    filterResidents()
  }, [residents, residentSearchTerm, residentFilters])

  // Filter deliveries when search term or filters change
  useEffect(() => {
    filterDeliveries()
  }, [deliveryLogs, deliverySearchTerm, deliveryFilters])

  // Load residents when delivery-add view is active
  useEffect(() => {
    if (activeView === 'delivery-add' && residents.length === 0 && !residentsLoading) {
      loadResidents()
    }
  }, [activeView])

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setResidentSearchTerm(transcript)
        setIsListening(false)
      }
      
      recognition.onerror = () => {
        setIsListening(false)
        showError('Voice Recognition Error', 'Could not process voice input. Please try again.')
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }
      
      setRecognition(recognition)
    }
  }, [])

  // Load notifications when notifications page is active
  useEffect(() => {
    const fetchNotifications = async () => {
      if (currentPage !== 'notifications' || !user?.id) return
      try {
        setNotificationsLoading(true)
        const result = await notificationService.getUserNotifications(user.id, { limit: 50, role: 'security' })
        if (result.success) {
          setNotifications(result.data?.notifications || [])
        }
      } catch (e) {
        console.error('Error loading notifications:', e)
        setNotifications([])
      } finally {
        setNotificationsLoading(false)
      }
    }
    fetchNotifications()
  }, [currentPage, user])

  // Load visitor logs
  const loadVisitorLogs = async () => {
    setIsLoading(true)
    try {
      const filters = {}
      if (dateFilter) filters.date = dateFilter
      if (statusFilter !== 'all') filters.status = statusFilter

      console.log('📋 Loading visitor logs with filters:', filters)
      const result = await mongoService.getVisitorLogs(filters)

      if (result.success) {
        const logs = result.data?.data || []
        console.log('✅ Loaded visitor logs:', logs.length, 'records')
        setVisitorLogs(logs)
      } else {
        console.error('❌ Failed to load visitor logs:', result.error)
        setVisitorLogs([]) // Set empty array on error

        // Show user-friendly error message
        if (result.error.includes('MongoDB server is not running')) {
          console.warn('⚠️ MongoDB server is not running')
        }
      }
    } catch (error) {
      console.error('❌ Error loading visitor logs:', error)
      setVisitorLogs([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }

  // Load statistics
  const loadStats = async () => {
    try {
      const result = await mongoService.getVisitorStats('today')
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Load residents for directory - only show admin-created residents
  const loadResidents = async () => {
    setResidentsLoading(true)
    try {
      console.log('🔄 Loading admin-created residents...')
      
      // Use the same approach as AdminUserManagementSimple - get admin resident entries
      const res = await mongoService.getAdminResidentEntries?.()
      if (res?.success) {
        // Process and format residents from AdminAddResidents
        const formattedResidents = (res.data || []).map(resident => ({
          ...resident,
          authUserId: resident.authUserId || resident._id,
          building: resident.building,
          flatNumber: resident.flatNumber,
          name: resident.name,
          email: resident.email,
          phone: resident.phone,
          isOwner: resident.isOwner || false,
          kycVerified: resident.kycVerified || false,
          isRestricted: resident.isRestricted || false,
          aadharNumber: resident.aadharNumber,
          // Mark as admin added for identification
          adminAdded: true
        }))

        console.log('✅ Loaded admin-created residents:', formattedResidents.length, 'residents')
        console.log('📋 Admin-created residents data:', formattedResidents)
        setResidents(formattedResidents)
        
        // Debug: Log first few residents to understand data structure
        if (formattedResidents.length > 0) {
          console.log('🔍 Sample resident data structure:', formattedResidents.slice(0, 2))
        }
      } else {
        console.warn('⚠️ No admin-created residents found')
        console.log('🔄 Showing empty list - create residents using AdminAddResidents first')
        // Show empty list instead of mock data
        setResidents([])
      }
    } catch (error) {
      console.error('❌ Error loading admin-created residents:', error)
      console.log('🔄 Showing empty list')
      // Show empty list instead of mock data
      setResidents([])
    } finally {
      setResidentsLoading(false)
    }
  }


  // Load building statistics
  const loadBuildingStats = async () => {
    try {
      const result = await enhancedResidentService.getBuildingStats()
      if (result.success) {
        setBuildingStats(result.data)
      }
    } catch (error) {
      console.error('Error loading building stats:', error)
    }
  }

  // Load delivery logs
  const loadDeliveryLogs = async () => {
    setDeliveriesLoading(true)
    try {
      const result = await deliveryService.getDeliveryLogs({ limit: 100 })
      if (result.success) {
        setDeliveryLogs(result.data)
      } else {
        console.error('Failed to load delivery logs:', result.error)
        setDeliveryLogs([])
      }
    } catch (error) {
      console.error('Error loading delivery logs:', error)
      setDeliveryLogs([])
    } finally {
      setDeliveriesLoading(false)
    }
  }

  // Load vendors
  const loadVendors = async () => {
    try {
      const result = await deliveryService.getVendors()
      if (result.success) {
        setVendors(result.data)
      }
    } catch (error) {
      console.error('Error loading vendors:', error)
    }
  }

  // Load delivery statistics
  const loadDeliveryStats = async () => {
    try {
      const result = await deliveryService.getDeliveryStats({ period: 'day' })
      if (result.success) {
        setDeliveryStats(result.data)
      }
    } catch (error) {
      console.error('Error loading delivery stats:', error)
    }
  }

  // Load blacklisted agents
  const loadBlacklistedAgents = async () => {
    try {
      const result = await deliveryService.getBlacklistedAgents()
      if (result.success) {
        setBlacklistedAgents(result.data)
      }
    } catch (error) {
      console.error('Error loading blacklisted agents:', error)
    }
  }

  // Filter logs based on search and filters
  const filterLogs = () => {
    let filtered = [...visitorLogs]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.visitorPhone.includes(searchTerm) ||
        log.hostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.hostFlat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.vehicleNumber && log.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter)
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString()
      filtered = filtered.filter(log =>
        new Date(log.entryTime).toDateString() === filterDate
      )
    }

    setFilteredLogs(filtered)
  }

  // Filter residents based on search and filters
  const filterResidents = () => {
    let filtered = [...residents]

    // Search filter
    if (residentSearchTerm) {
      const searchLower = residentSearchTerm.toLowerCase()
      filtered = filtered.filter(resident => {
        // Check if search term matches building-flat format (e.g., "A-101")
        const buildingFlat = `${resident.building}-${resident.flatNumber}`.toLowerCase()
        
        return resident.name?.toLowerCase().includes(searchLower) ||
               resident.flatNumber?.toLowerCase().includes(searchLower) ||
               resident.phone?.includes(residentSearchTerm) ||
               resident.email?.toLowerCase().includes(searchLower) ||
               resident.building?.toLowerCase().includes(searchLower) ||
               resident.ownerName?.toLowerCase().includes(searchLower) ||
               buildingFlat.includes(searchLower)
      })
    }

    // Building filter
    if (residentFilters.building) {
      filtered = filtered.filter(resident => resident.building === residentFilters.building)
    }

    // Owner/Tenant filter
    if (residentFilters.ownersOnly) {
      filtered = filtered.filter(resident => resident.isOwner === true)
    }
    if (residentFilters.tenantsOnly) {
      filtered = filtered.filter(resident => resident.isOwner === false)
    }

    // KYC filter
    if (residentFilters.kycVerified !== null) {
      filtered = filtered.filter(resident => resident.kycVerified === residentFilters.kycVerified)
    }

    // Restriction filter
    if (residentFilters.restricted !== null) {
      filtered = filtered.filter(resident => resident.isRestricted === residentFilters.restricted)
    }

    console.log('🔍 Filtering residents:', {
      total: residents.length,
      filtered: filtered.length,
      searchTerm: residentSearchTerm,
      buildingFilter: residentFilters.building,
      sample: filtered.slice(0, 3)
    })
    
    setFilteredResidents(filtered)
  }

  // Filter deliveries based on search and filters
  const filterDeliveries = () => {
    let filtered = [...deliveryLogs]

    // Search filter
    if (deliverySearchTerm) {
      const searchLower = deliverySearchTerm.toLowerCase()
      filtered = filtered.filter(delivery =>
        delivery.vendor?.toLowerCase().includes(searchLower) ||
        delivery.agentName?.toLowerCase().includes(searchLower) ||
        delivery.agentPhone?.includes(deliverySearchTerm) ||
        delivery.flatNumber?.toLowerCase().includes(searchLower) ||
        delivery.trackingId?.toLowerCase().includes(searchLower) ||
        delivery.packageDescription?.toLowerCase().includes(searchLower)
      )
    }

    // Vendor filter
    if (deliveryFilters.vendor) {
      filtered = filtered.filter(delivery => delivery.vendor === deliveryFilters.vendor)
    }

    // Date filter
    if (deliveryFilters.date) {
      const filterDate = new Date(deliveryFilters.date).toDateString()
      filtered = filtered.filter(delivery =>
        new Date(delivery.deliveryTime).toDateString() === filterDate
      )
    }

    // Status filter
    if (deliveryFilters.status !== 'all') {
      filtered = filtered.filter(delivery => delivery.status === deliveryFilters.status)
    }

    // Flat number filter
    if (deliveryFilters.flatNumber) {
      filtered = filtered.filter(delivery => 
        delivery.flatNumber?.toLowerCase().includes(deliveryFilters.flatNumber.toLowerCase())
      )
    }

    setFilteredDeliveries(filtered)
  }

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPreviewUrl(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  // Handle form submission
  const handleSubmitVisitor = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setIsUploading(true)

    try {
      const visitorData = {
        ...visitorForm,
        securityOfficer: user.name || user.email
      }

      const result = await mongoService.createVisitorLog(visitorData)

      if (result.success) {
        console.log('✅ Visitor created:', result.data)
        let documentUploaded = false

        // Upload document if selected
        if (selectedFile) {
          console.log('📤 Full result:', JSON.stringify(result, null, 2))
          console.log('📤 Result.data:', JSON.stringify(result.data, null, 2))

          const visitorId = result.data?._id
          console.log('📤 Uploading document for visitor:', visitorId)

          if (!visitorId) {
            console.error('❌ No visitor ID found in result:', JSON.stringify(result, null, 2))
            showWarning('Visitor Created', 'Visitor was created but document upload failed: No visitor ID found')
            // Still reset form and reload data
            resetForm()
            loadVisitorLogs()
            loadStats()
            return
          }

          const uploadResult = await mongoService.uploadDocument(selectedFile, visitorId, 'id_proof')
          documentUploaded = uploadResult.success

          if (!uploadResult.success) {
            console.warn('Document upload failed:', uploadResult.error)
            // Don't show error if visitor was created successfully
          } else {
            console.log('✅ Document uploaded successfully')
          }
        }

        // Reset form
        resetForm()

        // Reload data
        loadVisitorLogs()
        loadStats()

        const message = selectedFile
          ? documentUploaded
            ? 'Visitor logged successfully with document!'
            : 'Visitor logged successfully! (Document upload may have failed)'
          : 'Visitor logged successfully!'

        showSuccess('Visitor Logged Successfully!', message)
      } else {
        showError('Failed to Create Visitor Log', result.error)
      }
    } catch (error) {
      console.error('Error creating visitor log:', error)
      showError('Error Creating Visitor Log', 'Please try again later.')
    } finally {
      setIsLoading(false)
      setIsUploading(false)
    }
  }

  // Reset form function
  const resetForm = () => {
    setVisitorForm({
      visitorName: '',
      visitorPhone: '',
      visitorEmail: '',
      idType: 'aadhar',
      idNumber: '',
      purpose: '',
      hostName: '',
      hostFlat: '',
      hostPhone: '',
      vehicleNumber: '',
      notes: ''
    })
    setSelectedFile(null)
    setPreviewUrl(null)
    setActiveView('list')
    setShowCamera(false)
    setSelectedVisitor(null)
  }

  // Handle visitor click for detailed view
  const handleVisitorClick = (visitor) => {
    setSelectedVisitor(visitor)
    setActiveView('details')
  }

  // Handle resident click for detailed view
  const handleResidentClick = async (resident) => {
    setSelectedResident(resident)
    setActiveView('resident-details')
    
    // Load detailed resident information
    try {
      const [detailsResult, flatResult, guestResult] = await Promise.all([
        enhancedResidentService.getResidentDetails(resident.authUserId),
        enhancedResidentService.getFlatDetails(resident.building, resident.flatNumber),
        enhancedResidentService.getGuestList(resident.authUserId)
      ])
      
      if (detailsResult.success) {
        setResidentDetails(detailsResult.data)
      }
      
      if (flatResult.success) {
        setFlatDetails(flatResult.data)
      }
      
      if (guestResult.success) {
        setGuestList(guestResult.data)
      }
    } catch (error) {
      console.error('Error loading resident details:', error)
    }
  }

  // Voice search functionality
  const startVoiceSearch = () => {
    if (recognition && !isListening) {
      setIsListening(true)
      recognition.start()
    }
  }

  // QR/Scan search functionality
  const handleScanSearch = async (scanData) => {
    try {
      const result = await enhancedResidentService.searchByScan(scanData)
      if (result.success && result.data) {
        setScanResult(result.data)
        if (result.data.resident) {
          await handleResidentClick(result.data.resident)
        }
      } else {
        showError('Scan Search Failed', 'No resident found for the scanned data.')
      }
    } catch (error) {
      console.error('Error in scan search:', error)
      showError('Scan Search Error', 'Failed to process scanned data.')
    }
  }

  // Verify visitor against guest list
  const verifyVisitorAgainstGuestList = async (visitorName, visitorPhone) => {
    if (!selectedResident) return false
    
    try {
      const result = await enhancedResidentService.verifyGuest(
        selectedResident.authUserId,
        visitorName,
        visitorPhone
      )
      
      if (result.success && result.data?.verified) {
        showSuccess('Guest Verified', `Visitor ${visitorName} is on the approved guest list.`)
        return true
      } else {
        showWarning('Guest Not Verified', `Visitor ${visitorName} is not on the approved guest list.`)
        return false
      }
    } catch (error) {
      console.error('Error verifying guest:', error)
      showError('Verification Error', 'Failed to verify guest against approved list.')
      return false
    }
  }

  // 2-Click Delivery Functions
  const handleVendorSelection = async (vendor) => {
    setQuickDeliveryForm({ ...quickDeliveryForm, selectedVendor: vendor })
    
    // Load frequent agents for this vendor
    try {
      const result = await deliveryService.getFrequentAgents(vendor.id)
      if (result.success) {
        setFrequentAgents(result.data)
      }
    } catch (error) {
      console.error('Error loading frequent agents:', error)
    }
  }

  const handleFlatSelection = (flat) => {
    console.log('🏠 Flat selected:', flat)
    setQuickDeliveryForm({ ...quickDeliveryForm, selectedFlat: flat })
    console.log('📝 Updated form state:', { ...quickDeliveryForm, selectedFlat: flat })
  }

  const handleAgentNameChange = async (agentName) => {
    setQuickDeliveryForm({ ...quickDeliveryForm, agentName })
    
    // Get delivery suggestions based on agent history
    if (agentName.length > 2) {
      try {
        const result = await deliveryService.getDeliverySuggestions(agentName)
        if (result.success && result.data) {
          setDeliverySuggestions(result.data)
        }
      } catch (error) {
        console.error('Error loading delivery suggestions:', error)
      }
    }
  }

  const applyDeliverySuggestion = (suggestion) => {
    setQuickDeliveryForm({
      ...quickDeliveryForm,
      agentName: suggestion.agentName,
      agentPhone: suggestion.agentPhone,
      selectedFlat: suggestion.suggestedFlat
    })
    setDeliverySuggestions(null)
  }

  const handleQuickDeliverySubmit = async (e) => {
    e.preventDefault()
    
    console.log('🚀 Submitting delivery form:', {
      selectedVendor: quickDeliveryForm.selectedVendor,
      selectedFlat: quickDeliveryForm.selectedFlat,
      form: quickDeliveryForm
    })
    
    if (!quickDeliveryForm.selectedVendor || !quickDeliveryForm.selectedFlat) {
      console.error('❌ Missing required information:', {
        vendor: !!quickDeliveryForm.selectedVendor,
        flat: !!quickDeliveryForm.selectedFlat
      })
      showError('Missing Information', 'Please select both vendor and flat.')
      return
    }

    setIsLoading(true)
    try {
      const deliveryData = {
        vendor: quickDeliveryForm.selectedVendor.name,
        vendorId: quickDeliveryForm.selectedVendor.id,
        flatNumber: quickDeliveryForm.selectedFlat.flatNumber,
        building: quickDeliveryForm.selectedFlat.building,
        residentName: quickDeliveryForm.selectedFlat.name,
        agentName: quickDeliveryForm.agentName,
        agentPhone: quickDeliveryForm.agentPhone,
        trackingId: quickDeliveryForm.trackingId,
        packageDescription: quickDeliveryForm.packageDescription,
        deliveryNotes: quickDeliveryForm.deliveryNotes,
        status: 'delivered',
        deliveryTime: new Date(),
        securityOfficer: user.name || user.email,
        proofPhoto: quickDeliveryForm.proofPhoto
      }

      const result = await deliveryService.createDeliveryLog(deliveryData)
      
      if (result.success) {
        // Upload proof photo if available (only if API is available)
        if (quickDeliveryForm.proofPhoto && result.data._id) {
          try {
            await deliveryService.uploadDeliveryProof(quickDeliveryForm.proofPhoto, result.data._id)
          } catch (error) {
            console.warn('Proof photo upload failed, but delivery was logged:', error)
          }
        }

        // Send notification to resident via notification service
        try {
          const notificationData = {
            userId: quickDeliveryForm.selectedFlat.authUserId || quickDeliveryForm.selectedFlat._id,
            title: '📦 Package Delivered',
            message: `Your ${quickDeliveryForm.selectedVendor.name} package has been delivered to ${quickDeliveryForm.selectedFlat.building}-${quickDeliveryForm.selectedFlat.flatNumber}`,
            type: 'delivery',
            priority: 'medium',
            metadata: {
              deliveryId: result.data._id,
              vendor: quickDeliveryForm.selectedVendor.name,
              packageDescription: quickDeliveryForm.packageDescription,
              agentName: quickDeliveryForm.agentName,
              agentPhone: quickDeliveryForm.agentPhone,
              trackingId: quickDeliveryForm.trackingId,
              deliveryTime: deliveryData.deliveryTime,
              building: quickDeliveryForm.selectedFlat.building,
              flatNumber: quickDeliveryForm.selectedFlat.flatNumber,
              residentName: quickDeliveryForm.selectedFlat.name,
              actionUrl: '/deliveries'
            }
          }
          
          console.log('📤 Sending delivery notification to resident:', notificationData)
          await notificationService.createNotification(notificationData)
          console.log('✅ Delivery notification sent successfully')
        } catch (notificationError) {
          console.warn('⚠️ Failed to send delivery notification via API:', notificationError)
          // Don't fail the entire operation if notification fails
        }

        // Check if delivery was saved locally (indicated by _id starting with 'delivery_')
        const isLocalStorage = result.data._id && result.data._id.startsWith('delivery_')
        
        if (isLocalStorage) {
          showSuccess('Delivery Logged! 📱', `Delivery has been saved locally and notification sent to ${quickDeliveryForm.selectedFlat.name} at ${quickDeliveryForm.selectedFlat.building}-${quickDeliveryForm.selectedFlat.flatNumber}. Data will sync when API is available.`)
        } else {
          showSuccess('Delivery Logged! ✅', `Delivery has been successfully logged to the server and notification sent to ${quickDeliveryForm.selectedFlat.name} at ${quickDeliveryForm.selectedFlat.building}-${quickDeliveryForm.selectedFlat.flatNumber}.`)
        }
        
        // Reset form
        setQuickDeliveryForm({
          selectedVendor: null,
          selectedFlat: null,
          agentName: '',
          agentPhone: '',
          trackingId: '',
          packageDescription: '',
          deliveryNotes: '',
          proofPhoto: null,
          proofUrl: null
        })
        
        // Reload data
        loadDeliveryLogs()
        loadDeliveryStats()
      } else {
        showError('Failed to Log Delivery', result.error)
      }
    } catch (error) {
      console.error('Error logging delivery:', error)
      showError('Error Logging Delivery', 'Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkDeliverySubmit = async () => {
    if (bulkDeliveries.length === 0) {
      showError('No Deliveries', 'Please add at least one delivery.')
      return
    }

    setIsLoading(true)
    try {
      const result = await deliveryService.createBulkDeliveries(bulkDeliveries)
      
      if (result.success) {
        // Send notifications for each delivery
        for (const delivery of bulkDeliveries) {
          try {
            const notificationData = {
              userId: delivery.residentUserId || delivery.authUserId,
              title: '📦 Package Delivered',
              message: `Your ${delivery.vendor} package has been delivered to ${delivery.building}-${delivery.flatNumber}`,
              type: 'delivery',
              priority: 'medium',
              metadata: {
                deliveryId: delivery._id || `bulk_delivery_${Date.now()}`,
                vendor: delivery.vendor,
                packageDescription: delivery.packageDescription,
                agentName: delivery.agentName,
                agentPhone: delivery.agentPhone,
                trackingId: delivery.trackingId,
                deliveryTime: delivery.deliveryTime,
                building: delivery.building,
                flatNumber: delivery.flatNumber,
                residentName: delivery.residentName,
                actionUrl: '/deliveries'
              }
            }
            
            console.log('📤 Sending bulk delivery notification:', notificationData)
            await notificationService.createNotification(notificationData)
          } catch (notificationError) {
            console.warn('⚠️ Failed to send notification for bulk delivery:', notificationError)
          }
        }
        
        showSuccess('Bulk Deliveries Logged!', `${bulkDeliveries.length} deliveries have been successfully logged and notifications sent to residents.`)
        setBulkDeliveries([])
        setBulkDeliveryMode(false)
        loadDeliveryLogs()
        loadDeliveryStats()
      } else {
        showError('Failed to Log Bulk Deliveries', result.error)
      }
    } catch (error) {
      console.error('Error logging bulk deliveries:', error)
      showError('Error Logging Bulk Deliveries', 'Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeliveryProofCapture = async () => {
    try {
      console.log('📷 Starting delivery proof capture...')

      const video = document.getElementById('delivery-camera-preview')
      const placeholder = document.getElementById('delivery-camera-placeholder')

      if (!video) {
        throw new Error('Camera preview element not found')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      video.srcObject = stream
      video.classList.remove('hidden')
      placeholder.classList.add('hidden')

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `delivery_proof_${Date.now()}.jpg`, { type: 'image/jpeg' })
          setQuickDeliveryForm({
            ...quickDeliveryForm,
            proofPhoto: file,
            proofUrl: URL.createObjectURL(blob)
          })
          console.log('✅ Delivery proof captured successfully')
          showSuccess('Proof Captured!', 'Delivery proof photo has been captured.')
        } else {
          console.error('❌ Failed to create blob from canvas')
          showError('Photo Capture Failed', 'Failed to capture proof photo.')
        }

        stream.getTracks().forEach(track => track.stop())
        video.srcObject = null
        video.classList.add('hidden')
        placeholder.classList.remove('hidden')
      }, 'image/jpeg', 0.8)

    } catch (error) {
      console.error('❌ Camera access error:', error)
      showError('Camera Access Failed', `Unable to access camera: ${error.message}`)
    }
  }

  // Handle check-out
  const handleCheckOut = async (visitorId) => {
    try {
      const result = await mongoService.updateVisitorLog(visitorId, {
        status: 'checked_out',
        exitTime: new Date()
      })

      if (result.success) {
        try {
          // If this visitor was logged via a QR pass, try to mark that pass as used/expired
          const idNumber = (result.data?.idNumber || '').toString()
          if (idNumber.startsWith('QR_PASS_')) {
            const code = idNumber.replace('QR_PASS_', '')
            await passService.updatePassStatus(code, 'used')
          }
        } catch (_) {}
        loadVisitorLogs()
        loadStats()
        showSuccess('Visitor Checked Out!', 'The visitor has been successfully checked out.')
      } else {
        showError('Failed to Check Out Visitor', result.error)
      }
    } catch (error) {
      console.error('Error checking out visitor:', error)
      showError('Error Checking Out Visitor', 'Please try again later.')
    }
  }

  // Handle delete
  const handleDeleteVisitor = async (visitorId) => {
    if (!visitorId) {
      showError('Invalid Visitor ID', 'Cannot delete visitor: invalid ID.')
      return
    }

    const result = await showConfirm('Delete Visitor Log', 'Are you sure you want to delete this visitor log? This action cannot be undone.')
    if (result.isConfirmed) {
      setIsLoading(true)
      try {
        console.log('Deleting visitor:', visitorId)
        const result = await mongoService.deleteVisitorLog(visitorId)

        if (result.success) {
          console.log('✅ Visitor deleted successfully')
          loadVisitorLogs()
          loadStats()
          showSuccess('Visitor Log Deleted!', 'The visitor log has been successfully deleted.')
        } else {
          console.error('❌ Delete failed:', result.error)
          showError('Failed to Delete Visitor Log', result.error)
        }
      } catch (error) {
        console.error('❌ Error deleting visitor log:', error)
        showError('Error Deleting Visitor Log', error.message)
      } finally {
        setIsLoading(false)
      }
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

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      console.log('📷 Starting camera capture...')

      // Get video element
      const video = document.getElementById('camera-preview')
      const placeholder = document.getElementById('camera-placeholder')

      if (!video) {
        throw new Error('Camera preview element not found')
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      // Show video, hide placeholder
      video.srcObject = stream
      video.classList.remove('hidden')
      placeholder.classList.add('hidden')

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      // Wait a bit for the camera to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create canvas and capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `visitor_photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
          setSelectedFile(file)
          setPreviewUrl(URL.createObjectURL(blob))
          console.log('✅ Photo captured successfully')
          showSuccess('Photo Captured!', 'The photo has been captured successfully.')
        } else {
          console.error('❌ Failed to create blob from canvas')
          showError('Photo Capture Failed', 'Failed to capture photo. Please try again.')
        }

        // Stop camera stream and reset UI
        stream.getTracks().forEach(track => track.stop())
        video.srcObject = null
        video.classList.add('hidden')
        placeholder.classList.remove('hidden')
        setShowCamera(false)
      }, 'image/jpeg', 0.8)

    } catch (error) {
      console.error('❌ Camera access error:', error)

      // Reset UI
      const video = document.getElementById('camera-preview')
      const placeholder = document.getElementById('camera-placeholder')
      if (video) {
        video.classList.add('hidden')
        video.srcObject = null
      }
      if (placeholder) {
        placeholder.classList.remove('hidden')
      }

      showError('Camera Access Failed', `Unable to access camera: ${error.message}. Please use file upload instead.`)
      setShowCamera(false)
    }
  }

  // Render delivery logs
  const renderDeliveryLogs = () => (
    <div className="space-y-6">
      {/* Delivery Statistics */}
      {deliveryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{deliveryStats.totalToday || 0}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Deliveries Today</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{deliveryStats.deliveredToday || 0}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{deliveryStats.pendingToday || 0}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{blacklistedAgents.length || 0}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Blacklisted Agents</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Management</h3>
            {deliveryLogs.length > 0 && deliveryLogs[0]._id && deliveryLogs[0]._id.startsWith('delivery_') && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                📱 Data stored locally - will sync when API is available
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('delivery-add')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Quick Log
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by resident name, flat, or agent..."
              value={deliverySearchTerm}
              onChange={(e) => setDeliverySearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <input
            type="text"
            placeholder="Search by flat number..."
            value={deliveryFilters.flatNumber}
            onChange={(e) => setDeliveryFilters({...deliveryFilters, flatNumber: e.target.value})}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />

          <select
            value={deliveryFilters.vendor}
            onChange={(e) => setDeliveryFilters({...deliveryFilters, vendor: e.target.value})}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Vendors</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.name}>{vendor.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={deliveryFilters.date}
            onChange={(e) => setDeliveryFilters({...deliveryFilters, date: e.target.value})}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />

          <select
            value={deliveryFilters.status}
            onChange={(e) => setDeliveryFilters({...deliveryFilters, status: e.target.value})}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="returned">Returned</option>
          </select>

          <button
            onClick={() => {
              setDeliverySearchTerm('')
              setDeliveryFilters({
                vendor: '',
                date: '',
                status: 'all',
                flatNumber: ''
              })
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Clear Filters
          </button>
        </div>

        {/* Delivery List */}
        {deliveriesLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading delivery logs...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="text-center py-8">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No delivery logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Resident & Flat</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Delivery Agent</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Package Details</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => (
                  <tr
                    key={delivery._id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{delivery.vendorIcon || '📦'}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{delivery.vendor}</p>
                          {delivery.trackingId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">ID: {delivery.trackingId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{delivery.residentName || 'Unknown Resident'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-mono">{delivery.building}-{delivery.flatNumber}</span>
                          </p>
                          {delivery.residentPhone && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">📞 {delivery.residentPhone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{delivery.agentName || 'N/A'}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">📱 {delivery.agentPhone || 'No phone'}</p>
                        {delivery.securityOfficer && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">👮 Logged by: {delivery.securityOfficer}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{delivery.packageDescription || 'No description'}</p>
                        {delivery.deliveryNotes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">📝 {delivery.deliveryNotes}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(delivery.deliveryTime).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(delivery.deliveryTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        delivery.status === 'delivered'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : delivery.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : delivery.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {delivery.proofPhoto && (
                          <button
                            onClick={() => window.open(delivery.proofPhoto, '_blank')}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="View Proof"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedDelivery(delivery)}
                          className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400"
                          title="View Delivery Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1" title="Notification sent to resident">
                          <Bell className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-green-600 dark:text-green-400">📧</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delivery Details Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Details</h3>
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Vendor Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3">📦 Vendor Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Vendor:</p>
                      <p className="font-medium text-blue-900 dark:text-blue-100">{selectedDelivery.vendor}</p>
                    </div>
                    {selectedDelivery.trackingId && (
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Tracking ID:</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100 font-mono">{selectedDelivery.trackingId}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resident Information */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-200 mb-3">🏠 Resident Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">Resident Name:</p>
                      <p className="font-medium text-green-900 dark:text-green-100">{selectedDelivery.residentName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">Flat Number:</p>
                      <p className="font-medium text-green-900 dark:text-green-100 font-mono">{selectedDelivery.building}-{selectedDelivery.flatNumber}</p>
                    </div>
                    {selectedDelivery.residentPhone && (
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300">Phone:</p>
                        <p className="font-medium text-green-900 dark:text-green-100">📞 {selectedDelivery.residentPhone}</p>
                      </div>
                    )}
                    {selectedDelivery.residentEmail && (
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300">Email:</p>
                        <p className="font-medium text-green-900 dark:text-green-100">📧 {selectedDelivery.residentEmail}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Agent Information */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-3">🚚 Delivery Agent</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Agent Name:</p>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">{selectedDelivery.agentName || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Phone:</p>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">📱 {selectedDelivery.agentPhone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Package Information */}
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 dark:text-purple-200 mb-3">📋 Package Details</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-purple-700 dark:text-purple-300">Description:</p>
                      <p className="font-medium text-purple-900 dark:text-purple-100">{selectedDelivery.packageDescription || 'No description'}</p>
                    </div>
                    {selectedDelivery.deliveryNotes && (
                      <div>
                        <p className="text-sm text-purple-700 dark:text-purple-300">Notes:</p>
                        <p className="font-medium text-purple-900 dark:text-purple-100">{selectedDelivery.deliveryNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Status & Time */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">⏰ Delivery Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status:</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedDelivery.status === 'delivered'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : selectedDelivery.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : selectedDelivery.status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {selectedDelivery.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Time:</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedDelivery.deliveryTime).toLocaleString()}
                      </p>
                    </div>
                    {selectedDelivery.securityOfficer && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Logged by:</p>
                        <p className="font-medium text-gray-900 dark:text-white">👮 {selectedDelivery.securityOfficer}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proof of Delivery */}
                {selectedDelivery.proofPhoto && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-indigo-900 dark:text-indigo-200 mb-3">📸 Proof of Delivery</h4>
                    <img
                      src={selectedDelivery.proofPhoto}
                      alt="Delivery proof"
                      className="w-full max-w-md h-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Close
                </button>
                {selectedDelivery.residentPhone && (
                  <button
                    onClick={() => window.open(`tel:${selectedDelivery.residentPhone}`)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📞 Call Resident
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render 2-Click Delivery Form
  const renderQuickDeliveryForm = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2-Click Delivery Log</h3>
          <button
            onClick={() => setActiveView('deliveries')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleQuickDeliverySubmit} className="space-y-6">
          {/* Step 1: Vendor Selection */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Step 1: Select Vendor</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => handleVendorSelection(vendor)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    quickDeliveryForm.selectedVendor?.id === vendor.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{vendor.icon}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{vendor.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Flat Selection */}
          {quickDeliveryForm.selectedVendor && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Step 2: Select Flat</h4>
              
              {/* Load residents if not already loaded or refresh button */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={loadResidents}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  {residents.length === 0 ? 'Load Admin Residents' : 'Refresh Admin Residents'}
                </button>
                {residents.length > 0 && (
                  <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    📊 {residents.length} admin-created residents loaded
                  </span>
                )}
              </div>

              {residentsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading residents...</p>
                </div>
              ) : filteredResidents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No admin-created residents found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Create residents using AdminAddResidents first, then click "Load Admin Residents"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Flat Search */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search residents by name or flat number..."
                        value={residentSearchTerm}
                        onChange={(e) => setResidentSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    {/* Quick Filter Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setResidentSearchTerm('')
                          setResidentFilters({...residentFilters, building: ''})
                        }}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          !residentFilters.building && !residentSearchTerm
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        All Residents
                      </button>
                      <button
                        onClick={() => {
                          setResidentSearchTerm('')
                          setResidentFilters({...residentFilters, building: 'A'})
                        }}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          residentFilters.building === 'A'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Building A
                      </button>
                      <button
                        onClick={() => {
                          setResidentSearchTerm('')
                          setResidentFilters({...residentFilters, building: 'B'})
                        }}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          residentFilters.building === 'B'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Building B
                      </button>
                      <button
                        onClick={() => {
                          setResidentSearchTerm('')
                          setResidentFilters({...residentFilters, building: 'C'})
                        }}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          residentFilters.building === 'C'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Building C
                      </button>
                    </div>
                  </div>

                  {/* Flat Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResidents.slice(0, 12).map((resident) => (
                    <button
                      key={resident._id || resident.authUserId}
                      type="button"
                      onClick={() => handleFlatSelection(resident)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        quickDeliveryForm.selectedFlat?.authUserId === resident.authUserId
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{resident.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{resident.building}-{resident.flatNumber}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resident Verification */}
          {quickDeliveryForm.selectedFlat && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="text-lg font-medium text-green-900 dark:text-green-200 mb-3">✅ Resident Verified</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Resident Name:</p>
                  <p className="font-medium text-green-900 dark:text-green-100">{quickDeliveryForm.selectedFlat.name}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Flat Number:</p>
                  <p className="font-medium text-green-900 dark:text-green-100 font-mono">{quickDeliveryForm.selectedFlat.building}-{quickDeliveryForm.selectedFlat.flatNumber}</p>
                </div>
                {quickDeliveryForm.selectedFlat.phone && (
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Contact:</p>
                    <p className="font-medium text-green-900 dark:text-green-100">📞 {quickDeliveryForm.selectedFlat.phone}</p>
                  </div>
                )}
                {quickDeliveryForm.selectedFlat.email && (
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Email:</p>
                    <p className="font-medium text-green-900 dark:text-green-100">📧 {quickDeliveryForm.selectedFlat.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {quickDeliveryForm.selectedVendor && quickDeliveryForm.selectedFlat && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Delivery Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={quickDeliveryForm.agentName}
                    onChange={(e) => handleAgentNameChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter agent name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agent Phone
                  </label>
                  <input
                    type="tel"
                    value={quickDeliveryForm.agentPhone}
                    onChange={(e) => setQuickDeliveryForm({...quickDeliveryForm, agentPhone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter agent phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tracking ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickDeliveryForm.trackingId}
                    onChange={(e) => setQuickDeliveryForm({...quickDeliveryForm, trackingId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter tracking ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Package Description
                  </label>
                  <input
                    type="text"
                    value={quickDeliveryForm.packageDescription}
                    onChange={(e) => setQuickDeliveryForm({...quickDeliveryForm, packageDescription: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Describe the package"
                  />
                </div>
              </div>

              {/* Smart Suggestions */}
              {deliverySuggestions && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Smart Suggestion</h5>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-800 dark:text-blue-300">
                      This agent usually delivers to {deliverySuggestions.suggestedFlat?.flatNumber} - {deliverySuggestions.suggestedFlat?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyDeliverySuggestion(deliverySuggestions)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Proof of Delivery */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proof of Delivery (Optional)
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleDeliveryProofCapture}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('delivery-photo-upload').click()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </button>
                  <input
                    id="delivery-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        setQuickDeliveryForm({
                          ...quickDeliveryForm,
                          proofPhoto: file,
                          proofUrl: URL.createObjectURL(file)
                        })
                      }
                    }}
                    className="hidden"
                  />
                </div>

                {quickDeliveryForm.proofUrl && (
                  <div className="mt-4">
                    <img
                      src={quickDeliveryForm.proofUrl}
                      alt="Delivery proof"
                      className="w-32 h-32 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickDeliveryForm({
                        ...quickDeliveryForm,
                        proofPhoto: null,
                        proofUrl: null
                      })}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Logging Delivery...
                    </div>
                  ) : (
                    'Log Delivery'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )

  // Render resident directory
  const renderResidentDirectory = () => (
    <div className="space-y-6">
      {/* Building Statistics */}
      {buildingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.totalResidents}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Residents</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.occupiedFlats}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Occupied Flats</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.kycVerified}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">KYC Verified</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.restricted}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Restricted</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Created Residents</h3>
            {residents.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                📊 {residents.length} admin-created residents • {filteredResidents.length} shown
              </p>
            )}
            {residents.length === 0 && !residentsLoading && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                ⚠️ No residents found. Create residents using AdminAddResidents first.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadResidents}
              disabled={residentsLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Users className="w-4 h-4" />
              {residentsLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setScanMode(!scanMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                scanMode ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Scan Mode
            </button>
            {recognition && (
              <button
                onClick={startVoiceSearch}
                disabled={isListening}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isListening ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? 'Listening...' : 'Voice Search'}
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, flat, phone..."
              value={residentSearchTerm}
              onChange={(e) => setResidentSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <select
            value={residentFilters.building}
            onChange={(e) => setResidentFilters({...residentFilters, building: e.target.value})}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Buildings</option>
            <option value="A">Building A</option>
            <option value="B">Building B</option>
            <option value="C">Building C</option>
          </select>

          <select
            value={residentFilters.kycVerified === null ? '' : residentFilters.kycVerified}
            onChange={(e) => setResidentFilters({
              ...residentFilters, 
              kycVerified: e.target.value === '' ? null : e.target.value === 'true'
            })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All KYC Status</option>
            <option value="true">KYC Verified</option>
            <option value="false">Not Verified</option>
          </select>

          <button
            onClick={() => {
              setResidentSearchTerm('')
              setResidentFilters({
                building: '',
                ownersOnly: false,
                tenantsOnly: false,
                kycVerified: null,
                restricted: null
              })
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Clear Filters
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={residentFilters.ownersOnly}
              onChange={(e) => setResidentFilters({
                ...residentFilters,
                ownersOnly: e.target.checked,
                tenantsOnly: e.target.checked ? false : residentFilters.tenantsOnly
              })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Owners Only</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={residentFilters.tenantsOnly}
              onChange={(e) => setResidentFilters({
                ...residentFilters,
                tenantsOnly: e.target.checked,
                ownersOnly: e.target.checked ? false : residentFilters.ownersOnly
              })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Tenants Only</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={residentFilters.restricted === true}
              onChange={(e) => setResidentFilters({
                ...residentFilters,
                restricted: e.target.checked ? true : null
              })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Restricted Only</span>
          </label>
        </div>

        {/* Scan Mode */}
        {scanMode && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quick Scan Search</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter QR code or scan data..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleScanSearch(e.target.value)
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('scan-file-input').click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload Image
              </button>
              <input
                id="scan-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  // Handle image upload for QR scanning
                  const file = e.target.files?.[0]
                  if (file) {
                    // Process QR code from image
                    handleScanSearch(file.name) // Placeholder - implement actual QR processing
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Residents List */}
        {residentsLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading residents...</p>
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No admin-created residents found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Create residents using the AdminAddResidents feature first
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResidents.map((resident) => (
              <div
                key={resident._id || resident.authUserId}
                onClick={() => handleResidentClick(resident)}
                className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md cursor-pointer transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{resident.name || 'Unknown'}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {resident.building}-{resident.flatNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {resident.isRestricted && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Restricted
                      </span>
                    )}
                    {resident.kycVerified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Shield className="w-3 h-3 mr-1" />
                        KYC Verified
                      </span>
                    )}
                    {resident.isOwner && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        <Home className="w-3 h-3 mr-1" />
                        Owner
                      </span>
                    )}
                    {/* Show if resident was created via AdminAddResidents */}
                    {resident.adminAdded && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                        <User className="w-3 h-3 mr-1" />
                        Admin Created
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {resident.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {resident.phone}
                    </div>
                  )}
                  {resident.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {resident.email}
                    </div>
                  )}
                  {resident.ownerName && resident.ownerName !== resident.name && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Owner: {resident.ownerName}
                    </div>
                  )}
                </div>

                {resident.specialNotes && (
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {resident.specialNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Render resident details
  const renderResidentDetails = () => {
    if (!selectedResident) return null

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Resident Details</h3>
            <button
              onClick={() => {
                setSelectedResident(null)
                setResidentDetails(null)
                setFlatDetails(null)
                setGuestList([])
                setActiveView('residents')
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resident Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Flat:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.building}-{selectedResident.flatNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.email || 'N/A'}</span>
                  </div>
                  {selectedResident.ownerName && selectedResident.ownerName !== selectedResident.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Owner:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedResident.ownerName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Alerts */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status & Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">KYC Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedResident.kycVerified
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {selectedResident.kycVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Restriction:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedResident.isRestricted
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {selectedResident.isRestricted ? 'Restricted' : 'Normal'}
                    </span>
                  </div>

                  {selectedResident.specialNotes && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Special Notes</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">{selectedResident.specialNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Family Information */}
              {residentDetails?.familyMembers && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Family Members</h4>
                  <div className="space-y-2">
                    {residentDetails.familyMembers.map((member, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-gray-900 dark:text-white">{member.name}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{member.relationship}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flat Details */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Flat Details</h4>
              
              {flatDetails ? (
                <div className="space-y-4">
                  {/* Parking Information */}
                  {flatDetails.parkingSlots && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Parking Slots</h5>
                      <div className="space-y-1">
                        {flatDetails.parkingSlots.map((slot, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Slot {slot.number}:</span>
                            <span className="text-gray-900 dark:text-white">{slot.vehicleNumber || 'Empty'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frequent Visitors */}
                  {flatDetails.frequentVisitors && flatDetails.frequentVisitors.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Frequent Visitors</h5>
                      <div className="space-y-2">
                        {flatDetails.frequentVisitors.map((visitor, index) => (
                          <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{visitor.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{visitor.purpose}</p>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {visitor.frequency} visits
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Preferences */}
                  {flatDetails.deliveryPreferences && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Delivery Preferences</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Allowed:</span>
                          <span className="text-gray-900 dark:text-white">
                            {flatDetails.deliveryPreferences.allowed ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Instructions:</span>
                          <span className="text-gray-900 dark:text-white">
                            {flatDetails.deliveryPreferences.instructions || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No additional flat details available</p>
                </div>
              )}
            </div>
          </div>

          {/* Guest List */}
          {guestList.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pre-approved Guest List</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {guestList.map((guest, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{guest.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{guest.phone}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Purpose: {guest.purpose}</p>
                      <p>Valid until: {new Date(guest.validUntil).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                const visitorName = prompt('Enter visitor name for verification:')
                const visitorPhone = prompt('Enter visitor phone:')
                if (visitorName && visitorPhone) {
                  verifyVisitorAgainstGuestList(visitorName, visitorPhone)
                }
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Verify Visitor
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={async () => {
                  const result = await showConfirm(
                    'Update Restriction Status',
                    `Are you sure you want to ${selectedResident.isRestricted ? 'remove restriction from' : 'restrict'} this resident?`
                  )
                  if (result.isConfirmed) {
                    const updateResult = await enhancedResidentService.updateRestriction(
                      selectedResident.authUserId,
                      !selectedResident.isRestricted
                    )
                    if (updateResult.success) {
                      showSuccess('Status Updated', 'Resident restriction status has been updated.')
                      loadResidents()
                    } else {
                      showError('Update Failed', 'Failed to update restriction status.')
                    }
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedResident.isRestricted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                {selectedResident.isRestricted ? 'Remove Restriction' : 'Add Restriction'}
              </button>
            )}
            
            <button
              onClick={() => {
                setSelectedResident(null)
                setResidentDetails(null)
                setFlatDetails(null)
                setGuestList([])
                setActiveView('residents')
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Directory
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render visitor log list
  const renderVisitorList = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalVisitors}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Visitors Today</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.checkedIn}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Currently Inside</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-gray-600" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.checkedOut}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Checked Out</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Visitor Logs</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'disconnected' ? 'MongoDB Offline' : 'Checking...'}
              </span>
              {connectionStatus === 'disconnected' && (
                <button
                  onClick={checkConnection}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setActiveView('add')}
            disabled={connectionStatus === 'disconnected'}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-5 h-5" />
            Log New Visitor
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search visitors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />

          <button
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setDateFilter('')
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Clear Filters
          </button>
        </div>

        {/* Visitor List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading visitor logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No visitor logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              💡 Click on any row to view detailed visitor information
            </div>
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Visitor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Host</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Purpose</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Entry Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleVisitorClick(log)}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{log.visitorName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{log.visitorPhone}</p>
                        {log.vehicleNumber && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Car className="w-4 h-4" />
                            {log.vehicleNumber}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{log.hostName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          {log.hostFlat}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-900 dark:text-white">{log.purpose}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(log.entryTime).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(log.entryTime).toLocaleTimeString()}
                        </p>
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
                      <div className="flex items-center gap-2">
                        {log.documentPhoto && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(log.documentPhoto, '_blank')
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="View Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {log.status === 'checked_in' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckOut(log._id)
                            }}
                            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400"
                            title="Check Out"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteVisitor(log._id)
                          }}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVisitorClick(log)
                          }}
                          className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
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
    </div>
  )

  // Render add/edit visitor form
  const renderVisitorForm = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingVisitor ? 'Edit Visitor' : 'Add New Visitor'}
          </h3>
          <button
            onClick={resetForm}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmitVisitor} className="space-y-6">
          {/* Visitor Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Visitor Name *
              </label>
              <input
                type="text"
                required
                value={visitorForm.visitorName}
                onChange={(e) => setVisitorForm({...visitorForm, visitorName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter visitor's full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={visitorForm.visitorPhone}
                onChange={(e) => setVisitorForm({...visitorForm, visitorPhone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={visitorForm.visitorEmail}
                onChange={(e) => setVisitorForm({...visitorForm, visitorEmail: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ID Type *
              </label>
              <select
                required
                value={visitorForm.idType}
                onChange={(e) => setVisitorForm({...visitorForm, idType: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="aadhar">Aadhar Card</option>
                <option value="pan">PAN Card</option>
                <option value="driving_license">Driving License</option>
                <option value="passport">Passport</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ID Number *
              </label>
              <input
                type="text"
                required
                value={visitorForm.idNumber}
                onChange={(e) => setVisitorForm({...visitorForm, idNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter ID number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vehicle Number (Optional)
              </label>
              <input
                type="text"
                value={visitorForm.vehicleNumber}
                onChange={(e) => setVisitorForm({...visitorForm, vehicleNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter vehicle number"
              />
            </div>
          </div>

          {/* Host Information */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Host Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Host Name *
                </label>
                <input
                  type="text"
                  required
                  value={visitorForm.hostName}
                  onChange={(e) => setVisitorForm({...visitorForm, hostName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter host's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Flat/Unit Number *
                </label>
                <input
                  type="text"
                  required
                  value={visitorForm.hostFlat}
                  onChange={(e) => setVisitorForm({...visitorForm, hostFlat: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter flat/unit number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Host Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={visitorForm.hostPhone}
                  onChange={(e) => setVisitorForm({...visitorForm, hostPhone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter host's phone"
                />
              </div>
            </div>
          </div>

          {/* Purpose and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purpose of Visit *
              </label>
              <input
                type="text"
                required
                value={visitorForm.purpose}
                onChange={(e) => setVisitorForm({...visitorForm, purpose: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter purpose of visit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={visitorForm.notes}
                onChange={(e) => setVisitorForm({...visitorForm, notes: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter any additional notes"
              />
            </div>
          </div>

          {/* Document Upload */}
          <div className="border-t pt-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">ID Proof Document</h4>

            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => document.getElementById('file-upload').click()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Choose File
                </button>

                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo
                </button>
              </div>

              <input
                id="file-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              

              {previewUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Document:</p>
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="Document preview"
                      className="max-w-xs h-32 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setPreviewUrl(null)
                      }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isLoading || isUploading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isUploading ? 'Uploading Document...' : 'Creating Visitor Log...'}
                </div>
              ) : (
                editingVisitor ? 'Update Visitor' : 'Add Visitor'
              )}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  // Render detailed visitor view
  const renderVisitorDetails = () => {
    if (!selectedVisitor) return null

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Visitor Details</h3>
            <button
              onClick={() => {
                setSelectedVisitor(null)
                setActiveView('list')
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visitor Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visitor Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorPhone}</span>
                  </div>
                  {selectedVisitor.visitorEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.visitorEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID Type:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedVisitor.idType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID Number:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.idNumber}</span>
                  </div>
                  {selectedVisitor.vehicleNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.vehicleNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Host Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Host Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Flat/Unit:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostFlat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Host Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.hostPhone}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visit Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Purpose:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedVisitor.purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Entry Time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedVisitor.entryTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedVisitor.status === 'checked_in'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {selectedVisitor.status === 'checked_in' ? 'Inside' : 'Checked Out'}
                    </span>
                  </div>
                  {selectedVisitor.exitTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Exit Time:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedVisitor.exitTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedVisitor.notes && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                      <p className="mt-1 text-gray-900 dark:text-white">{selectedVisitor.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document/Photo */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">ID Proof Document</h4>
              {selectedVisitor.documentPhoto ? (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={selectedVisitor.documentPhoto}
                      alt="ID Proof Document"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-700"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'block'
                      }}
                    />
                    <div className="hidden p-8 text-center text-gray-500 dark:text-gray-400">
                      <p>Unable to load image</p>
                      <a
                        href={selectedVisitor.documentPhoto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={selectedVisitor.documentPhoto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Size
                    </a>
                    <a
                      href={selectedVisitor.documentPhoto}
                      download
                      className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No document uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {selectedVisitor.status === 'checked_in' && (
              <button
                onClick={() => handleCheckOut(selectedVisitor._id)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Check Out Visitor
              </button>
            )}
            <button
              onClick={() => handleDeleteVisitor(selectedVisitor._id)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Record
            </button>
            <button
              onClick={() => {
                setSelectedVisitor(null)
                setActiveView('list')
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Notification handlers
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification._id)
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        )
      }
      
      if (notification.metadata?.actionUrl) {
        setCurrentPage(notification.metadata.actionUrl.replace('/', ''))
      }
    } catch (error) {
      console.error('Error handling notification click:', error)
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Dashboard</h1>
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
        {/* Show different views based on activeView */}
        {currentPage === 'notifications' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Mark All as Read
                </button>
              </div>
              
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        notification.isRead 
                          ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600' 
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${
                              notification.isRead 
                                ? 'text-gray-700 dark:text-gray-300' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          <p className={`text-sm ${
                            notification.isRead 
                              ? 'text-gray-600 dark:text-gray-400' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{new Date(notification.createdAt).toLocaleString()}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              notification.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {notification.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeView === 'residents' ? renderResidentDirectory() :
         activeView === 'resident-details' ? renderResidentDetails() :
         activeView === 'deliveries' ? renderDeliveryLogs() :
         activeView === 'delivery-add' ? renderQuickDeliveryForm() :
         activeView === 'add' || activeView === 'edit' ? renderVisitorForm() :
         activeView === 'details' ? renderVisitorDetails() :
         activeView === 'scan' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Scan/Enter Visitor Pass</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Pass Code</label>
                  <input className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={scanCode}
                    onChange={(e)=>setScanCode(e.target.value.toUpperCase())}
                    placeholder="Enter code printed in QR"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={async ()=>{
                      try {
                        const { pass } = await passService.getPassByCode(scanCode.trim())
                        setScannedPass(pass)
                      } catch (e) {
                        showError('Pass Not Found', 'The entered pass code was not found.')
                        setScannedPass(null)
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >Fetch</button>
                  <button
                    onClick={async ()=>{
                      try {
                        if (!window.Html5QrcodeScanner) {
                          await new Promise((resolve, reject) => {
                            const s = document.createElement('script')
                            s.src = 'https://unpkg.com/html5-qrcode@2.3.10/minified/html5-qrcode.min.js'
                            s.onload = resolve
                            s.onerror = reject
                            document.body.appendChild(s)
                          })
                        }
                        setShowQrScanner(true)
                        setTimeout(() => {
                          if (!window.Html5QrcodeScanner) return
                          const scanner = new window.Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 })
                          scanner.render((decodedText) => {
                            setScanCode(decodedText.toUpperCase())
                            scanner.clear()
                            setShowQrScanner(false)
                          }, () => {})
                        }, 0)
                      } catch (e) {
                        showError('QR Scanner Failed', 'Unable to start QR scanner. Please enter the code manually.')
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >Scan QR</button>
                  <button
                    onClick={() => document.getElementById('scan-qr-image-upload').click()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" /> Upload QR Image
                  </button>
                </div>

                <input
                  id="scan-qr-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    try {
                      const file = e.target.files && e.target.files[0]
                      if (!file) return
                      if (!window.qrcodeParserLoaded) {
                        await new Promise((resolve, reject) => {
                          const s = document.createElement('script')
                          s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
                          s.onload = () => { window.qrcodeParserLoaded = true; resolve() }
                          s.onerror = reject
                          document.body.appendChild(s)
                        })
                      }
                      const arrayBuffer = await file.arrayBuffer()
                      const blob = new Blob([arrayBuffer])
                      const img = new Image()
                      img.onload = () => {
                        const canvas = document.createElement('canvas')
                        canvas.width = img.width
                        canvas.height = img.height
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0)
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                        const code = window.jsQR(imageData.data, imageData.width, imageData.height)
                        if (code && code.data) {
                          setScanCode(code.data.toUpperCase())
                          notify('QR code detected from image!', 'success')
                        } else {
                          showError('QR Read Failed', 'Unable to read QR from this image. Try another one.')
                        }
                      }
                      img.onerror = () => showError('Image Load Failed', 'Unable to load selected image.')
                      img.src = URL.createObjectURL(blob)
                    } catch (err) {
                      showError('Processing Failed', 'Failed to process QR image.')
                    } finally {
                      e.target.value = ''
                    }
                  }}
                />
              </div>

              {showQrScanner && (
                <div className="mt-4">
                  <div id="qr-reader" className="w-full max-w-md"></div>
                </div>
              )}

              {scannedPass && (
                <div className="mt-6 border dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Pass Details</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Visitor: {scannedPass.visitorName} ({scannedPass.visitorPhone})</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Host: {scannedPass.hostName} • {scannedPass.building || '-'}-{scannedPass.flatNumber || '-'} • {scannedPass.hostPhone || 'N/A'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valid until: {new Date(scannedPass.validUntil).toLocaleString()}</p>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={async ()=>{
                        try {
                          const result = await mongoService.createVisitorLog({
                            visitorName: scannedPass.visitorName,
                            visitorPhone: scannedPass.visitorPhone,
                            visitorEmail: scannedPass.visitorEmail,
                            idType: 'other',
                            idNumber: 'QR_PASS_'+scannedPass.code,
                            purpose: 'Resident visitor pass',
                            hostName: scannedPass.hostName,
                            hostFlat: `${scannedPass.building || '-'}-${scannedPass.flatNumber || '-'}`,
                            hostPhone: scannedPass.hostPhone || 'N/A',
                            hostBuilding: scannedPass.building || '',
                            hostAuthUserId: scannedPass.hostAuthUserId || scannedPass.hostAuthUserId,
                            vehicleNumber: '',
                            notes: 'Logged from QR pass',
                            securityOfficer: user.name || user.email
                          })
                          if (result.success) {
                            try {
                              await passService.markPassUsed(scannedPass.code)
                            } catch (e) {
                              console.warn('Failed to mark pass used:', e)
                            }
                            showSuccess('Visitor Logged Successfully!', 'The visitor has been checked in using the pass.')
                            setScannedPass(null)
                            setScanCode('')
                            loadVisitorLogs()
                          } else {
                            showError('Failed to Create Visitor Log', 'Please try again.')
                          }
                        } catch (e) {
                          showError('Failed to Create Visitor Log', 'An error occurred while logging the visitor.')
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg"
                    >Log Entry</button>
                    <button
                      onClick={() => { setScannedPass(null); setScanCode('') }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >Reject</button>
                  </div>
                </div>
              )}
            </div>
          </div>
         ) :
         renderVisitorList()}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Take Photo</h3>

            <div className="space-y-4">
              {/* Camera preview area */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                <video
                  id="camera-preview"
                  autoPlay
                  playsInline
                  className="w-full max-w-sm mx-auto rounded hidden"
                ></video>
                <div id="camera-placeholder" className="py-8">
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Camera will appear here when you start capture
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCameraCapture}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  📷 Capture Photo
                </button>
                <button
                  onClick={() => setShowCamera(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Make sure to allow camera access when prompted by your browser
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityDashboard