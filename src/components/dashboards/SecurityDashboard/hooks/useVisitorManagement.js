import { useState, useEffect } from 'react';
import { mongoService } from '../../../../services/mongoService';
import { showSuccess, showError, showConfirm } from '../../../../utils/sweetAlert';
import { exportToPDF, exportToCSV } from '../../../../utils/visitorExportUtils';

export const useVisitorManagement = (user) => {
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [stats, setStats] = useState({ totalVisitors: 0, checkedIn: 0, checkedOut: 0 });
  const [visitorForm, setVisitorForm] = useState({
    visitorType: 'guest',
    visitorName: '',
    visitorPhone: '',
    visitorEmail: '',
    idType: 'aadhar',
    idNumber: '',
    purpose: '',
    hostName: '',
    hostFlat: '',
    hostPhone: '',
    vehicleNumber: '',
    expectedExitTime: '',
    notes: ''
  });
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [visitorPhotoFile, setVisitorPhotoFile] = useState(null);
  const [visitorPhotoPreview, setVisitorPhotoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState('id'); // 'id' or 'visitor'
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [selectedVisitorForPass, setSelectedVisitorForPass] = useState(null);
  const [isSendingPassEmail, setIsSendingPassEmail] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalToday: 0,
    currentlyInside: 0,
    checkedOut: 0,
    lateVisitors: 0,
    peakHourLabel: 'No data',
    hourlyActivity: [],
    mostVisitedFlats: [],
    visitorTypeDistribution: []
  });
  const [connectionStatus, setConnectionStatus] = useState('connected');

  const loadVisitorLogs = async () => {
    setIsLoading(true);
    try {
      const filters = {};
      if (dateFilter) filters.date = dateFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      const result = await mongoService.getVisitorLogs(filters);
      if (result.success) {
        setVisitorLogs(result.data?.data || []);
      }
    } catch (error) {
      console.error('Error loading visitor logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await mongoService.getVisitorStats('today');
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await mongoService.getVisitorAnalytics();
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const filterLogs = () => {
    let filtered = [...visitorLogs];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.visitorName.toLowerCase().includes(lower) ||
        log.visitorPhone.includes(searchTerm) ||
        log.hostName.toLowerCase().includes(lower) ||
        log.hostFlat.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }
    setFilteredLogs(filtered);
  };

  useEffect(() => {
    loadVisitorLogs();
    loadStats();
    loadAnalytics();
  }, [user]);

  useEffect(() => {
    filterLogs();
  }, [visitorLogs, searchTerm, statusFilter, dateFilter]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVisitorPhotoFile(file);
      const url = URL.createObjectURL(file);
      setVisitorPhotoPreview(url);
    }
  };

  const resetForm = () => {
    setVisitorForm({
      visitorType: 'guest',
      visitorName: '',
      visitorPhone: '',
      visitorEmail: '',
      idType: 'aadhar',
      idNumber: '',
      purpose: '',
      hostName: '',
      hostFlat: '',
      hostPhone: '',
      vehicleNumber: '',
      expectedExitTime: '',
      notes: ''
    });
    setEditingVisitor(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setVisitorPhotoFile(null);
    setVisitorPhotoPreview(null);
  };

  const handleGeneratePass = (visitor) => {
    setSelectedVisitorForPass(visitor);
    setIsPassModalOpen(true);
  };

  const handleDownloadPDF = async (visitor) => {
    try {
      showSuccess('PDF Download Started', 'Generating your visitor pass PDF...');
      exportToPDF([visitor]);
    } catch (error) {
      showError('Export Failed', 'Could not generate PDF. Please try again.');
    }
  };

  const handleCameraCapture = async (videoElement) => {
    try {
      if (!videoElement) throw new Error('Video element not found');

      const canvas = document.createElement('canvas');
      const videoWidth = videoElement.videoWidth || 1280;
      const videoHeight = videoElement.videoHeight || 720;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

      canvas.toBlob((blob) => {
        if (blob) {
          const prefix = cameraMode === 'visitor' ? 'visitor_face' : 'visitor_id';
          const file = new File([blob], `${prefix}_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          
          if (cameraMode === 'visitor') {
            setVisitorPhotoFile(file);
            setVisitorPhotoPreview(url);
          } else {
            setSelectedFile(file);
            setPreviewUrl(url);
          }
          
          setShowCamera(false);
          
          // Stop all tracks
          const stream = videoElement.srcObject;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          videoElement.srcObject = null;
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Camera capture error:', error);
      showError('Error', 'Failed to capture photo');
    }
  };

  const handleCheckOut = async (id) => {
    try {
      const result = await mongoService.updateVisitorLog(id, { 
        status: 'checked_out', 
        exitTime: new Date() 
      });
      if (result.success) {
        showSuccess('Checked Out', 'Visitor has checked out successfully');
        loadVisitorLogs();
        loadStats();
        loadAnalytics();
      }
    } catch (error) {
      showError('Error', 'Failed to check out visitor');
    }
  };

  const handleDeleteVisitor = async (id) => {
    const confirmed = await showConfirm('Are you sure?', 'This visitor log will be permanently deleted.');
    if (!confirmed) return;

    try {
      const result = await mongoService.deleteVisitorLog(id);
      if (result.success) {
        showSuccess('Deleted', 'Visitor log removed successfully');
        loadVisitorLogs();
        loadStats();
        loadAnalytics();
      }
    } catch (error) {
      showError('Error', 'Failed to delete visitor log');
    }
  };

  const handleVisitorClick = (visitor) => {
    setSelectedVisitor(visitor);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredLogs);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredLogs);
  };

  const handleSendPassEmail = async (visitor) => {
    if (!visitor.visitorEmail) {
      showWarning('Email Missing', 'This visitor does not have an email address.');
      return;
    }

    setIsSendingPassEmail(true);
    try {
      const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(visitor._id)}&size=200`;
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #2563eb; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Visitor Access Pass</h1>
            <p style="margin: 8px 0 0 opacity: 0.9;">Smart Community Hub</p>
          </div>
          <div style="padding: 32px; text-align: center;">
            <p style="font-size: 18px; color: #1e293b; margin-bottom: 24px;">Hello <strong>${visitor.visitorName}</strong>,</p>
            <p style="color: #64748b; margin-bottom: 32px;">Your access to Flat ${visitor.hostFlat} has been granted. Please show the QR code below at the entry gate.</p>
            <img src="${qrCodeUrl}" alt="Access QR Code" style="width: 200px; height: 200px; margin-bottom: 32px; border: 8px solid #f8fafc; border-radius: 16px;" />
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: left; display: inline-block; min-width: 250px;">
              <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Host:</strong> ${visitor.hostName}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Valid Until:</strong> ${visitor.expectedExitTime ? new Date(visitor.expectedExitTime).toLocaleString() : 'End of Day'}</p>
            </div>
          </div>
          <div style="background: #f8fafc; color: #94a3b8; padding: 16px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0;">
            This is an automated security pass. Access sequences are unique to each visit.
          </div>
        </div>
      `;

      const response = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: visitor.visitorEmail,
          subject: `Your Visitor Pass for Flat ${visitor.hostFlat}`,
          html: emailContent
        })
      });

      if (response.ok) {
        showSuccess('Pass Sent!', `The visitor pass has been emailed to ${visitor.visitorEmail}`);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Email error:', error);
      showError('Delivery Failed', 'Could not send the pass via email. Check server status.');
    } finally {
      setIsSendingPassEmail(false);
    }
  };

  const handleSubmitVisitor = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      let visitorData = {
        ...visitorForm,
        status: 'checked_in',
        entryTime: new Date(),
        securityOfficer: user.name || user.email
      };

      const result = await mongoService.createVisitorLog(visitorData);
      
      if (result.success) {
        const newVisitor = result.data;
        
        // Handle file uploads if present
        if (selectedFile || visitorPhotoFile) {
          setIsUploading(true);
          try {
            const uploadPromises = [];
            if (selectedFile) {
              uploadPromises.push(mongoService.uploadDocument(selectedFile, newVisitor._id, 'id_proof'));
            }
            if (visitorPhotoFile) {
              uploadPromises.push(mongoService.uploadDocument(visitorPhotoFile, newVisitor._id, 'visitor_photo'));
            }
            await Promise.all(uploadPromises);
          } catch (uploadError) {
            console.error('File upload failed:', uploadError);
            showError('Warning', 'Visitor logged but document uploads failed');
          } finally {
            setIsUploading(false);
          }
        }

        showSuccess('Visitor Added Successfully', 'Visitor recorded and access granted.');
        resetForm();
        loadVisitorLogs();
        loadStats();
        loadAnalytics();
        return true;
      }
    } catch (error) {
      showError('Error', 'Failed to log visitor');
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  return {
    visitorLogs,
    filteredLogs,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    stats,
    analytics,
    loadAnalytics,
    connectionStatus,
    visitorForm,
    setVisitorForm,
    selectedVisitor,
    setSelectedVisitor,
    editingVisitor,
    loadVisitorLogs,
    loadStats,
    handleSubmitVisitor,
    handleCheckOut,
    handleDeleteVisitor,
    handleVisitorClick,
    handleExportPDF,
    handleExportCSV,
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
    resetForm,
    isPassModalOpen,
    setIsPassModalOpen,
    selectedVisitorForPass,
    setSelectedVisitorForPass,
    handleGeneratePass,
    handleDownloadPDF,
    handleSendPassEmail,
    isSendingPassEmail
  };
};
