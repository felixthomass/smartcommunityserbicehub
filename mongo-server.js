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
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://smartcommunityserbicehub.vercel.app'
  ],
  credentials: true
}))
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/community-service'

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
  expectedExitTime: { type: Date },
  status: { type: String, default: 'checked_in', enum: ['checked_in', 'checked_out'] },
  documentPhoto: { type: String }, // Supabase Storage URL for uploaded document
  documentPath: { type: String }, // Supabase Storage path for cleanup
  securityOfficer: { type: String, required: true },
  notes: { type: String },
  vehicleNumber: { type: String },
  passGenerated: { type: Boolean, default: false },
  passCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Update the updatedAt field before saving
visitorLogSchema.pre('save', function (next) {
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

residentSchema.pre('save', function (next) {
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
serviceRequestSchema.pre('save', function (next) { this.updatedAt = Date.now(); next() })
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


// ===== Visitor Analytics route =====
app.get('/api/security/visitor-analytics', async (req, res) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    // Normalise entryTime field (may be string or Date)
    const normalise = [
      { $addFields: { entryAt: { $ifNull: ['$entryTime', '$createdAt'] } } },
      { $addFields: { entryAt: { $cond: [{ $eq: [{ $type: '$entryAt' }, 'string'] }, { $toDate: '$entryAt' }, '$entryAt'] } } }
    ]

    // --- Summary stats ---
    const summaryAgg = await VisitorLog.aggregate([
      ...normalise,
      { $match: { entryAt: { $gte: startOfDay } } },
      {
        $group: {
          _id: null,
          totalToday:     { $sum: 1 },
          currentlyInside: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
          checkedOut:      { $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] } },
          lateVisitors:    { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'checked_in'] },
                    { $gt: [{ $ifNull: ['$expectedExitTime', new Date(8640000000000000)] }, 0] },
                    { $lt: ['$expectedExitTime', now] }
                  ] 
                }, 
                1, 0 
              ] 
            } 
          }
        }
      }
    ])
    const summary = summaryAgg[0] || { totalToday: 0, currentlyInside: 0, checkedOut: 0, lateVisitors: 0 }

    // --- Hourly activity (0-23) ---
    const hourlyAgg = await VisitorLog.aggregate([
      ...normalise,
      { $match: { entryAt: { $gte: startOfDay } } },
      { $group: { _id: { $hour: '$entryAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } }
    ])
    const hourlyMap = {}
    hourlyAgg.forEach(h => { hourlyMap[h._id] = h.count })
    const formatHour = (h) => {
      if (h === 0) return '12 AM'
      if (h < 12) return `${h} AM`
      if (h === 12) return '12 PM'
      return `${h - 12} PM`
    }
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: formatHour(i),
      count: hourlyMap[i] || 0
    }))

    // Peak hour
    let peakHour = 0
    let peakCount = 0
    hourlyActivity.forEach(h => { if (h.count > peakCount) { peakCount = h.count; peakHour = h.hour } })
    const peakHourLabel = peakCount > 0
      ? `${formatHour(peakHour)} – ${formatHour((peakHour + 1) % 24)}`
      : 'No visitors yet'

    // --- Most visited flats (top 5) ---
    const flatAgg = await VisitorLog.aggregate([
      ...normalise,
      { $match: { entryAt: { $gte: startOfDay } } },
      { $group: { _id: '$hostFlat', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])
    const mostVisitedFlats = flatAgg.map(f => ({ flat: f._id || 'Unknown', count: f.count }))

    // --- Visitor type distribution (by purpose field) ---
    const typeAgg = await VisitorLog.aggregate([
      ...normalise,
      { $match: { entryAt: { $gte: startOfDay } } },
      { $group: {
          _id: {
            $toLower: {
              $cond: [
                { $or: [{ $eq: ['$purpose', null] }, { $eq: ['$purpose', ''] }] },
                'other',
                '$purpose'
              ]
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])
    const visitorTypeDistribution = typeAgg.map(t => ({ type: t._id || 'other', count: t.count }))

    res.json({
      success: true,
      data: {
        totalToday:              summary.totalToday,
        currentlyInside:         summary.currentlyInside,
        checkedOut:              summary.checkedOut,
        peakHour,
        peakHourLabel,
        hourlyActivity,
        mostVisitedFlats,
        visitorTypeDistribution
      }
    })
  } catch (error) {
    console.error('❌ Error fetching visitor analytics:', error)
    res.status(500).json({ success: false, error: error.message })
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
      { $group: { 
        _id: null, 
        totalVisitors: { $sum: 1 }, 
        checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } }, 
        checkedOut: { $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] } },
        lateVisitors: { 
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $eq: ['$status', 'checked_in'] },
                  { $gt: [{ $ifNull: ['$expectedExitTime', new Date(8640000000000000)] }, 0] },
                  { $lt: ['$expectedExitTime', new Date()] }
                ] 
              }, 
              1, 0 
            ] 
          } 
        }
      } }
    ])
    const result = stats[0] || { totalVisitors: 0, checkedIn: 0, checkedOut: 0, lateVisitors: 0 }
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

billSchema.pre('save', function (next) {
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
  status: { 
    type: String, 
    enum: ['Arrived', 'Waiting Pickup', 'Delivered', 'failed'], 
    default: 'Arrived' 
  },
  arrival_time: { type: Date, default: Date.now },
  delivered_time: { type: Date },
  time_taken: { type: Number }, // in minutes
  notification_sent: { type: Boolean, default: false },
  securityOfficer: { type: String, default: '' },
  proofUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
deliverySchema.pre('save', function (next) { this.updatedAt = Date.now(); next() })
const Delivery = mongoose.model('Delivery', deliverySchema)

// ===== SMART GATE MANAGEMENT SYSTEM MODELS =====

// Worker Schema
const workerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  type: { type: String, enum: ['maid', 'servant', 'driver', 'other'], default: 'maid' },
  assignedFlats: [String],
  accessTime: {
    from: { type: String, default: '08:00' },
    to: { type: String, default: '20:00' }
  },
  faceImage: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const Worker = mongoose.model('Worker', workerSchema)

// Staff Schema
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  shift: { type: String, enum: ['Morning', 'Afternoon', 'Night'], default: 'Morning' },
  faceImage: { type: String },
  faceDescriptor: { type: [Number], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const Staff = mongoose.model('Staff', staffSchema)

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { type: String, enum: ['present', 'late', 'absent'], default: 'present' },
  photo: { type: String }
}, { timestamps: true })

const Attendance = mongoose.model('Attendance', attendanceSchema)

// EntryLog Schema
const entryLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['worker', 'staff', 'visitor', 'delivery'], required: true },
  personId: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String, required: true },
  time: { type: Date, default: Date.now },
  photo: { type: String },
  status: { type: String, enum: ['approved', 'rejected'], default: 'approved' },
  notes: { type: String }
}, { timestamps: true })

const EntryLog = mongoose.model('EntryLog', entryLogSchema)

// Emergency Alert Schema
const emergencyAlertSchema = new mongoose.Schema({
  emergencyType: { type: String, required: true },
  location: { type: String },
  description: { type: String },
  reportedBy: { type: String },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
  status: { type: String, enum: ['active', 'resolved'], default: 'active' }
}, { timestamps: true })

const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema)

// Emergency Request Schema (Guard Leave)
const emergencyRequestSchema = new mongoose.Schema({
  securityId: { type: String, required: true },
  name: { type: String },
  reason: { type: String },
  message: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true })

const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema)


// Create a delivery log
app.post('/api/deliveries', async (req, res) => {
  try {
    const payload = req.body
    const delivery = new Delivery({
      ...payload,
      status: 'Arrived',
      arrival_time: new Date()
    })
    const saved = await delivery.save()

    // Notify the resident (role-based) and targeted by building-flat identifier if available
    try {
      const resident = await Resident.findOne({ building: payload.building, flatNumber: payload.flatNumber })
      const targetUsers = resident?.authUserId ? [resident.authUserId] : []
      const notification = new Notification({
        title: '📦 Delivery Arrived',
        message: `Your ${payload.vendor} package for Flat ${payload.building}-${payload.flatNumber} has arrived at the gate.`,
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
      console.warn('Initial delivery notification failed:', notifErr.message)
    }

    res.status(201).json({ success: true, data: saved })
  } catch (error) {
    console.error('❌ Error creating delivery:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Create bulk delivery logs
app.post('/api/deliveries/bulk', async (req, res) => {
  try {
    const { deliveries } = req.body
    if (!deliveries || !Array.isArray(deliveries)) {
      return res.status(400).json({ success: false, error: 'Deliveries array is required' })
    }

    const processedDeliveries = deliveries.map(d => ({
      ...d,
      status: 'Arrived',
      arrival_time: new Date()
    }))

    const saved = await Delivery.insertMany(processedDeliveries)

    // Send notifications for each delivery (background)
    saved.forEach(async (delivery) => {
      try {
        const resident = await Resident.findOne({ building: delivery.building, flatNumber: delivery.flatNumber })
        const targetUsers = resident?.authUserId ? [resident.authUserId] : []
        const notification = new Notification({
          title: '📦 Delivery Arrived',
          message: `Your ${delivery.vendor} package for Flat ${delivery.building}-${delivery.flatNumber} has arrived at the gate.`,
          type: 'delivery',
          priority: 'medium',
          targetUsers,
          targetRoles: [],
          senderId: 'security',
          senderName: delivery.securityOfficer || 'Security',
          metadata: { deliveryId: delivery._id, actionUrl: '/deliveries' }
        })
        await notification.save()
      } catch (notifErr) {
        console.warn(`Bulk delivery notification failed for ${delivery._id}:`, notifErr.message)
      }
    })

    res.status(201).json({ success: true, count: saved.length, data: saved })
  } catch (error) {
    console.error('❌ Error creating bulk deliveries:', error)
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
      const start = new Date(date); start.setHours(0, 0, 0, 0)
      const end = new Date(date); end.setDate(end.getDate() + 1); end.setHours(0, 0, 0, 0)
      query.deliveryTime = { $gte: start, $lt: end }
    }
    const docs = await Delivery.find(query).sort({ deliveryTime: -1 }).limit(parseInt(limit)).skip(parseInt(offset))
    res.json({ success: true, data: docs })
  } catch (error) {
    console.error('❌ Error listing deliveries:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Notify resident about delivery
app.put('/api/deliveries/:id/notify', async (req, res) => {
  try {
    const { id } = req.params
    const doc = await Delivery.findByIdAndUpdate(id, { 
      status: 'Waiting Pickup', 
      notification_sent: true,
      updatedAt: new Date() 
    }, { new: true })
    
    if (!doc) return res.status(404).json({ success: false, error: 'Delivery not found' })
    
    // Add a specialized notification for "Waiting Pickup" if needed
    // ... existing notification logic is already in POST, but we can add another one here
    
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error notifying resident:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Complete delivery (Delivered state)
app.put('/api/deliveries/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const { status = 'Delivered' } = req.body
    
    const delivery = await Delivery.findById(id)
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery not found' })
    
    const delivered_time = new Date()
    const arrival_time = delivery.arrival_time || delivery.createdAt
    const time_taken = Math.round((delivered_time - arrival_time) / (1000 * 60)) // diff in minutes
    
    const doc = await Delivery.findByIdAndUpdate(id, { 
      status, 
      delivered_time,
      time_taken,
      updatedAt: new Date() 
    }, { new: true })
    
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error completing delivery:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update delivery status (General purpose)
app.put('/api/deliveries/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, acceptedBy } = req.body
    const update = { status, updatedAt: new Date() }
    
    if (status === 'Delivered' || status === 'delivered') {
      const delivery = await Delivery.findById(id)
      if (delivery) {
        update.delivered_time = new Date()
        const arrival = delivery.arrival_time || delivery.createdAt
        update.time_taken = Math.round((update.delivered_time - arrival) / (1000 * 60))
        update.status = 'Delivered'
      }
    }
    
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

// Delete a delivery log
app.delete('/api/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params
    const doc = await Delivery.findByIdAndDelete(id)
    if (!doc) return res.status(404).json({ success: false, error: 'Delivery not found' })
    res.json({ success: true, message: 'Delivery log deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting delivery:', error)
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

// ===== GATE MANAGEMENT SYSTEM APIs =====

// Helper to determine late status
const getAttendanceStatus = (checkInTime, shift) => {
  const time = new Date(checkInTime)
  const hours = time.getHours()
  const minutes = time.getMinutes()
  const totalMinutes = hours * 60 + minutes

  // Shift start times (in minutes from midnight)
  const morningStart = 8 * 60 // 08:00
  const afternoonStart = 14 * 60 // 14:00
  const nightStart = 22 * 60 // 22:00

  let limit = morningStart
  if (shift === 'Afternoon') limit = afternoonStart
  if (shift === 'Night') limit = nightStart

  return totalMinutes > limit + 15 ? 'late' : 'present'
}

const euclideanDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return 1.0
  return Math.sqrt(a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0))
}

// 1. Worker Entry
app.post('/api/entry/worker', upload.single('photo'), async (req, res) => {
  try {
    const { phone, name } = req.body
    const photo = req.file ? `/uploads/${req.file.filename}` : null
    const photoUrl = photo ? `http://localhost:3002${photo}` : null

    // Find worker by phone or name
    let worker = await Worker.findOne({ $or: [{ phone }, { name: { $regex: name || '', $options: 'i' } }] })
    
    if (!worker) {
      // Create a temporary log for unidentified worker
      const log = new EntryLog({
        type: 'worker',
        name: name || 'Unknown Worker',
        photo: photoUrl,
        status: 'rejected',
        notes: 'Worker not found in database'
      })
      await log.save()
      return res.status(404).json({ success: false, error: 'Worker not found', log })
    }

    if (!worker.isActive) {
      const log = new EntryLog({
        type: 'worker',
        personId: worker._id,
        name: worker.name,
        photo: photoUrl,
        status: 'rejected',
        notes: 'Worker status is inactive'
      })
      await log.save()
      return res.status(403).json({ success: false, error: 'Worker is inactive', log })
    }

    const log = new EntryLog({
      type: 'worker',
      personId: worker._id,
      name: worker.name,
      photo: photoUrl,
      status: 'approved'
    })
    await log.save()

    res.json({ success: true, data: worker, log })
  } catch (error) {
    console.error('❌ Error in worker entry:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 2. Staff Entry (Face Attendance)
app.post('/api/entry/staff', upload.single('photo'), async (req, res) => {
  try {
    const { staffId, name } = req.body
    const photo = req.file ? `/uploads/${req.file.filename}` : null
    const photoUrl = photo ? `http://localhost:3002${photo}` : null

    let query = {}
    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) query._id = staffId
    else if (name) query.name = { $regex: name, $options: 'i' }
    else return res.status(400).json({ success: false, error: 'Staff identification required' })

    const staff = await Staff.findOne(query)
    
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' })
    }

    const today = new Date().toISOString().split('T')[0]
    let attendance = await Attendance.findOne({ staffId: staff._id, date: today })

    if (!attendance) {
      // Check-In
      const status = getAttendanceStatus(new Date(), staff.shift)
      attendance = new Attendance({
        staffId: staff._id,
        date: today,
        checkIn: new Date(),
        status,
        photo: photoUrl
      })
      await attendance.save()
      
      const log = new EntryLog({
        type: 'staff',
        personId: staff._id,
        name: staff.name,
        photo: photoUrl,
        status: 'approved',
        notes: `Check-in marked as ${status}`
      })
      await log.save()
      
      return res.json({ success: true, type: 'check-in', data: attendance, status, staff })
    } else if (!attendance.checkOut) {
      // Check-Out
      attendance.checkOut = new Date()
      await attendance.save()
      
      const log = new EntryLog({
        type: 'staff',
        personId: staff._id,
        name: staff.name,
        photo: photoUrl,
        status: 'approved',
        notes: 'Check-out marked'
      })
      await log.save()
      
      return res.json({ success: true, type: 'check-out', data: attendance, staff })
    } else {
      return res.status(400).json({ success: false, error: 'Already checked out for today' })
    }
  } catch (error) {
    console.error('❌ Error in staff entry:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 3. Get Attendance Logs
app.get('/api/attendance', async (req, res) => {
  try {
    const { date } = req.query
    const query = date ? { date } : {}
    const logs = await Attendance.find(query).populate('staffId').sort({ createdAt: -1 })
    res.json({ success: true, data: logs })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 4. Get Entry Logs
app.get('/api/entry/logs', async (req, res) => {
  try {
    const { type, status, date } = req.query
    const query = {}
    if (type) query.type = type
    if (status) query.status = status
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0)
      const end = new Date(date); end.setHours(23,59,59,999)
      query.time = { $gte: start, $lte: end }
    }
    const logs = await EntryLog.find(query).sort({ time: -1 })
    res.json({ success: true, data: logs })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 5. Activity Feed
app.get('/api/passes/activity', async (req, res) => {
  try {
    const [visitors, alerts, entryLogs] = await Promise.all([
      VisitorLog.find().sort({ createdAt: -1 }).limit(5),
      EmergencyAlert.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5),
      EntryLog.find().sort({ createdAt: -1 }).limit(10)
    ])

    const activities = [
      ...visitors.map(v => ({
        type: 'visitor',
        subject: v.visitorName,
        description: `Entered for flat ${v.hostFlat}`,
        timestamp: v.createdAt,
        meta: v.status
      })),
      ...alerts.map(a => ({
        type: 'alert',
        subject: a.emergencyType.toUpperCase(),
        description: a.description || `Emergency reported at ${a.location}`,
        timestamp: a.createdAt,
        meta: a.severity
      })),
      ...entryLogs.map(l => ({
        type: l.type === 'staff' ? 'staff' : 'visitor',
        subject: l.name,
        description: l.notes || `${l.type} entry ${l.status}`,
        timestamp: l.time,
        meta: l.status
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15)

    res.json({ success: true, activities })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 6. Emergency Alerts
app.post('/api/emergency-alerts', async (req, res) => {
  try {
    const alert = new EmergencyAlert(req.body)
    await alert.save()
    res.status(201).json({ success: true, data: alert })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/emergency-alerts/active', async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ status: 'active' }).sort({ createdAt: -1 })
    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/emergency-requests', async (req, res) => {
  try {
    const doc = new EmergencyRequest(req.body)
    await doc.save()
    res.status(201).json({ success: true, data: doc })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/emergency-requests/guard/:securityId', async (req, res) => {
  try {
    const docs = await EmergencyRequest.find({ securityId: req.params.securityId }).sort({ createdAt: -1 })
    res.json({ success: true, data: docs })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// === FACE RECOGNITION APIs ===
app.post('/api/face/register', async (req, res) => {
  try {
    const { name, descriptor, role, shift } = req.body
    if (!descriptor || descriptor.length !== 128) {
      return res.status(400).json({ success: false, error: 'Invalid face descriptor' })
    }

    let staff = await Staff.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
    if (staff) {
      staff.faceDescriptor = descriptor
      if (role) staff.role = role
      if (shift) staff.shift = shift
      await staff.save()
    } else {
      staff = new Staff({
        name,
        role: role || 'Staff',
        shift: shift || 'Morning',
        faceDescriptor: descriptor
      })
      await staff.save()
    }
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

app.post('/api/face/match', async (req, res) => {
  try {
    const { descriptor } = req.body
    if (!descriptor || descriptor.length !== 128) {
      return res.status(400).json({ success: false, error: 'Invalid face descriptor' })
    }

    const allStaff = await Staff.find({ faceDescriptor: { $exists: true, $ne: [] } })
    let bestMatch = null
    let minDistance = 1.0

    for (const staff of allStaff) {
      const distance = euclideanDistance(descriptor, staff.faceDescriptor)
      if (distance < minDistance) {
        minDistance = distance
        bestMatch = staff
      }
    }

    const MATCH_THRESHOLD = 0.5
    if (bestMatch && minDistance < MATCH_THRESHOLD) {
      // Auto-mark attendance
      const today = new Date().toISOString().split('T')[0]
      let attendance = await Attendance.findOne({ staffId: bestMatch._id, date: today })
      
      let type = 'existing'
      let status = 'present'

      if (!attendance) {
        type = 'check-in'
        status = getAttendanceStatus(new Date(), bestMatch.shift)
        attendance = new Attendance({
          staffId: bestMatch._id,
          date: today,
          checkIn: new Date(),
          status
        })
        await attendance.save()

        await new EntryLog({
          type: 'staff',
          personId: bestMatch._id,
          name: bestMatch.name,
          status: 'approved',
          notes: `Face Recognized: ${bestMatch.name} (Dist: ${minDistance.toFixed(3)}). Check-in marked as ${status}`
        }).save()
      } else if (!attendance.checkOut) {
        type = 'check-out'
        attendance.checkOut = new Date()
        await attendance.save()

        await new EntryLog({
          type: 'staff',
          personId: bestMatch._id,
          name: bestMatch.name,
          status: 'approved',
          notes: `Face Recognized: ${bestMatch.name} (Dist: ${minDistance.toFixed(3)}). Check-out marked.`
        }).save()
      } else {
        return res.json({ matched: true, name: bestMatch.name, alreadyDone: true, distance: minDistance })
      }

      return res.json({ 
        matched: true, 
        name: bestMatch.name, 
        type, 
        status: attendance.status, 
        distance: minDistance 
      })
    }

    res.json({ matched: false, distance: minDistance })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 7. Manage Staff & Workers Helper routes
app.post('/api/gate/workers', async (req, res) => {
  try {
    const worker = new Worker(req.body)
    await worker.save()
    res.json({ success: true, data: worker })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/gate/workers', async (req, res) => {
  try {
    const workers = await Worker.find().sort({ name: 1 })
    res.json({ success: true, data: workers })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/gate/staff', async (req, res) => {
  try {
    const staff = new Staff(req.body)
    await staff.save()
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/gate/staff', async (req, res) => {
  try {
    const staff = await Staff.find().sort({ name: 1 })
    res.json({ success: true, data: staff })
  } catch (error) {
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
    const recentBills = bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
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

// Quick checkout for visitor
app.post('/api/visitors/checkout', async (req, res) => {
  try {
    const { visitor_id } = req.body
    if (!visitor_id) {
      return res.status(400).json({ success: false, error: 'visitor_id is required' })
    }

    const updatedLog = await VisitorLog.findByIdAndUpdate(
      visitor_id,
      { 
        status: 'checked_out', 
        exitTime: new Date(),
        updatedAt: Date.now() 
      },
      { new: true }
    )

    if (!updatedLog) {
      return res.status(404).json({ success: false, error: 'Visitor log not found' })
    }

    console.log('✅ Visitor checked out:', updatedLog._id)
    res.json({
      success: true,
      data: updatedLog,
      message: 'Visitor checked out successfully'
    })
  } catch (error) {
    console.error('❌ Error checking out visitor:', error)
    res.status(500).json({ success: false, error: error.message })
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
          checkedOut: { $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] } },
          lateVisitors: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'checked_in'] },
                    { $gt: [{ $ifNull: ['$expectedExitTime', new Date(8640000000000000)] }, 0] },
                    { $lt: ['$expectedExitTime', new Date()] }
                  ] 
                }, 
                1, 0 
              ] 
            } 
          }
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
    const keyOf = r => r.authUserId || `${(r.email || '').toLowerCase()}|${r.building}|${r.flatNumber}`
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
    console.log('[DEBUG VERIFY MONGO] req.body:', JSON.stringify(req.body))
    const resident = await ResidentEntry.findOne({ email, building, flatNumber })
    console.log('[DEBUG VERIFY MONGO] Resident found:', resident ? 'YES' : 'NO')
    if (resident) console.log('[DEBUG VERIFY MONGO] DB Record:', JSON.stringify({ name: resident.name, aadhar: resident.aadharNumber }))
    if (!resident) return res.status(404).json({ success: false, error: 'Resident not found' })
    const nameMatch = (resident.name || '').toLowerCase().trim() === name.toLowerCase().trim()
    const aadharMatch = (resident.aadharNumber || '').trim() === aadharNumber.trim()
    if (nameMatch && aadharMatch) {
      await ResidentEntry.updateOne({ _id: resident._id }, { verified: true, supabaseUserId })
      return res.json({ success: true, data: { verified: true, resident } })
    }
    
    let reason = 'Details do not match'
    if (!nameMatch) reason += ' (Name mismatch)'
    if (!aadharMatch) reason += ' (Aadhar number mismatch)'
    
    return res.json({ success: true, data: { verified: false, reason } })
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
    const baseReceipt = receipt || `verify_${(supabaseUserId || 'user').slice(-8)}_${Date.now().toString(36)}`
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

complaintSchema.pre('save', function (next) {
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

// Pass Schema for Visitor Access
const passSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  visitorName: { type: String, required: true },
  visitorPhone: { type: String, required: true },
  visitorEmail: { type: String },
  visitorType: { type: String, default: 'Guest' },
  hostAuthUserId: { type: String, required: true },
  hostName: { type: String, default: '' },
  hostPhone: { type: String, default: '' },
  building: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
  directions: { type: String, default: '' },
  validUntil: { type: Date, required: true },
  status: { type: String, default: 'active', enum: ['active', 'used', 'expired', 'rejected'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

passSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

const Pass = mongoose.model('Pass', passSchema)

// Chat schemas
const chatRoomSchema = new mongoose.Schema({
  type: { type: String, enum: ['dm', 'group'], default: 'dm' },
  memberAuthUserIds: { type: [String], index: true },
  name: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
chatRoomSchema.pre('save', function (next) { this.updatedAt = Date.now(); next() })
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

announcementSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

const Announcement = mongoose.model('Announcement', announcementSchema)

// Create a new pass
app.post('/api/passes', async (req, res) => {
  try {
    const { visitorName, visitorPhone, visitorEmail, hostAuthUserId, hostName, hostPhone, building, flatNumber, validUntil } = req.body
    
    // Check required fields
    if (!visitorName || !visitorPhone || !hostAuthUserId) {
      return res.status(400).json({ success: false, error: 'Missing required fields: visitorName, visitorPhone, hostAuthUserId' })
    }

    // Generate simple directions text
    const floor = (flatNumber || '').toString().charAt(0)
    const directionsStr = building && flatNumber
      ? `Enter through Security Gate → Proceed to Building ${building} → Take elevator to Floor ${floor} → Flat ${flatNumber}`
      : ''

    // Generate a professional 6-character code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let c = 'VIS-'
      for (let i = 0; i < 6; i++) {
        c += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return c
    }

    let code = generateCode()
    let existingPass = await Pass.findOne({ code })
    while (existingPass) {
      code = generateCode()
      existingPass = await Pass.findOne({ code })
    }

    const pass = new Pass({
      code,
      visitorName,
      visitorPhone,
      visitorEmail,
      hostAuthUserId,
      hostName,
      hostPhone,
      building,
      flatNumber,
      directions: directionsStr,
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24h
    })
    
    const saved = await pass.save()
    
    // Generate QR code data (access URL)
    const baseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:5173'
    const qrCodeData = `${baseUrl}/visitor/access/${code}`
    
    const passWithQr = {
      ...saved.toObject(),
      qrCode: qrCodeData
    }

    console.log(`✅ Pass created: ${code} for ${visitorName}`)
    res.status(201).json({ success: true, pass: passWithQr })
  } catch (error) {
    console.error('❌ Error creating pass:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Get pass by code
app.get('/api/passes/:code', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await Pass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    res.json({ success: true, data: pass })
  } catch (error) {
    console.error('❌ Error fetching pass:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Alias for get pass by code
app.get('/api/pass/:code', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await Pass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    res.json({ success: true, data: pass })
  } catch (error) {
    console.error('❌ Error fetching pass:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Verify pass (Accept/Reject Entry)
app.post('/api/pass/verify', async (req, res) => {
  try {
    const { code, action, securityOfficer, reason } = req.body
    
    if (!code || !action) {
      return res.status(400).json({ success: false, error: 'Code and action are required' })
    }

    const pass = await Pass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })

    if (action === 'accept') {
      // Check if pass is active and not expired
      if (pass.status !== 'active') {
        return res.status(400).json({ success: false, error: `Pass is already ${pass.status}` })
      }
      if (new Date(pass.validUntil) < new Date()) {
        return res.status(400).json({ success: false, error: 'Pass has expired' })
      }

      // Update pass status
      pass.status = 'used'
      pass.updatedAt = Date.now()
      await pass.save()

      // Create Visitor Log entry
      const visitorLog = new VisitorLog({
        visitorName: pass.visitorName,
        visitorPhone: pass.visitorPhone,
        visitorEmail: pass.visitorEmail,
        idType: 'other',
        idNumber: 'QR_PASS_' + pass.code,
        purpose: pass.directions || 'Visitor Pass Entry',
        hostName: pass.hostName,
        hostFlat: `${pass.building || '-'}-${pass.flatNumber || '-'}`,
        hostPhone: pass.hostPhone || 'N/A',
        hostBuilding: pass.building || '',
        hostAuthUserId: pass.hostAuthUserId,
        securityOfficer: securityOfficer || 'Security',
        status: 'checked_in',
        entryTime: new Date(),
        passGenerated: true,
        passCode: pass.code
      })
      const savedLog = await visitorLog.save()

      // Send notification to resident
      try {
        const notification = new Notification({
          title: '🚪 Visitor Entered',
          message: `${pass.visitorName} has entered the community using Pass ${pass.code}.`,
          type: 'visitor',
          priority: 'medium',
          targetUsers: [pass.hostAuthUserId],
          senderId: 'security',
          senderName: securityOfficer || 'Security',
          metadata: { visitorId: savedLog._id, actionUrl: '/visitor-logs' }
        })
        await notification.save()
      } catch (notifErr) {
        console.warn('Visitor entry notification failed:', notifErr.message)
      }

      return res.json({ success: true, message: 'Entry accepted', log: savedLog })
    } else if (action === 'reject') {
      pass.status = 'rejected'
      pass.updatedAt = Date.now()
      if (reason) {
        pass.directions = (pass.directions || '') + ` (Rejected: ${reason})`
      }
      await pass.save()
      return res.json({ success: true, message: 'Entry rejected', pass })
    } else {
      return res.status(400).json({ success: false, error: 'Invalid action' })
    }
  } catch (error) {
    console.error('❌ Error verifying pass:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Security Activity Feed
app.get('/api/passes/activity', async (req, res) => {
  try {
    // Combine Pass updates and Visitor Logs for a unified feed
    const logs = await VisitorLog.find().sort({ entryTime: -1 }).limit(10)
    const activities = logs.map(log => ({
      _id: log._id,
      type: 'visitor',
      title: log.visitorName,
      description: `${log.status === 'checked_in' ? 'Entered' : 'Exited'} - ${log.hostFlat}`,
      time: log.entryTime || log.exitTime || new Date(),
      status: log.status
    }))
    res.json({ success: true, activities })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get guard's current shift
app.get('/api/security-shifts/guard/:id', async (req, res) => {
  try {
    const shift = await SecurityShift.findOne({ 
      $or: [
        { security_id: req.params.id },
        { 'guards.id': req.params.id }
      ]
    }).sort({ createdAt: -1 })
    
    if (!shift) return res.json({ success: false, error: 'No shift found' })
    
    res.json({ 
      success: true, 
      shift, 
      status: new Date() < new Date(shift.endTime) ? 'On Duty' : 'Shift Ended' 
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// List passes (with advanced filtering)
app.get('/api/passes', async (req, res) => {
  try {
    const { host, search, status, startDate, endDate } = req.query
    let query = {}

    if (host) query.hostAuthUserId = host
    
    if (status && status !== 'all') {
      query.status = status
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { visitorName: searchRegex },
        { visitorPhone: searchRegex },
        { code: searchRegex },
        { flatNumber: searchRegex }
      ]
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        query.createdAt.$lte = end
      }
    }

    const passes = await Pass.find(query).sort({ createdAt: -1 })
    
    // Add qrCode to each pass
    const baseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:5173'
    const passesWithQr = passes.map(p => ({
      ...p.toObject(),
      qrCode: `${baseUrl}/visitor/access/${p.code}`
    }))

    res.json({ success: true, data: passesWithQr })
  } catch (error) {
    console.error('❌ Error listing passes:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete a pass record
app.delete('/api/passes/:code', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await Pass.findOneAndDelete({ code })
    
    if (!pass) {
      return res.status(404).json({ success: false, error: 'Pass not found' })
    }

    console.log(`🗑 Pass deleted: ${code}`)
    res.json({ success: true, message: 'Pass record deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting pass:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Mark pass as used
app.post('/api/passes/:code/use', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await Pass.findOneAndUpdate(
      { code, status: 'active' },
      { status: 'used', updatedAt: Date.now() },
      { new: true }
    )
    if (!pass) return res.status(404).json({ success: false, error: 'Active pass not found or already used' })
    res.json({ success: true, data: pass })
  } catch (error) {
    console.error('❌ Error using pass:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Expire a pass
app.post('/api/passes/:code/expire', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await Pass.findOneAndUpdate(
      { code },
      { status: 'expired', updatedAt: Date.now() },
      { new: true }
    )
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    res.json({ success: true, data: pass })
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
    const pass = await Pass.findOneAndUpdate(
      { code },
      { status, updatedAt: Date.now() },
      { new: true }
    )
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    res.json({ success: true, data: pass })
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