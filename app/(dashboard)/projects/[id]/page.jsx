'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge, StatusBadgeMedium, StatusBadgeSmall } from '@/components/status-badge'
import { LogViewer } from '@/components/log-viewer'
import { Separator } from "@/components/ui/separator"
import RealtimeRegressionChart from '@/components/realtime-regression'
import DynamicModelPerformanceChart from '@/components/model-performances'
import RealtimeClusteringChart from '@/components/realtime-clustering'
import HistoryClusteringChart from "@/components/history-clustering"
import HistoryRegression from "@/components/history-regression"
import HistoryForecast from "@/components/history-forecast"
import RealtimeForecast from '@/components/realtime-forecast'
import NamingClusters from '@/components/naming_clusters'
import RealtimeAnomaly from '@/components/realtime-anomaly'
import HistoryAnomaly from '@/components/history-anomaly'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Calendar,
  Database, Target,
  TrendingUp, StopCircle,
  RefreshCw, Download,
  CheckCircle2, List, Clock,ChevronsUp,BrainCog,SquareDashedKanban,
  Play
} from 'lucide-react'
import { getProjectDetail, mockLogs } from '@/lib/mock-data'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { getDataset, startTask, stopTask } from '@/lib/api'

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter()
  const [isStoppingJob, setIsStoppingJob] = useState(false)
  const [isStartingJob, setIsStartingJob] = useState(false)
  const project = getProjectDetail(params.id)
  const [dataset, setDatasets] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch data
  useEffect(() => {
    let isMounted = true

    const fetchDataset = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getDataset(params.id)
        if (isMounted) {
          setDatasets(data || {})
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading projects:", err)
          setError(err.message || "Gagal memuat proyek")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDataset()

    return () => {
      isMounted = false
    }
  }, [params.id])

  const handleToggleJob = async () => {
    const isWorkerRunning = dataset.status === 'ACTIVE'
    
    if (isWorkerRunning) {
      // Stop worker
      setIsStoppingJob(true)
      try {
        await stopTask(dataset.names,dataset.task_type)
        toast.success('Worker stopped successfully')
        // Refresh dataset data
        const data = await getDataset(params.id)
        setDatasets(data)
      } catch (error) {
        console.error('Error stopping worker:', error)
        toast.error(error.message || 'Failed to stop worker')
      } finally {
        setIsStoppingJob(false)
      }
    } else {
      // Start worker
      setIsStartingJob(true)
      try {
        await startTask(dataset.names,dataset.task_type)
        toast.success('Worker started successfully')
        // Refresh dataset data
        const data = await getDataset(params.id)
        setDatasets(data)
      } catch (error) {
        console.error('Error starting worker:', error)
        toast.error(error.message || 'Failed to start worker')
      } finally {
        setIsStartingJob(false)
      }
    }
  }

  const handleRetrigger = () => {
    toast.success('Job retriggered successfully')
  }

  const isRunning = project.status === 'running'
  const isCompleted = project.status === 'completed'

  if (!dataset) {
    console.log(dataset)
    return <div className="py-20 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {dataset.description} 
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Project ID: {dataset.names}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleJob}
            disabled={isStoppingJob || isStartingJob}
            className={dataset.status === 'ACTIVE' 
              ? "border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-900/30" 
              : "border-green-200 hover:border-green-300 hover:bg-green-50 dark:border-green-800 dark:hover:border-green-700 dark:hover:bg-green-900/30"
            }
          >
            {dataset.status === 'ACTIVE' ? (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                {isStoppingJob ? 'Stopping...' : 'Stop Worker'}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {isStartingJob ? 'Starting...' : 'Start Worker'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleRetrigger}
            disabled={isRunning}
          >
            <BrainCog className="mr-2 h-4 w-4" />
            Rebuild
          </Button>
          <Button className="bg-[#206bc4] hover:bg-[#1a5ba3]" disabled={!isCompleted}>
            {/* <ChevronsUp className="mr-2 h-4 w-4" /> */}
            <SquareDashedKanban className= "mr-2 h-4 w-4"/>
            Retrain
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatusBadgeMedium status={dataset.status} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Model
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {dataset.top_model || '-'}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Target Column
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-base">
              {dataset.target}
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {(() => {
                switch (dataset.task_type) {
                  case 'Regression':
                    return 'Best MAE'
                  case 'Classification':
                    return 'Best Accuracy'
                  case 'Clustering':
                    return 'Best Silhouette Score'
                  case 'Time Series':
                    return 'Best MAE'
                  default:
                    return 'Best Score'
                }
              })()}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const bestModel = dataset.models?.[0] // model terbaik biasanya yang pertama
                if (!bestModel?.evaluation) return <span className="text-gray-400">-</span>

                switch (dataset.task_type) {
                  case 'Regression':
                  case 'Time Series':
                    const mae = bestModel.evaluation.MAE
                    return mae != null ? (
                      <span className="text-emerald-600">{mae.toFixed(4)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )

                  case 'Classification':
                    const acc = bestModel.evaluation.Accuracy ?? bestModel.evaluation.F1
                    return acc != null ? (
                      <span className="text-blue-600">{(acc * 100).toFixed(2)}%</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )

                  case 'Clustering':
                    const silhouette = bestModel.evaluation.Silhouette
                    return silhouette != null ? (
                      <span className="text-purple-600">{silhouette.toFixed(4)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )

                  case 'TimeSeries':
                    const mae_ = bestModel.evaluation.MAE
                    return mae_ != null ? (
                      <span className="text-purple-600">{mae_.toFixed(4)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )

                  default:
                    return <span className="text-gray-400">N/A</span>
                }
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          {dataset.top_model && dataset.task_type !== 'TimeSeries' && (
            <TabsTrigger value="predictions">
              {(() => {
                switch (dataset.task_type) {
                  case 'Regression':
                  case 'Classification':
                    return 'Realtime Predictions'
                  case 'Clustering':
                    return 'Realtime Clustering'
                  default:
                    return 'Unknown'
                }
              })()}
            </TabsTrigger>
          )}
          {dataset.top_model && (
            <TabsTrigger value="History">
              {(() => {
                switch (dataset.task_type) {
                  case 'Regression':
                  case 'Classification':
                    return 'History Predictions'
                  case 'Clustering':
                    return 'History Clusters'
                  case 'TimeSeries':
                    return 'Forecast'
                  default:
                    return 'Unknown'
                }
              })()}
            </TabsTrigger>
          )}
          {dataset.task_type === "Clustering" && (
            <TabsTrigger value="naming_cluster">Naming Cluster</TabsTrigger>
          )}

          <TabsTrigger value="realtime_anomaly">Realtime Anomaly</TabsTrigger>
          <TabsTrigger value="history_anomaly">Anomaly</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Problem Type
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {dataset.task_type}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Created At
                  </p>
                  <p className="text-lg font-semibold">
                    {dataset.meta?.created_at ? (
                      format(parseISO(dataset.meta.created_at), 'dd MMMM yyyy, HH:mm:ss')
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Start Date
                  </p>
                  {(() => {
                    const value = dataset.start_date

                    if (!value || value === '00000000' || value === '') {
                      return <span className="text-lg font-semibold text-gray-400">-</span>
                    }

                    const str = value.toString().trim()
                    if (str.length !== 8 || !/^\d{8}$/.test(str)) {
                      return <span className="text-lg font-semibold text-red-500">Invalid Date</span>
                    }

                    const year = str.slice(0, 4)
                    const monthNum = parseInt(str.slice(4, 6), 10)
                    const day = str.slice(6, 8)

                    if (monthNum < 1 || monthNum > 12) {
                      return <span className="text-lg font-semibold text-red-500">Invalid Month</span>
                    }

                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

                    return (
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {day} {months[monthNum - 1]} {year}
                      </p>
                    )
                  })()}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    End Date
                  </p>
                  {(() => {
                    const value = dataset.end_date

                    if (!value || value === '00000000' || value === '') {
                      return <span className="text-lg font-semibold text-gray-400">-</span>
                    }

                    const str = value.toString().trim()
                    if (str.length !== 8 || !/^\d{8}$/.test(str)) {
                      return <span className="text-lg font-semibold text-red-500">Invalid Date</span>
                    }

                    const year = str.slice(0, 4)
                    const monthNum = parseInt(str.slice(4, 6), 10)
                    const day = str.slice(6, 8)

                    if (monthNum < 1 || monthNum > 12) {
                      return <span className="text-lg font-semibold text-red-500">Invalid Month</span>
                    }

                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

                    return (
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {day} {months[monthNum - 1]} {year}
                      </p>
                    )
                  })()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Number of Rows
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {dataset.meta?.n_rows ? dataset.meta.n_rows : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Number of Columns
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {dataset.meta?.n_cols ? dataset.meta.n_cols : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Number of Models
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {dataset.n_models}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Description
                </p>
                <p className="text-gray-900 dark:text-white">
                  {dataset.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <List className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Features & Target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Features ({dataset.features?.length || 0} column{dataset.features?.length !== 1 ? 's' : ''})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dataset.features && dataset.features.length > 0 ? (
                    dataset.features.map((featureId) => (
                      <Badge
                        key={featureId}
                        variant="outline"
                        className="font-mono text-xs px-3 py-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                      >
                        {featureId}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">Tidak ada feature</span>
                  )}
                </div>
              </div>

              <Separator className="my-4" />
              {/* Target */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Target Column</p>
                </div>
                <div>
                  {dataset.target ? (
                    <Badge
                      variant="default"
                      className="font-mono text-sm px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700"
                    >
                      {dataset.target}
                    </Badge>
                  ) : dataset.task_type === 'Clustering' ? (
                    <Badge variant="secondary" className="text-sm">
                      n_clusters (tidak ada target column)
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-500 italic">-</span>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Metadata (Created At, dll) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Pulling Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {dataset.meta?.pulling_time
                        ? dataset.meta.pulling_time.toFixed(2)
                        : '-'
                      } Seconds
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Training Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {dataset.meta?.train_time
                        ? dataset.meta.train_time.toFixed(2)
                        : '-'
                      } Seconds
                    </p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Preprocessing Information */}
          <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Preprocessing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dataset.preprocessing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Missing Value Handling
                    </p>
                    <Badge variant="outline" className="text-sm">
                      {dataset.preprocessing.missing_handling || '-'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Outlier Handling
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dataset.preprocessing.outlier_handling ? 'True' : 'False'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Scale
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dataset.preprocessing.scale ? 'True' : 'False'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Dimensionality Reduction
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dataset.preprocessing.dim_reduce ? 'True' : 'False'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Interval Finetune
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dataset.preprocessing.interval_finetune}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Retention
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dataset.preprocessing.retention}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500 italic">
                    No preprocessing configuration available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>
                Performance metrics for all trained models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Training Time</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataset.models?.map((model, index) => (
                    <TableRow key={model.name}>
                      {/* Nama Model + Badge "Best" untuk model pertama */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              Best
                            </Badge>
                          )}
                          <span>{model.name}</span>
                        </div>
                      </TableCell>

                      {/* Algorithm */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {model.algorithm}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium fw-bold text-green-600">
                          {model.description}
                        </span>
                      </TableCell>

                      {/* Training Time */}
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {model.evaluation?.["TT (Sec)"]
                          ? `${model.evaluation["TT (Sec)"].toFixed(3)}s`
                          : "-"}
                      </TableCell>

                      <TableCell>
                        <span className="font-medium text-dark-600">
                          {model.size} Kb
                        </span>
                      </TableCell>

                      {/* Status (kalau ada) */}
                      <TableCell>
                        <StatusBadgeSmall status={model.status || "completed"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-800/50 animate-fade-in overflow-hidden">
                <CardHeader className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-950/20">
                  <CardTitle className="text-xl font-bold tracking-tight">Model Performance</CardTitle>
                  <CardDescription className="font-medium">Comparison of different algorithms</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <DynamicModelPerformanceChart
                    task_type={dataset.task_type}
                    models={dataset.models}
                  />
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <LogViewer datasetName={dataset.names} height='700px' />
        </TabsContent>

        <TabsContent value="predictions">
          {activeTab === 'predictions' && dataset.names ? (
            dataset.task_type === 'Clustering' ? (
              <RealtimeClusteringChart datasetName={dataset.names} />
            ) : (
              <RealtimeRegressionChart dataset_name={dataset.names} />
            )
          ) : (
            <Card className="p-8 text-center">
              <p className="text-lg text-gray-500">Loading...</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="History">
          {!dataset.names ? (
            <Card className="p-8 text-center">
              <p className="text-lg text-gray-500">Loading...</p>
            </Card>
          ) : dataset.task_type === 'Clustering' ? (
            <HistoryClusteringChart datasetName={dataset.names} />
          ) : dataset.task_type === 'Regression' ? (
            <HistoryRegression datasetName={dataset.names} />
          ) : dataset.task_type === 'TimeSeries' ? (
            <HistoryForecast datasetName={dataset.names} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-lg text-gray-500">History not available for this task type</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="naming_cluster">
          {activeTab === 'naming_cluster' && dataset.names ? (
            <NamingClusters datasetName={dataset.names} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-lg text-gray-500">Loading...</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="realtime_anomaly">
          {activeTab === 'realtime_anomaly' && dataset.names ? (
            <RealtimeAnomaly dataset_name={dataset.names} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-lg text-gray-500">Loading...</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history_anomaly">
          {!dataset.names ? (
            <Card className="p-8 text-center">
              <p className="text-lg text-gray-500">Loading...</p>
            </Card>
          ) : (
            <HistoryAnomaly dataset_name={dataset.names} />
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
