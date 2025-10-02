import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

// Componente raíz: simple contenedor flexible
type CommandProps = React.HTMLAttributes<HTMLDivElement> & {
  shouldFilter?: boolean
}
const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, shouldFilter, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
)
Command.displayName = "Command"

// Input de búsqueda controlado: soporta value y onValueChange
interface CommandInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string
  onValueChange?: (value: string) => void
}
const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => (
    <div className="flex items-center border-b px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
)
CommandInput.displayName = "CommandInput"

// Lista de resultados
const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  )
)
CommandList.displayName = "CommandList"

// Estado vacío
const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("py-6 text-center text-sm", className)} {...props} />
  )
)
CommandEmpty.displayName = "CommandEmpty"

// Agrupador
const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
)
CommandGroup.displayName = "CommandGroup"

// Separador
const CommandSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
  )
)
CommandSeparator.displayName = "CommandSeparator"

// Item seleccionable
type CommandItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string
  onSelect?: (value: string) => void
}
const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, value, onSelect, ...props }, ref) => (
    <div
      ref={ref}
      role="option"
      tabIndex={0}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={() => onSelect?.(value ?? "")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect?.(value ?? "")
        }
      }}
      {...props}
    />
  )
)
CommandItem.displayName = "CommandItem"

// Atajo/indicador a la derecha
const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
)
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
