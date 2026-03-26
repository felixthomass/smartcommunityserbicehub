import React from 'react';
import { 
  Truck, CheckCircle, Clock, AlertTriangle, Plus, Search, Filter, 
  Home, Eye, Bell, X, Camera, Upload, Users 
} from 'lucide-react';

const DeliveryModule = ({ 
  deliveryStats,
  blacklistedAgents,
  deliveryLogs,
  activeView,
  setActiveView,
  deliverySearchTerm,
  setDeliverySearchTerm,
  deliveryFilters,
  setDeliveryFilters,
  vendors,
  filteredDeliveries,
  deliveriesLoading,
  selectedDelivery,
  setSelectedDelivery,
  quickDeliveryForm,
  setQuickDeliveryForm,
  handleQuickDeliverySubmit,
  handleVendorSelection,
  handleFlatSelection,
  applyDeliverySuggestion,
  handleDeliveryProofCapture,
  isLoading,
  residents,
  residentsLoading,
  filteredResidents,
  loadResidents,
  residentSearchTerm,
  setResidentSearchTerm,
  residentFilters,
  setResidentFilters,
  handleAgentNameChange,
  deliverySuggestions
}) => {
  if (activeView === 'delivery-add') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">2-Click Delivery Log</h3>
            <button
              onClick={() => setActiveView('deliveries')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleQuickDeliverySubmit} className="space-y-6">
            {/* Step 1: Vendor Selection */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Step 1: Select Vendor</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {vendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => handleVendorSelection(vendor)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      quickDeliveryForm.selectedVendor?.id === vendor.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{vendor.icon}</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{vendor.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Flat Selection */}
            {quickDeliveryForm.selectedVendor && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Step 2: Select Flat</h4>
                
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={loadResidents}
                    type="button"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    {residents.length === 0 ? 'Load Admin Residents' : 'Refresh Admin Residents'}
                  </button>
                  {residents.length > 0 && (
                    <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      📊 {residents.length} admin-created residents loaded
                    </span>
                  )}
                </div>

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
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search residents by name or flat number..."
                          value={residentSearchTerm}
                          onChange={(e) => setResidentSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setResidentSearchTerm('')
                            setResidentFilters({...residentFilters, building: ''})
                          }}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            !residentFilters.building && !residentSearchTerm
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          All Residents
                        </button>
                        {['A', 'B', 'C'].map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              setResidentSearchTerm('')
                              setResidentFilters({...residentFilters, building: b})
                            }}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                              residentFilters.building === b
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            Building {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredResidents.slice(0, 12).map((resident) => (
                        <button
                          key={resident._id || resident.authUserId}
                          type="button"
                          onClick={() => handleFlatSelection(resident)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            quickDeliveryForm.selectedFlat?.authUserId === resident.authUserId
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{resident.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{resident.building}-{resident.flatNumber}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resident Verification */}
            {quickDeliveryForm.selectedFlat && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="text-lg font-medium text-green-900 dark:text-green-200 mb-3">✅ Resident Verified</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Resident Name:</p>
                    <p className="font-medium text-green-900 dark:text-green-100">{quickDeliveryForm.selectedFlat.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">Flat Number:</p>
                    <p className="font-medium text-green-900 dark:text-green-100 font-mono">{quickDeliveryForm.selectedFlat.building}-{quickDeliveryForm.selectedFlat.flatNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Details */}
            {quickDeliveryForm.selectedVendor && quickDeliveryForm.selectedFlat && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Delivery Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agent Name</label>
                    <input
                      type="text"
                      value={quickDeliveryForm.agentName}
                      onChange={(e) => handleAgentNameChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agent Phone</label>
                    <input
                      type="tel"
                      value={quickDeliveryForm.agentPhone}
                      onChange={(e) => setQuickDeliveryForm({...quickDeliveryForm, agentPhone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter agent phone"
                    />
                  </div>
                </div>

                {deliverySuggestions && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Smart Suggestion</h5>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-800 dark:text-blue-300">
                        This agent usually delivers to {deliverySuggestions.suggestedFlat?.flatNumber} - {deliverySuggestions.suggestedFlat?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => applyDeliverySuggestion(deliverySuggestions)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Proof of Delivery (Optional)</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleDeliveryProofCapture}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('delivery-photo-upload').click()}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4" /> Upload Photo
                    </button>
                    <input
                      id="delivery-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          setQuickDeliveryForm({
                            ...quickDeliveryForm,
                            proofPhoto: file,
                            proofUrl: URL.createObjectURL(file)
                          })
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                  {quickDeliveryForm.proofUrl && (
                    <div className="mt-4">
                      <img src={quickDeliveryForm.proofUrl} className="w-32 h-32 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setQuickDeliveryForm({...quickDeliveryForm, proofPhoto: null, proofUrl: null})}
                        className="mt-2 text-xs text-red-600"
                      >
                        Remove Photo
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Logging Delivery...' : 'Log Delivery'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Statistics */}
      {deliveryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center gap-3">
            <Truck className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold dark:text-white">{deliveryStats.totalToday || 0}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-xl font-bold dark:text-white">{deliveryStats.deliveredToday || 0}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Delivered</p>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="text-xl font-bold dark:text-white">{deliveryStats.pendingToday || 0}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-xl font-bold dark:text-white">{blacklistedAgents.length || 0}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Blacklisted</p>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold dark:text-white">Delivery Management</h3>
          <button
            onClick={() => setActiveView('delivery-add')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Quick Log
          </button>
        </div>

        {/* Filters and List rendering logic here (simplified for brevity) */}
        {/* ... (renderDeliveryLogs logic) ... */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 dark:text-white">Vendor</th>
                <th className="text-left py-3 px-4 dark:text-white">Flat</th>
                <th className="text-left py-3 px-4 dark:text-white">Agent</th>
                <th className="text-left py-3 px-4 dark:text-white">Status</th>
                <th className="text-left py-3 px-4 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 dark:text-white">{delivery.vendor}</td>
                  <td className="py-3 px-4 dark:text-white">{delivery.building}-{delivery.flatNumber}</td>
                  <td className="py-3 px-4 dark:text-white">{delivery.agentName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      delivery.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => setSelectedDelivery(delivery)} className="text-gray-600 dark:text-gray-400">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for details */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between mb-4">
              <h3 className="text-xl font-bold dark:text-white">Delivery Details</h3>
              <button onClick={() => setSelectedDelivery(null)} className="dark:text-white"><X /></button>
            </div>
            {/* Modal Content */}
            <div className="space-y-4">
               <div>
                  <p className="text-sm text-gray-500">Resident</p>
                  <p className="font-medium dark:text-white">{selectedDelivery.residentName} ({selectedDelivery.building}-{selectedDelivery.flatNumber})</p>
               </div>
               <div>
                  <p className="text-sm text-gray-500">Agent</p>
                  <p className="font-medium dark:text-white">{selectedDelivery.agentName} ({selectedDelivery.agentPhone})</p>
               </div>
               {selectedDelivery.proofPhoto && (
                  <img src={selectedDelivery.proofPhoto} alt="Proof" className="w-full rounded border" />
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryModule;
