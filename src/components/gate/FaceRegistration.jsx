import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { motion, AnimatePresence } from 'framer-motion';
import { gateService } from '../../services/gateService';
import { showSuccess, showError } from '../../utils/sweetAlert';
import { User, Camera, ShieldCheck, Loader2, Info, CheckCircle2 } from 'lucide-react';

const FaceRegistration = ({ staffId, onComplete }) => {
  const [selectedStaffId, setSelectedStaffId] = useState(staffId || '');
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [step, setStep] = useState(staffId ? 2 : 1); // Jump to capture if staffId is pre-provided
  const webcamRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('❌ Error loading models:', err);
        showError('System Error', 'Could not load face-api models. Check /public/models');
      }
    };

    const fetchStaff = async () => {
      try {
        const res = await gateService.getAllStaff();
        if (res.success) setStaffList(res.data);
      } catch (err) {
        console.error('Error fetching staff:', err);
      } finally {
        setLoadingStaff(false);
      }
    };

    loadModels();
    fetchStaff();
  }, []);

  const handleRegister = async () => {
    if (!selectedStaffId) return showError('Missing Info', 'Please select a staff member to enroll');
    
    setIsCapturing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error('Camera failed to capture frame');

      const img = await faceapi.fetchImage(imageSrc);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please ensure high visibility and good lighting.');
      }

      // 128-float descriptor converted to normal array for JSON transmission
      const descriptorArray = Array.from(detection.descriptor);
      
      const response = await gateService.registerFace({
        staffId: selectedStaffId,
        descriptor: descriptorArray
      });

      if (response.success) {
        const staffName = staffList.find(s => s._id === selectedStaffId)?.name || 'Staff';
        showSuccess('Face Enrolled', `${staffName} is now registered in the biometric system.`);
        if (onComplete) {
          onComplete(true);
        } else {
          setSelectedStaffId('');
          setStep(1);
        }
      } else {
        showError('Enrollment Failed', response.error);
      }
    } catch (err) {
      console.error('Registration Error:', err);
      showError('Error', err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className={`${onComplete ? '' : 'max-w-4xl mx-auto p-6'}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-gray-800 rounded-[2.5rem] ${onComplete ? '' : 'shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-700'} overflow-hidden`}
      >
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Sidebar - Status & Controls */}
          <div className="md:w-1/3 p-10 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-700">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tighter text-blue-600">
                Identity<br />Enrollment
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-bold uppercase tracking-widest">Biometric Database</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Select Staff Member</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    disabled={loadingStaff || !!staffId}
                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none disabled:opacity-75"
                  >
                    <option value="">{loadingStaff ? 'Loading staff...' : 'Select staff...'}</option>
                    {staffList.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">System Status</label>
                  <div className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 ${modelsLoaded ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                    {modelsLoaded ? (
                      <><CheckCircle2 className="w-5 h-5" /> <span className="text-[10px] font-black uppercase tracking-widest">AI Vision Ready</span></>
                    ) : (
                      <><Loader2 className="w-5 h-5 animate-spin" /> <span className="text-[10px] font-black uppercase tracking-widest">Loading AI...</span></>
                    )}
                  </div>
                </div>
              </div>

              <button
                disabled={!modelsLoaded || isCapturing}
                onClick={step === 1 ? () => setStep(2) : handleRegister}
                className="w-full mt-6 py-5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    {step === 1 ? 'Start Scanning' : 'Capture Face'}
                  </>
                )}
              </button>

              {onComplete && (
                <button
                  onClick={() => onComplete(false)}
                  className="w-full mt-2 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all"
                >
                  Cancel Enrollment
                </button>
              )}
            </div>
          </div>

          {/* Right Area - Camera or Info */}
          <div className="md:w-2/3 relative min-h-[500px] flex items-center justify-center p-12">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="text-center max-w-sm"
                >
                  <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Info className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Guidelines</h3>
                  <ul className="text-left space-y-4">
                    {[
                      "Ensure proper lighting on the face",
                      "Remove masks or sunglasses",
                      "Look directly at the camera",
                      "Keep a neutral expression"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-gray-100 dark:border-gray-700 shadow-2xl bg-black"
                >
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: "user" }}
                  />
                  
                  {/* Overlay UI */}
                  <div className="absolute inset-0 border-[3rem] border-black/20 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 border-dashed rounded-full animate-pulse pointer-events-none" />
                  
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Camera</span>
                    </div>
                    {!staffId && (
                      <button 
                        onClick={() => setStep(1)}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all"
                      >
                        Back
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Background Decoration */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FaceRegistration;
