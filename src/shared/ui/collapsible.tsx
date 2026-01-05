import * as React from "react";
import { cn } from "@/shared/ui/cn.ts";

// Simple controlled Collapsible components to satisfy usage in the dashboard.
// Provides minimal functionality: controlled open state and conditional content rendering.

const CollapsibleContext = React.createContext<boolean>(false);

type CollapsibleProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children?: React.ReactNode;
};

export const Collapsible: React.FC<CollapsibleProps> = ({
  open = false,
  onOpenChange: _onOpenChange,
  className,
  children,
}) => {
  // This component is controlled by the parent via `open`.
  // If consumers wish to toggle, they can call `onOpenChange` themselves.
  return (
    <div className={cn("collapsible", className)} data-state={open ? "open" : "closed"}>
      <CollapsibleContext.Provider value={open}>{children}</CollapsibleContext.Provider>
    </div>
  );
};

type CollapsibleContentProps = {
  className?: string;
  children?: React.ReactNode;
  forceMount?: boolean;
};

export const CollapsibleContent: React.FC<CollapsibleContentProps> = ({
  className,
  children,
  forceMount,
}) => {
  const isOpen = React.useContext(CollapsibleContext);
  if (!forceMount && !isOpen) return null;
  return (
    <div className={cn("collapsible-content", className)} data-state={isOpen ? "open" : "closed"}>
      {children}
    </div>
  );
};

export default Collapsible;