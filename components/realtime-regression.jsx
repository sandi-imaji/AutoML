import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Pause, Play, RefreshCw, WifiOff, TrendingUp, TrendingDown, Minus, Zap, BarChart3, Activity, Settings2, RotateCcw } from 'lucide-react'

import { WS_BASE_URL } from '@/lib/api'


const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const MODEL_COLORS = {
  actual: '#10b981',
  gbr: '#f59e0b',
  catboost: '#ef4444',
  lightgbm: '#06b6d4',
  xgboost: '#8b5cf6',
  'random forest': '#f97316',
  svr: '#ec4899',
}

const MODEL_GRADIENTS = {
  actual: ['#10b981', '#059669'],
  gbr: ['#f59e0b', '#d97706'],
  catboost: ['#ef4444', '#dc2626'],
  lightgbm: ['#06b6d4', '#0891b2'],
  xgboost: ['#8b5cf6', '#7c3aed'],
  'random forest': ['#f97316', '#ea580c'],
  svr: ['#ec4899', '#db2777'],
}

const FALLBACK_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#c084fc', '#34d399', '#fbbf24']

const formatTime = (dtString) => {
  const d = new Date(dtString)
  if (isNaN(d.getTime())) return new Date().toLocaleTimeString('en-US', { hour12: false })
  // Format UTC time directly without converting to local timezone
  const hours = d.getUTCHours().toString().padStart(2, '0')
  const minutes = d.getUTCMinutes().toString().padStart(2, '0')
  const seconds = d.getUTCSeconds().toString().padStart(2, '0')
  const ms = Math.floor(d.getUTCMilliseconds() / 100)
  return `${hours}:${minutes}:${seconds}.${ms}`
}

const calculateMAE = (actuals, predictions) => {
  if (!actuals.length || !predictions.length) return 0
  const n = Math.min(actuals.length, predictions.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += Math.abs(actuals[i] - predictions[i])
  }
  return sum / n
}

const calculateRMSE = (actuals, predictions) => {
  if (!actuals.length || !predictions.length) return 0
  const n = Math.min(actuals.length, predictions.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += Math.pow(actuals[i] - predictions[i], 2)
  }
  return Math.sqrt(sum / n)
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

export default function RealtimeRegressionChart({ dataset_name }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [chartKey, setChartKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [connected, setConnected] = useState(false)
  const [seriesData, setSeriesData] = useState({})
  const [modelNames, setModelNames] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [dataRate, setDataRate] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [showAxisSettings, setShowAxisSettings] = useState(false)
  const [autoScaleLeft, setAutoScaleLeft] = useState(true)
  const [autoScaleRight, setAutoScaleRight] = useState(true)
  const [manualYMinLeft, setManualYMinLeft] = useState('')
  const [manualYMaxLeft, setManualYMaxLeft] = useState('')
  const [manualYMinRight, setManualYMinRight] = useState('')
  const [manualYMaxRight, setManualYMaxRight] = useState('')
  const wsRef = useRef(null)
  const dataRateRef = useRef({ count: 0, lastCheck: Date.now() })

  useEffect(() => setMounted(true), [])

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

  // Update ApexCharts theme saat tema berubah
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

  // WebSocket
  useEffect(() => {
    if (!mounted) return

    let ws = null
    let reconnectTimeout = null

    const connect = () => {
      if (isPaused) return

      const url = `${WS_BASE_URL}/stream/realtime/regression?dataset_name=${encodeURIComponent(dataset_name)}`
      ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setSeriesData({})
        setModelNames([])
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Skip invalid data
          if (data.is_valid === false) return
          
          const dtString = data.timestamp || new Date().toISOString()
          const timeStr = formatTime(dtString)
          const actual = data.actual
          if (actual == null) return

          dataRateRef.current.count++
          setTotalPoints(prev => prev + 1)

          setSeriesData(prev => {
            const updated = { ...prev }
            if (!updated.actual) updated.actual = []
            updated.actual.push({ t: timeStr, v: Number(actual.toFixed(6)) })
            if (updated.actual.length > 200) updated.actual.shift()

            // Get predictions from nested object
            const predictions = data.predictions || {}
            Object.keys(predictions).forEach(key => {
              if (typeof predictions[key] === 'number') {
                if (!updated[key]) updated[key] = []
                updated[key].push({ t: timeStr, v: Number(predictions[key].toFixed(6)) })
                if (updated[key].length > 200) updated[key].shift()
              }
            })
            
            // Store features data
            if (data.features) {
              if (!updated.features) updated.features = []
              updated.features.push({ t: timeStr, data: data.features })
              if (updated.features.length > 200) updated.features.shift()
            }
            
            return updated
          })

          setModelNames(prev => {
            const predictions = data.predictions || {}
            const incoming = Object.keys(predictions).filter(k => typeof predictions[k] === 'number')
            return [...new Set([...prev, ...incoming])].sort()
          })

          setLastUpdate(new Date())
        } catch (e) {
          console.error(e)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        // Auto reconnect after 3 seconds if not paused
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
        ws.onclose = null // Prevent reconnection on cleanup
        ws.close()
      }
    }
  }, [mounted, isPaused, dataset_name])

  const handlePauseToggle = () => setIsPaused(p => !p)
  const handleRefresh = () => {
    setSeriesData({})
    setModelNames([])
    setIsPaused(false)
    setDataRate(0)
    setTotalPoints(0)
    dataRateRef.current = { count: 0, lastCheck: Date.now() }
  }

  const timestamps = seriesData.actual?.map(d => d.t) || []
  const actualValues = seriesData.actual?.map(d => d.v) || []

  const modelMetrics = useMemo(() => {
    if (!actualValues.length || !modelNames.length) return {}
    const metrics = {}
    modelNames.forEach(model => {
      const predValues = seriesData[model]?.map(d => d.v) || []
      metrics[model] = {
        mae: calculateMAE(actualValues, predValues),
        rmse: calculateRMSE(actualValues, predValues),
        trend: calculateTrend(predValues),
      }
    })
    return metrics
  }, [actualValues, modelNames, seriesData])

  const rankedModels = useMemo(() => {
    if (!Object.keys(modelMetrics).length) return []
    return [...modelNames].sort((a, b) => {
      const maeA = modelMetrics[a]?.mae || Infinity
      const maeB = modelMetrics[b]?.mae || Infinity
      return maeA - maeB
    })
  }, [modelMetrics, modelNames])

  const allPredValues = modelNames.flatMap(m => seriesData[m]?.map(d => d.v) || [])
  const latestActual = seriesData.actual?.slice(-1)[0]?.v || 0
  let yMinRight = latestActual - 1
  let yMaxRight = latestActual + 1

  if (allPredValues.length > 0) {
    const minP = Math.min(...allPredValues)
    const maxP = Math.max(...allPredValues)
    const rangeP = maxP - minP || 0.0001
    const minRange = Math.max(0.05, Math.abs(latestActual) * 0.02)
    const desiredRange = Math.max(rangeP * 4, minRange)
    const center = (minP + maxP) / 2
    yMinRight = center - desiredRange / 2
    yMaxRight = center + desiredRange / 2
  }

  const yMinLeftFinal = autoScaleLeft ? undefined : (manualYMinLeft !== '' ? parseFloat(manualYMinLeft) : undefined)
  const yMaxLeftFinal = autoScaleLeft ? undefined : (manualYMaxLeft !== '' ? parseFloat(manualYMaxLeft) : undefined)
  const yMinRightFinal = autoScaleRight ? yMinRight : (manualYMinRight !== '' ? parseFloat(manualYMinRight) : yMinRight)
  const yMaxRightFinal = autoScaleRight ? yMaxRight : (manualYMaxRight !== '' ? parseFloat(manualYMaxRight) : yMaxRight)

  const chartSeries = [
    {
      name: 'Actual',
      type: 'area',
      data: timestamps.map(t => seriesData.actual?.find(d => d.t === t)?.v ?? null),
    },
    ...modelNames.map(model => ({
      name: model.toUpperCase(),
      type: 'line',
      data: timestamps.map(t => seriesData[model]?.find(d => d.t === t)?.v ?? null),
      yAxisIndex: 1,
    }))
  ]

  const options = {
    chart: {
      type: 'line',
      height: 520,
      animations: { enabled: true, easing: 'easeinout', speed: 300, dynamicAnimation: { speed: 300 } },
      toolbar: {
        show: true,
        tools: { zoom: true, zoomin: true, zoomout: true, pan: true, reset: true },
      },
      background: 'transparent',
      zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
    },
    stroke: {
      curve: 'smooth',
      width: [3, ...modelNames.map(() => 2.5)],
      dashArray: [0, ...modelNames.map(() => 0)],
    },
    fill: {
      type: ['gradient', ...modelNames.map(() => 'solid')],
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
      size: [0, ...modelNames.map(() => 0)],
      strokeWidth: [0, ...modelNames.map(() => 0)],
      hover: { size: [6, ...modelNames.map(() => 4)] }
    },
    colors: [
      MODEL_COLORS.actual,
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
    yaxis: [
      {
        title: { text: 'Actual Value', style: { fontWeight: 600 } },
        decimalsInFloat: 4,
        labels: { style: { fontSize: '11px' } },
        crosshairs: { show: true, position: 'back', stroke: { color: '#10b981' } },
        ...(yMinLeftFinal !== undefined && { min: yMinLeftFinal }),
        ...(yMaxLeftFinal !== undefined && { max: yMaxLeftFinal }),
        tickAmount: 8,
        forceNiceScale: true,
      },
      {
        opposite: true,
        title: { text: 'Model Predictions', style: { color: '#818cf8', fontWeight: 600 } },
        min: yMinRightFinal,
        max: yMaxRightFinal,
        decimalsInFloat: 6,
        labels: { formatter: v => v.toFixed(6), style: { fontSize: '11px' } },
        crosshairs: { show: true, position: 'back', stroke: { color: '#818cf8' } },
        tickAmount: 8,
        forceNiceScale: true,
      }
    ],
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      floating: false,
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
      x: { show: true, format: 'HH:mm:ss' },
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
      text: `Real-time Regression – ${dataset_name}`,
      align: 'center',
      style: { fontSize: '16px', fontWeight: 700 },
    },
    dataLabels: { enabled: false },
    forecastDataPoints: { count: 0 },
  }

  const latestValues = {
    actual: seriesData.actual?.slice(-1)[0]?.v ?? null,
    ...Object.fromEntries(modelNames.map(m => [m, seriesData[m]?.slice(-1)[0]?.v ?? null]))
  }

  const actualTrend = calculateTrend(actualValues)

  const getConnectionQuality = () => {
    if (!connected) return { color: 'bg-red-500', label: 'Disconnected' }
    if (dataRate >= 10) return { color: 'bg-emerald-500', label: 'Excellent' }
    if (dataRate >= 5) return { color: 'bg-amber-500', label: 'Good' }
    return { color: 'bg-yellow-500', label: 'Slow' }
  }

  const connQuality = getConnectionQuality()

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
                  <Activity className="h-6 w-6 text-indigo-500" />
                  Realtime Regression
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
                  {modelNames.length ? modelNames.map(m => m.toUpperCase()).join(', ') : '–'}
                  {lastUpdate && <span className="opacity-60">• Last: {lastUpdate.toLocaleTimeString()}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 dark:bg-black/20 border border-white/10">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{dataRate} pts/s</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${connQuality.color} text-white`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  {connQuality.label}
                </div>
                <Button variant="outline" size="icon" onClick={handlePauseToggle} title={isPaused ? 'Play' : 'Pause'}>
                  {isPaused ? <Play className="h-4 w-4 text-emerald-500" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
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
                      setAutoScaleLeft(true)
                      setAutoScaleRight(true)
                      setManualYMinLeft('')
                      setManualYMaxLeft('')
                      setManualYMinRight('')
                      setManualYMaxRight('')
                    }}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-emerald-500">Left Axis (Actual)</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={autoScaleLeft}
                          onCheckedChange={setAutoScaleLeft}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <span className="text-xs text-muted-foreground">Auto</span>
                      </div>
                    </div>
                    {!autoScaleLeft && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Min</Label>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Auto"
                            value={manualYMinLeft}
                            onChange={(e) => setManualYMinLeft(e.target.value)}
                            className="h-8 text-xs bg-white/5"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Max</Label>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Auto"
                            value={manualYMaxLeft}
                            onChange={(e) => setManualYMaxLeft(e.target.value)}
                            className="h-8 text-xs bg-white/5"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-indigo-500">Right Axis (Predictions)</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={autoScaleRight}
                          onCheckedChange={setAutoScaleRight}
                          className="data-[state=checked]:bg-indigo-500"
                        />
                        <span className="text-xs text-muted-foreground">Auto</span>
                      </div>
                    </div>
                    {!autoScaleRight && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Min</Label>
                          <Input
                            type="number"
                            step="any"
                            placeholder={yMinRight.toFixed(4)}
                            value={manualYMinRight}
                            onChange={(e) => setManualYMinRight(e.target.value)}
                            className="h-8 text-xs bg-white/5"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Max</Label>
                          <Input
                            type="number"
                            step="any"
                            placeholder={yMaxRight.toFixed(4)}
                            value={manualYMaxRight}
                            onChange={(e) => setManualYMaxRight(e.target.value)}
                            className="h-8 text-xs bg-white/5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-6">
            {timestamps.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
                {connected ? (
                  <>
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                      <Activity className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" />
                    </div>
                    <p className="mt-4 text-lg font-medium">waiting for streaming data</p>
                    <p className="text-sm opacity-60">Dataset: {dataset_name}</p>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-16 w-16 text-red-400/60 mb-4" />
                    <p className="text-lg font-medium text-red-400">Connecting to server...</p>
                    <p className="text-sm opacity-60">Attempting automatic reconnection</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between px-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4" />
                      {totalPoints.toLocaleString()} total points
                    </span>
                    <span className="flex items-center gap-1.5">
                      {actualTrend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                      {actualTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                      {actualTrend === 'neutral' && <Minus className="h-4 w-4 text-gray-400" />}
                      Trend: {actualTrend}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground opacity-60">
                    Drag untuk zoom • Scroll untuk pan
                  </div>
                </div>
                <Chart key={chartKey} options={options} series={chartSeries} type="line" height={520} />
              </>
            )}

            {latestValues.actual !== null && (
              <div className="mt-8 space-y-6">
                {/* Features Panel */}
                {seriesData.features?.length > 0 && (
                  <div className="rounded-2xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      Input Features
                    </h3>
                    <div className="flex justify-center flex-wrap gap-3">
                      {(() => {
                        const latestFeature = seriesData.features[seriesData.features.length - 1]
                        const features = latestFeature?.data || {}
                        return Object.entries(features).map(([key, value], i) => {
                          const featureColors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899']
                          const color = featureColors[i % featureColors.length]
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
                                <p className="text-lg font-bold text-foreground tabular-nums">{typeof value === 'number' ? value.toFixed(4) : value}</p>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Predictions */}
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Latest Values</h3>
                <div className="flex justify-center flex-wrap gap-4">
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-30 group-hover:opacity-50 blur transition duration-300" />
                    <div className="relative bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl px-6 py-4 shadow-lg hover:scale-105 transition-all">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Actual</span>
                        {actualTrend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                        {actualTrend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                      </div>
                      <p className="text-2xl font-extrabold text-foreground tabular-nums">{latestValues.actual.toFixed(6)}</p>
                    </div>
                  </div>

                  {modelNames.map((model, i) => {
                    const val = latestValues[model]
                    const color = MODEL_COLORS[model.toLowerCase()] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
                    const metrics = modelMetrics[model]
                    const rank = rankedModels.indexOf(model) + 1
                    const trend = metrics?.trend || 'neutral'
                    return (
                      <div key={model} className="group relative">
                        <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-30 blur transition duration-300" style={{ background: `linear-gradient(135deg, ${color}, ${MODEL_GRADIENTS[model.toLowerCase()]?.[1] || color})` }} />
                        <div className="relative bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl px-6 py-4 shadow-lg hover:scale-105 transition-all min-w-[140px]">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{model}</span>
                            {rank === 1 && <Badge className="h-4 px-1.5 text-[10px] bg-amber-500/80">#{rank}</Badge>}
                            {trend === 'up' && <TrendingUp className="h-3 w-3" style={{ color }} />}
                            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                          </div>
                          <p className="text-2xl font-extrabold text-foreground tabular-nums">{val?.toFixed(6) ?? '–'}</p>
                          {metrics && (
                            <div className="mt-2 pt-2 border-t border-white/10 flex gap-3 text-[10px] text-muted-foreground">
                              <span>MAE: {metrics.mae.toFixed(6)}</span>
                              <span>RMSE: {metrics.rmse.toFixed(6)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
