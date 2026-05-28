'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Live Tag Search Component
 * Free text input dengan live search ke API
 * - Trigger setelah 3 karakter
 * - Debounce 300ms
 * - Support single atau multi select
 */
export function LiveTagSearch({
  value,
  onChange,
  placeholder = "Type min 3 chars to search...",
  label,
  multi = false,
  disabled = false,
  className,
  onSearch,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState(multi ? (value || []) : (value ? [value] : []))
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)

  // Update selectedItems when value prop changes
  useEffect(() => {
    if (multi) {
      setSelectedItems(value || [])
    } else {
      setSelectedItems(value ? [value] : [])
    }
  }, [value, multi])

  // Calculate dropdown position
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      setDropdownPosition({
        top: rect.bottom + scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Update position on resize/scroll
  useEffect(() => {
    const handlePositionUpdate = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const scrollY = window.scrollY || window.pageYOffset
        setDropdownPosition({
          top: rect.bottom + scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }

    window.addEventListener('resize', handlePositionUpdate)
    window.addEventListener('scroll', handlePositionUpdate, true)
    
    return () => {
      window.removeEventListener('resize', handlePositionUpdate)
      window.removeEventListener('scroll', handlePositionUpdate, true)
    }
  }, [isOpen])

  // Debounced search - trigger after 300ms, minimal 3 karakter
  useEffect(() => {
    // Minimal 3 karakter
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await onSearch(searchQuery)
        setSuggestions(results || [])
        setIsOpen(results && results.length > 0)
      } catch (error) {
        console.error('Search error:', error)
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, onSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((item) => {
    if (multi) {
      // Check if already selected
      const isAlreadySelected = selectedItems.some(selected => selected.row_id === item.row_id)
      if (isAlreadySelected) {
        // Remove if already selected
        const newSelection = selectedItems.filter(selected => selected.row_id !== item.row_id)
        setSelectedItems(newSelection)
        onChange(newSelection)
      } else {
        // Add to selection
        const newSelection = [...selectedItems, item]
        setSelectedItems(newSelection)
        onChange(newSelection)
      }
    } else {
      // Single select
      setSelectedItems([item])
      onChange(item)
      setSearchQuery('')
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }, [multi, selectedItems, onChange])

  const handleRemove = useCallback((itemToRemove) => {
    if (multi) {
      const newSelection = selectedItems.filter(item => item.row_id !== itemToRemove.row_id)
      setSelectedItems(newSelection)
      onChange(newSelection)
    } else {
      setSelectedItems([])
      onChange(null)
    }
  }, [multi, selectedItems, onChange])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
    if (e.key === 'Backspace' && searchQuery === '' && selectedItems.length > 0) {
      // Remove last item on backspace when input is empty
      const lastItem = selectedItems[selectedItems.length - 1]
      handleRemove(lastItem)
    }
  }, [searchQuery, selectedItems, handleRemove])

  const showMinCharsWarning = searchQuery.length > 0 && searchQuery.length < 3

  // Dropdown content
  const dropdownContent = (
    <>
      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-popover border rounded-xl shadow-lg max-h-[300px] overflow-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {suggestions.map((item) => {
            const isSelected = selectedItems.some(selected => selected.row_id === item.row_id)
            return (
              <button
                key={item.row_id}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between transition-colors",
                  isSelected && "bg-accent/50"
                )}
              >
                <span className="font-medium truncate">{item.tag_name}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </button>
            )
          })}
        </div>
      )}

      {/* No Results */}
      {isOpen && !loading && searchQuery.length >= 3 && suggestions.length === 0 && (
        <div
          className="fixed z-[9999] bg-popover border rounded-xl shadow-lg p-4 text-center text-muted-foreground"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          No tags found for &quot;{searchQuery}&quot;
        </div>
      )}
    </>
  )

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}

      {/* Selected Items / Input Container */}
      <div 
        className={cn(
          "min-h-[42px] w-full rounded-xl border bg-background px-3 py-2 flex flex-wrap items-center gap-2 cursor-text",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Selected Items (for multi select) */}
        {multi && selectedItems.map((item) => (
          <Badge 
            key={item.row_id} 
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            <span className="truncate max-w-[200px]">{item.tag_name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove(item)
              }}
              className="ml-1 hover:text-destructive"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {/* Selected Item (for single select) */}
        {!multi && selectedItems.length > 0 && (
          <Badge 
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 mr-2"
          >
            <span className="truncate max-w-[300px]">{selectedItems[0].tag_name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove(selectedItems[0])
              }}
              className="ml-1 hover:text-destructive"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}

        {/* Input */}
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery.trim().length >= 3 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={selectedItems.length === 0 ? placeholder : (multi ? "Add more..." : placeholder)}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto min-w-[100px]"
          disabled={disabled || (!multi && selectedItems.length > 0)}
        />

        {/* Loading Indicator */}
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Min Characters Warning */}
      {showMinCharsWarning && (
        <p className="text-xs text-amber-600 mt-1">
          Type {3 - searchQuery.length} more character{3 - searchQuery.length > 1 ? 's' : ''} to search
        </p>
      )}

      {/* Render dropdown in portal */}
      {typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  )
}
