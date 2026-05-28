'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pause, Play, RefreshCw, WifiOff, Activity, Maximize2, Settings2, RotateCcw, Table2, ChevronDown, ChevronUp } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { WS_BASE_URL } from '@/lib/api'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const CLUSTER_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#06b6d4', '#a78bfa', '#f87171', '#34d399'
]

const FEATURE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899']

const formatTime = (dtString) => {
  if (!dtString) return '--:--:--'

  // Parse ISO string: "2026-04-10T22:55:29.800345Z"
  // Extract time part directly as UTC (no timezone conversion)
  const timeMatch = dtString.match(/T(\d{2}):(\d{2}):(\d{2})/)
  if (!timeMatch) return '--:--:--'

  // Return time as-is from the UTC timestamp
  return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`
}

export default function RealtimeClustering({ datasetName }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const chartRef = useRef(null)
  const [chartKey, setChartKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [connected, setConnected] = useState(false)
  const [points, setPoints] = useState([])
  const [clustersByModel, setClustersByModel] = useState({})
  const [selectedModel, setSelectedModel] = useState('')
  const [modelNames, setModelNames] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [dataRate, setDataRate] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [latestFeatures, setLatestFeatures] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showFeatures, setShowFeatures] = useState(true)
  const [showTable, setShowTable] = useState(true)
  const [tableExpanded, setTableExpanded] = useState(false)
  const wsRef = useRef(null)
  const dataRateRef = useRef({ count: 0, lastCheck: Date.now() })
  const MAX_TABLE_ROWS = 300

  useEffect(() => setMounted(true), [])

  // Data rate calculator
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - dataRateRef.current.lastCheck) / 1000
      if (elapsed >= 1) {
        setDataRate(Math.round(dataRateRef.current.count / elapsed))
        dataRateRef.current.count = 0
        dataRateRef.current.lastCheck = now
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Update ApexCharts theme
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    window.Apex = {
      chart: { foreColor: isDark ? '#e2e8f0' : '#1e293b', background: 'transparent' },
      theme: { mode: isDark ? 'dark' : 'light' },
      grid: { borderColor: isDark ? '#334155' : '#e2e8f0' },
      tooltip: { theme: isDark ? 'dark' : 'light' },
    }
    setChartKey(p => p + 1)
  }, [isDark, mounted])

  // WebSocket connection
  useEffect(() => {
    if (!mounted || !datasetName) return

    let ws = null
    let reconnectTimeout = null

    const connect = () => {
      if (isPaused) return

      const url = `${WS_BASE_URL}/stream/realtime/clustering?dataset_name=${encodeURIComponent(datasetName)}`
      ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Skip invalid data
          if (data.is_valid === false) return
          
          const dtString = data.timestamp || new Date().toISOString()
          const timeStr = formatTime(dtString)
          const featuresReduce = data.features_reduce
          
          if (!featuresReduce || featuresReduce.X1 == null || featuresReduce.X2 == null) return

          dataRateRef.current.count++
          setTotalPoints(prev => prev + 1)
          setLastUpdate(new Date())

          // Extract cluster data
          const clusters = data.clusters || {}
          const x = parseFloat(featuresReduce.X1)
          const y = parseFloat(featuresReduce.X2)

          setPoints(prev => {
            const newPoint = {
              x,
              y,
              t: timeStr,
              clusters,
              features: data.features
            }
            const updated = [...prev, newPoint]
            // Keep only last 300 points
            return updated.length > 300 ? updated.slice(-300) : updated
          })

          setClustersByModel(prev => {
            const updated = { ...prev }
            Object.keys(clusters).forEach(model => {
              if (!updated[model]) updated[model] = []
              updated[model].push(String(clusters[model]))
              if (updated[model].length > 300) updated[model].shift()
            })
            return updated
          })

          // Update model names
          const incomingModels = Object.keys(clusters)
          setModelNames(prev => {
            const newModels = incomingModels.filter(m => !prev.includes(m))
            return newModels.length > 0 ? [...prev, ...newModels].sort() : prev
          })

          // Set default selected model
          if (!selectedModel && incomingModels.length > 0) {
            setSelectedModel(incomingModels[0])
          }

          // Update latest features
          if (data.features) {
            setLatestFeatures(data.features)
          }
        } catch (e) {
          console.error('WebSocket message error:', e)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!isPaused) {
          reconnectTimeout = setTimeout(connect, 3000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimeout)
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
  }, [mounted, datasetName, isPaused, selectedModel])

  const handlePauseToggle = () => setIsPaused(p => !p)
  
  const handleRefresh = () => {
    setPoints([])
    setClustersByModel({})
    setModelNames([])
    setSelectedModel('')
    setTotalPoints(0)
    setDataRate(0)
    setLatestFeatures(null)
    setShowTable(true)
    setTableExpanded(false)
    dataRateRef.current = { count: 0, lastCheck: Date.now() }
    setIsPaused(false)
  }

  // Get cluster labels for selected model
  const currentLabels = useMemo(() => {
    return selectedModel ? clustersByModel[selectedModel] || [] : []
  }, [selectedModel, clustersByModel])

  // Calculate unique clusters for selected model
  const uniqueClusters = useMemo(() => {
    return [...new Set(currentLabels)]
  }, [currentLabels])

  // Table data - last MAX_TABLE_ROWS points with cluster info
  const tableData = useMemo(() => {
    if (!points.length) return []
    const data = points.map((point, index) => ({
      index: index + 1,
      timestamp: point.t,
      x1: point.x,
      x2: point.y,
      clusters: point.clusters || {},
      features: point.features || {}
    }))
    return data.slice(-MAX_TABLE_ROWS)
  }, [points])

  // Get feature keys for table columns
  const featureKeys = useMemo(() => {
    if (!tableData.length || !tableData[0].features) return []
    return Object.keys(tableData[0].features)
  }, [tableData])

  // Build series data for chart
  const series = useMemo(() => {
    if (!currentLabels.length || !points.length) return []

    return uniqueClusters.map((label, idx) => {
      const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length]
      
      // Get points for this cluster with jitter
      const clusterPoints = points
        .map((p, i) => currentLabels[i] === label ? [p.x, p.y] : null)
        .filter(Boolean)
        .map(([x, y]) => [
          x + (Math.random() - 0.5) * 0.02,
          y + (Math.random() - 0.5) * 0.02
        ])

      const name = label === '-1' || label.toLowerCase() === 'noise'
        ? 'Noise / Outlier'
        : `Cluster ${label}`

      return {
        name,
        data: clusterPoints,
        marker: {
          size: 10,
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWidth: 2.5,
          shadow: {
            enabled: true,
            color: '#000',
            top: 2,
            left: 2,
            blur: 6,
            opacity: 0.2
          }
        }
      }
    })
  }, [points, currentLabels, uniqueClusters])

  // Calculate axis ranges
  const axisRanges = useMemo(() => {
    if (points.length === 0) {
      return { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } }
    }
    
    const xValues = points.map(p => p.x)
    const yValues = points.map(p => p.y)
    
    const xMin = Math.min(...xValues)
    const xMax = Math.max(...xValues)
    const yMin = Math.min(...yValues)
    const yMax = Math.max(...yValues)
    
    const xPadding = (xMax - xMin) * 0.1 || 0.1
    const yPadding = (yMax - yMin) * 0.1 || 0.1
    
    return {
      x: { min: xMin - xPadding, max: xMax + xPadding },
      y: { min: yMin - yPadding, max: yMax + yPadding }
    }
  }, [points])

  const getConnectionQuality = () => {
    if (!connected) return { color: 'bg-red-500', label: 'Disconnected' }
    if (dataRate >= 5) return { color: 'bg-emerald-500', label: 'Excellent' }
    if (dataRate >= 2) return { color: 'bg-amber-500', label: 'Good' }
    return { color: 'bg-yellow-500', label: 'Slow' }
  }

  const connQuality = getConnectionQuality()

  const options = {
    chart: {
      type: 'scatter',
      height: 520,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: {
        enabled: true,
        type: 'xy',
        autoScaleYaxis: true
      },
      animations: { enabled: true, easing: 'easeinout', speed: 300 },
      background: 'transparent',
    },
    colors: CLUSTER_COLORS,
    xaxis: {
      title: { text: 'Reduced Feature 1 (X1)', style: { fontWeight: 600 } },
      min: axisRanges.x.min,
      max: axisRanges.x.max,
      labels: { formatter: v => Number(v.toFixed(4)) },
      tickAmount: 8,
    },
    yaxis: {
      title: { text: 'Reduced Feature 2 (X2)', style: { fontWeight: 600 } },
      min: axisRanges.y.min,
      max: axisRanges.y.max,
      labels: { formatter: v => Number(v.toFixed(4)) },
      tickAmount: 8,
    },
    grid: {
      borderColor: isDark ? '#334155' : '#e2e8f0',
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '14px',
      fontWeight: 600,
      markers: { width: 12, height: 12, radius: 6 },
      itemMargin: { horizontal: 15, vertical: 5 }
    },
    tooltip: {
      shared: false,
      intersect: true,
      theme: isDark ? 'dark' : 'light',
      style: { fontSize: '13px' },
      custom: function({ seriesIndex, dataPointIndex, w }) {
        const point = w.config.series[seriesIndex]?.data[dataPointIndex]
        if (!point) return '<div></div>'

        const seriesName = w.config.series[seriesIndex].name
        return `
          <div class="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 text-sm">
            <div class="font-bold text-lg mb-2" style="color: ${w.config.colors[seriesIndex % w.config.colors.length]}">${seriesName}</div>
            <div class="space-y-1">
              <div>X1: <strong class="tabular-nums">${point[0].toFixed(6)}</strong></div>
              <div>X2: <strong class="tabular-nums">${point[1].toFixed(6)}</strong></div>
            </div>
          </div>
        `
      }
    },
    title: {
      text: selectedModel ? `${selectedModel.toUpperCase()} Clustering` : 'Clustering Visualization',
      align: 'center',
      margin: 20,
      style: { fontSize: '18px', fontWeight: 'bold', color: isDark ? '#e2e8f0' : '#1e293b' }
    }
  }

  if (!mounted) return null

  return (
    <div className="relative p-6 rounded-3xl">
      <div className="absolute inset-0 rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent dark:from-black/20 dark:via-black/10 dark:to-transparent backdrop-blur-xl shadow-2xl pointer-events-none" />

      <div className="relative">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="border-b border-white/10 dark:border-white/5 pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Activity className="h-6 w-6 text-purple-500" />
                  Real-time Clustering
                  {connected && !isPaused && (
                    <Badge className="bg-emerald-500/90 text-white border border-emerald-400/50 animate-pulse">
                      <span className="relative flex h-2 w-2 mr-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      LIVE
                    </Badge>
                  )}
                  {!connected && <Badge variant="destructive" className="gap-1.5"><WifiOff className="h-3 w-3" /> Disconnected</Badge>}
                  {isPaused && connected && <Badge variant="secondary">Paused</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  {modelNames.length ? modelNames.map(m => m.toUpperCase()).join(', ') : 'Waiting for data...'}
                  {lastUpdate && <span className="opacity-60">• Last: {lastUpdate.toLocaleTimeString()}</span>}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 dark:bg-black/20 border border-white/10">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">{dataRate} pts/s</span>
                </div>
                
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${connQuality.color} text-white`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  {connQuality.label}
                </div>

                <Select 
                  value={selectedModel} 
                  onValueChange={setSelectedModel} 
                  disabled={modelNames.length === 0}
                >
                  <SelectTrigger className="w-48 font-medium">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelNames.map(m => (
                      <SelectItem key={m} value={m}>
                        {m.toUpperCase()} ({[...new Set(clustersByModel[m] || [])].length} clusters)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon" onClick={handlePauseToggle} title={isPaused ? 'Play' : 'Pause'}>
                  {isPaused ? <Play className="h-4 w-4 text-emerald-500" /> : <Pause className="h-4 w-4" />}
                </Button>
                
                <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={showSettings ? "default" : "outline"}
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mt-4 p-4 rounded-xl bg-white/5 dark:bg-black/20 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Display Settings
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowFeatures(true)
                    }}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showFeatures}
                      onCheckedChange={setShowFeatures}
                      className="data-[state=checked]:bg-purple-500"
                    />
                    <Label className="text-sm">Show Input Features Panel</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showTable}
                      onCheckedChange={setShowTable}
                      className="data-[state=checked]:bg-blue-500"
                    />
                    <Label className="text-sm">Show Data Table</Label>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Input Features Panel */}
            {showFeatures && latestFeatures && (
              <div className="rounded-2xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 p-5">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Input Features
                </h3>
                <div className="flex justify-center flex-wrap gap-3">
                  {Object.entries(latestFeatures).map(([key, value], i) => {
                    const color = FEATURE_COLORS[i % FEATURE_COLORS.length]
                    return (
                      <div key={key} className="group relative">
                        <div className="absolute -inset-0.5 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-300" style={{ backgroundColor: color }} />
                        <div className="relative bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 shadow-md hover:scale-105 transition-all min-w-[140px]">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]" title={key}>
                              {key}
                            </span>
                          </div>
                          <p className="text-lg font-bold text-foreground tabular-nums">
                            {typeof value === 'number' ? value.toFixed(4) : value}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            {points.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                  Points: {totalPoints.toLocaleString()}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
                  Displayed: {points.length}
                </Badge>
                {uniqueClusters.length > 0 && (
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950">
                    Clusters: {uniqueClusters.length}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900">
                  X1: [{axisRanges.x.min.toFixed(3)}, {axisRanges.x.max.toFixed(3)}]
                </Badge>
                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900">
                  X2: [{axisRanges.y.min.toFixed(3)}, {axisRanges.y.max.toFixed(3)}]
                </Badge>
              </div>
            )}

            {/* Chart */}
            {points.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
                {connected ? (
                  <>
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                      <Activity className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-500" />
                    </div>
                    <p className="mt-4 text-lg font-medium">Waiting for streaming data...</p>
                    <p className="text-sm opacity-60">Dataset: {datasetName}</p>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-16 w-16 text-red-400/60 mb-4" />
                    <p className="text-lg font-medium text-red-400">Connecting to server...</p>
                    <p className="text-sm opacity-60">Auto-reconnecting</p>
                  </>
                )}
              </div>
            ) : !selectedModel ? (
              <div className="h-96 flex items-center justify-center text-xl text-muted-foreground">
                Please select a model above
              </div>
            ) : series.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-xl text-muted-foreground">
                No cluster data available
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-black/30 backdrop-blur-sm shadow-inner">
                <Chart
                  ref={chartRef}
                  key={chartKey}
                  options={options}
                  series={series}
                  type="scatter"
                  height={520}
                />
              </div>
            )}

            {/* Data Table */}
            {tableData.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-purple-500" />
                    Data Points History
                    <Badge variant="outline" className="text-xs">
                      Last {tableData.length} points
                    </Badge>
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTableExpanded(!tableExpanded)}
                      className="h-8 text-xs"
                    >
                      {tableExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5 mr-1" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5 mr-1" />
                          Expand
                        </>
                      )}
                    </Button>
                    <Button
                      variant={showTable ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowTable(!showTable)}
                      className="h-8 text-xs"
                    >
                      {showTable ? 'Hide Table' : 'Show Table'}
                    </Button>
                  </div>
                </div>

                {showTable && (
                  <div className={`rounded-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden transition-all duration-300 ${tableExpanded ? '' : 'max-h-[400px]'}`}>
                    <ScrollArea className={tableExpanded ? 'h-[600px]' : 'h-[400px]'}>
                      <Table>
                        <TableHeader className="sticky top-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm z-10">
                          <TableRow className="border-gray-200/50 dark:border-gray-800/50 hover:bg-transparent">
                            <TableHead className="w-[60px] font-semibold text-xs">#</TableHead>
                            <TableHead className="font-semibold text-xs">Time</TableHead>
                            <TableHead className="font-semibold text-xs text-right">X1</TableHead>
                            <TableHead className="font-semibold text-xs text-right">X2</TableHead>
                            {modelNames.map(model => (
                              <TableHead key={model} className="font-semibold text-xs text-center">
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {model}
                                </Badge>
                              </TableHead>
                            ))}
                            {featureKeys.slice(0, 3).map(key => (
                              <TableHead key={key} className="font-semibold text-xs text-right hidden lg:table-cell">
                                <span className="text-[10px] text-muted-foreground truncate max-w-[80px] block" title={key}>
                                  {key}
                                </span>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...tableData].reverse().map((row, idx) => (
                            <TableRow 
                              key={row.index} 
                              className="border-gray-200/50 dark:border-gray-800/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors"
                            >
                              <TableCell className="text-xs font-medium text-muted-foreground">
                                {tableData.length - idx}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {row.timestamp}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {row.x1.toFixed(6)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono tabular-nums">
                                {row.x2.toFixed(6)}
                              </TableCell>
                              {modelNames.map(model => {
                                const clusterId = row.clusters[model]
                                const clusterIndex = uniqueClusters.indexOf(String(clusterId))
                                const clusterColor = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length]
                                return (
                                  <TableCell key={model} className="text-center">
                                    <Badge 
                                      className="text-[10px] px-1.5 py-0 h-5 min-w-[24px]"
                                      style={{ 
                                        backgroundColor: clusterColor + '20',
                                        color: clusterColor,
                                        borderColor: clusterColor + '40'
                                      }}
                                      variant="outline"
                                    >
                                      {clusterId !== undefined ? clusterId : '-'}
                                    </Badge>
                                  </TableCell>
                                )
                              })}
                              {featureKeys.slice(0, 3).map(key => (
                                <TableCell key={key} className="text-xs text-right font-mono tabular-nums hidden lg:table-cell text-muted-foreground">
                                  {row.features[key] !== undefined ? Number(row.features[key]).toFixed(4) : '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
