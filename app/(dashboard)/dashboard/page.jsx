'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { StatCard } from '@/components/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, StatusBadgeMedium } from '@/components/status-badge'
import { getDatasetsActive, getStats, getAnomalyHistory } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Brain, Target, Database, Users, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState(null)
  const [anomalyHistory, setAnomalyHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [anomalyLoading, setAnomalyLoading] = useState(true)
  const { theme } = useTheme()

  useEffect(() => {
    setMounted(true)
    fetchStats()
    fetchAnomalyHistory()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await getStats()
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnomalyHistory = async () => {
    try {
      const response = await getAnomalyHistory()
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setAnomalyHistory(data)
    } catch (error) {
      console.error('Error fetching anomaly history:', error)
    } finally {
      setAnomalyLoading(false)
    }
  }

  const isDark = theme === 'dark'

  // Prepare data for charts
  const sumDataDates = stats ? Object.keys(stats.sum_data).sort() : []
  const sumDataValues = sumDataDates.map(date => stats.sum_data[date])

  const taskTypes = stats ? Object.keys(stats.sum_task_type) : []
  const taskTypeValues = taskTypes.map(type => stats.sum_task_type[type])

  // Prepare data for anomaly heatmap
  const prepareAnomalyHeatmapData = () => {
    if (!anomalyHistory || anomalyHistory.length === 0) {
      return { categories: [], series: [] }
    }

    // Sort by timestamp (oldest to newest)
    const sortedData = [...anomalyHistory].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    )

    // Get all unique dataset names
    const uniqueDatasets = [...new Set(sortedData.map(item => item.dataset_name))]

    // Take last 12 entries for better visualization
    const recentData = sortedData.slice(-12)

    // Format time categories (HH:mm) - extract directly from ISO string without timezone conversion
    const categories = recentData.map(item => {
      // Extract time from ISO format: 2026-05-26T01:25:27.236124+00:00 -> 01:25
      const match = item.timestamp.match(/T(\d{2}):(\d{2}):/)
      if (match) {
        return `${match[1]}:${match[2]}`
      }
      return item.timestamp
    })

    // Create series for each dataset
    const series = uniqueDatasets.map(datasetName => {
      return {
        name: datasetName,
        data: categories.map((category, idx) => {
          // Find the record that matches this timestamp and dataset
          const timestamp = recentData[idx].timestamp
          const matchingRecord = sortedData.find(d =>
            d.dataset_name === datasetName &&
            d.timestamp === timestamp
          )
          const isAnomaly = matchingRecord?.results?.is_anomaly === 1
          return {
            x: category,
            y: isAnomaly ? 1 : 0
          }
        })
      }
    })

    return { categories, series, datasets: uniqueDatasets }
  }

  const { categories: heatmapCategories, series: heatmapSeries, datasets: heatmapDatasets } = prepareAnomalyHeatmapData()

  const heatmapOptions = {
    chart: {
      type: 'heatmap',
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      background: 'transparent'
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 4,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            {
              from: 0,
              to: 0,
              color: '#10b981', // Green for normal
              name: 'Normal'
            },
            {
              from: 1,
              to: 1,
              color: '#ef4444', // Red for anomaly
              name: 'Anomaly'
            }
          ]
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      width: 1,
      colors: [isDark ? '#1e293b' : '#f1f5f9']
    },
    xaxis: {
      categories: heatmapCategories,
      labels: {
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontWeight: 500, fontSize: '11px' },
        rotate: -45
      },
      tooltip: {
        enabled: false
      }
    },
    yaxis: {
      labels: {
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontWeight: 500, fontSize: '11px' }
      }
    },
    grid: {
      padding: {
        right: 20
      }
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const datasetName = w.globals.seriesNames[seriesIndex]
        const timeLabel = w.globals.labels[dataPointIndex]
        const value = series[seriesIndex][dataPointIndex]
        const isAnomaly = value === 1
        
        return `
          <div class="${isDark ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} min-w-[200px]">
            <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium mb-1">${timeLabel}</div>
            <div class="text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2">${datasetName}</div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${isAnomaly ? 'bg-red-500' : 'bg-green-500'}"></span>
              <span class="text-sm font-medium ${isAnomaly ? 'text-red-500' : 'text-green-500'}">${isAnomaly ? 'Anomaly Detected' : 'Normal'}</span>
            </div>
          </div>
        `
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      labels: {
        colors: isDark ? '#94a3b8' : '#64748b'
      },
      markers: {
        radius: 3
      },
      itemMargin: {
        horizontal: 10
      }
    }
  }

  const barChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      background: 'transparent'
    },
    colors: ['#206bc4', '#17a2b8', '#f59e0b'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 8,
        borderRadiusApplication: 'end'
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: taskTypes,
      labels: {
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 },
        rotate: -45
      }
    },
    yaxis: {
      labels: {
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }
      },
      tickAmount: 5,
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      style: {
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif'
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex]
        const category = w.globals.labels[dataPointIndex]
        return `
          <div class="${isDark ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}">
            <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium mb-1">${category}</div>
            <div class="text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1">${value} models</div>
          </div>
        `
      }
    },
    legend: {
      show: false
    },
    grid: {
      borderColor: isDark ? '#334155' : '#e2e8f0',
      strokeDashArray: 3
    }
  }

  const barChartSeries = [
    {
      name: 'Task Types',
      data: taskTypeValues
    }
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-medium">
          Monitor your AutoML projects and performance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Models"
          value={loading ? '...' : (stats?.total_model ?? 0)}
          subtitle="All trained models"
          icon={Brain}
          gradientClass="gradient-card-1"
        />
        <StatCard
          title="Total Datasets"
          value={loading ? '...' : (stats?.total_dataset ?? 0)}
          subtitle="Created datasets"
          icon={Database}
          gradientClass="gradient-card-2"
        />
        <StatCard
          title="Total Workers"
          value={loading ? '...' : (stats?.total_workers ?? 0)}
          subtitle="Active workers"
          icon={Users}
          gradientClass="gradient-card-3"
        />
        <StatCard
          title="Avg Accuracy"
          value={loading ? '...' : `${((stats?.avg_accuracy ?? 0) * 100).toFixed(1)}%`}
          subtitle="All models"
          icon={Target}
          gradientClass="gradient-card-4"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-800/50 animate-fade-in overflow-hidden">
          <CardHeader className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Anomaly Detection Status</CardTitle>
                <CardDescription className="font-medium">Real-time sensor anomaly monitoring</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-gray-600 dark:text-gray-400">Anomaly</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {mounted && !anomalyLoading && anomalyHistory.length > 0 && (
              <Chart
                key={`heatmap-${theme}`}
                options={heatmapOptions}
                series={heatmapSeries}
                type="heatmap"
                height={320}
              />
            )}
            {(anomalyLoading || anomalyHistory.length === 0) && (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                {anomalyLoading ? 'Loading...' : 'No anomaly data available'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-800/50 animate-fade-in overflow-hidden">
          <CardHeader className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-950/20">
            <CardTitle className="text-xl font-bold tracking-tight">Task Type Distribution</CardTitle>
            <CardDescription className="font-medium">Models by task type</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {mounted && stats && (
              <Chart
                key={`bar-${theme}`}
                options={barChartOptions}
                series={barChartSeries}
                type="bar"
                height={320}
              />
            )}
            {(!stats || loading) && (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                {loading ? 'Loading...' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-800/50 animate-fade-in overflow-hidden">
        <CardHeader className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-900/50">
          <CardTitle className="text-xl font-bold tracking-tight">Recent Activity</CardTitle>
          <CardDescription className="font-medium">Latest project updates</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-gray-200/50 dark:border-gray-800/50">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : stats?.recent_activity?.length > 0 ? (
                stats.recent_activity.map((activity) => (
                  <TableRow key={activity.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <TableCell className="font-semibold text-gray-900 dark:text-white">
                      <Badge variant="outline" className="text-xs font-mono">
                        {activity.id}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-gray-700 dark:text-gray-300">{activity.description}</TableCell>
                    <TableCell>
                      <StatusBadgeMedium status={activity.status} />
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 font-medium">{activity.time}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
