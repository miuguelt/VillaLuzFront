import React from "react";
import { cn } from "./cn";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: InputSize;
  invalid?: boolean;
};

const sizeMap: Record<InputSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-3 text-sm",
  lg: "h-10 px-3 text-base",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "md", invalid = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // Reemplazar "input" con clases Tailwind directas
          "flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-all duration-200 ease-in-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-background focus-visible:shadow-md hover:border-input/80 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm",
          sizeMap[size],
          invalid && "aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive aria-[invalid=true]:border-destructive",
          className
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
