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

// ===== BILL MANAGEMENT ROUTES =====

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
  dueDate: { type: Date },
  paidAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
})

const Payment = mongoose.model('Payment', paymentSchema)

// Notification Schema
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'success', 'error', 'bill', 'complaint', 'visitor'], default: 'info' },
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
    actionUrl: { type: String }
  }
}, { timestamps: true })

const Notification = mongoose.model('Notification', notificationSchema)

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
      room = await ChatRoom.findOne(query)
      if (!room) {
        room = new ChatRoom({ type: 'group', name: name || 'Residents Group', memberAuthUserIds })
        await room.save()
      } else if (memberAuthUserIds && memberAuthUserIds.length) {
        await ChatRoom.updateOne({ _id: room._id }, { $addToSet: { memberAuthUserIds: { $each: memberAuthUserIds } }, $set: { updatedAt: new Date() } })
        room = await ChatRoom.findById(room._id)
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
    const rooms = await ChatRoom.find({ memberAuthUserIds: me }).sort({ lastMessageAt: -1 })
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
    type: { type: String, enum: ['image', 'video'] },
    path: { type: String },
    thumbPath: { type: String },
    size: { type: Number },
    width: { type: Number },
    height: { type: Number },
    durationMs: { type: Number }
  },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  deletedAt: { type: Date }
})
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)

// Create visitor pass
app.post('/api/passes', async (req, res) => {
  try {
    const { visitorName, visitorPhone, visitorEmail, hostAuthUserId, hostName, hostPhone, building, flatNumber, validUntil } = req.body
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
      hostPhone,
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