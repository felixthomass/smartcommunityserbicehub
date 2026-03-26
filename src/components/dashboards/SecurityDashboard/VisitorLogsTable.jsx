import React from 'react';
import { 
  User, CheckCircle, Eye, Trash2, Home, Clock, ArrowRight, 
  Package, Wrench, Car, MoreVertical, Ticket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VisitorLogsTable = ({ 
  filteredLogs, 
  isLoading, 
  handleVisitorClick, 
  handleCheckOut, 
  handleDeleteVisitor,
  handleGeneratePass 
}) => {
  const getVisitorTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'delivery': return <Package className="w-4 h-4" />;
      case 'service': return <Wrench className="w-4 h-4" />;
      case 'cab_driver': return <Car className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'checked_in') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Inside
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
        Left
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-24 flex flex-col items-center justify-center space-y-6 bg-white dark:bg-gray-800 rounded-[2rem]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">Fetching Logs</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying secure community access records...</p>
        </div>
      </div>
    );
  }

  if (filteredLogs.length === 0) {
    return (
      <div className="p-24 text-center bg-white dark:bg-gray-800 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <User className="w-12 h-12 text-gray-300" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Zero Results</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">No visitor records match your current search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Visitor Identification</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Category</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Destination</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Timeline</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Access Status</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            <AnimatePresence>
              {filteredLogs.map((log, idx) => (
                <motion.tr 
                  key={log._id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group cursor-pointer"
                  onClick={() => handleVisitorClick(log)}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-500 font-black shadow-sm group-hover:scale-110 transition-transform">
                        {log.visitorName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 dark:text-white tracking-tight text-lg">{log.visitorName}</p>
                        <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {log.visitorPhone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 w-fit border border-gray-100 dark:border-gray-800">
                      <span className="text-blue-600">{getVisitorTypeIcon(log.visitorType)}</span>
                      <span className="text-sm font-bold capitalize text-gray-600 dark:text-gray-400">{log.visitorType || 'Guest'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4 text-blue-500" />
                        <span className="font-black text-gray-800 dark:text-gray-200">Flat {log.hostFlat}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-400">{log.hostName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-emerald-50/50 dark:bg-emerald-900/10 px-2 py-1 rounded-lg w-fit">
                        <ArrowRight className="w-3 h-3 text-emerald-500 rotate-[-45deg]" />
                        <span>{new Date(log.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {log.exitTime ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 px-2 py-1 rounded-lg w-fit">
                          <ArrowRight className="w-3 h-3 text-rose-400 rotate-[45deg]" />
                          <span>{new Date(log.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-black text-gray-300 uppercase letter tracking-widest ml-1">Still Inside</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end items-center gap-1 md:gap-2">
                       {/* Action Buttons */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleVisitorClick(log); }}
                        className="p-2.5 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-blue-500/20"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); /* Logic for Edit */ }}
                        className="p-2.5 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-amber-500/20"
                        title="Edit Record"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleGeneratePass(log); }}
                        className="p-2.5 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-indigo-500/20"
                        title="Generate Pass"
                      >
                        <Ticket className="w-5 h-5" />
                      </button>

                      {log.status === 'checked_in' ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCheckOut(log._id); }}
                          className="p-2.5 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-emerald-500/20"
                          title="Check Out"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteVisitor(log._id); }}
                          className="p-2.5 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-rose-500/20"
                          title="Delete Log"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      
      {/* Table Footer */}
      <div className="px-8 py-5 bg-gray-50/30 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
          Audit Trail: Showing {filteredLogs.length} verified entries
        </p>
        <div className="flex gap-2">
          <button disabled className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-400 disabled:opacity-30">Previous</button>
          <button disabled className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-400 disabled:opacity-30">Next</button>
        </div>
      </div>
    </div>
  );
};

export default VisitorLogsTable;
