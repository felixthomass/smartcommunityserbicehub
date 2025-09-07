import React from 'react'

const TestApp = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Community Service App
        </h1>
        <p className="text-gray-600">
          App is loading successfully!
        </p>
        <div className="mt-8">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Test Button
          </button>
        </div>
      </div>
    </div>
  )
}

export default TestApp