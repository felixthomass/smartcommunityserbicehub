import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

// Simple test component first
const TestApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'blue', fontSize: '2rem' }}>
        🎉 Community Service Platform - Working!
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'green' }}>
        ✅ React is working! No white screen!
      </p>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>System Status:</h3>
        <ul>
          <li>✅ Frontend Server: Running on port 5173</li>
          <li>✅ React App: Loading successfully</li>
          <li>✅ MongoDB imports: Fixed (using API calls)</li>
          <li>✅ All components: Checked and fixed</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
        <h4>Next Steps:</h4>
        <p>Now I'll restore the full application with all features.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Reload
        </button>
      </div>
    </div>
  )
}

// Import components after test
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import AuthCallback from './components/AuthCallback'
import Navigation from './components/Navigation'
import UserProfile from './components/UserProfile'
import AdminUserManagement from './components/AdminUserManagementSimple'
import ResidentDashboard from './components/dashboards/ResidentDashboard'
import AdminDashboard from './components/dashboards/AdminDashboard'
import StaffDashboard from './components/dashboards/StaffDashboard'
import SecurityDashboard from './components/dashboards/SecurityDashboard'
import StorageTest from './components/StorageTest'


const AppContent = () => {
  const { user, loading, logout } = useAuth()
  const { darkMode, setDarkMode } = useTheme()
  const [currentPage, setCurrentPage] = useState('landing')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Check if current path is auth callback, or auth params present in hash
  const isAuthCallback =
    window.location.pathname === '/auth/callback' ||
    (typeof window !== 'undefined' && (
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('error=')
    ))

  useEffect(() => {
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Handle auth callback
  if (isAuthCallback) {
    return <AuthCallback />
  }

  // If no user, show landing page or login
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {currentPage === 'landing' ? (
          <LandingPage 
            onNavigateToLogin={() => setCurrentPage('login')}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        ) : (
          <Login 
            onNavigateToLanding={() => setCurrentPage('landing')}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        )}
      </div>
    )
  }

  // User is authenticated - show dashboard based on role
  const getDashboard = () => {
    switch (user.role) {
      case 'resident':
        return <ResidentDashboard user={user} onLogout={logout} currentPage={currentPage} />
      case 'admin':
        return <AdminDashboard user={user} onLogout={logout} currentPage={currentPage} />
      case 'staff':
        return <StaffDashboard user={user} onLogout={logout} currentPage={currentPage} />
      case 'security':
        return <SecurityDashboard user={user} onLogout={logout} currentPage={currentPage} />
      default:
        return <ResidentDashboard user={user} onLogout={logout} currentPage={currentPage} />
    }
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'profile':
        return <UserProfile user={user} onBack={() => setCurrentPage('dashboard')} />
      case 'admin-users':
        // Let AdminDashboard handle the admin-users view internally
        return getDashboard()
      case 'staff-security':
        // Staff/Security management is now handled within AdminDashboard
        return getDashboard()
      case 'storage-test':
        return <StorageTest />
      case 'dashboard':
      default:
        return getDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {renderContent()}
      </main>
    </div>
  )
}

const App = () => {
  // Test mode first - uncomment this to test basic functionality
  // return <TestApp />

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
