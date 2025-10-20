// Environment configuration for different deployment environments
const config = {
  development: {
    API_BASE_URL: 'http://localhost:3002',
    MONGO_API_URL: 'http://localhost:3002',
    EMAIL_SERVER_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5173'
  },
  production: {
    API_BASE_URL: 'https://smartcommunityserbicehub.onrender.com',
    MONGO_API_URL: 'https://smartcommunityserbicehub.onrender.com',
    EMAIL_SERVER_URL: 'https://smartcommunityserbicehub.onrender.com',
    FRONTEND_URL: 'https://smartcommunityserbicehub.vercel.app'
  }
}

// Get current environment
const isDevelopment = import.meta.env.DEV
const environment = isDevelopment ? 'development' : 'production'

// Export current environment config
export const env = config[environment]

// Export individual URLs for convenience
export const API_BASE_URL = env.API_BASE_URL
export const MONGO_API_URL = env.MONGO_API_URL
export const EMAIL_SERVER_URL = env.EMAIL_SERVER_URL
export const FRONTEND_URL = env.FRONTEND_URL

export default env
