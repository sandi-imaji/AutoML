'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Play,
  Square,
  Trash2,
  RefreshCw,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { getWorkersTasks, startWorkerTask, stopWorkerTask, deleteWorkerTask } from '@/lib/api'
import { StatusBadgeSmall } from '@/components/status-badge'

// Format memory from bytes to human readable
function formatMemory(bytes) {
  if (!bytes || bytes === 0) return '0 MB'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

// Format CPU percentage
function formatCPU(cpu) {
  if (cpu === null || cpu === undefined) return '0%'
  return `${cpu.toFixed(1)}%`
}

// Format uptime to "2 hours ago"
function formatUptime(timestamp) {
  if (!timestamp) return 'N/A'
  try {
    return formatDistanceToNow(timestamp, { addSuffix: true })
  } catch {
    return 'N/A'
  }
}

// Format created_at timestamp
function formatCreatedAt(timestamp) {
  if (!timestamp) return 'N/A'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'N/A'
  }
}

export default function WorkersPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  // Dialog states
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  // Fetch tasks
  const fetchTasks = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true)
      const data = await getWorkersTasks()
      setTasks(Array.isArray(data) ? data : [])
      if (showToast) {
        toast.success('Tasks refreshed successfully')
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
      toast.error(err.message || 'Failed to fetch tasks')
      setTasks([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Handle Start Task
  const handleStartClick = (task) => {
    setSelectedTask(task)
    setStartDialogOpen(true)
  }

  const handleConfirmStart = async () => {
    if (!selectedTask) return

    setActionLoading(prev => ({ ...prev, [selectedTask.name]: 'start' }))
    try {
      await startWorkerTask(selectedTask.name)
      toast.success(`Task "${selectedTask.name}" started successfully`)
      setStartDialogOpen(false)
      setSelectedTask(null)
      await fetchTasks()
    } catch (err) {
      console.error('Error starting task:', err)
      toast.error(err.message || 'Failed to start task')
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedTask.name]: null }))
    }
  }

  // Handle Stop Task
  const handleStopClick = (task) => {
    setSelectedTask(task)
    setStopDialogOpen(true)
  }

  const handleConfirmStop = async () => {
    if (!selectedTask) return

    setActionLoading(prev => ({ ...prev, [selectedTask.name]: 'stop' }))
    try {
      await stopWorkerTask(selectedTask.name)
      toast.success(`Task "${selectedTask.name}" stopped successfully`)
      setStopDialogOpen(false)
      setSelectedTask(null)
      await fetchTasks()
    } catch (err) {
      console.error('Error stopping task:', err)
      toast.error(err.message || 'Failed to stop task')
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedTask.name]: null }))
    }
  }

  // Handle Delete Task
  const handleDeleteClick = (task) => {
    setSelectedTask(task)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedTask) return

    setActionLoading(prev => ({ ...prev, [selectedTask.name]: 'delete' }))
    try {
      await deleteWorkerTask(selectedTask.name)
      toast.success(`Task "${selectedTask.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      setSelectedTask(null)
      await fetchTasks()
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error(err.message || 'Failed to delete task')
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedTask.name]: null }))
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const online = tasks.filter(t => t.status?.toLowerCase() === 'online').length
    const stopped = tasks.filter(t => t.status?.toLowerCase() === 'stopped').length
    const totalMemory = tasks.reduce((acc, t) => acc + (t.memory || 0), 0)
    return { total: tasks.length, online, stopped, totalMemory }
  }, [tasks])

  // Table columns
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Task Name',
      cell: ({ row }) => (
        <div className="font-semibold text-gray-900 dark:text-white">
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'dataset_name',
      header: 'Dataset',
      cell: ({ row }) => (
        <div className="text-gray-700 dark:text-gray-300">
          {row.getValue('dataset_name') || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'task_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('task_type')
        return (
          <Badge variant="outline" className="font-medium border-gray-300 dark:border-gray-600">
            {type || 'Unknown'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status')
        const normalizedStatus = status?.toUpperCase() || 'STOPPED'
        return <StatusBadgeSmall status={normalizedStatus} />
      },
    },
    {
      accessorKey: 'pid',
      header: 'PID',
      cell: ({ row }) => (
        <div className="text-gray-600 dark:text-gray-400 font-mono text-sm">
          {row.getValue('pid') || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'memory',
      header: 'Memory',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <HardDrive className="h-3.5 w-3.5 text-gray-400" />
          {formatMemory(row.getValue('memory'))}
        </div>
      ),
    },
    {
      accessorKey: 'cpu',
      header: 'CPU',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <Cpu className="h-3.5 w-3.5 text-gray-400" />
          {formatCPU(row.getValue('cpu'))}
        </div>
      ),
    },
    {
      accessorKey: 'uptime',
      header: 'Uptime',
      cell: ({ row }) => {
        const uptime = row.original.uptime
        const createdAt = row.original.created_at
        return (
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-sm">
            <Clock className="h-3.5 w-3.5" />
            {uptime ? formatUptime(uptime) : formatUptime(createdAt)}
          </div>
        )
      },
    },
    {
      accessorKey: 'restarts',
      header: 'Restarts',
      cell: ({ row }) => (
        <div className="text-gray-600 dark:text-gray-400">
          {row.getValue('restarts') || 0}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const task = row.original
        const status = task.status?.toLowerCase()
        const isLoading = actionLoading[task.name]

        return (
          <div className="flex items-center gap-2">
            {status === 'stopped' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartClick(task)}
                disabled={isLoading}
                className="h-8 px-2.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
              >
                {isLoading === 'start' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1" />
                )}
                Start
              </Button>
            )}

            {status === 'online' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStopClick(task)}
                disabled={isLoading}
                className="h-8 px-2.5 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950/30"
              >
                {isLoading === 'stop' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5 mr-1 fill-current" />
                )}
                Stop
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteClick(task)}
              disabled={isLoading}
              className="h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
            >
              {isLoading === 'delete' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1" />
              )}
              Delete
            </Button>
          </div>
        )
      },
    },
  ], [actionLoading])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Workers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-medium">
            Manage and monitor your background task workers
          </p>
        </div>
        <Button
          onClick={() => fetchTasks(true)}
          disabled={refreshing}
          className="btn-gradient text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="gradient-card-1 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200/50 dark:border-gray-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Total Tasks
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
              <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white tracking-tighter">
              {stats.total}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              All worker tasks
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card-2 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200/50 dark:border-gray-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Online
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tighter">
              {stats.online}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Active workers
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card-3 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200/50 dark:border-gray-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Stopped
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
              <Square className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600 dark:text-gray-400 tracking-tighter">
              {stats.stopped}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Inactive workers
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card-4 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200/50 dark:border-gray-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Total Memory
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
              <HardDrive className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-600 dark:text-violet-400 tracking-tighter">
              {formatMemory(stats.totalMemory)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Memory usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-800/50">
        <CardHeader className="border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-900/50">
          <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            Worker Tasks
          </CardTitle>
          <CardDescription className="font-medium">
            View and manage all background worker tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Server className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                No tasks found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                There are no worker tasks running. Create a new project to start a task.
              </p>
            </div>
          ) : (
            <DataTable columns={columns} data={tasks} searchKey="name" />
          )}
        </CardContent>
      </Card>

      {/* Start Confirmation Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Play className="h-5 w-5" />
              Start Task
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to start this worker task?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 my-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Task: <span className="font-semibold text-gray-900 dark:text-white">{selectedTask?.name}</span>
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
              Dataset: <span className="font-semibold text-gray-900 dark:text-white">{selectedTask?.dataset_name || 'N/A'}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStart}
              disabled={actionLoading[selectedTask?.name] === 'start'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading[selectedTask?.name] === 'start' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Confirmation Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Square className="h-5 w-5 fill-current" />
              Stop Task
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to stop this worker task?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  This will interrupt the running task
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Task: <span className="font-semibold">{selectedTask?.name}</span>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStop}
              disabled={actionLoading[selectedTask?.name] === 'stop'}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {actionLoading[selectedTask?.name] === 'stop' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2 fill-current" />
                  Stop Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the worker task
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Task to delete: <span className="font-semibold">{selectedTask?.name}</span>
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={actionLoading[selectedTask?.name] === 'delete'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading[selectedTask?.name] === 'delete' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
