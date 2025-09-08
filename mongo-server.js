// MongoDB API server for visitor logs
import express from 'express'
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
    cb(null, 'visitor-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only image and PDF files are allowed!'), false)
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

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MongoDB API server is running',
    timestamp: new Date().toISOString()
  })
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
      {
        $match: {
          entryTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalVisitors: { $sum: 1 },
          checkedIn: {
            $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] }
          },
          checkedOut: {
            $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] }
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
    const residents = await Resident.find({}).sort({ createdAt: -1 })
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

// Complaint Schema
const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'general' },
  priority: { type: String, default: 'normal', enum: ['low', 'normal', 'high'] },
  status: { type: String, default: 'open', enum: ['open', 'resolved'] },
  residentAuthUserId: { type: String, required: true },
  residentName: { type: String, default: '' },
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
    const complaint = await Complaint.findByIdAndUpdate(id, update, { new: true })
    if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' })
    res.json({ success: true, complaint })
  } catch (error) {
    console.error('❌ Error updating complaint:', error)
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
  building: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
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

// Create visitor pass
app.post('/api/passes', async (req, res) => {
  try {
    const { visitorName, visitorPhone, visitorEmail, hostAuthUserId, hostName, building, flatNumber, validUntil } = req.body
    if (!visitorName || !visitorPhone || !hostAuthUserId || !validUntil) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }
    const code = Math.random().toString(36).slice(2, 10).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase()
    const pass = new VisitorPass({
      code,
      visitorName,
      visitorPhone,
      visitorEmail,
      hostAuthUserId,
      hostName,
      building,
      flatNumber,
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MongoDB API server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
})

export default app
