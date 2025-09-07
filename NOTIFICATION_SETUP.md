# Staff Credentials Notification Setup Guide

This guide will help you configure email and WhatsApp notifications for sending staff login credentials to admin.

## Features

- ✅ Send staff credentials via Email
- ✅ Send staff credentials via WhatsApp  
- ✅ Send via both Email and WhatsApp
- ✅ Admin can manually trigger credential sending
- ✅ Includes all staff profile information
- ✅ Generates temporary passwords
- ✅ Beautiful HTML email templates
- ✅ WhatsApp message formatting

## Email Configuration

### Step 1: Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Copy the 16-character password

### Step 2: Update Environment Variables

Edit your `.env.local` file:

```env
# Email Configuration
VITE_EMAIL_USER=your-admin-email@gmail.com
VITE_EMAIL_PASSWORD=your-16-character-app-password
```

### Alternative Email Providers

For other email providers, update the `emailConfig` in `src/services/notificationService.js`:

```javascript
// For Outlook/Hotmail
this.emailConfig = {
  service: 'hotmail',
  host: 'smtp-mail.outlook.com',
  port: 587,
  // ... rest of config
}

// For Yahoo
this.emailConfig = {
  service: 'yahoo',
  host: 'smtp.mail.yahoo.com',
  port: 587,
  // ... rest of config
}
```

## WhatsApp Configuration

### Option 1: WhatsApp Business API (Official)

1. **Sign up** for WhatsApp Business API
2. **Get API credentials** from Meta Business
3. **Update environment variables**:

```env
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages
VITE_WHATSAPP_API_KEY=your-whatsapp-business-api-token
VITE_ADMIN_PHONE=+1234567890
```

### Option 2: Third-Party WhatsApp Services

Popular services like Twilio, MessageBird, or Vonage:

```env
# Example for Twilio
VITE_WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json
VITE_WHATSAPP_API_KEY=your-twilio-auth-token
VITE_ADMIN_PHONE=whatsapp:+1234567890
```

### Option 3: Free WhatsApp Web API (Development Only)

For development/testing, you can use services like:
- WhatsApp Web API by Baileys
- Open WhatsApp API
- WA Web API

⚠️ **Note**: Free services are not recommended for production use.

## Backend Integration (Required for Production)

The current implementation is frontend-only for demonstration. For production:

### Step 1: Create Backend API Endpoints

Create these endpoints in your backend:

```javascript
// POST /api/send-email
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html, from } = req.body
  
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  })
  
  try {
    await transporter.sendMail({ to, subject, html, from })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/send-whatsapp
app.post('/api/send-whatsapp', async (req, res) => {
  const { phone, message } = req.body
  
  try {
    // Implement WhatsApp API call
    const response = await axios.post(WHATSAPP_API_URL, {
      to: phone,
      type: 'text',
      text: { body: message }
    }, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
```

### Step 2: Update Frontend Service

Update `src/services/notificationService.js` to call your backend:

```javascript
// Replace the console.log calls with actual API calls
const response = await axios.post('/api/send-email', emailData)
const response = await axios.post('/api/send-whatsapp', whatsappData)
```

## Usage

### For Admins

1. **Navigate** to User Management
2. **Find** staff or security personnel
3. **Click** the key icon (🔑) next to their name
4. **Choose** notification method:
   - Email only
   - WhatsApp only  
   - Both email and WhatsApp
5. **Confirm** to send credentials

### What Gets Sent

The notification includes:
- Staff member's full profile information
- Generated temporary password
- Login instructions
- Security warnings
- Professional formatting

### Email Template Features

- 📧 Professional HTML design
- 🎨 Responsive layout
- 🔒 Security warnings
- 📋 Complete staff information
- 🏢 Company branding

### WhatsApp Message Features

- 📱 Mobile-optimized formatting
- 📝 Clear structure with emojis
- 🔐 Credential security
- ℹ️ Complete information
- ⚠️ Security reminders

## Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use different credentials for development/production
- Rotate API keys regularly

### Password Security
- Temporary passwords are auto-generated
- Include special characters and numbers
- Recommend immediate password change
- Log credential sending activities

### API Security
- Use HTTPS for all API calls
- Implement rate limiting
- Add authentication to backend endpoints
- Validate all input data

## Troubleshooting

### Email Issues

**"Authentication failed"**
- Check if 2FA is enabled
- Verify app password is correct
- Ensure "Less secure app access" is disabled

**"Connection timeout"**
- Check firewall settings
- Verify SMTP settings
- Try different port (465 for SSL)

### WhatsApp Issues

**"Invalid phone number"**
- Use international format (+1234567890)
- Include country code
- Remove spaces and special characters

**"API key invalid"**
- Verify API key is active
- Check API endpoint URL
- Ensure proper authentication headers

### Configuration Issues

**"Not configured" status**
- Check environment variable names
- Restart development server
- Verify .env.local file location

## Testing

### Test Email Configuration

```javascript
// Add this to your component for testing
const testEmail = async () => {
  const result = await notificationService.sendEmailNotification({
    name: 'Test User',
    email: 'test@example.com',
    role: 'staff'
  }, { password: 'TestPass123!' })
  
  console.log('Email test result:', result)
}
```

### Test WhatsApp Configuration

```javascript
// Add this to your component for testing
const testWhatsApp = async () => {
  const result = await notificationService.sendWhatsAppNotification({
    name: 'Test User',
    email: 'test@example.com',
    role: 'staff'
  }, { password: 'TestPass123!' })
  
  console.log('WhatsApp test result:', result)
}
```

## Support

For additional help:
1. Check browser console for errors
2. Verify all environment variables
3. Test with simple configurations first
4. Check API documentation for your chosen services

---

**Note**: This implementation provides a foundation for credential notifications. Customize the templates, security measures, and integrations based on your specific requirements.