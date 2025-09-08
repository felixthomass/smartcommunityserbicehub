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
  Calendar,
  Download
} from 'lucide-react'
import { mongoService } from '../../services/mongoService'
import { passService } from '../../services/passService'

const SecurityDashboard = ({ user, onLogout, currentPage = 'dashboard' }) => {
  // State management
  const [activeView, setActiveView] = useState('list') // 'list', 'add', 'edit', 'scan'
  const [visitorLogs, setVisitorLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [stats, setStats] = useState({ totalVisitors: 0, checkedIn: 0, checkedOut: 0 })

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
    }
  }, [currentPage])

  // Filter logs when search term or filters change
  useEffect(() => {
    filterLogs()
  }, [visitorLogs, searchTerm, statusFilter, dateFilter])

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
            alert('Visitor created but document upload failed: No visitor ID found')
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

        alert(message)
      } else {
        alert('Failed to create visitor log: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating visitor log:', error)
      alert('Error creating visitor log')
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

  // Handle check-out
  const handleCheckOut = async (visitorId) => {
    try {
      const result = await mongoService.updateVisitorLog(visitorId, {
        status: 'checked_out',
        exitTime: new Date()
      })

      if (result.success) {
        loadVisitorLogs()
        loadStats()
        alert('Visitor checked out successfully!')
      } else {
        alert('Failed to check out visitor: ' + result.error)
      }
    } catch (error) {
      console.error('Error checking out visitor:', error)
      alert('Error checking out visitor')
    }
  }

  // Handle delete
  const handleDeleteVisitor = async (visitorId) => {
    if (!visitorId) {
      alert('Invalid visitor ID')
      return
    }

    if (confirm('Are you sure you want to delete this visitor log? This action cannot be undone.')) {
      setIsLoading(true)
      try {
        console.log('Deleting visitor:', visitorId)
        const result = await mongoService.deleteVisitorLog(visitorId)

        if (result.success) {
          console.log('✅ Visitor deleted successfully')
          loadVisitorLogs()
          loadStats()
          alert('Visitor log deleted successfully!')
        } else {
          console.error('❌ Delete failed:', result.error)
          alert('Failed to delete visitor log: ' + result.error)
        }
      } catch (error) {
        console.error('❌ Error deleting visitor log:', error)
        alert('Error deleting visitor log: ' + error.message)
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
          alert('Photo captured successfully!')
        } else {
          console.error('❌ Failed to create blob from canvas')
          alert('Failed to capture photo. Please try again.')
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

      alert(`Unable to access camera: ${error.message}. Please use file upload instead.`)
      setShowCamera(false)
    }
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
        {activeView === 'add' || activeView === 'edit' ? renderVisitorForm() :
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
                        alert('Pass not found')
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
                        alert('Unable to start QR scanner. Please enter the code manually.')
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >Scan QR</button>
                </div>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Host: {scannedPass.hostName} • {scannedPass.building}-{scannedPass.flatNumber}</p>
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
                            vehicleNumber: '',
                            notes: 'Logged from QR pass',
                            securityOfficer: user.name || user.email
                          })
                          if (result.success) {
                            alert('Visitor logged successfully')
                            setScannedPass(null)
                            setScanCode('')
                            loadVisitorLogs()
                          } else {
                            alert('Failed to create visitor log')
                          }
                        } catch (e) {
                          alert('Failed to create visitor log')
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