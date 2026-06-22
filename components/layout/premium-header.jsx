'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sparkles, Moon, Sun, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import Image from "next/image";
import logo from "@/app/assets/images/imaji.png"; // pastikan path benar!

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Tasks', href: '/projects' },
  { name: 'Anomaly', href: '/anomaly' },
  { name: 'Workers', href: '/workers' },
  { name: 'Chat IMAJI', href: '/chatbot' },
  { name: 'Logs', href: '/logs' },
  { name: 'Settings', href: '/settings' },
]

export function PremiumHeader() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
      <div className="container mx-auto px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Left */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="relative">
              {/* Glow effect */}
              {/* <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-all duration-500" /> */}
              {/* Logo dengan next/image */}
            </div>
            <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-cyan-400 transition-all">
              SmartAI
            </span>
          </Link>

          {/* Navigation - Center (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105',
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  )}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full animate-in slide-in-from-bottom" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-500" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* User Avatar - Apple Liquid Glass */}
            <div className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl liquid-glass-avatar cursor-pointer">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide">IM</span>
            </div>

            {/* Mobile Menu Toggle */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                        NeuraFlow
                      </span>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'block px-4 py-3 rounded-lg text-sm font-medium transition-all',
                            isActive
                              ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-l-2 border-blue-600'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          )}
                        >
                          {item.name}
                        </Link>
                      )
                    })}
                  </nav>

                  {/* Mobile Footer */}
                  <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl liquid-glass-avatar flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide">IM</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Imaji User</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">imaji@smartai.ai</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
