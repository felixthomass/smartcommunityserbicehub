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
        
        // Fallback to mock data if API is not available
        console.log('Using fallback mock data for residents map')
        return { 
          success: true, 
          data: this.generateMockResidentsData()
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
      // Fallback to mock data
      return { 
        success: true, 
        data: this.generateMockResidentsData()
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
        // Fallback to mock data
        return { 
          success: true, 
          data: this.generateMockResidentData(building, flatNumber)
        }
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching resident by flat:', error)
      // Fallback to mock data
      return { 
        success: true, 
        data: this.generateMockResidentData(building, flatNumber)
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
        
        // Fallback to mock data
        return { 
          success: true, 
          data: this.generateMockBuildingStats()
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
      
      // Fallback to mock data
      return { 
        success: true, 
        data: this.generateMockBuildingStats()
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

  /**
   * Generate mock residents data for fallback
   * @returns {Array} Mock residents data
   */
  generateMockResidentsData() {
    const residents = []
    
    // Building A - 4 floors, 6 flats per floor
    for (let floor = 1; floor <= 4; floor++) {
      for (let flat = 1; flat <= 6; flat++) {
        const flatNumber = `${floor}${String(flat).padStart(2, '0')}`
        residents.push({
          _id: `resident_a_${flatNumber}`,
          authUserId: `user_a_${flatNumber}`,
          name: this.generateRandomName(),
          email: `resident.a${flatNumber}@community.com`,
          phone: this.generateRandomPhone(),
          building: 'A',
          flatNumber: flatNumber,
          floor: floor,
          ownerName: this.generateRandomName(),
          isRestricted: Math.random() < 0.1, // 10% chance of being restricted
          isOccupied: Math.random() < 0.85, // 85% occupancy rate
          residentType: Math.random() < 0.7 ? 'owner' : 'tenant',
          moveInDate: this.generateRandomDate(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${flatNumber}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }

    // Building B - 3 floors, 4 flats per floor
    for (let floor = 1; floor <= 3; floor++) {
      for (let flat = 1; flat <= 4; flat++) {
        const flatNumber = `${floor}${String(flat).padStart(2, '0')}`
        residents.push({
          _id: `resident_b_${flatNumber}`,
          authUserId: `user_b_${flatNumber}`,
          name: this.generateRandomName(),
          email: `resident.b${flatNumber}@community.com`,
          phone: this.generateRandomPhone(),
          building: 'B',
          flatNumber: flatNumber,
          floor: floor,
          ownerName: this.generateRandomName(),
          isRestricted: Math.random() < 0.1,
          isOccupied: Math.random() < 0.8, // 80% occupancy rate
          residentType: Math.random() < 0.6 ? 'owner' : 'tenant',
          moveInDate: this.generateRandomDate(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${flatNumber}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }

    // Building C - 5 floors, 8 flats per floor
    for (let floor = 1; floor <= 5; floor++) {
      for (let flat = 1; flat <= 8; flat++) {
        const flatNumber = `${floor}${String(flat).padStart(2, '0')}`
        residents.push({
          _id: `resident_c_${flatNumber}`,
          authUserId: `user_c_${flatNumber}`,
          name: this.generateRandomName(),
          email: `resident.c${flatNumber}@community.com`,
          phone: this.generateRandomPhone(),
          building: 'C',
          flatNumber: flatNumber,
          floor: floor,
          ownerName: this.generateRandomName(),
          isRestricted: Math.random() < 0.05, // 5% chance of being restricted
          isOccupied: Math.random() < 0.9, // 90% occupancy rate
          residentType: Math.random() < 0.8 ? 'owner' : 'tenant',
          moveInDate: this.generateRandomDate(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${flatNumber}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }

    return residents
  },

  /**
   * Generate mock resident data for a specific flat
   * @param {string} building - Building ID
   * @param {string} flatNumber - Flat number
   * @returns {Object} Mock resident data
   */
  generateMockResidentData(building, flatNumber) {
    return {
      _id: `resident_${building.toLowerCase()}_${flatNumber}`,
      authUserId: `user_${building.toLowerCase()}_${flatNumber}`,
      name: this.generateRandomName(),
      email: `resident.${building.toLowerCase()}${flatNumber}@community.com`,
      phone: this.generateRandomPhone(),
      building: building,
      flatNumber: flatNumber,
      floor: parseInt(flatNumber.charAt(0)),
      ownerName: this.generateRandomName(),
      isRestricted: Math.random() < 0.1,
      isOccupied: Math.random() < 0.85,
      residentType: Math.random() < 0.7 ? 'owner' : 'tenant',
      moveInDate: this.generateRandomDate(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${flatNumber}`,
      emergencyContact: {
        name: this.generateRandomName(),
        phone: this.generateRandomPhone(),
        relationship: 'Family'
      },
      vehicleInfo: {
        hasVehicle: Math.random() < 0.6,
        vehicleNumber: Math.random() < 0.6 ? `MH${Math.floor(Math.random() * 100)}AB${Math.floor(Math.random() * 10000)}` : null,
        parkingSlot: Math.random() < 0.6 ? `P${building}${Math.floor(Math.random() * 50)}` : null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },

  /**
   * Generate mock building statistics
   * @returns {Object} Building statistics
   */
  generateMockBuildingStats() {
    return {
      buildingA: {
        totalFlats: 24,
        occupiedFlats: 20,
        vacantFlats: 4,
        owners: 15,
        tenants: 5,
        restricted: 2
      },
      buildingB: {
        totalFlats: 12,
        occupiedFlats: 10,
        vacantFlats: 2,
        owners: 7,
        tenants: 3,
        restricted: 1
      },
      buildingC: {
        totalFlats: 40,
        occupiedFlats: 36,
        vacantFlats: 4,
        owners: 28,
        tenants: 8,
        restricted: 2
      }
    }
  },

  /**
   * Generate random name
   * @returns {string} Random name
   */
  generateRandomName() {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Jessica', 'William', 'Ashley', 'Richard', 'Amanda', 'Joseph', 'Jennifer', 'Thomas', 'Michelle', 'Christopher', 'Kimberly']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    
    return `${firstName} ${lastName}`
  },

  /**
   * Generate random phone number
   * @returns {string} Random phone number
   */
  generateRandomPhone() {
    const prefixes = ['+91 98765', '+91 98766', '+91 98767', '+91 98768', '+91 98769']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    return `${prefix} ${suffix}`
  },

  /**
   * Generate random date within last 2 years
   * @returns {string} Random date
   */
  generateRandomDate() {
    const now = new Date()
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
    const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime())
    return new Date(randomTime).toISOString()
  }
}
