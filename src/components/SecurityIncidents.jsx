import { useState, useEffect, useCallback } from 'react'
import {
  Shield, AlertTriangle, Plus, Search, Filter, Clock, MapPin,
  User, Camera, X, Eye, Edit, Trash2, CheckCircle, AlertCircle,
  FileText, ChevronDown, Calendar, Building, ArrowLeft
} from 'lucide-react'
import { mongoService } from '../services/mongoService'
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', ring: 'ring-red-500' },
  high: { label: 'High', color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', ring: 'ring-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', ring: 'ring-yellow-500' },
  low: { label: 'Low', color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', ring: 'ring-blue-500' }
}

const CATEGORIES = [
  'Unauthorized Entry', 'Theft/Robbery', 'Fire Alarm', 'Medical Emergency',
  'Vandalism', 'Suspicious Activity', 'Parking Violation', 'Noise Complaint',
  'Equipment Malfunction', 'Power Outage', 'Water Leak', 'Other'
]

const STATUS_CONFIG = {
  reported: { label: 'Reported', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  investigating: { label: 'Investigating', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' }
}

const SecurityIncidents = ({ user }) => {
  const [incidents, setIncidents] = useState([])
  const [filteredIncidents, setFilteredIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list, add, details
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ severity: 'all', status: 'all', category: 'all' })
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', category: 'Suspicious Activity',
    severity: 'medium', location: '', building: '', witnesses: '',
    actionTaken: '', notes: ''
  })

  const STORAGE_KEY = 'security_incidents'

  const loadIncidents = useCallback(() => {
    setLoading(true)
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setIncidents(stored)
    } catch {
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadIncidents() }, [loadIncidents])

  useEffect(() => {
    let filtered = [...incidents]
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
      )
    }
    if (filters.severity !== 'all') filtered = filtered.filter(i => i.severity === filters.severity)
    if (filters.status !== 'all') filtered = filtered.filter(i => i.status === filters.status)
    if (filters.category !== 'all') filtered = filtered.filter(i => i.category === filters.category)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setFilteredIncidents(filtered)
  }, [incidents, searchTerm, filters])

  const stats = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    today: incidents.filter(i => {
      const d = new Date(i.createdAt)
      const today = new Date()
      return d.toDateString() === today.toDateString()
    }).length
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) { showError('Title Required', 'Please enter an incident title.'); return }
    if (!form.description.trim()) { showError('Description Required', 'Please describe the incident.'); return }

    const newIncident = {
      _id: `INC-${Date.now()}`,
      ...form,
      status: 'reported',
      reportedBy: user?.name || user?.email || 'Security',
      reportedById: user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [{
        action: 'Incident Reported',
        by: user?.name || 'Security',
        at: new Date().toISOString(),
        notes: 'Initial report filed'
      }]
    }

    const updated = [newIncident, ...incidents]
    setIncidents(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    showSuccess('Incident Logged!', `Incident ${newIncident._id} has been recorded.`)
    setForm({ title: '', description: '', category: 'Suspicious Activity', severity: 'medium', location: '', building: '', witnesses: '', actionTaken: '', notes: '' })
    setView('list')
  }

  const updateStatus = async (incidentId, newStatus) => {
    const updated = incidents.map(i => {
      if (i._id !== incidentId) return i
      return {
        ...i,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        timeline: [...(i.timeline || []), {
          action: `Status changed to ${newStatus}`,
          by: user?.name || 'Security',
          at: new Date().toISOString()
        }]
      }
    })
    setIncidents(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (selectedIncident?._id === incidentId) {
      setSelectedIncident(updated.find(i => i._id === incidentId))
    }
    showSuccess('Status Updated', `Incident marked as ${newStatus}.`)
  }

  const deleteIncident = async (incidentId) => {
    const confirmed = await showConfirm('Delete Incident?', 'This action cannot be undone.')
    if (!confirmed?.isConfirmed) return
    const updated = incidents.filter(i => i._id !== incidentId)
    setIncidents(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (selectedIncident?._id === incidentId) { setSelectedIncident(null); setView('list') }
    showSuccess('Deleted', 'Incident has been removed.')
  }

  // ── Details View ──
  if (view === 'details' && selectedIncident) {
    const sev = SEVERITY_CONFIG[selectedIncident.severity] || SEVERITY_CONFIG.medium
    const status = STATUS_CONFIG[selectedIncident.status] || STATUS_CONFIG.reported
    return (
      <div className="space-y-6">
        <button onClick={() => { setView('list'); setSelectedIncident(null) }}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Incidents
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className={`px-6 py-4 ${sev.bg} border-b border-gray-200 dark:border-gray-700`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`w-3 h-3 rounded-full ${sev.color}`} />
                  <span className={`text-sm font-medium ${sev.text}`}>{sev.label} Severity</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedIncident.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {selectedIncident._id} • {selectedIncident.category}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => deleteIncident(selectedIncident._id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
              <p className="text-gray-600 dark:text-gray-400">{selectedIncident.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedIncident.location || 'Not specified'}
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reported By</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <User className="w-3 h-3" /> {selectedIncident.reportedBy}
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reported At</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(selectedIncident.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {selectedIncident.actionTaken && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Action Taken</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedIncident.actionTaken}</p>
              </div>
            )}

            {/* Status Update */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Update Status</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => updateStatus(selectedIncident._id, key)}
                    disabled={selectedIncident.status === key}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedIncident.status === key
                      ? 'ring-2 ring-blue-500 opacity-100 ' + cfg.color
                      : cfg.color + ' opacity-60 hover:opacity-100'}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            {selectedIncident.timeline?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Activity Timeline</h4>
                <div className="space-y-3">
                  {selectedIncident.timeline.map((tl, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5" />
                        {i < selectedIncident.timeline.length - 1 && <div className="flex-1 w-0.5 bg-gray-200 dark:bg-gray-600 my-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{tl.action}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tl.by} • {new Date(tl.at).toLocaleString()}</p>
                        {tl.notes && <p className="text-xs text-gray-500 mt-0.5">{tl.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Add Incident Form ──
  if (view === 'add') {
    return (
      <div className="space-y-6">
        <button onClick={() => setView('list')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Incidents
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Log Security Incident</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Record a new security incident</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Incident Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Brief title of the incident..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity *</label>
                <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                  placeholder="e.g. Main Gate, Parking B, etc."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Building</label>
                <select value={form.building} onChange={e => setForm({...form, building: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">Select Building</option>
                  <option value="A">Building A</option>
                  <option value="B">Building B</option>
                  <option value="C">Building C</option>
                  <option value="Common">Common Area</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Detailed description of what happened..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Witnesses</label>
                <input type="text" value={form.witnesses} onChange={e => setForm({...form, witnesses: e.target.value})}
                  placeholder="Names of any witnesses..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Immediate Action Taken</label>
                <input type="text" value={form.actionTaken} onChange={e => setForm({...form, actionTaken: e.target.value})}
                  placeholder="What action has been taken so far..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setView('list')}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl hover:from-red-600 hover:to-orange-600 transition-all font-medium shadow-lg shadow-red-500/25">
                <AlertTriangle className="w-4 h-4 inline mr-1" /> Log Incident
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Incidents', value: stats.total, icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-700/50' },
          { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Investigating', value: stats.investigating, icon: Eye, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Today', value: stats.today, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' }
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className={`${s.bg} p-4 rounded-2xl`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Security Incidents</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{filteredIncidents.length} incidents found</p>
            </div>
          </div>
          <button onClick={() => setView('add')}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all font-medium shadow-lg shadow-red-500/25">
            <Plus className="w-4 h-4" /> Log Incident
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search incidents..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={filters.severity} onChange={e => setFilters({...filters, severity: e.target.value})}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="all">All Status</option>
            <option value="reported">Reported</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Incident List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">No Incidents Found</h4>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {incidents.length === 0 ? 'No security incidents have been logged yet.' : 'No incidents match your current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map(incident => {
              const sev = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium
              const status = STATUS_CONFIG[incident.status] || STATUS_CONFIG.reported
              return (
                <div key={incident._id}
                  onClick={() => { setSelectedIncident(incident); setView('details') }}
                  className="group p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full ${sev.color} mt-1.5 ring-4 ${sev.bg} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{incident.title}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{incident.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                          <button onClick={e => { e.stopPropagation(); deleteIncident(incident._id) }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(incident.createdAt).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{incident.reportedBy}</span>
                        {incident.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{incident.location}</span>}
                        <span className={`px-2 py-0.5 rounded-full ${sev.bg} ${sev.text} font-medium`}>{sev.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SecurityIncidents
