'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toast } from 'sonner'
import Link from 'next/link'

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
      toast.error('Please select a dataset')
      return
    }

    setIsSubmitting(true)

    try {
      await runAnomalyDetection({
        dataset_name: selectedDataset.name,
        algorithm: algorithm,
        fraction: fraction,
      })

      await new Promise(resolve => setTimeout(resolve, 3000))
      router.push('/workers')
    } catch (error) {
      console.error('Error running anomaly detection:', error)
      toast.error(error.message || 'Failed to run anomaly detection')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSelectedDataset(null)
    setAlgorithm('iforest')
    setFraction(0.1)
    toast.info('Form has been reset')
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header - Larger and more prominent */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Sparkles className="h-5 w-5" />
          <span className="text-base font-semibold tracking-wide uppercase">Anomaly Detection</span>
        </div>
        <h1 className="text-[32px] font-bold tracking-tight leading-tight">Detect Anomalies</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
          Configure parameters and algorithms to detect anomalies in your datasets
        </p>
      </div>

      {/* Dataset Selection Card */}
      <Card className="liquid-glass-form shadow-xl overflow-hidden">
        <CardHeader className="border-b border-white/20 dark:border-white/10 py-6">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl liquid-glass-icon flex items-center justify-center flex-shrink-0">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-[22px] font-bold">Dataset Selection</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose an active dataset to analyze</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-7 space-y-5">
          <div className="space-y-3">
            <Label className="text-[15px] font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Database className="h-4 w-4 text-blue-500" />
              Active Dataset
            </Label>
            {loading ? (
              <div className="flex items-center gap-3 p-5 liquid-glass-input rounded-xl">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-base text-gray-600 dark:text-gray-400">Loading datasets...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 p-5 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-base">{error}</span>
              </div>
            ) : (
              <Select value={selectedDataset?.name ?? ''} onValueChange={handleDatasetChange}>
                <SelectTrigger className="w-full h-12 text-base liquid-glass-input border-0 focus:ring-2 focus:ring-blue-500/30">
                  <SelectValue placeholder="Select an active dataset..." />
                </SelectTrigger>
                <SelectContent className="liquid-glass-dropdown border-0 text-base">
                  {datasets.map((ds) => (
                    <SelectItem key={ds.name} value={ds.name} className="cursor-pointer py-3 text-base">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="font-medium">{ds.name}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {ds.task_type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card className="liquid-glass-form shadow-xl overflow-hidden">
        <CardHeader className="border-b border-white/20 dark:border-white/10 py-6">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl liquid-glass-icon flex items-center justify-center flex-shrink-0">
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-[22px] font-bold">Detection Configuration</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Adjust parameters for analysis</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-7 space-y-7">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {/* Algorithm Select */}
            <div className="space-y-3">
              <Label className="text-[15px] font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                Algorithm
              </Label>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger className="w-full h-12 text-base liquid-glass-input border-0 focus:ring-2 focus:ring-purple-500/30">
                  <SelectValue placeholder="Select an algorithm..." />
                </SelectTrigger>
                <SelectContent className="liquid-glass-dropdown border-0 text-base">
                  {ALGORITHMS.map((alg) => (
                    <SelectItem key={alg.value} value={alg.value} className="cursor-pointer py-3 text-base">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
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
              <Label className="text-[15px] font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <div className="h-4 w-4 rounded bg-pink-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">%</div>
                Anomaly Fraction
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  value={fraction}
                  onChange={(e) => setFraction(parseFloat(e.target.value) || 0)}
                  placeholder="0.1"
                  className="w-full h-12 text-base liquid-glass-input border-0 focus:ring-2 focus:ring-pink-500/30 pr-16"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-medium text-gray-500 dark:text-gray-400">
                  {Math.round(fraction * 100)}%
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Expected proportion of anomalies (0.0 - 0.5)
              </p>
            </div>
          </div>

          {/* Configuration Summary */}
          {selectedDataset && (
            <div className="p-5 liquid-glass-summary rounded-xl">
              <h4 className="text-base font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Configuration Summary
              </h4>
              <div className="flex flex-wrap gap-3">
                <span className="liquid-glass-tag inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Dataset:</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">{selectedDataset.name}</span>
                </span>
                <span className="liquid-glass-tag inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Algorithm:</span>
                  <span className="font-semibold text-purple-700 dark:text-purple-400">
                    {ALGORITHMS.find(a => a.value === algorithm)?.label || algorithm}
                  </span>
                </span>
                <span className="liquid-glass-tag inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Fraction:</span>
                  <span className="font-semibold text-pink-700 dark:text-pink-400">{fraction}</span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="liquid-glass-info shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="h-11 w-11 rounded-xl liquid-glass-icon-sm flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Usage Guidelines
              </h4>
              <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Select an active dataset and configure anomaly detection parameters. 
                Isolation Forest is recommended for high-dimensional datasets, 
                while LOF and COF work better for datasets with complex local structures.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!selectedDataset || isSubmitting}
          className="liquid-glass-btn liquid-glass-btn-blue flex-1 h-14 text-lg font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Run Detection
            </>
          )}
        </Button>
        
        <Button
          onClick={handleReset}
          variant="outline"
          className="liquid-glass-btn h-14 px-8 text-base font-semibold"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Reset
        </Button>

        <Button
          variant="outline"
          asChild
          className="liquid-glass-btn h-14 px-8 text-base font-semibold"
        >
          <Link href="/projects">Back</Link>
        </Button>
      </div>
    </div>
  )
}
