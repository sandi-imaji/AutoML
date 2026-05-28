'use client'

import { useState, useEffect, useId } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const METRIC_CONFIG = {
  Regression: [
    { key: 'R2', name: 'R² Score', format: v => `${(v * 100).toFixed(2)}%`, good: 'high' },
    { key: 'MAE', name: 'MAE', format: v => v.toFixed(4), good: 'low' },
    { key: 'RMSE', name: 'RMSE', format: v => v.toFixed(4), good: 'low' },
    { key: 'MAPE', name: 'MAPE', format: v => `${(v * 100).toFixed(2)}%`, good: 'low' },
  ],
  Classification: [
    { key: 'Accuracy', name: 'Accuracy', format: v => `${(v * 100).toFixed(2)}%`, good: 'high' },
    { key: 'F1', name: 'F1 Score', format: v => `${(v * 100).toFixed(2)}%`, good: 'high' },
    { key: 'Precision', name: 'Precision', format: v => `${(v * 100).toFixed(2)}%`, good: 'high' },
    { key: 'Recall', name: 'Recall', format: v => `${(v * 100).toFixed(2)}%`, good: 'high' },
    { key: 'AUC', name: 'AUC', format: v => v.toFixed(4), good: 'high' },
  ],
  Clustering: [
    { key: 'Silhouette', name: 'Silhouette', format: v => v.toFixed(3), good: 'high' },
    { key: 'DaviesBouldin', name: 'Davies-Bouldin', format: v => v.toFixed(3), good: 'low' },
    { key: 'CalinskiHarabasz', name: 'Calinski-Harabasz', format: v => v.toFixed(0), good: 'high' },
  ],
  'Time Series': [
    { key: 'MAE', name: 'MAE', format: v => v.toFixed(4), good: 'low' },
    { key: 'RMSE', name: 'RMSE', format: v => v.toFixed(4), good: 'low' },
    { key: 'MAPE', name: 'MAPE', format: v => `${(v * 100).toFixed(2)}%`, good: 'low' },
    { key: 'SMAPE', name: 'SMAPE', format: v => `${(v * 100).toFixed(2)}%`, good: 'low' },
    { key: 'MASE', name: 'MASE', format: v => v.toFixed(4), good: 'low' },
  ]
}

const MODEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function DynamicModelPerformanceChart({ task_type = 'Regression', models = [] }) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const chartId = useId()
  const chartKey = `${chartId}-${isDark ? 'dark' : 'light'}`

  useEffect(() => setMounted(true), [])

  if (!mounted || models.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-dashed">
        <p className="text-gray-500">Tidak ada data model</p>
      </div>
    )
  }

  const metrics = METRIC_CONFIG[task_type] || METRIC_CONFIG.Regression

  // Series = per model
  const series = models.map((model, idx) => ({
    name: model.name || model.algorithm || `Model ${idx + 1}`,
    data: metrics.map(metric => {
      const val = model.evaluation?.[metric.key]
      return val != null ? Number(val) : null
    })
  }))

  const categories = metrics.map(m => m.name)

  const options = {
    chart: {
      type: 'bar',
      height: 480,
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: true },
      background: 'transparent',
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: MODEL_COLORS,
    plotOptions: {
      bar: {
        borderRadius: 8,
        borderRadiusApplication: 'end',
        columnWidth: '45%',
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -22,
      style: {
        fontSize: '12px',
        fontWeight: 700,
        colors: [isDark ? '#e2e8f0' : '#1e293b']
      },
      formatter: (val, { dataPointIndex }) => {
        if (val == null) return ''
        const metric = metrics[dataPointIndex]
        return metric?.format ? metric.format(val) : val.toFixed(3)
      }
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories,
      labels: { style: { fontSize: '13px', fontWeight: 600 } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { fontSize: '12px' } },
      title: { text: 'Nilai Metrik', style: { fontWeight: 600 } }
    },
    grid: {
      borderColor: isDark ? '#334155' : '#e2e8f0',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '14px',
      fontWeight: 600,
      markers: { width: 12, height: 12, radius: 6 },
      itemMargin: { horizontal: 20, vertical: 8 }
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: function (val, { seriesIndex, dataPointIndex }) {
          if (val == null) return 'N/A'
          const metric = metrics[dataPointIndex]
          const modelName = series[seriesIndex].name
          return `<div class="p-1"><strong>${modelName}</strong><br/>${metric.name}: <strong>${metric.format(val)}</strong></div>`
        }
      }
    }
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-200/30 dark:border-gray-800">
        {/* <h3 className="text-2xl font-bold">Perbandingan Performa Model</h3> */}
        <p className="text-sm text-muted-foreground mt-1">
          {task_type} • {models.length} model • {metrics.length} metrics
        </p>
      </div>

      <div className="p-6">
        <div key={chartKey}>
          <Chart options={options} series={series} type="bar" height={480} />
        </div>
      </div>
    </div>
  )
}
