import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Users, UserCheck, UserX, Clock, TrendingUp, Home, PieChart as PieIcon } from 'lucide-react'

// Colour palettes
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']
const BAR_COLOR = '#6366f1'

// Custom tooltip for bar chart
const HourlyTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
        <p className="text-indigo-600 dark:text-indigo-400">{payload[0].value} visitor{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    )
  }
  return null
}

// Custom label for pie chart
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const VisitorAnalytics = ({ analytics, isLoading, summaryOnly = false, hideSummary = false }) => {
  // Derive a display-friendly slice of hourly data (show active hours + 2hr padding)
  const activeHours = (analytics?.hourlyActivity || []).filter(h => h.count > 0)
  let chartStart = 6, chartEnd = 22 // default 6 AM – 10 PM
  if (activeHours.length > 0) {
    chartStart = Math.max(0, activeHours[0].hour - 1)
    chartEnd = Math.min(23, activeHours[activeHours.length - 1].hour + 2)
  }
  const hourlySlice = (analytics?.hourlyActivity || []).slice(chartStart, chartEnd + 1)

  const statCards = [
    {
      label: 'Total Visitors Today',
      value: analytics?.totalToday ?? 0,
      icon: Users,
      bg: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-400/30',
      textColor: 'text-indigo-50'
    },
    {
      label: 'Currently Inside',
      value: analytics?.currentlyInside ?? 0,
      icon: UserCheck,
      bg: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-400/30',
      textColor: 'text-emerald-50'
    },
    {
      label: 'Checked Out',
      value: analytics?.checkedOut ?? 0,
      icon: UserX,
      bg: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-400/30',
      textColor: 'text-amber-50'
    },
    {
      label: 'Peak Hour',
      value: analytics?.peakHourLabel ?? 'N/A',
      isText: true,
      icon: Clock,
      bg: 'from-rose-500 to-rose-600',
      iconBg: 'bg-rose-400/30',
      textColor: 'text-rose-50'
    }
  ]

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Analytics</h3>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading analytics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Analytics</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Today's activity at a glance</p>
        </div>
      </div>

      {/* ── 4 Summary Cards ── */}
      {!hideSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.bg} p-4 shadow-md`}
              >
                <div className={`absolute top-3 right-3 w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className={`text-xs font-medium uppercase tracking-wide ${card.textColor} opacity-80 mb-1`}>{card.label}</p>
                <p className="text-3xl font-bold text-white leading-none mt-1">
                  {card.isText
                    ? <span className="text-lg font-semibold">{card.value}</span>
                    : card.value
                  }
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Charts Row ── */}
      {!summaryOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Hourly Activity Chart – 3/5 width */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Visitor Activity by Hour</h4>
            </div>
            {hourlySlice.length === 0 || hourlySlice.every(h => h.count === 0) ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-dashed border-gray-200 dark:border-gray-600">
                <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No visitors logged today yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlySlice} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<HourlyTooltip />} cursor={{ fill: '#e0e7ff', radius: 4 }} />
                  <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Visitor Type Pie – 2/5 width */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Visit Type Distribution</h4>
            </div>
            {!analytics?.visitorTypeDistribution?.length ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-dashed border-gray-200 dark:border-gray-600">
                <PieIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.visitorTypeDistribution}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={75}
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {analytics.visitorTypeDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} visitor${value !== 1 ? 's' : ''}`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value) => <span className="capitalize text-xs">{value}</span>}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Most Visited Flats ── */}
      {!summaryOnly && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Most Visited Flats Today</h4>
          </div>
          {!analytics?.mostVisitedFlats?.length ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-dashed border-gray-200 dark:border-gray-600">
              <Home className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No flat data available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.mostVisitedFlats.map((item, index) => {
                const maxCount = analytics.mostVisitedFlats[0]?.count || 1
                const pct = Math.round((item.count / maxCount) * 100)
                const rankColors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500']
                return (
                  <div key={item.flat} className="flex items-center gap-4">
                    {/* Rank badge */}
                    <span className={`w-6 h-6 rounded-full ${rankColors[index] || 'bg-gray-400'} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                      {index + 1}
                    </span>
                    {/* Flat label + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Flat {item.flat}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                          {item.count} visit{item.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${rankColors[index] || 'bg-gray-400'} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VisitorAnalytics
