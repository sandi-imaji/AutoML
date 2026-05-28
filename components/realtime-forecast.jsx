'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { WS_BASE_URL } from '@/lib/api';

const MODEL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

// Format waktu dan tanggal - menggunakan UTC langsung dari backend
const formatTime = (dateStr) => {
  // Parse ISO string dan ambil time part saja (HH:MM) dalam UTC
  const match = dateStr.match(/T(\d{2}):(\d{2}):/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  // Fallback: parse as date dan format UTC
  const date = new Date(dateStr);
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatDateFull = (dateStr) => {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getUTCDate().toString().padStart(2, '0');
  const mon = months[date.getUTCMonth()];
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  const s = date.getUTCSeconds().toString().padStart(2, '0');
  return `${d} ${mon} ${h}:${m}:${s}`;
};

// Fungsi untuk mencocokkan timestamp actual dengan forecast terdekat
const findClosestTimestamp = (actualTs, forecastTimestamps) => {
  const actualTime = new Date(actualTs).getTime();
  let closest = forecastTimestamps[0];
  let minDiff = Math.abs(new Date(forecastTimestamps[0]).getTime() - actualTime);
  
  for (const ts of forecastTimestamps) {
    const diff = Math.abs(new Date(ts).getTime() - actualTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ts;
    }
  }
  
  return closest;
};

export default function RealtimeForecast({ dataset_name, target }) {
  const [forecastData, setForecastData] = useState(null);
  const [actuals, setActuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [closeReason, setCloseReason] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const actualsBuffer = useRef([]);
  const forecastReceived = useRef(false);

  // WebSocket connection - handles both forecast and actual data
  useEffect(() => {
    if (!dataset_name) return;

    setLoading(true);
    setError(null);
    setCloseReason(null);
    forecastReceived.current = false;
    actualsBuffer.current = [];
    setActuals([]);

    const wsUrl = `${WS_BASE_URL}/stream/realtime/forecast?dataset_name=${encodeURIComponent(dataset_name)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data || typeof data !== 'object') {
          console.warn('Invalid message format:', event.data);
          return;
        }

        // Response pertama: forecast data (memiliki key 'forecast')
        if (data.forecast && data.timestamps && !forecastReceived.current) {
          forecastReceived.current = true;
          
          if (!data.is_valid) {
            setError('Forecast data is not valid');
            setLoading(false);
            return;
          }

          const modelNames = Object.keys(data.forecast);
          if (modelNames.length === 0) {
            setError('No forecast models available');
            setLoading(false);
            return;
          }

          const converted = {};
          modelNames.forEach((name) => {
            converted[name] = data.timestamps.map((dt, i) => ({
              ds: dt,
              value: Number(data.forecast[name][i].toFixed(4)),
            }));
          });

          setForecastData({
            timestamps: data.timestamps,
            forecasts: converted,
          });
          setLoading(false);
          setError(null);
        }
        // Response selanjutnya: actual data (memiliki key 'timestamp' dan 'actual')
        else if (data.timestamp !== undefined && data.actual !== undefined) {
          const point = {
            ds: data.timestamp,
            value: data.actual,
          };
          actualsBuffer.current = [...actualsBuffer.current.slice(-299), point];
          setActuals(actualsBuffer.current);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (e) => {
      console.error('WS Error:', e);
      setError('WebSocket connection error');
      setLoading(false);
    };

    ws.onclose = (event) => {
      console.log('WS Closed:', event.reason, event.code);
      setIsConnected(false);
      
      // Handle specific close reasons
      if (event.reason) {
        const reason = event.reason;
        setCloseReason(reason);
        
        if (reason.includes('Expired') || reason.includes('Retraining')) {
          setError(reason);
        } else if (!forecastReceived.current) {
          setError('Connection closed before receiving forecast data');
        }
      } else if (!forecastReceived.current) {
        setError('Connection closed unexpectedly');
      }
      
      setLoading(false);
    };

    return () => {
      ws.close();
    };
  }, [dataset_name]);

  // Loading state
  if (loading) {
    return (
      <Card className="w-full max-w-7xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Forecast {target}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Connecting to realtime forecast...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !forecastData) {
    const isExpired = closeReason?.includes('Expired');
    const isRetraining = closeReason?.includes('Retraining');
    const isProcessing = isExpired || isRetraining;

    return (
      <Card className="w-full max-w-7xl mx-auto">
        <CardHeader>
          <CardTitle className={`text-2xl font-bold ${isProcessing ? 'text-amber-600' : 'text-red-600'}`}>
            {isProcessing ? 'Model Sedang Diproses' : 'Loading Forecast ...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center gap-4 rounded-lg p-5 border ${
            isProcessing 
              ? 'bg-amber-50 border-amber-200 text-amber-800' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {isProcessing ? (
              <Loader2 className="h-10 w-10 animate-spin flex-shrink-0" />
            ) : (
              <AlertCircle className="h-10 w-10 flex-shrink-0" />
            )}
            <div>
              <p className="text-lg font-medium">{error || 'Failed to load forecast data'}</p>
              {closeReason && (
                <p className="text-sm mt-1 opacity-80">Reason: {closeReason}</p>
              )}
            </div>
          </div>
          {isProcessing && (
            <p className="mt-3 text-sm text-muted-foreground">
              Silakan coba lagi beberapa saat lagi.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render chart dengan timestamp yang diselaraskan
  const modelNames = Object.keys(forecastData.forecasts);

  // Buat map untuk actual berdasarkan closest timestamp
  const actualsByClosestTs = new Map();
  actuals.forEach((actual) => {
    const actualTs = actual.ds;
    const closestTs = findClosestTimestamp(actualTs, forecastData.timestamps);
    actualsByClosestTs.set(closestTs, actual.value);
  });

  // Gunakan hanya forecast timestamps sebagai base
  const chartData = forecastData.timestamps.map((ds) => {
    const obj = {
      time: formatTime(ds),
      ds: ds,
    };

    // Tambahkan semua forecast values
    modelNames.forEach((key) => {
      const found = forecastData.forecasts[key].find((f) => f.ds === ds);
      // Strip _cds_dt suffix untuk display name
      const displayName = key.replace('_cds_dt', '');
      obj[displayName] = found ? found.value : null;
    });

    // Tambahkan actual jika ada yang match dengan timestamp ini
    obj.actual = actualsByClosestTs.get(ds) || null;

    return obj;
  });

  const latestActual = actuals[actuals.length - 1];

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader className="">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Forecast {target}</CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="inline-flex h-8 px-3 items-center justify-center bg-emerald-500 animate-pulse font-semibold">
                LIVE
              </Badge>
            ) : (
              <Badge variant="secondary" className="inline-flex h-8 px-3 items-center justify-center font-semibold">
                DISCONNECTED
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-500/5 border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Actual</p>
                <p className="text-2xl font-bold text-red-600">
                  {latestActual?.value != null ? latestActual.value.toFixed(3) : '-'}
                </p>
              </div>
            </div>
          </div>
          {modelNames.map((key, i) => {
            const name = key.replace('_cds_dt', '').toUpperCase();
            const latestForecast = forecastData.forecasts[key].at(-1)?.value;
            const latest = latestForecast?.toFixed(3) || '-';
            
            // Hitung deviasi dari actual
            let deviation = null;
            let deviationPercent = null;
            if (latestActual?.value != null && latestForecast != null) {
              deviation = latestForecast - latestActual.value;
              deviationPercent = latestActual.value !== 0 
                ? (deviation / Math.abs(latestActual.value)) * 100 
                : 0;
            }
            
            return (
              <div key={key} className="bg-slate-500/5 border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{name}</p>
                <p className="text-xl font-bold" style={{ color: MODEL_COLORS[i % MODEL_COLORS.length] }}>
                  {latest}
                </p>
                {deviation !== null && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className={`text-xs font-semibold ${deviation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {deviation > 0 ? '↑' : '↓'} {Math.abs(deviation).toFixed(3)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({deviationPercent > 0 ? '+' : ''}{deviationPercent.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-96 md:h-[520px] rounded-2xl bg-muted/20 p-4 border">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => value.toFixed(3)}
              />
              <Tooltip
                formatter={(v) => (v != null ? Number(v).toFixed(3) : '-')}
                labelFormatter={(label) => {
                  const dataPoint = chartData.find((d) => d.time === label);
                  if (dataPoint && dataPoint.ds) {
                    return formatDateFull(dataPoint.ds);
                  }
                  return label;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '12px',
                }}
                labelStyle={{
                  color: 'hsl(var(--foreground))',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />

              {modelNames.map((key, i) => {
                const name = key.replace('_cds_dt', '');
                const dashPatterns = ['5 5', '10 5', '15 5', '5 10', '10 10', '3 3'];
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                    strokeWidth={3}
                    dot={false}
                    name={name.toUpperCase()}
                    connectNulls
                    strokeDasharray={dashPatterns[i % dashPatterns.length]}
                    opacity={0.9}
                  />
                );
              })}

              <Line
                type="monotone"
                dataKey="actual"
                stroke="#ef4444"
                strokeWidth={5}
                dot={{ r: 7, fill: '#ef4444', strokeWidth: 3, stroke: '#fff' }}
                name="ACTUAL"
                connectNulls
                activeDot={{ r: 9, strokeWidth: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
