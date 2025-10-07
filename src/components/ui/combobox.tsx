import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/components/ui/cn.ts"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  searchDebounceMs?: number
  onSearchChange?: (query: string) => void
  loading?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  disabled = false,
  className,
  searchDebounceMs = 300,
  onSearchChange,
  loading = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [isSearching, setIsSearching] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const debounceTimerRef = React.useRef<NodeJS.Timeout>()

  const selectedOption = options.find((option) => option.value === value)

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSearch("")
    setHighlightedIndex(0)
  }

  // Limpiar búsqueda cuando se cierra el popover
  React.useEffect(() => {
    if (!open) {
      setSearch("")
      setHighlightedIndex(0)
    }
  }, [open])

  // Filtrado local
  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  // Debounce para búsqueda remota
  React.useEffect(() => {
    if (onSearchChange) {
      setIsSearching(true)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        onSearchChange(search)
        setIsSearching(false)
      }, searchDebounceMs)

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
        setIsSearching(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Reset highlighted index when options change
  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions])

  // Scroll into view when highlighted index changes
  React.useEffect(() => {
    if (open && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]')
      const highlightedItem = items[highlightedIndex]
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedIndex, open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setSearch("")
        break
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal h-10 px-3 py-2",
            !selectedOption && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
          onKeyDown={handleKeyDown}
        >
          <span className="truncate">
            {loading ? "Cargando..." : selectedOption ? selectedOption.label : placeholder}
          </span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList ref={listRef}>
            <CommandEmpty>
              {isSearching || loading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Buscando...</span>
                </div>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {filteredOptions.map((option, index) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "cursor-pointer",
                    index === highlightedIndex && "bg-accent text-accent-foreground"
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
