import { useState, useEffect } from 'react'
import {
  Settings, Moon, Sun, Bell, Shield, Building2, Globe, Save,
  Palette, Eye, EyeOff, Lock, Mail, Clock, User, ToggleLeft,
  ToggleRight, ChevronRight, Check, AlertTriangle, Database,
  Wifi, Volume2, VolumeX, Smartphone, Monitor
} from 'lucide-react'

const SETTINGS_KEY = 'community_hub_settings'

const Toggle = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
    <button onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : ''}`} />
    </button>
  </div>
)

const SettingSection = ({ icon: Icon, title, description, children, color = 'text-blue-500' }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
          {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
    </div>
    <div className="px-6 py-4 divide-y divide-gray-100 dark:divide-gray-700">
      {children}
    </div>
  </div>
)

const AdminSettings = ({ user, darkMode, setDarkMode }) => {
  const [settings, setSettings] = useState({
    communityName: 'Community Hub',
    address: '',
    totalBuildings: 3,
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
    autoApproveVisitors: false,
    requirePhotoForVisitors: true,
    maintenanceMode: false,
    visitorLogRetention: 90,
    complaintAutoEscalation: 7,
    sessionTimeout: 30,
    twoFactorAuth: false,
    theme: darkMode ? 'dark' : 'light'
  })
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
      if (Object.keys(stored).length > 0) setSettings(s => ({ ...s, ...stored }))
    } catch {}
  }, [])

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateSetting = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }))
    if (key === 'theme') {
      setDarkMode?.(value === 'dark')
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: Database }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Platform Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your community platform configuration</p>
            </div>
          </div>
          <button onClick={saveSettings}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${saved
              ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'}`}>
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <SettingSection icon={Building2} title="Community Information" description="Basic community details" color="text-blue-500">
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Community Name</label>
              <input type="text" value={settings.communityName} onChange={e => updateSetting('communityName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <input type="text" value={settings.address} onChange={e => updateSetting('address', e.target.value)}
                placeholder="Enter community address..."
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="py-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Buildings</label>
              <select value={settings.totalBuildings} onChange={e => updateSetting('totalBuildings', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} Building{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </SettingSection>

          <SettingSection icon={User} title="Account" description="Your admin account details" color="text-emerald-500">
            <div className="py-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user?.name || 'Admin'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'admin@community.com'}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 capitalize mt-0.5">{user?.role || 'admin'}</p>
                </div>
              </div>
            </div>
          </SettingSection>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <SettingSection icon={Bell} title="Notification Preferences" description="Configure how you receive notifications" color="text-amber-500">
          <Toggle label="Email Notifications" description="Receive notifications via email"
            enabled={settings.emailNotifications} onChange={v => updateSetting('emailNotifications', v)} />
          <Toggle label="Push Notifications" description="Browser push notifications"
            enabled={settings.pushNotifications} onChange={v => updateSetting('pushNotifications', v)} />
          <Toggle label="Sound Effects" description="Play sounds for new notifications"
            enabled={settings.soundEnabled} onChange={v => updateSetting('soundEnabled', v)} />
        </SettingSection>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <SettingSection icon={Shield} title="Access & Safety" description="Security-related settings" color="text-red-500">
            <Toggle label="Auto-approve Visitors" description="Automatically approve visitor requests"
              enabled={settings.autoApproveVisitors} onChange={v => updateSetting('autoApproveVisitors', v)} />
            <Toggle label="Require Photo for Visitors" description="Mandatory photo capture for visitor entry"
              enabled={settings.requirePhotoForVisitors} onChange={v => updateSetting('requirePhotoForVisitors', v)} />
            <Toggle label="Two-Factor Authentication" description="Require 2FA for admin login"
              enabled={settings.twoFactorAuth} onChange={v => updateSetting('twoFactorAuth', v)} />
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Session Timeout</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Auto logout after inactivity</p>
                </div>
                <select value={settings.sessionTimeout} onChange={e => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
          </SettingSection>

          <SettingSection icon={Clock} title="Data Retention" description="How long data is kept" color="text-purple-500">
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Visitor Log Retention</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Days to keep visitor logs</p>
                </div>
                <select value={settings.visitorLogRetention} onChange={e => updateSetting('visitorLogRetention', parseInt(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
            </div>
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Complaint Auto-Escalation</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Days before unresolved complaints escalate</p>
                </div>
                <select value={settings.complaintAutoEscalation} onChange={e => updateSetting('complaintAutoEscalation', parseInt(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                </select>
              </div>
            </div>
          </SettingSection>
        </div>
      )}

      {/* Appearance Settings */}
      {activeTab === 'appearance' && (
        <SettingSection icon={Palette} title="Theme & Display" description="Customize the look and feel" color="text-violet-500">
          <div className="py-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { updateSetting('theme', 'light'); setDarkMode?.(false) }}
                className={`p-4 rounded-xl border-2 transition-all ${settings.theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <Sun className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">Light</p>
                    <p className="text-xs text-gray-500">Clean and bright</p>
                  </div>
                </div>
              </button>
              <button onClick={() => { updateSetting('theme', 'dark'); setDarkMode?.(true) }}
                className={`p-4 rounded-xl border-2 transition-all ${settings.theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shadow-sm">
                    <Moon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">Dark</p>
                    <p className="text-xs text-gray-500">Easy on the eyes</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </SettingSection>
      )}

      {/* System Settings */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <SettingSection icon={Database} title="System Status" description="Platform infrastructure status" color="text-emerald-500">
            <div className="py-3 space-y-3">
              {[
                { label: 'API Server', status: 'Online', icon: Wifi, ok: true },
                { label: 'MongoDB Atlas', status: 'Connected', icon: Database, ok: true },
                { label: 'Email Service', status: 'Configured', icon: Mail, ok: true },
                { label: 'AI Engine (Gemini)', status: 'Active', icon: Monitor, ok: true }
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium ${item.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${item.ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {item.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </SettingSection>

          <SettingSection icon={AlertTriangle} title="Danger Zone" description="Destructive actions" color="text-red-500">
            <Toggle label="Maintenance Mode" description="Temporarily disable the platform for non-admin users"
              enabled={settings.maintenanceMode} onChange={v => updateSetting('maintenanceMode', v)} />
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Clear Local Cache</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Remove all locally cached data</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all cached data? This won\'t affect server data.')) {
                      Object.keys(localStorage).forEach(key => {
                        if (key !== SETTINGS_KEY && key !== 'community_auth_token') localStorage.removeItem(key)
                      })
                      alert('Cache cleared successfully!')
                    }
                  }}
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  Clear Cache
                </button>
              </div>
            </div>
          </SettingSection>

          {/* Version Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Community Hub v1.0</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Built with React + Node.js + MongoDB</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSettings
