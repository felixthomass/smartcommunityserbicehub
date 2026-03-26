import { useState, useEffect } from 'react';
import { enhancedResidentService } from '../../../services/enhancedResidentService';

export const useResidentDirectory = () => {
  const [residents, setResidents] = useState([]);
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentSearchTerm, setResidentSearchTerm] = useState('');
  const [residentFilters, setResidentFilters] = useState({
    building: '',
    ownersOnly: false,
    tenantsOnly: false,
    kycVerified: null,
    restricted: null
  });
  const [selectedResident, setSelectedResident] = useState(null);
  const [residentDetails, setResidentDetails] = useState(null);
  const [flatDetails, setFlatDetails] = useState(null);
  const [guestList, setGuestList] = useState([]);
  const [buildingStats, setBuildingStats] = useState(null);

  const loadResidents = async () => {
    setResidentsLoading(true);
    try {
      // Assuming mongoService.getAdminResidentEntries is what we need
      // We might need to import mongoService here too or pass it
      const res = await enhancedResidentService.getResidents?.(); // Placeholder
      if (res?.success) {
        setResidents(res.data || []);
      }
    } catch (error) {
      console.error('Error loading residents:', error);
    } finally {
      setResidentsLoading(false);
    }
  };

  const loadBuildingStats = async () => {
    try {
      const result = await enhancedResidentService.getBuildingStats();
      if (result.success) setBuildingStats(result.data);
    } catch (error) {
      console.error('Error loading building stats:', error);
    }
  };

  const filterResidents = () => {
    let filtered = [...residents];
    if (residentSearchTerm) {
      const searchLower = residentSearchTerm.toLowerCase();
      filtered = filtered.filter(resident => 
        resident.name?.toLowerCase().includes(searchLower) ||
        resident.flatNumber?.toLowerCase().includes(searchLower)
      );
    }
    if (residentFilters.building) {
      filtered = filtered.filter(r => r.building === residentFilters.building);
    }
    setFilteredResidents(filtered);
  };

  useEffect(() => {
    filterResidents();
  }, [residents, residentSearchTerm, residentFilters]);

  const handleResidentClick = async (resident) => {
    setSelectedResident(resident);
    try {
      const [details, flat, guests] = await Promise.all([
        enhancedResidentService.getResidentDetails(resident.authUserId),
        enhancedResidentService.getFlatDetails(resident.building, resident.flatNumber),
        enhancedResidentService.getGuestList(resident.authUserId)
      ]);
      if (details.success) setResidentDetails(details.data);
      if (flat.success) setFlatDetails(flat.data);
      if (guests.success) setGuestList(guests.data);
    } catch (error) {
      console.error('Error loading resident extra details:', error);
    }
  };

  return {
    residents,
    filteredResidents,
    residentsLoading,
    residentSearchTerm,
    setResidentSearchTerm,
    residentFilters,
    setResidentFilters,
    selectedResident,
    setSelectedResident,
    residentDetails,
    flatDetails,
    guestList,
    buildingStats,
    loadResidents,
    loadBuildingStats,
    handleResidentClick
  };
};
