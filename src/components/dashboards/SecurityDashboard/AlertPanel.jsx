import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flame, Activity, AlertOctagon, Zap, CheckCircle, ArrowUpCircle } from 'lucide-react';

const AlertPanel = ({ alerts, onResolve, onEscalate }) => {
  const getAlertConfig = (type) => {
    const configs = {
      security: { icon: AlertTriangle, color: 'red', title: 'Security Threat' },
      fire: { icon: Flame, color: 'orange', title: 'Fire Emergency' },
      medical: { icon: Activity, color: 'blue', title: 'Medical Emergency' },
      accident: { icon: AlertOctagon, color: 'yellow', title: 'Accident' },
      power: { icon: Zap, color: 'gray', title: 'Power Failure' }
    };
    return configs[type] || configs.security;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight uppercase">
          Active Alerts
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{alerts.length}</span>
          )}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert, idx) => {
            const config = getAlertConfig(alert.emergencyType);
            const Icon = config.icon;
            
            return (
              <motion.div
                key={alert._id || idx}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.01, y: -2 }}
                className={`relative group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                {/* Status Border */}
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${config.color}-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]`} />
                
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-xl bg-${config.color}-50 dark:bg-${config.color}-900/20 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-8 h-8 text-${config.color}-600 dark:text-${config.color}-400`} />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">{config.title}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 uppercase tracking-wide">
                        <span className="text-xs opacity-60">Location:</span> {alert.location}
                      </p>
                      {alert.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-1 italic px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                          "{alert.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => onResolve(alert._id)}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition shadow-lg shadow-green-500/20"
                    >
                      <CheckCircle className="w-4 h-4" /> Resolve
                    </button>
                    <button 
                      onClick={() => onEscalate(alert._id)}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 border-2 border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-xl font-bold text-xs uppercase tracking-widest transition"
                    >
                      <ArrowUpCircle className="w-4 h-4" /> Escalate
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {alerts.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl"
          >
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-800">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">System All Clear</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-widest mt-1">No active emergencies detected</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
