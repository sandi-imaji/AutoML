'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getPredictionsHistory,getActualForecast } from '@/lib/api'
import { RefreshCw, TrendingUp, TrendingDown, Minus, BarChart3, Activity, Settings2, RotateCcw, Database, Table2, ChevronDown, ChevronUp, Download } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const MODEL_COLORS = {
  actual: '#10b981',
  gbr: '#f59e0b',
  gbr_cds_dt: '#f59e0b',
  catboost: '#ef4444',
  catboost_cds_dt: '#ef4444',
  lightgbm: '#06b6d4',
  lightgbm_cds_dt: '#06b6d4',
  xgboost: '#8b5cf6',
  xgboost_cds_dt: '#8b5cf6',
  'random forest': '#f97316',
  svr: '#ec4899',
}

const FALLBACK_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#c084fc', '#34d399', '#fbbf24']

const formatTime = (dtString) => {
  if (!dtString) return '--/--/---- --:--:--'

  // Parse ISO string: "2026-04-13T12:30:01.001000+00:00"
  const dateMatch = dtString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
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

const calculateMAE = (actuals, predictions) => {
  if (!actuals.length || !predictions.length) return 0
  const n = Math.min(actuals.length, predictions.length)
  let sum = 0
  let count = 0
  for (let i = 0; i < n; i++) {
    if (actuals[i] !== undefined && actuals[i] !== null) {
      sum += Math.abs(actuals[i] - predictions[i])
      count++
    }
  }
  return count > 0 ? sum / count : 0
}

const calculateRMSE = (actuals, predictions) => {
  if (!actuals.length || !predictions.length) return 0
  const n = Math.min(actuals.length, predictions.length)
  let sum = 0
  let count = 0
  for (let i = 0; i < n; i++) {
    if (actuals[i] !== undefined && actuals[i] !== null) {
      sum += Math.pow(actuals[i] - predictions[i], 2)
      count++
    }
  }
  return count > 0 ? Math.sqrt(sum / count) : 0
}

const calculateTrend = (values) => {
  if (!values || values.length < 5) return 'neutral'
  const recent = values.slice(-5)
  const first = recent[0]
  const last = recent[recent.length - 1]
  const diff = last - first
  const threshold = Math.abs(first) * 0.001 || 0.0001
  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'neutral'
}

export default function HistoryForecast({ datasetName }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [chartKey, setChartKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState([])
  const [modelNames, setModelNames] = useState([])
  const [hasActual, setHasActual] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [showAxisSettings, setShowAxisSettings] = useState(false)
  const [autoScale, setAutoScale] = useState(true)
  const [manualYMin, setManualYMin] = useState('')
  const [manualYMax, setManualYMax] = useState('')
  const [showTable, setShowTable] = useState(true)
  const [tableExpanded, setTableExpanded] = useState(false)

  useEffect(() => setMounted(true), [])

  // Update ApexCharts theme
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    window.Apex = {
      chart: { foreColor: isDark ? '#e2e8f0' : '#1e293b', background: 'transparent' },
      theme: { mode: isDark ? 'dark' : 'light' },
      grid: { borderColor: isDark ? '#334155' : '#e2e8f0' },
      tooltip: { theme: isDark ? 'dark' : 'light' },
      legend: { labels: { colors: isDark ? '#e2e8f0' : '#1e293b' } },
    }
    setChartKey(prev => prev + 1)
  }, [isDark, mounted])

  const fetchHistoryData = async () => {
    if (!datasetName) return

    setLoading(true)
    setError(null)

    try {
      // const jsonData = await response.json()
      const jsonData = await getPredictionsHistory(datasetName)

      // Transform data - API returns array of objects
      setData(jsonData || [])

      // Check if any data has actual value
      const hasAnyActual = jsonData.some(item => item.actual !== undefined && item.actual !== null)
      setHasActual(hasAnyActual)

      // Extract model names from first data item
      if (jsonData.length > 0) {
        const firstItem = jsonData[0]
        const models = Object.keys(firstItem.results || {})
        setModelNames(models.sort())
      }

      setLastUpdate(new Date())
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

  const handleGetActual = async () => {
    if (!datasetName) return

    setLoading(true)
    setError(null)

    try {
      const jsonData = await getActualForecast(datasetName)

      // Show success message from API response
      console.log('Get Actual Response:', jsonData)

      // Optionally refresh the history data after getting actual
      await fetchHistoryData()
    } catch (err) {
      console.error('Error getting actual data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Prepare chart data - reverse so latest is on the right
  // Filter out entries with invalid/missing timestamps first
  const validData = useMemo(() => {
    return data.filter(d => d.timestamp && d.results)
  }, [data])

  const timestamps = useMemo(() => {
    return [...validData].reverse().map(d => formatTime(d.timestamp))
  }, [validData])

  const actualValues = useMemo(() => {
    return validData.map(d => d.actual).filter(v => v !== undefined && v !== null)
  }, [validData])

  const modelMetrics = useMemo(() => {
    if (!hasActual || !actualValues.length || !modelNames.length) return {}
    const metrics = {}
    modelNames.forEach(model => {
      const predValues = [...validData].reverse().map(d => d.results?.[model]).filter(v => v !== undefined && v !== null)
      const actuals = [...validData].reverse().map(d => d.actual).filter(v => v !== undefined && v !== null)
      metrics[model] = {
        mae: calculateMAE(actuals, predValues),
        rmse: calculateRMSE(actuals, predValues),
        trend: calculateTrend(predValues),
      }
    })
    return metrics
  }, [actualValues, modelNames, validData, hasActual])

  // Calculate axis ranges
  const allValues = useMemo(() => {
    const values = []
    if (hasActual) {
      values.push(...actualValues)
    }
    modelNames.forEach(model => {
      values.push(...validData.map(d => d.results?.[model]).filter(v => v !== undefined && v !== null))
    })
    return values
  }, [actualValues, modelNames, validData, hasActual])

  let yMin = 0
  let yMax = 100

  if (allValues.length > 0) {
    const minV = Math.min(...allValues)
    const maxV = Math.max(...allValues)
    const rangeV = maxV - minV || 0.0001
    const padding = rangeV * 0.1
    yMin = minV - padding
    yMax = maxV + padding
  }

  const yMinFinal = autoScale ? undefined : (manualYMin !== '' ? parseFloat(manualYMin) : undefined)
  const yMaxFinal = autoScale ? undefined : (manualYMax !== '' ? parseFloat(manualYMax) : undefined)

  const chartSeries = useMemo(() => {
    const series = []

    // Add actual series if exists
    if (hasActual) {
      series.push({
        name: 'Actual',
        type: 'area',
        data: [...validData].reverse().map(d => d.actual ?? null),
      })
    }

    // Add prediction series for each model
    modelNames.forEach(model => {
      series.push({
        name: model.toUpperCase(),
        type: 'line',
        data: [...validData].reverse().map(d => {
          const val = d.results?.[model]
          return val !== undefined && val !== null ? val : null
        }),
      })
    })

    return series
  }, [validData, hasActual, modelNames])

  const options = {
    chart: {
      type: 'line',
      height: 520,
      animations: { enabled: true, easing: 'easeinout', speed: 300 },
      toolbar: {
        show: true,
        tools: { zoom: true, zoomin: true, zoomout: true, pan: true, reset: true },
      },
      background: 'transparent',
      zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
    },
    stroke: {
      curve: 'smooth',
      width: hasActual ? [3, ...modelNames.map(() => 2.5)] : modelNames.map(() => 2.5),
      dashArray: hasActual ? [0, ...modelNames.map(() => 0)] : modelNames.map(() => 0),
    },
    fill: {
      type: hasActual ? ['gradient', ...modelNames.map(() => 'solid')] : modelNames.map(() => 'solid'),
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.3,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 100],
      }
    },
    markers: {
      size: hasActual ? [0, ...modelNames.map(() => 0)] : modelNames.map(() => 0),
      strokeWidth: hasActual ? [0, ...modelNames.map(() => 0)] : modelNames.map(() => 0),
      hover: { size: hasActual ? [6, ...modelNames.map(() => 4)] : modelNames.map(() => 4) }
    },
    colors: [
      ...(hasActual ? [MODEL_COLORS.actual] : []),
      ...modelNames.map(m => MODEL_COLORS[m.toLowerCase()] || FALLBACK_COLORS[modelNames.indexOf(m) % FALLBACK_COLORS.length])
    ],
    xaxis: {
      categories: timestamps,
      labels: {
        rotate: -45,
        rotateAlways: false,
        style: { fontSize: '10px', fontWeight: 500 },
        trim: true,
      },
      tickAmount: 10,
      axisBorder: { show: true, color: isDark ? '#334155' : '#e2e8f0' },
      axisTicks: { show: true, color: isDark ? '#334155' : '#e2e8f0' },
      crosshairs: {
        show: true,
        width: 1,
        position: 'back',
        opacity: 0.9,
        stroke: { color: isDark ? '#6366f1' : '#4f46e5', width: 1, dashArray: 3 },
        fill: { type: 'solid', color: isDark ? '#1e1b4b' : '#eef2ff', gradient: {} },
        dropShadow: { enabled: false }
      },
    },
    yaxis: {
      title: { text: 'Value', style: { fontWeight: 600 } },
      decimalsInFloat: 4,
      labels: { style: { fontSize: '11px' } },
      ...(yMinFinal !== undefined && { min: yMinFinal }),
      ...(yMaxFinal !== undefined && { max: yMaxFinal }),
      tickAmount: 8,
      forceNiceScale: true,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      floating: false,
      fontSize: '12px',
      fontSize: '12px',
      fontWeight: 600,
      markers: { width: 12, height: 12, radius: 3 },
      itemMargin: { horizontal: 10, vertical: 5 },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: isDark ? 'dark' : 'light',
      style: { fontSize: '12px' },
      x: { show: true },
      y: { formatter: (val) => val?.toFixed(6) || '-' },
      marker: { show: true },
    },
    grid: {
      borderColor: isDark ? '#1e293b' : '#f1f5f9',
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { left: 10, right: 10 },
    },
    title: {
      text: ``,
      align: 'center',
      style: { fontSize: '16px', fontWeight: 700 },
    },
    dataLabels: { enabled: false },
  }

  // Get latest prediction values for trend calculation
  const latestPredValues = useMemo(() => {
    if (!modelNames.length || !validData.length) return {}
    const latestData = validData[0] // First item is latest (API returns newest first)
    const values = {}
    modelNames.forEach(model => {
      values[model] = latestData.results?.[model]
    })
    return values
  }, [validData, modelNames])

  const predTrends = useMemo(() => {
    const trends = {}
    modelNames.forEach(model => {
      const predValues = validData.map(d => d.results?.[model]).filter(v => v !== undefined && v !== null)
      trends[model] = calculateTrend(predValues)
    })
    return trends
  }, [validData, modelNames])

  if (!mounted) return null

  return (
    <div className="relative p-6 rounded-3xl">
      <div className="absolute inset-0 rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent dark:from-black/20 dark:via-black/10 dark:to-transparent backdrop-blur-xl shadow-2xl pointer-events-none" />

      <div className="relative">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="border-b border-white/10 dark:border-white/5 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Database className="h-6 w-6 text-purple-500" />
                  History Forecasting
                  {loading && (
                    <Badge className="bg-purple-500/90 text-white border border-purple-400/50">
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
                  {hasActual && <Badge variant="outline" className="text-xs">With Actual</Badge>}
                  {lastUpdate && <span className="opacity-60">• Last: {lastUpdate.toLocaleTimeString()}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 dark:bg-black/20 border border-white/10">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{data.length} pts</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  title="Refresh"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetActual}
                  title="Get Actual"
                  disabled={loading}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Get Actual
                </Button> */}
                <Button
                  variant={showAxisSettings ? "default" : "outline"}
                  size="icon"
                  onClick={() => setShowAxisSettings(!showAxisSettings)}
                  title="Axis Settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showAxisSettings && (
              <div className="mt-4 p-4 rounded-xl bg-white/5 dark:bg-black/20 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Axis Scaling Configuration
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAutoScale(true)
                      setManualYMin('')
                      setManualYMax('')
                    }}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-purple-500">Y-Axis Range</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={autoScale}
                        onCheckedChange={setAutoScale}
                        className="data-[state=checked]:bg-purple-500"
                      />
                      <span className="text-xs text-muted-foreground">Auto</span>
                    </div>
                  </div>
                  {!autoScale && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Min</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder={yMin.toFixed(4)}
                          value={manualYMin}
                          onChange={(e) => setManualYMin(e.target.value)}
                          className="h-8 text-xs bg-white/5"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Max</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder={yMax.toFixed(4)}
                          value={manualYMax}
                          onChange={(e) => setManualYMax(e.target.value)}
                          className="h-8 text-xs bg-white/5"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-6">
            {/* Error Message */}
            {error && (
              <div className="h-48 flex flex-col items-center justify-center text-red-400 bg-red-50/10 dark:bg-red-950/20 rounded-2xl border border-red-200/20 mb-6">
                <p className="text-lg font-medium">Error loading data</p>
                <p className="text-sm opacity-60">{error}</p>
              </div>
            )}

            {/* Chart */}
            {data.length === 0 && !error ? (
              <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                  <Database className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-500" />
                </div>
                <p className="mt-4 text-lg font-medium">Loading history data...</p>
                <p className="text-sm opacity-60">Dataset: {datasetName}</p>
              </div>
            ) : data.length > 0 && !error ? (
              <>
                <div className="mb-4 flex items-center justify-between px-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4" />
                      {data.length.toLocaleString()} total points
                    </span>
                    {hasActual && (
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        With actual data
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground opacity-60">
                    Drag untuk zoom • Scroll untuk pan
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-black/30 backdrop-blur-sm shadow-inner">
                  <Chart key={chartKey} options={options} series={chartSeries} type="line" height={520} />
                </div>
              </>
            ) : null}

            {/* Data Table */}
            {data.length > 0 && !error && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-purple-500" />
                    Data History
                    <Badge variant="outline" className="text-xs">
                      {data.length} points
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
                            {hasActual && (
                              <TableHead className="font-semibold text-xs text-right">Actual</TableHead>
                            )}
                            {modelNames.map(model => (
                              <TableHead key={model} className="font-semibold text-xs text-right">
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {model}
                                </Badge>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((row, idx) => (
                            <TableRow
                              key={idx}
                              className="border-gray-200/50 dark:border-gray-800/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors"
                            >
                              <TableCell className="text-xs font-medium text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {formatTime(row.timestamp)}
                              </TableCell>
                              {hasActual && (
                                <TableCell className="text-xs text-right font-mono tabular-nums font-semibold text-emerald-600">
                                  {row.actual !== undefined ? row.actual.toFixed(4) : '-'}
                                </TableCell>
                              )}
                              {modelNames.map(model => {
                                const value = row.results?.[model]
                                const color = MODEL_COLORS[model.toLowerCase()] || FALLBACK_COLORS[modelNames.indexOf(model) % FALLBACK_COLORS.length]
                                return (
                                  <TableCell key={model} className="text-xs text-right font-mono tabular-nums">
                                    <span style={{ color }}>
                                      {value !== undefined ? value.toFixed(4) : '-'}
                                    </span>
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
