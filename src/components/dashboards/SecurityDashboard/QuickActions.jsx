import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, UserPlus, AlertCircle, PhoneIncoming, UserX, UserCheck } from 'lucide-react';

const QuickActions = ({ onScan, onAddVisitor, onRaiseAlert, onSOS, onRequestLeave, setActiveView }) => {
  const actions = [
    { 
      id: 'scan', 
      label: 'Scan Pass', 
      icon: QrCode, 
      color: 'blue', 
      onClick: onScan,
      description: 'Validate visitor QR'
    },
    { 
      id: 'add', 
      label: 'Add Visitor', 
      icon: UserPlus, 
      color: 'emerald', 
      onClick: onAddVisitor,
      description: 'Manual log entry'
    },
    { 
      id: 'worker', 
      label: 'Worker Entry', 
      icon: UserPlus, 
      color: 'blue', 
      onClick: () => setActiveView('worker-entry'),
      description: 'Face verification'
    },
    { 
      id: 'staff', 
      label: 'Staff Entry', 
      icon: UserCheck, 
      color: 'purple', 
      onClick: () => setActiveView('staff-entry'),
      description: 'Face attendance'
    },
    { 
      id: 'leave', 
      label: 'Request Leave', 
      icon: UserX, 
      color: 'purple', 
      onClick: onRequestLeave,
      description: 'Emergency duty exit'
    },
    { 
      id: 'alert', 
      label: 'Raise Alert', 
      icon: AlertCircle, 
      color: 'amber', 
      onClick: onRaiseAlert,
      description: 'Report incident'
    },
    { 
      id: 'sos', 
      label: 'SOS', 
      icon: PhoneIncoming, 
      color: 'red', 
      onClick: onSOS,
      description: 'Emergency assistance'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, idx) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className={`relative group overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 hover:shadow-xl flex items-center p-5`}
        >
          <div className={`w-12 h-12 rounded-xl bg-${action.color}-50 dark:bg-${action.color}-900/20 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300`}>
            <action.icon className={`w-6 h-6 text-${action.color}-600 dark:text-${action.color}-400`} />
          </div>
          
          <div className="text-left">
            <span className="block font-bold text-gray-900 dark:text-white text-lg leading-tight uppercase tracking-tight">{action.label}</span>
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider">{action.description}</span>
          </div>
          
          {/* Accent Border */}
          <div className={`absolute bottom-0 left-0 h-1 w-0 bg-${action.color}-500 group-hover:w-full transition-all duration-500`} />
        </motion.button>
      ))}
    </div>
  );
};

export default QuickActions;
