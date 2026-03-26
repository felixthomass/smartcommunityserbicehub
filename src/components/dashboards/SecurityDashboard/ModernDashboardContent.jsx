import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flame, Activity, AlertOctagon, Zap, X, Shield, AlertCircle } from 'lucide-react';
import HeroCard from './HeroCard';
import QuickActions from './QuickActions';
import AlertPanel from './AlertPanel';
import ActivityFeed from './ActivityFeed';
import AnalyticsSection from './AnalyticsSection';
import { securityShiftService } from '../../../services/securityShiftService';
import { emergencyAlertService } from '../../../services/emergencyAlertService';
import { emergencyRequestService } from '../../../services/emergencyRequestService';
import { passService } from '../../../services/passService';
import { showSuccess, showError, showConfirm, showWarning, notify } from '../../../utils/sweetAlert';

const ModernDashboardContent = ({ user, setActiveView }) => {
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState(null);
  const [liveStatus, setLiveStatus] = useState('Off Duty');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ totalVisitors: 128, alertsToday: 0 });
  const [visitorData, setVisitorData] = useState([
    { time: '08:00', count: 5 },
    { time: '10:00', count: 18 },
    { time: '12:00', count: 42 },
    { time: '14:00', count: 35 },
    { time: '16:00', count: 28 },
    { time: '18:00', count: 12 },
  ]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const shiftData = await securityShiftService.getGuardShift(user?.id || user?._id);
      if (shiftData.success) {
        setCurrentShift(shiftData.shift);
        setLiveStatus(shiftData.status);
      }

      const alertData = await emergencyAlertService.getActiveAlerts();
      if (alertData.success) {
        setActiveAlerts(alertData.alerts);
        setStats(prev => ({ ...prev, alertsToday: alertData.alerts.length }));
      }

      const activityData = await passService.getSecurityActivity();
      if (activityData.success) {
        setActivities(activityData.activities);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [selectedEmergencyType, setSelectedEmergencyType] = useState(null)
  const [emergencyLocation, setEmergencyLocation] = useState('')
  const [emergencyDescription, setEmergencyDescription] = useState('')
  const [isAlerting, setIsAlerting] = useState(false)

  // Leave Request State
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveMessage, setLeaveMessage] = useState('')
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

  const handleDispatchEmergency = async (e) => {
    e.preventDefault()
    if (!selectedEmergencyType) return
    setIsAlerting(true)
    try {
      const result = await emergencyAlertService.createAlert({
        emergencyType: selectedEmergencyType.id,
        location: emergencyLocation,
        description: emergencyDescription,
        reportedBy: user?.name,
        severity: selectedEmergencyType.id === 'fire' || selectedEmergencyType.id === 'security' ? 'high' : 'medium'
      })
      if (result.success) {
        showSuccess('Emergency Alert Dispatched', 'Relevant authorities and residents have been notified.')
        setShowEmergencyModal(false)
        setEmergencyLocation('')
        setEmergencyDescription('')
        loadDashboardData()
      } else {
        showError('Alert Failed', result.error)
      }
    } catch (error) {
       showError('Alert Failed', 'Could not dispatch emergency alert.')
    } finally {
      setIsAlerting(false)
    }
  }

  const handleRequestLeave = async (e) => {
    e.preventDefault()
    if (!currentShift) {
      showError('No Active Shift', 'You must be on duty to request emergency leave.')
      return
    }
    
    setIsSubmittingLeave(true)
    try {
      const result = await emergencyRequestService.createRequest({
        security_id: user?.id || user?._id,
        shift_id: currentShift._id,
        employee_id: user?.employeeId || 'N/A',
        guard_name: user?.name || 'Security Guard',
        reason: leaveReason,
        message: leaveMessage
      })

      if (result.success) {
        showSuccess('Request Submitted', 'Your emergency leave request has been sent to admin for approval.')
        setShowLeaveModal(false)
        setLeaveReason('')
        setLeaveMessage('')
        loadDashboardData()
      } else {
        showError('Request Failed', result.error)
      }
    } catch (error) {
      showError('Error', 'Failed to submit leave request.')
    } finally {
      setIsSubmittingLeave(false)
    }
  }

  const handleSOS = () => {
    showConfirm('Confirm SOS', 'This will broadcast an immediate distress signal. Proceed?', async () => {
      notify('Broadcasting SOS...', 'info')
      try {
        await emergencyAlertService.createAlert({
          emergencyType: 'security',
          location: 'Officer Panic Button',
          description: 'EMERGENCY SOS SIGNAL BROADCAST',
          reportedBy: user?.name,
          severity: 'high'
        })
        showSuccess('SOS Sent', 'Immediate assistance requested.')
        loadDashboardData()
      } catch (error) {
        showError('SOS Failed', 'Could not send signal.')
      }
    })
  }

  const alertTypes = [
    { id: 'security', name: 'Security Threat', icon: 'AlertTriangle', color: 'red' },
    { id: 'fire', name: 'Fire Emergency', icon: 'Flame', color: 'orange' },
    { id: 'medical', name: 'Medical Emergency', icon: 'Activity', color: 'blue' },
    { id: 'accident', name: 'Accident', icon: 'AlertOctagon', color: 'yellow' },
    { id: 'power', name: 'Power Failure', icon: 'Zap', color: 'gray' }
  ]

  const handleResolve = async (id) => {
    notify('Resolving alert...', 'info');
    setActiveAlerts(prev => prev.filter(a => a._id !== id));
    showSuccess('Resolved', 'Emergency alert has been settled.');
  };

  const handleEscalate = (id) => {
    notify('Escalating to central team...', 'warning');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* 1. Hero Section */}
      <HeroCard 
        user={user} 
        currentShift={currentShift} 
        liveStatus={liveStatus} 
      />

      {/* 2. Quick Actions */}
      <QuickActions 
        onScan={() => setActiveView('scan')}
        onAddVisitor={() => setActiveView('add')}
        onRaiseAlert={() => {
          setSelectedEmergencyType(alertTypes[0]);
          setShowEmergencyModal(true);
        }}
        onSOS={handleSOS}
        onRequestLeave={() => setShowLeaveModal(true)}
        setActiveView={setActiveView}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          {/* 3. Analytics Section */}
          <AnalyticsSection visitorData={visitorData} stats={stats} />
          
          {/* 4. Active Alerts */}
          <AlertPanel 
            alerts={activeAlerts} 
            onResolve={handleResolve}
            onEscalate={handleEscalate}
          />
        </div>

        <div className="xl:col-span-4 h-full">
          {/* 5. Activity Feed */}
          <ActivityFeed activities={activities} />
        </div>
      </div>

      {/* Emergency Modal */}
      <AnimatePresence>
        {showEmergencyModal && selectedEmergencyType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmergencyModal(false)}
              className="absolute inset-0 bg-red-950/40 backdrop-blur-md" 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-red-100 dark:border-red-900/30"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <AlertTriangle className="w-8 h-8" /> Alert System
                  </h3>
                  <button onClick={() => setShowEmergencyModal(false)} className="p-2 rounded-full hover:bg-white/10 transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-red-50 font-bold text-sm uppercase tracking-widest opacity-80">
                  Dispatching: {selectedEmergencyType.name}
                </p>
              </div>

              <form onSubmit={handleDispatchEmergency} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">
                    Incident Location
                  </label>
                  <select 
                    required
                    value={emergencyLocation}
                    onChange={(e) => setEmergencyLocation(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 text-gray-900 dark:text-white font-bold transition-all appearance-none"
                  >
                    <option value="">Select Wing / Area</option>
                    <option value="Main Gate">Main Gate</option>
                    <option value="Basement Parking">Basement Parking</option>
                    <option value="Tower A Lobby">Tower A Lobby</option>
                    <option value="Tower B Lobby">Tower B Lobby</option>
                    <option value="Clubhouse">Clubhouse</option>
                    <option value="Pool Area">Pool Area</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">
                    Situation Note
                  </label>
                  <textarea 
                    rows="3"
                    value={emergencyDescription}
                    onChange={(e) => setEmergencyDescription(e.target.value)}
                    placeholder="Describe the threat briefly..."
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 text-gray-900 dark:text-white font-bold transition-all resize-none"
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEmergencyModal(false)}
                    className="flex-1 px-6 py-4 border-2 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAlerting}
                    className="flex-[1.5] px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 text-xs"
                  >
                    {isAlerting ? (
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : 'Dispatch Now'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency Leave Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaveModal(false)}
              className="absolute inset-0 bg-purple-950/40 backdrop-blur-md" 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-purple-900/30"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <Shield className="w-8 h-8" /> Leave Request
                  </h3>
                  <button onClick={() => setShowLeaveModal(false)} className="p-2 rounded-full hover:bg-white/10 transition">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-purple-50 font-bold text-sm uppercase tracking-widest opacity-80">
                  Emergency Duty Transfer
                </p>
              </div>

              <form onSubmit={handleRequestLeave} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">
                    Reason for Leave
                  </label>
                  <select 
                    required
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 text-gray-900 dark:text-white font-bold transition-all appearance-none"
                  >
                    <option value="">Select Reason</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Family Emergency">Family Emergency</option>
                    <option value="Personal Issues">Personal Issues</option>
                    <option value="Sudden Illness">Sudden Illness</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">
                    Additional Message
                  </label>
                  <textarea 
                    rows="3"
                    required
                    value={leaveMessage}
                    onChange={(e) => setLeaveMessage(e.target.value)}
                    placeholder="Provide more details for the admin..."
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 text-gray-900 dark:text-white font-bold transition-all resize-none"
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 px-6 py-4 border-2 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLeave}
                    className="flex-[1.5] px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 text-xs"
                  >
                    {isSubmittingLeave ? (
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ModernDashboardContent;
