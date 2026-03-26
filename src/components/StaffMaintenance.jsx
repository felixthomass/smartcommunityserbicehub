import { useState, useEffect, useCallback } from 'react'
import {
  Wrench, ClipboardList, Calendar, AlertTriangle,
  CheckCircle, Clock, Plus, Search, Filter, Hammer, Droplets,
  Zap, Settings, Trash2, Edit, Save, ArrowRight, Activity, Construction
} from 'lucide-react'
import { showSuccess, showError, showConfirm } from '../utils/sweetAlert'

const MAINTENANCE_CATEGORIES = [
  { id: 'electrical', label: 'Electrical', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 'plumbing', label: 'Plumbing', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'carpentry', label: 'Carpentry', icon: Hammer, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { id: 'general', label: 'General', icon: Settings, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-700/50' },
  { id: 'cleaning', label: 'Cleaning', icon: Construction, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
]

const EQUIPMENT_LIST = [
  { id: 'lift-A', name: 'Elevator A1', category: 'Electrical', status: 'operational', lastService: '2024-01-15' },
  { id: 'lift-B', name: 'Elevator B1', category: 'Electrical', status: 'operational', lastService: '2024-02-10' },
  { id: 'generator-1', name: 'Main Generator', category: 'Electrical', status: 'operational', lastService: '2023-12-05' },
  { id: 'pump-1', name: 'Water Pump North', category: 'Plumbing', status: 'operational', lastService: '2024-02-20' },
  { id: 'pump-2', name: 'Water Pump South', category: 'Plumbing', status: 'maintenance', lastService: '2024-02-21' }
]

const StaffMaintenance = ({ user }) => {
  const [activeTab, setActiveTab] = useState('inventory') // inventory, equipment, schedule
  const [inventory, setInventory] = useState([])
  const [equipment, setEquipment] = useState(EQUIPMENT_LIST)
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: 'general', quantity: 0, unit: 'pcs', minLevel: 5 })

  const STORAGE_KEY = 'staff_maintenance_inventory'

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setInventory(JSON.parse(stored))
    } else {
      // Default inventory
      const initial = [
        { id: 1, name: 'LED Bulbs (9W)', category: 'electrical', quantity: 24, unit: 'pcs', minLevel: 10 },
        { id: 2, name: 'Door Handles', category: 'carpentry', quantity: 8, unit: 'pcs', minLevel: 5 },
        { id: 3, name: 'Tap Washers', category: 'plumbing', quantity: 45, unit: 'pcs', minLevel: 15 },
        { id: 4, name: 'Glass Cleaner', category: 'cleaning', quantity: 12, unit: 'bottles', minLevel: 3 },
        { id: 5, name: 'Circuit Breakers', category: 'electrical', quantity: 4, unit: 'pcs', minLevel: 5 }
      ]
      setInventory(initial)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    }
  }, [])

  const handleAddInventory = (e) => {
    e.preventDefault()
    if (!newItem.name) return
    const updated = [...inventory, { ...newItem, id: Date.now() }]
    setInventory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setNewItem({ name: '', category: 'general', quantity: 0, unit: 'pcs', minLevel: 5 })
    setShowAddForm(false)
    showSuccess('Success', 'Inventory item added.')
  }

  const updateQuantity = (id, delta) => {
    const updated = inventory.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) }
      }
      return item
    })
    setInventory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const deleteItem = async (id) => {
    const result = await showConfirm('Delete Item', 'Are you sure you want to remove this item?')
    if (result.isConfirmed) {
      const updated = inventory.filter(item => item.id !== id)
      setInventory(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      showSuccess('Deleted', 'Item removed from inventory.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Maintenance Tools</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage assets, inventory, and schedules</p>
            </div>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button onClick={() => setActiveTab('inventory')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'inventory'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Inventory
            </button>
            <button onClick={() => setActiveTab('equipment')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'equipment'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Equipment
            </button>
            <button onClick={() => setActiveTab('schedule')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'schedule'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Schedule
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-500" />
              Spare Parts & Supplies
            </h4>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {showAddForm && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900 shadow-lg animate-in fade-in slide-in-from-top-4">
              <form onSubmit={handleAddInventory} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Item Name</label>
                  <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" placeholder="e.g. Wash basin tap" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                    {MAINTENANCE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                  <input type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                </div>
                <div className="flex items-end gap-2 md:col-span-4 justify-end">
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Item</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map(item => {
              const cat = MAINTENANCE_CATEGORIES.find(c => c.id === item.category) || MAINTENANCE_CATEGORIES[3]
              const isLow = item.quantity <= item.minLevel
              return (
                <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${cat.bg}`}>
                      <cat.icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h5 className="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                    {item.name}
                    {isLow && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    )}
                  </h5>
                  <p className="text-xs text-gray-500 mb-4">{cat.label}</p>
                  
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">-</button>
                    <div className="text-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                      <span className="text-[10px] text-gray-500 block">{item.unit}</span>
                    </div>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Critical Infrastructure
            </h4>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Asset</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Service</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {equipment.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{asset.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{asset.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        asset.status === 'operational' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(asset.lastService).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Log Check</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Planned Maintenance
          </h4>
          
          <div className="space-y-3">
            {[
              { title: 'Pest Control - All Blocks', date: 'Feb 25, 2024', status: 'upcoming', type: 'Cleaning' },
              { title: 'DG Set Service (Monthly)', date: 'Feb 26, 2024', status: 'upcoming', type: 'Electrical' },
              { title: 'Water Tank Cleaning', date: 'Mar 02, 2024', status: 'upcoming', type: 'Plumbing' },
              { title: 'Fire Extinguisher Refill', date: 'Mar 05, 2024', status: 'upcoming', type: 'Safety' }
            ].map((event, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center text-gray-900 dark:text-white">
                    <span className="text-[10px] font-bold uppercase">{event.date.split(' ')[0]}</span>
                    <span className="text-sm font-bold">{event.date.split(' ')[1].replace(',', '')}</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">{event.title}</h5>
                    <p className="text-xs text-gray-500">{event.type}</p>
                  </div>
                </div>
                <button className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffMaintenance
