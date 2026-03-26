import React, { useEffect, useRef } from 'react';
import { X, User, Phone, Mail, CreditCard, FileText, Home, Truck, Wrench, Package, Car, Clock, ClipboardList, Camera, Upload, Plus, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VisitorFormModal = ({ 
  isOpen, 
  onClose, 
  visitorForm, 
  setVisitorForm, 
  handleSubmit, 
  isLoading,
  editingVisitor,
  handleFileSelect,
  selectedFile,
  setSelectedFile,
  previewUrl,
  setPreviewUrl,
  showCamera,
  setShowCamera,
  handlePhotoSelect,
  visitorPhotoFile,
  setVisitorPhotoFile,
  visitorPhotoPreview,
  setVisitorPhotoPreview,
  cameraMode,
  setCameraMode,
  handleCameraCapture
}) => {
  const firstInputRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    };

    if (showCamera) startCamera();
    
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [showCamera]);

  if (!isOpen) return null;

  const visitorTypes = [
    { id: 'guest', label: 'Guest', icon: User, color: 'blue' },
    { id: 'delivery', label: 'Delivery', icon: Package, color: 'orange' },
    { id: 'service', label: 'Service', icon: Wrench, color: 'emerald' },
    { id: 'cab_driver', label: 'Cab', icon: Car, color: 'gray' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]"
      >
        {/* Sticky Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {editingVisitor ? 'Edit Visitor Record' : 'Log New Visitor'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium italic">Enter visitor details to grant community access.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all group"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-8 custom-scrollbar flex-1">
          <form id="visitor-form" onSubmit={handleSubmit} className="space-y-10">
            {/* Visitor Photo Capture Section (New) */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900/40 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800 transition-all hover:border-blue-300 group">
              <div className="relative group/photo">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden border-4 ${visitorPhotoPreview ? 'border-blue-500 shadow-xl' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                  {visitorPhotoPreview ? (
                    <img src={visitorPhotoPreview} alt="Visitor Face" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-300 group-hover:text-blue-400 transition-colors" />
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => { setCameraMode('visitor'); setShowCamera(true); }}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg hover:scale-110 active:scale-90 transition-all z-10"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">Capture Visitor Face</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Required for security identification</p>
              </div>
            </div>
            {/* Visitor Type Selection (Top UI) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4 ml-1">Select Visitor Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {visitorTypes.map((type) => {
                  const isSelected = visitorForm.visitorType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setVisitorForm({ ...visitorForm, visitorType: type.id })}
                      className={`flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                        isSelected 
                          ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-blue-500/10` 
                          : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 bg-gray-50/50 dark:bg-gray-900/50'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-400'} shadow-sm transition-colors`}>
                        <type.icon className="w-6 h-6" />
                      </div>
                      <span className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500'}`}>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Visitor Name *</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      ref={firstInputRef}
                      type="text" required
                      placeholder="e.g. John Doe"
                      value={visitorForm.visitorName}
                      onChange={(e) => setVisitorForm({ ...visitorForm, visitorName: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Phone Number *</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="tel" required
                      placeholder="10-digit mobile number"
                      value={visitorForm.visitorPhone}
                      onChange={(e) => setVisitorForm({ ...visitorForm, visitorPhone: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Email Address (Optional)</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      placeholder="For digital pass"
                      value={visitorForm.visitorEmail || ''}
                      onChange={(e) => setVisitorForm({ ...visitorForm, visitorEmail: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* ID Information */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Identification Type *</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={visitorForm.idType}
                      onChange={(e) => setVisitorForm({ ...visitorForm, idType: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white appearance-none"
                    >
                      <option value="aadhar">Aadhar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="driving_license">Driving License</option>
                      <option value="passport">Passport</option>
                      <option value="other">Other ID</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">ID Number *</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text" required
                      placeholder="Enter ID unique number"
                      value={visitorForm.idNumber}
                      onChange={(e) => setVisitorForm({ ...visitorForm, idNumber: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Purpose of Visit *</label>
                  <div className="relative">
                    <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text" required
                      placeholder="e.g. Meeting, Maintenance"
                      value={visitorForm.purpose}
                      onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Host Section */}
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <Home className="w-5 h-5" />
                </div>
                <h4 className="font-black text-blue-900 dark:text-blue-300 uppercase tracking-tight text-lg">Destination Detail</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-blue-600/60 uppercase ml-1">Resident Name</label>
                  <input
                    type="text" required placeholder="Full name of host"
                    value={visitorForm.hostName}
                    onChange={(e) => setVisitorForm({ ...visitorForm, hostName: e.target.value })}
                    className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-blue-600/60 uppercase ml-1">Flat Number</label>
                  <input
                    type="text" required placeholder="e.g. B-1204"
                    value={visitorForm.hostFlat}
                    onChange={(e) => setVisitorForm({ ...visitorForm, hostFlat: e.target.value })}
                    className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white shadow-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-blue-600/60 uppercase ml-1">Resident Contact</label>
                  <input
                    type="tel" required placeholder="Host mobile number"
                    value={visitorForm.hostPhone}
                    onChange={(e) => setVisitorForm({ ...visitorForm, hostPhone: e.target.value })}
                    className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Timing & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Expected Exit Time</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={visitorForm.expectedExitTime || ''}
                    onChange={(e) => setVisitorForm({ ...visitorForm, expectedExitTime: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Identification Document</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload').click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-4 rounded-2xl text-sm font-bold hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                  >
                    <Upload className="w-5 h-5" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCameraMode('id'); setShowCamera(true); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 p-4 rounded-2xl text-sm font-bold hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                  >
                    <Camera className="w-5 h-5" />
                    Snap
                  </button>
                  <input id="file-upload" type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                </div>
              </div>
            </div>

            {previewUrl && (
              <div className="relative inline-block animate-in zoom-in duration-300">
                <div className="relative group">
                  <img src={previewUrl} alt="ID Preview" className="h-32 w-48 object-cover rounded-2xl border-2 border-blue-500 shadow-xl" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute -top-3 -right-3 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center uppercase">ID Proof Attached ✓</p>
              </div>
            )}

            <div className="space-y-2 pt-4">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase tracking-wider">Security Notes</label>
              <textarea
                placeholder="Any observations or additional details..."
                value={visitorForm.notes}
                onChange={(e) => setVisitorForm({ ...visitorForm, notes: e.target.value })}
                rows="4"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent rounded-3xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white resize-none"
              ></textarea>
            </div>
          </form>
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-8 py-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-md flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl font-black text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 transition-all uppercase tracking-widest text-sm"
          >
            Discard
          </button>
          <button
            form="visitor-form"
            type="submit"
            disabled={isLoading}
            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-blue-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>{editingVisitor ? 'Update Record' : 'Add Visitor'}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Camera Modal Overlay */}
      <AnimatePresence>
        {showCamera && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 w-full max-w-xl rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Camera: {cameraMode === 'visitor' ? 'Capture Face' : 'Capture ID Document'}
                </h3>
                <button onClick={() => setShowCamera(false)} className="text-white/60 hover:text-white p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="relative aspect-video bg-black overflow-hidden m-4 rounded-[2rem]">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-[2px] border-white/20 pointer-events-none rounded-[2rem] flex items-center justify-center">
                   <div className={`border-2 border-blue-500/50 ${cameraMode === 'visitor' ? 'w-48 h-64 rounded-full' : 'w-4/5 h-2/3 rounded-xl'}`}></div>
                </div>
              </div>

              <div className="p-8 flex justify-center pb-12">
                <button
                  type="button"
                  onClick={() => handleCameraCapture(videoRef.current)}
                  className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl group active:scale-90 transition-all"
                >
                  <div className="w-16 h-16 rounded-full border-4 border-gray-900 flex items-center justify-center group-hover:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-full bg-red-600"></div>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}} />
    </div>
  );
};

export default VisitorFormModal;
