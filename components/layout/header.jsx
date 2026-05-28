'use client'

import { useState } from 'react'
import { Search, Bell, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export function Header({ onMenuClick }) {
  const { theme, setTheme } = useTheme()
  const [notificationCount] = useState(3)

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/20 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
      <div className="flex h-full items-center justify-between px-6 gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="w-80 pl-10 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-xl"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-red-500 to-orange-500 border-2 border-white dark:border-gray-900 shadow-lg animate-pulse"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 glass-card animate-fade-in rounded-xl">
              <DropdownMenuLabel className="font-semibold text-base">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex-col items-start py-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-2 w-full">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="font-semibold text-gray-900 dark:text-white">Training completed</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Customer Churn Prediction - 94.3% accuracy
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">2 minutes ago</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start py-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-2 w-full">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <p className="font-semibold text-gray-900 dark:text-white">Model deployed</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Sales Forecasting Q2 is now live
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">15 minutes ago</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start py-3 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-2 w-full">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <p className="font-semibold text-red-600 dark:text-red-400">Training failed</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Product Recommendation - Insufficient data
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">2 hours ago</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors pl-2 pr-3">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold">AM</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">Admin</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card animate-fade-in rounded-xl">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Admin User</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">admin@automl.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Settings</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Billing</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
