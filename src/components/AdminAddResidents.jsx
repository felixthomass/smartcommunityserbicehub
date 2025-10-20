import React, { useEffect, useState } from 'react'
import { residentService } from '../services/residentService'
import { mongoService } from '../services/mongoService'
import { aadharService } from '../services/aadharService'
import { showSuccess, showError } from '../utils/sweetAlert'
import { Users, Search, Filter, Edit, Trash2, Shield, User, Building2, Phone, Mail, Eye, EyeOff } from 'lucide-react'

const AdminAddResidents = () => {
  const [activeTab, setActiveTab] = useState('add') // 'add' or 'view'
  const [buildings, setBuildings] = useState([])
  const [building, setBuilding] = useState('')
  const [flats, setFlats] = useState([])
  const [flatNumber, setFlatNumber] = useState('')
  const [rows, setRows] = useState([{ name: '', email: '', phone: '', aadharNumber: '', aadharImage: null, aadharPreview: '', isOwner: false }])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [existingResidents, setExistingResidents] = useState([])
  const [loadingResidents, setLoadingResidents] = useState(false)
  
  // All residents view state
  const [allResidents, setAllResidents] = useState([])
  const [filteredResidents, setFilteredResidents] = useState([])
  const [loadingAllResidents, setLoadingAllResidents] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [buildingFilter, setBuildingFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedResident, setSelectedResident] = useState(null)
  const [showResidentDetails, setShowResidentDetails] = useState(false)

  // Static buildings A, B, C
  useEffect(() => {
    const staticBuildings = [
      { id: 'A', name: 'Building A' },
      { id: 'B', name: 'Building B' },
      { id: 'C', name: 'Building C' }
    ]
    setBuildings(staticBuildings)
  }, [])

  // Generate flat numbers per building and set list
  useEffect(() => {
    const generateFlats = (b) => {
      const cfg = { A: { floors: 4, perFloor: 6 }, B: { floors: 3, perFloor: 4 }, C: { floors: 5, perFloor: 8 } }[b] || { floors: 3, perFloor: 4 }
      const list = []
      for (let floor = 1; floor <= cfg.floors; floor++) {
        for (let n = 1; n <= cfg.perFloor; n++) {
          const fn = `${floor}${String(n).padStart(2, '0')}` // e.g., 101
          list.push(fn)
        }
      }
      return list
    }

    if (!building) { setFlats([]); setFlatNumber(''); return }
    setFlats(generateFlats(building))
  }, [building])

  // Load existing residents for selected flat
  useEffect(() => {
    (async () => {
      if (!building || !flatNumber) { setExistingResidents([]); return }
      try {
        setLoadingResidents(true)
        const res = await residentService.listByFlat(building, flatNumber)
        if (res.success) setExistingResidents(res.residents || res.data || [])
        else setExistingResidents([])
      } catch (e) {
        console.error(e)
        setExistingResidents([])
      } finally { setLoadingResidents(false) }
    })()
  }, [building, flatNumber, saving])

  // Load all residents
  const loadAllResidents = async () => {
    try {
      setLoadingAllResidents(true)
      const response = await mongoService.getAdminResidentEntries()
      console.log('Loaded all residents:', response)
      
      if (response.success && response.data) {
        const formattedResidents = response.data.map(resident => ({
          ...resident,
          adminAdded: true,
          flatDisplay: `${resident.flatNumber}-${resident.building}`,
          status: resident.isOwner ? 'Owner' : 'Tenant'
        }))
        setAllResidents(formattedResidents)
        setFilteredResidents(formattedResidents)
      } else {
        setAllResidents([])
        setFilteredResidents([])
      }
    } catch (error) {
      console.error('Error loading all residents:', error)
      showError('Failed to load residents', error.message)
      setAllResidents([])
      setFilteredResidents([])
    } finally {
      setLoadingAllResidents(false)
    }
  }

  // Filter residents based on search and filters
  useEffect(() => {
    let filtered = [...allResidents]

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(resident =>
        resident.name?.toLowerCase().includes(searchLower) ||
        resident.email?.toLowerCase().includes(searchLower) ||
        resident.phone?.includes(searchTerm) ||
        resident.flatNumber?.toLowerCase().includes(searchLower) ||
        resident.building?.toLowerCase().includes(searchLower) ||
        resident.aadharNumber?.includes(searchTerm)
      )
    }

    // Building filter
    if (buildingFilter) {
      filtered = filtered.filter(resident => resident.building === buildingFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'owner') {
        filtered = filtered.filter(resident => resident.isOwner)
      } else if (statusFilter === 'tenant') {
        filtered = filtered.filter(resident => !resident.isOwner)
      }
    }

    setFilteredResidents(filtered)
  }, [allResidents, searchTerm, buildingFilter, statusFilter])

  // Load all residents when switching to view tab
  useEffect(() => {
    if (activeTab === 'view' && allResidents.length === 0) {
      loadAllResidents()
    }
  }, [activeTab])

  const addRow = () => setRows([...rows, { name: '', email: '', phone: '', aadharNumber: '', aadharImage: null, aadharPreview: '', isOwner: false }])
  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx))

  const setField = (idx, field, value) => {
    const next = [...rows]
    next[idx][field] = value
    setRows(next)
  }

  const onFile = async (idx, file) => {
    setField(idx, 'aadharImage', file)
    if (file) setField(idx, 'aadharPreview', URL.createObjectURL(file))
    try {
      if (file) {
        const ocr = await aadharService.extractAadharDataFromImage(file)
        const extracted = ocr?.data?.aadharNumber || ''
        if (extracted) setField(idx, 'aadharNumber', extracted)
      }
    } catch (e) {
      // ignore OCR failures for UX; user can enter manually
    }
  }

  const submit = async () => {
    const nextErrors = {}
    if (!building) nextErrors.building = 'Select a building'
    if (!flatNumber) nextErrors.flat = 'Select a flat'
    rows.forEach((r, i) => {
      if (!r.name) nextErrors[`name_${i}`] = 'Required'
      if (!r.email) nextErrors[`email_${i}`] = 'Required'
    })
    const owners = rows.filter(r => r.isOwner)
    if (owners.length > 1) nextErrors.owners = 'Only one owner allowed per flat'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { showError('Please fix errors before submitting'); return }
    try {
      setSaving(true)

      const enriched = []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        let aadharUrl = ''
        let ocr = { data: {} }
        if (r.aadharImage) {
          const up = await aadharService.uploadAadhar(r.aadharImage, `${building}-${flatNumber}-${r.email}`)
          if (!up.success) throw new Error(up.error)
          aadharUrl = up.data.publicUrl
          ocr = await aadharService.extractAadharDataFromImage(r.aadharImage)
        }
        enriched.push({ ...r, aadharUrl, ocr: ocr.data || {} })
      }

      const payload = {
        building,
        flatNumber,
        residents: enriched.map(r => ({
          name: r.name,
          email: r.email,
          phone: r.phone,
          aadharNumber: r.aadharNumber || r.ocr?.aadharNumber || '',
          aadharUrl: r.aadharUrl,
          isOwner: !!r.isOwner
        }))
      }

      const res = await residentService.adminCreateResidents(payload)
      if (res.success) {
        showSuccess('Residents added successfully!')
        setRows([{ name: '', email: '', phone: '', aadharNumber: '', aadharImage: null, aadharPreview: '', isOwner: false }])
        try {
          const rs = await residentService.listByFlat(building, flatNumber)
          if (rs.success) setExistingResidents(rs.residents || rs.data || [])
        } catch {}
      } else {
        showError('Failed to add residents', res.error || 'Try again')
      }
    } catch (e) {
      console.error(e)
      showError('Error', e.message)
    } finally { setSaving(false) }
  }

  // Delete resident
  const deleteResident = async (residentId) => {
    if (!confirm('Are you sure you want to delete this resident?')) return
    
    try {
      const response = await residentService.deleteResident(residentId)
      if (response.success) {
        showSuccess('Resident deleted successfully!')
        loadAllResidents() // Refresh the list
      } else {
        showError('Failed to delete resident', response.error)
      }
    } catch (error) {
      console.error('Error deleting resident:', error)
      showError('Error deleting resident', error.message)
    }
  }

  // Toggle owner status
  const toggleOwnerStatus = async (resident) => {
    try {
      const newOwnerStatus = !resident.isOwner
      const response = await residentService.updateResident(resident._id, { isOwner: newOwnerStatus })
      
      if (response.success) {
        showSuccess(`Resident ${newOwnerStatus ? 'made owner' : 'removed as owner'} successfully!`)
        loadAllResidents() // Refresh the list
      } else {
        showError('Failed to update resident', response.error)
      }
    } catch (error) {
      console.error('Error updating resident:', error)
      showError('Error updating resident', error.message)
    }
  }

  // View resident details
  const viewResidentDetails = (resident) => {
    setSelectedResident(resident)
    setShowResidentDetails(true)
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'add'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Add Residents
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            View All Residents
          </button>
        </div>
      </div>

      {/* Add Residents Tab */}
      {activeTab === 'add' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building</label>
                <select value={building} onChange={e=>{ setBuilding(e.target.value); setFlatNumber('') }} className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${errors.building ? 'border-red-500' : ''}`}>
                  <option value="">Select Building</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {errors.building && <div className="text-xs text-red-600 mt-1">{errors.building}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat</label>
                <select value={flatNumber} onChange={e=>setFlatNumber(e.target.value)} className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${errors.flat ? 'border-red-500' : ''}`} disabled={!building}>
                  <option value="">Select Flat</option>
                  {flats.map(f => (
                    <option key={`${building}-${f}`} value={f}>{`${f}-${building}`}</option>
                  ))}
                </select>
                {errors.flat && <div className="text-xs text-red-600 mt-1">{errors.flat}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={addRow} className="px-3 py-2 bg-gray-700 text-white rounded-lg w-full">Add Resident</button>
              </div>
              <div className="text-right">
                <button onClick={submit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save Residents'}</button>
                {errors.owners && <div className="text-xs text-red-600 mt-1">{errors.owners}</div>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {rows.map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input value={r.name} onChange={e=>setField(idx,'name',e.target.value)} placeholder="Full name" className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${errors[`name_${idx}`] ? 'border-red-500' : ''}`} />
                    {errors[`name_${idx}`] && <div className="text-xs text-red-600 mt-1">{errors[`name_${idx}`]}</div>}
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input value={r.email} onChange={e=>setField(idx,'email',e.target.value)} placeholder="email@example.com" className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${errors[`email_${idx}`] ? 'border-red-500' : ''}`} />
                    {errors[`email_${idx}`] && <div className="text-xs text-red-600 mt-1">{errors[`email_${idx}`]}</div>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <input value={r.phone} onChange={e=>setField(idx,'phone',e.target.value)} placeholder="Phone" className="w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aadhar Image</label>
                    <input type="file" accept="image/*" onChange={e=>onFile(idx, e.target.files[0])} className="w-full" />
                    {r.aadharPreview && (<img src={r.aadharPreview} alt="preview" className="mt-2 h-16 object-cover rounded" />)}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aadhar Number</label>
                    <input
                      value={r.aadharNumber}
                      onChange={e=>setField(idx,'aadharNumber',e.target.value)}
                      placeholder="Auto-filled after upload"
                      disabled={!r.aadharImage}
                      className={`w-full px-3 py-2 border rounded-lg dark:border-gray-600 dark:bg-gray-700 ${!r.aadharImage ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    {!r.aadharImage && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload Aadhaar image to enable and auto-fill number.</div>
                    )}
                  </div>
                  <div className="lg:col-span-1 flex items-center">
                    <label className="inline-flex items-center gap-2 mt-6">
                      <input type="checkbox" checked={!!r.isOwner} onChange={e=>setField(idx,'isOwner',e.target.checked)} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Owner</span>
                    </label>
                  </div>
                  <div className="lg:col-span-12 flex justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Mark exactly one resident as the flat owner.</div>
                    <button onClick={()=>removeRow(idx)} className="px-3 py-2 border rounded-lg">Remove</button>
                  </div>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">No residents added. Click "Add Resident".</div>
            )}
          </div>

          {/* Existing residents in selected flat */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Residents in this flat</h3>
              {loadingResidents && <span className="text-xs text-gray-500">Loading…</span>}
            </div>
            {(!building || !flatNumber) ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a building and flat to view residents.</p>
            ) : (existingResidents.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No residents found for {building}-{flatNumber}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-left py-2 px-2">Email</th>
                      <th className="text-left py-2 px-2">Phone</th>
                      <th className="text-left py-2 px-2">Aadhar</th>
                      <th className="text-left py-2 px-2">Owner</th>
                      <th className="text-left py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingResidents.map((res) => (
                      <tr key={res._id} className="border-b dark:border-gray-700">
                        <td className="py-2 px-2 text-sm">{res.name}</td>
                        <td className="py-2 px-2 text-sm">{res.email}</td>
                        <td className="py-2 px-2 text-sm">{res.phone || '-'}</td>
                        <td className="py-2 px-2 text-sm">{res.aadharNumber ? res.aadharNumber.replace(/(\d{4})(?=\d)/g,'$1 ') : '-'}</td>
                        <td className="py-2 px-2 text-sm">{res.isOwner ? 'Yes' : 'No'}</td>
                        <td className="py-2 px-2 text-sm">
                          <div className="flex gap-2">
                            <button onClick={async ()=>{
                              const nextOwner = !res.isOwner
                              if (nextOwner) {
                                const ownerExists = existingResidents.some(r=>r.isOwner && r._id!==res._id)
                                if (ownerExists) { showError('Owner already exists for this flat'); return }
                              }
                              const up = await residentService.updateResident(res._id, { isOwner: nextOwner })
                              if (up.success) {
                                setExistingResidents(prev => prev.map(x => x._id===res._id ? { ...x, isOwner: nextOwner } : x))
                                showSuccess('Updated')
                              } else showError('Update failed', up.error)
                            }} className="px-2 py-1 border rounded">{res.isOwner ? 'Remove Owner' : 'Make Owner'}</button>
                            <button onClick={async ()=>{
                              if (!confirm('Delete this resident?')) return
                              const del = await residentService.deleteResident(res._id)
                              if (del.success) {
                                setExistingResidents(prev => prev.filter(x => x._id!==res._id))
                                showSuccess('Deleted')
                              } else showError('Delete failed', del.error)
                            }} className="px-2 py-1 border rounded text-red-600">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Residents Tab */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          {/* Header with refresh button */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Residents</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredResidents.length} of {allResidents.length} residents shown
                </p>
              </div>
              <button
                onClick={loadAllResidents}
                disabled={loadingAllResidents}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                {loadingAllResidents ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search residents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Buildings</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="owner">Owners</option>
                <option value="tenant">Tenants</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setBuildingFilter('')
                  setStatusFilter('all')
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Filter className="w-5 h-5" />
                Clear Filters
              </button>
            </div>
          </div>

          {/* Residents Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
            {loadingAllResidents ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading residents...</p>
              </div>
            ) : filteredResidents.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {allResidents.length === 0 ? 'No residents found' : 'No residents match your filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Resident</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredResidents.map((resident) => (
                      <tr key={resident._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{resident.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Aadhar: {resident.aadharNumber ? resident.aadharNumber.replace(/(\d{4})(?=\d)/g,'$1 ') : 'Not provided'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{resident.email}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {resident.phone || 'No phone'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {resident.flatDisplay}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{resident.building} Building</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            resident.isOwner 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {resident.isOwner ? 'Owner' : 'Tenant'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewResidentDetails(resident)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleOwnerStatus(resident)}
                              className={`${resident.isOwner ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'}`}
                              title={resident.isOwner ? 'Remove as Owner' : 'Make Owner'}
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteResident(resident._id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete Resident"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resident Details Modal */}
      {showResidentDetails && selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resident Details</h3>
                <button
                  onClick={() => setShowResidentDetails(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <EyeOff className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedResident.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {selectedResident.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {selectedResident.phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Aadhar Number</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedResident.aadharNumber ? selectedResident.aadharNumber.replace(/(\d{4})(?=\d)/g,'$1 ') : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Building</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      {selectedResident.building} Building
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Flat Number</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedResident.flatNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      selectedResident.isOwner 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {selectedResident.isOwner ? 'Owner' : 'Tenant'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created Date</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedResident.createdAt ? new Date(selectedResident.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                {selectedResident.aadharUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aadhar Document</label>
                    <img 
                      src={selectedResident.aadharUrl} 
                      alt="Aadhar Document" 
                      className="max-w-full h-auto rounded-lg border dark:border-gray-600"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={() => setShowResidentDetails(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAddResidents



