'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  History, 
  Database,
  Activity,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
  PieChart as PieChartIcon
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Cell,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Legend,
  ComposedChart,
  Scatter
} from 'recharts'
import { API_BASE_URL } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        <p className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
            <span className="font-semibold" style={{ color: entry.color }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Mini Sparkline Component
function Sparkline({ data, width = 100, height = 30, color = '#3b82f6', isAnomaly = false }) {
  if (!data || data.length < 2) return <div className="w-[100px] h-[30px] bg-slate-100 dark:bg-slate-800 rounded" />

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-gradient-${isAnomaly}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isAnomaly ? '#ef4444' : color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isAnomaly ? '#ef4444' : color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#spark-gradient-${isAnomaly})`}
        className="transition-all duration-300"
      />
      <polyline
        points={points}
        fill="none"
        stroke={isAnomaly ? '#ef4444' : color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />
      {/* Current value dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((values[values.length - 1] - min) / range) * height}
          r="3"
          fill={isAnomaly ? '#ef4444' : color}
        />
      )}
    </svg>
  )
}

// Format feature name
const formatFeatureName = (name) => {
  return name
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .substring(0, 25)
}

// Get feature icon based on name
const getFeatureIcon = (name) => {
  const lower = name.toLowerCase()
  if (lower.includes('temp')) return <Activity className="h-4 w-4" />
  if (lower.includes('air') || lower.includes('flow')) return <Activity className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

export default function HistoryAnomaly({ dataset_name }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [historyData, setHistoryData] = useState([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch history data
  const fetchHistoryData = async () => {
    if (!dataset_name) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/models/${dataset_name}/history/anomaly`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        // Check if the error is because the anomaly model is not found
        if (response.status === 404) {
          toast.error('Anomaly Model is not found! Redirecting to setup page...')
          router.push('/anomaly')
          return
        }
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log(data)
      
      // Transform data from API format to internal format
      const transformedData = (data || []).map((item, idx) => ({
        id: `record-${idx}`,
        timestamp: item.timestamp,
        dataset_name: item.dataset_name,
        task_type: item.task_type,
        score: item.results?.anomaly_score || 0,
        is_anomaly: item.results?.is_anomaly === 1 || item.results?.is_anomaly === true,
        features: item.features || {},
      }))
      
      setHistoryData(transformedData)
      setCurrentPage(1)
      
      toast.success(`Loaded ${transformedData.length} historical records`)
    } catch (error) {
      console.error('Error fetching history:', error)
      // Check if error message indicates model not found
      if (error.message && error.message.includes('Anomaly Model is not found')) {
        toast.error('Anomaly Model is not found! Redirecting to setup page...')
        router.push('/anomaly')
        return
      }
      toast.error('Failed to fetch history data')
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount and when dataset_name changes
  useEffect(() => {
    if (mounted && dataset_name) {
      fetchHistoryData()
    }
  }, [mounted, dataset_name])

  // Pagination
  const totalPages = Math.ceil(historyData.length / itemsPerPage)
  const paginatedData = historyData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Stats
  const stats = useMemo(() => {
    const total = historyData.length
    const anomalies = historyData.filter(d => d.is_anomaly).length
    const normalCount = total - anomalies
    const avgScore = total > 0 
      ? historyData.reduce((sum, d) => sum + d.score, 0) / total 
      : 0
    
    return { total, anomalies, normalCount, avgScore }
  }, [historyData])

  // Format timestamp to HH:MM:SS format (extract directly from ISO string without timezone conversion)
  const formatTimeOnly = (timestamp) => {
    // Extract time from ISO format: 2026-05-26T01:25:27.236124+00:00 -> 01:25:27
    const match = timestamp.match(/T(\d{2}):(\d{2}):(\d{2})/)
    if (match) {
      return `${match[1]}:${match[2]}:${match[3]}`
    }
    return timestamp
  }

  // Format timestamp to full datetime (extract directly from ISO string without timezone conversion)
  const formatDateTime = (timestamp) => {
    // Extract date and time from ISO format: 2026-05-26T01:25:27.236124+00:00 -> 26/05/2026 01:25:27
    const match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}:${match[6]}`
    }
    return timestamp
  }

  // Chart data preparation with rolling average (6 data points = 30 min window)
  const timeSeriesData = useMemo(() => {
    const data = historyData.map((h, idx) => ({
      time: formatTimeOnly(h.timestamp),
      fullTime: formatDateTime(h.timestamp),
      score: h.score,
      isAnomaly: h.is_anomaly,
      index: idx,
    })).reverse()
    
    // Calculate rolling average (6 points = 30 min)
    const windowSize = 6
    return data.map((item, idx) => {
      const start = Math.max(0, idx - windowSize + 1)
      const window = data.slice(start, idx + 1)
      const avg = window.reduce((sum, d) => sum + d.score, 0) / window.length
      return {
        ...item,
        rollingAvg: avg,
        // Color intensity based on score magnitude
        intensity: Math.abs(item.score),
      }
    })
  }, [historyData])

  // Anomaly frequency by hour (00-23)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i.toString().padStart(2, '0') + ':00',
      count: 0,
      total: 0,
      rate: 0,
    }))
    
    historyData.forEach(h => {
      const hour = new Date(h.timestamp).getUTCHours()
      hours[hour].total++
      if (h.is_anomaly) {
        hours[hour].count++
      }
    })
    
    return hours.map(h => ({
      ...h,
      rate: h.total > 0 ? (h.count / h.total) * 100 : 0,
    }))
  }, [historyData])

  // Distribution data for pie chart
  const distributionData = useMemo(() => [
    { name: 'Normal', value: stats.normalCount, color: '#10b981' },
    { name: 'Anomaly', value: stats.anomalies, color: '#ef4444' },
  ], [stats])

  // Feature names extraction
  const featureNames = useMemo(() => {
    if (historyData.length === 0) return []
    return Object.keys(historyData[0]?.features || {})
  }, [historyData])

  // Feature sparkline data
  const featureSparklines = useMemo(() => {
    const sparkData = {}
    featureNames.forEach(name => {
      sparkData[name] = historyData.slice(-50).map(h => ({
        value: h.features?.[name] ?? 0,
        isAnomaly: h.is_anomaly
      }))
    })
    return sparkData
  }, [historyData, featureNames])

  // Feature stats
  const featureStats = useMemo(() => {
    return featureNames.map(name => {
      const values = historyData.map(h => h.features?.[name]).filter(v => v != null)
      if (values.length === 0) return { name, current: 0, min: 0, max: 0, avg: 0, change: 0 }
      
      const current = values[values.length - 1]
      const min = Math.min(...values)
      const max = Math.max(...values)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const prev = values.length > 1 ? values[values.length - 2] : current
      const change = ((current - prev) / (prev || 1)) * 100
      
      return { name, current, min, max, avg, change, values }
    })
  }, [historyData, featureNames])

  // Cumulative anomaly data
  const cumulativeData = useMemo(() => {
    let cumulativeAnomalies = 0
    return historyData.map((h, idx) => {
      if (h.is_anomaly) cumulativeAnomalies++
      return {
        time: formatTimeOnly(h.timestamp),
        fullTime: formatDateTime(h.timestamp),
        cumulative: cumulativeAnomalies,
        isAnomaly: h.is_anomaly,
        index: idx,
      }
    }).reverse()
  }, [historyData])

  // Feature contribution analysis data
  const featureContributionData = useMemo(() => {
    if (featureNames.length === 0 || historyData.length === 0) return []
    
    // Separate normal and anomaly records
    const normalRecords = historyData.filter(h => !h.is_anomaly)
    const anomalyRecords = historyData.filter(h => h.is_anomaly)
    
    return featureNames.map(name => {
      // Calculate average for normal records
      const normalValues = normalRecords.map(h => h.features?.[name]).filter(v => v != null && typeof v === 'number')
      const normalAvg = normalValues.length > 0 
        ? normalValues.reduce((a, b) => a + b, 0) / normalValues.length 
        : 0
      
      // Calculate average for anomaly records
      const anomalyValues = anomalyRecords.map(h => h.features?.[name]).filter(v => v != null && typeof v === 'number')
      const anomalyAvg = anomalyValues.length > 0 
        ? anomalyValues.reduce((a, b) => a + b, 0) / anomalyValues.length 
        : 0
      
      // Calculate difference and contribution percentage
      const difference = anomalyAvg - normalAvg
      const contribution = normalAvg !== 0 
        ? Math.abs((difference / normalAvg) * 100) 
        : 0
      
      return {
        feature: formatFeatureName(name),
        fullFeature: name,
        normalAvg,
        anomalyAvg,
        difference,
        contribution,
      }
    }).sort((a, b) => b.contribution - a.contribution) // Sort by contribution
  }, [historyData, featureNames])

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Dataset', 'Score', 'Is Anomaly', 'Features'].join(','),
      ...historyData.map(d => [
        d.timestamp,
        d.dataset_name,
        d.score.toFixed(6),
        d.is_anomaly ? 'Yes' : 'No',
        JSON.stringify(d.features || {}),
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `anomaly-history-${dataset_name}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('History data exported successfully')
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent">
                Anomaly History
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {dataset_name}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <History className="w-3 h-3 mr-1" />
                  {stats.total} records
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchHistoryData}
              disabled={loading}
              className="gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={historyData.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Records</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                    {stats.total}
                  </p>
                </div>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200/50 dark:border-red-800/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Anomalies</p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">
                    {stats.anomalies}
                  </p>
                </div>
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Anomaly Rate</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-2">
                    {stats.total > 0 ? ((stats.anomalies / stats.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Avg Score</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">
                    {stats.avgScore.toFixed(4)}
                  </p>
                </div>
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Anomaly Timeline with Heat Intensity */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-indigo-500" />
                Anomaly Timeline with Heat Intensity
              </CardTitle>
              <CardDescription>Anomaly scores with heat intensity bars and rolling average</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    label={{ value: 'Anomaly Score', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
                            <p className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">{data?.fullTime || label}</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-slate-600 dark:text-slate-400">Score:</span>
                                <span className="font-semibold text-indigo-600">
                                  {typeof data?.score === 'number' ? data.score.toFixed(6) : data?.score}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-slate-600 dark:text-slate-400">Rolling Avg:</span>
                                <span className="font-semibold text-amber-600">
                                  {typeof data?.rollingAvg === 'number' ? data.rollingAvg.toFixed(4) : data?.rollingAvg}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className={`w-2 h-2 rounded-full ${data?.isAnomaly ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                <span className="text-slate-600 dark:text-slate-400">Status:</span>
                                <Badge 
                                  variant={data?.isAnomaly ? "destructive" : "default"}
                                  className={!data?.isAnomaly ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : ""}
                                >
                                  {data?.isAnomaly ? 'Anomaly' : 'Normal'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar 
                    dataKey="intensity" 
                    yAxisId="left"
                    fill="url(#intensityGradient)"
                    name="Heat Intensity"
                    isAnimationActive={false}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="rollingAvg" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={false}
                    name="Rolling Average"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Anomaly Frequency by Hour */}
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                Anomaly Frequency by Hour
              </CardTitle>
              <CardDescription>Anomaly count distribution across 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={2}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    label={{ value: 'Anomaly Count', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                    allowDecimals={false}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    label={{ value: 'Rate (%)', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 11 } }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
                            <p className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Hour: {label}</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-slate-600 dark:text-slate-400">Anomaly Count:</span>
                                <span className="font-semibold text-red-600">{data?.count}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-slate-600 dark:text-slate-400">Total Records:</span>
                                <span className="font-semibold text-blue-600">{data?.total}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-slate-600 dark:text-slate-400">Anomaly Rate:</span>
                                <span className="font-semibold text-amber-600">{data?.rate?.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="count" 
                    fill="#ef4444"
                    name="Anomaly Count"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    name="Anomaly Rate (%)"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Chart 3: Feature Contribution Analysis */}
        {featureNames.length > 0 && (
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChartIcon className="h-5 w-5 text-indigo-500" />
                    Feature Contribution Analysis
                  </CardTitle>
                  <CardDescription>Feature values comparison between normal and anomaly records</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {featureNames.length} features
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={featureContributionData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    label={{ value: 'Average Value', position: 'insideBottom', offset: -10, style: { fill: '#64748b', fontSize: 11 } }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="feature"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    width={90}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-sm min-w-[280px]">
                            <p className="font-semibold text-sm mb-3 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">{label}</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-slate-600 dark:text-slate-400">Normal Avg:</span>
                                </div>
                                <span className="font-semibold text-emerald-600">{data?.normalAvg?.toFixed(4)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-slate-600 dark:text-slate-400">Anomaly Avg:</span>
                                </div>
                                <span className="font-semibold text-red-600">{data?.anomalyAvg?.toFixed(4)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Difference:</span>
                                <span className={`font-semibold ${data?.difference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {data?.difference > 0 ? '+' : ''}{data?.difference?.toFixed(4)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Contribution:</span>
                                <span className="font-semibold text-indigo-600">{data?.contribution?.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="normalAvg" 
                    name="Normal Records" 
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                  <Bar 
                    dataKey="anomalyAvg" 
                    name="Anomaly Records" 
                    fill="#ef4444"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Feature Activity Heatmap */}
        {featureNames.length > 0 && (
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-indigo-500" />
                    Feature Activity Heatmap
                  </CardTitle>
                  <CardDescription>Feature values visualization (last 50 records)</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {featureNames.length} features
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Time axis labels */}
                  <div className="flex items-center mb-2">
                    <div className="w-32 flex-shrink-0" />
                    <div className="flex-1 flex justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                      {historyData.length > 0 && (
                        <>
                          <span>{timeSeriesData[timeSeriesData.length - 1]?.fullTime || '--'}</span>
                          <span>{timeSeriesData[Math.floor(timeSeriesData.length / 2)]?.fullTime || '--'}</span>
                          <span>{timeSeriesData[0]?.fullTime || '--'}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Heatmap rows */}
                  <div className="space-y-1">
                    {featureNames.slice(0, 15).map((featureName, featureIdx) => {
                      const recentHistory = historyData.slice(-50)
                      
                      const values = recentHistory.map(h => h.features?.[featureName]).filter(v => v != null && typeof v === 'number')
                      const min = values.length > 0 ? Math.min(...values) : 0
                      const max = values.length > 0 ? Math.max(...values) : 1
                      const range = max - min || 1
                      
                      return (
                        <div key={featureName} className="flex items-center gap-2">
                          <div className="w-32 flex-shrink-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={featureName}>
                              {formatFeatureName(featureName)}
                            </p>
                          </div>
                          
                          <div className="flex-1 flex gap-0.5">
                            {recentHistory.map((record, timeIdx) => {
                              const value = record.features?.[featureName]
                              const isNumeric = typeof value === 'number'
                              const isAnomaly = record.is_anomaly
                              
                              const normalized = isNumeric ? (value - min) / range : 0
                              
                              const getCellColor = () => {
                                if (isAnomaly) {
                                  const intensity = Math.min(Math.max(normalized, 0.3), 1)
                                  return `rgba(239, 68, 68, ${intensity * 0.8 + 0.2})`
                                }
                                
                                if (!isNumeric) return 'rgba(148, 163, 184, 0.2)'
                                
                                if (normalized < 0.33) {
                                  return `rgba(59, 130, 246, ${0.3 + normalized * 0.5})`
                                } else if (normalized < 0.66) {
                                  return `rgba(99, 102, 241, ${0.3 + normalized * 0.5})`
                                } else {
                                  return `rgba(139, 92, 246, ${0.3 + normalized * 0.5})`
                                }
                              }
                              
                              return (
                                <div
                                  key={timeIdx}
                                  className="flex-1 h-8 rounded-sm transition-all duration-300 hover:scale-110 hover:z-10 relative group cursor-pointer"
                                  style={{ backgroundColor: getCellColor() }}
                                  title={`${featureName}: ${isNumeric ? value.toFixed(2) : value}`}
                                >
                                  <div className={cn(
                                    "absolute left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none min-w-[180px]",
                                    featureIdx < 3 ? "top-full mt-2" : "bottom-full mb-2"
                                  )}>
                                    <p className="font-semibold border-b border-slate-600 pb-1 mb-1">
                                      {formatDateTime(record.timestamp)}
                                    </p>
                                    <p className="break-all leading-relaxed">{featureName}: <span className="font-bold">{isNumeric ? value.toFixed(2) : value}</span></p>
                                    {isAnomaly && <p className="text-red-300 font-bold mt-1">⚠ Anomaly</p>}
                                  </div>
                                  
                                  {isAnomaly && (
                                    <div className="absolute inset-0 border-2 border-red-500 rounded-sm" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    
                    {featureNames.length > 15 && (
                      <div className="text-center py-2 text-xs text-slate-500">
                        +{featureNames.length - 15} more features
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Low</span>
                      <div className="flex gap-0.5">
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((val, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-sm"
                            style={{
                              backgroundColor: val < 0.33 
                                ? `rgba(59, 130, 246, ${0.3 + val * 0.5})`
                                : val < 0.66 
                                  ? `rgba(99, 102, 241, ${0.3 + val * 0.5})`
                                  : `rgba(139, 92, 246, ${0.3 + val * 0.5})`
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">High</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-sm bg-red-500/50 border-2 border-red-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Anomaly</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Monitor Grid with Sparklines */}
        {featureStats.length > 0 && (
          <Card className="border-slate-200/60 dark:border-slate-700/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    Feature Monitor
                  </CardTitle>
                  <CardDescription>Feature statistics with trend sparklines</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {featureNames.length} features
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {featureStats.map((feature) => (
                  <div 
                    key={feature.name}
                    className="p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                          {getFeatureIcon(feature.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={feature.name}>
                            {formatFeatureName(feature.name)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Avg: {feature.avg.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {feature.current.toFixed(1)}
                        </p>
                        <p className={cn(
                          "text-xs font-medium",
                          feature.change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {feature.change > 0 ? '+' : ''}{feature.change.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Sparkline 
                        data={featureSparklines[feature.name] || []}
                        color="#6366f1"
                      />
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Min: {feature.min.toFixed(1)}</span>
                        <span className="text-slate-300">|</span>
                        <span>Max: {feature.max.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cumulative Anomaly Count */}
        <Card className="border-slate-200/60 dark:border-slate-700/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Cumulative Anomaly Count
            </CardTitle>
            <CardDescription>Total accumulated anomalies over time (step progression)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={cumulativeData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  label={{ value: 'Cumulative Count', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
                          <p className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">{data.fullTime || label}</p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                              <span className="text-slate-600 dark:text-slate-400">Cumulative Anomalies:</span>
                              <span className="font-semibold text-indigo-600">{data.cumulative}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${data.isAnomaly ? 'bg-red-500' : 'bg-emerald-500'}`} />
                              <span className="text-slate-600 dark:text-slate-400">Status:</span>
                              <Badge 
                                variant={data.isAnomaly ? "destructive" : "default"}
                                className={!data.isAnomaly ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : ""}
                              >
                                {data.isAnomaly ? 'Anomaly' : 'Normal'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="cumulative" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (payload.isAnomaly) {
                      return (
                        <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                      )
                    }
                    return <circle cx={cx} cy={cy} r={2} fill="#6366f1" />
                  }}
                  name="Cumulative Anomalies"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Historical Records
              <Badge variant="secondary">{historyData.length} records</Badge>
            </CardTitle>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {historyData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium text-gray-600">No data available</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Waiting for data to load...
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b-2 bg-muted sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
                      <th className="text-right py-3 px-4 font-semibold">Score</th>
                      <th className="text-center py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Features</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((record, idx) => (
                      <tr 
                        key={record.id || idx} 
                        className={`border-b hover:bg-muted/50 transition-colors ${
                          record.is_anomaly ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                          {formatDateTime(record.timestamp)}
                        </td>
                        <td className="text-right py-3 px-4 whitespace-nowrap font-mono">
                          <span className={record.is_anomaly ? 'text-red-600 font-semibold' : ''}>
                            {record.score.toFixed(4)}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 whitespace-nowrap">
                          {record.is_anomaly ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Anomaly
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Normal
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {record.features && Object.entries(record.features).slice(0, 3).map(([key, value]) => (
                              <span key={key} className="text-xs bg-muted px-2 py-1 rounded">
                                {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                              </span>
                            ))}
                            {record.features && Object.keys(record.features).length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{Object.keys(record.features).length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
