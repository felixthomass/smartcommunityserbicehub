// Combined server – email + MongoDB + all API routes
import express from 'express'
import { createHmac } from 'crypto'
import mongoose from 'mongoose'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// DEBUG LOGGING HELPER
function debugLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(path.join(__dirname, 'debug_output.txt'), line)
}
debugLog('Server started/reloaded')

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://smartcommunityservicehub.vercel.app',
    process.env.VITE_APP_BASE_URL
  ].filter(Boolean),
  credentials: true
}))
app.use(express.json())
app.use((req, res, next) => {
  debugLog(`[REQUEST] ${req.method} ${req.path}`)
  next()
})

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
    console.log('✅ Connected to MongoDB:', MONGODB_URI.split('@').pop()) // Log without credentials
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error)
  })

// ===== EMAIL SERVICE =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'felixthomas8800@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'uyea twdq xles awxm'
  }
})
transporter.verify((error) => {
  if (error) console.error('❌ Email configuration error:', error)
  else console.log('✅ Email server ready to send messages')
})

// Email helper – uses local transporter directly
async function sendEmailViaServer(to, subject, html, text) {
  try {
    const info = await transporter.sendMail({
      from: { name: 'Community Service Platform', address: process.env.GMAIL_USER || 'felixthomas8800@gmail.com' },
      to, subject, html: html || text, text: text || html?.replace(/<[^>]*>/g, '')
    })
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error('❌ Email send error:', err.message)
    return { success: false, error: err.message }
  }
}

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, and content' })
    }
    const mailOptions = {
      from: { name: 'Community Service Platform', address: process.env.GMAIL_USER || 'felixthomas8800@gmail.com' },
      to, subject, html: html || text, text: text || html?.replace(/<[^>]*>/g, '')
    }
    console.log('📧 Sending email to:', to)
    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent:', info.messageId)
    res.json({ success: true, messageId: info.messageId, message: 'Email sent successfully' })
  } catch (error) {
    console.error('❌ Email sending error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/email/health', (req, res) => {
  res.json({ success: true, message: 'Email service is running', timestamp: new Date().toISOString() })
})

// Visitor Log Schema
const visitorLogSchema = new mongoose.Schema({
  visitorName: { type: String, required: true },
  visitorPhone: { type: String, required: true },
  visitorEmail: { type: String },
  idType: { type: String, required: true, enum: ['aadhar', 'pan', 'driving_license', 'passport', 'other'] },
  idNumber: { type: String, required: true },
  purpose: { type: String, required: true },
  visitorType: { type: String, enum: ['guest', 'delivery', 'maintenance', 'cab_driver', 'other'], default: 'guest' },
  hostName: { type: String, required: true },
  hostFlat: { type: String, required: true },
  hostPhone: { type: String, required: true },
  hostBuilding: { type: String, default: '' },
  hostAuthUserId: { type: String, default: '' },
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },
  expectedExitTime: { type: Date },
  status: { type: String, default: 'checked_in', enum: ['checked_in', 'checked_out'] },
  documentPhoto: { type: String }, // Supabase Storage URL for ID proof
  documentPath: { type: String }, // Supabase Storage path for ID proof
  visitorPhoto: { type: String }, // URL for visitor photo
  visitorPhotoPath: { type: String }, // Path for visitor photo
  securityOfficer: { type: String, required: true },
  notes: { type: String },
  vehicleNumber: { type: String },
  passGenerated: { type: Boolean, default: false },
  assigned_to_name: { type: String },
  shift: { type: String }, // morning, afternoon, night
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

// Get building and flat statistics
app.get('/api/buildings/stats', async (req, res) => {
  try {
    // We try ResidentEntry first as it seems to be the main directory for admin
    const stats = await mongoose.model('ResidentEntry').aggregate([
      {
        $group: {
          _id: '$building',
          totalFlats: { $sum: 1 },
          owners: { $sum: { $cond: [{ $eq: ['$isOwner', true] }, 1, 0] } },
          tenants: { $sum: { $cond: [{ $eq: ['$isOwner', false] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ['$verified', true] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ])

    const totalBuildings = stats.length
    const totalFlats = stats.reduce((acc, curr) => acc + curr.totalFlats, 0)
    const verifiedFlats = stats.reduce((acc, curr) => acc + curr.verified, 0)
    const ownerOccupied = stats.reduce((acc, curr) => acc + curr.owners, 0)
    const tenantOccupied = stats.reduce((acc, curr) => acc + curr.tenants, 0)

    res.json({
      success: true,
      data: {
        buildings: stats.map(s => ({
          name: s._id || 'Unknown',
          totalFlats: s.totalFlats,
          owners: s.owners,
          tenants: s.tenants,
          verified: s.verified
        })),
        summary: {
          totalBuildings,
          totalFlats,
          verifiedFlats,
          ownerOccupied,
          tenantOccupied
        }
      }
    })
  } catch (error) {
    console.error('❌ Error fetching building stats:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

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

// Security Staff Schema
const securityStaffSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true, unique: true },
  employee_id: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  emergency_contact: { type: String },
  address: { type: String },
  security_role: { type: String, required: true },
  shift_timing: { type: String, required: true },
  assigned_gate: { type: String },
  employment_status: { type: String, default: 'Active' },
  joining_date: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

securityStaffSchema.pre('save', function (next) {
  this.updated_at = Date.now()
  next()
})

const SecurityStaff = mongoose.model('SecurityStaff', securityStaffSchema)

// Housekeeping Staff Schema
const housekeepingStaffSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true, unique: true },
  employee_id: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  assigned_area: { type: String, required: true }, // e.g., 'A', 'B', 'Lobby'
  shift_timing: { type: String, required: true }, // Morning/Afternoon/Night
  active_tasks_count: { type: Number, default: 0 },
  employment_status: { type: String, default: 'Active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

housekeepingStaffSchema.pre('save', function (next) {
  this.updated_at = Date.now()
  next()
})

const HousekeepingStaff = mongoose.model('HousekeepingStaff', housekeepingStaffSchema)

// Security Shift Schema
const securityShiftSchema = new mongoose.Schema({
  security_id: { type: String, required: true, index: true },
  employee_id: { type: String, required: true },
  guard_name: { type: String, required: true },
  security_role: { type: String, required: true },
  shift_type: { type: String, required: true },
  assigned_gate: { type: String, required: true },
  shift_date: { type: String, required: true }, // YYYY-MM-DD
  start_time: { type: String, required: true }, // HH:mm
  end_time: { type: String, required: true }, // HH:mm
  created_at: { type: Date, default: Date.now }
})
const SecurityShift = mongoose.model('SecurityShift', securityShiftSchema)

// Security Duty Log Schema
const securityDutyLogSchema = new mongoose.Schema({
  security_id: { type: String, required: true },
  shift_id: { type: String, required: true },
  status: { type: String, required: true, enum: ['On Duty', 'Completed'] },
  timestamp: { type: Date, default: Date.now }
})
const SecurityDutyLog = mongoose.model('SecurityDutyLog', securityDutyLogSchema)

// Security Emergency Request Schema
const emergencyRequestSchema = new mongoose.Schema({
  security_id: { type: String, required: true, index: true },
  shift_id: { type: String, required: true },
  employee_id: { type: String, default: '' },
  guard_name: { type: String, default: '' },
  reason: { type: String, required: true },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approved_by: { type: String, default: '' },
  replacement_security_id: { type: String, default: '' }, // new guard assigned on approval
  new_shift_id: { type: String, default: '' },
  requested_at: { type: Date, default: Date.now },
  resolved_at: { type: Date }
})
const SecurityEmergencyRequest = mongoose.model('SecurityEmergencyRequest', emergencyRequestSchema)

// Emergency Alert Schema (Real-time emergencies)
const emergencyAlertSchema = new mongoose.Schema({
  alertType: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, default: '' },
  securityOfficerName: { type: String, required: true },
  gate: { type: String, default: '' }, // Keep for backward compatibility
  time: { type: Date, default: Date.now },
  message: { type: String, default: 'Emergency Alert Triggered' }, // Replaced by description, kept for compat
  status: { type: String, enum: ['active', 'resolved'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
})
const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema)

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
const Pass = mongoose.model('Pass', passSchema)

// Staff Schema (upgraded: multi-angle face descriptors + Supabase user link)
const staffSchema = new mongoose.Schema({
  userId: { type: String, index: true },                 // Supabase user_id UUID
  name: { type: String, required: true },
  role: { type: String, required: true },
  shift: { type: String, enum: ['Morning', 'Afternoon', 'Night', 'General'], default: 'Morning' },
  faceImage: { type: String },
  faceDescriptor: { type: [Number], default: [] },      // legacy single descriptor
  faceDescriptors: { type: [[Number]], default: [] },   // multi-angle descriptors
  faceRegisteredAt: { type: Date },
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

// Worker Schema
const workerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  type: { type: String, enum: ['maid', 'servant', 'driver', 'other'], default: 'maid' },
  assignedFlats: { type: [String], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

const Worker = mongoose.model('Worker', workerSchema)

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Combined API server is running',
    timestamp: new Date().toISOString()
  })
})

// Helper to determine late status
const getAttendanceStatus = (checkInTime, shift) => {
  const time = new Date(checkInTime)
  const hours = time.getHours()
  const minutes = time.getMinutes()
  const totalMinutes = hours * 60 + minutes

  // Shift start times (in minutes from midnight)
  const morningStart = 8 * 60 // 08:00 (Late after 8:15)
  const afternoonStart = 14 * 60 // 14:00 (Late after 14:15)
  const nightStart = 22 * 60 // 22:00 (Late after 22:15)
  const generalStart = 9 * 60 // 09:00 (Late after 09:15)

  let limit = morningStart
  if (shift === 'Afternoon') limit = afternoonStart
  else if (shift === 'Night') limit = nightStart
  else if (shift === 'General') limit = generalStart

  return totalMinutes > limit + 15 ? 'late' : 'present'
}

const euclideanDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return 1.0
  return Math.sqrt(a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0))
}

// === GATE MANAGEMENT SYSTEM APIs ===

// 1. Worker Entry Logic
app.post('/api/entry/worker', upload.single('photo'), async (req, res) => {
  try {
    const { workerId, name } = req.body
    const photo = req.file ? `/uploads/${req.file.filename}` : null
    const photoUrl = photo ? `http://localhost:3002${photo}` : null

    // For demo/simplicity, we just find by workerId if provided or name
    // In real app, this would be a Worker model
    const worker = { name: name || 'Unknown Worker', _id: new mongoose.Types.ObjectId() }

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

// 2. Staff Entry (Manual)
app.post('/api/entry/staff', upload.single('photo'), async (req, res) => {
  try {
    const { staffId, name, action = 'auto' } = req.body
    const photo = req.file ? `/uploads/${req.file.filename}` : null
    const photoUrl = photo ? `http://localhost:3002${photo}` : null

    let query = {}
    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) query._id = staffId
    else if (name) query.name = { $regex: name, $options: 'i' }
    else return res.status(400).json({ success: false, error: 'Staff identification required' })

    const staff = await Staff.findOne(query) || await Staff.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
    
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' })
    }

    const today = new Date().toISOString().split('T')[0]
    let attendance = await Attendance.findOne({ staffId: staff._id, date: today })

    if (action === 'checkout') {
      if (!attendance) {
        return res.status(400).json({ success: false, error: 'No check-in record found for today' })
      }
      if (attendance.checkOut) {
        return res.status(400).json({ success: false, error: 'Already checked out for today' })
      }
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
    }

    // Default or Check-In Flow
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
    } else if (action === 'auto' && !attendance.checkOut) {
      // Fallback auto check-out if action wasn't explicitly provided but check-in already happened
      attendance.checkOut = new Date()
      await attendance.save()
      
      const log = new EntryLog({
        type: 'staff',
        personId: staff._id,
        name: staff.name,
        photo: photoUrl,
        status: 'approved',
        notes: 'Check-out marked (auto)'
      })
      await log.save()
      
      return res.json({ success: true, type: 'check-out', data: attendance, staff })
    } else {
      return res.status(400).json({ success: false, error: 'Already checked in for today (Select Check-Out Mode)' })
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
        subject: a.alertType?.toUpperCase() || 'EMERGENCY',
        description: a.description || `Emergency reported at ${a.location}`,
        timestamp: a.createdAt,
        meta: a.status
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

// getAttendanceStatus consolidated to line 482

// === FACE RECOGNITION APIs (v2 – multi-angle) ===

// Helper: get staff without face data
app.get('/api/staff/no-face', async (req, res) => {
  try {
    const staff = await Staff.find({
      $or: [
        { faceDescriptors: { $size: 0 } },
        { faceDescriptors: { $exists: false } }
      ]
    }, 'name role shift faceDescriptors').sort({ name: 1 })
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Register multiple face descriptors (multi-angle)
app.post('/api/face/register', async (req, res) => {
  try {
    const { staffId, descriptors, descriptor, name, role, shift } = req.body
    if (!staffId || (!descriptors && !descriptor)) {
      return res.status(400).json({ success: false, error: 'Staff ID and descriptors required' })
    }
    // Support both single descriptor (legacy) and array of descriptors
    const newDescriptors = descriptors || [descriptor]

    // Try to find by userId (Supabase UUID) first, then by MongoDB _id
    let staff = await Staff.findOne({ userId: staffId })
    if (!staff) {
      const isObjectId = /^[a-f\d]{24}$/i.test(staffId)
      if (isObjectId) staff = await Staff.findById(staffId)
    }

    if (!staff) {
      // Create new Staff record linked to Supabase userId
      staff = new Staff({
        userId: staffId,
        name: name || 'Staff Member',
        role: role || 'Staff',
        shift: shift || 'Morning',
        faceDescriptors: newDescriptors,
        faceDescriptor: newDescriptors[0] || [],
        faceRegisteredAt: new Date()
      })
    } else {
      staff.faceDescriptors = newDescriptors
      staff.faceDescriptor = newDescriptors[0] || []   // keep legacy field
      staff.faceRegisteredAt = new Date()
      // Keep name/role/shift in sync if provided
      if (name) staff.name = name
      if (role) staff.role = role
      if (shift) staff.shift = shift
    }

    await staff.save()
    res.json({ success: true, message: `Face enrolled with ${newDescriptors.length} angle(s)`, count: newDescriptors.length })
  } catch (error) {
    console.error('❌ Registration error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update face data (replace existing descriptors)
app.put('/api/face/update', async (req, res) => {
  try {
    const { staffId, descriptors, descriptor } = req.body
    if (!staffId || (!descriptors && !descriptor)) {
      return res.status(400).json({ success: false, error: 'Staff ID and descriptors required' })
    }
    const newDescriptors = descriptors || [descriptor]
    // Find by Supabase userId first, then by MongoDB _id
    let staff = await Staff.findOne({ userId: staffId })
    if (!staff) {
      const isObjectId = /^[a-f\d]{24}$/i.test(staffId)
      if (isObjectId) staff = await Staff.findById(staffId)
    }
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' })
    
    staff.faceDescriptors = newDescriptors
    staff.faceDescriptor = newDescriptors[0] || []
    staff.faceRegisteredAt = new Date()
    await staff.save()
    res.json({ success: true, message: 'Face data updated successfully' })
  } catch (error) {
    console.error('❌ Update face error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete face data from staff
app.delete('/api/face/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params
    // Find by Supabase userId first, then by MongoDB _id
    let staff = await Staff.findOne({ userId: staffId })
    if (!staff) {
      const isObjectId = /^[a-f\d]{24}$/i.test(staffId)
      if (isObjectId) staff = await Staff.findById(staffId)
    }
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' })
    
    staff.faceDescriptors = []
    staff.faceDescriptor = []
    staff.faceRegisteredAt = undefined
    await staff.save()
    res.json({ success: true, message: 'Face data deleted' })
  } catch (error) {
    console.error('❌ Delete face error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Match Face + Auto Attendance (compares against ALL stored descriptors)
app.post('/api/face/match', async (req, res) => {
  try {
    const { descriptor, action = 'checkin' } = req.body
    if (!descriptor || descriptor.length !== 128) {
      return res.status(400).json({ success: false, error: 'Invalid face descriptor' })
    }

    // Find all staff that have at least one face descriptor
    const allStaff = await Staff.find({
      $or: [
        { faceDescriptors: { $exists: true, $not: { $size: 0 } } },
        { faceDescriptor: { $exists: true, $ne: [] } }
      ]
    })

    let bestMatch = null
    let minDistance = Infinity
    const MATCH_THRESHOLD = 0.45

    allStaff.forEach(s => {
      // Compare against multi-angle descriptors
      const descriptorsToCheck = (s.faceDescriptors && s.faceDescriptors.length > 0)
        ? s.faceDescriptors
        : (s.faceDescriptor && s.faceDescriptor.length > 0 ? [s.faceDescriptor] : [])

      descriptorsToCheck.forEach(storedDesc => {
        const dist = euclideanDistance(storedDesc, descriptor)
        if (dist < minDistance) {
          minDistance = dist
          bestMatch = s
        }
      })
    })

    if (bestMatch && minDistance < MATCH_THRESHOLD) {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      let attendance = await Attendance.findOne({ staffId: bestMatch._id, date: today })

      if (action === 'checkout') {
        if (!attendance) {
          return res.json({ matched: true, error: 'No Check-In record found for today.', isNew: false, name: bestMatch.name })
        }
        if (attendance.checkOut) {
          return res.json({ matched: true, error: 'Already Checked-Out today.', isNew: false, name: bestMatch.name })
        }
        attendance.checkOut = now
        await attendance.save()
        
        const entry = new EntryLog({
          type: 'staff',
          name: bestMatch.name,
          personId: bestMatch._id,
          status: 'approved',
          notes: `Face matched (dist=${minDistance.toFixed(3)}), marked Check-Out`
        })
        await entry.save()

        return res.json({
          matched: true,
          type: 'checkout',
          name: bestMatch.name,
          role: bestMatch.role,
          shift: bestMatch.shift,
          status: attendance.status,
          confidence: parseFloat((1 - minDistance).toFixed(3)),
          time: now.toLocaleTimeString(),
          isNew: true
        })
      }

      // Default Check-In Flow
      if (!attendance) {
        const status = getAttendanceStatus(now, bestMatch.shift)
        attendance = new Attendance({
          staffId: bestMatch._id,
          date: today,
          checkIn: now,
          status
        })
        await attendance.save()

        const entry = new EntryLog({
          type: 'staff',
          name: bestMatch.name,
          personId: bestMatch._id,
          status: 'approved',
          notes: `Face matched (dist=${minDistance.toFixed(3)}), marked ${status}`
        })
        await entry.save()

        return res.json({
          matched: true,
          type: 'checkin',
          name: bestMatch.name,
          role: bestMatch.role,
          shift: bestMatch.shift,
          status,
          confidence: parseFloat((1 - minDistance).toFixed(3)),
          time: now.toLocaleTimeString(),
          isNew: true
        })
      }

      // Already marked – return existing record
      return res.json({
        matched: true,
        type: 'already',
        name: bestMatch.name,
        role: bestMatch.role,
        shift: bestMatch.shift,
        status: attendance.status,
        confidence: parseFloat((1 - minDistance).toFixed(3)),
        time: attendance.checkIn.toLocaleTimeString(),
        isNew: false
      })
    }

    res.json({ matched: false })
  } catch (error) {
    console.error('❌ Match error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get Attendance Logs
app.get('/api/attendance', async (req, res) => {
  try {
    const { date, role } = req.query
    let query = {}
    if (date) query.date = date

    const logs = await Attendance.find(query).sort({ checkIn: -1 }).lean()
    
    // Fetch all staff from all collections to properly map the names regardless of role
    const sec = await SecurityStaff.find({}, 'name security_role shift_timing').lean()
    const hk = await HousekeepingStaff.find({}, 'name assigned_area shift_timing').lean()
    const generic = await Staff.find({}, 'name role shift').lean()

    const staffMap = {}
    sec.forEach(s => { staffMap[s._id.toString()] = { name: s.name, role: s.security_role || 'Security', shift: s.shift_timing || 'Morning' } })
    hk.forEach(s => { staffMap[s._id.toString()] = { name: s.name, role: 'Housekeeping', shift: s.shift_timing || 'Morning' } })
    generic.forEach(s => { staffMap[s._id.toString()] = { name: s.name, role: s.role || 'Staff', shift: s.shift || 'Morning' } })

    let enrichedLogs = logs.map(log => {
      // Safely extract the ID string whether it is an ObjectId wrapper, populated object, or plain string.
      let staffIdString = '';
      if (log.staffId && typeof log.staffId === 'object') {
        staffIdString = log.staffId._id ? log.staffId._id.toString() : log.staffId.toString();
      } else if (log.staffId) {
        staffIdString = log.staffId.toString();
      }

      const staff = staffMap[staffIdString]

      return {
        _id: log._id,
        staffId: staffIdString,
        date: log.date,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        status: log.status,
        name: staff ? staff.name : (log.staffId?.name || 'Unknown Staff'),
        role: staff ? staff.role : (log.staffId?.role || 'Staff'),
        shift: staff ? staff.shift : (log.staffId?.shift || 'Flexible')
      }
    })

    if (role && role !== 'all') {
      enrichedLogs = enrichedLogs.filter(l => l.role.toLowerCase() === role.toLowerCase())
    }

    res.json({ success: true, data: enrichedLogs })
  } catch (error) {
    console.error('❌ Get attendance error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// === GATE MANAGEMENT HELPER ROUTES ===
app.get('/api/gate/all-staff', async (req, res) => {
  try {
    const sec = await SecurityStaff.find({}, 'name security_role shift_timing')
    const hk = await HousekeepingStaff.find({}, 'name assigned_area shift_timing')
    const generic = await Staff.find({}, 'name role shift faceDescriptor')
    
    // Create a map of staff who have faces registered
    const faceMap = new Map()
    generic.forEach(s => {
      if (s.faceDescriptor && s.faceDescriptor.length > 0) {
        faceMap.set(s._id.toString(), true)
      }
    })

    const unified = [
      ...sec.map(s => ({ 
        _id: s._id, 
        name: s.name, 
        role: s.security_role || 'Security', 
        shift: s.shift_timing || 'Morning',
        hasFace: faceMap.has(s._id.toString())
      })),
      ...hk.map(s => ({ 
        _id: s._id, 
        name: s.name, 
        role: 'Housekeeping', 
        shift: s.shift_timing || 'Morning',
        hasFace: faceMap.has(s._id.toString())
      })),
      ...generic.map(s => ({ 
        _id: s._id, 
        name: s.name, 
        role: s.role, 
        shift: s.shift,
        hasFace: s.faceDescriptor && s.faceDescriptor.length > 0
      }))
    ]
    
    // De-duplicate by ID
    const unique = Array.from(new Map(unified.map(item => [item._id.toString(), item])).values())
    
    res.json({ success: true, data: unique })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
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

app.post('/api/gate/register-worker', async (req, res) => {
  try {
    const worker = new Worker(req.body)
    await worker.save()
    res.json({ success: true, data: worker })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

app.post('/api/gate/register-staff', async (req, res) => {
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
    const staff = await Staff.find()
    res.json({ success: true, data: staff })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== SECURITY STAFF ROUTES =====
app.post('/api/security-staff', async (req, res) => {
  try {
    const payload = req.body || {}
    if (!payload.user_id) return res.status(400).json({ success: false, error: 'user_id is required' })
    const doc = await SecurityStaff.findOneAndUpdate(
      { user_id: payload.user_id },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.status(201).json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error saving security staff:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/security-staff', async (req, res) => {
  try {
    const docs = await SecurityStaff.find().sort({ created_at: -1 })
    res.json({ success: true, data: docs })
  } catch (error) {
    console.error('❌ Error listing security staff:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/security-staff/:userId', async (req, res) => {
  try {
    const doc = await SecurityStaff.findOne({ user_id: req.params.userId })
    if (!doc) return res.status(404).json({ success: false, error: 'Security staff not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error fetching security staff:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/security-staff/:userId', async (req, res) => {
  try {
    const update = { ...req.body, updated_at: new Date() }
    const doc = await SecurityStaff.findOneAndUpdate(
      { user_id: req.params.userId },
      update,
      { new: true }
    )
    if (!doc) return res.status(404).json({ success: false, error: 'Security staff not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error updating security staff:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Endpoint for security staff to update their OWN personal details
app.put('/api/security/profile', async (req, res) => {
  try {
    const payload = req.body || {}
    if (!payload.user_id) return res.status(400).json({ success: false, error: 'user_id is required' })
    
    // Whitelist only specific personal fields
    const updateData = { updated_at: new Date() }
    if (payload.name !== undefined) updateData.name = payload.name
    if (payload.phone_number !== undefined) updateData.phone = payload.phone_number
    if (payload.emergency_contact !== undefined) updateData.emergency_contact = payload.emergency_contact
    if (payload.address !== undefined) updateData.address = payload.address

    const doc = await SecurityStaff.findOneAndUpdate(
      { user_id: payload.user_id },
      { $set: updateData },
      { new: true }
    )
    if (!doc) return res.status(404).json({ success: false, error: 'Profile not found' })
    
    // Make sure we optionally update the name in Supabase auth and staff_users if needed?
    // Actually, name is fine just updating in security schema, or we can update Supabase too if they change name.
    
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error updating security personal profile:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/security-staff/:userId', async (req, res) => {
  try {
    const doc = await SecurityStaff.findOneAndDelete({ user_id: req.params.userId })
    if (!doc) return res.status(404).json({ success: false, error: 'Security staff not found' })
    res.json({ success: true, message: 'Deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting security staff:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== HOUSEKEEPING STAFF ROUTES =====
app.post('/api/housekeeping-staff', async (req, res) => {
  try {
    const payload = req.body || {}
    if (!payload.user_id) return res.status(400).json({ success: false, error: 'user_id is required' })
    const doc = await HousekeepingStaff.findOneAndUpdate(
      { user_id: payload.user_id },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    res.status(201).json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error saving housekeeping staff:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/housekeeping-staff', async (req, res) => {
  try {
    const docs = await HousekeepingStaff.find().sort({ created_at: -1 })
    res.json({ success: true, data: docs })
  } catch (error) {
    console.error('❌ Error listing housekeeping staff:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/housekeeping-staff/:userId', async (req, res) => {
  try {
    const doc = await HousekeepingStaff.findOne({ user_id: req.params.userId })
    if (!doc) return res.status(404).json({ success: false, error: 'Housekeeping staff not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error fetching housekeeping staff:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== SECURITY SHIFT ROUTES =====
app.post('/api/security-shifts', async (req, res) => {
  try {
    const shift = new SecurityShift(req.body)
    await shift.save()
    res.status(201).json({ success: true, data: shift })
  } catch (error) {
    console.error('❌ Error creating security shift:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/admin/security-shifts', async (req, res) => {
  try {
    const shifts = await SecurityShift.find().sort({ shift_date: -1, start_time: 1 })
    res.json({ success: true, data: shifts })
  } catch (error) {
    console.error('❌ Error listing all security shifts:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/security-shifts/:security_id', async (req, res) => {
  try {
    const shifts = await SecurityShift.find({ security_id: req.params.security_id }).sort({ shift_date: -1, start_time: 1 })
    res.json({ success: true, data: shifts })
  } catch (error) {
    console.error('❌ Error getting security shifts for user:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/security-shifts/:id', async (req, res) => {
  try {
    const shift = await SecurityShift.findByIdAndDelete(req.params.id)
    if (!shift) return res.status(404).json({ success: false, error: 'Shift not found' })
    res.json({ success: true, message: 'Shift deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting security shift:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})


app.post('/api/security-duty-logs', async (req, res) => {
  try {
    const log = new SecurityDutyLog(req.body)
    await log.save()
    res.status(201).json({ success: true, data: log })
  } catch (error) {
    console.error('❌ Error logging duty log:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/api/security-duty-logs/:shift_id', async (req, res) => {
  try {
    const logs = await SecurityDutyLog.find({ shift_id: req.params.shift_id }).sort({ timestamp: 1 })
    res.json({ success: true, data: logs })
  } catch (error) {
    console.error('❌ Error getting duty logs:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== EMERGENCY REQUEST ROUTES =====

// Guard: create emergency leave request
app.post('/api/emergency-requests', async (req, res) => {
  try {
    const { security_id, shift_id, reason, message, employee_id, guard_name } = req.body
    if (!security_id || !shift_id || !reason) {
      return res.status(400).json({ success: false, error: 'security_id, shift_id and reason are required' })
    }
    // Prevent duplicate pending request for same shift
    const existing = await SecurityEmergencyRequest.findOne({ security_id, shift_id, status: 'pending' })
    if (existing) {
      return res.status(409).json({ success: false, error: 'You already have a pending request for this shift.' })
    }
    const doc = new SecurityEmergencyRequest({ security_id, shift_id, reason, message, employee_id, guard_name })
    await doc.save()
    res.status(201).json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error creating emergency request:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Guard: view their own requests
app.get('/api/emergency-requests/guard/:security_id', async (req, res) => {
  try {
    const docs = await SecurityEmergencyRequest.find({ security_id: req.params.security_id }).sort({ requested_at: -1 })
    res.json({ success: true, data: docs })
  } catch (error) {
    console.error('❌ Error fetching guard emergency requests:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Admin: view all emergency requests
app.get('/api/admin/emergency-requests', async (req, res) => {
  try {
    const { status } = req.query
    const query = status && status !== 'all' ? { status } : {}
    const docs = await SecurityEmergencyRequest.find(query).sort({ requested_at: -1 })
    res.json({ success: true, data: docs })
  } catch (error) {
    console.error('❌ Error fetching all emergency requests:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Admin: approve — optionally assign replacement guard
app.put('/api/emergency-requests/:id/approve', async (req, res) => {
  try {
    const { approved_by, replacement_security_id } = req.body
    const doc = await SecurityEmergencyRequest.findById(req.params.id)
    if (!doc) return res.status(404).json({ success: false, error: 'Request not found' })

    doc.status = 'approved'
    doc.approved_by = approved_by || 'Admin'
    doc.resolved_at = new Date()

    // If a replacement guard is specified, create a new shift for them
    if (replacement_security_id) {
      const originalShift = await SecurityShift.findById(doc.shift_id)
      if (originalShift) {
        const newShift = new SecurityShift({
          security_id: replacement_security_id,
          employee_id: req.body.replacement_employee_id || 'N/A',
          shift_type: originalShift.shift_type,
          assigned_gate: originalShift.assigned_gate,
          shift_date: originalShift.shift_date,
          start_time: originalShift.start_time,
          end_time: originalShift.end_time
        })
        await newShift.save()
        
        // Create duty log for replacement to make them "On Duty" immediately
        const dutyLog = new SecurityDutyLog({
          security_id: replacement_security_id,
          shift_id: newShift._id.toString(),
          status: 'On Duty',
          timestamp: new Date()
        })
        await dutyLog.save()

        doc.replacement_security_id = replacement_security_id
        doc.new_shift_id = newShift._id.toString()
      }
    }

    await doc.save()
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error approving emergency request:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Admin: reject
app.put('/api/emergency-requests/:id/reject', async (req, res) => {
  try {
    const { approved_by } = req.body
    const doc = await SecurityEmergencyRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', approved_by: approved_by || 'Admin', resolved_at: new Date() },
      { new: true }
    )
    if (!doc) return res.status(404).json({ success: false, error: 'Request not found' })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('❌ Error rejecting emergency request:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== EMERGENCY ALERT ROUTES =====

// Trigger an emergency alert
app.post('/api/emergency-alerts', async (req, res) => {
  try {
    const { alertType, location, description, securityOfficerName, gate } = req.body
    
    if (!alertType || !location || !securityOfficerName) {
      return res.status(400).json({ success: false, error: 'alertType, location, and securityOfficerName are required' })
    }

    const alert = new EmergencyAlert({
      alertType,
      location,
      description: description || '',
      securityOfficerName,
      gate: gate || location, // Map location to gate if gate is not provided
      message: `${alertType} at ${location}. ${description || ''}`,
      time: new Date(),
      status: 'active'
    })

    await alert.save()

    // 2. Notify Administrators (Optional logic here)
    const admins = await User.find({ role: 'admin' })
    const notifications = admins.map(admin => ({
      userId: admin._id,
      title: `🚨 EMERGENCY: ${alertType}`,
      message: `Type: ${alertType}\nLocation: ${location}\nReported by: ${securityOfficerName}\n\n${description || ''}`,
      type: 'emergency',
      priority: 'urgent',
      senderId: 'system',
      senderName: 'Emergency System'
    }))

    if (notifications.length > 0) {
      await Notification.insertMany(notifications)
    }

    res.status(201).json({ success: true, data: alert })
  } catch (error) {
    console.error('❌ Error triggering emergency alert:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get active emergency alerts
app.get('/api/emergency-alerts/active', async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ status: { $ne: 'resolved' } }).sort({ createdAt: -1 })
    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get all emergency alerts
app.get('/api/emergency-alerts', async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find().sort({ createdAt: -1 }).limit(100)
    res.json({ success: true, data: alerts })
  } catch (error) {
    console.error('❌ Error fetching emergency alerts:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== PASS MANAGEMENT ROUTES =====

// Create a new pass
app.post('/api/passes', async (req, res) => {
  try {
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let c = 'VIS-'
      for (let i = 0; i < 6; i++) {
        c += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return c
    }

    let code = generateCode()
    let existing = await Pass.findOne({ code })
    while (existing) {
      code = generateCode()
      existing = await Pass.findOne({ code })
    }

    const pass = new Pass({
      ...req.body,
      code,
      status: 'active'
    })
    await pass.save()
    const baseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:5173'
    const passWithQr = { ...pass.toObject(), qrCode: `${baseUrl}/visitor/access/${code}` }
    res.status(201).json({ success: true, data: passWithQr })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// Get pass by code
app.get('/api/pass/:code', async (req, res) => {
  try {
    const { code } = req.params
    console.log(`🔍 Fetching pass with code: "${code}"`)
    const pass = await Pass.findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') } })
    if (!pass) {
      console.log(`❌ Pass not found: "${code}"`)
      return res.status(404).json({ success: false, error: 'Pass not found' })
    }
    console.log(`✅ Pass found: "${pass.visitorName}"`)
    res.json({ success: true, data: pass })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Alias for get pass by code
app.get('/api/passes/:code', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await Pass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    res.json({ success: true, data: pass })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Verify pass (Accept/Reject Entry)
app.post('/api/pass/verify', async (req, res) => {
  try {
    const { code, action, securityOfficer, reason } = req.body
    const pass = await Pass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })

    if (action === 'accept') {
      if (pass.status !== 'active') return res.status(400).json({ success: false, error: `Pass is already ${pass.status}` })
      if (new Date(pass.validUntil) < new Date()) return res.status(400).json({ success: false, error: 'Pass has expired' })

      pass.status = 'used'
      pass.updatedAt = Date.now()
      await pass.save()

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
      await visitorLog.save()
      return res.json({ success: true, message: 'Entry accepted' })
    } else if (action === 'reject') {
      pass.status = 'rejected'
      pass.updatedAt = Date.now()
      await pass.save()
      return res.json({ success: true, message: 'Entry rejected' })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Activity Feed
app.get('/api/passes/activity', async (req, res) => {
  try {
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
    const shift = await SecurityShift.findOne({ security_id: req.params.id }).sort({ created_at: -1 })
    if (!shift) return res.json({ success: false, error: 'No shift found' })
    res.json({ success: true, shift, status: 'On Duty' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
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

// Helper to get current housekeeping shift based on server time
function getCurrentShift() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 14) return 'Morning'
  if (hour >= 14 && hour < 22) return 'Afternoon'
  return 'Night'
}

// Automatic Task Assignment logic for Housekeeping
async function autoAssignHousekeepingTask(requestId, category, location) {
  if (category !== 'housekeeping') return null

  try {
    const area = location.split('-')[0].trim()
    const currentShift = getCurrentShift()

    // 1. Try to find active staff in the same area AND on the current shift
    let staff = await HousekeepingStaff.findOne({ 
      assigned_area: area, 
      shift_timing: currentShift,
      employment_status: 'Active' 
    }).sort({ active_tasks_count: 1 })

    // 2. Fallback: Find ANY active staff on the current shift (least workload)
    if (!staff) {
      staff = await HousekeepingStaff.findOne({ 
        shift_timing: currentShift,
        employment_status: 'Active' 
      }).sort({ active_tasks_count: 1 })
    }

    if (staff) {
      const updatedRequest = await ServiceRequest.findByIdAndUpdate(
        requestId, 
        { 
          status: 'assigned', 
          assigned_to: staff.user_id,
          assigned_to_name: staff.name,
          shift: currentShift.toLowerCase()
        },
        { new: true }
      )

      await HousekeepingStaff.findOneAndUpdate(
        { user_id: staff.user_id },
        { $inc: { active_tasks_count: 1 } }
      )

      return staff.user_id
    }
  } catch (error) {
    console.error('❌ Error in auto-assign logic:', error)
  }
  return null
}

// Create service request
app.post('/api/service-requests', async (req, res) => {
  try {
    const payload = req.body || {}
    if (!payload.residentAuthUserId) {
      return res.status(400).json({ success: false, error: 'residentAuthUserId is required' })
    }
    const doc = new ServiceRequest(payload)
    const saved = await doc.save()

    // Trigger Auto-assignment for housekeeping
    if (payload.category === 'housekeeping') {
      const location = `${payload.building}-${payload.flatNumber}`
      await autoAssignHousekeepingTask(saved._id, payload.category, location)
      // Fetch updated document to include assignment
      const updated = await ServiceRequest.findById(saved._id)
      return res.status(201).json({ success: true, data: updated })
    }

    res.status(201).json({ success: true, data: saved })
  } catch (error) {
    console.error('❌ Error creating service request:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// List service requests with optional filters
app.get('/api/service-requests', async (req, res) => {
  try {
    const { residentAuthUserId, status, category, building, flatNumber, search, assigned_to, limit = 100, page = 1 } = req.query
    const query = {}
    if (residentAuthUserId) query.residentAuthUserId = residentAuthUserId
    if (assigned_to) query.assigned_to = assigned_to
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
    
    // Handle workload decrement on completion
    if (update.status === 'completed') {
      const prev = await ServiceRequest.findById(id)
      if (prev && prev.status !== 'completed' && prev.assigned_to) {
        await HousekeepingStaff.findOneAndUpdate(
          { user_id: prev.assigned_to },
          { $inc: { active_tasks_count: -1 }, updated_at: Date.now() }
        )
      }
    }

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
                    { $gt: [{ $ifNull: ['$expectedExitTime', new Date(8640000000000000)] }, 0] }, // Check if exists
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
        lateVisitors:            summary.lateVisitors || 0,
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
                    { $lt: [{ $ifNull: ['$expectedExitTime', new Date(8640000000000000)] }, new Date()] }
                  ] 
                }, 
                1, 0 
              ] 
            } 
          }
        } 
      }
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
  updatedAt: { type: Date, default: Date.now },
  deliveryTime: { type: Date, default: Date.now } // keep for backward compatibility with older queries
})
deliverySchema.pre('save', function (next) { this.updatedAt = Date.now(); next() })
const Delivery = mongoose.model('Delivery', deliverySchema)

// Create a delivery log
app.post('/api/deliveries', async (req, res) => {
  try {
    const payload = req.body
    const delivery = new Delivery({
      ...payload,
      status: 'Arrived',
      arrival_time: new Date(),
      deliveryTime: new Date()
    })
    const saved = await delivery.save()

    // Notify the resident (role-based) and targeted by building-flat identifier if available
    try {
      // Ensure we notify ONLY the selected resident
      const resident = await ResidentEntry.findOne({ building: payload.building, flatNumber: payload.flatNumber })
      const targetUsers = resident?.supabaseUserId ? [resident.supabaseUserId] : []
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
      console.warn('Delivery notification failed:', notifErr.message)
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
      arrival_time: new Date(),
      deliveryTime: new Date()
    }))

    const saved = await Delivery.insertMany(processedDeliveries)

    // Send notifications for each delivery (background)
    saved.forEach(async (delivery) => {
      try {
        const resident = await ResidentEntry.findOne({ building: delivery.building, flatNumber: delivery.flatNumber })
        const targetUsers = resident?.supabaseUserId ? [resident.supabaseUserId] : []
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

// Update delivery status (e.g., accepted by resident)
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
    } else if (status === 'accepted') {
      update.acceptedBy = acceptedBy
    }
    
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

// Get delivery vendors (unique vendors from deliveries + default common ones)
app.get('/api/deliveries/vendors', async (req, res) => {
  try {
    const defaultVendors = [
      'Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Dunzo',
      'BigBasket', 'Blinkit', 'Uber Eats', 'Zepto', 'Other'
    ]

    // Get unique vendors from existing deliveries
    const existingVendors = await Delivery.distinct('vendor')

    // Combine and remove duplicates
    const allVendors = Array.from(new Set([...defaultVendors, ...existingVendors]))

    // Map to the format expected by the frontend
    const vendorData = allVendors.map(vendor => {
      // Find a suitable emoji icon based on vendor name
      let icon = '📦'
      if (vendor.toLowerCase().includes('swiggy')) icon = '🍔'
      else if (vendor.toLowerCase().includes('zomato')) icon = '🍕'
      else if (vendor.toLowerCase().includes('uber eats')) icon = '🍜'
      else if (vendor.toLowerCase().includes('basket')) icon = '🥬'
      else if (vendor.toLowerCase().includes('blinkit')) icon = '⚡'
      else if (vendor.toLowerCase().includes('zepto')) icon = '⏱️'
      else if (vendor.toLowerCase().includes('dunzo')) icon = '🚚'
      else if (vendor.toLowerCase().includes('amazon') || vendor.toLowerCase().includes('flipkart')) icon = '📦'
      else if (vendor.toLowerCase().includes('food')) icon = '🍱'

      return {
        id: vendor.toLowerCase().replace(/\s+/g, '-'),
        name: vendor,
        icon: icon
      }
    })

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
// Get all visitor logs for export (no pagination)
app.get('/api/visitors/export/data', async (req, res) => {
  try {
    const logs = await VisitorLog.find().sort({ entryTime: -1 })
    res.json({
      success: true,
      data: logs
    })
  } catch (error) {
    console.error('❌ Error fetching export data:', error)
    res.status(500).json({ success: false, error: error.message })
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
app.post('/api/visitors/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    const { visitorId, type = 'document' } = req.body
    const filePath = `/uploads/${req.file.filename}`
    const publicUrl = `http://localhost:3002${filePath}`
    
    console.log(`📤 Processing upload of type: ${type} for visitor: ${visitorId}`)

    if (visitorId) {
      // Update existing visitor log with document or visitor photo
      const updateData = { updatedAt: Date.now() }
      
      if (type === 'visitor_photo') {
        updateData.visitorPhoto = publicUrl
        updateData.visitorPhotoPath = filePath
      } else {
        updateData.documentPhoto = publicUrl
        updateData.documentPath = filePath
      }

      await VisitorLog.findByIdAndUpdate(visitorId, updateData)
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
    debugLog(`[DEBUG VERIFY] req.body: ${JSON.stringify(req.body)}`)
    const resident = await ResidentEntry.findOne({ email, building, flatNumber })
    debugLog(`[DEBUG VERIFY] Resident found: ${resident ? 'YES' : 'NO'}`)
    if (resident) debugLog(`[DEBUG VERIFY] DB Record: ${JSON.stringify({ name: resident.name, aadhar: resident.aadharNumber })}`)
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

visitorPassSchema.pre('save', function (next) {
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

    // Automatic Email Delivery
    if (visitorEmail) {
      console.log('📬 Pass created, triggering automatic email to:', visitorEmail)
      try {
        // Construct the email content or call the dedicated endpoint
        // Using the independent email-server.js API (port 3001)
        const emailServerUrl = process.env.EMAIL_SERVER_URL || 'http://localhost:3001'

        // Pass details for the email
        const emailPayload = {
          visitorName,
          visitorEmail,
          visitorPhone,
          code,
          building,
          flatNumber,
          hostName,
          hostPhone,
          validUntil
        }

        // Invoke the independent email service via API call
        // We use a dedicated sendVisitorPass-like logic here or the generic endpoint
        // Since emailService.js in frontend uses /api/send-email, we'll construct the HTML here
        // to match the premium design seen in emailService.js

        const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(code)}&size=200&margin=1`
        const subject = `Your Visitor Pass for Community Hub - CODE: ${code}`

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px 20px; text-align: center; }
              .content { padding: 30px; background: #ffffff; }
              .pass-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center; }
              .qr-container { margin: 20px auto; padding: 15px; background: #ffffff; display: block; width: 180px; height: 180px; border: 1px solid #e2e8f0; border-radius: 8px; }
              .pass-code { font-size: 28px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 10px 0; font-family: monospace; }
              .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; margin-top: 20px; }
              .detail-item { font-size: 14px; }
              .detail-label { color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 2px; }
              .detail-value { color: #1e293b; font-weight: 500; }
              .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 13px; }
              .instructions { margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
              .instructions h4 { margin-top: 0; color: #334155; }
              .instructions ul { padding-left: 20px; margin-bottom: 0; color: #475569; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0; font-size:24px;">🏢 Community Hub</h1>
                <p style="margin:5px 0 0; opacity:0.9;">Digital Visitor Pass</p>
              </div>
              
              <div class="content">
                <h2 style="margin-top:0; color: #1e293b;">Hello ${visitorName}!</h2>
                <p>A visitor pass has been generated for your upcoming visit to <strong>Community Hub</strong>. Please present this pass at the security gate upon arrival.</p>
                
                <div class="pass-card">
                  <div class="detail-label">Your Pass Code</div>
                  <div class="pass-code">${code}</div>
                  <div style="margin: 20px auto; width: 180px; height: 180px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                    <img src="${qrCodeUrl}" alt="Scan QR Code" width="180" height="180" style="display: block; border: 0;">
                  </div>
                  <p style="margin:5px 0 0; font-size:12px; color:#64748b;">Scan this at the gate for quick entry</p>
                </div>
                
                <div class="detail-grid">
                  <div class="detail-item">
                    <div class="detail-label">Visitor Name</div>
                    <div class="detail-value">${visitorName}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Destination</div>
                    <div class="detail-value">Building ${building || 'N/A'}, Flat ${flatNumber || 'N/A'}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Host Name</div>
                    <div class="detail-value">${hostName || 'Resident'}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Valid Until</div>
                    <div class="detail-value">${new Date(validUntil).toLocaleString()}</div>
                  </div>
                </div>
                
                <div class="instructions">
                  <h4>📋 Entry Instructions:</h4>
                  <ul>
                    <li>Present the QR code or Pass Code to the security officer.</li>
                    <li>The pass is valid only until the expiration time shown above.</li>
                    <li>Please carry a valid ID if requested by security.</li>
                  </ul>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated message from <strong>Community Hub Service Hub</strong>.</p>
                <p>&copy; ${new Date().getFullYear()} Community Hub. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `

        // Send email directly using the internal helper function
        console.log(`📧 Attempting to send pass email to ${visitorEmail} for code ${code}...`)
        const result = await sendEmailViaServer(visitorEmail, subject, html)

        if (result.success) {
          console.log(`✅ Automatic pass email successfully delivered to ${visitorEmail}. MessageId: ${result.messageId}`)
        } else {
          console.error(`❌ Failed to send automatic pass email to ${visitorEmail}:`, result.error)
        }
      } catch (mailErr) {
        console.error('❌ Critical error in automatic pass email process:', mailErr.stack)
      }
    }

    const baseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:5173'
    const passWithQr = { ...saved.toObject(), qrCode: `${baseUrl}/visitor/access/${code}` }
    res.status(201).json({ success: true, pass: passWithQr })
  } catch (error) {
    console.error('❌ Error creating visitor pass:', error)
    res.status(400).json({ success: false, error: error.message })
  }
})

// Generate pass and send email for an existing VisitorLog
app.post('/api/visitors/:id/generate-pass', async (req, res) => {
  try {
    const visitorId = req.params.id;
    const { validUntil } = req.body;
    
    // 1. Find the existing VisitorLog
    const visitorLog = await VisitorLog.findById(visitorId);
    if (!visitorLog) {
      return res.status(404).json({ success: false, error: 'Visitor log not found' });
    }
    
    // 2. Prevent duplicate passes
    if (visitorLog.passGenerated) {
      return res.status(400).json({ success: false, error: 'Pass has already been generated for this visitor' });
    }
    
    // Require email for sending the pass
    if (!visitorLog.visitorEmail) {
      return res.status(400).json({ success: false, error: 'Visitor email is required to send a pass' });
    }

    // 3. Prepare Pass details
    const validUntilDate = validUntil ? new Date(validUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000); // default 24h
    const floor = (visitorLog.hostFlat || '').toString().charAt(0);
    const directions = visitorLog.hostFlat
      ? `Enter through Security Gate → Proceed to Building ${visitorLog.hostBuilding || ''} → Take elevator to Floor ${floor} → Flat ${visitorLog.hostFlat}`
      : '';
    const code = Math.random().toString(36).slice(2, 10).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase();
    
    // 4. Create VisitorPass
    const pass = new VisitorPass({
      code,
      visitorName: visitorLog.visitorName,
      visitorPhone: visitorLog.visitorPhone,
      visitorEmail: visitorLog.visitorEmail,
      hostAuthUserId: visitorLog.hostAuthUserId || 'admin_generated',
      hostName: visitorLog.hostName,
      hostPhone: visitorLog.hostPhone,
      building: visitorLog.hostBuilding || '',
      flatNumber: visitorLog.hostFlat || '',
      directions,
      validUntil: validUntilDate
    });
    
    const saved = await pass.save();
    
    // 5. Update VisitorLog
    visitorLog.passGenerated = true;
    visitorLog.passCode = code;
    await visitorLog.save();
    
    // 6. Send Email Automation
    console.log('📬 Pass generated from log, triggering automatic email to:', visitorLog.visitorEmail);
    try {
      const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(code)}&size=200&margin=1`;
      const subject = `Your Visitor Pass for Community Hub - CODE: ${code}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; background: #ffffff; }
            .pass-card { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center; }
            .qr-container { margin: 20px auto; padding: 15px; background: #ffffff; display: block; width: 180px; height: 180px; border: 1px solid #e2e8f0; border-radius: 8px; }
            .pass-code { font-size: 28px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 10px 0; font-family: monospace; }
            .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; margin-top: 20px; }
            .detail-item { font-size: 14px; }
            .detail-label { color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 2px; }
            .detail-value { color: #1e293b; font-weight: 500; }
            .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 13px; }
            .instructions { margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .instructions h4 { margin-top: 0; color: #334155; }
            .instructions ul { padding-left: 20px; margin-bottom: 0; color: #475569; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0; font-size:24px;">🏢 Community Hub</h1>
              <p style="margin:5px 0 0; opacity:0.9;">Digital Visitor Pass</p>
            </div>
            
            <div class="content">
              <h2 style="margin-top:0; color: #1e293b;">Hello ${visitorLog.visitorName}!</h2>
              <p>A visitor pass has been generated for your upcoming visit to <strong>Community Hub</strong>. Please present this pass at the security gate upon arrival.</p>
              
              <div class="pass-card">
                <div class="detail-label">Your Pass Code</div>
                <div class="pass-code">${code}</div>
                <div style="margin: 20px auto; width: 180px; height: 180px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                  <img src="${qrCodeUrl}" alt="Scan QR Code" width="180" height="180" style="display: block; border: 0;">
                </div>
                <p style="margin:5px 0 0; font-size:12px; color:#64748b;">Scan this at the gate for quick entry</p>
              </div>
              
              <div class="detail-grid">
                <div class="detail-item">
                  <div class="detail-label">Visitor Name</div>
                  <div class="detail-value">${visitorLog.visitorName}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Destination</div>
                  <div class="detail-value">Building ${visitorLog.hostBuilding || 'N/A'}, Flat ${visitorLog.hostFlat || 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Host Name</div>
                  <div class="detail-value">${visitorLog.hostName || 'Resident'}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Valid Until</div>
                  <div class="detail-value">${validUntilDate.toLocaleString()}</div>
                </div>
              </div>
              
              <div class="instructions">
                <h4>📋 Entry Instructions:</h4>
                <ul>
                  <li>Present the QR code or Pass Code to the security officer.</li>
                  <li>The pass is valid only until the expiration time shown above.</li>
                  <li>Please carry a valid ID if requested by security.</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated message from <strong>Community Hub Service Hub</strong>.</p>
              <p>&copy; ${new Date().getFullYear()} Community Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await sendEmailViaServer(visitorLog.visitorEmail, subject, html);
      if (!result.success) {
        console.error(`❌ Failed to send automatic pass email to ${visitorLog.visitorEmail}:`, result.error);
      } else {
        console.log(`✅ Extracted pass email delivered to ${visitorLog.visitorEmail}. MessageId: ${result.messageId}`);
      }
    } catch (mailErr) {
      console.error('❌ Critical error in pass email generation process:', mailErr.stack);
    }
    
    res.status(201).json({ success: true, pass: saved, visitorLog });
  } catch (error) {
    console.error('❌ Error generating pass from visitor log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Get pass by code
app.get('/api/passes/:code', async (req, res) => {
  try {
    const { code } = req.params
    const pass = await VisitorPass.findOne({ code })
    if (!pass) return res.status(404).json({ success: false, error: 'Pass not found' })
    const baseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:5173'
    const passWithQr = { ...pass.toObject(), qrCode: `${baseUrl}/visitor/access/${code}` }
    res.json({ success: true, pass: passWithQr })
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
    const baseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:5173'
    const passesWithQr = passes.map(p => ({ ...p.toObject(), qrCode: `${baseUrl}/visitor/access/${p.code}` }))
    res.json({ success: true, passes: passesWithQr })
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

// ===== GEMINI AI ENDPOINTS =====
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCwqD_4CIyZefWas_PDvLRYFmPVVh8H1Ps'

// AI Insights Cache (In-Memory)
const aiCache = new Map()
const MAX_CACHE_AGE = 2 * 60 * 60 * 1000 // 2 hours

// Helper to clean cache
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of aiCache.entries()) {
    if (now - value.timestamp > MAX_CACHE_AGE) aiCache.delete(key)
  }
}, 15 * 60 * 1000) // Every 15 minutes
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' })

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUSER PROMPT:\n${prompt}` : prompt

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    )

    if (!geminiResp.ok) {
      const errText = await geminiResp.text()
      throw new Error(`Gemini API error: ${geminiResp.status} ${errText}`)
    }

    const geminiData = await geminiResp.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.json({ success: true, text: rawText })
  } catch (error) {
    console.error('❌ Gemini AI Generate error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/ai/payment-insights', async (req, res) => {
  try {
    const { paymentData } = req.body
    if (!paymentData) return res.status(400).json({ success: false, error: 'paymentData is required' })

    // Generate a simple cache key based on month and core stats
    const cacheKey = `insights_${paymentData.month}_${paymentData.totalResidents || 0}_${paymentData.paidCount || 0}`
    const now = Date.now()

    if (aiCache.has(cacheKey)) {
      const cached = aiCache.get(cacheKey)
      if (now - cached.timestamp < MAX_CACHE_AGE) {
        console.log('💎 Serving cached AI insights for:', cacheKey)
        return res.json({ success: true, data: cached.data, cached: true })
      } else {
        aiCache.delete(cacheKey)
      }
    }

    const prompt = `You are a financial analyst for a residential community management platform. Analyze the following payment data and provide actionable insights.

PAYMENT DATA:
${JSON.stringify(paymentData, null, 2)}

Respond ONLY with valid JSON (no markdown, no code fences). Use this exact structure:
{
  "summary": "A 2-3 sentence executive summary",
  "collectionRate": { "percentage": <number>, "trend": "up|down|stable", "analysis": "<string>" },
  "insights": [
    { "title": "<string>", "description": "<string>", "type": "success|warning|danger|info", "icon": "trending-up|alert-triangle|check-circle|info" }
  ],
  "defaulterAnalysis": { "riskLevel": "low|medium|high", "description": "<string>", "recommendations": ["<string>"] },
  "revenueForcast": { "nextMonth": "<string>", "trend": "<string>", "confidence": "high|medium|low" },
  "recommendations": [
    { "priority": "high|medium|low", "action": "<string>", "impact": "<string>" }
  ],
  "buildingBreakdown": [
    { "building": "<string>", "paidCount": <number>, "pendingCount": <number>, "collectionRate": <number> }
  ]
}`

    let retries = 0
    const maxRetries = 2
    let geminiResp
    let success = false

    while (retries <= maxRetries && !success) {
      geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        }
      )

      if (geminiResp.ok) {
        success = true
      } else if (geminiResp.status === 429 && retries < maxRetries) {
        retries++
        const retryAfter = 5000 * retries // Simple backoff 5s, 10s
        console.warn(`⚠️ Gemini API 429 (Quota Exceeded). Retry ${retries}/${maxRetries} in ${retryAfter / 1000}s...`)
        await new Promise(r => setTimeout(r, retryAfter))
      } else {
        const errText = await geminiResp.text()
        throw new Error(`Gemini API error: ${geminiResp.status} ${errText}`)
      }
    }

    const geminiData = await geminiResp.json()
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    // Strip markdown code fences if present
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    
    let insights
    try { 
      insights = JSON.parse(rawText) 
    } catch (e) { 
      console.error('❌ Failed to parse Gemini response as JSON:', e.message)
      insights = { summary: rawText, insights: [], recommendations: [] } 
    }

    // Cache the successful result
    aiCache.set(cacheKey, {
      timestamp: Date.now(),
      data: insights
    })
    console.log('✅ AI insights generated and cached for:', cacheKey)

    res.json({ success: true, data: insights })
  } catch (error) {
    console.error('❌ Gemini AI Insights error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== STAFF/SECURITY USER MANAGEMENT =====
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['staff', 'security'] },
  staffRole: { type: String, required: function () { return this.role === 'staff' }, enum: ['maintenance', 'cleaning', 'gardening', 'electrician', 'plumber', 'general'] },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})
userSchema.methods.comparePassword = async function (p) { return bcrypt.compare(p, this.password) }
const User = mongoose.model('User', userSchema)

const generatePassword = (len = 6) => {
  const u = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', l = 'abcdefghijklmnopqrstuvwxyz', n = '0123456789', a = u + l + n
  let p = u[Math.floor(Math.random() * u.length)] + n[Math.floor(Math.random() * n.length)]
  for (let i = 2; i < len; i++) p += a[Math.floor(Math.random() * a.length)]
  return p.split('').sort(() => Math.random() - 0.5).join('')
}

app.post('/api/staff/create', async (req, res) => {
  try {
    const { name, email, role, staffRole, password: pw, createdBy } = req.body
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ success: false, error: 'User already exists' })
    const password = pw || generatePassword(6)
    const user = new User({ name, email: email.toLowerCase(), password, role, staffRole: role === 'staff' ? staffRole : undefined, createdBy, isActive: true })
    await user.save()
    try {
      const rt = role === 'staff' ? `Staff (${staffRole})` : 'Security'
      await transporter.sendMail({ from: { name: 'Community Service Platform', address: process.env.GMAIL_USER || 'felixthomas8800@gmail.com' }, to: email, subject: `Welcome - Your ${rt} Account`, html: `<h2>Hello ${name}!</h2><p>Your ${rt} account: <b>${email}</b> / <code>${password}</code></p>` })
    } catch (e) { console.error('Email send failed (non-fatal):', e.message) }
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole, isActive: user.isActive, createdAt: user.createdAt }, message: `${role === 'staff' ? 'Staff' : 'Security'} user created` })
  } catch (error) { console.error('Create user error:', error); res.status(500).json({ success: false, error: error.message }) }
})

app.get('/api/staff/all', async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['staff', 'security'] } }).select('-password').sort({ createdAt: -1 })
    res.json({ success: true, users })
  } catch (error) { res.status(500).json({ success: false, error: error.message }) }
})

app.put('/api/staff/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    res.json({ success: true, user, message: 'User updated' })
  } catch (error) { res.status(500).json({ success: false, error: error.message }) }
})

app.delete('/api/staff/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    res.json({ success: true, message: 'User deleted' })
  } catch (error) { res.status(500).json({ success: false, error: error.message }) }
})

app.post('/api/auth/staff', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' })
    if (!(await user.comparePassword(password))) return res.status(401).json({ success: false, error: 'Invalid credentials' })
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, staffRole: user.staffRole, isActive: user.isActive } })
  } catch (error) { res.status(500).json({ success: false, error: error.message }) }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Combined API server running on http://localhost:${PORT}`)
  console.log(`📧 Email service: http://localhost:${PORT}/api/email/health`)
  console.log(`🗄️  MongoDB service: http://localhost:${PORT}/api/health`)
  console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications/health`)
})

export default app