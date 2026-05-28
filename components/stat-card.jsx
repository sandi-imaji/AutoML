'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function StatCard({ title, value, subtitle, icon: Icon, trend, className, gradientClass = '' }) {
  const isPositive = trend && trend > 0
  
  return (
    <Card className={cn(
      'shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200/50 dark:border-gray-800/50 animate-fade-in overflow-hidden relative',
      gradientClass,
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
        <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 tracking-tight">
          {title}
        </CardTitle>
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent tracking-tighter">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
            {subtitle}
          </p>
        )}
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className={cn(
              'text-xs font-semibold',
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              {isPositive ? '+' : ''}{trend}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
