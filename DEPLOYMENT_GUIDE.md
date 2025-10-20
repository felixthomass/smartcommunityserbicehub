# Deployment Guide

## Overview
This guide explains how to deploy your Community Service Platform with:
- **Frontend**: Hosted on Vercel at https://smartcommunityserbicehub.vercel.app/
- **Backend**: Hosted on Render at https://smartcommunityserbicehub.onrender.com

## What's Been Updated

### 1. Environment Configuration
- Created centralized environment configuration in `src/config/environment.js`
- Updated all services to use production URLs automatically
- Added proper CORS configuration for production domains

### 2. Service URLs Updated
All services now point to your Render backend:
- **API Base URL**: `https://smartcommunityserbicehub.onrender.com`
- **MongoDB API**: `https://smartcommunityserbicehub.onrender.com`
- **Email Service**: `https://smartcommunityserbicehub.onrender.com`

### 3. Frontend URLs Updated
- Visitor pass links now use production frontend URL
- All hardcoded localhost references removed

## Deployment Steps

### Backend Deployment (Render)
1. **Use the combined server**: Deploy `server.js` instead of separate email and mongo servers
2. **Environment Variables** in Render:
   ```
   MONGODB_URI=mongodb+srv://felixthomas8800:Felixthomas@communityhub.yjzla25.mongodb.net/?retryWrites=true&w=majority&appName=communityhub
   GMAIL_USER=felixthomas8800@gmail.com
   GMAIL_APP_PASSWORD=uyea twdq xles awxm
   PORT=3002
   ```

3. **Build Command**: `npm install`
4. **Start Command**: `node server.js`

### Frontend Deployment (Vercel)
1. **Environment Variables** in Vercel:
   ```
   VITE_SUPABASE_URL=https://fgzsrgoxgoserdmbctvl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnenNyZ294Z29zZXJkbWJjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODI3NDEsImV4cCI6MjA2OTg1ODc0MX0.PlAisOeMbUr4x9xVkUUMbJBqO-53rFMv51GxTiq8QE0
   VITE_API_BASE_URL=https://smartcommunityserbicehub.onrender.com
   VITE_MONGO_API_URL=https://smartcommunityserbicehub.onrender.com
   VITE_EMAIL_SERVER_URL=https://smartcommunityserbicehub.onrender.com
   ```

2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`

## File Changes Made

### New Files Created:
- `src/config/environment.js` - Centralized environment configuration
- `server.js` - Combined server for Render deployment
- `vercel.json` - Vercel configuration
- `DEPLOYMENT_GUIDE.md` - This guide

### Files Updated:
- `env.local` - Updated with production URLs
- `src/services/emailService.js` - Uses environment config
- `src/services/mongoService.js` - Uses environment config
- `src/services/mapService.js` - Uses environment config
- `src/services/paymentService.js` - Uses environment config
- `src/services/deliveryService.js` - Uses environment config
- `src/services/monthlyFeeService.js` - Uses environment config
- `src/components/dashboards/ResidentDashboard.jsx` - Updated frontend URLs
- `mongo-server.js` - Added CORS for production
- `email-server.js` - Added CORS for production

## Testing the Deployment

### 1. Test Backend Health
```bash
curl https://smartcommunityserbicehub.onrender.com/api/health
```

### 2. Test Email Service
```bash
curl https://smartcommunityserbicehub.onrender.com/api/email/health
```

### 3. Test Frontend
Visit: https://smartcommunityserbicehub.vercel.app/

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your Render backend has the correct CORS origins
2. **Environment Variables**: Verify all environment variables are set in both Vercel and Render
3. **MongoDB Connection**: Check that your MongoDB URI is correct and accessible
4. **Email Service**: Verify Gmail app password is correct

### Debug Commands:
```bash
# Check if backend is responding
curl -I https://smartcommunityserbicehub.onrender.com/api/health

# Check frontend build
npm run build
npm run preview
```

## Local Development

For local development, the system automatically uses localhost URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3002`
- Email: `http://localhost:3001`

Use `npm run start-services` to run both backend services locally.

## Production URLs

- **Frontend**: https://smartcommunityserbicehub.vercel.app/
- **Backend**: https://smartcommunityserbicehub.onrender.com
- **API Health**: https://smartcommunityserbicehub.onrender.com/api/health
- **Email Health**: https://smartcommunityserbicehub.onrender.com/api/email/health

Your application is now properly configured for production deployment!
