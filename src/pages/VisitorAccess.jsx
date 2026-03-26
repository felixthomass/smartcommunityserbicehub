import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Navigation, Clock, User, Home, AlertCircle } from 'lucide-react';
import VisitorNavigationSteps from '../components/VisitorNavigationSteps';
import { passService } from '../services/passService';

const VisitorAccess = () => {
  const { passCode } = useParams();
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const fetchPassDetails = async () => {
      try {
        setLoading(true);
        // Note: For a public page, this endpoint needs to be accessible without auth.
        // passService.getPassByCode should ideally work without auth header for this specific use case
        const res = await passService.getPassByCode(passCode);
        if (res && res.pass) {
          setPass(res.pass);
        } else if (res && res.data) {
          setPass(res.data);
        } else {
          setPass(res);
        }
      } catch (err) {
        console.error("Error fetching pass:", err);
        setError('Pass not found or expired. Please check your link.');
      } finally {
        setLoading(false);
      }
    };

    if (passCode) {
      fetchPassDetails();
    }
    
    // Request geolocation if available
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          // Optional: Send location to backend for tracking
        },
        (error) => {
          console.warn("Geolocation denied or failed:", error.message);
        }
      );
    }
  }, [passCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your pass details...</p>
        </div>
      </div>
    );
  }

  if (error || !pass) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Pass</h2>
          <p className="text-gray-600">{error || 'This visitor pass could not be found.'}</p>
        </div>
      </div>
    );
  }

  const isValid = new Date(pass.validUntil) > new Date();
  
  // Format destination building string
  const destinationStr = pass.building 
    ? `Building ${pass.building}${pass.flatNumber ? `, Flat ${pass.flatNumber}` : ''}`
    : 'Community Access';

  const handleStartNavigation = () => {
    // Determine target location for Google Maps
    // If we had exact lat/lng for the gate/building, we'd use them.
    // For now we use the community/address or generic search
    const dest = encodeURIComponent(destinationStr + " " + (pass.apartmentName || "Smart Community Hub"));
    let mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    
    // If we have specific coordinates from db, use them instead
    if (pass.latitude && pass.longitude) {
      mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${pass.latitude},${pass.longitude}`;
    }
    
    window.open(mapUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header Title */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Visitor Access
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome to Smart Community Hub
          </p>
        </div>

        {/* Pass Details Card */}
        <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
                <QrCodeIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{pass.visitorName}</h2>
              <div className="flex items-center justify-center text-gray-500 mt-2 gap-2">
                <Home className="w-4 h-4" />
                <span>Destination: <strong className="text-gray-900">{destinationStr}</strong></span>
              </div>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div className="flex items-center text-gray-500">
                  <User className="w-4 h-4 mr-2" />
                  <span className="text-sm">Host</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{pass.hostName || 'Resident'}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div className="flex items-center text-gray-500">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm">Valid Until</span>
                </div>
                <span className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {new Date(pass.validUntil).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center">
             <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Pass Code</div>
             <div className="text-2xl font-mono text-gray-900 tracking-[0.2em]">{pass.code}</div>
          </div>
        </div>

        {/* Navigation Instructions */}
        {isValid && (
          <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
            <VisitorNavigationSteps
              gate={pass.gateName || "Main Gate"}
              block={pass.building ? "Building " + pass.building : ""}
              floor={pass.floorNumber || (pass.flatNumber && pass.flatNumber.length > 2 ? pass.flatNumber.slice(0, -2) : "1")}
              flat={pass.flatNumber}
            />
          </div>
        )}

        {/* Start Navigation Button */}
        {isValid && (
          <button 
            onClick={handleStartNavigation}
            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Navigation className="w-5 h-5 mr-3" />
            Start Navigation
          </button>
        )}
      </div>
    </div>
  );
};

// Extracted SVG icon since we might not have QrCode in lucide map above
function QrCodeIcon(props) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1"/>
      <rect width="5" height="5" x="16" y="3" rx="1"/>
      <rect width="5" height="5" x="3" y="16" rx="1"/>
      <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
      <path d="M21 21v.01"/>
      <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
      <path d="M3 12h.01"/>
      <path d="M12 3h.01"/>
      <path d="M12 16v.01"/>
      <path d="M16 12h1"/>
      <path d="M21 12v.01"/>
      <path d="M12 21v-1"/>
    </svg>
  );
}

export default VisitorAccess;
