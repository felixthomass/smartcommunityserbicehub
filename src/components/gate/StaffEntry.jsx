import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, ShieldCheck, CheckCircle, XCircle, ArrowLeft, Clock, User, List, Loader2 } from 'lucide-react';
import { gateService } from '../../services/gateService';

const StaffEntry = ({ onBack }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [status, setStatus] = useState('idle'); // idle, captured, submitting, success, error
  const [result, setResult] = useState(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  const [viewMode, setViewMode]           = useState('entry'); // 'entry' | 'logs'
  const [scanMode, setScanMode]           = useState('checkin'); // 'checkin' | 'checkout'
  const [allLogs, setAllLogs]             = useState([]);
  const [loadingLogs, setLoadingLogs]     = useState(false);
  const [logDateFilter, setLogDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [logRoleFilter, setLogRoleFilter] = useState('all');

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const response = await gateService.getStaff();
      if (response.success) {
        setStaffList(response.data);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setStatus('captured');
  }, [webcamRef]);

  // ── Fetch Logs ───────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await gateService.getAttendance(logDateFilter);
      if (res.success) {
        let data = res.data || [];
        if (logRoleFilter !== 'all') {
          data = data.filter(d => (d.role || '').toLowerCase() === logRoleFilter.toLowerCase());
        }
        setAllLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logDateFilter, logRoleFilter]);

  useEffect(() => {
    if (viewMode === 'logs') fetchLogs();
  }, [viewMode, fetchLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!capturedImage || (!selectedStaffId && !result?.name)) return;
    
    setStatus('submitting');
    try {
      const formData = new FormData();
      if (selectedStaffId) formData.append('staffId', selectedStaffId);
      formData.append('action', scanMode); // explicit checkin/checkout logic
      
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      formData.append('photo', blob, 'staff_face.jpg');

      const response = await gateService.staffEntry(formData);
      if (response.success) {
        setStatus('success');
        setResult(response.data);
      } else {
        setStatus('error');
        setResult(response.error || 'Attendance marking failed');
      }
    } catch (err) {
      setStatus('error');
      setResult(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-purple-600 font-bold uppercase text-xs transition px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        
        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('entry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'entry' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> Entry Scanner
          </button>
          <button
            onClick={() => setViewMode('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'logs' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {viewMode === 'entry' ? (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-w-2xl mx-auto">

        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <ShieldCheck className="w-10 h-10" /> Staff Attendance
          </h2>
          <p className="text-purple-100 font-bold text-sm uppercase tracking-widest opacity-80 mt-1">
            Face capture & automatic logging
          </p>
        </div>

        <div className="p-8">
          {status === 'idle' ? (
            <div className="space-y-6">
              <div className="relative aspect-video bg-gray-900 rounded-3xl overflow-hidden border-4 border-gray-100 dark:border-gray-700 shadow-inner">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-[3px] border-white/20 pointer-events-none flex items-center justify-center">
                   <div className="w-72 h-72 border-2 border-dashed border-white/40 rounded-3xl animate-pulse"></div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-purple-600/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full">
                    Face recognition active
                  </span>
                </div>
              </div>

              {/* Scan Action Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl">
                <button
                  onClick={() => setScanMode('checkin')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                    scanMode === 'checkin' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Check-In Mode
                </button>
                <button
                  onClick={() => setScanMode('checkout')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                    scanMode === 'checkout' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Check-Out Mode
                </button>
              </div>
              
              <button 
                onClick={capture}
                className={`w-full py-6 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition shadow-xl active:scale-95 ${
                  scanMode === 'checkin' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                }`}
              >
                Capture for {scanMode === 'checkin' ? 'Check-In' : 'Check-Out'}
              </button>
            </div>
          ) : status === 'captured' ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-purple-500 shadow-2xl">
                <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                <button 
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="absolute top-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-md text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-black/70 transition"
                >
                  Retake
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-2">Identify Staff Member</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select 
                    required
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 font-bold transition-all appearance-none"
                  >
                    <option value="">Select Staff...</option>
                    {staffList.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.role} - {s.shift})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className={`w-full py-6 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition shadow-xl active:scale-95 ${
                  scanMode === 'checkin' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                }`}
              >
                Confirm {scanMode === 'checkin' ? 'Check-In' : 'Check-Out'}
              </button>
            </form>
          ) : status === 'submitting' ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing Attendance...</p>
            </div>
          ) : status === 'success' ? (
            <div className="py-12 text-center space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle size={64} />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                  {result.type === 'check-out' ? 'Checked Out' : 'Checked In'}
                </h3>
                <div className="flex items-center justify-center gap-4 mt-2 font-bold text-gray-500">
                   <span className="flex items-center gap-1"><Clock size={16}/> {new Date(result.type === 'check-out' ? result.checkOut || result.checkIn : result.checkIn).toLocaleTimeString()}</span>
                   {result.status && (
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                       result.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                     }`}>
                       {result.status}
                     </span>
                   )}
                </div>
              </div>
              <button 
                onClick={() => { setStatus('idle'); setSelectedStaffId(''); setCapturedImage(null); }}
                className="px-12 py-4 bg-gray-900 dark:bg-gray-700 text-white font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition active:scale-95 shadow-lg"
              >
                Next Staff
              </button>
            </div>
          ) : (
            <div className="py-12 text-center space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
                <XCircle size={64} />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-red-600 dark:text-red-400 uppercase tracking-tighter">Marking Failed</h3>
                <p className="font-bold text-gray-400">{result || 'Could not process attendance'}</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="px-12 py-4 bg-gray-900 dark:bg-gray-700 text-white font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition active:scale-95 shadow-lg"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* ── Logs View ────────────────────────────────────────────── */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-bold text-gray-900 dark:text-white">Staff Entry History</h3>
            <div className="flex gap-3 text-sm">
              <input 
                type="date"
                value={logDateFilter}
                onChange={e => setLogDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select 
                value={logRoleFilter}
                onChange={e => setLogRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Roles</option>
                <option value="security">Security</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs font-bold tracking-wider uppercase border-b border-gray-100 dark:border-gray-700">
                  <th className="p-4 font-medium">Staff Member</th>
                  <th className="p-4 font-medium">Role & Shift</th>
                  <th className="p-4 font-medium">Check-In</th>
                  <th className="p-4 font-medium">Check-Out</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loadingLogs ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Loading history...
                    </td>
                  </tr>
                ) : allLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      No staff entry records found for the selected date.
                    </td>
                  </tr>
                ) : (
                  allLogs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                            {log.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{log.name}</p>
                            <p className="text-xs text-gray-500">
                              {typeof log.staffId === 'object' ? log.staffId._id : log.staffId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-gray-900 dark:text-gray-200 capitalize">{log.role}</p>
                        <p className="text-xs text-gray-500">{log.shift}</p>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {log.checkIn ? new Date(log.checkIn).toLocaleTimeString() : '-'}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          log.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                          log.status === 'late' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {log.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffEntry;
