'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getClusterNames, updateClusterNames } from '@/lib/api'
import { 
  Loader2, 
  Save, 
  RefreshCw, 
  Sparkles,
  Database,
  AlertCircle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function NamingClusters({ datasetName }) {
  const [clusterData, setClusterData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [clusterMappings, setClusterMappings] = useState({})
  const [originalMappings, setOriginalMappings] = useState({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchClusterNames()
  }, [datasetName])

  const fetchClusterNames = async () => {
    if (!datasetName) return

    try {
      setLoading(true)
      setError(null)
      
      const data = await getClusterNames(datasetName)
      setClusterData(data)

      // Buat mappings secara dinamis dari keys yang ada di data
      const dynamicMappings = {}
      const dynamicOriginalMappings = {}

      Object.keys(data).forEach(key => {
        const clusters = [...new Set(data[key] || [])]
        dynamicMappings[key] = {}
        
        clusters.forEach(cluster => {
          dynamicMappings[key][cluster] = cluster
        })
        
        dynamicOriginalMappings[key] = { ...dynamicMappings[key] }
      })

      setClusterMappings(dynamicMappings)
      setOriginalMappings(dynamicOriginalMappings)

    } catch (err) {
      console.error('Error fetching cluster names:', err)
      setError(err.message || 'Failed to fetch cluster names')
      toast.error('Failed to fetch cluster names')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (type, originalName, newName) => {
    setClusterMappings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [originalName]: newName
      }
    }))

    const currentValue = newName
    const originalValue = originalMappings[type][originalName]
    setHasChanges(currentValue !== originalValue)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      await updateClusterNames(datasetName, clusterMappings)
      
      toast.success('Cluster names updated successfully!')
      
      setOriginalMappings(prevOriginals => {
        const newOriginals = {}
        Object.keys(clusterMappings).forEach(key => {
          newOriginals[key] = { ...clusterMappings[key] }
        })
        return newOriginals
      })
      setHasChanges(false)

    } catch (err) {
      console.error('Error updating cluster names:', err)
      toast.error(err.message || 'Failed to update cluster names')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const resetMappings = {}
    Object.keys(originalMappings).forEach(key => {
      resetMappings[key] = { ...originalMappings[key] }
    })
    setClusterMappings(resetMappings)
    setHasChanges(false)
    toast.info('Changes reset to original values')
  }

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 text-[#206bc4] animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Loading Cluster Data...
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Please wait while we fetch the cluster information
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-sm border-red-200 dark:border-red-800">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Error Loading Clusters
              </h3>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
            <Button onClick={fetchClusterNames} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get semua keys yang tersedia secara dinamis
  const clusterKeys = Object.keys(clusterMappings)

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Cluster Name Management</CardTitle>
            <CardDescription className="text-sm mt-1">
              Manage custom names for your clusters to make them more meaningful and easier to understand.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {clusterKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No cluster data available</p>
          </div>
        ) : (
          <div className="space-y-8">
            {clusterKeys.map((clusterType) => (
              <div key={clusterType} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {clusterType.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {Object.keys(clusterMappings[clusterType] || {}).length} clusters
                  </span>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(clusterMappings[clusterType] || {}).map((clusterName) => (
                    <div key={clusterName} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-24 truncate">
                        {clusterName}:
                      </span>
                      <Input
                        value={clusterMappings[clusterType][clusterName]}
                        onChange={(e) => handleInputChange(clusterType, clusterName, e.target.value)}
                        placeholder="Enter cluster name..."
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {hasChanges && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
