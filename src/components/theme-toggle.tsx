'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { getTheme, setTheme as setThemeGlobal, toggleTheme, onThemeChange, type Theme } from '@/lib/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTheme(getTheme())
    
    // Listen for theme changes
    const cleanup = onThemeChange((newTheme) => {
      setTheme(newTheme)
    })
    
    return cleanup
  }, [])

  if (!mounted) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        className="btn btn-ghost border-default"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const handleSetTheme = (newTheme: Theme) => {
    setThemeGlobal(newTheme)
    setTheme(newTheme)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="border-red-200 dark:border-red-800/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4 text-yellow-500" />
          ) : (
            <Sun className="h-4 w-4 text-red-500" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-red-200 dark:border-red-800/50 shadow-xl"
      >
        <DropdownMenuItem 
          onClick={() => handleSetTheme('light')}
          className={`cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 ${
            theme === 'light' 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          <Sun className="mr-2 h-4 w-4 text-red-500" />
          <span>Light</span>
          {theme === 'light' && <span className="ml-auto text-xs text-red-500">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleSetTheme('dark')}
          className={`cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          <Moon className="mr-2 h-4 w-4 text-yellow-500" />
          <span>Dark</span>
          {theme === 'dark' && <span className="ml-auto text-xs text-yellow-500">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
