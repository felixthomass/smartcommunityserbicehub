import React from 'react';
import { X, QrCode, Download, Mail, User, Home, Clock, ShieldCheck, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PassModal = ({ 
  isOpen, 
  onClose, 
  visitor, 
  handleDownloadPDF, 
  handleSendEmail,
  isSendingEmail 
}) => {
  if (!isOpen || !visitor) return null;

  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(visitor._id)}&size=300&margin=1`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in duration-300"
      >
        {/* Pass Header */}
        <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-blue-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">Official Visitor Pass</span>
            </div>
            <h3 className="text-3xl font-black tracking-tight">Access Granted</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-2xl transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Pass Body */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Info Section */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 text-2xl font-black shadow-inner">
                  {visitor.visitorName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">{visitor.visitorName}</h4>
                  <p className="text-sm font-bold text-gray-400 mt-1 flex items-center gap-1.5 letters tracking-wide">
                    {visitor.visitorPhone}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Visiting Destination</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                      <Home className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 dark:text-white text-lg leading-none">Flat {visitor.hostFlat}</p>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">{visitor.hostName}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Stay Validity</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                      <Clock className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 dark:text-white leading-none">Access UNTIL</p>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-tighter">
                        {visitor.expectedExitTime ? new Date(visitor.expectedExitTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'END OF DAY'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Section */}
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/80 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 text-center space-y-4">
              <div className="relative group">
                <div className="absolute -inset-4 bg-blue-600/10 blur-2xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                <img 
                  src={qrCodeUrl} 
                  alt="Pass QR" 
                  className="w-44 h-44 bg-white p-3 rounded-2xl shadow-xl relative z-10 border border-gray-100"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pass Sequence</p>
                <p className="text-xl font-mono font-black text-gray-900 dark:text-white tracking-widest">
                  {visitor._id?.slice(-8).toUpperCase()}
                </p>
              </div>
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full">Scan at Entry/Exit Points</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-md border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4">
          <button
            onClick={() => handleDownloadPDF(visitor)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-black uppercase tracking-widest text-xs hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm transform active:scale-95"
          >
            <Download className="w-5 h-5 text-blue-500" />
            Save PDF
          </button>
          <button
            disabled={isSendingEmail || !visitor.visitorEmail}
            onClick={() => handleSendEmail(visitor)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            {isSendingEmail ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Mail className="w-5 h-5" />
            )}
            {isSendingEmail ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PassModal;
