'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pause, Play, Trash2, Download, Search, Terminal, Activity } from 'lucide-react'
import { WS_BASE_URL } from '@/lib/api'
import { format } from 'date-fns'


const LOG_COLORS = {
  ERROR: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', badge: 'bg-red-500 text-white' },
  WARNING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', badge: 'bg-yellow-500 text-black' },
  INFO: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30', badge: 'bg-blue-500 text-white' },
  DEBUG: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', badge: 'bg-gray-500 text-white' },
  SUCCESS: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50', badge: 'bg-green-500 text-white' },
  CRITICAL: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', badge: 'bg-purple-500 text-white' },
}

export function LogViewer({ datasetName, title = 'System Logs', height = '800px' }) {
  const [logs, setLogs] = useState([])
  const [isPaused, setIsPaused] = useState(false)
  const [filter, setFilter] = useState('all')
  const [isConnected, setIsConnected] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMetadata, setShowMetadata] = useState(true)
  const [stats, setStats] = useState({ total: 0, error: 0, warning: 0, info: 0 })
  const viewportRef = useRef(null)
  const logsEndRef = useRef(null)

  // Auto scroll ke bawah (kecuali dipause)
  useEffect(() => {
    if (!isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isPaused])

  // Update stats
  useEffect(() => {
    setStats({
      total: logs.length,
      error: logs.filter(l => l.level === 'ERROR').length,
      warning: logs.filter(l => l.level === 'WARNING').length,
      info: logs.filter(l => l.level === 'INFO').length,
    })
  }, [logs])

  // WebSocket
  useEffect(() => {
    if (!datasetName) return

    const wsUrl = `${WS_BASE_URL}/stream/realtime/logs?dataset_name=${encodeURIComponent(datasetName)}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('Log WebSocket connected')
      setIsConnected(true)
    }

    ws.onclose = (event) => {
      console.log('Log WebSocket disconnected:', event.code)
      setIsConnected(false)
      // Auto reconnect after 3 seconds
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          console.log('Attempting to reconnect...')
        }
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error('Log WebSocket error:', error)
      setIsConnected(false)
    }

    ws.onmessage = (event) => {
      if (isPaused) return

      try {
        const data = JSON.parse(event.data)

        // Handle init response (array of logs)
        if (data.type === 'init' && Array.isArray(data.data)) {
          const initLogs = data.data.map(log => ({
            id: `${Date.now()}-${Math.random()}-${Math.random()}`,
            timestamp: log.timestamp || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            level: log.level === 'WARN' ? 'WARNING' : log.level,
            module: log.module || 'system',
            function: log.function || '',
            line: log.line || null,
            message: log.message || '',
          }))
          setLogs(prev => {
            const newLogs = [...prev, ...initLogs]
            return newLogs.slice(-1000)
          })
        }
        // Handle log response (single log entry)
        else if (data.type === 'log' && data.data) {
          const log = data.data
          const normalizedLevel = log.level === 'WARN' ? 'WARNING' : log.level

          setLogs(prev => {
            const newLogs = [...prev, {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: log.timestamp || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
              level: normalizedLevel,
              module: log.module || 'system',
              function: log.function || '',
              line: log.line || null,
              message: log.message || '',
            }]
            // Keep only last 1000 logs to prevent memory issues
            return newLogs.slice(-1000)
          })
        }
        // Handle legacy format (direct log object without type wrapper)
        else if (data.level && data.message) {
          const normalizedLevel = data.level === 'WARN' ? 'WARNING' : data.level
          setLogs(prev => {
            const newLogs = [...prev, {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: data.timestamp || format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
              level: normalizedLevel,
              module: data.module || 'system',
              function: data.function || '',
              line: data.line || null,
              message: data.message || '',
            }]
            return newLogs.slice(-1000)
          })
        }
      } catch (e) {
        setLogs(prev => [...prev.slice(-1000), {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          level: 'INFO',
          module: 'websocket',
          function: '',
          line: null,
          message: event.data.trim(),
        }])
      }
    }

    return () => ws.close()
  }, [datasetName, isPaused])

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter
    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.function.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Export logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `logs-${datasetName}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format source location
  const formatSource = (module, func, line) => {
    if (!showMetadata) return null
    const parts = [module]
    if (func) parts.push(func)
    if (line) parts.push(line)
    return parts.join(':')
  }

  return (
    <Card className="w-full shadow-2xl flex flex-col border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950" style={{ height }}>
      {/* Header */}
      <CardHeader className="flex-none border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
        <div className="flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-gray-800 dark:text-zinc-100">
              <Terminal className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
              {title}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-normal text-gray-500 dark:text-zinc-400">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportLogs}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setLogs([])}
                title="Clear logs"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats row */}
            <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
              <span className="text-gray-600 dark:text-zinc-400">Total: <span className="text-gray-800 dark:text-zinc-200 font-medium">{stats.total}</span></span>
            </div>
            <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700" />
            <span className="text-red-600 dark:text-red-400">Errors: {stats.error}</span>
            <span className="text-yellow-600 dark:text-yellow-400">Warnings: {stats.warning}</span>
            <span className="text-blue-600 dark:text-blue-400">Info: {stats.info}</span>
          </div>

          {/* Search and Filter row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              />
            </div>
            
            <div className="flex items-center gap-1">
              {['all', 'ERROR', 'WARNING', 'INFO'].map((f) => (
                  <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className={`capitalize ${
                    filter === f
                      ? f === 'all' 
                        ? 'bg-gray-700 text-white'
                        : LOG_COLORS[f]?.badge || 'bg-gray-700'
                      : 'border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:text-gray-800 hover:bg-gray-100 dark:hover:text-zinc-200'
                  }`}
                >
                  {f}
                </Button>
              ))}
            </div>

            <Button
              size="sm"
              variant={showMetadata ? 'default' : 'outline'}
              onClick={() => setShowMetadata(!showMetadata)}
              className={showMetadata ? 'bg-gray-700 text-white' : 'border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-400'}
            >
              Metadata
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="flex-1 p-0 bg-gray-50 dark:bg-black overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={viewportRef} className="p-4 font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-zinc-600">
                <Terminal className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg text-gray-600 dark:text-zinc-400">
                  {isConnected ? 'Waiting for logs...' : 'Disconnected from server'}
                </p>
                <p className="text-sm mt-2 text-gray-500 dark:text-zinc-500">
                  {logs.length === 0 
                    ? 'Logs will appear here when available'
                    : 'No logs match current filters'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log) => {
                  const colors = LOG_COLORS[log.level] || LOG_COLORS.INFO
                  const source = formatSource(log.module, log.function, log.line)
                  
                  return (
                    <div
                      key={log.id}
                      className={`group flex items-start gap-3 px-3 py-2 -mx-3 rounded-lg border-l-2 transition-all hover:bg-gray-100 dark:hover:bg-zinc-900/50 ${colors.border}`}
                    >
                      {/* Timestamp */}
                      <span className="text-gray-500 dark:text-zinc-500 text-xs shrink-0 w-36 pt-0.5">
                        {log.timestamp}
                      </span>

                      {/* Level Badge */}
                      <Badge className={`${colors.badge} text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 h-5`}>
                        {log.level}
                      </Badge>

                      {/* Source (module:function:line) */}
                      {source && (
                        <span className="text-cyan-600 dark:text-cyan-500/70 text-xs shrink-0 w-48 truncate pt-0.5" title={source}>
                          {source}
                        </span>
                      )}

                      {/* Message */}
                      <span className={`${colors.text} flex-1 whitespace-pre-wrap break-all leading-relaxed`}>
                        {log.message}
                      </span>
                    </div>
                  )
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
