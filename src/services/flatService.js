const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

export const flatService = {
  /**
   * Get all available buildings (local, no network)
   */
  async getBuildings() {
    return {
      success: true,
      data: [
        { id: 'A', name: 'Building A', floors: 4, flatsPerFloor: 6, description: 'Premium building with gym and pool' },
        { id: 'B', name: 'Building B', floors: 3, flatsPerFloor: 4, description: 'Standard building with garden' },
        { id: 'C', name: 'Building C', floors: 5, flatsPerFloor: 8, description: 'Luxury building with all amenities' }
      ]
    }
  },

  /**
   * Get available flats for a specific building (local, no network)
   */
  async getFlatsByBuilding(buildingId) {
    return { success: true, data: this.generateDefaultFlats(buildingId) }
  },

  /**
   * Get all available flats across all buildings (local, no network)
   */
  async getAllFlats() {
    const allFlats = []
    for (const building of ['A', 'B', 'C']) {
      allFlats.push(...this.generateDefaultFlats(building))
    }
    return { success: true, data: allFlats }
  },

  /**
   * Check if a flat is available (local: assume available)
   */
  async checkFlatAvailability(buildingId, flatNumber) {
    return { success: true, data: { available: true, reason: null } }
  },

  /**
   * Generate default flats for a building (fallback)
   */
  generateDefaultFlats(buildingId) {
    const flats = []
    const buildingConfigs = {
      'A': { floors: 4, flatsPerFloor: 6, area: '1200 sq ft', bedrooms: 3, bathrooms: 2 },
      'B': { floors: 3, flatsPerFloor: 4, area: '1000 sq ft', bedrooms: 2, bathrooms: 2 },
      'C': { floors: 5, flatsPerFloor: 8, area: '1500 sq ft', bedrooms: 3, bathrooms: 3 }
    }
    const config = buildingConfigs[buildingId] || { floors: 3, flatsPerFloor: 4, area: '1000 sq ft', bedrooms: 2, bathrooms: 2 }
    for (let floor = 1; floor <= config.floors; floor++) {
      for (let flat = 1; flat <= config.flatsPerFloor; flat++) {
        const flatNumber = this.generateFlatNumber(buildingId, floor, flat, config.flatsPerFloor)
        flats.push({
          id: `${buildingId}-${flatNumber}`,
          building: buildingId,
          flatNumber,
          floor,
          type: 'residential',
          available: true,
          area: config.area,
          bedrooms: config.bedrooms,
          bathrooms: config.bathrooms,
          amenities: this.getBuildingAmenities(buildingId)
        })
      }
    }
    return flats
  },

  generateFlatNumber(buildingId, floor, flat, flatsPerFloor) {
    return `${floor}${String(flat).padStart(2, '0')}`
  },

  getBuildingAmenities(buildingId) {
    const amenities = {
      'A': ['Parking', 'Balcony', 'Power Backup', 'Gym', 'Swimming Pool'],
      'B': ['Parking', 'Balcony', 'Power Backup', 'Garden'],
      'C': ['Parking', 'Balcony', 'Power Backup', 'Gym', 'Swimming Pool', 'Club House', 'Security']
    }
    return amenities[buildingId] || ['Parking', 'Balcony', 'Power Backup']
  },

  /**
   * Get flat details by building and flat number (local)
   */
  async getFlatDetails(buildingId, flatNumber) {
    return {
      success: true,
      data: {
        id: `${buildingId}-${flatNumber}`,
        building: buildingId,
        flatNumber,
        floor: parseInt(flatNumber.charAt(0)),
        type: 'residential',
        available: true,
        area: '1000 sq ft',
        bedrooms: 2,
        bathrooms: 2,
        amenities: ['Parking', 'Balcony', 'Power Backup']
      }
    }
  }
}
