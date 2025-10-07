import React, { useEffect, useState } from 'react'
import { residentService } from '../services/residentService'
import { aadharService } from '../services/aadharService'
import { showSuccess, showError } from '../utils/sweetAlert'

const AdminAddResidents = () => {
  const [buildings, setBuildings] = useState([])
  const [building, setBuilding] = useState('')
  const [flats, setFlats] = useState([])
  const [flatNumber, setFlatNumber] = useState('')
  const [rows, setRows] = useState([{ name: '', email: '', phone: '', aadharNumber: '', aadharImage: null, aadharPreview: '', isOwner: false }])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [existingResidents, setExistingResidents] = useState([])
  const [loadingResidents, setLoadingResidents] = useState(false)

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

  return (
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
  )
}

export default AdminAddResidents



