// Email service for sending staff credentials and notifications
import { EMAIL_SERVER_URL } from '../config/environment.js'

export const emailService = {
  /**
   * Send credentials to new staff/security members
   */
  sendCredentials: async (userData, password) => {
    try {
      const { name, email, role, staffDepartment } = userData

      // Create email content
      const subject = `Welcome to Community Service Platform - Your ${role} Account`

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4F46E5; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 Community Service Platform</h1>
              <p>Welcome to your new ${role} account!</p>
            </div>
            
            <div class="content">
              <h2>Hello ${name}!</h2>
              
              <p>Your ${role} account has been created successfully. You can now access the Community Service Platform with the credentials below:</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                ${staffDepartment ? `<p><strong>Department:</strong> ${staffDepartment}</p>` : ''}
                <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
              </div>
              
              <p>Please keep these credentials secure and change your password after your first login.</p>
              
              <a href="${window.location.origin}" class="button">Login to Platform</a>
              
              <h3>📋 Next Steps:</h3>
              <ul>
                <li>Click the login button above to access the platform</li>
                <li>Use your email and the provided password to sign in</li>
                <li>Update your profile and change your password</li>
                <li>Explore your dashboard and available features</li>
              </ul>
              
              <p>If you have any questions or need assistance, please contact the administrator.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Community Service Platform</p>
              <p>Please do not reply to this email</p>
            </div>
          </div>
        </body>
        </html>
      `

      const text = `
        Welcome to Community Service Platform!
        
        Hello ${name},
        
        Your ${role} account has been created successfully.
        
        Login Credentials:
        Email: ${email}
        Password: ${password}
        ${staffDepartment ? `Department: ${staffDepartment}` : ''}
        Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
        
        Please visit ${window.location.origin} to login.
        
        Keep these credentials secure and change your password after your first login.
        
        If you have any questions, please contact the administrator.
        
        Best regards,
        Community Service Platform Team
      `

      console.log('📧 Sending credentials email to:', email)

      // Send email via email server
      const response = await fetch(`${EMAIL_SERVER_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: subject,
          html: html,
          text: text
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      console.log('✅ Email sent successfully:', result.messageId)

      return {
        success: true,
        messageId: result.messageId,
        message: 'Credentials sent successfully'
      }

    } catch (error) {
      console.error('❌ Email sending error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Send notification email
   */
  sendNotification: async (to, subject, message) => {
    try {
      console.log('📧 Sending notification email to:', to)

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 Community Service Platform</h1>
            </div>
            
            <div class="content">
              <h2>${subject}</h2>
              <p>${message}</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Community Service Platform</p>
            </div>
          </div>
        </body>
        </html>
      `

      const response = await fetch(`${EMAIL_SERVER_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to,
          subject: subject,
          html: html,
          text: message
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      return {
        success: true,
        messageId: result.messageId
      }

    } catch (error) {
      console.error('❌ Notification email error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Send the same notification email to multiple recipients
   */
  sendBulkNotifications: async (recipients, subject, message) => {
    try {
      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('No recipients provided')
      }

      const results = await Promise.allSettled(
        recipients.map((email) => emailService.sendNotification(email, subject, message))
      )

      const summary = results.reduce(
        (acc, r) => {
          if (r.status === 'fulfilled' && r.value?.success) acc.sent += 1
          else acc.failed += 1
          return acc
        },
        { sent: 0, failed: 0 }
      )

      return {
        success: summary.failed === 0,
        ...summary,
        total: recipients.length
      }
    } catch (error) {
      console.error('❌ Bulk notification email error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Send visitor pass email to visitor
   */
  sendVisitorPass: async (passData) => {
    try {
      const {
        visitorName,
        visitorEmail,
        visitorPhone,
        code,
        building,
        flatNumber,
        hostName,
        validUntil
      } = passData

      console.log('📧 Sending visitor pass email to:', visitorEmail)

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
                  <div class="detail-value">Building ${building}, Flat ${flatNumber}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Host Name</div>
                  <div class="detail-value">${hostName}</div>
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
              <p>© ${new Date().getFullYear()} Community Hub. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `

      const text = `
        OFFICIAL VISITOR PASS - Community Hub
        
        Hello ${visitorName},
        
        A visitor pass has been generated for your visit.
        
        PASS CODE: ${code}
        DESTINATION: Building ${building}, Flat ${flatNumber}
        HOST: ${hostName}
        VALID UNTIL: ${new Date(validUntil).toLocaleString()}
        
        Please present this code at the security gate upon arrival.
        
        Entry Instructions:
        1. Present the QR code or Pass Code to the security officer.
        2. The pass is valid only until the expiration time shown.
        3. Please carry a valid ID if requested by security.
        
        Safe travels!
        Community Hub Team
      `

      const response = await fetch(`${EMAIL_SERVER_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: visitorEmail,
          subject: subject,
          html: html,
          text: text
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send visitor pass email')
      }

      return {
        success: true,
        messageId: result.messageId
      }

    } catch (error) {
      console.error('❌ Visitor pass email error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Test email server connection
   */
  testConnection: async () => {
    try {
      const response = await fetch(`${EMAIL_SERVER_URL}/api/health`)
      const result = await response.json()

      return {
        success: response.ok,
        message: result.message,
        timestamp: result.timestamp
      }
    } catch (error) {
      return {
        success: false,
        error: 'Email server is not running'
      }
    }
  }
}
