// Simple email server for sending invitations
import express from 'express'
import nodemailer from 'nodemailer'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

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

// Gmail configuration with your credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'felixthomas8800@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'uyea twdq xles awxm' // Your Gmail app password
  }
})

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error)
  } else {
    console.log('✅ Email server ready to send messages')
  }
})

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, and content'
      })
    }

    const mailOptions = {
      from: {
        name: 'Community Service Platform',
        address: 'felixthomas8800@gmail.com'
      },
      to: to,
      subject: subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>/g, '') // Strip HTML for text version
    }

    console.log('📧 Sending email to:', to)

    const info = await transporter.sendMail(mailOptions)

    console.log('✅ Email sent successfully:', info.messageId)

    res.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('❌ Email sending error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Email server is running',
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`📧 Email server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
})
