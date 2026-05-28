// WebSocket utility for real-time forecasting
import { WS_BASE_URL } from './api'

/**
 * Connect to forecast WebSocket
 * @param {Function} onMessage - Callback when receiving data
 * @param {Function} onError - Callback on error
 * @param {Function} onOpen - Callback on connection open
 * @param {Function} onClose - Callback on close
 * @returns {WebSocket} WebSocket instance
 */
export function connectForecastWebSocket(datasetName, onMessage, onError, onOpen, onClose) {
  try {
    const wsUrl = `${WS_BASE_URL}/stream/realtime/forecast/get_actual?dataset_name=${encodeURIComponent(datasetName)}`
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('✅ Forecast WebSocket connected')
      if (onOpen) onOpen()
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      if (onError) onError(error)
    }
    
    ws.onclose = () => {
      console.log('🔌 WebSocket closed')
      if (onClose) onClose()
    }
    
    return ws
  } catch (error) {
    console.error('Error creating WebSocket:', error)
    if (onError) onError(error)
    return null
  }
}

/**
 * Generate mock forecast data for development/testing
 * Simulates real server behavior
 */
export function mockForecastDataStream(onMessage, interval = 1000) {
  let actualIndex = 0
  const baseTime = new Date('2025-04-05T09:00:00')
  
  // Generate static forecast (60 minutes into future)
  const generateForecast = () => {
    const forecast = []
    for (let i = 0; i < 60; i++) {
      const time = new Date(baseTime.getTime() + (30 + i) * 60000)
      const baseValue = 150
      const trend = i * 0.3
      const noise = Math.sin(i * 0.5) * 3
      
      forecast.push({
        ts: time.toISOString(),
        value: parseFloat((baseValue + trend + noise).toFixed(2))
      })
    }
    return forecast
  }
  
  const staticForecast = generateForecast()
  
  // Generate actual data progressively
  const sendUpdate = () => {
    const actual = []
    
    // Generate actual data up to current index
    for (let i = 0; i <= actualIndex && i < 30; i++) {
      const time = new Date(baseTime.getTime() + i * 60000)
      const baseValue = 150
      const trend = i * 0.3
      const noise = Math.sin(i * 0.5) * 3
      const randomError = (Math.random() - 0.5) * 5 // ±2.5 error
      
      actual.push({
        ts: time.toISOString(),
        value: parseFloat((baseValue + trend + noise + randomError).toFixed(2))
      })
    }
    
    onMessage({
      pred: staticForecast,
      actual: actual
    })
    
    actualIndex++
    
    // Reset after reaching end
    if (actualIndex > 60) {
      actualIndex = 0
    }
  }
  
  // Initial data
  sendUpdate()
  
  // Continue streaming
  const intervalId = setInterval(sendUpdate, interval)
  
  // Return cleanup function
  return () => clearInterval(intervalId)
}

/**
 * Close WebSocket connection safely
 */
export function closeForecastWebSocket(ws) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close()
  }
}

/**
 * Auto-reconnect WebSocket with exponential backoff
 */
export function connectWithAutoReconnect(onMessage, onError, onStatusChange, useMockData = false) {
  let ws = null
  let cleanup = null
  let reconnectAttempts = 0
  let reconnectTimeout = null
  let isActive = true
  const maxReconnectDelay = 30000 // 30 seconds max
  
  const connect = () => {
    if (!isActive) return
    
    if (useMockData) {
      cleanup = mockForecastDataStream(onMessage, 1000)
      if (onStatusChange) onStatusChange('connected')
    } else {
      ws = connectForecastWebSocket(
        (data) => {
          if (!isActive) return
          reconnectAttempts = 0 // Reset on successful message
          onMessage(data)
        },
        (error) => {
          if (!isActive) return
          if (onError) onError(error)
          if (onStatusChange) onStatusChange('error')
          scheduleReconnect()
        },
        () => {
          if (!isActive) return
          reconnectAttempts = 0
          if (onStatusChange) onStatusChange('connected')
        },
        () => {
          if (!isActive) return
          if (onStatusChange) onStatusChange('disconnected')
          scheduleReconnect()
        }
      )
    }
  }
  
  const scheduleReconnect = () => {
    if (!isActive || reconnectTimeout) return
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay)
    reconnectAttempts++
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
    if (onStatusChange) onStatusChange('reconnecting')
    
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      connect()
    }, delay)
  }
  
  connect()
  
  return () => {
    isActive = false
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (cleanup) {
      cleanup()
      cleanup = null
    }
    if (ws) {
      closeForecastWebSocket(ws)
      ws = null
    }
  }
}
