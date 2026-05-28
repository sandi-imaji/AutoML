import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Pause, 
  Play, 
  Activity, 
  TrendingUp, 
  Database,
  Clock,
  Thermometer,
  Zap,
  AlertCircle,
  CheckCircle2,
  History,
  BarChart3,
  Flame,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceDot
} from 'recharts'
import { WS_BASE_URL } from '@/lib/api'

// Utility functions - display UTC time without converting to local timezone
const formatTime = (timestamp) => {
  // Parse UTC timestamp and display in HH:MM:SS format (UTC)
  const date = new Date(timestamp)
  return date.toISOString().split('T')[1].split('.')[0] // Returns "11:57:58"
}

const formatDateTime = (timestamp) => {
  // Parse UTC timestamp and display in readable UTC format
  const date = new Date(timestamp)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
}

// Simple Anomaly Score Display Component - just the number with clean styling
const AnomalyScoreDisplay = ({ score, isAnomaly }) => {
  return (
    <span className={`text-2xl font-bold ${
      isAnomaly 
        ? 'text-red-600 dark:text-red-400' 
        : 'text-slate-900 dark:text-white'
    }`}>
      {score.toFixed(4)}
    </span>
  )
}

// Feature Card Component
const FeatureCard = ({ name, value, isAnomaly, prevValue }) => {
  const change = prevValue !== undefined ? value - prevValue : 0
  const changePercent = prevValue !== undefined ? (change / prevValue) * 100 : 0
  
  return (
    <div className={`p-3 rounded-lg border transition-all ${
      isAnomaly 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {name}
        </span>
        {isAnomaly && (
          <AlertTriangle className="h-3 w-3 text-red-500" />
        )}
      </div>
      <div className="mt-1">
        <span className="text-lg font-semibold text-slate-900 dark:text-white">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
        {prevValue !== undefined && (
          <div className={`flex items-center text-xs mt-1 ${
            change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {change >= 0 ? (
              <ArrowUp className="h-3 w-3 mr-0.5" />
            ) : (
              <ArrowDown className="h-3 w-3 mr-0.5" />
            )}
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Alert Banner Component
const AnomalyAlert = ({ isActive, timestamp, score, onDismiss }) => {
  if (!isActive) return null
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-red-600 dark:bg-red-700 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-red-400 dark:border-red-500 max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg">Anomaly Detected!</h3>
            <p className="text-red-100 text-sm mt-1">
              Anomaly score: <span className="font-mono font-bold">{score?.toFixed(4)}</span>
            </p>
            <p className="text-red-100 text-xs mt-1">
              {timestamp ? formatDateTime(timestamp) : 'Just now'}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-200 hover:text-white transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RealtimeAnomaly({ dataset_name = "Regression-42c81c4e" }) {
  const [mounted, setMounted] = useState(false)
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [history, setHistory] = useState([])
  const [latestData, setLatestData] = useState(null)
  const [showAnomalyAlert, setShowAnomalyAlert] = useState(false)
  const ws = useRef(null)
  const alertTimeoutRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const isUnmounting = useRef(false)
  const isVisible = useRef(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      isVisible.current = visible
      
      // If becoming visible and not connected, reconnect
      if (visible && !connected && mounted && !paused) {
        // Let the main effect handle reconnection
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connected, mounted, paused])

  useEffect(() => {
    if (!mounted) return

    // Reset unmounting flag when effect runs
    isUnmounting.current = false

    const connect = () => {
      // Don't connect if component is unmounting
      if (isUnmounting.current) return
      
      // Don't connect if tab is hidden
      if (!isVisible.current) return

      const url = `${WS_BASE_URL}/stream/realtime/anomaly?dataset_name=${encodeURIComponent(dataset_name)}`
      
      // Close existing connection if any
      if (ws.current) {
        ws.current.close()
      }

      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        if (!isUnmounting.current) {
          setConnected(true)
        }
      }

      ws.current.onclose = (event) => {
        setConnected(false)
        
        // Don't reconnect if component is unmounting
        if (isUnmounting.current) return
        
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`)
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        
        // Schedule reconnection
        const delay = event.code !== 1000 && event.code !== 1006 ? 3000 : 5000
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmounting.current && isVisible.current) {
            connect()
          }
        }, delay)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (!isUnmounting.current) {
          setConnected(false)
        }
      }

      ws.current.onmessage = (event) => {
        if (paused || isUnmounting.current) return

        try {
          const data = JSON.parse(event.data)
          
          // Only process valid data
          if (!data.is_valid) return

          const processedData = {
            timestamp: data.timestamp,
            features: data.features || {},
            isAnomaly: data.is_anomaly,
            anomalyScore: data.anomaly_score,
            datasetName: data.dataset_name,
            timeLabel: formatTime(data.timestamp)
          }

          setLatestData(processedData)
          
          setHistory(prev => {
            const updated = [...prev, processedData].slice(-100) // Keep last 100 records
            return updated
          })

          // Trigger alert if anomaly detected
          if (data.is_anomaly) {
            setShowAnomalyAlert(true)
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
            alertTimeoutRef.current = setTimeout(() => {
              setShowAnomalyAlert(false)
            }, 5000)
          }

        } catch (err) {
          console.error('Parse error:', err)
        }
      }
    }

    // Initial connection
    connect()

    // Cleanup function
    return () => {
      isUnmounting.current = true
      
      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current)
        alertTimeoutRef.current = null
      }
      
      // Close WebSocket
      if (ws.current) {
        // Remove handlers to prevent callbacks after unmount
        ws.current.onopen = null
        ws.current.onclose = null
        ws.current.onerror = null
        ws.current.onmessage = null
        
        // Close connection
        if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
          ws.current.close()
        }
        ws.current = null
      }
    }
  }, [mounted, dataset_name, paused])

  // Check if currently in anomaly state
  const isCurrentlyAnomaly = latestData?.isAnomaly || false
  const currentScore = latestData?.anomalyScore || 0

  // Get feature names from latest data
  const featureNames = useMemo(() => {
    return latestData ? Object.keys(latestData.features) : []
  }, [latestData])

  // Feature trend data (last 30 records) - using timestamp for continuous time series
  const featureTrendData = useMemo(() => {
    return history.slice(-30).map(h => ({
      timestamp: new Date(h.timestamp).getTime(),
      timeLabel: h.timeLabel,
      ...h.features,
      isAnomaly: h.isAnomaly
    }))
  }, [history])

  // Calculate Y-axis domain for feature trends
  const featureTrendDomain = useMemo(() => {
    if (featureNames.length === 0 || featureTrendData.length === 0) return [0, 100]
    
    const allValues = []
    featureNames.slice(0, 5).forEach(name => {
      featureTrendData.forEach(d => {
        if (d[name] != null) {
          allValues.push(d[name])
        }
      })
    })
    
    if (allValues.length === 0) return [0, 100]
    
    const minVal = Math.min(...allValues)
    const maxVal = Math.max(...allValues)
    const padding = (maxVal - minVal) * 0.1 || 1
    
    return [minVal - padding, maxVal + padding]
  }, [featureNames, featureTrendData])

  // Statistics
  const stats = useMemo(() => {
    const total = history.length
    const anomalies = history.filter(h => h.isAnomaly).length
    const normal = total - anomalies
    const anomalyRate = total > 0 ? (anomalies / total) * 100 : 0
    const avgScore = total > 0 
      ? history.reduce((sum, h) => sum + h.anomalyScore, 0) / total 
      : 0
    const maxScore = total > 0 
      ? Math.max(...history.map(h => h.anomalyScore)) 
      : 0
    const minScore = total > 0 
      ? Math.min(...history.map(h => h.anomalyScore)) 
      : 0
    
    return { total, anomalies, normal, anomalyRate, avgScore, maxScore, minScore }
  }, [history])

  // Recent anomalies
  const recentAnomalies = useMemo(() => {
    return history.filter(h => h.isAnomaly).slice(-10).reverse()
  }, [history])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Get timeLabel from payload if available, otherwise format the timestamp
      const timeLabel = payload[0]?.payload?.timeLabel || formatTime(new Date(label))
      const isAnomalyPoint = payload[0]?.payload?.isAnomaly
      
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            Time: {timeLabel}
            {isAnomalyPoint && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                ANOMALY
              </span>
            )}
          </p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {entry.name}:
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      <AnomalyAlert 
        isActive={showAnomalyAlert}
        timestamp={latestData?.timestamp}
        score={latestData?.anomalyScore}
        onDismiss={() => setShowAnomalyAlert(false)}
      />

      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            connected 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          }`}>
            {connected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Realtime Anomaly Detection
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Dataset: {dataset_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "default" : "destructive"} className="gap-1">
            {connected ? (
              <>
                <Activity className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Disconnected
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused(!paused)}
            className="gap-1"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      {/* Current Status Card */}
      <Card className={isCurrentlyAnomaly ? 'border-red-300 dark:border-red-700' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {isCurrentlyAnomaly ? (
              <>
                <Flame className="h-5 w-5 text-red-500" />
                <span className="text-red-600 dark:text-red-400">ANOMALY DETECTED</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-green-600 dark:text-green-400">Normal</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Timestamp</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {latestData?.timestamp ? formatDateTime(latestData.timestamp) : '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Status</p>
              <div className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg
                transition-all duration-500 ease-in-out transform
                ${isCurrentlyAnomaly 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse border-2 border-red-500' 
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-2 border-green-500'
                }
              `}>
                {isCurrentlyAnomaly ? (
                  <>
                    <span className="relative flex h-3 w-3 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    ANOMALY DETECTED
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    NORMAL
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Cards Grid */}
      {featureNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Current Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {featureNames.map((name, idx) => {
                const prevEntry = history.length > 1 ? history[history.length - 2] : null
                const prevValue = prevEntry?.features?.[name]
                
                return (
                  <FeatureCard
                    key={idx}
                    name={name}
                    value={latestData.features[name]}
                    isAnomaly={isCurrentlyAnomaly}
                    prevValue={prevValue}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total Records</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              </div>
              <History className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Anomalies</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.anomalies}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Anomaly Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.anomalyRate.toFixed(1)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Normal Records</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.normal}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Trends Chart */}
      {featureNames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Feature Trends (Last 30 Points)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={featureTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis 
                    dataKey="timestamp" 
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tick={{fontSize: 12}}
                    stroke="#64748b"
                    tickFormatter={(timestamp) => formatTime(new Date(timestamp))}
                  />
                  <YAxis 
                    tick={{fontSize: 12}}
                    stroke="#64748b"
                    domain={featureTrendDomain}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{fontSize: '11px'}}
                    iconSize={8}
                  />
                  {featureNames.slice(0, 5).map((name, idx) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={`hsl(${idx * 60}, 70%, 50%)`}
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props
                        if (payload.isAnomaly) {
                          return (
                            <g>
                              <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                            </g>
                          )
                        }
                        return null
                      }}
                      activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Anomalies Table */}
      {recentAnomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Recent Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-4 font-medium text-slate-500 dark:text-slate-400">Time</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500 dark:text-slate-400">Score</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500 dark:text-slate-400">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAnomalies.map((anomaly, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-2 px-4 font-mono text-xs">
                        {formatDateTime(anomaly.timestamp)}
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="destructive" className="font-mono">
                          {anomaly.anomalyScore.toFixed(4)}
                        </Badge>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(anomaly.features).slice(0, 4).map(([key, value]) => (
                            <span 
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
