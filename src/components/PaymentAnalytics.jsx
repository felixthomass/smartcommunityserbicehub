import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info,
  Sparkles, RefreshCw, Building2, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Shield, Zap, Target,
  ChevronRight, Brain, Lightbulb, DollarSign, Users,
  Clock, Activity
} from 'lucide-react'

const API_BASE = 'http://localhost:3002'

// Animated counter hook
const useAnimatedValue = (target, duration = 1200) => {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.round(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

// Mini donut chart component
const DonutChart = ({ percentage = 0, size = 120, strokeWidth = 12, color = '#6366f1' }) => {
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (percentage / 100) * circ
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  )
}

// Mini bar chart
const MiniBar = ({ data = [], maxVal }) => {
  const max = maxVal || Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-sm transition-all duration-700 ease-out"
            style={{
              height: `${Math.max(4, (d.value / max) * 100)}%`,
              background: d.color || 'linear-gradient(to top, #6366f1, #818cf8)'
            }} />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

const PaymentAnalytics = ({ residents = [], statusMap = {}, month, feeAmount = 0 }) => {
  const [aiInsights, setAiInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Compute raw stats
  const stats = useMemo(() => {
    const total = residents.length
    const paid = residents.filter(r => {
      const payments = statusMap[r.authUserId] || []
      return payments.some(p => p.month === month)
    })
    const paidCount = paid.length
    const pendingCount = Math.max(0, total - paidCount)
    const collectionRate = total > 0 ? Math.round((paidCount / total) * 100) : 0
    const totalRevenue = paidCount * feeAmount
    const expectedRevenue = total * feeAmount
    const pendingRevenue = pendingCount * feeAmount

    // Building breakdown
    const buildings = {}
    residents.forEach(r => {
      const b = r.building || 'Unknown'
      if (!buildings[b]) buildings[b] = { total: 0, paid: 0, pending: 0 }
      buildings[b].total++
      const payments = statusMap[r.authUserId] || []
      if (payments.some(p => p.month === month)) buildings[b].paid++
      else buildings[b].pending++
    })
    const buildingBreakdown = Object.entries(buildings).map(([name, data]) => ({
      name, ...data, rate: data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0
    })).sort((a, b) => b.rate - a.rate)

    // Pending residents list
    const pendingResidents = residents.filter(r => {
      const payments = statusMap[r.authUserId] || []
      return !payments.some(p => p.month === month)
    }).map(r => ({ name: r.name || r.email, building: r.building, flat: r.flatNumber, email: r.email }))

    return { total, paidCount, pendingCount, collectionRate, totalRevenue, expectedRevenue, pendingRevenue, buildingBreakdown, pendingResidents }
  }, [residents, statusMap, month, feeAmount])

  const fetchAIInsights = useCallback(async () => {
    if (stats.total === 0) return
    setLoading(true)
    setError(null)
    try {
      const paymentData = {
        month,
        totalResidents: stats.total,
        paidCount: stats.paidCount,
        pendingCount: stats.pendingCount,
        collectionRate: stats.collectionRate,
        feeAmount,
        totalRevenue: stats.totalRevenue,
        expectedRevenue: stats.expectedRevenue,
        pendingRevenue: stats.pendingRevenue,
        buildingBreakdown: stats.buildingBreakdown,
        pendingResidents: stats.pendingResidents.slice(0, 20)
      }
      const resp = await fetch(`${API_BASE}/api/ai/payment-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentData })
      })
      const result = await resp.json()
      if (result.success) {
        setAiInsights({ ...result.data, _isCached: result.cached })
      } else {
        setError(result.error || 'Failed to get AI insights')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [stats, month, feeAmount])

  useEffect(() => {
    // Only auto-fetch if we don't have insights yet for this month
    if (!aiInsights || aiInsights.month !== month) {
      fetchAIInsights()
    }
  }, [month, fetchAIInsights])

  const animatedPaid = useAnimatedValue(stats.paidCount)
  const animatedPending = useAnimatedValue(stats.pendingCount)
  const animatedRate = useAnimatedValue(stats.collectionRate)
  const animatedRevenue = useAnimatedValue(stats.totalRevenue)

  const iconForType = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'danger': return <AlertTriangle className="w-5 h-5 text-red-500" />
      default: return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const typeColors = {
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
    info: 'border-blue-500/30 bg-blue-500/5'
  }

  const priorityBadge = (p) => {
    const colors = { high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[p] || colors.medium}`}>{p}</span>
  }

  const riskColors = { low: 'text-emerald-500', medium: 'text-amber-500', high: 'text-red-500' }

  if (stats.total === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>No resident data available for analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Payment Analytics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Powered by Gemini AI · {month}
              {aiInsights?._isCached && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tight">Cached</span>}
            </p>
          </div>
        </div>
        <button onClick={fetchAIInsights} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate AI Insights</>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Collection Rate', value: `${animatedRate}%`, sub: `${stats.paidCount} of ${stats.total}`, icon: <Target className="w-5 h-5" />,
            gradient: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/20',
            ring: stats.collectionRate >= 80 ? 'ring-emerald-400/30' : stats.collectionRate >= 50 ? 'ring-amber-400/30' : 'ring-red-400/30' },
          { label: 'Revenue Collected', value: `₹${animatedRevenue.toLocaleString()}`, sub: `of ₹${stats.expectedRevenue.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />,
            gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', ring: 'ring-emerald-400/30' },
          { label: 'Paid Residents', value: animatedPaid, sub: 'on time', icon: <CheckCircle2 className="w-5 h-5" />,
            gradient: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20', ring: 'ring-green-400/30' },
          { label: 'Pending', value: animatedPending, sub: `₹${stats.pendingRevenue.toLocaleString()} outstanding`, icon: <Clock className="w-5 h-5" />,
            gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', ring: 'ring-amber-400/30' }
        ].map((card, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 p-5 ring-1 ${card.ring} hover:scale-[1.02] transition-transform duration-300`}>
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[40px] bg-gradient-to-br ${card.gradient} opacity-10`} />
            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${card.gradient} text-white mb-3 ${card.shadow} shadow-lg`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Collection Donut + Building Breakdown */}
        <div className="lg:col-span-1 space-y-6">
          {/* Donut Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-500" /> Collection Overview
            </h4>
            <div className="flex justify-center relative">
              <DonutChart percentage={stats.collectionRate} color={stats.collectionRate >= 80 ? '#10b981' : stats.collectionRate >= 50 ? '#f59e0b' : '#ef4444'} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.collectionRate}%</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Collected</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">Paid ({stats.paidCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-gray-600 dark:text-gray-400">Pending ({stats.pendingCount})</span>
              </div>
            </div>
          </div>

          {/* Building Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> Building Breakdown
            </h4>
            <div className="space-y-3">
              {stats.buildingBreakdown.map((b, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{b.name}</span>
                    <span className="text-xs text-gray-500">{b.rate}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${b.rate}%`,
                        background: b.rate >= 80 ? 'linear-gradient(to right, #10b981, #34d399)' : b.rate >= 50 ? 'linear-gradient(to right, #f59e0b, #fbbf24)' : 'linear-gradient(to right, #ef4444, #f87171)'
                      }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    <span>{b.paid} paid</span>
                    <span>{b.pending} pending</span>
                  </div>
                </div>
              ))}
              {stats.buildingBreakdown.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No building data</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Insights Panel */}
        <div className="lg:col-span-2 space-y-6">
          {loading && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-12 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 animate-pulse">Gemini AI is analyzing payment patterns...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">AI Analysis Failed</p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
                </div>
              </div>
              <button onClick={fetchAIInsights} className="mt-3 text-xs text-red-600 underline hover:no-underline">Retry</button>
            </div>
          )}

          {aiInsights && !loading && (
            <>
              {/* AI Summary */}
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-indigo-200/60 dark:border-indigo-700/40 p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-800/40">
                    <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1">AI Executive Summary</h4>
                    <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">{aiInsights.summary}</p>
                  </div>
                </div>

                {/* Collection Rate Trend */}
                {aiInsights.collectionRate && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/40 rounded-xl">
                    {aiInsights.collectionRate.trend === 'up' ? <ArrowUpRight className="w-5 h-5 text-emerald-500" /> :
                     aiInsights.collectionRate.trend === 'down' ? <ArrowDownRight className="w-5 h-5 text-red-500" /> :
                     <Activity className="w-5 h-5 text-amber-500" />}
                    <div className="flex-1">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Collection Trend</div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{aiInsights.collectionRate.analysis}</div>
                    </div>
                    <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{aiInsights.collectionRate.percentage}%</div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                {[
                  { id: 'overview', label: 'Key Insights', icon: <Lightbulb className="w-3.5 h-3.5" /> },
                  { id: 'risk', label: 'Risk Analysis', icon: <Shield className="w-3.5 h-3.5" /> },
                  { id: 'actions', label: 'Actions', icon: <Zap className="w-3.5 h-3.5" /> }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  {(aiInsights.insights || []).map((insight, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${typeColors[insight.type] || typeColors.info} transition-all hover:shadow-md`}>
                      <div className="flex items-start gap-3">
                        {iconForType(insight.type)}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{insight.title}</h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!aiInsights.insights || aiInsights.insights.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-6">No insights available</p>
                  )}
                </div>
              )}

              {activeTab === 'risk' && (
                <div className="space-y-4">
                  {/* Defaulter Analysis */}
                  {aiInsights.defaulterAnalysis && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <Shield className="w-4 h-4" /> Defaulter Risk Level
                        </h4>
                        <span className={`text-lg font-bold uppercase ${riskColors[aiInsights.defaulterAnalysis.riskLevel] || 'text-gray-500'}`}>
                          {aiInsights.defaulterAnalysis.riskLevel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{aiInsights.defaulterAnalysis.description}</p>
                      {aiInsights.defaulterAnalysis.recommendations?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recommendations</p>
                          {aiInsights.defaulterAnalysis.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Revenue Forecast */}
                  {aiInsights.revenueForcast && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-indigo-500" /> Revenue Forecast
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Next Month</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">{aiInsights.revenueForcast.nextMonth}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Trend</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">{aiInsights.revenueForcast.trend}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                          <div className={`text-sm font-bold mt-1 uppercase ${
                            aiInsights.revenueForcast.confidence === 'high' ? 'text-emerald-500' :
                            aiInsights.revenueForcast.confidence === 'medium' ? 'text-amber-500' : 'text-red-500'}`}>
                            {aiInsights.revenueForcast.confidence}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Residents */}
                  {stats.pendingResidents.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-amber-500" /> Pending Residents ({stats.pendingResidents.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {stats.pendingResidents.slice(0, 15).map((r, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 text-xs">
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">{r.name || 'Unknown'}</span>
                              <span className="text-gray-400 ml-2">{r.building}-{r.flat}</span>
                            </div>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">₹{feeAmount}</span>
                          </div>
                        ))}
                        {stats.pendingResidents.length > 15 && (
                          <p className="text-[10px] text-gray-400 text-center">+ {stats.pendingResidents.length - 15} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-3">
                  {(aiInsights.recommendations || []).map((rec, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{priorityBadge(rec.priority)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{rec.action}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Impact: {rec.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!aiInsights.recommendations || aiInsights.recommendations.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-6">No recommendations available</p>
                  )}
                </div>
              )}
            </>
          )}

          {!aiInsights && !loading && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-12 flex flex-col items-center justify-center">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 mb-4">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Ready for AI Analysis</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-sm">
                Click "Generate AI Insights" to get intelligent payment analytics, risk assessment, and actionable recommendations powered by Gemini AI.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentAnalytics
