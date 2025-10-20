import React, { useState, useEffect } from 'react'
import { aadharService } from '../services/aadharService'
import { residentService } from '../services/residentService'
import { mongoService } from '../services/mongoService'
import { showSuccess, showError } from '../utils/sweetAlert'
import { paymentService } from '../services/paymentService'

const ResidentVerification = ({ user, onVerified }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    aadharImage: null,
    aadharPreview: '',
    building: '',
    flatNumber: ''
  })
  const [extractedAadhar, setExtractedAadhar] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [errors, setErrors] = useState({})
  const [buildings] = useState([
    { id: 'A', name: 'Building A' },
    { id: 'B', name: 'Building B' },
    { id: 'C', name: 'Building C' }
  ])
  const [flats, setFlats] = useState([])

  // Prefill from admin-provided records and user profile
  useEffect(() => {
    const loginEmail = user?.email || ''
    const loginName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
    setForm(prev => ({
      ...prev,
      email: loginEmail || prev.email,
      name: loginName || prev.name
    }))
    ;(async () => {
      try {
        const res = await mongoService.getAdminResidentEntries?.()
        if (res?.success) {
          const match = (res.data || []).find(r => (r.email || '').toLowerCase() === (loginEmail || '').toLowerCase())
          if (match) {
            setForm(prev => ({
              ...prev,
              name: match.name || prev.name,
              email: match.email || prev.email,
              building: match.building || prev.building,
              flatNumber: match.flatNumber || prev.flatNumber
            }))
          }
        }
      } catch {}
    })()
  }, [user])

  useEffect(() => {
    const generateFlats = (b) => {
      const cfg = { A: { floors: 4, perFloor: 6 }, B: { floors: 3, perFloor: 4 }, C: { floors: 5, perFloor: 8 } }[b] || { floors: 3, perFloor: 4 }
      const list = []
      for (let floor = 1; floor <= cfg.floors; floor++) {
        for (let n = 1; n <= cfg.perFloor; n++) {
          const fn = `${floor}${String(n).padStart(2, '0')}`
          list.push(fn)
        }
      }
      return list
    }
    if (!form.building) { setFlats([]); setForm(prev => ({ ...prev, flatNumber: '' })); return }
    setFlats(generateFlats(form.building))
  }, [form.building])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setForm(prev => ({
        ...prev,
        aadharImage: file,
        aadharPreview: URL.createObjectURL(file)
      }))
      // Attempt OCR to prefill aadhar number
      ;(async () => {
        try {
          const res = await aadharService.extractAadharDataFromImage(file)
          const extracted = res?.data?.aadharNumber || ''
          if (extracted) setExtractedAadhar(extracted)
        } catch {}
      })()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    
    if (!form.name.trim()) nextErrors.name = 'Name is required'
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!form.aadharImage) nextErrors.aadharImage = 'Aadhar image is required'
    if (!extractedAadhar.trim()) nextErrors.aadharNumber = 'Aadhar number is required'
    if (!form.building) nextErrors.building = 'Select your building'
    if (!form.flatNumber) nextErrors.flatNumber = 'Select your flat'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showError('Please fill all required fields')
      return
    }

    try {
      setVerifying(true)

      // Require that this user exists in admin-provided ResidentEntry data
      try {
        const adminRes = await mongoService.getAdminResidentEntries?.()
        const adminMatch = (adminRes?.data || []).find(r =>
          (r.email || '').toLowerCase() === form.email.toLowerCase() &&
          (r.building || '') === form.building &&
          (r.flatNumber || '') === form.flatNumber
        )
        if (!adminMatch) {
          showError('Not Found', 'Your details are not present in admin records. Contact admin.')
          return
        }
      } catch {}

      // Upload Aadhar image to Supabase
      let aadharUrl = ''
      if (form.aadharImage) {
        const uploadResult = await aadharService.uploadAadhar(form.aadharImage, user.id)
        if (!uploadResult.success) {
          throw new Error(uploadResult.error)
        }
        aadharUrl = uploadResult.data.publicUrl
      }

      // Verify with backend (uses admin ResidentEntry records)
      const verifyResult = await residentService.verifyResident({
        email: form.email,
        name: form.name,
        aadharNumber: extractedAadhar,
        building: form.building,
        flatNumber: form.flatNumber,
        supabaseUserId: user.id
      })

      if (verifyResult.success && verifyResult.data.verified) {
        // Create Razorpay order for verification fee (5000 INR)
        const orderResp = await paymentService.createVerificationOrder({ supabaseUserId: user.id, amountPaise: 500000 })
        if (!orderResp?.success) throw new Error(orderResp?.error || 'Failed to create payment order')
        const { order, keyId } = orderResp.data

        // Open Razorpay Checkout
        await new Promise((resolve, reject) => {
          const options = {
            key: keyId,
            amount: order.amount,
            currency: order.currency,
            name: 'Community Service',
            description: 'Resident Verification Fee',
            order_id: order.id,
            prefill: { name: form.name, email: form.email },
            handler: async function (response) {
              try {
                const verify = await paymentService.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  supabaseUserId: user.id
                })
                if (verify?.success) {
                  showSuccess('Verification & payment successful! Access granted.')
                  onVerified(verify.data.resident)
                  resolve()
                } else {
                  showError('Payment verification failed', verify?.error || 'Please try again.')
                  reject(new Error('Payment verification failed'))
                }
              } catch (err) {
                reject(err)
              }
            },
            modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
          }
          const rzp = new window.Razorpay(options)
          rzp.open()
        })
      } else {
        showError('Verification failed', verifyResult.data?.reason || 'Details do not match our records')
      }
    } catch (error) {
      console.error('Verification error:', error)
      showError('Verification failed', error.message)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resident Verification</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Please provide your details to verify your residency
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              readOnly={!!(user?.user_metadata?.full_name || user?.user_metadata?.name)}
              className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              readOnly={!!user?.email}
              className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building *</label>
              <div className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${errors.building ? 'border-red-500' : 'border-gray-300'}`}>
                {form.building || 'Not assigned'}
              </div>
              {errors.building && <p className="text-red-500 text-xs mt-1">{errors.building}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat *</label>
              <div className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${errors.flatNumber ? 'border-red-500' : 'border-gray-300'}`}>
                {form.flatNumber ? `${form.flatNumber}-${form.building}` : 'Not assigned'}
              </div>
              {errors.flatNumber && <p className="text-red-500 text-xs mt-1">{errors.flatNumber}</p>}
            </div>
          </div>

          {/* Aadhar number (extracted after upload) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aadhar Number *
            </label>
            <input
              type="text"
              value={extractedAadhar}
              onChange={(e) => setExtractedAadhar(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${
                errors.aadharNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={form.aadharImage ? 'Auto-filled after upload' : 'Upload Aadhaar image to extract'}
              disabled={!form.aadharImage}
            />
            {errors.aadharNumber && <p className="text-red-500 text-xs mt-1">{errors.aadharNumber}</p>}
          </div>

          {/* Aadhar number is extracted automatically from the uploaded image */}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Aadhar Card Image *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${
                errors.aadharImage ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.aadharImage && <p className="text-red-500 text-xs mt-1">{errors.aadharImage}</p>}
            
            {form.aadharPreview && (
              <div className="mt-2">
                <img
                  src={form.aadharPreview}
                  alt="Aadhar preview"
                  className="w-full h-32 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying...' : 'Verify Residency'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your information will be verified against our records. 
            Contact the admin if you need assistance.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResidentVerification
