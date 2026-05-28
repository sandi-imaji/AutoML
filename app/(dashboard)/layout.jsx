'use client'

import { PremiumHeader } from '@/components/layout/premium-header'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PremiumHeader />
      <main className="container mx-auto px-8 lg:px-12 py-8">
        {children}
      </main>
    </div>
  )
}
