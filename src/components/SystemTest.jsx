import { useState, useEffect } from 'react'
import { mongoService } from '../services/mongoService'
import { storageService } from '../services/storageService'

const SystemTest = () => {
  const [mongoStatus, setMongoStatus] = useState('checking...')
  const [supabaseStatus, setSupabaseStatus] = useState('checking...')
  const [testResults, setTestResults] = useState([])

  useEffect(() => {
    runTests()
  }, [])

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, time: new Date().toLocaleTimeString() }])
  }

  const runTests = async () => {
    setTestResults([])
    
    // Test 1: MongoDB Connection
    addResult('MongoDB Health Check', 'testing', 'Checking MongoDB server...')
    try {
      const response = await fetch('http://localhost:3002/api/health')
      if (response.ok) {
        const data = await response.json()
        setMongoStatus('✅ Connected')
        addResult('MongoDB Health Check', 'success', `Server running: ${data.message}`)
      } else {
        setMongoStatus('❌ Failed')
        addResult('MongoDB Health Check', 'error', `HTTP ${response.status}`)
      }
    } catch (error) {
      setMongoStatus('❌ Connection Refused')
      addResult('MongoDB Health Check', 'error', 'Server not running. Run: node mongo-server.js')
    }

    // Test 2: MongoDB Visitor Stats
    addResult('MongoDB Visitor Stats', 'testing', 'Testing visitor stats API...')
    try {
      const result = await mongoService.getVisitorStats('today')
      if (result.success) {
        addResult('MongoDB Visitor Stats', 'success', `Stats loaded: ${JSON.stringify(result.data)}`)
      } else {
        addResult('MongoDB Visitor Stats', 'error', result.error)
      }
    } catch (error) {
      addResult('MongoDB Visitor Stats', 'error', error.message)
    }

    // Test 3: Supabase Storage
    addResult('Supabase Storage', 'testing', 'Testing storage connection...')
    try {
      // Create a test file
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const result = await storageService.uploadDocument(testFile, 'test-visitor', 'test')
      
      if (result.success) {
        setSupabaseStatus('✅ Connected')
        addResult('Supabase Storage', 'success', `Upload successful: ${result.data.fileName}`)
        
        // Clean up test file
        setTimeout(async () => {
          await storageService.deleteDocument(result.data.path)
          addResult('Cleanup', 'success', 'Test file deleted')
        }, 2000)
      } else {
        setSupabaseStatus('❌ Failed')
        addResult('Supabase Storage', 'error', result.error)
      }
    } catch (error) {
      setSupabaseStatus('❌ Error')
      addResult('Supabase Storage', 'error', error.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">System Status Test</h1>
        
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">MongoDB Server</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">localhost:3002</p>
            <p className="mt-2">{mongoStatus}</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">Supabase Storage</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">visitor-documents bucket</p>
            <p className="mt-2">{supabaseStatus}</p>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Results</h3>
            <button
              onClick={runTests}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Run Tests Again
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  result.status === 'success' 
                    ? 'bg-green-50 border-green-500 dark:bg-green-900/20' 
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-500 dark:bg-red-900/20'
                    : 'bg-blue-50 border-blue-500 dark:bg-blue-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {result.test}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {result.time}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${
                  result.status === 'success' 
                    ? 'text-green-700 dark:text-green-300' 
                    : result.status === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {result.message}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>1. <strong>MongoDB Server:</strong> Run <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">node mongo-server.js</code> in terminal</li>
            <li>2. <strong>Supabase Storage:</strong> Create 'visitor-documents' bucket and set up policies</li>
            <li>3. <strong>Test:</strong> Click "Run Tests Again" to verify everything works</li>
          </ol>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-4">
          <a
            href="http://localhost:3002/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Check MongoDB Health
          </a>
          <a
            href="https://supabase.com/dashboard/project/fgzsrgoxgoserdmbctvl/storage/buckets"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Open Supabase Storage
          </a>
        </div>
      </div>
    </div>
  )
}

export default SystemTest
