import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, AlertCircle, TrendingDown } from 'lucide-react';

const AnalyticsSection = ({ visitorData, stats }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight uppercase">
          Security Insights
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitors Today Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col h-[350px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Visitors Today</h4>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Real-time traffic monitor</p>
            </div>
          </div>

          <div className="flex-1 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitorData}>
                <defs>
                  <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }} 
                  labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
                  itemStyle={{ fontWeight: 700, color: '#3b82f6', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVis)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stats Column */}
        <div className="flex flex-col gap-6">
          <motion.div
            whileHover={{ y: -5 }}
            className="flex-1 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 overflow-hidden relative group"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Total Visitors</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{stats.totalVisitors}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="flex-1 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 overflow-hidden relative group"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Alerts Today</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{stats.alertsToday}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSection;
