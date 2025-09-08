require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://felixthomas8800:Felixthomas@communityhub.yjzla25.mongodb.net/?retryWrites=true&w=majority&appName=communityhub'

mongoose.connect(MONGODB_URI)

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['staff', 'security'] },
  staffRole: { 
    type: String, 
    required: function() { return this.role === 'staff' },
    enum: ['maintenance', 'cleaning', 'gardening', 'electrician', 'plumber', 'general']
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)

// Resident Schema
const residentSchema = new mongoose.Schema({
  authUserId: { type: String, required: true, index: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  ownerName: { type: String, default: '' },
  flatNumber: { type: String, default: '' },
  building: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

residentSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

const Resident = mongoose.model('Resident', residentSchema)

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Password generator
const generatePassword = (length = 6) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const allChars = uppercase + lowercase + numbers
  
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  
  for (let i = 2; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Send credentials email
const sendCredentialsEmail = async (userEmail, userName, password, role, staffRole = null) => {
  const roleText = role === 'staff' ? `Staff (${staffRole})` : 'Security'
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: `Welcome to Community Service Platform - Your ${roleText} Account`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">🏢 Community Service Platform</h1>
        <h2>Hello ${userName}!</h2>
        <p>Your ${roleText} account has been created successfully.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px;">${password}</code></p>
          <p><strong>Role:</strong> ${roleText}</p>
        </div>
        <p>Please keep your credentials secure and change your password after first login.</p>
      </div>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error: error.message }
  }
}

// Routes

// Create staff/security user
app.post('/api/staff/create', async (req, res) => {
  try {
    const { name, email, role, staffRole, password: providedPassword, createdBy } = req.body

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' })
    }

    // Generate password if not provided
    const password = providedPassword || generatePassword(6)

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save middleware
      role,
      staffRole: role === 'staff' ? staffRole : undefined,
      createdBy,
      isActive: true
    })

    await user.save()

    // Send email
    const emailResult = await sendCredentialsEmail(email, name, password, role, staffRole)

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        staffRole: user.staffRole,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      emailSent: emailResult.success,
      message: `${role === 'staff' ? 'Staff' : 'Security'} user created successfully`
    })

  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get all staff/security users
app.get('/api/staff/all', async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['staff', 'security'] } })
      .select('-password')
      .sort({ createdAt: -1 })

    res.json({ success: true, users })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update staff/security user
app.put('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body, updatedAt: Date.now() }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    res.json({ success: true, user, message: 'User updated successfully' })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete staff/security user
app.delete('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findByIdAndDelete(id)

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Authenticate staff/security user
app.post('/api/auth/staff', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    })

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        staffRole: user.staffRole,
        isActive: user.isActive
      }
    })

  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Resident profile routes
// Get resident profile by Supabase auth user id
app.get('/api/residents/:authUserId', async (req, res) => {
  try {
    const { authUserId } = req.params
    const resident = await Resident.findOne({ authUserId })
    if (!resident) {
      return res.json({ success: true, resident: null })
    }
    res.json({ success: true, resident })
  } catch (error) {
    console.error('Get resident error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create or update resident profile
app.post('/api/residents', async (req, res) => {
  try {
    const { authUserId, name, email, phone, ownerName, flatNumber, building } = req.body
    if (!authUserId) return res.status(400).json({ success: false, error: 'authUserId is required' })

    const update = { name, email, phone, ownerName, flatNumber, building, updatedAt: Date.now() }
    const options = { new: true, upsert: true, setDefaultsOnInsert: true }
    const resident = await Resident.findOneAndUpdate({ authUserId }, update, options)

    res.json({ success: true, resident, message: 'Resident profile saved' })
  } catch (error) {
    console.error('Upsert resident error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`MongoDB connected to: ${MONGODB_URI.split('@')[1]}`)
})
