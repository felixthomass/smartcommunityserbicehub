import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, User, Phone, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { gateService } from '../../services/gateService';

const WorkerEntry = ({ onBack }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle, captured, submitting, success, error
  const [result, setResult] = useState(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setStatus('captured');
  }, [webcamRef]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!capturedImage) return;
    
    setStatus('submitting');
    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('name', name);
      
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      formData.append('photo', blob, 'worker_face.jpg');

      const response = await gateService.workerEntry(formData);
      if (response.success) {
        setStatus('success');
        setResult(response.data);
      } else {
        setStatus('error');
        setResult(response.error || 'Worker validation failed');
      }
    } catch (err) {
      setStatus('error');
      setResult(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold uppercase text-xs transition px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Camera className="w-10 h-10" /> Worker Entry
          </h2>
          <p className="text-blue-100 font-bold text-sm uppercase tracking-widest opacity-80 mt-1">
            Face-based entry validation
          </p>
        </div>

        <div className="p-8">
          {status === 'idle' ? (
            <div className="space-y-6">
              <div className="relative aspect-video bg-gray-900 rounded-3xl overflow-hidden border-4 border-gray-100 dark:border-gray-700 shadow-inner">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-[3px] border-white/20 pointer-events-none flex items-center justify-center">
                   <div className="w-64 h-64 border-2 border-dashed border-white/40 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full">
                    Align face in circle
                  </span>
                </div>
              </div>
              
              <button 
                onClick={capture}
                className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition shadow-xl shadow-blue-500/20 active:scale-95"
              >
                Capture Photo
              </button>
            </div>
          ) : status === 'captured' ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-blue-500 shadow-2xl">
                <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                <button 
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="absolute top-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-md text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-black/70 transition"
                >
                  Retake
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="text" 
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone..."
                      className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter name..."
                      className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold transition-all"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                Validate Entry
              </button>
            </form>
          ) : status === 'submitting' ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-gray-400 uppercase tracking-widest animate-pulse">Processing Face Data...</p>
            </div>
          ) : status === 'success' ? (
            <div className="py-12 text-center space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle size={64} />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Approved</h3>
                <p className="font-bold text-gray-500 text-lg">{result.name}</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {result.assignedFlats?.map(flat => (
                    <span key={flat} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-black uppercase tracking-widest">{flat}</span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => { setStatus('idle'); setPhone(''); setName(''); setCapturedImage(null); }}
                className="px-12 py-4 bg-gray-900 dark:bg-gray-700 text-white font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition active:scale-95 shadow-lg"
              >
                Next Entry
              </button>
            </div>
          ) : (
            <div className="py-12 text-center space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
                <XCircle size={64} />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-red-600 dark:text-red-400 uppercase tracking-tighter">Rejected</h3>
                <p className="font-bold text-gray-500">{result || 'Identification Failed'}</p>
                <p className="text-xs text-red-500 font-black uppercase tracking-widest mt-2">Security override required</p>
              </div>
              <button 
                onClick={() => setStatus('idle')}
                className="px-12 py-4 bg-gray-900 dark:bg-gray-700 text-white font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition active:scale-95 shadow-lg"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerEntry;
