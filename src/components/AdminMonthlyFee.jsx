import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, Search, Calendar, Users, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { monthlyFeeService } from '../services/monthlyFeeService'
import { residentService } from '../services/residentService'
import { showSuccess as _showSuccess, showError as _showError } from '../utils/sweetAlert'

const toMonthKey = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const AdminMonthlyFee = ({ adminId }) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [residentsLoading, setResidentsLoading] = useState(false)
  const [fee, setFee] = useState(null)
  const [amountInput, setAmountInput] = useState('')
  const [notes, setNotes] = useState('')
  const [residents, setResidents] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState(toMonthKey())
  const [statusFilter, setStatusFilter] = useState('all') // all | paid | pending
  const [buildingFilter, setBuildingFilter] = useState('all')

  const safeShowError = (msg) => {
    try { typeof _showError === 'function' ? _showError(msg) : alert(msg) } catch { alert(msg) }
  }
  const safeShowSuccess = (msg) => {
    try { typeof _showSuccess === 'function' ? _showSuccess(msg) : alert(msg) } catch { alert(msg) }
  }

  const loadFee = async () => {
    try {
      setLoading(true)
      const res = await monthlyFeeService.getFee()
      if (res.success) {
        setFee(res.data)
        if (res.data?.amount != null) setAmountInput(String(res.data.amount))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadResidents = async () => {
    try {
      setResidentsLoading(true)
      const { residents } = await residentService.listResidents()
      const list = residents || []
      setResidents(list)
      // Fetch status for each resident in parallel (simple approach)
      const results = await Promise.all(
        list.map(async (r) => {
          try {
            const s = await monthlyFeeService.getStatus(r.authUserId)
            return [r.authUserId, (s.success ? (s.data?.payments || []) : [])]
          } catch {
            return [r.authUserId, []]
          }
        })
      )
      const map = {}
      for (const [id, payments] of results) map[id] = payments
      setStatusMap(map)
    } catch (e) {
      console.error('Failed to load residents/status', e)
    } finally {
      setResidentsLoading(false)
    }
  }

  useEffect(() => {
    loadFee()
  }, [])

  useEffect(() => {
    loadResidents()
  }, [])

  const handleSaveFee = async (e) => {
    e.preventDefault()
    if (!amountInput || isNaN(Number(amountInput)) || Number(amountInput) < 0) {
      safeShowError('Enter a valid amount')
      return
    }
    try {
      setSaving(true)
      const res = await monthlyFeeService.setFee({ amount: Number(amountInput), notes, adminId: adminId || 'admin' })
      if (res.success) {
        setFee(res.data)
        safeShowSuccess('Monthly fee updated')
      } else {
        safeShowError(res.error || 'Failed to set fee')
      }
    } catch (e) {
      console.error(e)
      safeShowError('Failed to set fee')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFee = async () => {
    if (!confirm('Remove the current monthly fee? This will reset the amount for all future months.')) return
    try {
      setSaving(true)
      const res = await monthlyFeeService.deleteFee()
      if (res.success) {
        setFee(null)
        setAmountInput('')
        setNotes('')
        safeShowSuccess('Monthly fee removed')
      } else {
        safeShowError(res.error || 'Failed to delete monthly fee')
      }
    } catch (e) {
      console.error(e)
      safeShowError('Failed to delete monthly fee')
    } finally {
      setSaving(false)
    }
  }

  const filteredResidents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (residents || []).filter(r => {
      if (!q) return true
      const hay = [r.name, r.email, r.building, r.flatNumber].map(x => (x||'').toString().toLowerCase()).join(' ')
      return hay.includes(q)
    })
  }, [residents, search])

  const isPaidForMonth = (residentId) => {
    const payments = statusMap[residentId] || []
    return payments.some(p => p.month === month)
  }

  const monthToDate = (mk) => {
    const [y, m] = (mk || '').split('-').map(Number)
    if (!y || !m) return new Date()
    return new Date(y, m - 1, 1)
  }

  const changeMonth = (delta) => {
    const d = monthToDate(month)
    d.setMonth(d.getMonth() + delta)
    setMonth(toMonthKey(d))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Monthly Fee Management</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { loadFee(); loadResidents() }} className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={handleDeleteFee} disabled={saving} className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50">Delete Fee</button>
          </div>
        </div>
        <form onSubmit={handleSaveFee} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
            <input value={amountInput} onChange={e=>setAmountInput(e.target.value)} type="number" min="0" className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="e.g. 2500" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Optional note" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Month</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={()=>changeMonth(-1)} className="px-2 py-2 border dark:border-gray-600 rounded-lg">◀</button>
              <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <button type="button" onClick={()=>changeMonth(1)} className="px-2 py-2 border dark:border-gray-600 rounded-lg">▶</button>
            </div>
          </div>
          <div className="flex items-end">
            <button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save Fee'}</button>
          </div>
        </form>
        {loading && <div className="text-sm text-gray-500 mt-2">Loading current fee…</div>}
        {fee && (
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">Current: ₹{fee.amount} ({fee.currency || 'INR'})</div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-gray-600" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Payments for {month}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search resident, email, flat…" className="w-full pl-9 pr-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700">
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <select value={buildingFilter} onChange={e=>setBuildingFilter(e.target.value)} className="px-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700">
              <option value="all">All Buildings</option>
              {Array.from(new Set((residents||[]).map(r=>r.building).filter(Boolean))).map(b=> (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
        {(() => {
          const paidCount = (residents||[]).filter(r => (statusMap[r.authUserId]||[]).some(p => p.month === month)).length
          const total = (residents||[]).length
          const pendingCount = Math.max(0, total - paidCount)
          return (
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="mr-4">Paid: <span className="font-medium text-green-700 dark:text-green-400">{paidCount}</span></span>
              <span>Pending: <span className="font-medium text-orange-700 dark:text-orange-400">{pendingCount}</span></span>
            </div>
          )
        })()}
        {residentsLoading ? (
          <div className="text-gray-600 dark:text-gray-400">Loading residents…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3">Resident</th>
                  <th className="text-left py-2 px-3">Flat</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents
                  .filter(r => buildingFilter==='all' ? true : r.building === buildingFilter)
                  .filter(r => {
                    const paid = isPaidForMonth(r.authUserId)
                    if (statusFilter==='all') return true
                    return statusFilter==='paid' ? paid : !paid
                  })
                  .map(r => {
                  const paid = isPaidForMonth(r.authUserId)
                  const details = (statusMap[r.authUserId]||[]).find(p=>p.month===month)
                  return (
                    <tr key={r.authUserId} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-900 dark:text-white">{r.name || r.email || r.authUserId}</div>
                        <div className="text-xs text-gray-500">{r.email}</div>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300">{r.building}-{r.flatNumber}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${paid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {paid ? (<><CheckCircle2 className="w-3 h-3" /> Paid</>) : (<><XCircle className="w-3 h-3" /> Pending</>)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 dark:text-gray-400">
                        {paid ? (
                          <div className="space-y-0.5">
                            <div>Txn: <span className="font-mono">{details?.paymentId || details?.razorpay_payment_id || '-'}</span></div>
                            <div>When: {details?.paidAt ? new Date(details.paidAt).toLocaleString() : '-'}</div>
                            <div>Amt: ₹{(details?.amount||0)/100}</div>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminMonthlyFee


