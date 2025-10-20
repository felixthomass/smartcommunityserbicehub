const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

export const mapService = {
  /**
   * Get all residents with their flat information for the map
   * @returns {Promise<Object>} Residents data
   */
  async getResidentsForMap() {
    try {
      const response = await fetch(`${API_BASE}/api/residents/map`)
      
      if (!response.ok) {
        // Try alternative endpoint for residents
        const altResponse = await fetch(`${API_BASE}/api/residents`)
        if (altResponse.ok) {
          const altResult = await altResponse.json()
          const residents = altResult.data || altResult.residents || []
          return { 
            success: true, 
            data: this.formatResidentsForMap(residents)
          }
        }
        
        // No fallback to mock data - return empty array if API is not available
        console.warn('Residents API not available, returning empty array')
        return { 
          success: true, 
          data: []
        }
      }
      
      const result = await response.json()
      const residents = result.data || result.residents || []
      return { 
        success: true, 
        data: this.formatResidentsForMap(residents)
      }
    } catch (error) {
      console.error('Error fetching residents for map:', error)
      // No fallback to mock data - return empty array on error
      return { 
        success: true, 
        data: []
      }
    }
  },

  /**
   * Get static campus facilities layout
   */
  async getFacilities() {
    try {
      // Static layout for now; could be fetched from API later
      return {
        success: true,
        data: [
          { id: 'parking-a', name: 'Parking - Building A', type: 'parking', area: 'A', level: 'Basement', capacity: 40 },
          { id: 'parking-b', name: 'Parking - Building B', type: 'parking', area: 'B', level: 'Basement', capacity: 25 },
          { id: 'parking-c', name: 'Parking - Building C', type: 'parking', area: 'C', level: 'Basement', capacity: 60 },
          { id: 'gym', name: 'Gym', type: 'gym', area: 'Clubhouse', level: 'Ground', capacity: 20 },
          { id: 'pool', name: 'Swimming Pool', type: 'pool', area: 'Clubhouse', level: 'Ground', capacity: 30 },
          { id: 'garden', name: 'Community Garden', type: 'garden', area: 'Central Park', level: 'Ground' },
          { id: 'clubhouse', name: 'Clubhouse', type: 'clubhouse', area: 'Central', level: 'Ground' },
          { id: 'gate', name: 'Security Gate', type: 'security', area: 'Entrance', level: 'Ground' }
        ]
      }
    } catch (e) {
      return { success: true, data: [] }
    }
  },

  /**
   * Get campus layout metadata
   */
  async getCampusLayout() {
    return {
      success: true,
      data: {
        buildings: [
          { id: 'A', name: 'Building A', floors: 4, flatsPerFloor: 6 },
          { id: 'B', name: 'Building B', floors: 3, flatsPerFloor: 4 },
          { id: 'C', name: 'Building C', floors: 5, flatsPerFloor: 8 }
        ]
      }
    }
  },

  /**
   * Get resident details by building and flat number
   * @param {string} building - Building ID
   * @param {string} flatNumber - Flat number
   * @returns {Promise<Object>} Resident details
   */
  async getResidentByFlat(building, flatNumber) {
    try {
      const response = await fetch(`${API_BASE}/api/residents/flat/${building}/${flatNumber}`)
      
      if (!response.ok) {
        // No fallback to mock data - return null if resident not found
        return { 
          success: true, 
          data: null
        }
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching resident by flat:', error)
      // No fallback to mock data - return null on error
      return { 
        success: true, 
        data: null
      }
    }
  },

  /**
   * Get building statistics for the map
   * @returns {Promise<Object>} Building statistics
   */
  async getBuildingStats() {
    try {
      const response = await fetch(`${API_BASE}/api/buildings/stats`)
      
      if (!response.ok) {
        // Calculate stats from residents data
        const residentsResult = await this.getResidentsForMap()
        if (residentsResult.success) {
          return { 
            success: true, 
            data: this.calculateBuildingStats(residentsResult.data)
          }
        }
        
        // No fallback to mock data - return empty stats
        return { 
          success: true, 
          data: {
            buildingA: { totalFlats: 0, occupiedFlats: 0, vacantFlats: 0, owners: 0, tenants: 0, restricted: 0 },
            buildingB: { totalFlats: 0, occupiedFlats: 0, vacantFlats: 0, owners: 0, tenants: 0, restricted: 0 },
            buildingC: { totalFlats: 0, occupiedFlats: 0, vacantFlats: 0, owners: 0, tenants: 0, restricted: 0 }
          }
        }
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching building stats:', error)
      // Try to calculate from residents data
      try {
        const residentsResult = await this.getResidentsForMap()
        if (residentsResult.success) {
          return { 
            success: true, 
            data: this.calculateBuildingStats(residentsResult.data)
          }
        }
      } catch (e) {
        console.error('Error calculating stats from residents:', e)
      }
      
      // No fallback to mock data - return empty stats
      return { 
        success: true, 
        data: {
          buildingA: { totalFlats: 0, occupiedFlats: 0, vacantFlats: 0, owners: 0, tenants: 0, restricted: 0 },
          buildingB: { totalFlats: 0, occupiedFlats: 0, vacantFlats: 0, owners: 0, tenants: 0, restricted: 0 },
          buildingC: { totalFlats: 0, occupiedFlats: 0, vacantFlats: 0, owners: 0, tenants: 0, restricted: 0 }
        }
      }
    }
  },

  /**
   * Format real residents data for map display
   * @param {Array} residents - Raw residents data from API
   * @returns {Array} Formatted residents data
   */
  formatResidentsForMap(residents) {
    return residents.map(resident => ({
      _id: resident._id,
      authUserId: resident.authUserId,
      name: resident.name || 'Unknown',
      email: resident.email || '',
      phone: resident.phone || '',
      building: resident.building || 'A',
      flatNumber: resident.flatNumber || '101',
      floor: this.extractFloorFromFlatNumber(resident.flatNumber),
      ownerName: resident.ownerName || resident.name || 'Unknown',
      isRestricted: resident.isRestricted || false,
      isOccupied: resident.isOccupied !== false, // Default to true if not specified
      residentType: resident.residentType || 'owner',
      moveInDate: resident.moveInDate || resident.createdAt || new Date().toISOString(),
      avatar: resident.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.flatNumber || 'default'}`,
      emergencyContact: resident.emergencyContact || null,
      vehicleInfo: resident.vehicleInfo || {
        hasVehicle: false,
        vehicleNumber: null,
        parkingSlot: null
      },
      createdAt: resident.createdAt || new Date().toISOString(),
      updatedAt: resident.updatedAt || new Date().toISOString()
    }))
  },

  /**
   * Extract floor number from flat number
   * @param {string} flatNumber - Flat number (e.g., "101", "205")
   * @returns {number} Floor number
   */
  extractFloorFromFlatNumber(flatNumber) {
    if (!flatNumber) return 1
    const floor = parseInt(flatNumber.charAt(0))
    return isNaN(floor) ? 1 : floor
  },

  /**
   * Calculate building statistics from residents data
   * @param {Array} residents - Residents data
   * @returns {Object} Building statistics
   */
  calculateBuildingStats(residents) {
    const stats = {
      buildingA: { totalFlats: 24, occupiedFlats: 0, vacantFlats: 24, owners: 0, tenants: 0, restricted: 0 },
      buildingB: { totalFlats: 12, occupiedFlats: 0, vacantFlats: 12, owners: 0, tenants: 0, restricted: 0 },
      buildingC: { totalFlats: 40, occupiedFlats: 0, vacantFlats: 40, owners: 0, tenants: 0, restricted: 0 }
    }

    residents.forEach(resident => {
      const buildingKey = `building${resident.building}`
      if (stats[buildingKey]) {
        if (resident.isOccupied) {
          stats[buildingKey].occupiedFlats++
          stats[buildingKey].vacantFlats--
          
          if (resident.residentType === 'owner') {
            stats[buildingKey].owners++
          } else if (resident.residentType === 'tenant') {
            stats[buildingKey].tenants++
          }
          
          if (resident.isRestricted) {
            stats[buildingKey].restricted++
          }
        }
      }
    })

    return stats
  },

}
