import React, { useState, useEffect } from 'react';
import { AlertTriangle, Flame, Activity, AlertOctagon, Zap, AlertCircle } from 'lucide-react';
import { emergencyAlertService } from '../../../services/emergencyAlertService';
import { showSuccess, showError } from '../../../utils/sweetAlert';

const EmergencyModule = ({ user }) => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedEmergencyType, setSelectedEmergencyType] = useState(null);
  const [emergencyLocation, setEmergencyLocation] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [isAlerting, setIsAlerting] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const loadRecentAlerts = async () => {
    try {
      if (typeof emergencyAlertService !== 'undefined' && emergencyAlertService.getActiveAlerts) {
        const result = await emergencyAlertService.getActiveAlerts();
        if (result.success) setRecentAlerts(result.data.data || []);
      }
    } catch (err) { console.error('Error loading alerts:', err); }
  };

  useEffect(() => {
    loadRecentAlerts();
  }, []);

  const handleDispatchEmergency = async (e) => {
    e.preventDefault();
    if (!selectedEmergencyType) return;
    
    setIsAlerting(true);
    try {
      const result = await emergencyAlertService.createAlert({
        emergencyType: selectedEmergencyType.id,
        location: emergencyLocation,
        description: emergencyDescription,
        reportedBy: user?.name,
        severity: selectedEmergencyType.id === 'fire' || selectedEmergencyType.id === 'security' ? 'high' : 'medium'
      });
      
      if (result.success) {
        showSuccess('Emergency Alert Dispatched', 'Relevant authorities and residents have been notified.');
        setShowEmergencyModal(false);
        setEmergencyLocation('');
        setEmergencyDescription('');
        loadRecentAlerts();
      } else {
        showError('Alert Failed', result.error);
      }
    } catch (error) {
       showError('Alert Failed', 'Could not dispatch emergency alert.');
    } finally {
      setIsAlerting(false);
    }
  };

  const alertTypes = [
    { id: 'security', name: 'Security Threat', icon: AlertTriangle, color: 'red' },
    { id: 'fire', name: 'Fire Emergency', icon: Flame, color: 'orange' },
    { id: 'medical', name: 'Medical Emergency', icon: Activity, color: 'blue' },
    { id: 'accident', name: 'Accident', icon: AlertOctagon, color: 'yellow' },
    { id: 'power', name: 'Power Failure', icon: Zap, color: 'gray' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Emergency & SOS Alerts
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {alertTypes.map(alert => {
            const Icon = alert.icon || AlertCircle;
            return (
              <button
                key={alert.id}
                onClick={() => {
                  setSelectedEmergencyType(alert);
                  setShowEmergencyModal(true);
                }}
                className={`flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all duration-200 border-${alert.color}-200 bg-${alert.color}-50 hover:bg-${alert.color}-100 dark:bg-${alert.color}-900/20 dark:border-${alert.color}-800 dark:hover:bg-${alert.color}-900/40`}
              >
                <Icon className={`w-10 h-10 text-${alert.color}-600 dark:text-${alert.color}-400 mb-3`} />
                <span className={`font-semibold text-center text-${alert.color}-800 dark:text-${alert.color}-300`}>
                  {alert.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent Alerts Log */}
      {recentAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active & Recent Alerts</h3>
           <div className="space-y-4">
             {recentAlerts.map((alert, i) => (
               <div key={i} className="flex items-start gap-4 p-4 border rounded-lg bg-red-50 dark:bg-red-900/10 dark:border-gray-700">
                  <AlertTriangle className="w-6 h-6 text-red-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize">{alert.emergencyType?.replace('_', ' ')}</h4>
                      <span className="text-sm text-gray-500">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Location:</span> {alert.location}</p>
                    {alert.description && <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{alert.description}</p>}
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Emergency Modal */}
      {showEmergencyModal && selectedEmergencyType && (
        <div id="emergency-modal" className="fixed inset-0 bg-red-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-red-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 bg-${selectedEmergencyType.color}-100 dark:bg-${selectedEmergencyType.color}-900/30 rounded-full`}>
                 <AlertTriangle className={`w-8 h-8 text-${selectedEmergencyType.color}-600 dark:text-${selectedEmergencyType.color}-400`} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                   {selectedEmergencyType.name}
                </h3>
                <p className="text-red-500 font-medium">Dispatch Immediate Alert</p>
              </div>
            </div>

            <form onSubmit={handleDispatchEmergency} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alert Location *
                </label>
                <select 
                  required
                  value={emergencyLocation}
                  onChange={(e) => setEmergencyLocation(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-red-200 dark:border-red-800 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Location</option>
                  <option value="Main Gate">Main Gate</option>
                  <option value="Basement Parking">Basement Parking</option>
                  <option value="Tower A Lobby">Tower A Lobby</option>
                  <option value="Tower B Lobby">Tower B Lobby</option>
                  <option value="Clubhouse">Clubhouse</option>
                  <option value="Pool Area">Pool Area</option>
                  <option value="Other">Other (Specify in Description)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Additional Details
                </label>
                <textarea 
                  rows="3"
                  value={emergencyDescription}
                  onChange={(e) => setEmergencyDescription(e.target.value)}
                  placeholder="Provide any critical details..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAlerting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  {isAlerting ? (
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'DISPATCH'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyModule;
