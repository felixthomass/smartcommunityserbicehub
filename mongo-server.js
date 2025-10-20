// MongoDB API server for visitor logs
import express from 'express'
import { createHmac } from 'crypto'
import mongoose from 'mongoose'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3002

// Middleware
app.use(cors())
app.use(express.json())

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir))

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // Different prefixes for different types of uploads
    let prefix = 'visitor' // default
    if (req.route?.path?.includes('announcements')) {
      prefix = 'announcement'
    } else if (req.route?.path?.includes('chat')) {
      prefix = 'chat'
    }
    cb(null, prefix + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // For chat uploads, allow more file types
    if (req.route?.path?.includes('chat')) {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('File type not supported for chat'), false)
      }
    } else {
      // For other uploads, allow only images and PDFs
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true)
      } else {
        cb(new Error('Only image and PDF files are allowed!'), false)
      }
    }
  }
})

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://felixthomas8800:Felixthomas@communityhub.yjzla25.mongodb.net/?retryWrites=true&w=majority&appName=communityhub'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB')
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error)
  })

// Visitor Log Schema
const visitorLogSchema = new mongoose.Schema({
  visitorName: { type: String, required: true },
  visitorPhone: { type: String, required: true },
  visitorEmail: { type: String },
  idType: { type: String, required: true, enum: ['aadhar', 'pan', 'driving_license', 'passport', 'other'] },
  idNumber: { type: String, required: true },
  purpose: { type: String, required: true },
  hostName: { type: String, required: true },
  hostFlat: { type: String, required: true },
  hostPhone: { type: String, required: true },
  hostBuilding: { type: String, default: '' },
  hostAuthUserId: { type: String, default: '' },
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },
  status: { type: String, default: 'checked_in', enum: ['checked_in', 'checked_out'] },
  documentPhoto: { type: String }, // Supabase Storage URL for uploaded document
  documentPath: { type: String }, // Supabase Storage path for cleanup
  securityOfficer: { type: String, required: true },
  notes: { type: String },
  vehicleNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Update the updatedAt field before saving
visitorLogSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema)

// Resident Schema
const residentSchema = new mongoose.Schema({
  authUserId: { type: String, required: true, index: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  ownerName: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
  building: { type: String, default: '' },
  isRestricted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

residentSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const Resident = mongoose.model('Resident', residentSchema)

// ResidentEntry schema for admin-managed residents (building/flat-based)
const residentEntrySchema = new mongoose.Schema({
  building: { type: String, required: true },
  flatNumber: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String },
  aadharNumber: { type: String },
  aadharUrl: { type: String },
  isOwner: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  supabaseUserId: { type: String },
  // Verification fee payment tracking
  verificationFeePaid: { type: Boolean, default: false },
  verificationPayment: {
    orderId: { type: String },
    paymentId: { type: String },
    signature: { type: String },
    amount: { type: Number }, // in paise
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    paidAt: { type: Date }
  }
}, { timestamps: true })

const ResidentEntry = mongoose.model('ResidentEntry', residentEntrySchema)

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MongoDB API server is running',
    timestamp: new Date().toISOString()
  })
})

// ===== SERVICE REQUEST ROUTES =====
// Schema for resident service requests (SRs)
const serviceRequestSchema = new mongoose.Schema({
  category: { type: String, default: 'general' },
  priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high', 'urgent'] },
  description: { type: String, default: '' },
  building: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
  residentAuthUserId: { type: String, required: true, index: true },
  residentName: { type: String, default: '' },
  status: { type: String, default: 'created', enum: ['created', 'assigned', 'in_progress', 'completed', 'verified'] },
  dueAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
serviceRequestSchema.pre('save', function(next){ this.updatedAt = Date.now(); next() })
const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema)

// Create service request
app.post('/api/service-requests', async (req, res) => {
  try {
    const payload = req.body || {}
    if (!payload.residentAuthUserId) {
      return res.status(400).json({ success: false, error: 'residentAuthUserId is required' })
    }
    const doc = new ServiceRequest(payload)
    const saved = await doc.save()
    res.status(201).json({ success: true, data: saved })
  } catch (error) {
    console.error('❌ Error creating service request:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// List service requests with optional filters
app.get('/api/service-requests', async (req, res) => {
  try {
    const { residentAuthUserId, status, category, building, flatNumber, search, limit = 100, page = 1 } = req.query
    const query = {}
    if (residentAuthUserId) query.residentAuthUserId = residentAuthUserId
    if (status && status !== 'all') query.status = status
    if (category && category !== 'all') query.category = category
    if (building) query.building = building
    if (flatNumber) query.flatNumber = flatNumber
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { residentName: { $regex: search, $options: 'i' } },
        { building: { $regex: search, $options: 'i' } },
        { flatNumber: { $regex: search, $options: 'i' } }
      ]
    }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const docs = await ServiceRequest.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip)
    const total = await ServiceRequest.countDocuments(query)
    res.json({ success: true, data: docs, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } })
  } catch (error) {
    console.error('❌ Error listing service requests:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update a service request
app.put('/api/service-requests/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = { ...req.body, updatedAt: new Date() }
    const doc = await ServiceRequest.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return res.status(404).json({ success: false, error: 'Service request not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error updating service request:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create visitor log
app.post('/api/visitors', async (req, res) => {
  try {
    const visitorLog = new VisitorLog(req.body)
    const savedLog = await visitorLog.save()

    console.log('✅ Visitor log created:', savedLog._id)
    console.log('✅ Saved log object:', JSON.stringify(savedLog, null, 2))

    res.status(201).json({
      success: true,
      data: savedLog,
      message: 'Visitor log created successfully'
    })
  } catch (error) {
    console.error('❌ Error creating visitor log:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// Visitor stats route must be declared BEFORE :id to avoid route capture
app.get('/api/visitors/stats', async (req, res) => {
  try {
    const { period = 'today' } = req.query
    let startDate = new Date()
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }
    const stats = await VisitorLog.aggregate([
      { $addFields: { entryAt: { $ifNull: ['$entryTime', '$createdAt'] } } },
      { $addFields: { entryAt: { $cond: [{ $eq: [{ $type: '$entryAt' }, 'string'] }, { $toDate: '$entryAt' }, '$entryAt'] } } },
      { $match: { entryAt: { $gte: startDate } } },
      { $group: { _id: null, totalVisitors: { $sum: 1 }, checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } }, checkedOut: { $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] } } } }
    ])
    const result = stats[0] || { totalVisitors: 0, checkedIn: 0, checkedOut: 0 }
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('❌ Error fetching visitor stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single visitor log by ID
app.get('/api/visitors/:id', async (req, res) => {
  try {
    const visitor = await VisitorLog.findById(req.params.id)

    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: 'Visitor log not found'
      })
    }

    res.json({
      success: true,
      data: visitor
    })
  } catch (error) {
    console.error('❌ Error fetching visitor log:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ===== BILL MANAGEMENT ROUTES =====
// ===== SIMPLE MONTHLY FEE ROUTES =====

// Set or update the global monthly fee (admin)
app.post('/api/monthly-fee', async (req, res) => {
  try {
    const { amount, currency = 'INR', notes = '', adminId = '' } = req.body || {}
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' })
    }
    const doc = await MonthlyFee.findOneAndUpdate({}, {
      amount: Number(amount), currency, notes, updatedBy: adminId || 'admin', updatedAt: new Date()
    }, { upsert: true, new: true, setDefaultsOnInsert: true })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error setting monthly fee:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get current monthly fee
app.get('/api/monthly-fee', async (_req, res) => {
  try {
    const doc = await MonthlyFee.findOne({})
    if (!doc) return res.json({ success: true, data: { amount: 0, currency: 'INR', notes: '' } })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error fetching monthly fee:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Record monthly fee payment for a resident for a given month (YYYY-MM)
app.post('/api/monthly-fee/pay', async (req, res) => {
  try {
    const { residentId, month, amount } = req.body || {}
    if (!residentId || !month) return res.status(400).json({ success: false, error: 'residentId and month required' })
    const fee = await MonthlyFee.findOne({})
    const expected = Number(amount ?? fee?.amount ?? 0)
    const txnId = 'MF_' + month + '_' + residentId + '_' + Date.now().toString(36)
    const pay = new Payment({
      billId: new mongoose.Types.ObjectId(),
      residentId,
      residentName: '',
      residentEmail: '',
      amount: expected,
      paymentMethod: 'card',
      transactionId: txnId,
      status: 'completed',
      billTitle: `Monthly Fee ${month}`,
      category: 'maintenance',
      dueDate: undefined
    })
    await pay.save()
    res.json({ success: true, data: { transactionId: txnId, payment: pay } })
  } catch (error) {
    console.error('❌ Error recording monthly fee payment:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get a resident's monthly fee payment status/history
app.get('/api/monthly-fee/status/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params
    const payments = await Payment.find({ residentId, billTitle: { $regex: '^Monthly Fee ' } }).sort({ paidAt: -1 })
    const fee = await MonthlyFee.findOne({})
    res.json({ success: true, data: { fee, payments } })
  } catch (error) {
    console.error('❌ Error fetching monthly fee status:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Bill Schema
const billSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { 
    type: String, 
    required: true, 
    enum: ['electricity', 'water', 'maintenance', 'gas', 'internet', 'security', 'other']
  },
  totalAmount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  splitType: { 
    type: String, 
    required: true, 
    enum: ['equal', 'custom', 'size_based'],
    default: 'equal'
  },
  assignments: [{
    residentId: { type: String, required: true },
    residentName: { type: String, default: '' },
    residentEmail: { type: String, default: '' },
    building: { type: String, default: '' },
    flatNumber: { type: String, default: '' },
    amount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'partially_paid'],
      default: 'pending'
    },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date }
  }],
  createdBy: { type: String, required: true },
  attachments: [{ name: String, url: String, type: String }],
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

billSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const Bill = mongoose.model('Bill', billSchema)

// Payment Schema
const paymentSchema = new mongoose.Schema({
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', required: true },
  residentId: { type: String, required: true },
  residentName: { type: String, default: '' },
  residentEmail: { type: String, default: '' },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['card', 'upi', 'bank_transfer', 'cash', 'cheque'], required: true },
  transactionId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  billTitle: { type: String, default: '' },
  category: { type: String, default: '' },
  month: { type: String, default: '' }, // YYYY-MM for monthly fee
  dueDate: { type: Date },
  paidAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
})

const Payment = mongoose.model('Payment', paymentSchema)

// Monthly Fee Schema (single document storing current monthly amount and optional notes)
const monthlyFeeSchema = new mongoose.Schema({
  amount: { type: Number, required: true }, // in INR
  currency: { type: String, default: 'INR' },
  updatedBy: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
  notes: { type: String, default: '' }
})
const MonthlyFee = mongoose.model('MonthlyFee', monthlyFeeSchema)

// Notification Schema
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'success', 'error', 'bill', 'complaint', 'visitor', 'delivery'], default: 'info' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  targetUsers: [{ type: String }], // Array of user IDs
  targetRoles: [{ type: String, enum: ['admin', 'resident', 'staff', 'security'] }], // Array of roles
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  expiresAt: { type: Date },
  metadata: {
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitorLog' },
    deliveryId: { type: mongoose.Schema.Types.ObjectId },
    actionUrl: { type: String }
  }
}, { timestamps: true })

const Notification = mongoose.model('Notification', notificationSchema)

// ===== Delivery Routes =====
// Delivery Schema
const deliverySchema = new mongoose.Schema({
  vendor: { type: String, required: true },
  vendorId: { type: String, default: '' },
  flatNumber: { type: String, required: true },
  building: { type: String, default: '' },
  residentName: { type: String, default: '' },
  agentName: { type: String, default: '' },
  agentPhone: { type: String, default: '' },
  trackingId: { type: String, default: '' },
  packageDescription: { type: String, default: '' },
  deliveryNotes: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'delivered', 'accepted', 'failed'], default: 'delivered' },
  deliveryTime: { type: Date, default: Date.now },
  securityOfficer: { type: String, default: '' },
  proofUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
deliverySchema.pre('save', function(next) { this.updatedAt = Date.now(); next() })
const Delivery = mongoose.model('Delivery', deliverySchema)

// Create a delivery log
app.post('/api/deliveries', async (req, res) => {
  try {
    const payload = req.body
    const delivery = new Delivery(payload)
    const saved = await delivery.save()

    // Notify the resident (role-based) and targeted by building-flat identifier if available
    try {
      // Ensure we notify ONLY the selected resident
      const resident = await Resident.findOne({ building: payload.building, flatNumber: payload.flatNumber })
      const targetUsers = resident?.authUserId ? [resident.authUserId] : []
      const notification = new Notification({
        title: 'Package Delivered',
        message: `Your ${payload.vendor} package has arrived at ${payload.building}-${payload.flatNumber}.`,
        type: 'delivery',
        priority: 'medium',
        targetUsers,
        targetRoles: [],
        senderId: 'security',
        senderName: payload.securityOfficer || 'Security',
        metadata: { deliveryId: saved._id, actionUrl: '/deliveries' }
      })
      await notification.save()
    } catch (notifErr) {
      console.warn('Delivery notification failed:', notifErr.message)
    }

    res.status(201).json({ success: true, data: saved })
  } catch (error) {
    console.error('❌ Error creating delivery:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Get delivery logs (filters: date, vendor, flatNumber, status, agentName, limit, offset)
app.get('/api/deliveries', async (req, res) => {
  try {
    const { date, vendor, flatNumber, status, agentName, limit = 100, offset = 0 } = req.query
    const query = {}
    if (vendor) query.vendor = { $regex: vendor, $options: 'i' }
    if (flatNumber) query.flatNumber = { $regex: flatNumber, $options: 'i' }
    if (status && status !== 'all') query.status = status
    if (agentName) query.agentName = { $regex: agentName, $options: 'i' }
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0)
      const end = new Date(date); end.setDate(end.getDate() + 1); end.setHours(0,0,0,0)
      query.deliveryTime = { $gte: start, $lt: end }
    }
    const docs = await Delivery.find(query).sort({ deliveryTime: -1 }).limit(parseInt(limit)).skip(parseInt(offset))
    res.json({ success: true, data: docs })
  } catch (error) {
    console.error('❌ Error listing deliveries:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update delivery status (e.g., accepted by resident)
app.put('/api/deliveries/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, acceptedBy } = req.body
    const update = { status, updatedAt: new Date() }
    if (status === 'accepted') update.acceptedBy = acceptedBy
    const doc = await Delivery.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return res.status(404).json({ success: false, error: 'Delivery not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error updating delivery status:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Upload delivery proof photo
app.post('/api/deliveries/:id/proof', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' })
    const { id } = req.params
    const filePath = `/uploads/${req.file.filename}`
    const publicUrl = `http://localhost:3002${filePath}`
    const doc = await Delivery.findByIdAndUpdate(id, { proofUrl: publicUrl, updatedAt: new Date() }, { new: true })
    if (!doc) return res.status(404).json({ success: false, error: 'Delivery not found' })
    res.json({ success: true, data: { publicUrl, path: filePath } })
  } catch (error) {
    console.error('❌ Error uploading delivery proof:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get delivery vendors (unique vendors from deliveries)
app.get('/api/deliveries/vendors', async (req, res) => {
  try {
    const vendors = await Delivery.distinct('vendor')
    const vendorData = vendors.map(vendor => ({ id: vendor, name: vendor }))
    res.json({ success: true, data: vendorData })
  } catch (error) {
    console.error('❌ Error fetching vendors:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get delivery statistics
app.get('/api/deliveries/stats', async (req, res) => {
  try {
    const { period = 'day' } = req.query
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }
    
    const stats = await Delivery.aggregate([
      { $match: { deliveryTime: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalToday: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      }
    ])
    
    const result = stats[0] || { totalToday: 0, delivered: 0, accepted: 0, failed: 0 }
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('❌ Error fetching delivery stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get frequent agents for a vendor
app.get('/api/deliveries/agents/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params
    const agents = await Delivery.aggregate([
      { $match: { vendor: vendorId } },
      {
        $group: {
          _id: { name: '$agentName', phone: '$agentPhone' },
          count: { $sum: 1 },
          lastDelivery: { $max: '$deliveryTime' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
    
    const agentData = agents.map(agent => ({
      name: agent._id.name,
      phone: agent._id.phone,
      deliveryCount: agent.count,
      lastDelivery: agent.lastDelivery
    }))
    
    res.json({ success: true, data: agentData })
  } catch (error) {
    console.error('❌ Error fetching frequent agents:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get delivery suggestions based on agent name
app.get('/api/deliveries/suggestions', async (req, res) => {
  try {
    const { agentName } = req.query
    if (!agentName || agentName.length < 2) {
      return res.json({ success: true, data: null })
    }
    
    const suggestions = await Delivery.find({
      agentName: { $regex: agentName, $options: 'i' }
    }).sort({ deliveryTime: -1 }).limit(5)
    
    res.json({ success: true, data: suggestions })
  } catch (error) {
    console.error('❌ Error fetching delivery suggestions:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get blacklisted agents
app.get('/api/deliveries/agents/blacklisted', async (req, res) => {
  try {
    // For now, return empty array - can be extended with a blacklist collection
    res.json({ success: true, data: [] })
  } catch (error) {
    console.error('❌ Error fetching blacklisted agents:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create a new bill
app.post('/api/bills', async (req, res) => {
  try {
    const billData = req.body
    const bill = new Bill(billData)
    const savedBill = await bill.save()
    
    // Send automated notification to all residents about new bill
    try {
      const notification = new Notification({
        title: 'New Bill Created',
        message: `A new ${billData.category} bill has been created. Amount: ₹${billData.totalAmount}. Due: ${new Date(billData.dueDate).toLocaleDateString()}`,
        type: 'bill',
        priority: 'medium',
        targetRoles: ['resident'],
        senderId: billData.createdBy || 'system',
        senderName: 'System',
        metadata: {
          billId: savedBill._id,
          actionUrl: '/payments'
        }
      })
      await notification.save()
      console.log('✅ Bill notification sent to residents')

      // Email broadcast to all residents with an email
      try {
        const residents = await Resident.find({ email: { $ne: '' } }, { email: 1 })
        const emails = residents.map(r => r.email).filter(Boolean)
        if (emails.length > 0) {
          const subject = `New Bill: ${billData.title}`
          const text = `A new ${billData.category} bill has been created.\n\nAmount: ₹${billData.totalAmount}\nDue: ${new Date(billData.dueDate).toLocaleDateString()}\n\nVisit: /payments`
          await Promise.allSettled(emails.map(e => sendEmailViaServer(e, subject, null, text)))
          console.log(`📧 Bill email fan-out: ${emails.length} attempted`)
        }
      } catch (mailErr) {
        console.warn('⚠️ Bill email fan-out failed:', mailErr.message)
      }
    } catch (notifError) {
      console.error('❌ Error sending bill notification:', notifError)
    }
    
    res.status(201).json({ success: true, data: savedBill })
  } catch (error) {
    console.error('❌ Error creating bill:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const { limit = 50, page = 1, category, status } = req.query
    let query = {}
    if (category && category !== 'all') query.category = category
    if (status && status !== 'all') query.status = status
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const bills = await Bill.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip)
    const total = await Bill.countDocuments(query)
    res.json({ success: true, data: { bills, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } })
  } catch (error) {
    console.error('❌ Error fetching bills:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get bill by ID
app.get('/api/bills/id/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' })
    res.json({ success: true, data: bill })
  } catch (error) {
    console.error('❌ Error fetching bill:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update bill
app.put('/api/bills/id/:id', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() }
    const bill = await Bill.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' })
    res.json({ success: true, data: bill })
  } catch (error) {
    console.error('❌ Error updating bill:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Delete bill
app.delete('/api/bills/id/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id)
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' })
    res.json({ success: true, message: 'Bill deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting bill:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get bills for a specific resident
app.get('/api/bills/resident/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params
    const { status } = req.query
    const query = { 'assignments.residentId': residentId }
    if (status && status !== 'all') query['assignments.status'] = status
    const bills = await Bill.find(query).sort({ createdAt: -1 })
    res.json({ success: true, data: { bills } })
  } catch (error) {
    console.error('❌ Error fetching resident bills:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get bill statistics
app.get('/api/bills/stats', async (req, res) => {
  try {
    const stats = await Bill.aggregate([{ $group: { _id: null, totalBills: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' }, avgAmount: { $avg: '$totalAmount' } } }])
    const paidStats = await Bill.aggregate([{ $unwind: '$assignments' }, { $group: { _id: null, paidAmount: { $sum: { $cond: [{ $eq: ['$assignments.status', 'paid'] }, '$assignments.amount', 0] } }, pendingAmount: { $sum: { $cond: [{ $eq: ['$assignments.status', 'pending'] }, '$assignments.amount', 0] } } } }])
    const overdueCount = await Bill.countDocuments({ dueDate: { $lt: new Date() }, 'assignments.status': 'pending' })
    res.json({ success: true, data: { totalBills: stats[0]?.totalBills || 0, totalAmount: stats[0]?.totalAmount || 0, paidAmount: paidStats[0]?.paidAmount || 0, pendingAmount: paidStats[0]?.pendingAmount || 0, overdueCount: overdueCount || 0 } })
  } catch (error) {
    console.error('❌ Error fetching bill stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get resident bill summary
app.get('/api/bills/resident/:residentId/summary', async (req, res) => {
  try {
    const { residentId } = req.params
    const bills = await Bill.find({ 'assignments.residentId': residentId })
    let totalPending = 0, totalOverdue = 0, totalPaid = 0
    const now = new Date()
    bills.forEach(bill => {
      const a = bill.assignments.find(x => x.residentId === residentId)
      if (!a) return
      if (a.status === 'paid') totalPaid += a.amount
      else if (a.status === 'pending') { totalPending += a.amount; if (bill.dueDate < now) totalOverdue += a.amount }
    })
    const recentBills = bills.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5)
    const recentPayments = await Payment.find({ residentId }).sort({ paidAt: -1 }).limit(5)
    res.json({ success: true, data: { totalPending, totalOverdue, totalPaid, recentBills, recentPayments } })
  } catch (error) {
    console.error('❌ Error fetching resident bill summary:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Process payment
app.post('/api/payments', async (req, res) => {
  try {
    const { billId, residentId, amount, paymentMethod, paymentDetails } = req.body
    const transactionId = 'TXN' + Date.now() + Math.random().toString(36).slice(2, 8).toUpperCase()
    const payment = new Payment({ billId, residentId, amount, paymentMethod, transactionId, status: 'completed', billTitle: paymentDetails?.billTitle || '', category: paymentDetails?.category || '', dueDate: paymentDetails?.dueDate })
    await payment.save()
    await Bill.findOneAndUpdate({ _id: billId, 'assignments.residentId': residentId }, { $set: { 'assignments.$.status': 'paid', 'assignments.$.paidAmount': amount, 'assignments.$.paidAt': new Date(), updatedAt: Date.now() } })
    res.json({ success: true, data: { transactionId, payment } })
  } catch (error) {
    console.error('❌ Error processing payment:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get payment history for a resident
app.get('/api/payments/resident/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params
    const { limit = 50, page = 1 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const payments = await Payment.find({ residentId }).sort({ paidAt: -1 }).limit(parseInt(limit)).skip(skip)
    const total = await Payment.countDocuments({ residentId })
    res.json({ success: true, data: { payments, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } } })
  } catch (error) {
    console.error('❌ Error fetching payment history:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get visitor logs with filtering
app.get('/api/visitors', async (req, res) => {
  try {
    const { date, status, search, limit = 50, page = 1 } = req.query
    
    let query = {}
    
    // Date filter
    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      query.entryTime = {
        $gte: startDate,
        $lt: endDate
      }
    }
    
    // Status filter
    if (status) {
      query.status = status
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { visitorName: { $regex: search, $options: 'i' } },
        { visitorPhone: { $regex: search, $options: 'i' } },
        { hostName: { $regex: search, $options: 'i' } },
        { hostFlat: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ]
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const visitors = await VisitorLog.find(query)
      .sort({ entryTime: -1 })
      .limit(parseInt(limit))
      .skip(skip)
    
    const total = await VisitorLog.countDocuments(query)
    
    res.json({
      success: true,
      data: visitors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('❌ Error fetching visitor logs:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Update visitor log
app.put('/api/visitors/:id', async (req, res) => {
  try {
    const updatedLog = await VisitorLog.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    )
    
    if (!updatedLog) {
      return res.status(404).json({
        success: false,
        error: 'Visitor log not found'
      })
    }
    
    console.log('✅ Visitor log updated:', updatedLog._id)
    res.json({
      success: true,
      data: updatedLog,
      message: 'Visitor log updated successfully'
    })
  } catch (error) {
    console.error('❌ Error updating visitor log:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// Upload document endpoint (fallback if Supabase Storage fails)
app.post('/api/visitors/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    const { visitorId } = req.body
    const filePath = `/uploads/${req.file.filename}`
    const publicUrl = `http://localhost:3002${filePath}`

    if (visitorId) {
      // Update existing visitor log with document
      await VisitorLog.findByIdAndUpdate(visitorId, {
        documentPhoto: publicUrl,
        documentPath: filePath,
        updatedAt: Date.now()
      })
    }

    console.log('✅ Document uploaded:', req.file.filename)
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        path: filePath,
        publicUrl: publicUrl,
        size: req.file.size
      },
      message: 'Document uploaded successfully'
    })
  } catch (error) {
    console.error('❌ Error uploading document:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Delete visitor log
app.delete('/api/visitors/:id', async (req, res) => {
  try {
    const deletedLog = await VisitorLog.findByIdAndDelete(req.params.id)
    
    if (!deletedLog) {
      return res.status(404).json({
        success: false,
        error: 'Visitor log not found'
      })
    }
    
    // Note: Document cleanup is handled by the client-side storageService
    // when calling mongoService.deleteVisitorLog()
    
    console.log('✅ Visitor log deleted:', deletedLog._id)
    res.json({
      success: true,
      message: 'Visitor log deleted successfully'
    })
  } catch (error) {
    console.error('❌ Error deleting visitor log:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get visitor statistics
app.get('/api/visitors/stats', async (req, res) => {
  try {
    const { period = 'today' } = req.query
    
    let startDate = new Date()
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }
    
    const stats = await VisitorLog.aggregate([
      // Normalize a single date field to use for filtering
      {
        $addFields: {
          entryAt: { $ifNull: ['$entryTime', '$createdAt'] }
        }
      },
      // Some documents may have string dates; attempt conversion
      {
        $addFields: {
          entryAt: {
            $cond: [
              { $eq: [{ $type: '$entryAt' }, 'string'] },
              { $toDate: '$entryAt' },
              '$entryAt'
            ]
          }
        }
      },
      {
        $match: {
          entryAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalVisitors: { $sum: 1 },
          checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
          checkedOut: { $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] } }
        }
      }
    ])
    
    const result = stats[0] || { totalVisitors: 0, checkedIn: 0, checkedOut: 0 }
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('❌ Error fetching visitor stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ===== Chat Routes =====
// Create or fetch DM room
app.post('/api/chat/rooms', async (req, res) => {
  try {
    const { type = 'dm', memberAuthUserIds = [], name } = req.body
    if (!Array.isArray(memberAuthUserIds) || memberAuthUserIds.length < 2) {
      // allow group bootstrap with 1 or more members
      if (type !== 'group') {
        return res.status(400).json({ success: false, error: 'memberAuthUserIds must have at least 2 members' })
      }
    }
    let room
    if (type === 'dm') {
      room = await ChatRoom.findOne({ type: 'dm', memberAuthUserIds: { $all: memberAuthUserIds, $size: 2 } })
      if (!room) {
        room = new ChatRoom({ type, memberAuthUserIds, name: name || '' })
        await room.save()
      }
    } else if (type === 'group') {
      // find the named group; if exists, add members; else create
      const query = name ? { type: 'group', name } : { type: 'group' }
      console.log('🔍 Looking for group with query:', query)
      room = await ChatRoom.findOne(query)
      console.log('🔍 Found existing group:', room)
      if (!room) {
        console.log('🔍 Creating new group with members:', memberAuthUserIds)
        room = new ChatRoom({ type: 'group', name: name || 'Residents Group', memberAuthUserIds })
        await room.save()
        console.log('✅ Group created:', room._id)
      } else if (memberAuthUserIds && memberAuthUserIds.length) {
        console.log('🔍 Adding members to existing group:', memberAuthUserIds)
        await ChatRoom.updateOne({ _id: room._id }, { $addToSet: { memberAuthUserIds: { $each: memberAuthUserIds } }, $set: { updatedAt: new Date() } })
        room = await ChatRoom.findById(room._id)
        console.log('✅ Group updated with new members:', room.memberAuthUserIds)
      }
    }
    res.json({ success: true, room })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

// List rooms for a user
app.get('/api/chat/rooms', async (req, res) => {
  try {
    const { me } = req.query
    if (!me) return res.status(400).json({ success: false, error: 'me required' })
    console.log('🔍 Listing rooms for user:', me)
    const rooms = await ChatRoom.find({ memberAuthUserIds: me }).sort({ lastMessageAt: -1 })
    console.log('🔍 Found rooms:', rooms.map(r => ({ id: r._id, type: r.type, name: r.name, members: r.memberAuthUserIds?.length })))
    res.json({ success: true, rooms })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

// List messages
app.get('/api/chat/messages', async (req, res) => {
  try {
    const { roomId, before, limit = 30 } = req.query
    if (!roomId) return res.status(400).json({ success: false, error: 'roomId required' })
    const query = { roomId }
    if (before) query.createdAt = { $lt: new Date(before) }
    const messages = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(Number(limit))
    res.json({ success: true, messages: messages.reverse() })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

// Create message
app.post('/api/chat/messages', async (req, res) => {
  try {
    const { roomId, senderAuthUserId, senderName, text, media } = req.body
    if (!roomId || !senderAuthUserId) return res.status(400).json({ success: false, error: 'roomId and senderAuthUserId required' })
    const msg = new ChatMessage({ roomId, senderAuthUserId, senderName, text, media })
    await msg.save()
    await ChatRoom.findByIdAndUpdate(roomId, { lastMessageAt: new Date() })
    res.status(201).json({ success: true, message: msg })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

// Edit message
app.put('/api/chat/messages/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = { ...req.body, editedAt: new Date() }
    const message = await ChatMessage.findByIdAndUpdate(id, update, { new: true })
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' })
    res.json({ success: true, message })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

// Soft delete message
app.delete('/api/chat/messages/:id', async (req, res) => {
  try {
    const { id } = req.params
    const message = await ChatMessage.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true })
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' })
    res.json({ success: true, message })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})
// Resident profile routes
// Get resident profile by auth user id
app.get('/api/residents/:authUserId', async (req, res) => {
  try {
    const { authUserId } = req.params
    const resident = await Resident.findOne({ authUserId })
    return res.json({ success: true, resident })
  } catch (error) {
    console.error('❌ Error fetching resident profile:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create or update resident profile
app.post('/api/residents', async (req, res) => {
  try {
    const { authUserId, name, email, phone, ownerName, flatNumber, building } = req.body
    if (!authUserId) {
      return res.status(400).json({ success: false, error: 'authUserId is required' })
    }
    const update = { name, email, phone, ownerName, flatNumber, building, updatedAt: Date.now() }
    const options = { new: true, upsert: true, setDefaultsOnInsert: true }
    const resident = await Resident.findOneAndUpdate({ authUserId }, update, options)
    res.json({ success: true, resident, message: 'Resident profile saved' })
  } catch (error) {
    console.error('❌ Error saving resident profile:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// List all residents
app.get('/api/residents', async (req, res) => {
  try {
    const [residentsColl, adminEntries] = await Promise.all([
      Resident.find({}).sort({ createdAt: -1 }).lean(),
      ResidentEntry.find({}).sort({ createdAt: -1 }).lean()
    ])

    // Map ResidentEntry (admin) into resident-like objects for global visibility
    const projectedAdmin = (adminEntries || []).map(e => ({
      _id: e._id,
      authUserId: e.supabaseUserId || null,
      name: e.name || '',
      email: e.email || '',
      phone: e.phone || '',
      ownerName: e.isOwner ? e.name : '',
      flatNumber: e.flatNumber || '',
      building: e.building || '',
      isRestricted: e.isRestricted || false,
      residentType: e.isOwner ? 'owner' : 'tenant',
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }))

    // Merge by authUserId if present, otherwise by email+building+flat
    const keyOf = r => r.authUserId || `${(r.email||'').toLowerCase()}|${r.building}|${r.flatNumber}`
    const mergedMap = new Map()
    for (const r of projectedAdmin) {
      mergedMap.set(keyOf(r), r)
    }
    for (const r of (residentsColl || [])) {
      const k = keyOf(r)
      if (!mergedMap.has(k)) mergedMap.set(k, r)
      else {
        // Prefer real resident doc (with authUserId) but keep building/flat/name from admin when missing
        const existing = mergedMap.get(k)
        mergedMap.set(k, { ...existing, ...r, building: r.building || existing.building, flatNumber: r.flatNumber || existing.flatNumber })
      }
    }

    const residents = Array.from(mergedMap.values())
    res.json({ success: true, residents })
  } catch (error) {
    console.error('❌ Error listing residents:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Restrict/unrestrict a resident
app.post('/api/residents/:authUserId/restrict', async (req, res) => {
  try {
    const { authUserId } = req.params
    const { restricted } = req.body
    const resident = await Resident.findOneAndUpdate(
      { authUserId },
      { isRestricted: !!restricted, updatedAt: Date.now() },
      { new: true }
    )
    if (!resident) return res.status(404).json({ success: false, error: 'Resident not found' })
    res.json({ success: true, resident })
  } catch (error) {
    console.error('❌ Error updating restriction:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== Admin-managed resident entries (building/flat) =====
// List by building/flat
app.get('/api/residents/by-flat/:building/:flatNumber', async (req, res) => {
  try {
    const { building, flatNumber } = req.params
    const list = await ResidentEntry.find({ building, flatNumber }).sort({ createdAt: -1 }).lean()
    res.json({ success: true, residents: list })
  } catch (error) {
    console.error('❌ Error listing residents by flat:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Bulk create residents for a flat
app.post('/api/residents/bulk', async (req, res) => {
  try {
    const { building, flatNumber, residents } = req.body || {}
    if (!building || !flatNumber || !Array.isArray(residents)) {
      return res.status(400).json({ success: false, error: 'Invalid payload' })
    }

    const incomingOwners = residents.filter(r => r.isOwner)
    if (incomingOwners.length > 1) {
      return res.status(400).json({ success: false, error: 'Only one owner allowed per flat' })
    }

    const existingOwners = await ResidentEntry.countDocuments({ building, flatNumber, isOwner: true })
    if (existingOwners > 0 && incomingOwners.length > 0) {
      return res.status(409).json({ success: false, error: 'Owner already exists for this flat' })
    }

    const docs = await ResidentEntry.insertMany((residents || []).map(r => ({
      building,
      flatNumber,
      name: r.name,
      email: r.email,
      phone: r.phone,
      aadharNumber: r.aadharNumber || '',
      aadharUrl: r.aadharUrl || '',
      isOwner: !!r.isOwner,
      verified: false
    })))
    res.json({ success: true, data: { insertedCount: docs.length, residents: docs } })
  } catch (error) {
    console.error('❌ Error bulk-creating residents:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete all resident entries
app.delete('/api/residents', async (_req, res) => {
  try {
    const result = await ResidentEntry.deleteMany({})
    res.json({ success: true, data: { deleted: result.deletedCount } })
  } catch (error) {
    console.error('❌ Error deleting all residents:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// List all admin-managed resident entries
app.get('/api/admin/resident-entries', async (_req, res) => {
  try {
    const list = await ResidentEntry.find({}).sort({ createdAt: -1 }).lean()
    res.json({ success: true, data: list })
  } catch (error) {
    console.error('❌ Error listing resident entries:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Alias to match frontend usage: /api/residents/flat/:building/:flatNumber
app.get('/api/residents/flat/:building/:flatNumber', async (req, res) => {
  try {
    const { building, flatNumber } = req.params
    // Prefer admin-managed entries (ResidentEntry)
    const adminDoc = await ResidentEntry.findOne({ building, flatNumber }).lean()
    if (adminDoc) return res.json({ success: true, data: adminDoc })
    // Fallback to Residents collection
    const residentDoc = await Resident.findOne({ building, flatNumber }).lean()
    if (!residentDoc) return res.status(404).json({ success: false, error: 'Resident not found' })
    res.json({ success: true, data: residentDoc })
  } catch (error) {
    console.error('❌ Error fetching resident by flat:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete a single admin-managed resident entry
app.delete('/api/admin/resident-entries/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await ResidentEntry.deleteOne({ _id: id })
    res.json({ success: true, data: { deleted: result.deletedCount } })
  } catch (error) {
    console.error('❌ Error deleting resident entry:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Danger: Delete all resident profiles (self-registered profiles)
app.delete('/api/resident-profiles', async (_req, res) => {
  try {
    const result = await Resident.deleteMany({})
    res.json({ success: true, data: { deleted: result.deletedCount } })
  } catch (error) {
    console.error('❌ Error deleting resident profiles:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update resident entry by ID
app.put('/api/residents/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = req.body || {}
    const doc = await ResidentEntry.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error updating resident:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Alias: Update admin-managed resident entry by ID
app.put('/api/admin/resident-entries/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = req.body || {}
    const doc = await ResidentEntry.findByIdAndUpdate(id, update, { new: true })
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error updating admin resident entry:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete resident entry by ID
app.delete('/api/residents/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await ResidentEntry.findByIdAndDelete(id)
    res.json({ success: true, data: { deleted: !!result } })
  } catch (error) {
    console.error('❌ Error deleting resident:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Alias: Delete admin-managed resident entry by ID
app.delete('/api/admin/resident-entries/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await ResidentEntry.findByIdAndDelete(id)
    res.json({ success: true, data: { deleted: !!result } })
  } catch (error) {
    console.error('❌ Error deleting admin resident entry:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Verify resident details on login
app.post('/api/residents/verify', async (req, res) => {
  try {
    const { email, name, aadharNumber, supabaseUserId, building, flatNumber } = req.body || {}
    if (!email || !name || !aadharNumber || !supabaseUserId || !building || !flatNumber) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }
    const resident = await ResidentEntry.findOne({ email, building, flatNumber })
    if (!resident) return res.status(404).json({ success: false, error: 'Resident not found' })
    const nameMatch = (resident.name || '').toLowerCase().trim() === name.toLowerCase().trim()
    const aadharMatch = (resident.aadharNumber || '').trim() === aadharNumber.trim()
    if (nameMatch && aadharMatch) {
      await ResidentEntry.updateOne({ _id: resident._id }, { verified: true, supabaseUserId })
      return res.json({ success: true, data: { verified: true, resident } })
    }
    return res.json({ success: true, data: { verified: false, reason: 'Details do not match' } })
  } catch (error) {
    console.error('❌ Error verifying resident:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== Razorpay Payment for Verification =====
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_R79jO6N4F99QLG'
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'HgKjdH7mCViwebMQTIFmbx7R'

// Create Razorpay order for verification fee (amount in paise)
app.post('/api/payments/razorpay/order', async (req, res) => {
  try {
    const { amount = 500000, currency = 'INR', receipt, notes, supabaseUserId } = req.body || {}
    if (!supabaseUserId) return res.status(400).json({ success: false, error: 'supabaseUserId required' })

    // Razorpay constraint: receipt length <= 40
    const baseReceipt = receipt || `verify_${(supabaseUserId||'user').slice(-8)}_${Date.now().toString(36)}`
    const safeReceipt = baseReceipt.slice(0, 40)

    const orderPayload = {
      amount: Number(amount),
      currency,
      receipt: safeReceipt,
      notes: { purpose: 'resident_verification_fee', supabaseUserId, ...(notes || {}) }
    }

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(orderPayload)
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Razorpay order failed: ${resp.status} ${text}`)
    }
    const order = await resp.json()

    // Optionally stash order id on ResidentEntry for traceability
    await ResidentEntry.updateOne({ supabaseUserId }, { $set: { verificationPayment: { orderId: order.id, amount: order.amount, currency: order.currency, status: order.status || 'created' } } })

    res.json({ success: true, data: { order, keyId: RAZORPAY_KEY_ID } })
  } catch (error) {
    console.error('❌ Razorpay order error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Verify Razorpay payment signature and mark verification paid
app.post('/api/payments/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, supabaseUserId, month, type } = req.body || {}
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !supabaseUserId) {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields' })
    }

    const hmac = createHmac('sha256', RAZORPAY_KEY_SECRET)
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id)
    const expectedSignature = hmac.digest('hex')
    const isValid = expectedSignature === razorpay_signature
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid signature' })

    // If this is a monthly fee payment, enforce rules and record a Payment row
    if (type === 'monthly_fee' && month) {
      // Prevent paying more than 2 months in advance
      const [y, m] = String(month).split('-').map(Number)
      if (!y || !m) return res.status(400).json({ success: false, error: 'Invalid month format' })
      const selected = new Date(y, m - 1, 1)
      const now = new Date()
      const max = new Date(now.getFullYear(), now.getMonth() + 2, 1) // up to 2 months ahead
      if (selected > max) return res.status(400).json({ success: false, error: 'Cannot pay more than 2 months in advance' })

      // Prevent duplicate month payment
      const existing = await Payment.findOne({ residentId: supabaseUserId, billTitle: `Monthly Fee ${month}` })
      if (existing) return res.status(409).json({ success: false, error: 'Monthly fee already paid for this month' })

      // Determine amount (in paise) from MonthlyFee settings
      const fee = await MonthlyFee.findOne({})
      const amountPaise = Math.max(0, Number((fee?.amount ?? 0))) * 100
      const txnId = razorpay_payment_id
      // enrich resident info
      const residentDoc = await Resident.findOne({ authUserId: supabaseUserId })
      const residentName = residentDoc?.name || ''
      const residentEmail = residentDoc?.email || ''
      const payDoc = new Payment({
        billId: new mongoose.Types.ObjectId(),
        residentId: supabaseUserId,
        residentName,
        residentEmail,
        amount: amountPaise,
        paymentMethod: 'card',
        transactionId: txnId,
        status: 'completed',
        billTitle: `Monthly Fee ${month}`,
        category: 'monthly_fee',
        month
      })
      await payDoc.save()

      return res.json({ success: true, data: { paid: true, type: 'monthly_fee', month, payment: payDoc } })
    }

    const entry = await ResidentEntry.findOneAndUpdate(
      { supabaseUserId },
      {
        $set: {
          verificationFeePaid: true,
          verificationPayment: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            status: 'paid',
            paidAt: new Date()
          }
        }
      },
      { new: true }
    )
    if (!entry) return res.status(404).json({ success: false, error: 'Resident entry not found' })

    // Upsert into Residents collection for dashboard access
    const resident = await Resident.findOneAndUpdate(
      { authUserId: supabaseUserId },
      {
        name: entry.name,
        email: entry.email,
        flatNumber: entry.flatNumber,
        building: entry.building,
        updatedAt: Date.now()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.json({ success: true, data: { verified: true, paid: true, resident } })
  } catch (error) {
    console.error('❌ Razorpay verify error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get resident entry by linked Supabase user
app.get('/api/residents/by-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const doc = await ResidentEntry.findOne({ supabaseUserId: userId })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error fetching resident by user:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Complaint Schema
const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'general' },
  priority: { type: String, default: 'normal', enum: ['low', 'normal', 'high'] },
  status: { type: String, default: 'open', enum: ['open', 'resolved'] },
  resolvedAt: { type: Date },
  residentAuthUserId: { type: String, required: true },
  residentName: { type: String, default: '' },
  residentEmail: { type: String, default: '' },
  residentPhone: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
  building: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

complaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const Complaint = mongoose.model('Complaint', complaintSchema)

// Create complaint
app.post('/api/complaints', async (req, res) => {
  try {
    const payload = req.body
    const complaint = new Complaint(payload)
    const saved = await complaint.save()
    
    // Send automated notification to admin about new complaint
    try {
      const notification = new Notification({
        title: 'New Complaint Submitted',
        message: `A new ${payload.category} complaint has been submitted by ${payload.residentName} (${payload.building}-${payload.flatNumber}): ${payload.title}`,
        type: 'complaint',
        priority: payload.priority === 'high' ? 'high' : 'medium',
        targetRoles: ['admin'],
        senderId: payload.residentAuthUserId || 'system',
        senderName: payload.residentName || 'Resident',
        metadata: {
          complaintId: saved._id,
          actionUrl: '/complaints'
        }
      })
      await notification.save()
      console.log('✅ Complaint notification sent to admin')

      // Email the admin(s): if you have an admins collection, query it; otherwise fallback to console
      try {
        // TODO: Replace with real admin collection. For now, send a single configured admin email if set.
        const ADMIN_FALLBACK_EMAIL = process.env.ADMIN_EMAIL || ''
        const recipients = []
        if (ADMIN_FALLBACK_EMAIL) recipients.push(ADMIN_FALLBACK_EMAIL)
        if (payload.adminEmail) recipients.push(payload.adminEmail)
        if (recipients.length > 0) {
          const subject = `New Complaint: ${payload.title}`
          const text = `Category: ${payload.category}\nResident: ${payload.residentName} (${payload.building}-${payload.flatNumber})\n\n${payload.description || ''}\n\nVisit: /complaints`
          await Promise.allSettled(recipients.map(e => sendEmailViaServer(e, subject, null, text)))
          console.log(`📧 Complaint email fan-out: ${recipients.length} attempted`)
        }
      } catch (mailErr) {
        console.warn('⚠️ Complaint email fan-out failed:', mailErr.message)
      }
    } catch (notifError) {
      console.error('❌ Error sending complaint notification:', notifError)
    }
    
    res.status(201).json({ success: true, complaint: saved })
  } catch (error) {
    console.error('❌ Error creating complaint:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// List complaints (optionally filter by resident)
app.get('/api/complaints', async (req, res) => {
  try {
    const { resident } = req.query
    const query = resident ? { residentAuthUserId: resident } : {}
    const complaints = await Complaint.find(query).sort({ createdAt: -1 })
    res.json({ success: true, complaints })
  } catch (error) {
    console.error('❌ Error listing complaints:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update complaint (e.g., status)
app.put('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = { ...req.body, updatedAt: Date.now() }
    if (update.status === 'resolved' && !update.resolvedAt) {
      update.resolvedAt = new Date()
    }
    const complaint = await Complaint.findByIdAndUpdate(id, update, { new: true })
    if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' })
    res.json({ success: true, complaint })
  } catch (error) {
    console.error('❌ Error updating complaint:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete complaint
app.delete('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await Complaint.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ success: false, error: 'Complaint not found' })
    res.json({ success: true, complaint: deleted })
  } catch (error) {
    console.error('❌ Error deleting complaint:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Visitor Pass Schema
const visitorPassSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  visitorName: { type: String, required: true },
  visitorPhone: { type: String, required: true },
  visitorEmail: { type: String },
  hostAuthUserId: { type: String, required: true },
  hostName: { type: String, default: '' },
  hostPhone: { type: String, default: '' },
  building: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
  directions: { type: String, default: '' },
  validUntil: { type: Date, required: true },
  status: { type: String, default: 'active', enum: ['active', 'used', 'expired'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

visitorPassSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const VisitorPass = mongoose.model('VisitorPass', visitorPassSchema)

// Chat schemas
const chatRoomSchema = new mongoose.Schema({
  type: { type: String, enum: ['dm', 'group'], default: 'dm' },
  memberAuthUserIds: { type: [String], index: true },
  name: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
chatRoomSchema.pre('save', function(next){ this.updatedAt = Date.now(); next() })
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema)

const chatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', index: true, required: true },
  senderAuthUserId: { type: String, required: true, index: true },
  senderName: { type: String, default: '' },
  text: { type: String },
  media: {
    type: { type: String, enum: ['image', 'video', 'pdf', 'document'] },
    path: { type: String },
    thumbPath: { type: String },
    size: { type: Number },
    width: { type: Number },
    height: { type: Number },
    durationMs: { type: Number },
    originalName: { type: String },
    mimeType: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  deletedAt: { type: Date }
})
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)

// ===== CHAT FILE UPLOAD =====
// Upload chat files (images, videos, PDFs)
app.post('/api/chat/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const file = req.file
    const allowedTypes = {
      'image/jpeg': 'image',
      'image/png': 'image',
      'image/gif': 'image',
      'image/webp': 'image',
      'video/mp4': 'video',
      'video/webm': 'video',
      'video/quicktime': 'video',
      'application/pdf': 'pdf',
      'application/msword': 'document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
      'text/plain': 'document'
    }

    const fileType = allowedTypes[file.mimetype]
    if (!fileType) {
      return res.status(400).json({ 
        success: false, 
        error: 'File type not supported. Allowed: images, videos, PDFs, documents' 
      })
    }

    // Generate public URL - use the MongoDB server URL
    const publicUrl = `http://localhost:3002/uploads/${file.filename}`

    res.json({
      success: true,
      data: {
        path: file.filename,
        publicUrl,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        type: fileType
      }
    })
  } catch (error) {
    console.error('Chat file upload error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== ANNOUNCEMENT MANAGEMENT =====

// Announcement Schema
const announcementSchema = new mongoose.Schema({
  adminId: { type: String, required: true, index: true },
  adminName: { type: String, default: '' },
  adminEmail: { type: String, default: '' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    default: 'announcement',
    enum: ['announcement', 'event', 'festival', 'maintenance']
  },
  priority: { 
    type: String, 
    default: 'normal',
    enum: ['low', 'normal', 'high', 'urgent']
  },
  location: { type: String, default: '' },
  eventDate: { type: Date },
  organizer: { type: String, default: '' },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  targetRoles: { 
    type: [String], 
    default: ['resident', 'admin', 'staff', 'security'],
    enum: ['resident', 'admin', 'staff', 'security']
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

announcementSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const Announcement = mongoose.model('Announcement', announcementSchema)

// Create visitor pass
app.post('/api/passes', async (req, res) => {
  try {
    const { visitorName, visitorPhone, visitorEmail, hostAuthUserId, hostName, hostPhone, building, flatNumber, validUntil } = req.body
    if (!visitorName || !visitorPhone || !hostAuthUserId || !validUntil) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }
    // Generate simple directions text (can be enhanced later)
    const floor = (flatNumber || '').toString().charAt(0)
    const directions = building && flatNumber
      ? `Enter through Security Gate → Proceed to Building ${building} → Take elevator to Floor ${floor} → Flat ${flatNumber}`
      : ''
    const code = Math.random().toString(36).slice(2, 10).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase()
    const pass = new VisitorPass({
      code,
      visitorName,
      visitorPhone,
      visitorEmail,
      hostAuthUserId,
      hostName,
      hostPhone,
      building,
      flatNumber,
      directions,
      validUntil: new Date(validUntil)
    })
    const saved = await pass.save()
    res.status(201).json({ success: true, pass: saved })
  } catch (error) {
    console.error('❌ Error creating visitor pass:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Get pass by code
app.get('/api/passes/:code', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await VisitorPass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    res.json({ success: true, pass })
  } catch (error) {
    console.error('❌ Error fetching pass:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// List passes (optionally by host)
app.get('/api/passes', async (req, res) => {
  try {
    const { host } = req.query
    const query = host ? { hostAuthUserId: host } : {}
    const passes = await VisitorPass.find(query).sort({ createdAt: -1 })
    res.json({ success: true, passes })
  } catch (error) {
    console.error('❌ Error listing passes:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark pass as used
app.post('/api/passes/:code/use', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await VisitorPass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    if (pass.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Pass is not active' })
    }
    pass.status = 'used'
    pass.updatedAt = new Date()
    const saved = await pass.save()
    res.json({ success: true, pass: saved })
  } catch (error) {
    console.error('❌ Error marking pass used:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Expire a pass (manually revoke/cancel)
app.post('/api/passes/:code/expire', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await VisitorPass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    if (pass.status === 'expired') {
      return res.json({ success: true, pass })
    }
    pass.status = 'expired'
    pass.updatedAt = new Date()
    const saved = await pass.save()
    res.json({ success: true, pass: saved })
  } catch (error) {
    console.error('❌ Error expiring pass:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Generic status update
app.post('/api/passes/:code/status', async (req, res) => {
  try {
    const { code } = req.params
    const { status } = req.body || {}
    if (!['active', 'used', 'expired'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' })
    }
    const pass = await VisitorPass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    pass.status = status
    pass.updatedAt = new Date()
    const saved = await pass.save()
    res.json({ success: true, pass: saved })
  } catch (error) {
    console.error('❌ Error updating pass status:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== ANNOUNCEMENT API ROUTES ====================

// Upload announcement image endpoint
app.post('/api/announcements/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      })
    }

    const filePath = `/uploads/${req.file.filename}`
    const publicUrl = `http://localhost:3002${filePath}`

    console.log('✅ Announcement image uploaded:', req.file.filename)
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        path: filePath,
        publicUrl: publicUrl,
        size: req.file.size
      },
      message: 'Image uploaded successfully'
    })
  } catch (error) {
    console.error('❌ Error uploading announcement image:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Create a new announcement
app.post('/api/announcements', async (req, res) => {
  try {
    const announcementData = req.body
    const announcement = new Announcement(announcementData)
    const savedAnnouncement = await announcement.save()
    
    console.log('✅ Announcement created:', savedAnnouncement._id)

    // Send notification to targeted users
    try {
      const notification = new Notification({
        title: 'New Announcement',
        message: `${savedAnnouncement.title}: ${savedAnnouncement.content.substring(0, 100)}...`,
        type: 'info',
        priority: savedAnnouncement.priority === 'urgent' ? 'urgent' : savedAnnouncement.priority === 'high' ? 'high' : 'medium',
        targetRoles: savedAnnouncement.targetRoles,
        senderId: savedAnnouncement.adminId,
        senderName: savedAnnouncement.adminName || 'Admin',
        metadata: {
          actionUrl: '/announcements'
        }
      })
      await notification.save()
      console.log('✅ Announcement notification sent')
    } catch (notifError) {
      console.error('❌ Error sending announcement notification:', notifError)
    }
    
    res.status(201).json({ success: true, data: savedAnnouncement })
  } catch (error) {
    console.error('❌ Error creating announcement:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Get all announcements with optional filtering
app.get('/api/announcements', async (req, res) => {
  try {
    const { 
      limit = 100, 
      page = 1, 
      type, 
      priority, 
      isActive = true, 
      targetRole,
      search 
    } = req.query
    
    let query = {}
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true'
    }
    
    // Filter by type
    if (type && type !== 'all') {
      query.type = type
    }
    
    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority
    }
    
    // Filter by target role - admins see all announcements, others see only targeted ones
    if (targetRole && targetRole !== 'admin') {
      query.targetRoles = { $in: [targetRole] }
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ]
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
    
    const total = await Announcement.countDocuments(query)
    
    res.json({
      success: true,
      data: announcements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('❌ Error fetching announcements:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get announcement statistics (must come before /:id route)
app.get('/api/announcements/stats', async (req, res) => {
  try {
    const [
      totalCount,
      activeCount,
      typeStats,
      priorityStats
    ] = await Promise.all([
      Announcement.countDocuments(),
      Announcement.countDocuments({ isActive: true }),
      Announcement.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Announcement.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ])
    
    const typeCounts = typeStats.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
    const priorityCounts = priorityStats.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
    
    res.json({
      success: true,
      data: {
        totalAnnouncements: totalCount,
        activeAnnouncements: activeCount,
        inactiveAnnouncements: totalCount - activeCount,
        typeCounts,
        priorityCounts
      }
    })
  } catch (error) {
    console.error('❌ Error fetching announcement stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get announcement by ID
app.get('/api/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' })
    }
    res.json({ success: true, data: announcement })
  } catch (error) {
    console.error('❌ Error fetching announcement:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update announcement
app.put('/api/announcements/:id', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() }
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' })
    }
    res.json({ success: true, data: announcement })
  } catch (error) {
    console.error('❌ Error updating announcement:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Delete announcement
app.delete('/api/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id)
    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' })
    }
    res.json({ success: true, message: 'Announcement deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting announcement:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== NOTIFICATION API ROUTES ====================

// Health check for notifications
app.get('/api/notifications/health', (req, res) => {
  res.json({ success: true, message: 'Notification service is running' })
})

// Email helper for sending notification emails via email-server
const EMAIL_SERVER_URL = 'http://localhost:3001'
const sendEmailViaServer = async (to, subject, html, text) => {
  try {
    const response = await fetch(`${EMAIL_SERVER_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, text })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to send email')
    return { success: true, messageId: result.messageId }
  } catch (err) {
    console.error('❌ Email send error:', err.message)
    return { success: false, error: err.message }
  }
}

// Create a new notification
app.post('/api/notifications', async (req, res) => {
  try {
    const notificationData = req.body
    const notification = new Notification(notificationData)
    const savedNotification = await notification.save()
    
    console.log('✅ Notification created:', savedNotification._id)

    // Optional: email fan-out when metadata includes emailBroadcast=true or type is bill/complaint
    try {
      const shouldEmail = notificationData.emailBroadcast === true || ['bill', 'complaint'].includes(notificationData.type)
      if (shouldEmail) {
        // Resolve recipient emails
        let recipients = []
        if (Array.isArray(notificationData.targetUsers) && notificationData.targetUsers.length > 0) {
          // Look up residents by authUserId when possible
          recipients = await Resident.find({ authUserId: { $in: notificationData.targetUsers } }, { email: 1 })
            .then(rows => rows.map(r => r.email).filter(Boolean))
        }
        if ((!recipients || recipients.length === 0) && Array.isArray(notificationData.targetRoles) && notificationData.targetRoles.length > 0) {
          // For residents role, send to all resident emails
          if (notificationData.targetRoles.includes('resident')) {
            const rows = await Resident.find({ email: { $ne: '' } }, { email: 1 })
            recipients = rows.map(r => r.email).filter(Boolean)
          }
          // For admin/security/staff you might have separate collections; skip if unavailable
        }

        if (recipients && recipients.length > 0) {
          const subject = `Notification: ${notificationData.title}`
          const text = [
            notificationData.message,
            notificationData.metadata?.actionUrl ? `Action: ${notificationData.metadata.actionUrl}` : ''
          ].filter(Boolean).join('\n\n')
          // Fan-out with small concurrency to avoid blocking
          const chunks = recipients
          const results = await Promise.allSettled(chunks.map(email => sendEmailViaServer(email, subject, null, text)))
          const sent = results.filter(r => r.status === 'fulfilled' && r.value?.success).length
          console.log(`📧 Notification email fan-out: ${sent}/${recipients.length} sent`)
        }
      }
    } catch (mailErr) {
      console.warn('⚠️ Notification email fan-out skipped/failed:', mailErr.message)
    }
    res.json({ success: true, data: savedNotification })
  } catch (error) {
    console.error('❌ Error creating notification:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Send bulk notifications
app.post('/api/notifications/bulk', async (req, res) => {
  try {
    const { title, message, type, priority, targetUsers, targetRoles, senderId, senderName, metadata } = req.body
    
    if (!targetUsers && !targetRoles) {
      return res.status(400).json({ success: false, error: 'Either targetUsers or targetRoles must be specified' })
    }

    const notifications = []
    
    // Create notifications for specific users (takes precedence over roles)
    if (targetUsers && targetUsers.length > 0) {
      for (const userId of targetUsers) {
        const notification = new Notification({
          title,
          message,
          type,
          priority,
          targetUsers: [userId],
          senderId,
          senderName,
          metadata
        })
        notifications.push(notification)
      }
    }
    
    // Create notifications for roles ONLY if no specific users provided
    if ((!targetUsers || targetUsers.length === 0) && targetRoles && targetRoles.length > 0) {
      for (const role of targetRoles) {
        const notification = new Notification({
          title,
          message,
          type,
          priority,
          targetRoles: [role],
          senderId,
          senderName,
          metadata
        })
        notifications.push(notification)
      }
    }

    const savedNotifications = await Notification.insertMany(notifications)
    
    console.log('✅ Bulk notifications created:', savedNotifications.length)
    res.json({ 
      success: true, 
      data: { 
        sentCount: savedNotifications.length,
        notifications: savedNotifications 
      } 
    })
  } catch (error) {
    console.error('❌ Error creating bulk notifications:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get notifications for a specific user
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { limit = 50, offset = 0, unreadOnly = false, role } = req.query
    
    let query = {
      $or: [
        { targetUsers: userId }
      ]
    }

    // Include role-based notifications ONLY for the caller's role if provided
    if (role) {
      query.$or.push({ targetRoles: role })
    }
    
    if (unreadOnly === 'true') {
      query.isRead = false
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('metadata.billId')
      .populate('metadata.complaintId')
      .populate('metadata.visitorId')
    
    const totalCount = await Notification.countDocuments(query)
    const unreadCount = await Notification.countDocuments({ ...query, isRead: false })
    
    res.json({ 
      success: true, 
      data: { 
        notifications, 
        totalCount, 
        unreadCount,
        hasMore: (parseInt(offset) + notifications.length) < totalCount
      } 
    })
  } catch (error) {
    console.error('❌ Error fetching user notifications:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get notification statistics for a user
app.get('/api/notifications/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params
    
    const query = {
      $or: [
        { targetUsers: userId },
        { targetRoles: { $exists: true, $ne: [] } }
      ]
    }
    
    const [totalCount, unreadCount, byType, byPriority] = await Promise.all([
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, isRead: false }),
      Notification.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Notification.aggregate([
        { $match: query },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ])
    
    res.json({ 
      success: true, 
      data: { 
        totalCount, 
        unreadCount,
        byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
      } 
    })
  } catch (error) {
    console.error('❌ Error fetching notification stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params
    
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    )
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' })
    }
    
    res.json({ success: true, data: notification })
  } catch (error) {
    console.error('❌ Error marking notification as read:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark all notifications as read for a user
app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params
    
    const query = {
      $or: [
        { targetUsers: userId },
        { targetRoles: { $exists: true, $ne: [] } }
      ],
      isRead: false
    }
    
    const result = await Notification.updateMany(
      query,
      { isRead: true, readAt: new Date() }
    )
    
    res.json({ 
      success: true, 
      data: { 
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`
      } 
    })
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete notification
app.delete('/api/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params
    
    const notification = await Notification.findByIdAndDelete(notificationId)
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' })
    }
    
    res.json({ success: true, data: { message: 'Notification deleted successfully' } })
  } catch (error) {
    console.error('❌ Error deleting notification:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MongoDB API server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔔 Notification service: http://localhost:${PORT}/api/notifications/health`)
})

export default app