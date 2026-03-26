import React from 'react';
import { Package, Upload, Plus, Trash2 } from 'lucide-react';

const BulkDeliveryModule = ({ 
  bulkDeliveries,
  setBulkDeliveries,
  setBulkDeliveryMode,
  setActiveView,
  handleBulkSubmit,
  isLoading
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-500" />
              Bulk Delivery Processing
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload a CSV file or manually add multiple deliveries at once.</p>
          </div>
          <button
            onClick={() => {
              setBulkDeliveryMode(false);
              setActiveView('deliveries');
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* CSV Upload Section */}
        <div className="mb-8 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center bg-gray-50 dark:bg-gray-900/50">
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload Delivery Manifest (CSV)</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Required columns: Vendor, Flat Number, Agent Name, Phone, Description
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && typeof Papa !== 'undefined') {
                Papa.parse(file, {
                  header: true,
                  skipEmptyLines: true,
                  complete: (results) => {
                    const parsed = results.data.map(row => ({
                      vendor: row.Vendor || '',
                      flatNumber: row['Flat Number'] || '',
                      agentName: row['Agent Name'] || '',
                      agentPhone: row.Phone || '',
                      description: row.Description || '',
                      status: 'arrived'
                    }));
                    setBulkDeliveries([...bulkDeliveries, ...parsed]);
                  }
                });
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
          />
        </div>

        {/* Manual Addition / Review List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Delivery List ({bulkDeliveries.length})</h4>
            <button
              onClick={() => {
                setBulkDeliveries([...bulkDeliveries, {
                  vendor: '', flatNumber: '', agentName: '', agentPhone: '', description: '', status: 'arrived'
                }]);
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Vendor</th>
                  <th className="px-4 py-3">Flat Number</th>
                  <th className="px-4 py-3">Agent Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody>
                {bulkDeliveries.map((delivery, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="px-4 py-2">
                       <input type="text" value={delivery.vendor} onChange={(e) => {
                          const newDels = [...bulkDeliveries];
                          newDels[index].vendor = e.target.value;
                          setBulkDeliveries(newDels);
                       }} className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="Amazon..." />
                    </td>
                    <td className="px-4 py-2">
                       <input type="text" value={delivery.flatNumber} onChange={(e) => {
                          const newDels = [...bulkDeliveries];
                          newDels[index].flatNumber = e.target.value;
                          setBulkDeliveries(newDels);
                       }} className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="101A" />
                    </td>
                    <td className="px-4 py-2">
                       <input type="text" value={delivery.agentName} onChange={(e) => {
                          const newDels = [...bulkDeliveries];
                          newDels[index].agentName = e.target.value;
                          setBulkDeliveries(newDels);
                       }} className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="John" />
                    </td>
                    <td className="px-4 py-2">
                       <input type="text" value={delivery.agentPhone} onChange={(e) => {
                          const newDels = [...bulkDeliveries];
                          newDels[index].agentPhone = e.target.value;
                          setBulkDeliveries(newDels);
                       }} className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="12345..." />
                    </td>
                    <td className="px-4 py-2">
                       <input type="text" value={delivery.description} onChange={(e) => {
                          const newDels = [...bulkDeliveries];
                          newDels[index].description = e.target.value;
                          setBulkDeliveries(newDels);
                       }} className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="Box..." />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          const newDels = bulkDeliveries.filter((_, i) => i !== index);
                          setBulkDeliveries(newDels);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
             <button
               onClick={handleBulkSubmit}
               disabled={isLoading || bulkDeliveries.length === 0}
               className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
             >
               {isLoading ? 'Processing...' : `Confirm & Log ${bulkDeliveries.length} Deliveries`}
             </button>
             <button
                onClick={() => setBulkDeliveries([])}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white"
             >
                Clear All
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkDeliveryModule;
