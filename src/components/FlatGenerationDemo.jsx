import React, { useState, useEffect } from 'react'

const buildingsData = [
  { id: 'A', name: 'Building A', floors: 4, flatsPerFloor: 6, description: 'Premium building with gym and pool' },
  { id: 'B', name: 'Building B', floors: 3, flatsPerFloor: 4, description: 'Standard building with garden' },
  { id: 'C', name: 'Building C', floors: 5, flatsPerFloor: 8, description: 'Luxury building with all amenities' }
]

const generateFlats = (buildingId) => {
  const configMap = {
    A: { floors: 4, flatsPerFloor: 6, area: '1200 sq ft', bedrooms: 3, bathrooms: 2 },
    B: { floors: 3, flatsPerFloor: 4, area: '1000 sq ft', bedrooms: 2, bathrooms: 2 },
    C: { floors: 5, flatsPerFloor: 8, area: '1500 sq ft', bedrooms: 3, bathrooms: 3 }
  }
  const config = configMap[buildingId] || { floors: 3, flatsPerFloor: 4, area: '1000 sq ft', bedrooms: 2, bathrooms: 2 }
  const list = []
  for (let floor = 1; floor <= config.floors; floor++) {
    for (let flat = 1; flat <= config.flatsPerFloor; flat++) {
      const flatNumber = `${floor}${String(flat).padStart(2, '0')}`
      list.push({
        id: `${buildingId}-${flatNumber}`,
        building: buildingId,
        flatNumber,
        floor,
        area: config.area,
        bedrooms: config.bedrooms,
        bathrooms: config.bathrooms
      })
    }
  }
  return list
}

const FlatGenerationDemo = () => {
  const [buildings, setBuildings] = useState([])
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [flats, setFlats] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadBuildings()
  }, [])

  const loadBuildings = async () => {
    try {
      setLoading(true)
      setBuildings(buildingsData)
    } catch (e) {
      console.error('Error loading buildings:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleBuildingChange = async (buildingId) => {
    setSelectedBuilding(buildingId)
    if (buildingId) {
      try {
        setLoading(true)
        setFlats(generateFlats(buildingId))
      } catch (e) {
        console.error('Error loading flats:', e)
      } finally {
        setLoading(false)
      }
    } else {
      setFlats([])
    }
  }

  const getFlatsByFloor = (flats) => {
    const floors = {}
    flats.forEach(flat => {
      if (!floors[flat.floor]) {
        floors[flat.floor] = []
      }
      floors[flat.floor].push(flat)
    })
    return floors
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Flat Generation Demo
      </h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Building
        </label>
        <select
          value={selectedBuilding}
          onChange={(e) => handleBuildingChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          disabled={loading}
        >
          <option value="">Choose a building...</option>
          {buildings.map(building => (
            <option key={building.id} value={building.id}>
              {building.name} - {building.floors} floors, {building.flatsPerFloor} flats/floor
            </option>
          ))}
        </select>
        {loading && <p className="mt-2 text-sm text-gray-500">Loading...</p>}
      </div>

      {selectedBuilding && (
        <div className="mb-6">
          {(() => {
            const building = buildings.find(b => b.id === selectedBuilding)
            return building ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                  {building.name}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {building.floors} floors • {building.flatsPerFloor} flats per floor • {flats.length} total flats
                </p>
                {building.description && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {building.description}
                  </p>
                )}
              </div>
            ) : null
          })()}
        </div>
      )}

      {flats.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Generated Flats by Floor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(getFlatsByFloor(flats))
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([floor, floorFlats]) => (
                <div key={floor} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Floor {floor} ({floorFlats.length} flats)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {floorFlats
                      .sort((a, b) => a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }))
                      .map(flat => (
                        <div
                          key={flat.id}
                          className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {flat.flatNumber}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {flat.area}
                          </div>
                          <div className="text-gray-500 dark:text-gray-500">
                            {flat.bedrooms}BR/{flat.bathrooms}BA
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {selectedBuilding && flats.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No flats found for this building</p>
        </div>
      )}
    </div>
  )
}

export default FlatGenerationDemo

