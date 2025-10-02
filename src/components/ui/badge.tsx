import * as React from "react";
import { cn } from "./cn";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "info"
  | "neutral"
  | "destructive"
  | "muted"
  | "outline";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  asChild?: boolean;
}

const base =
  "inline-flex items-center font-medium rounded-full whitespace-nowrap align-middle";

const sizes: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary-600 text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success-100 text-success-800",
  warning: "bg-warning-100 text-warning-800",
  info: "bg-primary-100 text-primary-800",
  neutral: "bg-neutral-100 text-neutral-800",
  muted: "bg-muted text-muted-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "border border-border text-foreground bg-background",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "sm", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
