import React, { useState, useEffect } from 'react';
import { Users, Clock, Camera, Calendar, Filter, Search, ShieldCheck, User as UserIcon, Plus, X, Scan } from 'lucide-react';
import { gateService } from '../../services/gateService';
import FaceAttendance from './FaceAttendance';

const GateAdmin = () => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'logs', 'face-scanner'
  const [attendance, setAttendance] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Registration State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regType, setRegType] = useState('worker'); // 'worker', 'staff'
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    type: 'maid',
    role: 'Housekeeping',
    shift: 'Morning',
    assignedFlats: ''
  });

  useEffect(() => {
    if (activeTab !== 'face-scanner') fetchData();
  }, [activeTab, date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'attendance') {
        const res = await gateService.getAttendance(date);
        if (res.success) setAttendance(res.data);
      } else {
        const res = await gateService.getEntryLogs({ date });
        if (res.success) setLogs(res.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (regType === 'worker') {
        res = await gateService.registerWorker({
          ...regForm,
          assignedFlats: regForm.assignedFlats.split(',').map(f => f.trim())
        });
      } else {
        res = await gateService.registerStaff({
          name: regForm.name,
          role: regForm.role,
          shift: regForm.shift
        });
      }
      
      if (res.success) {
        alert(`${regType === 'worker' ? 'Worker' : 'Staff'} registered successfully!`);
        setShowRegModal(false);
        setRegForm({ name: '', phone: '', type: 'maid', role: 'Housekeeping', shift: 'Morning', assignedFlats: '' });
      } else {
        alert('Registration failed: ' + res.error);
      }
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  const filteredData = activeTab === 'attendance' 
    ? (attendance || []).filter(a => a.staffId?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    : (logs || []).filter(l => l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone?.includes(searchTerm));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-900 dark:text-white font-outfit">
            <ShieldCheck className="text-purple-500 w-8 h-8" /> Gate Management Admin
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 ml-10">Audit attendance and entry logs</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowRegModal(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Register New
          </button>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'attendance' ? 'bg-white dark:bg-gray-600 shadow-xl text-purple-600 scale-105' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Attendance
            </button>
            <button 
              onClick={() => setActiveTab('face-scanner')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 ${activeTab === 'face-scanner' ? 'bg-white dark:bg-gray-600 shadow-xl text-blue-600 scale-105' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Scan size={13} /> Face Scanner
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'logs' ? 'bg-white dark:bg-gray-600 shadow-xl text-indigo-600 scale-105' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Entry Logs
            </button>
          </div>
        </div>
      </div>

      {/* Face Scanner Tab */}
      {activeTab === 'face-scanner' && <FaceAttendance />}

      {/* Attendance / Logs Tabs */}
      {activeTab !== 'face-scanner' && (<>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder={`Search ${activeTab === 'attendance' ? 'staff' : 'worker/staff'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-3xl shadow-sm font-bold text-sm transition-all text-gray-900 dark:text-white"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 rounded-3xl shadow-sm font-bold text-sm transition-all text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-24 text-center space-y-6">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-black text-gray-400 uppercase tracking-[0.2em] text-[10px]">Syncing Gate Database...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-24 text-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto">
               <Filter size={32} className="text-gray-300 dark:text-gray-600" />
            </div>
            <div className="space-y-2">
              <p className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-lg">No records found</p>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Adjust filters or select another date</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-outfit">User Profile</th>
                  <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-outfit">Face Proof</th>
                  <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-outfit">Check-In / Out</th>
                  <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-outfit">Status/Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {activeTab === 'attendance' ? (
                  (filteredData || []).map((item) => (
                    <tr key={item._id} className="hover:bg-purple-50/20 dark:hover:bg-purple-900/5 transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-purple-500/20">
                            {item.staffId?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-lg">{item.staffId?.name || 'Unknown Staff'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ROLE: {item.staffId?.role || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl group-hover:scale-110 transition-transform duration-500">
                          <img 
                            src={item.photo ? (item.photo.startsWith('http') ? item.photo : `http://localhost:3002${item.photo}`) : 'https://via.placeholder.com/150?text=No+Face'} 
                            className="w-full h-full object-cover" 
                            alt="Face proof" 
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Face'; }}
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <Camera className="text-white w-6 h-6" />
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="space-y-2 font-black text-sm">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl w-fit">
                             <Clock size={16} /> <span className="uppercase text-[10px] tracking-widest mr-1">In:</span> {item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl w-fit ${item.checkOut ? 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700' : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 animate-pulse'}`}>
                             <Clock size={16} /> <span className="uppercase text-[10px] tracking-widest mr-1">Out:</span> {item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'PENDING'}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="flex flex-col gap-2">
                           <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm text-center ${
                             item.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                           }`}>
                             {item.status}
                           </span>
                           {item.status === 'late' && (
                             <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-center">Delayed</span>
                           )}
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  (filteredData || []).map((item) => (
                    <tr key={item._id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${item.type === 'staff' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20'} text-white`}>
                            {item.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-lg">{item.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.type || 'Entry'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl group-hover:scale-110 transition-transform duration-500">
                          <img 
                            src={item.photo ? (item.photo.startsWith('http') ? item.photo : `http://localhost:3002${item.photo}`) : 'https://via.placeholder.com/150?text=No+Face'} 
                            className="w-full h-full object-cover" 
                            alt="Face proof" 
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Face'; }}
                          />
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="font-black text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-2xl w-fit">
                           {item.time ? new Date(item.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString()}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 ml-1">Captured entry</p>
                      </td>
                      <td className="px-10 py-8">
                         <div className="flex flex-col gap-2">
                           <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm text-center ${
                             item.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                           }`}>
                             {item.status}
                           </span>
                           {item.notes && (
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-1 truncate max-w-[150px]">{item.notes}</p>
                           )}
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>)}

      {/* Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Register New {regType === 'worker' ? 'Worker' : 'Staff'}</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Add to security database</p>
              </div>
              <button onClick={() => setShowRegModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-8 space-y-6">
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl mb-4">
                <button 
                  type="button"
                  onClick={() => setRegType('worker')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${regType === 'worker' ? 'bg-white dark:bg-gray-600 shadow-lg text-purple-600' : 'text-gray-500'}`}
                >
                  Worker (Maid/Driver)
                </button>
                <button 
                  type="button"
                  onClick={() => setRegType('staff')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${regType === 'staff' ? 'bg-white dark:bg-gray-600 shadow-lg text-blue-600' : 'text-gray-500'}`}
                >
                  Society Staff
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold text-sm transition-all text-gray-900 dark:text-white"
                    placeholder="Enter name"
                  />
                </div>
                
                {regType === 'worker' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                      <input 
                        type="text" 
                        required
                        value={regForm.phone}
                        onChange={(e) => setRegForm({...regForm, phone: e.target.value})}
                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold text-sm transition-all text-gray-900 dark:text-white"
                        placeholder="10-digit number"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Worker Type</label>
                      <select 
                        value={regForm.type}
                        onChange={(e) => setRegForm({...regForm, type: e.target.value})}
                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold text-sm transition-all text-gray-900 dark:text-white"
                      >
                        <option value="maid">Maid</option>
                        <option value="servant">Servant</option>
                        <option value="driver">Driver</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assigned Flats (comma separated)</label>
                      <input 
                        type="text" 
                        value={regForm.assignedFlats}
                        onChange={(e) => setRegForm({...regForm, assignedFlats: e.target.value})}
                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold text-sm transition-all text-gray-900 dark:text-white"
                        placeholder="e.g. 101, 202, 305"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Department/Role</label>
                      <input 
                        type="text" 
                        required
                        value={regForm.role}
                        onChange={(e) => setRegForm({...regForm, role: e.target.value})}
                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold text-sm transition-all text-gray-900 dark:text-white"
                        placeholder="e.g. Electrician"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Shift</label>
                      <select 
                        value={regForm.shift}
                        onChange={(e) => setRegForm({...regForm, shift: e.target.value})}
                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold text-sm transition-all text-gray-900 dark:text-white"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="flex-1 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all font-outfit"
                >
                  Register Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateAdmin;
