'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPredictionsHistory } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, Activity, Table2, ChevronDown, ChevronUp, Database } from 'lucide-react'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const CLUSTER_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#06b6d4', '#a78bfa', '#f87171', '#34d399'
]

const FEATURE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899']

const formatTime = (dtString) => {
  if (!dtString) return '--/--/---- --:--:--'

  // Parse datetime string: "2026-04-11 00:06:18.315408+00:00"
  const dateMatch = dtString.match(/(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})/)
  if (!dateMatch) return '--/--/---- --:--:--'

  const year = dateMatch[1]
  const month = parseInt(dateMatch[2], 10)
  const day = dateMatch[3]
  const hours = dateMatch[4]
  const minutes = dateMatch[5]
  const seconds = dateMatch[6]

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[month - 1]

  return `${day} ${monthName} ${year}, ${hours}:${minutes}:${seconds}`
}

export default function HistoryClustering({ datasetName }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const chartRef = useRef(null)
  const [chartKey, setChartKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [points, setPoints] = useState([])
  const [clustersByModel, setClustersByModel] = useState({})
  const [selectedModel, setSelectedModel] = useState('')
  const [modelNames, setModelNames] = useState([])
  const [featureNames, setFeatureNames] = useState([])
  const [showTable, setShowTable] = useState(true)
  const [tableExpanded, setTableExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => setMounted(true), [])

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

  const fetchHistoryData = async () => {
    if (!datasetName) return

    setLoading(true)
    setError(null)

    try {
      const data = await getPredictionsHistory(datasetName)

      // Transform array-based response to array of objects
      const dataLength = data?.dt?.length || 0
      const transformedPoints = []
      const clustersByAlgo = {}

      for (let i = 0; i < dataLength; i++) {
        const point = {
          timestamp: formatTime(data.dt[i]),
          x: data.X1[i],
          y: data.X2[i],
          features: {},
          clusters: {}
        }

        // Extract features
        data.feature_names?.forEach(featureName => {
          point.features[featureName] = data[featureName]?.[i]
        })

        // Extract cluster labels for each algorithm
        data.algorithms?.forEach(algo => {
          const clusterLabel = data[algo]?.[i]
          point.clusters[algo] = clusterLabel

          if (!clustersByAlgo[algo]) {
            clustersByAlgo[algo] = []
          }
          clustersByAlgo[algo].push(String(clusterLabel))
        })

        transformedPoints.push(point)
      }

      setPoints(transformedPoints)
      setClustersByModel(clustersByAlgo)
      setModelNames(data.algorithms?.sort() || [])
      setFeatureNames(data.feature_names || [])
      setLastUpdate(new Date())

      // Set default selected model
      if (data.algorithms?.length > 0 && !selectedModel) {
        setSelectedModel(data.algorithms[0])
      }
    } catch (err) {
      console.error('Error fetching history data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (mounted && datasetName) {
      fetchHistoryData()
    }
  }, [mounted, datasetName])

  const handleRefresh = () => {
    fetchHistoryData()
  }

  // Get cluster labels for selected model
  const currentLabels = useMemo(() => {
    return selectedModel ? clustersByModel[selectedModel] || [] : []
  }, [selectedModel, clustersByModel])

  // Calculate unique clusters for selected model
  const uniqueClusters = useMemo(() => {
    return [...new Set(currentLabels)]
  }, [currentLabels])

  // Table data - all points with cluster info
  const tableData = useMemo(() => {
    if (!points.length) return []
    const data = points.map((point, index) => ({
      index: index + 1,
      timestamp: point.timestamp,
      features: point.features,
      clusters: point.clusters
    }))
    return data
  }, [points])

  // Build series data for chart
  const series = useMemo(() => {
    if (!currentLabels.length || !points.length) return []

    return uniqueClusters.map((label, idx) => {
      const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length]

      // Get points for this cluster
      const clusterPoints = points
        .map((p, i) => currentLabels[i] === label ? [p.x, p.y] : null)
        .filter(Boolean)

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
      text: selectedModel ? `${selectedModel.toUpperCase()} Clustering History` : 'Clustering History',
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
                  <Database className="h-6 w-6 text-blue-500" />
                  History Clustering
                  {loading && (
                    <Badge className="bg-blue-500/90 text-white border border-blue-400/50">
                      <span className="relative flex h-2 w-2 mr-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      Loading
                    </Badge>
                  )}
                  {error && <Badge variant="destructive" className="gap-1.5">Error</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  {modelNames.length ? modelNames.map(m => m.toUpperCase()).join(', ') : 'No data loaded'}
                  {lastUpdate && <span className="opacity-60">• Last: {lastUpdate.toLocaleTimeString()}</span>}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 dark:bg-black/20 border border-white/10">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{points.length} pts</span>
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

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  title="Refresh"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Stats */}
            {points.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                  Points: {points.length.toLocaleString()}
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

            {/* Error Message */}
            {error && (
              <div className="h-48 flex flex-col items-center justify-center text-red-400 bg-red-50/10 dark:bg-red-950/20 rounded-2xl border border-red-200/20">
                <p className="text-lg font-medium">Error loading data</p>
                <p className="text-sm opacity-60">{error}</p>
              </div>
            )}

            {/* Chart */}
            {!error && points.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
                  <Database className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                </div>
                <p className="mt-4 text-lg font-medium">Loading history data...</p>
                <p className="text-sm opacity-60">Dataset: {datasetName}</p>
              </div>
            ) : !error && !selectedModel ? (
              <div className="h-96 flex items-center justify-center text-xl text-muted-foreground">
                Please select a model above
              </div>
            ) : !error && series.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-xl text-muted-foreground">
                No cluster data available
              </div>
            ) : !error && (
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
            {tableData.length > 0 && !error && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-blue-500" />
                    Data History
                    <Badge variant="outline" className="text-xs">
                      {tableData.length} points
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
                            {featureNames.map(featureName => (
                              <TableHead key={featureName} className="font-semibold text-xs text-right">
                                <span className="text-[10px] text-muted-foreground truncate max-w-[100px] block" title={featureName}>
                                  {featureName}
                                </span>
                              </TableHead>
                            ))}
                            {modelNames.map(model => (
                              <TableHead key={model} className="font-semibold text-xs text-center">
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {model}
                                </Badge>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...tableData].reverse().map((row, idx) => (
                            <TableRow
                              key={row.index}
                              className="border-gray-200/50 dark:border-gray-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors"
                            >
                              <TableCell className="text-xs font-medium text-muted-foreground">
                                {tableData.length - idx}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {row.timestamp}
                              </TableCell>
                              {featureNames.map(featureName => (
                                <TableCell key={featureName} className="text-xs text-right font-mono tabular-nums">
                                  {row.features[featureName] !== undefined ? Number(row.features[featureName]).toFixed(4) : '-'}
                                </TableCell>
                              ))}
                              {modelNames.map(model => {
                                const clusterId = row.clusters[model]
                                const uniqueClustersForModel = [...new Set(clustersByModel[model] || [])]
                                const clusterIndex = uniqueClustersForModel.indexOf(String(clusterId))
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
