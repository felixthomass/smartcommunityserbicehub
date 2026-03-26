import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { motion, AnimatePresence } from 'framer-motion';
import { gateService } from '../../services/gateService';
import { authService } from '../../services/authService';
import { showSuccess, showError, showConfirm } from '../../utils/sweetAlert';
import {
  User, ShieldCheck, Loader2, CheckCircle2, XCircle, Camera,
  RotateCcw, Trash2, RefreshCw, ArrowRight, Scan, Info
} from 'lucide-react';

// Guided capture steps
const CAPTURE_STEPS = [
  { id: 'straight', label: 'Look Straight', instruction: 'Face the camera directly with a neutral expression', icon: '👁️', color: 'blue' },
  { id: 'left',     label: 'Turn Left',     instruction: 'Slowly turn your head to the left',              icon: '⬅️', color: 'purple' },
  { id: 'right',    label: 'Turn Right',    instruction: 'Slowly turn your head to the right',             icon: '➡️', color: 'indigo' },
  { id: 'up',       label: 'Look Up',       instruction: 'Tilt your head slightly upward',                 icon: '⬆️', color: 'violet' },
  { id: 'down',     label: 'Look Down',     instruction: 'Tilt your head slightly downward',               icon: '⬇️', color: 'fuchsia' },
];

const colorMap = {
  blue:   { ring: 'ring-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  purple: { ring: 'ring-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  indigo: { ring: 'ring-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  violet: { ring: 'ring-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  fuchsia:{ ring: 'ring-fuchsia-500',bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', text: 'text-fuchsia-600', badge: 'bg-fuchsia-100 text-fuchsia-700' },
};

const FaceEnrollment = ({ staffId: propStaffId, onComplete, isUpdate = false }) => {
  const [selectedStaffId, setSelectedStaffId] = useState(propStaffId || '');
  const [staffList, setStaffList]         = useState([]);
  const [loadingStaff, setLoadingStaff]   = useState(true);
  const [modelsLoaded, setModelsLoaded]   = useState(false);
  const [phase, setPhase]                 = useState('select'); // select | capture | preview | done
  const [currentStep, setCurrentStep]     = useState(0);        // index into CAPTURE_STEPS
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [capturedPreviews, setCapturedPreviews]       = useState([]);
  const [isCapturing, setIsCapturing]     = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [countdown, setCountdown]         = useState(null);
  const webcamRef  = useRef(null);
  const countRef   = useRef(null);
  const NUM_ANGLES = 3; // capture first 3 steps

  // ── Load models & staff ───────────────────────────────────────
  useEffect(() => {
    const MODEL_URL = '/models';
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => setModelsLoaded(true))
      .catch(err => { console.error(err); showError('AI Error', 'Could not load face models'); });

    // Fetch staff from Supabase via authService
    authService.getStaffUsers()
      .then(res => {
        if (res.success) {
          // Map Supabase staff format to enrollment list
          const mapped = (res.users || []).map(u => ({
            _id: u.id,          // Supabase user_id (UUID) used as identifier
            name: u.name,
            role: u.role,
            shift: u.shiftTiming || u.shift_timing || 'Morning',
            department: u.staffDepartment || u.staff_department || '',
            email: u.email
          }))
          setStaffList(mapped)
        }
      })
      .finally(() => setLoadingStaff(false));
  }, []);

  // Start countdown for auto-capture
  const startCountdown = useCallback(() => {
    setCountdown(3);
    let n = 3;
    countRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countRef.current);
        setCountdown(null);
        captureAngle();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }, [currentStep]); // eslint-disable-line

  useEffect(() => () => clearInterval(countRef.current), []);

  // ── Capture a single angle ────────────────────────────────────
  const captureAngle = useCallback(async () => {
    if (!webcamRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error('Camera failed');

      const img = await faceapi.fetchImage(imageSrc);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) throw new Error('No face detected. Adjust lighting or position.');

      const descriptor = Array.from(detection.descriptor);
      setCapturedDescriptors(prev => [...prev, descriptor]);
      setCapturedPreviews(prev => [...prev, imageSrc]);

      const nextStep = currentStep + 1;
      if (nextStep >= NUM_ANGLES) {
        setPhase('preview');
      } else {
        setCurrentStep(nextStep);
      }
    } catch (err) {
      showError('Capture Failed', err.message);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, currentStep]);

  // ── Save to backend ───────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedStaffId || capturedDescriptors.length === 0) return;
    setIsSaving(true);
    try {
      const staffMember = staffList.find(s => s._id === selectedStaffId);
      const fn = isUpdate ? gateService.updateFace : gateService.registerMultiFace;
      const res = await fn(
        selectedStaffId,
        capturedDescriptors,
        // Pass staff info so backend can auto-create the MongoDB record
        staffMember ? {
          name: staffMember.name,
          role: staffMember.role,
          shift: staffMember.shift
        } : {}
      );
      if (res.success) {
        const name = staffMember?.name || 'Staff';
        showSuccess('Enrolled!', `${name} enrolled with ${capturedDescriptors.length} face angles.`);
        setPhase('done');
        if (onComplete) setTimeout(() => onComplete(true), 1500);
      } else {
        showError('Save Failed', res.error || 'Could not save face data');
      }
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete face ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedStaffId) return;
    const result = await showConfirm('Delete Face Data', 'This will remove all biometric data for this staff member.');
    if (!result.isConfirmed) return;
    try {
      const res = await gateService.deleteFace(selectedStaffId);
      if (res.success) {
        showSuccess('Deleted', 'Face data removed from biometric system.');
        resetEnrollment();
        if (onComplete) onComplete(false);
      } else {
        showError('Error', res.error);
      }
    } catch (err) {
      showError('Error', err.message);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────
  const resetEnrollment = () => {
    setCapturedDescriptors([]);
    setCapturedPreviews([]);
    setCurrentStep(0);
    setPhase(propStaffId ? 'capture' : 'select');
    setCountdown(null);
    clearInterval(countRef.current);
  };

  const stepInfo   = CAPTURE_STEPS[currentStep] || CAPTURE_STEPS[0];
  const colors     = colorMap[stepInfo.color];
  const progress   = capturedDescriptors.length / NUM_ANGLES;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className={`${onComplete ? '' : 'max-w-5xl mx-auto p-6'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-700"
      >
        <div className="flex flex-col lg:flex-row min-h-[580px]">

          {/* ── Left Panel ───────────────────────────────────── */}
          <div className="lg:w-80 p-8 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-700 flex flex-col gap-6">
            {/* Header */}
            <div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {isUpdate ? 'Update Face' : 'Face Enrollment'}
              </h2>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest">
                Multi-Angle Biometric
              </p>
            </div>

            {/* Staff Selector */}
            {!propStaffId && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Staff Member</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <select
                    value={selectedStaffId}
                    onChange={e => { setSelectedStaffId(e.target.value); resetEnrollment(); }}
                    disabled={loadingStaff || phase === 'capture'}
                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl py-3 pl-10 pr-3 text-sm font-bold focus:border-blue-500 outline-none appearance-none disabled:opacity-60"
                  >
                    <option value="">{loadingStaff ? 'Loading...' : 'Select staff...'}</option>
                    {staffList.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.name} — {s.role}{s.department ? ` (${s.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* AI Status */}
            <div className={`p-3 rounded-xl border-2 flex items-center gap-3 ${modelsLoaded ? 'border-emerald-100 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-amber-100 bg-amber-50 dark:bg-amber-900/20 text-amber-600'}`}>
              {modelsLoaded ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {modelsLoaded ? 'AI Vision Ready' : 'Loading AI Models...'}
              </span>
            </div>

            {/* Capture Progress */}
            {(phase === 'capture' || phase === 'preview') && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</span>
                  <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">{capturedDescriptors.length}/{NUM_ANGLES}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <div className="mt-3 space-y-1.5">
                  {CAPTURE_STEPS.slice(0, NUM_ANGLES).map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 border-2 transition-all ${
                        i < capturedDescriptors.length ? 'bg-emerald-500 border-emerald-500 text-white' :
                        i === currentStep && phase === 'capture' ? `bg-blue-600 border-blue-600 text-white` :
                        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400'
                      }`}>{i < capturedDescriptors.length ? '✓' : i + 1}</div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${i < capturedDescriptors.length ? 'text-emerald-600' : i === currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-auto space-y-2">
              {phase === 'select' && selectedStaffId && modelsLoaded && (
                <button
                  onClick={() => setPhase('capture')}
                  className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                  <Camera className="w-5 h-5" /> Begin Capture
                </button>
              )}
              {phase === 'capture' && (
                <>
                  <button
                    disabled={!modelsLoaded || isCapturing || countdown !== null}
                    onClick={startCountdown}
                    className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
                  >
                    {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : countdown !== null ? <span className="text-2xl">{countdown}</span> : <Scan className="w-5 h-5" />}
                    {isCapturing ? 'Analyzing...' : countdown !== null ? 'Get Ready...' : 'Capture Angle'}
                  </button>
                  <button onClick={resetEnrollment} className="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all">
                    <RotateCcw className="w-3.5 h-3.5" /> Restart
                  </button>
                </>
              )}
              {phase === 'preview' && (
                <>
                  <button
                    disabled={isSaving}
                    onClick={handleSave}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-60 disabled:scale-100"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {isSaving ? 'Saving...' : 'Confirm & Save'}
                  </button>
                  <button onClick={resetEnrollment} className="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all">
                    <RefreshCw className="w-3.5 h-3.5" /> Re-capture
                  </button>
                </>
              )}
              {selectedStaffId && phase !== 'capture' && isUpdate && (
                <button onClick={handleDelete} className="w-full py-2 rounded-xl border border-red-100 text-red-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all mt-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Face Data
                </button>
              )}
              {onComplete && (
                <button onClick={() => onComplete(false)} className="w-full py-2 text-gray-400 text-xs font-bold uppercase tracking-widest transition-all hover:text-gray-600">
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* ── Right Panel: Camera / Preview / Done ─────────── */}
          <div className="flex-1 relative flex items-center justify-center p-8 bg-white dark:bg-gray-800 overflow-hidden">
            <AnimatePresence mode="wait">

              {/* PHASE: Select a staff member first */}
              {phase === 'select' && (
                <motion.div key="ph-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-center max-w-xs">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Info className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-3">Multi-Angle Enrollment</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">
                    Capture {NUM_ANGLES} face angles for high-accuracy biometric recognition.
                  </p>
                  <div className="space-y-2 text-left">
                    {CAPTURE_STEPS.slice(0, NUM_ANGLES).map((step, i) => (
                      <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        <span className="text-lg">{step.icon}</span>
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">Step {i + 1}: {step.label}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{step.instruction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* PHASE: Active camera capture */}
              {phase === 'capture' && (
                <motion.div key={`ph-capture-${currentStep}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="w-full max-w-lg">
                  {/* Step label */}
                  <div className={`mb-4 px-4 py-2 rounded-xl inline-flex items-center gap-2 ${colors.badge} text-xs font-black uppercase tracking-widest`}>
                    <span>{stepInfo.icon}</span> Step {currentStep + 1}/{NUM_ANGLES}: {stepInfo.label}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">{stepInfo.instruction}</p>
                  
                  {/* Webcam */}
                  <div className={`relative aspect-video rounded-3xl overflow-hidden border-4 transition-all shadow-2xl ${isCapturing ? `border-amber-400 ${colors.ring} ring-4` : `border-gray-100 dark:border-gray-700`}`}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                    />
                    {/* Face guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-60 border-2 border-white/40 border-dashed rounded-[50%] animate-pulse" />
                    </div>
                    {/* Corner brackets */}
                    {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
                      <div key={i} className={`absolute ${pos} w-8 h-8 border-white/60`} style={{
                        borderTopWidth: i < 2 ? 3 : 0,
                        borderBottomWidth: i >= 2 ? 3 : 0,
                        borderLeftWidth: i % 2 === 0 ? 3 : 0,
                        borderRightWidth: i % 2 === 1 ? 3 : 0,
                        borderRadius: [i === 0 ? '8px 0 0 0' : i === 1 ? '0 8px 0 0' : i === 2 ? '0 0 0 8px' : '0 0 8px 0'][0]
                      }} />
                    ))}
                    {/* Countdown overlay */}
                    {countdown !== null && (
                      <motion.div
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                      >
                        <span className="text-8xl font-black text-white">{countdown}</span>
                      </motion.div>
                    )}
                    {/* Processing overlay */}
                    {isCapturing && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                        <p className="text-white font-black uppercase tracking-widest text-sm">Analyzing Face...</p>
                      </motion.div>
                    )}
                    {/* Live badge */}
                    <div className="absolute bottom-4 left-4">
                      <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PHASE: Preview captured angles */}
              {phase === 'preview' && (
                <motion.div key="ph-preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="w-full max-w-lg">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Review Captures</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Confirm these angles look good before saving.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {capturedPreviews.map((img, i) => (
                      <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                        className="relative aspect-square rounded-2xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
                        <img src={img} alt={`Angle ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-emerald-500 rounded-md text-[9px] font-black text-white uppercase tracking-wide">
                          {CAPTURE_STEPS[i].label}
                        </div>
                        <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    ✅ {capturedDescriptors.length} face angles captured successfully. Click <strong>Confirm & Save</strong> to register.
                  </div>
                </motion.div>
              )}

              {/* PHASE: Done */}
              {phase === 'done' && (
                <motion.div key="ph-done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                    className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/40"
                  >
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Enrolled!</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Staff biometric data registered with {capturedDescriptors.length} face angles.
                  </p>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Background Decorations */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default FaceEnrollment;
