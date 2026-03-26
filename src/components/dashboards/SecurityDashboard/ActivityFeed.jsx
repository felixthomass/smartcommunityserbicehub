import React from 'react';
import { motion } from 'framer-motion';
import { User, Package, AlertTriangle, Clock, ChevronRight } from 'lucide-react';

const ActivityFeed = ({ activities }) => {
  const getEventConfig = (type) => {
    switch (type) {
      case 'visitor':
        return { icon: User, color: 'blue', label: 'VisitorEntry' };
      case 'delivery':
        return { icon: Package, color: 'emerald', label: 'Delivery' };
      case 'alert':
        return { icon: AlertTriangle, color: 'red', label: 'Alert Triggered' };
      default:
        return { icon: Clock, color: 'gray', label: 'Event' };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Live Activity</h3>
        <button className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 transition-colors group">
          View All <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activities.map((activity, idx) => {
          const config = getEventConfig(activity.type);
          const Icon = config.icon;

          return (
            <motion.div
              key={activity._id || idx}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative flex gap-4 group"
            >
              <div className={`relative z-10 w-10 h-10 rounded-xl bg-${config.color}-50 dark:bg-${config.color}-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 border border-${config.color}-100/50 dark:border-${config.color}-800/50 shadow-sm shadow-${config.color}-500/10`}>
                <Icon className={`w-5 h-5 text-${config.color}-600 dark:text-${config.color}-400`} />
              </div>

              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{config.label}</span>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium font-bold">
                  <span className="text-gray-900 dark:text-white">{activity.subject}:</span> {activity.description}
                </p>
                {activity.meta && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                      {activity.meta}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {activities.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-loose">No recent activity detected</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
