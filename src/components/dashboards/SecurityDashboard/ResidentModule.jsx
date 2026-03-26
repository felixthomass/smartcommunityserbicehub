import React, { useState, useEffect } from 'react';
import { 
  Building, Users, Shield, AlertTriangle, QrCode, Mic, MicOff, Search, Filter, 
  User, Home, Phone, Mail, AlertCircle, UserCheck 
} from 'lucide-react';
import { enhancedResidentService } from '../../../services/enhancedResidentService';
import { showConfirm, showSuccess, showError } from '../../../utils/sweetAlert';

const ResidentModule = ({ 
  residents,
  residentsLoading,
  loadResidents,
  buildingStats,
  residentSearchTerm,
  setResidentSearchTerm,
  residentFilters,
  setResidentFilters,
  filteredResidents,
  handleResidentClick,
  selectedResident,
  setSelectedResident,
  residentDetails,
  setResidentDetails,
  flatDetails,
  setFlatDetails,
  guestList,
  setGuestList,
  setActiveView,
  activeView,
  recognition,
  isListening,
  startVoiceSearch,
  handleScanSearch,
  scanMode,
  setScanMode,
  verifyVisitorAgainstGuestList,
  user
}) => {
  if (activeView === 'resident-details') {
    if (!selectedResident) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Resident Details</h3>
            <button
              onClick={() => {
                setSelectedResident(null)
                setResidentDetails(null)
                setFlatDetails(null)
                setGuestList([])
                setActiveView('residents')
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resident Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Flat:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.building}-{selectedResident.flatNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedResident.email || 'N/A'}</span>
                  </div>
                  {selectedResident.ownerName && selectedResident.ownerName !== selectedResident.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Owner:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedResident.ownerName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Alerts */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status & Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">KYC Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedResident.kycVerified
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {selectedResident.kycVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Restriction:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedResident.isRestricted
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {selectedResident.isRestricted ? 'Restricted' : 'Normal'}
                    </span>
                  </div>

                  {selectedResident.specialNotes && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Special Notes</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">{selectedResident.specialNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Family Information */}
              {residentDetails?.familyMembers && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Family Members</h4>
                  <div className="space-y-2">
                    {residentDetails.familyMembers.map((member, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-gray-900 dark:text-white">{member.name}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{member.relationship}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flat Details */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Flat Details</h4>
              
              {flatDetails ? (
                <div className="space-y-4">
                  {/* Parking Information */}
                  {flatDetails.parkingSlots && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Parking Slots</h5>
                      <div className="space-y-1">
                        {flatDetails.parkingSlots.map((slot, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Slot {slot.number}:</span>
                            <span className="text-gray-900 dark:text-white">{slot.vehicleNumber || 'Empty'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frequent Visitors */}
                  {flatDetails.frequentVisitors && flatDetails.frequentVisitors.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Frequent Visitors</h5>
                      <div className="space-y-2">
                        {flatDetails.frequentVisitors.map((visitor, index) => (
                          <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{visitor.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{visitor.purpose}</p>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {visitor.frequency} visits
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Preferences */}
                  {flatDetails.deliveryPreferences && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Delivery Preferences</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Allowed:</span>
                          <span className="text-gray-900 dark:text-white">
                            {flatDetails.deliveryPreferences.allowed ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Instructions:</span>
                          <span className="text-gray-900 dark:text-white">
                            {flatDetails.deliveryPreferences.instructions || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No additional flat details available</p>
                </div>
              )}
            </div>
          </div>

          {/* Guest List */}
          {guestList.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pre-approved Guest List</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {guestList.map((guest, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{guest.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{guest.phone}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Purpose: {guest.purpose}</p>
                      <p>Valid until: {new Date(guest.validUntil).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                const visitorName = prompt('Enter visitor name for verification:')
                const visitorPhone = prompt('Enter visitor phone:')
                if (visitorName && visitorPhone) {
                  verifyVisitorAgainstGuestList(visitorName, visitorPhone)
                }
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Verify Visitor
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={async () => {
                  const result = await showConfirm(
                    'Update Restriction Status',
                    `Are you sure you want to ${selectedResident.isRestricted ? 'remove restriction from' : 'restrict'} this resident?`
                  )
                  if (result.isConfirmed) {
                    const updateResult = await enhancedResidentService.updateRestriction(
                      selectedResident.authUserId,
                      !selectedResident.isRestricted
                    )
                    if (updateResult.success) {
                      showSuccess('Status Updated', 'Resident restriction status has been updated.')
                      loadResidents()
                    } else {
                      showError('Update Failed', 'Failed to update restriction status.')
                    }
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedResident.isRestricted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                {selectedResident.isRestricted ? 'Remove Restriction' : 'Add Restriction'}
              </button>
            )}
            
            <button
              onClick={() => {
                setSelectedResident(null)
                setResidentDetails(null)
                setFlatDetails(null)
                setGuestList([])
                setActiveView('residents')
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Building Statistics */}
      {buildingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.totalResidents}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Residents</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.occupiedFlats}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Occupied Flats</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.kycVerified}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">KYC Verified</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buildingStats.restricted}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Restricted</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Created Residents</h3>
            {residents.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                📊 {residents.length} admin-created residents • {filteredResidents.length} shown
              </p>
            )}
            {residents.length === 0 && !residentsLoading && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                ⚠️ No residents found. Create residents using AdminAddResidents first.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadResidents}
              disabled={residentsLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Users className="w-4 h-4" />
              {residentsLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setScanMode(!scanMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                scanMode ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Scan Mode
            </button>
            {recognition && (
              <button
                onClick={startVoiceSearch}
                disabled={isListening}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isListening ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? 'Listening...' : 'Voice Search'}
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, flat, phone..."
              value={residentSearchTerm}
              onChange={(e) => setResidentSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <select
            value={residentFilters.building}
            onChange={(e) => setResidentFilters({...residentFilters, building: e.target.value})}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Buildings</option>
            <option value="A">Building A</option>
            <option value="B">Building B</option>
            <option value="C">Building C</option>
          </select>

          <select
            value={residentFilters.kycVerified === null ? '' : residentFilters.kycVerified}
            onChange={(e) => setResidentFilters({
              ...residentFilters, 
              kycVerified: e.target.value === '' ? null : e.target.value === 'true'
            })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All KYC Status</option>
            <option value="true">KYC Verified</option>
            <option value="false">Not Verified</option>
          </select>

          <button
            onClick={() => {
              setResidentSearchTerm('')
              setResidentFilters({
                building: '',
                ownersOnly: false,
                tenantsOnly: false,
                kycVerified: null,
                restricted: null
              })
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Clear Filters
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={residentFilters.ownersOnly}
              onChange={(e) => setResidentFilters({
                ...residentFilters,
                ownersOnly: e.target.checked,
                tenantsOnly: e.target.checked ? false : residentFilters.tenantsOnly
              })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Owners Only</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={residentFilters.tenantsOnly}
              onChange={(e) => setResidentFilters({
                ...residentFilters,
                tenantsOnly: e.target.checked,
                ownersOnly: e.target.checked ? false : residentFilters.ownersOnly
              })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Tenants Only</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={residentFilters.restricted === true}
              onChange={(e) => setResidentFilters({
                ...residentFilters,
                restricted: e.target.checked ? true : null
              })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Restricted Only</span>
          </label>
        </div>

        {/* Scan Mode */}
        {scanMode && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quick Scan Search</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter QR code or scan data..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleScanSearch(e.target.value)
                  }
                }}
              />
              <button
                onClick={() => document.getElementById('scan-file-input').click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload Image
              </button>
              <input
                id="scan-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleScanSearch(file.name)
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Residents List */}
        {residentsLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading residents...</p>
          </div>
        ) : filteredResidents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No admin-created residents found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResidents.map((resident) => (
              <div
                key={resident._id || resident.authUserId}
                onClick={() => handleResidentClick(resident)}
                className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md cursor-pointer transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{resident.name || 'Unknown'}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {resident.building}-{resident.flatNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {resident.isRestricted && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Restricted
                      </span>
                    )}
                    {resident.kycVerified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Shield className="w-3 h-3 mr-1" />
                        KYC Verified
                      </span>
                    )}
                    {resident.isOwner && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        <Home className="w-3 h-3 mr-1" />
                        Owner
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {resident.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {resident.phone}
                    </div>
                  )}
                  {resident.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {resident.email}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentModule;
