import React from 'react';
import { 
  User, CheckCircle, XCircle, FileText, Download, QrCode, Plus, 
  Search, Filter, Car, Eye, Trash2, Upload, Camera, Home,
  Clock, Calendar, UserCheck, UserMinus, Shield, MoreVertical,
  ChevronRight, ArrowRight, Package, Wrench, Truck, UserPlus, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VisitorFormModal from './VisitorFormModal';
import VisitorLogsTable from './VisitorLogsTable';
import PassModal from './PassModal';

const VisitorModule = ({ 
  stats,
  analytics,
  loadAnalytics,
  connectionStatus,
  handleExportCSV,
  handleExportPDF,
  setActiveView,
  activeView,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  isLoading,
  filteredLogs,
  handleVisitorClick,
  handleCheckOut,
  handleDeleteVisitor,
  editingVisitor,
  resetForm,
  handleSubmitVisitor,
  visitorForm,
  setVisitorForm,
  selectedVisitor,
  setSelectedVisitor,
  handleFileSelect,
  selectedFile,
  setSelectedFile,
  previewUrl,
  setPreviewUrl,
  handlePhotoSelect,
  visitorPhotoFile,
  setVisitorPhotoFile,
  visitorPhotoPreview,
  setVisitorPhotoPreview,
  isUploading,
  showCamera,
  setShowCamera,
  cameraMode,
  setCameraMode,
  handleCameraCapture,
  // New props for pass generation
  isPassModalOpen,
  setIsPassModalOpen,
  selectedVisitorForPass,
  handleGeneratePass,
  handleDownloadPDF: handleDownloadPassPDF,
  handleSendPassEmail,
  isSendingPassEmail
}) => {

  const onFormSubmit = async (e) => {
    const success = await handleSubmitVisitor(e);
    if (success) {
      setActiveView('list');
    }
  };

  const getVisitorTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'delivery': return <Package className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'cab_driver': return <Car className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'checked_in') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Inside
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
        Checked Out
      </span>
    );
  };

  // Helper to generate a "Timeline" from visitor logs (recent events)
  const getTimelineEvents = () => {
    if (!filteredLogs) return [];
    
    const events = [];
    filteredLogs.slice(0, 10).forEach(log => {
      // Entry Event
      events.push({
        id: `entry-${log._id}`,
        time: new Date(log.entryTime),
        type: 'entry',
        visitorName: log.visitorName,
        flat: log.hostFlat,
        visitorType: log.visitorType,
        description: `${log.visitorName} entered for ${log.hostFlat}`
      });
      
      // Exit Event
      if (log.status === 'checked_out' && log.exitTime) {
        events.push({
          id: `exit-${log._id}`,
          time: new Date(log.exitTime),
          type: 'exit',
          visitorName: log.visitorName,
          flat: log.hostFlat,
          visitorType: log.visitorType,
          description: `${log.visitorName} checked out from ${log.hostFlat}`
        });
      }
    });

    return events.sort((a, b) => b.time - a.time).slice(0, 8);
  };

  const timelineEvents = getTimelineEvents();

  if (activeView === 'details' && selectedVisitor) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white">{selectedVisitor.visitorName}</h3>
              <p className="text-sm text-gray-500">{selectedVisitor.visitorType || 'Guest'}</p>
            </div>
          </div>
          <button onClick={() => setActiveView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <XCircle className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Visit Details</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Entry Time</p>
                      <p className="text-lg">{new Date(selectedVisitor.entryTime).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Security Guard</p>
                      <p className="text-lg">{selectedVisitor.securityOfficer || 'System'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Purpose</p>
                      <p className="text-lg">{selectedVisitor.purpose}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Host Information</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-2">
                    <Home className="w-4 h-4 text-blue-500" />
                    <span className="font-bold dark:text-white">Flat {selectedVisitor.hostFlat}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 ml-7">{selectedVisitor.hostName}</p>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              {selectedVisitor.documentPhoto ? (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Identification Proof</h4>
                  <div className="relative group">
                    <img 
                      src={selectedVisitor.documentPhoto} 
                      className="w-full rounded-xl border-2 border-gray-100 dark:border-gray-700 shadow-md group-hover:shadow-lg transition-shadow" 
                      alt="ID Proof" 
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                  </div>
                </section>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-gray-400">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No document photo uploaded</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Visitor Management</h1>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              connectionStatus === 'connected' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
              {connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Monitor and manage access control for your community.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveView('add')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-5 h-5" />
            Log New Visitor
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Visitors Today', value: stats.totalVisitors, icon: User, color: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Currently Inside', value: stats.checkedIn, icon: UserCheck, color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Checked Out', value: stats.checkedOut, icon: UserMinus, color: 'gray', bg: 'bg-gray-50 dark:bg-gray-700' },
          { label: 'Late Visitors', value: stats.lateVisitors || 0, icon: Clock, color: 'rose', bg: 'bg-rose-50 dark:bg-rose-900/20', isUrgent: (stats.lateVisitors > 0) }
        ].map((card, idx) => (
          <motion.div 
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`${card.bg} p-6 rounded-2xl border border-transparent hover:border-${card.color}-200 transition-all group`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-6 h-6 text-${card.color}-600`} />
              </div>
              {card.isUrgent && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{card.value}</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Log Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search by name, flat or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            >
              <option value="all">All Status</option>
              <option value="checked_in">Inside</option>
              <option value="checked_out">Checked Out</option>
            </select>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportCSV}
                className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                title="Export CSV"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button 
                onClick={handleExportPDF}
                className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                title="Export PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Table Container */}
          <VisitorLogsTable 
            filteredLogs={filteredLogs}
            isLoading={isLoading}
            handleVisitorClick={handleVisitorClick}
            handleCheckOut={handleCheckOut}
            handleDeleteVisitor={handleDeleteVisitor}
            handleGeneratePass={handleGeneratePass}
          />
        </div>
      </div>

        {/* Sidebar: Activity Timeline */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Live Activity
            </h3>
            
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-gray-100 before:to-transparent">
              {timelineEvents.map((event, idx) => (
                <div key={event.id} className="relative flex items-start gap-4">
                  <div className={`mt-1 h-10 w-10 flex items-center justify-center rounded-full border-4 border-white dark:border-gray-800 z-10 
                    ${event.type === 'entry' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {event.type === 'entry' ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                       <span className="font-bold">{event.visitorName}</span>
                       <span className="text-gray-500"> {event.type === 'entry' ? 'entered for' : 'checked out from'} </span>
                       <span className="font-bold">{event.flat}</span>
                    </p>
                  </div>
                </div>
              ))}
              
              {timelineEvents.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
            <h4 className="font-bold mb-2">Shift Security</h4>
            <p className="text-sm text-blue-100 mb-4 opacity-80">You are currently on duty at the Main Gate. Stay alert and report any issues.</p>
            <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-semibold text-sm backdrop-blur-sm">
              Contact Admin
            </button>
          </div>
        </div>
      </div>

      <VisitorFormModal 
        isOpen={activeView === 'add' || activeView === 'edit'}
        onClose={() => {
          resetForm();
          setActiveView('list');
        }}
        visitorForm={visitorForm}
        setVisitorForm={setVisitorForm}
        handleSubmit={onFormSubmit}
        isLoading={isLoading}
        editingVisitor={editingVisitor}
        handleFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        previewUrl={previewUrl}
        setPreviewUrl={setPreviewUrl}
        showCamera={showCamera}
        setShowCamera={setShowCamera}
        handlePhotoSelect={handlePhotoSelect}
        visitorPhotoFile={visitorPhotoFile}
        setVisitorPhotoFile={setVisitorPhotoFile}
        visitorPhotoPreview={visitorPhotoPreview}
        setVisitorPhotoPreview={setVisitorPhotoPreview}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        handleCameraCapture={handleCameraCapture}
      />

      <PassModal 
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        visitor={selectedVisitorForPass}
        handleDownloadPDF={handleDownloadPassPDF}
        handleSendEmail={handleSendPassEmail}
        isSendingEmail={isSendingPassEmail}
      />
    </div>
  );
};

export default VisitorModule;
