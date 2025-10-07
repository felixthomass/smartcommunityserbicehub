import React, { useEffect, useMemo, useState } from 'react'
import { residentService } from '../services/residentService'
import { mapService } from '../services/mapService'

const BUILDING_CONFIG = {
  A: { floors: 4, flatsPerFloor: 6 },
  B: { floors: 3, flatsPerFloor: 4 },
  C: { floors: 5, flatsPerFloor: 8 }
}

const generateFlats = (buildingId) => {
  const cfg = BUILDING_CONFIG[buildingId] || { floors: 3, flatsPerFloor: 4 }
  const list = []
  for (let floor = 1; floor <= cfg.floors; floor++) {
    for (let n = 1; n <= cfg.flatsPerFloor; n++) {
      const flatNumber = `${floor}${String(n).padStart(2, '0')}`
      list.push({ building: buildingId, flatNumber, floor })
    }
  }
  return list
}

const BuildingBlock = ({ id, selectedFlatKey, onSelectFlat, x, y }) => {
  const flats = useMemo(() => generateFlats(id), [id])
  const cfg = BUILDING_CONFIG[id]
  const width = 220
  const floorHeight = 26
  const padding = 8
  const totalHeight = padding * 2 + cfg.floors * floorHeight + 24
  const rectRx = 6
  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        <linearGradient id={`bgrad_${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      {/* Header */}
      <rect x={0} y={0} width={width} height={24} rx={rectRx} fill={`url(#bgrad_${id})`} />
      <text x={width/2} y={16} textAnchor="middle" fontSize="12" fill="#fff" style={{ fontWeight: 600 }}>{`Building ${id} · ${cfg.floors}F · ${cfg.flatsPerFloor}/F`}</text>
      {/* Body */}
      <rect x={0} y={24} width={width} height={totalHeight-24} rx={rectRx} fill="#fff" stroke="#e5e7eb" />
      {/* Floors */}
      {Array.from({ length: cfg.floors }).map((_, i) => {
        const floor = cfg.floors - i
        const yPos = 24 + padding + i * floorHeight
        const floorFlats = flats.filter(f => f.floor === floor)
        const colWidth = (width - padding * 2) / cfg.flatsPerFloor
        return (
          <g key={`${id}-floor-${floor}`}>
            <text x={4} y={yPos + floorHeight/2 + 3} fontSize="9" fill="#6b7280">F{floor}</text>
            {floorFlats.map((f, idx) => {
              const key = `${f.building}-${f.flatNumber}`
              const selected = selectedFlatKey === key
              const rx = 4
              const fx = padding + idx * colWidth + 24
              const fy = yPos + 4
              const fw = colWidth - 6
              const fh = floorHeight - 8
              return (
                <g key={key} className="cursor-pointer" onClick={() => onSelectFlat(f.building, f.flatNumber)}>
                  <rect x={fx} y={fy} width={fw} height={fh} rx={rx} fill={selected ? '#2563eb' : '#f3f4f6'} stroke={selected ? '#2563eb' : '#d1d5db'} />
                  <text x={fx + fw/2} y={fy + fh/2 + 3} textAnchor="middle" fontSize="10" fill={selected ? '#fff' : '#111827'}>{f.flatNumber}</text>
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

const CommunityMap = ({ user }) => {
  const [selected, setSelected] = useState({ building: 'A', flatNumber: '' })
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [facilities, setFacilities] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalResidents, setModalResidents] = useState([])

  const selectedFlatKey = useMemo(() => (
    selected.building && selected.flatNumber ? `${selected.building}-${selected.flatNumber}` : ''
  ), [selected])

  useEffect(() => {
    const b = user?.building
    const f = user?.flatNumber
    if (b && BUILDING_CONFIG[b]) {
      setSelected({ building: b, flatNumber: f || '' })
    }
  }, [user?.building, user?.flatNumber])

  const loadResidents = async (building, flatNumber) => {
    try {
      setLoading(true)
      setError('')
      const res = await residentService.listByFlat(building, flatNumber)
      if (res.success) {
        setResidents(res.residents || res.data || [])
      } else {
        setResidents([])
        setError(res.error || 'Failed to load residents')
      }
    } catch (e) {
      setResidents([])
      setError(e.message || 'Failed to load residents')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectFlat = async (building, flatNumber) => {
    setSelected({ building, flatNumber })
    if (flatNumber) {
      loadResidents(building, flatNumber)
      try {
        setModalLoading(true)
        setShowModal(true)
        const res = await residentService.listByFlat(building, flatNumber)
        if (res.success) setModalResidents(res.residents || res.data || [])
        else setModalResidents([])
      } catch (e) {
        setModalResidents([])
      } finally {
        setModalLoading(false)
      }
    }
  }

  useEffect(() => {
    (async () => {
      const res = await mapService.getFacilities()
      if (res.success) setFacilities(res.data || [])
    })()
  }, [])

  return (
    <div className="w-full rounded-lg">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">Community Map</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Click a flat to view its residents</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Jump to flat (e.g., A-203)"
            className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            onKeyDown={(e)=>{
              if (e.key==='Enter'){
                const v = (e.currentTarget.value||'').trim().toUpperCase()
                const m = v.match(/^([ABC])[-\s]?([0-9]{3})$/)
                if (m){ handleSelectFlat(m[1], m[2]) }
              }
            }}
          />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Selected: {selected.flatNumber ? `${selected.flatNumber}-${selected.building}` : 'None'}
          </div>
        </div>
      </div>

      {/* Campus SVG */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <svg viewBox="0 0 1000 540" className="w-full h-auto">
          {/* Ground */}
          <rect x="0" y="0" width="1000" height="540" fill="#f9fafb" />
          {/* Park area */}
          <rect x="20" y="20" width="960" height="200" rx="12" fill="#e6f7ee" stroke="#c7eedc" />
          <text x="30" y="44" fontSize="13" fill="#047857" style={{fontWeight:600}}>Central Park</text>
          {/* Pool */}
          <rect x="820" y="70" width="140" height="60" rx="12" fill="#bae6fd" stroke="#7dd3fc" />
          <text x="890" y="95" fontSize="11" textAnchor="middle" fill="#0c4a6e">Swimming Pool</text>
          {/* Clubhouse */}
          <rect x="670" y="60" width="130" height="90" rx="10" fill="#ede9fe" stroke="#ddd6fe" />
          <text x="735" y="105" fontSize="11" textAnchor="middle" fill="#4c1d95">Clubhouse / Gym</text>
          {/* Garden */}
          <rect x="30" y="60" width="200" height="90" rx="10" fill="#dcfce7" stroke="#bbf7d0" />
          <text x="130" y="105" fontSize="11" textAnchor="middle" fill="#14532d">Community Garden</text>
          {/* Security Gate */}
          <rect x="460" y="20" width="80" height="30" rx="6" fill="#fee2e2" stroke="#fecaca" />
          <text x="500" y="39" fontSize="11" textAnchor="middle" fill="#7f1d1d">Security Gate</text>

          {/* Parking zones */}
          <g>
            <rect x="40" y="250" width="260" height="70" rx="8" fill="#fef9c3" stroke="#fde68a" />
            <text x="170" y="292" fontSize="11" textAnchor="middle" fill="#92400e">Parking A</text>
            <rect x="370" y="250" width="260" height="70" rx="8" fill="#fef9c3" stroke="#fde68a" />
            <text x="500" y="292" fontSize="11" textAnchor="middle" fill="#92400e">Parking B</text>
            <rect x="700" y="250" width="260" height="70" rx="8" fill="#fef9c3" stroke="#fde68a" />
            <text x="830" y="292" fontSize="11" textAnchor="middle" fill="#92400e">Parking C</text>
          </g>

          {/* Buildings row */}
          <g>
            <BuildingBlock id="A" x={60} y={340} selectedFlatKey={selectedFlatKey} onSelectFlat={handleSelectFlat} />
            <BuildingBlock id="B" x={390} y={348} selectedFlatKey={selectedFlatKey} onSelectFlat={handleSelectFlat} />
            <BuildingBlock id="C" x={720} y={332} selectedFlatKey={selectedFlatKey} onSelectFlat={handleSelectFlat} />
          </g>
        </svg>
      </div>

      {/* Facilities and legend */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="font-semibold text-gray-900 dark:text-white mb-3">Campus Facilities</div>
          {facilities.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">No facilities data.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {facilities.map(f => (
                <div key={f.id} className="p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{f.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Type: {f.type} • Area: {f.area} • Level: {f.level || '—'}{typeof f.capacity==='number' ? ` • Cap: ${f.capacity}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="font-semibold text-gray-900 dark:text-white mb-3">Legend</div>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li><span className="inline-block w-3 h-3 bg-blue-600 mr-2 align-middle"></span>Selected flat</li>
            <li><span className="inline-block w-3 h-3 bg-gray-300 dark:bg-gray-600 mr-2 align-middle"></span>Available flat</li>
            <li><span className="inline-block w-3 h-3 bg-green-500 mr-2 align-middle"></span>Gym / Fitness</li>
            <li><span className="inline-block w-3 h-3 bg-cyan-500 mr-2 align-middle"></span>Swimming Pool</li>
            <li><span className="inline-block w-3 h-3 bg-yellow-500 mr-2 align-middle"></span>Parking</li>
          </ul>
        </div>
      </div>

      {/* Details panel */}
      <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="font-semibold text-gray-900 dark:text-white">Flat Residents</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{selected.flatNumber ? `${selected.flatNumber}-${selected.building}` : 'Select a flat'}</div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-gray-600 dark:text-gray-400">Loading residents...</div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
          ) : !selected.flatNumber ? (
            <div className="text-gray-600 dark:text-gray-400 text-sm">Pick a flat from any building to view residents.</div>
          ) : residents.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-400 text-sm">No residents found for {selected.flatNumber}-{selected.building}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-white">Name</th>
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-white">Email</th>
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-white">Phone</th>
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-white">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map(r => (
                    <tr key={r._id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-2 text-gray-900 dark:text-white">{r.name}</td>
                      <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{r.email}</td>
                      <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{r.phone || '-'}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${r.isOwner ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{r.isOwner ? 'Yes' : 'No'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
      </div>
      </div>

      {/* Flat details modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Flat {selected.flatNumber}-{selected.building}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Resident details</div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
            </div>
            <div className="p-5">
              {modalLoading ? (
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
              ) : modalResidents.length === 0 ? (
                <div className="text-gray-600 dark:text-gray-400 text-sm">No residents found for this flat.</div>
              ) : (
                <div className="space-y-3">
                  {modalResidents.map((r) => (
                    <div key={r._id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{r.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">{r.email}</div>
                        </div>
                        <div className="text-right text-xs text-gray-600 dark:text-gray-300">
                          {r.phone || ''}
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        <span className={`px-2 py-0.5 rounded ${r.isOwner ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{r.isOwner ? 'Owner' : 'Resident'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunityMap


