import React, { useState, useEffect, useRef } from 'react'
import { 
  Search, 
  Filter, 
  Calendar, 
  QrCode, 
  Trash2, 
  FileText, 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Home, 
  Phone, 
  ShieldCheck, 
  ShieldAlert,
  Download,
  Camera,
  ArrowLeft,
  ChevronRight,
  MoreVertical,
  MapPin,
  RefreshCcw
} from 'lucide-react'
import { passService } from '../../services/passService'
import { mongoService } from '../../services/mongoService'
import { showSuccess, showError } from '../../utils/sweetAlert'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const ScanPassDashboard = ({ user, onBack, darkMode }) => {
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedPass, setSelectedPass] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)
  
  // Verification states
  const [verificationCode, setVerificationCode] = useState('')
  const [verifyingPass, setVerifyingPass] = useState(null)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const fileInputRef = useRef(null)
  
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)

  useEffect(() => {
    fetchPasses()
  }, [statusFilter, dateFilter])

  const fetchPasses = async (query = searchQuery) => {
    try {
      setLoading(true)
      const options = {
        search: query,
        status: statusFilter === 'all' ? '' : statusFilter,
        startDate: dateFilter,
        endDate: dateFilter
      }
      const response = await passService.listPasses(options)
      if (response.success) {
        setPasses(response.passes || response.data || [])
      }
    } catch (err) {
      console.error('Error fetching passes:', err)
      showError('Failed to load passes')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchPasses(searchQuery)
  }

  const handleDeletePass = async (code) => {
    const result = await window.Swal.fire({
      title: 'Are you sure?',
      text: "You want to delete this visitor pass record?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: darkMode ? '#1f2937' : '#fff',
      color: darkMode ? '#fff' : '#000'
    })

    if (result.isConfirmed) {
      try {
        await passService.deletePass(code)
        showSuccess('Deleted!', 'Pass deleted successfully')
        fetchPasses()
        if (selectedPass?.code === code) {
          setIsModalOpen(false)
        }
      } catch (err) {
        showError('Delete failed', err.message)
      }
    }
  }

  const handleStatusUpdate = async (code, status) => {
    try {
      setProcessingAction(true)
      const response = await passService.updatePassStatus(code, status)
      if (response.success) {
        showSuccess(`Pass ${status === 'used' ? 'Approved' : 'Updated'}`, `Pass status changed to ${status}`)
        fetchPasses()
        setSelectedPass(response.pass || response.data)
      }
    } catch (err) {
      showError('Update failed', err.message)
    } finally {
      setProcessingAction(false)
    }
  }

  const handleApproveEntry = async (pass) => {
    try {
      setProcessingAction(true)
      // First create visitor log entry
      const logResult = await mongoService.createVisitorLog({
        visitorName: pass.visitorName,
        visitorPhone: pass.visitorPhone,
        visitorEmail: pass.visitorEmail,
        idType: 'other',
        idNumber: 'QR_PASS_' + pass.code,
        purpose: pass.purpose || 'Visitor Pass Entry',
        hostName: pass.hostName,
        hostFlat: `${pass.building || '-'}-${pass.flatNumber || '-'}`,
        hostPhone: pass.hostPhone || 'N/A',
        hostBuilding: pass.building || '',
        hostAuthUserId: pass.hostAuthUserId,
        securityOfficer: user.name || user.email,
        status: 'checked_in',
        entryTime: new Date()
      })

      if (logResult.success) {
        // Then mark pass as used
        await passService.markPassUsed(pass.code)
        showSuccess('Access Granted!', 'Visitor checked in successfully.')
        fetchPasses()
        setIsModalOpen(false)
      }
    } catch (err) {
      showError('Action Failed', err.message)
    } finally {
      setProcessingAction(false)
    }
  }

  const handleFetchPass = async (codeInput = verificationCode) => {
    if (!codeInput) return
    try {
      setVerificationLoading(true)
      setVerificationError('')
      setVerifyingPass(null)
      
      // Clean the input: trim, remove browser console suffixes like :1
      let cleanCode = codeInput.trim().split(':')[0]
      
      let response = await passService.getPass(cleanCode)
      
      // If failed and code is exactly 6-7 chars, try prepending VIS-
      if (!response.success && cleanCode.length >= 6 && cleanCode.length <= 8 && !cleanCode.startsWith('VIS-')) {
        try {
          response = await passService.getPass(`VIS-${cleanCode}`)
        } catch (e) {
          // Keep the original error if fallback also fails
        }
      }

      if (response && response.success) {
        setVerifyingPass(response.data)
        setVerificationCode(response.data.code) // Auto-correct the displayed code
      } else {
        throw new Error('Pass not found or invalid')
      }
    } catch (err) {
      setVerificationError(err.message || 'Pass not found or invalid')
      showError('Fetch Failed', err.message)
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleVerifyAction = async (action, reason = '') => {
    if (!verifyingPass) return
    try {
      setProcessingAction(true)
      const payload = {
        code: verifyingPass.code,
        action,
        securityOfficer: user.name || user.email,
        reason
      }
      
      const response = await passService.verifyPass(payload)
      if (response.success) {
        showSuccess(
          action === 'accept' ? 'Access Granted!' : 'Entry Rejected',
          action === 'accept' ? 'Visitor checked in successfully.' : 'Entry has been marked as rejected.'
        )
        setVerifyingPass(null)
        setVerificationCode('')
        fetchPasses()
      }
    } catch (err) {
      showError('Action Failed', err.message)
    } finally {
      setProcessingAction(false)
    }
  }

  const handleRejectWithReason = async () => {
    const { value: reason } = await window.Swal.fire({
      title: 'Reject Entry',
      input: 'text',
      inputLabel: 'Reason for rejection',
      inputPlaceholder: 'Enter reason (optional)...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      background: darkMode ? '#1f2937' : '#fff',
      color: darkMode ? '#fff' : '#000'
    })

    if (reason !== undefined) {
      handleVerifyAction('reject', reason)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setVerificationLoading(true)
      // We need html5-qrcode for this
      if (!window.Html5Qrcode) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
          s.onload = resolve
          s.onerror = reject
          document.body.appendChild(s)
        })
      }

      const html5QrCode = new window.Html5Qrcode("qr-reader-hidden")
      const decodedText = await html5QrCode.scanFile(file, true)
      let code = decodedText.trim()
      if (code.includes('/')) code = code.split('/').pop()
      setVerificationCode(code)
      handleFetchPass(code)
    } catch (err) {
      showError('Scan Failed', 'Could not read QR code from image.')
    } finally {
      setVerificationLoading(false)
    }
  }

  const startScanner = async () => {
    try {
      setScannerLoading(true)
      if (!window.Html5QrcodeScanner) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
          s.onload = resolve
          s.onerror = reject
          document.body.appendChild(s)
        })
      }
      setShowScanner(true)
      setTimeout(() => {
        const scanner = new window.Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 })
        html5QrCodeRef.current = scanner
        scanner.render(async (decodedText) => {
          let code = decodedText.trim()
          if (code.includes('/')) code = code.split('/').pop()
          
          setVerificationCode(code)
          handleFetchPass(code)
          stopScanner()
        }, (err) => {})
      }, 100)
    } catch (err) {
      console.error('Scanner error:', err)
      showError('Scanner Failed', 'Could not start camera.')
    } finally {
      setScannerLoading(false)
    }
  }

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.clear()
      html5QrCodeRef.current = null
    }
    setShowScanner(false)
  }

  const exportPassPDF = (pass) => {
    const doc = new jsPDF()
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pass.code)}&size=200&margin=1`
    
    // Add professional layout
    doc.setFillColor(37, 99, 235) // Blue-600
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text('VISITOR PASS', 105, 25, { align: 'center' })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    
    // Visitor Info
    doc.setFont('helvetica', 'bold')
    doc.text('VISITOR INFORMATION', 20, 60)
    doc.line(20, 62, 190, 62)
    
    const info = [
      ['Name:', pass.visitorName],
      ['Phone:', pass.visitorPhone || 'N/A'],
      ['Email:', pass.visitorEmail || 'N/A'],
      ['Pass ID:', pass.code],
      ['Status:', pass.status.toUpperCase()]
    ]
    
    doc.autoTable({
      startY: 65,
      body: info,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
    })
    
    // Visit Info
    doc.setFont('helvetica', 'bold')
    doc.text('VISIT DETAILS', 20, 110)
    doc.line(20, 112, 190, 112)
    
    const visit = [
      ['Host Name:', pass.hostName],
      ['Flat No:', pass.flatNumber || 'N/A'],
      ['Building:', pass.building || 'Community Main'],
      ['Purpose:', pass.purpose || 'Guest'],
      ['Valid Until:', new Date(pass.validUntil).toLocaleString()]
    ]
    
    doc.autoTable({
      startY: 115,
      body: visit,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
    })
    
    // QR Code
    doc.setFontSize(10)
    doc.text('SCAN AT THE GATE', 105, 175, { align: 'center' })
    doc.addImage(qrUrl, 'PNG', 75, 180, 60, 60)
    
    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Generated by Smart Community Service Hub', 105, 280, { align: 'center' })
    doc.text(`Timestamp: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' })
    
    doc.save(`VisitorPass_${pass.code}.pdf`)
  }

  const getStatusColor = (status, validUntil) => {
    const isExpired = new Date(validUntil) < new Date()
    if (status === 'rejected') return 'text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
    if (isExpired && status === 'active') return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
    if (status === 'used') return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
    if (status === 'active') return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
    return 'text-gray-600 bg-gray-50 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  }

  const getStatusLabel = (status, validUntil) => {
    const isExpired = new Date(validUntil) < new Date()
    if (status === 'rejected') return 'Rejected'
    if (isExpired && status === 'active') return 'Expired'
    if (status === 'used') return 'Checked In'
    if (status === 'active') return 'Active'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const StatusBadge = ({ status, validUntil }) => {
    const isExpired = new Date(validUntil) < new Date()
    let dotColor = 'bg-gray-400'
    if (status === 'rejected') dotColor = 'bg-red-500'
    else if (isExpired && status === 'active') dotColor = 'bg-amber-500'
    else if (status === 'used') dotColor = 'bg-blue-500'
    else if (status === 'active') dotColor = 'bg-emerald-500'

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(status, validUntil)}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`}></span>
        {getStatusLabel(status, validUntil)}
      </span>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <QrCode className="w-10 h-10 text-blue-600" />
            Scan Pass Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Manage and verify visitor passes with ease</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all active:scale-95"
          >
            <Download className="w-5 h-5 rotate-180" />
            Upload QR
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={startScanner}
            disabled={scannerLoading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            {scannerLoading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            Scan QR
          </button>
        </div>
      </div>

      {/* Verification Panel (New Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pass Code Input Card */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl shadow-blue-500/5 border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Verify Pass</h2>
              <p className="text-sm text-gray-500 font-medium">Real-time gate security check</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Enter Pass Code (e.g. VIS-123456)"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchPass()}
                autoFocus
                className="w-full pl-14 pr-4 py-5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-600 rounded-2xl outline-none transition-all dark:text-white text-lg font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal"
              />
            </div>
            
            <button 
              onClick={() => handleFetchPass()}
              disabled={verificationLoading || !verificationCode}
              className="w-full flex items-center justify-center gap-3 py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95"
            >
              {verificationLoading ? (
                <RefreshCcw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Search className="w-6 h-6" />
                  Fetch Visitor Details
                </>
              )}
            </button>

            {verificationError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <ShieldAlert className="w-5 h-5" />
                {verificationError}
              </div>
            )}
          </div>
        </div>

        {/* Visitor Info Display (Shown after fetch) */}
        <div className="lg:col-span-2 relative min-h-[300px]">
          {!verifyingPass ? (
            <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center mb-4 text-gray-300">
                <User className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-400">Waiting for Pass Code</h3>
              <p className="text-gray-400 max-w-xs mt-2">Enter a pass code or scan a QR to see visitor credentials here</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/30">
                        {verifyingPass.visitorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white truncate">{verifyingPass.visitorName}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1.5 text-gray-500 font-bold text-sm">
                            <Phone className="w-4 h-4 text-blue-500" /> {verifyingPass.visitorPhone}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusColor(verifyingPass.status, verifyingPass.validUntil)}`}>
                            {getStatusLabel(verifyingPass.status, verifyingPass.validUntil)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Flat Details</p>
                        <p className="font-bold text-gray-900 dark:text-white">Bldg {verifyingPass.building || 'Main'} - {verifyingPass.flatNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Host: {verifyingPass.hostName}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Visitor Type</p>
                        <p className="font-bold text-gray-900 dark:text-white capitalize">{verifyingPass.visitorType || 'Guest'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">ID: {verifyingPass.code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-gray-400">Valid Until:</span>
                        <span className="text-gray-900 dark:text-white">{new Date(verifyingPass.validUntil).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-gray-400">Entry Time:</span>
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Real-time / Now
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                      <button 
                        onClick={() => handleVerifyAction('accept')}
                        disabled={processingAction || verifyingPass.status !== 'active' || new Date(verifyingPass.validUntil) < new Date()}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle className="w-6 h-6" />
                        Accept Entry
                      </button>
                      <button 
                        onClick={handleRejectWithReason}
                        disabled={processingAction || verifyingPass.status !== 'active'}
                        className="px-6 py-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden container for QR scanning from file */}
      <div id="qr-reader-hidden" className="hidden"></div>

      {/* Search & Filter Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Name, Phone, Pass ID, Flat No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none outline-none transition-all dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active/Inside</option>
              <option value="used">Checked Out</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
            />
          </div>
        </form>
      </div>

      {/* Scanner Section */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={stopScanner} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">QR Pass Scanner</h3>
              <button onClick={stopScanner} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div id="qr-reader" className="w-full aspect-square rounded-2xl overflow-hidden bg-black shadow-inner"></div>
              <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">Position the QR code inside the frame to scan</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="pt-8 border-t border-gray-100 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Pass History</h2>
          <span className="text-sm text-gray-500 font-medium">{passes.length} Results Found</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">Searching records...</p>
          </div>
        ) : passes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-700">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No passes found</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your search query or filters to find what you're looking for.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Visitor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pass ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Location</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Visitor Type</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Entry / Valid Until</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {passes.map((pass) => (
                    <tr 
                      key={pass._id} 
                      className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedPass(pass)
                        setIsModalOpen(true)
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {pass.visitorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white capitalize">{pass.visitorName}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{pass.visitorPhone || 'No Phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-500 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                          {pass.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Flat {pass.flatNumber || 'N/A'}</p>
                          <p className="text-[10px] text-gray-400">Bldg {pass.building || 'Main'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg tracking-wider">
                          {pass.visitorType || 'Guest'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {new Date(pass.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Until {new Date(pass.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={pass.status} validUntil={pass.validUntil} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPass(pass)
                              setIsModalOpen(true)
                            }}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-xl transition-all shadow-sm border border-blue-100/50 dark:border-blue-800/50"
                            title="View Pass"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              exportPassPDF(pass)
                            }}
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-xl transition-all shadow-sm border border-indigo-100/50 dark:border-indigo-800/50"
                            title="Re-generate / Download"
                          >
                            <RefreshCcw className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePass(pass.code)
                            }}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-xl transition-all shadow-sm border border-red-100/50 dark:border-red-800/50"
                            title="Delete Pass"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {passes.map((pass) => (
                <div 
                  key={pass._id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4"
                  onClick={() => {
                    setSelectedPass(pass)
                    setIsModalOpen(true)
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                        {pass.visitorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white capitalize">{pass.visitorName}</h4>
                        <p className="text-xs text-gray-500">{pass.code}</p>
                      </div>
                    </div>
                    <StatusBadge status={pass.status} validUntil={pass.validUntil} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-gray-700/50">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Location</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">F-{pass.flatNumber}, B-{pass.building || 'Main'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Visitor Type</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{pass.visitorType || 'Guest'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(pass.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); exportPassPDF(pass); }}
                        className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeletePass(pass.code); }}
                        className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pass Detail Modal */}
      {isModalOpen && selectedPass && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Visitor Pass Details</h3>
                <p className="text-sm text-gray-500 font-medium">Scanned / Selected Pass Information</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportPassPDF(selectedPass)}
                  className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors" 
                  title="Export PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeletePass(selectedPass.code)}
                  className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors" 
                  title="Delete Pass"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Info */}
                <div className="space-y-8">
                  {/* Visitor Profile */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20">
                      {selectedPass.visitorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedPass.visitorName}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {selectedPass.visitorPhone || 'No Phone'}
                      </p>
                    </div>
                  </div>

                  {/* Visit Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Home className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Visit Details</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-1">Host Information</p>
                        <p className="font-bold text-gray-900 dark:text-white">{selectedPass.hostName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Flat {selectedPass.flatNumber || 'N/A'}, Bldg {selectedPass.building || 'Main'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-1">Pass Purpose</p>
                        <p className="font-bold text-gray-900 dark:text-white">{selectedPass.purpose || 'General Visit'}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg">
                          {selectedPass.visitorType || 'Guest'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Timing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Generated</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(selectedPass.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(selectedPass.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Valid Until</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{new Date(selectedPass.validUntil).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(selectedPass.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: QR & Status */}
                <div className="flex flex-col items-center justify-center space-y-8 bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700">
                  <div className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-md ${getStatusColor(selectedPass.status, selectedPass.validUntil)}`}>
                    {getStatusLabel(selectedPass.status, selectedPass.validUntil)}
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-blue-600/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img 
                      src={`https://quickchart.io/qr?text=${encodeURIComponent(selectedPass.code)}&size=300&margin=1`} 
                      alt="Pass QR" 
                      className="w-48 h-48 bg-white p-2 rounded-2xl shadow-xl relative z-10"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pass Identification</p>
                    <p className="text-2xl font-mono font-black text-gray-900 dark:text-white tracking-widest">{selectedPass.code}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-4">Show this pass at the gate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
              <button
                disabled={processingAction || selectedPass.status === 'used' || new Date(selectedPass.validUntil) < new Date()}
                onClick={() => handleApproveEntry(selectedPass)}
                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                <ShieldCheck className="w-5 h-5" />
                Approve Entry
              </button>
              <button
                disabled={processingAction || selectedPass.status === 'used'}
                onClick={() => handleStatusUpdate(selectedPass.code, 'expired')}
                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                <ShieldAlert className="w-5 h-5" />
                Deny Entry
              </button>
              <button
                onClick={() => exportPassPDF(selectedPass)}
                className="w-full sm:w-auto px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}} />
    </div>
  )
}

export default ScanPassDashboard
