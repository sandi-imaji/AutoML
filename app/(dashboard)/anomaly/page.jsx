'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDatasetsActive, runAnomalyDetection } from '@/lib/api'
import { Loader2, AlertCircle, Sparkles, Database, Settings, BarChart3, Send, RefreshCw } from 'lucide-react'

const ALGORITHMS = [
  { value: 'abod', label: 'ABOD' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'cof', label: 'COF' },
  { value: 'histogram', label: 'Histogram' },
  { value: 'iforest', label: 'Isolation Forest' },
  { value: 'knn', label: 'KNN' },
  { value: 'lof', label: 'LOF' },
  { value: 'svm', label: 'SVM' },
  { value: 'pca', label: 'PCA' },
  { value: 'mcd', label: 'MCD' },
  { value: 'sod', label: 'SOD' },
  { value: 'sos', label: 'SOS' },
]

export default function AnomalyDetectionPage() {
  const router = useRouter()
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [fraction, setFraction] = useState(0.1)
  const [algorithm, setAlgorithm] = useState('iforest')

  useEffect(() => {
    let isMounted = true
    const fetchDatasets = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getDatasetsActive()
        if (isMounted) {
          const datasetList = Array.isArray(result) ? result : []
          setDatasets(datasetList)
          if (datasetList.length === 0) setError('No active datasets available')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load datasets')
          setDatasets([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchDatasets()
    return () => { isMounted = false }
  }, [])

  const handleDatasetChange = (value) => {
    const found = datasets.find((d) => d.name === value) || null
    setSelectedDataset(found)
  }

  const handleSubmit = async () => {
    if (!selectedDataset) {
      return
    }

    setIsSubmitting(true)

    try {
      // Call API with the required body structure
      await runAnomalyDetection({
        dataset_name: selectedDataset.name,
        algorithm: algorithm,
        fraction: fraction,
      })

      // Show loading for 3 seconds before redirect
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Redirect to workers page after successful API call
      router.push('/workers')
    } catch (error) {
      console.error('Error running anomaly detection:', error)
      // You can add error handling here (e.g., show toast notification)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSelectedDataset(null)
    setAlgorithm('iforest')
    setFraction(0.1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
          {/* Header Section */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              <span>Anomaly Detection</span>
            </div>
          <h1 className="text-4xl font-bold tracking-tight text-indigo-600">
            Anomaly Detection
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Configure parameters and algorithms to detect anomalies in your datasets
          </p>
        </div>

        {/* Main Form Card */}
        <Card className="border-0 shadow-2xl shadow-indigo-500/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
          {/* Decorative line */}
          <div className="h-1.5 bg-indigo-600" />
          
          <CardHeader className="pb-6 pt-8 px-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Detection Configuration</CardTitle>
                <CardDescription className="text-base mt-1">
                  Adjust parameters according to your analysis needs
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Dataset Select */}
              <div className="space-y-3 lg:col-span-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-500" />
                  Active Dataset
                </Label>
                {loading ? (
                  <div className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    <span className="text-slate-600 dark:text-slate-400">Loading datasets...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                ) : (
                  <Select value={selectedDataset?.name ?? ''} onValueChange={handleDatasetChange}>
                    <SelectTrigger className="w-full h-14 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                      <SelectValue placeholder="Select an active dataset..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-96 border-2 border-slate-200 dark:border-slate-700">
                      {datasets.map((ds) => (
                        <SelectItem key={ds.name} value={ds.name} className="py-3 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="font-medium">{ds.name}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {ds.task_type}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Algorithm Select */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Algorithm
                </Label>
                <Select value={algorithm} onValueChange={setAlgorithm}>
                  <SelectTrigger className="w-full h-14 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
                    <SelectValue placeholder="Select an algorithm..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-96 border-2 border-slate-200 dark:border-slate-700">
                    {ALGORITHMS.map((alg) => (
                      <SelectItem key={alg.value} value={alg.value} className="py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                              {alg.label.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium">{alg.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fraction Input */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-pink-500 flex items-center justify-center text-[10px] text-white font-bold">%</div>
                  Anomaly Fraction (0.0 - 0.5)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0.0}
                    max={0.5}
                    step={0.01}
                    value={fraction}
                    onChange={(e) => setFraction(parseFloat(e.target.value) || 0)}
                    placeholder="Example: 0.1"
                    className="h-14 text-base rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-400 dark:hover:border-pink-500 transition-colors pl-4"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {Math.round(fraction * 100)}%
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Expected proportion of data to be classified as anomalies
                </p>
              </div>

            </div>

            {/* Configuration Summary */}
            {selectedDataset && (
              <div className="mt-8 p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Configuration Summary
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-sm">
                    <span className="text-slate-500">Dataset:</span>
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">{selectedDataset.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-sm">
                    <span className="text-slate-500">Algorithm:</span>
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                      {ALGORITHMS.find(a => a.value === algorithm)?.label || algorithm}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-sm">
                    <span className="text-slate-500">Fraction:</span>
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">{fraction}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleSubmit}
                disabled={!selectedDataset || isSubmitting}
                className="flex-1 h-14 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Run Anomaly Detection
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-14 px-8 text-base font-semibold rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Usage Guidelines
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Select an active dataset and configure anomaly detection parameters according to your needs. 
                  The Isolation Forest algorithm is recommended for high-dimensional datasets, 
                  while LOF and COF are better suited for datasets with complex local structures.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
