import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gateService } from '../../services/gateService';
import { showSuccess, showError, showConfirm } from '../../utils/sweetAlert';
import FaceEnrollment from '../../components/gate/FaceEnrollment';
import {
  ShieldCheck, UserCheck, Scan, Trash2, RefreshCw,
  Edit2, X, CheckCircle2, AlertCircle, Camera, Users,
  Search, Loader2, Activity, Clock
} from 'lucide-react';

const FaceManagement = () => {
  const [staffList, setStaffList]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [filter, setFilter]               = useState('all'); // all | enrolled | missing
  const [modalState, setModalState]       = useState({ open: false, staffId: null, isUpdate: false });
  const [deletingId, setDeletingId]       = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await gateService.getAllStaff();
      if (res.success) setStaffList(res.data);
      else showError('Load Failed', res.error);
    } catch (e) {
      showError('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const loadAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/attendance?date=${today}`);
      const data = await res.json();
      if (data.success) setRecentActivity(data.data.slice(0, 6));
    } catch (e) { /* silent */ }
  };

  useEffect(() => { loadAttendance(); }, []);

  const handleDelete = async (staffId, name) => {
    const result = await showConfirm('Delete Face Data', `Remove all biometric data for ${name}?`);
    if (!result.isConfirmed) return;
    setDeletingId(staffId);
    try {
      const res = await gateService.deleteFace(staffId);
      if (res.success) {
        showSuccess('Deleted', `Face data removed for ${name}`);
        loadStaff();
      } else {
        showError('Error', res.error);
      }
    } catch (e) {
      showError('Error', e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = (staffId, isUpdate = false) => setModalState({ open: true, staffId, isUpdate });
  const closeModal = (success) => {
    setModalState({ open: false, staffId: null, isUpdate: false });
    if (success) { loadStaff(); loadAttendance(); }
  };

  // Stats
  const enrolled = staffList.filter(s => s.hasFace).length;
  const missing  = staffList.length - enrolled;

  const filtered = staffList.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.role?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'enrolled' && s.hasFace) || (filter === 'missing' && !s.hasFace);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Staff',    value: staffList.length, icon: Users,        color: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600' },
          { label: 'Face Enrolled',  value: enrolled,         icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600' },
          { label: 'Missing Biometrics', value: missing,      icon: AlertCircle,  color: 'amber', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-6 h-6 ${stat.text}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{stat.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Content Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Staff List (2 cols) */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              {[['all', 'All'], ['enrolled', '✓ Enrolled'], ['missing', '⚠ Missing']].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === val ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                <tr>
                  <th className="px-5 py-3 text-left">Staff</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Shift</th>
                  <th className="px-5 py-3 text-left">Biometrics</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-12 text-gray-400 text-sm font-bold">No staff found</td></tr>
                ) : (
                  filtered.map(staff => (
                    <tr key={staff._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                            {staff.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{staff.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">{staff.role}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">{staff.shift || '—'}</td>
                      <td className="px-5 py-3">
                        {staff.hasFace ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[10px] font-black uppercase tracking-wide">
                            <CheckCircle2 className="w-3 h-3" /> Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[10px] font-black uppercase tracking-wide">
                            <AlertCircle className="w-3 h-3" /> Missing
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            title={staff.hasFace ? 'Update Face' : 'Enroll Face'}
                            onClick={() => openModal(staff._id, staff.hasFace)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            {staff.hasFace ? <Edit2 className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                          </button>
                          {staff.hasFace && (
                            <button
                              title="Delete Face Data"
                              disabled={deletingId === staff._id}
                              onClick={() => handleDelete(staff._id, staff.name)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                              {deletingId === staff._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Today's Attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Today's Attendance</h5>
            <button onClick={loadAttendance} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {recentActivity.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Clock className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No records today</p>
              </div>
            ) : (
              recentActivity.map((log, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] text-white font-black flex-shrink-0">
                      {(log.staffId?.name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{log.staffId?.name || 'Unknown'}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">
                        {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    log.status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  }`}>{log.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Enrollment Modal ───────────────────────────────── */}
      <AnimatePresence>
        {modalState.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl"
            >
              <button
                onClick={() => closeModal(false)}
                className="absolute top-5 right-5 z-10 w-9 h-9 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <FaceEnrollment
                staffId={modalState.staffId}
                isUpdate={modalState.isUpdate}
                onComplete={closeModal}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FaceManagement;
