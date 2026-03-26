import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  ShieldAlert, 
  Home, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Wrench,
  UserCircle,
  Lock,
  BellRing,
  X,
  Search,
  Maximize2
} from 'lucide-react';

const TopNavbar = ({ title, user, onLogout }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(6);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adminNotifications = [
    { id: 1, title: 'Emergency Alert', description: 'Emergency alert triggered in Block B', time: '5 min ago', unread: true, type: 'admin' },
    { id: 2, title: 'Security Breach', description: 'Unauthorized access detected at Gate 1', time: '15 min ago', unread: true, type: 'admin' },
    { id: 3, title: 'Fire Safety', description: 'Fire alarm activated in the parking area', time: '1 hour ago', unread: false, type: 'admin' },
  ];

  const residentNotifications = [
    { id: 4, title: 'Visitor Arrived', description: 'Visitor arrived for Flat A-123', time: '10 min ago', unread: true, type: 'resident' },
    { id: 5, title: 'Package Delivered', description: 'Package delivered to your apartment', time: '30 min ago', unread: true, type: 'resident' },
    { id: 6, title: 'Maintenance Request', description: 'Maintenance request approved for plumbing', time: '2 hours ago', unread: false, type: 'resident' },
  ];

  const staffNotifications = [
    { id: 7, title: 'New Task Assigned', description: 'New task assigned: Cleaning Block C', time: '20 min ago', unread: true, type: 'staff' },
    { id: 8, title: 'Shift Started', description: 'Shift started at 9:00 AM', time: '2 hours ago', unread: true, type: 'staff' },
    { id: 9, title: 'Service Request', description: 'Service request pending for garden area', time: '4 hours ago', unread: false, type: 'staff' },
  ];

  const NotificationItem = ({ item }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'admin': return <AlertTriangle size={18} className="text-red-500" />;
        case 'resident': return <Home size={18} className="text-green-500" />;
        case 'staff': return <Clock size={18} className="text-blue-500" />;
        default: return <Bell size={18} className="text-gray-500" />;
      }
    };

    const getBgColor = () => {
      switch (item.type) {
        case 'admin': return 'bg-red-50 dark:bg-red-900/20';
        case 'resident': return 'bg-green-50 dark:bg-green-900/20';
        case 'staff': return 'bg-blue-50 dark:bg-blue-900/20';
        default: return 'bg-gray-50 dark:bg-gray-800';
      }
    };

    return (
      <div className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer border-b border-gray-100 dark:border-gray-700 flex items-start gap-4 relative group/item ${item.unread ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
        <div className={`mt-1 p-2.5 rounded-xl ${getBgColor()} flex-shrink-0 transition-transform group-hover/item:scale-110`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            <p className={`text-sm font-bold truncate ${item.unread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              {item.title}
            </p>
            {item.unread && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0 animate-pulse" />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
          <span className="text-[10px] text-gray-400 font-semibold mt-2 block">
            {item.time}
          </span>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ title, dotColor }) => (
    <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md sticky top-0 z-10 border-y border-gray-100 dark:border-gray-700 flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {title}
    </div>
  );

  const getRoleLabel = (role) => {
    const labels = {
      resident: 'Resident',
      admin: 'Admin/Owner',
      staff: 'Staff',
      security: 'Security Officer'
    }
    return labels[role] || 'User'
  }

  const getUserInitials = (name) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  return (
    <nav className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 sticky top-0 z-[100] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.05)]">
      {/* Brand / Title Section */}
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
          {title || (
            <>Community<span className="text-blue-600">Hub</span></>
          )}
        </h1>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden md:block" />
        <div className="relative group hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search dashboard..." 
            className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 w-64 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Fullscreen Toggle / Other Actions */}
        <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all hidden sm:block">
          <Maximize2 size={20} />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-3 rounded-2xl transition-all duration-300 relative group ${isNotificationsOpen ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/20 shadow-inner' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <Bell size={24} className={`${isNotificationsOpen ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'} group-hover:text-blue-600 transition-colors`} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-lg shadow-red-500/40">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-4 w-[380px] bg-white dark:bg-gray-800 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[101]">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-xl tracking-tight leading-none">Notifications</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Activity Stream</p>
                </div>
                <button 
                  onClick={() => setUnreadCount(0)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-black px-4 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all font-bold"
                >
                  Mark all read
                </button>
              </div>
              
              <div className="max-h-[440px] overflow-y-auto custom-scrollbar">
                <SectionHeader title="Admin Alerts" dotColor="bg-red-500" />
                {adminNotifications.map(notification => <NotificationItem key={notification.id} item={notification} />)}
                
                <SectionHeader title="Resident Updates" dotColor="bg-green-500" />
                {residentNotifications.map(notification => <NotificationItem key={notification.id} item={notification} />)}
                
                <SectionHeader title="Staff Tasks" dotColor="bg-blue-500" />
                {staffNotifications.map(notification => <NotificationItem key={notification.id} item={notification} />)}
              </div>
              
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-center">
                <button className="text-[11px] font-black text-gray-400 hover:text-red-500 transition-all uppercase tracking-widest flex items-center gap-2 group">
                  <X size={14} className="group-hover:rotate-90 transition-transform" />
                  Clear all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-10 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center gap-4 p-2 rounded-2xl transition-all duration-300 active:scale-95 group ${isProfileOpen ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                   {user?.profilePicture ? (
                     <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                   ) : (
                     <User size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
                   )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
            </div>
            
            <div className="text-left hidden xl:block">
              <p className="text-sm font-black text-gray-900 dark:text-white leading-none mb-1.5">{user?.name || 'Felix Thomas'}</p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em]">{getRoleLabel(user?.role) || 'Security Officer'}</p>
            </div>
            <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 mr-1 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-4 w-72 bg-white dark:bg-gray-800 rounded-[32px] shadow-[0_25px_70px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[101]">
              <div className="p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-3xl font-black border border-white/30 shadow-2xl mb-4 overflow-hidden">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      getUserInitials(user?.name || 'Felix Thomas')
                    )}
                  </div>
                  <h4 className="font-black text-white text-lg tracking-tight mb-1">{user?.name || 'Felix Thomas'}</h4>
                  <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    <p className="text-white text-[9px] font-black uppercase tracking-widest">{getRoleLabel(user?.role) || 'Security Officer'}</p>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <div className="space-y-1">
                  <DropdownMenuItem icon={<UserCircle size={20} />} label="View Profile" />
                  <DropdownMenuItem icon={<Settings size={20} />} label="Account Settings" />
                  <DropdownMenuItem icon={<Lock size={20} />} label="Security Center" />
                  <DropdownMenuItem icon={<BellRing size={20} />} label="Preferences" badge="Updated" />
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 px-2">
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4">
                      <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="font-black text-sm tracking-tight uppercase tracking-widest">Logout</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const DropdownMenuItem = ({ icon, label, badge }) => (
  <button className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group font-semibold">
    <div className="flex items-center gap-4">
      <span className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{icon}</span>
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
    {badge && (
      <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-blue-600/20">
        {badge}
      </span>
    )}
  </button>
);

export default TopNavbar;
