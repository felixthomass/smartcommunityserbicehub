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
   * Helper: Send an email derived from a Notification object
   * notification: { title, message, priority, type, metadata }
   * recipients: array of email strings
   */
  sendNotificationForNotification: async (notification, recipients) => {
    try {
      if (!notification) throw new Error('Notification payload is required')
      const subject = `Notification: ${notification.title || 'Update'}`
      const lines = [
        notification.message || '',
        notification.priority ? `Priority: ${notification.priority}` : '',
        notification.type ? `Type: ${notification.type}` : '',
        notification.metadata?.actionUrl ? `Action: ${notification.metadata.actionUrl}` : ''
      ].filter(Boolean)
      const body = lines.join('\n\n')

      if (Array.isArray(recipients) && recipients.length > 0) {
        return await emailService.sendBulkNotifications(recipients, subject, body)
      }

      return { success: false, error: 'No recipients provided for notification email' }
    } catch (error) {
      console.error('❌ Notification-to-email error:', error)
      return { success: false, error: error.message }
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
