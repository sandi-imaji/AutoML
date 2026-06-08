'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/file-upload'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Loader2, ArrowLeft, X, AlertCircle } from 'lucide-react'
import { sampleCSVData } from '@/lib/mock-data'
import { toast } from 'sonner'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LiveTagSearch } from "@/components/live-tag-search"

// from fetch API
import { searchTags, createDataset } from '@/lib/api'


export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    task_type: '',
    features: [], // Array of tag objects {row_id, tag_name}
    target: null, // Single tag object or null
    start_date: '',
    end_date: '',
    time_start: '00:00:00',
    time_end: '23:59:00',
    n_models: 0,
  })

  // Preprocessing state
  const [preprocessingEnabled, setPreprocessingEnabled] = useState(false)
  const [preprocessingData, setPreprocessingData] = useState({
    missing_handling: '',
    outlier_handling: '',
    interval_finetune: '',
    retention: '',
    scale: false,
    dim_reduce: false
  })

  // Store all available tags for "Select All" feature
  const [lastSearchResults, setLastSearchResults] = useState([])
  const [isAllSelected, setIsAllSelected] = useState(false)

  // Reset features & target when task_type changes
  useEffect(() => {
    setIsAllSelected(false)
    if (formData.task_type === 'Clustering') {
      setFormData(prev => ({
        ...prev,
        features: [],
        target: null,
      }))
    } else if (formData.task_type === 'TimeSeries') {
      setFormData(prev => ({
        ...prev,
        features: prev.features.slice(0, 1), // maksimal 1 feature
        target: null,
      }))
    } else {
      // Regression → reset ke normal
      setFormData(prev => ({
        ...prev,
        features: [],
        target: null,
      }))
    }
  }, [formData.task_type])

  // Live search function for tags
  const handleTagSearch = useCallback(async (query) => {
    try {
      const results = await searchTags(query)
      // Store the last search results for "Select All" functionality
      if (results && results.length > 0) {
        setLastSearchResults(results)
      }
      return results
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search tags')
      return []
    }
  }, [])

  const handleSelectAllFeatures = () => {
    if (lastSearchResults.length === 0) {
      toast.info('Please search for tags first')
      return
    }
    
    // Merge with existing selected features to avoid duplicates
    const existingIds = new Set(formData.features.map(f => f.row_id))
    const newResults = lastSearchResults.filter(r => !existingIds.has(r.row_id))
    const allSelected = [...formData.features, ...newResults]
    
    setIsAllSelected(true)
    setFormData(prev => ({ ...prev, features: allSelected }))
    toast.success(`Added ${newResults.length} features (Total: ${allSelected.length})`)
  }

  const handleClearAllFeatures = () => {
    setIsAllSelected(false)
    setLastSearchResults([])
    setFormData(prev => ({ ...prev, features: [] }))
  }

  const handleFeatureChange = (selectedTags) => {
    if (formData.task_type === 'TimeSeries' && Array.isArray(selectedTags) && selectedTags.length > 1) {
      // Time Series hanya boleh 1 feature
      selectedTags = selectedTags.slice(-1)
      toast.info('Time Series hanya boleh menggunakan 1 feature')
    }
    
    // Check if user manually selected all tags
    if (selectedTags.length === 0) {
      setIsAllSelected(false)
    } else if (isAllSelected && selectedTags.length !== allAvailableTags.length) {
      // User removed some tags after selecting all
      setIsAllSelected(false)
    }
    
    setFormData(prev => ({ ...prev, features: selectedTags || [] }))
  }

  const handleTargetChange = (selectedTag) => {
    // Remove target from features if exists
    const newFeatures = formData.features.filter(f => f.row_id !== selectedTag?.row_id)
    
    // If user manually removes tags after selecting all, update isAllSelected
    if (isAllSelected && newFeatures.length !== allAvailableTags.length) {
      setIsAllSelected(false)
    }
    
    setFormData(prev => ({
      ...prev,
      target: selectedTag,
      features: newFeatures
    }))
  }

  // Validation khusus per task_type
  const getValidationError = () => {
    if (!formData.description.trim()) return 'Description required'
    if (!formData.task_type) return 'Please select task type'
    if (!formData.start_date || !formData.end_date) return 'Date range required'
    if (new Date(formData.start_date) > new Date(formData.end_date)) return 'Start date must be before end date'

    if (formData.task_type === 'Regression') {
      if (formData.features.length === 0) return 'Select at least one feature'
      if (!formData.target) return 'Select a target column'
    }
    if (formData.task_type === 'Clustering') {
      if (formData.target < 2) return 'n_clusters minimal 2'
    }
    if (formData.task_type === 'Time Series') {
      if (formData.features.length !== 1) return 'Time Series harus punya tepat 1 feature'
      if (formData.target < 1) return 'Forecasting horizon minimal 1'
    }

    // Validasi preprocessing jika diaktifkan
    if (preprocessingEnabled) {
      if (!preprocessingData.missing_handling) return 'Handling Missing Value is required'
      if (!preprocessingData.outlier_handling) return 'Handling Outlier Value is required'
      if (preprocessingData.interval_finetune === '' || preprocessingData.interval_finetune === null || preprocessingData.interval_finetune === undefined) return 'Interval Finetune is required'
      if (preprocessingData.retention === '' || preprocessingData.retention === null || preprocessingData.retention === undefined) return 'Retention is required'
      if (preprocessingData.interval_finetune < 0 || preprocessingData.interval_finetune > 30) return 'Interval Finetune must be between 0 and 30'
      if (preprocessingData.retention < 0 || preprocessingData.retention > 30) return 'Retention must be between 0 and 30'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const error = getValidationError()
    if (error) {
      toast.error(error)
      return
    }

    setLoading(true)

    // Extract tag_names for features and target (backend expects tag names, not IDs)
    const featureNames = formData.features.map(f => f.tag_name)
    const targetName = formData.target?.tag_name || null

    const payload = {
      description: formData.description?.trim(),
      task_type: formData.task_type,
      features: featureNames,

      // SELALU kirim "target" → ini yang bikin backend senang
      target:
        formData.task_type === 'Clustering'
          ? null
          : formData.task_type === 'TimeSeries'
            ? parseInt(formData.target) || 30  // TimeSeries target is horizon (integer)
            : targetName,

      // Field khusus per task_type
      ...(formData.task_type === 'Clustering' && {
        target: parseInt(formData.target) || 3
      }),
      ...(formData.task_type === 'TimeSeries' && {
        target: parseInt(formData.target) || 30
      }),

      start_date: formData.start_date.replace(/-/g, ''),
      end_date: formData.end_date.replace(/-/g, ''),
      time_start: formData.time_start || null,
      time_end: formData.time_end || null,
      n_models: parseInt(formData.n_models) || 2,
      // Preprocessing data (hanya jika diaktifkan)
      ...(preprocessingEnabled && {
        preprocessing: {
          missing_handling: preprocessingData.missing_handling,
          outlier_handling: preprocessingData.outlier_handling,
          interval_finetune: parseInt(preprocessingData.interval_finetune),
          retention: parseInt(preprocessingData.retention),
          scale: preprocessingData.scale,
          dim_reduce: preprocessingData.dim_reduce
        }
      })
    };

    // ... submit logic
    try {
      await new Promise(r => setTimeout(r, 1500))
      await createDataset(payload)
      console.log(payload)
      toast.success('Project created!')
      router.push('/projects')
    } catch (err) {
      toast.error('Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl overflow-visible">
      {/* ... header tetap sama */}

      <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">

        {/* ==== PROJECT INFO ==== */}
        <Card className="glass-card shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Task Type *</Label>
              <Select value={formData.task_type} onValueChange={(v) => setFormData(prev => ({ ...prev, task_type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select task type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regression">Regression</SelectItem>
                  <SelectItem value="TimeSeries">Time Series</SelectItem>
                  <SelectItem value="Clustering">Clustering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="e.g., Sales Forecasting 2025"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* ==== FEATURES & TARGET SECTION ==== */}
        <Card className="glass-card shadow-xl overflow-visible">
          <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20">
            <CardTitle>
              {formData.task_type === 'Clustering' && 'Feature Selection & Number of Clusters'}
              {formData.task_type === 'TimeSeries' && 'Time Series Feature & Forecasting Horizon'}
              {(!formData.task_type || formData.task_type === 'Regression') && 'Feature Selection & Target'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 overflow-visible">

            {/* FEATURES — Live Search dengan Free Text */}
            {(formData.task_type === 'Regression' ||
              formData.task_type === 'Clustering' ||
              formData.task_type === 'TimeSeries') && (
                <div className="space-y-6 overflow-visible">

                  {/* JUDUL & COUNTER */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      {formData.task_type === 'TimeSeries'
                        ? 'Feature Column (only 1 allowed) *'
                        : 'Feature Selection (Type min 3 chars to search) *'
                      }
                    </Label>
                    {formData.task_type !== 'TimeSeries' && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {isAllSelected 
                            ? `All (${formData.features.length} tags selected)` 
                            : `${formData.features.length} selected`
                          }
                        </span>
                        <div className="flex items-center gap-1">
                          {lastSearchResults.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleSelectAllFeatures}
                              disabled={loading}
                              className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Select All ({lastSearchResults.length})
                            </Button>
                          )}
                          {formData.features.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleClearAllFeatures}
                              disabled={loading}
                              className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LIVE SEARCH FEATURES */}
                  {formData.task_type === 'TimeSeries' && (
                    <LiveTagSearch
                      value={formData.features[0] || null}
                      onChange={(tag) => handleFeatureChange(tag ? [tag] : [])}
                      onSearch={handleTagSearch}
                      placeholder="Type min 3 chars to search (e.g., cra, pdu...)"
                      multi={false}
                      disabled={loading}
                    />
                  )}

                  {(formData.task_type === 'Regression' || formData.task_type === 'Clustering') && (
                    <div className="space-y-2">
                      <LiveTagSearch
                        value={formData.features}
                        onChange={handleFeatureChange}
                        onSearch={handleTagSearch}
                        placeholder="Type min 3 chars to search (e.g., cra, pdu...)"
                        multi={true}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {/* Info tambahan */}
                  {formData.task_type === 'TimeSeries' && formData.features.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      ✓ Feature selected: {formData.features[0]?.tag_name}
                    </p>
                  )}
                </div>
              )}

            {/* TARGET KHUSUS PER TASK TYPE */}

            {/* 1. REGRESSION → Live Search Target */}
            {formData.task_type === 'Regression' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Target *</Label>
                <LiveTagSearch
                  value={formData.target}
                  onChange={handleTargetChange}
                  onSearch={handleTagSearch}
                  placeholder="Type min 3 chars to search target tag..."
                  multi={false}
                  disabled={loading}
                />
                {formData.target && (
                  <Badge className="mt-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                    Target: {formData.target.tag_name}
                  </Badge>
                )}
              </div>
            )}

            {/* 2. CLUSTERING → input n_clusters */}
            {formData.task_type === 'Clustering' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Number of Cluster (n_clusters) *</Label>
                <Input
                  type="number"
                  min="2"
                  max="50"
                  value={formData.target || 3}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    target: Math.max(2, parseInt(e.target.value) || 2)
                  }))}
                  className="w-full rounded-xl"
                  placeholder="Example: 5"
                />
                <p className="text-xs text-gray-500">
                  Determine how many groups you want to create (minimum 2)
                </p>
              </div>
            )}

            {/* 3. TIME SERIES → forecasting horizon */}
            {formData.task_type === 'TimeSeries' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Forecasting Horizon (future predictive steps) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.target || 30}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    target: Math.max(1, parseInt(e.target.value) || 1)
                  }))}
                  className="w-full rounded-xl"
                  placeholder="Example: 7 (predict 7 days ahead)"
                />
                <p className="text-xs text-gray-500">
                  How many periods into the future do you want to predict?
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* ==== DATE & TIME ==== */}
        <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-950/20">
            <CardTitle className="text-xl font-bold tracking-tight">Date & Time Configuration</CardTitle>
            <CardDescription className="font-medium">
              Set date range and time intervals for training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm font-semibold">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-sm font-semibold">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time_start" className="text-sm font-semibold">Start Time</Label>
                <Input
                  id="time_start"
                  type="time"
                  step="1"
                  value={formData.time_start}
                  onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_end" className="text-sm font-semibold">End Time</Label>
                <Input
                  id="time_end"
                  type="time"
                  step="1"
                  value={formData.time_end}
                  onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="n_models" className="text-sm font-semibold">Models</Label>
              <Input
                id="n_models"
                type="number"
                min="0"
                value={formData.n_models}
                onChange={(e) => setFormData({ ...formData, n_models: e.target.value })}
                placeholder="0"
                className="rounded-xl"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Number Of Top Models
              </p>
            </div>
          </CardContent>
        </Card>
        {/* Tetap sama seperti sebelumnya */}

        {/* ==== PREPROCESSING TOGGLE & CARD ==== */}
        <div className="space-y-4">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Dataset Preprocessing</Label>
              <p className="text-sm text-muted-foreground">
                Enable advanced preprocessing options for your dataset
              </p>
            </div>
            <Switch
              checked={preprocessingEnabled}
              onCheckedChange={setPreprocessingEnabled}
            />
          </div>

          {/* Preprocessing Card Form */}
          {preprocessingEnabled && (
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-800/50">
              <CardHeader className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
                <CardTitle className="text-xl font-bold tracking-tight">Dataset Preprocessing Configuration</CardTitle>
                <CardDescription className="font-medium">
                  Configure how to handle missing values, outliers, and data intervals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Handling Missing Value */}
                  <div className="space-y-2">
                    <Label htmlFor="missing_handling" className="text-sm font-semibold">
                      Handling Missing Value <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={preprocessingData.missing_handling}
                      onValueChange={(value) => setPreprocessingData(prev => ({ ...prev, missing_handling: value }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REMOVE">REMOVE</SelectItem>
                        <SelectItem value="MEAN">MEAN</SelectItem>
                        <SelectItem value="MEDIAN">MEDIAN</SelectItem>
                        <SelectItem value="MAX">MAX</SelectItem>
                        <SelectItem value="MIN">MIN</SelectItem>
                        <SelectItem value="NEIGHBOR_VALUE">NEIGHBOR_VALUE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Handling Outlier Value */}
                  <div className="space-y-2">
                    <Label htmlFor="outlier_handling" className="text-sm font-semibold">
                      Remove Outliers <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={preprocessingData.outlier_handling}
                      onValueChange={(value) => setPreprocessingData(prev => ({ ...prev, outlier_handling: value }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                        {/* <SelectItem value="MEAN">MEAN</SelectItem> */}
                        {/* <SelectItem value="MEDIAN">MEDIAN</SelectItem> */}
                        {/* <SelectItem value="MAX">MAX</SelectItem> */}
                        {/* <SelectItem value="MIN">MIN</SelectItem> */}
                        {/* <SelectItem value="NEIGHBOR_VALUE">NEIGHBOR_VALUE</SelectItem> */}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Interval Finetune */}
                  <div className="space-y-2">
                    <Label htmlFor="interval_finetune" className="text-sm font-semibold">
                      Interval Finetune (Day)<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="interval_finetune"
                      type="number"
                      min="1"
                      max="31"
                      value={preprocessingData.interval_finetune}
                      onChange={(e) => setPreprocessingData(prev => ({ 
                        ...prev, 
                        interval_finetune: e.target.value === '' ? '' : Math.max(0, Math.min(30, parseInt(e.target.value) || 0))
                      }))}
                      placeholder="1 - 31"
                      className="rounded-xl"
                    />
                    <p className="text-xs text-gray-500">
                      Value must be between 1 and 31
                    </p>
                  </div>

                  {/* Retention */}
                  <div className="space-y-2">
                    <Label htmlFor="retention" className="text-sm font-semibold">
                      Retention <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="retention"
                      type="number"
                      min="1"
                      max="7"
                      value={preprocessingData.retention}
                      onChange={(e) => setPreprocessingData(prev => ({ 
                        ...prev, 
                        retention: e.target.value === '' ? '' : Math.max(0, Math.min(30, parseInt(e.target.value) || 0))
                      }))}
                      placeholder="1 - 7"
                      className="rounded-xl"
                    />
                    <p className="text-xs text-gray-500">
                      Value must be between 1 and 7
                    </p>
                  </div>

                  {/* Scale */}
                  <div className="space-y-2">
                    <Label htmlFor="scale" className="text-sm font-semibold">
                      Scale
                    </Label>
                    <Select
                      value={preprocessingData.scale ? "true" : "false"}
                      onValueChange={(value) => setPreprocessingData(prev => ({ ...prev, scale: value === "true" }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Enable feature scaling
                    </p>
                  </div>

                  {/* Dimensionality Reduction */}
                  <div className="space-y-2">
                    <Label htmlFor="dim_reduce" className="text-sm font-semibold">
                      Dimensionality Reduction
                    </Label>
                    <Select
                      value={preprocessingData.dim_reduce ? "true" : "false"}
                      onValueChange={(value) => setPreprocessingData(prev => ({ ...prev, dim_reduce: value === "true" }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Enable dimensionality reduction
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ==== SUBMIT BUTTONS ==== */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="btn-gradient text-white rounded-xl">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/projects">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
