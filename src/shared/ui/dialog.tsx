import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { X } from "lucide-react"

import { cn } from "@/shared/ui/cn.ts"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none motion-reduce:animate-none",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Helper to detect whether a DialogTitle is present in children (recursively)
function containsDialogTitle(node: React.ReactNode): boolean {
  let found = false
  React.Children.forEach(node as React.ReactNode, (child) => {
    if (found) return
    if (!React.isValidElement(child)) return
    const type = (child as React.ReactElement).type as any
    if (type === DialogPrimitive.Title || type === DialogTitle) {
      found = true
      return
    }
    const children = (child as React.ReactElement).props?.children
    if (children) {
      if (containsDialogTitle(children)) {
        found = true
        return
      }
    }
  })
  return found
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "aria-labelledby" | "aria-describedby"> & {
    overlayClassName?: string
    ["aria-labelledby"]?: string
    ["aria-describedby"]?: string
  }
>(({ className, children, overlayClassName, ["aria-labelledby"]: ariaLabelledByProp, ["aria-describedby"]: ariaDescribedByProp, ...props }, ref) => {
  const hasTitle = containsDialogTitle(children)
  const hasDescription = React.Children.toArray(children).some(
    child => React.isValidElement(child) &&
    ((child.type as any) === DialogPrimitive.Description || (child.type as any) === DialogDescription)
  )

  // IDs for accessibility
  const titleId = React.useId()
  const descriptionId = React.useId()

  // Compute robust ARIA attributes, avoiding undefined overrides from callers
  const finalAriaLabelledBy = ariaLabelledByProp ?? (hasTitle ? undefined : titleId)
  const finalAriaDescribedBy = ariaDescribedByProp ?? (hasDescription ? undefined : descriptionId)

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg",
          "translate-x-[-50%] translate-y-[-50%]",
          "gap-4 border bg-background p-6 shadow-lg",
          // Mejora de layout: maximizar altura disponible (se maneja scroll en GenericModal)
          "max-h-[95vh] overflow-hidden overscroll-contain",
          "motion-safe:duration-300 motion-safe:ease-out motion-reduce:duration-0",
          "data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-96 data-[state=open]:zoom-in-100",
          "data-[state=closed]:slide-out-to-top-[10%] data-[state=open]:slide-in-from-top-[10%]",
          "sm:rounded-lg",
          className
        )}
        aria-labelledby={finalAriaLabelledBy}
        aria-describedby={finalAriaDescribedBy}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* Fallback a11y title to satisfy Radix requirement when none is provided */}
        {!hasTitle && !ariaLabelledByProp && (
          <VisuallyHidden>
            <DialogPrimitive.Title id={titleId}>Dialog</DialogPrimitive.Title>
          </VisuallyHidden>
        )}
        
        {/* Fallback a11y description to satisfy Radix requirement when none is provided */}
        {!hasDescription && !ariaDescribedByProp && (
          <VisuallyHidden>
            <DialogPrimitive.Description id={descriptionId}>
              Dialog content
            </DialogPrimitive.Description>
          </VisuallyHidden>
        )}
        
        {children}
        <DialogPrimitive.Close className={cn(
          "absolute right-2 top-2 sm:right-3 sm:top-2",
          "rounded-md p-1.5 sm:p-2",
          "opacity-70 hover:opacity-100",
          "ring-offset-background transition-all duration-200",
          "hover:bg-accent/50 hover:scale-105",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:pointer-events-none",
          "data-[state=open]:bg-accent/30 data-[state=open]:text-muted-foreground"
        )}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
