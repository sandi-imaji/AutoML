'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Loader2, ArrowLeft, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LiveTagSearch } from "@/components/live-tag-search"

// API imports
import { searchTags, createDataset, deleteDataset, getDataset } from '@/lib/api'

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const datasetName = params.id
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [originalDataset, setOriginalDataset] = useState(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  const [formData, setFormData] = useState({
    description: '',
    task_type: '',
    features: [],
    target: null,
    start_date: '',
    end_date: '',
    time_start: '00:00:00',
    time_end: '23:59:00',
    n_models: 5,
  })

  // Fetch existing dataset data
  useEffect(() => {
    const fetchDataset = async () => {
      try {
        setFetching(true)
        const data = await getDataset(datasetName)
        setOriginalDataset(data)
        
        // Parse dates from format YYYYMMDD to YYYY-MM-DD
        const formatDate = (dateStr) => {
          if (!dateStr || dateStr === '00000000') return ''
          const year = dateStr.slice(0, 4)
          const month = dateStr.slice(4, 6)
          const day = dateStr.slice(6, 8)
          return `${year}-${month}-${day}`
        }
        
        // Convert features and target to tag objects format
        const featureTags = (data.features || []).map((tag, idx) => ({
          row_id: idx,
          tag_name: tag
        }))
        
        let targetTag = null
        if (data.target && data.task_type === 'Regression') {
          targetTag = {
            row_id: 999,
            tag_name: data.target
          }
        }
        
        setFormData({
          description: data.description || '',
          task_type: data.task_type || '',
          features: featureTags,
          target: data.task_type === 'Clustering' || data.task_type === 'TimeSeries' 
            ? parseInt(data.target) || 3 
            : targetTag,
          start_date: formatDate(data.start_date),
          end_date: formatDate(data.end_date),
          time_start: data.time_start || '00:00:00',
          time_end: data.time_end || '23:59:00',
          n_models: data.n_models || 5,
        })
        setIsInitialLoad(false)
      } catch (err) {
        console.error('Error fetching dataset:', err)
        toast.error('Failed to load dataset data')
        router.push('/projects')
      } finally {
        setFetching(false)
      }
    }
    
    if (datasetName) {
      fetchDataset()
    }
  }, [datasetName, router])

  // Reset features & target when task_type changes (only for user changes, not initial load)
  useEffect(() => {
    if (isInitialLoad) return
    
    if (formData.task_type === 'Clustering') {
      setFormData(prev => ({
        ...prev,
        features: [],
        target: 3,
      }))
    } else if (formData.task_type === 'TimeSeries') {
      setFormData(prev => ({
        ...prev,
        features: prev.features.slice(0, 1),
        target: 30,
      }))
    }
  }, [formData.task_type, isInitialLoad])

  // Live search function for tags
  const handleTagSearch = useCallback(async (query) => {
    try {
      const results = await searchTags(query)
      return results
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search tags')
      return []
    }
  }, [])

  const handleFeatureChange = (selectedTags) => {
    if (formData.task_type === 'TimeSeries' && Array.isArray(selectedTags) && selectedTags.length > 1) {
      selectedTags = selectedTags.slice(-1)
      toast.info('Time Series hanya boleh menggunakan 1 feature')
    }
    setFormData(prev => ({ ...prev, features: selectedTags || [] }))
  }

  const handleTargetChange = (selectedTag) => {
    const newFeatures = formData.features.filter(f => f.row_id !== selectedTag?.row_id)
    setFormData(prev => ({
      ...prev,
      target: selectedTag,
      features: newFeatures
    }))
  }

  // Validation
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

    try {
      // Step 1: Delete original dataset
      await deleteDataset(datasetName)
      toast.success('Original dataset deleted')
      
      // Step 2: Prepare payload for new dataset
      const featureNames = formData.features.map(f => f.tag_name)
      const targetName = formData.target?.tag_name || null

      const payload = {
        description: formData.description?.trim(),
        task_type: formData.task_type,
        features: featureNames,
        target:
          formData.task_type === 'Clustering'
            ? parseInt(formData.target) || 3
            : formData.task_type === 'TimeSeries'
              ? parseInt(formData.target) || 30
              : targetName,
        start_date: formData.start_date.replace(/-/g, ''),
        end_date: formData.end_date.replace(/-/g, ''),
        time_start: formData.time_start || null,
        time_end: formData.time_end || null,
        n_models: parseInt(formData.n_models) || 5
      }

      // Step 3: Create new dataset with edited data
      await createDataset(payload)
      toast.success('Dataset updated successfully!')
      router.push('/projects')
    } catch (err) {
      console.error('Error updating dataset:', err)
      toast.error(err.message || 'Failed to update dataset')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg text-gray-600">Loading dataset...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl overflow-visible">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${datasetName}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Task
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Editing: {originalDataset?.names}
          </p>
        </div>
      </div>

      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Editing will delete the original dataset and create a new one with your changes.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">
        {/* Project Info */}
        <Card className="glass-card shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Task Type *</Label>
              <Select 
                value={formData.task_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, task_type: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
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

        {/* Features & Target */}
        <Card className="glass-card shadow-xl overflow-visible">
          <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20">
            <CardTitle>
              {formData.task_type === 'Clustering' && 'Feature Selection & Number of Clusters'}
              {formData.task_type === 'TimeSeries' && 'Time Series Feature & Forecasting Horizon'}
              {(!formData.task_type || formData.task_type === 'Regression') && 'Feature Selection & Target'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 overflow-visible">
            {/* Features */}
            {(formData.task_type === 'Regression' ||
              formData.task_type === 'Clustering' ||
              formData.task_type === 'TimeSeries') && (
                <div className="space-y-6 overflow-visible">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      {formData.task_type === 'TimeSeries'
                        ? 'Feature Column (only 1 allowed) *'
                        : 'Feature Selection (Type min 3 chars to search) *'
                      }
                    </Label>
                    {formData.task_type !== 'TimeSeries' && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {formData.features.length} selected
                      </span>
                    )}
                  </div>
                  
                  <LiveTagSearch
                    onSearch={handleTagSearch}
                    value={formData.features}
                    onChange={handleFeatureChange}
                    placeholder="Type to search tags..."
                    disabled={!formData.task_type}
                    multi
                  />
                </div>
            )}

            {/* Target */}
            {formData.task_type === 'Regression' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Target Column *</Label>
                <LiveTagSearch
                  onSearch={handleTagSearch}
                  value={formData.target}
                  onChange={handleTargetChange}
                  placeholder="Search target column..."
                />
              </div>
            )}

            {/* Clustering: n_clusters input */}
            {formData.task_type === 'Clustering' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Number of Clusters *</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={formData.target}
                  onChange={e => setFormData(prev => ({ ...prev, target: parseInt(e.target.value) || 3 }))}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">Choose between 2-20 clusters</p>
              </div>
            )}

            {/* TimeSeries: horizon input */}
            {formData.task_type === 'TimeSeries' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Forecasting Horizon *</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={formData.target}
                  onChange={e => setFormData(prev => ({ ...prev, target: parseInt(e.target.value) || 30 }))}
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">Number of periods to forecast (1-365)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card className="glass-card shadow-xl">
          <CardHeader className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-950/20">
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <Card className="glass-card shadow-xl">
            <CollapsibleTrigger asChild>
              <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 cursor-pointer hover:bg-amber-100/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle>Advanced Settings</CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label>Number of Models</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.n_models}
                    onChange={e => setFormData(prev => ({ ...prev, n_models: parseInt(e.target.value) || 5 }))}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-gray-500">Number of models to train (1-20)</p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/projects/${datasetName}`)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#206bc4] hover:bg-[#1a5ba3]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
