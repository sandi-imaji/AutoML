'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge, StatusBadgeSmall } from '@/components/status-badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Eye, Edit, Trash2, Copy } from 'lucide-react'
import { projectsData } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { getDatasets, deleteDataset } from '@/lib/api'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ProjectsPage() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDataset, setDeletingDataset] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch data
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDatasets()
      setDatasets(data || [])
    } catch (err) {
      console.error("Error loading projects:", err)
      setError(err.message || "Gagal memuat proyek")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDatasets()
  }, [fetchDatasets])

  // Handle Delete Dataset
  const handleDeleteClick = (dataset) => {
    // Prevent deletion if dataset is training
    if (dataset.status === 'training' || dataset.status === 'pending') {
      toast.error('Tidak dapat menghapus dataset yang sedang dalam proses training')
      return
    }
    setDeletingDataset(dataset)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingDataset) return

    setIsDeleting(true)
    try {
      await deleteDataset(deletingDataset.names)
      toast.success(`Dataset "${deletingDataset.names}" berhasil dihapus`)
      setDeleteDialogOpen(false)
      setDeletingDataset(null)
      // Refresh data setelah delete
      await fetchDatasets()
    } catch (err) {
      console.error("Error deleting dataset:", err)
      toast.error(err.message || "Gagal menghapus dataset")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setDeletingDataset(null)
  }


  // Define columns — pindah ke atas return!
  const columns = useMemo(() => [
    // {
    //   id: 'select',
    //   header: ({ table }) => (
    //     <Checkbox
    //       checked={table.getIsAllPageRowsSelected()}
    //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //       aria-label="Select all"
    //     />
    //   ),
    //   cell: ({ row }) => (
    //     <Checkbox
    //       checked={row.getIsSelected()}
    //       onCheckedChange={(value) => row.toggleSelected(!!value)}
    //       aria-label="Select row"
    //     />
    //   ),
    //   enableSorting: false,
    //   enableHiding: false,
    // },
    {
      accessorKey: 'names',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`/projects/${row.original.names}`}
          className="font-medium text-[#206bc4] hover:underline"
        >
          {row.getValue('names')}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.getValue('description') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'target',
      header: 'Target',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue('target') || '-'}
        </Badge>
      ),
    },
    {
      accessorKey: 'top_model',
      header: 'Top Model',
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.getValue('top_model') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadgeSmall status={row.getValue('status')} />,
    },
    // {
    //   accessorKey: 'start_date',
    //   header: 'Start Date',
    //   cell: ({ row }) => {
    //     const acc = row.getValue('start_date')
    //     return acc ? (
    //       <span className="font-medium text-green-600">{acc}%</span>
    //     ) : (
    //       <span className="text-gray-400">-</span>
    //     )
    //   },
    // },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => {
        const value = row.getValue('start_date')

        if (!value || value === '00000000') return <span className="text-gray-400">-</span>

        const str = value.toString().trim()
        if (str.length !== 8) return <span className="text-red-500">Invalid</span>

        const year = str.slice(0, 4)
        const monthNum = parseInt(str.slice(4, 6))
        const day = str.slice(6, 8)

        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
          'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
        ]

        return (
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {day} {months[monthNum - 1]} {year}
          </span>
        )
      },
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      cell: ({ row }) => {
        const value = row.getValue('end_date')

        if (!value || value === '00000000') return <span className="text-gray-400">-</span>

        const str = value.toString().trim()
        if (str.length !== 8) return <span className="text-red-500">Invalid</span>

        const year = str.slice(0, 4)
        const monthNum = parseInt(str.slice(4, 6))
        const day = str.slice(6, 8)

        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
          'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
        ]

        return (
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {day} {months[monthNum - 1]} {year}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const project = row.original
        const projectName = row.getValue('names')
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${projectName}`}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${projectName}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Clone feature coming soon!')}>
                <Copy className="mr-2 h-4 w-4" /> Clone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDeleteClick(project)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], []) // dependency kosong karena tidak ada dynamic value

  // Render states
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Tasks</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your AutoML projects</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-lg font-medium mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} className="btn-gradient text-white">
          Coba Lagi
        </Button>
      </div>
    )
  }

  if (datasets.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto mb-8 w-28 h-28">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl blur-xl opacity-30 animate-pulse" />
            <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-3xl shadow-2xl">
              <svg className="w-16 h-16 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Belum ada Task
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Yuk mulai bikin project AutoML pertamamu!
        </p>

        <Button asChild size="lg" className="liquid-glass-btn liquid-glass-btn-blue text-white px-8 py-3 font-semibold tracking-wide text-base">
          <Link href="/projects/new">
            <Plus className="mr-2 h-5 w-5" /> Buat Task Baru
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base font-medium">
            Manage your AutoML projects ({datasets.length})
          </p>
        </div>
        <Button asChild className="liquid-glass-btn liquid-glass-btn-blue text-white px-6 py-2.5 font-medium tracking-wide">
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={datasets}
        searchKey="names"
      // optional: tambah pagination, sorting, dll
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Dataset</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus dataset <strong>&quot;{deletingDataset?.names}&quot;</strong>?
              <br />
              Tindakan ini tidak dapat dibatalkan dan semua data terkait akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
