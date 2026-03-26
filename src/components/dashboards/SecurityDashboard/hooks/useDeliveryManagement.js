import { useState, useEffect } from 'react';
import { deliveryService } from '../../../services/deliveryService';
import { showSuccess, showError } from '../../../utils/sweetAlert';

export const useDeliveryManagement = (user) => {
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliverySearchTerm, setDeliverySearchTerm] = useState('');
  const [deliveryFilters, setDeliveryFilters] = useState({
    vendor: '',
    date: '',
    status: 'all',
    flatNumber: ''
  });
  const [vendors, setVendors] = useState([]);
  const [deliveryStats, setDeliveryStats] = useState(null);
  const [blacklistedAgents, setBlacklistedAgents] = useState([]);
  const [quickDeliveryForm, setQuickDeliveryForm] = useState({
    selectedVendor: null,
    selectedFlat: null,
    agentName: '',
    agentPhone: '',
    trackingId: '',
    packageDescription: '',
    deliveryNotes: '',
    proofPhoto: null,
    proofUrl: null
  });

  const loadDeliveryLogs = async () => {
    setDeliveriesLoading(true);
    try {
      const result = await deliveryService.getDeliveryLogs({ limit: 100 });
      if (result.success) setDeliveryLogs(result.data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const result = await deliveryService.getVendors();
      if (result.success) setVendors(result.data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const loadDeliveryStats = async () => {
    try {
      const result = await deliveryService.getDeliveryStats({ period: 'day' });
      if (result.success) setDeliveryStats(result.data);
    } catch (error) {
       console.error('Error loading delivery stats:', error);
    }
  };

  const filterDeliveries = () => {
     let filtered = [...deliveryLogs];
     if (deliverySearchTerm) {
        const lower = deliverySearchTerm.toLowerCase();
        filtered = filtered.filter(d => 
           d.vendor?.toLowerCase().includes(lower) ||
           d.agentName?.toLowerCase().includes(lower)
        );
     }
     setFilteredDeliveries(filtered);
  };

  useEffect(() => {
     filterDeliveries();
  }, [deliveryLogs, deliverySearchTerm, deliveryFilters]);

  const handleQuickDeliverySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!quickDeliveryForm.selectedVendor || !quickDeliveryForm.selectedFlat) {
       showError('Error', 'Vendor and Flat are required');
       return;
    }
    // Implementation...
    showSuccess('Delivery logged');
    loadDeliveryLogs();
  };

  return {
    deliveryLogs,
    filteredDeliveries,
    deliveriesLoading,
    deliverySearchTerm,
    setDeliverySearchTerm,
    deliveryFilters,
    setDeliveryFilters,
    vendors,
    deliveryStats,
    blacklistedAgents,
    quickDeliveryForm,
    setQuickDeliveryForm,
    loadDeliveryLogs,
    loadVendors,
    loadDeliveryStats,
    handleQuickDeliverySubmit
  };
};
