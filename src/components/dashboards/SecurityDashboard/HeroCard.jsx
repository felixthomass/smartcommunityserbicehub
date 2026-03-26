import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Shield, User, ChevronRight } from 'lucide-react';

const HeroCard = ({ user, currentShift, liveStatus }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!currentShift || liveStatus !== 'On Duty') {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      let endDateTime = new Date(`${currentShift.shift_date}T${currentShift.end_time}:00`);
      if (endDateTime < now) endDateTime.setDate(endDateTime.getDate() + 1);
      
      const diff = endDateTime - now;
      if (diff <= 0) {
        setTimeLeft('Shift Over');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentShift, liveStatus]);

  const fmt12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-3xl opacity-90 group-hover:opacity-100 transition-opacity duration-500 shadow-2xl shadow-blue-500/20" />
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl -ml-10 -mb-10" />

      <div className="relative z-10 p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-blue-600 ${
                  liveStatus === 'On Duty' ? 'bg-green-400' : liveStatus === 'Upcoming' ? 'bg-blue-400' : 'bg-gray-400'
                }`}
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{user?.name || 'Security Officer'}</h2>
              <div className="flex items-center gap-2 mt-1 opacity-90">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  liveStatus === 'On Duty' ? 'bg-green-400/20 text-green-100 border border-green-400/30' :
                  liveStatus === 'Upcoming' ? 'bg-blue-400/20 text-blue-100 border border-blue-400/30' :
                  'bg-white/10 text-white border border-white/20'
                }`}>
                  {liveStatus}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-sm font-medium text-blue-100">ID: {currentShift?.employee_id || 'ID SEC101'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:gap-8">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-white/60 font-bold">Assigned Station</span>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-5 h-5 text-cyan-300" />
                <span className="text-xl font-semibold">{currentShift?.assigned_gate || 'Gate A'}</span>
              </div>
            </div>

            <div className="h-10 w-px bg-white/20 hidden md:block" />

            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-white/60 font-bold">Shift Schedule</span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-5 h-5 text-cyan-300" />
                <span className="text-xl font-semibold">
                  {fmt12(currentShift?.start_time)} – {fmt12(currentShift?.end_time)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {liveStatus === 'On Duty' && timeLeft && (
          <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <span className="text-sm opacity-80 mr-2">Remaining:</span>
                <span className="text-xl font-mono font-bold tracking-wider">{timeLeft}</span>
              </div>
              <motion.div 
                animate={{ opacity: [0.4, 1, 0.4] }} 
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" 
              />
            </div>
            
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg">
              View Duty Log <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default HeroCard;
